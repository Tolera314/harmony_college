import { prisma } from '../../lib/prisma';

/** Returns an array of { year, month } for the last N months, oldest first */
function lastNMonths(n: number): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 }); // month 1-12
  }
  return result;
}

function monthStart(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}
function monthEnd(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export async function getHRDashboard() {
  const months = lastNMonths(6);

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
    prisma.hRPerformanceReview.count({
      where: { status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } },
    }),
    prisma.hREmployee.count({
      where: {
        hireDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.hRPayrollRecord.findFirst({
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    }),
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

  // ── Historical sparkline queries (6 months, one count per month) ────────────

  // Active employees snapshot at end of each month
  const activeSparkRaw = await Promise.all(
    months.map(({ year, month }) =>
      prisma.hREmployee.count({
        where: {
          status: 'ACTIVE',
          hireDate: { lte: monthEnd(year, month) },
        },
      })
    )
  );

  // Pending leave requests submitted in each month
  const leaveSparkRaw = await Promise.all(
    months.map(({ year, month }) =>
      prisma.hRLeaveRequest.count({
        where: {
          status: 'PENDING',
          submittedAt: {
            gte: monthStart(year, month),
            lte: monthEnd(year, month),
          },
        },
      })
    )
  );

  // Performance reviews due (created) in each month
  const reviewsSparkRaw = await Promise.all(
    months.map(({ year, month }) =>
      prisma.hRPerformanceReview.count({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
          createdAt: {
            gte: monthStart(year, month),
            lte: monthEnd(year, month),
          },
        },
      })
    )
  );

  // New hires per month
  const hiresSparkRaw = await Promise.all(
    months.map(({ year, month }) =>
      prisma.hREmployee.count({
        where: {
          hireDate: {
            gte: monthStart(year, month),
            lte: monthEnd(year, month),
          },
        },
      })
    )
  );

  // Expiring contracts discovered per month (by contractEndDate falling in following 30 days relative to month start)
  const contractsSparkRaw = await Promise.all(
    months.map(({ year, month }) =>
      prisma.hREmployee.count({
        where: {
          contractStatus: 'EXPIRING_SOON',
          contractEndDate: {
            gte: monthStart(year, month),
            lte: monthEnd(year, month),
          },
        },
      })
    )
  );

  // Payroll net totals per month (in ETB millions, for spark scale)
  const payrollSparkRaw = await Promise.all(
    months.map(({ year, month }) =>
      prisma.hRPayrollRecord.findFirst({
        where: {
          year,
          month: new Date(year, month - 1, 1).toLocaleString('en', { month: 'long' }),
        },
        select: { totalNet: true },
      })
    )
  );
  // Convert to millions with 1 decimal, fallback to 0
  const payrollSpark = payrollSparkRaw.map(r =>
    r?.totalNet ? Math.round((r.totalNet / 1_000_000) * 10) / 10 : 0
  );

  // ── Pending leave details ─────────────────────────────────────────────────
  const pendingLeaveRequests = await prisma.hRLeaveRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { submittedAt: 'desc' },
    take: 4,
    include: {
      employee: {
        select: { fullName: true, employeeCode: true, avatarUrl: true, position: true },
      },
    },
  });

  const expiringContractList = await prisma.hREmployee.findMany({
    where: { contractStatus: 'EXPIRING_SOON', isActive: true },
    select: {
      id: true, fullName: true, avatarUrl: true, contractEndDate: true, position: true,
    },
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
          id:            currentPayroll.id,
          month:         currentPayroll.month,
          year:          currentPayroll.year,
          stage:         currentPayroll.stage,
          totalGross:    currentPayroll.totalGross,
          totalNet:      currentPayroll.totalNet,
          employeeCount: currentPayroll.employeeCount,
        }
      : null,
    departmentBreakdown: deptCounts.map(d => ({
      id:            d.id,
      name:          d.name,
      budget:        d.budget,
      employeeCount: d._count.employees,
    })),
    employmentTypeBreakdown: typeCounts.map(t => ({
      type:  t.employmentType,
      count: t._count.id,
    })),
    statusBreakdown: statusCounts.map(s => ({
      status: s.status,
      count:  s._count.id,
    })),
    pendingLeaveRequests,
    expiringContractList,
    recentAudit,
    // ── Sparklines (real 6-month historical data) ──────────────────────────
    sparklines: {
      activeEmployees: activeSparkRaw,
      pendingLeave:    leaveSparkRaw,
      reviewsDue:      reviewsSparkRaw,
      newHires:        hiresSparkRaw,
      expiringContracts: contractsSparkRaw,
      payrollNet:      payrollSpark,
    },
  };
}
