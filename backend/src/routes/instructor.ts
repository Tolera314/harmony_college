/**
 * /api/instructor  — Instructor-specific endpoints
 *
 * GET  /api/instructor/schedule                    — full weekly timetable
 * GET  /api/instructor/schedule/today              — today's sessions with attendance status
 *
 * GET  /api/instructor/notifications               — paginated inbox (userId-scoped)
 * PATCH /api/instructor/notifications/:id/read     — mark one read (IDOR-safe)
 * POST  /api/instructor/notifications/read-all     — mark all read
 */

import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  getNotifications        as getInstructorNotifications,
  markNotificationRead    as markInstructorNotificationRead,
  markAllNotificationsRead as markAllInstructorNotificationsRead,
  getDashboardStats,
  getMyClasses,
  getTimetable,
  getRoster,
  getStudentAcademicView,
  getCourseGrades,
  saveAssessmentGrade,
  saveBatchAssessmentGrades,
  submitCourseGradesToRegistrar,
  getAttendanceReport,
  getLowAttendanceStudents,
  getAssignments,
  getAssignmentDetail,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  gradeSubmission,
  getQuizzes,
  getQuizDetail,
  createQuiz,
  updateQuiz,
  getInstructorProfile,
  updateInstructorProfile,
  getAuditLog,
} from '../services/instructor/instructorService';

const router = Router();
router.use(authenticate, requireRole([Role.INSTRUCTOR, Role.REGISTRAR, Role.ADMIN, Role.SUPER_ADMIN, Role.DEPARTMENT_HEAD]));

function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function fail(res: Response, err: unknown, status?: number) {
  const msg = err instanceof Error ? err.message : 'Unexpected error';
  res.status(status ?? (msg.includes('not found') ? 404 : 500)).json({ error: msg });
}

// ── Resolve instructor record from userId ─────────────────────────────────
async function resolveInstructor(userId: string) {
  const ir = await prisma.instructorRecord.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!ir) throw new Error('Instructor record not found');
  return ir.id;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD & ACADEMIC CONTEXT (spec §6 & §7)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const programType = req.query.programType as 'TVET' | 'SHORT_PROGRAM' | undefined;
    ok(res, await getDashboardStats(req.user!.userId, programType));
  } catch (e) { fail(res, e); }
});

router.get('/classes', async (req: AuthRequest, res) => {
  try {
    const programType = req.query.programType as 'TVET' | 'SHORT_PROGRAM' | undefined;
    ok(res, await getMyClasses(req.user!.userId, programType));
  } catch (e) { fail(res, e); }
});

router.get('/timetable', async (req: AuthRequest, res) => {
  try {
    ok(res, await getTimetable(req.user!.userId));
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// FULL WEEKLY SCHEDULE & SESSIONS (spec §13)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/schedule', async (req: AuthRequest, res) => {
  try {
    const instructorId = await resolveInstructor(req.user!.userId);

    const slots = await prisma.timetableSlot.findMany({
      where: {
        instructorId,
        status: { in: ['PUBLISHED'] },
      },
      include: {
        courseOffering: {
          include: {
            course: { select: { code: true, name: true, creditHours: true } },
            semester: { include: { academicYear: { select: { name: true } } } },
            room: { select: { name: true, building: true, roomType: true } },
            _count: {
              select: {
                enrollments: { where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] } } },
              },
            },
          },
        },
        room: { select: { name: true, building: true, roomType: true, capacity: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    ok(res, slots);
  } catch (e) { fail(res, e); }
});

router.get('/schedule/today', async (req: AuthRequest, res) => {
  try {
    const instructorId = await resolveInstructor(req.user!.userId);

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    const sessions = await prisma.classSession.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        courseOffering: { instructorId },
      },
      include: {
        courseOffering: {
          include: {
            course: { select: { code: true, name: true } },
            room: { select: { name: true, building: true } },
            _count: {
              select: {
                enrollments: { where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] } } },
              },
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

    ok(res, sessions);
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROSTER & STUDENT ACADEMIC VIEW (Ownership protected)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/classes/:offeringId/roster', async (req: AuthRequest, res) => {
  try {
    const qp = req.query as Record<string, string | undefined>;
    ok(res, await getRoster(req.user!.userId, String(req.params.offeringId), {
      search: qp.search,
      status: qp.status,
      page: qp.page ? parseInt(qp.page, 10) : 1,
      limit: qp.limit ? parseInt(qp.limit, 10) : 30,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/classes/:offeringId/student/:studentRecordId', async (req: AuthRequest, res) => {
  try {
    ok(res, await getStudentAcademicView(req.user!.userId, String(req.params.offeringId), String(req.params.studentRecordId)));
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// GRADES & RESULTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/grade-editing-status', async (req: AuthRequest, res) => {
  try {
    const setting = await prisma.gradeEditingSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default', isOpen: true },
      update: {},
    });
    ok(res, { isOpen: setting.isOpen });
  } catch (e) { fail(res, e); }
});

router.get('/classes/:offeringId/grades', async (req: AuthRequest, res) => {
  try {
    const result = await getCourseGrades(req.user!.userId, String(req.params.offeringId));
    ok(res, Array.isArray(result) ? result : result.students);
  } catch (e) { fail(res, e); }
});

router.post('/classes/:offeringId/grades/:enrollmentId/assessments', async (req: AuthRequest, res) => {
  try {
    ok(res, await saveAssessmentGrade(req.user!.userId, String(req.params.offeringId), String(req.params.enrollmentId), req.body));
  } catch (e) { fail(res, e, 400); }
});

router.post('/classes/:offeringId/grades/batch-assessments', async (req: AuthRequest, res) => {
  try {
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    ok(res, await saveBatchAssessmentGrades(req.user!.userId, String(req.params.offeringId), entries));
  } catch (e) { fail(res, e, 400); }
});

router.post('/classes/:offeringId/grades/submit-to-registrar', async (req: AuthRequest, res) => {
  try {
    ok(res, await submitCourseGradesToRegistrar(req.user!.userId, String(req.params.offeringId)));
  } catch (e) { fail(res, e, 400); }
});

router.post('/classes/:offeringId/grades/:enrollmentId', async (req: AuthRequest, res) => {
  try {
    // If body contains assessment breakdown, save via saveAssessmentGrade
    if (req.body && (req.body.assignment !== undefined || req.body.quiz !== undefined || req.body.midExam !== undefined || req.body.finalExam !== undefined)) {
      ok(res, await saveAssessmentGrade(req.user!.userId, String(req.params.offeringId), String(req.params.enrollmentId), req.body));
    } else {
      // Fallback for legacy calls
      ok(res, await saveAssessmentGrade(req.user!.userId, String(req.params.offeringId), String(req.params.enrollmentId), {}));
    }
  } catch (e) { fail(res, e, 400); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE REPORTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/classes/:offeringId/attendance/report', async (req: AuthRequest, res) => {
  try {
    const qp = req.query as Record<string, string | undefined>;
    ok(res, await getAttendanceReport(req.user!.userId, String(req.params.offeringId), {
      from: qp.from,
      to: qp.to,
      page: qp.page ? parseInt(qp.page, 10) : 1,
      limit: qp.limit ? parseInt(qp.limit, 10) : 30,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/classes/:offeringId/attendance/low', async (req: AuthRequest, res) => {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold as string, 10) : 75;
    ok(res, await getLowAttendanceStudents(req.user!.userId, String(req.params.offeringId), threshold));
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS & SUBMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/assignments', async (req: AuthRequest, res) => {
  try {
    ok(res, await getAssignments(req.user!.userId, req.query.courseOfferingId as string | undefined));
  } catch (e) { fail(res, e); }
});

router.get('/assignments/:id', async (req: AuthRequest, res) => {
  try {
    ok(res, await getAssignmentDetail(req.user!.userId, String(req.params.id)));
  } catch (e) { fail(res, e); }
});

router.post('/assignments', async (req: AuthRequest, res) => {
  try {
    const { courseOfferingId, ...data } = req.body;
    ok(res, await createAssignment(req.user!.userId, courseOfferingId, data), 201);
  } catch (e) { fail(res, e); }
});

router.patch('/assignments/:id', async (req: AuthRequest, res) => {
  try {
    ok(res, await updateAssignment(req.user!.userId, String(req.params.id), req.body));
  } catch (e) { fail(res, e); }
});

router.delete('/assignments/:id', async (req: AuthRequest, res) => {
  try {
    ok(res, await deleteAssignment(req.user!.userId, String(req.params.id)));
  } catch (e) { fail(res, e); }
});

router.post('/assignments/:id/submissions/:submissionId/grade', async (req: AuthRequest, res) => {
  try {
    ok(res, await gradeSubmission(req.user!.userId, String(req.params.submissionId), req.body));
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// QUIZZES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/quizzes', async (req: AuthRequest, res) => {
  try {
    ok(res, await getQuizzes(req.user!.userId, req.query.courseOfferingId as string | undefined));
  } catch (e) { fail(res, e); }
});

router.get('/quizzes/:id', async (req: AuthRequest, res) => {
  try {
    ok(res, await getQuizDetail(req.user!.userId, String(req.params.id)));
  } catch (e) { fail(res, e); }
});

router.post('/quizzes', async (req: AuthRequest, res) => {
  try {
    const { courseOfferingId, ...data } = req.body;
    ok(res, await createQuiz(req.user!.userId, courseOfferingId, data), 201);
  } catch (e) { fail(res, e); }
});

router.patch('/quizzes/:id', async (req: AuthRequest, res) => {
  try {
    ok(res, await updateQuiz(req.user!.userId, String(req.params.id), req.body));
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE & AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/profile', async (req: AuthRequest, res) => {
  try {
    ok(res, await getInstructorProfile(req.user!.userId));
  } catch (e) { fail(res, e); }
});

router.patch('/profile', async (req: AuthRequest, res) => {
  try {
    ok(res, await updateInstructorProfile(req.user!.userId, req.body));
  } catch (e) { fail(res, e); }
});

router.get('/audit-log', async (req: AuthRequest, res) => {
  try {
    const qp = req.query as Record<string, string | undefined>;
    ok(res, await getAuditLog(req.user!.userId, {
      search: qp.search,
      page: qp.page ? parseInt(qp.page, 10) : 1,
      limit: qp.limit ? parseInt(qp.limit, 10) : 20,
    }));
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS  (scoped strictly to the authenticated instructor's userId)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    ok(res, await getInstructorNotifications(req.user!.userId, {
      page:       q.page       ? parseInt(q.page,  10) : 1,
      limit:      q.limit      ? parseInt(q.limit, 10) : 20,
      unreadOnly: q.unreadOnly === 'true',
    }));
  } catch (e) { fail(res, e); }
});

router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    ok(res, await markInstructorNotificationRead(req.user!.userId, String(req.params.id)));
  } catch (e) { fail(res, e); }
});

router.post('/notifications/read-all', async (req: AuthRequest, res) => {
  try {
    ok(res, await markAllInstructorNotificationsRead(req.user!.userId));
  } catch (e) { fail(res, e); }
});

export default router;
