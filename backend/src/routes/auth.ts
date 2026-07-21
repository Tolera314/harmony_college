import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signJWT } from '../lib/auth';
import { signInSchema, applicationSchema, normalizePhone } from '../lib/validations';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days in ms (express uses ms, not seconds)
  path: '/',
};

// ── POST /api/auth/signin ─────────────────────────────────────────────────────
router.post('/signin', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = signInSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('session', token, COOKIE_OPTIONS);
    res.status(200).json({ success: true, message: 'Logged in successfully.', role: user.role });
  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = applicationSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const data = result.data;

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.$transaction(async (tx: typeof prisma) => {
      const user = await tx.user.create({
        data: { email: data.email, passwordHash, role: 'STUDENT' },
      });

      const application = await tx.application.create({
        data: {
          userId: user.id,
          fullName: data.fullName,
          dob: new Date(data.dob),
          age: data.age,
          gender: data.gender,
          nationality: data.nationality,
          phone: normalizePhone(data.phone),
          emergencyContact: normalizePhone(data.emergencyContact),
          city: data.city,
          address: data.address,
          program: data.program,
          academicYear: data.academicYear,
          semester: data.semester,
          studyMode: data.studyMode,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      await tx.document.createMany({
        data: [
          { applicationId: application.id, type: 'MATRIC',          fileUrl: data.matricFileUrl },
          { applicationId: application.id, type: 'GRADE_8',         fileUrl: data.grade8FileUrl },
          { applicationId: application.id, type: 'TRANSCRIPT_9_10', fileUrl: data.transcript910FileUrl },
          { applicationId: application.id, type: 'TRANSCRIPT_11_12',fileUrl: data.transcript1112FileUrl },
        ],
      });

      return user;
    });

    const token = await signJWT({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    res.cookie('session', token, COOKIE_OPTIONS);
    res.status(201).json({
      success: true,
      message: 'Registration and application submitted successfully.',
    });
  } catch (error) {
    console.error('Sign-up error:', error);
    res.status(500).json({ error: 'An unexpected error occurred during registration.' });
  }
});

// ── POST /api/auth/signout ────────────────────────────────────────────────────
router.post('/signout', (_req: Request, res: Response): void => {
  res.cookie('session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

export default router;
