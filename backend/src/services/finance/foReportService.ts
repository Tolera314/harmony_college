import { prisma } from '../../lib/prisma';

export async function getFinancialSummaryReport(period?: string) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [accounts, transactions] = await Promise.all([
    prisma.financialAccount.findMany({
      select: {
        balance: true,
        studentRecord: {
          select: {
            department: { select: { name: true, code: true } },
            program:    { select: { name: true } },
          },
        },
      },
    }),
    prisma.financialTransaction.findMany({
      where:   { transactionDate: { gte: yearStart }, status: 'POSTED' },
      orderBy: { transactionDate: 'desc' },
    }),
  ]);

  let totalOutstanding  = 0;
  let totalRevenue      = 0;
  let totalCollections  = 0;

  const deptMap:   Record<string, { revenue: number; outstanding: number; code: string }> = {};
  const monthMap:  Record<string, { revenue: number; target: number; collections: number }> = {};
  const methodMap: Record<string, { amount: number; count: number }> = {};

  accounts.forEach((acc) => {
    const dept = acc.studentRecord.department?.name ?? 'General';
    const code = acc.studentRecord.department?.code ?? 'GEN';
    if (!deptMap[dept]) deptMap[dept] = { revenue: 0, outstanding: 0, code };
    if (acc.balance > 0) { totalOutstanding += acc.balance; deptMap[dept].outstanding += acc.balance; }
  });

  transactions.forEach((tx) => {
    const abs      = Math.abs(tx.amount);
    const monthKey = new Date(tx.transactionDate).toLocaleString('en-US', { month: 'short' });
    if (!monthMap[monthKey]) monthMap[monthKey] = { revenue: 0, target: 0, collections: 0 };

    if (tx.type === 'TUITION' || tx.type === 'FEE') {
      totalRevenue += abs;
      monthMap[monthKey].revenue += abs;
    }
    if (tx.type === 'PAYMENT') {
      totalCollections += abs;
      monthMap[monthKey].collections += abs;
    }

    const desc   = (tx.description ?? '').toLowerCase();
    const cat    = (tx.category    ?? '').toLowerCase();
    let method   = 'Bank Transfer';
    if (desc.includes('cash')     || cat.includes('cash'))     method = 'Cash';
    else if (desc.includes('telebirr') || cat.includes('telebirr')) method = 'Telebirr';
    else if (desc.includes('chapa')    || cat.includes('chapa'))    method = 'Chapa';
    if (!methodMap[method]) methodMap[method] = { amount: 0, count: 0 };
    methodMap[method].amount += abs;
    methodMap[method].count  += 1;
  });

  // Fill targets at 110% of revenue
  Object.keys(monthMap).forEach((m) => {
    monthMap[m].target = Math.round(monthMap[m].revenue * 1.1);
  });

  const monthsOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyRevenue = monthsOrder
    .filter((m) => monthMap[m])
    .map((m) => ({ month: m, ...monthMap[m] }));

  const methodColors: Record<string, string> = {
    Cash: '#10B981', 'Bank Transfer': '#3B82F6', Telebirr: '#F59E0B', Chapa: '#8B5CF6',
  };
  const methodBreakdown = Object.entries(methodMap).map(([method, val]) => ({
    method, amount: val.amount, count: val.count, color: methodColors[method] ?? '#6B7280',
  }));

  const departments = Object.entries(deptMap).map(([name, data]) => ({
    name, code: data.code,
    totalRevenue: data.revenue, outstandingBalance: data.outstanding,
    studentCount: accounts.filter(
      (a) => (a.studentRecord.department?.name ?? 'General') === name
    ).length,
  }));

  const totalBilled = totalRevenue + totalOutstanding;
  const collectionRate = totalBilled > 0
    ? +((totalCollections / totalBilled) * 100).toFixed(1)
    : 0;

  return {
    period: period || `${now.getFullYear()} YTD`,
    totalAccounts:         accounts.length,
    totalTransactions:     transactions.length,
    totalOutstanding,
    totalBilledRevenue:    totalRevenue,
    totalCollectedRevenue: totalCollections,
    collectionRate,
    monthlyRevenue,
    departments,
    methodBreakdown,
    kpis: {
      totalRevenueSemester:  totalRevenue,
      totalOutstanding,
      receiptsIssued:        transactions.filter((t) => t.receiptId).length,
      todaysCollections:     transactions
        .filter((t) => {
          const d = new Date(t.transactionDate);
          return d.toDateString() === now.toDateString() && t.type === 'PAYMENT';
        })
        .reduce((s, t) => s + Math.abs(t.amount), 0),
      averageDailyRevenue:   totalCollections / Math.max(1, monthlyRevenue.length * 30),
      overdueAccounts:       accounts.filter((a) => a.balance > 15000).length,
    },
  };
}

export async function getAgedReceivablesReport() {
  const accounts = await prisma.financialAccount.findMany({
    where: { balance: { gt: 0 } },
    include: {
      studentRecord: {
        include: {
          user:       { select: { fullName: true, email: true } },
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { balance: 'desc' },
  });

  // Bucket by balance thresholds (no created-date on FinancialAccount to age by)
  const buckets = { current: 0, days30To60: 0, days60To90: 0, over90Days: 0 };
  accounts.forEach((acc) => {
    if      (acc.balance > 20000) buckets.over90Days  += acc.balance;
    else if (acc.balance > 10000) buckets.days60To90  += acc.balance;
    else if (acc.balance >  3000) buckets.days30To60  += acc.balance;
    else                           buckets.current     += acc.balance;
  });

  return {
    totalAccountsWithOutstanding: accounts.length,
    buckets,
    accounts: accounts.slice(0, 50).map((acc) => ({
      studentRecordId: acc.studentRecordId,
      studentName:     acc.studentRecord.user.fullName,
      studentId:       acc.studentRecord.studentId,
      department:      acc.studentRecord.department?.name ?? 'General',
      balance:         acc.balance,
      lastUpdatedAt:   acc.lastUpdatedAt,
    })),
  };
}
