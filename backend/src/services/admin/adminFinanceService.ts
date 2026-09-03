/**
 * Harmony College — Admin Finance Service
 * ─────────────────────────────────────────────────────────────
 * Single authoritative source of financial truth for Admin:
 * Institution-wide financial KPIs, server-side paginated transaction ledger,
 * payment posting, audited transaction reversals, student account management,
 * and term clearance updates.
 */

import { prisma } from '../../lib/prisma';
import { TransactionType } from '@prisma/client';
import { AuditAction } from '../../types/auth';

// ── Types & Interfaces ────────────────────────────────────────────────────────

export interface AdminFinanceStatsQuery {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  programId?: string;
}

export interface AdminFinanceTransactionListQuery {
  page: number;
  limit: number;
  search?: string;
  type?: TransactionType;
  category?: string;
  status?: string; // POSTED, PENDING, REVERSED
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  programId?: string;
}

export interface AdminStudentAccountListQuery {
  page: number;
  limit: number;
  search?: string;
  departmentId?: string;
  programId?: string;
  clearanceStatus?: 'cleared' | 'uncleared';
  balanceFilter?: 'outstanding' | 'credit' | 'zero';
}

export interface PostTransactionInput {
  studentRecordId: string;
  type: TransactionType;
  amount: number; // positive = charge, negative = credit
  description: string;
  category: string;
  referenceId?: string;
  transactionDate?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATS & OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export async function getFinanceStats(q: AdminFinanceStatsQuery) {
  const whereTx: any = {};

  if (q.startDate || q.endDate) {
    whereTx.transactionDate = {};
    if (q.startDate) whereTx.transactionDate.gte = new Date(q.startDate);
    if (q.endDate) whereTx.transactionDate.lte = new Date(q.endDate + 'T23:59:59.999Z');
  }

  if (q.departmentId || q.programId) {
    whereTx.financialAccount = {
      studentRecord: {
        ...(q.departmentId ? { departmentId: q.departmentId } : {}),
        ...(q.programId ? { programId: q.programId } : {}),
      },
    };
  }

  // Active transactions (not REVERSED)
  const activeTxWhere = { ...whereTx, status: 'POSTED' };

  const [
    allActiveTx,
    totalAccountsCount,
    allAccounts,
  ] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: activeTxWhere,
      select: { type: true, amount: true },
    }),
    prisma.financialAccount.count(),
    prisma.financialAccount.findMany({
      select: { balance: true, clearedForTerm: true },
    }),
  ]);

  let totalRevenue = 0;       // Payments received (negative amount -> positive value)
  let totalTuitionCharged = 0; // Tuition charges (positive amount)
  let totalFeesCharged = 0;    // Fee charges
  let totalScholarships = 0;   // Scholarship & Grant credits (negative amount)
  let totalRefunds = 0;        // Refund payments

  for (const tx of allActiveTx) {
    if (tx.type === TransactionType.PAYMENT) {
      totalRevenue += Math.abs(tx.amount);
    } else if (tx.type === TransactionType.TUITION) {
      totalTuitionCharged += tx.amount;
    } else if (tx.type === TransactionType.FEE || tx.type === TransactionType.PENALTY) {
      totalFeesCharged += tx.amount;
    } else if (tx.type === TransactionType.SCHOLARSHIP || tx.type === TransactionType.GRANT) {
      totalScholarships += Math.abs(tx.amount);
    } else if (tx.type === TransactionType.REFUND) {
      totalRefunds += Math.abs(tx.amount);
    }
  }

  let totalOutstanding = 0;
  let totalCredits = 0;
  let clearedCount = 0;
  let unclearedCount = 0;

  for (const acc of allAccounts) {
    if (acc.balance > 0) {
      totalOutstanding += acc.balance;
    } else if (acc.balance < 0) {
      totalCredits += Math.abs(acc.balance);
    }

    if (acc.clearedForTerm || acc.balance <= 0) {
      clearedCount++;
    } else {
      unclearedCount++;
    }
  }

  const totalTransactionsCount = await prisma.financialTransaction.count({ where: whereTx });

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalTuitionCharged: Math.round(totalTuitionCharged * 100) / 100,
    totalFeesCharged: Math.round(totalFeesCharged * 100) / 100,
    totalScholarships: Math.round(totalScholarships * 100) / 100,
    totalRefunds: Math.round(totalRefunds * 100) / 100,
    clearedCount,
    unclearedCount,
    totalAccounts: totalAccountsCount,
    totalTransactions: totalTransactionsCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TRANSACTION LEDGER LIST (PAGINATED WITH FILTERS)
// ─────────────────────────────────────────────────────────────────────────────

export async function listTransactions(q: AdminFinanceTransactionListQuery) {
  const page = Math.max(1, q.page || 1);
  const limit = Math.min(100, Math.max(1, q.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (q.type) where.type = q.type;
  if (q.category) where.category = q.category;
  if (q.status) where.status = q.status;

  if (q.startDate || q.endDate) {
    where.transactionDate = {};
    if (q.startDate) where.transactionDate.gte = new Date(q.startDate);
    if (q.endDate) where.transactionDate.lte = new Date(q.endDate + 'T23:59:59.999Z');
  }

  const studentWhere: any = {};
  if (q.departmentId) studentWhere.departmentId = q.departmentId;
  if (q.programId) studentWhere.programId = q.programId;

  if (Object.keys(studentWhere).length > 0) {
    where.financialAccount = { studentRecord: studentWhere };
  }

  if (q.search && q.search.trim()) {
    const s = q.search.trim();
    where.OR = [
      { receiptId: { contains: s, mode: 'insensitive' } },
      { referenceId: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
      { financialAccount: { studentRecord: { studentId: { contains: s, mode: 'insensitive' } } } },
      { financialAccount: { studentRecord: { user: { fullName: { contains: s, mode: 'insensitive' } } } } },
      { financialAccount: { studentRecord: { user: { email: { contains: s, mode: 'insensitive' } } } } },
    ];
  }

  const [total, records] = await Promise.all([
    prisma.financialTransaction.count({ where }),
    prisma.financialTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { transactionDate: 'desc' },
      include: {
        financialAccount: {
          include: {
            studentRecord: {
              select: {
                id: true,
                studentId: true,
                user: { select: { fullName: true, email: true } },
                department: { select: { id: true, name: true, code: true } },
                program: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const items = records.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    category: t.category,
    receiptId: t.receiptId,
    status: t.status,
    referenceId: t.referenceId,
    transactionDate: t.transactionDate.toISOString(),
    createdAt: t.createdAt.toISOString(),
    student: {
      id: t.financialAccount.studentRecord.id,
      studentId: t.financialAccount.studentRecord.studentId,
      fullName: t.financialAccount.studentRecord.user.fullName,
      email: t.financialAccount.studentRecord.user.email,
      department: t.financialAccount.studentRecord.department,
      program: t.financialAccount.studentRecord.program,
    },
  }));

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    transactions: items,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST FINANCIAL TRANSACTION (PAYMENT, CHARGE, WAIVER, REFUND)
// ─────────────────────────────────────────────────────────────────────────────

export async function postTransaction(input: PostTransactionInput, adminUserId: string, ipAddress?: string) {
  if (!input.studentRecordId) throw new Error('Student record ID is required.');
  if (!input.description || input.description.trim().length < 3) {
    throw new Error('Transaction description must be at least 3 characters.');
  }

  // Ensure amount sign consistency
  let amount = Number(input.amount);
  if (isNaN(amount) || amount === 0) throw new Error('Transaction amount must be non-zero.');

  if (input.type === TransactionType.PAYMENT || input.type === TransactionType.SCHOLARSHIP || input.type === TransactionType.GRANT) {
    // Credits to student account (reduce balance)
    if (amount > 0) amount = -amount;
  } else if (input.type === TransactionType.TUITION || input.type === TransactionType.FEE || input.type === TransactionType.PENALTY) {
    // Charges to student account (increase balance)
    if (amount < 0) amount = Math.abs(amount);
  }

  return prisma.$transaction(async (tx) => {
    // 1. Ensure financial account exists
    let account = await tx.financialAccount.findUnique({
      where: { studentRecordId: input.studentRecordId },
    });

    if (!account) {
      account = await tx.financialAccount.create({
        data: {
          studentRecordId: input.studentRecordId,
          balance: 0.0,
        },
      });
    }

    // 2. Generate unique receipt ID for payments / refunds
    let receiptId: string | null = null;
    if (input.type === TransactionType.PAYMENT || input.type === TransactionType.REFUND) {
      const stamp = Date.now().toString(36).toUpperCase();
      const rand = Math.floor(100 + Math.random() * 900);
      receiptId = `REC-${stamp}-${rand}`;
    }

    // 3. Create FinancialTransaction
    const createdTx = await tx.financialTransaction.create({
      data: {
        financialAccountId: account.id,
        type: input.type,
        amount,
        description: input.description.trim(),
        category: input.category || String(input.type),
        receiptId,
        status: 'POSTED',
        referenceId: input.referenceId?.trim() ?? null,
        transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
      },
    });

    // 4. Recalculate and update FinancialAccount balance
    const activeTxs = await tx.financialTransaction.findMany({
      where: { financialAccountId: account.id, status: 'POSTED' },
      select: { amount: true },
    });

    const newBalance = activeTxs.reduce((sum, item) => sum + item.amount, 0);

    const updatedAccount = await tx.financialAccount.update({
      where: { id: account.id },
      data: {
        balance: Math.round(newBalance * 100) / 100,
        lastUpdatedAt: new Date(),
      },
    });

    // 5. Create immutable AuditLog entry
    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: AuditAction.PROFILE_COMPLETED,
        ipAddress: ipAddress ?? null,
        metadata: {
          event: 'ADMIN_FINANCIAL_TRANSACTION_POSTED',
          transactionId: createdTx.id,
          studentRecordId: input.studentRecordId,
          type: input.type,
          amount,
          newBalance: updatedAccount.balance,
          receiptId,
        },
      },
    });

    return {
      transaction: createdTx,
      accountBalance: updatedAccount.balance,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. REVERSE FINANCIAL TRANSACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function reverseTransaction(transactionId: string, reason: string, adminUserId: string, ipAddress?: string) {
  if (!reason || reason.trim().length < 5) {
    throw new Error('A reversal reason of at least 5 characters is required for audit logs.');
  }

  const existingTx = await prisma.financialTransaction.findUnique({
    where: { id: transactionId },
    include: { financialAccount: true },
  });

  if (!existingTx) throw new Error('Financial transaction not found.');
  if (existingTx.status === 'REVERSED') throw new Error('Transaction is already reversed.');

  return prisma.$transaction(async (tx) => {
    // 1. Mark transaction as REVERSED
    const updatedTx = await tx.financialTransaction.update({
      where: { id: transactionId },
      data: { status: 'REVERSED' },
    });

    // 2. Recalculate FinancialAccount balance from POSTED transactions
    const activeTxs = await tx.financialTransaction.findMany({
      where: { financialAccountId: existingTx.financialAccountId, status: 'POSTED' },
      select: { amount: true },
    });

    const newBalance = activeTxs.reduce((sum, item) => sum + item.amount, 0);

    const updatedAccount = await tx.financialAccount.update({
      where: { id: existingTx.financialAccountId },
      data: {
        balance: Math.round(newBalance * 100) / 100,
        lastUpdatedAt: new Date(),
      },
    });

    // 3. Write immutable AuditLog
    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: AuditAction.PROFILE_COMPLETED,
        ipAddress: ipAddress ?? null,
        metadata: {
          event: 'ADMIN_FINANCIAL_TRANSACTION_REVERSED',
          transactionId,
          studentRecordId: existingTx.financialAccount.studentRecordId,
          reversedAmount: existingTx.amount,
          reversalReason: reason.trim(),
          newBalance: updatedAccount.balance,
        },
      },
    });

    return {
      transaction: updatedTx,
      accountBalance: updatedAccount.balance,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STUDENT FINANCIAL ACCOUNTS & CLEARANCE LIST
// ─────────────────────────────────────────────────────────────────────────────

export async function listStudentAccounts(q: AdminStudentAccountListQuery) {
  const page = Math.max(1, q.page || 1);
  const limit = Math.min(100, Math.max(1, q.limit || 20));
  const skip = (page - 1) * limit;

  const studentWhere: any = { status: 'ACTIVE' };
  if (q.departmentId) studentWhere.departmentId = q.departmentId;
  if (q.programId) studentWhere.programId = q.programId;

  if (q.search && q.search.trim()) {
    const s = q.search.trim();
    studentWhere.OR = [
      { studentId: { contains: s, mode: 'insensitive' } },
      { user: { fullName: { contains: s, mode: 'insensitive' } } },
      { user: { email: { contains: s, mode: 'insensitive' } } },
    ];
  }

  // Get active students
  const students = await prisma.studentRecord.findMany({
    where: studentWhere,
    select: {
      id: true,
      studentId: true,
      user: { select: { fullName: true, email: true, phone: true } },
      department: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true } },
      financialAccount: true,
    },
  });

  const accountList = students.map((s) => {
    const balance = s.financialAccount?.balance ?? 0.0;
    const clearedForTerm = s.financialAccount?.clearedForTerm ?? null;
    const isCleared = clearedForTerm !== null || balance <= 0;

    return {
      id: s.financialAccount?.id ?? `pending-${s.id}`,
      studentRecordId: s.id,
      student: {
        id: s.id,
        studentId: s.studentId,
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone,
        department: s.department,
        program: s.program,
      },
      balance,
      clearedForTerm,
      isCleared,
      lastUpdatedAt: s.financialAccount?.lastUpdatedAt.toISOString() ?? new Date().toISOString(),
    };
  });

  // Apply filters in-memory
  let filtered = accountList;

  if (q.clearanceStatus === 'cleared') {
    filtered = filtered.filter((a) => a.isCleared);
  } else if (q.clearanceStatus === 'uncleared') {
    filtered = filtered.filter((a) => !a.isCleared);
  }

  if (q.balanceFilter === 'outstanding') {
    filtered = filtered.filter((a) => a.balance > 0);
  } else if (q.balanceFilter === 'credit') {
    filtered = filtered.filter((a) => a.balance < 0);
  } else if (q.balanceFilter === 'zero') {
    filtered = filtered.filter((a) => a.balance === 0);
  }

  const total = filtered.length;
  const paginated = filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    accounts: paginated,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. STUDENT FINANCIAL DETAIL DRILLDOWN
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentFinancialDetail(studentId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      department: true,
      program: true,
      financialAccount: {
        include: {
          transactions: {
            orderBy: { transactionDate: 'desc' },
          },
        },
      },
    },
  });

  if (!student) throw new Error('Student record not found');

  let account = student.financialAccount;
  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId: studentId, balance: 0.0 },
      include: { transactions: true },
    });
  }

  const transactions = account.transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    category: t.category,
    receiptId: t.receiptId,
    status: t.status,
    referenceId: t.referenceId,
    transactionDate: t.transactionDate.toISOString(),
  }));

  const activeTxs = transactions.filter((t) => t.status === 'POSTED');
  const totalCharges = activeTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalPayments = activeTxs.filter((t) => t.type === TransactionType.PAYMENT).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalAid = activeTxs.filter((t) => t.type === TransactionType.SCHOLARSHIP || t.type === TransactionType.GRANT).reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    student: {
      id: student.id,
      studentId: student.studentId,
      fullName: student.user.fullName,
      email: student.user.email,
      phone: student.user.phone,
      department: student.department,
      program: student.program,
    },
    account: {
      id: account.id,
      balance: account.balance,
      clearedForTerm: account.clearedForTerm,
      lastUpdatedAt: account.lastUpdatedAt.toISOString(),
    },
    summary: {
      totalCharges: Math.round(totalCharges * 100) / 100,
      totalPayments: Math.round(totalPayments * 100) / 100,
      totalAid: Math.round(totalAid * 100) / 100,
      balance: account.balance,
      isCleared: account.clearedForTerm !== null || account.balance <= 0,
    },
    transactions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. UPDATE TERM CLEARANCE STATUS
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTermClearance(
  studentId: string,
  clearedForTerm: string | null,
  adminUserId: string,
  ipAddress?: string
) {
  let account = await prisma.financialAccount.findUnique({
    where: { studentRecordId: studentId },
  });

  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId: studentId, balance: 0.0 },
    });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.financialAccount.update({
      where: { id: account!.id },
      data: {
        clearedForTerm: clearedForTerm ? clearedForTerm.trim() : null,
        lastUpdatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: AuditAction.PROFILE_COMPLETED,
        ipAddress: ipAddress ?? null,
        metadata: {
          event: 'ADMIN_TERM_CLEARANCE_UPDATED',
          studentRecordId: studentId,
          clearedForTerm: updated.clearedForTerm,
        },
      },
    });

    return updated;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. FINANCE TRENDS & REVENUE BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────

export async function getFinanceTrends(q: AdminFinanceStatsQuery) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const transactions = await prisma.financialTransaction.findMany({
    where: {
      status: 'POSTED',
      transactionDate: { gte: startDate },
    },
    select: {
      type: true,
      amount: true,
      transactionDate: true,
    },
    orderBy: { transactionDate: 'asc' },
  });

  const MapDate = new Map<string, { payments: number; charges: number }>();

  for (const t of transactions) {
    const dStr = t.transactionDate.toISOString().split('T')[0];
    const cur = MapDate.get(dStr) || { payments: 0, charges: 0 };
    if (t.type === TransactionType.PAYMENT) {
      cur.payments += Math.abs(t.amount);
    } else if (t.amount > 0) {
      cur.charges += t.amount;
    }
    MapDate.set(dStr, cur);
  }

  const trends = Array.from(MapDate.entries()).map(([date, val]) => ({
    date,
    payments: Math.round(val.payments),
    charges: Math.round(val.charges),
  }));

  return {
    period: '30_days',
    trends,
  };
}
