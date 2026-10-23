/**
 * Expense Service — Harmony College
 * Manages operational expenses with approval workflow and payment tracking
 */
import { prisma } from '../../lib/prisma';
import { ExpenseStatus } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateExpenseInput {
  title: string;
  description?: string;
  categoryId: string;
  amount: number;
  currency?: string;
  expenseDate: Date;
  dueDate?: Date;
  payee?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
  notes?: string;
  createdByUserId: string;
  createdByName?: string;
}

export interface UpdateExpenseInput {
  title?: string;
  description?: string;
  categoryId?: string;
  amount?: number;
  expenseDate?: Date;
  dueDate?: Date;
  payee?: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
  notes?: string;
}

export interface ApproveExpenseInput {
  expenseId: string;
  approvedByUserId: string;
  approvedByName?: string;
}

export interface RejectExpenseInput {
  expenseId: string;
  rejectedByUserId: string;
  rejectedByName?: string;
  rejectionReason: string;
}

export interface RecordPaymentInput {
  expenseId: string;
  paymentMethod: string;
  paymentReference?: string;
  paidByUserId: string;
  paidByName?: string;
  notes?: string;
}

export interface ListExpensesParams {
  status?: ExpenseStatus | 'ALL';
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  month?: string;
  year?: number;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Expense Category Management ──────────────────────────────────────────────

export async function listExpenseCategories(includeInactive = false) {
  const where: any = includeInactive ? {} : { isActive: true };
  
  const categories = await prisma.expenseCategory.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { expenses: true },
      },
    },
  });

  return categories;
}

export async function createExpenseCategory(input: {
  name: string;
  description?: string;
  createdByUserId: string;
}) {
  if (!input.name || input.name.trim().length < 2) {
    throw new Error('Category name must be at least 2 characters');
  }

  // Check for duplicate
  const existing = await prisma.expenseCategory.findFirst({
    where: { name: { equals: input.name.trim(), mode: 'insensitive' } },
  });

  if (existing) {
    throw new Error('An expense category with this name already exists');
  }

  const category = await prisma.expenseCategory.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
    },
  });

  return category;
}

export async function toggleExpenseCategoryStatus(
  categoryId: string,
  isActive: boolean
) {
  const category = await prisma.expenseCategory.update({
    where: { id: categoryId },
    data: { isActive },
  });

  return category;
}

// ── Expense Management ───────────────────────────────────────────────────────

export async function createExpense(input: CreateExpenseInput) {
  // Validation
  if (!input.title || input.title.trim().length < 3) {
    throw new Error('Expense title must be at least 3 characters');
  }
  if (!input.amount || input.amount <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }
  if (!input.categoryId) {
    throw new Error('Expense category is required');
  }

  // Verify category exists
  const category = await prisma.expenseCategory.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) {
    throw new Error('Invalid expense category');
  }
  if (!category.isActive) {
    throw new Error('Cannot create expense with inactive category');
  }

  const expense = await prisma.expense.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      categoryId: input.categoryId,
      amount: input.amount,
      currency: input.currency || 'ETB',
      expenseDate: input.expenseDate,
      dueDate: input.dueDate || null,
      payee: input.payee?.trim() || null,
      invoiceNumber: input.invoiceNumber?.trim() || null,
      referenceNumber: input.referenceNumber?.trim() || null,
      attachmentUrl: input.attachmentUrl || null,
      attachmentFileName: input.attachmentFileName || null,
      notes: input.notes?.trim() || null,
      status: ExpenseStatus.PENDING,
      createdByUserId: input.createdByUserId,
      createdByName: input.createdByName || null,
    },
    include: {
      category: true,
    },
  });

  // Create audit log
  await prisma.expenseAuditLog.create({
    data: {
      expenseId: expense.id,
      action: 'CREATED',
      userId: input.createdByUserId,
      userName: input.createdByName || null,
      newValues: expense as any,
    },
  });

  return expense;
}

export async function getExpenseById(expenseId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      category: true,
      financialTransaction: true,
      paymentHistory: {
        orderBy: { performedAt: 'desc' },
      },
      auditLogs: {
        orderBy: { performedAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  return expense;
}

export async function listExpenses(params: ListExpensesParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  // Status filter
  if (params.status && params.status !== 'ALL') {
    where.status = params.status;
  }

  // Category filter
  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }

  // Date range filter
  if (params.startDate || params.endDate) {
    where.expenseDate = {};
    if (params.startDate) where.expenseDate.gte = params.startDate;
    if (params.endDate) where.expenseDate.lte = params.endDate;
  }

  // Month/year filter
  if (params.month && params.year) {
    const monthStart = new Date(params.year, parseInt(params.month) - 1, 1);
    const monthEnd = new Date(params.year, parseInt(params.month), 0, 23, 59, 59);
    where.expenseDate = {
      gte: monthStart,
      lte: monthEnd,
    };
  } else if (params.year) {
    const yearStart = new Date(params.year, 0, 1);
    const yearEnd = new Date(params.year, 11, 31, 23, 59, 59);
    where.expenseDate = {
      gte: yearStart,
      lte: yearEnd,
    };
  }

  // Search filter
  if (params.search) {
    const q = params.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { payee: { contains: q, mode: 'insensitive' } },
      { invoiceNumber: { contains: q, mode: 'insensitive' } },
      { referenceNumber: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { expenseDate: 'desc' },
      include: {
        category: true,
        financialTransaction: {
          select: {
            id: true,
            amount: true,
            transactionDate: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    expenses,
  };
}

export async function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput,
  userId: string,
  userName?: string
) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  // Validate status
  if (expense.status === ExpenseStatus.PAID) {
    throw new Error('Cannot update a paid expense');
  }
  if (expense.status === ExpenseStatus.CANCELLED) {
    throw new Error('Cannot update a cancelled expense');
  }

  // Validate amount if provided
  if (input.amount !== undefined && input.amount <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  // Verify category if changed
  if (input.categoryId && input.categoryId !== expense.categoryId) {
    const category = await prisma.expenseCategory.findUnique({
      where: { id: input.categoryId },
    });
    if (!category || !category.isActive) {
      throw new Error('Invalid expense category');
    }
  }

  const oldValues = { ...expense };

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...(input.title && { title: input.title.trim() }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.expenseDate && { expenseDate: input.expenseDate }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate || null }),
      ...(input.payee !== undefined && { payee: input.payee?.trim() || null }),
      ...(input.invoiceNumber !== undefined && {
        invoiceNumber: input.invoiceNumber?.trim() || null,
      }),
      ...(input.referenceNumber !== undefined && {
        referenceNumber: input.referenceNumber?.trim() || null,
      }),
      ...(input.attachmentUrl !== undefined && {
        attachmentUrl: input.attachmentUrl || null,
      }),
      ...(input.attachmentFileName !== undefined && {
        attachmentFileName: input.attachmentFileName || null,
      }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
    },
    include: {
      category: true,
    },
  });

  // Create audit log
  await prisma.expenseAuditLog.create({
    data: {
      expenseId,
      action: 'UPDATED',
      userId,
      userName: userName || null,
      oldValues: oldValues as any,
      newValues: updated as any,
    },
  });

  return updated;
}

// ── Approval Workflow ────────────────────────────────────────────────────────

export async function approveExpense(input: ApproveExpenseInput) {
  const expense = await prisma.expense.findUnique({
    where: { id: input.expenseId },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.status !== ExpenseStatus.PENDING) {
    throw new Error(
      `Cannot approve expense with status: ${expense.status}. Only pending expenses can be approved.`
    );
  }

  const approved = await prisma.expense.update({
    where: { id: input.expenseId },
    data: {
      status: ExpenseStatus.APPROVED,
      approvedByUserId: input.approvedByUserId,
      approvedByName: input.approvedByName || null,
      approvedAt: new Date(),
    },
    include: {
      category: true,
    },
  });

  // Create audit log
  await prisma.expenseAuditLog.create({
    data: {
      expenseId: input.expenseId,
      action: 'APPROVED',
      userId: input.approvedByUserId,
      userName: input.approvedByName || null,
    },
  });

  return approved;
}

export async function rejectExpense(input: RejectExpenseInput) {
  if (!input.rejectionReason || input.rejectionReason.trim().length < 5) {
    throw new Error('Rejection reason must be at least 5 characters');
  }

  const expense = await prisma.expense.findUnique({
    where: { id: input.expenseId },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.status !== ExpenseStatus.PENDING) {
    throw new Error(
      `Cannot reject expense with status: ${expense.status}. Only pending expenses can be rejected.`
    );
  }

  const rejected = await prisma.expense.update({
    where: { id: input.expenseId },
    data: {
      status: ExpenseStatus.REJECTED,
      rejectedByUserId: input.rejectedByUserId,
      rejectedByName: input.rejectedByName || null,
      rejectedAt: new Date(),
      rejectionReason: input.rejectionReason.trim(),
    },
    include: {
      category: true,
    },
  });

  // Create audit log
  await prisma.expenseAuditLog.create({
    data: {
      expenseId: input.expenseId,
      action: 'REJECTED',
      userId: input.rejectedByUserId,
      userName: input.rejectedByName || null,
      note: input.rejectionReason,
    },
  });

  return rejected;
}

// ── Payment Management ───────────────────────────────────────────────────────

export async function recordPayment(input: RecordPaymentInput) {
  if (!input.paymentMethod || input.paymentMethod.trim().length < 2) {
    throw new Error('Payment method is required');
  }

  const expense = await prisma.expense.findUnique({
    where: { id: input.expenseId },
    include: { category: true },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.status !== ExpenseStatus.APPROVED) {
    throw new Error(
      `Cannot record payment for expense with status: ${expense.status}. Only approved expenses can be paid.`
    );
  }

  if (expense.financialTransactionId) {
    throw new Error('Payment has already been recorded for this expense');
  }

  // Create expense payment and financial transaction atomically
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create FinancialTransaction (central ledger)
    const transaction = await tx.financialTransaction.create({
      data: {
        type: 'FEE', // Using FEE type for expenses (outgoing money)
        amount: expense.amount, // positive = expense (money out)
        description: `Operational Expense: ${expense.title}`,
        category: expense.category.name,
        financialCategory: 'OPERATIONAL_EXPENSE',
        expenseId: expense.id,
        receiptId: expense.invoiceNumber || null,
        referenceId: input.paymentReference || expense.referenceNumber || null,
        status: 'POSTED',
        transactionDate: new Date(),
      },
    });

    // 2. Update expense status to PAID
    const paidExpense = await tx.expense.update({
      where: { id: input.expenseId },
      data: {
        status: ExpenseStatus.PAID,
        paidByUserId: input.paidByUserId,
        paidByName: input.paidByName || null,
        paidAt: new Date(),
        paymentMethod: input.paymentMethod.trim(),
        paymentReference: input.paymentReference?.trim() || null,
        financialTransactionId: transaction.id,
      },
      include: {
        category: true,
        financialTransaction: true,
      },
    });

    // 3. Create payment history record
    await tx.expensePaymentHistory.create({
      data: {
        expenseId: input.expenseId,
        action: 'PAYMENT',
        amount: expense.amount,
        paymentMethod: input.paymentMethod.trim(),
        paymentReference: input.paymentReference?.trim() || null,
        transactionId: transaction.id,
        performedByUserId: input.paidByUserId,
        performedByName: input.paidByName || null,
      },
    });

    // 4. Create audit log
    await tx.expenseAuditLog.create({
      data: {
        expenseId: input.expenseId,
        action: 'PAID',
        userId: input.paidByUserId,
        userName: input.paidByName || null,
        note: input.notes || `Payment recorded via ${input.paymentMethod}`,
      },
    });

    return { expense: paidExpense, transaction };
  });

  return result;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getExpenseSummary(params?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};

  if (params?.startDate || params?.endDate) {
    where.expenseDate = {};
    if (params.startDate) where.expenseDate.gte = params.startDate;
    if (params.endDate) where.expenseDate.lte = params.endDate;
  }

  const [
    totalPaid,
    pending,
    approved,
    rejected,
    overdue,
    paidExpenses,
    paidSum,
    approvedSum,
  ] = await Promise.all([
    prisma.expense.count({ where: { ...where, status: ExpenseStatus.PAID } }),
    prisma.expense.count({ where: { ...where, status: ExpenseStatus.PENDING } }),
    prisma.expense.count({ where: { ...where, status: ExpenseStatus.APPROVED } }),
    prisma.expense.count({ where: { ...where, status: ExpenseStatus.REJECTED } }),
    prisma.expense.count({
      where: {
        ...where,
        status: ExpenseStatus.APPROVED,
        dueDate: { lt: new Date() },
      },
    }),
    prisma.expense.findMany({
      where: { ...where, status: ExpenseStatus.PAID },
      select: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...where, status: ExpenseStatus.PAID },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { ...where, status: ExpenseStatus.APPROVED },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalExpensesPaid: totalPaid,
    totalAmountPaid: paidSum._sum.amount || 0,
    pendingApproval: pending,
    approvedUnpaid: approved,
    approvedUnpaidAmount: approvedSum._sum.amount || 0,
    rejected,
    overdue,
  };
}

export async function getExpensesByCategory(params?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = { status: ExpenseStatus.PAID };

  if (params?.startDate || params?.endDate) {
    where.expenseDate = {};
    if (params.startDate) where.expenseDate.gte = params.startDate;
    if (params.endDate) where.expenseDate.lte = params.endDate;
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: true,
    },
  });

  const categoryMap: Record<
    string,
    { name: string; total: number; count: number }
  > = {};

  expenses.forEach((expense) => {
    const catName = expense.category.name;
    if (!categoryMap[catName]) {
      categoryMap[catName] = { name: catName, total: 0, count: 0 };
    }
    categoryMap[catName].total += expense.amount;
    categoryMap[catName].count += 1;
  });

  return Object.values(categoryMap);
}
