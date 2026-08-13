/**
 * Harmony College — JWT Utilities
 * ─────────────────────────────────
 * Provides separate signing functions for access tokens and refresh tokens,
 * plus a shared verifier.  All tokens use HS256.
 *
 * Access tokens  → short-lived (env: ACCESS_TOKEN_EXPIRES_IN, default 15m)
 * Refresh tokens → long-lived  (env: REFRESH_TOKEN_EXPIRES_IN, default 30d)
 *
 * The JWT_SECRET MUST be set in the environment.  The server refuses to start
 * without it.  Never use a fallback in production.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { AccessTokenPayload, RefreshTokenPayload } from '../types/auth';

// ── Secret key ────────────────────────────────────────────────────────────────

function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'JWT_SECRET is not set or is too short (minimum 32 characters). ' +
      'Set it in your .env file before starting the server.'
    );
  }
  return new TextEncoder().encode(secret);
}

// ── Token expiry (read from env, sensible defaults) ───────────────────────────

function accessTokenExpiry(): string {
  return process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m';
}

function refreshTokenExpiry(): string {
  return process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d';
}

// ── Signers ───────────────────────────────────────────────────────────────────

/**
 * Signs a short-lived access token containing the minimum required claims.
 * Never put sensitive personal data (passwords, tokens, hashes) in here.
 */
export async function signAccessToken(
  payload: AccessTokenPayload
): Promise<string> {
  const key = getKey();
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(accessTokenExpiry())
    .sign(key);
}

/**
 * Signs a long-lived refresh token.
 * The payload contains only sessionId — minimal surface area.
 * The raw token itself is stored in a cookie; only its hash lives in the DB.
 */
export async function signRefreshToken(
  payload: RefreshTokenPayload
): Promise<string> {
  const key = getKey();
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(refreshTokenExpiry())
    .sign(key);
}

/**
 * Legacy helper kept for backward compatibility with existing routes
 * (signin, signup) that still use it.  Will be removed when those routes
 * are fully refactored.
 *
 * @deprecated Use signAccessToken() instead.
 */
export async function signJWT(payload: Record<string, unknown>): Promise<string> {
  const key = getKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

/**
 * Verifies any JWT signed by this server.
 * Returns the decoded payload or null if the token is invalid / expired.
 */
export async function verifyJWT(
  token: string
): Promise<Record<string, unknown> | null> {
  try {
    const key = getKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}
