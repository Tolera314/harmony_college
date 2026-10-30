/**
 * Fix HREmployee departmentId to use real Department table IDs
 * Run: npx tsx fix-hr-employee-departments.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDepartments() {
  try {
    console.log('🔧 Fixing HREmployee department references...\n');
    
    // Get all active departments from the main Department table
    const departments = await prisma.department.findMany({
      where: { isActive: true, parentId: null },
      select: { id: true, name: true, code: true },
    });
    
    console.log(`✅ Found ${departments.length} active departments:`);
    departments.forEach(d => console.log(`   - ${d.name} (${d.code}): ${d.id}`));
    console.log();
    
    if (departments.length === 0) {
      console.log('❌ No departments found! Please create departments first via Registrar dashboard.');
      process.exit(1);
    }
    
    // Get all HR employees
    const employees = await prisma.hREmployee.findMany({
      select: { id: true, fullName: true, departmentId: true, position: true },
    });
    
    console.log(`📋 Found ${employees.length} HR employees to update\n`);
    
    // Use the first department as default for all employees
    const defaultDept = departments[0];
    console.log(`🎯 Assigning all employees to: ${defaultDept.name}\n`);
    
    let updated = 0;
    for (const emp of employees) {
      await prisma.hREmployee.update({
        where: { id: emp.id },
        data: { departmentId: defaultDept.id },
      });
      console.log(`   ✓ ${emp.fullName} → ${defaultDept.name}`);
      updated++;
    }
    
    console.log(`\n✨ Successfully updated ${updated} employees!`);
    console.log('💡 You can now edit individual employees via HR dashboard to assign correct departments.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixDepartments();
