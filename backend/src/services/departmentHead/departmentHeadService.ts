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
    totalPrograms,
    totalClasses,
    recentNotifications,
    unreadCount,
    deptRecord,
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
    // Active programs in department
    prisma.program.count({
      where: { departmentId: deptId, isActive: true },
    }),
    // Total classes / sections in department
    prisma.courseOffering.count({
      where: { course: { departmentId: deptId } },
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
    // Department details
    prisma.department.findUnique({
      where:  { id: deptId },
      select: { id: true, name: true, code: true, programType: true },
    }),
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
    department: deptRecord || { id: deptId, name: 'Department', code: 'DEP' },
    kpis: {
      activeFaculty,
      activeStudents,
      activeOfferings,
      pendingOfferings,
      pendingLeaves,
      totalCourses,
      totalPrograms,
      totalClasses,
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
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data:  { isRead: true },
  });
  if (result.count === 0) throw new Error('Notification not found.');
  return { id: notificationId, isRead: true };
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

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function getPrograms(userId: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const programs = await prisma.program.findMany({
    where:   { departmentId: deptId },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      _count: {
        select: {
          studentRecords: true,
          courses:        true,
        },
      },
    },
  });

  return programs.map((p) => ({
    id:            p.id,
    name:          p.name,
    code:          p.code,
    description:   p.description,
    durationYears: p.durationYears,
    totalCredits:  p.totalCredits,
    isActive:      p.isActive,
    studentCount:  p._count.studentRecords,
    courseCount:   p._count.courses,
    createdAt:     p.createdAt,
  }));
}

export async function createProgram(
  userId: string,
  data: { name: string; code: string; description?: string; durationYears?: number; totalCredits?: number },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const codeUpper = data.code.trim().toUpperCase();
  const nameTrim  = data.name.trim();

  const existing = await prisma.program.findFirst({
    where: { OR: [{ code: codeUpper }, { name: nameTrim, departmentId: deptId }] },
  });
  if (existing) {
    throw new Error('A program with this name or code already exists.');
  }

  const program = await prisma.program.create({
    data: {
      name:          nameTrim,
      code:          codeUpper,
      description:   data.description?.trim() || null,
      durationYears: data.durationYears ?? 4,
      totalCredits:  data.totalCredits ?? 120,
      departmentId:  deptId,
      isActive:      true,
    },
  });

  return program;
}

export async function updateProgram(
  userId: string,
  programId: string,
  data: { name?: string; code?: string; description?: string; durationYears?: number; totalCredits?: number; isActive?: boolean },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) throw new Error('Program not found.');
  if (program.departmentId !== deptId) {
    throw new Error('Not authorized: program does not belong to your department.');
  }

  if (data.code && data.code.trim().toUpperCase() !== program.code) {
    const conflict = await prisma.program.findUnique({ where: { code: data.code.trim().toUpperCase() } });
    if (conflict) throw new Error('A program with this code already exists.');
  }

  const updated = await prisma.program.update({
    where: { id: programId },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.durationYears ? { durationYears: data.durationYears } : {}),
      ...(data.totalCredits ? { totalCredits: data.totalCredits } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });

  return updated;
}

export async function toggleProgramStatus(userId: string, programId: string) {
  const hod = await resolveHoD(userId);
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) throw new Error('Program not found.');
  if (program.departmentId !== hod.departmentId) {
    throw new Error('Not authorized: program does not belong to your department.');
  }

  return prisma.program.update({
    where: { id: programId },
    data:  { isActive: !program.isActive },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────

export async function getCourses(
  userId: string,
  params: { search?: string; status?: string; programType?: string },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const where: any = { departmentId: deptId };
  if (params.status && params.status !== 'ALL') {
    where.status = params.status;
  }
  if (params.programType && params.programType !== 'ALL') {
    where.programType = params.programType;
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { code: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: [{ code: 'asc' }],
    include: {
      _count: {
        select: {
          offerings: true,
        },
      },
    },
  });

  return courses.map((c) => ({
    id:          c.id,
    code:        c.code,
    name:        c.name,
    description: c.description,
    creditHours: c.creditHours,
    ects:        c.ects,
    status:      c.status,
    programType: c.programType,
    sectionsCount: c._count.offerings,
    createdAt:   c.createdAt,
  }));
}

export async function createCourse(
  userId: string,
  data: { code: string; name: string; description?: string; creditHours?: number; ects?: number; programType?: string },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const codeUpper = data.code.trim().toUpperCase();
  const nameTrim  = data.name.trim();

  const existing = await prisma.course.findFirst({
    where: { code: codeUpper, departmentId: deptId },
  });
  if (existing) {
    throw new Error('A course with this code already exists in your department.');
  }

  const course = await prisma.course.create({
    data: {
      code:         codeUpper,
      name:         nameTrim,
      description:  data.description?.trim() || null,
      creditHours:  data.creditHours ?? 3,
      ects:         data.ects ?? 4,
      programType:  (data.programType as any) || 'TVET',
      departmentId: deptId,
      status:       'ACTIVE',
    },
  });

  return course;
}

export async function updateCourse(
  userId: string,
  courseId: string,
  data: { code?: string; name?: string; description?: string; creditHours?: number; ects?: number; status?: string },
) {
  const hod = await resolveHoD(userId);
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error('Course not found.');
  if (course.departmentId !== hod.departmentId) {
    throw new Error('Not authorized: course does not belong to your department.');
  }

  if (data.code && data.code.trim().toUpperCase() !== course.code) {
    const conflict = await prisma.course.findFirst({
      where: { code: data.code.trim().toUpperCase(), departmentId: hod.departmentId, id: { not: courseId } },
    });
    if (conflict) throw new Error('A course with this code already exists in your department.');
  }

  return prisma.course.update({
    where: { id: courseId },
    data: {
      ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.creditHours ? { creditHours: data.creditHours } : {}),
      ...(data.ects ? { ects: data.ects } : {}),
      ...(data.status ? { status: data.status as any } : {}),
    },
  });
}

export async function toggleCourseStatus(userId: string, courseId: string) {
  const hod = await resolveHoD(userId);
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error('Course not found.');
  if (course.departmentId !== hod.departmentId) {
    throw new Error('Not authorized: course does not belong to your department.');
  }

  const nextStatus = course.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return prisma.course.update({
    where: { id: courseId },
    data:  { status: nextStatus as any },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTORS & WORKLOAD MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function getInstructors(
  userId: string,
  params: { search?: string; isActive?: boolean },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const where: any = { departmentId: deptId };
  if (params.isActive !== undefined) where.isActive = params.isActive;
  if (params.search) {
    where.user = {
      OR: [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email:    { contains: params.search, mode: 'insensitive' } },
      ],
    };
  }

  const instructors = await prisma.instructorRecord.findMany({
    where,
    orderBy: { user: { fullName: 'asc' } },
    include: {
      user: {
        select: {
          id: true, fullName: true, email: true, phone: true,
        },
      },
      offerings: {
        where: {
          semester: { isCurrent: true },
        },
        include: {
          course: {
            select: { id: true, name: true, code: true, ects: true, creditHours: true },
          },
          _count: {
            select: { enrollments: true },
          },
        },
      },
    },
  });

  return instructors.map((inst) => {
    const totalEcts = inst.offerings.reduce((sum, o) => sum + (o.course.ects || 0), 0);
    const totalCredits = inst.offerings.reduce((sum, o) => sum + (o.course.creditHours || 0), 0);
    const totalStudents = inst.offerings.reduce((sum, o) => sum + (o._count?.enrollments || 0), 0);

    return {
      id:             inst.id,
      userId:         inst.user.id,
      name:           inst.user.fullName,
      email:          inst.user.email,
      phone:          inst.user.phone,
      employeeId:     inst.employeeId,
      title:          inst.title,
      specialization: inst.specialization,
      isActive:       inst.isActive,
      workload: {
        activeSectionsCount: inst.offerings.length,
        totalEcts,
        totalCredits,
        totalStudents,
      },
      currentOfferings: inst.offerings.map((o) => ({
        offeringId:  o.id,
        courseCode:  o.course.code,
        courseName:  o.course.name,
        section:     o.section,
        enrollments: o._count.enrollments,
      })),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSES & SECTIONS (CourseOfferings)
// ─────────────────────────────────────────────────────────────────────────────

export async function getClasses(
  userId: string,
  params: { semesterId?: string; courseId?: string; search?: string },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const where: any = {
    course: { departmentId: deptId },
  };
  if (params.semesterId && params.semesterId !== 'ALL') {
    where.semesterId = params.semesterId;
  } else if (!params.semesterId) {
    // default to current semester if available
    where.semester = { isCurrent: true };
  }
  if (params.courseId) where.courseId = params.courseId;
  if (params.search) {
    where.course = {
      ...where.course,
      OR: [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ],
    };
  }

  const offerings = await prisma.courseOffering.findMany({
    where,
    orderBy: [{ course: { code: 'asc' } }, { section: 'asc' }],
    include: {
      course:     { select: { id: true, code: true, name: true, ects: true, creditHours: true, programType: true } },
      semester:   { select: { id: true, name: true, isCurrent: true, academicYear: { select: { name: true } } } },
      room:       { select: { id: true, name: true, building: true, capacity: true } },
      instructor: {
        select: {
          id: true, employeeId: true, title: true,
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
      timetables: {
        select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
      },
      _count: {
        select: {
          enrollments: true,
          classSessions: true,
        },
      },
    },
  });

  return offerings.map((o) => ({
    id:                   o.id,
    courseId:             o.course.id,
    courseCode:           o.course.code,
    courseName:           o.course.name,
    ects:                 o.course.ects,
    creditHours:          o.course.creditHours,
    programType:          o.programType,
    shortProgramDuration: o.shortProgramDuration,
    section:              o.section,
    capacity:             o.capacity,
    enrolledCount:        o._count.enrollments,
    status:               o.status,
    semester: {
      id:           o.semester.id,
      name:         o.semester.name,
      academicYear: o.semester.academicYear.name,
      isCurrent:    o.semester.isCurrent,
    },
    room: o.room ? {
      id:       o.room.id,
      name:     o.room.name,
      building: o.room.building,
      capacity: o.room.capacity,
    } : null,
    instructor: o.instructor ? {
      id:         o.instructor.id,
      name:       o.instructor.user.fullName,
      email:      o.instructor.user.email,
      employeeId: o.instructor.employeeId,
      title:      o.instructor.title,
    } : null,
    timetables: o.timetables,
    sessionsCount: o._count.classSessions,
  }));
}

export async function createClassSection(
  userId: string,
  data: {
    courseId: string;
    semesterId: string;
    section: string;
    capacity?: number;
    roomId?: string;
    instructorId?: string;
  },
) {
  const hod = await resolveHoD(userId);
  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course) throw new Error('Course not found.');
  if (course.departmentId !== hod.departmentId) {
    throw new Error('Not authorized: course does not belong to your department.');
  }

  const sectionUpper = data.section.trim().toUpperCase() || 'A';

  // Check section uniqueness
  const existing = await prisma.courseOffering.findUnique({
    where: {
      courseId_semesterId_section: {
        courseId:   data.courseId,
        semesterId: data.semesterId,
        section:    sectionUpper,
      },
    },
  });
  if (existing) {
    throw new Error(`Section "${sectionUpper}" already exists for this course and semester.`);
  }

  // Validate instructor if provided
  if (data.instructorId) {
    const inst = await prisma.instructorRecord.findUnique({ where: { id: data.instructorId } });
    if (!inst || !inst.isActive) throw new Error('Instructor not found or inactive.');
  }

  const offering = await prisma.courseOffering.create({
    data: {
      courseId:     data.courseId,
      semesterId:   data.semesterId,
      section:      sectionUpper,
      capacity:     data.capacity ?? 40,
      roomId:       data.roomId || null,
      instructorId: data.instructorId || null,
      status:       data.instructorId ? 'INSTRUCTOR_ASSIGNED' : 'SCHEDULED',
      programType:  course.programType,
    },
  });

  return offering;
}

export async function updateClassSection(
  userId: string,
  offeringId: string,
  data: { section?: string; capacity?: number; roomId?: string | null; status?: string },
) {
  const hod = await resolveHoD(userId);
  const offering = await verifyOfferingDept(offeringId, hod.departmentId);

  return prisma.courseOffering.update({
    where: { id: offeringId },
    data: {
      ...(data.section ? { section: data.section.trim().toUpperCase() } : {}),
      ...(data.capacity ? { capacity: data.capacity } : {}),
      ...(data.roomId !== undefined ? { roomId: data.roomId } : {}),
      ...(data.status ? { status: data.status as any } : {}),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE ASSIGNMENT (HOD Instructor -> Course/Class Assignment)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCourseAssignments(userId: string, semesterId?: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const where: any = {
    course: { departmentId: deptId },
  };
  if (semesterId && semesterId !== 'ALL') {
    where.semesterId = semesterId;
  } else {
    where.semester = { isCurrent: true };
  }

  const [offerings, instructors] = await Promise.all([
    prisma.courseOffering.findMany({
      where,
      orderBy: [{ course: { code: 'asc' } }, { section: 'asc' }],
      include: {
        course:     { select: { id: true, code: true, name: true, ects: true, creditHours: true } },
        semester:   { select: { id: true, name: true, isCurrent: true } },
        instructor: {
          select: {
            id: true, employeeId: true, title: true,
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    }),
    // All active instructors college-wide — HOD can assign any instructor to their dept's courses,
    // matching the prior Registrar behaviour. Dept-scope is enforced on the course/offering side.
    prisma.instructorRecord.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        department: { select: { name: true } },
        _count: { select: { offerings: { where: { semester: { isCurrent: true } } } } },
      },
      orderBy: { user: { fullName: 'asc' } },
    }),
  ]);

  return {
    assignments: offerings.map((o) => ({
      offeringId:   o.id,
      section:      o.section,
      capacity:     o.capacity,
      enrolledCount: o._count.enrollments,
      status:       o.status,
      course: {
        id:          o.course.id,
        code:        o.course.code,
        name:        o.course.name,
        creditHours: o.course.creditHours,
      },
      semester: {
        id:   o.semester.id,
        name: o.semester.name,
      },
      instructor: o.instructor ? {
        id:         o.instructor.id,
        employeeId: o.instructor.employeeId,
        user: {
          fullName: o.instructor.user.fullName,
        },
      } : null,
    })),
    instructors: instructors.map((i) => ({
      id:               i.id,
      employeeId:       i.employeeId,
      user: {
        fullName: `${i.user.fullName} (${i.department?.name ?? 'No Dept'})`,
      },
      assignedOfferings: i._count.offerings,
    })),
    semesters: [],
  };
}

export async function assignInstructorToOffering(
  userId: string,
  data: { offeringId: string; instructorId: string },
) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  // 1. Verify offering belongs to HOD's department
  const offering = await prisma.courseOffering.findUnique({
    where:   { id: data.offeringId },
    include: {
      course:   { select: { departmentId: true, name: true, code: true } },
      semester: { select: { id: true, name: true } },
    },
  });
  if (!offering) throw new Error('Course offering not found.');
  if (offering.course.departmentId !== deptId) {
    throw new Error('Not authorized: this course offering does not belong to your department.');
  }

  // 2. Verify instructor is active and belongs to department (or is eligible)
  const instructor = await prisma.instructorRecord.findUnique({
    where:   { id: data.instructorId },
    include: { user: { select: { id: true, fullName: true } } },
  });
  if (!instructor || !instructor.isActive) {
    throw new Error('Selected instructor is not active or not found.');
  }

  // 3. Conflict Prevention: check if instructor is already teaching the exact same course section
  if (offering.instructorId === data.instructorId) {
    throw new Error(`${instructor.user.fullName} is already assigned to this class section.`);
  }

  // 4. Update offering
  const updated = await prisma.courseOffering.update({
    where: { id: data.offeringId },
    data: {
      instructorId: data.instructorId,
      status:       offering.status === 'DRAFT' ? 'INSTRUCTOR_ASSIGNED' : offering.status,
    },
    include: {
      instructor: {
        include: { user: { select: { fullName: true } } },
      },
    },
  });

  // 5. Send notification to the assigned instructor
  await createNotification({
    userId:  instructor.userId,
    title:   'Teaching Assignment',
    message: `You have been assigned to teach ${offering.course.code} (${offering.course.name}) Section ${offering.section} for ${offering.semester.name}.`,
    type:    'INFO',
  }).catch(() => {});

  return {
    success: true,
    message: `Assigned ${instructor.user.fullName} to ${offering.course.code} Section ${offering.section}.`,
    offering: updated,
  };
}

export async function unassignInstructorFromOffering(userId: string, offeringId: string) {
  const hod = await resolveHoD(userId);
  const offering = await verifyOfferingDept(offeringId, hod.departmentId);

  await prisma.courseOffering.update({
    where: { id: offeringId },
    data: {
      instructorId: null,
      status:       'SCHEDULED',
    },
  });

  return { success: true, message: 'Instructor unassigned successfully.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC MONITORING
// ─────────────────────────────────────────────────────────────────────────────

export async function getAcademicMonitoring(userId: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  // 1. Department offerings in current semester
  const offerings = await prisma.courseOffering.findMany({
    where: {
      course:   { departmentId: deptId },
      semester: { isCurrent: true },
    },
    include: {
      course:     { select: { code: true, name: true } },
      instructor: { select: { user: { select: { fullName: true } } } },
      _count:     { select: { enrollments: true, classSessions: true } },
    },
  });

  // 2. Attendance Summary
  const attendanceAgg = await prisma.$queryRaw<{ total: bigint; present: bigint; absent: bigint; late: bigint }[]>`
    SELECT
      COUNT(ar.id) AS total,
      SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END)  AS absent,
      SUM(CASE WHEN ar.status = 'LATE' THEN 1 ELSE 0 END)    AS late
    FROM "AttendanceRecord" ar
    INNER JOIN "AttendanceSession" ats ON ats.id = ar."attendanceSessionId"
    INNER JOIN "ClassSession" cs ON cs.id = ats."classSessionId"
    INNER JOIN "CourseOffering" co ON co.id = cs."courseOfferingId"
    INNER JOIN "Course" c ON c.id = co."courseId"
    WHERE c."departmentId" = ${deptId}
  `;
  const attTotal   = Number(attendanceAgg[0]?.total ?? 0);
  const attPresent = Number(attendanceAgg[0]?.present ?? 0);
  const attLate    = Number(attendanceAgg[0]?.late ?? 0);
  const attAbsent  = Number(attendanceAgg[0]?.absent ?? 0);
  const attendanceRate = attTotal > 0 ? Math.round(((attPresent + attLate) / attTotal) * 1000) / 10 : 0;

  // 3. Exam & Grade Submission Progress (midExamMarks / finalExamMarks recorded in CourseGrade)
  const grades = await prisma.courseGrade.findMany({
    where: {
      enrollment: {
        courseOffering: {
          course: { departmentId: deptId },
          semester: { isCurrent: true },
        },
      },
    },
    select: {
      midExamMarks:   true,
      finalExamMarks: true,
      finalMark:      true,
      status:         true,
    },
  });

  const totalEnrollmentsExam = grades.length;
  const midRecorded   = grades.filter((g) => g.midExamMarks !== null).length;
  const finalRecorded = grades.filter((g) => g.finalExamMarks !== null).length;
  const finalized     = grades.filter((g) => g.status === 'PUBLISHED' || g.status === 'SUBMITTED').length;

  // 4. Upcoming Academic / Exam Calendar Events
  const upcomingEvents = await prisma.academicCalendarEvent.findMany({
    where: {
      startDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { startDate: 'asc' },
    take:    5,
    select:  { id: true, title: true, eventType: true, startDate: true, endDate: true },
  });

  const byCourseAttendance = offerings.map((o) => ({
    courseCode:   o.course.code,
    courseName:   o.course.name,
    sessionsHeld: o._count.classSessions,
    attendanceRate,
  }));

  const examByCourse = offerings.map((o) => ({
    courseCode:     o.course.code,
    courseName:     o.course.name,
    midSubmitted:   midRecorded,
    finalSubmitted: finalRecorded,
    total:          o._count.enrollments,
  }));

  const courseProgress = offerings.map((o) => ({
    courseCode:       o.course.code,
    courseName:       o.course.name,
    sessionsHeld:     o._count.classSessions,
    expectedSessions: 32,
    progressPct:      Math.min(100, Math.round((o._count.classSessions / 32) * 100)),
  }));

  return {
    activeClassesCount: offerings.length,
    classes: offerings.map((o) => ({
      id:             o.id,
      courseCode:     o.course.code,
      courseName:     o.course.name,
      section:        o.section,
      instructorName: o.instructor?.user.fullName || 'Unassigned',
      enrolled:       o._count.enrollments,
      sessionsHeld:   o._count.classSessions,
    })),
    attendance: {
      totalSessions:    attTotal,
      attendedSessions: attPresent + attLate,
      attendanceRate,
      atRiskStudents:   attAbsent,
      byCourse:         byCourseAttendance,
      totalRecords:     attTotal,
      presentRecords:   attPresent,
      lateRecords:      attLate,
      absentRecords:    attAbsent,
    },
    examProgress: {
      totalGradeRecords:   totalEnrollmentsExam,
      midExamSubmitted:    midRecorded,
      finalExamSubmitted:  finalRecorded,
      midSubmissionRate:   totalEnrollmentsExam > 0 ? Math.round((midRecorded / totalEnrollmentsExam) * 100) : 0,
      finalSubmissionRate: totalEnrollmentsExam > 0 ? Math.round((finalRecorded / totalEnrollmentsExam) * 100) : 0,
      byCourse:            examByCourse,
    },
    examinations: {
      totalStudentsEnrolled: totalEnrollmentsExam,
      midtermRecorded:       midRecorded,
      midtermCompletionRate: totalEnrollmentsExam > 0 ? Math.round((midRecorded / totalEnrollmentsExam) * 100) : 0,
      finalRecorded:         finalRecorded,
      finalCompletionRate:   totalEnrollmentsExam > 0 ? Math.round((finalRecorded / totalEnrollmentsExam) * 100) : 0,
      gradesFinalized:       finalized,
    },
    courseProgress: {
      byCourse: courseProgress,
    },
    upcomingEvents,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

export async function getAcademicPerformance(userId: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  // 1. Department students GPA stats
  const students = await prisma.studentRecord.findMany({
    where: { departmentId: deptId, status: StudentStatus.ACTIVE },
    select: {
      id:        true,
      studentId: true,
      gpa:       true,
      yearLevel: true,
      user:      { select: { fullName: true, email: true } },
      program:   { select: { id: true, name: true, code: true } },
    },
  });

  const totalStudents = students.length;
  const avgGpa = totalStudents > 0
    ? Math.round((students.reduce((acc, s) => acc + (s.gpa || 0), 0) / totalStudents) * 100) / 100
    : 0;

  // Students requiring academic attention (GPA < 2.0 or failing)
  const atRiskStudents = students
    .filter((s) => s.gpa > 0 && s.gpa < 2.0)
    .map((s) => ({
      studentRecordId: s.id,
      studentId:       s.id,
      studentCode:     s.studentId,
      fullName:        s.user.fullName,
      name:            s.user.fullName,
      email:           s.user.email,
      gpa:             s.gpa,
      yearLevel:       s.yearLevel,
      programName:     s.program.name,
      failingCourses:  0,
      issue:           s.gpa < 1.75 ? 'Academic Warning (Critical)' : 'Academic Warning',
    }));

  const topStudents = students
    .filter((s) => s.gpa >= 3.0)
    .sort((a, b) => (b.gpa || 0) - (a.gpa || 0))
    .slice(0, 10)
    .map((s) => ({
      studentId:    s.id,
      studentCode:  s.studentId,
      fullName:     s.user.fullName,
      gpa:          s.gpa,
      totalCredits: 0,
    }));

  // 2. Grade Distribution across department course grades
  const grades = await prisma.courseGrade.findMany({
    where: {
      enrollment: {
        courseOffering: {
          course: { departmentId: deptId },
        },
      },
      letterGrade: { not: null },
    },
    select: {
      letterGrade:  true,
      finalMark:    true,
      gradePoints:  true,
      qualityPoints: true,
      enrollment: {
        select: {
          courseOffering: {
            select: {
              course: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
    },
  });

  const distribution: Record<string, number> = {
    'A+': 0, 'A': 0, 'A-': 0,
    'B+': 0, 'B': 0, 'B-': 0,
    'C+': 0, 'C': 0, 'C-': 0,
    'D':  0, 'F': 0,
  };

  grades.forEach((g) => {
    if (g.letterGrade && distribution[g.letterGrade] !== undefined) {
      distribution[g.letterGrade] += 1;
    }
  });

  const gradeDistributionArray = Object.entries(distribution).map(([grade, count]) => ({
    grade,
    count,
    percentage: grades.length > 0 ? Math.round((count / grades.length) * 1000) / 10 : 0,
  }));

  // 3. Course pass rates
  const courseMap = new Map<string, { code: string; name: string; totalMarks: number; count: number; passCount: number }>();
  grades.forEach((g) => {
    const c = g.enrollment?.courseOffering?.course;
    if (!c) return;
    const existing = courseMap.get(c.id) || { code: c.code, name: c.name, totalMarks: 0, count: 0, passCount: 0 };
    existing.totalMarks += g.finalMark || 0;
    existing.count += 1;
    if (g.letterGrade !== 'F' && (g.finalMark ?? 0) >= 50) {
      existing.passCount += 1;
    }
    courseMap.set(c.id, existing);
  });

  const coursePerformance = Array.from(courseMap.values()).map((c) => ({
    courseCode:    c.code,
    code:          c.code,
    courseName:    c.name,
    name:          c.name,
    totalStudents: c.count,
    totalGrades:   c.count,
    avgScore:      c.count > 0 ? Math.round((c.totalMarks / c.count) * 10) / 10 : 0,
    passRate:      c.count > 0 ? Math.round((c.passCount / c.count) * 100) : 0,
  }));

  // 4. Program GPA breakdown
  const programMap = new Map<string, { name: string; totalGpa: number; count: number }>();
  students.forEach((s) => {
    const pName = s.program?.name || 'General';
    const existing = programMap.get(pName) || { name: pName, totalGpa: 0, count: 0 };
    existing.totalGpa += s.gpa || 0;
    existing.count += 1;
    programMap.set(pName, existing);
  });

  const programPerformance = Array.from(programMap.values()).map((p) => ({
    name:         p.name,
    studentCount: p.count,
    avgGpa:       p.count > 0 ? Math.round((p.totalGpa / p.count) * 100) / 100 : 0,
  }));

  return {
    totalStudents,
    avgGpa,
    gradeDistribution: gradeDistributionArray,
    totalGradesRecorded: grades.length,
    coursePerformance,
    programPerformance,
    atRiskStudents,
    topStudents,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT REPORTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDepartmentReports(userId: string) {
  const hod = await resolveHoD(userId);
  const deptId = hod.departmentId;

  const [
    dept,
    studentsByYear,
    studentsByProgram,
    offerings,
    instructors,
  ] = await Promise.all([
    prisma.department.findUnique({
      where:  { id: deptId },
      select: { id: true, name: true, code: true, programType: true },
    }),
    prisma.studentRecord.groupBy({
      by:      ['yearLevel'],
      where:   { departmentId: deptId, status: StudentStatus.ACTIVE },
      _count:  { id: true },
      orderBy: { yearLevel: 'asc' },
    }),
    prisma.studentRecord.groupBy({
      by:     ['programId'],
      where:  { departmentId: deptId, status: StudentStatus.ACTIVE },
      _count: { id: true },
    }),
    prisma.courseOffering.findMany({
      where: {
        course:   { departmentId: deptId },
        semester: { isCurrent: true },
      },
      include: {
        course:     { select: { code: true, name: true, creditHours: true, ects: true } },
        instructor: { select: { user: { select: { fullName: true } } } },
        _count:     { select: { enrollments: true } },
      },
    }),
    prisma.instructorRecord.findMany({
      where: { departmentId: deptId, isActive: true },
      include: {
        user: { select: { fullName: true, email: true } },
        _count: { select: { offerings: { where: { semester: { isCurrent: true } } } } },
      },
    }),
  ]);

  // Map program names
  const programs = await prisma.program.findMany({
    where:  { departmentId: deptId },
    select: { id: true, name: true, code: true },
  });
  const pMap = new Map(programs.map((p) => [p.id, p.name]));

  const programEnrollmentReport = studentsByProgram.map((sbp) => ({
    programName: pMap.get(sbp.programId) || 'Unknown Program',
    count:       sbp._count.id,
  }));

  const yearEnrollmentReport = studentsByYear.map((sby) => ({
    yearLevel: `Year ${sby.yearLevel}`,
    count:     sby._count.id,
  }));

  const workloadReport = instructors.map((inst) => ({
    instructorName: inst.user.fullName,
    email:          inst.user.email,
    title:          inst.title,
    sectionsTaught: inst._count.offerings,
  }));

  const classesReport = offerings.map((o) => ({
    courseCode:     o.course.code,
    courseName:     o.course.name,
    section:        o.section,
    capacity:       o.capacity,
    enrolled:       o._count.enrollments,
    utilizationPct: o.capacity > 0 ? Math.round((o._count.enrollments / o.capacity) * 100) : 0,
    instructorName: o.instructor?.user.fullName || 'Unassigned',
  }));

  return {
    department:              dept,
    yearEnrollmentReport,
    programEnrollmentReport,
    workloadReport,
    classesReport,
  };
}
