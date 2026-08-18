-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "departmentSelected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrationFeePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrationFeePaidAt" TIMESTAMP(3);
