-- Phase 6: Add attempts counter to PasswordResetToken
-- This is a backward-compatible additive change — no existing data is affected.
ALTER TABLE "PasswordResetToken" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
