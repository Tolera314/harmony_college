import { prisma } from '../../lib/prisma';
import { ApplicationStatus, StudentStatus } from '@prisma/client';

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

  return { total, page, limit, totalPages: Math.ceil(total / limit), applications };
}

export async function getApplicationById(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } },
      documents: true,
    },
  });
}

export async function approveApplication(id: string, registrarUserId: string, comment?: string) {
  const app = await prisma.application.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!app) throw new Error('Application not found');
  if (app.status === ApplicationStatus.ACCEPTED) throw new Error('Application is already accepted');
  if (app.status === ApplicationStatus.REJECTED) throw new Error('Cannot approve a rejected application');

  // Find matching program
  const program = await prisma.program.findFirst({
    where: { name: { contains: app.program.split('(')[0].trim(), mode: 'insensitive' } },
    include: { department: true },
  });

  return prisma.$transaction(async (tx) => {
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

    // 3. Create or update student record if program found
    if (program) {
      const existingSR = await tx.studentRecord.findUnique({ where: { userId: app.userId } });
      if (!existingSR) {
        const year = new Date().getFullYear();
        const count = await tx.studentRecord.count();
        const studentId = `HC-${year}-${String(count + 1).padStart(4, '0')}`;
        await tx.studentRecord.create({
          data: {
            userId: app.userId,
            studentId,
            programId: program.id,
            departmentId: program.departmentId,
            status: StudentStatus.ACTIVE,
            yearLevel: 1,
          },
        });
      } else {
        await tx.studentRecord.update({ where: { id: existingSR.id }, data: { status: StudentStatus.ACTIVE } });
      }
    }

    // 4. Audit log
    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId,
        action: 'ADMISSION_APPROVED',
        entityType: 'Application',
        entityId: id,
        description: `Admission approved for ${app.fullName}${comment ? ` — ${comment}` : ''}`,
      },
    });

    // 5. Notification
    await tx.notification.create({
      data: {
        userId: app.userId,
        title: 'Admission Approved',
        message: `Congratulations! Your application to ${app.program} has been approved.`,
        type: 'SUCCESS',
        entityType: 'Application',
        entityId: id,
      },
    });

    return updatedApp;
  });
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

    await tx.notification.create({
      data: {
        userId: app.userId,
        title: 'Application Update',
        message: `Your application has been reviewed. Reason: ${reason}`,
        type: 'WARNING',
        entityType: 'Application',
        entityId: id,
      },
    });

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

  await prisma.notification.create({
    data: {
      userId: app.userId, title: 'Action Required on Your Application',
      message: `The registrar has requested a correction: ${comment}`,
      type: 'WARNING', entityType: 'Application', entityId: id,
    },
  });

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
