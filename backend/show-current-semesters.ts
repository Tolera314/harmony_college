import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📅 Current Semesters by Program Type:\n');

  const semesters = await prisma.semester.findMany({
    where: {
      isCurrent: true,
      isActive: true,
    },
    include: {
      academicYear: true,
    },
    orderBy: {
      programType: 'asc',
    },
  });

  semesters.forEach((sem) => {
    console.log(`${sem.programType === 'TVET' ? '🎓 TVET' : '⚡ SHORT_PROGRAM'}:`);
    console.log(`   Name: ${sem.name}`);
    console.log(`   Academic Year: ${sem.academicYear.name}`);
    console.log(`   ID: ${sem.id}`);
    console.log(`   Current: ${sem.isCurrent}`);
    console.log(`   Active: ${sem.isActive}`);
    console.log('');
  });

  console.log('\n💡 Tips:');
  console.log('   • When adding a SHORT_PROGRAM course, it will go to "Term I"');
  console.log('   • When adding a TVET course, it will go to "Semester I"');
  console.log('   • The system now validates program type matches!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
