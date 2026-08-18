/**
 * Student Financials Service
 * Manages fee statements, transaction ledger, balance, and payment processing.
 * Payments are recorded as FinancialTransaction rows — no external gateway.
 */
import { prisma } from '../../lib/prisma';
import { randomBytes } from 'crypto';

function generateReceiptId(): string {
  return `RCP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function getFinancialSummary(studentRecordId: string) {
  let account = await prisma.financialAccount.findUnique({
    where: { studentRecordId },
    include: {
      transactions: {
        orderBy: { transactionDate: 'desc' },
      },
    },
  });

  // Auto-create account if missing (new students)
  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId },
      include: { transactions: true },
    });
  }

  // Compute balance from transactions
  const computedBalance = account.transactions.reduce(
    (sum, tx) => sum + tx.amount,
    0,
  );

  // Scholarships and grants
  const financialAid = account.transactions
    .filter(tx => tx.type === 'SCHOLARSHIP' || tx.type === 'GRANT')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // Current semester fee statement (group latest transactions by category)
  const feeStatement = account.transactions
    .filter(tx => tx.type === 'TUITION' || tx.type === 'FEE')
    .reduce<Record<string, { description: string; amount: number }>>((acc, tx) => {
      acc[tx.category] = { description: tx.description, amount: tx.amount };
      return acc;
    }, {});

  return {
    balance: Math.round(computedBalance * 100) / 100,
    clearedForTerm: account.clearedForTerm,
    totalFinancialAid: Math.round(financialAid * 100) / 100,
    lastUpdatedAt: account.lastUpdatedAt,
    feeStatement: Object.values(feeStatement),
    transactions: account.transactions.map(tx => ({
      id: tx.id,
      date: tx.transactionDate,
      description: tx.description,
      category: tx.category,
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      receiptId: tx.receiptId,
    })),
  };
}

export async function processPayment(data: {
  studentRecordId: string;
  amount: number;
  cardLastFour?: string;
  cardHolder?: string;
}) {
  if (data.amount <= 0) throw new Error('Payment amount must be greater than 0');
  if (data.amount > 100000) throw new Error('Payment amount exceeds maximum allowed');

  let account = await prisma.financialAccount.findUnique({
    where: { studentRecordId: data.studentRecordId },
  });
  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId: data.studentRecordId },
    });
  }

  const receiptId = generateReceiptId();

  const tx = await prisma.$transaction(async txn => {
    const transaction = await txn.financialTransaction.create({
      data: {
        financialAccountId: account!.id,
        type: 'PAYMENT',
        amount: -data.amount, // negative = credit to student account
        description: `Online Payment — ${data.cardHolder ?? 'Card Payment'}`,
        category: 'Payment',
        receiptId,
        referenceId: data.cardLastFour ? `****${data.cardLastFour}` : null,
        status: 'POSTED',
      },
    });

    // Recompute balance
    const allTransactions = await txn.financialTransaction.findMany({
      where: { financialAccountId: account!.id },
      select: { amount: true },
    });
    const newBalance = allTransactions.reduce((sum, t) => sum + t.amount, 0);
    const isCleared = newBalance <= 0;

    await txn.financialAccount.update({
      where: { id: account!.id },
      data: {
        balance: Math.round(newBalance * 100) / 100,
        lastUpdatedAt: new Date(),
        ...(isCleared
          ? {
              clearedForTerm: new Date().getFullYear() + ' — Current Semester',
            }
          : {}),
      },
    });

    return { transaction, newBalance: Math.round(newBalance * 100) / 100, isCleared };
  });

  return {
    receiptId,
    amount: data.amount,
    newBalance: tx.newBalance,
    isCleared: tx.isCleared,
    transactionId: tx.transaction.id,
  };
}
