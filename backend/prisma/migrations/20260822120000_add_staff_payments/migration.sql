-- CreateTable
CREATE TABLE "StaffPayment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payrollMonth" TEXT NOT NULL,
    "payrollYear" INTEGER NOT NULL,
    "assignedSalary" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "transactionReference" TEXT,
    "notes" TEXT,
    "paidByUserId" TEXT,
    "paidByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffPayment_employeeId_idx" ON "StaffPayment"("employeeId");

-- CreateIndex
CREATE INDEX "StaffPayment_status_idx" ON "StaffPayment"("status");

-- CreateIndex
CREATE INDEX "StaffPayment_payrollYear_idx" ON "StaffPayment"("payrollYear");

-- CreateIndex
CREATE UNIQUE INDEX "StaffPayment_employeeId_payrollMonth_payrollYear_key" ON "StaffPayment"("employeeId", "payrollMonth", "payrollYear");

-- AddForeignKey
ALTER TABLE "StaffPayment" ADD CONSTRAINT "StaffPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
