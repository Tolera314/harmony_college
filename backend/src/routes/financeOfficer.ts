/**
 * /api/finance-officer — Finance Officer routes
 * All routes require: authenticate + requireRole([FINANCE_OFFICER, ADMIN, SUPER_ADMIN])
 *
 * POST /api/finance-officer/payments/:userId/verify
 *   Finance Officer marks a student's registration fee payment as verified.
 *   Sets StudentProfile.paymentVerifiedByFinance = true.
 *   After this, the student appears in Registrar → Admissions.
 *
 * POST /api/finance-officer/payments/:userId/unverify
 *   Reverses a mistaken verification.
 *
 * GET /api/finance-officer/payments/pending
 *   Lists students who have paid (registrationFeePaid = true) but whose
 *   payment has NOT yet been verified by Finance Officer.
 *
 * GET /api/finance-officer/payments/verified
 *   Lists students whose payment has been verified.
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/auth';

const router = Router();
const FO_ROLES = [Role.FINANCE_OFFICER, Role.ADMIN, Role.SUPER_ADMIN];
router.use(authenticate, requireRole(FO_ROLES));

// ── helpers ───────────────────────────────────────────────────────────────────
function ok(res: Response, data: unknown, status = 200) { res.status(status).json(data); }
function fail(res: Response, err: unknown, status = 500) {
  const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
  res.status(status).json({ error: msg });
}
function pageParams(query: Record<string, string | undefined>) {
  const page  = Math.max(1, parseInt(query.page  ?? '1',  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));
  return { page, limit };
}

const PROFILE_SELECT = {
  userId:                   true,
  registrationFeePaid:      true,
  registrationFeePaidAt:    true,
  departmentSelected:       true,
  paymentVerifiedByFinance:  true,
  paymentVerifiedAt:        true,
  paymentVerifiedByUserId:  true,
  selectedDepartmentId:     true,
  createdAt:                true,
  user: {
    select: { id: true, fullName: true, email: true, phone: true, createdAt: true },
  },
  selectedDepartment: {
    select: { id: true, name: true, code: true },
  },
} as const;

// ── GET /api/finance-officer/payments/pending ─────────────────────────────────
// Students who paid but are not yet verified by Finance Officer
router.get('/payments/pending', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query  = req.query as Record<string, string | undefined>;
    const { page, limit } = pageParams(query);
    const skip = (page - 1) * limit;
    const search = typeof query.search === 'string' ? query.search : undefined;

    const where: any = {
      registrationFeePaid:      true,
      paymentVerifiedByFinance:  false,
    };
    if (search) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email:    { contains: search, mode: 'insensitive' } },
          { phone:    { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, profiles] = await Promise.all([
      prisma.studentProfile.count({ where }),
      prisma.studentProfile.findMany({
        where, skip, take: limit,
        orderBy: { registrationFeePaidAt: 'desc' },
        select: PROFILE_SELECT,
      }),
    ]);

    ok(res, { total, page, limit, totalPages: Math.ceil(total / limit), payments: profiles });
  } catch (err) {
    console.error('[FO/payments/pending]', err);
    fail(res, err);
  }
});

// ── GET /api/finance-officer/payments/verified ────────────────────────────────
router.get('/payments/verified', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query  = req.query as Record<string, string | undefined>;
    const { page, limit } = pageParams(query);
    const skip = (page - 1) * limit;
    const search = typeof query.search === 'string' ? query.search : undefined;

    const where: any = { paymentVerifiedByFinance: true };
    if (search) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email:    { contains: search, mode: 'insensitive' } },
          { phone:    { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, profiles] = await Promise.all([
      prisma.studentProfile.count({ where }),
      prisma.studentProfile.findMany({
        where, skip, take: limit,
        orderBy: { paymentVerifiedAt: 'desc' },
        select: PROFILE_SELECT,
      }),
    ]);

    ok(res, { total, page, limit, totalPages: Math.ceil(total / limit), payments: profiles });
  } catch (err) {
    console.error('[FO/payments/verified]', err);
    fail(res, err);
  }
});

// ── POST /api/finance-officer/payments/:userId/verify ────────────────────────
router.post('/payments/:userId/verify', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);

    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) {
      res.status(404).json({ error: 'Student profile not found. Student has not completed onboarding.' });
      return;
    }
    if (!profile.registrationFeePaid) {
      res.status(400).json({ error: 'Student has not submitted their registration fee payment yet.' });
      return;
    }
    if (profile.paymentVerifiedByFinance) {
      res.status(400).json({ error: 'Payment is already verified.' });
      return;
    }

    const updated = await prisma.studentProfile.update({
      where: { userId },
      data: {
        paymentVerifiedByFinance:  true,
        paymentVerifiedAt:        new Date(),
        paymentVerifiedByUserId:  req.user!.userId,
      },
      select: PROFILE_SELECT,
    });

    // Notify the student
    try {
      await prisma.notification.create({
        data: {
          userId,
          title:   'Payment Verified ✓',
          message: 'Your registration fee payment has been verified by the Finance Office. You now appear in the Registrar\'s admissions queue.',
          type:    'SUCCESS',
        },
      });
    } catch { /* notification failure must not fail the request */ }

    ok(res, updated);
  } catch (err) {
    console.error('[FO/payments/verify]', err);
    fail(res, err, 400);
  }
});

// ── POST /api/finance-officer/payments/:userId/unverify ──────────────────────
router.post('/payments/:userId/unverify', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);

    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) {
      res.status(404).json({ error: 'Student profile not found.' });
      return;
    }

    const updated = await prisma.studentProfile.update({
      where: { userId },
      data: {
        paymentVerifiedByFinance:  false,
        paymentVerifiedAt:        null,
        paymentVerifiedByUserId:  null,
      },
      select: PROFILE_SELECT,
    });

    ok(res, updated);
  } catch (err) {
    console.error('[FO/payments/unverify]', err);
    fail(res, err, 400);
  }
});

export default router;
