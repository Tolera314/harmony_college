/**
 * Check HOD Status Diagnostic
 * 
 * Check the status of all DepartmentHeadRecords and see why they may not be displaying
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('Department Head (HOD) Status Check');
  console.log('='.repeat(60));
  console.log('');

  // Find all DepartmentHeadRecords
  const allHods = await prisma.departmentHeadRecord.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
          programType: true,
        },
      },
    },
    orderBy: {
      department: {
        name: 'asc',
      },
    },
  });

  console.log(`Total DepartmentHeadRecords found: ${allHods.length}\n`);

  if (allHods.length === 0) {
    console.log('⚠ No DepartmentHeadRecords found in database');
    console.log('This means no HODs have been assigned yet.\n');
  } else {
    console.log('HOD Assignments:\n');
    
    for (const hod of allHods) {
      console.log(`Department: ${hod.department.name} (${hod.department.code})`);
      console.log(`  HOD: ${hod.user.fullName}`);
      console.log(`  Email: ${hod.user.email}`);
      console.log(`  User Role: ${hod.user.role}`);
      console.log(`  Employee ID: ${hod.employeeId}`);
      console.log(`  Title: ${hod.title}`);
      console.log(`  isActive: ${hod.isActive ? '✓ YES' : '✗ NO'}`);
      console.log(`  Created: ${hod.createdAt.toLocaleString()}`);
      console.log(`  Updated: ${hod.updatedAt.toLocaleString()}`);
      
      // Check if user has HREmployee record
      const hrEmployee = await prisma.hREmployee.findFirst({
        where: { userId: hod.userId },
      });
      
      if (hrEmployee) {
        console.log(`  HR Record: ✓ Found`);
        console.log(`    systemRole: ${hrEmployee.systemRole}`);
        console.log(`    status: ${hrEmployee.status}`);
        console.log(`    departmentId: ${hrEmployee.departmentId}`);
      } else {
        console.log(`  HR Record: ✗ Not found`);
      }
      
      // Check if user has InstructorRecord
      const instructorRecord = await prisma.instructorRecord.findFirst({
        where: { userId: hod.userId },
      });
      
      if (instructorRecord) {
        console.log(`  Instructor Record: ✓ Found (isActive: ${instructorRecord.isActive})`);
      } else {
        console.log(`  Instructor Record: ✗ Not found`);
      }
      
      console.log('');
    }
  }

  // Check if there are instructors who could be HODs but aren't assigned
  const instructors = await prisma.instructorRecord.findMany({
    where: {
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  console.log('='.repeat(60));
  console.log(`Active Instructors (eligible for HOD): ${instructors.length}`);
  console.log('='.repeat(60));
  console.log('');
  
  for (const instructor of instructors) {
    const hasHodRecord = allHods.some(h => h.userId === instructor.userId);
    console.log(`${instructor.user.fullName} (${instructor.department.name})`);
    console.log(`  Role: ${instructor.user.role}`);
    console.log(`  HOD Status: ${hasHodRecord ? '✓ Is HOD' : '✗ Not HOD'}`);
    console.log('');
  }

  // Find Bana Dawit Hunde specifically
  console.log('='.repeat(60));
  console.log('Searching for "Bana Dawit Hunde"');
  console.log('='.repeat(60));
  console.log('');

  const bana = await prisma.user.findFirst({
    where: {
      fullName: {
        contains: 'Bana',
        mode: 'insensitive',
      },
    },
    include: {
      hrEmployee: true,
      instructorRecord: true,
      departmentHeadRecords: {
        include: {
          department: true,
        },
      },
    },
  });

  if (bana) {
    console.log(`✓ Found: ${bana.fullName}`);
    console.log(`  Email: ${bana.email}`);
    console.log(`  Role: ${bana.role}`);
    console.log(`  HR Record: ${bana.hrEmployee ? '✓ Yes' : '✗ No'}`);
    if (bana.hrEmployee) {
      console.log(`    systemRole: ${bana.hrEmployee.systemRole}`);
      console.log(`    status: ${bana.hrEmployee.status}`);
    }
    console.log(`  Instructor Record: ${bana.instructorRecord ? '✓ Yes' : '✗ No'}`);
    if (bana.instructorRecord) {
      console.log(`    isActive: ${bana.instructorRecord.isActive}`);
    }
    console.log(`  HOD Records: ${bana.departmentHeadRecords.length}`);
    for (const hodRec of bana.departmentHeadRecords) {
      console.log(`    - ${hodRec.department.name}: isActive=${hodRec.isActive}`);
    }
  } else {
    console.log('✗ User "Bana Dawit Hunde" not found in database');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
