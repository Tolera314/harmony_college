import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { getEmailProvider } from '../lib/providers';
import { Role, AccountStatus, AuditAction, StaffInvitation } from '@prisma/client';
import { STAFF_ROLES } from '../types/auth';

const PASSWORD_BCRYPT_ROUNDS = 12;
const INVITATION_LIFETIME_HOURS = 48;

export interface CreateInvitationInput {
  fullName:       string;
  email:          string;
  role:           Role;
  departmentId:   string;
  positionTitle?: string;
  employeeId?:    string;
  phone?:         string;
  specialization?: string;
}

export interface ListInvitationsParams {
  page?:         number;
  limit?:        number;
  search?:       string;
  role?:         Role;
  departmentId?: string;
  status?:       'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

async function writeAuditLog(
  action: AuditAction,
  actorUserId: string | null,
  ipAddress: string | null = null,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId:    actorUserId ?? undefined,
        ipAddress: ipAddress ?? undefined,
        metadata:  metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  } catch (err) {
    console.error('Failed to write invitation audit log:', err);
  }
}

/**
 * Validates whether callerRole is permitted to invite targetRole.
 */
export function validateRolePermission(callerRole: Role, targetRole: Role): void {
  if (!STAFF_ROLES.includes(targetRole)) {
    throw new Error(`Role ${targetRole} is not a valid staff role for invitations.`);
  }

  if (callerRole === Role.SUPER_ADMIN) {
    return; // Super Admin can invite any staff role
  }

  if (callerRole === Role.ADMIN) {
    if (targetRole === Role.SUPER_ADMIN || targetRole === Role.ADMIN) {
      throw new Error('Administrators cannot invite Super Admins or other Administrators.');
    }
    return;
  }

  throw new Error('Only Administrators and Super Administrators can send staff invitations.');
}

/**
 * Computes dynamic display status for an invitation record.
 */
export function computeInvitationStatus(inv: {
  acceptedAt: Date | null;
  revokedAt:  Date | null;
  expiresAt:  Date;
}): 'ACCEPTED' | 'REVOKED' | 'EXPIRED' | 'PENDING' {
  if (inv.acceptedAt) return 'ACCEPTED';
  if (inv.revokedAt)  return 'REVOKED';
  if (inv.expiresAt <= new Date()) return 'EXPIRED';
  return 'PENDING';
}

/**
 * Admin creates and sends a staff invitation.
 */
export async function createStaffInvitation(
  input: CreateInvitationInput,
  callerId: string,
  callerRole: Role,
  ipAddress: string | null = null
) {
  // 1. Authorize role permission
  validateRolePermission(callerRole, input.role);

  // 2. Normalize email
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid official email address is required.');
  }

  // 3. Verify Department exists and is active
  const dept = await prisma.department.findUnique({
    where: { id: input.departmentId },
    select: { id: true, name: true, isActive: true },
  });
  if (!dept) throw new Error('Department not found.');
  if (!dept.isActive) throw new Error('Cannot send invitation for an inactive department.');

  // 4. Check existing account in User table
  const existingUser = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true, status: true, role: true },
  });

  if (existingUser) {
    if (existingUser.status === AccountStatus.DEACTIVATED) {
      throw new Error('An account associated with this email is deactivated. Please contact support or reactivate the existing user.');
    }
    if (existingUser.status === AccountStatus.SUSPENDED) {
      throw new Error('An account associated with this email is suspended.');
    }
    throw new Error('An account with this email address already exists.');
  }

  // 5. Invalidate/revoke any previous pending invitations for this email
  await prisma.staffInvitation.updateMany({
    where: {
      email:      normalizedEmail,
      acceptedAt: null,
      revokedAt:  null,
    },
    data: { revokedAt: new Date() },
  });

  // 6. Generate cryptographically random token & hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_HOURS * 3600 * 1000);

  // 7. Store invitation record
  const invitation = await prisma.staffInvitation.create({
    data: {
      email:           normalizedEmail,
      fullName:        input.fullName.trim(),
      role:            input.role,
      departmentId:    dept.id,
      positionTitle:   input.positionTitle?.trim() ?? null,
      employeeId:      input.employeeId?.trim() ?? null,
      phone:           input.phone?.trim() ?? null,
      specialization:  input.specialization?.trim() ?? null,
      tokenHash,
      expiresAt,
      invitedByUserId: callerId,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      invitedByUser: { select: { id: true, fullName: true, email: true } },
    },
  });

  // 8. Construct link & send email
  const invitationLink = `${getAppBaseUrl()}/accept-invitation?token=${rawToken}`;
  const emailRes = await getEmailProvider().sendStaffInvitationEmail(normalizedEmail, {
    fullName:       invitation.fullName,
    role:           invitation.role,
    departmentName: dept.name,
    invitationLink,
    expiresInHours: INVITATION_LIFETIME_HOURS,
  });

  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✉️  STAFF INVITATION CREATED (${normalizedEmail})
├─────────────────────────────────────────────────────────────────────────────┤
│ Recipient: ${invitation.fullName} <${normalizedEmail}>
│ Role:      ${invitation.role}
│ Department:${dept.name}
│ Link:      ${invitationLink}
│ Mailer:    ${emailRes.success ? 'SENT SUCCESSFUL' : 'WARNING: ' + emailRes.error}
└─────────────────────────────────────────────────────────────────────────────┘
`);

  if (!emailRes.success) {
    console.warn(`[StaffInvitation] Email provider warning for ${normalizedEmail}: ${emailRes.error}`);
  }

  // 9. Write audit log
  await writeAuditLog(AuditAction.STAFF_INVITATION_CREATED, callerId, ipAddress, {
    invitationId: invitation.id,
    invitedEmail: normalizedEmail,
    assignedRole: invitation.role,
    departmentId: dept.id,
  });

  return {
    invitation: {
      ...invitation,
      status: computeInvitationStatus(invitation),
    },
    rawToken,
    invitationLink,
    emailResult: emailRes,
  };
}

/**
 * Public token validation for invitation acceptance page.
 */
export async function validateInvitationToken(rawToken: string) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { isValid: false, reason: 'INVALID_TOKEN' };
  }

  const tokenHash = hashToken(rawToken);
  const inv = await prisma.staffInvitation.findUnique({
    where: { tokenHash },
    include: {
      department: { select: { id: true, name: true, code: true } },
    },
  });

  if (!inv) {
    return { isValid: false, reason: 'INVALID_TOKEN' };
  }

  if (inv.acceptedAt) {
    return { isValid: false, reason: 'ALREADY_ACCEPTED', fullName: inv.fullName, email: inv.email };
  }

  if (inv.revokedAt) {
    return { isValid: false, reason: 'REVOKED', fullName: inv.fullName, email: inv.email };
  }

  if (inv.expiresAt <= new Date()) {
    return { isValid: false, reason: 'EXPIRED', fullName: inv.fullName, email: inv.email };
  }

  return {
    isValid:        true,
    id:             inv.id,
    fullName:       inv.fullName,
    email:          inv.email,
    role:           inv.role,
    departmentId:   inv.departmentId,
    departmentName: inv.department.name,
    departmentCode: inv.department.code,
    expiresAt:      inv.expiresAt,
  };
}

/**
 * Accepts an invitation, creates User + Staff Record in a single transaction, and sets status to accepted.
 */
export async function acceptStaffInvitation(
  rawToken: string,
  password: string,
  ipAddress: string | null = null
) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new Error('Invitation token is required.');
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one letter and one number.');
  }

  const tokenHash = hashToken(rawToken);

  return prisma.$transaction(async (tx) => {
    // 1. Lock and load invitation
    const inv = await tx.staffInvitation.findUnique({
      where: { tokenHash },
      include: { department: true },
    });

    if (!inv) throw new Error('Invalid or non-existent invitation token.');
    if (inv.acceptedAt) throw new Error('This invitation has already been accepted.');
    if (inv.revokedAt) throw new Error('This invitation has been revoked by an administrator.');
    if (inv.expiresAt <= new Date()) throw new Error('This invitation link has expired.');

    // 2. Recheck existing email uniqueness inside transaction
    const existingUser = await tx.user.findFirst({
      where: { email: inv.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new Error('An account with this email address already exists.');
    }

    // 3. Hash password securely
    const passwordHash = await bcrypt.hash(password, PASSWORD_BCRYPT_ROUNDS);

    // 4. Create User
    const user = await tx.user.create({
      data: {
        fullName:            inv.fullName,
        email:               inv.email,
        phone:               inv.phone ?? null,
        passwordHash,
        role:                inv.role,
        status:              AccountStatus.ACTIVE,
        emailVerified:       true,
        phoneVerified:       !!inv.phone,
        profileCompleted:    true,
        profileCompletion:   100,
        failedLoginAttempts: 0,
      },
    });

    // 5. Create Staff Record according to assigned role
    const generatedEmpId = inv.employeeId?.trim() || `EMP-${Math.floor(10000 + Math.random() * 90000)}`;

    if (inv.role === Role.INSTRUCTOR) {
      await tx.instructorRecord.create({
        data: {
          userId:         user.id,
          employeeId:     generatedEmpId,
          title:          inv.positionTitle?.trim() ?? 'Instructor',
          specialization: inv.specialization?.trim() ?? null,
          departmentId:   inv.departmentId,
          isActive:       true,
        },
      });
    } else if (inv.role === Role.DEPARTMENT_HEAD) {
      await tx.departmentHeadRecord.create({
        data: {
          userId:       user.id,
          employeeId:   generatedEmpId,
          title:        inv.positionTitle?.trim() ?? 'Department Head',
          departmentId: inv.departmentId,
          isActive:     true,
        },
      });
    }

    // Connect HREmployee record if registered via HR
    await tx.hREmployee.updateMany({
      where: { email: inv.email },
      data: { userId: user.id },
    });

    // 6. Update invitation to accepted state
    await tx.staffInvitation.update({
      where: { id: inv.id },
      data: {
        acceptedAt:       new Date(),
        acceptedByUserId: user.id,
      },
    });

    // 7. Audit log
    await tx.auditLog.create({
      data: {
        action:    AuditAction.STAFF_INVITATION_ACCEPTED,
        userId:    user.id,
        ipAddress: ipAddress ?? undefined,
        metadata:  JSON.stringify({ invitationId: inv.id, role: user.role }),
      },
    });

    return user;
  });
}

/**
 * Lists staff invitations with server-side pagination & filtering.
 */
export async function listStaffInvitations(params: ListInvitationsParams) {
  const page  = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 10));
  const skip  = (page - 1) * limit;

  const where: any = {};

  if (params.search) {
    const q = params.search.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email:    { contains: q, mode: 'insensitive' } },
      { phone:    { contains: q, mode: 'insensitive' } },
    ];
  }

  if (params.role) {
    where.role = params.role;
  }

  if (params.departmentId) {
    where.departmentId = params.departmentId;
  }

  const now = new Date();
  if (params.status === 'ACCEPTED') {
    where.acceptedAt = { not: null };
  } else if (params.status === 'REVOKED') {
    where.acceptedAt = null;
    where.revokedAt  = { not: null };
  } else if (params.status === 'EXPIRED') {
    where.acceptedAt = null;
    where.revokedAt  = null;
    where.expiresAt  = { lte: now };
  } else if (params.status === 'PENDING') {
    where.acceptedAt = null;
    where.revokedAt  = null;
    where.expiresAt  = { gt: now };
  }

  const [total, items] = await Promise.all([
    prisma.staffInvitation.count({ where }),
    prisma.staffInvitation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        invitedByUser: { select: { id: true, fullName: true, email: true } },
        acceptedByUser: { select: { id: true, fullName: true, email: true } },
      },
    }),
  ]);

  const invitations = items.map(inv => ({
    ...inv,
    status: computeInvitationStatus(inv),
  }));

  return {
    invitations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Resends a pending invitation with a new 48h token.
 */
export async function resendStaffInvitation(
  invitationId: string,
  callerId: string,
  callerRole: Role,
  ipAddress: string | null = null
) {
  const inv = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
    include: { department: true },
  });

  if (!inv) throw new Error('Invitation not found.');
  if (inv.acceptedAt) throw new Error('Cannot resend an invitation that has already been accepted.');

  validateRolePermission(callerRole, inv.role);

  // Generate new token & hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_HOURS * 3600 * 1000);

  const updated = await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: {
      tokenHash,
      expiresAt,
      revokedAt: null,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      invitedByUser: { select: { id: true, fullName: true, email: true } },
    },
  });

  const invitationLink = `${getAppBaseUrl()}/accept-invitation?token=${rawToken}`;
  const emailRes = await getEmailProvider().sendStaffInvitationEmail(inv.email, {
    fullName:       inv.fullName,
    role:           inv.role,
    departmentName: inv.department.name,
    invitationLink,
    expiresInHours: INVITATION_LIFETIME_HOURS,
  });

  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✉️  STAFF INVITATION RESENT (${inv.email})
├─────────────────────────────────────────────────────────────────────────────┤
│ Recipient: ${inv.fullName} <${inv.email}>
│ Role:      ${inv.role}
│ Department:${inv.department.name}
│ Link:      ${invitationLink}
│ Mailer:    ${emailRes.success ? 'SENT SUCCESSFUL' : 'WARNING: ' + emailRes.error}
└─────────────────────────────────────────────────────────────────────────────┘
`);

  await writeAuditLog(AuditAction.STAFF_INVITATION_RESENT, callerId, ipAddress, {
    invitationId: inv.id,
    email:        inv.email,
  });

  return {
    invitation: {
      ...updated,
      status: computeInvitationStatus(updated),
    },
    rawToken,
    invitationLink,
    emailResult: emailRes,
  };
}

/**
 * Revokes a pending staff invitation.
 */
export async function revokeStaffInvitation(
  invitationId: string,
  callerId: string,
  callerRole: Role,
  ipAddress: string | null = null
) {
  const inv = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!inv) throw new Error('Invitation not found.');
  if (inv.acceptedAt) throw new Error('Cannot revoke an invitation that has already been accepted.');

  validateRolePermission(callerRole, inv.role);

  const updated = await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: { revokedAt: new Date() },
    include: {
      department: { select: { id: true, name: true, code: true } },
    },
  });

  await writeAuditLog(AuditAction.STAFF_INVITATION_REVOKED, callerId, ipAddress, {
    invitationId: inv.id,
    email:        inv.email,
  });

  return {
    ...updated,
    status: computeInvitationStatus(updated),
  };
}

export interface UpdateInvitationInput {
  fullName?:       string;
  email?:          string;
  role?:           Role;
  departmentId?:   string;
  positionTitle?:  string;
  employeeId?:     string;
  phone?:          string;
  specialization?: string;
}

/**
 * Updates a pending or expired staff invitation (e.g. correcting email, role, or department) and sends a fresh email.
 */
export async function updateStaffInvitation(
  invitationId: string,
  input: UpdateInvitationInput,
  callerId: string,
  callerRole: Role,
  ipAddress: string | null = null
) {
  const inv = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
    include: { department: true },
  });

  if (!inv) throw new Error('Invitation not found.');
  if (inv.acceptedAt) throw new Error('Cannot edit an invitation that has already been accepted.');

  const targetRole = input.role ?? inv.role;
  validateRolePermission(callerRole, targetRole);

  let newEmail = inv.email;
  if (input.email && input.email.trim().toLowerCase() !== inv.email) {
    newEmail = input.email.trim().toLowerCase();
    if (!newEmail.includes('@')) throw new Error('A valid official email address is required.');

    // Check existing account in User table
    const existingUser = await prisma.user.findFirst({
      where: { email: newEmail },
      select: { id: true, status: true },
    });
    if (existingUser) {
      throw new Error('An account with this new email address already exists.');
    }
  }

  let deptId = inv.departmentId;
  let deptName = inv.department.name;
  if (input.departmentId && input.departmentId !== inv.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: input.departmentId },
      select: { id: true, name: true, isActive: true },
    });
    if (!dept) throw new Error('Department not found.');
    if (!dept.isActive) throw new Error('Cannot assign an inactive department.');
    deptId = dept.id;
    deptName = dept.name;
  }

  // Issue a fresh secure token & reset 48h timer
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_HOURS * 3600 * 1000);

  const updated = await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: {
      fullName:       input.fullName?.trim() ?? inv.fullName,
      email:          newEmail,
      role:           targetRole,
      departmentId:   deptId,
      positionTitle:  input.positionTitle !== undefined ? (input.positionTitle?.trim() ?? null) : inv.positionTitle,
      employeeId:     input.employeeId !== undefined ? (input.employeeId?.trim() ?? null) : inv.employeeId,
      phone:          input.phone !== undefined ? (input.phone?.trim() ?? null) : inv.phone,
      specialization: input.specialization !== undefined ? (input.specialization?.trim() ?? null) : inv.specialization,
      tokenHash,
      expiresAt,
      revokedAt:      null,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      invitedByUser: { select: { id: true, fullName: true, email: true } },
    },
  });

  const invitationLink = `${getAppBaseUrl()}/accept-invitation?token=${rawToken}`;
  const emailRes = await getEmailProvider().sendStaffInvitationEmail(updated.email, {
    fullName:       updated.fullName,
    role:           updated.role,
    departmentName: deptName,
    invitationLink,
    expiresInHours: INVITATION_LIFETIME_HOURS,
  });

  console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✉️  STAFF INVITATION UPDATED & RE-SENT (${updated.email})
├─────────────────────────────────────────────────────────────────────────────┤
│ Recipient: ${updated.fullName} <${updated.email}>
│ Role:      ${updated.role}
│ Department:${deptName}
│ Link:      ${invitationLink}
│ Mailer:    ${emailRes.success ? 'SENT SUCCESSFUL' : 'WARNING: ' + emailRes.error}
└─────────────────────────────────────────────────────────────────────────────┘
`);

  await writeAuditLog(AuditAction.STAFF_INVITATION_RESENT, callerId, ipAddress, {
    event:        'staff_invitation_updated_and_resent',
    invitationId: updated.id,
    updatedEmail: updated.email,
  });

  return {
    invitation: {
      ...updated,
      status: computeInvitationStatus(updated),
    },
    rawToken,
    invitationLink,
    emailResult: emailRes,
  };
}
