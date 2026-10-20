import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSemesters() {
  try {
    console.log('\n=== Checking All Semesters ===\n');
    
    const allSemesters = await prisma.semester.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        academicYear: true,
        _count: {
          select: {
            offerings: true,
          },
        },
      },
    });

    console.log(`Total semesters: ${allSemesters.length}\n`);

    for (const sem of allSemesters) {
      console.log(`Semester: ${sem.name}`);
      console.log(`  Academic Year: ${sem.academicYear.name}`);
      console.log(`  Program Type: ${sem.programType}`);
      console.log(`  Start Date: ${sem.startDate.toISOString().split('T')[0]}`);
      console.log(`  End Date: ${sem.endDate.toISOString().split('T')[0]}`);
      console.log(`  isCurrent: ${sem.isCurrent}`);
      console.log(`  isActive: ${sem.isActive}`);
      console.log(`  Offerings: ${sem._count.offerings}`);
      console.log('');
    }

    console.log('\n=== Checking Active & Current Semesters ===\n');
    
    const activeSemesters = await prisma.semester.findMany({
      where: {
        isActive: true,
        OR: [
          { isCurrent: true },
          { startDate: { gte: new Date() } },
        ],
      },
      orderBy: { startDate: 'asc' },
      include: {
        academicYear: true,
        _count: {
          select: {
            offerings: true,
          },
        },
      },
    });

    console.log(`Active/Current semesters: ${activeSemesters.length}\n`);

    for (const sem of activeSemesters) {
      console.log(`${sem.name} - ${sem.academicYear.name}`);
      console.log(`  Type: ${sem.programType}`);
      console.log(`  Current: ${sem.isCurrent ? 'YES' : 'No'}`);
      console.log(`  Courses: ${sem._count.offerings}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSemesters();
