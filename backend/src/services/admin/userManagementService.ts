/**
 * Harmony College — Admin User Management Service
 * ─────────────────────────────────────────────────
 * All business logic for admin user CRUD, sessions, stats, notifications,
 * departments, and programs. Routes delegate here; no Prisma in route handlers.
 */

import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import {
  Role, AccountStatus, AuditAction,
  PASSWORD_BCRYPT_ROUNDS,
  STAFF_ROLES,
} from '../../types/auth';

// ─────────────────────────────────────────────────────────────────────────────
// SAFE SELECT — never return passwordHash or refreshTokenHash
// ─────────────────────────────────────────────────────────────────────────────

const SAFE_USER_SELECT = {
  id:                  true,
  fullName:            true,
  email:               true,
  phone:               true,
  role:                true,
  status:              true,
  emailVerified:       true,
  phoneVerified:       true,
  profileCompleted:    true,
  profileCompletion:   true,
  failedLoginAttempts: true,
  lastLoginAt:         true,
  createdAt:           true,
  updatedAt:           true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface UserListQuery {
  page:        number;
  limit:       number;
  search?:     string;
  role?:       Role;
  status?:     AccountStatus;
  sortBy?:     string;
  sortOrder?:  'asc' | 'desc';
}

export interface CreateStaffInput {
  fullName:  string;
  email?:    string;
  phone?:    string;
  password:  string;
  role:      Role;
}

export interface UpdateUserInput {
  fullName?: string;
  email?:    string;
  phone?:    string;
  role?:     Role;
}

export interface DashboardStats {
  totalUsers:          number;
  usersByRole:         Record<string, number>;
  usersByStatus:       Record<string, number>;
  newUsersToday:       number;
  newUsersThisWeek:    number;
  newUsersThisMonth:   number;
  activeSessions:      number;
  loginSuccessToday:   number;
  loginFailedToday:    number;
  recentAuditLogs:     RecentAuditLog[];
}

interface RecentAuditLog {
  id:        string;
  action:    string;
  userId:    string | null;
  ipAddress: string | null;
  createdAt: Date;
  user:      { fullName: string; role: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — audit log writer (fire-and-forget)
// ─────────────────────────────────────────────────────────────────────────────

async function writeAudit(
  action:    AuditAction,
  userId:    string,
  ipAddress: string | null = null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        ipAddress: ipAddress?.slice(0, 45) ?? null,
        metadata:  metadata ? (metadata as object) : undefined,
      },
    });
  } catch { /* audit must never crash the caller */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST USERS
// ─────────────────────────────────────────────────────────────────────────────

export async function listUsers(q: UserListQuery) {
  const { page, limit, search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (role)   where.role   = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email:    { contains: search, mode: 'insensitive' } },
      { phone:    { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy: any =
    sortBy === 'fullName' ? { fullName: sortOrder } :
    sortBy === 'email'    ? { email:    sortOrder } :
    sortBy === 'role'     ? { role:     sortOrder } :
    sortBy === 'status'   ? { status:   sortOrder } :
                            { createdAt: sortOrder };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, skip, take: limit, orderBy,
      select: {
        ...SAFE_USER_SELECT,
        _count: { select: { sessions: { where: { isRevoked: false, expiresAt: { gt: new Date() } } } } },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    users: users.map(u => ({
      ...u,
      activeSessions: u._count.sessions,
      _count: undefined,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET USER BY ID (full detail)
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...SAFE_USER_SELECT,
      oauthAccounts: { select: { provider: true, providerAccountId: true, createdAt: true } },
      sessions: {
        where: { isRevoked: false, expiresAt: { gt: new Date() } },
        select: { id: true, deviceInfo: true, ipAddress: true, lastUsedAt: true, createdAt: true, expiresAt: true },
        orderBy: { lastUsedAt: 'desc' },
      },
      auditLogs: {
        select: { id: true, action: true, ipAddress: true, userAgent: true, metadata: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      studentRecord: {
        select: {
          id: true, studentId: true, status: true, yearLevel: true, gpa: true, totalCredits: true,
          program: { select: { name: true, code: true } },
          department: { select: { name: true } },
        },
      },
    },
  });

  if (!user) throw new Error('User not found');
  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE STAFF USER
// ─────────────────────────────────────────────────────────────────────────────

export async function createStaffUser(
  data:            CreateStaffInput,
  createdByUserId: string,
  ipAddress:       string | null = null
) {
  if (!STAFF_ROLES.includes(data.role)) {
    throw new Error(`Role ${data.role} cannot be assigned via staff account creation.`);
  }

  // Check uniqueness
  if (data.email) {
    const exists = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (exists) throw new Error('An account with this email already exists.');
  }
  if (data.phone) {
    const exists = await prisma.user.findUnique({ where: { phone: data.phone }, select: { id: true } });
    if (exists) throw new Error('An account with this phone number already exists.');
  }

  const passwordHash = await bcrypt.hash(data.password, PASSWORD_BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName:            data.fullName.trim(),
      email:               data.email?.toLowerCase().trim() ?? null,
      phone:               data.phone?.trim() ?? null,
      passwordHash,
      role:                data.role,
      status:              AccountStatus.ACTIVE,
      emailVerified:       !!data.email,
      phoneVerified:       !!data.phone,
      profileCompleted:    true,
      profileCompletion:   100,
      failedLoginAttempts: 0,
    },
    select: SAFE_USER_SELECT,
  });

  await writeAudit(AuditAction.ROLE_CHANGED, createdByUserId, ipAddress, {
    event:       'staff_account_created',
    newUserId:   user.id,
    newUserRole: user.role,
  });

  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE USER
// ─────────────────────────────────────────────────────────────────────────────

export async function updateUser(
  id:          string,
  data:        UpdateUserInput,
  callerRole:  Role,
  callerId:    string,
  ipAddress:   string | null = null
) {
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, email: true, phone: true } });
  if (!target) throw new Error('User not found');

  // SUPER_ADMIN promotion/demotion guard
  if (data.role) {
    const touchingSuperAdmin =
      target.role === Role.SUPER_ADMIN || data.role === Role.SUPER_ADMIN;
    if (touchingSuperAdmin && callerRole !== Role.SUPER_ADMIN) {
      throw new Error('Only a Super Admin can change the Super Admin role.');
    }
  }

  // Email uniqueness
  if (data.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), id: { not: id } },
      select: { id: true },
    });
    if (conflict) throw new Error('Email is already in use by another account.');
  }

  // Phone uniqueness
  if (data.phone) {
    const conflict = await prisma.user.findFirst({
      where: { phone: data.phone, id: { not: id } },
      select: { id: true },
    });
    if (conflict) throw new Error('Phone number is already in use by another account.');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.fullName && { fullName: data.fullName.trim() }),
      ...(data.email    && { email:    data.email.toLowerCase().trim() }),
      ...(data.phone    && { phone:    data.phone.trim() }),
      ...(data.role     && { role:     data.role }),
    },
    select: SAFE_USER_SELECT,
  });

  if (data.role && data.role !== target.role) {
    await writeAudit(AuditAction.ROLE_CHANGED, callerId, ipAddress, {
      targetUserId: id,
      oldRole:      target.role,
      newRole:      data.role,
    });
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE USER STATUS
// ─────────────────────────────────────────────────────────────────────────────

export async function updateUserStatus(
  id:         string,
  status:     AccountStatus,
  reason:     string | undefined,
  callerId:   string,
  callerRole: Role,
  ipAddress:  string | null = null
) {
  if (id === callerId) throw new Error('You cannot change your own account status.');

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, status: true } });
  if (!target) throw new Error('User not found');

  if (target.role === Role.SUPER_ADMIN && callerRole !== Role.SUPER_ADMIN) {
    throw new Error('Only a Super Admin can change a Super Admin account status.');
  }

  const data: any = { status };

  // Reset failed attempts when unlocking / re-activating
  if (status === AccountStatus.ACTIVE) {
    data.failedLoginAttempts = 0;
  }

  // Revoke all sessions when suspending or deactivating
  if (status === AccountStatus.SUSPENDED || status === AccountStatus.DEACTIVATED) {
    await prisma.session.updateMany({
      where: { userId: id },
      data:  { isRevoked: true },
    });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: SAFE_USER_SELECT,
  });

  const actionMap: Partial<Record<AccountStatus, AuditAction>> = {
    [AccountStatus.SUSPENDED]:   AuditAction.ACCOUNT_SUSPENDED,
    [AccountStatus.DEACTIVATED]: AuditAction.ACCOUNT_DEACTIVATED,
    [AccountStatus.LOCKED]:      AuditAction.ACCOUNT_LOCKED,
    [AccountStatus.ACTIVE]:      AuditAction.ACCOUNT_UNLOCKED,
  };

  const auditAction = actionMap[status];
  if (auditAction) {
    await writeAudit(auditAction, callerId, ipAddress, {
      targetUserId: id,
      reason,
      previousStatus: target.status,
    });
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOFT DELETE (DEACTIVATE)
// ─────────────────────────────────────────────────────────────────────────────

export async function softDeleteUser(
  id:         string,
  callerId:   string,
  callerRole: Role,
  ipAddress:  string | null = null
) {
  if (id === callerId) throw new Error('You cannot deactivate your own account.');

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) throw new Error('User not found');

  if (target.role === Role.SUPER_ADMIN && callerRole !== Role.SUPER_ADMIN) {
    throw new Error('Only a Super Admin can deactivate a Super Admin account.');
  }

  // Revoke all sessions
  await prisma.session.updateMany({
    where: { userId: id },
    data:  { isRevoked: true },
  });

  const updated = await prisma.user.update({
    where: { id },
    data:  { status: AccountStatus.DEACTIVATED },
    select: SAFE_USER_SELECT,
  });

  await writeAudit(AuditAction.ACCOUNT_DEACTIVATED, callerId, ipAddress, {
    targetUserId: id,
    targetRole:   target.role,
  });

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserSessions(userId: string) {
  return prisma.session.findMany({
    where:   { userId, isRevoked: false, expiresAt: { gt: new Date() } },
    select:  { id: true, deviceInfo: true, ipAddress: true, lastUsedAt: true, createdAt: true, expiresAt: true },
    orderBy: { lastUsedAt: 'desc' },
  });
}

export async function revokeAllUserSessions(userId: string) {
  const result = await prisma.session.updateMany({
    where: { userId, isRevoked: false },
    data:  { isRevoked: true },
  });
  return { revokedCount: result.count };
}

export async function revokeSingleSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where:  { id: sessionId },
    select: { id: true, userId: true, isRevoked: true },
  });
  if (!session) throw new Error('Session not found');
  if (session.isRevoked) throw new Error('Session is already revoked');

  await prisma.session.update({
    where: { id: sessionId },
    data:  { isRevoked: true },
  });
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const now        = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    roleGroups,
    statusGroups,
    newToday,
    newThisWeek,
    newThisMonth,
    activeSessions,
    loginSuccess,
    loginFailed,
    recentLogs,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.groupBy({ by: ['role'],   _count: { id: true } }),
    prisma.user.groupBy({ by: ['status'], _count: { id: true } }),

    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart  } } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),

    prisma.session.count({ where: { isRevoked: false, expiresAt: { gt: now } } }),

    prisma.auditLog.count({ where: { action: AuditAction.LOGIN_SUCCESS, createdAt: { gte: todayStart } } }),
    prisma.auditLog.count({ where: { action: AuditAction.LOGIN_FAILED,  createdAt: { gte: todayStart } } }),

    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, action: true, userId: true, ipAddress: true, createdAt: true,
        user: { select: { fullName: true, role: true } },
      },
    }),
  ]);

  const usersByRole:   Record<string, number> = {};
  const usersByStatus: Record<string, number> = {};

  for (const g of roleGroups)   usersByRole[g.role]     = g._count.id;
  for (const g of statusGroups) usersByStatus[g.status] = g._count.id;

  return {
    totalUsers,
    usersByRole,
    usersByStatus,
    newUsersToday:     newToday,
    newUsersThisWeek:  newThisWeek,
    newUsersThisMonth: newThisMonth,
    activeSessions,
    loginSuccessToday: loginSuccess,
    loginFailedToday:  loginFailed,
    recentAuditLogs:   recentLogs.map(l => ({
      id:        l.id,
      action:    l.action,
      userId:    l.userId,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      user:      l.user ? { fullName: l.user.fullName, role: l.user.role } : null,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLogQuery {
  page:       number;
  limit:      number;
  userId?:    string;
  action?:    string;
  from?:      string;
  to?:        string;
  ipAddress?: string;
}

export async function listAuditLogs(q: AuditLogQuery) {
  const { page, limit, userId, action, from, to, ipAddress } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (userId)    where.userId    = userId;
  if (action)    where.action    = action;
  if (ipAddress) where.ipAddress = { contains: ipAddress };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to)   where.createdAt.lte = new Date(to);
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, action: true, userId: true, ipAddress: true,
        userAgent: true, metadata: true, createdAt: true,
        user: { select: { fullName: true, email: true, role: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), logs };
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationQuery {
  page?:       number;
  limit?:      number;
  userId?:     string;
  unreadOnly?: boolean;
}

export async function listNotifications(q: NotificationQuery) {
  const page  = q.page  ?? 1;
  const limit = q.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = {};
  if (q.userId)    where.userId = q.userId;
  if (q.unreadOnly) where.isRead = false;

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), notifications };
}

export async function createNotification(data: {
  userId:      string;
  title:       string;
  message:     string;
  type?:       string;
  entityType?: string;
  entityId?:   string;
}) {
  return prisma.notification.create({
    data: {
      userId:     data.userId,
      title:      data.title,
      message:    data.message,
      type:       data.type       ?? 'INFO',
      entityType: data.entityType ?? null,
      entityId:   data.entityId   ?? null,
    },
  });
}

export async function broadcastNotification(data: {
  title:       string;
  message:     string;
  type?:       string;
  role?:       Role;
  entityType?: string;
  entityId?:   string;
}) {
  const where: any = { status: AccountStatus.ACTIVE };
  if (data.role) where.role = data.role;

  const users = await prisma.user.findMany({ where, select: { id: true } });

  const result = await prisma.notification.createMany({
    data: users.map(u => ({
      userId:     u.id,
      title:      data.title,
      message:    data.message,
      type:       data.type       ?? 'INFO',
      entityType: data.entityType ?? null,
      entityId:   data.entityId   ?? null,
    })),
  });

  return { sent: result.count };
}

export async function markNotificationRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data:  { isRead: true },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────────────────────

export async function listDepartments() {
  return prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { programs: true, courses: true, instructors: true } },
    },
  });
}

export async function createDepartment(data: {
  name:         string;
  code:         string;
  description?: string;
}) {
  const nameConflict = await prisma.department.findUnique({ where: { name: data.name }, select: { id: true } });
  if (nameConflict) throw new Error('A department with this name already exists.');

  const codeConflict = await prisma.department.findUnique({ where: { code: data.code }, select: { id: true } });
  if (codeConflict) throw new Error('A department with this code already exists.');

  return prisma.department.create({
    data: {
      name:        data.name.trim(),
      code:        data.code.trim().toUpperCase(),
      description: data.description?.trim() ?? null,
    },
  });
}

export async function updateDepartment(
  id:   string,
  data: { name?: string; description?: string; isActive?: boolean }
) {
  const dept = await prisma.department.findUnique({ where: { id }, select: { id: true } });
  if (!dept) throw new Error('Department not found');

  return prisma.department.update({
    where: { id },
    data: {
      ...(data.name        !== undefined && { name:        data.name.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.isActive    !== undefined && { isActive:    data.isActive }),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMS
// ─────────────────────────────────────────────────────────────────────────────

export async function listPrograms(departmentId?: string) {
  return prisma.program.findMany({
    where:   departmentId ? { departmentId } : undefined,
    orderBy: { name: 'asc' },
    include: {
      department: { select: { id: true, name: true, code: true } },
      _count:     { select: { studentRecords: true, courses: true } },
    },
  });
}

export async function createProgram(data: {
  name:          string;
  code:          string;
  description?:  string;
  durationYears?: number;
  totalCredits?:  number;
  departmentId:  string;
}) {
  const codeConflict = await prisma.program.findUnique({ where: { code: data.code }, select: { id: true } });
  if (codeConflict) throw new Error('A program with this code already exists.');

  return prisma.program.create({
    data: {
      name:          data.name.trim(),
      code:          data.code.trim().toUpperCase(),
      description:   data.description?.trim() ?? null,
      durationYears: data.durationYears ?? 4,
      totalCredits:  data.totalCredits  ?? 120,
      departmentId:  data.departmentId,
    },
    include: { department: { select: { id: true, name: true, code: true } } },
  });
}

export async function updateProgram(
  id:   string,
  data: { name?: string; description?: string; durationYears?: number; totalCredits?: number; isActive?: boolean }
) {
  const prog = await prisma.program.findUnique({ where: { id }, select: { id: true } });
  if (!prog) throw new Error('Program not found');

  return prisma.program.update({
    where: { id },
    data: {
      ...(data.name          !== undefined && { name:          data.name.trim() }),
      ...(data.description   !== undefined && { description:   data.description.trim() }),
      ...(data.durationYears !== undefined && { durationYears: data.durationYears }),
      ...(data.totalCredits  !== undefined && { totalCredits:  data.totalCredits }),
      ...(data.isActive      !== undefined && { isActive:      data.isActive }),
    },
    include: { department: { select: { id: true, name: true, code: true } } },
  });
}
