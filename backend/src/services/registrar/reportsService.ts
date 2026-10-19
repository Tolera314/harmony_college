import { prisma } from '../../lib/prisma';

export async function getEnrollmentReport(filters: {
  academicYearId?: string; semesterId?: string; departmentId?: string; programId?: string;
  programType?: 'TVET' | 'SHORT_PROGRAM';
}) {
  const offeringWhere: any = {};
  if (filters.semesterId) offeringWhere.semesterId = filters.semesterId;
  if (filters.semesterId && filters.academicYearId) {
    offeringWhere.semester = { academicYearId: filters.academicYearId };
  }
  if (filters.programType) offeringWhere.programType = filters.programType;
  const studentWhere: any = { status: 'ACTIVE', ...(filters.programType ? { programType: filters.programType } : {}) };

  const [
    totalEnrollments, activeStudents, byProgram, byDepartment,
    bySemester, topCourses, capacityStats,
  ] = await Promise.all([
    prisma.enrollment.count({ where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] as any }, ...(filters.programType ? { studentRecord: { programType: filters.programType } } : {}) } }),
    prisma.studentRecord.count({ where: studentWhere }),

    prisma.studentRecord.groupBy({
      by: ['programId'],
      _count: { id: true },
      where: { ...studentWhere, ...(filters.programId ? { programId: filters.programId } : {}) },
    }).then(async (rows) => {
      const programs = await prisma.program.findMany({ select: { id: true, name: true, code: true } });
      return rows.map(r => ({
        program: programs.find(p => p.id === r.programId)?.name ?? r.programId,
        count: r._count.id,
      })).sort((a, b) => b.count - a.count);
    }),

    prisma.studentRecord.groupBy({
      by: ['departmentId'],
      _count: { id: true },
      where: { ...studentWhere, ...(filters.departmentId ? { departmentId: filters.departmentId } : {}) },
    }).then(async (rows) => {
      const depts = await prisma.department.findMany({ select: { id: true, name: true } });
      return rows.map(r => ({
        department: depts.find(d => d.id === r.departmentId)?.name ?? r.departmentId,
        count: r._count.id,
      })).sort((a, b) => b.count - a.count);
    }),

    prisma.semester.findMany({
      where: filters.programType ? { programType: filters.programType } : undefined,
      take: 6, orderBy: [{ academicYear: { startDate: 'desc' } }, { startDate: 'desc' }],
      include: {
        academicYear: { select: { name: true } },
        _count: { select: { offerings: true } },
      },
    }).then(sems => sems.map(s => ({
      label: `${s.academicYear.name} — ${s.name}`,
      offerings: s._count.offerings,
    }))),

    prisma.courseOffering.findMany({
      where: filters.programType ? { programType: filters.programType } : undefined,
      take: 10,
      include: {
        course: { select: { code: true, name: true } },
        _count: { select: { enrollments: { where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] as any } } } } },
      },
      orderBy: { enrollments: { _count: 'desc' } },
    }).then(offs => offs.map(o => ({
      code: o.course.code, name: o.course.name, enrolled: o._count.enrollments, capacity: o.capacity,
      utilization: o.capacity > 0 ? Math.round((o._count.enrollments / o.capacity) * 100) : 0,
    }))),

    prisma.courseOffering.aggregate({
      where: filters.programType ? { programType: filters.programType } : undefined,
      _sum: { capacity: true },
      _count: { id: true },
    }).then(async agg => {
      const enrolled = await prisma.enrollment.count({ where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] as any }, ...(filters.programType ? { courseOffering: { programType: filters.programType } } : {}) } });
      return {
        totalCapacity: agg._sum.capacity ?? 0,
        totalEnrolled: enrolled,
        totalOfferings: agg._count.id,
        utilizationRate: agg._sum.capacity ? Math.round((enrolled / agg._sum.capacity) * 100) : 0,
      };
    }),
  ]);

  return {
    summary: { totalEnrollments, activeStudents, ...capacityStats },
    byProgram,
    byDepartment,
    bySemester,
    topCourses,
  };
}

export async function getAdmissionsReport(programType?: 'TVET' | 'SHORT_PROGRAM') {
  const appWhere: any = programType ? { programType: programType === 'SHORT_PROGRAM' ? 'Short Program' : 'TVET' } : {};
  const [total, byStatus, byProgram, monthlyTrend] = await Promise.all([
    prisma.application.count({ where: appWhere }),

    prisma.application.groupBy({
      by: ['status'],
      where: appWhere,
      _count: { id: true },
    }).then(rows => rows.map(r => ({ status: r.status, count: r._count.id }))),

    prisma.application.groupBy({
      by: ['program'],
      where: appWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }).then(rows => rows.map(r => ({ program: r.program, count: r._count.id }))),

    // Last 6 months
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT TO_CHAR("submittedAt", 'YYYY-MM') as month, COUNT(*) as count
      FROM "Application"
      WHERE "submittedAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY month ASC
    `.then(rows => rows.map(r => ({ month: r.month, count: Number(r.count) }))),
  ]);

  return { total, byStatus, byProgram, monthlyTrend };
}

export async function getGraduationReport(programType?: 'TVET' | 'SHORT_PROGRAM') {
  const gradWhere: any = programType ? { studentRecord: { programType } } : {};
  const [total, byStatus, graduatedThisYear] = await Promise.all([
    prisma.graduationAudit.count({ where: gradWhere }),
    prisma.graduationAudit.groupBy({
      by: ['status'], _count: { id: true },
      where: gradWhere,
    }).then(rows => rows.map(r => ({ status: r.status, count: r._count.id }))),
    prisma.graduationAudit.count({
      where: {
        status: 'APPROVED',
        graduatedAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
        ...(programType ? { studentRecord: { programType } } : {}),
      },
    }),
  ]);
  return { total, byStatus, graduatedThisYear };
}

export async function getCourseUtilizationReport(semesterId?: string, programType?: 'TVET' | 'SHORT_PROGRAM') {
  const where: any = { status: { in: ['SCHEDULED', 'ACTIVE'] as any } };
  if (semesterId) where.semesterId = semesterId;
  if (programType) where.programType = programType;

  const offerings = await prisma.courseOffering.findMany({
    where,
    include: {
      course: { select: { code: true, name: true } },
      semester: { include: { academicYear: { select: { name: true } } } },
      _count: { select: { enrollments: { where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] as any } } } } },
    },
    orderBy: { course: { code: 'asc' } },
  });

  return offerings.map(o => ({
    code: o.course.code,
    name: o.course.name,
    semester: `${o.semester.academicYear.name} — ${o.semester.name}`,
    capacity: o.capacity,
    enrolled: o._count.enrollments,
    available: o.capacity - o._count.enrollments,
    utilization: o.capacity > 0 ? Math.round((o._count.enrollments / o.capacity) * 100) : 0,
    status: o.status,
  }));
}
