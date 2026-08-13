/**
 * Harmony College — Student Profile Routes
 * ─────────────────────────────────────────
 * GET  /api/student/profile  — load student's profile for the wizard
 * PATCH /api/student/profile — partial save / final submit
 *
 * Both endpoints require a valid authenticated session (STUDENT role).
 * userId is ALWAYS taken from req.user — never from the request body.
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { patchProfileSchema } from '../lib/validations';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  calculateProfileCompletion,
  getMissingFields,
  isProfileComplete,
} from '../services/profileCompletion';
import {
  Role,
  AccountStatus,
  AuditAction,
} from '../types/auth';
import { signAccessToken, signRefreshToken } from '../lib/auth';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { TOKEN_BCRYPT_ROUNDS, REFRESH_TOKEN_TTL_SECONDS } from '../types/auth';

const router = Router();

// All student routes require authentication + STUDENT role
router.use(authenticate);
router.use(requireRole([Role.STUDENT]));

// ── Shared safe profile select ────────────────────────────────────────────────
const PROFILE_SELECT = {
  dob:                  true,
  gender:               true,
  nationality:          true,
  region:               true,
  city:                 true,
  address:              true,
  program:              true,
  academicYear:         true,
  semester:             true,
  matricResult:         true,
  ministryResult:       true,
  profilePictureUrl:    true,
  faydaIdUrl:           true,
  transcriptUrl:        true,
  emergencyName:        true,
  emergencyRelationship:true,
  emergencyPhone:       true,
  emergencyNotes:       true,
  createdAt:            true,
  updatedAt:            true,
} as const;

// ── Audit log helper (fire-and-forget) ───────────────────────────────────────
async function writeAudit(
  action: AuditAction,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { action, userId, metadata: metadata ? (metadata as object) : undefined },
    });
  } catch { /* never crash the request */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/student/profile
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [user, profile] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: userId },
        select: {
          fullName:          true,
          phone:             true,
          email:             true,
          profileCompletion: true,
          profileCompleted:  true,
        },
      }),
      prisma.studentProfile.findUnique({
        where:  { userId },
        select: PROFILE_SELECT,
      }),
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.status(200).json({ profile: profile ?? null, user });
  } catch (err: unknown) {
    console.error('[student/profile GET]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to load profile. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/student/profile
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // ── 1. Validate input ────────────────────────────────────────────────────
    const parsed = patchProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error:   'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { submit, dob, ...rest } = parsed.data;

    // Build the profile data to upsert.
    // Convert dob string → Date if provided.
    const profileData: Record<string, unknown> = { ...rest };
    if (dob) profileData.dob = new Date(dob);

    // Explicitly exclude fields that must never come from the client
    delete profileData.userId;

    // ── 2. Upsert StudentProfile ──────────────────────────────────────────────
    const savedProfile = await prisma.studentProfile.upsert({
      where:  { userId },
      create: { userId, ...profileData },
      update: { ...profileData },
      select: PROFILE_SELECT,
    });

    // ── 3. Calculate completion ───────────────────────────────────────────────
    const completion   = calculateProfileCompletion(savedProfile);
    const isComplete   = isProfileComplete(savedProfile);
    const missingFields = getMissingFields(savedProfile);

    // ── 4. If submit: true — validate all required fields before marking complete
    if (submit) {
      if (!isComplete) {
        res.status(422).json({
          error:         'Profile is incomplete. Please fill all required fields before submitting.',
          missingFields,
          profileCompletion: completion,
        });
        return;
      }
    }

    // ── 5. Update User.profileCompletion and User.profileCompleted ────────────
    const shouldMarkComplete = submit && isComplete;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profileCompletion: completion,
        ...(shouldMarkComplete ? { profileCompleted: true } : {}),
      },
      select: {
        id:               true,
        fullName:         true,
        email:            true,
        phone:            true,
        role:             true,
        status:           true,
        profileCompleted: true,
        profileCompletion:true,
        emailVerified:    true,
        phoneVerified:    true,
        lastLoginAt:      true,
      },
    });

    if (shouldMarkComplete) {
      await writeAudit(AuditAction.PROFILE_COMPLETED, userId, { profileCompletion: completion });
    }

    // ── 6. If submission complete, issue fresh access token with updated profileCompleted
    if (shouldMarkComplete) {
      // Re-use the existing session (don't create a new one)
      const session = await prisma.session.findFirst({
        where:   { userId, isRevoked: false },
        orderBy: { lastUsedAt: 'desc' },
      });

      if (session) {
        const newAccessToken = await signAccessToken({
          userId:           userId,
          sessionId:        session.id,
          email:            updatedUser.email ?? null,
          role:             updatedUser.role,
          status:           updatedUser.status,
          profileCompleted: true,
        });

        const IS_PROD = process.env.NODE_ENV === 'production';
        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure:   IS_PROD,
          sameSite: 'lax',
          maxAge:   (parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN ?? '900', 10) || 900) * 1000,
          path:     '/',
        });
      }
    }

    // ── 7. Respond ────────────────────────────────────────────────────────────
    res.status(200).json({
      profileCompletion: completion,
      profileCompleted:  updatedUser.profileCompleted,
      profile:           savedProfile,
      user:              updatedUser,
    });
  } catch (err: unknown) {
    console.error('[student/profile PATCH]', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to save profile. Please try again.' });
  }
});

export default router;
