-- CreateTable
CREATE TABLE "InstructorGradeDraft" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "assignmentMarks" DOUBLE PRECISION,
    "quizMarks" DOUBLE PRECISION,
    "midExamMarks" DOUBLE PRECISION,
    "finalExamMarks" DOUBLE PRECISION,
    "attendanceMarks" DOUBLE PRECISION,
    "otherMarks" DOUBLE PRECISION,
    "finalMark" DOUBLE PRECISION,
    "letterGrade" TEXT,
    "gradePoints" DOUBLE PRECISION,
    "qualityPoints" DOUBLE PRECISION,
    "creditHours" INTEGER NOT NULL DEFAULT 3,
    "ects" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorGradeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstructorGradeDraft_enrollmentId_instructorId_key" ON "InstructorGradeDraft"("enrollmentId", "instructorId");

-- CreateIndex
CREATE INDEX "InstructorGradeDraft_instructorId_idx" ON "InstructorGradeDraft"("instructorId");

-- CreateIndex
CREATE INDEX "InstructorGradeDraft_enrollmentId_idx" ON "InstructorGradeDraft"("enrollmentId");
