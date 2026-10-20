import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStudentPrograms() {
  try {
    console.log('\n=== Checking Student Programs ===\n');
    
    const students = await prisma.studentRecord.findMany({
      take: 10,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`Total students checked: ${students.length}\n`);

    for (const student of students) {
      console.log(`Student: ${student.user.fullName}`);
      console.log(`  Email: ${student.user.email || 'N/A'}`);
      console.log(`  Program Type: ${student.programType}`);
      console.log(`  Department: ${student.department?.name || 'N/A'}`);
      console.log(`  Year Level: ${student.yearLevel}`);
      console.log('');
    }

    // Check how many semesters match each program type
    console.log('=== Semesters by Program Type ===\n');
    
    const tvetSemesters = await prisma.semester.findMany({
      where: {
        programType: 'TVET',
        isActive: true,
      },
      select: { id: true, name: true, isCurrent: true },
    });
    
    const shortProgramSemesters = await prisma.semester.findMany({
      where: {
        programType: 'SHORT_PROGRAM',
        isActive: true,
      },
      select: { id: true, name: true, isCurrent: true },
    });

    console.log(`TVET Semesters (active): ${tvetSemesters.length}`);
    tvetSemesters.forEach(s => console.log(`  - ${s.name} (current: ${s.isCurrent})`));
    
    console.log(`\nShort Program Terms (active): ${shortProgramSemesters.length}`);
    shortProgramSemesters.forEach(s => console.log(`  - ${s.name} (current: ${s.isCurrent})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentPrograms();
