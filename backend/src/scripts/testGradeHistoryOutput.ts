import { prisma } from '../lib/prisma';
import { getGradeHistory } from '../services/student/gradesService';

async function main() {
  // Find a student with grades
  const studentWithGrades = await prisma.courseGrade.findFirst({
    select: { studentRecordId: true }
  });

  if (!studentWithGrades) {
    console.log('No student with grades found.');
    return;
  }

  const result = await getGradeHistory(studentWithGrades.studentRecordId, true);
  console.log('=== STUDENT INFO ===');
  console.log(result.student);

  console.log('\n=== PERIOD SUMMARIES ===');
  for (const s of result.termSummaries) {
    console.log(`\nPeriod: ${s.term} [${s.programType}]`);
    console.log(`Period Summary Label: ${s.summaryLabel}`);
    console.log('Courses (8 columns):');
    for (const c of s.courses) {
      console.log(`  #${c.index} | Title: ${c.courseTitle} | Code: ${c.courseCode} | Cr.Hr: ${c.creditHours} | ECTS: ${c.ects} | Grade: ${c.grade} | GP: ${c.gradePoints.toFixed(2)} | GPT/QP: ${c.qualityPoints.toFixed(2)}`);
    }
    console.log('\nSummary (4 columns):');
    console.log(`  ${s.currentSummary.label.padEnd(20)} | Total ECTS: ${s.currentSummary.totalEcts} | Total QP: ${s.currentSummary.totalQualityPoints.toFixed(2)} | GPA: ${s.currentSummary.gpa.toFixed(2)}`);
    console.log(`  ${s.cumulativeSummary.label.padEnd(20)} | Total ECTS: ${s.cumulativeSummary.totalEcts} | Total QP: ${s.cumulativeSummary.totalQualityPoints.toFixed(2)} | GPA: ${s.cumulativeSummary.gpa.toFixed(2)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
