/**
 * Instructor Service
 *
 * All business logic for the Instructor Dashboard. Uses notificationService
 * for all in-app notification creation so socket push is automatic.
 *
 * Security principles enforced here:
 * 1. Every operation resolves the InstructorRecord from the authenticated userId.
 * 2. Course ownership is always verified before returning or mutating data.
 * 3. Student data is limited to what the instructor is authorized to see.
 * 4. Grade mutations are transactional and audited.
 * 5. Notification creation is side-effect of grade/announcement actions.
 */

import { prisma }              from '../../lib/prisma';
import { createNotification } from '../notificationService';
import {
  AssignmentStatus,
  QuizStatus,
  SubmissionStatus,
  AttendanceStatus,
  EnrollmentStatus,
  QuestionType,
} from '@prisma/client';
import { calculateCourseResult, AssessmentBreakdown } from '../../lib/grading';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve InstructorRecord from authenticated userId. Throws 404 if not found. */
async function resolveInstructor(userId: string) {
  const record = await prisma.instructorRecord.findUnique({
    where: { userId },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      department: { select: { id: true, name: true, code: true } },
    },
  });
  if (!record) throw new Error('Instructor record not found for this account.');
  return record;
}

/** Verify the instructor owns the course offering. Throws 403 if not. */
async function verifyOfferingOwnership(courseOfferingId: string, instructorRecordId: string) {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    select: { instructorId: true },
  });
  if (!offering) throw new Error('Course offering not found.');
  if (offering.instructorId !== instructorRecordId) {
    throw new Error('You are not authorized to access this course offering.');
  }
  return offering;
}

/** Verify the assignment belongs to the instructor's offering. */
async function verifyAssignmentOwnership(assignmentId: string, instructorUserId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      courseOffering: { include: { instructor: { select: { userId: true } } } },
    },
  });
  if (!assignment) throw new Error('Assignment not found.');
  if (assignment.courseOffering.instructor?.userId !== instructorUserId) {
    throw new Error('You are not authorized to manage this assignment.');
  }
  return assignment;
}

/** Verify quiz belongs to the instructor. */
async function verifyQuizOwnership(quizId: string, instructorUserId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      courseOffering: { include: { instructor: { select: { userId: true } } } },
    },
  });
  if (!quiz) throw new Error('Quiz not found.');
  if (quiz.courseOffering.instructor?.userId !== instructorUserId) {
    throw new Error('You are not authorized to manage this quiz.');
  }
  return quiz;
}

// Active enrollment statuses
const ACTIVE_STATUSES: EnrollmentStatus[] = [EnrollmentStatus.ACTIVE, EnrollmentStatus.FORCE_ADDED];

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export async function getInstructorProfile(userId: string) {
  const record = await resolveInstructor(userId);
  return {
    id: record.id,
    userId: record.userId,
    employeeId: record.employeeId,
    title: record.title,
    specialization: record.specialization,
    isActive: record.isActive,
    fullName: record.user.fullName,
    email: record.user.email,
    phone: record.user.phone,
    department: record.department,
    createdAt: record.createdAt,
  };
}

export async function updateInstructorProfile(
  userId: string,
  data: { title?: string; specialization?: string },
) {
  const record = await resolveInstructor(userId);
  return prisma.instructorRecord.update({
    where: { id: record.id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.specialization !== undefined && { specialization: data.specialization }),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD / OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardStats(userId: string, requestedProgramType?: 'TVET' | 'SHORT_PROGRAM') {
  const instructor = await resolveInstructor(userId);

  // Check all offerings to discover assigned academic contexts
  const allOfferings = await prisma.courseOffering.findMany({
    where: { instructorId: instructor.id },
    select: { id: true, programType: true, shortProgramDuration: true },
  });

  const hasTVET = allOfferings.some(o => o.programType === 'TVET');
  const hasShortProgram = allOfferings.some(o => o.programType === 'SHORT_PROGRAM');
  const effectiveProgramType = requestedProgramType || (hasTVET ? 'TVET' : (hasShortProgram ? 'SHORT_PROGRAM' : 'TVET'));

  // Active offerings for this instructor filtered by academic context
  const offerings = await prisma.courseOffering.findMany({
    where: {
      instructorId: instructor.id,
      programType: effectiveProgramType as any,
    },
    include: {
      course: { select: { code: true, name: true, creditHours: true, department: { select: { id: true, name: true } } } },
      semester: { select: { id: true, name: true, isCurrent: true, academicYear: { select: { name: true } } } },
      room: { select: { name: true, building: true } },
      _count: {
        select: {
          enrollments: { where: { status: { in: ACTIVE_STATUSES } } },
          assignments: true,
          quizzes: true,
        },
      },
    },
    orderBy: [{ semester: { isCurrent: 'desc' } }, { course: { code: 'asc' } }],
  });

  const currentOfferings = offerings.filter(o => o.semester.isCurrent);
  const targetOfferings = currentOfferings.length > 0 ? currentOfferings : offerings;

  // Total students across active offerings (deduplicated)
  const allStudentIds = new Set<string>();
  for (const off of targetOfferings) {
    const enrs = await prisma.enrollment.findMany({
      where: { courseOfferingId: off.id, status: { in: ACTIVE_STATUSES } },
      select: { studentRecordId: true },
    });
    enrs.forEach(e => allStudentIds.add(e.studentRecordId));
  }

  // Today's class sessions
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const todaySessions = await prisma.classSession.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      courseOffering: {
        instructorId: instructor.id,
        programType: effectiveProgramType as any,
      },
    },
    include: {
      courseOffering: {
        include: {
          course: { select: { code: true, name: true } },
          room: { select: { name: true, building: true } },
        },
      },
      attendanceSession: { select: { id: true, lifecycle: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  // Active attendance sessions
  const activeSessions = await prisma.attendanceSession.count({
    where: {
      lifecycle: 'OPEN',
      classSession: {
        courseOffering: {
          instructorId: instructor.id,
          programType: effectiveProgramType as any,
        },
      },
    },
  });

  // Pending assignments (published, not yet closed, for instructor's offerings)
  const pendingAssignments = await prisma.assignment.count({
    where: {
      courseOffering: {
        instructorId: instructor.id,
        programType: effectiveProgramType as any,
      },
      status: AssignmentStatus.PUBLISHED,
      dueDate: { gte: now },
    },
  });

  // Ungraded submissions
  const ungradedSubmissions = await prisma.assignmentSubmission.count({
    where: {
      assignment: {
        courseOffering: {
          instructorId: instructor.id,
          programType: effectiveProgramType as any,
        },
      },
      status: SubmissionStatus.SUBMITTED,
      score: null,
    },
  });

  // Attendance trend (last 8 sessions per offering)
  const attendanceTrend: number[] = [];
  for (const off of targetOfferings) {
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        lifecycle: { in: ['CLOSED', 'FINALIZED'] },
        classSession: { courseOfferingId: off.id },
      },
      include: { records: { select: { status: true } } },
      orderBy: { classSession: { date: 'desc' } },
      take: 4,
    });
    for (const s of sessions) {
      const total = s.records.length;
      const present = s.records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
      if (total > 0) attendanceTrend.push(Math.round((present / total) * 100));
    }
  }

  // Recent notifications
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  return {
    instructor: {
      id: instructor.id,
      employeeId: instructor.employeeId,
      title: instructor.title,
      specialization: instructor.specialization,
      fullName: instructor.user.fullName,
      email: instructor.user.email,
      phone: instructor.user.phone,
      department: instructor.department,
    },
    academicContext: {
      activeProgramType: effectiveProgramType,
      hasTVET,
      hasShortProgram,
    },
    kpis: {
      classesToday: todaySessions.length,
      studentsTaught: allStudentIds.size,
      activeSessions,
      pendingAssignments,
      ungradedSubmissions,
      upcomingClasses: todaySessions.filter(s => !s.attendanceSession || s.attendanceSession.lifecycle === 'NOT_STARTED').length,
      currentOfferings: currentOfferings.length,
      totalOfferings: offerings.length,
    },
    todaySessions: todaySessions.map(s => ({
      id: s.id,
      courseCode: s.courseOffering.course.code,
      courseName: s.courseOffering.course.name,
      room: s.courseOffering.room ? `${s.courseOffering.room.name}, ${s.courseOffering.room.building}` : 'TBD',
      startTime: s.startTime,
      endTime: s.endTime,
      date: s.date,
      attendanceSessionId: s.attendanceSession?.id ?? null,
      attendanceSessionLifecycle: s.attendanceSession?.lifecycle ?? null,
      courseOfferingId: s.courseOffering.id,
    })),
    attendanceTrend: attendanceTrend.slice(0, 8),
    notifications: notifications.slice(0, 5).map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
    unreadNotifications,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MY CLASSES
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyClasses(userId: string, programType?: 'TVET' | 'SHORT_PROGRAM') {
  const instructor = await resolveInstructor(userId);

  const offerings = await prisma.courseOffering.findMany({
    where: {
      instructorId: instructor.id,
      ...(programType ? { programType: programType as any } : {}),
    },
    include: {
      course: {
        select: {
          id: true, code: true, name: true, description: true, creditHours: true,
          department: { select: { id: true, name: true } },
        },
      },
      semester: {
        select: {
          id: true, name: true, isCurrent: true,
          startDate: true, endDate: true,
          academicYear: { select: { name: true } },
        },
      },
      room: { select: { name: true, building: true, capacity: true } },
      _count: {
        select: {
          enrollments: { where: { status: { in: ACTIVE_STATUSES } } },
          assignments: true,
          quizzes: true,
        },
      },
      timetables: {
        select: { dayOfWeek: true, startTime: true, endTime: true },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
    orderBy: [{ semester: { isCurrent: 'desc' } }, { course: { code: 'asc' } }],
  });

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return offerings.map(o => ({
    id: o.id,
    section: o.section,
    status: o.status,
    capacity: o.capacity,
    enrolled: o._count.enrollments,
    programType: o.programType,
    shortProgramDuration: o.shortProgramDuration,
    department: o.course.department,
    course: {
      id: o.course.id,
      code: o.course.code,
      name: o.course.name,
      description: o.course.description,
      creditHours: o.course.creditHours,
    },
    semester: {
      id: o.semester.id,
      name: o.semester.name,
      isCurrent: o.semester.isCurrent,
      startDate: o.semester.startDate,
      endDate: o.semester.endDate,
      academicYear: o.semester.academicYear.name,
    },
    room: o.room
      ? { name: o.room.name, building: o.room.building, capacity: o.room.capacity }
      : null,
    schedule: o.timetables.map(t => ({
      day: DAY_NAMES[t.dayOfWeek] ?? `Day ${t.dayOfWeek}`,
      startTime: t.startTime,
      endTime: t.endTime,
    })),
    stats: {
      assignments: o._count.assignments,
      quizzes: o._count.quizzes,
    },
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE
// ─────────────────────────────────────────────────────────────────────────────

export async function getTimetable(userId: string) {
  const instructor = await resolveInstructor(userId);

  const slots = await prisma.timetableSlot.findMany({
    where: { instructorId: instructor.id },
    include: {
      courseOffering: {
        include: {
          course: { select: { code: true, name: true } },
          semester: { select: { name: true, isCurrent: true, academicYear: { select: { name: true } } } },
          room: { select: { name: true, building: true } },
        },
      },
      room: { select: { name: true, building: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return slots.map(s => ({
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    dayName: DAY_NAMES[s.dayOfWeek] ?? 'Unknown',
    startTime: s.startTime,
    endTime: s.endTime,
    courseCode: s.courseOffering.course.code,
    courseName: s.courseOffering.course.name,
    section: s.courseOffering.section,
    room: s.room?.name ?? s.courseOffering.room?.name ?? 'TBD',
    building: s.room?.building ?? s.courseOffering.room?.building ?? '',
    semester: s.courseOffering.semester.name,
    academicYear: s.courseOffering.semester.academicYear.name,
    isCurrent: s.courseOffering.semester.isCurrent,
    courseOfferingId: s.courseOffering.id,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// ROSTER / STUDENTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getRoster(
  userId: string,
  courseOfferingId: string,
  params: { search?: string; status?: string; page?: number; limit?: number },
) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, params.limit ?? 30);
  const skip = (page - 1) * limit;

  const statusFilter: EnrollmentStatus[] = params.status
    ? [params.status as EnrollmentStatus]
    : ACTIVE_STATUSES;

  const where: any = {
    courseOfferingId,
    status: { in: statusFilter },
    ...(params.search && {
      studentRecord: {
        OR: [
          { studentId: { contains: params.search, mode: 'insensitive' } },
          { user: { fullName: { contains: params.search, mode: 'insensitive' } } },
        ],
      },
    }),
  };

  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where, skip, take: limit,
      include: {
        studentRecord: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            program: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { studentRecord: { user: { fullName: 'asc' } } },
    }),
  ]);

  // Compute attendance rate for each student in this course
  const studentIds = enrollments.map(e => e.studentRecordId);

  const attendanceCounts = await prisma.attendanceRecord.groupBy({
    by: ['studentRecordId', 'status'],
    where: {
      studentRecordId: { in: studentIds },
      attendanceSession: { classSession: { courseOfferingId } },
    },
    _count: { id: true },
  });

  const attMap: Record<string, { total: number; present: number }> = {};
  for (const row of attendanceCounts) {
    if (!attMap[row.studentRecordId]) {
      attMap[row.studentRecordId] = { total: 0, present: 0 };
    }
    attMap[row.studentRecordId].total += row._count.id;
    if (row.status === 'PRESENT' || row.status === 'LATE') {
      attMap[row.studentRecordId].present += row._count.id;
    }
  }

  const students = enrollments.map(e => {
    const att = attMap[e.studentRecordId] ?? { total: 0, present: 0 };
    const attRate = att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
    return {
      enrollmentId: e.id,
      enrollmentStatus: e.status,
      enrolledAt: e.enrolledAt,
      studentRecordId: e.studentRecordId,
      studentId: e.studentRecord.studentId,
      fullName: e.studentRecord.user.fullName,
      email: e.studentRecord.user.email,
      phone: e.studentRecord.user.phone,
      program: e.studentRecord.program,
      gpa: e.studentRecord.gpa,
      yearLevel: e.studentRecord.yearLevel,
      attendanceRate: attRate,
      attendanceSessions: att.total,
    };
  });

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    students,
  };
}

/** Get a single student's academic view for the instructor (limited scope). */
export async function getStudentAcademicView(
  userId: string,
  courseOfferingId: string,
  studentRecordId: string,
) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  // Verify student is enrolled
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseOfferingId, studentRecordId, status: { in: ACTIVE_STATUSES } },
  });
  if (!enrollment) throw new Error('Student is not enrolled in this course.');

  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: { select: { fullName: true, email: true } },
      program: { select: { name: true, code: true } },
    },
  });
  if (!student) throw new Error('Student not found.');

  // Attendance in this course
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      studentRecordId,
      attendanceSession: { classSession: { courseOfferingId } },
    },
    include: {
      attendanceSession: {
        include: { classSession: { select: { date: true, startTime: true, endTime: true } } },
      },
    },
    orderBy: { markedAt: 'desc' },
    take: 20,
  });

  const total = attendanceRecords.length;
  const present = attendanceRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;

  // Assignment submissions in this course
  const submissions = await prisma.assignmentSubmission.findMany({
    where: {
      studentRecordId,
      assignment: { courseOfferingId },
    },
    include: { assignment: { select: { title: true, totalPoints: true, dueDate: true, status: true } } },
    orderBy: { submittedAt: 'desc' },
  });

  // Quiz attempts
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: {
      studentRecordId,
      quiz: { courseOfferingId },
    },
    include: { quiz: { select: { title: true, totalPoints: true } } },
    orderBy: { startedAt: 'desc' },
  });

  return {
    student: {
      studentId: student.studentId,
      fullName: student.user.fullName,
      email: student.user.email,
      program: student.program,
      yearLevel: student.yearLevel,
      gpa: student.gpa,
    },
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
    },
    attendance: {
      total,
      present,
      absent: attendanceRecords.filter(r => r.status === 'ABSENT').length,
      late: attendanceRecords.filter(r => r.status === 'LATE').length,
      excused: attendanceRecords.filter(r => r.status === 'EXCUSED').length,
      rate: total > 0 ? Math.round((present / total) * 100) : null,
      records: attendanceRecords.slice(0, 10).map(r => ({
        date: r.attendanceSession.classSession.date,
        status: r.status,
        method: r.method,
        markedAt: r.markedAt,
      })),
    },
    submissions: submissions.map(s => ({
      assignmentTitle: s.assignment.title,
      totalPoints: s.assignment.totalPoints,
      submittedAt: s.submittedAt,
      status: s.status,
      score: s.score,
      feedback: s.feedback,
    })),
    quizAttempts: quizAttempts.map(a => ({
      quizTitle: a.quiz.title,
      totalPoints: a.quiz.totalPoints,
      score: a.score,
      percentageScore: a.percentageScore,
      status: a.status,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getAssignments(userId: string, courseOfferingId?: string) {
  const instructor = await resolveInstructor(userId);

  // When courseOfferingId is provided, verify ownership first
  if (courseOfferingId) {
    await verifyOfferingOwnership(courseOfferingId, instructor.id);
  }

  const where: any = {
    courseOffering: { instructorId: instructor.id },
    ...(courseOfferingId && { courseOfferingId }),
  };

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      courseOffering: {
        include: { course: { select: { code: true, name: true } } },
      },
      _count: { select: { submissions: true, attachments: true } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });

  return assignments.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    instructions: a.instructions,
    dueDate: a.dueDate,
    totalPoints: a.totalPoints,
    status: a.status,
    allowLateSubmit: a.allowLateSubmit,
    courseCode: a.courseOffering.course.code,
    courseName: a.courseOffering.course.name,
    courseOfferingId: a.courseOfferingId,
    createdAt: a.createdAt,
    submissionCount: a._count.submissions,
    attachmentCount: a._count.attachments,
  }));
}

export async function getAssignmentDetail(userId: string, assignmentId: string) {
  const assignment = await verifyAssignmentOwnership(assignmentId, userId);

  const [submissions, attachments] = await Promise.all([
    prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        studentRecord: {
          include: { user: { select: { fullName: true } } },
        },
      },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.assignmentAttachment.findMany({ where: { assignmentId } }),
  ]);

  const ungradedCount = submissions.filter(s => s.status === 'SUBMITTED' && s.score === null).length;

  return {
    ...assignment,
    attachments,
    submissions: submissions.map(s => ({
      id: s.id,
      studentName: s.studentRecord.user.fullName,
      studentId: s.studentRecord.studentId,
      status: s.status,
      submittedAt: s.submittedAt,
      score: s.score,
      feedback: s.feedback,
      gradedAt: s.gradedAt,
      isLate: s.status === SubmissionStatus.LATE,
      fileUrl: s.fileUrl,
      fileName: s.fileName,
      fileSize: s.fileSize,
      textContent: s.textContent,
    })),
    stats: {
      total: submissions.length,
      ungraded: ungradedCount,
      graded: submissions.filter(s => s.score !== null).length,
      submitted: submissions.filter(s => s.status === 'SUBMITTED').length,
    },
  };
}

export async function createAssignment(
  userId: string,
  courseOfferingId: string,
  data: {
    title: string;
    description: string;
    instructions: string;
    dueDate: string;
    totalPoints?: number;
    allowLateSubmit?: boolean;
    maxFileSize?: number;
    attachments?: Array<{ name: string; size: number | string; url: string; type?: string }>;
  },
) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  return prisma.assignment.create({
    data: {
      courseOfferingId,
      createdBy: userId,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      dueDate: new Date(data.dueDate),
      totalPoints: data.totalPoints ?? 100,
      allowLateSubmit: data.allowLateSubmit ?? false,
      maxFileSize: data.maxFileSize ?? 250,
      status: AssignmentStatus.DRAFT,
      ...(data.attachments && data.attachments.length > 0 && {
        attachments: {
          create: data.attachments.map(att => ({
            fileName: att.name,
            fileUrl: att.url,
            fileSize: typeof att.size === 'number'
              ? (att.size < 1024 * 1024 ? `${(att.size / 1024).toFixed(1)} KB` : `${(att.size / 1024 / 1024).toFixed(1)} MB`)
              : String(att.size),
            fileType: att.type ?? att.name.split('.').pop()?.toUpperCase() ?? 'FILE',
          })),
        },
      }),
    },
    include: {
      attachments: true,
    },
  });
}

export async function updateAssignment(
  userId: string,
  assignmentId: string,
  data: Partial<{
    title: string;
    description: string;
    instructions: string;
    dueDate: string;
    totalPoints: number;
    allowLateSubmit: boolean;
    status: AssignmentStatus;
  }>,
) {
  const assignment = await verifyAssignmentOwnership(assignmentId, userId);
  if (assignment.status === AssignmentStatus.CLOSED) {
    throw new Error('Cannot modify a closed assignment.');
  }

  return prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.instructions !== undefined && { instructions: data.instructions }),
      ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
      ...(data.totalPoints !== undefined && { totalPoints: data.totalPoints }),
      ...(data.allowLateSubmit !== undefined && { allowLateSubmit: data.allowLateSubmit }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
}

export async function deleteAssignment(userId: string, assignmentId: string) {
  const assignment = await verifyAssignmentOwnership(assignmentId, userId);
  if (assignment.status === AssignmentStatus.PUBLISHED) {
    throw new Error('Unpublish the assignment before deleting it.');
  }
  return prisma.assignment.delete({ where: { id: assignmentId } });
}

/** Grade a single assignment submission. */
export async function gradeSubmission(
  userId: string,
  submissionId: string,
  data: { score: number; feedback?: string; letterGrade?: string },
) {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: {
          courseOffering: { include: { instructor: { select: { userId: true } } } },
        },
      },
    },
  });
  if (!submission) throw new Error('Submission not found.');
  if (submission.assignment.courseOffering.instructor?.userId !== userId) {
    throw new Error('Not authorized to grade this submission.');
  }
  if (data.score < 0 || data.score > submission.assignment.totalPoints) {
    throw new Error(`Score must be between 0 and ${submission.assignment.totalPoints}.`);
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: data.score,
      feedback: data.feedback ?? null,
      letterGrade: data.letterGrade ?? null,
      gradedAt: new Date(),
      gradedBy: userId,
      status: SubmissionStatus.GRADED,
    },
    include: {
      assignment: { select: { title: true, totalPoints: true } },
      studentRecord: { select: { userId: true } },
    },
  });

  // Notify student of posted assignment grade
  try {
    if (updated.studentRecord?.userId) {
      await createNotification({
        userId:    updated.studentRecord.userId,
        title:     `Grade Posted: ${updated.assignment.title}`,
        message:   `Your submission for "${updated.assignment.title}" has been graded: ${updated.score}/${updated.assignment.totalPoints} (${updated.letterGrade ?? 'Graded'}).`,
        type:      'GRADE',
        actionTab: 'grades',
      });
    }
  } catch { /* ignore notification side effect error */ }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZZES
// ─────────────────────────────────────────────────────────────────────────────

export async function getQuizzes(userId: string, courseOfferingId?: string) {
  const instructor = await resolveInstructor(userId);

  // When courseOfferingId is provided, verify ownership
  if (courseOfferingId) {
    await verifyOfferingOwnership(courseOfferingId, instructor.id);
  }

  const where: any = {
    courseOffering: { instructorId: instructor.id },
    ...(courseOfferingId && { courseOfferingId }),
  };

  return prisma.quiz.findMany({
    where,
    include: {
      courseOffering: { include: { course: { select: { code: true, name: true } } } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: [{ status: 'asc' }, { availableFrom: 'asc' }],
  });
}

export async function getQuizDetail(userId: string, quizId: string) {
  const quiz = await verifyQuizOwnership(quizId, userId);

  const [questions, attempts] = await Promise.all([
    prisma.quizQuestion.findMany({
      where: { quizId },
      include: { options: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { orderIndex: 'asc' },
    }),
    prisma.quizAttempt.findMany({
      where: { quizId },
      include: { studentRecord: { include: { user: { select: { fullName: true } } } } },
      orderBy: { startedAt: 'desc' },
    }),
  ]);

  const gradedAttempts = attempts.filter(a => a.score !== null);
  const avgScore = gradedAttempts.length
    ? gradedAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / gradedAttempts.length
    : 0;

  return {
    ...quiz,
    questions,
    attempts: attempts.map(a => ({
      id: a.id,
      studentName: a.studentRecord.user.fullName,
      status: a.status,
      score: a.score,
      percentageScore: a.percentageScore,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
    })),
    stats: {
      totalAttempts: attempts.length,
      submitted: attempts.filter(a => a.status === 'SUBMITTED').length,
      graded: gradedAttempts.length,
      avgScore: Math.round(avgScore * 10) / 10,
    },
  };
}

export async function createQuiz(
  userId: string,
  courseOfferingId: string,
  data: {
    title: string;
    description?: string;
    instructions?: string;
    durationMinutes?: number;
    availableFrom: string;
    availableUntil: string;
    passingScore?: number;
    maxAttempts?: number;
    totalPoints?: number;
    showResultsImmediately?: boolean;
    shuffleQuestions?: boolean;
    questions?: Array<{
      questionText: string;
      type: string;
      points?: number;
      options?: Array<{ text: string; isCorrect?: boolean }>;
    }>;
  },
) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  const from = new Date(data.availableFrom);
  const until = new Date(data.availableUntil);
  if (until <= from) throw new Error('availableUntil must be after availableFrom.');

  const qTypeMap = (t: string): QuestionType => {
    const u = t.toUpperCase().replace('-', '_');
    if (u === 'TRUEFALSE' || u === 'TRUE_FALSE') return QuestionType.TRUE_FALSE;
    if (u === 'FILLBLANK' || u === 'FILL_BLANK') return QuestionType.FILL_BLANK;
    if (u === 'SHORTANSWER' || u === 'SHORT_ANSWER') return QuestionType.SHORT_ANSWER;
    if (u === 'ESSAY') return QuestionType.ESSAY;
    return QuestionType.MCQ;
  };

  return prisma.quiz.create({
    data: {
      courseOfferingId,
      createdBy: userId,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      durationMinutes: data.durationMinutes ?? 30,
      availableFrom: from,
      availableUntil: until,
      passingScore: data.passingScore ?? 60,
      maxAttempts: data.maxAttempts ?? 1,
      totalPoints: data.totalPoints ?? 100,
      showResultsImmediately: data.showResultsImmediately ?? true,
      shuffleQuestions: data.shuffleQuestions ?? false,
      status: QuizStatus.DRAFT,
      ...(data.questions && data.questions.length > 0 && {
        questions: {
          create: data.questions.map((q, idx) => ({
            questionText: q.questionText,
            type: qTypeMap(q.type),
            points: q.points ?? 1,
            orderIndex: idx,
            ...(q.options && q.options.length > 0 && {
              options: {
                create: q.options.map((opt, oIdx) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect ?? false,
                  orderIndex: oIdx,
                })),
              },
            }),
          })),
        },
      }),
    },
    include: {
      questions: { include: { options: true } },
    },
  });
}

export async function updateQuiz(
  userId: string,
  quizId: string,
  data: Record<string, unknown>,
) {
  const quiz = await verifyQuizOwnership(quizId, userId);
  if (quiz.status === QuizStatus.CLOSED) {
    throw new Error('Cannot modify a closed quiz.');
  }

  const allowed: (keyof typeof data)[] = [
    'title', 'description', 'instructions', 'durationMinutes',
    'availableFrom', 'availableUntil', 'passingScore', 'maxAttempts',
    'totalPoints', 'showResultsImmediately', 'shuffleQuestions', 'status',
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      if ((key === 'availableFrom' || key === 'availableUntil') && typeof data[key] === 'string') {
        update[key] = new Date(data[key] as string);
      } else {
        update[key] = data[key];
      }
    }
  }

  return prisma.quiz.update({ where: { id: quizId }, data: update });
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADES / COURSE GRADES
// ─────────────────────────────────────────────────────────────────────────────

/** Get all enrollments with detailed assessment breakdown and course grade for a course offering. */
export async function getCourseGrades(userId: string, courseOfferingId: string) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      course: { select: { id: true, code: true, name: true, creditHours: true, ects: true } },
      semester: { select: { id: true, name: true, isCurrent: true, academicYear: { select: { name: true } } } },
    },
  });
  if (!offering) throw new Error('Course offering not found.');

  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId, status: { in: ACTIVE_STATUSES } },
    include: {
      studentRecord: {
        include: { user: { select: { fullName: true } } },
      },
      grade: true,
    },
    orderBy: { studentRecord: { user: { fullName: 'asc' } } },
  });

  const students = enrollments.map(e => ({
    enrollmentId: e.id,
    studentRecordId: e.studentRecordId,
    studentId: e.studentRecord.studentId,
    fullName: e.studentRecord.user.fullName,
    gpa: e.studentRecord.gpa,
    currentGrade: e.grade
      ? {
        id: e.grade.id,
        assignmentMarks: e.grade.assignmentMarks,
        quizMarks: e.grade.quizMarks,
        midExamMarks: e.grade.midExamMarks,
        finalExamMarks: e.grade.finalExamMarks,
        attendanceMarks: e.grade.attendanceMarks,
        otherMarks: e.grade.otherMarks,
        finalMark: e.grade.finalMark,
        letterGrade: e.grade.letterGrade,
        gradePoints: e.grade.gradePoints,
        qualityPoints: e.grade.qualityPoints,
        creditHours: e.grade.creditHours,
        ects: e.grade.ects ?? offering.course.ects,
        status: e.grade.status, // DRAFT | SUBMITTED | PUBLISHED
        submittedAt: e.grade.submittedAt,
        gradedAt: e.grade.gradedAt,
      }
      : null,
  }));

  // Check global GradeEditingSetting
  const editingSetting = await prisma.gradeEditingSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', isOpen: true },
    update: {},
  });

  // Offering submission status: if any student is SUBMITTED or PUBLISHED
  const hasSubmitted = students.some(s => s.currentGrade?.status === 'SUBMITTED' || s.currentGrade?.status === 'PUBLISHED');
  const isAllPublished = students.length > 0 && students.every(s => s.currentGrade?.status === 'PUBLISHED');

  return {
    course: {
      id: offering.course.id,
      code: offering.course.code,
      name: offering.course.name,
      creditHours: offering.course.creditHours,
      ects: offering.course.ects,
      semester: offering.semester.name,
      academicYear: offering.semester.academicYear.name,
    },
    isLocked: !editingSetting.isOpen,
    submissionStatus: isAllPublished ? 'PUBLISHED' : (hasSubmitted ? 'SUBMITTED' : 'DRAFT'),
    students,
  };
}

/** Save or update draft assessment marks for an individual student. */
export async function saveAssessmentGrade(
  userId: string,
  courseOfferingId: string,
  enrollmentId: string,
  breakdown: AssessmentBreakdown,
) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      courseOffering: {
        include: {
          course: { select: { creditHours: true, ects: true } },
        },
      },
      grade: true,
    },
  });

  if (!enrollment || enrollment.courseOfferingId !== courseOfferingId) {
    throw new Error('Enrollment not found for this course offering.');
  }

  // Check if Registrar has grade editing OPEN or CLOSED
  const editingSetting = await prisma.gradeEditingSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', isOpen: true },
    update: {},
  });
  if (!editingSetting.isOpen) {
    throw new Error('Grade editing is currently closed by the Registrar.');
  }

  const ects = enrollment.courseOffering.course.ects;
  const creditHours = enrollment.courseOffering.course.creditHours;
  const computed = calculateCourseResult(breakdown, ects);

  return prisma.courseGrade.upsert({
    where: { enrollmentId },
    create: {
      enrollmentId,
      studentRecordId: enrollment.studentRecordId,
      assignmentMarks: breakdown.assignment !== undefined && breakdown.assignment !== null ? Number(breakdown.assignment) : null,
      quizMarks: breakdown.quiz !== undefined && breakdown.quiz !== null ? Number(breakdown.quiz) : null,
      midExamMarks: breakdown.midExam !== undefined && breakdown.midExam !== null ? Number(breakdown.midExam) : null,
      finalExamMarks: breakdown.finalExam !== undefined && breakdown.finalExam !== null ? Number(breakdown.finalExam) : null,
      attendanceMarks: breakdown.attendance !== undefined && breakdown.attendance !== null ? Number(breakdown.attendance) : null,
      otherMarks: breakdown.other !== undefined && breakdown.other !== null ? Number(breakdown.other) : null,
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
      assignmentMarks: breakdown.assignment !== undefined && breakdown.assignment !== null ? Number(breakdown.assignment) : null,
      quizMarks: breakdown.quiz !== undefined && breakdown.quiz !== null ? Number(breakdown.quiz) : null,
      midExamMarks: breakdown.midExam !== undefined && breakdown.midExam !== null ? Number(breakdown.midExam) : null,
      finalExamMarks: breakdown.finalExam !== undefined && breakdown.finalExam !== null ? Number(breakdown.finalExam) : null,
      attendanceMarks: breakdown.attendance !== undefined && breakdown.attendance !== null ? Number(breakdown.attendance) : null,
      otherMarks: breakdown.other !== undefined && breakdown.other !== null ? Number(breakdown.other) : null,
      finalMark: computed.finalMark,
      letterGrade: computed.letterGrade,
      gradePoints: computed.gradePoints,
      qualityPoints: computed.qualityPoints,
      creditHours,
      ects,
      status: enrollment.grade?.status === 'PUBLISHED'
        ? 'PUBLISHED'
        : (enrollment.grade?.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT'),
      gradedAt: new Date(),
    },
  });
}

/** Batch save draft assessment marks for students. */
export async function saveBatchAssessmentGrades(
  userId: string,
  courseOfferingId: string,
  entries: { enrollmentId: string; breakdown: AssessmentBreakdown }[],
) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  const results = [];
  for (const entry of entries) {
    const updated = await saveAssessmentGrade(userId, courseOfferingId, entry.enrollmentId, entry.breakdown);
    results.push(updated);
  }
  return results;
}

/**
 * Submit all grades for a course offering to the Registrar.
 * Transitions status from DRAFT -> SUBMITTED.
 * Teacher can still edit if Registrar's Grade Editing setting is OPEN.
 */
export async function submitCourseGradesToRegistrar(
  userId: string,
  courseOfferingId: string,
) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      course: { select: { code: true, name: true } },
    },
  });
  if (!offering) throw new Error('Course offering not found.');

  // Find all grades for this offering
  const grades = await prisma.courseGrade.findMany({
    where: {
      enrollment: { courseOfferingId },
    },
  });

  if (grades.length === 0) {
    throw new Error('No grades found to submit. Please enter assessment marks first.');
  }

  const now = new Date();

  // Transactionally set status to SUBMITTED for non-published grades
  await prisma.$transaction(async tx => {
    await tx.courseGrade.updateMany({
      where: {
        enrollment: { courseOfferingId },
        status: { not: 'PUBLISHED' },
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: now,
        submittedBy: userId,
      },
    });

    // Notify all Registrars
    const registrars = await tx.user.findMany({
      where: { role: 'REGISTRAR', status: 'ACTIVE' },
      select: { id: true },
    });

    for (const r of registrars) {
      await createNotification({
        userId: r.id,
        title: 'Grades Submitted to Registrar',
        message: `${instructor.user.fullName} has submitted final grades for ${offering.course.code} — ${offering.course.name}.`,
        type: 'INFO',
        entityType: 'CourseOffering',
        entityId: courseOfferingId,
        actionTab: 'students',
      }).catch(() => {});
    }
  });

  return {
    success: true,
    submittedCount: grades.length,
    submittedAt: now,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getNotifications(
  userId: string,
  params: { page?: number; limit?: number; unreadOnly?: boolean },
) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, params.limit ?? 20);
  const skip = (page - 1) * limit;

  const where: any = {
    userId,
    ...(params.unreadOnly && { isRead: false }),
  };

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    unreadCount: await prisma.notification.count({ where: { userId, isRead: false } }),
    notifications,
  };
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
    data: { isRead: true },
  });
  return { updatedCount: result.count };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuditLog(
  userId: string,
  params: { search?: string; page?: number; limit?: number },
) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, params.limit ?? 20);
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (params.search) {
    where.OR = [
      { action: { contains: params.search, mode: 'insensitive' } as any },
      { entityType: { contains: params.search, mode: 'insensitive' } as any },
      { description: { contains: params.search, mode: 'insensitive' } as any },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.registrarAuditLog.count({ where }),
    prisma.registrarAuditLog.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    logs,
  };
}

/** Write an instructor audit log entry. */
export async function writeAuditLog(data: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  // Map string action to RegistrarAction enum safely
  const { RegistrarAction } = await import('@prisma/client');
  const validAction = Object.values(RegistrarAction).includes(data.action as any)
    ? (data.action as any)
    : RegistrarAction.OFFERING_UPDATED; // fallback

  return prisma.registrarAuditLog.create({
    data: {
      userId: data.userId,
      action: validAction,
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
      metadata: (data.metadata as any) ?? undefined,
      ipAddress: data.ipAddress ?? null,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE REPORTS (instructor-scoped)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAttendanceReport(
  userId: string,
  courseOfferingId: string,
  params: { from?: string; to?: string; page?: number; limit?: number },
) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, params.limit ?? 30);
  const skip = (page - 1) * limit;

  const where: any = {
    attendanceSession: { classSession: { courseOfferingId } },
    ...(params.from || params.to) && {
      markedAt: {
        ...(params.from && { gte: new Date(params.from) }),
        ...(params.to && { lte: new Date(params.to) }),
      },
    },
  };

  const [total, records] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where, skip, take: limit,
      include: {
        studentRecord: {
          include: { user: { select: { fullName: true } } },
        },
        attendanceSession: {
          include: { classSession: { select: { date: true, startTime: true, endTime: true } } },
        },
      },
      orderBy: { markedAt: 'desc' },
    }),
  ]);

  // Overall stats for this offering
  const allRecords = await prisma.attendanceRecord.findMany({
    where: { attendanceSession: { classSession: { courseOfferingId } } },
    select: { status: true },
  });
  const totalRecords = allRecords.length;
  const totalPresent = allRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const overallRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    overallRate,
    records,
  };
}

/** Low-attendance students (instructor-scoped). */
export async function getLowAttendanceStudents(
  userId: string,
  courseOfferingId: string,
  threshold = 75,
) {
  const instructor = await resolveInstructor(userId);
  await verifyOfferingOwnership(courseOfferingId, instructor.id);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseOfferingId, status: { in: ACTIVE_STATUSES } },
    include: {
      studentRecord: { include: { user: { select: { fullName: true } } } },
    },
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
      const total = records.length;
      const present = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 100;
      return {
        studentRecordId: e.studentRecordId,
        studentId: e.studentRecord.studentId,
        fullName: e.studentRecord.user.fullName,
        rate,
        total,
        present,
        absent: total - present,
      };
    }),
  );

  return results.filter(r => r.rate < threshold && r.total > 0).sort((a, b) => a.rate - b.rate);
}
