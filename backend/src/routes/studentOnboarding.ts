/**
 * /api/student/onboarding — post-admission onboarding endpoints
 *
 * GET  /api/student/onboarding/prereqs
 *   Returns { feePaid, departmentSelected } — the two mandatory pre-dashboard
 *   steps.  Both true → student may access /dashboard/student immediately.
 *
 * PATCH /api/student/onboarding/payment
 *   Records that the student has paid the registration fee.
 *   Sets registrationFeePaid = true on StudentProfile.
 *
 * PATCH /api/student/onboarding/department
 *   Saves the department choice. Sets departmentSelected = true.
 *
 * GET  /api/student/onboarding/status  (unchanged — screenshot approval flow)
 * PATCH /api/student/onboarding/screenshot  (unchanged)
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role } from '../types/auth';
import { createNotification } from '../services/notificationService';

const router = Router();
router.use(authenticate, requireRole([Role.STUDENT]));

// ── GET /api/student/onboarding/departments ───────────────────────────────────
// Public list of active departments — used by the onboarding form.
// Accessible to any authenticated student (no admin role needed).
router.get('/departments', async (_req, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      where:   { isActive: true },
      orderBy: { name: 'asc' },
      select:  { id: true, name: true, code: true, description: true },
    });
    res.status(200).json(departments);
  } catch (err) {
    console.error('[onboarding/departments]', err);
    res.status(500).json({ error: 'Failed to load departments.' });
  }
});

// ── GET /api/student/onboarding/programs ──────────────────────────────────────
// Returns the active Harmony College programs from the database.
router.get('/programs', async (_req, res: Response): Promise<void> => {
  try {
    const programs = await prisma.program.findMany({
      where:   { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        durationYears: true,
        department: { select: { id: true, name: true, code: true } },
      },
    });
    res.status(200).json(programs);
  } catch (err) {
    console.error('[onboarding/programs]', err);
    res.status(500).json({ error: 'Failed to load programs.' });
  }
});

// ── GET /api/student/onboarding/prereqs ───────────────────────────────────────
// Returns the mandatory flags that gate dashboard access.
// fullyApproved = true only when BOTH Finance Officer AND Registrar have approved.
router.get('/prereqs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [profile, application] = await Promise.all([
      prisma.studentProfile.findUnique({
        where:  { userId },
        select: {
          registrationFeePaid:      true,
          departmentSelected:       true,
          selectedDepartmentId:     true,
          paymentVerifiedByFinance: true,
        },
      }),
      prisma.application.findUnique({
        where:  { userId },
        select: { status: true },
      }),
    ]);

    const paymentVerifiedByFinance = profile?.paymentVerifiedByFinance ?? false;
    const registrarApproved        = application?.status === 'ACCEPTED';
    const fullyApproved            = paymentVerifiedByFinance && registrarApproved;

    // Check if student has been assigned to an instructor/course
    const studentRecord = await prisma.studentRecord.findUnique({
      where: { userId },
      include: {
        enrollments: {
          where: {
            status: { in: ['ACTIVE', 'FORCE_ADDED'] },
            courseOffering: { instructorId: { not: null } },
          },
        },
      },
    });
    const isDepartmentLocked = (studentRecord?.enrollments?.length ?? 0) > 0;

    res.status(200).json({
      feePaid:                  profile?.registrationFeePaid ?? false,
      departmentSelected:       profile?.departmentSelected  ?? false,
      selectedDepartmentId:     profile?.selectedDepartmentId ?? null,
      paymentVerifiedByFinance,
      registrarApproved,
      fullyApproved,
      isDepartmentLocked,
      lockReason: isDepartmentLocked ? 'You have been assigned to an instructor/course. Department is locked.' : null,
    });
  } catch (err) {
    console.error('[onboarding/prereqs]', err);
    res.status(500).json({ error: 'Failed to fetch prerequisites.' });
  }
});

// ── PATCH /api/student/onboarding/payment ─────────────────────────────────────
// Marks registration fee as paid. In production this would be called by a
// payment-gateway webhook; for now the student self-confirms after paying
// in person / via bank transfer.
router.patch('/payment', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const profile = await prisma.studentProfile.upsert({
      where:  { userId },
      create: {
        userId,
        registrationFeePaid:   true,
        registrationFeePaidAt: new Date(),
      },
      update: {
        registrationFeePaid:   true,
        registrationFeePaidAt: new Date(),
      },
      select: {
        registrationFeePaid:  true,
        departmentSelected:   true,
      },
    });

    res.status(200).json({
      feePaid:            profile.registrationFeePaid,
      departmentSelected: profile.departmentSelected,
    });
  } catch (err) {
    console.error('[onboarding/payment]', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

// ── GET /api/student/onboarding/status ────────────────────────────────────────
router.get('/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const app = await prisma.application.findUnique({
      where:  { userId },
      select: {
        onboardingStatus:          true,
        registrationScreenshotUrl: true,
        screenshotUploadedAt:      true,
        onboardingRejectionReason: true,
        onboardingReviewedAt:      true,
      },
    });

    // If the student never completed the admission form, treat them as PENDING
    const status = app?.onboardingStatus ?? 'PENDING';

    res.status(200).json({
      onboardingStatus:          status,
      registrationScreenshotUrl: app?.registrationScreenshotUrl ?? null,
      screenshotUploadedAt:      app?.screenshotUploadedAt ?? null,
      onboardingRejectionReason: app?.onboardingRejectionReason ?? null,
      onboardingReviewedAt:      app?.onboardingReviewedAt ?? null,
    });
  } catch (err) {
    console.error('[onboarding/status]', err);
    res.status(500).json({ error: 'Failed to fetch onboarding status.' });
  }
});

// ── PATCH /api/student/onboarding/screenshot ──────────────────────────────────
router.patch('/screenshot', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const parsed = z.object({
      screenshotUrl: z.string().min(1, 'Screenshot URL is required'),
    }).safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid URL' });
      return;
    }

    // Find or create the application row for this student
    let app = await prisma.application.findUnique({ where: { userId } });

    if (!app) {
      // Student skipped the full admission form — create a minimal application row
      // so we have somewhere to store onboarding state
      const user = await prisma.user.findUnique({
        where:  { id: userId },
        select: { fullName: true, phone: true, email: true },
      });
      app = await prisma.application.create({
        data: {
          userId,
          fullName:        user?.fullName ?? '',
          dob:             new Date(),
          age:             0,
          gender:          '',
          nationality:     '',
          emergencyContact:'',
          phone:           user?.phone ?? '',
          city:            '',
          address:         '',
          program:         '',
          academicYear:    '',
          semester:        '',
          studyMode:       '',
          status:          'SUBMITTED',
          submittedAt:     new Date(),
        },
      });
    }

    if (app.onboardingStatus === 'APPROVED') {
      res.status(400).json({ error: 'Your onboarding is already approved.' });
      return;
    }

    const updated = await prisma.application.update({
      where: { userId },
      data: {
        registrationScreenshotUrl: parsed.data.screenshotUrl,
        screenshotUploadedAt:      new Date(),
        onboardingStatus:          'SUBMITTED',
        // Clear any previous rejection reason
        onboardingRejectionReason: null,
      },
      select: {
        onboardingStatus:          true,
        registrationScreenshotUrl: true,
        screenshotUploadedAt:      true,
      },
    });

    // Notify registrar (best-effort)
    try {
      const registrars = await prisma.user.findMany({
        where:  { role: { in: ['REGISTRAR', 'ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
        select: { id: true },
        take:   10,
      });
      if (registrars.length > 0) {
        const student = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
        // Fan-out: createNotification per registrar so each gets a socket push
        await Promise.all(registrars.map(r =>
          createNotification({
            userId:     r.id,
            title:      'New Registration Screenshot',
            message:    `${student?.fullName ?? 'A student'} has submitted their registration screenshot for review.`,
            type:       'INFO',
            entityType: 'Application',
            entityId:   app!.id,
            actionTab:  'admissions',
          })
        ));
      }
    } catch { /* notification failure must not fail the request */ }

    res.status(200).json(updated);
  } catch (err) {
    console.error('[onboarding/screenshot]', err);
    res.status(500).json({ error: 'Failed to submit screenshot.' });
  }
});

// ── PATCH /api/student/onboarding/department ─────────────────────────────────
router.patch('/department', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const parsed = z.object({
      departmentId: z.string().uuid(),
    }).safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Valid departmentId is required.' });
      return;
    }

    // Verify the department exists
    const dept = await prisma.department.findUnique({
      where:  { id: parsed.data.departmentId },
      select: { id: true, name: true },
    });
    if (!dept) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }

    // ── Check if department is locked (student assigned to instructor/course) ──
    const studentRecord = await prisma.studentRecord.findUnique({
      where: { userId },
      include: {
        enrollments: {
          where: {
            status: { in: ['ACTIVE', 'FORCE_ADDED'] },
            courseOffering: { instructorId: { not: null } },
          },
        },
      },
    });

    if (studentRecord && studentRecord.enrollments.length > 0) {
      res.status(403).json({
        error: 'Department is locked because you have been assigned to an instructor/course. Please contact the Registrar.',
        isDepartmentLocked: true,
      });
      return;
    }

    // Upsert StudentProfile with the chosen department
    await prisma.studentProfile.upsert({
      where:  { userId },
      create: {
        userId,
        selectedDepartmentId: parsed.data.departmentId,
        departmentSelected:   true,
      },
      update: {
        selectedDepartmentId: parsed.data.departmentId,
        departmentSelected:   true,
      },
    });

    // Update StudentRecord if it exists, aligning to the new department
    if (studentRecord) {
      const defaultProg = await prisma.program.findFirst({
        where: { departmentId: dept.id, isActive: true },
        select: { id: true },
      });

      await prisma.studentRecord.update({
        where: { id: studentRecord.id },
        data: {
          departmentId: dept.id,
          ...(defaultProg ? { programId: defaultProg.id } : {}),
        },
      });

      // Remove student from old department offerings to avoid duplication
      await prisma.enrollment.deleteMany({
        where: {
          studentRecordId: studentRecord.id,
          courseOffering: {
            course: { departmentId: { not: dept.id } },
          },
        },
      });
    }

    res.status(200).json({ success: true, department: dept });
  } catch (err) {
    console.error('[onboarding/department]', err);
    res.status(500).json({ error: 'Failed to save department selection.' });
  }
});

export default router;
