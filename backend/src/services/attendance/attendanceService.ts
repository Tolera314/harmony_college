/**
 * Attendance Service — per attendance.md specification
 *
 * Core principles enforced here:
 * 1. Attendance belongs to a specific ClassSession, not just a course.
 * 2. Only enrolled students can be marked.
 * 3. Duplicate protection at DB level (@@unique constraint).
 * 4. Server time is authoritative — never trust client clocks.
 * 5. QR tokens are short-lived and server-validated.
 * 6. Corrections are audited.
 * 7. Finalized sessions cannot be silently edited.
 * 8. Real-time day-of-week: instructor can only open a session on its scheduled date.
 * 9. openBeforeMinutes: session cannot be opened too early.
 * 10. closeAfterMinutes: auto-close timer fires when the attendance window expires.
 */

import { prisma } from '../../lib/prisma';
import { AttendanceStatus, AttendanceMethod, AttendanceSessionLifecycle } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import {
  broadcastAttendanceOpened,
  broadcastAttendanceRecord,
  broadcastAttendanceClosed,
} from '../../lib/socket';

// ── Policy defaults (configurable per session) ────────────────────────────
const DEFAULT_OPEN_BEFORE_MINUTES  = 15;   // how early before class start the session can open
const DEFAULT_LATE_AFTER_MINUTES   = 10;
const DEFAULT_CLOSE_AFTER_MINUTES  = 30;
const QR_TOKEN_VALIDITY_MINUTES    = 15;

// ── Auto-close timer registry ─────────────────────────────────────────────
// Node.js timer handles keyed by attendanceSessionId so we can cancel them
// if the instructor manually closes before the window expires.
const autoCloseTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Schedule an automatic close for an attendance session after closeAfterMinutes.
 * Clears any existing timer first (idempotent).
 */
function scheduleAutoClose(sessionId: string, closeAfterMs: number) {
  // Cancel any existing timer for this session
  const existing = autoCloseTimers.get(sessionId);
  if (existing) clearTimeout(existing);

  const handle = setTimeout(async () => {
    autoCloseTimers.delete(sessionId);
    try {
      const session = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          classSession: { include: { courseOffering: { include: { instructor: true } } } },
        },
      });
      if (!session || session.lifecycle !== AttendanceSessionLifecycle.OPEN) return;

      await prisma.attendanceSession.update({
        where: { id: sessionId },
        data: {
          lifecycle: AttendanceSessionLifecycle.CLOSED,
          closedAt: new Date(),
          qrTokenHash: null,
        },
      });

      broadcastAttendanceClosed({
        sessionId,
        courseOfferingId: session.classSession.courseOfferingId,
        status: 'CLOSED',
        closedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[attendance:autoClose] Failed to auto-close session', sessionId, err);
    }
  }, closeAfterMs);

  autoCloseTimers.set(sessionId, handle);
}

/**
 * Cancel a pending auto-close timer (called when instructor manually closes/finalizes).
 */
function cancelAutoClose(sessionId: string) {
  const existing = autoCloseTimers.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    autoCloseTimers.delete(sessionId);
  }
}

/**
 * On server startup, re-schedule auto-close timers for any sessions still OPEN in the DB.
 * This handles server restarts gracefully — OPEN sessions don't stay open forever.
 */
export async function restoreAutoCloseTimers() {
  const openSessions = await prisma.attendanceSession.findMany({
    where: { lifecycle: AttendanceSessionLifecycle.OPEN },
    include: {
      classSession: { select: { startTime: true, date: true, courseOfferingId: true } },
    },
  });

  let restored = 0;
  for (const session of openSessions) {
    const [h, m] = session.classSession.startTime.split(':').map(Number);
    const sessionDate = new Date(session.classSession.date);
    sessionDate.setHours(h, m, 0, 0);
    const windowCloseAt = new Date(sessionDate.getTime() + session.closeAfterMinutes * 60 * 1000);
    const msRemaining = windowCloseAt.getTime() - Date.now();

    // Auto-close immediately (0 ms) if window already passed, else at the remaining time
    scheduleAutoClose(session.id, Math.max(0, msRemaining));
    restored++;
  }

  if (restored > 0) {
    console.log(`[attendance] Restored ${restored} auto-close timer(s) for OPEN sessions.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASS SESSION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/** Create class sessions from timetable slots for a date range.
 *  Skips dates that fall on a published HOLIDAY in the academic calendar.
 */
export async function generateClassSessions(
  courseOfferingId: string,
  fromDate: Date,
  toDate: Date,
) {
  const slots = await prisma.timetableSlot.findMany({
    where: { courseOfferingId, status: { in: ['PUBLISHED'] } },
    select: { dayOfWeek: true, startTime: true, endTime: true, roomId: true },
  });

  // Fetch all published HOLIDAY events that overlap the requested date range
  const holidays = await prisma.academicCalendarEvent.findMany({
    where: {
      eventType: 'HOLIDAY',
      isPublished: true,
      startDate: { lte: toDate },
      endDate:   { gte: fromDate },
    },
    select: { startDate: true, endDate: true, title: true },
  });

  /** Returns true if a given calendar date falls within any holiday range */
  function isHoliday(date: Date): boolean {
    const d = date.getTime();
    return holidays.some(h => {
      const start = new Date(h.startDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(h.endDate);   end.setHours(23, 59, 59, 999);
      return d >= start.getTime() && d <= end.getTime();
    });
  }

  const sessions: { courseOfferingId: string; date: Date; startTime: string; endTime: string; roomId: string | null }[] = [];
  const skipped: string[] = [];
  const current = new Date(fromDate);

  while (current <= toDate) {
    const dow = current.getDay() === 0 ? 6 : current.getDay() - 1; // Convert to Mon=0
    for (const slot of slots) {
      if (slot.dayOfWeek === dow) {
        if (isHoliday(current)) {
          skipped.push(current.toISOString().slice(0, 10));
        } else {
          sessions.push({
            courseOfferingId,
            date: new Date(current),
            startTime: slot.startTime,
            endTime: slot.endTime,
            roomId: slot.roomId,
          });
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  // Upsert sessions (holidays are simply not created)
  for (const s of sessions) {
    await prisma.classSession.upsert({
      where: {
        courseOfferingId_date_startTime: {
          courseOfferingId: s.courseOfferingId,
          date: s.date,
          startTime: s.startTime,
        },
      },
      update: {},
      create: s,
    });
  }

  return { generated: sessions.length, skippedHolidays: [...new Set(skipped)] };
}

/** Get today's class sessions for an instructor. */
export async function getTodaySessionsForInstructor(instructorUserId: string) {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const instructor = await prisma.instructorRecord.findUnique({
    where: { userId: instructorUserId },
    select: { id: true },
  });
  if (!instructor) throw new Error('Instructor record not found');

  return prisma.classSession.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      courseOffering: { instructorId: instructor.id },
    },
    include: {
      courseOffering: {
        include: {
          course: { select: { code: true, name: true } },
          _count: {
            select: { enrollments: { where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] } } } },
          },
        },
      },
      room: { select: { name: true, building: true } },
      attendanceSession: {
        select: {
          id: true, lifecycle: true, openedAt: true, closedAt: true,
          _count: { select: { records: true } },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

/** Get class sessions for a course offering. */
export async function getSessionsForOffering(courseOfferingId: string) {
  return prisma.classSession.findMany({
    where: { courseOfferingId },
    include: {
      attendanceSession: {
        include: {
          _count: { select: { records: true } },
        },
      },
      room: { select: { name: true, building: true } },
    },
    orderBy: { date: 'desc' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE SESSION LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

/** Open an attendance session. Verifies instructor owns the course. */
export async function openAttendanceSession(
  classSessionId: string,
  instructorUserId: string,
  options?: { lateAfterMinutes?: number; closeAfterMinutes?: number; openBeforeMinutes?: number },
) {
  const classSession = await prisma.classSession.findUnique({
    where: { id: classSessionId },
    include: {
      courseOffering: { include: { instructor: true } },
      attendanceSession: true,
    },
  });

  if (!classSession) throw new Error('Class session not found');

  // Security: verify instructor owns this course
  if (classSession.courseOffering.instructor?.userId !== instructorUserId) {
    throw new Error('You are not authorized to manage attendance for this course');
  }

  // ── Real-time day-of-week guard (server time) ─────────────────────────────
  // The ClassSession must be scheduled for today's calendar date.
  const nowServer = new Date();
  const sessionDate = new Date(classSession.date);
  const todayMidnight = new Date(nowServer);
  todayMidnight.setHours(0, 0, 0, 0);
  const sessionMidnight = new Date(sessionDate);
  sessionMidnight.setHours(0, 0, 0, 0);

  if (sessionMidnight.getTime() !== todayMidnight.getTime()) {
    const sessionDateStr = sessionMidnight.toISOString().slice(0, 10);
    const todayStr = todayMidnight.toISOString().slice(0, 10);
    throw new Error(
      `This class session is scheduled for ${sessionDateStr}, but today is ${todayStr}. ` +
      `Attendance can only be opened on the day of the class.`,
    );
  }

  // ── openBeforeMinutes guard (server time) ─────────────────────────────────
  // Attendance cannot open more than openBeforeMinutes before the class start.
  const openBefore = options?.openBeforeMinutes ?? DEFAULT_OPEN_BEFORE_MINUTES;
  const [startH, startM] = classSession.startTime.split(':').map(Number);
  const classStartMs = new Date(sessionDate).setHours(startH, startM, 0, 0);
  const earliestOpenMs = classStartMs - openBefore * 60 * 1000;

  if (nowServer.getTime() < earliestOpenMs) {
    const earliestStr = new Date(earliestOpenMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    throw new Error(
      `Attendance for this session cannot be opened before ${earliestStr}. ` +
      `(${openBefore} minutes before class start at ${classSession.startTime})`,
    );
  }

  // Cannot open an already open or finalized session
  if (classSession.attendanceSession) {
    const lifecycle = classSession.attendanceSession.lifecycle;
    if (lifecycle === AttendanceSessionLifecycle.OPEN) {
      return classSession.attendanceSession; // idempotent — return existing
    }
    if (lifecycle === AttendanceSessionLifecycle.FINALIZED) {
      throw new Error('This attendance session has been finalized and cannot be reopened');
    }
  }

  const lateAfter  = options?.lateAfterMinutes  ?? DEFAULT_LATE_AFTER_MINUTES;
  const closeAfter = options?.closeAfterMinutes ?? DEFAULT_CLOSE_AFTER_MINUTES;

  const result = await prisma.$transaction(async tx => {
    // Pre-populate attendance records for all enrolled students as ABSENT
    const enrollments = await tx.enrollment.findMany({
      where: {
        courseOfferingId: classSession.courseOfferingId,
        status: { in: ['ACTIVE', 'FORCE_ADDED'] },
      },
      select: { studentRecordId: true },
    });

    const session = await tx.attendanceSession.upsert({
      where: { classSessionId },
      create: {
        classSessionId,
        openedBy: instructorUserId,
        lifecycle: AttendanceSessionLifecycle.OPEN,
        openedAt: new Date(),
        openBeforeMinutes: openBefore,
        lateAfterMinutes:  lateAfter,
        closeAfterMinutes: closeAfter,
      },
      update: {
        lifecycle: AttendanceSessionLifecycle.OPEN,
        openedAt: new Date(),
        openBeforeMinutes: openBefore,
        lateAfterMinutes:  lateAfter,
        closeAfterMinutes: closeAfter,
      },
    });

    // Create ABSENT records for all enrolled students (they must be marked present)
    await tx.attendanceRecord.createMany({
      data: enrollments.map(e => ({
        attendanceSessionId: session.id,
        studentRecordId:     e.studentRecordId,
        status:              AttendanceStatus.ABSENT,
        method:              AttendanceMethod.MANUAL,
        markedAt:            new Date(),
        markedBy:            instructorUserId,
      })),
      skipDuplicates: true,
    });

    // Broadcast to all clients watching this course (students + instructor)
    const offering = await tx.courseOffering.findUnique({
      where: { id: classSession.courseOfferingId },
      include: { course: { select: { code: true } } },
    });
    broadcastAttendanceOpened({
      sessionId:        session.id,
      courseOfferingId: classSession.courseOfferingId,
      courseCode:       offering?.course?.code ?? '',
      openedAt:         session.openedAt?.toISOString() ?? new Date().toISOString(),
    });

    return session;
  });

  // Schedule auto-close after the attendance window expires (server-side timer)
  const classStartDate = new Date(sessionDate);
  classStartDate.setHours(startH, startM, 0, 0);
  const windowCloseAt = new Date(classStartDate.getTime() + closeAfter * 60 * 1000);
  const msUntilClose = windowCloseAt.getTime() - Date.now();

  if (msUntilClose > 0) {
    scheduleAutoClose(result.id, msUntilClose);
  } else {
    // Window already expired — close immediately
    scheduleAutoClose(result.id, 0);
  }

  return result;
}

/** Close an attendance session (stops new marks but not yet finalized). */
export async function closeAttendanceSession(
  attendanceSessionId: string,
  instructorUserId: string,
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: attendanceSessionId },
    include: { classSession: { include: { courseOffering: { include: { instructor: true } } } } },
  });

  if (!session) throw new Error('Attendance session not found');
  if (session.classSession.courseOffering.instructor?.userId !== instructorUserId) {
    throw new Error('Unauthorized');
  }
  if (session.lifecycle === AttendanceSessionLifecycle.FINALIZED) {
    throw new Error('Session already finalized');
  }
  if (session.lifecycle === AttendanceSessionLifecycle.CLOSED) {
    return session; // idempotent
  }

  // Cancel the auto-close timer — instructor is manually closing
  cancelAutoClose(attendanceSessionId);

  const updated = await prisma.attendanceSession.update({
    where: { id: attendanceSessionId },
    data: { lifecycle: AttendanceSessionLifecycle.CLOSED, closedAt: new Date(), qrTokenHash: null },
  });

  broadcastAttendanceClosed({
    sessionId:        attendanceSessionId,
    courseOfferingId: session.classSession.courseOfferingId,
    status:           'CLOSED',
    closedAt:         updated.closedAt?.toISOString() ?? new Date().toISOString(),
  });

  return updated;
}

/** Finalize — locks the session permanently. Corrections require the correction flow. */
export async function finalizeAttendanceSession(
  attendanceSessionId: string,
  instructorUserId: string,
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: attendanceSessionId },
    include: { classSession: { include: { courseOffering: { include: { instructor: true } } } } },
  });

  if (!session) throw new Error('Attendance session not found');
  if (session.classSession.courseOffering.instructor?.userId !== instructorUserId) {
    throw new Error('Unauthorized');
  }
  if (session.lifecycle === AttendanceSessionLifecycle.FINALIZED) return session;
  if (session.lifecycle === AttendanceSessionLifecycle.OPEN) {
    throw new Error('Close the session before finalizing');
  }

  // Cancel any residual auto-close timer
  cancelAutoClose(attendanceSessionId);

  const finalized = await prisma.attendanceSession.update({
    where: { id: attendanceSessionId },
    data: { lifecycle: AttendanceSessionLifecycle.FINALIZED, finalizedAt: new Date() },
  });

  broadcastAttendanceClosed({
    sessionId:        attendanceSessionId,
    courseOfferingId: session.classSession.courseOfferingId,
    status:           'FINALIZED',
    closedAt:         finalized.finalizedAt?.toISOString() ?? new Date().toISOString(),
  });

  return finalized;
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL ATTENDANCE (instructor marks individual students)
// ─────────────────────────────────────────────────────────────────────────────

/** Get the full roster for an attendance session. */
export async function getAttendanceRoster(
  attendanceSessionId: string,
  instructorUserId: string,
) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: attendanceSessionId },
    include: {
      classSession: {
        include: {
          courseOffering: {
            include: {
              instructor: { select: { userId: true } },
              enrollments: {
                where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] } },
                include: { studentRecord: { include: { user: { select: { fullName: true } } } } },
              },
            },
          },
        },
      },
      records: true,
    },
  });

  if (!session) throw new Error('Attendance session not found');
  if (session.classSession.courseOffering.instructor?.userId !== instructorUserId) {
    throw new Error('Unauthorized');
  }

  const recordMap = new Map(session.records.map(r => [r.studentRecordId, r]));

  return {
    session: {
      id: session.id,
      lifecycle: session.lifecycle,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      classDate: session.classSession.date,
      startTime: session.classSession.startTime,
      endTime: session.classSession.endTime,
    },
    students: session.classSession.courseOffering.enrollments.map(e => {
      const record = recordMap.get(e.studentRecordId);
      return {
        studentRecordId: e.studentRecordId,
        studentId: e.studentRecord.studentId,
        fullName: e.studentRecord.user.fullName,
        status: record?.status ?? AttendanceStatus.ABSENT,
        method: record?.method ?? AttendanceMethod.MANUAL,
        markedAt: record?.markedAt,
        recordId: record?.id,
      };
    }),
  };
}

/** Mark or update attendance for a student (instructor). */
export async function markAttendance(data: {
  attendanceSessionId: string;
  studentRecordId: string;
  status: AttendanceStatus;
  instructorUserId: string;
  note?: string;
}) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: data.attendanceSessionId },
    include: {
      classSession: {
        include: { courseOffering: { include: { instructor: { select: { userId: true } } } } },
      },
    },
  });

  if (!session) throw new Error('Attendance session not found');
  if (session.classSession.courseOffering.instructor?.userId !== data.instructorUserId) {
    throw new Error('Unauthorized');
  }
  if (session.lifecycle === AttendanceSessionLifecycle.FINALIZED) {
    throw new Error('This session is finalized. Use the correction process to make changes.');
  }
  if (session.lifecycle !== AttendanceSessionLifecycle.OPEN) {
    throw new Error('Attendance session is not open');
  }

  // Verify enrollment — never allow marking a student not in this course
  const enrolled = await prisma.enrollment.findFirst({
    where: {
      courseOfferingId: session.classSession.courseOfferingId,
      studentRecordId:  data.studentRecordId,
      status: { in: ['ACTIVE', 'FORCE_ADDED'] },
    },
  });
  if (!enrolled) throw new Error('Student is not enrolled in this course');

  // Upsert — idempotent, safe for retries
  const record = await prisma.attendanceRecord.upsert({
    where: {
      attendanceSessionId_studentRecordId: {
        attendanceSessionId: data.attendanceSessionId,
        studentRecordId:     data.studentRecordId,
      },
    },
    create: {
      attendanceSessionId: data.attendanceSessionId,
      studentRecordId:     data.studentRecordId,
      status:   data.status,
      method:   AttendanceMethod.MANUAL,
      markedAt: new Date(),
      markedBy: data.instructorUserId,
      note:     data.note ?? null,
    },
    update: {
      status:   data.status,
      markedAt: new Date(),
      markedBy: data.instructorUserId,
      note:     data.note ?? null,
    },
  });

  // Broadcast live record update to course room
  const studentRecord = await prisma.studentRecord.findUnique({
    where: { id: data.studentRecordId },
    include: { user: { select: { fullName: true } } },
  });
  broadcastAttendanceRecord({
    sessionId:        data.attendanceSessionId,
    courseOfferingId: session.classSession.courseOfferingId,
    studentRecordId:  data.studentRecordId,
    studentName:      studentRecord?.user?.fullName ?? 'Unknown',
    status:           data.status,
    method:           'MANUAL',
    markedAt:         record.markedAt.toISOString(),
  });

  return record;
}

/** Bulk mark attendance for the entire roster at once. */
export async function bulkMarkAttendance(data: {
  attendanceSessionId: string;
  marks: { studentRecordId: string; status: AttendanceStatus }[];
  instructorUserId: string;
}) {
  for (const mark of data.marks) {
    await markAttendance({
      attendanceSessionId: data.attendanceSessionId,
      studentRecordId:     mark.studentRecordId,
      status:              mark.status,
      instructorUserId:    data.instructorUserId,
    });
  }
  return { marked: data.marks.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// QR ATTENDANCE (student scans QR code)
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a QR token for a session (instructor action). Returns the raw token once. */
export async function generateQrToken(
  attendanceSessionId: string,
  instructorUserId: string,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: attendanceSessionId },
    include: {
      classSession: { include: { courseOffering: { include: { instructor: { select: { userId: true } } } } } },
    },
  });

  if (!session) throw new Error('Attendance session not found');
  if (session.classSession.courseOffering.instructor?.userId !== instructorUserId) {
    throw new Error('Unauthorized');
  }
  if (session.lifecycle !== AttendanceSessionLifecycle.OPEN) {
    throw new Error('Attendance session is not open');
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + QR_TOKEN_VALIDITY_MINUTES * 60 * 1000);

  await prisma.attendanceSession.update({
    where: { id: attendanceSessionId },
    data: { qrTokenHash: tokenHash, qrTokenExpiry: expiresAt },
  });

  return { rawToken, expiresAt };
}

/** Student submits a QR token to mark their own attendance.
 *  Security: studentRecordId is resolved from authenticated userId — NEVER trusted from client.
 */
export async function markAttendanceViaQr(data: {
  rawToken: string;
  studentUserId: string;   // from JWT — never from request body
}) {
  // 1. Resolve student from authenticated user ID
  const studentRecord = await prisma.studentRecord.findUnique({
    where: { userId: data.studentUserId },
    select: { id: true, userId: true },
  });
  if (!studentRecord) throw new Error('Student record not found');

  // 2. Hash the submitted token
  const submittedHash = createHash('sha256').update(data.rawToken).digest('hex');

  // 3. Find matching open session
  const session = await prisma.attendanceSession.findFirst({
    where: {
      qrTokenHash:   submittedHash,
      lifecycle:     AttendanceSessionLifecycle.OPEN,
      qrTokenExpiry: { gte: new Date() }, // server time validation — never client time
    },
    include: {
      classSession: {
        select: {
          courseOfferingId: true,
          startTime: true,
          date: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error('QR code is invalid or has expired. Please ask your instructor for a new code.');
  }

  // 4. Verify enrollment — server-side, never trusted from client
  const enrolled = await prisma.enrollment.findFirst({
    where: {
      courseOfferingId: session.classSession.courseOfferingId,
      studentRecordId:  studentRecord.id,
      status: { in: ['ACTIVE', 'FORCE_ADDED'] },
    },
  });
  if (!enrolled) throw new Error('You are not enrolled in this course');

  // 5. Calculate attendance status using server time and session policy
  const now = new Date();
  const sessionDate = new Date(session.classSession.date);
  const [startH, startM] = session.classSession.startTime.split(':').map(Number);
  const sessionStart = new Date(sessionDate);
  sessionStart.setHours(startH, startM, 0, 0);

  const minutesLate = Math.floor((now.getTime() - sessionStart.getTime()) / 60000);
  const status = minutesLate <= session.lateAfterMinutes
    ? AttendanceStatus.PRESENT
    : AttendanceStatus.LATE;

  // 6. Create attendance record — DB unique constraint prevents duplicates
  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        attendanceSessionId: session.id,
        studentRecordId:     studentRecord.id,
        status,
        method:   AttendanceMethod.QR,
        markedAt: now,
        markedBy: data.studentUserId,
      },
    });

    // Broadcast live check-in to the course room (instructor sees it immediately)
    const sr = await prisma.studentRecord.findUnique({
      where: { id: studentRecord.id },
      include: { user: { select: { fullName: true } } },
    });
    broadcastAttendanceRecord({
      sessionId:        session.id,
      courseOfferingId: session.classSession.courseOfferingId,
      studentRecordId:  studentRecord.id,
      studentName:      sr?.user?.fullName ?? 'Unknown',
      status,
      method:           'QR',
      markedAt:         record.markedAt.toISOString(),
    });

    return { success: true, status, markedAt: record.markedAt };
  } catch (err: unknown) {
    // Unique constraint violation — already marked
    if (err instanceof Error && err.message.includes('Unique constraint')) {
      const existing = await prisma.attendanceRecord.findUnique({
        where: {
          attendanceSessionId_studentRecordId: {
            attendanceSessionId: session.id,
            studentRecordId:     studentRecord.id,
          },
        },
      });
      return {
        success: false,
        alreadyMarked: true,
        status: existing?.status ?? AttendanceStatus.PRESENT,
        markedAt: existing?.markedAt,
      };
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE CORRECTION (audited)
// ─────────────────────────────────────────────────────────────────────────────

export async function correctAttendance(data: {
  attendanceRecordId: string;
  newStatus: AttendanceStatus;
  reason: string;
  changedByUserId: string;
}) {
  if (!data.reason?.trim()) throw new Error('Correction reason is required');

  const record = await prisma.attendanceRecord.findUnique({
    where: { id: data.attendanceRecordId },
    include: {
      attendanceSession: {
        include: {
          classSession: { include: { courseOffering: { include: { instructor: { select: { userId: true } } } } } },
        },
      },
    },
  });

  if (!record) throw new Error('Attendance record not found');

  // Only the instructor of this course or admin can correct
  const isInstructor = record.attendanceSession.classSession.courseOffering.instructor?.userId === data.changedByUserId;
  const isAdmin = await prisma.user.findFirst({
    where: { id: data.changedByUserId, role: { in: ['ADMIN', 'SUPER_ADMIN', 'REGISTRAR'] } },
  });

  if (!isInstructor && !isAdmin) {
    throw new Error('Unauthorized to correct this attendance record');
  }

  const oldStatus = record.status;

  return prisma.$transaction(async tx => {
    const updated = await tx.attendanceRecord.update({
      where: { id: data.attendanceRecordId },
      data: {
        status:          data.newStatus,
        correctionOf:    data.attendanceRecordId,
        correctionReason: data.reason.trim(),
        correctedAt:     new Date(),
      },
    });

    // Append-only audit log
    await tx.attendanceCorrectionLog.create({
      data: {
        attendanceRecordId: data.attendanceRecordId,
        oldStatus,
        newStatus: data.newStatus,
        reason:    data.reason.trim(),
        changedBy: data.changedByUserId,
      },
    });

    return updated;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE REPORTS & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/** Student's own attendance summary — overall + per course. */
export async function getStudentAttendanceSummary(studentRecordId: string) {
  const records = await prisma.attendanceRecord.findMany({
    where: { studentRecordId },
    include: {
      attendanceSession: {
        include: {
          classSession: {
            include: {
              courseOffering: {
                include: { course: { select: { code: true, name: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { markedAt: 'desc' },
  });

  // Group by course offering
  const byCourse: Record<string, {
    courseCode: string; courseName: string;
    total: number; present: number; absent: number; late: number; excused: number;
  }> = {};

  for (const r of records) {
    const offering = r.attendanceSession.classSession.courseOffering;
    const key = offering.id;
    if (!byCourse[key]) {
      byCourse[key] = {
        courseCode: offering.course.code,
        courseName: offering.course.name,
        total: 0, present: 0, absent: 0, late: 0, excused: 0,
      };
    }
    byCourse[key].total++;
    if (r.status === AttendanceStatus.PRESENT) byCourse[key].present++;
    else if (r.status === AttendanceStatus.ABSENT)  byCourse[key].absent++;
    else if (r.status === AttendanceStatus.LATE)    { byCourse[key].late++; byCourse[key].present++; } // LATE counts as present
    else if (r.status === AttendanceStatus.EXCUSED) byCourse[key].excused++;
  }

  const total = records.length;
  const totalPresent = records.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
  const overallRate = total > 0 ? Math.round((totalPresent / total) * 100) : 100;

  return {
    overall: { rate: overallRate, total, present: totalPresent, absent: records.filter(r => r.status === AttendanceStatus.ABSENT).length },
    byCourse: Object.values(byCourse).map(c => ({
      ...c,
      rate: c.total > 0 ? Math.round((c.present / c.total) * 100) : 100,
    })),
    recentRecords: records.slice(0, 20).map(r => ({
      id: r.id,
      date: r.attendanceSession.classSession.date,
      courseCode: r.attendanceSession.classSession.courseOffering.course.code,
      status: r.status,
      method: r.method,
      markedAt: r.markedAt,
    })),
  };
}

/** Registrar attendance report — flexible filters. */
export async function getAttendanceReport(filters: {
  semesterId?: string;
  courseOfferingId?: string;
  studentRecordId?: string;
  departmentId?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}) {
  const where: any = {};

  if (filters.studentRecordId) where.studentRecordId = filters.studentRecordId;
  if (filters.from || filters.to) {
    where.markedAt = {};
    if (filters.from) where.markedAt.gte = filters.from;
    if (filters.to)   where.markedAt.lte = filters.to;
  }
  if (filters.courseOfferingId) {
    where.attendanceSession = { classSession: { courseOfferingId: filters.courseOfferingId } };
  }
  if (filters.semesterId) {
    where.attendanceSession = {
      classSession: { courseOffering: { semesterId: filters.semesterId } },
    };
  }

  const skip = (filters.page - 1) * filters.limit;
  const [total, records] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where, skip, take: filters.limit,
      orderBy: { markedAt: 'desc' },
      include: {
        studentRecord: {
          select: {
            studentId: true,
            user: { select: { fullName: true } },
            program: { select: { name: true } },
          },
        },
        attendanceSession: {
          select: {
            lifecycle: true,
            classSession: {
              select: {
                date: true, startTime: true, endTime: true,
                courseOffering: {
                  select: { course: { select: { code: true, name: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    total, page: filters.page, limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit),
    records,
  };
}

/** Students below attendance threshold for a course. */
export async function getStudentsBelowThreshold(
  courseOfferingId: string,
  threshold = 75,
) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId, status: { in: ['ACTIVE', 'FORCE_ADDED'] } },
    select: { studentRecordId: true, studentRecord: { select: { studentId: true, user: { select: { fullName: true } } } } },
  });

  const results = await Promise.all(
    enrollments.map(async e => {
      const records = await prisma.attendanceRecord.findMany({
        where: {
          studentRecordId: e.studentRecordId,
          attendanceSession: { classSession: { courseOfferingId } },
        },
        select: { status: true },
      });
      const total   = records.length;
      const present = records.filter(r => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
      const rate    = total > 0 ? Math.round((present / total) * 100) : 100;
      return { ...e, rate, total, present, absent: total - present };
    }),
  );

  return results.filter(r => r.rate < threshold).sort((a, b) => a.rate - b.rate);
}
