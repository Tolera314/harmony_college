import { prisma } from '../../lib/prisma';

export interface AuditEntryData {
  actorUserId?: string | null;
  actorName:    string;
  action:       string;
  module?:      string | null;
  studentId?:   string | null;
  studentName?: string | null;
  amount?:      number | null;
  previousValue?: string | null;
  newValue?:      string | null;
  status?:        'Success' | 'Warning' | 'Failed';
  ipAddress?:     string | null;
}

/**
 * Writes a Finance Officer action to the shared AuditLog table.
 * Uses PROFILE_COMPLETED action as a generic "custom event" carrier
 * with metadata for the FO-specific fields, keeping the schema unchanged.
 */
export async function logFinanceAction(data: AuditEntryData) {
  if (!data.actorUserId) return; // can't write without a user id

  try {
    await prisma.auditLog.create({
      data: {
        userId:   data.actorUserId,
        action:   'PROFILE_COMPLETED',    // closest available enum value
        metadata: {
          financeAction:  data.action,
          module:         data.module  ?? 'Finance',
          studentId:      data.studentId  ?? null,
          studentName:    data.studentName ?? null,
          amount:         data.amount ?? null,
          previousValue:  data.previousValue ?? null,
          newValue:       data.newValue ?? null,
          status:         data.status ?? 'Success',
          actorName:      data.actorName,
        },
        ipAddress: data.ipAddress?.slice(0, 45) ?? null,
      },
    });
  } catch { /* audit must never crash the caller */ }
}

export async function getAuditLogs(params: {
  search?: string;
  status?: string;
  page?:   number;
  limit?:  number;
}) {
  const page  = Math.max(1, params.page  ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip  = (page - 1) * limit;

  // Finance audit logs are AuditLog rows whose metadata.financeAction exists
  const where: any = {
    action:   'PROFILE_COMPLETED',
    metadata: { path: ['financeAction'], not: null },
  };

  if (params.status) {
    where.metadata = { path: ['status'], equals: params.status };
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  const mapped = logs.map((l) => {
    const meta = (l.metadata ?? {}) as Record<string, any>;
    const d    = new Date(l.createdAt);
    // Apply search filter client-side (Prisma JSON path search is limited)
    return {
      id:            l.id,
      date:          d.toISOString().split('T')[0],
      time:          d.toTimeString().split(' ')[0].slice(0, 5),
      actorUserId:   l.userId,
      actorName:     meta.actorName  ?? l.user?.fullName ?? 'Finance Officer',
      action:        meta.financeAction ?? 'Finance Action',
      module:        meta.module        ?? 'Finance',
      studentId:     meta.studentId     ?? null,
      studentName:   meta.studentName   ?? null,
      amount:        meta.amount        ?? null,
      previousValue: meta.previousValue ?? null,
      newValue:      meta.newValue      ?? null,
      status:        meta.status        ?? 'Success',
      ipAddress:     l.ipAddress        ?? '—',
      createdAt:     l.createdAt,
    };
  }).filter((l) => {
    if (!params.search) return true;
    const s = params.search.toLowerCase();
    return (
      l.action.toLowerCase().includes(s)     ||
      l.actorName.toLowerCase().includes(s)  ||
      (l.studentName ?? '').toLowerCase().includes(s)
    );
  });

  return {
    total:      mapped.length,   // post-filter count
    page, limit,
    totalPages: Math.ceil(mapped.length / limit),
    logs:       mapped,
  };
}
