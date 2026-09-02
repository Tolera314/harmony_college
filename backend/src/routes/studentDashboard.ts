/**
 * /api/student/dashboard  — all student-facing endpoints
 *
 * All routes require: authenticate + requireRole([STUDENT])
 * The studentRecordId is always resolved from req.user.userId on the server.
 * It is NEVER trusted from the request body or query params.
 *
 * Route map:
 *  GET  /api/student/dashboard              — home dashboard
 *  GET  /api/student/dashboard/courses      — enrolled courses (full)
 *  GET  /api/student/dashboard/courses/:offeringId — single course detail
 *  GET  /api/student/dashboard/assignments  — all assignments (with filters)
 *  GET  /api/student/dashboard/assignments/:id — single assignment
 *  POST /api/student/dashboard/assignments/:id/submit — submit
 *  GET  /api/student/dashboard/quizzes/:courseOfferingId — quizzes for course
 *  POST /api/student/dashboard/quizzes/:quizId/start   — start / resume attempt
 *  POST /api/student/dashboard/quizzes/attempts/:attemptId/answer — save answer
 *  POST /api/student/dashboard/quizzes/attempts/:attemptId/submit — submit
 *  GET  /api/student/dashboard/quizzes/attempts/:attemptId/result — result
 *  GET  /api/student/dashboard/grades       — grade history + GPA
 *  GET  /api/student/dashboard/transcript   — full transcript data
 *  GET  /api/student/dashboard/financials   — account + transactions
 *  POST /api/student/dashboard/financials/pay — process payment
 *  GET  /api/student/dashboard/degree-audit — degree progress
 *  GET  /api/student/dashboard/support/appointments   — list appointments
 *  POST /api/student/dashboard/support/appointments   — book appointment
 *  DELETE /api/student/dashboard/support/appointments/:id — cancel
 *  GET  /api/student/dashboard/settings     — get settings
 *  PATCH /api/student/dashboard/settings/profile — update name/phone/email
 *  PATCH /api/student/dashboard/settings/notifications — update prefs
 *  POST  /api/student/dashboard/settings/password — change password
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import * as dashboard    from '../services/student/dashboardService';
import * as coursesSvc   from '../services/student/courseService';
import * as assignSvc    from '../services/student/assignmentService';
import * as quizSvc      from '../services/student/quizService';
import * as gradesSvc    from '../services/student/gradesService';
import * as financialSvc from '../services/student/financialsService';
import * as degreeSvc    from '../services/student/degreeAuditService';
import * as supportSvc   from '../services/student/supportService';
import * as settingsSvc  from '../services/student/settingsService';

const router = Router();
router.use(authenticate, requireRole([Role.STUDENT]));

// ── Helpers ──────────────────────────────────────────────────────────────────

type Q = Record<string, string | undefined>;
function q(req: AuthRequest): Q { return req.query as Q; }
function pid(req: AuthRequest, key = 'id'): string { return req.params[key] as string; }

function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json(data);
}

function fail(res: Response, err: unknown, defaultStatus = 500) {
  const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
  const status =
    msg.includes('not found') || msg.includes('Not found') ? 404 :
    msg.includes('Unauthorized') || msg.includes('unauthorized') ? 403 :
    msg.includes('already') || msg.includes('deadline') || msg.includes('Maximum') ? 409 :
    msg.includes('Invalid') || msg.includes('required') || msg.includes('expired') ? 400 :
    defaultStatus;
  res.status(status).json({ error: msg });
}

/** Resolves studentRecord.id from userId — throws 404 if not found */
async function resolveStudentRecord(userId: string): Promise<string> {
  const sr = await prisma.studentRecord.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!sr) throw new Error('Student record not found. Please contact the Registrar.');
  return sr.id;
}

/** Resolves studentRecord.id from userId — returns null if not found */
async function resolveStudentRecordOptional(userId: string): Promise<string | null> {
  const sr = await prisma.studentRecord.findUnique({
    where: { userId },
    select: { id: true },
  });
  return sr?.id ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', async (req: AuthRequest, res) => {
  try {
    const data = await dashboard.getStudentDashboard(req.user!.userId);
    if (!data) { res.status(404).json({ error: 'Student record not found' }); return; }
    ok(res, data);
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// TIMETABLE (spec §12 — read-only for students, shows only enrolled courses)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/timetable', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecordOptional(req.user!.userId);
    if (!srId) { ok(res, { slots: [], offeringIds: [] }); return; }

    // Active enrollments for this student
    const enrollments = await prisma.enrollment.findMany({
      where: { studentRecordId: srId, status: { in: ['ACTIVE', 'FORCE_ADDED'] } },
      select: { courseOfferingId: true },
    });
    const offeringIds = enrollments.map(e => e.courseOfferingId);

    if (!offeringIds.length) { ok(res, { slots: [], offeringIds: [] }); return; }

    const slots = await prisma.timetableSlot.findMany({
      where: {
        courseOfferingId: { in: offeringIds },
        status: { in: ['PUBLISHED'] },
      },
      include: {
        courseOffering: {
          include: {
            course: { select: { code: true, name: true, creditHours: true } },
            instructor: { include: { user: { select: { fullName: true } } } },
            room: { select: { name: true, building: true, roomType: true } },
            semester: { include: { academicYear: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    ok(res, { slots, offeringIds });
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// COURSES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/courses', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecordOptional(req.user!.userId);
    if (!srId) { ok(res, []); return; }
    ok(res, await coursesSvc.getEnrolledCourses(srId));
  } catch (e) { fail(res, e); }
});

router.get('/courses/:offeringId', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const course = await coursesSvc.getCourseById(pid(req, 'offeringId'), srId);
    if (!course) { res.status(404).json({ error: 'Course not found or not enrolled' }); return; }
    ok(res, course);
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/assignments', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecordOptional(req.user!.userId);
    if (!srId) { ok(res, []); return; }
    const qp = q(req);
    const assignments = await assignSvc.listAssignments(srId, {
      status: qp.status,
      courseOfferingId: qp.courseOfferingId,
      upcoming: qp.upcoming === 'true',
    });
    ok(res, assignments);
  } catch (e) { fail(res, e); }
});

router.get('/assignments/:id', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const assignment = await assignSvc.getAssignmentById(pid(req), srId);
    if (!assignment) { res.status(404).json({ error: 'Assignment not found' }); return; }
    ok(res, assignment);
  } catch (e) { fail(res, e); }
});

router.post('/assignments/:id/submit', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const schema = z.object({
      fileUrl:     z.string().url().optional(),
      fileName:    z.string().max(255).optional(),
      fileSize:    z.string().max(20).optional(),
      textContent: z.string().max(50000).optional(),
    }).refine(d => d.fileUrl || d.textContent?.trim(), {
      message: 'Provide either a file upload or written text',
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' });
      return;
    }

    const submission = await assignSvc.submitAssignment({
      assignmentId: pid(req),
      studentRecordId: srId,
      ...parsed.data,
    });
    ok(res, submission, 201);
  } catch (e) { fail(res, e, 400); }
});

// ═══════════════════════════════════════════════════════════════════════════
// QUIZZES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/quizzes/:courseOfferingId', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecordOptional(req.user!.userId);
    if (!srId) { ok(res, []); return; }
    ok(res, await quizSvc.listQuizzesForCourse(pid(req, 'courseOfferingId'), srId));
  } catch (e) { fail(res, e); }
});

router.post('/quizzes/:quizId/start', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const result = await quizSvc.startQuizAttempt(pid(req, 'quizId'), srId);
    ok(res, result, 201);
  } catch (e) { fail(res, e, 400); }
});

router.post('/quizzes/attempts/:attemptId/answer', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const schema = z.object({
      questionId: z.string().uuid(),
      answer:     z.string().max(10000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'questionId and answer are required' });
      return;
    }
    const result = await quizSvc.saveAnswer(
      pid(req, 'attemptId'),
      parsed.data.questionId,
      parsed.data.answer,
      srId,
    );
    ok(res, result);
  } catch (e) { fail(res, e, 400); }
});

router.post('/quizzes/attempts/:attemptId/submit', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const result = await quizSvc.submitQuizAttempt(pid(req, 'attemptId'), srId);
    ok(res, result);
  } catch (e) { fail(res, e, 400); }
});

router.get('/quizzes/attempts/:attemptId/result', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const result = await quizSvc.getAttemptResult(pid(req, 'attemptId'), srId);
    ok(res, result);
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// GRADES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/grades', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecordOptional(req.user!.userId);
    if (!srId) {
      ok(res, { gpa: 0, totalCredits: 0, completedCredits: 0, records: [] });
      return;
    }
    ok(res, await gradesSvc.getGradeHistory(srId));
  } catch (e) { fail(res, e); }
});

router.get('/transcript', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecordOptional(req.user!.userId);
    if (!srId) {
      ok(res, {
        student: { fullName: '', studentId: '', program: '', yearLevel: 1, gpa: 0, totalCredits: 0, admittedAt: null },
        terms: [],
      });
      return;
    }
    const data = await gradesSvc.getTranscriptData(srId);
    if (!data) { res.status(404).json({ error: 'Transcript data not found' }); return; }
    ok(res, data);
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIALS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/financials', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecordOptional(req.user!.userId);
    if (!srId) {
      ok(res, { balance: 0, clearedForTerm: false, transactions: [] });
      return;
    }
    ok(res, await financialSvc.getFinancialSummary(srId));
  } catch (e) { fail(res, e); }
});

router.post('/financials/pay', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const schema = z.object({
      amount:      z.number().positive().max(100000),
      cardLastFour: z.string().length(4).regex(/^\d{4}$/).optional(),
      cardHolder:   z.string().max(100).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payment data' });
      return;
    }
    const result = await financialSvc.processPayment({
      studentRecordId: srId,
      ...parsed.data,
    });
    ok(res, result, 201);
  } catch (e) { fail(res, e, 400); }
});

// ═══════════════════════════════════════════════════════════════════════════
// DEGREE AUDIT
// ═══════════════════════════════════════════════════════════════════════════

router.get('/degree-audit', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecordOptional(req.user!.userId);
    if (!srId) {
      ok(res, {
        progress: { completionPercentage: 0, completedCredits: 0, totalRequired: 0, cumulativeGPA: 0 },
        categories: [],
      });
      return;
    }
    const data = await degreeSvc.getDegreeAudit(srId);
    if (!data) { res.status(404).json({ error: 'Degree audit data not found' }); return; }
    ok(res, data);
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT — APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/support/appointments', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecordOptional(req.user!.userId);
    if (!srId) { ok(res, []); return; }
    ok(res, await supportSvc.getAppointments(srId));
  } catch (e) { fail(res, e); }
});

router.post('/support/appointments', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const schema = z.object({
      topic:         z.string().min(5, 'Topic must be at least 5 characters').max(200),
      requestedDate: z.string().datetime({ message: 'Provide a valid ISO date' }),
      requestedTime: z.enum(['10:00', '11:30', '14:00', '15:30']),
      advisorUserId: z.string().uuid().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' });
      return;
    }
    const appointment = await supportSvc.bookAppointment({
      studentRecordId: srId,
      ...parsed.data,
    });
    ok(res, appointment, 201);
  } catch (e) { fail(res, e, 400); }
});

router.delete('/support/appointments/:id', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    ok(res, await supportSvc.cancelAppointment(pid(req), srId));
  } catch (e) { fail(res, e, 400); }
});

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/settings', async (req: AuthRequest, res) => {
  try {
    const data = await settingsSvc.getStudentSettings(req.user!.userId);
    if (!data) { res.status(404).json({ error: 'User not found' }); return; }
    ok(res, data);
  } catch (e) { fail(res, e); }
});

router.patch('/settings/profile', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(2).max(100).optional(),
      phone:    z.string().max(20).optional(),
      email:    z.string().email().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    ok(res, await settingsSvc.updateStudentProfile(req.user!.userId, parsed.data));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/settings/notifications', async (req: AuthRequest, res) => {
  try {
    const srId = await resolveStudentRecord(req.user!.userId);
    const schema = z.object({
      gradeAlerts:      z.boolean().optional(),
      tuitionReminders: z.boolean().optional(),
      registrarNotices: z.boolean().optional(),
      advisorMessages:  z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed' });
      return;
    }
    ok(res, await settingsSvc.updateNotificationPreferences(srId, parsed.data));
  } catch (e) { fail(res, e, 400); }
});

router.post('/settings/password', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters long')
        .regex(/^[A-Za-z0-9]+$/, 'Password must contain only letters and numbers')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      confirmPassword: z.string(),
    }).refine(d => d.newPassword === d.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' });
      return;
    }
    await settingsSvc.changePassword(
      req.user!.userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    ok(res, { success: true, message: 'Password changed. Please sign in again.' });
  } catch (e) { fail(res, e, 400); }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ANNOUNCEMENTS (student can read published announcements)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/announcements', async (req: AuthRequest, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { expirationDate: null },
          { expirationDate: { gte: new Date() } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
      take: 20,
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        targetAudience: true,
        publishedAt: true,
        expirationDate: true,
      },
    });
    ok(res, announcements);
  } catch (e) { fail(res, e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    ok(res, notifications);
  } catch (e) { fail(res, e); }
});

router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: pid(req), userId: req.user!.userId },
      data:  { isRead: true },
    });
    if (result.count === 0) { res.status(404).json({ error: 'Notification not found' }); return; }
    ok(res, { id: pid(req), isRead: true });
  } catch (e) { fail(res, e, 400); }
});

router.post('/notifications/mark-all-read', async (req: AuthRequest, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    ok(res, { success: true });
  } catch (e) { fail(res, e, 400); }
});

export default router;
