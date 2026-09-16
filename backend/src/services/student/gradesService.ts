/**
 * Student Grades Service
 *
 * Returns full official academic record, GPA, CGPA, and transcript data
 * adhering strictly to Harmony College academic rules:
 *
 * 1. ECTS is strictly used for Quality Point and GPA/CGPA weighting (NOT Credit Hours).
 * 2. Course Quality Point = Grade Point * ECTS.
 * 3. Semester GPA = Total Quality Points / Total ECTS.
 * 4. CGPA = Cumulative Quality Points / Cumulative ECTS across all completed semesters.
 * 5. Grade Portal Authority: If closed, unpublished grades are hidden from students.
 * 6. Structured by Year I / Semester I & II, Year II / Semester I & II, etc.
 */

import { prisma } from '../../lib/prisma';
import {
  calculateQualityPoints,
  calculateSemesterGPA,
  calculateCGPA,
} from '../../lib/grading';

/** Check if the Registrar's Grade Portal is currently open. */
export async function isGradePortalOpen(): Promise<boolean> {
  const setting = await prisma.gradePortalSetting.findUnique({
    where: { id: 'default' },
    select: { isOpen: true },
  });
  return setting?.isOpen ?? false;
}

/** Convert a numeric year level to Roman numeral (1 -> I, 2 -> II, 3 -> III, 4 -> IV). */
function toRomanYear(year: number | null | undefined): string {
  const y = Number(year) || 1;
  switch (y) {
    case 1: return 'Year I';
    case 2: return 'Year II';
    case 3: return 'Year III';
    case 4: return 'Year IV';
    default: return `Year ${y}`;
  }
}

export async function getGradeHistory(studentRecordId: string, bypassPortalCheck = false) {
  const portalOpen = await isGradePortalOpen();

  // Grade filter: If student is viewing and portal is closed, only allow 'PUBLISHED' grades.
  // If registrar or bypassPortalCheck is true, include all.
  const statusFilter = (!portalOpen && !bypassPortalCheck)
    ? { in: ['PUBLISHED'] }
    : { in: ['PUBLISHED', 'SUBMITTED'] };

  const rawGrades = await prisma.courseGrade.findMany({
    where: {
      studentRecordId,
      letterGrade: { not: null },
      status: statusFilter,
    },
    include: {
      enrollment: {
        include: {
          courseOffering: {
            include: {
              course: { select: { id: true, code: true, name: true, creditHours: true, ects: true } },
              semester: { include: { academicYear: { select: { id: true, name: true, startDate: true } } } },
              instructor: { include: { user: { select: { fullName: true } } } },
            },
          },
        },
      },
    },
    orderBy: [
      { enrollment: { courseOffering: { semester: { startDate: 'asc' } } } },
      { enrollment: { courseOffering: { course: { code: 'asc' } } } },
    ],
  });

  const records = rawGrades.map(g => {
    const course = g.enrollment.courseOffering.course;
    const semester = g.enrollment.courseOffering.semester;
    const ects = g.ects ?? course.ects ?? 4;
    const creditHours = g.creditHours ?? course.creditHours ?? 3;
    const gradePoints = g.gradePoints ?? 0;
    const qualityPoints = g.qualityPoints ?? calculateQualityPoints(gradePoints, ects);

    // Calculate Year Level label based on semester or course yearLevel
    const semName = semester.name; // e.g. "Semester I" or "Semester II"
    // Extract academic year name
    const ayName = semester.academicYear.name;

    return {
      id: g.id,
      courseCode: course.code,
      courseTitle: course.name,
      creditHours,
      ects,
      finalMark: g.finalMark,
      grade: g.letterGrade ?? 'F',
      gradePoints,
      qualityPoints,
      term: `${semester.name} — ${ayName}`,
      semester: semName,
      academicYear: ayName,
      instructor: g.enrollment.courseOffering.instructor?.user.fullName ?? 'TBA',
      status: g.status,
      gradedAt: g.gradedAt,
    };
  });

  // Group into Year and Semester structure:
  // e.g. "Year I" -> "Semester I", "Semester II"
  // Group key by Academic Year & Semester
  const termMap = new Map<string, typeof records>();
  for (const r of records) {
    const key = `${r.academicYear}::${r.semester}`;
    if (!termMap.has(key)) {
      termMap.set(key, []);
    }
    termMap.get(key)!.push(r);
  }

  // Sort terms chronologically
  const termSummaries: {
    term: string;
    academicYear: string;
    semester: string;
    yearLevelLabel: string;
    courses: typeof records;
    totalEcts: number;
    totalQualityPoints: number;
    semesterGpa: number;
  }[] = [];

  // Group terms into Year index (first distinct academic year = Year I, second = Year II, etc.)
  const distinctYears = Array.from(new Set(records.map(r => r.academicYear)));

  termMap.forEach((termCourses, key) => {
    const [academicYear, semester] = key.split('::');
    const yearIndex = distinctYears.indexOf(academicYear) + 1;
    const yearLevelLabel = toRomanYear(yearIndex > 0 ? yearIndex : 1);

    const calc = calculateSemesterGPA(
      termCourses.map(c => ({
        qualityPoints: c.qualityPoints,
        gradePoints: c.gradePoints,
        ects: c.ects,
        letterGrade: c.grade,
      })),
    );

    termSummaries.push({
      term: `${yearLevelLabel} · ${semester} (${academicYear})`,
      academicYear,
      semester,
      yearLevelLabel,
      courses: termCourses,
      totalEcts: calc.totalEcts,
      totalQualityPoints: calc.totalQualityPoints,
      semesterGpa: calc.gpa,
    });
  });

  // Calculate Cumulative Summary across all completed courses
  const cumulative = calculateCGPA(
    records.map(r => ({
      qualityPoints: r.qualityPoints,
      gradePoints: r.gradePoints,
      ects: r.ects,
      letterGrade: r.grade,
    })),
  );

  return {
    records,
    termSummaries,
    academicSummary: {
      totalEcts: cumulative.totalEcts,
      totalQualityPoints: cumulative.totalQualityPoints,
      cgpa: cumulative.cgpa,
    },
    cumulativeGPA: cumulative.cgpa,
    totalCredits: cumulative.totalEcts,
    isGradePortalOpen: portalOpen,
  };
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

  // For official institutional transcript, retrieve official grades
  const { records, termSummaries, academicSummary, isGradePortalOpen } = await getGradeHistory(
    studentRecordId,
    false,
  );

  return {
    student: {
      studentId:  studentRecord.studentId,
      fullName:   studentRecord.user.fullName,
      email:      studentRecord.user.email,
      program:    studentRecord.program.name,
      department: studentRecord.department.name,
    },
    academicSummary,
    cumulativeGPA:        academicSummary.cgpa,
    totalEcts:            academicSummary.totalEcts,
    completedCredits:     academicSummary.totalEcts,
    totalRequiredCredits: studentRecord.program.totalCredits,
    admittedAt:           studentRecord.admittedAt,
    graduationStatus:     studentRecord.graduationAudit?.status ?? null,
    graduatedAt:          studentRecord.graduationAudit?.graduatedAt ?? null,
    grades:               records,
    termSummaries,
    isGradePortalOpen,
    issuedAt:             new Date(),
  };
}
