/**
 * /api/admin — Admin & Super Admin routes
 * All routes require: authenticate + requireRole([ADMIN, SUPER_ADMIN])
 * Follows registrar.ts conventions exactly.
 */
import { Router, Response, Request } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role, AccountStatus, StudentStatus, CourseStatus, ApplicationStatus, AttendanceStatus, TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { PASSWORD_BCRYPT_ROUNDS } from '../types/auth';
import * as svc from '../services/admin/userManagementService';
import * as attSvc from '../services/admin/adminAttendanceService';
import * as finSvc from '../services/admin/adminFinanceService';
import * as docSvc from '../services/admin/adminDocumentService';
import * as auditSvc from '../services/admin/adminAuditService';
import * as secSvc from '../services/admin/adminSecurityService';
import * as backupSvc from '../services/admin/adminBackupService';
import * as cfgSvc from '../services/admin/adminSystemConfigService';

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
      fullName: z.string().min(2, 'Full name must be at least 2 characters long').max(100),
      email:    z.string().email('Invalid email address').optional().or(z.literal('')),
      phone:    z.string().max(20).optional().or(z.literal('')),
      password: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .max(128, 'Password must be at most 128 characters long')
        .regex(/[A-Za-z]/, 'Password must contain at least one letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      role: z.nativeEnum(Role),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const field = firstIssue?.path?.join('.');
      const msg = firstIssue?.message ?? 'Validation failed';
      const error = field ? `${field}: ${msg}` : msg;
      res.status(400).json({ error, details: parsed.error.flatten() });
      return;
    }
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
// STUDENT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/students
router.get('/students', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await svc.listStudents({
      page, limit,
      search:       qp.search,
      programId:    qp.programId,
      departmentId: qp.departmentId,
      status:       qp.status as StudentStatus | undefined,
      yearLevel:    qp.yearLevel ? parseInt(qp.yearLevel, 10) : undefined,
      sortBy:       qp.sortBy,
      sortOrder:    qp.sortOrder as 'asc' | 'desc' | undefined,
    }));
  } catch (e) { fail(res, e); }
});

// GET /api/admin/students/:id
router.get('/students/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getStudentById(pid(req))); } catch (e) { fail(res, e); }
});

// POST /api/admin/students
router.post('/students', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName:     z.string().min(2).max(100),
      email:        z.string().email().optional().or(z.literal('')),
      phone:        z.string().min(10).max(13).optional().or(z.literal('')),
      password:     z.string().min(8, 'Password must be at least 8 characters long'),
      programId:    z.string().uuid(),
      departmentId: z.string().uuid(),
      studentId:    z.string().optional(),
      yearLevel:    z.number().int().min(1).max(7).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const { email, phone, ...rest } = parsed.data;
    ok(res, await svc.createStudent(
      { ...rest, email: email || undefined, phone: phone || undefined },
      req.user!.userId, ip(req)
    ), 201);
  } catch (e) { fail(res, e, 400); }
});

// PATCH /api/admin/students/:id
router.patch('/students/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName:     z.string().min(2).max(100).optional(),
      email:        z.string().email().optional(),
      phone:        z.string().optional(),
      programId:    z.string().uuid().optional(),
      departmentId: z.string().uuid().optional(),
      status:       z.nativeEnum(StudentStatus).optional(),
      yearLevel:    z.number().int().min(1).max(7).optional(),
      gpa:          z.number().min(0).max(4.0).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.updateStudent(pid(req), parsed.data, req.user!.userId, ip(req)));
  } catch (e) { fail(res, e, 400); }
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.deleteStudent(pid(req), req.user!.userId, ip(req)));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LECTURER & STAFF MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/instructors
router.get('/instructors', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await svc.listInstructors({
      page, limit,
      search:       qp.search,
      departmentId: qp.departmentId,
      isActive:     qp.isActive === 'true' ? true : qp.isActive === 'false' ? false : undefined,
      sortBy:       qp.sortBy,
      sortOrder:    qp.sortOrder as 'asc' | 'desc' | undefined,
    }));
  } catch (e) { fail(res, e); }
});

// GET /api/admin/instructors/:id
router.get('/instructors/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getInstructorById(pid(req))); } catch (e) { fail(res, e); }
});

// POST /api/admin/instructors
router.post('/instructors', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName:       z.string().min(2).max(100),
      email:          z.string().email().optional().or(z.literal('')),
      phone:          z.string().min(10).max(13).optional().or(z.literal('')),
      password:       z.string().min(8, 'Password must be at least 8 characters long'),
      employeeId:     z.string().optional(),
      title:          z.string().optional(),
      specialization: z.string().optional(),
      departmentId:   z.string().uuid(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const { email, phone, ...rest } = parsed.data;
    ok(res, await svc.createInstructor(
      { ...rest, email: email || undefined, phone: phone || undefined },
      req.user!.userId, ip(req)
    ), 201);
  } catch (e) { fail(res, e, 400); }
});

// PATCH /api/admin/instructors/:id
router.patch('/instructors/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName:       z.string().min(2).max(100).optional(),
      email:          z.string().email().optional(),
      phone:          z.string().optional(),
      title:          z.string().optional(),
      specialization: z.string().optional(),
      departmentId:   z.string().uuid().optional(),
      isActive:       z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.updateInstructor(pid(req), parsed.data, req.user!.userId, ip(req)));
  } catch (e) { fail(res, e, 400); }
});

// DELETE /api/admin/instructors/:id
router.delete('/instructors/:id', async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.deleteInstructor(pid(req), req.user!.userId, ip(req)));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/departments', async (_req, res) => {
  try { ok(res, await svc.listDepartments()); } catch (e) { fail(res, e); }
});

router.get('/departments/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getDepartmentById(pid(req))); } catch (e) { fail(res, e); }
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

router.delete('/departments/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.deleteDepartment(pid(req))); } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// PROGRAMS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/programs', async (req: AuthRequest, res) => {
  try { ok(res, await svc.listPrograms(q(req).departmentId)); } catch (e) { fail(res, e); }
});

router.get('/programs/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getProgramById(pid(req))); } catch (e) { fail(res, e); }
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

router.delete('/programs/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.deleteProgram(pid(req))); } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COURSES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/courses', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await svc.listCourses({
      page, limit,
      search:       qp.search,
      departmentId: qp.departmentId,
      status:       qp.status as CourseStatus | undefined,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/courses/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getCourseById(pid(req))); } catch (e) { fail(res, e); }
});

router.post('/courses', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      code:            z.string().min(2).max(20),
      name:            z.string().min(3).max(200),
      description:     z.string().optional(),
      creditHours:     z.number().int().min(1).max(10).optional(),
      departmentId:    z.string().uuid(),
      status:          z.nativeEnum(CourseStatus).optional(),
      prerequisiteIds: z.array(z.string().uuid()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.createCourse(parsed.data), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/courses/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:            z.string().min(3).optional(),
      description:     z.string().optional(),
      creditHours:     z.number().int().min(1).max(10).optional(),
      departmentId:    z.string().uuid().optional(),
      status:          z.nativeEnum(CourseStatus).optional(),
      prerequisiteIds: z.array(z.string().uuid()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.updateCourse(pid(req), parsed.data));
  } catch (e) { fail(res, e, 400); }
});

router.delete('/courses/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.deleteCourse(pid(req))); } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ACADEMIC YEARS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/academic-years', async (_req, res) => {
  try { ok(res, await svc.listAcademicYears()); } catch (e) { fail(res, e); }
});

router.get('/academic-years/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getAcademicYearById(pid(req))); } catch (e) { fail(res, e); }
});

router.post('/academic-years', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:      z.string().min(4),
      startDate: z.string(),
      endDate:   z.string(),
      isCurrent: z.boolean().optional(),
      isActive:  z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.createAcademicYear({
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate:   new Date(parsed.data.endDate),
    }), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/academic-years/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:      z.string().min(4).optional(),
      startDate: z.string().optional(),
      endDate:   z.string().optional(),
      isCurrent: z.boolean().optional(),
      isActive:  z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const { startDate, endDate, ...rest } = parsed.data;
    ok(res, await svc.updateAcademicYear(pid(req), {
      ...rest,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate   && { endDate:   new Date(endDate) }),
    }));
  } catch (e) { fail(res, e, 400); }
});

router.delete('/academic-years/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.deleteAcademicYear(pid(req))); } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SEMESTERS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/semesters', async (req: AuthRequest, res) => {
  try { ok(res, await svc.listSemesters(q(req).academicYearId)); } catch (e) { fail(res, e); }
});

router.get('/semesters/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getSemesterById(pid(req))); } catch (e) { fail(res, e); }
});

router.post('/semesters', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:              z.string().min(2),
      academicYearId:    z.string().uuid(),
      startDate:         z.string(),
      endDate:           z.string(),
      registrationStart: z.string(),
      registrationEnd:   z.string(),
      addDropDeadline:   z.string(),
      isCurrent:         z.boolean().optional(),
      isActive:          z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.createSemester({
      ...parsed.data,
      startDate:         new Date(parsed.data.startDate),
      endDate:           new Date(parsed.data.endDate),
      registrationStart: new Date(parsed.data.registrationStart),
      registrationEnd:   new Date(parsed.data.registrationEnd),
      addDropDeadline:   new Date(parsed.data.addDropDeadline),
    }), 201);
  } catch (e) { fail(res, e, 400); }
});

router.patch('/semesters/:id', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:              z.string().min(2).optional(),
      startDate:         z.string().optional(),
      endDate:           z.string().optional(),
      registrationStart: z.string().optional(),
      registrationEnd:   z.string().optional(),
      addDropDeadline:   z.string().optional(),
      isCurrent:         z.boolean().optional(),
      isActive:          z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const { startDate, endDate, registrationStart, registrationEnd, addDropDeadline, ...rest } = parsed.data;
    ok(res, await svc.updateSemester(pid(req), {
      ...rest,
      ...(startDate         && { startDate:         new Date(startDate) }),
      ...(endDate           && { endDate:           new Date(endDate) }),
      ...(registrationStart && { registrationStart: new Date(registrationStart) }),
      ...(registrationEnd   && { registrationEnd:   new Date(registrationEnd) }),
      ...(addDropDeadline   && { addDropDeadline:   new Date(addDropDeadline) }),
    }));
  } catch (e) { fail(res, e, 400); }
});

router.delete('/semesters/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.deleteSemester(pid(req))); } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMISSIONS MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

router.get('/admissions', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await svc.listAdmissions({
      page, limit,
      search:       qp.search,
      status:       qp.status as ApplicationStatus | undefined,
      program:      qp.program,
      academicYear: qp.academicYear,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/admissions/:id', async (req: AuthRequest, res) => {
  try { ok(res, await svc.getAdmissionById(pid(req))); } catch (e) { fail(res, e); }
});

router.patch('/admissions/:id/status', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      status:  z.nativeEnum(ApplicationStatus),
      comment: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid status or input' }); return; }
    ok(res, await svc.updateAdmissionStatus(pid(req), parsed.data.status, req.user!.userId, parsed.data.comment));
  } catch (e) { fail(res, e, 400); }
});

router.patch('/admissions/:id/onboarding', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid status or reason' }); return; }
    ok(res, await svc.reviewOnboarding(pid(req), parsed.data.status, req.user!.userId, parsed.data.reason));
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/attendance/stats
router.get('/attendance/stats', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await attSvc.getAttendanceStats({
      startDate: qp.startDate,
      endDate: qp.endDate,
      departmentId: qp.departmentId,
      programId: qp.programId,
      courseOfferingId: qp.courseOfferingId,
      academicYear: qp.academicYear,
      semester: qp.semester,
    }));
  } catch (e) { fail(res, e); }
});

// GET /api/admin/attendance/records
router.get('/attendance/records', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await attSvc.listAttendanceRecords({
      page, limit,
      search: qp.search,
      startDate: qp.startDate,
      endDate: qp.endDate,
      status: qp.status as AttendanceStatus | undefined,
      departmentId: qp.departmentId,
      programId: qp.programId,
      courseOfferingId: qp.courseOfferingId,
      instructorId: qp.instructorId,
      academicYear: qp.academicYear,
      semester: qp.semester,
    }));
  } catch (e) { fail(res, e); }
});

// GET /api/admin/attendance/records/:id
router.get('/attendance/records/:id', async (req: AuthRequest, res) => {
  try { ok(res, await attSvc.getAttendanceRecordDetail(pid(req))); } catch (e) { fail(res, e); }
});

// PATCH /api/admin/attendance/records/:id/correct
router.patch('/attendance/records/:id/correct', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      newStatus: z.nativeEnum(AttendanceStatus),
      reason: z.string().min(5, 'Reason must be at least 5 characters long'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }); return; }
    ok(res, await attSvc.correctAttendanceRecord(pid(req), parsed.data.newStatus, parsed.data.reason, req.user!.userId, ip(req) ?? undefined));
  } catch (e) { fail(res, e, 400); }
});

// GET /api/admin/attendance/trends
router.get('/attendance/trends', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await attSvc.getAttendanceTrends({
      period: qp.period as 'daily' | 'weekly' | 'monthly' | undefined,
      departmentId: qp.departmentId,
    }));
  } catch (e) { fail(res, e); }
});

// GET /api/admin/attendance/low-attendance
router.get('/attendance/low-attendance', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await attSvc.getLowAttendanceStudents({
      page, limit,
      search: qp.search,
      threshold: qp.threshold ? parseInt(qp.threshold, 10) : 75,
      departmentId: qp.departmentId,
      programId: qp.programId,
    }));
  } catch (e) { fail(res, e); }
});

// GET /api/admin/attendance/students/:studentId
router.get('/attendance/students/:studentId', async (req: AuthRequest, res) => {
  try { ok(res, await attSvc.getStudentAttendanceDetail(pid(req, 'studentId'))); } catch (e) { fail(res, e); }
});

// GET /api/admin/attendance/courses/:offeringId
router.get('/attendance/courses/:offeringId', async (req: AuthRequest, res) => {
  try { ok(res, await attSvc.getCourseAttendanceDetail(pid(req, 'offeringId'))); } catch (e) { fail(res, e); }
});

// GET /api/admin/attendance/departments
router.get('/attendance/departments', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await attSvc.getDepartmentAttendanceAnalytics(qp.departmentId));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// FINANCIAL MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/admin/finance/stats
router.get('/finance/stats', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await finSvc.getFinanceStats({
      startDate: qp.startDate,
      endDate: qp.endDate,
      departmentId: qp.departmentId,
      programId: qp.programId,
    }));
  } catch (e) { fail(res, e); }
});

// GET /api/admin/finance/transactions
router.get('/finance/transactions', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await finSvc.listTransactions({
      page, limit,
      search: qp.search,
      type: qp.type as TransactionType | undefined,
      category: qp.category,
      status: qp.status,
      startDate: qp.startDate,
      endDate: qp.endDate,
      departmentId: qp.departmentId,
      programId: qp.programId,
    }));
  } catch (e) { fail(res, e); }
});

// POST /api/admin/finance/transactions
router.post('/finance/transactions', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      studentRecordId: z.string().uuid('Invalid student record ID'),
      type: z.nativeEnum(TransactionType),
      amount: z.number().refine(val => val !== 0, 'Amount must be non-zero'),
      description: z.string().min(3, 'Description must be at least 3 characters'),
      category: z.string().optional(),
      referenceId: z.string().optional(),
      transactionDate: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }); return; }
    ok(res, await finSvc.postTransaction({ ...parsed.data, category: parsed.data.category || String(parsed.data.type) }, req.user!.userId, ip(req) ?? undefined), 201);
  } catch (e) { fail(res, e, 400); }
});

// PATCH /api/admin/finance/transactions/:id/reverse
router.patch('/finance/transactions/:id/reverse', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      reason: z.string().min(5, 'Reversal reason must be at least 5 characters'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }); return; }
    ok(res, await finSvc.reverseTransaction(pid(req), parsed.data.reason, req.user!.userId, ip(req) ?? undefined));
  } catch (e) { fail(res, e, 400); }
});

// GET /api/admin/finance/accounts
router.get('/finance/accounts', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await finSvc.listStudentAccounts({
      page, limit,
      search: qp.search,
      departmentId: qp.departmentId,
      programId: qp.programId,
      clearanceStatus: qp.clearanceStatus as 'cleared' | 'uncleared' | undefined,
      balanceFilter: qp.balanceFilter as 'outstanding' | 'credit' | 'zero' | undefined,
    }));
  } catch (e) { fail(res, e); }
});

// GET /api/admin/finance/accounts/student/:studentId
router.get('/finance/accounts/student/:studentId', async (req: AuthRequest, res) => {
  try {
    ok(res, await finSvc.getStudentFinancialDetail(pid(req, 'studentId')));
  } catch (e) { fail(res, e); }
});

// PATCH /api/admin/finance/accounts/student/:studentId/clearance
router.patch('/finance/accounts/student/:studentId/clearance', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      clearedForTerm: z.string().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid clearedForTerm value' }); return; }
    ok(res, await finSvc.updateTermClearance(pid(req, 'studentId'), parsed.data.clearedForTerm, req.user!.userId, ip(req) ?? undefined));
  } catch (e) { fail(res, e, 400); }
});

// GET /api/admin/finance/trends
router.get('/finance/trends', async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    ok(res, await finSvc.getFinanceTrends({
      startDate: qp.startDate,
      endDate: qp.endDate,
      departmentId: qp.departmentId,
      programId: qp.programId,
    }));
  } catch (e) { fail(res, e); }
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

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS (institution-wide reports data)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/analytics', async (_req, res) => {
  try { ok(res, await svc.getAdminAnalytics()); } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COURSE OFFERINGS LIST (read-only admin view)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/offerings', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await svc.listOfferings({
      page, limit,
      search:       qp.search,
      departmentId: qp.departmentId,
      semesterId:   qp.semesterId,
      status:       qp.status,
    }));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH (admin-only — checks DB + backend response)
// ══════════════════════════════════════════════════════════════════════════════

router.get('/system-health', async (_req, res) => {
  const start = Date.now();
  try {
    // DB ping
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbMs = Date.now() - dbStart;

    // Count active sessions as a proxy for active connections
    const [sessions, users, students, offerings] = await Promise.all([
      prisma.session.count({ where: { isRevoked: false, expiresAt: { gt: new Date() } } }),
      prisma.user.count(),
      prisma.studentRecord.count({ where: { status: 'ACTIVE' } }),
      prisma.courseOffering.count({ where: { status: 'ACTIVE' } }),
    ]);

    ok(res, {
      status: 'ok',
      responseTimeMs: Date.now() - start,
      services: [
        { name: 'Database (PostgreSQL)', status: 'Healthy', responseTime: `${dbMs}ms`, detail: 'Connected' },
        { name: 'API Server (Node.js)',  status: 'Healthy', responseTime: `${Date.now() - start}ms`, detail: 'Running' },
        { name: 'Auth Service (JWT)',    status: 'Healthy', responseTime: '< 1ms', detail: 'Active' },
      ],
      stats: { activeSessions: sessions, totalUsers: users, activeStudents: students, activeOfferings: offerings },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(503).json({ status: 'degraded', error: e instanceof Error ? e.message : 'Health check failed' });
  }
});

router.get('/transactions', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    const { listTransactions } = await import('../services/finance/foPaymentService');
    ok(res, await listTransactions({
      page, limit,
      search: qp.search,
      type:   qp.type,
      status: qp.status,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/documents/stats', async (_req: AuthRequest, res) => {
  try { ok(res, await docSvc.getDocumentStats()); } catch (e) { fail(res, e); }
});

router.get('/documents', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await docSvc.listAdminDocuments({
      page,
      limit,
      search: qp.search,
      category: qp.category,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/audit-logs/stats', async (_req: AuthRequest, res) => {
  try { ok(res, await auditSvc.getAuditStats()); } catch (e) { fail(res, e); }
});

router.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await auditSvc.listAdminAuditLogs({
      page,
      limit,
      search: qp.search,
      module: qp.module,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/security/stats', async (_req: AuthRequest, res) => {
  try { ok(res, await secSvc.getSecurityStats()); } catch (e) { fail(res, e); }
});

router.get('/security/sessions', async (req: AuthRequest, res) => {
  try {
    const qp = q(req); const { page, limit } = pageParams(qp);
    ok(res, await secSvc.listActiveSessions({ page, limit, search: qp.search }));
  } catch (e) { fail(res, e); }
});

router.post('/security/sessions/:id/revoke', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    ok(res, await secSvc.revokeActiveSession(id, req.user!.userId, req.ip));
  } catch (e) { fail(res, e); }
});

router.get('/security/locked-accounts', async (_req: AuthRequest, res) => {
  try { ok(res, await secSvc.listLockedAccounts()); } catch (e) { fail(res, e); }
});

router.post('/security/users/:id/unlock', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    ok(res, await secSvc.unlockUserAccount(id, req.user!.userId, req.ip));
  } catch (e) { fail(res, e); }
});

router.get('/backup/stats', async (_req: AuthRequest, res) => {
  try { ok(res, await backupSvc.getBackupStats()); } catch (e) { fail(res, e); }
});

router.get('/backup/snapshots', async (_req: AuthRequest, res) => {
  try { ok(res, await backupSvc.listBackupSnapshots()); } catch (e) { fail(res, e); }
});

router.post('/backup/trigger', async (req: AuthRequest, res) => {
  try {
    const { type } = req.body || {};
    ok(res, await backupSvc.triggerBackup(type || 'FULL', req.user!.userId, req.ip));
  } catch (e) { fail(res, e); }
});

router.get('/backup/download/:id', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const filePath = backupSvc.getBackupFilePath(id);
    res.download(filePath);
  } catch (e) { fail(res, e); }
});

router.get('/backup/maintenance', async (_req: AuthRequest, res) => {
  try { ok(res, backupSvc.getMaintenanceState()); } catch (e) { fail(res, e); }
});

router.post('/backup/maintenance', async (req: AuthRequest, res) => {
  try {
    const { active, reason } = req.body || {};
    ok(res, backupSvc.setMaintenanceState(Boolean(active), reason, req.user!.userId));
  } catch (e) { fail(res, e); }
});

router.get('/system-config', async (_req: AuthRequest, res) => {
  try { ok(res, cfgSvc.getSystemConfig()); } catch (e) { fail(res, e); }
});

router.put('/system-config', async (req: AuthRequest, res) => {
  try {
    ok(res, await cfgSvc.updateSystemConfig(req.body || {}, req.user!.userId, req.ip));
  } catch (e) { fail(res, e); }
});

router.post('/system-config/reset', async (req: AuthRequest, res) => {
  try {
    ok(res, await cfgSvc.resetSystemConfigToDefaults(req.user!.userId, req.ip));
  } catch (e) { fail(res, e); }
});

export { router as adminRouter };
export default router;
