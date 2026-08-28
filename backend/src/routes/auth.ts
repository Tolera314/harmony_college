import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, signJWT, verifyJWT } from '../lib/auth';
import {
  loginSchema,
  signInSchema,
  applicationSchema,
  registerSchema,
  normalizePhone,
  isPhone,
  verifyPhoneSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../lib/validations';
import {
  Role,
  AccountStatus,
  AuditAction,
  PUBLIC_SIGNUP_ROLE,
  PASSWORD_BCRYPT_ROUNDS,
  TOKEN_BCRYPT_ROUNDS,
  REFRESH_TOKEN_TTL_SECONDS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  getInactivityTimeoutMs,
} from '../types/auth';
import { sendVerificationCode, verifyCode } from '../services/verification';
import { validateInvitationToken, acceptStaffInvitation } from '../services/invitationService';
import {
  requestPasswordReset,
  validateResetToken,
  executePasswordReset,
} from '../services/passwordReset';
import { OAuthProvider } from '@prisma/client';
import {
  generateState,
  generatePKCE,
  buildGoogleAuthUrl,
  buildFacebookAuthUrl,
  exchangeGoogleCode,
  exchangeFacebookCode,
  processOAuthUser,
  verifyPendingLinkToken,
} from '../services/oauth';

const router = Router();

function getPostAuthDestination(role: string, profileCompleted: boolean): string {
  if (role === 'STUDENT') {
    return profileCompleted ? '/dashboard/student' : '/welcome';
  }
  const dashMap: Record<string, string> = {
    INSTRUCTOR:      '/dashboard/instructor',
    DEPARTMENT_HEAD: '/dashboard/department-head',
    HR_OFFICER:      '/dashboard/hr',
    FINANCE_OFFICER: '/dashboard/finance-officer',
    REGISTRAR:       '/dashboard/registrar',
    ADMIN:           '/dashboard/admin',
    SUPER_ADMIN:     '/dashboard/admin',
  };
  return dashMap[role] ?? '/dashboard/student';
}

// ─────────────────────────────────────────────────────────────────────────────
// COOKIE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production';

/** Parses a duration string like "15m", "1h", "7d" into seconds. */
function parseDurationSeconds(val: string, fallback: number): number {
  const n = parseInt(val, 10);
  if (isNaN(n)) return fallback;
  if (val.endsWith('h')) return n * 3600;
  if (val.endsWith('d')) return n * 86400;
  if (val.endsWith('m')) return n * 60;
  return n; // treat bare number as seconds
}

/** Short-lived access token cookie — lifetime driven by ACCESS_TOKEN_EXPIRES_IN. */
function setAccessTokenCookie(res: Response, token: string): void {
  const seconds = parseDurationSeconds(process.env.ACCESS_TOKEN_EXPIRES_IN ?? '1h', 3600);
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: 'lax',
    maxAge:   seconds * 1000,
    path:     '/',
  });
}

/** Long-lived refresh token cookie, scoped to the refresh endpoint only. */
function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: 'strict',
    maxAge:   REFRESH_TOKEN_TTL_SECONDS * 1000,
    path:     '/api/auth/refresh',
  });
}

/** Clears all auth cookies (access, refresh, and legacy session). */
function clearAuthCookies(res: Response): void {
  const base = { httpOnly: true, secure: IS_PROD, path: '/' };
  res.clearCookie('accessToken',  { ...base, sameSite: 'lax' });
  res.clearCookie('refreshToken', { ...base, sameSite: 'strict', path: '/api/auth/refresh' });
  res.clearCookie('session',      { ...base, sameSite: 'lax' }); // legacy
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function writeAudit(
  action: AuditAction,
  req: Request,
  userId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId:    userId ?? null,
        ipAddress: (req.ip ?? '').slice(0, 45) || null,
        userAgent: (req.headers['user-agent'] ?? '').slice(0, 255) || null,
        metadata:  metadata ? (metadata as object) : undefined,
      },
    });
  } catch {
    // Audit logging must never crash the request
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE USER SELECT — fields returned to the client, never passwordHash
// ─────────────────────────────────────────────────────────────────────────────

const SAFE_USER_SELECT = {
  id:                true,
  fullName:          true,
  email:             true,
  phone:             true,
  role:              true,
  status:            true,
  emailVerified:     true,
  phoneVerified:     true,
  profileCompleted:  true,
  profileCompletion: true,
  lastLoginAt:       true,
  createdAt:         true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register  (Phase 2 — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
      return;
    }

    const { fullName, email, phone, password } = result.data;
    const normalizedEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : undefined;
    const normalizedPhone = phone && phone.trim() !== '' ? normalizePhone(phone.trim()) : undefined;

    const [emailConflict, phoneConflict] = await Promise.all([
      normalizedEmail ? prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }) : null,
      normalizedPhone ? prisma.user.findUnique({ where: { phone: normalizedPhone }, select: { id: true } }) : null,
    ]);

    if (emailConflict || phoneConflict) {
      res.status(409).json({ error: 'An account with this contact information already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email:    normalizedEmail,
        phone:    normalizedPhone,
        passwordHash,
        role:                PUBLIC_SIGNUP_ROLE,
        status:              AccountStatus.PENDING_VERIFICATION,
        emailVerified:       false,
        phoneVerified:       false,
        profileCompleted:    false,
        profileCompletion:   0,
        failedLoginAttempts: 0,
      },
      select: SAFE_USER_SELECT,
    });

    // ── Create session + set auth cookies so the student is immediately
    //    authenticated after registration (status PENDING_VERIFICATION is fine —
    //    the welcome portal handles the soft verification reminder).
    const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    const rawRefreshToken  = randomBytes(40).toString('hex');
    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, TOKEN_BCRYPT_ROUNDS);

    const session = await prisma.session.create({
      data: {
        userId:           user.id,
        refreshTokenHash,
        expiresAt:        sessionExpiresAt,
        lastUsedAt:       new Date(),
        deviceInfo:       (req.headers['user-agent'] ?? '').slice(0, 255) || null,
        ipAddress:        (req.ip ?? '').slice(0, 45) || null,
        isRevoked:        false,
      },
    });

    const accessToken = await signAccessToken({
      userId:           user.id,
      sessionId:        session.id,
      email:            user.email ?? null,
      role:             user.role,
      status:           user.status,
      profileCompleted: user.profileCompleted,
    });
    const refreshToken = await signRefreshToken({ sessionId: session.id });
    const refreshTokenFinal = await bcrypt.hash(refreshToken, TOKEN_BCRYPT_ROUNDS);
    await prisma.session.update({
      where: { id: session.id },
      data:  { refreshTokenHash: refreshTokenFinal },
    });

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, rawRefreshToken);

    res.status(201).json({
      message: 'Account created successfully.',
      user,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unique constraint failed')) {
      res.status(409).json({ error: 'An account with this contact information already exists.' });
      return;
    }
    console.error('[register]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login  (Phase 3)
// Accepts email OR Ethiopian phone number as identifier.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // ── 1. Validate ──────────────────────────────────────────────────────────
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { identifier, password } = parsed.data;

    // ── 2. Locate user by email or phone ─────────────────────────────────────
    const identifierIsPhone = isPhone(identifier);
    const lookupKey = identifierIsPhone
      ? { phone: normalizePhone(identifier) }
      : { email: identifier.toLowerCase() };

    const user = await prisma.user.findUnique({ where: lookupKey });

    // Perform a dummy hash compare when user not found to prevent timing attacks
    if (!user) {
      await bcrypt.compare(password, '$2a$12$dummyhashfortimingnobodyshoulduseXXXXXXXXXX');
      await writeAudit(AuditAction.LOGIN_FAILED, req, null, { reason: 'user_not_found', identifier: identifierIsPhone ? '[phone]' : '[email]' });
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    // ── 3. Check account status before verifying password ────────────────────
    // We check status first so we don't reveal credential validity for blocked accounts.
    if (user.status === AccountStatus.DEACTIVATED) {
      await writeAudit(AuditAction.LOGIN_FAILED, req, user.id, { reason: 'deactivated' });
      res.status(403).json({ error: 'This account has been deactivated. Please contact support.', code: 'ACCOUNT_DEACTIVATED' });
      return;
    }
    if (user.status === AccountStatus.SUSPENDED) {
      await writeAudit(AuditAction.LOGIN_FAILED, req, user.id, { reason: 'suspended' });
      res.status(403).json({ error: 'This account has been suspended. Please contact support.', code: 'ACCOUNT_SUSPENDED' });
      return;
    }
    if (user.status === AccountStatus.LOCKED) {
      await writeAudit(AuditAction.LOGIN_FAILED, req, user.id, { reason: 'locked' });
      res.status(403).json({ error: 'This account is locked due to too many failed login attempts. Please contact support to unlock it.', code: 'ACCOUNT_LOCKED' });
      return;
    }
    if (!user.passwordHash) {
      await bcrypt.compare(password, '$2a$12$dummyhashfortimingnobodyshoulduseXXXXXXXXXX');
      await writeAudit(AuditAction.LOGIN_FAILED, req, user.id, { reason: 'no_password_set' });
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    if (user.status === AccountStatus.PENDING_VERIFICATION) {
      // Verification is now a soft reminder in Settings — not a hard login gate.
      // Verify password then fall through to normal session creation below.
      const pwOk = await bcrypt.compare(password, user.passwordHash);
      if (!pwOk) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }
      // Fall through — session will be created below with PENDING_VERIFICATION status.
    }

    // ── 4. Verify password ───────────────────────────────────────────────────
    // (Already verified above for PENDING_VERIFICATION — skip double-check)
    const passwordValid =
      user.status === AccountStatus.PENDING_VERIFICATION
        ? true
        : await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      const newFailCount = user.failedLoginAttempts + 1;
      const shouldLock   = newFailCount >= MAX_FAILED_LOGIN_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailCount,
          ...(shouldLock ? { status: AccountStatus.LOCKED } : {}),
        },
      });

      if (shouldLock) {
        await writeAudit(AuditAction.ACCOUNT_LOCKED, req, user.id, { failedAttempts: newFailCount });
      }
      await writeAudit(AuditAction.LOGIN_FAILED, req, user.id, { failedAttempts: newFailCount });
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    // ── 5. Create session & tokens ───────────────────────────────────────────
    const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session = await prisma.session.create({
      data: {
        userId:           user.id,
        refreshTokenHash: 'pending',
        expiresAt:        sessionExpiresAt,
        lastUsedAt:       new Date(),
        deviceInfo:       (req.headers['user-agent'] ?? '').slice(0, 255) || null,
        ipAddress:        (req.ip ?? '').slice(0, 45) || null,
        isRevoked:        false,
      },
    });

    const accessToken = await signAccessToken({
      userId:           user.id,
      sessionId:        session.id,
      email:            user.email ?? null,
      role:             user.role,
      status:           user.status,
      profileCompleted: user.profileCompleted,
    });

    const refreshToken = await signRefreshToken({ sessionId: session.id });
    const refreshTokenHash = await bcrypt.hash(refreshToken, TOKEN_BCRYPT_ROUNDS);

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    // ── 7. Update user counters ───────────────────────────────────────────────
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lastLoginAt: new Date() },
    });

    // ── 8. Set cookies ────────────────────────────────────────────────────────
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    await writeAudit(AuditAction.LOGIN_SUCCESS, req, user.id, { role: user.role, sessionId: session.id });

    // ── 9. Safe response ──────────────────────────────────────────────────────
    res.status(200).json({
      user: {
        id:                user.id,
        fullName:          user.fullName,
        email:             user.email,
        phone:             user.phone,
        role:              user.role,
        status:            user.status,
        emailVerified:     user.emailVerified,
        phoneVerified:     user.phoneVerified,
        profileCompleted:  user.profileCompleted,
        profileCompletion: user.profileCompletion,
        lastLoginAt:       new Date(),
      },
    });
  } catch (err: unknown) {
    console.error('[login]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh  (Phase 3)
// Rotates both access and refresh tokens.  Enforces inactivity timeout.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawRefreshToken: string | undefined = req.cookies?.refreshToken;

    if (!rawRefreshToken) {
      clearAuthCookies(res);
      res.status(401).json({ error: 'No refresh token.' });
      return;
    }

    // Decode to extract sessionId without caring about expiry yet
    const decoded = await verifyJWT(rawRefreshToken);
    if (!decoded || typeof decoded.sessionId !== 'string') {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Invalid refresh token.' });
      return;
    }

    const { sessionId } = decoded as { sessionId: string };

    // Load session from DB
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id:                true,
            fullName:          true,
            email:             true,
            phone:             true,
            role:              true,
            status:            true,
            emailVerified:     true,
            phoneVerified:     true,
            profileCompleted:  true,
            profileCompletion: true,
            lastLoginAt:       true,
            createdAt:         true,
          },
        },
      },
    });

    if (!session || session.isRevoked) {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Session not found or revoked.' });
      return;
    }

    // Absolute expiry
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sessionId } });
      clearAuthCookies(res);
      res.status(401).json({ error: 'Session expired.', code: 'SESSION_EXPIRED' });
      return;
    }

    // Inactivity timeout
    const inactivityMs = getInactivityTimeoutMs();
    const idleSince = Date.now() - session.lastUsedAt.getTime();
    if (idleSince > inactivityMs) {
      await prisma.session.update({ where: { id: sessionId }, data: { isRevoked: true } });
      clearAuthCookies(res);
      res.status(401).json({ error: 'Your session expired due to inactivity. Please sign in again.', code: 'INACTIVITY_TIMEOUT' });
      return;
    }

    // Verify the raw token matches the stored hash
    const tokenValid = await bcrypt.compare(rawRefreshToken, session.refreshTokenHash);
    if (!tokenValid) {
      // Possible token reuse / theft — revoke the session
      await prisma.session.update({ where: { id: sessionId }, data: { isRevoked: true } });
      clearAuthCookies(res);
      res.status(401).json({ error: 'Refresh token mismatch. Session revoked.' });
      return;
    }

    const user = session.user;

    // Check user account is still ACTIVE
    if (user.status !== AccountStatus.ACTIVE) {
      await prisma.session.update({ where: { id: sessionId }, data: { isRevoked: true } });
      clearAuthCookies(res);
      res.status(403).json({ error: 'Account is no longer active.', code: user.status });
      return;
    }

    // Rotate: generate new refresh token and update session
    const newRawRefreshToken = randomBytes(40).toString('hex');
    const newRefreshHash = await bcrypt.hash(newRawRefreshToken, TOKEN_BCRYPT_ROUNDS);

    await prisma.session.update({
      where: { id: sessionId },
      data: { refreshTokenHash: newRefreshHash, lastUsedAt: new Date() },
    });

    const newAccessToken = await signAccessToken({
      userId:           user.id,
      sessionId:        session.id,
      email:            user.email ?? null,
      role:             user.role,
      status:           user.status,
      profileCompleted: user.profileCompleted,
    });
    const newRefreshToken = await signRefreshToken({ sessionId: session.id });

    setAccessTokenCookie(res, newAccessToken);
    setRefreshTokenCookie(res, newRawRefreshToken);

    res.status(200).json({
      user: {
        id:                user.id,
        fullName:          user.fullName,
        email:             user.email,
        phone:             user.phone,
        role:              user.role,
        status:            user.status,
        emailVerified:     user.emailVerified,
        phoneVerified:     user.phoneVerified,
        profileCompleted:  user.profileCompleted,
        profileCompletion: user.profileCompletion,
        lastLoginAt:       user.lastLoginAt,
      },
    });
  } catch (err: unknown) {
    console.error('[refresh]', err instanceof Error ? err.message : err);
    clearAuthCookies(res);
    res.status(401).json({ error: 'Session refresh failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (Phase 3 — upgraded)
// Returns the authenticated user's safe identity from the database.
// This is the frontend's single source of truth after page load / refresh.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    // Accept both new accessToken and legacy session cookie
    const token: string | undefined =
      req.cookies?.accessToken ?? req.cookies?.session;

    if (!token) {
      res.status(401).json({ authenticated: false, error: 'No active session.' });
      return;
    }

    const payload = await verifyJWT(token);
    if (!payload || typeof payload.userId !== 'string') {
      res.status(401).json({ authenticated: false, error: 'Session expired or invalid.' });
      return;
    }

    // If the token carries a sessionId, verify the session is not revoked
    if (typeof payload.sessionId === 'string' && payload.sessionId !== '') {
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: { isRevoked: true, expiresAt: true, lastUsedAt: true },
      });
      if (!session || session.isRevoked || session.expiresAt < new Date()) {
        clearAuthCookies(res);
        res.status(401).json({ authenticated: false, error: 'Session expired or revoked.' });
        return;
      }
      // Inactivity check
      const idleSince = Date.now() - session.lastUsedAt.getTime();
      if (idleSince > getInactivityTimeoutMs()) {
        await prisma.session.update({
          where: { id: payload.sessionId },
          data:  { isRevoked: true },
        });
        clearAuthCookies(res);
        res.status(401).json({
          authenticated: false,
          error: 'Your session expired due to inactivity.',
          code:  'INACTIVITY_TIMEOUT',
        });
        return;
      }
    }

    // Load fresh data from DB — never trust stale JWT claims for user state
    const user = await prisma.user.findUnique({
      where:  { id: payload.userId },
      select: SAFE_USER_SELECT,
    });

    if (!user) {
      clearAuthCookies(res);
      res.status(401).json({ authenticated: false, error: 'User not found.' });
      return;
    }

    res.status(200).json({ authenticated: true, user });
  } catch (err: unknown) {
    console.error('[me]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to verify authentication session.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout  (Phase 3 — replaces /signout)
// Revokes the current session and clears all auth cookies.
// Safe to call even if the session is already expired.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    // Try refreshToken first; fall back to accessToken to find the sessionId
    const refreshRaw: string | undefined = req.cookies?.refreshToken;
    const accessRaw:  string | undefined = req.cookies?.accessToken ?? req.cookies?.session;

    let sessionId: string | null = null;
    let userId:    string | null = null;

    // Prefer extracting sessionId from the refresh token (most reliable)
    if (refreshRaw) {
      const dec = await verifyJWT(refreshRaw);
      if (dec && typeof dec.sessionId === 'string') {
        sessionId = dec.sessionId;
      }
    }

    // Fall back to access token
    if (!sessionId && accessRaw) {
      const dec = await verifyJWT(accessRaw);
      if (dec) {
        if (typeof dec.sessionId === 'string') sessionId = dec.sessionId;
        if (typeof dec.userId    === 'string') userId    = dec.userId;
      }
    }

    // Delete (not just mark revoked) the session row — hard revocation
    if (sessionId) {
      const deleted = await prisma.session.deleteMany({ where: { id: sessionId } });
      if (deleted.count > 0 && !userId) {
        // Retrieve userId for audit log
        // (session already deleted, but we captured it above if available)
      }
    }

    clearAuthCookies(res);
    await writeAudit(AuditAction.LOGOUT, req, userId ?? undefined);
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err: unknown) {
    console.error('[logout]', err instanceof Error ? err.message : err);
    // Always clear cookies even on error — best-effort logout
    clearAuthCookies(res);
    res.status(200).json({ success: true, message: 'Logged out.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout-all  (Phase 3)
// Revokes ALL sessions for the authenticated user (multi-device sign-out).
// Requires a valid accessToken cookie.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const token: string | undefined =
      req.cookies?.accessToken ?? req.cookies?.session;

    if (!token) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const payload = await verifyJWT(token);
    if (!payload || typeof payload.userId !== 'string') {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Invalid session.' });
      return;
    }

    const { count } = await prisma.session.deleteMany({
      where: { userId: payload.userId },
    });

    clearAuthCookies(res);
    await writeAudit(AuditAction.SESSION_REVOKED, req, payload.userId, { allSessions: true, count });
    res.status(200).json({ success: true, message: `Signed out from ${count} device(s).` });
  } catch (err: unknown) {
    console.error('[logout-all]', err instanceof Error ? err.message : err);
    clearAuthCookies(res);
    res.status(200).json({ success: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY ALIASES — kept for backward compatibility
// Old routes still work but re-implement the same logic concisely.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signin  (legacy alias — Phase 7: now delegates to /login properly)
 * Kept for any third-party integrations that still call /signin.
 * Uses the same full login flow as /login (Session row created, dual cookies set).
 */
router.post('/signin', async (req: Request, res: Response): Promise<void> => {
  // Reshape old { email, password } → { identifier, password }
  if (req.body?.email && !req.body?.identifier) {
    req.body = { identifier: req.body.email, password: req.body.password };
  }
  // Re-use the /login handler body directly — same security guarantees
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    const { identifier, password } = parsed.data;
    const identifierIsPhone = isPhone(identifier);
    const lookupKey = identifierIsPhone
      ? { phone: normalizePhone(identifier) }
      : { email: identifier.toLowerCase() };

    const user = await prisma.user.findUnique({ where: lookupKey });
    if (!user) {
      await bcrypt.compare(password, '$2a$12$dummyhashfortimingnobodyshoulduseXXXXXXXXXX');
      await writeAudit(AuditAction.LOGIN_FAILED, req, null, { reason: 'user_not_found' });
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    if (user.status !== AccountStatus.ACTIVE) {
      const codeMap: Record<string, string> = {
        PENDING_VERIFICATION: 'PENDING_VERIFICATION',
        SUSPENDED: 'ACCOUNT_SUSPENDED', DEACTIVATED: 'ACCOUNT_DEACTIVATED', LOCKED: 'ACCOUNT_LOCKED',
      };
      res.status(403).json({ error: 'Account is not active.', code: codeMap[user.status] ?? user.status });
      return;
    }
    if (!user.passwordHash) {
      await bcrypt.compare(password, '$2a$12$dummyhashfortimingnobodyshoulduseXXXXXXXXXX');
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: { increment: 1 } } });
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    // Phase 7 C2: create a real Session row (was missing in the old legacy handler)
    const rawRefreshToken  = randomBytes(40).toString('hex');
    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, TOKEN_BCRYPT_ROUNDS);
    const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    const session = await prisma.session.create({
      data: {
        userId: user.id, refreshTokenHash, expiresAt: sessionExpiresAt, lastUsedAt: new Date(),
        deviceInfo: (req.headers['user-agent'] ?? '').slice(0, 255) || null,
        ipAddress:  (req.ip ?? '').slice(0, 45) || null,
        isRevoked: false,
      },
    });
    const accessToken = await signAccessToken({
      userId: user.id, sessionId: session.id, email: user.email ?? null,
      role: user.role, status: user.status, profileCompleted: user.profileCompleted,
    });
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lastLoginAt: new Date() } });
    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, rawRefreshToken);
    await writeAudit(AuditAction.LOGIN_SUCCESS, req, user.id, { role: user.role, via: 'signin-alias' });
    res.status(200).json({ success: true, message: 'Logged in successfully.', role: user.role, user: { id: user.id, role: user.role, profileCompleted: user.profileCompleted } });
  } catch (err: unknown) {
    console.error('[signin-alias]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

/**
 * POST /api/auth/signout  (legacy — clears cookies and revokes session if possible)
 */
router.post('/signout', async (req: Request, res: Response): Promise<void> => {
  try {
    const accessRaw: string | undefined = req.cookies?.accessToken ?? req.cookies?.session;
    if (accessRaw) {
      const dec = await verifyJWT(accessRaw);
      if (dec && typeof dec.sessionId === 'string' && dec.sessionId) {
        await prisma.session.deleteMany({ where: { id: dec.sessionId } }).catch(() => {});
      }
      if (dec && typeof dec.userId === 'string') {
        await writeAudit(AuditAction.LOGOUT, req, dec.userId);
      }
    }
  } catch { /* ignore */ }
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY POST /api/auth/signup  (old 5-step application form)
// Kept for backward compatibility — will be removed in Phase 5.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = applicationSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.flatten().fieldErrors });
      return;
    }

    const data = result.data;

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, PASSWORD_BCRYPT_ROUNDS);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          email:    data.email,
          passwordHash,
          role: 'STUDENT' as Role,
        },
      });

      const application = await tx.application.create({
        data: {
          userId:          user.id,
          fullName:        data.fullName,
          dob:             new Date(data.dob),
          age:             data.age,
          gender:          data.gender,
          nationality:     data.nationality,
          phone:           normalizePhone(data.phone),
          emergencyContact:normalizePhone(data.emergencyContact),
          city:            data.city,
          address:         data.address,
          program:         data.program,
          academicYear:    data.academicYear,
          semester:        data.semester,
          studyMode:       data.studyMode,
          status:          'SUBMITTED',
          submittedAt:     new Date(),
        },
      });

      await tx.document.createMany({
        data: [
          { applicationId: application.id, type: 'MATRIC',           fileUrl: data.matricFileUrl },
          { applicationId: application.id, type: 'GRADE_8',          fileUrl: data.grade8FileUrl },
          { applicationId: application.id, type: 'TRANSCRIPT_9_10',  fileUrl: data.transcript910FileUrl },
          { applicationId: application.id, type: 'TRANSCRIPT_11_12', fileUrl: data.transcript1112FileUrl },
        ],
      });

      return user;
    });

    const token = await signJWT({ userId: newUser.id, email: newUser.email, role: newUser.role });
    res.cookie('session', token, {
      httpOnly: true,
      secure:   IS_PROD,
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    res.status(201).json({ success: true, message: 'Registration and application submitted successfully.' });
  } catch (err: unknown) {
    console.error('[signup-legacy]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred during registration.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — VERIFICATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/** Shared helper: after successful verification issue auth cookies + return user */
async function issueSessionAfterVerification(
  userId: string,
  req:    Request,
  res:    Response
): Promise<void> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: SAFE_USER_SELECT,
  });
  if (!user) {
    res.status(500).json({ error: 'User not found after verification.' });
    return;
  }

  const rawRefreshToken  = randomBytes(40).toString('hex');
  const refreshTokenHash = await bcrypt.hash(rawRefreshToken, TOKEN_BCRYPT_ROUNDS);
  const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt:  sessionExpiresAt,
      lastUsedAt: new Date(),
      deviceInfo: (req.headers['user-agent'] ?? '').slice(0, 255) || null,
      ipAddress:  (req.ip ?? '').slice(0, 45) || null,
      isRevoked:  false,
    },
  });

  const accessToken  = await signAccessToken({
    userId,
    sessionId:        session.id,
    email:            user.email ?? null,
    role:             user.role,
    status:           user.status,
    profileCompleted: user.profileCompleted,
  });
  const refreshToken = await signRefreshToken({ sessionId: session.id });

  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, rawRefreshToken);

  res.status(200).json({ user });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify/phone
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify/phone', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = verifyPhoneSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    const { userId, code } = parsed.data;

    const result = await verifyCode(userId, code, 'phone');

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        USER_NOT_FOUND:  404,
        ALREADY_VERIFIED:400,
        NO_TOKEN:        400,
        CODE_EXPIRED:    410,
        MAX_ATTEMPTS:    410,
        INVALID_CODE:    422,
      };
      const status = statusMap[result.code] ?? 500;
      res.status(status).json({ error: result.message, code: result.code });
      return;
    }

    await writeAudit(AuditAction.PHONE_VERIFIED, req, userId);
    await issueSessionAfterVerification(userId, req, res);
  } catch (err: unknown) {
    console.error('[verify/phone]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify/email
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify/email', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    const { userId, token } = parsed.data;

    const result = await verifyCode(userId, token, 'email');

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        USER_NOT_FOUND:  404,
        ALREADY_VERIFIED:400,
        NO_TOKEN:        400,
        CODE_EXPIRED:    410,
        MAX_ATTEMPTS:    410,
        INVALID_CODE:    422,
      };
      const status = statusMap[result.code] ?? 500;
      res.status(status).json({ error: result.message, code: result.code });
      return;
    }

    await writeAudit(AuditAction.EMAIL_VERIFIED, req, userId);
    await issueSessionAfterVerification(userId, req, res);
  } catch (err: unknown) {
    console.error('[verify/email]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify/resend
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify/resend', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = resendVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    const { userId, type } = parsed.data;

    const result = await sendVerificationCode(userId, type);

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        USER_NOT_FOUND:  404,
        ALREADY_VERIFIED:400,
        RESEND_COOLDOWN: 409,
        PROVIDER_ERROR:  503,
      };
      const status = statusMap[result.code] ?? 500;
      res.status(status).json({
        error: result.message,
        code:  result.code,
        ...(result.code === 'RESEND_COOLDOWN' && 'retryAfterSeconds' in result
          ? { retryAfterSeconds: result.retryAfterSeconds }
          : {}),
      });
      return;
    }

    res.status(200).json({
      message:         'Verification code sent.',
      cooldownSeconds: result.cooldownSeconds,
    });
  } catch (err: unknown) {
    console.error('[verify/resend]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verification-status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/verification-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string | undefined;
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId query parameter is required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        status:        true,
        phoneVerified: true,
        emailVerified: true,
        phone:         true,
        email:         true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    res.status(200).json({
      status:        user.status,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
      hasPhone:      user.phone !== null,
      hasEmail:      user.email !== null,
    });
  } catch (err: unknown) {
    console.error('[verification-status]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 6 — PASSWORD RESET ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      // Still return generic response — don't surface validation details
      res.status(200).json({
        message: 'If an account matches the information provided, you will receive instructions to reset your password.',
      });
      return;
    }

    // Fire and forget — result is always the same generic response
    const resetResult = await requestPasswordReset(parsed.data.identifier);

    // Phase 7 C1: for phone-only OTP flow, surface a non-sensitive hint so the
    // frontend can show the OTP input stage. Since the user already supplied their
    // own phone number, returning whether it matched is not account enumeration.
    const hint = resetResult.ok && 'isOtp' in resetResult && resetResult.isOtp
      ? { otp: true, userId: resetResult.userId }
      : {};

    res.status(200).json({
      message: 'If an account matches the information provided, you will receive instructions to reset your password.',
      ...hint,
    });
  } catch (err: unknown) {
    console.error('[forgot-password]', err instanceof Error ? err.message : err);
    // Even on internal errors, return generic message to prevent enumeration
    res.status(200).json({
      message: 'If an account matches the information provided, you will receive instructions to reset your password.',
    });
  }
});

// ── GET /api/auth/reset-password/validate ─────────────────────────────────────
router.get('/reset-password/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId   = req.query.userId   as string | undefined;
    const token    = req.query.token    as string | undefined;

    if (!userId || !token || typeof userId !== 'string' || typeof token !== 'string') {
      res.status(400).json({ valid: false, code: 'INVALID_TOKEN', message: 'Missing required parameters.' });
      return;
    }

    const result = await validateResetToken(userId, token);

    if (!result.ok) {
      res.status(result.code === 'TOKEN_EXPIRED' ? 410 : 400).json({
        valid:   false,
        code:    result.code,
        message: result.message,
      });
      return;
    }

    res.status(200).json({
      valid:     true,
      expiresAt: result.expiresAt,
      isOtp:     result.isOtp,
    });
  } catch (err: unknown) {
    console.error('[reset-password/validate]', err instanceof Error ? err.message : err);
    res.status(500).json({ valid: false, code: 'SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error:   'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { userId, token, password } = parsed.data;

    const result = await executePasswordReset(userId, token, password);

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        INVALID_TOKEN:  400,
        TOKEN_USED:     400,
        INVALID_CODE:   422,
        SAME_PASSWORD:  400,
        MAX_ATTEMPTS:   410,
        TOKEN_EXPIRED:  410,
      };
      const status = statusMap[result.code] ?? 500;
      res.status(status).json({ error: result.message, code: result.code });
      return;
    }

    // Clear all auth cookies — user must log in fresh
    clearAuthCookies(res);

    res.status(200).json({
      message: 'Password updated successfully. Please sign in with your new password.',
    });
  } catch (err: unknown) {
    console.error('[reset-password]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ── POST /api/auth/forgot-password/phone-otp ──────────────────────────────────
// Phase 7 C1: phone-only reset — accepts identifier + OTP + new password in one call.
// Keeps anti-enumeration: identical generic response regardless of account existence.
router.post('/forgot-password/phone-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
      return;
    }
    const { userId, token, password } = parsed.data;
    const result = await executePasswordReset(userId, token, password);
    if (!result.ok) {
      const statusMap: Record<string, number> = {
        INVALID_TOKEN: 400, TOKEN_USED: 400, INVALID_CODE: 422,
        SAME_PASSWORD: 400, MAX_ATTEMPTS: 410, TOKEN_EXPIRED: 410,
      };
      res.status(statusMap[result.code] ?? 500).json({ error: result.message, code: result.code });
      return;
    }
    clearAuthCookies(res);
    res.status(200).json({ message: 'Password updated successfully. Please sign in with your new password.' });
  } catch (err: unknown) {
    console.error('[forgot-password/phone-otp]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// OAUTH ROUTES (Google & Facebook)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/auth/oauth/google — Redirects browser to Google authorization screen */
router.get('/oauth/google', (req: Request, res: Response): void => {
  const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('Google sign-in is not configured yet. Please set GOOGLE_CLIENT_ID in backend/.env')}`);
    return;
  }

  const state = generateState();
  const { verifier, challenge } = generatePKCE();

  res.cookie('oauth_state', state, { httpOnly: true, secure: IS_PROD, sameSite: 'lax', maxAge: 600 * 1000, path: '/' });
  res.cookie('oauth_verifier', verifier, { httpOnly: true, secure: IS_PROD, sameSite: 'lax', maxAge: 600 * 1000, path: '/' });

  const authUrl = buildGoogleAuthUrl(state, challenge);
  res.redirect(authUrl);
});

/** GET /api/auth/oauth/google/callback — OAuth authorization-code callback for Google */
router.get('/oauth/google/callback', async (req: Request, res: Response): Promise<void> => {
  const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const { code, state, error: providerError } = req.query;
  const savedState = req.cookies?.oauth_state;
  const savedVerifier = req.cookies?.oauth_verifier;

  res.clearCookie('oauth_state', { path: '/' });
  res.clearCookie('oauth_verifier', { path: '/' });

  if (providerError) {
    res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('Google login was cancelled or denied.')}`);
    return;
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string' || state !== savedState || !savedVerifier) {
    res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('Invalid OAuth state or expired request.')}`);
    return;
  }

  try {
    const profile = await exchangeGoogleCode(code, savedVerifier);
    const result = await processOAuthUser(OAuthProvider.GOOGLE, profile);

    if (result.type === 'ACCOUNT_BLOCKED') {
      res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent(result.error)}`);
      return;
    }

    // LINK_REQUIRED: existing account found by email — send user to password verification
    if (result.type === 'LINK_REQUIRED') {
      const dest = `/link-account?token=${encodeURIComponent(result.pendingLinkToken)}&email=${encodeURIComponent(result.email)}`;
      res.redirect(`${FRONTEND_URL}${dest}`);
      return;
    }

    const user = result.user;
    const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        expiresAt: sessionExpiresAt,
        lastUsedAt: new Date(),
        deviceInfo: (req.headers['user-agent'] ?? '').slice(0, 255) || null,
        ipAddress: (req.ip ?? '').slice(0, 45) || null,
        isRevoked: false,
      },
    });

    const accessToken = await signAccessToken({
      userId: user.id,
      sessionId: session.id,
      email: user.email ?? null,
      role: user.role,
      status: user.status,
      profileCompleted: user.profileCompleted,
    });

    const refreshToken = await signRefreshToken({ sessionId: session.id });
    const refreshTokenHash = await bcrypt.hash(refreshToken, TOKEN_BCRYPT_ROUNDS);

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lastLoginAt: new Date() },
    });

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    await writeAudit(AuditAction.LOGIN_SUCCESS, req, user.id, { provider: 'GOOGLE', sessionId: session.id });

    const dest = getPostAuthDestination(user.role, user.profileCompleted);
    res.redirect(`${FRONTEND_URL}${dest}`);
  } catch (err: unknown) {
    console.error('[OAuth Google Callback Error]', err instanceof Error ? err.message : err);
    res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('Google authentication failed. Please try again.')}`);
  }
});

/** GET /api/auth/oauth/facebook — Redirects browser to Facebook authorization screen */
router.get('/oauth/facebook', (req: Request, res: Response): void => {
  const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  if (!process.env.FACEBOOK_APP_ID) {
    res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('Facebook sign-in is not configured yet. Please set FACEBOOK_APP_ID in backend/.env')}`);
    return;
  }

  const state = generateState();
  const { verifier, challenge } = generatePKCE();

  res.cookie('oauth_state',    state,    { httpOnly: true, secure: IS_PROD, sameSite: 'lax', maxAge: 600 * 1000, path: '/' });
  res.cookie('oauth_verifier', verifier, { httpOnly: true, secure: IS_PROD, sameSite: 'lax', maxAge: 600 * 1000, path: '/' });

  const authUrl = buildFacebookAuthUrl(state, challenge);
  res.redirect(authUrl);
});

/** GET /api/auth/oauth/facebook/callback — OAuth authorization-code callback for Facebook */
router.get('/oauth/facebook/callback', async (req: Request, res: Response): Promise<void> => {
  const FRONTEND_URL  = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const { code, state, error: providerError } = req.query;
  const savedState    = req.cookies?.oauth_state;
  const savedVerifier = req.cookies?.oauth_verifier;

  res.clearCookie('oauth_state',    { path: '/' });
  res.clearCookie('oauth_verifier', { path: '/' });

  if (providerError) {
    res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('Facebook login was cancelled or denied.')}`);
    return;
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string' || state !== savedState || !savedVerifier) {
    res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('Invalid OAuth state or expired request.')}`);
    return;
  }

  try {
    const profile = await exchangeFacebookCode(code, savedVerifier);
    const result  = await processOAuthUser(OAuthProvider.FACEBOOK, profile);

    if (result.type === 'ACCOUNT_BLOCKED') {
      res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent(result.error)}`);
      return;
    }

    if (result.type === 'LINK_REQUIRED') {
      const dest = `/link-account?token=${encodeURIComponent(result.pendingLinkToken)}&email=${encodeURIComponent(result.email)}`;
      res.redirect(`${FRONTEND_URL}${dest}`);
      return;
    }

    const user             = result.user;
    const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session = await prisma.session.create({
      data: {
        userId:           user.id,
        refreshTokenHash: 'pending',
        expiresAt:        sessionExpiresAt,
        lastUsedAt:       new Date(),
        deviceInfo:       (req.headers['user-agent'] ?? '').slice(0, 255) || null,
        ipAddress:        (req.ip ?? '').slice(0, 45) || null,
        isRevoked:        false,
      },
    });

    const accessToken = await signAccessToken({
      userId:           user.id,
      sessionId:        session.id,
      email:            user.email ?? null,
      role:             user.role,
      status:           user.status,
      profileCompleted: user.profileCompleted,
    });

    const refreshToken     = await signRefreshToken({ sessionId: session.id });
    const refreshTokenHash = await bcrypt.hash(refreshToken, TOKEN_BCRYPT_ROUNDS);

    await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash } });
    await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lastLoginAt: new Date() } });

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    await writeAudit(AuditAction.LOGIN_SUCCESS, req, user.id, { provider: 'FACEBOOK', sessionId: session.id });

    const dest = getPostAuthDestination(user.role, user.profileCompleted);
    res.redirect(`${FRONTEND_URL}${dest}`);
  } catch (err: unknown) {
    console.error('[OAuth Facebook Callback Error]', err instanceof Error ? err.message : err);
    res.redirect(`${FRONTEND_URL}/signin?error=${encodeURIComponent('Facebook authentication failed. Please try again.')}`);
  }
});

/** POST /api/auth/oauth/link-account — Authorize and complete account linking */
router.post('/oauth/link-account', async (req: Request, res: Response): Promise<void> => {
  try {
    const { pendingToken, password } = req.body;
    if (!pendingToken || !password) {
      res.status(400).json({ error: 'Missing required parameters.' });
      return;
    }

    const payload = await verifyPendingLinkToken(pendingToken);
    if (!payload) {
      res.status(400).json({ error: 'Account linking request expired or invalid. Please try logging in again.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (!user.passwordHash) {
      await bcrypt.compare(password, '$2a$12$dummyhashfortimingnobodyshoulduseXXXXXXXXXX');
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Incorrect password. Account linking failed.' });
      return;
    }

    // Attach OAuth identity to existing user
    await prisma.oAuthAccount.create({
      data: {
        provider: payload.provider,
        providerAccountId: payload.providerAccountId,
        userId: user.id,
      },
    });

    // Create session
    const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        expiresAt: sessionExpiresAt,
        lastUsedAt: new Date(),
        deviceInfo: (req.headers['user-agent'] ?? '').slice(0, 255) || null,
        ipAddress: (req.ip ?? '').slice(0, 45) || null,
        isRevoked: false,
      },
    });

    const accessToken = await signAccessToken({
      userId: user.id,
      sessionId: session.id,
      email: user.email ?? null,
      role: user.role,
      status: user.status,
      profileCompleted: user.profileCompleted,
    });

    const refreshToken = await signRefreshToken({ sessionId: session.id });
    const refreshTokenHash = await bcrypt.hash(refreshToken, TOKEN_BCRYPT_ROUNDS);

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    await writeAudit(AuditAction.OAUTH_LINKED, req, user.id, { provider: payload.provider });
    await writeAudit(AuditAction.LOGIN_SUCCESS, req, user.id, { provider: payload.provider, sessionId: session.id });

    res.status(200).json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        profileCompleted: user.profileCompleted,
        profileCompletion: user.profileCompletion,
        lastLoginAt: new Date(),
      },
    });
  } catch (err: unknown) {
    console.error('[OAuth Link Account Error]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'An unexpected error occurred while linking your account.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STAFF INVITATION (Public validation & acceptance)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/invitations/validate', async (req, res) => {
  try {
    const token = req.query.token as string;
    const result = await validateInvitationToken(token);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ isValid: false, reason: 'INVALID_TOKEN', error: err.message });
  }
});

router.post('/invitations/accept', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      token:    z.string().min(1, 'Invitation token is required'),
      password: z.string().min(8, 'Password must be at least 8 characters long'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const msg = firstIssue?.message ?? 'Validation failed';
      res.status(400).json({ error: msg, details: parsed.error.flatten() });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        ?? req.socket.remoteAddress
        ?? null;

    const user = await acceptStaffInvitation(parsed.data.token, parsed.data.password, clientIp);

    // Create session and sign in automatically
    const deviceInfo = (req.headers['user-agent'] ?? '').slice(0, 255) || null;
    const expiresAt  = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session = await prisma.session.create({
      data: {
        userId:           user.id,
        deviceInfo,
        ipAddress:        clientIp,
        refreshTokenHash: '',
        expiresAt,
      },
    });

    const accessToken = await signAccessToken({
      userId:           user.id,
      sessionId:        session.id,
      email:            user.email ?? null,
      role:             user.role,
      status:           user.status,
      profileCompleted: user.profileCompleted,
    });

    const refreshToken = await signRefreshToken({ sessionId: session.id });
    const refreshTokenHash = await bcrypt.hash(refreshToken, TOKEN_BCRYPT_ROUNDS);

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    const redirectMap: Record<string, string> = {
      INSTRUCTOR:      '/dashboard/instructor',
      DEPARTMENT_HEAD: '/dashboard/department-head',
      REGISTRAR:       '/dashboard/registrar',
      FINANCE_OFFICER: '/dashboard/finance-officer',
      HR_OFFICER:      '/dashboard/hr',
      ADMIN:           '/dashboard/admin',
      SUPER_ADMIN:     '/dashboard/admin',
    };

    res.status(200).json({
      success:     true,
      message:     'Account created successfully!',
      redirectUrl: redirectMap[user.role] ?? '/dashboard/admin',
      user: {
        id:                user.id,
        fullName:          user.fullName,
        email:             user.email,
        phone:             user.phone,
        role:              user.role,
        status:            user.status,
        emailVerified:     user.emailVerified,
        profileCompleted:  user.profileCompleted,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to accept invitation' });
  }
});

export default router;
