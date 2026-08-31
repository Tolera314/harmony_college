/**
 * Student Dashboard Service
 * Aggregates all data needed for the student dashboard home screen:
 * profile KPIs, enrolled courses, today's timetable, announcements, alerts.
 * All queries are selective — no over-fetching.
 */
import { prisma } from '../../lib/prisma';

export async function getStudentDashboard(userId: string) {
  // 1. Resolve the student record from userId
  const studentRecord = await prisma.studentRecord.findUnique({
    where: { userId },
    select: {
      id: true,
      studentId: true,
      yearLevel: true,
      gpa: true,
      totalCredits: true,
      status: true,
      admittedAt: true,
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          totalCredits: true,
          durationYears: true,
        },
      },
      department: { select: { id: true, name: true, code: true } },
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
        },
      },
      financialAccount: {
        select: { balance: true, clearedForTerm: true },
      },
      graduationAudit: {
        select: { isEligible: true, status: true, completedCredits: true },
      },
    },
  });

  if (!studentRecord) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
        phone: true,
        studentProfile: {
          select: {
            program: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      student: {
        fullName:             user.fullName,
        studentId:            '',
        email:                user.email,
        phone:                user.phone,
        program:              user.studentProfile?.program ?? 'Not Enrolled',
        programCode:          '',
        department:           '',
        yearLevel:            1,
        status:               'PENDING',
        gpa:                  0,
        totalCredits:         0,
        admittedAt:           null,
        balance:              0,
        clearedForTerm:       false,
        isGraduationEligible: false,
      },
      kpis: {
        gpa:                  0,
        completedCredits:     0,
        totalRequiredCredits: 0,
        attendanceRate:       0,
        accountBalance:       0,
        clearedForTerm:       false,
        pendingAssignments:   0,
        totalAssignments:     0,
      },
      courses:        [],
      todayTimetable: [],
      announcements:  [],
      upcomingEvents: [],
    };
  }

  // 2. Active enrollments with course + instructor + timetable
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentRecordId: studentRecord.id,
      status: { in: ['ACTIVE', 'FORCE_ADDED'] },
    },
    include: {
      courseOffering: {
        include: {
          course: { select: { id: true, code: true, name: true, creditHours: true, description: true } },
          semester: { include: { academicYear: { select: { name: true } } } },
          instructor: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
          room: { select: { name: true, building: true } },
          timetables: { select: { dayOfWeek: true, startTime: true, endTime: true } },
          _count: {
            select: {
              assignments: { where: { status: 'PUBLISHED' } },
            },
          },
        },
      },
      grade: { select: { letterGrade: true, gradePoints: true } },
    },
    orderBy: { enrolledAt: 'asc' },
  });

  // 3. Today's timetable — find slots for today's day-of-week
  const todayDow = new Date().getDay(); // 0=Sun, 1=Mon, ...
  // Convert JS Sunday=0 to our Mon=0 format
  const adjustedDow = todayDow === 0 ? 6 : todayDow - 1;

  const offeringIds = enrollments.map(e => e.courseOfferingId);
  const todaySlots = await prisma.timetableSlot.findMany({
    where: {
      courseOfferingId: { in: offeringIds },
      dayOfWeek: adjustedDow,
    },
    include: {
      courseOffering: {
        include: {
          course: { select: { code: true, name: true } },
          room: { select: { name: true, building: true } },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  // 4. Pending assignments count
  const pendingAssignments = await prisma.assignmentSubmission.count({
    where: {
      studentRecordId: studentRecord.id,
      status: { notIn: ['SUBMITTED', 'GRADED', 'RETURNED'] as any },
    },
  }).catch(() => 0);

  const totalAssignments = await prisma.assignment.count({
    where: {
      courseOfferingId: { in: offeringIds },
      status: 'PUBLISHED',
      dueDate: { gte: new Date() },
    },
  }).catch(() => 0);

  // 5. Attendance rate across all active enrollments
  const attendanceData = await prisma.attendanceRecord.findMany({
    where: { studentRecordId: studentRecord.id },
    select: { status: true },
  });  const totalSessions = attendanceData.length;
  const presentSessions = attendanceData.filter(
    a => a.status === 'PRESENT' || a.status === 'LATE',
  ).length;
  const attendanceRate =
    totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

  // 6. Active announcements targeted to this student
  const announcements = await prisma.announcement.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { targetAudience: 'ALL' },
        { targetAudience: { contains: studentRecord.program.code } },
        { targetAudience: { contains: studentRecord.department.code } },
      ],
      AND: [
        {
          OR: [
            { expirationDate: null },
            { expirationDate: { gte: new Date() } },
          ],
        },
      ],
    },
    orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
    take: 5,
    select: {
      id: true,
      title: true,
      content: true,
      priority: true,
      publishedAt: true,
      targetAudience: true,
    },
  });

  // 7. Upcoming calendar events
  const upcomingEvents = await prisma.academicCalendarEvent.findMany({
    where: {
      isPublished: true,
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: 'asc' },
    take: 4,
    select: { id: true, title: true, eventType: true, startDate: true, endDate: true },
  });

  // 8. Map enrollment data + per-course progress
  const courses = await Promise.all(
    enrollments.map(async enroll => {
      const offeringId = enroll.courseOfferingId;
      const offering = enroll.courseOffering;

      // Assignment due soon for this course
      const nextAssignment = await prisma.assignment.findFirst({
        where: {
          courseOfferingId: offeringId,
          status: 'PUBLISHED',
          dueDate: { gte: new Date() },
          submissions: {
            none: { studentRecordId: studentRecord.id },
          },
        },
        orderBy: { dueDate: 'asc' },
        select: { id: true, title: true, dueDate: true },
      });

      // Course-specific attendance
      const courseAttendance = await prisma.attendanceRecord.findMany({
        where: {
          studentRecordId: studentRecord.id,
          attendanceSession: { classSession: { courseOfferingId: offeringId } },
        },
        select: { status: true },
      });
      const courseSessions = courseAttendance.length;
      const coursePresent = courseAttendance.filter(
        a => a.status === 'PRESENT' || a.status === 'LATE',
      ).length;
      const courseAttendanceRate =
        courseSessions > 0 ? Math.round((coursePresent / courseSessions) * 100) : null;

      // Course progress based on graded assignments / total published assignments
      const totalPublished = await prisma.assignment.count({
        where: { courseOfferingId: offeringId, status: 'PUBLISHED' },
      });
      const graded = await prisma.assignmentSubmission.count({
        where: { studentRecordId: studentRecord.id, assignmentId: { in: await prisma.assignment.findMany({ where: { courseOfferingId: offeringId }, select: { id: true } }).then(a => a.map(x => x.id)) }, status: { in: ['GRADED', 'RETURNED'] as any } },
      });
      const progress = totalPublished > 0 ? Math.round((graded / totalPublished) * 100) : 0;

      return {
        enrollmentId: enroll.id,
        offeringId,
        courseId: offering.course.id,
        code: offering.course.code,
        name: offering.course.name,
        description: offering.course.description,
        creditHours: offering.course.creditHours,
        instructor: offering.instructor
          ? {
              name: offering.instructor.user.fullName,
              title: offering.instructor.title,
              email: offering.instructor.user.email,
            }
          : null,
        room: offering.room
          ? `${offering.room.building} ${offering.room.name}`
          : null,
        timetables: offering.timetables,
        semester: `${offering.semester.name} — ${offering.semester.academicYear.name}`,
        currentGrade: enroll.grade?.letterGrade ?? null,
        attendanceRate: courseAttendanceRate,
        progress,
        nextAssignment: nextAssignment
          ? {
              id: nextAssignment.id,
              title: nextAssignment.title,
              dueDate: nextAssignment.dueDate,
            }
          : null,
      };
    }),
  );

  return {
    student: {
      studentId: studentRecord.studentId,
      fullName: studentRecord.user.fullName,
      email: studentRecord.user.email,
      phone: studentRecord.user.phone,
      program: studentRecord.program.name,
      programCode: studentRecord.program.code,
      department: studentRecord.department.name,
      yearLevel: studentRecord.yearLevel,
      status: studentRecord.status,
      admittedAt: studentRecord.admittedAt,
    },
    kpis: {
      gpa: studentRecord.gpa,
      completedCredits: studentRecord.totalCredits,
      totalRequiredCredits: studentRecord.program.totalCredits,
      attendanceRate,
      accountBalance: studentRecord.financialAccount?.balance ?? 0,
      clearedForTerm: studentRecord.financialAccount?.clearedForTerm ?? null,
      pendingAssignments: totalAssignments,
      isGraduationEligible: studentRecord.graduationAudit?.isEligible ?? false,
    },
    courses,
    todayTimetable: todaySlots.map(slot => ({
      id: slot.id,
      time: `${slot.startTime} – ${slot.endTime}`,
      title: `${slot.courseOffering.course.code}: ${slot.courseOffering.course.name}`,
      courseCode: slot.courseOffering.course.code,
      location: slot.courseOffering.room
        ? `${slot.courseOffering.room.building}, Room ${slot.courseOffering.room.name}`
        : 'TBA',
    })),
    announcements,
    upcomingEvents,
  };
}
