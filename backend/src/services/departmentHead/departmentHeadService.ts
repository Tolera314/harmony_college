/**
 * Harmony College — Department Head Service
 * ──────────────────────────────────────────
 * ALL department-scoped authorization is derived from the authenticated
 * user's DepartmentHeadRecord.departmentId.  Client-supplied IDs are
 * NEVER trusted for authorization decisions.
 */

import { prisma }              from '../../lib/prisma';
import { createNotification } from '../notificationService';
import {
  Role,
  OfferingStatus,
  LeaveStatus,
  DepartmentHeadAction,
  StudentStatus,
  EnrollmentStatus,
} from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve the HoD record or throw 403 */
export async function resolveHoD(userId: string) {
  const record = await prisma.departmentHeadRecord.findUnique({
    where:  { userId },
    select: { id: true, departmentId: true, isActive: true, title: true, employeeId: true },
  });
  if (!record || !record.isActive) {
    throw new Error('Not authorized: no active Department Head record found for this account.');
  }
  return record;
}

/** Ensure a CourseOffering belongs to the HoD's department */
async function verifyOfferingDept(offeringId: string, departmentId: string) {
  const offering = await prisma.courseOffering.findUnique({
    where:  { id: offeringId },
    select: { id: true, status: true, course: { select: { departmentId: true } } },
  });
  if (!offering) throw new Error('Course offering not found.');
  if (offering.course.departmentId !== departmentId) {
    throw new Error('Not authorized: this offering does not belong to your department.');
  }
  return offering;
}

/** Ensure a LeaveRequest belongs to faculty in the HoD's department */
async function verifyLeaveDept(leaveId: string, departmentId: string) {
  const req = await prisma.departmentLeaveRequest.findUnique({
    where:  { id: leaveId },
    select: { id: true, status: true, instructor: { select: { departmentId: true } } },
  });
  if (!req) throw new Error('Leave request not found.');
  if (req.instructor.departmentId !== departmentId) {
    throw new Error('Not authorized: this leave request does not belong to your department.');
  }
  return req;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const record = await resolveHoD(userId);

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id: true, fullName: true, email: true, phone: true,
      profileCompleted: true, createdAt: true,
      departmentHeadRecord: {
        select: {
          id: true, employeeId: true, title: true, isActive: true, createdAt: true,
          department: { select: { id: true, name: true, code: true, description: true } },
        },
      },
    },
  });
  if (!user) throw new Error('User not found.');
  return user;
}

export async function updateProfile(
  userId: string,
  data: { title?: string },
) {
  const record = await resolveHoD(userId);
  const updated = await prisma.departmentHeadRecord.update({
    where: { id: record.id },
    data:  { ...(data.title ? { title: data.title } : {}) },
    select: { id: true, title: true, employeeId: true },
  });

  await prisma.departmentHeadAuditLog.create({
    data: {
      userId,
      action:      DepartmentHeadAction.PROFILE_UPDATED,
      entityType:  'DepartmentHeadRecord',
      entityId:    record.id,
      description: 'Department Head profile updated.',
    },
  });
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD KPIs
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboard(userId: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const [
    activeFaculty,
    activeStudents,
    activeOfferings,
    pendingOfferings,
    pendingLeaves,
    totalCourses,
    recentNotifications,
    unreadCount,
  ] = await Promise.all([
    // Active faculty in department
    prisma.instructorRecord.count({
      where: { departmentId: deptId, isActive: true },
    }),
    // Active students in department
    prisma.studentRecord.count({
      where: { departmentId: deptId, status: StudentStatus.ACTIVE },
    }),
    // Active course offerings (current semester)
    prisma.courseOffering.count({
      where: {
        course: { departmentId: deptId },
        status: { in: [OfferingStatus.ACTIVE, OfferingStatus.SCHEDULED, OfferingStatus.INSTRUCTOR_ASSIGNED] },
        semester: { isCurrent: true },
      },
    }),
    // Pending approval offerings
    prisma.courseOffering.count({
      where: {
        course: { departmentId: deptId },
        status: OfferingStatus.DRAFT,
        semester: { isCurrent: true },
      },
    }),
    // Pending leave requests
    prisma.departmentLeaveRequest.count({
      where: {
        instructor: { departmentId: deptId },
        status: LeaveStatus.PENDING_DH,
      },
    }),
    // Total courses in department
    prisma.course.count({
      where: { departmentId: deptId },
    }),
    // Recent notifications for this user (last 10)
    prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    10,
      select:  { id: true, title: true, message: true, type: true, isRead: true, createdAt: true },
    }),
    // Unread notification count
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  // Department avg GPA
  const gpaAgg = await prisma.studentRecord.aggregate({
    where:   { departmentId: deptId, status: StudentStatus.ACTIVE },
    _avg:    { gpa: true },
    _count:  { id: true },
  });

  // Dept attendance average — compute from AttendanceRecords for dept students
  const attendanceData = await prisma.$queryRaw<{ rate: number }[]>`
    SELECT
      ROUND(
        100.0 * SUM(CASE WHEN ar.status = 'PRESENT' OR ar.status = 'LATE' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(ar.id), 0),
        1
      ) AS rate
    FROM "AttendanceRecord" ar
    INNER JOIN "AttendanceSession" ats ON ats.id = ar."attendanceSessionId"
    INNER JOIN "ClassSession" cs ON cs.id = ats."classSessionId"
    INNER JOIN "CourseOffering" co ON co.id = cs."courseOfferingId"
    INNER JOIN "Course" c ON c.id = co."courseId"
    INNER JOIN "StudentRecord" sr ON sr.id = ar."studentRecordId"
    WHERE sr."departmentId" = ${deptId}
  `;
  const attendanceRate = attendanceData[0]?.rate ?? 0;

  // Capacity utilization
  const capacityData = await prisma.courseOffering.aggregate({
    where: {
      course:   { departmentId: deptId },
      semester: { isCurrent: true },
      status:   { in: [OfferingStatus.ACTIVE, OfferingStatus.SCHEDULED, OfferingStatus.INSTRUCTOR_ASSIGNED] },
    },
    _sum: { capacity: true },
  });
  const enrolledData = await prisma.enrollment.count({
    where: {
      status:         EnrollmentStatus.ACTIVE,
      courseOffering: {
        course:   { departmentId: deptId },
        semester: { isCurrent: true },
        status:   { in: [OfferingStatus.ACTIVE, OfferingStatus.SCHEDULED, OfferingStatus.INSTRUCTOR_ASSIGNED] },
      },
    },
  });
  const totalCapacity = capacityData._sum.capacity ?? 0;
  const capacityUtilization = totalCapacity > 0
    ? Math.round((enrolledData / totalCapacity) * 100)
    : 0;

  // Enrollment trend (last 5 semesters)
  const enrollmentTrend = await prisma.$queryRaw<{ sem: string; count: bigint }[]>`
    SELECT
      s.name || ' ' || ay.name AS sem,
      COUNT(e.id) AS count
    FROM "Enrollment" e
    INNER JOIN "CourseOffering" co ON co.id = e."courseOfferingId"
    INNER JOIN "Course" c ON c.id = co."courseId"
    INNER JOIN "Semester" s ON s.id = co."semesterId"
    INNER JOIN "AcademicYear" ay ON ay.id = s."academicYearId"
    WHERE c."departmentId" = ${deptId}
      AND e.status != 'DROPPED'
    GROUP BY s.name, ay.name, s."startDate"
    ORDER BY s."startDate" DESC
    LIMIT 5
  `;

  return {
    department: { id: deptId },
    kpis: {
      activeFaculty,
      activeStudents,
      activeOfferings,
      pendingOfferings,
      pendingLeaves,
      totalCourses,
      avgGpa:            +(gpaAgg._avg.gpa ?? 0).toFixed(2),
      attendanceRate:    +Number(attendanceRate).toFixed(1),
      capacityUtilization,
    },
    enrollmentTrend: enrollmentTrend.map(r => ({
      semester: r.sem,
      count:    Number(r.count),
    })).reverse(),
    notifications:       recentNotifications,
    unreadNotifications: unreadCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE OFFERINGS
// ─────────────────────────────────────────────────────────────────────────────

export async function getCourseOfferings(
  userId: string,
  params: {
    page?: number; limit?: number; search?: string;
    status?: string; semesterId?: string;
  },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;
  const page  = params.page  ?? 1;
  const limit = params.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = {
    course: { departmentId: deptId },
  };

  if (params.status && params.status !== 'ALL') {
    where.status = params.status;
  }
  if (params.semesterId) {
    where.semesterId = params.semesterId;
  } else {
    // Default to current semester if not specified
    const currentSemester = await prisma.semester.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    });
    if (currentSemester) where.semesterId = currentSemester.id;
  }
  if (params.search) {
    where.OR = [
      { course: { code:    { contains: params.search, mode: 'insensitive' } } },
      { course: { name:    { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  const [total, offerings] = await Promise.all([
    prisma.courseOffering.count({ where }),
    prisma.courseOffering.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ status: 'asc' }, { course: { code: 'asc' } }],
      select: {
        id: true, status: true, capacity: true, section: true,
        createdAt: true, updatedAt: true,
        course: {
          select: {
            id: true, code: true, name: true, creditHours: true,
            prerequisites: {
              select: { prerequisite: { select: { code: true, name: true } } },
            },
          },
        },
        semester: {
          select: {
            id: true, name: true, isCurrent: true,
            academicYear: { select: { name: true } },
          },
        },
        instructor: {
          select: {
            id: true, title: true, employeeId: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        room: { select: { id: true, name: true, building: true, capacity: true } },
        timetables: {
          select: { dayOfWeek: true, startTime: true, endTime: true },
          orderBy: { dayOfWeek: 'asc' },
        },
        _count: { select: { enrollments: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    offerings:  offerings.map(o => ({
      ...o,
      enrolledCount:       o._count.enrollments,
      utilizationPct:      o.capacity > 0 ? Math.round((o._count.enrollments / o.capacity) * 100) : 0,
    })),
  };
}

export async function getCourseOfferingDetail(userId: string, offeringId: string) {
  const hod = await resolveHoD(userId);
  await verifyOfferingDept(offeringId, hod.departmentId);

  const offering = await prisma.courseOffering.findUnique({
    where:  { id: offeringId },
    select: {
      id: true, status: true, capacity: true, section: true,
      createdAt: true, updatedAt: true,
      course: {
        select: {
          id: true, code: true, name: true, creditHours: true, description: true, status: true,
          prerequisites: {
            select: { prerequisite: { select: { id: true, code: true, name: true } } },
          },
        },
      },
      semester: {
        select: {
          id: true, name: true, isCurrent: true, startDate: true, endDate: true,
          academicYear: { select: { name: true } },
        },
      },
      instructor: {
        select: {
          id: true, title: true, employeeId: true, specialization: true, isActive: true,
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
      room: { select: { id: true, name: true, building: true, capacity: true } },
      timetables: {
        select: { dayOfWeek: true, startTime: true, endTime: true },
        orderBy: { dayOfWeek: 'asc' },
      },
      enrollments: {
        where:  { status: EnrollmentStatus.ACTIVE },
        take:   10,
        select: {
          id: true, status: true, enrolledAt: true,
          studentRecord: {
            select: {
              id: true, studentId: true, gpa: true, yearLevel: true,
              user: { select: { fullName: true } },
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });
  if (!offering) throw new Error('Course offering not found.');

  return {
    ...offering,
    enrolledCount:   offering._count.enrollments,
    utilizationPct:  offering.capacity > 0
      ? Math.round((offering._count.enrollments / offering.capacity) * 100)
      : 0,
  };
}

export async function approveOffering(
  userId: string,
  offeringId: string,
  ipAddress?: string,
) {
  const hod = await resolveHoD(userId);
  const existing = await verifyOfferingDept(offeringId, hod.departmentId);

  if (existing.status !== OfferingStatus.DRAFT) {
    throw new Error(`Cannot approve: offering is currently "${existing.status}", not DRAFT.`);
  }

  const [updated] = await prisma.$transaction([
    prisma.courseOffering.update({
      where: { id: offeringId },
      data:  { status: OfferingStatus.INSTRUCTOR_ASSIGNED },
      select: { id: true, status: true },
    }),
    prisma.departmentHeadAuditLog.create({
      data: {
        userId,
        action:      DepartmentHeadAction.OFFERING_APPROVED,
        entityType:  'CourseOffering',
        entityId:    offeringId,
        description: `Course offering approved by Department Head.`,
        metadata:    { previousStatus: existing.status, newStatus: OfferingStatus.INSTRUCTOR_ASSIGNED },
        ipAddress:   ipAddress ?? null,
      },
    }),
  ]);

  // Notify the DH actor — socket push so it lands immediately in their notification panel
  createNotification({
    userId,
    title:     'Course Offering Approved',
    message:   `You approved a course offering (ID: ${offeringId}).`,
    type:      'SUCCESS',
    actionTab: 'approvals',
  }).catch(() => {});
  return updated;
}

export async function rejectOffering(
  userId: string,
  offeringId: string,
  reason: string,
  ipAddress?: string,
) {
  const hod = await resolveHoD(userId);
  const existing = await verifyOfferingDept(offeringId, hod.departmentId);

  if (existing.status !== OfferingStatus.DRAFT) {
    throw new Error(`Cannot reject: offering is currently "${existing.status}", not DRAFT.`);
  }

  const [updated] = await prisma.$transaction([
    prisma.courseOffering.update({
      where: { id: offeringId },
      data:  { status: OfferingStatus.CANCELLED },
      select: { id: true, status: true },
    }),
    prisma.departmentHeadAuditLog.create({
      data: {
        userId,
        action:      DepartmentHeadAction.OFFERING_REJECTED,
        entityType:  'CourseOffering',
        entityId:    offeringId,
        description: `Course offering rejected by Department Head. Reason: ${reason}`,
        metadata:    { previousStatus: existing.status, newStatus: OfferingStatus.CANCELLED, reason },
        ipAddress:   ipAddress ?? null,
      },
    }),
  ]);

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACULTY
// ─────────────────────────────────────────────────────────────────────────────

export async function getFaculty(
  userId: string,
  params: { page?: number; limit?: number; search?: string; isActive?: boolean },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;
  const page  = params.page  ?? 1;
  const limit = params.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = { departmentId: deptId };
  if (params.isActive !== undefined) where.isActive = params.isActive;
  if (params.search) {
    where.OR = [
      { user: { fullName: { contains: params.search, mode: 'insensitive' } } },
      { specialization: { contains: params.search, mode: 'insensitive' } },
      { employeeId:     { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [total, faculty] = await Promise.all([
    prisma.instructorRecord.count({ where }),
    prisma.instructorRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { user: { fullName: 'asc' } },
      select: {
        id: true, employeeId: true, title: true, specialization: true, isActive: true, createdAt: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        _count: {
          select: {
            offerings: {
              where: { semester: { isCurrent: true } },
            },
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    faculty:    faculty.map(f => ({
      id:             f.id,
      employeeId:     f.employeeId,
      title:          f.title,
      specialization: f.specialization,
      isActive:       f.isActive,
      joinedAt:       f.createdAt,
      fullName:       f.user.fullName,
      email:          f.user.email,
      phone:          f.user.phone,
      currentOfferings: f._count.offerings,
    })),
  };
}

export async function getFacultyDetail(userId: string, instructorId: string) {
  const hod = await resolveHoD(userId);

  const instructor = await prisma.instructorRecord.findUnique({
    where:  { id: instructorId },
    select: {
      id: true, employeeId: true, title: true, specialization: true, isActive: true,
      departmentId: true, createdAt: true,
      user: { select: { fullName: true, email: true, phone: true } },
      offerings: {
        where: { semester: { isCurrent: true } },
        select: {
          id: true, status: true, capacity: true, section: true,
          course: { select: { code: true, name: true, creditHours: true } },
          timetables: {
            select: { dayOfWeek: true, startTime: true, endTime: true },
            orderBy: { dayOfWeek: 'asc' },
          },
          _count: { select: { enrollments: true } },
        },
      },
      leaveRequests: {
        orderBy: { createdAt: 'desc' },
        take:    5,
        select: {
          id: true, leaveType: true, status: true, startDate: true,
          endDate: true, durationDays: true, createdAt: true,
        },
      },
    },
  });
  if (!instructor) throw new Error('Instructor not found.');
  if (instructor.departmentId !== hod.departmentId) {
    throw new Error('Not authorized: this instructor does not belong to your department.');
  }

  return instructor;
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudents(
  userId: string,
  params: {
    page?: number; limit?: number; search?: string;
    yearLevel?: number; status?: string; standing?: string;
  },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;
  const page  = params.page  ?? 1;
  const limit = params.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = { departmentId: deptId };
  if (params.status && params.status !== 'ALL') where.status = params.status;
  if (params.yearLevel) where.yearLevel = params.yearLevel;
  if (params.search) {
    where.OR = [
      { user:    { fullName: { contains: params.search, mode: 'insensitive' } } },
      { studentId: { contains: params.search, mode: 'insensitive' } },
      { program:   { name: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  const [total, students] = await Promise.all([
    prisma.studentRecord.count({ where }),
    prisma.studentRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { user: { fullName: 'asc' } },
      select: {
        id: true, studentId: true, yearLevel: true, gpa: true,
        totalCredits: true, status: true, admittedAt: true,
        user:    { select: { fullName: true, email: true } },
        program: { select: { id: true, name: true, code: true, totalCredits: true } },
        _count:  { select: { enrollments: true } },
      },
    }),
  ]);

  // Compute attendance rates per student in one query
  const studentIds = students.map(s => s.id);
  const attRates = studentIds.length > 0
    ? await prisma.$queryRaw<{ sr_id: string; rate: number }[]>`
        SELECT
          ar."studentRecordId" AS sr_id,
          ROUND(
            100.0 * SUM(CASE WHEN ar.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)
            / NULLIF(COUNT(ar.id), 0),
            1
          ) AS rate
        FROM "AttendanceRecord" ar
        WHERE ar."studentRecordId" = ANY(${studentIds})
        GROUP BY ar."studentRecordId"
      `
    : [];

  const attMap = new Map(attRates.map(r => [r.sr_id, +Number(r.rate).toFixed(1)]));

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    students:   students.map(s => ({
      id:              s.id,
      studentId:       s.studentId,
      fullName:        s.user.fullName,
      email:           s.user.email,
      program:         s.program,
      yearLevel:       s.yearLevel,
      gpa:             s.gpa,
      totalCredits:    s.totalCredits,
      status:          s.status,
      attendanceRate:  attMap.get(s.id) ?? null,
      activeEnrollments: s._count.enrollments,
    })),
  };
}

export async function getStudentDetail(userId: string, studentRecordId: string) {
  const hod = await resolveHoD(userId);

  const student = await prisma.studentRecord.findUnique({
    where:  { id: studentRecordId },
    select: {
      id: true, studentId: true, yearLevel: true, gpa: true,
      totalCredits: true, status: true, admittedAt: true,
      departmentId: true,
      user:    { select: { fullName: true, email: true, phone: true } },
      program: { select: { id: true, name: true, code: true, totalCredits: true } },
      enrollments: {
        where:   { status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] } },
        orderBy: { enrolledAt: 'desc' },
        take:    20,
        select:  {
          id: true, status: true, enrolledAt: true,
          courseOffering: {
            select: {
              id: true, section: true, status: true,
              course:   { select: { code: true, name: true, creditHours: true } },
              semester: { select: { name: true, academicYear: { select: { name: true } } } },
            },
          },
          grade: { select: { letterGrade: true, gradePoints: true, creditHours: true, gradedAt: true } },
        },
      },
    },
  });
  if (!student) throw new Error('Student not found.');
  if (student.departmentId !== hod.departmentId) {
    throw new Error('Not authorized: this student does not belong to your department.');
  }

  // Attendance summary
  const attendanceSummary = await prisma.$queryRaw<{
    total: bigint; present: bigint; absent: bigint; late: bigint; excused: bigint;
  }[]>`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN ar.status = 'ABSENT'  THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN ar.status = 'LATE'    THEN 1 ELSE 0 END) AS late,
      SUM(CASE WHEN ar.status = 'EXCUSED' THEN 1 ELSE 0 END) AS excused
    FROM "AttendanceRecord" ar
    WHERE ar."studentRecordId" = ${studentRecordId}
  `;
  const att = attendanceSummary[0];
  const total   = Number(att?.total   ?? 0);
  const present = Number(att?.present ?? 0);
  const late    = Number(att?.late    ?? 0);

  return {
    ...student,
    attendance: {
      total,
      present:         Number(att?.present ?? 0),
      absent:          Number(att?.absent  ?? 0),
      late,
      excused:         Number(att?.excused ?? 0),
      rate:            total > 0 ? +((present + late) / total * 100).toFixed(1) : null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getEnrollmentReport(userId: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const [byCourse, byProgram, trend] = await Promise.all([
    // Enrollment by course (current semester)
    prisma.$queryRaw<{ code: string; name: string; enrolled: bigint; capacity: bigint; pct: number }[]>`
      SELECT
        c.code, c.name,
        COUNT(e.id) AS enrolled,
        SUM(co.capacity) AS capacity,
        ROUND(100.0 * COUNT(e.id) / NULLIF(SUM(co.capacity), 0), 1) AS pct
      FROM "CourseOffering" co
      INNER JOIN "Course" c    ON c.id = co."courseId"
      INNER JOIN "Semester" s  ON s.id = co."semesterId" AND s."isCurrent" = true
      LEFT  JOIN "Enrollment" e ON e."courseOfferingId" = co.id AND e.status != 'DROPPED'
      WHERE c."departmentId" = ${deptId}
      GROUP BY c.code, c.name
      ORDER BY enrolled DESC
    `,
    // Enrollment by program
    prisma.$queryRaw<{ prog: string; count: bigint }[]>`
      SELECT p.name AS prog, COUNT(sr.id) AS count
      FROM "StudentRecord" sr
      INNER JOIN "Program" p ON p.id = sr."programId"
      WHERE sr."departmentId" = ${deptId}
        AND sr.status = 'ACTIVE'
      GROUP BY p.name
      ORDER BY count DESC
    `,
    // Enrollment trend (last 6 semesters)
    prisma.$queryRaw<{ sem: string; count: bigint }[]>`
      SELECT s.name || ' ' || ay.name AS sem, COUNT(e.id) AS count
      FROM "Enrollment" e
      INNER JOIN "CourseOffering" co ON co.id  = e."courseOfferingId"
      INNER JOIN "Course" c ON c.id = co."courseId"
      INNER JOIN "Semester" s ON s.id = co."semesterId"
      INNER JOIN "AcademicYear" ay ON ay.id = s."academicYearId"
      WHERE c."departmentId" = ${deptId} AND e.status != 'DROPPED'
      GROUP BY s.name, ay.name, s."startDate"
      ORDER BY s."startDate" DESC
      LIMIT 6
    `,
  ]);

  return {
    byCourse:  byCourse.map(r => ({ ...r, enrolled: Number(r.enrolled), capacity: Number(r.capacity) })),
    byProgram: byProgram.map(r => ({ program: r.prog, count: Number(r.count) })),
    trend:     trend.map(r => ({ semester: r.sem, count: Number(r.count) })).reverse(),
  };
}

export async function getAttendanceReport(userId: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const [byCourse, lowStudents, weeklyTrend] = await Promise.all([
    // Attendance rate by course
    prisma.$queryRaw<{ code: string; name: string; total: bigint; present: bigint; rate: number }[]>`
      SELECT
        c.code, c.name,
        COUNT(ar.id) AS total,
        SUM(CASE WHEN ar.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END) AS present,
        ROUND(100.0 * SUM(CASE WHEN ar.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 1) AS rate
      FROM "AttendanceRecord" ar
      INNER JOIN "AttendanceSession" ats ON ats.id = ar."attendanceSessionId"
      INNER JOIN "ClassSession" cs ON cs.id = ats."classSessionId"
      INNER JOIN "CourseOffering" co ON co.id = cs."courseOfferingId"
      INNER JOIN "Course" c ON c.id = co."courseId"
      INNER JOIN "Semester" s ON s.id = co."semesterId" AND s."isCurrent" = true
      WHERE c."departmentId" = ${deptId}
      GROUP BY c.code, c.name
      ORDER BY rate ASC
    `,
    // Low-attendance students (< 80%)
    prisma.$queryRaw<{ sr_id: string; name: string; student_id: string; rate: number }[]>`
      SELECT
        sr.id AS sr_id,
        u."fullName" AS name,
        sr."studentId" AS student_id,
        ROUND(100.0 * SUM(CASE WHEN ar.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 1) AS rate
      FROM "AttendanceRecord" ar
      INNER JOIN "StudentRecord" sr ON sr.id = ar."studentRecordId"
      INNER JOIN "User" u ON u.id = sr."userId"
      WHERE sr."departmentId" = ${deptId}
      GROUP BY sr.id, u."fullName", sr."studentId"
      HAVING ROUND(100.0 * SUM(CASE WHEN ar.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 1) < 80
      ORDER BY rate ASC
      LIMIT 20
    `,
    // Weekly trend (last 8 weeks) — simplified date bucketing
    prisma.$queryRaw<{ week: string; rate: number }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('week', cs.date), 'Mon DD') AS week,
        ROUND(100.0 * SUM(CASE WHEN ar.status IN ('PRESENT','LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 1) AS rate
      FROM "AttendanceRecord" ar
      INNER JOIN "AttendanceSession" ats ON ats.id = ar."attendanceSessionId"
      INNER JOIN "ClassSession" cs ON cs.id = ats."classSessionId"
      INNER JOIN "CourseOffering" co ON co.id = cs."courseOfferingId"
      INNER JOIN "Course" c ON c.id = co."courseId"
      INNER JOIN "StudentRecord" sr ON sr.id = ar."studentRecordId"
      WHERE sr."departmentId" = ${deptId}
        AND cs.date >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', cs.date)
      ORDER BY DATE_TRUNC('week', cs.date) ASC
    `,
  ]);

  return {
    byCourse:    byCourse.map(r => ({ ...r, total: Number(r.total), present: Number(r.present) })),
    lowStudents: lowStudents.map(r => ({ id: r.sr_id, name: r.name, studentId: r.student_id, rate: +Number(r.rate).toFixed(1) })),
    weeklyTrend: weeklyTrend.map(r => ({ week: r.week, rate: +Number(r.rate).toFixed(1) })),
  };
}

export async function getPerformanceReport(userId: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const [avgGpa, gpaByProgram, gradeDist, atRisk] = await Promise.all([
    // Overall dept GPA
    prisma.studentRecord.aggregate({
      where: { departmentId: deptId, status: StudentStatus.ACTIVE },
      _avg:  { gpa: true },
    }),
    // GPA by program
    prisma.$queryRaw<{ prog: string; avg_gpa: number; count: bigint }[]>`
      SELECT p.name AS prog, ROUND(AVG(sr.gpa)::numeric, 2) AS avg_gpa, COUNT(sr.id) AS count
      FROM "StudentRecord" sr
      INNER JOIN "Program" p ON p.id = sr."programId"
      WHERE sr."departmentId" = ${deptId} AND sr.status = 'ACTIVE'
      GROUP BY p.name
      ORDER BY avg_gpa DESC
    `,
    // Grade distribution
    prisma.$queryRaw<{ letter: string; count: bigint }[]>`
      SELECT cg."letterGrade" AS letter, COUNT(*) AS count
      FROM "CourseGrade" cg
      INNER JOIN "StudentRecord" sr ON sr.id = cg."studentRecordId"
      WHERE sr."departmentId" = ${deptId} AND cg."letterGrade" IS NOT NULL
      GROUP BY cg."letterGrade"
      ORDER BY count DESC
    `,
    // At-risk students (GPA < 2.0)
    prisma.studentRecord.count({
      where: { departmentId: deptId, status: StudentStatus.ACTIVE, gpa: { lt: 2.0 } },
    }),
  ]);

  return {
    avgGpa:       +(avgGpa._avg.gpa ?? 0).toFixed(2),
    gpaByProgram: gpaByProgram.map(r => ({ program: r.prog, avgGpa: +Number(r.avg_gpa).toFixed(2), count: Number(r.count) })),
    gradeDist:    gradeDist.map(r => ({ grade: r.letter, count: Number(r.count) })),
    atRiskCount:  atRisk,
  };
}

export async function getWorkloadReport(userId: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const workload = await prisma.$queryRaw<{
    instr_id: string; name: string; emp_id: string; offerings: bigint; enrolled: bigint;
  }[]>`
    SELECT
      ir.id AS instr_id,
      u."fullName" AS name,
      ir."employeeId" AS emp_id,
      COUNT(DISTINCT co.id) AS offerings,
      COUNT(DISTINCT e.id) AS enrolled
    FROM "InstructorRecord" ir
    INNER JOIN "User" u ON u.id = ir."userId"
    LEFT  JOIN "CourseOffering" co ON co."instructorId" = ir.id
      AND co."semesterId" IN (SELECT id FROM "Semester" WHERE "isCurrent" = true)
    LEFT  JOIN "Enrollment" e ON e."courseOfferingId" = co.id AND e.status = 'ACTIVE'
    WHERE ir."departmentId" = ${deptId} AND ir."isActive" = true
    GROUP BY ir.id, u."fullName", ir."employeeId"
    ORDER BY offerings DESC
  `;

  return workload.map(r => ({
    instructorId: r.instr_id,
    fullName:     r.name,
    employeeId:   r.emp_id,
    offerings:    Number(r.offerings),
    enrolled:     Number(r.enrolled),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getLeaveRequests(
  userId: string,
  params: { page?: number; limit?: number; status?: string; search?: string },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;
  const page  = params.page  ?? 1;
  const limit = params.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = { instructor: { departmentId: deptId } };
  if (params.status && params.status !== 'ALL') where.status = params.status;
  if (params.search) {
    where.instructor = {
      ...where.instructor,
      user: { fullName: { contains: params.search, mode: 'insensitive' } },
    };
  }

  const [total, requests] = await Promise.all([
    prisma.departmentLeaveRequest.count({ where }),
    prisma.departmentLeaveRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, leaveType: true, startDate: true, endDate: true,
        durationDays: true, reason: true, supportingDocUrl: true,
        status: true, dhComment: true, dhReviewedAt: true,
        hrComment: true, hrReviewedAt: true,
        createdAt: true, updatedAt: true,
        instructor: {
          select: {
            id: true, employeeId: true, title: true, specialization: true,
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    requests,
  };
}

export async function approveLeave(
  userId: string,
  leaveId: string,
  comment?: string,
  ipAddress?: string,
) {
  const hod = await resolveHoD(userId);
  const existing = await verifyLeaveDept(leaveId, hod.departmentId);

  if (existing.status !== LeaveStatus.PENDING_DH) {
    throw new Error(`Cannot approve: request is currently "${existing.status}".`);
  }

  const [updated] = await prisma.$transaction([
    prisma.departmentLeaveRequest.update({
      where: { id: leaveId },
      data:  {
        status:         LeaveStatus.DH_APPROVED,
        reviewedByDhId: hod.id,
        dhComment:      comment ?? null,
        dhReviewedAt:   new Date(),
      },
      select: { id: true, status: true },
    }),
    prisma.departmentHeadAuditLog.create({
      data: {
        userId,
        action:      DepartmentHeadAction.LEAVE_APPROVED,
        entityType:  'DepartmentLeaveRequest',
        entityId:    leaveId,
        description: `Faculty leave request approved by Department Head.${comment ? ` Comment: ${comment}` : ''}`,
        metadata:    { previousStatus: existing.status, newStatus: LeaveStatus.DH_APPROVED, comment },
        ipAddress:   ipAddress ?? null,
      },
    }),
  ]);

  return updated;
}

export async function rejectLeave(
  userId: string,
  leaveId: string,
  reason: string,
  ipAddress?: string,
) {
  const hod = await resolveHoD(userId);
  const existing = await verifyLeaveDept(leaveId, hod.departmentId);

  if (existing.status !== LeaveStatus.PENDING_DH) {
    throw new Error(`Cannot reject: request is currently "${existing.status}".`);
  }

  const [updated] = await prisma.$transaction([
    prisma.departmentLeaveRequest.update({
      where: { id: leaveId },
      data:  {
        status:         LeaveStatus.DH_REJECTED,
        reviewedByDhId: hod.id,
        dhComment:      reason,
        dhReviewedAt:   new Date(),
      },
      select: { id: true, status: true },
    }),
    prisma.departmentHeadAuditLog.create({
      data: {
        userId,
        action:      DepartmentHeadAction.LEAVE_REJECTED,
        entityType:  'DepartmentLeaveRequest',
        entityId:    leaveId,
        description: `Faculty leave request rejected by Department Head. Reason: ${reason}`,
        metadata:    { previousStatus: existing.status, newStatus: LeaveStatus.DH_REJECTED, reason },
        ipAddress:   ipAddress ?? null,
      },
    }),
  ]);

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getNotifications(
  userId: string,
  params: { page?: number; limit?: number; unreadOnly?: boolean },
) {
  const page  = params.page  ?? 1;
  const limit = params.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = { userId };
  if (params.unreadOnly) where.isRead = false;

  const [total, notifications, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select:  {
        id: true, title: true, message: true, type: true,
        isRead: true, entityType: true, entityId: true, createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount, notifications };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif) throw new Error('Notification not found.');
  if (notif.userId !== userId) throw new Error('Not authorized.');
  return prisma.notification.update({
    where: { id: notificationId },
    data:  { isRead: true },
    select: { id: true, isRead: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  });
  return { updatedCount: result.count };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuditLog(
  userId: string,
  params: { page?: number; limit?: number; search?: string; action?: string },
) {
  await resolveHoD(userId);
  const page  = params.page  ?? 1;
  const limit = params.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = { userId };
  if (params.action && params.action !== 'ALL') where.action = params.action;
  if (params.search) {
    where.OR = [
      { description: { contains: params.search, mode: 'insensitive' } },
      { entityType:  { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.departmentHeadAuditLog.count({ where }),
    prisma.departmentHeadAuditLog.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select:  {
        id: true, action: true, entityType: true, entityId: true,
        description: true, metadata: true, ipAddress: true, createdAt: true,
        user: { select: { fullName: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), logs };
}
