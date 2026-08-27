-- DropForeignKey
ALTER TABLE "HRAssetCheckItem" DROP CONSTRAINT "HRAssetCheckItem_recordId_fkey";

-- DropForeignKey
ALTER TABLE "HRContractRenewal" DROP CONSTRAINT "HRContractRenewal_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HRDocument" DROP CONSTRAINT "HRDocument_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HREmployee" DROP CONSTRAINT "HREmployee_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "HREmployee" DROP CONSTRAINT "HREmployee_managerId_fkey";

-- DropForeignKey
ALTER TABLE "HREmployee" DROP CONSTRAINT "HREmployee_userId_fkey";

-- DropForeignKey
ALTER TABLE "HRLeaveBalance" DROP CONSTRAINT "HRLeaveBalance_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HRLeaveRequest" DROP CONSTRAINT "HRLeaveRequest_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HRNotification" DROP CONSTRAINT "HRNotification_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HROffboardingRecord" DROP CONSTRAINT "HROffboardingRecord_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HROnboardingRecord" DROP CONSTRAINT "HROnboardingRecord_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HROnboardingStep" DROP CONSTRAINT "HROnboardingStep_recordId_fkey";

-- DropForeignKey
ALTER TABLE "HRPayrollApproval" DROP CONSTRAINT "HRPayrollApproval_payrollId_fkey";

-- DropForeignKey
ALTER TABLE "HRPayslip" DROP CONSTRAINT "HRPayslip_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HRPayslip" DROP CONSTRAINT "HRPayslip_payrollId_fkey";

-- DropForeignKey
ALTER TABLE "HRPerformanceReview" DROP CONSTRAINT "HRPerformanceReview_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "HRSalaryHistory" DROP CONSTRAINT "HRSalaryHistory_employeeId_fkey";

-- AlterTable
ALTER TABLE "HRAssetCheckItem" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRAuditLog" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRContractRenewal" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRDepartment" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRDocument" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HREmployee" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "gender" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRLeaveBalance" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRLeaveRequest" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRNotification" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HROffboardingRecord" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HROnboardingRecord" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HROnboardingStep" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRPayrollApproval" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRPayrollRecord" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRPayslip" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRPerformanceReview" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "HRSalaryHistory" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "HRAuditLog_status_idx" ON "HRAuditLog"("status");

-- CreateIndex
CREATE INDEX "HRLeaveRequest_startDate_idx" ON "HRLeaveRequest"("startDate");

-- CreateIndex
CREATE INDEX "HRNotification_type_idx" ON "HRNotification"("type");

-- CreateIndex
CREATE INDEX "HRPayrollRecord_year_idx" ON "HRPayrollRecord"("year");

-- CreateIndex
CREATE INDEX "HRPerformanceReview_dueDate_idx" ON "HRPerformanceReview"("dueDate");

-- AddForeignKey
ALTER TABLE "HREmployee" ADD CONSTRAINT "HREmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HREmployee" ADD CONSTRAINT "HREmployee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "HRDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HREmployee" ADD CONSTRAINT "HREmployee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "HREmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRLeaveRequest" ADD CONSTRAINT "HRLeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRLeaveBalance" ADD CONSTRAINT "HRLeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRPayrollApproval" ADD CONSTRAINT "HRPayrollApproval_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "HRPayrollRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRPayslip" ADD CONSTRAINT "HRPayslip_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "HRPayrollRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRPayslip" ADD CONSTRAINT "HRPayslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRPerformanceReview" ADD CONSTRAINT "HRPerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRDocument" ADD CONSTRAINT "HRDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HROnboardingRecord" ADD CONSTRAINT "HROnboardingRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HROnboardingStep" ADD CONSTRAINT "HROnboardingStep_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "HROnboardingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HROffboardingRecord" ADD CONSTRAINT "HROffboardingRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRAssetCheckItem" ADD CONSTRAINT "HRAssetCheckItem_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "HROffboardingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRNotification" ADD CONSTRAINT "HRNotification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRSalaryHistory" ADD CONSTRAINT "HRSalaryHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRContractRenewal" ADD CONSTRAINT "HRContractRenewal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HREmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
