import { prisma }              from '../../lib/prisma';
import { createNotification } from '../notificationService';
import { GraduationStatus }   from '@prisma/client';

export async function listGraduationAudits(q: {
  page: number; limit: number; search?: string; status?: string;
}) {
  const skip = (q.page - 1) * q.limit;
  const where: any = {};
  if (q.status) where.status = q.status;
  if (q.search) {
    where.studentRecord = {
      OR: [
        { user: { fullName: { contains: q.search, mode: 'insensitive' } } },
        { studentId: { contains: q.search, mode: 'insensitive' } },
      ],
    };
  }
  const [total, audits] = await Promise.all([
    prisma.graduationAudit.count({ where }),
    prisma.graduationAudit.findMany({
      where, skip, take: q.limit, orderBy: { createdAt: 'desc' },
      include: {
        studentRecord: {
          include: {
            user: { select: { fullName: true, email: true } },
            program: { select: { name: true, code: true, totalCredits: true } },
            department: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  return { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit), audits };
}

export async function runGraduationAudit(studentRecordId: string, registrarUserId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      program: { include: { requirements: true } },
      enrollments: {
        where: { status: { in: ['COMPLETED', 'ACTIVE', 'FORCE_ADDED'] as any } },
        include: {
          courseOffering: { include: { course: { select: { creditHours: true } } } },
          grade: true,
        },
      },
    },
  });
  if (!student) throw new Error('Student not found');

  const completedCredits = student.enrollments
    .filter(e => e.grade?.gradePoints !== null && e.grade?.gradePoints !== undefined && (e.grade?.gradePoints ?? 0) >= 1.0)
    .reduce((sum, e) => sum + e.courseOffering.course.creditHours, 0);

  const requiredCredits = student.program.totalCredits;
  const requiredGpa = student.program.requirements.length > 0
    ? Math.max(...student.program.requirements.map(r => r.minimumGPA))
    : 2.0;
  const isEligible = completedCredits >= requiredCredits && student.gpa >= requiredGpa;

  const existing = await prisma.graduationAudit.findUnique({ where: { studentRecordId } });

  const auditData = {
    completedCredits,
    requiredCredits,
    currentGpa: student.gpa,
    requiredGpa,
    isEligible,
    status: isEligible ? GraduationStatus.ELIGIBLE : GraduationStatus.PENDING,
  };

  const audit = existing
    ? await prisma.graduationAudit.update({ where: { studentRecordId }, data: auditData })
    : await prisma.graduationAudit.create({ data: { studentRecordId, ...auditData } });

  return audit;
}

export async function reviewGraduation(id: string, action: 'approve' | 'reject', registrarUserId: string, notes?: string) {
  const audit = await prisma.graduationAudit.findUnique({
    where: { id },
    include: { studentRecord: { include: { user: { select: { fullName: true } } } } },
  });
  if (!audit) throw new Error('Graduation audit not found');

  const newStatus = action === 'approve' ? GraduationStatus.APPROVED : GraduationStatus.REJECTED;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.graduationAudit.update({
      where: { id },
      data: {
        status: newStatus,
        auditNotes: notes?.trim() ?? null,
        reviewedBy: registrarUserId,
        reviewedAt: new Date(),
        graduatedAt: action === 'approve' ? new Date() : null,
      },
    });

    if (action === 'approve') {
      await tx.studentRecord.update({
        where: { id: audit.studentRecordId },
        data: { status: 'GRADUATED' },
      });
    }

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId,
        action: action === 'approve' ? 'GRADUATION_APPROVED' : 'GRADUATION_REJECTED',
        entityType: 'GraduationAudit',
        entityId: id,
        description: `Graduation ${action}d for ${audit.studentRecord.user.fullName}${notes ? ` — ${notes}` : ''}`,
      },
    });

    if (action === 'approve') {
      // createNotification handles DB + socket push outside tx
      createNotification({
        userId:     audit.studentRecord.userId,
        title:      'Graduation Approved',
        message:    'Congratulations! Your graduation has been approved by the Registrar.',
        type:       'SUCCESS',
        entityType: 'GraduationAudit',
        entityId:   id,
        actionTab:  'degree_audit',
      }).catch(() => {});
    }

    return updated;
  });
}
