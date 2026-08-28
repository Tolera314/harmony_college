import request from 'supertest';
import testApp from './testApp';
import { prisma } from '../lib/prisma';
import { Role, AccountStatus, AuditAction } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { signAccessToken } from '../lib/auth';
import {
  createStaffInvitation,
  validateInvitationToken,
  acceptStaffInvitation,
  resendStaffInvitation,
  revokeStaffInvitation,
  updateStaffInvitation,
  validateRolePermission,
} from '../services/invitationService';

describe('Staff Invitation & Admin Provisioning Architecture', () => {
  let superAdminUser: any;
  let adminUser: any;
  let instructorUser: any;
  let superAdminCookie: string;
  let adminCookie: string;
  let instructorCookie: string;
  let testDepartment: any;

  beforeAll(async () => {
    // 1. Setup active test department
    testDepartment = await prisma.department.findFirst({ where: { code: 'CS_TEST_DEPT' } });
    if (!testDepartment) {
      testDepartment = await prisma.department.create({
        data: {
          name:        'Computer Science Test Dept',
          code:        'CS_TEST_DEPT',
          description: 'Department created for staff invitation automated tests',
          isActive:    true,
        },
      });
    }

    // 2. Setup Super Admin
    const saEmail = 'superadmin.inv.test@harmony.edu.et';
    await prisma.user.deleteMany({ where: { email: saEmail } });
    superAdminUser = await prisma.user.create({
      data: {
        fullName:      'Super Admin Test',
        email:         saEmail,
        passwordHash:  await bcrypt.hash('AdminPassword123!', 10),
        role:          Role.SUPER_ADMIN,
        status:        AccountStatus.ACTIVE,
        emailVerified: true,
      },
    });
    const saToken = await signAccessToken({
      userId:           superAdminUser.id,
      sessionId:        'dummy-sa-session',
      email:            superAdminUser.email,
      role:             superAdminUser.role,
      status:           superAdminUser.status,
      profileCompleted: true,
    });
    superAdminCookie = `accessToken=${saToken}`;

    // 3. Setup Admin
    const adminEmail = 'admin.inv.test@harmony.edu.et';
    await prisma.user.deleteMany({ where: { email: adminEmail } });
    adminUser = await prisma.user.create({
      data: {
        fullName:      'Admin Test',
        email:         adminEmail,
        passwordHash:  await bcrypt.hash('AdminPassword123!', 10),
        role:          Role.ADMIN,
        status:        AccountStatus.ACTIVE,
        emailVerified: true,
      },
    });
    const adminToken = await signAccessToken({
      userId:           adminUser.id,
      sessionId:        'dummy-admin-session',
      email:            adminUser.email,
      role:             adminUser.role,
      status:           adminUser.status,
      profileCompleted: true,
    });
    adminCookie = `accessToken=${adminToken}`;

    // 4. Setup Instructor
    const instEmail = 'instructor.inv.test@harmony.edu.et';
    await prisma.user.deleteMany({ where: { email: instEmail } });
    instructorUser = await prisma.user.create({
      data: {
        fullName:      'Instructor Test',
        email:         instEmail,
        passwordHash:  await bcrypt.hash('Password123!', 10),
        role:          Role.INSTRUCTOR,
        status:        AccountStatus.ACTIVE,
        emailVerified: true,
      },
    });
    const instToken = await signAccessToken({
      userId:           instructorUser.id,
      sessionId:        'dummy-inst-session',
      email:            instructorUser.email,
      role:             instructorUser.role,
      status:           instructorUser.status,
      profileCompleted: true,
    });
    instructorCookie = `accessToken=${instToken}`;
  });

  afterAll(async () => {
    // Cleanup invitation records & created users
    await prisma.staffInvitation.deleteMany({
      where: {
        email: { contains: '.test@harmony.edu.et' },
      },
    });
  });

  describe('1. Role Authorization Security', () => {
    it('allows Super Admin to invite any staff role', () => {
      expect(() => validateRolePermission(Role.SUPER_ADMIN, Role.INSTRUCTOR)).not.toThrow();
      expect(() => validateRolePermission(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).not.toThrow();
      expect(() => validateRolePermission(Role.SUPER_ADMIN, Role.REGISTRAR)).not.toThrow();
    });

    it('prevents Admin from inviting Super Admin or another Admin', () => {
      expect(() => validateRolePermission(Role.ADMIN, Role.SUPER_ADMIN)).toThrow();
      expect(() => validateRolePermission(Role.ADMIN, Role.ADMIN)).toThrow();
      expect(() => validateRolePermission(Role.ADMIN, Role.INSTRUCTOR)).not.toThrow();
    });

    it('rejects invitations created by non-admin roles (e.g. Instructor)', async () => {
      const res = await request(testApp)
        .post('/api/admin/invitations')
        .set('Cookie', [instructorCookie])
        .send({
          fullName:     'Unauthorized Invite',
          email:        'unauth.test@harmony.edu.et',
          role:         Role.INSTRUCTOR,
          departmentId: testDepartment.id,
        });

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('2. Invitation Generation & Token Hashing', () => {
    it('creates invitation and does NOT store raw token in database', async () => {
      const targetEmail = 'new.instructor.test@harmony.edu.et';
      await prisma.user.deleteMany({ where: { email: targetEmail } });
      await prisma.staffInvitation.deleteMany({ where: { email: targetEmail } });

      const res = await createStaffInvitation(
        {
          fullName:       'New Instructor Test',
          email:          targetEmail,
          role:           Role.INSTRUCTOR,
          departmentId:   testDepartment.id,
          positionTitle:  'Assistant Professor',
          specialization: 'Artificial Intelligence',
        },
        superAdminUser.id,
        Role.SUPER_ADMIN
      );

      expect(res.invitation.email).toBe(targetEmail);
      expect(res.invitation.status).toBe('PENDING');
      expect(res.rawToken).toBeDefined();
      expect(res.rawToken.length).toBe(64); // 32 hex bytes

      // Verify DB stores only SHA-256 hash, NOT raw token
      const dbInv = await prisma.staffInvitation.findUnique({ where: { id: res.invitation.id } });
      expect(dbInv).not.toBeNull();
      expect(dbInv?.tokenHash).not.toBe(res.rawToken);
      const expectedHash = crypto.createHash('sha256').update(res.rawToken).digest('hex');
      expect(dbInv?.tokenHash).toBe(expectedHash);
    });

    it('prevents creating duplicate invitation for active user', async () => {
      await expect(
        createStaffInvitation(
          {
            fullName:     'Super Admin Duplicate',
            email:        superAdminUser.email,
            role:         Role.INSTRUCTOR,
            departmentId: testDepartment.id,
          },
          superAdminUser.id,
          Role.SUPER_ADMIN
        )
      ).rejects.toThrow('An account with this email address already exists.');
    });
  });

  describe('3. Token Validation & Public Acceptance Flow', () => {
    let rawToken: string;
    let targetEmail = 'accept.instructor.test@harmony.edu.et';

    beforeEach(async () => {
      await prisma.user.deleteMany({ where: { email: targetEmail } });
      await prisma.staffInvitation.deleteMany({ where: { email: targetEmail } });

      const res = await createStaffInvitation(
        {
          fullName:     'Acceptance Test Faculty',
          email:        targetEmail,
          role:         Role.INSTRUCTOR,
          departmentId: testDepartment.id,
          employeeId:   'EMP-ACC-99',
        },
        superAdminUser.id,
        Role.SUPER_ADMIN
      );
      rawToken = res.rawToken;
    });

    it('validates a valid invitation token', async () => {
      const val = await validateInvitationToken(rawToken);
      expect(val.isValid).toBe(true);
      expect(val.email).toBe(targetEmail);
      expect(val.role).toBe(Role.INSTRUCTOR);
      expect(val.departmentName).toBe(testDepartment.name);
    });

    it('rejects an invalid token', async () => {
      const val = await validateInvitationToken('invalid-fake-token-12345');
      expect(val.isValid).toBe(false);
      expect(val.reason).toBe('INVALID_TOKEN');
    });

    it('accepts invitation, creates User + InstructorRecord inside transaction', async () => {
      const newUser = await acceptStaffInvitation(rawToken, 'SecurePass123!');

      expect(newUser.email).toBe(targetEmail);
      expect(newUser.role).toBe(Role.INSTRUCTOR);
      expect(newUser.emailVerified).toBe(true);
      expect(newUser.status).toBe(AccountStatus.ACTIVE);

      // Verify InstructorRecord was linked to departmentId
      const instRecord = await prisma.instructorRecord.findUnique({
        where: { userId: newUser.id },
      });
      expect(instRecord).not.toBeNull();
      expect(instRecord?.departmentId).toBe(testDepartment.id);

      // Verify Invitation is marked ACCEPTED
      const valAfter = await validateInvitationToken(rawToken);
      expect(valAfter.isValid).toBe(false);
      expect(valAfter.reason).toBe('ALREADY_ACCEPTED');
    });

    it('rejects acceptance with weak password', async () => {
      await expect(acceptStaffInvitation(rawToken, 'short')).rejects.toThrow(
        'Password must be at least 8 characters long.'
      );
    });
  });

  describe('4. Resend & Revoke Lifecycle', () => {
    let rawToken: string;
    let invId: string;
    const email = 'resend.revoke.test@harmony.edu.et';

    beforeEach(async () => {
      await prisma.user.deleteMany({ where: { email } });
      await prisma.staffInvitation.deleteMany({ where: { email } });

      const res = await createStaffInvitation(
        {
          fullName:     'Resend Revoke Test',
          email,
          role:         Role.DEPARTMENT_HEAD,
          departmentId: testDepartment.id,
        },
        superAdminUser.id,
        Role.SUPER_ADMIN
      );
      rawToken = res.rawToken;
      invId    = res.invitation.id;
    });

    it('revokes an active invitation token immediately', async () => {
      const revoked = await revokeStaffInvitation(invId, superAdminUser.id, Role.SUPER_ADMIN);
      expect(revoked.status).toBe('REVOKED');

      const val = await validateInvitationToken(rawToken);
      expect(val.isValid).toBe(false);
      expect(val.reason).toBe('REVOKED');
    });

    it('resending an invitation invalidates old token and returns new token', async () => {
      const resent = await resendStaffInvitation(invId, superAdminUser.id, Role.SUPER_ADMIN);
      expect(resent.rawToken).not.toBe(rawToken);

      // Old token must fail
      const oldVal = await validateInvitationToken(rawToken);
      expect(oldVal.isValid).toBe(false);

      // New token must pass
      const newVal = await validateInvitationToken(resent.rawToken);
      expect(newVal.isValid).toBe(true);
      expect(newVal.email).toBe(email);
    });

    it('updating an invitation corrects details, invalidates old token, and re-invites new email', async () => {
      const correctedEmail = 'corrected.email.test@harmony.edu.et';
      await prisma.user.deleteMany({ where: { email: correctedEmail } });

      const updated = await updateStaffInvitation(
        invId,
        {
          fullName: 'Corrected Staff Name',
          email: correctedEmail,
        },
        superAdminUser.id,
        Role.SUPER_ADMIN
      );

      expect(updated.invitation.email).toBe(correctedEmail);
      expect(updated.invitation.fullName).toBe('Corrected Staff Name');

      // Old token must fail
      const oldVal = await validateInvitationToken(rawToken);
      expect(oldVal.isValid).toBe(false);

      // New token must pass with corrected email
      const newVal = await validateInvitationToken(updated.rawToken);
      expect(newVal.isValid).toBe(true);
      expect(newVal.email).toBe(correctedEmail);
      expect(newVal.fullName).toBe('Corrected Staff Name');
    });
  });

  describe('5. Audit Logging', () => {
    it('creates audit log entries for invitation creation & acceptance', async () => {
      const auditEmail = 'audit.test@harmony.edu.et';
      await prisma.user.deleteMany({ where: { email: auditEmail } });
      await prisma.staffInvitation.deleteMany({ where: { email: auditEmail } });

      const res = await createStaffInvitation(
        {
          fullName:     'Audit Test User',
          email:        auditEmail,
          role:         Role.REGISTRAR,
          departmentId: testDepartment.id,
        },
        superAdminUser.id,
        Role.SUPER_ADMIN
      );

      const createLog = await prisma.auditLog.findFirst({
        where: { action: AuditAction.STAFF_INVITATION_CREATED },
        orderBy: { createdAt: 'desc' },
      });
      expect(createLog).not.toBeNull();
      expect(createLog?.metadata).toContain(auditEmail);

      await acceptStaffInvitation(res.rawToken, 'ValidPassword123!');

      const acceptLog = await prisma.auditLog.findFirst({
        where: { action: AuditAction.STAFF_INVITATION_ACCEPTED },
        orderBy: { createdAt: 'desc' },
      });
      expect(acceptLog).not.toBeNull();
    });
  });
});
