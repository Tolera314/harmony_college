-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "paymentVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "paymentVerifiedByFinance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentVerifiedByUserId" TEXT;
