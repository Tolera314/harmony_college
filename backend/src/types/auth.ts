/**
 * Harmony College — Authentication Type Constants
 * ─────────────────────────────────────────────────
 * Shared TypeScript constants and types for the authentication system.
 * These mirror the Prisma enums so application code never uses raw strings.
 *
 * Import from this file rather than from '@prisma/client' directly
 * so the rest of the codebase stays decoupled from the ORM layer.
 */

import { Role, AccountStatus, VerificationTokenType, AuditAction } from '@prisma/client';

// Re-export Prisma enums so callers never need to import from @prisma/client
export { Role, AccountStatus, VerificationTokenType, AuditAction };

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The only role ever produced by public registration.
 * The backend MUST hardcode this — never accept a role from the request body.
 */
export const PUBLIC_SIGNUP_ROLE: Role = Role.STUDENT;

/**
 * Roles that can be assigned to staff accounts by an authorised administrator.
 * These roles can NEVER be created through the public signup endpoint.
 */
export const STAFF_ROLES: ReadonlyArray<Role> = [
  Role.INSTRUCTOR,
  Role.DEPARTMENT_HEAD,
  Role.HR_OFFICER,
  Role.FINANCE_OFFICER,
  Role.REGISTRAR,
  Role.ADMIN,
  Role.SUPER_ADMIN,
];

/**
 * Roles allowed to manage other users' accounts.
 */
export const ADMIN_ROLES: ReadonlyArray<Role> = [
  Role.ADMIN,
  Role.SUPER_ADMIN,
];

/**
 * All roles that have privileged (non-student) access.
 */
export const PRIVILEGED_ROLES: ReadonlyArray<Role> = [
  Role.INSTRUCTOR,
  Role.DEPARTMENT_HEAD,
  Role.HR_OFFICER,
  Role.FINANCE_OFFICER,
  Role.REGISTRAR,
  Role.ADMIN,
  Role.SUPER_ADMIN,
];

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT STATUS CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Statuses that prevent a user from logging in.
 */
export const BLOCKED_STATUSES: ReadonlyArray<AccountStatus> = [
  AccountStatus.PENDING_VERIFICATION,
  AccountStatus.SUSPENDED,
  AccountStatus.DEACTIVATED,
  AccountStatus.LOCKED,
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

/** Lock account after this many consecutive failed login attempts. */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5 as const;

/** Access token lifetime in seconds (15 minutes). */
export const ACCESS_TOKEN_TTL_SECONDS: number = 900;

/** Refresh token lifetime in seconds (30 days). */
export const REFRESH_TOKEN_TTL_SECONDS: number = 2592000;

/** OTP / email verification token lifetime in seconds (10 minutes). */
export const VERIFICATION_TOKEN_TTL_SECONDS: number = 600;

/** Password reset token lifetime in seconds (15 minutes). */
export const PASSWORD_RESET_TOKEN_TTL_SECONDS: number = 900;

/** Maximum wrong OTP attempts before a verification token is invalidated. */
export const MAX_OTP_ATTEMPTS = 5 as const;

/** Minimum seconds before a new verification code can be requested. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60 as const;

/** bcrypt salt rounds for user passwords (strong). */
export const PASSWORD_BCRYPT_ROUNDS = 12 as const;

/** bcrypt salt rounds for OTP/token hashes (lower cost is fine — tokens are random). */
export const TOKEN_BCRYPT_ROUNDS = 8 as const;

/**
 * Session inactivity timeout in milliseconds.
 * Configurable via SESSION_INACTIVITY_TIMEOUT env var (value in minutes).
 * Default: 30 minutes.
 * The session is invalidated if lastUsedAt < now - this value.
 */
export function getInactivityTimeoutMs(): number {
  const envVal = process.env.SESSION_INACTIVITY_TIMEOUT;
  const minutes = envVal ? parseInt(envVal, 10) : 30;
  return (isNaN(minutes) ? 30 : minutes) * 60 * 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 6 — PASSWORD RESET
// ─────────────────────────────────────────────────────────────────────────────

/** Password reset token lifetime in seconds. Configurable via RESET_TOKEN_TTL env (seconds). Default: 15 min. */
export function getResetTokenTtlSeconds(): number {
  const v = process.env.RESET_TOKEN_TTL;
  const n = v ? parseInt(v, 10) : 900;
  return isNaN(n) ? 900 : n;
}

/** Minimum seconds before a new reset code can be requested per account. */
export const RESET_RESEND_COOLDOWN_SECONDS = 60 as const;

/** Maximum wrong attempts before a reset token is invalidated. */
export const MAX_RESET_ATTEMPTS = 5 as const;

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE COMPLETION
// ─────────────────────────────────────────────────────────────────────────────

/** Percentage at which profileCompleted is set to true. */
export const PROFILE_COMPLETION_THRESHOLD = 100 as const;

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE-LEVEL DASHBOARD MAPPING
// Used by frontend (and optionally backend) to map a role to its home route.
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_DASHBOARD_MAP: Readonly<Record<Role, string>> = {
  [Role.STUDENT]:        '/dashboard/student',
  [Role.INSTRUCTOR]:     '/dashboard/instructor',
  [Role.DEPARTMENT_HEAD]:'/dashboard/department-head',
  [Role.HR_OFFICER]:     '/dashboard/hr',
  [Role.FINANCE_OFFICER]:'/dashboard/finance-officer',
  [Role.REGISTRAR]:      '/dashboard/registrar',
  [Role.ADMIN]:          '/dashboard/admin',
  [Role.SUPER_ADMIN]:    '/dashboard/admin',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PAYLOAD TYPE
// Represents the decoded content of an access token.
// Phase 2+ will use this when signing/verifying JWTs.
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  /** Matches User.id */
  userId: string;
  /** Matches Session.id */
  sessionId: string;
  email: string | null;
  role: Role;
  status: AccountStatus;
  /** Embedded so Next.js middleware can enforce the profile-completion gate
   *  without a DB call on every request. */
  profileCompleted: boolean;
}

export interface RefreshTokenPayload {
  /** Matches Session.id — only claim needed for refresh */
  sessionId: string;
}
