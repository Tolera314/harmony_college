/**
 * Harmony College — Authentication & Authorization Middleware
 * ─────────────────────────────────────────────────────────────
 * authenticate()   — verifies access token, populates req.user
 * requireAuth()    — alias: same as authenticate(), returns 401 if not authed
 * requireRole(...) — requires authenticated user to have one of the given roles
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { prisma } from '../lib/prisma';
import { verifyJWT } from '../lib/auth';
import { Role, AccountStatus, getInactivityTimeoutMs } from '../types/auth';

// ─────────────────────────────────────────────────────────────────────────────
// AuthRequest — extended Request with populated user identity
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: {
    userId:           string;
    sessionId:        string;
    email:            string | null;
    role:             Role;
    status:           AccountStatus;
    profileCompleted: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// clearCookies helper (avoids importing the route-layer function)
// ─────────────────────────────────────────────────────────────────────────────

function clearCookies(res: Response): void {
  const IS_PROD = process.env.NODE_ENV === 'production';
  res.clearCookie('accessToken',  { httpOnly: true, secure: IS_PROD, sameSite: 'lax',    path: '/' });
  res.clearCookie('refreshToken', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/api/auth/refresh' });
  res.clearCookie('session',      { httpOnly: true, secure: IS_PROD, sameSite: 'lax',    path: '/' });
}

// ─────────────────────────────────────────────────────────────────────────────
// authenticate / requireAuth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core authentication middleware.
 * 1. Reads the accessToken cookie (falls back to legacy session cookie).
 * 2. Verifies the JWT signature and expiry.
 * 3. If the token carries a sessionId, checks the Session row in DB for
 *    revocation and inactivity.
 * 4. Attaches req.user.
 */
export async function authenticate(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction
): Promise<void> {
  const token: string | undefined =
    req.cookies?.accessToken ?? req.cookies?.session;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  const payload = await verifyJWT(token);
  if (!payload || typeof payload.userId !== 'string') {
    res.status(401).json({ error: 'Session expired or invalid.' });
    return;
  }

  const sessionId: string =
    typeof payload.sessionId === 'string' ? payload.sessionId : '';

  // DB-level revocation check (only when token carries sessionId)
  if (sessionId) {
    try {
      const session = await prisma.session.findUnique({
        where:  { id: sessionId },
        select: { isRevoked: true, expiresAt: true, lastUsedAt: true },
      });

      if (!session || session.isRevoked || session.expiresAt < new Date()) {
        clearCookies(res);
        res.status(401).json({ error: 'Session expired or revoked.' });
        return;
      }

      // Inactivity check
      const idleMs = Date.now() - session.lastUsedAt.getTime();
      if (idleMs > getInactivityTimeoutMs()) {
        await prisma.session.update({
          where: { id: sessionId },
          data:  { isRevoked: true },
        });
        clearCookies(res);
        res.status(401).json({
          error: 'Your session expired due to inactivity.',
          code:  'INACTIVITY_TIMEOUT',
        });
        return;
      }
    } catch {
      // If we can't reach the DB, still honour the JWT (degrade gracefully)
    }
  }

  req.user = {
    userId:           payload.userId,
    sessionId,
    email:            (payload.email    as string | null | undefined) ?? null,
    role:             payload.role      as Role,
    status:           (payload.status   as AccountStatus | undefined) ?? AccountStatus.ACTIVE,
    profileCompleted: (payload.profileCompleted as boolean | undefined) ?? false,
  };

  next();
}

/** Alias — used by existing chat and upload routes. */
export const requireAuth = authenticate;

// ─────────────────────────────────────────────────────────────────────────────
// requireRole
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authorization middleware factory.
 * Returns a middleware that allows the request through only if the authenticated
 * user's role is in the provided list.
 *
 * @example
 *   router.delete('/users/:id',
 *     authenticate,
 *     requireRole([Role.ADMIN, Role.SUPER_ADMIN]),
 *     handler
 *   );
 */
export function requireRole(allowedRoles: Role[]): RequestHandler {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireProfileComplete
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Middleware that blocks STUDENT users who have not yet completed their profile.
 * Non-student roles are always passed through.
 * Apply to academic endpoints (course registration, grades, etc.) in later phases.
 */
export function requireProfileComplete(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  // Only apply the gate to students
  if (req.user.role === Role.STUDENT && !req.user.profileCompleted) {
    res.status(403).json({
      error: 'Complete your student profile before accessing this feature.',
      code:  'PROFILE_INCOMPLETE',
    });
    return;
  }
  next();
}
