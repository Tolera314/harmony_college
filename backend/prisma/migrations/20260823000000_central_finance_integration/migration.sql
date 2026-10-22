-- Central Finance Integration - Step 1
-- Connects all existing financial workflows into one central data source

-- Step 1: Add new transaction types
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'REGISTRATION';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'SALARY';

-- Step 2: Create FinancialCategory enum
CREATE TYPE "FinancialCategory" AS ENUM (
  'STUDENT_TUITION',
  'STUDENT_FEE',
  'REGISTRATION_FEE',
  'STAFF_SALARY',
  'OTHER'
);

-- Step 3: Extend FinancialTransaction table
-- Make financialAccountId optional (for non-student transactions)
ALTER TABLE "FinancialTransaction" ALTER COLUMN "financialAccountId" DROP NOT NULL;

-- Add new fields
ALTER TABLE "FinancialTransaction" ADD COLUMN "financialCategory" "FinancialCategory";
ALTER TABLE "FinancialTransaction" ADD COLUMN "staffPaymentId" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "registrationFeePaymentId" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "programType" "ProgramType";

-- Add constraints and indexes
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_staffPaymentId_key" UNIQUE ("staffPaymentId");
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_registrationFeePaymentId_key" UNIQUE ("registrationFeePaymentId");

CREATE INDEX "FinancialTransaction_financialCategory_idx" ON "FinancialTransaction"("financialCategory");
CREATE INDEX "FinancialTransaction_staffPaymentId_idx" ON "FinancialTransaction"("staffPaymentId");
CREATE INDEX "FinancialTransaction_registrationFeePaymentId_idx" ON "FinancialTransaction"("registrationFeePaymentId");
CREATE INDEX "FinancialTransaction_programType_idx" ON "FinancialTransaction"("programType");

-- Step 4: Create RegistrationFeePayment table
CREATE TABLE "RegistrationFeePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "referenceNumber" TEXT,
    "evidenceUrl" TEXT,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationFeePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationFeePayment_userId_key" ON "RegistrationFeePayment"("userId");
CREATE INDEX "RegistrationFeePayment_userId_idx" ON "RegistrationFeePayment"("userId");
CREATE INDEX "RegistrationFeePayment_status_idx" ON "RegistrationFeePayment"("status");

-- Add foreign key to User
ALTER TABLE "RegistrationFeePayment" ADD CONSTRAINT "RegistrationFeePayment_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Add registrationFeePaymentId to StudentProfile
ALTER TABLE "StudentProfile" ADD COLUMN "registrationFeePaymentId" TEXT;

CREATE UNIQUE INDEX "StudentProfile_registrationFeePaymentId_key" ON "StudentProfile"("registrationFeePaymentId");

ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_registrationFeePaymentId_fkey"
  FOREIGN KEY ("registrationFeePaymentId") REFERENCES "RegistrationFeePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 6: Add transactionId to StaffPayment
ALTER TABLE "StaffPayment" ADD COLUMN "transactionId" TEXT;

CREATE UNIQUE INDEX "StaffPayment_transactionId_key" ON "StaffPayment"("transactionId");
CREATE INDEX "StaffPayment_transactionId_idx" ON "StaffPayment"("transactionId");

-- Step 7: Add foreign key constraints
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_staffPaymentId_fkey"
  FOREIGN KEY ("staffPaymentId") REFERENCES "StaffPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_registrationFeePaymentId_fkey"
  FOREIGN KEY ("registrationFeePaymentId") REFERENCES "RegistrationFeePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Backfill existing data with categories
-- Categorize existing student transactions
UPDATE "FinancialTransaction" 
SET "financialCategory" = 'STUDENT_TUITION'
WHERE "financialAccountId" IS NOT NULL 
  AND "type" IN ('TUITION', 'PAYMENT')
  AND "financialCategory" IS NULL;

UPDATE "FinancialTransaction"
SET "financialCategory" = 'STUDENT_FEE'
WHERE "financialAccountId" IS NOT NULL
  AND "type" IN ('FEE', 'PENALTY', 'REFUND', 'SCHOLARSHIP', 'GRANT')
  AND "financialCategory" IS NULL;

-- Step 9: Backfill programType from FinancialAccount -> StudentRecord
UPDATE "FinancialTransaction" ft
SET "programType" = sr."programType"
FROM "FinancialAccount" fa
JOIN "StudentRecord" sr ON fa."studentRecordId" = sr."id"
WHERE ft."financialAccountId" = fa."id"
  AND ft."programType" IS NULL;

-- Step 10: Set default category for any remaining records
UPDATE "FinancialTransaction"
SET "financialCategory" = 'OTHER'
WHERE "financialCategory" IS NULL;

-- Step 11: Make financialCategory NOT NULL after backfill
ALTER TABLE "FinancialTransaction" ALTER COLUMN "financialCategory" SET NOT NULL;

-- Note: Staff payment transactions will be created by the application code
-- when existing PAID staff payments are processed through the migration script
