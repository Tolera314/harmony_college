/**
 * Recalculate GPA and Quality Points
 * 
 * Recalculates cumulative GPA for all students using the institution's grading scale.
 * GPA = totalQualityPoints / totalEligibleECTS
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateGPA() {
  console.log('=== Recalculating Student GPAs ===\n');

  try {
    // Get all student records
    const students = await prisma.studentRecord.findMany({
      include: {
        enrollments: {
          include: {
            grade: true,
            courseOffering: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${students.length} students\n`);

    for (const student of students) {
      console.log(`\nStudent: ${student.studentId}`);
      
      let totalQualityPoints = 0;
      let totalEligibleECTS = 0;
      let courseCount = 0;

      // Track courses to avoid counting duplicates
      const processedCourses = new Set<string>();

      for (const enrollment of student.enrollments) {
        const grade = enrollment.grade;
        const course = enrollment.courseOffering.course;
        const ects = course.ects || 0;

        // Skip if no grade or already processed this course
        if (!grade || processedCourses.has(course.id)) {
          continue;
        }

        const letterGrade = grade.letterGrade;

        // Eligible grades (exclude W, I, IP, F based on policy)
        // Assuming F is NOT included in GPA calculation (verify with institution policy)
        const eligibleGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D'];
        
        if (eligibleGrades.includes(letterGrade)) {
          const gradePoints = grade.gradePoints || 0;
          const qualityPoints = gradePoints * ects;

          totalQualityPoints += qualityPoints;
          totalEligibleECTS += ects;
          courseCount++;

          console.log(`  ${course.code}: ${letterGrade} (${gradePoints.toFixed(2)} × ${ects} ECTS = ${qualityPoints.toFixed(2)} QP)`);
          
          processedCourses.add(course.id);
        }
      }

      const calculatedGPA = totalEligibleECTS > 0 
        ? totalQualityPoints / totalEligibleECTS 
        : 0;

      console.log(`  ---`);
      console.log(`  Total Quality Points: ${totalQualityPoints.toFixed(2)}`);
      console.log(`  Total Eligible ECTS: ${totalEligibleECTS}`);
      console.log(`  Calculated GPA: ${calculatedGPA.toFixed(2)}`);
      console.log(`  Courses counted: ${courseCount}`);

      // Update student record
      await prisma.studentRecord.update({
        where: { id: student.id },
        data: {
          gpa: calculatedGPA,
          totalCredits: totalEligibleECTS,
        },
      });

      console.log(`  ✅ Updated`);
    }

  } catch (error) {
    console.error('❌ Error recalculating GPA:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

recalculateGPA()
  .then(() => {
    console.log('\n✅ GPA recalculation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ GPA recalculation failed:', error);
    process.exit(1);
  });
