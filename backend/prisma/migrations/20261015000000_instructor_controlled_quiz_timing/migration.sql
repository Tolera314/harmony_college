-- AlterTable: Add instructor-controlled timing fields to Quiz
ALTER TABLE "Quiz" 
ADD COLUMN "instructorStartedAt" TIMESTAMP(3),
ADD COLUMN "instructorStartedBy" TEXT;

-- Make availableFrom, availableUntil, and passingScore nullable (optional)
ALTER TABLE "Quiz" 
ALTER COLUMN "availableFrom" DROP NOT NULL,
ALTER COLUMN "availableUntil" DROP NOT NULL,
ALTER COLUMN "passingScore" DROP NOT NULL;

-- Add index for instructor-started queries
CREATE INDEX "Quiz_instructorStartedAt_idx" ON "Quiz"("instructorStartedAt");
