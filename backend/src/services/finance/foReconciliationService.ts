/**
 * Finance Officer Reconciliation Service — Harmony College
 * Uses real FinancialTransaction rows where status = 'PENDING' as the
 * reconciliation queue. No gateway table exists in the schema, so PENDING
 * transactions represent payments awaiting finance verification/posting.
 */
import { prisma } from '../../lib/prisma';

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectSource(
  description: string | null,
  category: string | null,
  referenceId: string | null,
): 'Chapa' | 'Telebirr' | 'Bank Transfer' | 'Manual' {
  const h = `${description ?? ''} ${category ?? ''} ${referenceId ?? ''}`.toLowerCase();
  if (h.includes('chapa'))    return 'Chapa';
  if (h.includes('telebirr')) return 'Telebirr';
  const ref = (referenceId ?? '').toUpperCase();
  if (ref.startsWith('CHP'))  return 'Chapa';
  if (ref.startsWith('TLB'))  return 'Telebirr';
  if (ref.startsWith('BT-') || ref.startsWith('CBE') || h.includes('bank')) return 'Bank Transfer';
  if (referenceId)             return 'Bank Transfer';
  return 'Manual';
}

function toReconciliationStatus(
  dbStatus: string,
): 'Matched' | 'Unmatched' | 'Failed' | 'Pending Review' {
  if (dbStatus === 'POSTED')   return 'Matched';
  if (dbStatus === 'REVERSED') return 'Failed';
  if (dbStatus === 'PENDING')  return 'Unmatched';
  return 'Pending Review';
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listReconciliationEntries(params: { status?: string; search?: string }) {
  // Map UI status to DB status
  const dbStatusMap: Record<string, string[]> = {
    Matched:         ['POSTED'],
    Unmatched:       ['PENDING'],
    Failed:          ['REVERSED'],
    'Pending Review': ['PENDING'],
  };

  const where: any = {};

  if (params.status && params.status !== 'All') {
    const mapped = dbStatusMap[params.status];
    if (mapped) where.status = { in: mapped };
  }

  if (params.search) {
    const s = params.search;
    where.OR = [
      { receiptId:   { contains: s, mode: 'insensitive' } },
      { referenceId: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
      {
        financialAccount: {
          studentRecord: {
            user: { fullName: { contains: s, mode: 'insensitive' } },
          },
        },
      },
      {
        financialAccount: {
          studentRecord: {
            studentId: { contains: s, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  const transactions = await prisma.financialTransaction.findMany({
    where,
    orderBy: { transactionDate: 'desc' },
    take: 100,
    include: {
      financialAccount: {
        include: {
          studentRecord: {
            include: {
              user:    { select: { fullName: true } },
              program: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const entries = transactions.map((tx) => {
    const student   = tx.financialAccount.studentRecord;
    const dateObj   = new Date(tx.transactionDate);
    const uiStatus  = toReconciliationStatus(tx.status);

    // For Unmatched/Pending Review, treat as needing review
    const finalStatus: 'Matched' | 'Unmatched' | 'Failed' | 'Pending Review' =
      tx.status === 'POSTED'   ? 'Matched' :
      tx.status === 'REVERSED' ? 'Failed'  :
      'Unmatched';

    return {
      id:               tx.id,
      gatewayTxnId:     tx.referenceId ?? tx.receiptId ?? `TXN-${tx.id.slice(0, 8).toUpperCase()}`,
      studentId:        student.studentId ?? null,
      studentName:      student.user.fullName ?? null,
      source:           detectSource(tx.description, tx.category, tx.referenceId),
      amount:           Math.abs(tx.amount),
      status:           finalStatus,
      date:             dateObj.toISOString().split('T')[0],
      time:             dateObj.toTimeString().slice(0, 5),
      matchedReceiptId: tx.receiptId ?? null,
      failureReason:    tx.status === 'REVERSED' ? 'Transaction was reversed' : undefined,
      reviewNotes:      undefined as string | undefined,
    };
  });

  return { total: entries.length, entries };
}

// ── Match (mark PENDING → POSTED) ────────────────────────────────────────────

export async function matchReconciliation(
  transactionId: string,
  matchedReceiptId: string,
  actorUserId: string,
) {
  const tx = await prisma.financialTransaction.findUnique({
    where: { id: transactionId },
    include: { financialAccount: true },
  });

  if (!tx) throw new Error('Reconciliation entry not found');

  if (tx.status === 'POSTED') {
    return { id: tx.id, status: 'Matched', message: 'Already matched' };
  }

  // Post the transaction: update status to POSTED and apply balance effect
  const amountEffect = tx.amount; // PAYMENT is negative, so balance decreases
  const [updatedTx] = await prisma.$transaction([
    prisma.financialTransaction.update({
      where: { id: transactionId },
      data:  {
        status:    'POSTED',
        receiptId: matchedReceiptId || tx.receiptId || `REC-${Date.now().toString(36).toUpperCase()}`,
      },
    }),
    prisma.financialAccount.update({
      where: { id: tx.financialAccountId },
      data:  {
        balance:      tx.financialAccount.balance + amountEffect,
        lastUpdatedAt: new Date(),
      },
    }),
  ]);

  return { id: updatedTx.id, status: 'Matched' };
}

// ── Flag (keep PENDING, add review note to description) ──────────────────────

export async function flagReconciliation(
  transactionId: string,
  notes: string,
  actorUserId: string,
) {
  const tx = await prisma.financialTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!tx) throw new Error('Reconciliation entry not found');

  const updatedTx = await prisma.financialTransaction.update({
    where: { id: transactionId },
    data:  {
      description: `[FLAGGED] ${notes} | Original: ${tx.description}`,
    },
  });

  return { id: updatedTx.id, status: 'Pending Review', notes };
}
