/**
 * /api/admin — Admin & Super Admin routes
 * All routes require: authenticate + requireRole([ADMIN, SUPER_ADMIN])
 * Follows registrar.ts conventions exactly.
 */
import { Router, Response, Request } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role, AccountStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { PASSWORD_BCRYPT_ROUNDS } from '../types/auth';
import * as svc from '../services/admin/userManagementService';

const router = Router();
const ADMIN_ROLES = [Role.ADMIN, Role.SUPER_ADMIN];
router.use(authenticate, requireRole(ADMIN_ROLES));

// ── helpers (mirrors registrar.ts) ──────────────────────────────────────────
type Q = Record<string, string | undefined>;
function q(req: Request): Q { return req.query as Q; }
function pid(req: Request, key = 'id'): string { return req.params[key] as string; }
function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function fail(res: Response, err: unknown, status = 500) {
  const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
  const s = (status === 500 && (msg.includes('not found') || msg.includes('Not found'))) ? 404 : status;
  res.status(s).json({ error: msg });
}
function pageParams(query: Q) {
  const page  = Math.max(1, parseInt(query.page  ?? '1',  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));
  return { page, limit };
}
function ip(req: Request): string | null { return (req.ip ?? '').slice(0, 45) || null; }

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
router.get('/dashboard', async (_req, res) => {
  try { ok(res, await svc.getDashboardStats()); } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await svc.listUsers({
      page, limit,
      search:    qp.search,
      role:      qp.role      as Role | undefined,
      status:    qp.status    as AccountStatus | undefined,
      sortBy:    qp.sortBy,
      sortOrder: qp.sortOrder as 'asc' | 'desc' | undefined,
    }));
  } catch (e) { fail(res, e); }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getUserById(pid(req))); } catch (e) { fail(res, e); }
});

// POST /api/admin/users  (create staff account)
router.post('/users', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(2).max(100),
      email:    z.string().email().optional().or(z.literal('')),
      phone:    z.string().min(10).max(13).optional().or(z.literal('')),
      password: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .max(128, 'Password must be at most 128 characters long')
        .regex(/^[A-Za-z0-9]+$/, 'Password must contain only letters and numbers')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      role: z.nativeEnum(Role),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const { email, phone, ...rest } = parsed.data;
    ok(res, await svc.createStaffUser(
      { ...rest, email: email || undefined, phone: phone || undefined },
      req.user!.userId, ip(req)
    ), 201);
  } catch (e) { fail(res, e, 400); }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(2).max(100).optional(),
      email:    z.string().email().optional(),
      phone:    z.string().min(10).max(13).optional(),
      role:     z.nativeEnum(Role).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.updateUser(pid(req), parsed.data, req.user!.role, req.user!.userId, ip(req)));
  } catch (e) { fail(res, e, 400); }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({
      status: z.nativeEnum(AccountStatus),
      reason: z.string().optional(),
    }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid status' }); return; }
    ok(res, await svc.updateUserStatus(
      pid(req), parsed.data.status, parsed.data.reason,
      req.user!.userId, req.user!.role, ip(req)
    ));
  } catch (e) { fail(res, e, 400); }
});

// PATCH /api/admin/users/:id/role  (dedicated role-change endpoint)
router.patch('/users/:id/role', async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ role: z.nativeEnum(Role) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid role' }); return; }
    ok(res, await svc.updateUser(pid(req), { role: parsed.data.role }, req.user!.role, req.user!.userId, ip(req)));
  } catch (e) { fail(res, e, 400); }
});

// DELETE /api/admin/users/:id  (soft-delete → DEACTIVATED)
router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.softDeleteUser(pid(req), req.user!.userId, req.user!.role, ip(req)));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/users/:id/sessions
router.get('/users/:id/sessions', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getUserSessions(pid(req))); } catch (e) { fail(res, e); }
});

// DELETE /api/admin/users/:id/sessions  (revoke all for user)
router.delete('/users/:id/sessions', async (req: AuthRequest, res) => {
  try { ok(res, await svc.revokeAllUserSessions(pid(req))); } catch (e) { fail(res, e, 400); }
});

// DELETE /api/admin/sessions/:sessionId  (revoke one specific session)
router.delete('/sessions/:sessionId', async (req: AuthRequest, res) => {
  try { ok(res, await svc.revokeSingleSession(pid(req, 'sessionId'))); } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM-WIDE AUDIT LOGS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await svc.listAuditLogs({
      page, limit,
      userId:    qp.userId,
      action:    qp.action,
      from:      qp.from,
      to:        qp.to,
      ipAddress: qp.ipAddress,
    }));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/notifications
router.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await svc.listNotifications({
      page, limit,
      userId:     qp.userId,
      unreadOnly: qp.unreadOnly === 'true',
    }));
  } catch (e) { fail(res, e); }
});

// POST /api/admin/notifications  (single user)
router.post('/notifications', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      userId:     z.string().uuid(),
      title:      z.string().min(3).max(200),
      message:    z.string().min(1).max(2000),
      type:       z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).optional(),
      entityType: z.string().optional(),
      entityId:   z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.createNotification(parsed.data), 201);
  } catch (e) { fail(res, e, 400); }
});

// POST /api/admin/notifications/broadcast  (all active users, optional role filter)
router.post('/notifications/broadcast', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      title:      z.string().min(3).max(200),
      message:    z.string().min(1).max(2000),
      type:       z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).optional(),
      role:       z.nativeEnum(Role).optional(),
      entityType: z.string().optional(),
      entityId:   z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.broadcastNotification(parsed.data), 201);
  } catch (e) { fail(res, e, 400); }
});

// PATCH /api/admin/notifications/:id/read
router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try { ok(res, await svc.markNotificationRead(pid(req))); } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/departments', async (_req, res) => {
  try { ok(res, await svc.listDepartments()); } catch (e) { fail(res, e); }
});

router.post('/departments', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:        z.string().min(2).max(200),
      code:        z.string().min(2).max(20),
      description: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.createDepartment(parsed.data), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/departments/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:        z.string().min(2).max(200).optional(),
      description: z.string().optional(),
      isActive:    z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.updateDepartment(pid(req), parsed.data));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PROGRAMS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/programs', async (req: AuthRequest, res) => {
  try { ok(res, await svc.listPrograms(q(req).departmentId)); } catch (e) { fail(res, e); }
});

router.post('/programs', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:          z.string().min(3).max(200),
      code:          z.string().min(2).max(20),
      description:   z.string().optional(),
      durationYears: z.number().int().min(1).max(6).optional(),
      totalCredits:  z.number().int().min(10).max(300).optional(),
      departmentId:  z.string().uuid(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.createProgram(parsed.data), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/programs/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:          z.string().min(3).max(200).optional(),
      description:   z.string().optional(),
      durationYears: z.number().int().min(1).max(6).optional(),
      totalCredits:  z.number().int().min(10).max(300).optional(),
      isActive:      z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.updateProgram(pid(req), parsed.data));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SELF SETTINGS (mirrors registrar settings exactly)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/settings/profile
router.get('/settings/profile', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { id: true, fullName: true, email: true, phone: true, role: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    ok(res, user);
  } catch (e) { fail(res, e); }
});

// PATCH /api/admin/settings/profile
router.patch('/settings/profile', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName: z.string().min(2).max(100).optional(),
      email:    z.string().email().optional(),
      phone:    z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const { fullName, email, phone } = parsed.data;
    if (email) {
      const conflict = await prisma.user.findFirst({ where: { email, id: { not: req.user!.userId } } });
      if (conflict) { res.status(409).json({ error: 'Email already in use by another account' }); return; }
    }
    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(fullName && { fullName }),
        ...(email    && { email: email.toLowerCase() }),
        ...(phone    && { phone }),
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true },
    });
    ok(res, updated);
  } catch (e) { fail(res, e, 400); }
});

// POST /api/admin/settings/password
router.post('/settings/password', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string()
        .min(8, 'Password must be at least 8 characters long')
        .max(128, 'Password must be at most 128 characters long')
        .regex(/^[A-Za-z0-9]+$/, 'Password must contain only letters and numbers')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      confirmPassword: z.string(),
    }).refine(d => d.newPassword === d.confirmPassword, {
      message: 'Passwords do not match', path: ['confirmPassword'],
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }); return; }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { passwordHash: true } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash!);
    if (!valid) { res.status(400).json({ error: 'Current password is incorrect' }); return; }

    const newHash = await bcrypt.hash(parsed.data.newPassword, PASSWORD_BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: req.user!.userId }, data: { passwordHash: newHash } });

    // Revoke all other sessions for security
    await prisma.session.updateMany({
      where: { userId: req.user!.userId, id: { not: req.user!.sessionId } },
      data:  { isRevoked: true },
    });

    await prisma.auditLog.create({
      data: {
        userId:    req.user!.userId,
        action:    'PASSWORD_CHANGED',
        ipAddress: ip(req),
        userAgent: (req.headers['user-agent'] ?? '').slice(0, 255) || null,
      },
    });

    ok(res, { success: true, message: 'Password updated. Other sessions have been revoked.' });
  } catch (e) { fail(res, e, 400); }
});

// GET /api/admin/settings/sessions
router.get('/settings/sessions', async (req: AuthRequest, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where:   { userId: req.user!.userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select:  { id: true, deviceInfo: true, ipAddress: true, lastUsedAt: true, createdAt: true, expiresAt: true },
    });
    const current = req.user!.sessionId;
    ok(res, sessions.map(s => ({ ...s, isCurrent: s.id === current })));
  } catch (e) { fail(res, e); }
});

// DELETE /api/admin/settings/sessions/:sessionId  (revoke one own session)
router.delete('/settings/sessions/:sessionId', async (req: AuthRequest, res) => {
  try {
    const sessionId = pid(req, 'sessionId');
    if (sessionId === req.user!.sessionId) {
      res.status(400).json({ error: 'Cannot revoke your current session. Use logout instead.' }); return;
    }
    const session = await prisma.session.findFirst({ where: { id: sessionId, userId: req.user!.userId } });
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    await prisma.session.update({ where: { id: sessionId }, data: { isRevoked: true } });
    await prisma.auditLog.create({
      data: { userId: req.user!.userId, action: 'SESSION_REVOKED', metadata: { revokedSessionId: sessionId } },
    });
    ok(res, { success: true });
  } catch (e) { fail(res, e, 400); }
});

// DELETE /api/admin/settings/sessions  (revoke ALL other own sessions)
router.delete('/settings/sessions', async (req: AuthRequest, res) => {
  try {
    const { count } = await prisma.session.updateMany({
      where: { userId: req.user!.userId, id: { not: req.user!.sessionId }, isRevoked: false },
      data:  { isRevoked: true },
    });
    ok(res, { success: true, revokedCount: count });
  } catch (e) { fail(res, e); }
});

export { router as adminRouter };
export default router;
