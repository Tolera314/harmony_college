import { prisma }              from '../../lib/prisma';
import { createNotification } from '../notificationService';
import { ApplicationStatus, StudentStatus } from '@prisma/client';
import { syncStudentEnrollments } from './enrollmentSyncService';

export interface AdmissionListQuery {
  page: number; limit: number;
  search?: string; status?: ApplicationStatus;
  program?: string; academicYear?: string;
}

export async function listApplications(q: AdmissionListQuery) {
  const { page, limit, search, status, program, academicYear } = q;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status) where.status = status;
  if (program) where.program = { contains: program, mode: 'insensitive' };
  if (academicYear) where.academicYear = academicYear;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { id: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where, skip, take: limit,
      orderBy: { submittedAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true } },
        documents: true,
      },
    }),
  ]);

  // Batch-fetch StudentProfile finance fields for all returned applications
  const userIds = applications.map(a => a.userId);
  const profiles = userIds.length > 0
    ? await prisma.studentProfile.findMany({
        where:  { userId: { in: userIds } },
        select: {
          userId:                  true,
          paymentVerifiedByFinance: true,
          paymentVerifiedAt:        true,
          paymentVerifiedByUserId:  true,
        },
      })
    : [];

  // Resolve finance officer names
  const financeUserIds = profiles
    .map(p => p.paymentVerifiedByUserId)
    .filter(Boolean) as string[];
  const financeUsers = financeUserIds.length > 0
    ? await prisma.user.findMany({
        where:  { id: { in: financeUserIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const financeUserMap = new Map(financeUsers.map(u => [u.id, u.fullName]));
  const profileMap     = new Map(profiles.map(p => [p.userId, p]));

  const enriched = applications.map(app => {
    const prof = profileMap.get(app.userId);
    return {
      ...app,
      financeVerified:     prof?.paymentVerifiedByFinance   ?? false,
      financeVerifiedAt:   prof?.paymentVerifiedAt?.toISOString() ?? null,
      financeVerifiedByName: prof?.paymentVerifiedByUserId
        ? (financeUserMap.get(prof.paymentVerifiedByUserId) ?? null)
        : null,
    };
  });

  return { total, page, limit, totalPages: Math.ceil(total / limit), applications: enriched };
}

export async function getApplicationById(id: string) {
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } },
      documents: true,
    },
  });
  if (!app) return null;

  const prof = await prisma.studentProfile.findUnique({
    where:  { userId: app.userId },
    select: { paymentVerifiedByFinance: true, paymentVerifiedAt: true, paymentVerifiedByUserId: true },
  });

  let financeVerifiedByName: string | null = null;
  if (prof?.paymentVerifiedByUserId) {
    const fu = await prisma.user.findUnique({
      where: { id: prof.paymentVerifiedByUserId },
      select: { fullName: true },
    });
    financeVerifiedByName = fu?.fullName ?? null;
  }

  return {
    ...app,
    financeVerified:       prof?.paymentVerifiedByFinance   ?? false,
    financeVerifiedAt:     prof?.paymentVerifiedAt?.toISOString() ?? null,
    financeVerifiedByName,
  };
}

export async function approveApplication(id: string, registrarUserId: string, comment?: string) {
  const app = await prisma.application.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!app) throw new Error('Application not found');
  if (app.status === ApplicationStatus.ACCEPTED) throw new Error('Application is already accepted');
  if (app.status === ApplicationStatus.REJECTED) throw new Error('Cannot approve a rejected application');

  // Find matching program — try multiple strategies
  const programName = app.program.split('(')[0].trim();
  let program = await prisma.program.findFirst({
    where: { name: { contains: programName, mode: 'insensitive' } },
    include: { department: true },
  });
  // If no match by name, try matching by department name via StudentProfile's selectedDepartment
  if (!program) {
    const studentProfile = await prisma.studentProfile.findUnique({
      where:  { userId: app.userId },
      select: { selectedDepartmentId: true, programType: true },
    });
    if (studentProfile?.selectedDepartmentId) {
      program = await prisma.program.findFirst({
        where: { departmentId: studentProfile.selectedDepartmentId },
        include: { department: true },
      });
    }
  }

  // Check if Finance Officer has already verified the registration fee payment.
  const studentProfile = await prisma.studentProfile.findUnique({
    where:  { userId: app.userId },
    select: { paymentVerifiedByFinance: true },
  });
  const financeApproved = studentProfile?.paymentVerifiedByFinance ?? false;

  // ── GATE: Finance Officer must approve before Registrar can approve ────────
  if (!financeApproved) {
    throw new Error(
      'Finance approval required first. The Finance Officer must verify the student\'s registration fee payment before the Registrar can approve this application.'
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update application status
    const updatedApp = await tx.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.ACCEPTED,
        reviewComment: comment ?? null,
        reviewedBy: registrarUserId,
        reviewedAt: new Date(),
      },
    });

    // 2. Activate user account
    await tx.user.update({
      where: { id: app.userId },
      data: { status: 'ACTIVE', emailVerified: true, phoneVerified: true },
    });

    let studentRecordId: string | null = null;
    if (program) {
      const existingSR = await tx.studentRecord.findUnique({ where: { userId: app.userId } });
      if (!existingSR) {
        const year = new Date().getFullYear();
        // Generate a collision-free studentId by checking the DB for conflicts
        let studentId: string;
        let attempt = 0;
        while (true) {
          const count = await tx.studentRecord.count();
          studentId = `HC-${year}-${String(count + 1 + attempt).padStart(4, '0')}`;
          const existing = await tx.studentRecord.findUnique({ where: { studentId } });
          if (!existing) break;
          attempt++;
        }
        // Determine programType from the application
        const appProgramType = app.programType === 'SHORT_PROGRAM' || app.programType === 'Short Program'
          ? 'SHORT_PROGRAM'
          : 'TVET';
        const createdSR = await tx.studentRecord.create({
          data: {
            userId:               app.userId,
            studentId,
            programId:            program.id,
            departmentId:         program.departmentId,
            status:               StudentStatus.ACTIVE,
            yearLevel:            1,
            programType:          appProgramType as any,
            shortProgramDuration: appProgramType === 'SHORT_PROGRAM' ? (app.shortProgramDuration ?? null) : null,
          },
        });
        studentRecordId = createdSR.id;
      } else {
        await tx.studentRecord.update({ where: { id: existingSR.id }, data: { status: StudentStatus.ACTIVE } });
        studentRecordId = existingSR.id;
      }
    }

    // 4. Dual-approval gate — unlock Student Dashboard if Finance has also verified
    if (financeApproved) {
      await tx.user.update({
        where: { id: app.userId },
        data:  { profileCompleted: true },
      });
    }

    // 5. Audit log
    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId,
        action: 'ADMISSION_APPROVED',
        entityType: 'Application',
        entityId: id,
        description: `Admission approved for ${app.fullName}${comment ? ` — ${comment}` : ''}`,
      },
    });

    // 6. Notification
    const notifMessage = financeApproved
      ? `Congratulations! Your application to ${app.program} has been approved and your registration fee was verified. You can now access the Student Dashboard!`
      : `Your application to ${app.program} has been approved. Once your registration fee is verified by Finance, you will have full access.`;

    createNotification({
      userId:     app.userId,
      title:      financeApproved ? 'Admission Approved - Welcome!' : 'Admission Approved',
      message:    notifMessage,
      type:       'SUCCESS',
      entityType: 'Application',
      entityId:   id,
      actionTab:  'dashboard',
    }).catch(() => {});

    return { updatedApp, studentRecordId };
  });

  if (result.studentRecordId) {
    await syncStudentEnrollments(result.studentRecordId).catch(() => {});
  }

  return result.updatedApp;
}

export async function rejectApplication(id: string, registrarUserId: string, reason: string) {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new Error('Application not found');
  if (app.status === ApplicationStatus.REJECTED) throw new Error('Application is already rejected');
  if (!reason?.trim()) throw new Error('Rejection reason is required');

  return prisma.$transaction(async (tx) => {
    const updatedApp = await tx.application.update({
      where: { id },
      data: { status: ApplicationStatus.REJECTED, reviewComment: reason.trim(), reviewedBy: registrarUserId, reviewedAt: new Date() },
    });

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId,
        action: 'ADMISSION_REJECTED',
        entityType: 'Application',
        entityId: id,
        description: `Admission rejected for ${app.fullName} — ${reason}`,
      },
    });

    createNotification({
      userId:     app.userId,
      title:      'Application Update',
      message:    `Your application has been reviewed. Reason: ${reason}`,
      type:       'WARNING',
      entityType: 'Application',
      entityId:   id,
      actionTab:  'dashboard',
    }).catch(() => {});

    return updatedApp;
  });
}

export async function requestCorrection(id: string, registrarUserId: string, comment: string) {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new Error('Application not found');
  if (!comment?.trim()) throw new Error('Comment is required');

  const updated = await prisma.application.update({
    where: { id },
    data: { status: ApplicationStatus.UNDER_REVIEW, reviewComment: comment.trim(), reviewedBy: registrarUserId, reviewedAt: new Date() },
  });

  await prisma.registrarAuditLog.create({
    data: {
      userId: registrarUserId, action: 'ADMISSION_REVIEW_REQUESTED',
      entityType: 'Application', entityId: id,
      description: `Correction requested for ${app.fullName} — ${comment}`,
    },
  });

  createNotification({
    userId:     app.userId,
    title:      'Action Required on Your Application',
    message:    `The registrar has requested a correction: ${comment}`,
    type:       'WARNING',
    entityType: 'Application',
    entityId:   id,
    actionTab:  'dashboard',
  }).catch(() => {});

  return updated;
}

export async function addComment(id: string, registrarUserId: string, comment: string) {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new Error('Application not found');
  if (!comment?.trim()) throw new Error('Comment cannot be empty');

  const updated = await prisma.application.update({
    where: { id },
    data: { reviewComment: comment.trim(), reviewedBy: registrarUserId, reviewedAt: new Date() },
  });

  await prisma.registrarAuditLog.create({
    data: {
      userId: registrarUserId, action: 'ADMISSION_COMMENT_ADDED',
      entityType: 'Application', entityId: id,
      description: `Comment added on application ${id}: ${comment}`,
    },
  });

  return updated;
}
