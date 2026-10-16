import { prisma } from '../lib/prisma';

async function main() {
  console.log('Migrating Short Program periods from Semester to Term...');
  
  const sem1 = await prisma.semester.updateMany({
    where: { programType: 'SHORT_PROGRAM', name: 'Semester I' },
    data: { name: 'Term I', termOrder: 1 },
  });
  console.log(`Updated ${sem1.count} Short Program period(s) to Term I`);

  const sem2 = await prisma.semester.updateMany({
    where: { programType: 'SHORT_PROGRAM', name: 'Semester II' },
    data: { name: 'Term II', termOrder: 2 },
  });
  console.log(`Updated ${sem2.count} Short Program period(s) to Term II`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
