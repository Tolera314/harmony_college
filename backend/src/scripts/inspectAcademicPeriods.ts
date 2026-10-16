import { prisma } from '../lib/prisma';

async function main() {
  const academicYears = await prisma.academicYear.findMany({
    include: {
      semesters: {
        include: {
          _count: { select: { offerings: true } }
        }
      }
    }
  });
  console.log('--- ACADEMIC YEARS & PERIODS ---');
  for (const ay of academicYears) {
    console.log(`AcademicYear: ${ay.name} (id: ${ay.id}, isCurrent: ${ay.isCurrent})`);
    for (const s of ay.semesters) {
      console.log(`  -> Period: ${s.name} [${s.programType}] (id: ${s.id}, isCurrent: ${s.isCurrent}, isClosed: ${s.isClosed}, offerings: ${s._count.offerings})`);
    }
  }

  const shortPrograms = await prisma.program.findMany({
    where: { department: { programType: 'SHORT_PROGRAM' } },
    select: { id: true, name: true, code: true, durationYears: true, totalCredits: true }
  });
  console.log('\n--- SHORT PROGRAMS ---');
  for (const sp of shortPrograms) {
    console.log(`Short Program: ${sp.name} [${sp.code}] (durationYears: ${sp.durationYears}, totalCredits: ${sp.totalCredits})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
