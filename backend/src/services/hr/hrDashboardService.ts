import { prisma } from '../../lib/prisma';

export async function getHRDashboard() {
  const [
    totalEmployees,
    activeEmployees,
    onLeave,
    terminated,
    pendingLeave,
    expiringContracts,
    reviewsDue,
    newHiresThisMonth,
    currentPayroll,
    deptCounts,
    typeCounts,
    statusCounts,
    recentAudit,
  ] = await Promise.all([
    prisma.hREmployee.count(),
    prisma.hREmployee.count({ where: { status: 'ACTIVE' } }),
    prisma.hREmployee.count({ where: { status: 'ON_LEAVE' } }),
    prisma.hREmployee.count({ where: { status: 'TERMINATED' } }),
    prisma.hRLeaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.hREmployee.count({ where: { contractStatus: 'EXPIRING_SOON', isActive: true } }),
    prisma.hRPerformanceReview.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } } }),
    prisma.hREmployee.count({
      where: {
        hireDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.hRPayrollRecord.findFirst({ orderBy: [{ year: 'desc' }, { createdAt: 'desc' }] }),
    prisma.hRDepartment.findMany({
      select: {
        id: true, name: true, budget: true,
        _count: { select: { employees: { where: { status: 'ACTIVE' } } } },
      },
    }),
    prisma.hREmployee.groupBy({ by: ['employmentType'], _count: { id: true } }),
    prisma.hREmployee.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.hRAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  // pending leave details
  const pendingLeaveRequests = await prisma.hRLeaveRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { submittedAt: 'desc' },
    take: 4,
    include: {
      employee: { select: { fullName: true, employeeCode: true, avatarUrl: true, position: true } },
    },
  });

  const expiringContractList = await prisma.hREmployee.findMany({
    where: { contractStatus: 'EXPIRING_SOON', isActive: true },
    select: { id: true, fullName: true, avatarUrl: true, contractEndDate: true, position: true },
  });

  return {
    kpis: {
      totalEmployees,
      activeEmployees,
      onLeave,
      terminated,
      pendingLeaveRequests: pendingLeave,
      expiringContracts,
      reviewsDue,
      newHiresThisMonth,
    },
    currentPayroll: currentPayroll
      ? {
          id: currentPayroll.id,
          month: currentPayroll.month,
          year: currentPayroll.year,
          stage: currentPayroll.stage,
          totalGross: currentPayroll.totalGross,
          totalNet: currentPayroll.totalNet,
          employeeCount: currentPayroll.employeeCount,
        }
      : null,
    departmentBreakdown: deptCounts.map(d => ({
      id: d.id,
      name: d.name,
      budget: d.budget,
      employeeCount: d._count.employees,
    })),
    employmentTypeBreakdown: typeCounts.map(t => ({
      type: t.employmentType,
      count: t._count.id,
    })),
    statusBreakdown: statusCounts.map(s => ({
      status: s.status,
      count: s._count.id,
    })),
    pendingLeaveRequests,
    expiringContractList,
    recentAudit,
  };
}
