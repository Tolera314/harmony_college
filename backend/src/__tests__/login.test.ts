/**
 * POST /api/auth/login — Phase 3 Test Suite
 * ───────────────────────────────────────────
 * Tests login, session creation, cookie security, account-status enforcement,
 * brute-force counter, and role safety.
 *
 * Requires a real PostgreSQL DB with Phase 1 migration applied.
 * Set DATABASE_URL in .env.test or .env before running.
 */

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import testApp from './testApp';
import { AccountStatus, Role } from '../types/auth';

// ── helpers ──────────────────────────────────────────────────────────────────

const BASE = '/api/auth/login';

const STRONG_PASSWORD = 'TestPass1!';
const STRONG_HASH = bcrypt.hashSync(STRONG_PASSWORD, 12);

async function createUser(overrides: Partial<{
  email: string; phone: string; status: AccountStatus; role: Role;
  failedLoginAttempts: number;
}> = {}) {
  return prisma.user.create({
    data: {
      fullName:            'Login Test User',
      email:               overrides.email ?? `login-test-${Date.now()}@test.local`,
      phone:               overrides.phone,
      passwordHash:        STRONG_HASH,
      role:                overrides.role  ?? Role.STUDENT,
      status:              overrides.status ?? AccountStatus.ACTIVE,
      failedLoginAttempts: overrides.failedLoginAttempts ?? 0,
      emailVerified:       false,
      phoneVerified:       false,
      profileCompleted:    false,
      profileCompletion:   0,
    },
  });
}

async function cleanupUser(id: string) {
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {

  it('1. Successful login with email → 200, user returned', async () => {
    const user = await createUser();
    const res = await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.role).toBe(Role.STUDENT);
    await cleanupUser(user.id);
  });

  it('2. Successful login with phone → 200, user returned', async () => {
    const user = await createUser({ email: undefined, phone: '+251912300001' });
    const res = await request(testApp).post(BASE).send({ identifier: '0912300001', password: STRONG_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe('+251912300001');
    await cleanupUser(user.id);
  });

  it('3. Sets accessToken cookie (HttpOnly)', async () => {
    const user = await createUser({ email: `cookie-test-${Date.now()}@test.local` });
    const res = await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    const rawCookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(rawCookies) ? rawCookies.join('; ') : (rawCookies ?? '');
    expect(cookieStr.toLowerCase()).toMatch(/accesstoken=/i);
    expect(cookieStr.toLowerCase()).toMatch(/httponly/i);
    await cleanupUser(user.id);
  });

  it('4. Sets refreshToken cookie (HttpOnly)', async () => {
    const user = await createUser({ email: `rt-test-${Date.now()}@test.local` });
    const res = await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    const rawCookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(rawCookies) ? rawCookies.join('; ') : (rawCookies ?? '');
    expect(cookieStr.toLowerCase()).toMatch(/refreshtoken=/i);
    expect(cookieStr.toLowerCase()).toMatch(/httponly/i);
    await cleanupUser(user.id);
  });

  it('5. Session record created in DB on login', async () => {
    const user = await createUser({ email: `session-test-${Date.now()}@test.local` });
    await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions.length).toBeGreaterThan(0);
    await cleanupUser(user.id);
  });

  it('6. passwordHash is never returned', async () => {
    const user = await createUser({ email: `hash-test-${Date.now()}@test.local` });
    const res = await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    expect(res.body.user?.passwordHash).toBeUndefined();
    expect(res.body.user?.password).toBeUndefined();
    await cleanupUser(user.id);
  });

  it('7. Wrong password → 401 generic (no account enumeration)', async () => {
    const user = await createUser({ email: `wrong-pw-${Date.now()}@test.local` });
    const res = await request(testApp).post(BASE).send({ identifier: user.email, password: 'WrongPass1!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials.');
    await cleanupUser(user.id);
  });

  it('8. Unknown email → 401 generic (same message as wrong password)', async () => {
    const res = await request(testApp).post(BASE).send({ identifier: 'nobody@nowhere.local', password: STRONG_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials.');
  });

  it('9. PENDING_VERIFICATION → 403 with code', async () => {
    const user = await createUser({
      email:  `pending-${Date.now()}@test.local`,
      status: AccountStatus.PENDING_VERIFICATION,
    });
    const res = await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PENDING_VERIFICATION');
    await cleanupUser(user.id);
  });

  it('10. SUSPENDED → 403 with code', async () => {
    const user = await createUser({
      email:  `suspended-${Date.now()}@test.local`,
      status: AccountStatus.SUSPENDED,
    });
    const res = await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    await cleanupUser(user.id);
  });

  it('11. LOCKED → 403 with code', async () => {
    const user = await createUser({
      email:  `locked-${Date.now()}@test.local`,
      status: AccountStatus.LOCKED,
    });
    const res = await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_LOCKED');
    await cleanupUser(user.id);
  });

  it('12. DEACTIVATED → 403 with code', async () => {
    const user = await createUser({
      email:  `deactivated-${Date.now()}@test.local`,
      status: AccountStatus.DEACTIVATED,
    });
    const res = await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_DEACTIVATED');
    await cleanupUser(user.id);
  });

  it('13. 5 consecutive wrong passwords lock the account', async () => {
    const user = await createUser({ email: `lockout-${Date.now()}@test.local` });
    for (let i = 0; i < 5; i++) {
      await request(testApp).post(BASE).send({ identifier: user.email, password: 'WrongPass1!' });
    }
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.status).toBe(AccountStatus.LOCKED);
    await cleanupUser(user.id);
  });

  it('14. lastLoginAt updated on successful login', async () => {
    const user = await createUser({ email: `lastseen-${Date.now()}@test.local` });
    await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.lastLoginAt).not.toBeNull();
    await cleanupUser(user.id);
  });

  it('15. failedLoginAttempts reset to 0 on successful login', async () => {
    const user = await createUser({
      email: `reset-counter-${Date.now()}@test.local`,
      failedLoginAttempts: 3,
    });
    await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.failedLoginAttempts).toBe(0);
    await cleanupUser(user.id);
  });

  it('16. Role is read from DB — attacker cannot elevate via request body', async () => {
    const user = await createUser({ email: `role-safe-${Date.now()}@test.local` });
    const res = await request(testApp)
      .post(BASE)
      .send({ identifier: user.email, password: STRONG_PASSWORD, role: 'SUPER_ADMIN' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe(Role.STUDENT);
    await cleanupUser(user.id);
  });

  it('17. Empty identifier → 400', async () => {
    const res = await request(testApp).post(BASE).send({ identifier: '', password: STRONG_PASSWORD });
    expect(res.status).toBe(400);
  });

  it('18. Missing password → 400', async () => {
    const res = await request(testApp).post(BASE).send({ identifier: 'user@test.local' });
    expect(res.status).toBe(400);
  });

  it('19. AuditLog LOGIN_SUCCESS written on successful login', async () => {
    const user = await createUser({ email: `audit-ok-${Date.now()}@test.local` });
    await request(testApp).post(BASE).send({ identifier: user.email, password: STRONG_PASSWORD });
    const log = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'LOGIN_SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
    await cleanupUser(user.id);
  });

  it('20. AuditLog LOGIN_FAILED written on wrong password', async () => {
    const user = await createUser({ email: `audit-fail-${Date.now()}@test.local` });
    await request(testApp).post(BASE).send({ identifier: user.email, password: 'WrongPass1!' });
    const log = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'LOGIN_FAILED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).not.toBeNull();
    await cleanupUser(user.id);
  });

});

afterAll(async () => { await prisma.$disconnect(); });
