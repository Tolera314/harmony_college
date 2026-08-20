/**
 * Attendance Routes
 *
 * /api/attendance/*
 *
 * Instructor endpoints (INSTRUCTOR, REGISTRAR, ADMIN):
 *   GET  /api/attendance/sessions/today          — today's sessions for instructor
 *   GET  /api/attendance/sessions/:offeringId    — all sessions for an offering
 *   POST /api/attendance/sessions/generate       — generate sessions from timetable
 *   POST /api/attendance/sessions/:id/open       — open session (creates absent records)
 *   POST /api/attendance/sessions/:id/close      — close session
 *   POST /api/attendance/sessions/:id/finalize   — finalize (lock permanently)
 *   GET  /api/attendance/sessions/:id/roster     — get full roster with status
 *   PATCH /api/attendance/sessions/:id/mark      — mark one student
 *   POST /api/attendance/sessions/:id/bulk-mark  — mark all students at once
 *   POST /api/attendance/sessions/:id/qr-token   — generate QR token
 *
 * Student endpoints (STUDENT):
 *   POST /api/attendance/qr-scan                 — scan QR token (marks self)
 *   GET  /api/attendance/my-summary              — own attendance summary
 *
 * Registrar/Admin endpoints:
 *   GET  /api/attendance/report                  — paginated attendance report
 *   GET  /api/attendance/below-threshold         — students below threshold
 *   PATCH /api/attendance/records/:id/correct    — correction with audit log
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role, AttendanceStatus } from '@prisma/client';
import * as svc from '../services/attendance/attendanceService';

const router = Router();
router.use(authenticate);

// ── Helpers ───────────────────────────────────────────────────────────────────
type Q = Record<string, string | undefined>;
const q = (req: AuthRequest): Q => req.query as Q;
const pid = (req: AuthRequest, key = 'id'): string => req.params[key] as string;
const ok  = (res: Response, data: unknown, status = 200) => res.status(status).json(data);
const fail = (res: Response, err: unknown, def = 500) => {
  const msg = err instanceof Error ? err.message : 'Unexpected error';
  const s = msg.includes('not found') ? 404 : msg.includes('Unauthorized') ? 403 : msg.includes('Invalid') || msg.includes('expired') || msg.includes('not enrolled') || msg.includes('required') ? 400 : def;
  res.status(s).json({ error: msg });
};

const INSTRUCTOR_ROLES  = [Role.INSTRUCTOR, Role.REGISTRAR, Role.ADMIN, Role.SUPER_ADMIN];
const REGISTRAR_ROLES   = [Role.REGISTRAR, Role.ADMIN, Role.SUPER_ADMIN];
const ALL_ROLES         = [Role.STUDENT, Role.INSTRUCTOR, Role.REGISTRAR, Role.ADMIN, Role.SUPER_ADMIN, Role.DEPARTMENT_HEAD];

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTOR / REGISTRAR ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/sessions/today', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getTodaySessionsForInstructor(req.user!.userId));
  } catch (e) { fail(res, e); }
});

router.get('/sessions/offering/:offeringId', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getSessionsForOffering(pid(req, 'offeringId')));
  } catch (e) { fail(res, e); }
});

router.post('/sessions/generate', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      courseOfferingId: z.string().uuid(),
      fromDate: z.string().datetime(),
      toDate:   z.string().datetime(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const count = await svc.generateClassSessions(
      parsed.data.courseOfferingId,
      new Date(parsed.data.fromDate),
      new Date(parsed.data.toDate),
    );
    ok(res, { generated: count });
  } catch (e) { fail(res, e, 400); }
});

router.post('/sessions/:id/open', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const opts = req.body as { lateAfterMinutes?: number; closeAfterMinutes?: number; openBeforeMinutes?: number };
    ok(res, await svc.openAttendanceSession(pid(req), req.user!.userId, opts), 201);
  } catch (e) { fail(res, e, 400); }
});

router.post('/sessions/:id/close', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.closeAttendanceSession(pid(req), req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

router.post('/sessions/:id/finalize', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.finalizeAttendanceSession(pid(req), req.user!.userId));
  } catch (e) { fail(res, e, 400); }
});

router.get('/sessions/:id/roster', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.getAttendanceRoster(pid(req), req.user!.userId));
  } catch (e) { fail(res, e); }
});

router.patch('/sessions/:id/mark', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      studentRecordId: z.string().uuid(),
      status: z.nativeEnum(AttendanceStatus),
      note: z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.markAttendance({
      attendanceSessionId: pid(req),
      studentRecordId:     parsed.data.studentRecordId,
      status:              parsed.data.status,
      instructorUserId:    req.user!.userId,
      note:                parsed.data.note,
    }));
  } catch (e) { fail(res, e, 400); }
});

router.post('/sessions/:id/bulk-mark', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      marks: z.array(z.object({
        studentRecordId: z.string().uuid(),
        status: z.nativeEnum(AttendanceStatus),
      })).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    ok(res, await svc.bulkMarkAttendance({
      attendanceSessionId: pid(req),
      marks:               parsed.data.marks,
      instructorUserId:    req.user!.userId,
    }));
  } catch (e) { fail(res, e, 400); }
});

router.post('/sessions/:id/qr-token', requireRole(INSTRUCTOR_ROLES), async (req: AuthRequest, res) => {
  try {
    ok(res, await svc.generateQrToken(pid(req), req.user!.userId), 201);
  } catch (e) { fail(res, e, 400); }
});

// ══════════════════════════════════════════════════════════════════════════════
// STUDENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/qr-scan', requireRole([Role.STUDENT]), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      // rawToken comes from the QR scan — studentUserId resolved from JWT on server
      rawToken: z.string().min(10, 'Invalid QR code'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid QR code' }); return; }
    ok(res, await svc.markAttendanceViaQr({
      rawToken:      parsed.data.rawToken,
      studentUserId: req.user!.userId, // from authenticated JWT — never trusted from client
    }));
  } catch (e) { fail(res, e, 400); }
});

router.get('/my-summary', requireRole([Role.STUDENT]), async (req: AuthRequest, res) => {
  try {
    const { prisma } = await import('../lib/prisma');
    const sr = await prisma.studentRecord.findUnique({
      where: { userId: req.user!.userId }, select: { id: true },
    });
    if (!sr) { res.status(404).json({ error: 'Student record not found' }); return; }
    ok(res, await svc.getStudentAttendanceSummary(sr.id));
  } catch (e) { fail(res, e); }
});

// ══════════════════════════════════════════════════════════════════════════════
// REGISTRAR / ADMIN ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/report', requireRole(REGISTRAR_ROLES), async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    const page  = Math.max(1, parseInt(qp.page  ?? '1',  10) || 1);
    const limit = Math.min(100, parseInt(qp.limit ?? '20', 10) || 20);
    ok(res, await svc.getAttendanceReport({
      page, limit,
      semesterId:       qp.semesterId,
      courseOfferingId: qp.courseOfferingId,
      studentRecordId:  qp.studentRecordId,
      departmentId:     qp.departmentId,
      from:             qp.from ? new Date(qp.from) : undefined,
      to:               qp.to   ? new Date(qp.to)   : undefined,
    }));
  } catch (e) { fail(res, e); }
});

router.get('/below-threshold', requireRole(REGISTRAR_ROLES), async (req: AuthRequest, res) => {
  try {
    const qp = q(req);
    if (!qp.courseOfferingId) { res.status(400).json({ error: 'courseOfferingId is required' }); return; }
    const threshold = parseInt(qp.threshold ?? '75', 10);
    ok(res, await svc.getStudentsBelowThreshold(qp.courseOfferingId, threshold));
  } catch (e) { fail(res, e); }
});

router.patch('/records/:id/correct', requireRole([...REGISTRAR_ROLES, Role.INSTRUCTOR]), async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      newStatus: z.nativeEnum(AttendanceStatus),
      reason:    z.string().min(10, 'Reason must be at least 10 characters'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }); return; }
    ok(res, await svc.correctAttendance({
      attendanceRecordId: pid(req),
      newStatus:          parsed.data.newStatus,
      reason:             parsed.data.reason,
      changedByUserId:    req.user!.userId,
    }));
  } catch (e) { fail(res, e, 400); }
});

export default router;
