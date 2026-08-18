import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const gradeMap: Record<string, { grade: string; pts: number }> = {
    'A':  { grade: 'A',  pts: 4.0 }, 'A-': { grade: 'A-', pts: 3.7 },
    'B+': { grade: 'B+', pts: 3.5 }, 'B':  { grade: 'B',  pts: 3.0 },
    'B-': { grade: 'B-', pts: 2.7 }, 'C+': { grade: 'C+', pts: 2.5 },
  };
  const gradeSeq = ['A', 'A', 'B+', 'A-', 'A', 'B+', 'A', 'A-', 'B+', 'A'];

  // Seed grades for all students based on their enrollments
  const allStudents = await p.studentRecord.findMany({
    select: { id: true, studentId: true },
  });

  for (const sr of allStudents) {
    const enrollments = await p.enrollment.findMany({
      where: { studentRecordId: sr.id },
      include: {
        courseOffering: {
          include: {
            course: { select: { creditHours: true, code: true } },
            semester: { select: { isCurrent: true } },
          },
        },
      },
    });

    let seeded = 0;
    for (let i = 0; i < enrollments.length; i++) {
      const enroll = enrollments[i];
      // Grade ALL enrollments (current semester shows as "In Progress" until instructor grades)
      const g = gradeMap[gradeSeq[i % gradeSeq.length]] ?? { grade: 'B', pts: 3.0 };
      await p.courseGrade.upsert({
        where: { enrollmentId: enroll.id },
        update: {},
        create: {
          enrollmentId:   enroll.id,
          studentRecordId: sr.id,
          letterGrade:   g.grade,
          gradePoints:   g.pts,
          creditHours:   enroll.courseOffering.course.creditHours,
          gradedAt:      new Date(Date.now() - 90 * 86400000),
        },
      });
      seeded++;
    }

    // Recompute and update GPA + totalCredits
    const allGrades = await p.courseGrade.findMany({
      where: { studentRecordId: sr.id },
      select: { gradePoints: true, creditHours: true },
    });
    const totalPts = allGrades.reduce((s, g) => s + (g.gradePoints ?? 0) * g.creditHours, 0);
    const totalCr  = allGrades.reduce((s, g) => s + g.creditHours, 0);
    const gpa = totalCr > 0 ? Math.round((totalPts / totalCr) * 100) / 100 : 0;
    if (totalCr > 0) {
      await p.studentRecord.update({
        where: { id: sr.id },
        data:  { gpa, totalCredits: totalCr },
      });
    }
    console.log(`   ${sr.studentId}: ${seeded} grades seeded, GPA=${gpa}`);
  }
  console.log('✅ Grades seeded');
}

main().catch(console.error).finally(() => p.$disconnect());
