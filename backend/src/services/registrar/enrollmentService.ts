import { prisma } from '../../lib/prisma';
import { EnrollmentStatus } from '@prisma/client';
import { broadcastTimetableUpdated } from '../../lib/socket';

// ── Time-overlap helper ────────────────────────────────────────────────────────
function toMinutes(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function timesOverlap(aS: string, aE: string, bS: string, bE: string) {
  return toMinutes(aS) < toMinutes(bE) && toMinutes(aE) > toMinutes(bS);
}

/**
 * Check whether a student already has a timetable clash with the given offering.
 * Returns an array of conflict description strings (empty = no conflicts).
 */
export async function checkStudentTimetableConflict(
  studentRecordId: string,
  newOfferingId: string,
): Promise<string[]> {
  // Fetch the proposed offering's timetable slots
  const newSlots = await prisma.timetableSlot.findMany({
    where: { courseOfferingId: newOfferingId, status: { in: ['PUBLISHED', 'DRAFT'] } },
    select: { dayOfWeek: true, startTime: true, endTime: true,
              courseOffering: { select: { course: { select: { code: true } } } } },
  });
  if (!newSlots.length) return [];

  // Fetch all slots for courses the student is currently enrolled in
  const activeEnrollments = await prisma.enrollment.findMany({
    where: {
      studentRecordId,
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.FORCE_ADDED] },
      courseOfferingId: { not: newOfferingId },
    },
    select: { courseOfferingId: true },
  });
  if (!activeEnrollments.length) return [];

  const enrolledSlots = await prisma.timetableSlot.findMany({
    where: {
      courseOfferingId: { in: activeEnrollments.map(e => e.courseOfferingId) },
      status: { in: ['PUBLISHED', 'DRAFT'] },
    },
    select: { dayOfWeek: true, startTime: true, endTime: true,
              courseOffering: { select: { course: { select: { code: true } } } } },
  });

  const DAY = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const conflicts: string[] = [];

  for (const ns of newSlots) {
    for (const es of enrolledSlots) {
      if (ns.dayOfWeek === es.dayOfWeek && timesOverlap(ns.startTime, ns.endTime, es.startTime, es.endTime)) {
        conflicts.push(
          `Schedule conflict: ${ns.courseOffering.course.code} (${DAY[ns.dayOfWeek]} ${ns.startTime}–${ns.endTime}) ` +
          `overlaps with ${es.courseOffering.course.code} (${DAY[es.dayOfWeek]} ${es.startTime}–${es.endTime})`,
        );
      }
    }
  }
  return conflicts;
}

export interface EnrollmentListQuery {
  page: number; limit: number;
  search?: string; offeringId?: string;
  studentId?: string; status?: EnrollmentStatus;
}

export async function listEnrollments(q: EnrollmentListQuery) {
  const { page, limit, search, offeringId, studentId, status } = q;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status) where.status = status;
  if (offeringId) where.courseOfferingId = offeringId;
  if (studentId) where.studentRecordId = studentId;
  if (search) {
    where.OR = [
      { studentRecord: { studentId: { contains: search, mode: 'insensitive' } } },
      { studentRecord: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
      { courseOffering: { course: { code: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where, skip, take: limit,
      orderBy: { enrolledAt: 'desc' },
      include: {
        studentRecord: {
          include: {
            user: { select: { fullName: true, email: true } },
            program: { select: { name: true, code: true } },
          },
        },
        courseOffering: {
          include: {
            course: { select: { code: true, name: true, creditHours: true } },
            semester: { include: { academicYear: { select: { name: true } } } },
          },
        },
        grade: { select: { letterGrade: true, gradePoints: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), enrollments };
}

export async function getStudentEnrollments(studentRecordId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: { select: { fullName: true, email: true } },
      program: { select: { name: true, code: true } },
      department: { select: { name: true } },
      enrollments: {
        include: {
          courseOffering: {
            include: {
              course: { select: { code: true, name: true, creditHours: true } },
              semester: { include: { academicYear: { select: { name: true } } } },
              instructor: { include: { user: { select: { fullName: true } } } },
              timetables: { select: { dayOfWeek: true, startTime: true, endTime: true } },
            },
          },
          grade: { select: { letterGrade: true, gradePoints: true } },
        },
        orderBy: { enrolledAt: 'desc' },
      },
    },
  });

  if (!student) return null;
  return student;
}

export async function forceAddEnrollment(data: {
  studentRecordId: string;
  courseOfferingId: string;
  reason: string;
  registrarUserId: string;
}) {
  const { studentRecordId, courseOfferingId, reason, registrarUserId } = data;

  if (!reason?.trim()) throw new Error('Override reason is required for force-add');

  const [student, offering] = await Promise.all([
    prisma.studentRecord.findUnique({ where: { id: studentRecordId }, include: { user: { select: { fullName: true } } } }),
    prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: { select: { code: true, name: true } },
        _count: { select: { enrollments: { where: { status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.FORCE_ADDED] } } } } },
      },
    }),
  ]);

  if (!student) throw new Error('Student record not found');
  if (!offering) throw new Error('Course offering not found');

  const existing = await prisma.enrollment.findUnique({
    where: { studentRecordId_courseOfferingId: { studentRecordId, courseOfferingId } },
  });
  if (existing && (existing.status === EnrollmentStatus.ACTIVE || existing.status === EnrollmentStatus.FORCE_ADDED)) {
    throw new Error(`Student is already enrolled in ${offering.course.code}`);
  }

  return prisma.$transaction(async (tx) => {
    let enrollment;
    if (existing) {
      enrollment = await tx.enrollment.update({
        where: { id: existing.id },
        data: { status: EnrollmentStatus.FORCE_ADDED, isOverride: true, overrideReason: reason.trim(), overrideBy: registrarUserId, overrideAt: new Date(), droppedAt: null, dropReason: null },
      });
    } else {
      enrollment = await tx.enrollment.create({
        data: {
          studentRecordId, courseOfferingId,
          status: EnrollmentStatus.FORCE_ADDED,
          isOverride: true, overrideReason: reason.trim(),
          overrideBy: registrarUserId, overrideAt: new Date(),
        },
      });
    }

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'ENROLLMENT_FORCE_ADDED',
        entityType: 'Enrollment', entityId: enrollment.id,
        description: `Force-added ${student.user.fullName} to ${offering.course.code} — ${reason}`,
        metadata: { studentRecordId, courseOfferingId, reason },
      },
    });

    return enrollment;
  });
}

export async function forceDropEnrollment(data: {
  enrollmentId: string;
  reason: string;
  registrarUserId: string;
}) {
  const { enrollmentId, reason, registrarUserId } = data;

  if (!reason?.trim()) throw new Error('Override reason is required for force-drop');

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      studentRecord: { include: { user: { select: { fullName: true } } } },
      courseOffering: { include: { course: { select: { code: true } } } },
    },
  });

  if (!enrollment) throw new Error('Enrollment not found');
  if (enrollment.status === EnrollmentStatus.FORCE_DROPPED || enrollment.status === EnrollmentStatus.DROPPED) {
    throw new Error('Enrollment is already dropped');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.FORCE_DROPPED,
        droppedAt: new Date(), dropReason: reason.trim(),
        isOverride: true, overrideReason: reason.trim(),
        overrideBy: registrarUserId, overrideAt: new Date(),
      },
    });

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'ENROLLMENT_FORCE_DROPPED',
        entityType: 'Enrollment', entityId: enrollmentId,
        description: `Force-dropped ${enrollment.studentRecord.user.fullName} from ${enrollment.courseOffering.course.code} — ${reason}`,
        metadata: { enrollmentId, reason },
      },
    });

    return updated;
  });
}

export async function addEnrollment(data: {
  studentRecordId: string;
  courseOfferingId: string;
  registrarUserId: string;
}) {
  const { studentRecordId, courseOfferingId, registrarUserId } = data;

  const [student, offering] = await Promise.all([
    prisma.studentRecord.findUnique({ where: { id: studentRecordId } }),
    prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: { select: { code: true } },
        _count: { select: { enrollments: { where: { status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.FORCE_ADDED] } } } } },
      },
    }),
  ]);

  if (!student) throw new Error('Student not found');
  if (!offering) throw new Error('Course offering not found');
  if (offering._count.enrollments >= offering.capacity) throw new Error('Course offering is at full capacity');

  const existing = await prisma.enrollment.findUnique({
    where: { studentRecordId_courseOfferingId: { studentRecordId, courseOfferingId } },
  });
  if (existing && (existing.status === EnrollmentStatus.ACTIVE || existing.status === EnrollmentStatus.FORCE_ADDED)) {
    throw new Error(`Student is already enrolled in ${offering.course.code}`);
  }

  // Student schedule conflict check (spec §21)
  const conflicts = await checkStudentTimetableConflict(studentRecordId, courseOfferingId);
  if (conflicts.length) {
    throw new Error(`Cannot enroll: ${conflicts.join('; ')}`);
  }

  return prisma.$transaction(async (tx) => {
    let enrollment;
    if (existing) {
      enrollment = await tx.enrollment.update({ where: { id: existing.id }, data: { status: EnrollmentStatus.ACTIVE, droppedAt: null, dropReason: null } });
    } else {
      enrollment = await tx.enrollment.create({ data: { studentRecordId, courseOfferingId, status: EnrollmentStatus.ACTIVE } });
    }

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'ENROLLMENT_ADDED',
        entityType: 'Enrollment', entityId: enrollment.id,
        description: `Enrolled student ${studentRecordId} in ${offering.course.code}`,
      },
    });

    return enrollment;
  });
}

export async function dropEnrollment(enrollmentId: string, reason: string, registrarUserId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { courseOffering: { include: { course: { select: { code: true } } } } },
  });
  if (!enrollment) throw new Error('Enrollment not found');
  if ((enrollment.status === EnrollmentStatus.DROPPED || enrollment.status === EnrollmentStatus.FORCE_DROPPED)) {
    throw new Error('Already dropped');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.DROPPED, droppedAt: new Date(), dropReason: reason ?? null },
    });

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'ENROLLMENT_DROPPED',
        entityType: 'Enrollment', entityId: enrollmentId,
        description: `Dropped enrollment from ${enrollment.courseOffering.course.code}${reason ? ` — ${reason}` : ''}`,
      },
    });

    return updated;
  });
}

