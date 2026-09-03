/**
 * HR Employee Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Security rules enforced here (never trusted from frontend):
 *
 * 1. HR_OFFICER may create employees with systemRole ∈ ALLOWED_CREATION_ROLES.
 *    Creating STUDENT or any ADMIN role is forbidden — 403 at service level.
 *
 * 2. ADMIN and SUPER_ADMIN may create any non-STUDENT role.
 *
 * 3. Roles that require a course assignment (INSTRUCTOR, DEPARTMENT_HEAD):
 *    courseId is REQUIRED. For all other roles it is forbidden (cleared).
 *
 * 4. All monetary values must be ≥ 0.
 *
 * 5. employeeCode and email uniqueness are enforced at DB level and checked here.
 *
 * 6. Sensitive fields (nationalId, bankAccount, taxNumber, faydaIdUrl,
 *    certificateUrl) are stripped from the list endpoint.
 */

import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { getEmailProvider } from '../../lib/providers';
import { writeHRAudit } from './hrAuditService';
import { Role, AccountStatus } from '@prisma/client';
import { INVITATION_LIFETIME_HOURS } from '../../services/invitationService';
// Shared constant — keep in sync
const INVITE_EXPIRY_HOURS = INVITATION_LIFETIME_HOURS ?? 48;

// ── Role rules ────────────────────────────────────────────────────────────────

/** Roles HR_OFFICER is allowed to create. STUDENT and ADMIN tiers are always forbidden. */
const ALLOWED_CREATION_ROLES = new Set([
  'INSTRUCTOR',
  'DEPARTMENT_HEAD',
  'REGISTRAR',
  'FINANCE_OFFICER',
  'HR_OFFICER',
]);

/** Roles that are never allowed regardless of who is creating them. */
const FORBIDDEN_ROLES = new Set([
  'STUDENT',
  'ADMIN',
  'SUPER_ADMIN',
]);

function formatRoleName(role: string): string {
  const map: Record<string, string> = {
    INSTRUCTOR: 'Instructor',
    DEPARTMENT_HEAD: 'Department Head',
    REGISTRAR: 'Registrar',
    FINANCE_OFFICER: 'Finance Officer',
    HR_OFFICER: 'HR Officer',
  };
  return map[role.toUpperCase()] || role;
}

/**
 * Validate that the creating actor is allowed to assign the given systemRole.
 * actorRole is the authenticated user's Role from the JWT (NEVER from the request body).
 */
function assertRolePermission(systemRole: string, actorRole: string): void {
  const upper = systemRole.toUpperCase();

  // Nobody can create a STUDENT or any ADMIN tier
  if (FORBIDDEN_ROLES.has(upper)) {
    throw new Error(
      `Creating employees with role ${upper} is not permitted through this interface.`
    );
  }

  // HR_OFFICER can only create from the allowed set
  if (actorRole === 'HR_OFFICER' && !ALLOWED_CREATION_ROLES.has(upper)) {
    throw new Error(
      `HR Officer is not permitted to create employees with role ${upper}.`
    );
  }
}

/**
 * Resolve optional courseId if provided. Course selection is not required at registration.
 */
function resolveCourseId(courseId?: string | null): string | null {
  if (courseId && courseId.trim() !== '') {
    return courseId.trim();
  }
  return null;
}

// ── List query ────────────────────────────────────────────────────────────────

export interface EmployeeListQuery {
  page: number;
  limit: number;
  search?: string;
  departmentId?: string;
  status?: string;
  employmentType?: string;
  systemRole?: string;
}

export async function listEmployees(q: EmployeeListQuery) {
  const { page, limit, search, departmentId, status, employmentType, systemRole } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status        && status        !== 'All') where.status        = status;
  if (employmentType && employmentType !== 'All') where.employmentType = employmentType;
  if (departmentId   && departmentId  !== 'All') where.departmentId  = departmentId;
  if (systemRole     && systemRole    !== 'All') where.systemRole    = systemRole;
  if (search) {
    where.OR = [
      { fullName:     { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
      { position:     { contains: search, mode: 'insensitive' } },
      { email:        { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, employees] = await Promise.all([
    prisma.hREmployee.count({ where }),
    prisma.hREmployee.findMany({
      where, skip, take: limit,
      orderBy: { fullName: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        manager:    { select: { id: true, fullName: true } },
      },
    }),
  ]);

  // Determine invitation status for each employee (PENDING | ACCEPTED | EXPIRED | NONE)
  const allEmails = employees.map(e => e.email.toLowerCase());
  const invitations = allEmails.length > 0 ? await prisma.staffInvitation.findMany({
    where: { email: { in: allEmails } },
    orderBy: { createdAt: 'desc' },
    select: { email: true, acceptedAt: true, revokedAt: true, expiresAt: true },
  }) : [];

  // Latest invitation per email
  const latestInvByEmail = new Map<string, { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date }>();
  for (const inv of invitations) {
    if (!latestInvByEmail.has(inv.email)) latestInvByEmail.set(inv.email, inv);
  }

  // Strip all sensitive/document fields from list view — only returned via /full endpoint
  const safe = employees.map(({
    nationalId: _ni, bankAccount: _ba, taxNumber: _tn,
    faydaIdUrl: _fid, faydaIdFileSize: _ffs,
    certificateUrl: _cu, certificateFileSize: _cfs,
    ...rest
  }) => {
    const inv = latestInvByEmail.get(rest.email.toLowerCase());
    let invitationStatus: 'NONE' | 'PENDING' | 'ACCEPTED' | 'EXPIRED' = 'NONE';
    if (inv) {
      if (inv.acceptedAt) invitationStatus = 'ACCEPTED';
      else if (inv.revokedAt) invitationStatus = 'NONE';
      else if (inv.expiresAt <= new Date()) invitationStatus = 'EXPIRED';
      else invitationStatus = 'PENDING';
    }
    return { ...rest, invitationStatus };
  });

  return { total, page, limit, totalPages: Math.ceil(total / limit), employees: safe };
}

// ── Get by ID ─────────────────────────────────────────────────────────────────

async function getInvitationStatusForEmail(email: string): Promise<'NONE' | 'PENDING' | 'ACCEPTED' | 'EXPIRED'> {
  const inv = await prisma.staffInvitation.findFirst({
    where: { email: email.toLowerCase() },
    orderBy: { createdAt: 'desc' },
    select: { acceptedAt: true, revokedAt: true, expiresAt: true },
  });
  if (!inv) return 'NONE';
  if (inv.acceptedAt) return 'ACCEPTED';
  if (inv.revokedAt) return 'NONE';
  if (inv.expiresAt <= new Date()) return 'EXPIRED';
  return 'PENDING';
}

export async function getEmployeeById(id: string) {
  const emp = await prisma.hREmployee.findUnique({
    where: { id },
    include: {
      department: true,
      manager: { select: { id: true, fullName: true, position: true } },
      leaveRequests: {
        orderBy: { submittedAt: 'desc' },
        take: 5,
        select: { id: true, leaveType: true, startDate: true, endDate: true, daysCount: true, status: true, submittedAt: true },
      },
      performanceReviews: {
        orderBy: { dueDate: 'desc' },
        take: 3,
        select: { id: true, cycle: true, period: true, status: true, overallScore: true, dueDate: true },
      },
      documents: {
        orderBy: { uploadedAt: 'desc' },
        take: 10,
        select: { id: true, category: true, title: true, fileSize: true, uploadedAt: true, version: true, fileUrl: true },
      },
    },
  });
  if (!emp) return null;
  const invitationStatus = await getInvitationStatusForEmail(emp.email);
  return { ...emp, invitationStatus };
}

/** Full detail including ALL sensitive fields. HR roles only — guarded at route level. */
export async function getEmployeeByIdFull(id: string) {
  const emp = await prisma.hREmployee.findUnique({
    where: { id },
    include: {
      department: true,
      manager: { select: { id: true, fullName: true, position: true } },
      leaveRequests: {
        orderBy: { submittedAt: 'desc' },
        take: 5,
        select: { id: true, leaveType: true, startDate: true, endDate: true, daysCount: true, status: true, submittedAt: true },
      },
      performanceReviews: {
        orderBy: { dueDate: 'desc' },
        take: 3,
        select: { id: true, cycle: true, period: true, status: true, overallScore: true, dueDate: true },
      },
      documents: {
        orderBy: { uploadedAt: 'desc' },
        take: 10,
        select: { id: true, category: true, title: true, fileSize: true, uploadedAt: true, version: true, fileUrl: true },
      },
    },
  });
  if (!emp) return null;
  const invitationStatus = await getInvitationStatusForEmail(emp.email);
  return { ...emp, invitationStatus };
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createEmployee(
  data: {
    employeeCode:   string;
    departmentId:   string;
    fullName:       string;
    gender:         string;
    email:          string;
    phone?:         string;
    dateOfBirth?:   string;
    address?:       string;
    position?:      string;
    employmentType: string;
    systemRole?:    string;   // the platform Role this employee will have
    courseId?:      string;   // optional course assignment
    hireDate:       string;
    contractEndDate?: string;
    managerId?:     string;
    education?:     string;
    experienceYears?: number;
    basicSalary:    number;
    allowances?:    number;
    deductions?:    number;
    nationalId?:    string;
    bankAccount?:   string;
    taxNumber?:     string;
    faydaIdUrl?:        string;
    faydaIdFileSize?:   string;
    certificateUrl?:     string;
    certificateFileSize?: string;
    emergencyName?:      string;
    emergencyPhone?:     string;
    emergencyRelation?:  string;
    avatarUrl?:     string;
  },
  actorName: string,
  actorRole: string,          // JWT role of the creating user — NEVER from request body
  actorUserId?: string,
) {
  // ── Security: role permission check ─────────────────────────────────────
  if (data.systemRole) {
    assertRolePermission(data.systemRole, actorRole);
  }

  // ── Course resolution (optional at HR creation stage) ───────────────────
  const resolvedCourseId = resolveCourseId(data.courseId);

  // ── Salary validation ────────────────────────────────────────────────────
  if (data.basicSalary < 0)   throw new Error('Basic salary cannot be negative');
  if ((data.allowances ?? 0) < 0) throw new Error('Allowances cannot be negative');
  if ((data.deductions ?? 0) < 0) throw new Error('Deductions cannot be negative');

  // ── Position fallback ───────────────────────────────────────────────────
  const resolvedPosition = data.position?.trim() || (data.systemRole ? formatRoleName(data.systemRole) : 'Staff Member');

  // ── Uniqueness checks ────────────────────────────────────────────────────
  const [codeExists, emailExists] = await Promise.all([
    prisma.hREmployee.findUnique({ where: { employeeCode: data.employeeCode }, select: { id: true } }),
    prisma.hREmployee.findUnique({ where: { email: data.email },              select: { id: true } }),
  ]);
  if (codeExists) throw new Error(`Employee code ${data.employeeCode} already exists`);
  if (emailExists) throw new Error(`Email ${data.email} is already in use`);

  // ── Department exists ────────────────────────────────────────────────────
  const dept = await prisma.hRDepartment.findUnique({ where: { id: data.departmentId }, select: { id: true, name: true } });
  if (!dept) throw new Error('Department not found');

  // ── Create ───────────────────────────────────────────────────────────────
  const employee = await prisma.hREmployee.create({
    data: {
      employeeCode:   data.employeeCode,
      departmentId:   data.departmentId,
      fullName:       data.fullName,
      gender:         data.gender as any,
      email:          data.email,
      phone:          data.phone   ?? null,
      dateOfBirth:    data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      address:        data.address ?? null,
      position:       resolvedPosition,
      employmentType: data.employmentType as any,
      systemRole:     data.systemRole ?? null,
      courseId:       resolvedCourseId,
      hireDate:       new Date(data.hireDate),
      contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
      managerId:       data.managerId ?? null,
      education:       data.education ?? null,
      experienceYears: data.experienceYears ?? 0,
      basicSalary:     data.basicSalary,
      allowances:      data.allowances  ?? 0,
      deductions:      data.deductions  ?? 0,
      nationalId:      data.nationalId  ?? null,
      bankAccount:     data.bankAccount ?? null,
      taxNumber:       data.taxNumber   ?? null,
      faydaIdUrl:          data.faydaIdUrl          ?? null,
      faydaIdFileSize:     data.faydaIdFileSize      ?? null,
      certificateUrl:      data.certificateUrl       ?? null,
      certificateFileSize: data.certificateFileSize  ?? null,
      emergencyName:     data.emergencyName    ?? null,
      emergencyPhone:    data.emergencyPhone   ?? null,
      emergencyRelation: data.emergencyRelation ?? null,
      avatarUrl:         data.avatarUrl        ?? null,
      contractStatus:    data.contractEndDate ? 'EXPIRING_SOON' : 'ACTIVE',
    },
  });

  // Seed leave balances for new employee
  const year = new Date().getFullYear();
  for (const [type, entitled] of [['ANNUAL',20],['SICK',15],['STUDY',10]] as [string,number][]) {
    await prisma.hRLeaveBalance.create({
      data: { employeeId: employee.id, leaveType: type as any, entitled, taken: 0, remaining: entitled, year },
    });
  }

  await writeHRAudit({
    actorUserId,
    actorName,
    action:       'Employee Created',
    employeeName: data.fullName,
    module:       'Employees',
    description:  `New employee ${data.fullName} (${data.employeeCode}) created with role ${data.systemRole ?? 'N/A'}.`,
    status:       'SUCCESS',
    metadata: {
      employeeCode: data.employeeCode,
      systemRole:   data.systemRole,
      actorRole,
    } as any,
  });

  // NOTE: Invitation is NOT sent automatically on creation.
  // HR must explicitly click "Invite" in the employee Actions column.
  console.log(`[HR] Employee ${data.fullName} (${data.employeeCode}) created. Invitation must be sent manually.`);

  return {
    ...employee,
    invitationStatus: 'NONE' as const,
  };
}

// ── Send Invitation to HR Employee ────────────────────────────────────────────

/**
 * Sends a secure, time-limited account activation invitation to an HR employee.
 * The employee must already exist in HREmployee. No duplicate accounts are created.
 * Returns the invitation link (for logging) and whether the email succeeded.
 */
export async function inviteEmployee(
  employeeId: string,
  actorUserId: string,
  ipAddress?: string | null,
) {
  const employee = await prisma.hREmployee.findUnique({
    where: { id: employeeId },
    include: { department: { select: { name: true } } },
  });
  if (!employee) throw new Error('Employee not found');
  if (!employee.email) throw new Error('Employee has no registered email address');
  if (!employee.systemRole) throw new Error('Employee has no system role assigned. Edit the employee to assign a role before sending an invitation.');

  const normalizedEmail = employee.email.trim().toLowerCase();

  // Check if employee already has an active (non-expired, non-revoked) invitation
  const existingPending = await prisma.staffInvitation.findFirst({
    where: {
      email:      normalizedEmail,
      acceptedAt: null,
      revokedAt:  null,
      expiresAt:  { gt: new Date() },
    },
  });
  if (existingPending) {
    throw new Error(`An active invitation is already pending for ${normalizedEmail}. Use "Resend Invite" to send a new one.`);
  }

  // Check if user account already exists and is active
  const existingUser = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true, status: true },
  });
  if (existingUser && existingUser.status === AccountStatus.ACTIVE) {
    throw new Error(`${normalizedEmail} already has an active account. No invitation needed.`);
  }

  // Find the actor user id (must exist as invitedByUser FK in StaffInvitation)
  let invitingUserId = actorUserId;
  if (!invitingUserId) {
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: [Role.HR_OFFICER, Role.ADMIN, Role.SUPER_ADMIN] } },
      select: { id: true },
    });
    if (!adminUser) throw new Error('Could not determine inviting user. Please ensure you are logged in.');
    invitingUserId = adminUser.id;
  }

  // Resolve the academic department (StaffInvitation requires an academic Department FK)
  const academicDept = await prisma.department.findFirst({
    where: {
      OR: [
        { name: { equals: employee.department.name, mode: 'insensitive' } },
        { id: employee.departmentId },
      ],
      isActive: true,
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });

  // If no academic dept found, use the first active TVET dept as fallback
  const deptForInvitation = academicDept ?? await prisma.department.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  if (!deptForInvitation) throw new Error('No active department found. Cannot send invitation.');

  // Revoke any previous expired/revoked invitations (cleanup)
  await prisma.staffInvitation.updateMany({
    where: { email: normalizedEmail, acceptedAt: null },
    data: { revokedAt: new Date() },
  });

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 3600 * 1000);

  // Create invitation record
  await prisma.staffInvitation.create({
    data: {
      email:           normalizedEmail,
      fullName:        employee.fullName.trim(),
      role:            employee.systemRole as any,
      departmentId:    deptForInvitation.id,
      positionTitle:   employee.position,
      employeeId:      employee.employeeCode,
      phone:           employee.phone ?? null,
      tokenHash,
      expiresAt,
      invitedByUserId: invitingUserId,
    },
  });

  // Build activation link
  const appBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const activationLink = `${appBaseUrl}/activate-account?token=${rawToken}`;

  console.log(`\n========================================================================`);
  console.log(`🎓 [ACCOUNT ACTIVATION LINK GENERATED]`);
  console.log(`   Recipient: ${employee.fullName} <${normalizedEmail}>`);
  console.log(`   Role:      ${employee.systemRole}`);
  console.log(`   Link:      ${activationLink}`);
  console.log(`========================================================================\n`);

  // Send invitation email
  const emailResult = await getEmailProvider().sendAccountActivationEmail(normalizedEmail, {
    fullName:       employee.fullName.trim(),
    role:           employee.systemRole,
    position:       employee.position,
    departmentName: deptForInvitation.name,
    activationLink,
    expiresInHours: INVITE_EXPIRY_HOURS,
  });

  if (!emailResult.success) {
    // Revoke the invitation we just created so HR can retry cleanly
    await prisma.staffInvitation.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    throw new Error(`Failed to send invitation email: ${emailResult.error ?? 'Unknown mail provider error'}`);
  }

  console.log(`[HR Invite] Invitation sent to ${normalizedEmail} (${employee.employeeCode}) for role ${employee.systemRole}. Link: ${activationLink}`);

  await writeHRAudit({
    actorUserId,
    actorName: 'HR Officer',
    action:    'Invitation Sent',
    employeeName: employee.fullName,
    module:    'Employees',
    description: `Activation invitation sent to ${normalizedEmail} for role ${employee.systemRole}.`,
    status:    'SUCCESS',
  });

  return { success: true, email: normalizedEmail, activationLink, expiresInHours: INVITE_EXPIRY_HOURS };
}

// ── Resend Invitation to HR Employee ──────────────────────────────────────────

/**
 * Resends an invitation to an employee who was already invited but hasn't activated yet.
 * Revokes old token and issues a fresh 48-hour token.
 */
export async function resendEmployeeInvite(
  employeeId: string,
  actorUserId: string,
) {
  const employee = await prisma.hREmployee.findUnique({
    where: { id: employeeId },
    include: { department: { select: { name: true } } },
  });
  if (!employee) throw new Error('Employee not found');
  if (!employee.email) throw new Error('Employee has no registered email address');
  if (!employee.systemRole) throw new Error('Employee has no system role assigned.');

  const normalizedEmail = employee.email.trim().toLowerCase();

  // Check already activated
  const accepted = await prisma.staffInvitation.findFirst({
    where: { email: normalizedEmail, acceptedAt: { not: null } },
  });
  if (accepted) {
    throw new Error(`${normalizedEmail} has already accepted an invitation and activated their account.`);
  }

  // Revoke all existing pending invitations
  await prisma.staffInvitation.updateMany({
    where: { email: normalizedEmail, acceptedAt: null },
    data: { revokedAt: new Date() },
  });

  // Now call inviteEmployee (which will create a fresh token and send email)
  return inviteEmployee(employeeId, actorUserId);
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateEmployee(
  id: string,
  data: Partial<{
    departmentId:   string;
    position:       string;
    employmentType: string;
    contractStatus: string;
    status:         string;
    systemRole:     string;
    courseId:       string | null;
    contractEndDate: string | null;
    managerId:       string | null;
    fullName:        string;
    email:           string;
    phone:           string;
    dateOfBirth:     string;
    address:         string;
    education:       string;
    experienceYears: number;
    basicSalary:     number;
    allowances:      number;
    deductions:      number;
    nationalId:      string;
    bankAccount:     string;
    taxNumber:       string;
    faydaIdUrl:          string;
    faydaIdFileSize:     string;
    certificateUrl:      string;
    certificateFileSize: string;
    emergencyName:       string;
    emergencyPhone:      string;
    emergencyRelation:   string;
    avatarUrl:           string;
  }>,
  actorName: string,
  actorRole: string,
  actorUserId?: string,
) {
  const employee = await prisma.hREmployee.findUnique({
    where:  { id },
    select: { fullName: true, systemRole: true },
  });
  if (!employee) throw new Error('Employee not found');

  // Role permission check on update (if changing systemRole)
  if (data.systemRole && data.systemRole !== employee.systemRole) {
    assertRolePermission(data.systemRole, actorRole);
  }

  // Course resolution on update
  let resolvedCourseId: string | null | undefined = undefined;
  if ('courseId' in data) {
    resolvedCourseId = resolveCourseId(data.courseId ?? undefined);
  }

  // Salary validation
  if (data.basicSalary  !== undefined && data.basicSalary  < 0) throw new Error('Basic salary cannot be negative');
  if (data.allowances   !== undefined && data.allowances   < 0) throw new Error('Allowances cannot be negative');
  if (data.deductions   !== undefined && data.deductions   < 0) throw new Error('Deductions cannot be negative');

  // Email uniqueness
  if (data.email) {
    const conflict = await prisma.hREmployee.findFirst({
      where: { email: data.email, NOT: { id } },
      select: { id: true },
    });
    if (conflict) throw new Error(`Email ${data.email} is already in use`);
  }

  const updated = await prisma.hREmployee.update({
    where: { id },
    data: {
      ...( data.departmentId    && { departmentId:    data.departmentId }),
      ...( data.position        && { position:        data.position }),
      ...( data.employmentType  && { employmentType:  data.employmentType as any }),
      ...( data.contractStatus  && { contractStatus:  data.contractStatus as any }),
      ...( data.status          && { status:          data.status as any }),
      ...( data.systemRole      !== undefined && { systemRole: data.systemRole }),
      ...( resolvedCourseId     !== undefined && { courseId:   resolvedCourseId }),
      ...( 'contractEndDate' in data && { contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null }),
      ...( 'managerId'      in data && { managerId:      data.managerId }),
      ...( data.fullName        && { fullName:        data.fullName }),
      ...( data.email           && { email:           data.email }),
      ...( data.phone           !== undefined && { phone:       data.phone }),
      ...( data.dateOfBirth     !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
      ...( data.address         !== undefined && { address:     data.address }),
      ...( data.education       && { education:       data.education }),
      ...( data.experienceYears !== undefined && { experienceYears: data.experienceYears }),
      ...( data.basicSalary     !== undefined && { basicSalary:     data.basicSalary }),
      ...( data.allowances      !== undefined && { allowances:      data.allowances }),
      ...( data.deductions      !== undefined && { deductions:      data.deductions }),
      ...( data.nationalId      !== undefined && { nationalId:      data.nationalId }),
      ...( data.bankAccount     !== undefined && { bankAccount:     data.bankAccount }),
      ...( data.taxNumber       !== undefined && { taxNumber:       data.taxNumber }),
      ...( data.faydaIdUrl          !== undefined && { faydaIdUrl:          data.faydaIdUrl }),
      ...( data.faydaIdFileSize     !== undefined && { faydaIdFileSize:     data.faydaIdFileSize }),
      ...( data.certificateUrl      !== undefined && { certificateUrl:      data.certificateUrl }),
      ...( data.certificateFileSize !== undefined && { certificateFileSize: data.certificateFileSize }),
      ...( data.emergencyName       !== undefined && { emergencyName:       data.emergencyName }),
      ...( data.emergencyPhone      !== undefined && { emergencyPhone:      data.emergencyPhone }),
      ...( data.emergencyRelation   !== undefined && { emergencyRelation:   data.emergencyRelation }),
      ...( data.avatarUrl           !== undefined && { avatarUrl:           data.avatarUrl }),
    },
  });

  await writeHRAudit({
    actorUserId,
    actorName,
    action:       'Employee Updated',
    employeeName: employee.fullName,
    module:       'Employees',
    description:  `Employee record updated for ${employee.fullName}.`,
    status:       'SUCCESS',
  });

  return updated;
}

// ── Deactivate ────────────────────────────────────────────────────────────────

export async function deactivateEmployee(id: string, actorName: string, actorUserId?: string) {
  const employee = await prisma.hREmployee.findUnique({
    where:  { id },
    select: { fullName: true, status: true },
  });
  if (!employee) throw new Error('Employee not found');
  if (employee.status === 'TERMINATED') throw new Error('Employee is already terminated');

  const updated = await prisma.hREmployee.update({
    where: { id },
    data:  { status: 'INACTIVE', isActive: false },
  });

  await writeHRAudit({
    actorUserId,
    actorName,
    action:       'Employee Deactivated',
    employeeName: employee.fullName,
    module:       'Employees',
    description:  `Employee ${employee.fullName} set to INACTIVE.`,
    status:       'SUCCESS',
  });

  return updated;
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function getDepartments() {
  // Return active HR organizational departments (separate from academic TVET / Short Program departments)
  return prisma.hRDepartment.findMany({
    where: {
      isActive: true,
      name: {
        notIn: [
          'Theatrical Art & Digital Media',
          'Computer Science & Engineering',
        ],
      },
    },
    include: { _count: { select: { employees: { where: { status: 'ACTIVE' } } } } },
    orderBy: { name: 'asc' },
  });
}
