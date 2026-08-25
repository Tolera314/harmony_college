-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('MEDICAL', 'PERSONAL', 'CONFERENCE', 'RESEARCH', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING_DH', 'DH_APPROVED', 'DH_REJECTED', 'HR_APPROVED', 'HR_REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DepartmentHeadAction" AS ENUM ('OFFERING_APPROVED', 'OFFERING_REJECTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'PROFILE_UPDATED', 'PASSWORD_CHANGED');

-- CreateTable
CREATE TABLE "DepartmentHeadRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Department Head',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentHeadRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentLeaveRequest" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "supportingDocUrl" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING_DH',
    "reviewedByDhId" TEXT,
    "dhComment" TEXT,
    "dhReviewedAt" TIMESTAMP(3),
    "hrComment" TEXT,
    "hrReviewedAt" TIMESTAMP(3),
    "hrReviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentLeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentHeadAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "DepartmentHeadAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentHeadAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentHeadRecord_userId_key" ON "DepartmentHeadRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentHeadRecord_employeeId_key" ON "DepartmentHeadRecord"("employeeId");

-- CreateIndex
CREATE INDEX "DepartmentHeadRecord_departmentId_idx" ON "DepartmentHeadRecord"("departmentId");

-- CreateIndex
CREATE INDEX "DepartmentHeadRecord_isActive_idx" ON "DepartmentHeadRecord"("isActive");

-- CreateIndex
CREATE INDEX "DepartmentLeaveRequest_instructorId_idx" ON "DepartmentLeaveRequest"("instructorId");

-- CreateIndex
CREATE INDEX "DepartmentLeaveRequest_status_idx" ON "DepartmentLeaveRequest"("status");

-- CreateIndex
CREATE INDEX "DepartmentLeaveRequest_startDate_idx" ON "DepartmentLeaveRequest"("startDate");

-- CreateIndex
CREATE INDEX "DepartmentLeaveRequest_reviewedByDhId_idx" ON "DepartmentLeaveRequest"("reviewedByDhId");

-- CreateIndex
CREATE INDEX "DepartmentHeadAuditLog_userId_idx" ON "DepartmentHeadAuditLog"("userId");

-- CreateIndex
CREATE INDEX "DepartmentHeadAuditLog_action_idx" ON "DepartmentHeadAuditLog"("action");

-- CreateIndex
CREATE INDEX "DepartmentHeadAuditLog_entityType_idx" ON "DepartmentHeadAuditLog"("entityType");

-- CreateIndex
CREATE INDEX "DepartmentHeadAuditLog_createdAt_idx" ON "DepartmentHeadAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "DepartmentHeadRecord" ADD CONSTRAINT "DepartmentHeadRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentHeadRecord" ADD CONSTRAINT "DepartmentHeadRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentLeaveRequest" ADD CONSTRAINT "DepartmentLeaveRequest_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "InstructorRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentLeaveRequest" ADD CONSTRAINT "DepartmentLeaveRequest_reviewedByDhId_fkey" FOREIGN KEY ("reviewedByDhId") REFERENCES "DepartmentHeadRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentHeadAuditLog" ADD CONSTRAINT "DepartmentHeadAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
