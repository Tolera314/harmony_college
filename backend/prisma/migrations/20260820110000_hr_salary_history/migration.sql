-- HR Salary History — append-only pay change log

CREATE TABLE "HRSalaryHistory" (
  "id"              TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeId"      TEXT        NOT NULL REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "effectiveDate"   TIMESTAMP(3) NOT NULL,
  "basicSalary"     DOUBLE PRECISION NOT NULL,
  "allowances"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductions"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grossSalary"     DOUBLE PRECISION NOT NULL,
  "reason"          TEXT,
  "changedByUserId" TEXT,
  "changedByName"   TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "HRSalaryHistory_employeeId_idx"   ON "HRSalaryHistory"("employeeId");
CREATE INDEX "HRSalaryHistory_effectiveDate_idx" ON "HRSalaryHistory"("effectiveDate");

-- HR Contract Renewal — audit trail for contract extensions

CREATE TABLE "HRContractRenewal" (
  "id"               TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employeeId"       TEXT        NOT NULL REFERENCES "HREmployee"("id") ON DELETE CASCADE,
  "previousEndDate"  TIMESTAMP(3) NOT NULL,
  "newEndDate"       TIMESTAMP(3) NOT NULL,
  "reason"           TEXT,
  "documentId"       TEXT,
  "approvedByUserId" TEXT,
  "approvedByName"   TEXT NOT NULL,
  "approvedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "HRContractRenewal_employeeId_idx" ON "HRContractRenewal"("employeeId");
