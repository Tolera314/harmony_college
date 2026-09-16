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
} from '../services/instructor/instructorService';

const router = Router();
router.use(authenticate, requireRole([Role.INSTRUCTOR, Role.REGISTRAR, Role.ADMIN, Role.SUPER_ADMIN, Role.DEPARTMENT_HEAD]));

function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function fail(res: Response, err: unknown) {
  const msg = err instanceof Error ? err.message : 'Unexpected error';
  res.status(msg.includes('not found') ? 404 : 500).json({ error: msg });
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
// FULL WEEKLY SCHEDULE (spec §13)
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

// ═══════════════════════════════════════════════════════════════════════════
// TODAY'S SESSIONS with attendance status (spec §13 — "open class & attendance")
// ═══════════════════════════════════════════════════════════════════════════

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
// NOTIFICATIONS  (scoped strictly to the authenticated instructor's userId)
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/instructor/notifications?page&limit&unreadOnly
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

// PATCH /api/instructor/notifications/:id/read
router.patch('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    ok(res, await markInstructorNotificationRead(req.user!.userId, String(req.params.id)));
  } catch (e) { fail(res, e); }
});

// POST /api/instructor/notifications/read-all
router.post('/notifications/read-all', async (req: AuthRequest, res) => {
  try {
    ok(res, await markAllInstructorNotificationsRead(req.user!.userId));
  } catch (e) { fail(res, e); }
});

export default router;
