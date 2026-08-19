-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'LATE', 'GRADED', 'RETURNED');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER', 'ESSAY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AttendanceSessionLifecycle" AS ENUM ('NOT_STARTED', 'OPEN', 'CLOSED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('MANUAL', 'QR');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TUITION', 'FEE', 'SCHOLARSHIP', 'GRANT', 'PAYMENT', 'REFUND', 'PENALTY');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "GradeScale" (
    "id" TEXT NOT NULL,
    "letterGrade" TEXT NOT NULL,
    "gradePoints" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isPassing" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 100,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "allowLateSubmit" BOOLEAN NOT NULL DEFAULT false,
    "maxFileSize" INTEGER NOT NULL DEFAULT 250,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentAttachment" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentRecordId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" TEXT,
    "textContent" TEXT,
    "score" DOUBLE PRECISION,
    "letterGrade" TEXT,
    "feedback" TEXT,
    "gradedAt" TIMESTAMP(3),
    "gradedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "availableUntil" TIMESTAMP(3) NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 60,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "totalPoints" INTEGER NOT NULL DEFAULT 100,
    "showResultsImmediately" BOOLEAN NOT NULL DEFAULT true,
    "status" "QuizStatus" NOT NULL DEFAULT 'DRAFT',
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentRecordId" TEXT NOT NULL,
    "status" "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "timeSpentSeconds" INTEGER,
    "score" DOUBLE PRECISION,
    "percentageScore" DOUBLE PRECISION,
    "isPassing" BOOLEAN,
    "feedback" TEXT,
    "gradedAt" TIMESTAMP(3),
    "gradedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN,
    "pointsEarned" DOUBLE PRECISION,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "topic" TEXT,
    "roomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "lifecycle" "AttendanceSessionLifecycle" NOT NULL DEFAULT 'NOT_STARTED',
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "qrTokenHash" TEXT,
    "qrTokenExpiry" TIMESTAMP(3),
    "lateAfterMinutes" INTEGER NOT NULL DEFAULT 10,
    "closeAfterMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "attendanceSessionId" TEXT NOT NULL,
    "studentRecordId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "method" "AttendanceMethod" NOT NULL DEFAULT 'MANUAL',
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedBy" TEXT NOT NULL,
    "note" TEXT,
    "correctionOf" TEXT,
    "correctionReason" TEXT,
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrectionLog" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "oldStatus" "AttendanceStatus" NOT NULL,
    "newStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceCorrectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "studentRecordId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "clearedForTerm" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "receiptId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "referenceId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorAppointment" (
    "id" TEXT NOT NULL,
    "studentRecordId" TEXT NOT NULL,
    "advisorUserId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "requestedTime" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "meetingLink" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNotificationPreference" (
    "id" TEXT NOT NULL,
    "studentRecordId" TEXT NOT NULL,
    "gradeAlerts" BOOLEAN NOT NULL DEFAULT true,
    "tuitionReminders" BOOLEAN NOT NULL DEFAULT true,
    "registrarNotices" BOOLEAN NOT NULL DEFAULT true,
    "advisorMessages" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GradeScale_letterGrade_key" ON "GradeScale"("letterGrade");

-- CreateIndex
CREATE INDEX "GradeScale_isActive_idx" ON "GradeScale"("isActive");

-- CreateIndex
CREATE INDEX "GradeScale_letterGrade_idx" ON "GradeScale"("letterGrade");

-- CreateIndex
CREATE INDEX "Assignment_courseOfferingId_idx" ON "Assignment"("courseOfferingId");

-- CreateIndex
CREATE INDEX "Assignment_dueDate_idx" ON "Assignment"("dueDate");

-- CreateIndex
CREATE INDEX "Assignment_status_idx" ON "Assignment"("status");

-- CreateIndex
CREATE INDEX "AssignmentAttachment_assignmentId_idx" ON "AssignmentAttachment"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_assignmentId_idx" ON "AssignmentSubmission"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_studentRecordId_idx" ON "AssignmentSubmission"("studentRecordId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_status_idx" ON "AssignmentSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentRecordId_key" ON "AssignmentSubmission"("assignmentId", "studentRecordId");

-- CreateIndex
CREATE INDEX "Quiz_courseOfferingId_idx" ON "Quiz"("courseOfferingId");

-- CreateIndex
CREATE INDEX "Quiz_status_idx" ON "Quiz"("status");

-- CreateIndex
CREATE INDEX "Quiz_availableFrom_idx" ON "Quiz"("availableFrom");

-- CreateIndex
CREATE INDEX "Quiz_availableUntil_idx" ON "Quiz"("availableUntil");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE INDEX "QuizQuestion_orderIndex_idx" ON "QuizQuestion"("orderIndex");

-- CreateIndex
CREATE INDEX "QuizQuestionOption_questionId_idx" ON "QuizQuestionOption"("questionId");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- CreateIndex
CREATE INDEX "QuizAttempt_studentRecordId_idx" ON "QuizAttempt"("studentRecordId");

-- CreateIndex
CREATE INDEX "QuizAttempt_status_idx" ON "QuizAttempt"("status");

-- CreateIndex
CREATE INDEX "QuizAnswer_attemptId_idx" ON "QuizAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "QuizAnswer_questionId_idx" ON "QuizAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_attemptId_questionId_key" ON "QuizAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "ClassSession_courseOfferingId_idx" ON "ClassSession"("courseOfferingId");

-- CreateIndex
CREATE INDEX "ClassSession_date_idx" ON "ClassSession"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_courseOfferingId_date_startTime_key" ON "ClassSession"("courseOfferingId", "date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_classSessionId_key" ON "AttendanceSession"("classSessionId");

-- CreateIndex
CREATE INDEX "AttendanceSession_openedBy_idx" ON "AttendanceSession"("openedBy");

-- CreateIndex
CREATE INDEX "AttendanceSession_lifecycle_idx" ON "AttendanceSession"("lifecycle");

-- CreateIndex
CREATE INDEX "AttendanceRecord_attendanceSessionId_idx" ON "AttendanceRecord"("attendanceSessionId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentRecordId_idx" ON "AttendanceRecord"("studentRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_attendanceSessionId_studentRecordId_key" ON "AttendanceRecord"("attendanceSessionId", "studentRecordId");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionLog_attendanceRecordId_idx" ON "AttendanceCorrectionLog"("attendanceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_studentRecordId_key" ON "FinancialAccount"("studentRecordId");

-- CreateIndex
CREATE INDEX "FinancialAccount_studentRecordId_idx" ON "FinancialAccount"("studentRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_receiptId_key" ON "FinancialTransaction"("receiptId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_financialAccountId_idx" ON "FinancialTransaction"("financialAccountId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_transactionDate_idx" ON "FinancialTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "FinancialTransaction_type_idx" ON "FinancialTransaction"("type");

-- CreateIndex
CREATE INDEX "AdvisorAppointment_studentRecordId_idx" ON "AdvisorAppointment"("studentRecordId");

-- CreateIndex
CREATE INDEX "AdvisorAppointment_advisorUserId_idx" ON "AdvisorAppointment"("advisorUserId");

-- CreateIndex
CREATE INDEX "AdvisorAppointment_status_idx" ON "AdvisorAppointment"("status");

-- CreateIndex
CREATE INDEX "AdvisorAppointment_requestedDate_idx" ON "AdvisorAppointment"("requestedDate");

-- CreateIndex
CREATE UNIQUE INDEX "StudentNotificationPreference_studentRecordId_key" ON "StudentNotificationPreference"("studentRecordId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentAttachment" ADD CONSTRAINT "AssignmentAttachment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentRecordId_fkey" FOREIGN KEY ("studentRecordId") REFERENCES "StudentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestionOption" ADD CONSTRAINT "QuizQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentRecordId_fkey" FOREIGN KEY ("studentRecordId") REFERENCES "StudentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentRecordId_fkey" FOREIGN KEY ("studentRecordId") REFERENCES "StudentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionLog" ADD CONSTRAINT "AttendanceCorrectionLog_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_studentRecordId_fkey" FOREIGN KEY ("studentRecordId") REFERENCES "StudentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorAppointment" ADD CONSTRAINT "AdvisorAppointment_studentRecordId_fkey" FOREIGN KEY ("studentRecordId") REFERENCES "StudentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNotificationPreference" ADD CONSTRAINT "StudentNotificationPreference_studentRecordId_fkey" FOREIGN KEY ("studentRecordId") REFERENCES "StudentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
