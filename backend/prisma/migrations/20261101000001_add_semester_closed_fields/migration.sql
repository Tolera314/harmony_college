-- Add closedAt and closedBy columns to Semester table
ALTER TABLE "Semester" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Semester" ADD COLUMN IF NOT EXISTS "closedBy" TEXT;
