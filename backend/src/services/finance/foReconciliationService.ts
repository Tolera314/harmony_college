import { prisma } from '../../lib/prisma';

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

const mockReconciliations: ReconciliationEntryItem[] = [
  {
    id: 'REC-001',
    gatewayTxnId: 'TXN-TB-99201',
    studentId: 'HC/2026/0012',
    studentName: 'Abebe Bikila',
    source: 'Telebirr',
    amount: 18500,
    status: 'Matched',
    date: '2026-08-20',
    time: '14:22',
    matchedReceiptId: 'REC-A91F2',
  },
  {
    id: 'REC-002',
    gatewayTxnId: 'TXN-CP-44812',
    studentId: 'HC/2026/0045',
    studentName: 'Tigist Assefa',
    source: 'Chapa',
    amount: 12500,
    status: 'Unmatched',
    date: '2026-08-21',
    time: '10:15',
    matchedReceiptId: null,
    failureReason: 'Student ID not included in gateway transfer payload',
  },
  {
    id: 'REC-003',
    gatewayTxnId: 'TXN-CBE-77123',
    studentId: 'HC/2026/0089',
    studentName: 'Kebede Michael',
    source: 'Bank Transfer',
    amount: 8500,
    status: 'Pending Review',
    date: '2026-08-21',
    time: '16:40',
    matchedReceiptId: null,
    reviewNotes: 'Deposit slip verified by bank clerk',
  },
  {
    id: 'REC-004',
    gatewayTxnId: 'TXN-TB-88319',
    studentId: null,
    studentName: null,
    source: 'Telebirr',
    amount: 3200,
    status: 'Failed',
    date: '2026-08-22',
    time: '09:05',
    matchedReceiptId: null,
    failureReason: 'Transaction reversed by sender bank',
  },
];

export async function listReconciliationEntries(params: { status?: string; search?: string }) {
  let filtered = [...mockReconciliations];

  if (params.status) {
    filtered = filtered.filter((item) => item.status === params.status);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
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

export async function matchReconciliation(id: string, matchedReceiptId: string, actorUserId: string) {
  const item = mockReconciliations.find((r) => r.id === id);
  if (!item) throw new Error('Reconciliation record not found');

  item.status = 'Matched';
  item.matchedReceiptId = matchedReceiptId;
  return item;
}

export async function flagReconciliation(id: string, notes: string, actorUserId: string) {
  const item = mockReconciliations.find((r) => r.id === id);
  if (!item) throw new Error('Reconciliation record not found');

  item.status = 'Pending Review';
  item.reviewNotes = notes;
  return item;
}
