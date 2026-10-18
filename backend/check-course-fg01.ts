import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking for FG01 course offerings...\n');

  // Find the course
  const course = await prisma.course.findFirst({
    where: { code: 'FG01' },
    include: {
      offerings: {
        include: {
          semester: {
            include: {
              academicYear: true
            }
          }
        }
      }
    }
  });

  if (!course) {
    console.log('❌ Course FG01 not found in database');
    return;
  }

  console.log(`✅ Course Found: ${course.code} - ${course.name}`);
  console.log(`   Status: ${course.status}`);
  console.log(`   Department: ${course.departmentId}`);
  console.log(`   Program Type: ${course.programType}`);
  console.log(`   Offerings Count: ${course.offerings.length}\n`);

  if (course.offerings.length === 0) {
    console.log('ℹ️  No offerings found for this course');
  } else {
    console.log('📋 Course Offerings:');
    course.offerings.forEach((offering, idx) => {
      console.log(`\n${idx + 1}. Offering ID: ${offering.id}`);
      console.log(`   Section: ${offering.section}`);
      console.log(`   Status: ${offering.status}`);
      console.log(`   Semester: ${offering.semester.name} (${offering.semester.academicYear.name})`);
      console.log(`   Semester ID: ${offering.semesterId}`);
      console.log(`   Capacity: ${offering.capacity}`);
      console.log(`   Instructor: ${offering.instructorId || 'Not assigned'}`);
      console.log(`   Created: ${offering.createdAt}`);
    });
  }

  // Check all current semesters
  console.log('\n\n📅 Current/Active Semesters:');
  const semesters = await prisma.semester.findMany({
    where: {
      OR: [
        { isCurrent: true },
        { status: 'ACTIVE' }
      ]
    },
    include: {
      academicYear: true
    }
  });

  semesters.forEach(sem => {
    console.log(`   • ${sem.name} (${sem.academicYear.name}) - ${sem.programType} ${sem.isCurrent ? '[CURRENT]' : ''}`);
    console.log(`     ID: ${sem.id}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
