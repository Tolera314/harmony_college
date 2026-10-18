import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🗑️  Deleting FG01 Section A offering from wrong semester...\n');

  const offering = await prisma.courseOffering.findFirst({
    where: {
      course: { code: 'FG01' },
      section: 'A',
    },
    include: {
      semester: true,
      course: true,
    },
  });

  if (!offering) {
    console.log('❌ No FG01 Section A offering found');
    return;
  }

  console.log(`Found offering:`);
  console.log(`  Course: ${offering.course.code} - ${offering.course.name}`);
  console.log(`  Course Program Type: ${offering.course.programType}`);
  console.log(`  Semester: ${offering.semester.name}`);
  console.log(`  Semester Program Type: ${offering.semester.programType}`);
  console.log(`  Offering ID: ${offering.id}`);

  if (offering.course.programType !== offering.semester.programType) {
    console.log(`\n⚠️  Program type mismatch! Deleting...`);
    
    await prisma.courseOffering.delete({
      where: { id: offering.id },
    });
    
    console.log(`✅ Deleted FG01 Section A offering`);
    console.log(`   You can now recreate it in the correct ${offering.course.programType} semester`);
  } else {
    console.log(`\n✅ Program types match. No action needed.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
