/**
 * Harmony College — Verification Service
 * ─────────────────────────────────────────
 * All OTP/token generation, storage, and checking logic lives here.
 * Routes call this service; this service never calls routes.
 *
 * Security properties:
 *  - OTPs are 6-digit cryptographically random integers (no Math.random)
 *  - Email tokens are 256-bit random hex strings
 *  - Only bcrypt hashes are stored in the DB (cost=8, sufficient for short-lived tokens)
 *  - Previous unused tokens for (userId, type) are invalidated before issuing a new one
 *  - bcrypt.compare is always called, even for expired/used tokens (timing consistency)
 *  - Account activation and token invalidation are atomic (Prisma $transaction)
 */

import { randomBytes, randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { getSmsProvider, getEmailProvider } from '../lib/providers';
import {
  VerificationTokenType,
  AccountStatus,
  TOKEN_BCRYPT_ROUNDS,
  VERIFICATION_TOKEN_TTL_SECONDS,
  MAX_OTP_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../types/auth';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type VerifyResult =
  | { ok: true }
  | { ok: false; code: VerifyErrorCode; message: string };

export type VerifyErrorCode =
  | 'ALREADY_VERIFIED'
  | 'NO_TOKEN'
  | 'CODE_EXPIRED'
  | 'MAX_ATTEMPTS'
  | 'INVALID_CODE'
  | 'USER_NOT_FOUND'
  | 'PROVIDER_ERROR';

export type ResendResult =
  | { ok: true; cooldownSeconds: number }
  | { ok: false; code: ResendErrorCode; message: string; retryAfterSeconds?: number };

export type ResendErrorCode =
  | 'ALREADY_VERIFIED'
  | 'USER_NOT_FOUND'
  | 'RESEND_COOLDOWN'
  | 'PROVIDER_ERROR';

// ─────────────────────────────────────────────────────────────────────────────
// RESEND / SEND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate and send a new verification code.
 * Invalidates all previous unused tokens for (userId, type) first.
 * Enforces the per-user resend cooldown.
 */
export async function sendVerificationCode(
  userId: string,
  type: 'phone' | 'email'
): Promise<ResendResult> {
  const tokenType =
    type === 'phone'
      ? VerificationTokenType.PHONE_OTP
      : VerificationTokenType.EMAIL_TOKEN;

  // Load the user
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, fullName: true, phone: true, email: true, phoneVerified: true, emailVerified: true },
  });

  if (!user) {
    return { ok: false, code: 'USER_NOT_FOUND', message: 'Account not found.' };
  }

  // Check already verified
  if (type === 'phone' && user.phoneVerified) {
    return { ok: false, code: 'ALREADY_VERIFIED', message: 'Phone number is already verified.' };
  }
  if (type === 'email' && user.emailVerified) {
    return { ok: false, code: 'ALREADY_VERIFIED', message: 'Email address is already verified.' };
  }

  // Check resend cooldown: find the most recent active token
  const latestToken = await prisma.verificationToken.findFirst({
    where:   { userId, type: tokenType, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (latestToken) {
    const secondsSinceCreated =
      (Date.now() - latestToken.createdAt.getTime()) / 1000;
    if (secondsSinceCreated < OTP_RESEND_COOLDOWN_SECONDS) {
      const retryAfterSeconds = Math.ceil(
        OTP_RESEND_COOLDOWN_SECONDS - secondsSinceCreated
      );
      return {
        ok: false,
        code: 'RESEND_COOLDOWN',
        message: `Please wait ${retryAfterSeconds} seconds before requesting a new code.`,
        retryAfterSeconds,
      };
    }
  }

  // Invalidate all previous unused tokens for this user + type
  await prisma.verificationToken.updateMany({
    where: { userId, type: tokenType, used: false },
    data:  { used: true },
  });

  // Generate new raw code / token
  const rawCode =
    type === 'phone'
      ? String(randomInt(100000, 999999))          // 6-digit OTP
      : randomBytes(32).toString('hex');             // 64-char email token

  const tokenHash = await bcrypt.hash(rawCode, TOKEN_BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_SECONDS * 1000);

  await prisma.verificationToken.create({
    data: { userId, type: tokenType, tokenHash, expiresAt, attempts: 0, used: false },
  });

  // Deliver via provider
  if (type === 'phone') {
    const sms = getSmsProvider();
    const result = await sms.sendOtp(user.phone!, rawCode);
    if (!result.success) {
      return { ok: false, code: 'PROVIDER_ERROR', message: 'Failed to send SMS. Please try again.' };
    }
  } else {
    const email = getEmailProvider();
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/verify-email?userId=${userId}&token=${rawCode}`;
    const result = await email.sendVerificationEmail(user.email!, {
      fullName: user.fullName,
      verificationLink: link,
      expiresInMinutes: Math.round(VERIFICATION_TOKEN_TTL_SECONDS / 60),
    });
    if (!result.success) {
      return { ok: false, code: 'PROVIDER_ERROR', message: 'Failed to send email. Please try again.' };
    }
  }

  return { ok: true, cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS };
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a submitted code/token.
 * On success: marks phoneVerified/emailVerified = true, sets status = ACTIVE,
 *             marks the token as used — all in a single atomic transaction.
 * Returns { ok: true } on success so the caller can proceed to issue auth cookies.
 */
export async function verifyCode(
  userId: string,
  submittedCode: string,
  type: 'phone' | 'email'
): Promise<VerifyResult> {
  const tokenType =
    type === 'phone'
      ? VerificationTokenType.PHONE_OTP
      : VerificationTokenType.EMAIL_TOKEN;

  // Check user exists
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, phoneVerified: true, emailVerified: true, status: true },
  });
  if (!user) {
    // Perform a dummy compare to prevent timing attacks
    await bcrypt.compare(submittedCode, '$2a$08$dummyhashfortimingnobodyshoulduseXXXXX');
    return { ok: false, code: 'USER_NOT_FOUND', message: 'Account not found.' };
  }

  // Already verified?
  if (type === 'phone' && user.phoneVerified) {
    await bcrypt.compare(submittedCode, '$2a$08$dummyhashfortimingnobodyshoulduseXXXXX');
    return { ok: false, code: 'ALREADY_VERIFIED', message: 'Phone number is already verified.' };
  }
  if (type === 'email' && user.emailVerified) {
    await bcrypt.compare(submittedCode, '$2a$08$dummyhashfortimingnobodyshoulduseXXXXX');
    return { ok: false, code: 'ALREADY_VERIFIED', message: 'Email address is already verified.' };
  }

  // Find the latest unused token
  const token = await prisma.verificationToken.findFirst({
    where:   { userId, type: tokenType, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!token) {
    await bcrypt.compare(submittedCode, '$2a$08$dummyhashfortimingnobodyshoulduseXXXXX');
    return { ok: false, code: 'NO_TOKEN', message: 'No verification code found. Please request a new one.' };
  }

  // Check max attempts BEFORE bcrypt.compare (prevent grinding)
  if (token.attempts >= MAX_OTP_ATTEMPTS) {
    await bcrypt.compare(submittedCode, '$2a$08$dummyhashfortimingnobodyshoulduseXXXXX');
    return { ok: false, code: 'MAX_ATTEMPTS', message: 'Too many incorrect attempts. Please request a new code.' };
  }

  // Check expiry BEFORE bcrypt.compare (consistent timing)
  const isExpired = token.expiresAt < new Date();

  // Always compare — constant time regardless of expiry/attempt state
  const codeMatch = await bcrypt.compare(submittedCode, token.tokenHash);

  if (isExpired) {
    return { ok: false, code: 'CODE_EXPIRED', message: 'Verification code has expired. Please request a new one.' };
  }

  if (!codeMatch) {
    // Increment attempt counter atomically
    await prisma.verificationToken.update({
      where: { id: token.id },
      data:  { attempts: { increment: 1 } },
    });
    const remaining = MAX_OTP_ATTEMPTS - (token.attempts + 1);
    return {
      ok: false,
      code: 'INVALID_CODE',
      message: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect code. No attempts remaining — please request a new code.',
    };
  }

  // ── Success: atomic transaction ──────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // Mark token as used
    await tx.verificationToken.update({
      where: { id: token.id },
      data:  { used: true, attempts: { increment: 1 } },
    });

    // Update user verification flags and activate account
    const updateData: Record<string, unknown> = {
      status: AccountStatus.ACTIVE,
    };
    if (type === 'phone') updateData.phoneVerified = true;
    if (type === 'email') updateData.emailVerified  = true;

    await tx.user.update({ where: { id: userId }, data: updateData });
  });

  return { ok: true };
}
