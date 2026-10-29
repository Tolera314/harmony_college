/**
 * Check Department Mapping
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('Department Mapping Check');
  console.log('='.repeat(60));
  console.log('');

  // Get all departments
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  console.log(`Total departments: ${departments.length}\n`);
  
  for (const dept of departments) {
    console.log(`${dept.name} (${dept.code})`);
    console.log(`  ID: ${dept.id}`);
    console.log(`  Type: ${dept.programType}`);
    console.log(`  Parent: ${dept.parentId || 'None (top-level)'}`);
    console.log('');
  }

  // Check the specific case
  const digitalMarketing = await prisma.department.findFirst({
    where: {
      name: {
        contains: 'Digital Marketing',
        mode: 'insensitive',
      },
    },
    include: {
      departmentHeads: {
        include: {
          user: true,
        },
      },
      instructors: {
        include: {
          user: true,
        },
      },
      hrEmployees: true,
    },
  });

  if (digitalMarketing) {
    console.log('='.repeat(60));
    console.log(`Digital Marketing Department Details`);
    console.log('='.repeat(60));
    console.log(`ID: ${digitalMarketing.id}`);
    console.log(`Code: ${digitalMarketing.code}`);
    console.log(`Type: ${digitalMarketing.programType}`);
    console.log(`\nDepartmentHeadRecords (${digitalMarketing.departmentHeads.length}):`);
    for (const hod of digitalMarketing.departmentHeads) {
      console.log(`  - ${hod.user.fullName}: isActive=${hod.isActive}, userId=${hod.userId}`);
    }
    console.log(`\nInstructorRecords (${digitalMarketing.instructors.length}):`);
    for (const inst of digitalMarketing.instructors) {
      console.log(`  - ${inst.user.fullName}: isActive=${inst.isActive}, userId=${inst.userId}`);
    }
    console.log(`\nHREmployees (${digitalMarketing.hrEmployees.length}):`);
    for (const hr of digitalMarketing.hrEmployees) {
      console.log(`  - ${hr.fullName}: systemRole=${hr.systemRole}, status=${hr.status}`);
    }
  }

  // Find Bana specifically
  const bana = await prisma.departmentHeadRecord.findFirst({
    where: {
      user: {
        fullName: {
          contains: 'Bana',
          mode: 'insensitive',
        },
      },
    },
    include: {
      user: true,
      department: true,
    },
  });

  if (bana) {
    console.log('');
    console.log('='.repeat(60));
    console.log('Bana Dawit Hunde HOD Record:');
    console.log('='.repeat(60));
    console.log(`User ID: ${bana.userId}`);
    console.log(`Department: ${bana.department.name}`);
    console.log(`Department ID: ${bana.departmentId}`);
    console.log(`isActive: ${bana.isActive}`);
    console.log(`Title: ${bana.title}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
