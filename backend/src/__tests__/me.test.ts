/**
 * GET /api/auth/me + POST /api/auth/logout + POST /api/auth/refresh
 * Phase 3 Test Suite
 */

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import testApp from './testApp';
import { AccountStatus, Role } from '../types/auth';
import { signAccessToken, signRefreshToken } from '../lib/auth';

const STRONG_PASSWORD = 'TestPass1!';
const STRONG_HASH = bcrypt.hashSync(STRONG_PASSWORD, 12);

async function createActiveUser(emailSuffix: string) {
  return prisma.user.create({
    data: {
      fullName:         'Me Test User',
      email:            `me-test-${emailSuffix}@test.local`,
      passwordHash:     STRONG_HASH,
      role:             Role.STUDENT,
      status:           AccountStatus.ACTIVE,
      emailVerified:    false,
      phoneVerified:    false,
      profileCompleted: false,
      profileCompletion: 0,
    },
  });
}

async function loginAndGetCookies(email: string): Promise<string[]> {
  const res = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: email, password: STRONG_PASSWORD });
  const rawCookies = res.headers['set-cookie'];
  return Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
}

async function cleanup(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

describe('GET /api/auth/me', () => {

  it('1. Returns authenticated user with valid accessToken cookie', async () => {
    const user = await createActiveUser(`me1-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.passwordHash).toBeUndefined();
    await cleanup(user.id);
  });

  it('2. Returns 401 with no cookie', async () => {
    const res = await request(testApp).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.authenticated).toBe(false);
  });

  it('3. Returns 401 with a tampered / invalid token', async () => {
    const res = await request(testApp)
      .get('/api/auth/me')
      .set('Cookie', ['accessToken=not.a.real.jwt']);
    expect(res.status).toBe(401);
  });

  it('4. Returns 401 after session is revoked', async () => {
    const user = await createActiveUser(`me4-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    // Revoke all sessions
    await prisma.session.updateMany({ where: { userId: user.id }, data: { isRevoked: true } });

    const res = await request(testApp)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(res.status).toBe(401);
    await cleanup(user.id);
  });

  it('5. Returns full user object including profileCompleted', async () => {
    const user = await createActiveUser(`me5-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(res.body.user.profileCompleted).toBe(false);
    expect(res.body.user.profileCompletion).toBe(0);
    expect(res.body.user.role).toBe(Role.STUDENT);
    await cleanup(user.id);
  });

});

describe('POST /api/auth/logout', () => {

  it('6. Logout clears cookies and returns 200', async () => {
    const user = await createActiveUser(`logout1-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const rawCookies = res.headers['set-cookie'];
    const str = Array.isArray(rawCookies) ? rawCookies.join('; ') : (rawCookies ?? '');
    expect(str).toMatch(/accesstoken=;|accesstoken=$/i);
    await cleanup(user.id);
  });

  it('7. Session deleted from DB after logout', async () => {
    const user = await createActiveUser(`logout2-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    // Confirm session exists
    const before = await prisma.session.findMany({ where: { userId: user.id } });
    expect(before.length).toBeGreaterThan(0);

    await request(testApp)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    const after = await prisma.session.findMany({ where: { userId: user.id } });
    expect(after.length).toBe(0);
    await cleanup(user.id);
  });

  it('8. GET /api/auth/me returns 401 after logout', async () => {
    const user = await createActiveUser(`logout3-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    await request(testApp).post('/api/auth/logout').set('Cookie', cookies);

    const meRes = await request(testApp)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(meRes.status).toBe(401);
    await cleanup(user.id);
  });

  it('9. Logout is safe with no cookies (does not throw)', async () => {
    const res = await request(testApp).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });

});

describe('POST /api/auth/refresh', () => {

  it('10. Valid refresh token → 200, new cookies issued', async () => {
    const user = await createActiveUser(`refresh1-${Date.now()}`);
    const loginRes = await request(testApp)
      .post('/api/auth/login')
      .send({ identifier: user.email, password: STRONG_PASSWORD });

    const rawLogin = loginRes.headers['set-cookie'];
    const loginCookies = Array.isArray(rawLogin) ? rawLogin : rawLogin ? [rawLogin] : [];

    const refreshRes = await request(testApp)
      .post('/api/auth/refresh')
      .set('Cookie', loginCookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.user).toBeDefined();

    const rawRefresh = refreshRes.headers['set-cookie'];
    const newCookies = Array.isArray(rawRefresh) ? rawRefresh.join('; ') : (rawRefresh ?? '');
    expect(newCookies.toLowerCase()).toMatch(/accesstoken=/);
    await cleanup(user.id);
  });

  it('11. No refresh token → 401', async () => {
    const res = await request(testApp).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('12. Revoked session → 401 on refresh', async () => {
    const user = await createActiveUser(`refresh3-${Date.now()}`);
    const rawCookies = await loginAndGetCookies(user.email!);

    await prisma.session.updateMany({ where: { userId: user.id }, data: { isRevoked: true } });

    const res = await request(testApp)
      .post('/api/auth/refresh')
      .set('Cookie', rawCookies);

    expect(res.status).toBe(401);
    await cleanup(user.id);
  });

});

afterAll(async () => { await prisma.$disconnect(); });
