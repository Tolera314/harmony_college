import { prisma } from '../../lib/prisma';
import { StudentStatus } from '@prisma/client';
import { calculateProfileCompletion, getMissingFields } from '../profileCompletion';
import { createNotification } from '../notificationService';

export interface StudentListQuery {
  page: number;
  limit: number;
  search?: string;
  programType?: 'TVET' | 'SHORT_PROGRAM';
  programId?: string;
  departmentId?: string;
  status?: StudentStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  profileIncomplete?: boolean; // Filter for incomplete profiles
}

export async function listStudents(q: StudentListQuery) {
  const { page, limit, search, programType, programId, departmentId, status, sortBy = 'createdAt', sortOrder = 'desc', profileIncomplete } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (programType) where.programType = programType;
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
        programType: true, shortProgramDuration: true,
        user: {
          select: {
            id: true, fullName: true, email: true, phone: true, profileCompleted: true,
            studentProfile: {
              select: {
                program: true,
                programType: true,
                shortProgramDuration: true,
                matricResult: true,
                ministryResult: true,
                transcriptUrl: true,
                profilePictureUrl: true,
                nationalId: true,
                nationality: true,
                dob: true,
                gender: true,
                city: true,
                academicYear: true,
                semester: true,
                emergencyName: true,
                emergencyPhone: true,
              },
            },
          },
        },
        program: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { enrollments: { where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] as any } } } } },
      },
    }),
  ]);

  // Calculate profile completion percentage for each student
  const studentsWithCompletion = students.map(s => ({
    ...s,
    profileCompletion: calculateProfileCompletion(s.user.studentProfile),
  }));

  // Filter by incomplete profiles if requested
  const filteredStudents = profileIncomplete
    ? studentsWithCompletion.filter(s => s.profileCompletion < 100)
    : studentsWithCompletion;

  const filteredTotal = profileIncomplete ? filteredStudents.length : total;

  return { 
    total: filteredTotal, 
    page, 
    limit, 
    totalPages: Math.ceil(filteredTotal / limit), 
    students: filteredStudents.slice(0, limit) // Re-paginate after filtering
  };
}

export async function getStudentById(id: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true, fullName: true, email: true, phone: true, createdAt: true,
          studentProfile: {
            select: {
              program: true,
              programType: true,
              shortProgramDuration: true,
              matricResult: true,
              ministryResult: true,
              transcriptUrl: true,
              profilePictureUrl: true,
              nationalId: true,
              dob: true,
              gender: true,
              nationality: true,
              city: true,
              emergencyName: true,
              emergencyPhone: true,
            },
          },
        },
      },
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

export async function sendProfileReminder(studentId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          studentProfile: {
            select: {
              program: true,
              programType: true,
              shortProgramDuration: true,
              matricResult: true,
              ministryResult: true,
              transcriptUrl: true,
              profilePictureUrl: true,
              nationalId: true,
              nationality: true,
              dob: true,
              gender: true,
              city: true,
              academicYear: true,
              semester: true,
              emergencyName: true,
              emergencyPhone: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  const profileCompletion = calculateProfileCompletion(student.user.studentProfile);
  
  if (profileCompletion === 100) {
    throw new Error('Student profile is already complete');
  }

  const missingFields = getMissingFields(student.user.studentProfile);
  const fieldLabels: Record<string, string> = {
    nationality: 'Nationality',
    dob: 'Date of Birth',
    gender: 'Gender',
    city: 'City',
    nationalId: 'National ID (16 digits)',
    academicYear: 'Academic Year',
    semester: 'Semester',
    matricResult: 'Matric Result',
    ministryResult: 'Ministry Result',
    profilePictureUrl: 'Profile Picture',
    transcriptUrl: 'Academic Transcript',
    emergencyName: 'Emergency Contact Name',
    emergencyPhone: 'Emergency Contact Phone',
  };

  const missingFieldsText = missingFields
    .map(field => fieldLabels[field] || field)
    .join(', ');

  await createNotification({
    userId: student.userId,
    title: 'Complete Your Profile',
    message: `Your profile is ${profileCompletion}% complete. Please complete the following required fields: ${missingFieldsText}`,
    type: 'REMINDER',
    module: 'ACADEMIC',
    actionTab: 'profile',
  });

  return { 
    success: true, 
    message: `Profile completion reminder sent to ${student.user.fullName}`,
    profileCompletion,
    missingFields: missingFieldsText,
  };
}
