/**
 * Harmony College — Rate Limiters
 * ─────────────────────────────────
 * Applied to auth endpoints to prevent brute-force and abuse.
 * Uses express-rate-limit with in-memory store (suitable for single-process
 * deployments).  For multi-process / clustered deployments, swap the store for
 * a Redis-backed one (e.g. rate-limit-redis) — no other code changes needed.
 */

import rateLimit from 'express-rate-limit';

/** 10 login attempts per 5 minutes per IP. */
export const loginLimiter = rateLimit({
  windowMs:         5 * 60 * 1000,
  max:              10,
  standardHeaders:  'draft-7',
  legacyHeaders:    false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please wait 5 minutes before trying again.' },
});

/** 10 registration attempts per hour per IP. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      10,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

/** 20 refresh calls per minute per IP (tokens are short-lived; clients call this often). */
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      20,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: { error: 'Too many refresh requests. Please wait before retrying.' },
});

/** 10 verification attempts per 15 minutes per IP. */
export const verifyLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  'draft-7',
  legacyHeaders:    false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many verification attempts. Please wait 15 minutes before trying again.' },
});

/** 3 resend requests per 15 minutes per IP. */
export const resendLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             3,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: { error: 'Too many resend requests. Please wait 15 minutes before trying again.' },
});

/** 10 verification-status checks per minute per IP. */
export const verifyStatusLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             10,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: { error: 'Too many status requests. Please slow down.' },
});

/** 3 forgot-password requests per 15 minutes per IP. */
export const forgotPasswordLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             3,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: { error: 'Too many reset requests. Please wait 15 minutes before trying again.' },
});

/** 10 password-reset submissions per 15 minutes per IP. */
export const resetPasswordLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many reset attempts. Please wait 15 minutes before trying again.' },
});

/** 60 messages per minute per authenticated user (prevents spam floods). */
export const sendMessageLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  keyGenerator:    (req) => (req as import('express').Request & { user?: { userId: string } }).user?.userId ?? req.ip ?? 'anon',
  message: { error: 'Too many messages. Please slow down.' },
});

/** 30 conversation-list fetches per minute per user. */
export const listConversationsLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             30,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: { error: 'Too many requests. Please slow down.' },
});
