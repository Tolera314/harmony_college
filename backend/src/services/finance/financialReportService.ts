/**
 * Financial Report Service — Harmony College
 * Consolidated financial reporting using central FinancialTransaction ledger
 * Implements Step 3: Central Finance Dashboard and Reports
 */
import { prisma } from '../../lib/prisma';
import { FinancialCategory, ProgramType } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DateFilterParams {
  startDate?: Date;
  endDate?: Date;
  programType?: ProgramType;
}

export interface DashboardSummary {
  // Student Collections
  totalStudentPayments: number;
  totalRegistrationFees: number;
  totalTVETTuition: number;
  totalShortProgramTuition: number;
  totalOtherStudentPayments: number;
  
  // Outflows
  totalStaffSalaries: number;
  totalOperationalExpenses: number;
  
  // Net Position
  netCashMovement: number;
  totalInflows: number;
  totalOutflows: number;
  
  // Outstanding
  outstandingStudentBalances: number;
  approvedUnpaidExpenses: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  inflows: number;
  outflows: number;
  net: number;
}

// ── Dashboard Summary ────────────────────────────────────────────────────────

/**
 * Get consolidated financial dashboard summary
 * Uses central FinancialTransaction ledger for accurate totals
 */
export async function getDashboardSummary(
  params: DateFilterParams
): Promise<DashboardSummary> {
  const { startDate, endDate, programType } = params;

  // Build base query filter
  const where: any = {
    status: 'POSTED',
  };

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) where.transactionDate.gte = startDate;
    if (endDate) where.transactionDate.lte = endDate;
  }

  // Get all financial transactions
  const transactions = await prisma.financialTransaction.findMany({
    where,
    select: {
      amount: true,
      financialCategory: true,
      programType: true,
      type: true,
    },
  });

  // Initialize totals
  let totalRegistrationFees = 0;
  let totalTVETTuition = 0;
  let totalShortProgramTuition = 0;
  let totalOtherStudentPayments = 0;
  let totalStaffSalaries = 0;
  let totalOperationalExpenses = 0;

  // Process transactions
  transactions.forEach((tx) => {
    const absAmount = Math.abs(tx.amount);

    // Apply program type filter if specified
    if (programType && tx.programType !== programType) {
      return;
    }

    switch (tx.financialCategory) {
      case 'REGISTRATION_FEE':
        totalRegistrationFees += absAmount;
        break;

      case 'STUDENT_TUITION':
        if (tx.programType === 'TVET') {
          totalTVETTuition += absAmount;
        } else if (tx.programType === 'SHORT_PROGRAM') {
          totalShortProgramTuition += absAmount;
        } else {
          // Fallback if programType is null
          totalOtherStudentPayments += absAmount;
        }
        break;

      case 'STUDENT_FEE':
        totalOtherStudentPayments += absAmount;
        break;

      case 'STAFF_SALARY':
        totalStaffSalaries += absAmount;
        break;

      case 'OPERATIONAL_EXPENSE':
        totalOperationalExpenses += absAmount;
        break;

      case 'OTHER':
        // Could be income or expense, check transaction type
        if (tx.type === 'PAYMENT') {
          totalOtherStudentPayments += absAmount;
        }
        break;
    }
  });

  // Calculate student payments total
  const totalStudentPayments =
    totalRegistrationFees +
    totalTVETTuition +
    totalShortProgramTuition +
    totalOtherStudentPayments;

  // Calculate inflows and outflows
  const totalInflows = totalStudentPayments;
  const totalOutflows = totalStaffSalaries + totalOperationalExpenses;
  const netCashMovement = totalInflows - totalOutflows;

  // Get outstanding student balances
  const accountWhere: any = {};
  if (programType) {
    accountWhere.studentRecord = { programType };
  }

  const accounts = await prisma.financialAccount.findMany({
    where: {
      ...accountWhere,
      balance: { gt: 0 },
    },
    select: { balance: true },
  });

  const outstandingStudentBalances = accounts.reduce(
    (sum, acc) => sum + acc.balance,
    0
  );

  // Get approved but unpaid expenses
  const expenseWhere: any = { status: 'APPROVED' };
  const approvedExpenses = await prisma.expense.findMany({
    where: expenseWhere,
    select: { amount: true },
  });

  const approvedUnpaidExpenses = approvedExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );

  return {
    totalStudentPayments,
    totalRegistrationFees,
    totalTVETTuition,
    totalShortProgramTuition,
    totalOtherStudentPayments,
    totalStaffSalaries,
    totalOperationalExpenses,
    netCashMovement,
    totalInflows,
    totalOutflows,
    outstandingStudentBalances,
    approvedUnpaidExpenses,
  };
}

// ── Revenue Breakdown ────────────────────────────────────────────────────────

/**
 * Get revenue breakdown by payment type
 */
export async function getRevenueBreakdown(
  params: DateFilterParams
): Promise<CategoryBreakdown[]> {
  const { startDate, endDate, programType } = params;

  const where: any = {
    status: 'POSTED',
    financialCategory: {
      in: [
        'REGISTRATION_FEE',
        'STUDENT_TUITION',
        'STUDENT_FEE',
      ] as FinancialCategory[],
    },
  };

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) where.transactionDate.gte = startDate;
    if (endDate) where.transactionDate.lte = endDate;
  }

  if (programType) {
    where.OR = [
      { programType },
      { financialCategory: 'REGISTRATION_FEE' }, // Registration fees apply to both
    ];
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    select: {
      amount: true,
      financialCategory: true,
      programType: true,
    },
  });

  // Group by category
  const categoryMap: Record<string, { amount: number; count: number }> = {};

  transactions.forEach((tx) => {
    const absAmount = Math.abs(tx.amount);
    let categoryKey = '';

    switch (tx.financialCategory) {
      case 'REGISTRATION_FEE':
        categoryKey = 'Registration Fees';
        break;
      case 'STUDENT_TUITION':
        if (tx.programType === 'TVET') {
          categoryKey = 'TVET Tuition';
        } else if (tx.programType === 'SHORT_PROGRAM') {
          categoryKey = 'Short Program Tuition';
        } else {
          categoryKey = 'Other Tuition';
        }
        break;
      case 'STUDENT_FEE':
        categoryKey = 'Other Student Fees';
        break;
    }

    if (!categoryMap[categoryKey]) {
      categoryMap[categoryKey] = { amount: 0, count: 0 };
    }
    categoryMap[categoryKey].amount += absAmount;
    categoryMap[categoryKey].count += 1;
  });

  const total = Object.values(categoryMap).reduce(
    (sum, cat) => sum + cat.amount,
    0
  );

  return Object.entries(categoryMap).map(([category, data]) => ({
    category,
    amount: data.amount,
    count: data.count,
    percentage: total > 0 ? (data.amount / total) * 100 : 0,
  }));
}

// ── Expense Breakdown ────────────────────────────────────────────────────────

/**
 * Get operational expense breakdown by category
 */
export async function getExpenseBreakdown(
  params: DateFilterParams
): Promise<CategoryBreakdown[]> {
  const { startDate, endDate } = params;

  const where: any = {
    status: 'PAID', // Only paid expenses
  };

  if (startDate || endDate) {
    where.paidAt = {};
    if (startDate) where.paidAt.gte = startDate;
    if (endDate) where.paidAt.lte = endDate;
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: true,
    },
  });

  // Group by category
  const categoryMap: Record<string, { amount: number; count: number }> = {};

  expenses.forEach((exp) => {
    const catName = exp.category.name;
    if (!categoryMap[catName]) {
      categoryMap[catName] = { amount: 0, count: 0 };
    }
    categoryMap[catName].amount += exp.amount;
    categoryMap[catName].count += 1;
  });

  const total = Object.values(categoryMap).reduce(
    (sum, cat) => sum + cat.amount,
    0
  );

  return Object.entries(categoryMap).map(([category, data]) => ({
    category,
    amount: data.amount,
    count: data.count,
    percentage: total > 0 ? (data.amount / total) * 100 : 0,
  }));
}

// ── Monthly Trends ───────────────────────────────────────────────────────────

/**
 * Get monthly cash flow trends
 */
export async function getMonthlyTrends(
  params: DateFilterParams,
  monthsBack: number = 12
): Promise<MonthlyTrend[]> {
  const endDate = params.endDate || new Date();
  const startDate = params.startDate || new Date(endDate);
  if (!params.startDate) {
    startDate.setMonth(startDate.getMonth() - monthsBack);
  }

  const where: any = {
    status: 'POSTED',
    transactionDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (params.programType) {
    where.OR = [
      { programType: params.programType },
      {
        financialCategory: {
          in: ['STAFF_SALARY', 'OPERATIONAL_EXPENSE'] as FinancialCategory[],
        },
      },
    ];
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    select: {
      amount: true,
      financialCategory: true,
      transactionDate: true,
    },
    orderBy: { transactionDate: 'asc' },
  });

  // Group by month
  const monthMap: Record<
    string,
    { month: string; year: number; inflows: number; outflows: number }
  > = {};

  transactions.forEach((tx) => {
    const date = new Date(tx.transactionDate);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}`;
    const monthName = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();

    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { month: monthName, year, inflows: 0, outflows: 0 };
    }

    const absAmount = Math.abs(tx.amount);

    // Classify as inflow or outflow
    if (
      ['REGISTRATION_FEE', 'STUDENT_TUITION', 'STUDENT_FEE'].includes(
        tx.financialCategory
      )
    ) {
      monthMap[monthKey].inflows += absAmount;
    } else if (
      ['STAFF_SALARY', 'OPERATIONAL_EXPENSE'].includes(tx.financialCategory)
    ) {
      monthMap[monthKey].outflows += absAmount;
    }
  });

  return Object.values(monthMap).map((m) => ({
    ...m,
    net: m.inflows - m.outflows,
  }));
}

// ── Detailed Reports ─────────────────────────────────────────────────────────

/**
 * Get student collection report
 */
export async function getStudentCollectionReport(params: DateFilterParams) {
  const where: any = {
    status: 'POSTED',
    financialCategory: {
      in: [
        'REGISTRATION_FEE',
        'STUDENT_TUITION',
        'STUDENT_FEE',
      ] as FinancialCategory[],
    },
  };

  if (params.startDate || params.endDate) {
    where.transactionDate = {};
    if (params.startDate) where.transactionDate.gte = params.startDate;
    if (params.endDate) where.transactionDate.lte = params.endDate;
  }

  if (params.programType) {
    where.OR = [
      { programType: params.programType },
      { financialCategory: 'REGISTRATION_FEE' },
    ];
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    include: {
      financialAccount: {
        include: {
          studentRecord: {
            include: {
              user: { select: { fullName: true, email: true } },
              program: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
      },
      registrationFeePayment: {
        include: {
          user: { select: { fullName: true, email: true } },
        },
      },
    },
    orderBy: { transactionDate: 'desc' },
  });

  return transactions.map((tx) => {
    const student =
      tx.financialAccount?.studentRecord ||
      (tx.registrationFeePayment?.user
        ? {
            user: tx.registrationFeePayment.user,
            program: null,
            department: null,
          }
        : null);

    return {
      id: tx.id,
      date: tx.transactionDate,
      studentName: student?.user?.fullName || 'N/A',
      studentEmail: student?.user?.email || 'N/A',
      program: student?.program?.name || 'N/A',
      department: student?.department?.name || 'N/A',
      category: tx.financialCategory,
      programType: tx.programType,
      amount: Math.abs(tx.amount),
      receiptId: tx.receiptId,
      referenceId: tx.referenceId,
      description: tx.description,
    };
  });
}

/**
 * Get staff salary payment report
 */
export async function getStaffSalaryReport(params: DateFilterParams) {
  const where: any = {
    status: 'POSTED',
    financialCategory: 'STAFF_SALARY' as FinancialCategory,
  };

  if (params.startDate || params.endDate) {
    where.transactionDate = {};
    if (params.startDate) where.transactionDate.gte = params.startDate;
    if (params.endDate) where.transactionDate.lte = params.endDate;
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    include: {
      staffPayment: {
        include: {
          employee: {
            include: {
              user: { select: { fullName: true, email: true } },
              department: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { transactionDate: 'desc' },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    date: tx.transactionDate,
    employeeName: tx.staffPayment?.employee?.user?.fullName || 'N/A',
    employeeEmail: tx.staffPayment?.employee?.user?.email || 'N/A',
    employeeCode: tx.staffPayment?.employee?.employeeCode || 'N/A',
    department: tx.staffPayment?.employee.department?.name || 'N/A',
    position: tx.staffPayment?.employee?.position || 'N/A',
    payrollMonth: tx.staffPayment?.payrollMonth || 'N/A',
    payrollYear: tx.staffPayment?.payrollYear || 0,
    amount: Math.abs(tx.amount),
    paymentMethod: tx.staffPayment?.paymentMethod || 'N/A',
    transactionReference: tx.staffPayment?.transactionReference || tx.referenceId,
    description: tx.description,
  }));
}

/**
 * Get operational expense report
 */
export async function getOperationalExpenseReport(params: DateFilterParams) {
  const where: any = {
    status: 'POSTED',
    financialCategory: 'OPERATIONAL_EXPENSE' as FinancialCategory,
  };

  if (params.startDate || params.endDate) {
    where.transactionDate = {};
    if (params.startDate) where.transactionDate.gte = params.startDate;
    if (params.endDate) where.transactionDate.lte = params.endDate;
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    include: {
      expense: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { transactionDate: 'desc' },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    date: tx.transactionDate,
    title: tx.expense?.title || 'N/A',
    category: tx.expense?.category.name || 'N/A',
    payee: tx.expense?.payee || 'N/A',
    invoiceNumber: tx.expense?.invoiceNumber || tx.receiptId,
    amount: Math.abs(tx.amount),
    paymentMethod: tx.expense?.paymentMethod || 'N/A',
    paymentReference: tx.expense?.paymentReference || tx.referenceId,
    description: tx.description,
  }));
}

/**
 * Get outstanding student balance report
 */
export async function getOutstandingBalanceReport(
  params: Pick<DateFilterParams, 'programType'>
) {
  const where: any = { balance: { gt: 0 } };

  if (params.programType) {
    where.studentRecord = { programType: params.programType };
  }

  const accounts = await prisma.financialAccount.findMany({
    where,
    include: {
      studentRecord: {
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          program: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
      transactions: {
        where: { status: 'POSTED' },
        select: { type: true, amount: true, transactionDate: true },
      },
    },
    orderBy: { balance: 'desc' },
  });

  return accounts.map((acc) => {
    const totalCharged = acc.transactions
      .filter((t) => t.type === 'TUITION' || t.type === 'FEE')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalPaid = acc.transactions
      .filter((t) => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const lastPayment = acc.transactions
      .filter((t) => t.type === 'PAYMENT')
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())[0];

    return {
      studentId: acc.studentRecord.studentId || 'N/A',
      studentName: acc.studentRecord.user.fullName,
      studentEmail: acc.studentRecord.user.email || 'N/A',
      phone: acc.studentRecord.user.phone || 'N/A',
      program: acc.studentRecord.program?.name || 'N/A',
      department: acc.studentRecord.department?.name || 'N/A',
      programType: acc.studentRecord.programType,
      totalCharged,
      totalPaid,
      balance: acc.balance,
      lastPaymentDate: lastPayment?.transactionDate || null,
    };
  });
}

/**
 * Get consolidated financial summary report
 */
export async function getConsolidatedFinancialSummary(
  params: DateFilterParams
) {
  const [dashboard, revenueBreakdown, expenseBreakdown, monthlyTrends] =
    await Promise.all([
      getDashboardSummary(params),
      getRevenueBreakdown(params),
      getExpenseBreakdown(params),
      getMonthlyTrends(params, 12),
    ]);

  return {
    summary: dashboard,
    revenueBreakdown,
    expenseBreakdown,
    monthlyTrends,
    generatedAt: new Date(),
    periodStart: params.startDate,
    periodEnd: params.endDate,
    programType: params.programType,
  };
}
