/**
 * Grade Synchronization Service
 *
 * Automatically propagates student assignment and quiz results into the official CourseGrade records:
 * - Assign (15%): aggregated from student's graded assignments in the course offering.
 *   Example: 13 / 15 -> 13.00
 * - Quiz (5%): aggregated from student's completed/graded quizzes in the course offering.
 *   Example: 8 / 10 -> (8 / 10) * 5 = 4.00
 * - Automatically recalculates Final Mark, Grade, Grade Point, and Quality Point using Harmony College's ECTS weighting.
 */

import { prisma } from '../../lib/prisma';
import { calculateCourseResult } from '../../lib/grading';
import { EnrollmentStatus } from '@prisma/client';

const ACTIVE_STATUSES: EnrollmentStatus[] = [
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.FORCE_ADDED,
];

/**
 * Synchronize a single student's assignment and quiz scores into their CourseGrade.
 */
export async function syncStudentAssessmentGrades(
  studentRecordId: string,
  courseOfferingId: string,
) {
  // 1. Find active enrollment for this student in this course offering
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentRecordId,
      courseOfferingId,
      status: { in: ACTIVE_STATUSES },
    },
    include: {
      courseOffering: {
        include: {
          course: { select: { creditHours: true, ects: true } },
        },
      },
      grade: true,
    },
  });

  if (!enrollment) {
    return null;
  }

  // 2. Aggregate Assignment results
  // Retrieve all assignments for this offering where the student has a GRADED submission with a score
  const assignments = await prisma.assignment.findMany({
    where: { courseOfferingId },
    include: {
      submissions: {
        where: {
          studentRecordId,
          status: 'GRADED',
          score: { not: null },
        },
      },
    },
  });

  let totalAssignmentEarned = 0;
  let totalAssignmentMax = 0;
  let gradedAssignmentCount = 0;

  for (const a of assignments) {
    if (a.submissions && a.submissions.length > 0) {
      const sub = a.submissions[0];
      if (typeof sub.score === 'number' && !isNaN(sub.score) && a.totalPoints > 0) {
        totalAssignmentEarned += sub.score;
        totalAssignmentMax += a.totalPoints;
        gradedAssignmentCount++;
      }
    }
  }

  let calculatedAssignmentMarks: number | null = null;
  if (gradedAssignmentCount > 0 && totalAssignmentMax > 0) {
    // Proportional 15% calculation: (earned / max) * 15
    const mark = (totalAssignmentEarned / totalAssignmentMax) * 15;
    calculatedAssignmentMarks = Math.round(mark * 100) / 100;
  }

  // 3. Aggregate Quiz results
  // Retrieve all quizzes for this offering where the student has a SUBMITTED or GRADED attempt
  const quizzes = await prisma.quiz.findMany({
    where: { courseOfferingId },
    include: {
      attempts: {
        where: {
          studentRecordId,
          status: { in: ['SUBMITTED', 'GRADED'] },
          score: { not: null },
        },
        orderBy: { score: 'desc' },
      },
    },
  });

  let totalQuizEarned = 0;
  let totalQuizMax = 0;
  let completedQuizCount = 0;

  for (const q of quizzes) {
    if (q.attempts && q.attempts.length > 0) {
      const bestAttempt = q.attempts[0];
      if (typeof bestAttempt.score === 'number' && !isNaN(bestAttempt.score) && q.totalPoints > 0) {
        totalQuizEarned += bestAttempt.score;
        totalQuizMax += q.totalPoints;
        completedQuizCount++;
      }
    }
  }

  let calculatedQuizMarks: number | null = null;
  if (completedQuizCount > 0 && totalQuizMax > 0) {
    // Proportional 5% calculation: (earned / max) * 5
    const mark = (totalQuizEarned / totalQuizMax) * 5;
    calculatedQuizMarks = Math.round(mark * 100) / 100;
  }

  // 4. Determine breakdown values to update
  const currentGrade = enrollment.grade;
  const assignmentMarks =
    calculatedAssignmentMarks !== null
      ? calculatedAssignmentMarks
      : currentGrade?.assignmentMarks ?? null;

  const quizMarks =
    calculatedQuizMarks !== null
      ? calculatedQuizMarks
      : currentGrade?.quizMarks ?? null;

  const midExamMarks = currentGrade?.midExamMarks ?? null;
  const finalExamMarks = currentGrade?.finalExamMarks ?? null;
  const attendanceMarks = currentGrade?.attendanceMarks ?? null;
  const otherMarks = currentGrade?.otherMarks ?? null;

  const ects = enrollment.courseOffering.course.ects ?? 4;
  const creditHours = enrollment.courseOffering.course.creditHours ?? 3;

  // 5. Automatically recalculate course outcome: Final Mark -> Grade -> Grade Pt -> QP
  const computed = calculateCourseResult(
    {
      assignment: assignmentMarks,
      quiz: quizMarks,
      midExam: midExamMarks,
      finalExam: finalExamMarks,
      attendance: attendanceMarks,
      other: otherMarks,
    },
    ects,
  );

  // 6. Upsert CourseGrade record in database
  const courseGrade = await prisma.courseGrade.upsert({
    where: { enrollmentId: enrollment.id },
    create: {
      enrollmentId: enrollment.id,
      studentRecordId,
      assignmentMarks,
      quizMarks,
      midExamMarks,
      finalExamMarks,
      attendanceMarks,
      otherMarks,
      finalMark: computed.finalMark,
      letterGrade: computed.letterGrade,
      gradePoints: computed.gradePoints,
      qualityPoints: computed.qualityPoints,
      creditHours,
      ects,
      status: 'DRAFT',
      gradedAt: new Date(),
    },
    update: {
      assignmentMarks,
      quizMarks,
      finalMark: computed.finalMark,
      letterGrade: computed.letterGrade,
      gradePoints: computed.gradePoints,
      qualityPoints: computed.qualityPoints,
      creditHours,
      ects,
      gradedAt: new Date(),
    },
  });

  return courseGrade;
}

/**
 * Synchronize all enrolled students in a course offering with their latest assignment/quiz grades.
 */
export async function syncOfferingAssessmentGrades(courseOfferingId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseOfferingId,
      status: { in: ACTIVE_STATUSES },
    },
    select: { studentRecordId: true },
  });

  const results = [];
  for (const e of enrollments) {
    try {
      const res = await syncStudentAssessmentGrades(e.studentRecordId, courseOfferingId);
      if (res) results.push(res);
    } catch (err) {
      console.error(`Error syncing assessment grade for student ${e.studentRecordId}:`, err);
    }
  }

  return results;
}
