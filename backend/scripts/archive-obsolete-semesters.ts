/**
 * Archive Obsolete Semesters
 * 
 * Soft-deletes Semester II (TVET) and Term II/III (SHORT_PROGRAM) by marking them
 * as closed and inactive. Preserves referential integrity for audit purposes.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function archiveObsoleteSemesters() {
  console.log('=== Archiving Obsolete Semesters ===\n');

  try {
    const result = await prisma.semester.updateMany({
      where: {
        OR: [
          { name: 'Semester II', programType: 'TVET' },
          { name: 'Term II', programType: 'SHORT_PROGRAM' },
          { name: 'Term III', programType: 'SHORT_PROGRAM' },
        ],
      },
      data: {
        isActive: false,
        isClosed: true,
        isCurrent: false,
        closedAt: new Date(),
      },
    });

    console.log(`✅ Archived ${result.count} semester records\n`);

    // Verify the changes
    const archivedSemesters = await prisma.semester.findMany({
      where: {
        OR: [
          { name: 'Semester II' },
          { name: 'Term II' },
          { name: 'Term III' },
        ],
      },
      include: {
        academicYear: {
          select: { name: true },
        },
      },
    });

    console.log('Archived semesters:');
    for (const semester of archivedSemesters) {
      console.log(`  - ${semester.name} (${semester.programType}) [${semester.academicYear.name}]`);
      console.log(`    isActive: ${semester.isActive}, isClosed: ${semester.isClosed}, isCurrent: ${semester.isCurrent}`);
    }

  } catch (error) {
    console.error('❌ Error archiving semesters:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

archiveObsoleteSemesters()
  .then(() => {
    console.log('\n✅ Archival complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Archival failed:', error);
    process.exit(1);
  });
