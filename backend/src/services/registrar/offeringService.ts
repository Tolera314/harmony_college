import { prisma } from '../../lib/prisma';
import { OfferingStatus, EnrollmentStatus } from '@prisma/client';
import {
  broadcastTimetableCreated,
  broadcastTimetableUpdated,
  broadcastTimetableDeleted,
  broadcastTimetableConflict,
  notifyTimetableChanged,
} from '../../lib/socket';

export interface OfferingListQuery {
  page: number; limit: number;
  search?: string; semesterId?: string;
  status?: OfferingStatus; courseId?: string;
}

export async function listOfferings(q: OfferingListQuery) {
  const { page, limit, search, semesterId, status, courseId } = q;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status) where.status = status;
  if (semesterId) where.semesterId = semesterId;
  if (courseId) where.courseId = courseId;
  if (search) {
    where.OR = [
      { course: { code: { contains: search, mode: 'insensitive' } } },
      { course: { name: { contains: search, mode: 'insensitive' } } },
      { instructor: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const [total, offerings] = await Promise.all([
    prisma.courseOffering.count({ where }),
    prisma.courseOffering.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, code: true, name: true, creditHours: true, department: { select: { name: true } } } },
        semester: { include: { academicYear: { select: { name: true } } } },
        instructor: { include: { user: { select: { fullName: true } } } },
        room: { select: { id: true, name: true, building: true, capacity: true, roomType: true } },
        timetables: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true, status: true } },
        _count: { select: { enrollments: { where: { status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.FORCE_ADDED] } } } } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), offerings };
}

export async function getOfferingById(id: string) {
  return prisma.courseOffering.findUnique({
    where: { id },
    include: {
      course: { include: { department: true, prerequisites: { include: { prerequisite: { select: { code: true, name: true } } } } } },
      semester: { include: { academicYear: true } },
      instructor: { include: { user: { select: { id: true, fullName: true, email: true } } } },
      room: { select: { id: true, name: true, building: true, capacity: true, roomType: true } },
      timetables: true,
      enrollments: {
        where: { status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.FORCE_ADDED] } },
        include: {
          studentRecord: {
            select: { studentId: true, yearLevel: true, user: { select: { fullName: true } } },
          },
        },
        orderBy: { enrolledAt: 'asc' },
      },
    },
  });
}

// ── Time helpers ──────────────────────────────────────────────────────────────

/** Convert "HH:MM" to total minutes since midnight. */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Returns true when [startA, endA) overlaps [startB, endB) */
function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB);
}

// ── Conflict Detection ────────────────────────────────────────────────────────

/**
 * Checks room conflicts, instructor conflicts, and student schedule conflicts
 * using real time-overlap logic (not just exact startTime equality).
 */
async function detectConflicts(data: {
  semesterId: string;
  roomId?: string | null;
  instructorId?: string | null;
  timetables?: { dayOfWeek: number; startTime: string; endTime: string }[];
  excludeOfferingId?: string;
  newOfferingId?: string;  // for student conflict check — the offering being scheduled
}) {
  if (!data.timetables?.length) return [];
  const conflicts: string[] = [];

  // Fetch all published slots in the same semester (excluding our own offering)
  const existingSlots = await prisma.timetableSlot.findMany({
    where: {
      status: { in: ['PUBLISHED', 'DRAFT'] },
      courseOffering: {
        semesterId: data.semesterId,
        status: { in: [OfferingStatus.SCHEDULED, OfferingStatus.ACTIVE] },
        ...(data.excludeOfferingId ? { id: { not: data.excludeOfferingId } } : {}),
      },
    },
    select: {
      id: true, dayOfWeek: true, startTime: true, endTime: true,
      roomId: true, instructorId: true,
      courseOfferingId: true,
      room: { select: { building: true, name: true } },
      courseOffering: {
        select: {
          id: true,
          course: { select: { code: true } },
          enrollments: {
            where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] } },
            select: { studentRecordId: true },
          },
        },
      },
    },
  });

  for (const proposed of data.timetables) {
    const overlapping = existingSlots.filter(
      s =>
        s.dayOfWeek === proposed.dayOfWeek &&
        timesOverlap(proposed.startTime, proposed.endTime, s.startTime, s.endTime),
    );

    for (const conflict of overlapping) {
      // Room conflict
      if (data.roomId && conflict.roomId === data.roomId) {
        const r = conflict.room;
        conflicts.push(
          `Room conflict: ${r?.building} ${r?.name} is occupied by ${conflict.courseOffering.course.code} on day ${proposed.dayOfWeek} at ${proposed.startTime}–${proposed.endTime}`,
        );
      }

      // Instructor conflict
      if (data.instructorId && conflict.instructorId === data.instructorId) {
        conflicts.push(
          `Instructor conflict: instructor already teaching ${conflict.courseOffering.course.code} on day ${proposed.dayOfWeek} at ${proposed.startTime}–${proposed.endTime}`,
        );
      }
    }
  }

  // Student schedule conflict — only when attaching slots to an existing offering
  if (data.newOfferingId) {
    const enrolledStudents = await prisma.enrollment.findMany({
      where: {
        courseOfferingId: data.newOfferingId,
        status: { in: ['ACTIVE', 'FORCE_ADDED'] },
      },
      select: { studentRecordId: true },
    });

    if (enrolledStudents.length > 0) {
      const studentIds = new Set(enrolledStudents.map(e => e.studentRecordId));

      for (const proposed of data.timetables) {
        const overlapping = existingSlots.filter(
          s =>
            s.dayOfWeek === proposed.dayOfWeek &&
            timesOverlap(proposed.startTime, proposed.endTime, s.startTime, s.endTime),
        );

        for (const conflict of overlapping) {
          const conflictingStudents = conflict.courseOffering.enrollments
            .filter(e => studentIds.has(e.studentRecordId));

          if (conflictingStudents.length > 0) {
            conflicts.push(
              `Student conflict: ${conflictingStudents.length} enrolled student(s) already have ${conflict.courseOffering.course.code} on day ${proposed.dayOfWeek} at ${proposed.startTime}–${proposed.endTime}`,
            );
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Public: check conflicts for a proposed slot without saving.
 * Used by the registrar frontend for immediate conflict feedback.
 */
export async function checkConflicts(data: {
  semesterId: string;
  roomId?: string | null;
  instructorId?: string | null;
  timetables: { dayOfWeek: number; startTime: string; endTime: string }[];
  excludeOfferingId?: string;
}) {
  return detectConflicts(data);
}

// ── Offerings CRUD ────────────────────────────────────────────────────────────

export async function createOffering(data: {
  courseId: string; semesterId: string; instructorId?: string;
  roomId?: string; capacity: number; section?: string;
  timetables?: { dayOfWeek: number; startTime: string; endTime: string }[];
}, registrarUserId: string) {
  const section = (data.section ?? 'A').toUpperCase();

  const duplicate = await prisma.courseOffering.findFirst({
    where: { courseId: data.courseId, semesterId: data.semesterId, section },
  });
  if (duplicate) throw new Error(`Section ${section} for this course already exists in this semester`);

  // Conflict check (student conflicts excluded at create time — no enrollees yet)
  const conflicts = await detectConflicts({
    semesterId: data.semesterId, roomId: data.roomId,
    instructorId: data.instructorId, timetables: data.timetables,
  });
  if (conflicts.length) throw new Error(`Conflicts detected: ${conflicts.join('; ')}`);

  // Determine status
  let status: OfferingStatus = OfferingStatus.DRAFT;
  if (data.instructorId && !data.roomId) status = OfferingStatus.INSTRUCTOR_ASSIGNED;
  if (data.instructorId && data.roomId && data.timetables?.length) status = OfferingStatus.SCHEDULED;

  const offering = await prisma.$transaction(async (tx) => {
    const off = await tx.courseOffering.create({
      data: {
        courseId: data.courseId, semesterId: data.semesterId,
        instructorId: data.instructorId ?? null,
        roomId: data.roomId ?? null,
        capacity: data.capacity, section, status,
      },
    });

    const createdSlots: any[] = [];
    if (data.timetables?.length) {
      for (const t of data.timetables) {
        const slot = await tx.timetableSlot.create({
          data: {
            courseOfferingId: off.id, dayOfWeek: t.dayOfWeek,
            startTime: t.startTime, endTime: t.endTime,
            roomId: data.roomId ?? null, instructorId: data.instructorId ?? null,
            status: 'PUBLISHED',
          },
        });
        createdSlots.push(slot);
      }
    }

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'OFFERING_CREATED',
        entityType: 'CourseOffering', entityId: off.id,
        description: `Course offering created for course ${data.courseId} section ${section}`,
      },
    });

    return { off, createdSlots };
  });

  // Broadcast Socket.IO events for each new slot (after successful DB commit)
  for (const slot of offering.createdSlots) {
    broadcastTimetableCreated({
      semesterId: data.semesterId,
      slot: {
        id: slot.id, courseOfferingId: offering.off.id,
        dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime,
        roomId: slot.roomId, instructorId: slot.instructorId,
        status: slot.status,
      },
    });
  }

  return offering.off;
}

export async function updateOffering(id: string, data: {
  instructorId?: string | null; roomId?: string | null;
  capacity?: number; status?: OfferingStatus;
  timetables?: { dayOfWeek: number; startTime: string; endTime: string }[];
}, registrarUserId: string) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id },
    include: { timetables: true, semester: { select: { id: true } } },
  });
  if (!offering) throw new Error('Offering not found');

  // Conflict check for new timetables — includes student conflict
  if (data.timetables?.length) {
    const conflicts = await detectConflicts({
      semesterId: offering.semesterId,
      roomId: data.roomId ?? offering.roomId,
      instructorId: data.instructorId ?? offering.instructorId,
      timetables: data.timetables,
      excludeOfferingId: id,
      newOfferingId: id,   // check student conflicts against enrollees
    });
    if (conflicts.length) throw new Error(`Conflicts: ${conflicts.join('; ')}`);
  }

  // Determine new status
  let newStatus = data.status ?? offering.status;
  if (!data.status) {
    const instr = data.instructorId !== undefined ? data.instructorId : offering.instructorId;
    const room = data.roomId !== undefined ? data.roomId : offering.roomId;
    const hasTimetables = data.timetables?.length || offering.timetables.length > 0;
    if (instr && room && hasTimetables) newStatus = OfferingStatus.SCHEDULED;
    else if (instr && !room) newStatus = OfferingStatus.INSTRUCTOR_ASSIGNED;
    else if (!instr) newStatus = OfferingStatus.DRAFT;
  }

  const { updated, deletedSlotIds, newSlots } = await prisma.$transaction(async (tx) => {
    const upd = await tx.courseOffering.update({
      where: { id },
      data: {
        ...(data.instructorId !== undefined && { instructorId: data.instructorId }),
        ...(data.roomId !== undefined && { roomId: data.roomId }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        status: newStatus,
      },
    });

    const oldSlotIds = offering.timetables.map(t => t.id);
    const createdSlots: any[] = [];

    if (data.timetables !== undefined) {
      // Soft-cancel old slots rather than hard-deleting (preserve history)
      if (oldSlotIds.length) {
        await tx.timetableSlot.updateMany({
          where: { courseOfferingId: id },
          data: { status: 'CANCELLED' },
        });
      }
      if (data.timetables.length) {
        for (const t of data.timetables) {
          const slot = await tx.timetableSlot.create({
            data: {
              courseOfferingId: id, dayOfWeek: t.dayOfWeek,
              startTime: t.startTime, endTime: t.endTime,
              roomId: data.roomId ?? offering.roomId,
              instructorId: data.instructorId ?? offering.instructorId,
              status: 'PUBLISHED',
            },
          });
          createdSlots.push(slot);
        }
      }
    }

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'OFFERING_UPDATED',
        entityType: 'CourseOffering', entityId: id,
        description: `Course offering ${id} updated`,
      },
    });

    return { updated: upd, deletedSlotIds: oldSlotIds, newSlots: createdSlots };
  });

  // Broadcast Socket.IO events (after successful DB commit)
  for (const slotId of deletedSlotIds) {
    broadcastTimetableDeleted({
      semesterId: offering.semesterId,
      slotId,
      courseOfferingId: id,
    });
  }
  for (const slot of newSlots) {
    broadcastTimetableCreated({
      semesterId: offering.semesterId,
      slot: {
        id: slot.id, courseOfferingId: id,
        dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime,
        roomId: slot.roomId, instructorId: slot.instructorId,
        status: slot.status,
      },
    });
  }

  // Notify every affected student and the instructor personally (spec §23–24)
  if (data.timetables !== undefined && (deletedSlotIds.length || newSlots.length)) {
    const affectedEnrollments = await prisma.enrollment.findMany({
      where: { courseOfferingId: id, status: { in: ['ACTIVE', 'FORCE_ADDED'] } },
      select: { studentRecord: { select: { userId: true } } },
    });
    const offeringFull = await prisma.courseOffering.findUnique({
      where: { id },
      include: {
        course: { select: { code: true } },
        instructor: { select: { userId: true } },
      },
    });
    const courseCode = offeringFull?.course?.code ?? 'UNKNOWN';
    const summary = newSlots.length
      ? `${courseCode} schedule updated: ${newSlots.map(s => `Day${s.dayOfWeek} ${s.startTime}–${s.endTime}`).join(', ')}`
      : `${courseCode} timetable slot(s) cancelled`;

    for (const enroll of affectedEnrollments) {
      notifyTimetableChanged({
        userId: enroll.studentRecord.userId,
        offeringId: id,
        courseCode,
        changeType: 'UPDATED',
        summary,
      });
    }
    if (offeringFull?.instructor?.userId) {
      notifyTimetableChanged({
        userId: offeringFull.instructor.userId,
        offeringId: id,
        courseCode,
        changeType: 'UPDATED',
        summary,
      });
    }
  }

  return updated;
}

export async function listSemesters() {
  return prisma.semester.findMany({
    orderBy: [{ academicYear: { startDate: 'desc' } }, { startDate: 'asc' }],
    include: { academicYear: { select: { name: true } } },
  });
}

export async function listRooms() {
  return prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ building: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, building: true, capacity: true, roomType: true, isActive: true },
  });
}

export async function listInstructors() {
  return prisma.instructorRecord.findMany({
    where: { isActive: true },
    include: { user: { select: { fullName: true, email: true } }, department: { select: { name: true } } },
    orderBy: { user: { fullName: 'asc' } },
  });
}
