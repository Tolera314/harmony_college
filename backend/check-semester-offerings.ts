import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking Semester Offerings by Program Type...\n');

  // Get all semesters with their offerings
  const semesters = await prisma.semester.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
    include: {
      academicYear: true,
      offerings: {
        where: {
          status: { in: ['ACTIVE', 'SCHEDULED', 'INSTRUCTOR_ASSIGNED', 'DRAFT'] },
        },
        include: {
          course: {
            select: {
              code: true,
              name: true,
              programType: true,
              departmentId: true,
            },
          },
        },
      },
    },
  });

  semesters.forEach((sem) => {
    console.log(`\n📅 ${sem.name} (${sem.academicYear.name})`);
    console.log(`   ID: ${sem.id}`);
    console.log(`   Program Type: ${sem.programType}`);
    console.log(`   Current: ${sem.isCurrent ? 'YES' : 'NO'}`);
    console.log(`   Active: ${sem.isActive ? 'YES' : 'NO'}`);
    console.log(`   Offerings: ${sem.offerings.length}`);

    if (sem.offerings.length > 0) {
      console.log(`\n   📚 Course Offerings:`);
      sem.offerings.forEach((off) => {
        console.log(`      • ${off.course.code} (${off.section}) - ${off.status}`);
        console.log(`        Course Program Type: ${off.course.programType}`);
        console.log(`        Offering ID: ${off.id}`);
      });
    }
  });

  // Specifically check FG01
  console.log('\n\n🎯 FG01 Course Details:');
  const fg01Course = await prisma.course.findFirst({
    where: { code: 'FG01' },
  });

  if (fg01Course) {
    console.log(`   Code: ${fg01Course.code}`);
    console.log(`   Name: ${fg01Course.name}`);
    console.log(`   Program Type: ${fg01Course.programType}`);
    console.log(`   Department: ${fg01Course.departmentId}`);
    console.log(`   Status: ${fg01Course.status}`);
  }

  const fg01Offering = await prisma.courseOffering.findFirst({
    where: {
      course: { code: 'FG01' },
      section: 'A',
    },
    include: {
      semester: {
        include: {
          academicYear: true,
        },
      },
      course: true,
    },
  });

  if (fg01Offering) {
    console.log(`\n   📋 FG01 Section A Offering:`);
    console.log(`      Offering ID: ${fg01Offering.id}`);
    console.log(`      Status: ${fg01Offering.status}`);
    console.log(`      Semester: ${fg01Offering.semester.name} (${fg01Offering.semester.academicYear.name})`);
    console.log(`      Semester Program Type: ${fg01Offering.semester.programType}`);
    console.log(`      Semester Current: ${fg01Offering.semester.isCurrent}`);
    console.log(`      Semester Active: ${fg01Offering.semester.isActive}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
