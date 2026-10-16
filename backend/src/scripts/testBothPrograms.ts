import { prisma } from '../lib/prisma';
import { getGradeHistory } from '../services/student/gradesService';

async function main() {
  const offerings = await prisma.courseOffering.findMany({
    select: {
      id: true,
      semester: { select: { name: true, programType: true } },
      course: { select: { code: true, name: true } },
      _count: { select: { enrollments: true } },
    },
  });
  console.log('Offerings by semester:', offerings);

  // Find student in TVET offering
  const tvetOffering = await prisma.courseOffering.findFirst({
    where: { semester: { programType: 'TVET' }, enrollments: { some: {} } },
    include: {
      semester: true,
      course: true,
      enrollments: { include: { studentRecord: { include: { user: true } } } },
    },
  });

  if (tvetOffering && tvetOffering.enrollments.length > 0) {
    const tvetEnrollment = tvetOffering.enrollments[0];
    const tvetStudent = tvetEnrollment.studentRecord;
    console.log(`\n=== FOUND TVET ENROLLED STUDENT: ${tvetStudent.studentId} (${tvetStudent.user?.fullName}) ===`);

    const existingGrade = await prisma.courseGrade.findUnique({
      where: { enrollmentId: tvetEnrollment.id },
    });

    if (!existingGrade) {
      await prisma.courseGrade.create({
        data: {
          enrollmentId: tvetEnrollment.id,
          studentRecordId: tvetStudent.id,
          letterGrade: 'A',
          gradePoints: 4.0,
          qualityPoints: 4.0 * (tvetOffering.course.ects || 4),
          status: 'PUBLISHED',
          finalMark: 88,
        },
      });
      console.log('Created sample grade for TVET student to verify calculation.');
    }

    const tvetHistory = await getGradeHistory(tvetStudent.id, true);
    console.log('\n=== TVET STUDENT GRADE HISTORY RESULT ===');
    console.log('ProgramType:', tvetHistory.student?.programType);
    for (const t of tvetHistory.termSummaries) {
      console.log(`Period: ${t.term} [${t.programType}]`);
      console.log(`Summary Label: "${t.summaryLabel}"`);
      console.log('Courses:');
      for (const c of t.courses) {
        console.log(`  #${c.index} | Title: ${c.courseTitle} | Code: ${c.courseCode} | Cr.Hr: ${c.creditHours} | ECTS: ${c.ects} | Grade: ${c.grade} | GP: ${c.gradePoints} | QP: ${c.qualityPoints}`);
      }
      console.log('Summary:');
      console.log(`  ${t.currentSummary.label.padEnd(20)} | Total ECTS: ${t.currentSummary.totalEcts} | Total QP: ${t.currentSummary.totalQualityPoints.toFixed(2)} | GPA: ${t.currentSummary.gpa.toFixed(2)}`);
      console.log(`  ${t.cumulativeSummary.label.padEnd(20)} | Total ECTS: ${t.cumulativeSummary.totalEcts} | Total QP: ${t.cumulativeSummary.totalQualityPoints.toFixed(2)} | CGPA: ${t.cumulativeSummary.gpa.toFixed(2)}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
