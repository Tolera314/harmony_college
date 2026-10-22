/**
 * Central Finance Service
 * 
 * Unified financial data service that integrates all payment types:
 * - Student tuition payments (TVET & Short Program)
 * - Registration fee payments
 * - Staff salary disbursements
 * - Other student fees and charges
 * 
 * Provides complete financial position calculation and unified reporting.
 */

import { prisma } from '../../lib/prisma';
import { ProgramType } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  breakdown: {
    studentTuition: number;
    registrationFees: number;
    otherStudentFees: number;
    staffSalaries: number;
  };
  byProgramType?: {
    TVET: {
      income: number;
      registrationFees: number;
    };
    SHORT_PROGRAM: {
      income: number;
      registrationFees: number;
    };
  };
}

export interface TransactionHistoryParams {
  startDate?: Date;
  endDate?: Date;
  programType?: ProgramType;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface CategoryBreakdown {
  category: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  count: number;
  percentage: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete Financial Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get complete financial position across ALL payment types
 * Calculates total income, expenses, and net position
 */
export async function getCompleteFinancialSummary(params: {
  startDate?: Date;
  endDate?: Date;
  programType?: ProgramType;
}): Promise<FinancialSummary> {
  const { startDate, endDate, programType } = params;

  const where: any = {
    status: 'POSTED',
  };

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) where.transactionDate.gte = startDate;
    if (endDate) where.transactionDate.lte = endDate;
  }

  if (programType) {
    where.programType = programType;
  }

  // Get all transactions
  const transactions = await prisma.financialTransaction.findMany({
    where,
    select: {
      amount: true,
      financialCategory: true,
      programType: true,
    },
  });

  // Calculate totals by category
  const breakdown = {
    studentTuition: 0,
    registrationFees: 0,
    otherStudentFees: 0,
    staffSalaries: 0,
  };

  const byProgramType: any = {
    TVET: { income: 0, registrationFees: 0 },
    SHORT_PROGRAM: { income: 0, registrationFees: 0 },
  };

  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach((tx) => {
    const absAmount = Math.abs(tx.amount);

    // Categorize by financial category
    switch (tx.financialCategory) {
      case 'STUDENT_TUITION':
        breakdown.studentTuition += absAmount;
        totalIncome += absAmount;
        if (tx.programType) {
          byProgramType[tx.programType].income += absAmount;
        }
        break;

      case 'REGISTRATION_FEE':
        breakdown.registrationFees += absAmount;
        totalIncome += absAmount;
        if (tx.programType) {
          byProgramType[tx.programType].registrationFees += absAmount;
        }
        break;

      case 'STUDENT_FEE':
        // Could be income (fees) or expense (refunds)
        if (tx.amount < 0) {
          // Negative = credit to student = income for college
          breakdown.otherStudentFees += absAmount;
          totalIncome += absAmount;
        } else {
          // Positive = debit to student = expense for college (refund)
          totalExpenses += absAmount;
        }
        break;

      case 'STAFF_SALARY':
        breakdown.staffSalaries += absAmount;
        totalExpenses += absAmount;
        break;

      case 'OTHER':
        // Handle other categories based on amount sign
        if (tx.amount < 0) {
          totalIncome += absAmount;
        } else {
          totalExpenses += absAmount;
        }
        break;
    }
  });

  const netPosition = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netPosition,
    breakdown,
    byProgramType: programType ? undefined : byProgramType,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction History
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get unified transaction history across all payment types
 * Supports filtering by date range, program type, and category
 */
export async function getTransactionHistory(params: TransactionHistoryParams) {
  const {
    startDate,
    endDate,
    programType,
    category,
    limit = 50,
    offset = 0,
  } = params;

  const where: any = {
    status: 'POSTED',
  };

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) where.transactionDate.gte = startDate;
    if (endDate) where.transactionDate.lte = endDate;
  }

  if (programType) {
    where.programType = programType;
  }

  if (category) {
    where.financialCategory = category;
  }

  const [transactions, total] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      skip: offset,
      take: limit,
      include: {
        financialAccount: {
          select: {
            studentRecord: {
              select: {
                studentId: true,
                user: {
                  select: {
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        staffPayment: {
          select: {
            employee: {
              select: {
                employeeCode: true,
                fullName: true,
              },
            },
            payrollMonth: true,
            payrollYear: true,
          },
        },
        registrationFeePayment: {
          select: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  return {
    transactions,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Breakdown
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get financial breakdown by category
 * Shows income vs expense distribution
 */
export async function getCategoryBreakdown(params: {
  startDate?: Date;
  endDate?: Date;
  programType?: ProgramType;
}): Promise<CategoryBreakdown[]> {
  const { startDate, endDate, programType } = params;

  const where: any = {
    status: 'POSTED',
  };

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) where.transactionDate.gte = startDate;
    if (endDate) where.transactionDate.lte = endDate;
  }

  if (programType) {
    where.programType = programType;
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    select: {
      amount: true,
      financialCategory: true,
    },
  });

  // Aggregate by category
  const categoryMap = new Map<string, { amount: number; count: number; type: 'INCOME' | 'EXPENSE' }>();

  transactions.forEach((tx) => {
    const category = tx.financialCategory || 'OTHER';
    const absAmount = Math.abs(tx.amount);
    
    // Determine if income or expense
    let type: 'INCOME' | 'EXPENSE' = 'INCOME';
    if (category === 'STAFF_SALARY') {
      type = 'EXPENSE';
    } else if (category === 'STUDENT_FEE' && tx.amount > 0) {
      type = 'EXPENSE'; // Refund
    }

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { amount: 0, count: 0, type });
    }

    const entry = categoryMap.get(category)!;
    entry.amount += absAmount;
    entry.count += 1;
  });

  // Calculate total for percentage
  const total = Array.from(categoryMap.values()).reduce((sum, entry) => sum + entry.amount, 0);

  // Convert to array
  const breakdown: CategoryBreakdown[] = [];
  categoryMap.forEach((value, category) => {
    breakdown.push({
      category,
      type: value.type,
      amount: value.amount,
      count: value.count,
      percentage: total > 0 ? (value.amount / total) * 100 : 0,
    });
  });

  // Sort by amount descending
  breakdown.sort((a, b) => b.amount - a.amount);

  return breakdown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly Trend Data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get monthly income and expense trends
 */
export async function getMonthlyTrends(params: {
  startDate: Date;
  endDate: Date;
  programType?: ProgramType;
}) {
  const { startDate, endDate, programType } = params;

  const where: any = {
    status: 'POSTED',
    transactionDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (programType) {
    where.programType = programType;
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    select: {
      amount: true,
      transactionDate: true,
      financialCategory: true,
    },
    orderBy: { transactionDate: 'asc' },
  });

  // Group by month
  const monthlyData = new Map<string, { income: number; expenses: number }>();

  transactions.forEach((tx) => {
    const monthKey = tx.transactionDate.toISOString().substring(0, 7); // YYYY-MM
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { income: 0, expenses: 0 });
    }

    const data = monthlyData.get(monthKey)!;
    const absAmount = Math.abs(tx.amount);

    // Categorize as income or expense
    if (tx.financialCategory === 'STAFF_SALARY') {
      data.expenses += absAmount;
    } else if (tx.financialCategory === 'STUDENT_FEE' && tx.amount > 0) {
      data.expenses += absAmount; // Refund
    } else {
      data.income += absAmount;
    }
  });

  // Convert to array and sort
  const trends = Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    income: data.income,
    expenses: data.expenses,
    net: data.income - data.expenses,
  }));

  trends.sort((a, b) => a.month.localeCompare(b.month));

  return trends;
}

// ─────────────────────────────────────────────────────────────────────────────
// Outstanding Calculations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get total outstanding student balances
 * (This is NOT counted as income until actually collected)
 */
export async function getTotalOutstanding(programType?: ProgramType) {
  const where: any = {
    balance: { gt: 0 },
  };

  if (programType) {
    where.studentRecord = { programType };
  }

  const accounts = await prisma.financialAccount.findMany({
    where,
    select: { balance: true },
  });

  return accounts.reduce((sum, acc) => sum + acc.balance, 0);
}

/**
 * Get expected vs collected revenue
 */
export async function getRevenueExpectationSummary(params: {
  startDate?: Date;
  endDate?: Date;
  programType?: ProgramType;
}) {
  const { startDate, endDate, programType } = params;

  // Get collected revenue (actual FinancialTransactions)
  const collectedSummary = await getCompleteFinancialSummary({
    startDate,
    endDate,
    programType,
  });

  // Get outstanding balances (expected but not yet collected)
  const totalOutstanding = await getTotalOutstanding(programType);

  // Get pending payments (submitted but not yet approved)
  const pendingSubmissions = await prisma.paymentSubmission.count({
    where: {
      status: 'PENDING_REVIEW',
      ...(programType && {
        studentRecord: { programType },
      }),
    },
  });

  return {
    collectedRevenue: collectedSummary.totalIncome,
    totalExpenses: collectedSummary.totalExpenses,
    netPosition: collectedSummary.netPosition,
    outstandingReceivables: totalOutstanding,
    pendingApprovals: pendingSubmissions,
    expectedTotalRevenue: collectedSummary.totalIncome + totalOutstanding,
  };
}
