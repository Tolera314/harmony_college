-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "onboardingRejectionReason" TEXT,
ADD COLUMN     "onboardingReviewedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingReviewedBy" TEXT,
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "registrationScreenshotUrl" TEXT,
ADD COLUMN     "screenshotUploadedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "selectedDepartmentId" TEXT;
