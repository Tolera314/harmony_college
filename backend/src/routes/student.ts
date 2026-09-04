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
import { ProgramType } from '@prisma/client';
import { patchProfileSchema } from '../lib/validations';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import {
  calculateProfileCompletion,
  getMissingFields,
  isProfileComplete,
} from '../services/profileCompletion';
import {
  Role,
  AuditAction,
} from '../types/auth';
import { syncStudentEnrollments } from '../services/registrar/enrollmentSyncService';

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
  nationalId:           true,
  program:              true,
  programType:          true,
  shortProgramDuration: true,
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

    const [user, profile, application, studentRecord] = await Promise.all([
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
        include: {
          selectedDepartment: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.application.findUnique({
        where:  { userId },
      }),
      prisma.studentRecord.findUnique({
        where:  { userId },
        include: {
          program:    { select: { name: true } },
          department: { select: { name: true, code: true } },
        },
      }),
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Merge existing profile data with pre-filled defaults from Application / StudentRecord / selectedDepartment
    const mergedProfile = profile
      ? {
          dob:                  profile.dob                  ?? application?.dob                  ?? null,
          gender:               profile.gender               ?? application?.gender               ?? null,
          nationality:          profile.nationality          ?? application?.nationality          ?? 'Ethiopian',
          region:               profile.region               ?? null,
          city:                 profile.city                 ?? application?.city                 ?? null,
          address:              profile.address              ?? application?.address              ?? null,
          nationalId:           profile.nationalId           ?? null,
          program:              profile.program              ?? studentRecord?.program?.name      ?? profile.selectedDepartment?.name ?? application?.program ?? null,
          programType:          profile.programType          ?? application?.programType          ?? null,
          shortProgramDuration: profile.shortProgramDuration ?? application?.shortProgramDuration ?? null,
          academicYear:         profile.academicYear         ?? application?.academicYear         ?? '2026/2027',
          semester:             profile.semester             ?? application?.semester             ?? 'Semester I',
          matricResult:         profile.matricResult         ?? null,
          ministryResult:       profile.ministryResult       ?? null,
          profilePictureUrl:    profile.profilePictureUrl    ?? null,
          faydaIdUrl:           profile.faydaIdUrl           ?? null,
          transcriptUrl:        profile.transcriptUrl        ?? null,
          emergencyName:        profile.emergencyName        ?? application?.emergencyContact     ?? null,
          emergencyRelationship:profile.emergencyRelationship?? null,
          emergencyPhone:       profile.emergencyPhone       ?? application?.phone                ?? null,
          emergencyNotes:       profile.emergencyNotes       ?? null,
          createdAt:            profile.createdAt,
          updatedAt:            profile.updatedAt,
        }
      : null;

    // Check if student is assigned to an instructor/course
    const hasAssignedInstructor = await prisma.enrollment.findFirst({
      where: {
        studentRecord: { userId },
        status: { in: ['ACTIVE', 'FORCE_ADDED'] },
        courseOffering: { instructorId: { not: null } },
      },
    });
    const isDepartmentLocked = !!hasAssignedInstructor;

    res.status(200).json({
      profile: mergedProfile,
      user,
      isDepartmentLocked,
      lockReason: isDepartmentLocked ? 'You have been assigned to an instructor/course. Department is locked.' : null,
    });
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

    // Check if student has been assigned to an instructor/course before allowing department change
    if (profileData.program || profileData.selectedDepartmentId) {
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

      const isAssigned = (studentRecord?.enrollments?.length ?? 0) > 0;
      if (isAssigned) {
        const curProfile = await prisma.studentProfile.findUnique({
          where: { userId },
          select: { program: true, selectedDepartmentId: true },
        });

        const isChanging =
          (profileData.program && curProfile?.program && curProfile.program !== profileData.program) ||
          (profileData.selectedDepartmentId && curProfile?.selectedDepartmentId && curProfile.selectedDepartmentId !== profileData.selectedDepartmentId);

        if (isChanging) {
          res.status(403).json({
            error: 'Department change is locked because you have already been assigned to an instructor/course. Please contact the Registrar.',
            isDepartmentLocked: true,
          });
          return;
        }
      }
    }

    if (profileData.program && typeof profileData.program === 'string') {
      const matchedProg = await prisma.program.findFirst({
        where: { name: { contains: (profileData.program as string).split('(')[0].trim(), mode: 'insensitive' } },
        include: { department: true },
      });
      if (matchedProg) {
        profileData.selectedDepartmentId = matchedProg.departmentId;
        profileData.departmentSelected = true;
      }
    }

    // ── 2. Upsert StudentProfile ──────────────────────────────────────────────
    const savedProfile = await prisma.studentProfile.upsert({
      where:  { userId },
      create: { userId, academicYear: '2026/2027', ...profileData },
      update: { ...profileData },
      select: PROFILE_SELECT,
    });

    // Also update application record if it exists so program change reflects everywhere
    if (profileData.program || profileData.programType || profileData.shortProgramDuration !== undefined) {
      const isShort = profileData.programType === 'Short Program' || profileData.programType === 'SHORT_PROGRAM';
      await prisma.application.updateMany({
        where: { userId },
        data: {
          ...(profileData.program ? { program: profileData.program as string } : {}),
          ...(profileData.programType ? { programType: profileData.programType as string } : {}),
          shortProgramDuration: isShort ? (profileData.shortProgramDuration as string | null) : null,
        },
      });
    }

    // ── Update StudentRecord.programType, duration, programId + departmentId ──
    // This ensures the Registrar always sees the student's isolated academic records.
    if (profileData.program || profileData.programType || profileData.shortProgramDuration !== undefined) {
      const isShort = profileData.programType === 'Short Program' || profileData.programType === 'SHORT_PROGRAM' || (savedProfile.programType === 'Short Program');
      const targetProgType = isShort ? ProgramType.SHORT_PROGRAM : ProgramType.TVET;
      const targetDuration = isShort ? (profileData.shortProgramDuration as string ?? savedProfile.shortProgramDuration ?? '2 Months') : null;

      const programName = (profileData.program as string) || savedProfile.program || '';
      const cleanProgName = programName.split('(')[0].trim();

      // Find the exact active department for this program and programType first!
      let matchedDept = await prisma.department.findFirst({
        where: {
          isActive: true,
          programType: targetProgType,
          name: { contains: cleanProgName, mode: 'insensitive' },
        },
        select: { id: true, name: true },
      });

      let matchedProgram = matchedDept ? await prisma.program.findFirst({
        where: { departmentId: matchedDept.id, isActive: true },
        select: { id: true, departmentId: true, name: true },
      }) : null;

      if (!matchedProgram) {
        matchedProgram = await prisma.program.findFirst({
          where: {
            name: { contains: cleanProgName, mode: 'insensitive' },
            department: { programType: targetProgType, isActive: true },
          },
          select: { id: true, departmentId: true, name: true },
        });
      }

      if (matchedProgram) {
        const existingRecord = await prisma.studentRecord.findUnique({
          where: { userId },
          select: { id: true },
        });
        if (existingRecord) {
          await prisma.studentRecord.update({
            where: { userId },
            data: {
              programType: targetProgType,
              shortProgramDuration: targetDuration,
              programId:    matchedProgram.id,
              departmentId: matchedProgram.departmentId,
            },
          });

          // Drop any prior enrollments from wrong department or wrong programType to avoid data mixing
          await prisma.enrollment.deleteMany({
            where: {
              studentRecordId: existingRecord.id,
              courseOffering: {
                OR: [
                  { course: { departmentId: { not: matchedProgram.departmentId } } },
                  { programType: { not: targetProgType } },
                ],
              },
            },
          });

          // Sync active enrollments for the student under this department/program
          await syncStudentEnrollments(existingRecord.id).catch(() => {});
        }
      }
    }

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

    // ── 5. Update User.profileCompletion ─────────────────────────────────────
    // NOTE: profileCompleted (the dashboard-access gate) is intentionally NOT
    // set here. It is only set to true once BOTH the Finance Officer has
    // verified the registration fee AND the Registrar has approved admission.
    // Setting it here would allow students to bypass the approval gate simply
    // by filling their profile.

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profileCompletion: completion,
        ...(submit && isComplete ? { profileCompleted: true } : {}),
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

    if (submit && isComplete) {
      await writeAudit(AuditAction.PROFILE_COMPLETED, userId, { profileCompletion: completion });
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
