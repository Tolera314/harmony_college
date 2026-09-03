-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "programType" TEXT,
ADD COLUMN     "shortProgramDuration" TEXT;

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "programType" TEXT,
ADD COLUMN     "shortProgramDuration" TEXT;
