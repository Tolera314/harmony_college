/**
 * Harmony College Centralized Academic Grading Engine
 *
 * Enforces the exact institutional grading scale, quality points,
 * semester GPA, and cumulative CGPA calculations across all roles
 * (Instructor, Registrar, Student, Transcript, and Reports).
 *
 * Rules:
 * 1. Grading Scale:
 *    90–100 -> A+ -> 4.00
 *    85–89  -> A  -> 4.00
 *    80–84  -> A- -> 3.75
 *    75–79  -> B+ -> 3.50
 *    70–74  -> B  -> 3.00
 *    65–69  -> B- -> 2.75
 *    60–64  -> C+ -> 2.50
 *    50–59  -> C  -> 2.00
 *    45–49  -> C- -> 1.75
 *    40–44  -> D  -> 1.00
 *    <40    -> F  -> 0.00
 *
 * 2. ECTS vs. Credit Hours:
 *    - Credit Hour is displayed for institutional context.
 *    - ECTS is STRICTLY used for weighting.
 *    - Course Quality Point = Grade Point * ECTS.
 *    - Semester GPA = (Total Quality Points in Semester) / (Total ECTS in Semester).
 *    - CGPA = (Total Quality Points Across All Completed Courses) / (Total ECTS Across All Completed Courses).
 */

export interface AssessmentBreakdown {
  assignment?: number | null;
  quiz?: number | null;
  midExam?: number | null;
  finalExam?: number | null;
  attendance?: number | null;
  other?: number | null;
}

export interface CalculatedCourseResult {
  finalMark: number;
  letterGrade: string;
  gradePoints: number;
  qualityPoints: number;
}

export interface CourseGradeInput {
  gradePoints: number;
  ects: number;
  letterGrade?: string | null;
  status?: string | null;
}

export interface TermSummaryResult {
  totalEcts: number;
  totalQualityPoints: number;
  gpa: number;
}

export interface CumulativeSummaryResult {
  totalEcts: number;
  totalQualityPoints: number;
  cgpa: number;
}

/** Convert a numeric percentage/mark (0–100) to exact Letter Grade and Grade Point. */
export function markToGrade(mark: number): { letterGrade: string; gradePoints: number } {
  // Normalize and round to nearest whole / 2-decimal
  const m = Math.round(Number(mark) * 100) / 100;

  if (m >= 90) return { letterGrade: 'A+', gradePoints: 4.00 };
  if (m >= 85) return { letterGrade: 'A',  gradePoints: 4.00 };
  if (m >= 80) return { letterGrade: 'A-', gradePoints: 3.75 };
  if (m >= 75) return { letterGrade: 'B+', gradePoints: 3.50 };
  if (m >= 70) return { letterGrade: 'B',  gradePoints: 3.00 };
  if (m >= 65) return { letterGrade: 'B-', gradePoints: 2.75 };
  if (m >= 60) return { letterGrade: 'C+', gradePoints: 2.50 };
  if (m >= 50) return { letterGrade: 'C',  gradePoints: 2.00 };
  if (m >= 45) return { letterGrade: 'C-', gradePoints: 1.75 };
  if (m >= 40) return { letterGrade: 'D',  gradePoints: 1.00 };
  return { letterGrade: 'F', gradePoints: 0.00 };
}

/**
 * Calculates Final Mark by summing non-null assessment components:
 * Assignment + Quiz + Mid Exam + Final Exam + Attendance + Other
 */
export function calculateFinalMark(breakdown: AssessmentBreakdown): number {
  const parts = [
    breakdown.assignment,
    breakdown.quiz,
    breakdown.midExam,
    breakdown.finalExam,
    breakdown.attendance,
    breakdown.other,
  ];

  let total = 0;
  for (const p of parts) {
    if (typeof p === 'number' && !isNaN(p)) {
      total += p;
    }
  }

  // Cap mark at 100 and floor at 0
  const clamped = Math.max(0, Math.min(100, total));
  return Math.round(clamped * 100) / 100;
}

/**
 * Calculate full course grading outcome automatically from raw assessments and course ECTS.
 */
export function calculateCourseResult(
  breakdown: AssessmentBreakdown,
  ects: number,
): CalculatedCourseResult {
  const finalMark = calculateFinalMark(breakdown);
  const { letterGrade, gradePoints } = markToGrade(finalMark);
  const qualityPoints = calculateQualityPoints(gradePoints, ects);

  return {
    finalMark,
    letterGrade,
    gradePoints,
    qualityPoints,
  };
}

/**
 * Calculate Course Quality Point = Grade Point * ECTS.
 * Rounded to 2 decimal places.
 */
export function calculateQualityPoints(gradePoints: number, ects: number): number {
  const val = Number(gradePoints) * Number(ects);
  return Math.round(val * 100) / 100;
}

/**
 * Calculate Semester GPA = Total Semester Quality Points / Total Semester ECTS.
 * Never averages course grade points directly.
 * Returns 0 if total ECTS is 0.
 */
export function calculateSemesterGPA(
  courses: { qualityPoints?: number | null; gradePoints?: number | null; ects: number; letterGrade?: string | null }[],
): TermSummaryResult {
  let totalQualityPoints = 0;
  let totalEcts = 0;

  for (const c of courses) {
    const ects = Number(c.ects) || 0;
    if (ects <= 0) continue;

    // Only count completed/graded courses (skip non-graded or withdrawals if any)
    if (c.letterGrade === 'W' || c.letterGrade === 'NG' || c.letterGrade === 'I' || c.letterGrade === 'IP') {
      continue;
    }

    const qp =
      typeof c.qualityPoints === 'number' && !isNaN(c.qualityPoints)
        ? c.qualityPoints
        : typeof c.gradePoints === 'number' && !isNaN(c.gradePoints)
          ? calculateQualityPoints(c.gradePoints, ects)
          : 0;

    totalQualityPoints += qp;
    totalEcts += ects;
  }

  const gpa = totalEcts > 0 ? Math.round((totalQualityPoints / totalEcts) * 100) / 100 : 0.00;

  return {
    totalEcts,
    totalQualityPoints: Math.round(totalQualityPoints * 100) / 100,
    gpa,
  };
}

/**
 * Calculate Cumulative GPA (CGPA) = Total Cumulative Quality Points / Total Cumulative ECTS.
 * Never averages semester GPAs.
 * Returns 0 if total cumulative ECTS is 0.
 */
export function calculateCGPA(
  allCompletedCourses: { qualityPoints?: number | null; gradePoints?: number | null; ects: number; letterGrade?: string | null }[],
): CumulativeSummaryResult {
  let totalQualityPoints = 0;
  let totalEcts = 0;

  for (const c of allCompletedCourses) {
    const ects = Number(c.ects) || 0;
    if (ects <= 0) continue;

    if (c.letterGrade === 'W' || c.letterGrade === 'NG' || c.letterGrade === 'I' || c.letterGrade === 'IP') {
      continue;
    }

    const qp =
      typeof c.qualityPoints === 'number' && !isNaN(c.qualityPoints)
        ? c.qualityPoints
        : typeof c.gradePoints === 'number' && !isNaN(c.gradePoints)
          ? calculateQualityPoints(c.gradePoints, ects)
          : 0;

    totalQualityPoints += qp;
    totalEcts += ects;
  }

  const cgpa = totalEcts > 0 ? Math.round((totalQualityPoints / totalEcts) * 100) / 100 : 0.00;

  return {
    totalEcts,
    totalQualityPoints: Math.round(totalQualityPoints * 100) / 100,
    cgpa,
  };
}
