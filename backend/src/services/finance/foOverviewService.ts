import { prisma } from '../../lib/prisma';

export interface FOOverviewKPIs {
  totalRevenue: number;
  totalCollections: number;
  totalOutstanding: number;
  collectionRate: number;
  transactionCount: number;
  pendingReconciliationCount: number;
  pendingRegistrationCount: number;
}

export async function getOverviewData() {
  const [
    studentAccounts,
    transactions,
    pendingRegistrationCount,
  ] = await Promise.all([
    prisma.financialAccount.findMany({
      select: {
        balance: true,
        studentRecord: {
          select: {
            department: { select: { name: true } },
          },
        },
      },
    }),
    prisma.financialTransaction.findMany({
      orderBy: { transactionDate: 'desc' },
      take: 500,
    }),
    prisma.studentProfile.count({
      where: { registrationFeePaid: true, paymentVerifiedByFinance: false },
    }),
  ]);

  let totalOutstanding = 0;
  studentAccounts.forEach((acc) => {
    if (acc.balance > 0) totalOutstanding += acc.balance;
  });

  let totalRevenue = 0;
  let totalCollections = 0;
  let transactionCount = transactions.length;

  const monthMap: Record<string, { revenue: number; collections: number }> = {};
  const deptMap: Record<string, { revenue: number; outstanding: number }> = {};
  const methodMap: Record<string, { amount: number; count: number }> = {
    Cash: { amount: 0, count: 0 },
    'Bank Transfer': { amount: 0, count: 0 },
    Telebirr: { amount: 0, count: 0 },
    Chapa: { amount: 0, count: 0 },
  };

  studentAccounts.forEach((acc) => {
    const deptName = acc.studentRecord.department?.name || 'General';
    if (!deptMap[deptName]) {
      deptMap[deptName] = { revenue: 0, outstanding: 0 };
    }
    if (acc.balance > 0) {
      deptMap[deptName].outstanding += acc.balance;
    }
  });

  transactions.forEach((tx) => {
    if (tx.status === 'POSTED' || tx.status === 'Completed') {
      const dateObj = new Date(tx.transactionDate);
      const monthKey = dateObj.toLocaleString('en-US', { month: 'short' });
      if (!monthMap[monthKey]) monthMap[monthKey] = { revenue: 0, collections: 0 };

      if (tx.amount > 0) {
        totalRevenue += tx.amount;
        monthMap[monthKey].revenue += tx.amount;
      } else if (tx.type === 'PAYMENT' || tx.amount < 0) {
        const paidAmount = Math.abs(tx.amount);
        totalCollections += paidAmount;
        monthMap[monthKey].collections += paidAmount;

        // Payment method breakdown
        let method = 'Bank Transfer';
        const descLower = (tx.description || '').toLowerCase();
        const catLower = (tx.category || '').toLowerCase();
        if (descLower.includes('cash') || catLower.includes('cash')) method = 'Cash';
        else if (descLower.includes('telebirr') || catLower.includes('telebirr')) method = 'Telebirr';
        else if (descLower.includes('chapa') || catLower.includes('chapa')) method = 'Chapa';

        if (!methodMap[method]) {
          methodMap[method] = { amount: 0, count: 0 };
        }
        methodMap[method].amount += paidAmount;
        methodMap[method].count += 1;
      }
    }
  });

  const totalBilled = totalRevenue + totalOutstanding;
  const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((totalCollections / totalBilled) * 100)) : 0;

  // Formatted monthly revenue trend
  const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenue = monthsOrder
    .filter((m) => monthMap[m] !== undefined)
    .map((m) => ({
      month: m,
      revenue: monthMap[m]?.revenue || 0,
      target: Math.round((monthMap[m]?.revenue || 0) * 1.15),
      collections: monthMap[m]?.collections || 0,
    }));

  const departmentRevenue = Object.entries(deptMap).map(([dept, data]) => ({
    department: dept,
    revenue: data.revenue,
    outstanding: data.outstanding,
  }));

  const methodColors: Record<string, string> = {
    Cash: '#10B981',
    'Bank Transfer': '#3B82F6',
    Telebirr: '#F59E0B',
    Chapa: '#8B5CF6',
  };

  const paymentMethodBreakdown = Object.entries(methodMap)
    .filter(([_, val]) => val.count > 0 || val.amount > 0)
    .map(([method, val]) => ({
      method,
      amount: val.amount,
      count: val.count,
      color: methodColors[method] || '#6B7280',
    }));

  const recentTransactions = transactions.slice(0, 10).map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    description: tx.description,
    category: tx.category,
    status: tx.status,
    transactionDate: tx.transactionDate,
    receiptId: tx.receiptId,
  }));

  return {
    kpis: {
      totalRevenue,
      totalCollections,
      totalOutstanding,
      collectionRate,
      transactionCount,
      pendingReconciliationCount: 0,
      pendingRegistrationCount,
    },
    monthlyRevenue,
    departmentRevenue,
    paymentMethodBreakdown,
    recentTransactions,
  };
}

