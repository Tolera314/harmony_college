/**
 * Migrate HREmployee to use Department table instead of HRDepartment
 * Run: npx tsx migrate-hr-departments.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🔧 Migrating HREmployee departments...\n');
    
    // Step 1: Drop old foreign key
    console.log('1️⃣  Dropping old foreign key constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "HREmployee" DROP CONSTRAINT IF EXISTS "HREmployee_departmentId_fkey"
    `);
    console.log('   ✓ Old constraint dropped\n');
    
    // Step 2: Get first active department
    console.log('2️⃣  Finding active departments...');
    const departments = await prisma.department.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { name: 'asc' },
      take: 1,
    });
    
    if (departments.length === 0) {
      console.log('❌ No active departments found!');
      console.log('💡 Please create departments first via:');
      console.log('   http://localhost:3000/dashboard/registrar → Department Management');
      process.exit(1);
    }
    
    const firstDept = departments[0];
    console.log(`   ✓ Found department: ${firstDept.name} (${firstDept.code})`);
    console.log(`   ✓ ID: ${firstDept.id}\n`);
    
    // Step 3: Update all employees
    console.log('3️⃣  Updating all employees to use new department...');
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "HREmployee"
      SET "departmentId" = '${firstDept.id}'
    `);
    console.log(`   ✓ Updated ${result} employees\n`);
    
    // Step 4: Add new foreign key
    console.log('4️⃣  Adding new foreign key constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "HREmployee" 
      ADD CONSTRAINT "HREmployee_departmentId_fkey" 
      FOREIGN KEY ("departmentId") REFERENCES "Department"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);
    console.log('   ✓ New constraint added\n');
    
    console.log('✨ Migration complete!');
    console.log('💡 All employees are temporarily assigned to: ' + firstDept.name);
    console.log('💡 Edit individual employees via HR dashboard to assign correct departments.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
