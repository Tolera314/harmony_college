/**
 * Delete Obsolete Course Offerings
 * 
 * Removes all course offerings for Semester II (TVET) and Term II/III (SHORT_PROGRAM).
 * Cascading deletes will handle related records automatically.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteObsoleteOfferings() {
  console.log('=== Deleting Obsolete Course Offerings ===\n');

  try {
    // Find obsolete semesters
    const obsoleteSemesters = await prisma.semester.findMany({
      where: {
        OR: [
          { name: 'Semester II', programType: 'TVET' },
          { name: 'Term II', programType: 'SHORT_PROGRAM' },
          { name: 'Term III', programType: 'SHORT_PROGRAM' },
        ],
      },
      include: {
        offerings: {
          include: {
            course: { select: { code: true, name: true } },
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${obsoleteSemesters.length} obsolete semesters\n`);

    for (const semester of obsoleteSemesters) {
      console.log(`\n${semester.name} (${semester.programType}):`);
      console.log(`  Offerings: ${semester.offerings.length}`);
      
      const totalEnrollments = semester.offerings.reduce(
        (sum, o) => sum + o._count.enrollments, 0
      );
      
      console.log(`  Total enrollments: ${totalEnrollments}`);

      if (totalEnrollments > 0) {
        console.log('  ⚠️  WARNING: This semester has enrollments. Verify consolidation first!');
        console.log('  Skipping deletion for safety.');
        continue;
      }

      if (semester.offerings.length > 0) {
        // Delete offerings (CASCADE will handle timetable slots, sessions, etc.)
        const deleteResult = await prisma.courseOffering.deleteMany({
          where: {
            semesterId: semester.id,
          },
        });

        console.log(`  ✅ Deleted ${deleteResult.count} offerings`);
      } else {
        console.log('  ✅ No offerings to delete');
      }
    }

  } catch (error) {
    console.error('❌ Error deleting offerings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteObsoleteOfferings()
  .then(() => {
    console.log('\n✅ Deletion complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deletion failed:', error);
    process.exit(1);
  });
