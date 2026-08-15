import { prisma } from '../../lib/prisma';
import { TranscriptRequestStatus } from '@prisma/client';

export async function listTranscriptRequests(q: {
  page: number; limit: number; search?: string; status?: string;
}) {
  const skip = (q.page - 1) * q.limit;
  const where: any = {};
  if (q.status) where.status = q.status;
  if (q.search) {
    where.OR = [
      { studentRecord: { user: { fullName: { contains: q.search, mode: 'insensitive' } } } },
      { studentRecord: { studentId: { contains: q.search, mode: 'insensitive' } } },
    ];
  }
  const [total, requests] = await Promise.all([
    prisma.transcriptRequest.count({ where }),
    prisma.transcriptRequest.findMany({
      where, skip, take: q.limit, orderBy: { requestedAt: 'desc' },
      include: {
        studentRecord: {
          include: {
            user: { select: { fullName: true, email: true } },
            program: { select: { name: true, code: true } },
            department: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  return { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit), requests };
}

export async function getTranscriptData(studentRecordId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: { select: { fullName: true, email: true, phone: true } },
      program: { select: { name: true, code: true, durationYears: true } },
      department: { select: { name: true, code: true } },
      enrollments: {
        where: { status: { in: ['COMPLETED', 'ACTIVE', 'FORCE_ADDED'] as any } },
        include: {
          courseOffering: {
            include: {
              course: { select: { code: true, name: true, creditHours: true } },
              semester: { include: { academicYear: { select: { name: true } } } },
            },
          },
          grade: true,
        },
        orderBy: { enrolledAt: 'asc' },
      },
    },
  });
  if (!student) return null;

  // Group by semester
  const semesterMap: Record<string, { semesterName: string; academicYear: string; courses: any[] }> = {};
  for (const enroll of student.enrollments) {
    const sem = enroll.courseOffering.semester;
    const key = `${sem.academicYear.name} — ${sem.name}`;
    if (!semesterMap[key]) semesterMap[key] = { semesterName: sem.name, academicYear: sem.academicYear.name, courses: [] };
    semesterMap[key].courses.push({
      code: enroll.courseOffering.course.code,
      name: enroll.courseOffering.course.name,
      creditHours: enroll.courseOffering.course.creditHours,
      grade: enroll.grade?.letterGrade ?? 'IP',
      gradePoints: enroll.grade?.gradePoints ?? null,
      status: enroll.status,
    });
  }

  return {
    student: {
      studentId: student.studentId,
      fullName: student.user.fullName,
      email: student.user.email,
      phone: student.user.phone,
      program: student.program.name,
      department: student.department.name,
      yearLevel: student.yearLevel,
      gpa: student.gpa,
      totalCredits: student.totalCredits,
      status: student.status,
      admittedAt: student.admittedAt,
    },
    semesters: Object.values(semesterMap),
  };
}

export async function createTranscriptRequest(studentRecordId: string, purpose: string) {
  const student = await prisma.studentRecord.findUnique({ where: { id: studentRecordId } });
  if (!student) throw new Error('Student record not found');

  return prisma.transcriptRequest.create({
    data: { studentRecordId, status: TranscriptRequestStatus.PENDING, purpose: purpose?.trim() || null },
  });
}

export async function processTranscriptRequest(id: string, action: 'approve' | 'reject' | 'issue', registrarUserId: string, reason?: string) {
  const req = await prisma.transcriptRequest.findUnique({
    where: { id },
    include: { studentRecord: { include: { user: { select: { fullName: true } } } } },
  });
  if (!req) throw new Error('Transcript request not found');

  let newStatus: TranscriptRequestStatus;
  let auditAction: any;

  if (action === 'approve') {
    newStatus = TranscriptRequestStatus.PROCESSING;
    auditAction = 'TRANSCRIPT_REQUEST_APPROVED';
  } else if (action === 'reject') {
    if (!reason?.trim()) throw new Error('Rejection reason is required');
    newStatus = TranscriptRequestStatus.REJECTED;
    auditAction = 'TRANSCRIPT_REQUEST_REJECTED';
  } else {
    newStatus = TranscriptRequestStatus.ISSUED;
    auditAction = 'TRANSCRIPT_GENERATED';
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.transcriptRequest.update({
      where: { id },
      data: {
        status: newStatus,
        processedBy: registrarUserId,
        processedAt: new Date(),
        rejectionReason: action === 'reject' ? reason!.trim() : null,
        issuedAt: action === 'issue' ? new Date() : null,
      },
    });

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId,
        action: auditAction,
        entityType: 'TranscriptRequest',
        entityId: id,
        description: `Transcript request ${action}d for ${req.studentRecord.user.fullName}${reason ? ` — ${reason}` : ''}`,
      },
    });

    return updated;
  });
}
