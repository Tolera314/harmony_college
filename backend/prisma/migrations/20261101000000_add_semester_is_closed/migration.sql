-- Add isClosed column to Semester table
ALTER TABLE "Semester" ADD COLUMN "isClosed" BOOLEAN NOT NULL DEFAULT false;
