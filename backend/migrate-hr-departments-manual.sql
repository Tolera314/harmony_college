-- Manual migration: Update HREmployee to use Department table instead of HRDepartment
-- Run this in your PostgreSQL client or via: psql -d harmony_college -f migrate-hr-departments-manual.sql

BEGIN;

-- Step 1: Drop the old foreign key
ALTER TABLE "HREmployee" DROP CONSTRAINT IF EXISTS "HREmployee_departmentId_fkey";

-- Step 2: Get the first active department ID from Department table
-- and update all HREmployees to use it (temporary assignment)
DO $$
DECLARE
    first_dept_id TEXT;
BEGIN
    -- Get first active department
    SELECT id INTO first_dept_id
    FROM "Department"
    WHERE "isActive" = true AND "parentId" IS NULL
    ORDER BY name
    LIMIT 1;
    
    IF first_dept_id IS NOT NULL THEN
        -- Update all employees to use this department
        UPDATE "HREmployee"
        SET "departmentId" = first_dept_id;
        
        RAISE NOTICE 'Updated all employees to department ID: %', first_dept_id;
    ELSE
        RAISE EXCEPTION 'No active departments found! Please create departments first.';
    END IF;
END $$;

-- Step 3: Add new foreign key pointing to Department table
ALTER TABLE "HREmployee" 
ADD CONSTRAINT "HREmployee_departmentId_fkey" 
FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;

-- Done! You can now edit individual employees via HR dashboard to assign correct departments.
