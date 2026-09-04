import { prisma } from '../../lib/prisma';
import { EnrollmentStatus, StudentStatus, ProgramType } from '@prisma/client';

/**
 * Synchronize enrollments for a specific CourseOffering.
 *
 * Finds all active students registered under the offering's course department
 * that match the offering's programType (and duration for Short Programs),
 * as well as any students who were enrolled in other offerings of this course
 * in the same semester. Enrolls each student into this course offering.
 *
 * Guarantees:
 * - Matches strictly on database IDs.
 * - Respects TVET vs Short Program separation.
 * - For Short Programs, respects the duration ('2 Months' vs '4 Months').
 * - Idempotent upsert prevents duplicate enrollments.
 */
export async function syncCourseOfferingEnrollments(courseOfferingId: string): Promise<number> {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      course: { select: { id: true, departmentId: true, programType: true } },
    },
  });

  if (!offering || !offering.course) return 0;

  const targetDepartmentId = offering.course.departmentId;
  const targetProgramType = offering.programType;
  const targetDuration = offering.shortProgramDuration;

  // 1. Find all active students in this department matching programType and duration
  const studentWhere: any = {
    departmentId: targetDepartmentId,
    status: StudentStatus.ACTIVE,
    programType: targetProgramType,
  };

  if (targetProgramType === ProgramType.SHORT_PROGRAM && targetDuration) {
    studentWhere.shortProgramDuration = targetDuration;
  }

  const matchingStudents = await prisma.studentRecord.findMany({
    where: studentWhere,
    select: { id: true },
  });

  // 2. Find any active students previously enrolled in this course in the same semester
  const existingEnrollments = await prisma.enrollment.findMany({
    where: {
      courseOffering: {
        courseId: offering.courseId,
        semesterId: offering.semesterId,
        id: { not: offering.id },
      },
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.FORCE_ADDED] },
    },
    select: { studentRecordId: true },
  });

  // Combine and deduplicate student IDs
  const allStudentIds = new Set<string>();
  matchingStudents.forEach(s => allStudentIds.add(s.id));
  existingEnrollments.forEach(e => allStudentIds.add(e.studentRecordId));

  let syncedCount = 0;
  for (const studentRecordId of allStudentIds) {
    await prisma.enrollment.upsert({
      where: {
        studentRecordId_courseOfferingId: {
          studentRecordId,
          courseOfferingId: offering.id,
        },
      },
      create: {
        studentRecordId,
        courseOfferingId: offering.id,
        status: EnrollmentStatus.ACTIVE,
      },
      update: {
        status: EnrollmentStatus.ACTIVE,
      },
    });
    syncedCount++;
  }

  return syncedCount;
}

/**
 * Synchronize enrollments for a specific StudentRecord.
 *
 * Finds all active course offerings in the student's department that match
 * the student's programType (and duration for Short Programs) and enrolls
 * the student into those offerings.
 *
 * Guarantees:
 * - Matches strictly on database IDs.
 * - Respects TVET vs Short Program separation.
 * - For Short Programs, matches '2 Months' vs '4 Months'.
 * - Deduplicates via upsert.
 */
export async function syncStudentEnrollments(studentRecordId: string): Promise<number> {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    select: {
      id: true,
      departmentId: true,
      programType: true,
      shortProgramDuration: true,
      status: true,
    },
  });

  if (!student || student.status !== StudentStatus.ACTIVE || !student.departmentId) {
    return 0;
  }

  const offeringWhere: any = {
    course: {
      departmentId: student.departmentId,
      status: 'ACTIVE',
    },
    programType: student.programType,
  };

  if (student.programType === ProgramType.SHORT_PROGRAM && student.shortProgramDuration) {
    offeringWhere.shortProgramDuration = student.shortProgramDuration;
  }

  const offerings = await prisma.courseOffering.findMany({
    where: offeringWhere,
    select: { id: true },
  });

  let syncedCount = 0;
  for (const offering of offerings) {
    await prisma.enrollment.upsert({
      where: {
        studentRecordId_courseOfferingId: {
          studentRecordId: student.id,
          courseOfferingId: offering.id,
        },
      },
      create: {
        studentRecordId: student.id,
        courseOfferingId: offering.id,
        status: EnrollmentStatus.ACTIVE,
      },
      update: {
        status: EnrollmentStatus.ACTIVE,
      },
    });
    syncedCount++;
  }

  return syncedCount;
}
