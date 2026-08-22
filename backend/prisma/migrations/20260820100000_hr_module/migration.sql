-- HR Module — full schema migration

-- Enums
CREATE TYPE "HREmploymentType"  AS ENUM ('FULL_TIME','PART_TIME','CONTRACT','INTERN');
CREATE TYPE "HRContractStatus"  AS ENUM ('ACTIVE','EXPIRING_SOON','EXPIRED','PROBATION');
CREATE TYPE "HREmployeeStatus"  AS ENUM ('ACTIVE','INACTIVE','ON_LEAVE','TERMINATED');
CREATE TYPE "HRGender"          AS ENUM ('MALE','FEMALE');
CREATE TYPE "HRLeaveType"       AS ENUM ('ANNUAL','SICK','MATERNITY','PATERNITY','EMERGENCY','STUDY');
CREATE TYPE "HRLeaveStatus"     AS ENUM ('PENDING','APPROVED','REJECTED','FORWARDED','CANCELLED');
CREATE TYPE "HRApprovalStatus"  AS ENUM ('PENDING','APPROVED','REJECTED');
CREATE TYPE "HRPayrollStage"    AS ENUM ('DRAFT','PENDING_REVIEW','PENDING_HR_APPROVAL','APPROVED','LOCKED');
CREATE TYPE "HRReviewCycle"     AS ENUM ('QUARTERLY','SEMI_ANNUAL','ANNUAL');
CREATE TYPE "HRReviewStatus"    AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','OVERDUE');
CREATE TYPE "HRDocumentCategory" AS ENUM ('CV','CONTRACT','NATIONAL_ID','CERTIFICATE','PERFORMANCE_REPORT','PAYSLIP','LEAVE_DOCUMENT');
CREATE TYPE "HROnboardingStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','COMPLETED','ON_HOLD');
CREATE TYPE "HROffboardingStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','COMPLETED');
CREATE TYPE "HRExitReason"      AS ENUM ('RESIGNATION','TERMINATION','CONTRACT_EXPIRY','RETIREMENT');
CREATE TYPE "HRAuditStatus"     AS ENUM ('SUCCESS','WARNING','FAILED');
CREATE TYPE "HRNotifType"       AS ENUM ('LEAVE','PAYROLL','PERFORMANCE','CONTRACT','ONBOARDING','SYSTEM');

-- HRDepartment
CREATE TABLE "HRDepartment" (
  "id"             TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"           TEXT NOT NULL UNIQUE,
  "headEmployeeId" TEXT,
  "budget"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HRDepartment_isActive_idx" ON "HRDepartment"("isActive");

-- HREmployee
CREATE TABLE "HREmployee" (
  "id"               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeCode"     TEXT NOT NULL UNIQUE,
  "userId"           TEXT UNIQUE REFERENCES "User"("id") ON DELETE SET NULL,
  "fullName"         TEXT NOT NULL,
  "avatarUrl"        TEXT,
  "gender"           "HRGender" NOT NULL DEFAULT 'MALE',
  "dateOfBirth"      TIMESTAMP(3),
  "address"          TEXT,
  "email"            TEXT NOT NULL UNIQUE,
  "phone"            TEXT,
  "departmentId"     TEXT NOT NULL REFERENCES "HRDepartment"("id"),
  "position"         TEXT NOT NULL,
  "employmentType"   "HREmploymentType" NOT NULL DEFAULT 'FULL_TIME',
  "contractStatus"   "HRContractStatus" NOT NULL DEFAULT 'ACTIVE',
  "status"           "HREmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
  "hireDate"         TIMESTAMP(3) NOT NULL,
  "contractEndDate"  TIMESTAMP(3),
  "managerId"        TEXT REFERENCES "HREmployee"("id") ON DELETE SET NULL,
  "education"        TEXT,
  "experienceYears"  INTEGER NOT NULL DEFAULT 0,
  "basicSalary"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "allowances"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductions"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "nationalId"       TEXT,
  "bankAccount"      TEXT,
  "taxNumber"        TEXT,
  "emergencyName"    TEXT,
  "emergencyPhone"   TEXT,
  "emergencyRelation" TEXT,
  "isActive"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HREmployee_status_idx"         ON "HREmployee"("status");
CREATE INDEX "HREmployee_departmentId_idx"   ON "HREmployee"("departmentId");
CREATE INDEX "HREmployee_contractStatus_idx" ON "HREmployee"("contractStatus");
CREATE INDEX "HREmployee_employmentType_idx" ON "HREmployee"("employmentType");
CREATE INDEX "HREmployee_isActive_idx"       ON "HREmployee"("isActive");

-- HRLeaveRequest
CREATE TABLE "HRLeaveRequest" (
  "id"               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeId"       TEXT NOT NULL REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "leaveType"        "HRLeaveType" NOT NULL,
  "startDate"        TIMESTAMP(3) NOT NULL,
  "endDate"          TIMESTAMP(3) NOT NULL,
  "daysCount"        INTEGER NOT NULL,
  "reason"           TEXT NOT NULL,
  "status"           "HRLeaveStatus" NOT NULL DEFAULT 'PENDING',
  "managerApproval"  "HRApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "hrApproval"       "HRApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "reviewComment"    TEXT,
  "reviewedByUserId" TEXT,
  "submittedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt"       TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HRLeaveRequest_employeeId_idx" ON "HRLeaveRequest"("employeeId");
CREATE INDEX "HRLeaveRequest_status_idx"     ON "HRLeaveRequest"("status");
CREATE INDEX "HRLeaveRequest_leaveType_idx"  ON "HRLeaveRequest"("leaveType");

-- HRLeaveBalance
CREATE TABLE "HRLeaveBalance" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeId" TEXT NOT NULL REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "leaveType"  "HRLeaveType" NOT NULL,
  "entitled"   INTEGER NOT NULL DEFAULT 0,
  "taken"      INTEGER NOT NULL DEFAULT 0,
  "remaining"  INTEGER NOT NULL DEFAULT 0,
  "year"       INTEGER NOT NULL,
  UNIQUE ("employeeId","leaveType","year")
);
CREATE INDEX "HRLeaveBalance_employeeId_idx" ON "HRLeaveBalance"("employeeId");

-- HRPayrollRecord
CREATE TABLE "HRPayrollRecord" (
  "id"            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "month"         TEXT NOT NULL,
  "year"          INTEGER NOT NULL,
  "stage"         "HRPayrollStage" NOT NULL DEFAULT 'DRAFT',
  "totalGross"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalNet"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "employeeCount" INTEGER NOT NULL DEFAULT 0,
  "generatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("month","year")
);
CREATE INDEX "HRPayrollRecord_stage_idx" ON "HRPayrollRecord"("stage");

-- HRPayrollApproval
CREATE TABLE "HRPayrollApproval" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "payrollId"    TEXT NOT NULL REFERENCES "HRPayrollRecord"("id") ON DELETE CASCADE,
  "stageName"    TEXT NOT NULL,
  "approverName" TEXT NOT NULL,
  "approvedAt"   TIMESTAMP(3),
  "status"       "HRApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "comment"      TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HRPayrollApproval_payrollId_idx" ON "HRPayrollApproval"("payrollId");

-- HRPayslip
CREATE TABLE "HRPayslip" (
  "id"              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "payrollId"       TEXT NOT NULL REFERENCES "HRPayrollRecord"("id") ON DELETE CASCADE,
  "employeeId"      TEXT NOT NULL REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "basicSalary"     DOUBLE PRECISION NOT NULL,
  "allowances"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bonuses"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax"             DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pension"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netSalary"       DOUBLE PRECISION NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("payrollId","employeeId")
);
CREATE INDEX "HRPayslip_payrollId_idx"  ON "HRPayslip"("payrollId");
CREATE INDEX "HRPayslip_employeeId_idx" ON "HRPayslip"("employeeId");

-- HRPerformanceReview
CREATE TABLE "HRPerformanceReview" (
  "id"                 TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeId"         TEXT NOT NULL REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "cycle"              "HRReviewCycle" NOT NULL,
  "period"             TEXT NOT NULL,
  "status"             "HRReviewStatus" NOT NULL DEFAULT 'PENDING',
  "dueDate"            TIMESTAMP(3) NOT NULL,
  "overallScore"       DOUBLE PRECISION,
  "goalsScore"         DOUBLE PRECISION,
  "competenciesScore"  DOUBLE PRECISION,
  "attendanceScore"    DOUBLE PRECISION,
  "communicationScore" DOUBLE PRECISION,
  "leadershipScore"    DOUBLE PRECISION,
  "technicalScore"     DOUBLE PRECISION,
  "managerComment"     TEXT,
  "hrComment"          TEXT,
  "completedAt"        TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HRPerformanceReview_employeeId_idx" ON "HRPerformanceReview"("employeeId");
CREATE INDEX "HRPerformanceReview_status_idx"     ON "HRPerformanceReview"("status");

-- HRDocument
CREATE TABLE "HRDocument" (
  "id"               TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeId"       TEXT NOT NULL REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "category"         "HRDocumentCategory" NOT NULL,
  "title"            TEXT NOT NULL,
  "fileUrl"          TEXT,
  "fileSize"         TEXT,
  "uploadedByUserId" TEXT,
  "uploadedByName"   TEXT,
  "version"          INTEGER NOT NULL DEFAULT 1,
  "uploadedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HRDocument_employeeId_idx" ON "HRDocument"("employeeId");
CREATE INDEX "HRDocument_category_idx"  ON "HRDocument"("category");

-- HROnboardingRecord
CREATE TABLE "HROnboardingRecord" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeId"  TEXT NOT NULL UNIQUE REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "status"      "HROnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- HROnboardingStep
CREATE TABLE "HROnboardingStep" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "recordId"   TEXT NOT NULL REFERENCES "HROnboardingRecord"("id") ON DELETE CASCADE,
  "stepKey"    TEXT NOT NULL,
  "label"      TEXT NOT NULL,
  "completed"  BOOLEAN NOT NULL DEFAULT false,
  "orderIndex" INTEGER NOT NULL,
  UNIQUE ("recordId","stepKey")
);
CREATE INDEX "HROnboardingStep_recordId_idx" ON "HROnboardingStep"("recordId");

-- HROffboardingRecord
CREATE TABLE "HROffboardingRecord" (
  "id"             TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeId"     TEXT NOT NULL UNIQUE REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "lastWorkingDay" TIMESTAMP(3) NOT NULL,
  "exitReason"     "HRExitReason" NOT NULL,
  "currentStep"    INTEGER NOT NULL DEFAULT 0,
  "status"         "HROffboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- HRAssetCheckItem
CREATE TABLE "HRAssetCheckItem" (
  "id"       TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "recordId" TEXT NOT NULL REFERENCES "HROffboardingRecord"("id") ON DELETE CASCADE,
  "item"     TEXT NOT NULL,
  "returned" BOOLEAN NOT NULL DEFAULT false,
  "notes"    TEXT
);
CREATE INDEX "HRAssetCheckItem_recordId_idx" ON "HRAssetCheckItem"("recordId");

-- HRAuditLog
CREATE TABLE "HRAuditLog" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "actorUserId"  TEXT,
  "actorName"    TEXT NOT NULL,
  "action"       TEXT NOT NULL,
  "employeeName" TEXT NOT NULL DEFAULT 'All Staff',
  "module"       TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "status"       "HRAuditStatus" NOT NULL DEFAULT 'SUCCESS',
  "metadata"     JSONB,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HRAuditLog_actorUserId_idx" ON "HRAuditLog"("actorUserId");
CREATE INDEX "HRAuditLog_module_idx"      ON "HRAuditLog"("module");
CREATE INDEX "HRAuditLog_createdAt_idx"   ON "HRAuditLog"("createdAt");

-- HRNotification
CREATE TABLE "HRNotification" (
  "id"              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeId"      TEXT REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "recipientUserId" TEXT NOT NULL,
  "type"            "HRNotifType" NOT NULL,
  "title"           TEXT NOT NULL,
  "message"         TEXT NOT NULL,
  "tab"             TEXT NOT NULL,
  "isRead"          BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "HRNotification_recipientUserId_idx" ON "HRNotification"("recipientUserId");
CREATE INDEX "HRNotification_isRead_idx"          ON "HRNotification"("isRead");
