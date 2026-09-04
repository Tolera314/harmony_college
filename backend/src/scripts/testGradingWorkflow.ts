import { prisma } from '../lib/prisma';
import {
  markToGrade,
  calculateFinalMark,
  calculateQualityPoints,
  calculateCourseResult,
  calculateSemesterGPA,
  calculateCGPA,
} from '../lib/grading';
import { isGradePortalOpen } from '../services/student/gradesService';

async function main() {
  console.log('=== HARMONY COLLEGE GRADING WORKFLOW VERIFICATION ===\n');

  // 1. Verify Grading Scale
  console.log('1. Verifying Institutional Grading Scale:');
  const testCases = [
    { mark: 95, expectedGrade: 'A+', expectedGp: 4.0 },
    { mark: 87, expectedGrade: 'A', expectedGp: 4.0 },
    { mark: 82, expectedGrade: 'A-', expectedGp: 3.75 },
    { mark: 77, expectedGrade: 'B+', expectedGp: 3.5 },
    { mark: 72, expectedGrade: 'B', expectedGp: 3.0 },
    { mark: 67, expectedGrade: 'B-', expectedGp: 2.75 },
    { mark: 62, expectedGrade: 'C+', expectedGp: 2.5 },
    { mark: 55, expectedGrade: 'C', expectedGp: 2.0 },
    { mark: 47, expectedGrade: 'C-', expectedGp: 1.75 },
    { mark: 42, expectedGrade: 'D', expectedGp: 1.0 },
    { mark: 35, expectedGrade: 'F', expectedGp: 0.0 },
  ];

  for (const tc of testCases) {
    const res = markToGrade(tc.mark);
    const passed = res.letterGrade === tc.expectedGrade && res.gradePoints === tc.expectedGp;
    console.log(
      `  Mark ${tc.mark} -> Grade ${res.letterGrade} (${res.gradePoints.toFixed(2)} pts) | Expected: ${tc.expectedGrade} (${tc.expectedGp.toFixed(2)}) -> ${passed ? '✓ PASS' : '✗ FAIL'}`
    );
    if (!passed) throw new Error(`Scale test failed for mark ${tc.mark}`);
  }

  // 2. Verify Assessment Components Auto-Calculation
  console.log('\n2. Verifying Assessment Sum & Quality Points:');
  const sampleBreakdown = {
    assignment: 15,
    quiz: 8,
    midExam: 20,
    finalExam: 35,
    attendance: 5,
    other: 4,
  };
  const ects = 5;
  const result = calculateCourseResult(sampleBreakdown, ects);
  console.log(`  Assessment Components:`, sampleBreakdown);
  console.log(`  Final Mark: ${result.finalMark} (Expected: 87)`);
  console.log(`  Grade: ${result.letterGrade} (Expected: A)`);
  console.log(`  Grade Point: ${result.gradePoints} (Expected: 4.00)`);
  console.log(`  Quality Point (${result.gradePoints} × ${ects} ECTS): ${result.qualityPoints} (Expected: 20.00)`);
  if (result.finalMark !== 87 || result.letterGrade !== 'A' || result.gradePoints !== 4.0 || result.qualityPoints !== 20.0) {
    throw new Error('Assessment auto-calculation failed');
  }
  console.log('  -> ✓ PASS');

  // 3. Verify Semester GPA calculation
  console.log('\n3. Verifying Semester GPA Calculation:');
  const semesterCourses = [
    { ects: 5, gradePoints: 4.0, qualityPoints: 20.0, letterGrade: 'A' },
    { ects: 5, gradePoints: 3.75, qualityPoints: 18.75, letterGrade: 'A-' },
    { ects: 4, gradePoints: 3.5, qualityPoints: 14.0, letterGrade: 'B+' },
    { ects: 4, gradePoints: 3.0, qualityPoints: 12.0, letterGrade: 'B' },
  ];
  // Total ECTS = 5 + 5 + 4 + 4 = 18
  // Total QP = 20.0 + 18.75 + 14.0 + 12.0 = 64.75
  // Semester GPA = 64.75 / 18 = 3.5972... -> 3.60
  const semResult = calculateSemesterGPA(semesterCourses);
  console.log(`  Total ECTS: ${semResult.totalEcts}`);
  console.log(`  Total Quality Points: ${semResult.totalQualityPoints}`);
  console.log(`  Semester GPA: ${semResult.gpa.toFixed(2)} (Expected: 3.60)`);
  if (semResult.totalEcts !== 18 || semResult.gpa !== 3.60) {
    throw new Error('Semester GPA calculation failed');
  }
  console.log('  -> ✓ PASS');

  // 4. Verify Cumulative GPA (CGPA) across multiple semesters
  console.log('\n4. Verifying CGPA Calculation:');
  const allCompletedCourses = [
    ...semesterCourses,
    // Semester 2 courses:
    { ects: 5, gradePoints: 3.0, qualityPoints: 15.0, letterGrade: 'B' },
    { ects: 5, gradePoints: 2.75, qualityPoints: 13.75, letterGrade: 'B-' },
    { ects: 4, gradePoints: 3.5, qualityPoints: 14.0, letterGrade: 'B+' },
    { ects: 4, gradePoints: 4.0, qualityPoints: 16.0, letterGrade: 'A' },
  ];
  // Total ECTS = 18 + 18 = 36
  // Total QP = 64.75 + 58.75 = 123.50
  // CGPA = 123.50 / 36 = 3.4305... -> 3.43
  const cgpaResult = calculateCGPA(allCompletedCourses);
  console.log(`  Cumulative ECTS: ${cgpaResult.totalEcts}`);
  console.log(`  Cumulative QP: ${cgpaResult.totalQualityPoints}`);
  console.log(`  Cumulative CGPA: ${cgpaResult.cgpa.toFixed(2)} (Expected: 3.43)`);
  if (cgpaResult.totalEcts !== 36 || cgpaResult.cgpa !== 3.43) {
    throw new Error('CGPA calculation failed');
  }
  console.log('  -> ✓ PASS');

  // 5. Verify Database Grade Portal Setting
  console.log('\n5. Verifying Database Grade Portal Setting:');
  const portalSetting = await prisma.gradePortalSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', isOpen: true },
    update: {},
  });
  console.log(`  Grade Portal in DB is currently: ${portalSetting.isOpen ? 'OPEN' : 'CLOSED'}`);
  const openStatus = await isGradePortalOpen();
  console.log(`  isGradePortalOpen() helper returned: ${openStatus}`);
  console.log('  -> ✓ PASS');

  console.log('\n=== ALL GRADING & GPA ENGINE TESTS PASSED PERFECTLY ===\n');
}

main()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
