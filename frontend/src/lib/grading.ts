/**
 * Harmony College Centralized Academic Grading Engine (Frontend)
 *
 * Mirrors the institutional grading scale and calculations:
 *
 * 90–100 -> A+ -> 4.00
 * 85–89  -> A  -> 4.00
 * 80–84  -> A- -> 3.75
 * 75–79  -> B+ -> 3.50
 * 70–74  -> B  -> 3.00
 * 65–69  -> B- -> 2.75
 * 60–64  -> C+ -> 2.50
 * 50–59  -> C  -> 2.00
 * 45–49  -> C- -> 1.75
 * 40–44  -> D  -> 1.00
 * <40    -> F  -> 0.00
 *
 * Quality Point = Grade Point * ECTS
 * Semester GPA = Total Quality Points / Total ECTS
 * CGPA = Total Cumulative Quality Points / Total Cumulative ECTS
 */

export interface AssessmentBreakdown {
  assignment?: number | string | null;
  quiz?: number | string | null;
  midExam?: number | string | null;
  finalExam?: number | string | null;
  attendance?: number | string | null;
  other?: number | string | null;
}

export interface CalculatedCourseResult {
  finalMark: number;
  letterGrade: string;
  gradePoints: number;
  qualityPoints: number;
}

export function markToGrade(mark: number): { letterGrade: string; gradePoints: number } {
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
    const num = Number(p);
    if (!isNaN(num) && num > 0) {
      total += num;
    }
  }

  const clamped = Math.max(0, Math.min(100, total));
  return Math.round(clamped * 100) / 100;
}

export function calculateQualityPoints(gradePoints: number, ects: number): number {
  const val = Number(gradePoints) * Number(ects);
  return Math.round(val * 100) / 100;
}

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

export function calculateSemesterGPA(
  courses: { qualityPoints?: number | null; gradePoints?: number | null; ects: number; letterGrade?: string | null }[],
): { totalEcts: number; totalQualityPoints: number; gpa: number } {
  let totalQualityPoints = 0;
  let totalEcts = 0;

  for (const c of courses) {
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

  const gpa = totalEcts > 0 ? Math.round((totalQualityPoints / totalEcts) * 100) / 100 : 0.00;

  return {
    totalEcts,
    totalQualityPoints: Math.round(totalQualityPoints * 100) / 100,
    gpa,
  };
}

export function calculateCGPA(
  allCourses: { qualityPoints?: number | null; gradePoints?: number | null; ects: number; letterGrade?: string | null }[],
): { totalEcts: number; totalQualityPoints: number; cgpa: number } {
  let totalQualityPoints = 0;
  let totalEcts = 0;

  for (const c of allCourses) {
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

export function formatGradePoint(gp: number | null | undefined): string {
  if (gp == null || isNaN(Number(gp))) return '0.00';
  return Number(gp).toFixed(2);
}

export function formatQualityPoints(qp: number | null | undefined): string {
  if (qp == null || isNaN(Number(qp))) return '0.00';
  return Number(qp).toFixed(2);
}

export function formatGPA(gpa: number | null | undefined): string {
  if (gpa == null || isNaN(Number(gpa))) return '0.00';
  return Number(gpa).toFixed(2);
}

