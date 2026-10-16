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
  calculateCumulativeRecord,
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

  // Retrieve student record to know programType, program name, department
  const studentRecord = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      program: { select: { id: true, name: true, code: true, totalCredits: true } },
      department: { select: { id: true, name: true, code: true } },
    },
  });

  const isShortProgram = studentRecord?.programType === 'SHORT_PROGRAM';

  // Grade filter: Students only see officially PUBLISHED grades.
  // Administrative views (registrar, audits) with bypassPortalCheck can see both PUBLISHED and SUBMITTED.
  const statusFilter = bypassPortalCheck
    ? { in: ['PUBLISHED', 'SUBMITTED'] }
    : { in: ['PUBLISHED'] };

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
              semester: {
                include: {
                  academicYear: { select: { id: true, name: true, startDate: true } },
                },
              },
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

  const records = rawGrades.map((g, idx) => {
    const course = g.enrollment.courseOffering.course;
    const semester = g.enrollment.courseOffering.semester;
    const ects = g.ects ?? course.ects ?? 4;
    const creditHours = g.creditHours ?? course.creditHours ?? 3;
    const gradePoints = g.gradePoints ?? 0;
    const qualityPoints = g.qualityPoints ?? calculateQualityPoints(gradePoints, ects);

    const semName = semester.name;
    const ayName = semester.academicYear.name;

    // Appropriate label based on programType:
    // TVET -> "Semester I — 2026/2027"
    // Short Program -> "Term I"
    const termLabel = isShortProgram
      ? semName
      : `${semName} — ${ayName}`;

    return {
      id: g.id,
      index: idx + 1,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.name,
      creditHours,
      ects,
      finalMark: g.finalMark,
      grade: g.letterGrade ?? 'F',
      gradePoints,
      qualityPoints,
      term: termLabel,
      semester: semName,
      semesterId: semester.id,
      semesterStartDate: semester.startDate,
      academicYear: ayName,
      instructor: g.enrollment.courseOffering.instructor?.user.fullName ?? 'TBA',
      status: g.status,
      gradedAt: g.gradedAt,
    };
  });

  // Group records by unique Semester/Period ID
  const semesterMap = new Map<string, typeof records>();
  for (const r of records) {
    if (!semesterMap.has(r.semesterId)) {
      semesterMap.set(r.semesterId, []);
    }
    semesterMap.get(r.semesterId)!.push(r);
  }

  // Determine chronological distinct academic years for TVET Roman numeral labeling
  const distinctYears = Array.from(new Set(records.map(r => r.academicYear)));

  const termSummaries: {
    semesterId: string;
    semesterName: string;
    periodId: string;
    periodName: string;
    programType: 'TVET' | 'SHORT_PROGRAM';
    term: string;
    academicYear: string;
    semester: string;
    yearLevel: number;
    yearLevelLabel: string;
    summaryLabel: string;
    courses: typeof records;
    totalCreditHours: number;
    totalEcts: number;
    totalQualityPoints: number;
    semesterGpa: number;
    currentSummary: {
      label: string;
      totalEcts: number;
      totalQualityPoints: number;
      gpa: number;
    };
    cumulativeSummary: {
      label: string;
      totalEcts: number;
      totalQualityPoints: number;
      gpa: number;
    };
  }[] = [];

  const cumulativeCoursesAccumulator: typeof records = [];

  semesterMap.forEach((termCourses) => {
    const first = termCourses[0];
    const academicYear = first.academicYear;
    const semesterName = first.semester;
    const yearIndex = distinctYears.indexOf(academicYear) + 1;
    const yearLevel = yearIndex > 0 ? yearIndex : (studentRecord?.yearLevel || 1);
    const yearLevelLabel = toRomanYear(yearLevel);

    // Number courses 1..N in this period's independent course table
    const numberedPeriodCourses = termCourses.map((c, i) => ({
      ...c,
      index: i + 1,
    }));

    // Period GPA calculation (Current Semester / Current Term)
    const periodCalc = calculateSemesterGPA(
      numberedPeriodCourses.map(c => ({
        qualityPoints: c.qualityPoints,
        gradePoints: c.gradePoints,
        ects: c.ects,
        letterGrade: c.grade,
      })),
    );

    // Add to cumulative tracker and compute cumulative summary up to this period
    cumulativeCoursesAccumulator.push(...numberedPeriodCourses);
    const cumulativeToDate = calculateCumulativeRecord(
      cumulativeCoursesAccumulator.map(c => ({
        courseCode: c.courseCode,
        courseId: c.courseId,
        qualityPoints: c.qualityPoints,
        gradePoints: c.gradePoints,
        ects: c.ects,
        letterGrade: c.grade,
      })),
    );

    const totalCreditHours = numberedPeriodCourses.reduce((sum, c) => sum + c.creditHours, 0);

    // Label conventions:
    // TVET -> "Year I · Semester I (2026/2027)"
    // Short Program -> "Term I" (or "Term II", etc.) - NEVER "Year I · Semester I"
    const displayTermLabel = isShortProgram
      ? semesterName
      : `${yearLevelLabel} · ${semesterName} (${academicYear})`;

    const periodSummaryLabel = isShortProgram ? 'Current Term:' : 'Current Semester:';

    termSummaries.push({
      semesterId: first.semesterId,
      semesterName,
      periodId: first.semesterId,
      periodName: semesterName,
      programType: isShortProgram ? 'SHORT_PROGRAM' : 'TVET',
      term: displayTermLabel,
      academicYear,
      semester: semesterName,
      yearLevel,
      yearLevelLabel,
      summaryLabel: periodSummaryLabel,
      courses: numberedPeriodCourses,
      totalCreditHours,
      totalEcts: periodCalc.totalEcts,
      totalQualityPoints: periodCalc.totalQualityPoints,
      semesterGpa: periodCalc.gpa,
      currentSummary: {
        label: periodSummaryLabel,
        totalEcts: periodCalc.totalEcts,
        totalQualityPoints: periodCalc.totalQualityPoints,
        gpa: periodCalc.gpa,
      },
      cumulativeSummary: {
        label: 'Cumulative:',
        totalEcts: cumulativeToDate.totalEcts,
        totalQualityPoints: cumulativeToDate.totalQualityPoints,
        gpa: cumulativeToDate.cgpa,
      },
    });
  });

  // Calculate overall Cumulative Summary across all completed courses
  const cumulative = calculateCumulativeRecord(
    records.map(r => ({
      courseCode: r.courseCode,
      courseId: r.courseId,
      qualityPoints: r.qualityPoints,
      gradePoints: r.gradePoints,
      ects: r.ects,
      letterGrade: r.grade,
    })),
  );

  const totalCreditHours = records.reduce((sum, r) => sum + r.creditHours, 0);

  return {
    student: studentRecord ? {
      id: studentRecord.id,
      studentId: studentRecord.studentId,
      fullName: studentRecord.user.fullName,
      email: studentRecord.user.email ?? '',
      programName: studentRecord.program?.name ?? '',
      programType: studentRecord.programType,
      departmentName: studentRecord.department?.name ?? '',
      currentGpa: cumulative.cgpa,
      yearLevel: studentRecord.yearLevel || 1,
    } : null,
    records,
    termSummaries,
    // Expose `semesters` alias for RegistrarStudentsView compatibility
    semesters: termSummaries,
    academicSummary: {
      totalCourses: records.length,
      totalCreditHours,
      totalEcts: cumulative.totalEcts,
      totalQualityPoints: cumulative.totalQualityPoints,
      cgpa: cumulative.cgpa,
    },
    cumulative: {
      totalCourses: records.length,
      totalCreditHours,
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
  const gradeData = await getGradeHistory(studentRecordId, false);

  return {
    student: {
      studentId:  studentRecord.studentId,
      fullName:   studentRecord.user.fullName,
      email:      studentRecord.user.email,
      program:    studentRecord.program.name,
      department: studentRecord.department.name,
      programType: studentRecord.programType,
    },
    academicSummary:      gradeData.academicSummary,
    cumulativeGPA:        gradeData.academicSummary.cgpa,
    totalEcts:            gradeData.academicSummary.totalEcts,
    completedCredits:     gradeData.academicSummary.totalEcts,
    totalRequiredCredits: studentRecord.program.totalCredits,
    admittedAt:           studentRecord.admittedAt,
    graduationStatus:     studentRecord.graduationAudit?.status ?? null,
    graduatedAt:          studentRecord.graduationAudit?.graduatedAt ?? null,
    grades:               gradeData.records,
    termSummaries:        gradeData.termSummaries,
    semesters:            gradeData.termSummaries,
    isGradePortalOpen:    gradeData.isGradePortalOpen,
    issuedAt:             new Date(),
  };
}
