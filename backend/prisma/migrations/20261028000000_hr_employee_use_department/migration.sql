-- AlterTable: Change HREmployee.departmentId foreign key from HRDepartment to Department
-- This allows HR employees to be assigned to real academic departments created by Registrar

-- Step 1: Drop the old foreign key constraint
ALTER TABLE "HREmployee" DROP CONSTRAINT IF EXISTS "HREmployee_departmentId_fkey";

-- Step 2: Add new foreign key constraint pointing to Department table
ALTER TABLE "HREmployee" ADD CONSTRAINT "HREmployee_departmentId_fkey" 
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
