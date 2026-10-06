/**
 * Student Course Service
 * Handles My Courses view — enrolled courses with full detail,
 * per-course assignments, quizzes, attendance, and grades.
 */
import { prisma } from '../../lib/prisma';
import { resolveDepartmentFamilyIds } from '../../lib/departmentHierarchy';

/**
 * Ensures that all currently PUBLISHED courses for a student's department family
 * and programType are automatically enrolled for the student, provided the student
 * is fully approved by both Finance Officer and Registrar.
 * If any course was unpublished by the HOD, its active enrollment is dropped.
 */
export async function syncStudentPublishedCourses(studentRecordId: string): Promise<boolean> {
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

  if (!student || student.status !== 'ACTIVE') return false;

  const isFinanceApproved = student.user?.studentProfile?.paymentVerifiedByFinance === true;
  const isRegistrarApproved = student.user?.application?.status === 'ACCEPTED';

  // Gate: Only students who completed Finance Officer and Registrar approvals can be enrolled
  if (!isFinanceApproved || !isRegistrarApproved) {
    return false;
  }

  const deptIds = await resolveDepartmentFamilyIds(student.departmentId);

  // Find current semester matching programType, or fallback to current semester
  const currentSemester = await prisma.semester.findFirst({
    where: {
      isCurrent: true,
      programType: student.programType,
    },
  }) || await prisma.semester.findFirst({
    where: { isCurrent: true },
  });

  if (!currentSemester) return false;

  // 1. Find all ACTIVE (PUBLISHED) courses in student's department family matching programType
  const publishedCourses = await prisma.course.findMany({
    where: {
      departmentId: { in: deptIds },
      status: 'ACTIVE',
      programType: student.programType,
    },
    include: {
      offerings: {
        where: {
          semesterId: currentSemester.id,
        },
      },
    },
  });

  for (const course of publishedCourses) {
    let offering = course.offerings[0];
    if (!offering) {
      offering = await prisma.courseOffering.create({
        data: {
          courseId: course.id,
          semesterId: currentSemester.id,
          section: 'A',
          capacity: 40,
          status: 'ACTIVE',
          programType: course.programType,
        },
      });
    } else if (offering.status !== 'ACTIVE') {
      offering = await prisma.courseOffering.update({
        where: { id: offering.id },
        data: { status: 'ACTIVE' },
      });
    }

    await prisma.enrollment.upsert({
      where: {
        studentRecordId_courseOfferingId: {
          studentRecordId: student.id,
          courseOfferingId: offering.id,
        },
      },
      update: {
        status: 'ACTIVE',
        droppedAt: null,
        dropReason: null,
      },
      create: {
        studentRecordId: student.id,
        courseOfferingId: offering.id,
        status: 'ACTIVE',
        enrolledAt: new Date(),
      },
    });
  }

  // 2. Drop active enrollments for any course that has been unpublished/deactivated (status != ACTIVE)
  const unpublishedOfferings = await prisma.courseOffering.findMany({
    where: {
      course: {
        departmentId: { in: deptIds },
        status: { not: 'ACTIVE' },
      },
    },
    select: { id: true },
  });

  if (unpublishedOfferings.length > 0) {
    await prisma.enrollment.updateMany({
      where: {
        studentRecordId: student.id,
        courseOfferingId: { in: unpublishedOfferings.map(o => o.id) },
        status: 'ACTIVE',
      },
      data: {
        status: 'DROPPED',
        droppedAt: new Date(),
        dropReason: 'Course unpublished by Department Head',
      },
    });
  }

  return true;
}

export async function getEnrolledCourses(studentRecordId: string) {
  // Sync published courses first
  await syncStudentPublishedCourses(studentRecordId);

  // Fetch student verification info
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

  if (!student || student.status !== 'ACTIVE') return [];

  // Gate: Only students who completed Finance Officer and Registrar approval can see courses
  const isFinanceApproved = student.user?.studentProfile?.paymentVerifiedByFinance === true;
  const isRegistrarApproved = student.user?.application?.status === 'ACCEPTED';
  if (!isFinanceApproved || !isRegistrarApproved) {
    return [];
  }

  const deptIds = await resolveDepartmentFamilyIds(student.departmentId);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentRecordId,
      status: { in: ['ACTIVE', 'FORCE_ADDED', 'COMPLETED'] },
      courseOffering: {
        status: 'ACTIVE',
        course: {
          status: 'ACTIVE',
          departmentId: { in: deptIds },
          programType: student.programType,
        },
      },
    },
    include: {
      courseOffering: {
        include: {
          course: {
            include: {
              department: { select: { name: true } },
              prerequisites: {
                include: { prerequisite: { select: { code: true, name: true } } },
              },
            },
          },
          semester: { include: { academicYear: { select: { name: true } } } },
          instructor: {
            include: { user: { select: { fullName: true, email: true } } },
          },
          room: { select: { name: true, building: true } },
          timetables: { orderBy: { dayOfWeek: 'asc' } },
        },
      },
      grade: true,
    },
    orderBy: [
      { courseOffering: { semester: { startDate: 'desc' } } },
      { enrolledAt: 'asc' },
    ],
  });

  return Promise.all(
    enrollments.map(async enroll => {
      const offeringId = enroll.courseOfferingId;
      const offering = enroll.courseOffering;

      // Attendance for this course
      const attendance = await prisma.attendanceRecord.findMany({
        where: {
          studentRecordId,
          attendanceSession: { classSession: { courseOfferingId: offeringId } },
        },
        include: {
          attendanceSession: { include: { classSession: { select: { date: true, topic: true } } } },
        },
        orderBy: { attendanceSession: { classSession: { date: 'desc' } } },
      });

      const totalSessions = attendance.length;
      const presentCount = attendance.filter(
        a => a.status === 'PRESENT' || a.status === 'LATE',
      ).length;
      const attendanceRate =
        totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null;

      // Assignments for this course + student's submission status
      const assignments = await prisma.assignment.findMany({
        where: { courseOfferingId: offeringId, status: 'PUBLISHED' },
        include: {
          attachments: true,
          submissions: {
            where: { studentRecordId },
            select: {
              id: true,
              status: true,
              submittedAt: true,
              score: true,
              letterGrade: true,
              feedback: true,
              fileName: true,
              fileUrl: true,
              textContent: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      // Quizzes for this course + attempt status
      const quizzes = await prisma.quiz.findMany({
        where: { courseOfferingId: offeringId, status: { in: ['ACTIVE', 'CLOSED', 'PUBLISHED'] } },
        include: {
          questions: {
            include: { options: true },
            orderBy: { orderIndex: 'asc' },
          },
          attempts: {
            where: { studentRecordId },
            orderBy: { startedAt: 'desc' },
            take: 1,
            include: { answers: true },
          },
        },
        orderBy: { availableFrom: 'asc' },
      });

      return {
        enrollmentId: enroll.id,
        enrollmentStatus: enroll.status,
        enrolledAt: enroll.enrolledAt,
        courseOffering: {
          id: offeringId,
          section: offering.section,
          status: offering.status,
        },
        course: {
          id: offering.course.id,
          code: offering.course.code,
          name: offering.course.name,
          description: offering.course.description,
          creditHours: offering.course.creditHours,
          department: offering.course.department.name,
          prerequisites: offering.course.prerequisites.map(p => ({
            code: p.prerequisite.code,
            name: p.prerequisite.name,
          })),
        },
        instructor: offering.instructor
          ? {
            name: offering.instructor.user.fullName,
            email: offering.instructor.user.email,
            title: offering.instructor.title,
            specialization: offering.instructor.specialization,
          }
          : null,
        room: offering.room
          ? { name: offering.room.name, building: offering.room.building }
          : null,
        timetables: offering.timetables.map(t => ({
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          endTime: t.endTime,
        })),
        semester: {
          name: offering.semester.name,
          academicYear: offering.semester.academicYear.name,
          startDate: offering.semester.startDate,
          endDate: offering.semester.endDate,
        },
        grade: enroll.grade
          ? {
            letterGrade: enroll.grade.letterGrade,
            gradePoints: enroll.grade.gradePoints,
            gradedAt: enroll.grade.gradedAt,
          }
          : null,
        attendanceRate,
        attendanceSummary: {
          total: totalSessions,
          present: presentCount,
          absent: attendance.filter(a => a.status === 'ABSENT').length,
          late: attendance.filter(a => a.status === 'LATE').length,
        },
        assignments: assignments.map(a => {
          const submission = a.submissions[0] ?? null;
          return {
            id: a.id,
            title: a.title,
            description: a.description,
            instructions: a.instructions,
            dueDate: a.dueDate,
            totalPoints: a.totalPoints,
            allowLateSubmit: a.allowLateSubmit,
            attachments: a.attachments.map(att => ({
              name: att.fileName,
              size: att.fileSize,
              type: att.fileType,
              url: att.fileUrl,
            })),
            submission: submission
              ? {
                id: submission.id,
                status: submission.status,
                submittedAt: submission.submittedAt,
                score: submission.score,
                letterGrade: submission.letterGrade,
                feedback: submission.feedback,
                fileName: submission.fileName,
                textContent: submission.textContent,
              }
              : null,
          };
        }),
        quizzes: quizzes.map(qz => {
          const attempt = qz.attempts[0] ?? null;
          return {
            id: qz.id,
            title: qz.title,
            description: qz.description,
            instructions: qz.instructions,
            durationMinutes: qz.durationMinutes,
            availableFrom: qz.availableFrom,
            availableUntil: qz.availableUntil,
            passingScore: qz.passingScore,
            maxAttempts: qz.maxAttempts,
            totalPoints: qz.totalPoints,
            showResultsImmediately: qz.showResultsImmediately,
            questionCount: qz.questions.length,
            questions: qz.questions.map(q => ({
              id: q.id,
              type: q.type,
              questionText: q.questionText,
              points: q.points,
              options: q.options.map(o => ({ id: o.id, text: o.text })),
            })),
            attempt: attempt
              ? {
                id: attempt.id,
                status: attempt.status,
                startedAt: attempt.startedAt,
                submittedAt: attempt.submittedAt,
                score: attempt.score,
                percentageScore: attempt.percentageScore,
                isPassing: attempt.isPassing,
                feedback: attempt.feedback,
                answers: attempt.answers.reduce<Record<string, string>>((acc, ans) => {
                  acc[ans.questionId] = ans.answerText ?? ans.selectedOptionId ?? '';
                  return acc;
                }, {}),
              }
              : null,
          };
        }),
      };
    }),
  );
}

export async function getCourseById(offeringId: string, studentRecordId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseOfferingId: offeringId, studentRecordId },
  });
  if (!enrollment) return null;

  const courses = await getEnrolledCourses(studentRecordId);
  return courses.find(c => c.courseOffering.id === offeringId) ?? null;
}
