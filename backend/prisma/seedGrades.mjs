import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // Get Alexander Sterling's completed enrollments (from previous semesters)
  const sr = await p.studentRecord.findFirst({ where: { studentId: 'HC-2024-0001' }, select: { id: true } });
  if (!sr) { console.log('Student not found'); return; }
  
  // Get CS courses from past semesters
  const pastEnrollments = await p.enrollment.findMany({
    where: { studentRecordId: sr.id },
    include: { courseOffering: { include: { course: { select: { code: true, name: true, creditHours: true } }, semester: { include: { academicYear: { select: { name: true } } } }, instructor: { include: { user: { select: { fullName: true } } } } } } },
    take: 10,
  });
  
  const gradeMap: Record<string,{grade:string,pts:number}> = { A: {grade:'A',pts:4.0}, 'B+': {grade:'B+',pts:3.5}, B: {grade:'B',pts:3.0}, 'A-': {grade:'A-',pts:3.7} };
  const grades = ['A','A','B+','A-','A','B+','A','A-','B+','A'];
  
  for (let i = 0; i < pastEnrollments.length; i++) {
    const enroll = pastEnrollments[i];
    const g = gradeMap[grades[i % grades.length]] ?? { grade: 'B', pts: 3.0 };
    await p.courseGrade.upsert({
      where: { enrollmentId: enroll.id },
      update: {},
      create: {
        enrollmentId: enroll.id,
        studentRecordId: sr.id,
        letterGrade: g.grade,
        gradePoints: g.pts,
        creditHours: enroll.courseOffering.course.creditHours,
        gradedAt: new Date(Date.now() - 30 * 86400000),
      },
    });
  }
  console.log('Seeded', pastEnrollments.length, 'grades');
  
  // Update GPA
  const allGrades = await p.courseGrade.findMany({ where: { studentRecordId: sr.id } });
  const totalPts = allGrades.reduce((s,g) => s + (g.gradePoints??0)*g.creditHours, 0);
  const totalCr  = allGrades.reduce((s,g) => s + g.creditHours, 0);
  const gpa = totalCr > 0 ? Math.round(totalPts/totalCr*100)/100 : 0;
  await p.studentRecord.update({ where: { id: sr.id }, data: { gpa, totalCredits: totalCr } });
  console.log('GPA updated to', gpa);
}
main().catch(console.error).finally(() => p.$disconnect());
