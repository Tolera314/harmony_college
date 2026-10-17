-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('TVET', 'SHORT_PROGRAM');

-- AlterTable Department: add programType with default
ALTER TABLE "Department" ADD COLUMN "programType" "ProgramType" NOT NULL DEFAULT 'TVET';
ALTER TABLE "Department" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_name_key";
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_code_key";

-- AlterTable Semester: add programType, termOrder, durationWeeks
ALTER TABLE "Semester" ADD COLUMN "programType" "ProgramType" NOT NULL DEFAULT 'TVET';
ALTER TABLE "Semester" ADD COLUMN "termOrder" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Semester" ADD COLUMN "durationWeeks" INTEGER;
ALTER TABLE "Semester" DROP CONSTRAINT IF EXISTS "Semester_academicYearId_name_key";

-- AlterTable Course: add programType and ects
ALTER TABLE "Course" ADD COLUMN "programType" "ProgramType" NOT NULL DEFAULT 'TVET';
ALTER TABLE "Course" ADD COLUMN "ects" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_code_key";

-- AlterTable CourseOffering: add programType
ALTER TABLE "CourseOffering" ADD COLUMN "programType" "ProgramType" NOT NULL DEFAULT 'TVET';
ALTER TABLE "CourseOffering" ADD COLUMN "shortProgramDuration" TEXT;

-- AlterTable StudentRecord: add programType
ALTER TABLE "StudentRecord" ADD COLUMN "programType" "ProgramType" NOT NULL DEFAULT 'TVET';
ALTER TABLE "StudentRecord" ADD COLUMN "shortProgramDuration" TEXT;

-- CreateIndex
CREATE INDEX "Department_programType_idx" ON "Department"("programType");
CREATE INDEX "Department_parentId_idx" ON "Department"("parentId");
CREATE UNIQUE INDEX "Department_name_programType_key" ON "Department"("name", "programType");
CREATE UNIQUE INDEX "Department_code_programType_key" ON "Department"("code", "programType");

-- CreateIndex
CREATE INDEX "Semester_programType_idx" ON "Semester"("programType");
CREATE UNIQUE INDEX "Semester_academicYearId_name_programType_key" ON "Semester"("academicYearId", "name", "programType");

-- CreateIndex
CREATE INDEX "Course_programType_idx" ON "Course"("programType");
CREATE UNIQUE INDEX "Course_code_programType_key" ON "Course"("code", "programType");

-- CreateIndex
CREATE INDEX "CourseOffering_programType_idx" ON "CourseOffering"("programType");

-- CreateIndex
CREATE INDEX "StudentRecord_programType_idx" ON "StudentRecord"("programType");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
