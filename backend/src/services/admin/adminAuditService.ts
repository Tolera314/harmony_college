import { prisma } from '../../lib/prisma';

export interface AdminAuditItem {
  id: string;
  action: string;
  module: string;
  actorName: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  createdAt: string;
}

export async function getAuditStats() {
  const [totalLogs, hrLogs, dhLogs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.hRAuditLog.count(),
    prisma.departmentHeadAuditLog.count(),
  ]);

  const authLogs = await prisma.auditLog.count({
    where: {
      action: {
        in: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'SESSION_REVOKED'] as any,
      },
    },
  });

  const financeLogs = await prisma.auditLog.count({
    where: {
      action: {
        in: ['STAFF_INVITATION_CREATED', 'STAFF_INVITATION_ACCEPTED', 'ROLE_CHANGED'] as any,
      },
    },
  });

  return {
    totalLogs: totalLogs + hrLogs + dhLogs,
    authLogs,
    financeLogs,
    hrLogs,
  };
}

export async function listAdminAuditLogs(params: {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const search = params.search?.toLowerCase();
  const moduleFilter = params.module;

  const items: AdminAuditItem[] = [];

  // 1. General Audit Logs (Auth, Admin, Finance)
  if (!moduleFilter || moduleFilter === 'AUTHENTICATION' || moduleFilter === 'USER_MANAGEMENT' || moduleFilter === 'FINANCE') {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { fullName: true, email: true, role: true } },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    for (const log of logs) {
      const actorName = log.user?.fullName || 'System / Anonymous';
      const actorEmail = log.user?.email || null;
      const actionStr = String(log.action);

      let mod = 'USER_MANAGEMENT';
      if (['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'SESSION_REVOKED', 'PASSWORD_CHANGED', 'EMAIL_VERIFIED', 'PHONE_VERIFIED'].includes(actionStr)) {
        mod = 'AUTHENTICATION';
      } else if (actionStr.includes('FINANCIAL') || actionStr.includes('PAYMENT') || actionStr.includes('CLEARANCE')) {
        mod = 'FINANCE';
      }

      if (moduleFilter && mod !== moduleFilter) continue;
      if (search && !actionStr.toLowerCase().includes(search) && !actorName.toLowerCase().includes(search) && !actorEmail?.toLowerCase().includes(search) && !log.ipAddress?.toLowerCase().includes(search)) {
        continue;
      }

      items.push({
        id: log.id,
        action: actionStr,
        module: mod,
        actorName,
        actorEmail,
        actorRole: log.user?.role || 'USER',
        actorUserId: log.userId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      });
    }
  }

  // 2. HR Audit Logs
  if (!moduleFilter || moduleFilter === 'HR') {
    const hrLogs = await prisma.hRAuditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    for (const log of hrLogs) {
      if (search && !log.action.toLowerCase().includes(search) && !log.actorName.toLowerCase().includes(search) && !log.description.toLowerCase().includes(search)) {
        continue;
      }

      items.push({
        id: log.id,
        action: log.action,
        module: 'HR',
        actorName: log.actorName,
        actorEmail: null,
        actorRole: 'HR_OFFICER',
        actorUserId: log.actorUserId,
        ipAddress: null,
        userAgent: null,
        metadata: { description: log.description, employeeName: log.employeeName, metadata: log.metadata },
        createdAt: log.createdAt.toISOString(),
      });
    }
  }

  // 3. Department Head Audit Logs
  if (!moduleFilter || moduleFilter === 'ACADEMICS') {
    const dhLogs = await prisma.departmentHeadAuditLog.findMany({
      include: {
        user: { select: { fullName: true, email: true, role: true } },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    for (const log of dhLogs) {
      const actorName = log.user?.fullName || 'Department Head';
      if (search && !log.action.toLowerCase().includes(search) && !actorName.toLowerCase().includes(search) && !log.description.toLowerCase().includes(search)) {
        continue;
      }

      items.push({
        id: log.id,
        action: log.action,
        module: 'ACADEMICS',
        actorName,
        actorEmail: log.user?.email || null,
        actorRole: log.user?.role || 'DEPARTMENT_HEAD',
        actorUserId: log.userId,
        ipAddress: log.ipAddress,
        userAgent: null,
        metadata: { description: log.description, entityType: log.entityType, entityId: log.entityId, metadata: log.metadata },
        createdAt: log.createdAt.toISOString(),
      });
    }
  }

  // Sort by date descending
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = items.slice((page - 1) * limit, page * limit);

  return {
    total,
    page,
    limit,
    totalPages,
    logs: paginated,
  };
}
