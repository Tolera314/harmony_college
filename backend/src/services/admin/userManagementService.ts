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
import { StudentStatus, CourseStatus, ApplicationStatus, OfferingStatus } from '@prisma/client';

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
  totalUsers:               number;
  totalStudents:            number;
  totalInstructors:         number;
  totalDepartments:         number;
  totalPrograms:            number;
  totalCourses:             number;
  totalPendingApplications: number;
  totalActiveOfferings:     number;
  usersByRole:              Record<string, number>;
  usersByStatus:            Record<string, number>;
  newUsersToday:            number;
  newUsersThisWeek:         number;
  newUsersThisMonth:        number;
  activeSessions:           number;
  loginSuccessToday:        number;
  loginFailedToday:         number;
  recentAuditLogs:          RecentAuditLog[];
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
    totalStudents,
    totalInstructors,
    totalDepartments,
    totalPrograms,
    totalCourses,
    totalPendingApplications,
    totalActiveOfferings,
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
    prisma.studentRecord.count(),
    prisma.instructorRecord.count(),
    prisma.department.count(),
    prisma.program.count(),
    prisma.course.count(),
    prisma.application.count({ where: { status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] } } }),
    prisma.courseOffering.count({ where: { status: OfferingStatus.ACTIVE } }),

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
    totalStudents,
    totalInstructors,
    totalDepartments,
    totalPrograms,
    totalCourses,
    totalPendingApplications,
    totalActiveOfferings,
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

export async function getDepartmentById(id: string) {
  const dept = await prisma.department.findUnique({
    where: { id },
    include: {
      programs:    { select: { id: true, name: true, code: true, isActive: true } },
      courses:     { select: { id: true, name: true, code: true, status: true } },
      instructors: { select: { id: true, employeeId: true, title: true, user: { select: { fullName: true, email: true } } } },
    },
  });
  if (!dept) throw new Error('Department not found');
  return dept;
}

export async function deleteDepartment(id: string) {
  const dept = await prisma.department.findUnique({ where: { id }, select: { id: true } });
  if (!dept) throw new Error('Department not found');
  return prisma.department.update({
    where: { id },
    data:  { isActive: false },
  });
}

export async function getProgramById(id: string) {
  const prog = await prisma.program.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      courses:    { include: { course: { select: { id: true, code: true, name: true, creditHours: true } } } },
      _count:     { select: { studentRecords: true } },
    },
  });
  if (!prog) throw new Error('Program not found');
  return prog;
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

export async function deleteProgram(id: string) {
  const prog = await prisma.program.findUnique({ where: { id }, select: { id: true } });
  if (!prog) throw new Error('Program not found');
  return prisma.program.update({
    where: { id },
    data:  { isActive: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface StudentListQuery {
  page:         number;
  limit:        number;
  search?:      string;
  programId?:   string;
  departmentId?: string;
  status?:      StudentStatus;
  yearLevel?:   number;
  sortBy?:      string;
  sortOrder?:   'asc' | 'desc';
}

export async function listStudents(q: StudentListQuery) {
  const { page, limit, search, programId, departmentId, status, yearLevel, sortBy = 'createdAt', sortOrder = 'desc' } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (programId)    where.programId    = programId;
  if (departmentId) where.departmentId = departmentId;
  if (status)       where.status       = status;
  if (yearLevel)    where.yearLevel    = yearLevel;
  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: 'insensitive' } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { email:    { contains: search, mode: 'insensitive' } } },
      { user: { phone:    { contains: search, mode: 'insensitive' } } },
    ];
  }

  const orderBy: any =
    sortBy === 'studentId' ? { studentId: sortOrder } :
    sortBy === 'gpa'       ? { gpa:       sortOrder } :
    sortBy === 'yearLevel' ? { yearLevel: sortOrder } :
                             { createdAt: sortOrder };

  const [total, students] = await Promise.all([
    prisma.studentRecord.count({ where }),
    prisma.studentRecord.findMany({
      where, skip, take: limit, orderBy,
      include: {
        user:       { select: SAFE_USER_SELECT },
        program:    { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), students };
}

export async function getStudentById(id: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id },
    include: {
      user: { select: SAFE_USER_SELECT },
      program: { select: { id: true, name: true, code: true, durationYears: true } },
      department: { select: { id: true, name: true, code: true } },
      enrollments: {
        include: {
          courseOffering: {
            include: {
              course: { select: { code: true, name: true, creditHours: true } },
              semester: { select: { name: true } },
            },
          },
          grade: true,
        },
      },
      graduationAudit: true,
      certificate: true,
    },
  });

  if (!student) throw new Error('Student record not found');
  return student;
}

export async function createStudent(
  data: {
    fullName:      string;
    email?:        string;
    phone?:        string;
    password:      string;
    programId:     string;
    departmentId:  string;
    studentId?:    string;
    yearLevel?:    number;
  },
  createdByUserId: string,
  ipAddress:       string | null = null
) {
  // Validate department & program exist
  const [dept, prog] = await Promise.all([
    prisma.department.findUnique({ where: { id: data.departmentId } }),
    prisma.program.findUnique({ where: { id: data.programId } }),
  ]);
  if (!dept) throw new Error('Selected department does not exist');
  if (!prog) throw new Error('Selected program does not exist');

  if (data.email) {
    const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) throw new Error('An account with this email already exists.');
  }

  const generatedStudentId = data.studentId?.trim() || `HC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const existingId = await prisma.studentRecord.findUnique({ where: { studentId: generatedStudentId } });
  if (existingId) throw new Error('Student ID already exists.');

  const passwordHash = await bcrypt.hash(data.password, PASSWORD_BCRYPT_ROUNDS);

  const student = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName:         data.fullName.trim(),
        email:            data.email?.toLowerCase().trim() ?? null,
        phone:            data.phone?.trim() ?? null,
        passwordHash,
        role:             Role.STUDENT,
        status:           AccountStatus.ACTIVE,
        emailVerified:    !!data.email,
        phoneVerified:    !!data.phone,
        profileCompleted: true,
      },
    });

    await tx.studentProfile.create({
      data: {
        userId: user.id,
        program: prog.name,
        selectedDepartmentId: dept.id,
      },
    });

    const record = await tx.studentRecord.create({
      data: {
        userId:       user.id,
        studentId:    generatedStudentId,
        programId:    prog.id,
        departmentId: dept.id,
        yearLevel:    data.yearLevel ?? 1,
        status:       StudentStatus.ACTIVE,
      },
      include: {
        user: { select: SAFE_USER_SELECT },
        program: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return record;
  });

  await writeAudit(AuditAction.ROLE_CHANGED, createdByUserId, ipAddress, {
    event: 'student_created_by_admin',
    studentRecordId: student.id,
    studentId: student.studentId,
  });

  return student;
}

export async function updateStudent(
  id: string,
  data: {
    fullName?:     string;
    email?:        string;
    phone?:        string;
    programId?:    string;
    departmentId?: string;
    status?:       StudentStatus;
    yearLevel?:    number;
    gpa?:          number;
  },
  updatedByUserId: string,
  ipAddress:       string | null = null
) {
  const record = await prisma.studentRecord.findUnique({ where: { id }, select: { userId: true } });
  if (!record) throw new Error('Student record not found');

  if (data.programId) {
    const prog = await prisma.program.findUnique({ where: { id: data.programId } });
    if (!prog) throw new Error('Program not found');
  }
  if (data.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) throw new Error('Department not found');
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.fullName || data.email || data.phone) {
      await tx.user.update({
        where: { id: record.userId },
        data: {
          ...(data.fullName && { fullName: data.fullName.trim() }),
          ...(data.email    && { email:    data.email.toLowerCase().trim() }),
          ...(data.phone    && { phone:    data.phone.trim() }),
        },
      });
    }

    return tx.studentRecord.update({
      where: { id },
      data: {
        ...(data.programId    && { programId:    data.programId }),
        ...(data.departmentId && { departmentId: data.departmentId }),
        ...(data.status       && { status:       data.status }),
        ...(data.yearLevel    !== undefined && { yearLevel: data.yearLevel }),
        ...(data.gpa          !== undefined && { gpa:       data.gpa }),
      },
      include: {
        user: { select: SAFE_USER_SELECT },
        program: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  });

  return updated;
}

export async function deleteStudent(id: string, callerId: string, ipAddress: string | null = null) {
  const record = await prisma.studentRecord.findUnique({ where: { id }, select: { userId: true } });
  if (!record) throw new Error('Student record not found');

  await prisma.session.updateMany({
    where: { userId: record.userId },
    data:  { isRevoked: true },
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data:  { status: AccountStatus.SUSPENDED },
    });
    return tx.studentRecord.update({
      where: { id },
      data:  { status: StudentStatus.SUSPENDED },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  });

  await writeAudit(AuditAction.ACCOUNT_SUSPENDED, callerId, ipAddress, {
    targetUserId: record.userId,
    reason: 'Suspended via Admin Student Deletion',
  });

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTOR / LECTURER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface InstructorListQuery {
  page:         number;
  limit:        number;
  search?:      string;
  departmentId?: string;
  isActive?:    boolean;
  sortBy?:      string;
  sortOrder?:   'asc' | 'desc';
}

export async function listInstructors(q: InstructorListQuery) {
  const { page, limit, search, departmentId, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (departmentId) where.departmentId = departmentId;
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { employeeId:     { contains: search, mode: 'insensitive' } },
      { title:          { contains: search, mode: 'insensitive' } },
      { specialization: { contains: search, mode: 'insensitive' } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
      { user: { email:    { contains: search, mode: 'insensitive' } } },
    ];
  }

  const orderBy: any =
    sortBy === 'employeeId' ? { employeeId: sortOrder } :
    sortBy === 'title'      ? { title:      sortOrder } :
                              { createdAt:  sortOrder };

  const [total, instructors] = await Promise.all([
    prisma.instructorRecord.count({ where }),
    prisma.instructorRecord.findMany({
      where, skip, take: limit, orderBy,
      include: {
        user: { select: SAFE_USER_SELECT },
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { offerings: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), instructors };
}

export async function getInstructorById(id: string) {
  const inst = await prisma.instructorRecord.findUnique({
    where: { id },
    include: {
      user: { select: SAFE_USER_SELECT },
      department: { select: { id: true, name: true, code: true } },
      offerings: {
        include: {
          course: { select: { code: true, name: true } },
          semester: { select: { name: true } },
        },
      },
    },
  });
  if (!inst) throw new Error('Instructor record not found');
  return inst;
}

export async function createInstructor(
  data: {
    fullName:       string;
    email?:         string;
    phone?:         string;
    password:       string;
    employeeId?:    string;
    title?:         string;
    specialization?: string;
    departmentId:   string;
  },
  createdByUserId: string,
  ipAddress:       string | null = null
) {
  const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!dept) throw new Error('Department not found');

  if (data.email) {
    const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) throw new Error('An account with this email already exists.');
  }

  const generatedEmpId = data.employeeId?.trim() || `EMP-${Math.floor(10000 + Math.random() * 90000)}`;

  const existingEmp = await prisma.instructorRecord.findUnique({ where: { employeeId: generatedEmpId } });
  if (existingEmp) throw new Error('Employee ID already exists.');

  const passwordHash = await bcrypt.hash(data.password, PASSWORD_BCRYPT_ROUNDS);

  const instructor = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName:         data.fullName.trim(),
        email:            data.email?.toLowerCase().trim() ?? null,
        phone:            data.phone?.trim() ?? null,
        passwordHash,
        role:             Role.INSTRUCTOR,
        status:           AccountStatus.ACTIVE,
        emailVerified:    !!data.email,
        phoneVerified:    !!data.phone,
        profileCompleted: true,
      },
    });

    return tx.instructorRecord.create({
      data: {
        userId:         user.id,
        employeeId:     generatedEmpId,
        title:          data.title?.trim() ?? 'Instructor',
        specialization: data.specialization?.trim() ?? null,
        departmentId:   dept.id,
        isActive:       true,
      },
      include: {
        user: { select: SAFE_USER_SELECT },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  });

  await writeAudit(AuditAction.ROLE_CHANGED, createdByUserId, ipAddress, {
    event: 'instructor_created_by_admin',
    instructorId: instructor.id,
    employeeId: instructor.employeeId,
  });

  return instructor;
}

export async function updateInstructor(
  id: string,
  data: {
    fullName?:       string;
    email?:          string;
    phone?:          string;
    title?:          string;
    specialization?: string;
    departmentId?:   string;
    isActive?:       boolean;
  },
  updatedByUserId: string,
  ipAddress:       string | null = null
) {
  const inst = await prisma.instructorRecord.findUnique({ where: { id }, select: { userId: true } });
  if (!inst) throw new Error('Instructor record not found');

  if (data.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) throw new Error('Department not found');
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.fullName || data.email || data.phone) {
      await tx.user.update({
        where: { id: inst.userId },
        data: {
          ...(data.fullName && { fullName: data.fullName.trim() }),
          ...(data.email    && { email:    data.email.toLowerCase().trim() }),
          ...(data.phone    && { phone:    data.phone.trim() }),
        },
      });
    }

    return tx.instructorRecord.update({
      where: { id },
      data: {
        ...(data.title          !== undefined && { title:          data.title.trim() }),
        ...(data.specialization !== undefined && { specialization: data.specialization.trim() }),
        ...(data.departmentId   && { departmentId:   data.departmentId }),
        ...(data.isActive       !== undefined && { isActive:       data.isActive }),
      },
      include: {
        user: { select: SAFE_USER_SELECT },
        department: { select: { id: true, name: true, code: true } },
      },
    });
  });

  return updated;
}

export async function deleteInstructor(id: string, callerId: string, ipAddress: string | null = null) {
  const inst = await prisma.instructorRecord.findUnique({ where: { id }, select: { userId: true } });
  if (!inst) throw new Error('Instructor record not found');

  await prisma.session.updateMany({
    where: { userId: inst.userId },
    data:  { isRevoked: true },
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: inst.userId },
      data:  { status: AccountStatus.DEACTIVATED },
    });

    return tx.instructorRecord.update({
      where: { id },
      data:  { isActive: false },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  });

  await writeAudit(AuditAction.ACCOUNT_DEACTIVATED, callerId, ipAddress, {
    targetUserId: inst.userId,
    reason: 'Instructor deactivated via Admin',
  });

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// COURSE CRUD
// ─────────────────────────────────────────────────────────────────────────────

export interface CourseListQuery {
  page:         number;
  limit:        number;
  search?:      string;
  departmentId?: string;
  status?:      CourseStatus;
}

export async function listCourses(q: CourseListQuery) {
  const { page, limit, search, departmentId, status } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (departmentId) where.departmentId = departmentId;
  if (status)       where.status       = status;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where, skip, take: limit,
      orderBy: { code: 'asc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        prerequisites: { include: { prerequisite: { select: { id: true, code: true, name: true } } } },
        _count: { select: { offerings: true } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), courses };
}

export async function getCourseById(id: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      prerequisites: { include: { prerequisite: { select: { id: true, code: true, name: true } } } },
      requiredBy:    { include: { course: { select: { id: true, code: true, name: true } } } },
      offerings: {
        include: {
          semester: { select: { name: true } },
          instructor: { select: { user: { select: { fullName: true } } } },
        },
      },
    },
  });
  if (!course) throw new Error('Course not found');
  return course;
}

export async function createCourse(data: {
  code:             string;
  name:             string;
  description?:     string;
  creditHours?:     number;
  departmentId:     string;
  status?:          CourseStatus;
  prerequisiteIds?: string[];
}) {
  const exists = await prisma.course.findUnique({ where: { code: data.code.trim().toUpperCase() } });
  if (exists) throw new Error('Course code already exists');

  const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!dept) throw new Error('Department not found');

  return prisma.course.create({
    data: {
      code:        data.code.trim().toUpperCase(),
      name:        data.name.trim(),
      description: data.description?.trim() ?? null,
      creditHours: data.creditHours ?? 3,
      departmentId: data.departmentId,
      status:      data.status ?? CourseStatus.ACTIVE,
      prerequisites: data.prerequisiteIds?.length ? {
        create: data.prerequisiteIds.map(prereqId => ({ prerequisiteId: prereqId })),
      } : undefined,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      prerequisites: { include: { prerequisite: { select: { id: true, code: true, name: true } } } },
    },
  });
}

export async function updateCourse(
  id: string,
  data: {
    name?:            string;
    description?:    string;
    creditHours?:    number;
    departmentId?:   string;
    status?:         CourseStatus;
    prerequisiteIds?: string[];
  }
) {
  const course = await prisma.course.findUnique({ where: { id }, select: { id: true } });
  if (!course) throw new Error('Course not found');

  if (data.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) throw new Error('Department not found');
  }

  if (data.prerequisiteIds !== undefined) {
    await prisma.coursePrerequisite.deleteMany({ where: { courseId: id } });
  }

  return prisma.course.update({
    where: { id },
    data: {
      ...(data.name        !== undefined && { name:        data.name.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.creditHours !== undefined && { creditHours: data.creditHours }),
      ...(data.departmentId && { departmentId: data.departmentId }),
      ...(data.status       && { status:       data.status }),
      ...(data.prerequisiteIds && data.prerequisiteIds.length > 0 && {
        prerequisites: {
          create: data.prerequisiteIds.map(prereqId => ({ prerequisiteId: prereqId })),
        },
      }),
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      prerequisites: { include: { prerequisite: { select: { id: true, code: true, name: true } } } },
    },
  });
}

export async function deleteCourse(id: string) {
  const course = await prisma.course.findUnique({ where: { id }, select: { id: true } });
  if (!course) throw new Error('Course not found');

  return prisma.course.update({
    where: { id },
    data:  { status: CourseStatus.INACTIVE },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC YEAR CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function listAcademicYears() {
  return prisma.academicYear.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      semesters: { select: { id: true, name: true, isCurrent: true, isActive: true } },
    },
  });
}

export async function getAcademicYearById(id: string) {
  const ay = await prisma.academicYear.findUnique({
    where: { id },
    include: {
      semesters: { orderBy: { startDate: 'asc' } },
    },
  });
  if (!ay) throw new Error('Academic year not found');
  return ay;
}

export async function createAcademicYear(data: {
  name:       string;
  startDate:  Date;
  endDate:    Date;
  isCurrent?: boolean;
  isActive?:  boolean;
}) {
  const conflict = await prisma.academicYear.findUnique({ where: { name: data.name.trim() } });
  if (conflict) throw new Error('Academic year with this name already exists.');

  if (data.isCurrent) {
    await prisma.academicYear.updateMany({ data: { isCurrent: false } });
  }

  return prisma.academicYear.create({
    data: {
      name:      data.name.trim(),
      startDate: data.startDate,
      endDate:   data.endDate,
      isCurrent: data.isCurrent ?? false,
      isActive:  data.isActive  ?? true,
    },
    include: { semesters: true },
  });
}

export async function updateAcademicYear(
  id: string,
  data: {
    name?:      string;
    startDate?: Date;
    endDate?:   Date;
    isCurrent?: boolean;
    isActive?:  boolean;
  }
) {
  const ay = await prisma.academicYear.findUnique({ where: { id }, select: { id: true } });
  if (!ay) throw new Error('Academic year not found');

  if (data.isCurrent) {
    await prisma.academicYear.updateMany({ data: { isCurrent: false } });
  }

  return prisma.academicYear.update({
    where: { id },
    data: {
      ...(data.name      !== undefined && { name:      data.name.trim() }),
      ...(data.startDate !== undefined && { startDate: data.startDate }),
      ...(data.endDate   !== undefined && { endDate:   data.endDate }),
      ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
      ...(data.isActive  !== undefined && { isActive:  data.isActive }),
    },
    include: { semesters: true },
  });
}

export async function deleteAcademicYear(id: string) {
  const ay = await prisma.academicYear.findUnique({ where: { id }, select: { id: true } });
  if (!ay) throw new Error('Academic year not found');
  return prisma.academicYear.update({
    where: { id },
    data:  { isActive: false, isCurrent: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SEMESTER CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function listSemesters(academicYearId?: string) {
  return prisma.semester.findMany({
    where:   academicYearId ? { academicYearId } : undefined,
    orderBy: { startDate: 'desc' },
    include: {
      academicYear: { select: { id: true, name: true } },
      _count:       { select: { offerings: true } },
    },
  });
}

export async function getSemesterById(id: string) {
  const sem = await prisma.semester.findUnique({
    where: { id },
    include: {
      academicYear: true,
      offerings: { include: { course: { select: { code: true, name: true } } } },
    },
  });
  if (!sem) throw new Error('Semester not found');
  return sem;
}

export async function createSemester(data: {
  name:              string;
  academicYearId:    string;
  startDate:         Date;
  endDate:           Date;
  registrationStart: Date;
  registrationEnd:   Date;
  addDropDeadline:   Date;
  isCurrent?:        boolean;
  isActive?:         boolean;
}) {
  const ay = await prisma.academicYear.findUnique({ where: { id: data.academicYearId } });
  if (!ay) throw new Error('Academic year not found');

  if (data.isCurrent) {
    await prisma.semester.updateMany({ data: { isCurrent: false } });
  }

  return prisma.semester.create({
    data: {
      name:              data.name.trim(),
      academicYearId:    data.academicYearId,
      startDate:         data.startDate,
      endDate:           data.endDate,
      registrationStart: data.registrationStart,
      registrationEnd:   data.registrationEnd,
      addDropDeadline:   data.addDropDeadline,
      isCurrent:         data.isCurrent ?? false,
      isActive:          data.isActive  ?? true,
    },
    include: { academicYear: { select: { id: true, name: true } } },
  });
}

export async function updateSemester(
  id: string,
  data: {
    name?:              string;
    startDate?:         Date;
    endDate?:           Date;
    registrationStart?: Date;
    registrationEnd?:   Date;
    addDropDeadline?:   Date;
    isCurrent?:         boolean;
    isActive?:          boolean;
  }
) {
  const sem = await prisma.semester.findUnique({ where: { id }, select: { id: true } });
  if (!sem) throw new Error('Semester not found');

  if (data.isCurrent) {
    await prisma.semester.updateMany({ data: { isCurrent: false } });
  }

  return prisma.semester.update({
    where: { id },
    data: {
      ...(data.name              !== undefined && { name:              data.name.trim() }),
      ...(data.startDate         !== undefined && { startDate:         data.startDate }),
      ...(data.endDate           !== undefined && { endDate:           data.endDate }),
      ...(data.registrationStart !== undefined && { registrationStart: data.registrationStart }),
      ...(data.registrationEnd   !== undefined && { registrationEnd:   data.registrationEnd }),
      ...(data.addDropDeadline   !== undefined && { addDropDeadline:   data.addDropDeadline }),
      ...(data.isCurrent         !== undefined && { isCurrent:         data.isCurrent }),
      ...(data.isActive          !== undefined && { isActive:          data.isActive }),
    },
    include: { academicYear: { select: { id: true, name: true } } },
  });
}

export async function deleteSemester(id: string) {
  const sem = await prisma.semester.findUnique({ where: { id }, select: { id: true } });
  if (!sem) throw new Error('Semester not found');
  return prisma.semester.update({
    where: { id },
    data:  { isActive: false, isCurrent: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMISSION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface AdmissionListQuery {
  page:         number;
  limit:        number;
  search?:      string;
  status?:      ApplicationStatus;
  program?:     string;
  academicYear?: string;
}

export async function listAdmissions(q: AdmissionListQuery) {
  const { page, limit, search, status, program, academicYear } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status)       where.status       = status;
  if (program)      where.program      = program;
  if (academicYear) where.academicYear = academicYear;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone:    { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        documents: true,
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), applications };
}

export async function getAdmissionById(id: string) {
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      user: { select: SAFE_USER_SELECT },
      documents: true,
    },
  });
  if (!app) throw new Error('Application not found');
  return app;
}

export async function updateAdmissionStatus(
  id: string,
  status: ApplicationStatus,
  reviewerUserId: string,
  comment?: string
) {
  const app = await prisma.application.findUnique({ where: { id }, select: { userId: true } });
  if (!app) throw new Error('Application not found');

  const updated = await prisma.application.update({
    where: { id },
    data: {
      status,
      reviewComment: comment ?? null,
      reviewedBy: reviewerUserId,
      reviewedAt: new Date(),
    },
  });

  await writeAudit(AuditAction.PROFILE_COMPLETED, reviewerUserId, null, {
    event: 'admission_status_updated_by_admin',
    applicationId: id,
    newStatus: status,
  });

  return updated;
}

export async function reviewOnboarding(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reviewerUserId: string,
  reason?: string
) {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new Error('Application not found');

  const updated = await prisma.application.update({
    where: { id },
    data: {
      onboardingStatus: status,
      onboardingReviewedBy: reviewerUserId,
      onboardingReviewedAt: new Date(),
      onboardingRejectionReason: reason ?? null,
    },
  });

  return updated;
}

