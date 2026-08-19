/**
 * Student Grades Service
 * Returns full grade history, GPA calculations, and transcript data.
 * Grade point values come from the GradeScale table (registrar-managed),
 * NOT from a hardcoded map.
 */
import { prisma } from '../../lib/prisma';

/** Fetch the active grade scale from DB. Cached for the lifetime of this call. */
async function getGradeScaleMap(): Promise<Map<string, number>> {
  const scales = await prisma.gradeScale.findMany({
    where: { isActive: true },
    select: { letterGrade: true, gradePoints: true },
  });
  return new Map(scales.map(s => [s.letterGrade, s.gradePoints]));
}

async function computeGPA(
  records: { letterGrade: string | null; creditHours: number }[],
  scaleMap: Map<string, number>,
): Promise<number> {
  const graded = records.filter(
    r => r.letterGrade !== null && scaleMap.has(r.letterGrade!),
  );
  if (graded.length === 0) return 0;
  const totalPoints = graded.reduce(
    (s, r) => s + (scaleMap.get(r.letterGrade!) ?? 0) * r.creditHours, 0,
  );
  const totalCredits = graded.reduce((s, r) => s + r.creditHours, 0);
  return totalCredits > 0
    ? Math.round((totalPoints / totalCredits) * 100) / 100
    : 0;
}

export async function getGradeHistory(studentRecordId: string) {
  const [rawGrades, scaleMap] = await Promise.all([
    prisma.courseGrade.findMany({
      where: { studentRecordId, letterGrade: { not: null } },
      include: {
        enrollment: {
          include: {
            courseOffering: {
              include: {
                course: { select: { code: true, name: true } },
                semester: { include: { academicYear: { select: { name: true } } } },
                instructor: { include: { user: { select: { fullName: true } } } },
              },
            },
          },
        },
      },
      orderBy: [{ enrollment: { courseOffering: { semester: { startDate: 'desc' } } } }],
    }),
    getGradeScaleMap(),
  ]);

  const records = rawGrades.map(g => {
    const gradePoints = scaleMap.get(g.letterGrade ?? '') ?? g.gradePoints ?? 0;
    return {
      id: g.id,
      courseCode:  g.enrollment.courseOffering.course.code,
      courseTitle: g.enrollment.courseOffering.course.name,
      term: `${g.enrollment.courseOffering.semester.name} — ${g.enrollment.courseOffering.semester.academicYear.name}`,
      semester:     g.enrollment.courseOffering.semester.name,
      academicYear: g.enrollment.courseOffering.semester.academicYear.name,
      credits:     g.creditHours,
      grade:       g.letterGrade ?? 'IP',
      gradePoints,
      instructor:  g.enrollment.courseOffering.instructor?.user.fullName ?? 'TBA',
      gradedAt:    g.gradedAt,
    };
  });

  const cumulativeGPA = await computeGPA(
    records.map(r => ({ letterGrade: r.grade, creditHours: r.credits })),
    scaleMap,
  );
  const totalCredits = records.reduce((s, r) => s + r.credits, 0);

  const byTerm: Record<string, typeof records> = {};
  for (const r of records) {
    if (!byTerm[r.term]) byTerm[r.term] = [];
    byTerm[r.term].push(r);
  }

  const termSummaries = await Promise.all(
    Object.entries(byTerm).map(async ([term, termRecords]) => ({
      term,
      gpa: await computeGPA(
        termRecords.map(r => ({ letterGrade: r.grade, creditHours: r.credits })),
        scaleMap,
      ),
      credits: termRecords.reduce((s, r) => s + r.credits, 0),
      courses: termRecords.length,
    })),
  );

  return { records, cumulativeGPA, totalCredits, termSummaries };
}

export async function getTranscriptData(studentRecordId: string) {
  const studentRecord = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      program: { select: { name: true, code: true, totalCredits: true } },
      department: { select: { name: true } },
      graduationAudit: { select: { status: true, graduatedAt: true } },
    },
  });
  if (!studentRecord) return null;

  const { records, cumulativeGPA, totalCredits } = await getGradeHistory(studentRecordId);

  return {
    student: {
      studentId:  studentRecord.studentId,
      fullName:   studentRecord.user.fullName,
      email:      studentRecord.user.email,
      program:    studentRecord.program.name,
      department: studentRecord.department.name,
    },
    cumulativeGPA,
    completedCredits:     totalCredits,
    totalRequiredCredits: studentRecord.program.totalCredits,
    admittedAt:           studentRecord.admittedAt,
    graduationStatus:     studentRecord.graduationAudit?.status ?? null,
    graduatedAt:          studentRecord.graduationAudit?.graduatedAt ?? null,
    grades:    records,
    issuedAt:  new Date(),
  };
}
