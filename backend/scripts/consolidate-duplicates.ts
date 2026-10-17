/**
 * Consolidate Duplicate Enrollments
 * 
 * Student HC-2026-0014 has duplicate enrollments in Term I and Term III.
 * This script removes the Term III duplicates, keeping Term I as source of truth.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function consolidateDuplicates() {
  console.log('=== Consolidating Duplicate Enrollments ===\n');

  try {
    // Find student HC-2026-0014
    const studentRecord = await prisma.studentRecord.findFirst({
      where: { studentId: 'HC-2026-0014' },
      include: {
        enrollments: {
          include: {
            courseOffering: {
              include: {
                semester: true,
                course: true,
              },
            },
            grade: true,
          },
        },
      },
    });

    if (!studentRecord) {
      console.log('Student HC-2026-0014 not found. Skipping.');
      return;
    }

    console.log(`Found student ${studentRecord.studentId}`);
    console.log(`Total enrollments: ${studentRecord.enrollments.length}\n`);

    // Group enrollments by semester
    const termIEnrollments = studentRecord.enrollments.filter(
      e => e.courseOffering.semester.name === 'Term I'
    );
    const termIIIEnrollments = studentRecord.enrollments.filter(
      e => e.courseOffering.semester.name === 'Term III'
    );

    console.log(`Term I enrollments: ${termIEnrollments.length}`);
    console.log(`Term III enrollments: ${termIIIEnrollments.length}\n`);

    // Check for Term III enrollments with grades that don't exist in Term I
    const termIIIWithGrades = termIIIEnrollments.filter(e => e.grade !== null);
    
    if (termIIIWithGrades.length > 0) {
      console.log('⚠️  WARNING: Term III has grades:');
      for (const enrollment of termIIIWithGrades) {
        console.log(`  - ${enrollment.courseOffering.course.code}: ${enrollment.grade?.letterGrade}`);
      }
      console.log('\nThese grades will be lost. Manually review if needed.\n');
    }

    // Delete Term III enrollments
    const termIIIIds = termIIIEnrollments.map(e => e.id);
    
    if (termIIIIds.length > 0) {
      const deleteResult = await prisma.enrollment.deleteMany({
        where: {
          id: { in: termIIIIds },
        },
      });

      console.log(`✅ Deleted ${deleteResult.count} duplicate Term III enrollments`);
      
      // List courses kept in Term I
      console.log('\n📋 Courses retained in Term I:');
      for (const enrollment of termIEnrollments) {
        console.log(`  - ${enrollment.courseOffering.course.code}: ${enrollment.courseOffering.course.name}`);
      }
    } else {
      console.log('✅ No Term III enrollments to delete');
    }

  } catch (error) {
    console.error('❌ Error consolidating duplicates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

consolidateDuplicates()
  .then(() => {
    console.log('\n✅ Consolidation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Consolidation failed:', error);
    process.exit(1);
  });
