-- Add registrar notification tracking to StudentProfile
-- This tracks when the Registrar notified a student to complete payment

ALTER TABLE "StudentProfile" ADD COLUMN "notifiedByRegistrar" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudentProfile" ADD COLUMN "notifiedAt" TIMESTAMP(3);
ALTER TABLE "StudentProfile" ADD COLUMN "notifiedBy" TEXT;

-- Create index for querying onboarding students (not yet payment verified)
CREATE INDEX "StudentProfile_paymentVerifiedByFinance_idx" ON "StudentProfile"("paymentVerifiedByFinance");
