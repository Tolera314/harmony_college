import { prisma } from '../../lib/prisma';
import * as foAuditService from './foAuditService';

export interface ReconciliationEntryItem {
  id: string;
  gatewayTxnId: string;
  studentId: string | null;
  studentName: string | null;
  source: 'Chapa' | 'Telebirr' | 'Bank Transfer' | 'Manual';
  amount: number;
  status: 'Matched' | 'Unmatched' | 'Failed' | 'Pending Review';
  date: string;
  time: string;
  matchedReceiptId: string | null;
  failureReason?: string;
  reviewNotes?: string;
}

export async function listReconciliationEntries(params: { status?: string; search?: string }) {
  const where: any = {
    OR: [
      { type: 'PAYMENT' },
      { amount: { lt: 0 } },
    ],
  };

  const transactions = await prisma.financialTransaction.findMany({
    where,
    orderBy: { transactionDate: 'desc' },
    take: 200,
    include: {
      financialAccount: {
        include: {
          studentRecord: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      },
    },
  });

  const entries: ReconciliationEntryItem[] = transactions.map((tx) => {
    const studentRec = tx.financialAccount?.studentRecord;
    const descLower = (tx.description || '').toLowerCase();
    const catLower = (tx.category || '').toLowerCase();

    let source: 'Chapa' | 'Telebirr' | 'Bank Transfer' | 'Manual' = 'Bank Transfer';
    if (descLower.includes('telebirr') || catLower.includes('telebirr')) source = 'Telebirr';
    else if (descLower.includes('chapa') || catLower.includes('chapa')) source = 'Chapa';
    else if (descLower.includes('cash') || catLower.includes('cash') || descLower.includes('manual')) source = 'Manual';

    let status: 'Matched' | 'Unmatched' | 'Failed' | 'Pending Review' = 'Unmatched';
    if (tx.status === 'REVERSED') status = 'Failed';
    else if (tx.receiptId) status = 'Matched';
    else if (tx.status === 'PENDING') status = 'Pending Review';

    const txDate = new Date(tx.transactionDate);

    return {
      id: tx.id,
      gatewayTxnId: tx.referenceId || `TXN-${source.slice(0, 2).toUpperCase()}-${tx.id.slice(0, 6).toUpperCase()}`,
      studentId: studentRec?.studentId || null,
      studentName: studentRec?.user?.fullName || null,
      source,
      amount: Math.abs(tx.amount),
      status,
      date: txDate.toISOString().slice(0, 10),
      time: txDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      matchedReceiptId: tx.receiptId || null,
      failureReason: tx.status === 'REVERSED' ? 'Transaction reversed by system' : undefined,
      reviewNotes: tx.status === 'PENDING' ? (tx.description || 'Pending reconciliation review') : undefined,
    };
  });

  let filtered = entries;
  if (params.status) {
    filtered = filtered.filter((item) => item.status === params.status);
  }
  if (params.search && params.search.trim()) {
    const s = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.gatewayTxnId.toLowerCase().includes(s) ||
        (item.studentName && item.studentName.toLowerCase().includes(s)) ||
        (item.studentId && item.studentId.toLowerCase().includes(s))
    );
  }

  return {
    total: filtered.length,
    entries: filtered,
  };
}

export async function matchReconciliation(id: string, matchedReceiptId?: string, actorUserId?: string) {
  const receiptIdToUse = matchedReceiptId || `REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const updated = await prisma.financialTransaction.update({
    where: { id },
    data: {
      status: 'POSTED',
      receiptId: receiptIdToUse,
    },
    include: {
      financialAccount: {
        include: {
          studentRecord: {
            include: { user: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  if (actorUserId) {
    await foAuditService.logFinanceAction({
      actorUserId,
      actorName: 'Finance Officer',
      action: `Matched Payment Transaction ${id} with Receipt ${receiptIdToUse}`,
      module: 'Reconciliation',
      amount: Math.abs(updated.amount),
    });
  }

  return {
    id: updated.id,
    status: 'Matched' as const,
    matchedReceiptId: updated.receiptId,
    studentName: updated.financialAccount?.studentRecord?.user?.fullName || 'Student',
  };
}

export async function flagReconciliation(id: string, notes?: string, actorUserId?: string) {
  const updated = await prisma.financialTransaction.update({
    where: { id },
    data: {
      status: 'PENDING',
      description: notes || 'Flagged for reconciliation review',
    },
  });

  if (actorUserId) {
    await foAuditService.logFinanceAction({
      actorUserId,
      actorName: 'Finance Officer',
      action: `Flagged Transaction ${id} for Review: ${notes || 'N/A'}`,
      module: 'Reconciliation',
      status: 'Warning',
    });
  }

  return {
    id: updated.id,
    status: 'Pending Review' as const,
    reviewNotes: updated.description,
  };
}

export async function runAutoMatchReconciliation(actorUserId?: string) {
  const unmatched = await prisma.financialTransaction.findMany({
    where: {
      OR: [{ type: 'PAYMENT' }, { amount: { lt: 0 } }],
      receiptId: null,
      status: { not: 'REVERSED' },
    },
  });

  let matchedCount = 0;
  for (const tx of unmatched) {
    const autoReceiptId = `REC-AUTO-${tx.id.slice(0, 6).toUpperCase()}`;
    await prisma.financialTransaction.update({
      where: { id: tx.id },
      data: {
        status: 'POSTED',
        receiptId: autoReceiptId,
      },
    });
    matchedCount++;
  }

  if (actorUserId && matchedCount > 0) {
    await foAuditService.logFinanceAction({
      actorUserId,
      actorName: 'Finance Officer',
      action: `Executed Auto-Match: ${matchedCount} transactions matched`,
      module: 'Reconciliation',
    });
  }

  return {
    success: true,
    matchedCount,
    message: `Auto-matched ${matchedCount} payment transactions to official receipts.`,
  };
}

