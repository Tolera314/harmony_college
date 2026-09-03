import { prisma } from '../../lib/prisma';
import { AuditAction, AccountStatus } from '@prisma/client';

export interface AdminSecurityStats {
  activeSessions: number;
  lockedAccounts: number;
  failedLogins24h: number;
  mfaEnabledCount: number;
  totalUsers: number;
}

export async function getSecurityStats(): Promise<AdminSecurityStats> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  const [activeSessions, lockedAccounts, failedLogins24h, totalUsers] = await Promise.all([
    prisma.session.count({
      where: {
        isRevoked: false,
        expiresAt: { gt: now },
      },
    }),
    prisma.user.count({
      where: {
        OR: [
          { failedLoginAttempts: { gte: 5 } },
          { status: AccountStatus.LOCKED },
          { status: AccountStatus.SUSPENDED },
        ],
      },
    }),
    prisma.auditLog.count({
      where: {
        action: AuditAction.LOGIN_FAILED,
        createdAt: { gte: twentyFourHoursAgo },
      },
    }),
    prisma.user.count(),
  ]);

  return {
    activeSessions,
    lockedAccounts,
    failedLogins24h,
    mfaEnabledCount: 0, // placeholder
    totalUsers,
  };
}

export async function listActiveSessions(params: { page?: number; limit?: number; search?: string }) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const search = params.search?.toLowerCase();
  const now = new Date();

  const where: any = {
    isRevoked: false,
    expiresAt: { gt: now },
  };

  if (search) {
    where.OR = [
      { ipAddress: { contains: search, mode: 'insensitive' } },
      { deviceInfo: { contains: search, mode: 'insensitive' } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, sessions] = await Promise.all([
    prisma.session.count({ where }),
    prisma.session.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { lastUsedAt: 'desc' },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    sessions: sessions.map(s => ({
      id: s.id,
      userId: s.userId,
      userFullName: s.user.fullName,
      userEmail: s.user.email,
      userRole: s.user.role,
      deviceInfo: s.deviceInfo || 'Unknown Device / Browser',
      ipAddress: s.ipAddress || '—',
      lastUsedAt: s.lastUsedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    })),
  };
}

export async function revokeActiveSession(sessionId: string, adminUserId: string, ipAddress?: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { fullName: true, email: true } } },
  });

  if (!session) {
    throw new Error('Session record not found');
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { isRevoked: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: AuditAction.SESSION_REVOKED,
      ipAddress,
      metadata: {
        revokedSessionId: sessionId,
        targetUserId: session.userId,
        targetUserEmail: session.user.email,
        targetUserFullName: session.user.fullName,
      },
    },
  });

  return { message: 'Session revoked successfully' };
}

export async function listLockedAccounts() {
  const lockedUsers = await prisma.user.findMany({
    where: {
      OR: [
        { failedLoginAttempts: { gte: 5 } },
        { status: AccountStatus.LOCKED },
        { status: AccountStatus.SUSPENDED },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      failedLoginAttempts: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return lockedUsers.map(u => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    accountStatus: u.status,
    failedLoginCount: u.failedLoginAttempts,
    lockedUntil: null,
    updatedAt: u.updatedAt.toISOString(),
  }));
}

export async function unlockUserAccount(targetUserId: string, adminUserId: string, ipAddress?: string) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      failedLoginAttempts: 0,
      status: AccountStatus.ACTIVE,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action: AuditAction.ACCOUNT_UNLOCKED,
      ipAddress,
      metadata: {
        unlockedUserId: targetUserId,
        unlockedUserEmail: user.email,
        unlockedUserFullName: user.fullName,
      },
    },
  });

  return { message: `Account for ${user.fullName} unlocked successfully` };
}
