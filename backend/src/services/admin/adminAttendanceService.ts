/**
 * Harmony College — Admin Attendance Service
 * ─────────────────────────────────────────────────────────────
 * Institution-wide attendance analytics, server-side paginated record list,
 * student & course attendance drilldowns, low-attendance detection, and audited
 * attendance record correction.
 */

import { prisma } from '../../lib/prisma';
import { AttendanceStatus, AttendanceSessionLifecycle } from '@prisma/client';
import { AuditAction } from '../../types/auth';

// ── Types & Interfaces ────────────────────────────────────────────────────────

export interface AdminAttendanceStatsQuery {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  programId?: string;
  courseOfferingId?: string;
  academicYear?: string;
  semester?: string;
  threshold?: number;
}

export interface AdminAttendanceListQuery {
  page: number;
  limit: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  departmentId?: string;
  programId?: string;
  courseOfferingId?: string;
  instructorId?: string;
  academicYear?: string;
  semester?: string;
}

export interface AdminAttendanceTrendsQuery {
  period?: 'daily' | 'weekly' | 'monthly';
  departmentId?: string;
}

export interface AdminLowAttendanceQuery {
  page: number;
  limit: number;
  search?: string;
  threshold?: number; // default 75 (%)
  departmentId?: string;
  programId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATS & OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export async function getAttendanceStats(q: AdminAttendanceStatsQuery) {
  const whereRecord: any = {};

  if (q.startDate || q.endDate) {
    whereRecord.markedAt = {};
    if (q.startDate) whereRecord.markedAt.gte = new Date(q.startDate);
    if (q.endDate) whereRecord.markedAt.lte = new Date(q.endDate + 'T23:59:59.999Z');
  }

  if (q.departmentId || q.courseOfferingId) {
    const courseOfferingWhere: any = {};
    if (q.departmentId) courseOfferingWhere.course = { departmentId: q.departmentId };
    if (q.courseOfferingId) courseOfferingWhere.id = q.courseOfferingId;

    whereRecord.attendanceSession = {
      classSession: {
        courseOffering: courseOfferingWhere,
      },
    };
  }

  // Count statuses via groupBy
  const statusCounts = await prisma.attendanceRecord.groupBy({
    by: ['status'],
    where: whereRecord,
    _count: { _all: true },
  });

  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;
  let totalRecords = 0;

  for (const item of statusCounts) {
    const count = item._count._all;
    totalRecords += count;
    if (item.status === AttendanceStatus.PRESENT) present = count;
    else if (item.status === AttendanceStatus.ABSENT) absent = count;
    else if (item.status === AttendanceStatus.LATE) late = count;
    else if (item.status === AttendanceStatus.EXCUSED) excused = count;
  }

  const attendedCount = present + late;
  const overallRate = totalRecords > 0 ? Math.round((attendedCount / totalRecords) * 100) : null;

  // Today's rate
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayCounts = await prisma.attendanceRecord.groupBy({
    by: ['status'],
    where: {
      ...whereRecord,
      markedAt: { gte: todayStart, lte: todayEnd },
    },
    _count: { _all: true },
  });

  let todayTotal = 0;
  let todayAttended = 0;
  for (const item of todayCounts) {
    todayTotal += item._count._all;
    if (item.status === AttendanceStatus.PRESENT || item.status === AttendanceStatus.LATE) {
      todayAttended += item._count._all;
    }
  }
  const todayRate = todayTotal > 0 ? Math.round((todayAttended / todayTotal) * 100) : null;

  // Total sessions conducted
  const totalSessions = await prisma.attendanceSession.count({
    where: {
      lifecycle: { in: [AttendanceSessionLifecycle.CLOSED, AttendanceSessionLifecycle.FINALIZED, AttendanceSessionLifecycle.OPEN] },
      ...(q.departmentId || q.courseOfferingId
        ? {
            classSession: {
              courseOffering: {
                ...(q.departmentId ? { course: { departmentId: q.departmentId } } : {}),
                ...(q.courseOfferingId ? { id: q.courseOfferingId } : {}),
              },
            },
          }
        : {}),
    },
  });

  // Count low-attendance students (< 75%)
  const lowAttCount = await getLowAttendanceCount(q.threshold ?? 75, q.departmentId, q.programId);

  return {
    overallRate,
    todayRate,
    totalRecords,
    present,
    absent,
    late,
    excused,
    totalSessions,
    lowAttendanceCount: lowAttCount,
  };
}

// Helper: low-attendance student count
async function getLowAttendanceCount(thresholdPercent = 75, departmentId?: string, programId?: string) {
  const studentWhere: any = { status: 'ACTIVE' };
  if (departmentId) studentWhere.departmentId = departmentId;
  if (programId) studentWhere.programId = programId;

  const records = await prisma.attendanceRecord.groupBy({
    by: ['studentRecordId', 'status'],
    where: {
      studentRecord: studentWhere,
    },
    _count: { _all: true },
  });

  const map = new Map<string, { total: number; attended: number }>();
  for (const r of records) {
    const sId = r.studentRecordId;
    const cur = map.get(sId) || { total: 0, attended: 0 };
    cur.total += r._count._all;
    if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) {
      cur.attended += r._count._all;
    }
    map.set(sId, cur);
  }

  let count = 0;
  for (const [, val] of map) {
    if (val.total >= 3) {
      const rate = (val.attended / val.total) * 100;
      if (rate < thresholdPercent) count++;
    }
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LIST ATTENDANCE RECORDS (PAGINATED WITH FILTERS)
// ─────────────────────────────────────────────────────────────────────────────

export async function listAttendanceRecords(q: AdminAttendanceListQuery) {
  const page = Math.max(1, q.page || 1);
  const limit = Math.min(100, Math.max(1, q.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (q.status) where.status = q.status;

  if (q.startDate || q.endDate) {
    where.markedAt = {};
    if (q.startDate) where.markedAt.gte = new Date(q.startDate);
    if (q.endDate) where.markedAt.lte = new Date(q.endDate + 'T23:59:59.999Z');
  }

  const studentWhere: any = {};
  if (q.departmentId) studentWhere.departmentId = q.departmentId;
  if (q.programId) studentWhere.programId = q.programId;

  const sessionWhere: any = {};
  if (q.courseOfferingId) sessionWhere.courseOfferingId = q.courseOfferingId;
  if (q.instructorId) sessionWhere.courseOffering = { instructorId: q.instructorId };

  if (Object.keys(studentWhere).length > 0) where.studentRecord = studentWhere;
  if (Object.keys(sessionWhere).length > 0) {
    where.attendanceSession = { classSession: sessionWhere };
  }

  if (q.search && q.search.trim()) {
    const s = q.search.trim();
    where.OR = [
      { studentRecord: { studentId: { contains: s, mode: 'insensitive' } } },
      { studentRecord: { user: { fullName: { contains: s, mode: 'insensitive' } } } },
      { studentRecord: { user: { email: { contains: s, mode: 'insensitive' } } } },
      { attendanceSession: { classSession: { courseOffering: { course: { code: { contains: s, mode: 'insensitive' } } } } } },
      { attendanceSession: { classSession: { courseOffering: { course: { name: { contains: s, mode: 'insensitive' } } } } } },
    ];
  }

  const [total, records] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { markedAt: 'desc' },
      include: {
        studentRecord: {
          select: {
            id: true,
            studentId: true,
            user: { select: { fullName: true, email: true } },
            department: { select: { id: true, name: true, code: true } },
            program: { select: { id: true, name: true, code: true } },
          },
        },
        attendanceSession: {
          include: {
            classSession: {
              include: {
                room: true,
                courseOffering: {
                  include: {
                    course: { select: { id: true, name: true, code: true } },
                    instructor: { select: { id: true, user: { select: { fullName: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const items = records.map((r) => ({
    id: r.id,
    status: r.status,
    method: r.method,
    markedAt: r.markedAt.toISOString(),
    markedBy: r.markedBy,
    note: r.note,
    correctedAt: r.correctedAt?.toISOString() ?? null,
    correctionReason: r.correctionReason,
    student: {
      id: r.studentRecord.id,
      studentId: r.studentRecord.studentId,
      fullName: r.studentRecord.user.fullName,
      email: r.studentRecord.user.email,
      department: r.studentRecord.department,
      program: r.studentRecord.program,
    },
    course: r.attendanceSession.classSession.courseOffering.course,
    instructor: {
      id: r.attendanceSession.classSession.courseOffering.instructor?.id ?? '',
      fullName: r.attendanceSession.classSession.courseOffering.instructor?.user.fullName ?? 'Unassigned',
    },
    session: {
      id: r.attendanceSession.id,
      classSessionId: r.attendanceSession.classSessionId,
      date: r.attendanceSession.classSession.date.toISOString(),
      startTime: r.attendanceSession.classSession.startTime,
      endTime: r.attendanceSession.classSession.endTime,
      title: r.attendanceSession.classSession.topic,
      room: r.attendanceSession.classSession.room?.name ?? null,
    },
  }));

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    records: items,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ATTENDANCE RECORD DETAIL & CORRECTION WITH AUDIT LOGGING
// ─────────────────────────────────────────────────────────────────────────────

export async function getAttendanceRecordDetail(recordId: string) {
  const r = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
    include: {
      studentRecord: {
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          department: { select: { id: true, name: true, code: true } },
          program: { select: { id: true, name: true, code: true } },
        },
      },
      attendanceSession: {
        include: {
          classSession: {
            include: {
              room: true,
              courseOffering: {
                include: {
                  course: { include: { department: true } },
                  instructor: { include: { user: { select: { fullName: true, email: true } } } },
                  semester: { include: { academicYear: true } },
                },
              },
            },
          },
        },
      },
      corrections: {
        orderBy: { changedAt: 'desc' },
      },
    },
  });

  if (!r) throw new Error('Attendance record not found');

  const offering = r.attendanceSession.classSession.courseOffering;

  return {
    id: r.id,
    status: r.status,
    method: r.method,
    markedAt: r.markedAt.toISOString(),
    markedBy: r.markedBy,
    note: r.note,
    correctedAt: r.correctedAt?.toISOString() ?? null,
    correctionReason: r.correctionReason,
    student: {
      id: r.studentRecord.id,
      studentId: r.studentRecord.studentId,
      userId: r.studentRecord.user.id,
      fullName: r.studentRecord.user.fullName,
      email: r.studentRecord.user.email,
      phone: r.studentRecord.user.phone,
      department: r.studentRecord.department,
      program: r.studentRecord.program,
    },
    courseOffering: {
      id: offering.id,
      course: offering.course,
      instructor: offering.instructor
        ? {
            id: offering.instructor.id,
            fullName: offering.instructor.user.fullName,
            email: offering.instructor.user.email,
          }
        : null,
      department: offering.course.department,
      academicYear: offering.semester?.academicYear?.name ?? offering.semester?.name ?? '',
      semester: offering.semester?.name ?? '',
      section: offering.section,
    },
    session: {
      id: r.attendanceSession.id,
      classSessionId: r.attendanceSession.classSessionId,
      date: r.attendanceSession.classSession.date.toISOString(),
      startTime: r.attendanceSession.classSession.startTime,
      endTime: r.attendanceSession.classSession.endTime,
      title: r.attendanceSession.classSession.topic,
      room: r.attendanceSession.classSession.room?.name ?? null,
      status: r.attendanceSession.lifecycle,
      lifecycle: r.attendanceSession.lifecycle,
    },
    corrections: r.corrections.map((c) => ({
      id: c.id,
      oldStatus: c.oldStatus,
      newStatus: c.newStatus,
      reason: c.reason,
      changedBy: c.changedBy,
      changedAt: c.changedAt.toISOString(),
    })),
  };
}

export async function correctAttendanceRecord(
  recordId: string,
  newStatus: AttendanceStatus,
  reason: string,
  adminUserId: string,
  ipAddress?: string
) {
  if (!reason || reason.trim().length < 5) {
    throw new Error('A correction reason of at least 5 characters is required for audit logs.');
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: { id: recordId },
  });
  if (!existing) throw new Error('Attendance record not found.');
  if (existing.status === newStatus) {
    throw new Error(`Record is already in status ${newStatus}.`);
  }

  const oldStatus = existing.status;

  return prisma.$transaction(async (tx) => {
    // 1. Update attendance record
    const updated = await tx.attendanceRecord.update({
      where: { id: recordId },
      data: {
        status: newStatus,
        correctionReason: reason.trim(),
        correctedAt: new Date(),
      },
    });

    // 2. Insert AttendanceCorrectionLog
    await tx.attendanceCorrectionLog.create({
      data: {
        attendanceRecordId: recordId,
        oldStatus,
        newStatus,
        reason: reason.trim(),
        changedBy: adminUserId,
      },
    });

    // 3. Write immutable AuditLog entry
    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: AuditAction.PROFILE_COMPLETED,
        ipAddress: ipAddress ?? null,
        metadata: {
          event: 'ADMIN_ATTENDANCE_CORRECTED',
          recordId,
          studentRecordId: existing.studentRecordId,
          oldStatus,
          newStatus,
          reason: reason.trim(),
        },
      },
    });

    return updated;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TRENDS & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export async function getAttendanceTrends(q: AdminAttendanceTrendsQuery) {
  const period = q.period || 'weekly';
  const where: any = {};
  if (q.departmentId) {
    where.attendanceSession = {
      classSession: { courseOffering: { course: { departmentId: q.departmentId } } },
    };
  }

  // Get past 30 days of records
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  where.markedAt = { gte: startDate };

  const records = await prisma.attendanceRecord.findMany({
    where,
    select: { markedAt: true, status: true },
    orderBy: { markedAt: 'asc' },
  });

  // Aggregate by date string
  const MapDate = new Map<string, { total: number; present: number }>();

  for (const r of records) {
    const dStr = r.markedAt.toISOString().split('T')[0]; // YYYY-MM-DD
    const cur = MapDate.get(dStr) || { total: 0, present: 0 };
    cur.total += 1;
    if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) {
      cur.present += 1;
    }
    MapDate.set(dStr, cur);
  }

  const trends = Array.from(MapDate.entries()).map(([date, val]) => ({
    date,
    total: val.total,
    present: val.present,
    rate: Math.round((val.present / val.total) * 100),
  }));

  // Department comparison
  const depts = await prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
  });

  const deptStats = await Promise.all(
    depts.map(async (d) => {
      const dRecords = await prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: {
          studentRecord: { departmentId: d.id },
        },
        _count: { _all: true },
      });

      let total = 0;
      let present = 0;
      for (const item of dRecords) {
        total += item._count._all;
        if (item.status === AttendanceStatus.PRESENT || item.status === AttendanceStatus.LATE) {
          present += item._count._all;
        }
      }

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        total,
        present,
        rate: total > 0 ? Math.round((present / total) * 100) : null,
      };
    })
  );

  return {
    period,
    trends,
    byDepartment: deptStats,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LOW ATTENDANCE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export async function getLowAttendanceStudents(q: AdminLowAttendanceQuery) {
  const page = Math.max(1, q.page || 1);
  const limit = Math.min(100, Math.max(1, q.limit || 20));
  const threshold = q.threshold ?? 75;

  const studentWhere: any = { status: 'ACTIVE' };
  if (q.departmentId) studentWhere.departmentId = q.departmentId;
  if (q.programId) studentWhere.programId = q.programId;

  if (q.search && q.search.trim()) {
    const s = q.search.trim();
    studentWhere.OR = [
      { studentId: { contains: s, mode: 'insensitive' } },
      { user: { fullName: { contains: s, mode: 'insensitive' } } },
      { user: { email: { contains: s, mode: 'insensitive' } } },
    ];
  }

  // Get all active students matching filters
  const students = await prisma.studentRecord.findMany({
    where: studentWhere,
    select: {
      id: true,
      studentId: true,
      user: { select: { fullName: true, email: true, phone: true } },
      department: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true } },
    },
  });

  const lowAttStudents = [];

  for (const s of students) {
    const attCounts = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { studentRecordId: s.id },
      _count: { _all: true },
    });

    let total = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    for (const item of attCounts) {
      total += item._count._all;
      if (item.status === AttendanceStatus.PRESENT) present = item._count._all;
      else if (item.status === AttendanceStatus.ABSENT) absent = item._count._all;
      else if (item.status === AttendanceStatus.LATE) late = item._count._all;
      else if (item.status === AttendanceStatus.EXCUSED) excused = item._count._all;
    }

    if (total >= 3) {
      const attended = present + late;
      const rate = Math.round((attended / total) * 100);
      if (rate < threshold) {
        lowAttStudents.push({
          student: s,
          totalSessions: total,
          present,
          absent,
          late,
          excused,
          attendanceRate: rate,
        });
      }
    }
  }

  // Sort lowest attendance rate first
  lowAttStudents.sort((a, b) => a.attendanceRate - b.attendanceRate);

  const totalItems = lowAttStudents.length;
  const paginated = lowAttStudents.slice((page - 1) * limit, page * limit);

  return {
    total: totalItems,
    page,
    limit,
    totalPages: Math.ceil(totalItems / limit),
    threshold,
    students: paginated,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. STUDENT ATTENDANCE DRILLDOWN
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentAttendanceDetail(studentId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      department: true,
      program: true,
      enrollments: {
        include: {
          courseOffering: {
            include: {
              course: true,
              instructor: { include: { user: { select: { fullName: true } } } },
            },
          },
        },
      },
    },
  });

  if (!student) throw new Error('Student record not found');

  const records = await prisma.attendanceRecord.findMany({
    where: { studentRecordId: studentId },
    orderBy: { markedAt: 'desc' },
    include: {
      attendanceSession: {
        include: {
          classSession: {
            include: {
              courseOffering: {
                include: { course: selectShortCourse() },
              },
            },
          },
        },
      },
    },
  });

  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;
  const total = records.length;

  for (const r of records) {
    if (r.status === AttendanceStatus.PRESENT) present++;
    else if (r.status === AttendanceStatus.ABSENT) absent++;
    else if (r.status === AttendanceStatus.LATE) late++;
    else if (r.status === AttendanceStatus.EXCUSED) excused++;
  }

  const overallRate = total > 0 ? Math.round(((present + late) / total) * 100) : null;

  // Course breakdown
  const courseBreakdown = await Promise.all(
    student.enrollments.map(async (e) => {
      const cRecords = await prisma.attendanceRecord.findMany({
        where: {
          studentRecordId: studentId,
          attendanceSession: { classSession: { courseOfferingId: e.courseOfferingId } },
        },
      });

      const cTotal = cRecords.length;
      const cPresent = cRecords.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
      const cAbsent = cRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
      const cRate = cTotal > 0 ? Math.round((cPresent / cTotal) * 100) : null;

      return {
        courseOfferingId: e.courseOfferingId,
        course: e.courseOffering.course,
        instructorName: e.courseOffering.instructor?.user.fullName ?? 'Unassigned',
        totalSessions: cTotal,
        present: cPresent,
        absent: cAbsent,
        rate: cRate,
      };
    })
  );

  return {
    student: {
      id: student.id,
      studentId: student.studentId,
      fullName: student.user.fullName,
      email: student.user.email,
      phone: student.user.phone,
      department: student.department,
      program: student.program,
    },
    overallRate,
    totalSessions: total,
    present,
    absent,
    late,
    excused,
    courseBreakdown,
    recentRecords: records.slice(0, 15).map((r) => ({
      id: r.id,
      status: r.status,
      method: r.method,
      markedAt: r.markedAt.toISOString(),
      note: r.note,
      course: r.attendanceSession.classSession.courseOffering.course,
      sessionDate: r.attendanceSession.classSession.date.toISOString(),
      sessionTitle: r.attendanceSession.classSession.topic ?? null,
    })),
  };
}

function selectShortCourse() {
  return { select: { id: true, name: true, code: true } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. COURSE ATTENDANCE DRILLDOWN
// ─────────────────────────────────────────────────────────────────────────────

export async function getCourseAttendanceDetail(courseOfferingId: string) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      course: { include: { department: true } },
      semester: { include: { academicYear: true } },
      instructor: { include: { user: { select: { fullName: true, email: true } } } },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          studentRecord: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      },
      classSessions: {
        include: {
          room: true,
          attendanceSession: {
            include: {
              records: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!offering) throw new Error('Course offering not found');

  const allRecords = await prisma.attendanceRecord.findMany({
    where: {
      attendanceSession: { classSession: { courseOfferingId } },
    },
  });

  const totalRecords = allRecords.length;
  const present = allRecords.filter((r) => r.status === AttendanceStatus.PRESENT).length;
  const absent = allRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
  const late = allRecords.filter((r) => r.status === AttendanceStatus.LATE).length;
  const excused = allRecords.filter((r) => r.status === AttendanceStatus.EXCUSED).length;
  const overallRate = totalRecords > 0 ? Math.round(((present + late) / totalRecords) * 100) : null;

  const studentList = await Promise.all(
    offering.enrollments.map(async (e) => {
      const sRecords = allRecords.filter((r) => r.studentRecordId === e.studentRecordId);
      const sTotal = sRecords.length;
      const sPresent = sRecords.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
      const sAbsent = sRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
      const sRate = sTotal > 0 ? Math.round((sPresent / sTotal) * 100) : null;

      return {
        studentId: e.studentRecord.id,
        customId: e.studentRecord.studentId,
        fullName: e.studentRecord.user.fullName,
        email: e.studentRecord.user.email,
        totalSessions: sTotal,
        present: sPresent,
        absent: sAbsent,
        rate: sRate,
      };
    })
  );

  return {
    offering: {
      id: offering.id,
      course: offering.course,
      department: offering.course.department,
      instructor: offering.instructor ? { id: offering.instructor.id, fullName: offering.instructor.user.fullName } : null,
      academicYear: offering.semester?.academicYear?.name ?? offering.semester?.name ?? '',
      semester: offering.semester?.name ?? '',
      section: offering.section,
      enrollmentCount: offering.enrollments.length,
    },
    overallRate,
    totalRecords,
    present,
    absent,
    late,
    excused,
    students: studentList,
    sessions: offering.classSessions.map((cs) => ({
      id: cs.id,
      date: cs.date.toISOString(),
      startTime: cs.startTime,
      endTime: cs.endTime,
      title: cs.topic ?? null,
      room: cs.room?.name ?? null,
      status: cs.attendanceSession?.lifecycle ?? 'NOT_STARTED',
      attendanceSession: cs.attendanceSession
        ? {
            id: cs.attendanceSession.id,
            lifecycle: cs.attendanceSession.lifecycle,
            recordsCount: cs.attendanceSession.records.length,
          }
        : null,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DEPARTMENT ATTENDANCE HIERARCHICAL DRILLDOWN
// ─────────────────────────────────────────────────────────────────────────────

export async function getDepartmentAttendanceAnalytics(queryDepartmentId?: string) {
  const departments = await prisma.department.findMany({
    where: {
      isActive: true,
      ...(queryDepartmentId ? { id: queryDepartmentId } : {}),
    },
    include: {
      programs: {
        where: { isActive: true },
        include: {
          studentRecords: {
            where: { status: 'ACTIVE' },
            select: { id: true },
          },
        },
      },
    },
  });

  const result = await Promise.all(
    departments.map(async (d) => {
      const dRecords = await prisma.attendanceRecord.findMany({
        where: { studentRecord: { departmentId: d.id } },
        select: { status: true },
      });

      const dTotal = dRecords.length;
      const dPresent = dRecords.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
      const dRate = dTotal > 0 ? Math.round((dPresent / dTotal) * 100) : null;

      const programData = await Promise.all(
        d.programs.map(async (p) => {
          const pRecords = await prisma.attendanceRecord.findMany({
            where: { studentRecord: { programId: p.id } },
            select: { status: true },
          });
          const pTotal = pRecords.length;
          const pPresent = pRecords.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
          const pRate = pTotal > 0 ? Math.round((pPresent / pTotal) * 100) : null;

          return {
            id: p.id,
            name: p.name,
            code: p.code,
            studentsCount: p.studentRecords.length,
            totalRecords: pTotal,
            rate: pRate,
          };
        })
      );

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        totalRecords: dTotal,
        rate: dRate,
        programs: programData,
      };
    })
  );

  return result;
}
