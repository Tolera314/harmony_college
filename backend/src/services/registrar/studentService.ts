import { prisma } from '../../lib/prisma';
import { StudentStatus } from '@prisma/client';

export interface StudentListQuery {
  page: number;
  limit: number;
  search?: string;
  programId?: string;
  departmentId?: string;
  status?: StudentStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listStudents(q: StudentListQuery) {
  const { page, limit, search, programId, departmentId, status, sortBy = 'createdAt', sortOrder = 'desc' } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (programId) where.programId = programId;
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: 'insensitive' } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const orderBy: any = sortBy === 'name'
    ? { user: { fullName: sortOrder } }
    : sortBy === 'studentId'
    ? { studentId: sortOrder }
    : sortBy === 'gpa'
    ? { gpa: sortOrder }
    : { createdAt: sortOrder };

  const [total, students] = await Promise.all([
    prisma.studentRecord.count({ where }),
    prisma.studentRecord.findMany({
      where, skip, take: limit, orderBy,
      select: {
        id: true, studentId: true, status: true, yearLevel: true, gpa: true, totalCredits: true, admittedAt: true,
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        program: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { enrollments: { where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] as any } } } } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), students };
}

export async function getStudentById(id: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } },
      program: { select: { id: true, name: true, code: true, durationYears: true, totalCredits: true } },
      department: { select: { id: true, name: true, code: true } },
      enrollments: {
        include: {
          courseOffering: {
            include: {
              course: { select: { code: true, name: true, creditHours: true } },
              semester: { include: { academicYear: true } },
              instructor: { include: { user: { select: { fullName: true } } } },
            },
          },
          grade: true,
        },
        orderBy: { enrolledAt: 'desc' },
      },
      transcriptRequests: { orderBy: { requestedAt: 'desc' }, take: 5 },
      graduationAudit: true,
    },
  });
  if (!student) return null;
  return student;
}

export async function updateStudentStatus(id: string, status: StudentStatus, registrarUserId: string) {
  const student = await prisma.studentRecord.update({
    where: { id },
    data: { status },
    include: { user: { select: { fullName: true } } },
  });

  // Also update user account status
  if (status === StudentStatus.SUSPENDED) {
    await prisma.user.update({ where: { id: student.userId }, data: { status: 'SUSPENDED' } });
  } else if (status === StudentStatus.ACTIVE) {
    await prisma.user.update({ where: { id: student.userId }, data: { status: 'ACTIVE' } });
  }

  await prisma.registrarAuditLog.create({
    data: {
      userId: registrarUserId,
      action: status === StudentStatus.SUSPENDED ? 'STUDENT_SUSPENDED' : 'STUDENT_REACTIVATED',
      entityType: 'StudentRecord',
      entityId: id,
      description: `Student ${student.user.fullName} status changed to ${status}`,
    },
  });

  return student;
}
