/**
 * Harmony College — Department Head Routes
 * /api/department-head/*
 *
 * ALL routes require authentication + DEPARTMENT_HEAD role.
 * Department authorization is ALWAYS derived from the authenticated
 * user's DepartmentHeadRecord — NEVER from the request body.
 */

import { Router, Response } from 'express';
import { z }               from 'zod';
import bcrypt              from 'bcryptjs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role }            from '@prisma/client';
import * as svc            from '../services/departmentHead/departmentHeadService';
import { prisma }          from '../lib/prisma';
import { DepartmentHeadAction } from '@prisma/client';

const router = Router();
router.use(authenticate);
router.use(requireRole([Role.DEPARTMENT_HEAD, Role.ADMIN, Role.SUPER_ADMIN]));

// ── Helpers ───────────────────────────────────────────────────────────────────
const ok   = (res: Response, data: unknown, status = 200) => res.status(status).json(data);
const fail = (res: Response, err: unknown, def = 500) => {
  const msg = err instanceof Error ? err.message : 'Unexpected error';
  const s =
    msg.includes('not found')                       ? 404 :
    msg.includes('Not authorized') ||
    msg.includes('not authorized') ||
    msg.includes('Unauthorized')                    ? 403 :
    msg.includes('Invalid') || msg.includes('must') ? 400 :
    def;
  res.status(s).json({ error: msg });
};
const qp  = (req: AuthRequest) => req.query as Record<string, string | undefined>;
const pid = (req: AuthRequest, key = 'id') => req.params[key] as string;

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE  GET /api/department-head/profile
// ══════════════════════════════════════════════════════════════════════════════

router.get('/profile', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getProfile(req.user!.userId)); }
  catch (e) { fail(res, e); }
});

router.patch('/profile', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ title: z.string().min(1).max(100).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.updateProfile(req.user!.userId, parsed.data));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD  GET /api/department-head/dashboard
// ══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getDashboard(req.user!.userId)); }
  catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COURSE OFFERINGS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/course-offerings', async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getCourseOfferings(req.user!.userId, {
      page:       q.page       ? parseInt(q.page,  10) : 1,
      limit:      q.limit      ? parseInt(q.limit, 10) : 20,
      search:     q.search,
      status:     q.status,
      semesterId: q.semesterId,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/course-offerings/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getCourseOfferingDetail(req.user!.userId, pid(req))); }
  catch (e) { fail(res, e); }
});

router.post('/course-offerings/:id/approve', async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.approveOffering(
      req.user!.userId,
      pid(req),
      req.socket?.remoteAddress,
    ));
  } catch (e) { fail(res, e, 409); }
});

router.post('/course-offerings/:id/reject', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ reason: z.string().min(5).max(1000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'A rejection reason is required (min 5 characters).', details: parsed.error.flatten() }); return; }
    ok(res, await svc.rejectOffering(
      req.user!.userId,
      pid(req),
      parsed.data.reason,
      req.socket?.remoteAddress,
    ));
  } catch (e) { fail(res, e, 409); }
});

// ══════════════════════════════════════════════════════════════════════════════
// FACULTY
// ══════════════════════════════════════════════════════════════════════════════

router.get('/faculty', async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getFaculty(req.user!.userId, {
      page:     q.page     ? parseInt(q.page,  10) : 1,
      limit:    q.limit    ? parseInt(q.limit, 10) : 20,
      search:   q.search,
      isActive: q.isActive !== undefined ? q.isActive === 'true' : undefined,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/faculty/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getFacultyDetail(req.user!.userId, pid(req))); }
  catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// STUDENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/students', async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getStudents(req.user!.userId, {
      page:      q.page      ? parseInt(q.page,  10) : 1,
      limit:     q.limit     ? parseInt(q.limit, 10) : 20,
      search:    q.search,
      yearLevel: q.yearLevel ? parseInt(q.yearLevel, 10) : undefined,
      status:    q.status,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/students/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getStudentDetail(req.user!.userId, pid(req))); }
  catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/reports/enrollment',   async (req: AuthRequest, res) => {
  try { ok(res, await svc.getEnrollmentReport(req.user!.userId)); }
  catch (e) { fail(res, e); }
});

router.get('/reports/attendance',   async (req: AuthRequest, res) => {
  try { ok(res, await svc.getAttendanceReport(req.user!.userId)); }
  catch (e) { fail(res, e); }
});

router.get('/reports/performance',  async (req: AuthRequest, res) => {
  try { ok(res, await svc.getPerformanceReport(req.user!.userId)); }
  catch (e) { fail(res, e); }
});

router.get('/reports/workload',     async (req: AuthRequest, res) => {
  try { ok(res, await svc.getWorkloadReport(req.user!.userId)); }
  catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE REQUESTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/leave-requests', async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getLeaveRequests(req.user!.userId, {
      page:   q.page  ? parseInt(q.page,  10) : 1,
      limit:  q.limit ? parseInt(q.limit, 10) : 20,
      status: q.status,
      search: q.search,
    }));
  } catch (e) { fail(res, e); }
});

router.post('/leave-requests/:id/approve', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ comment: z.string().max(1000).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }
    ok(res, await svc.approveLeave(
      req.user!.userId,
      pid(req),
      parsed.data.comment,
      req.socket?.remoteAddress,
    ));
  } catch (e) { fail(res, e, 409); }
});

router.post('/leave-requests/:id/reject', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ reason: z.string().min(5).max(1000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'A rejection reason is required (min 5 characters).', details: parsed.error.flatten() }); return; }
    ok(res, await svc.rejectLeave(
      req.user!.userId,
      pid(req),
      parsed.data.reason,
      req.socket?.remoteAddress,
    ));
  } catch (e) { fail(res, e, 409); }
});

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getNotifications(req.user!.userId, {
      page:       q.page       ? parseInt(q.page,  10) : 1,
      limit:      q.limit      ? parseInt(q.limit, 10) : 20,
      unreadOnly: q.unreadOnly === 'true',
    }));
  } catch (e) { fail(res, e); }
});

router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try { ok(res, await svc.markNotificationRead(req.user!.userId, pid(req))); }
  catch (e) { fail(res, e); }
});

router.post('/notifications/read-all', async (req: AuthRequest, res) => {
  try { ok(res, await svc.markAllNotificationsRead(req.user!.userId)); }
  catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════════════════════

router.get('/audit-log', async (req: AuthRequest, res) => {
  try {
    const q = qp(req);
    ok(res, await svc.getAuditLog(req.user!.userId, {
      page:   q.page   ? parseInt(q.page,  10) : 1,
      limit:  q.limit  ? parseInt(q.limit, 10) : 20,
      search: q.search,
      action: q.action,
    }));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS — PASSWORD CHANGE
// ══════════════════════════════════════════════════════════════════════════════

router.patch('/settings/password', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8),
      confirmPassword: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    if (parsed.data.newPassword !== parsed.data.confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' }); return;
    }

    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) { res.status(400).json({ error: 'No password set for this account.' }); return; }

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: 'Current password is incorrect.' }); return; }

    const hash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user!.userId }, data: { passwordHash: hash } }),
      prisma.departmentHeadAuditLog.create({
        data: {
          userId:      req.user!.userId,
          action:      DepartmentHeadAction.PASSWORD_CHANGED,
          entityType:  'User',
          entityId:    req.user!.userId,
          description: 'Department Head changed their password.',
          ipAddress:   req.socket?.remoteAddress ?? null,
        },
      }),
    ]);

    ok(res, { success: true, message: 'Password updated successfully.' });
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SEMESTERS (for filter dropdowns)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/semesters', async (req: AuthRequest, res) => {
  try {
    const semesters = await prisma.semester.findMany({
      orderBy: { startDate: 'desc' },
      take:    10,
      select:  {
        id: true, name: true, isCurrent: true,
        academicYear: { select: { name: true } },
      },
    });
    ok(res, semesters);
  } catch (e) { fail(res, e); }
});

export default router;
