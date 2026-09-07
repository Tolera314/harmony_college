import { prisma } from '../../lib/prisma';

export async function getFinancialSummaryReport(period?: string) {
  const [totalAccounts, transactions, studentAccounts] = await Promise.all([
    prisma.financialAccount.count(),
    prisma.financialTransaction.findMany({
      where: { status: 'POSTED' },
      select: {
        amount: true,
        type: true,
        category: true,
        description: true,
        transactionDate: true,
        financialAccount: {
          select: {
            studentRecord: {
              select: {
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.financialAccount.findMany({
      select: {
        balance: true,
        studentRecord: {
          select: {
            department: { select: { name: true } },
            program: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  let totalOutstanding = 0;
  const departmentData: Record<string, { revenue: number; outstanding: number }> = {};

  studentAccounts.forEach((acc) => {
    const deptName = acc.studentRecord.department?.name || 'General';
    if (!departmentData[deptName]) {
      departmentData[deptName] = { revenue: 0, outstanding: 0 };
    }
    if (acc.balance > 0) {
      totalOutstanding += acc.balance;
      departmentData[deptName].outstanding += acc.balance;
    }
  });

  let totalBilledRevenue = 0;
  let totalCollectedRevenue = 0;

  transactions.forEach((tx) => {
    const deptName = tx.financialAccount?.studentRecord?.department?.name || 'General';
    if (!departmentData[deptName]) {
      departmentData[deptName] = { revenue: 0, outstanding: 0 };
    }

    if (tx.amount > 0) {
      totalBilledRevenue += tx.amount;
      departmentData[deptName].revenue += tx.amount;
    } else if (tx.type === 'PAYMENT' || tx.amount < 0) {
      totalCollectedRevenue += Math.abs(tx.amount);
    }
  });

  return {
    period: period || 'Fall 2026',
    totalAccounts,
    totalTransactions: transactions.length,
    totalOutstanding,
    totalBilledRevenue,
    totalCollectedRevenue,
    departmentBreakdown: Object.entries(departmentData).map(([department, data]) => ({
      department,
      revenue: data.revenue,
      outstanding: data.outstanding,
    })),
  };
}

export async function getAgedReceivablesReport() {
  const accounts = await prisma.financialAccount.findMany({
    where: { balance: { gt: 0 } },
    include: {
      studentRecord: {
        include: {
          user: { select: { fullName: true, email: true } },
          department: { select: { name: true } },
        },
      },
      transactions: {
        where: { status: 'POSTED', amount: { gt: 0 } },
        orderBy: { transactionDate: 'asc' },
        select: { transactionDate: true },
      },
    },
  });

  const now = Date.now();
  const buckets = {
    current: 0,   // 0-30 days
    days30To60: 0,
    days60To90: 0,
    over90Days: 0,
  };

  const processedAccounts = accounts.map((acc) => {
    // Find oldest unpaid charge
    const oldestChargeDate = acc.transactions[0]?.transactionDate || acc.createdAt || acc.lastUpdatedAt;
    const daysOverdue = Math.max(0, Math.floor((now - new Date(oldestChargeDate).getTime()) / (1000 * 60 * 60 * 24)));

    if (daysOverdue <= 30) buckets.current += acc.balance;
    else if (daysOverdue <= 60) buckets.days30To60 += acc.balance;
    else if (daysOverdue <= 90) buckets.days60To90 += acc.balance;
    else buckets.over90Days += acc.balance;

    return {
      studentRecordId: acc.studentRecordId,
      studentName: acc.studentRecord.user.fullName,
      studentId: acc.studentRecord.studentId,
      department: acc.studentRecord.department?.name || 'General',
      balance: acc.balance,
      daysOverdue,
      lastUpdatedAt: acc.lastUpdatedAt,
    };
  });

  return {
    totalAccountsWithOutstanding: accounts.length,
    buckets,
    accounts: processedAccounts.slice(0, 50),
  };
}


