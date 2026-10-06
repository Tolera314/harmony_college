import { prisma } from '../../lib/prisma';
import { EnrollmentStatus, StudentStatus, ProgramType } from '@prisma/client';
import { resolveDepartmentFamilyIds } from '../../lib/departmentHierarchy';

/**
 * Synchronize enrollments for a specific CourseOffering.
 *
 * Finds all active, finance- and registrar-approved students registered under
 * the offering's course department family that match the offering's programType.
 * Enrolls each eligible student into this course offering.
 */
export async function syncCourseOfferingEnrollments(courseOfferingId: string): Promise<number> {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      course: { select: { id: true, departmentId: true, programType: true, status: true } },
    },
  });

  if (!offering || !offering.course || offering.course.status !== 'ACTIVE' || offering.status !== 'ACTIVE') {
    return 0;
  }

  const deptIds = await resolveDepartmentFamilyIds(offering.course.departmentId);
  const targetProgramType = offering.programType;

  // Find all active, dual-approved students in this department family matching programType
  const matchingStudents = await prisma.studentRecord.findMany({
    where: {
      departmentId: { in: deptIds },
      status: StudentStatus.ACTIVE,
      programType: targetProgramType,
      user: {
        studentProfile: {
          paymentVerifiedByFinance: true,
        },
        application: {
          status: 'ACCEPTED',
        },
      },
    },
    select: { id: true },
  });

  let syncedCount = 0;
  for (const student of matchingStudents) {
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
        droppedAt: null,
        dropReason: null,
      },
    });
    syncedCount++;
  }

  return syncedCount;
}

/**
 * Synchronize enrollments for a specific StudentRecord.
 *
 * Finds all active, published course offerings in the student's department family
 * that match the student's programType, and enrolls the student into those offerings
 * only if the student has completed Finance Officer and Registrar approval.
 */
export async function syncStudentEnrollments(studentRecordId: string): Promise<number> {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: {
        include: {
          studentProfile: { select: { paymentVerifiedByFinance: true } },
          application: { select: { status: true } },
        },
      },
    },
  });

  if (!student || student.status !== StudentStatus.ACTIVE || !student.departmentId) {
    return 0;
  }

  // Gate: Finance Officer and Registrar approval required
  const isFinanceApproved = student.user?.studentProfile?.paymentVerifiedByFinance === true;
  const isRegistrarApproved = student.user?.application?.status === 'ACCEPTED';
  if (!isFinanceApproved || !isRegistrarApproved) {
    return 0;
  }

  const deptIds = await resolveDepartmentFamilyIds(student.departmentId);

  const offerings = await prisma.courseOffering.findMany({
    where: {
      status: 'ACTIVE',
      course: {
        departmentId: { in: deptIds },
        status: 'ACTIVE',
      },
      programType: student.programType,
    },
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
        droppedAt: null,
        dropReason: null,
      },
    });
    syncedCount++;
  }

  return syncedCount;
}
