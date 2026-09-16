import { prisma } from '../../lib/prisma';

export interface AuditEntryData {
  actorUserId?: string | null;
  actorName: string;
  action: string;
  module?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  amount?: number | null;
  previousValue?: string | null;
  newValue?: string | null;
  status?: 'Success' | 'Warning' | 'Failed';
  ipAddress?: string | null;
}

export interface FOAuditStoreItem {
  id: string;
  date: string;
  time: string;
  actorUserId?: string | null;
  actorName: string;
  action: string;
  module: string;
  studentId: string | null;
  studentName: string | null;
  amount: number | null;
  previousValue: string | null;
  newValue: string | null;
  status: 'Success' | 'Warning' | 'Failed';
  ipAddress: string;
  createdAt: Date;
}

const auditLogsStore: FOAuditStoreItem[] = [
  {
    id: 'AUD-FO-101',
    date: new Date().toISOString().split('T')[0],
    time: '08:30',
    actorUserId: 'usr-fo-001',
    actorName: 'Finance Officer',
    action: 'Verified Registration Fee Payment',
    module: 'Admissions & Verifications',
    studentId: 'HC/2026/0012',
    studentName: 'Abebe Bikila',
    amount: 1500,
    previousValue: 'Unverified',
    newValue: 'Verified',
    status: 'Success',
    ipAddress: '192.168.1.45',
    createdAt: new Date(),
  },
  {
    id: 'AUD-FO-102',
    date: new Date().toISOString().split('T')[0],
    time: '09:15',
    actorUserId: 'usr-fo-001',
    actorName: 'Finance Officer',
    action: 'Posted Tuition Payment',
    module: 'Student Accounts',
    studentId: 'HC/2026/0045',
    studentName: 'Tigist Assefa',
    amount: 18500,
    previousValue: 'Outstanding: ETB 18,500',
    newValue: 'Balance Cleared: ETB 0',
    status: 'Success',
    ipAddress: '192.168.1.45',
    createdAt: new Date(),
  },
  {
    id: 'AUD-FO-103',
    date: new Date().toISOString().split('T')[0],
    time: '10:04',
    actorUserId: 'usr-fo-001',
    actorName: 'Finance Officer',
    action: 'Auto-Matched Reconciliation Entry',
    module: 'Reconciliation',
    studentId: 'HC/2026/0089',
    studentName: 'Dawit Solomon',
    amount: 12000,
    previousValue: 'Unmatched Gateway Txn TXN-CH-88401',
    newValue: 'Matched to Receipt REC-2026-004',
    status: 'Success',
    ipAddress: '192.168.1.45',
    createdAt: new Date(),
  },
  {
    id: 'AUD-FO-104',
    date: new Date().toISOString().split('T')[0],
    time: '11:20',
    actorUserId: 'usr-fo-001',
    actorName: 'Finance Officer',
    action: 'Flagged Discrepancy on Telebirr Payment',
    module: 'Reconciliation',
    studentId: 'HC/2026/0102',
    studentName: 'Makeda Bekele',
    amount: 4500,
    previousValue: 'Pending Match',
    newValue: 'Flagged for Review: Gateway Reference Mismatch',
    status: 'Warning',
    ipAddress: '192.168.1.45',
    createdAt: new Date(),
  },
  {
    id: 'AUD-FO-105',
    date: new Date().toISOString().split('T')[0],
    time: '14:10',
    actorUserId: 'usr-fo-001',
    actorName: 'Finance Officer',
    action: 'Reversed Duplicate Payment Transaction',
    module: 'Payments & Collections',
    studentId: 'HC/2026/0033',
    studentName: 'Yonas Haile',
    amount: 6000,
    previousValue: 'Payment Posted',
    newValue: 'Transaction Reversed & Credited',
    status: 'Warning',
    ipAddress: '192.168.1.45',
    createdAt: new Date(),
  },
  {
    id: 'AUD-FO-106',
    date: new Date().toISOString().split('T')[0],
    time: '15:45',
    actorUserId: 'usr-fo-001',
    actorName: 'Finance Officer',
    action: 'Failed Gateway Handshake Attempt',
    module: 'Payment Gateways',
    studentId: null,
    studentName: null,
    amount: 0,
    previousValue: 'Connection Request',
    newValue: 'Timeout: Gateway Gateway Response 504',
    status: 'Failed',
    ipAddress: '192.168.1.45',
    createdAt: new Date(),
  },
];

export async function logFinanceAction(data: AuditEntryData): Promise<FOAuditStoreItem> {
  const entry: FOAuditStoreItem = {
    id: `AUD-FO-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].slice(0, 5),
    actorUserId: data.actorUserId || 'usr-fo-001',
    actorName: data.actorName || 'Finance Officer',
    action: data.action,
    module: data.module || 'Finance',
    studentId: data.studentId || null,
    studentName: data.studentName || null,
    amount: data.amount ?? null,
    previousValue: data.previousValue ?? null,
    newValue: data.newValue ?? null,
    status: data.status || 'Success',
    ipAddress: data.ipAddress || '127.0.0.1',
    createdAt: new Date(),
  };

  auditLogsStore.unshift(entry);
  return entry;
}

export async function getAuditLogs(params: { search?: string; module?: string; status?: string; page?: number; limit?: number }) {
  let filtered = [...auditLogsStore];

  if (params.module && params.module !== 'All') {
    filtered = filtered.filter((a) => a.module === params.module);
  }
  if (params.status && params.status !== 'All') {
    filtered = filtered.filter((a) => a.status === params.status);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.action.toLowerCase().includes(s) ||
        a.actorName.toLowerCase().includes(s) ||
        a.module.toLowerCase().includes(s) ||
        (a.studentName && a.studentName.toLowerCase().includes(s)) ||
        (a.studentId && a.studentId.toLowerCase().includes(s)) ||
        (a.ipAddress && a.ipAddress.toLowerCase().includes(s))
    );
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const paginated = filtered.slice(skip, skip + limit);

  const summary = {
    total: auditLogsStore.length,
    successCount: auditLogsStore.filter((a) => a.status === 'Success').length,
    warningCount: auditLogsStore.filter((a) => a.status === 'Warning').length,
    failedCount: auditLogsStore.filter((a) => a.status === 'Failed').length,
  };

  return {
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
    auditLogs: paginated,
    summary,
  };
}
