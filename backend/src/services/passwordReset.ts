/**
 * Harmony College — Password Reset Service
 * ──────────────────────────────────────────
 * requestPasswordReset  — generate token, send via email/SMS
 * validateResetToken    — check token validity without consuming it
 * executePasswordReset  — verify token, update password, revoke sessions
 *
 * Security properties (matching Phase 4 verification.ts patterns):
 *  - Email users: 64-char hex link token
 *  - Phone-only users: 6-digit OTP
 *  - Only bcrypt hashes stored in DB (cost = TOKEN_BCRYPT_ROUNDS = 8)
 *  - Previous unused tokens invalidated before issuing a new one
 *  - bcrypt.compare always called regardless of expiry/attempt state (timing safety)
 *  - All sessions deleted atomically with password update
 *  - Raw token/OTP never returned in any result object
 */

import { randomBytes, randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { getSmsProvider, getEmailProvider } from '../lib/providers';
import {
  AccountStatus,
  AuditAction,
  PASSWORD_BCRYPT_ROUNDS,
  TOKEN_BCRYPT_ROUNDS,
  MAX_RESET_ATTEMPTS,
  RESET_RESEND_COOLDOWN_SECONDS,
  getResetTokenTtlSeconds,
} from '../types/auth';

// ─────────────────────────────────────────────────────────────────────────────
// RESULT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type RequestResult =
  | { ok: true; isOtp?: boolean; userId?: string }
  | { ok: false; code: string; message: string };

export type ValidateResult =
  | { ok: true; expiresAt: Date; isOtp: boolean }
  | { ok: false; code: 'TOKEN_EXPIRED' | 'INVALID_TOKEN'; message: string };

export type ResetResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

const DUMMY_HASH = '$2a$08$dummyhashforpasswordresetnobodyshoulduseXXXXXX';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function writeAudit(
  action: AuditAction,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { action, userId, metadata: metadata ? (metadata as object) : undefined },
    });
  } catch { /* never crash */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// requestPasswordReset
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a reset token/OTP and sends it via email or SMS.
 * Always returns { ok: true } even if the account does not exist
 * — callers must return the same generic HTTP response to prevent enumeration.
 */
export async function requestPasswordReset(
  identifier: string
): Promise<RequestResult> {
  const { isPhone: phoneDetect, normalizePhone } = await import('../lib/validations');
  const isPhoneIdentifier = phoneDetect(identifier.trim());
  const lookupKey = isPhoneIdentifier
    ? { phone: normalizePhone(identifier.trim()) }
    : { email: identifier.trim().toLowerCase() };

  // Find user — always return ok:true to caller regardless of outcome
  const user = await prisma.user.findUnique({
    where:  lookupKey,
    select: { id: true, fullName: true, email: true, phone: true, status: true },
  });

  if (!user) {
    // Timing equalization — simulate async work
    await bcrypt.compare('dummy', DUMMY_HASH);
    return { ok: true };
  }

  // Deactivated accounts silently do nothing (don't even send)
  if (user.status === AccountStatus.DEACTIVATED) {
    await bcrypt.compare('dummy', DUMMY_HASH);
    return { ok: true };
  }

  const useEmail = !isPhoneIdentifier && !!user.email;

  // Resend cooldown: if a recent unused token exists, stay silent
  const latestToken = await prisma.passwordResetToken.findFirst({
    where:   { userId: user.id, used: false },
    orderBy: { createdAt: 'desc' },
  });
  if (latestToken) {
    const seconds = (Date.now() - latestToken.createdAt.getTime()) / 1000;
    if (seconds < RESET_RESEND_COOLDOWN_SECONDS) {
      return { ok: true, isOtp: !useEmail, userId: useEmail ? undefined : user.id }; // silently suppress — no new delivery
    }
  }

  // Invalidate all previous unused tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data:  { used: true },
  });

  const ttl       = getResetTokenTtlSeconds();
  const expiresAt = new Date(Date.now() + ttl * 1000);

  // Decide delivery method: SMS OTP if phone identifier used or no email, email link otherwise
  const rawToken  = useEmail
    ? randomBytes(32).toString('hex')     // 64-char link token
    : String(randomInt(100000, 999999));  // 6-digit OTP

  const tokenHash = await bcrypt.hash(rawToken, TOKEN_BCRYPT_ROUNDS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt, attempts: 0, used: false },
  });

  if (useEmail) {
    const provider    = getEmailProvider();
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetLink   = `${frontendUrl}/reset-password?userId=${user.id}&token=${rawToken}`;
    await provider.sendPasswordResetEmail(user.email!, {
      fullName:       user.fullName,
      resetLink,
      expiresInMinutes: Math.round(ttl / 60),
    });
  } else {
    const provider = getSmsProvider();
    await provider.sendOtp(user.phone!, rawToken);
  }

  await writeAudit(AuditAction.PASSWORD_RESET_REQUESTED, user.id);
  return { ok: true, isOtp: !useEmail, userId: useEmail ? undefined : user.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// validateResetToken
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks token validity without consuming it.
 * Used by the frontend reset-password page on mount to show the form or
 * the expired-link state before the user types anything.
 */
export async function validateResetToken(
  userId:   string,
  rawToken: string
): Promise<ValidateResult> {
  const token = await prisma.passwordResetToken.findFirst({
    where:   { userId, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!token) {
    await bcrypt.compare(rawToken, DUMMY_HASH);
    return { ok: false, code: 'INVALID_TOKEN', message: 'This reset link is invalid or has already been used.' };
  }

  const isExpired = token.expiresAt < new Date();
  const match     = await bcrypt.compare(rawToken, token.tokenHash);

  if (!match || isExpired) {
    return {
      ok:      false,
      code:    isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: isExpired
        ? 'This reset link has expired. Please request a new one.'
        : 'This reset link is invalid or has already been used.',
    };
  }

  // Determine if this is an OTP (6 digits) or a link token (64 hex chars)
  const isOtp = /^\d{6}$/.test(rawToken);
  return { ok: true, expiresAt: token.expiresAt, isOtp };
}

// ─────────────────────────────────────────────────────────────────────────────
// executePasswordReset
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies the token, updates the password, revokes all sessions.
 * On success, the caller should clear auth cookies and redirect to login.
 */
export async function executePasswordReset(
  userId:      string,
  rawToken:    string,
  newPassword: string
): Promise<ResetResult> {
  // Load user + current password hash
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, passwordHash: true, status: true, profileCompleted: true, profileCompletion: true },
  });

  if (!user) {
    await bcrypt.compare(rawToken, DUMMY_HASH);
    return { ok: false, code: 'INVALID_TOKEN', message: 'Invalid or expired reset link.' };
  }

  // Find the most recent unused token
  const token = await prisma.passwordResetToken.findFirst({
    where:   { userId, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!token) {
    await bcrypt.compare(rawToken, DUMMY_HASH);
    return { ok: false, code: 'INVALID_TOKEN', message: 'Invalid or expired reset link.' };
  }

  // Max attempts check (OTP flow protection)
  if (token.attempts >= MAX_RESET_ATTEMPTS) {
    await bcrypt.compare(rawToken, DUMMY_HASH);
    return { ok: false, code: 'MAX_ATTEMPTS', message: 'Too many attempts. Please request a new reset link.' };
  }

  const isExpired = token.expiresAt < new Date();
  const match     = await bcrypt.compare(rawToken, token.tokenHash);

  if (isExpired) {
    return { ok: false, code: 'TOKEN_EXPIRED', message: 'This reset link has expired. Please request a new one.' };
  }

  if (!match) {
    // Increment attempts
    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data:  { attempts: { increment: 1 } },
    });
    const remaining = MAX_RESET_ATTEMPTS - (token.attempts + 1);
    return {
      ok:      false,
      code:    'INVALID_CODE',
      message: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new reset link.',
    };
  }

  // Check new password ≠ old password
  const isSamePassword = user.passwordHash ? await bcrypt.compare(newPassword, user.passwordHash) : false;
  if (isSamePassword) {
    return { ok: false, code: 'SAME_PASSWORD', message: 'New password must be different from your current password.' };
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, PASSWORD_BCRYPT_ROUNDS);

  // Atomic transaction: update password, mark token used, revoke all sessions
  await prisma.$transaction(async (tx) => {
    // Update password and reset security counters
    const updateData: Record<string, unknown> = {
      passwordHash:        newPasswordHash,
      failedLoginAttempts: 0,
    };
    // If account was LOCKED or PENDING_VERIFICATION, activate it
    if (user.status === AccountStatus.LOCKED || user.status === AccountStatus.PENDING_VERIFICATION) {
      updateData.status = AccountStatus.ACTIVE;
    }
    await tx.user.update({ where: { id: userId }, data: updateData });

    // Mark token as used
    await tx.passwordResetToken.update({
      where: { id: token.id },
      data:  { used: true, attempts: { increment: 1 } },
    });

    // Revoke all sessions — old tokens must not work
    await tx.session.deleteMany({ where: { userId } });
  });

  await writeAudit(AuditAction.PASSWORD_RESET_COMPLETED, userId);
  await writeAudit(AuditAction.PASSWORD_CHANGED, userId);

  return { ok: true };
}
