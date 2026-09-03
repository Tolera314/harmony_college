import { prisma } from '../../lib/prisma';
import { CourseStatus } from '@prisma/client';

export interface CourseListQuery {
  page: number; limit: number;
  search?: string; departmentId?: string;
  status?: CourseStatus;
}

export async function listCourses(q: CourseListQuery) {
  const { page, limit, search, departmentId, status } = q;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where, skip, take: limit,
      orderBy: { code: 'asc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        prerequisites: {
          include: { prerequisite: { select: { id: true, code: true, name: true } } },
        },
        _count: { select: { offerings: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), courses };
}

export async function getCourseById(id: string) {
  return prisma.course.findUnique({
    where: { id },
    include: {
      department: true,
      prerequisites: { include: { prerequisite: { select: { id: true, code: true, name: true } } } },
      requiredBy: { include: { course: { select: { id: true, code: true, name: true } } } },
      offerings: {
        include: {
          semester: { include: { academicYear: true } },
          instructor: { include: { user: { select: { fullName: true } } } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });
}

export async function createCourse(data: {
  code: string; name: string; description?: string;
  creditHours: number; departmentId: string; prerequisiteIds?: string[];
}, registrarUserId: string) {
  const code = data.code.trim().toUpperCase();
  const existing = await prisma.course.findFirst({ where: { code, programType: 'TVET' } });
  if (existing) throw new Error(`Course code ${code} already exists`);

  const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!dept) throw new Error('Department not found');

  const course = await prisma.$transaction(async (tx) => {
    const c = await tx.course.create({
      data: {
        code, name: data.name.trim(), description: data.description?.trim(),
        creditHours: data.creditHours, departmentId: data.departmentId,
        status: CourseStatus.ACTIVE,
      },
    });

    if (data.prerequisiteIds?.length) {
      await tx.coursePrerequisite.createMany({
        data: data.prerequisiteIds.map(pid => ({ courseId: c.id, prerequisiteId: pid })),
        skipDuplicates: true,
      });
    }

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'COURSE_CREATED',
        entityType: 'Course', entityId: c.id,
        description: `Course ${c.code} — ${c.name} created`,
      },
    });

    return c;
  });

  return course;
}

export async function updateCourse(id: string, data: {
  name?: string; description?: string; creditHours?: number;
  departmentId?: string; prerequisiteIds?: string[];
}, registrarUserId: string) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new Error('Course not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.course.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.creditHours && { creditHours: data.creditHours }),
        ...(data.departmentId && { departmentId: data.departmentId }),
      },
    });

    if (data.prerequisiteIds !== undefined) {
      await tx.coursePrerequisite.deleteMany({ where: { courseId: id } });
      if (data.prerequisiteIds.length) {
        await tx.coursePrerequisite.createMany({
          data: data.prerequisiteIds.map(pid => ({ courseId: id, prerequisiteId: pid })),
          skipDuplicates: true,
        });
      }
    }

    await tx.registrarAuditLog.create({
      data: {
        userId: registrarUserId, action: 'COURSE_UPDATED',
        entityType: 'Course', entityId: id,
        description: `Course ${course.code} updated`,
      },
    });

    return updated;
  });
}

export async function setCourseStatus(id: string, status: CourseStatus, registrarUserId: string) {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new Error('Course not found');

  const updated = await prisma.course.update({ where: { id }, data: { status } });

  await prisma.registrarAuditLog.create({
    data: {
      userId: registrarUserId,
      action: status === CourseStatus.ACTIVE ? 'COURSE_REACTIVATED' : 'COURSE_DEACTIVATED',
      entityType: 'Course', entityId: id,
      description: `Course ${course.code} status set to ${status}`,
    },
  });

  return updated;
}

export async function listDepartments() {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  });
}

export async function listPrograms(departmentId?: string) {
  return prisma.program.findMany({
    where: { isActive: true, ...(departmentId ? { departmentId } : {}) },
    orderBy: { name: 'asc' },
    include: { department: { select: { id: true, name: true, code: true } } },
  });
}
