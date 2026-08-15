import { prisma } from '../../lib/prisma';
import { OfferingStatus, EnrollmentStatus } from '@prisma/client';

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
        room: { select: { id: true, name: true, building: true, capacity: true } },
        timetables: { select: { dayOfWeek: true, startTime: true, endTime: true } },
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
      room: true,
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

async function detectConflicts(data: {
  semesterId: string; roomId?: string | null; instructorId?: string | null;
  timetables?: { dayOfWeek: number; startTime: string; endTime: string }[];
  excludeOfferingId?: string;
}) {
  if (!data.timetables?.length) return [];
  const conflicts: string[] = [];

  for (const slot of data.timetables) {
    // Room conflict
    if (data.roomId) {
      const roomConflict = await prisma.timetableSlot.findFirst({
        where: {
          roomId: data.roomId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          courseOfferingId: { not: data.excludeOfferingId },
          courseOffering: { semesterId: data.semesterId, status: { in: [OfferingStatus.SCHEDULED, OfferingStatus.ACTIVE] } },
        },
        include: { courseOffering: { include: { course: { select: { code: true } } } }, room: { select: { building: true, name: true } } },
      });
      if (roomConflict) {
        const r = roomConflict.room;
        conflicts.push(`Room conflict: ${r?.building} ${r?.name} is occupied by ${roomConflict.courseOffering.course.code} on day ${slot.dayOfWeek} at ${slot.startTime}`);
      }
    }

    // Instructor conflict
    if (data.instructorId) {
      const instrConflict = await prisma.timetableSlot.findFirst({
        where: {
          instructorId: data.instructorId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          courseOfferingId: { not: data.excludeOfferingId },
          courseOffering: { semesterId: data.semesterId, status: { in: [OfferingStatus.SCHEDULED, OfferingStatus.ACTIVE] } },
        },
        include: { courseOffering: { include: { course: { select: { code: true } } } } },
      });
      if (instrConflict) {
        conflicts.push(`Instructor conflict: instructor already teaching ${instrConflict.courseOffering.course.code} on day ${slot.dayOfWeek} at ${slot.startTime}`);
      }
    }
  }
  return conflicts;
}

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

  // Conflict check
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

    if (data.timetables?.length) {
      await tx.timetableSlot.createMany({
        data: data.timetables.map(t => ({
          courseOfferingId: off.id, dayOfWeek: t.dayOfWeek,
          startTime: t.startTime, endTime: t.endTime,
          roomId: data.roomId ?? null, instructorId: data.instructorId ?? null,
        })),
      });
    }

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'OFFERING_CREATED',
        entityType: 'CourseOffering', entityId: off.id,
        description: `Course offering created for course ${data.courseId} section ${section}`,
      },
    });

    return off;
  });

  return offering;
}

export async function updateOffering(id: string, data: {
  instructorId?: string | null; roomId?: string | null;
  capacity?: number; status?: OfferingStatus;
  timetables?: { dayOfWeek: number; startTime: string; endTime: string }[];
}, registrarUserId: string) {
  const offering = await prisma.courseOffering.findUnique({ where: { id }, include: { timetables: true } });
  if (!offering) throw new Error('Offering not found');

  // Conflict check for new timetables
  if (data.timetables?.length) {
    const conflicts = await detectConflicts({
      semesterId: offering.semesterId,
      roomId: data.roomId ?? offering.roomId,
      instructorId: data.instructorId ?? offering.instructorId,
      timetables: data.timetables,
      excludeOfferingId: id,
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

  return prisma.$transaction(async (tx) => {
    const updated = await tx.courseOffering.update({
      where: { id },
      data: {
        ...(data.instructorId !== undefined && { instructorId: data.instructorId }),
        ...(data.roomId !== undefined && { roomId: data.roomId }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        status: newStatus,
      },
    });

    if (data.timetables !== undefined) {
      await tx.timetableSlot.deleteMany({ where: { courseOfferingId: id } });
      if (data.timetables.length) {
        await tx.timetableSlot.createMany({
          data: data.timetables.map(t => ({
            courseOfferingId: id, dayOfWeek: t.dayOfWeek,
            startTime: t.startTime, endTime: t.endTime,
            roomId: data.roomId ?? offering.roomId,
            instructorId: data.instructorId ?? offering.instructorId,
          })),
        });
      }
    }

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'OFFERING_UPDATED',
        entityType: 'CourseOffering', entityId: id,
        description: `Course offering ${id} updated`,
      },
    });

    return updated;
  });
}

export async function listSemesters() {
  return prisma.semester.findMany({
    orderBy: [{ academicYear: { startDate: 'desc' } }, { startDate: 'asc' }],
    include: { academicYear: { select: { name: true } } },
  });
}

export async function listRooms() {
  return prisma.room.findMany({ where: { isActive: true }, orderBy: [{ building: 'asc' }, { name: 'asc' }] });
}

export async function listInstructors() {
  return prisma.instructorRecord.findMany({
    where: { isActive: true },
    include: { user: { select: { fullName: true, email: true } }, department: { select: { name: true } } },
    orderBy: { user: { fullName: 'asc' } },
  });
}
