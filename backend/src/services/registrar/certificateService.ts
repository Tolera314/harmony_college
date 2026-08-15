import { prisma } from '../../lib/prisma';
import { CertificateStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

function generateCertNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `HC-CERT-${year}-${rand}`;
}

function generateVerificationCode(): string {
  return randomBytes(16).toString('hex').toUpperCase();
}

export async function listCertificates(q: {
  page: number; limit: number; search?: string; status?: string;
}) {
  const skip = (q.page - 1) * q.limit;
  const where: any = {};
  if (q.status) where.status = q.status;
  if (q.search) {
    where.OR = [
      { certificateNumber: { contains: q.search, mode: 'insensitive' } },
      { studentRecord: { user: { fullName: { contains: q.search, mode: 'insensitive' } } } },
      { studentRecord: { studentId: { contains: q.search, mode: 'insensitive' } } },
    ];
  }
  const [total, certs] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where, skip, take: q.limit, orderBy: { issuedAt: 'desc' },
      include: {
        studentRecord: {
          include: {
            user: { select: { fullName: true } },
            program: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  return { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit), certificates: certs };
}

export async function issueCertificate(studentRecordId: string, registrarUserId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: { select: { fullName: true } },
      program: { select: { name: true } },
    },
  });
  if (!student) throw new Error('Student record not found');

  const graduationAudit = await prisma.graduationAudit.findUnique({ where: { studentRecordId } });
  if (!graduationAudit || graduationAudit.status !== 'APPROVED') {
    throw new Error('Graduation must be approved before issuing a certificate');
  }

  const existing = await prisma.certificate.findUnique({ where: { studentRecordId } });
  if (existing && existing.status === CertificateStatus.ISSUED) {
    throw new Error('Certificate already issued for this student');
  }

  return prisma.$transaction(async (tx) => {
    const cert = await tx.certificate.upsert({
      where: { studentRecordId },
      update: {
        status: CertificateStatus.ISSUED,
        issuedAt: new Date(),
        issuedBy: registrarUserId,
        revokedAt: null, revokedBy: null, revocationReason: null,
      },
      create: {
        studentRecordId,
        status: CertificateStatus.ISSUED,
        certificateNumber: generateCertNumber(),
        verificationCode: generateVerificationCode(),
        issuedBy: registrarUserId,
      },
    });

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId,
        action: 'CERTIFICATE_ISSUED',
        entityType: 'Certificate',
        entityId: cert.id,
        description: `Certificate issued to ${student.user.fullName} (${student.program.name})`,
      },
    });

    await tx.notification.create({
      data: {
        userId: student.userId,
        title: 'Digital Certificate Issued',
        message: `Your academic certificate has been issued. Certificate #${cert.certificateNumber}`,
        type: 'SUCCESS',
        entityType: 'Certificate',
        entityId: cert.id,
      },
    });

    return cert;
  });
}

export async function revokeCertificate(id: string, reason: string, registrarUserId: string) {
  if (!reason?.trim()) throw new Error('Revocation reason is required');

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: { studentRecord: { include: { user: { select: { fullName: true } } } } },
  });
  if (!cert) throw new Error('Certificate not found');
  if (cert.status === CertificateStatus.REVOKED) throw new Error('Certificate is already revoked');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.certificate.update({
      where: { id },
      data: {
        status: CertificateStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: registrarUserId,
        revocationReason: reason.trim(),
      },
    });

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId,
        action: 'CERTIFICATE_REVOKED',
        entityType: 'Certificate',
        entityId: id,
        description: `Certificate revoked for ${cert.studentRecord.user.fullName} — ${reason}`,
      },
    });

    return updated;
  });
}

export async function verifyCertificate(verificationCode: string) {
  const cert = await prisma.certificate.findUnique({
    where: { verificationCode: verificationCode.toUpperCase() },
    include: {
      studentRecord: {
        include: {
          user: { select: { fullName: true } },
          program: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
    },
  });

  if (!cert) return { valid: false, message: 'Certificate not found' };

  return {
    valid: cert.status === CertificateStatus.ISSUED,
    status: cert.status,
    certificateNumber: cert.certificateNumber,
    holderName: cert.studentRecord.user.fullName,
    program: cert.studentRecord.program.name,
    department: cert.studentRecord.department.name,
    issuedAt: cert.issuedAt,
    revokedAt: cert.revokedAt ?? null,
    message: cert.status === 'REVOKED' ? `This certificate was revoked on ${cert.revokedAt?.toISOString()}` : 'Valid certificate',
  };
}
