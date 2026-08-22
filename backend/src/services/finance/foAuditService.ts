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

  try {
    if (data.actorUserId) {
      await prisma.auditLog.create({
        data: {
          userId: data.actorUserId,
          action: 'PROFILE_COMPLETED',
          metadata: {
            financeAction: data.action,
            amount: data.amount,
            studentId: data.studentId,
          },
        },
      });
    }
  } catch { /* ignore db fallback errors */ }

  return entry;
}

export async function getAuditLogs(params: { search?: string; status?: string; page?: number; limit?: number }) {
  let filtered = [...auditLogsStore];

  if (params.status) {
    filtered = filtered.filter((a) => a.status === params.status);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.action.toLowerCase().includes(s) ||
        a.actorName.toLowerCase().includes(s) ||
        (a.studentName && a.studentName.toLowerCase().includes(s))
    );
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const paginated = filtered.slice(skip, skip + limit);

  return {
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
    auditLogs: paginated,
  };
}
