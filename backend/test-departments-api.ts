/**
 * Test Departments API Response
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('Test Departments API Response');
  console.log('='.repeat(60));
  console.log('');

  // Simulate the exact query from the API
  const parents = await prisma.department.findMany({
    where: { parentId: null, isActive: true, programType: 'TVET' },
    orderBy: { name: 'asc' },
    include: {
      programs: { 
        select: { id: true, name: true, code: true, isActive: true }, 
        orderBy: { name: 'asc' } 
      },
      departmentHeads: {
        where: { isActive: true },
        take: 1,
        include: { 
          user: { 
            select: { id: true, fullName: true, email: true, phone: true } 
          } 
        },
      },
      _count: {
        select: {
          studentRecords: true,
          courses: true,
          instructors: { where: { isActive: true } },
          programs: true,
        },
      },
      children: {
        where: { isActive: true },
        include: {
          programs: { 
            select: { id: true, name: true, code: true, isActive: true }, 
            orderBy: { name: 'asc' } 
          },
          _count: {
            select: {
              studentRecords: true,
              courses: true,
              instructors: { where: { isActive: true } },
              programs: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${parents.length} TVET departments\n`);

  const result = parents.map(p => {
    const hod = p.departmentHeads[0] ?? null;
    return {
      id:          p.id,
      name:        p.name,
      code:        p.code,
      programType: p.programType,
      description: p.description,
      isActive:    p.isActive,
      createdAt:   p.createdAt,
      updatedAt:   p.updatedAt,
      departmentHeads: p.departmentHeads,
      assignedHod: hod ? {
        id:         hod.user.id,
        recordId:   hod.id,
        name:       hod.user.fullName,
        email:      hod.user.email,
        phone:      hod.user.phone,
        employeeId: hod.employeeId,
        title:      hod.title,
      } : null,
      programs: p.programs,
      _count: p._count,
      branches: p.children.map(c => ({
        id:          c.id,
        name:        c.name,
        code:        c.code,
        programType: c.programType,
        description: c.description,
        isActive:    c.isActive,
        programs:    c.programs,
        _count:      c._count,
      })),
    };
  });

  // Find Digital Marketing specifically
  const digitalMarketing = result.find(d => d.name.includes('Digital Marketing'));
  
  if (digitalMarketing) {
    console.log('Digital Marketing (DMKT-T):');
    console.log(JSON.stringify(digitalMarketing, null, 2));
  } else {
    console.log('Digital Marketing not found in result');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary of all departments with HOD status:');
  console.log('='.repeat(60));
  
  for (const dept of result) {
    console.log(`${dept.name} (${dept.code})`);
    console.log(`  assignedHod: ${dept.assignedHod ? `✓ ${dept.assignedHod.name}` : '✗ None'}`);
    console.log(`  departmentHeads array: ${dept.departmentHeads.length} records`);
    for (const dh of dept.departmentHeads) {
      console.log(`    - ${dh.user.fullName} (isActive: ${dh.isActive})`);
    }
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
