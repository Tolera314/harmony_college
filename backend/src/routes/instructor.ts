/**
 * Instructor Routes
 *
 * /api/instructor/*
 *
 * All routes require authentication.
 * INSTRUCTOR, REGISTRAR, ADMIN, SUPER_ADMIN may call these endpoints.
 * The authenticated user's identity is ALWAYS derived from the JWT — never
 * trusted from the request body.
 *
 * Route map:
 *   GET  /api/instructor/profile                         — own profile
 *   PATCH /api/instructor/profile                        — update own profile
 *   GET  /api/instructor/dashboard                       — KPIs + today schedule
 *   GET  /api/instructor/classes                         — all assigned offerings
 *   GET  /api/instructor/timetable                       — weekly timetable
 *   GET  /api/instructor/classes/:offeringId/roster      — enrolled students
 *   GET  /api/instructor/classes/:offeringId/student/:studentId — student academic view
 *   GET  /api/instructor/classes/:offeringId/grades      — course grades list
 *   POST /api/instructor/classes/:offeringId/grades/:enrollmentId — submit course grade
 *   GET  /api/instructor/classes/:offeringId/attendance/report    — attendance report
 *   GET  /api/instructor/classes/:offeringId/attendance/low       — low attendance
 *   GET  /api/instructor/assignments                     — all assignments (optional ?courseOfferingId=)
 *   POST /api/instructor/assignments                     — create assignment
 *   GET  /api/instructor/assignments/:id                 — assignment detail + submissions
 *   PATCH /api/instructor/assignments/:id                — update assignment
 *   DELETE /api/instructor/assignments/:id               — delete (draft only)
 *   PATCH /api/instructor/submissions/:id/grade          — grade a submission
 *   GET  /api/instructor/quizzes                         — all quizzes
 *   POST /api/instructor/quizzes                         — create quiz
 *   GET  /api/instructor/quizzes/:id                     — quiz detail
 *   PATCH /api/instructor/quizzes/:id                    — update quiz
 *   GET  /api/instructor/notifications                   — paginated notifications
 *   PATCH /api/instructor/notifications/:id/read         — mark one read
 *   POST /api/instructor/notifications/read-all          — mark all read
 *   GET  /api/instructor/audit-log                       — own audit log
 *   PATCH /api/instructor/settings/password              — change password
 */

import { Router, Response } from 'express';
import { z }                 from 'zod';
import bcrypt               from 'bcryptjs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role }             from '@prisma/client';
import * as svc             from '../services/instructor/instructorService';
import { prisma }           from '../lib/prisma';

const router = Router();
router.use(authenticate);

const INSTRUCTOR_ROLES = [
  Role.INSTRUCTOR,
  Role.REGISTRAR,
  Role.ADMIN,
  Role.SUPER_ADMIN,
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const ok   = (res: Response, data: unknown, status = 200) => res.status(status).json(data);
const fail = (res: Response, err: unknown, def = 500)    => {
  const msg = err instanceof Error ? err.message : 'Unexpected error';
  const s   =
    msg.includes('not found')              ? 404 :
    msg.includes('Not authorized') ||
    msg.includes('not authorized') ||
    msg.includes('Unauthorized')           ? 403 :
    msg.includes('Invalid') ||
    msg.includes('must be')                ? 400 :
    def;
  res.status(s).json({ error: msg });
};

const qp = (req: AuthRequest) => req.query as Record<string, string | undefined>;
const pid = (req: AuthRequest, key = 'id') => req.params[key] as string;

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════════════════════════

router.get('/profile', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getInstructorProfile(req.user!.userId));
  } catch (e) { fail(res, e); }
});

router.patch('/profile', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      title:          z.string().min(1).max(100).optional(),
      specialization: z.string().min(1).max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    ok(res, await svc.updateInstructorProfile(req.user!.userId, parsed.data));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getDashboardStats(req.user!.userId));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CLASSES / OFFERINGS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/classes', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getMyClasses(req.user!.userId));
  } catch (e) { fail(res, e); }
});

router.get('/timetable', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getTimetable(req.user!.userId));
  } catch (e) { fail(res, e); }
});

// ── Roster ────────────────────────────────────────────────────────────────────

router.get('/classes/:offeringId/roster', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getRoster(req.user!.userId, pid(req, 'offeringId'), {
      search: q.search,
      status: q.status,
      page:   q.page  ? parseInt(q.page,  10) : 1,
      limit:  q.limit ? parseInt(q.limit, 10) : 30,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/classes/:offeringId/student/:studentId', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getStudentAcademicView(
      req.user!.userId,
      pid(req, 'offeringId'),
      pid(req, 'studentId'),
    ));
  } catch (e) { fail(res, e); }
});

// ── Grades ────────────────────────────────────────────────────────────────────

router.get('/classes/:offeringId/grades', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getCourseGrades(req.user!.userId, pid(req, 'offeringId')));
  } catch (e) { fail(res, e); }
});

router.post('/classes/:offeringId/grades/:enrollmentId', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      letterGrade: z.string().min(1).max(4),
      gradePoints: z.number().min(0).max(4.0),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    ok(res, await svc.submitCourseGrade(
      req.user!.userId,
      pid(req, 'enrollmentId'),
      parsed.data,
    ), 201);
  } catch (e) { fail(res, e, 400); }
});

// ── Attendance Reports ────────────────────────────────────────────────────────

router.get('/classes/:offeringId/attendance/report', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getAttendanceReport(req.user!.userId, pid(req, 'offeringId'), {
      from:  q.from,
      to:    q.to,
      page:  q.page  ? parseInt(q.page,  10) : 1,
      limit: q.limit ? parseInt(q.limit, 10) : 30,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/classes/:offeringId/attendance/low', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const threshold = parseInt(qp(req).threshold ?? '75', 10);
    ok(res, await svc.getLowAttendanceStudents(req.user!.userId, pid(req, 'offeringId'), threshold));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/assignments', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getAssignments(req.user!.userId, qp(req).courseOfferingId));
  } catch (e) { fail(res, e); }
});

router.post('/assignments', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      courseOfferingId: z.string().uuid(),
      title:            z.string().min(1).max(255),
      description:      z.string().min(1),
      instructions:     z.string().min(1),
      dueDate:          z.string().min(1).refine(val => !isNaN(Date.parse(val)), { message: 'Invalid datetime format' }),
      totalPoints:      z.number().int().min(1).max(1000).optional(),
      allowLateSubmit:  z.boolean().optional(),
      maxFileSize:      z.number().int().min(1).max(500).optional(),
      attachments:      z.array(z.object({
        name: z.string(),
        size: z.union([z.number(), z.string()]),
        url:  z.string(),
        type: z.string().optional(),
      })).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const { courseOfferingId, ...rest } = parsed.data;
    ok(res, await svc.createAssignment(req.user!.userId, courseOfferingId, rest), 201);
  } catch (e) { fail(res, e, 400); }
});

router.get('/assignments/:id', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getAssignmentDetail(req.user!.userId, pid(req)));
  } catch (e) { fail(res, e); }
});

router.patch('/assignments/:id', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      title:           z.string().min(1).max(255).optional(),
      description:     z.string().min(1).optional(),
      instructions:    z.string().min(1).optional(),
      dueDate:         z.string().datetime().optional(),
      totalPoints:     z.number().int().min(1).max(1000).optional(),
      allowLateSubmit: z.boolean().optional(),
      status:          z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    ok(res, await svc.updateAssignment(req.user!.userId, pid(req), parsed.data as any));
  } catch (e) { fail(res, e, 400); }
});

router.delete('/assignments/:id', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.deleteAssignment(req.user!.userId, pid(req)));
  } catch (e) { fail(res, e, 400); }
});

// ── Grade submission ──────────────────────────────────────────────────────────

router.patch('/submissions/:id/grade', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      score:       z.number().min(0),
      feedback:    z.string().max(2000).optional(),
      letterGrade: z.string().max(4).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    ok(res, await svc.gradeSubmission(req.user!.userId, pid(req), parsed.data));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// QUIZZES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/quizzes', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getQuizzes(req.user!.userId, qp(req).courseOfferingId));
  } catch (e) { fail(res, e); }
});

router.post('/quizzes', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      courseOfferingId:       z.string().uuid(),
      title:                  z.string().min(1).max(255),
      description:            z.string().optional(),
      instructions:           z.string().optional(),
      durationMinutes:        z.number().int().min(1).max(300).optional(),
      availableFrom:          z.string().datetime(),
      availableUntil:         z.string().datetime(),
      passingScore:           z.number().int().min(0).max(100).optional(),
      maxAttempts:            z.number().int().min(1).max(10).optional(),
      totalPoints:            z.number().int().min(1).max(1000).optional(),
      showResultsImmediately: z.boolean().optional(),
      shuffleQuestions:       z.boolean().optional(),
      questions:              z.array(z.object({
        questionText: z.string().min(1),
        type:         z.string(),
        points:       z.number().optional(),
        options:      z.array(z.object({
          text:      z.string(),
          isCorrect: z.boolean().optional(),
        })).optional(),
      })).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const { courseOfferingId, ...rest } = parsed.data;
    ok(res, await svc.createQuiz(req.user!.userId, courseOfferingId, rest), 201);
  } catch (e) { fail(res, e, 400); }
});

router.get('/quizzes/:id', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getQuizDetail(req.user!.userId, pid(req)));
  } catch (e) { fail(res, e); }
});

router.patch('/quizzes/:id', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.updateQuiz(req.user!.userId, pid(req), req.body));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/notifications', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getNotifications(req.user!.userId, {
      page:       q.page       ? parseInt(q.page,  10) : 1,
      limit:      q.limit      ? parseInt(q.limit, 10) : 20,
      unreadOnly: q.unreadOnly === 'true',
    }));
  } catch (e) { fail(res, e); }
});

router.patch('/notifications/:id/read', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.markNotificationRead(req.user!.userId, pid(req)));
  } catch (e) { fail(res, e, 400); }
});

router.post('/notifications/read-all', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.markAllNotificationsRead(req.user!.userId));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════════════════════

router.get('/audit-log', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getAuditLog(req.user!.userId, {
      search: q.search,
      page:   q.page  ? parseInt(q.page,  10) : 1,
      limit:  q.limit ? parseInt(q.limit, 10) : 20,
    }));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS — PASSWORD CHANGE
// ══════════════════════════════════════════════════════════════════════════════

router.patch('/settings/password', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8),
      confirmPassword: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      res.status(400).json({ error: 'No password set for this account.' });
      return;
    }

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    const hash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: req.user!.userId },
      data:  { passwordHash: hash },
    });

    ok(res, { success: true, message: 'Password updated successfully.' });
  } catch (e) { fail(res, e); }
});

export default router;
