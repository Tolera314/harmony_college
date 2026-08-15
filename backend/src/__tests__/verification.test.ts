/**
 * Phase 4 — Verification Test Suite
 * ────────────────────────────────────
 * Tests phone OTP and email token verification, resend cooldown,
 * max-attempts enforcement, account activation, and audit logging.
 *
 * Requires: DATABASE_URL pointing to a migrated PostgreSQL database.
 * Run: npm test
 */

import request      from 'supertest';
import bcrypt       from 'bcryptjs';
import { prisma }   from '../lib/prisma';
import testApp      from './testApp';
import { AccountStatus, Role, VerificationTokenType } from '../types/auth';
import { TOKEN_BCRYPT_ROUNDS, VERIFICATION_TOKEN_TTL_SECONDS } from '../types/auth';

// ── helpers ──────────────────────────────────────────────────────────────────

const STRONG_PASSWORD = 'TestPass1!';
const STRONG_HASH     = bcrypt.hashSync(STRONG_PASSWORD, 12);

async function makeUser(suffix: string, opts?: { hasEmail?: boolean; hasPhone?: boolean }) {
  const hasPhone = opts?.hasPhone !== false; // default true
  const hasEmail = opts?.hasEmail ?? false;
  return prisma.user.create({
    data: {
      fullName:            'Verify Test User',
      phone:               hasPhone ? `+2519${Math.floor(10000000 + Math.random() * 89999999)}` : null,
      email:               hasEmail ? `verify-${suffix}-${Math.random().toString(36).substring(7)}@test.local` : null,
      passwordHash:        STRONG_HASH,
      role:                Role.STUDENT,
      status:              AccountStatus.PENDING_VERIFICATION,
      phoneVerified:       false,
      emailVerified:       false,
      profileCompleted:    false,
      profileCompletion:   0,
      failedLoginAttempts: 0,
    },
  });
}

async function createToken(
  userId:   string,
  rawCode:  string,
  type:     VerificationTokenType,
  expiresInSeconds = VERIFICATION_TOKEN_TTL_SECONDS
) {
  const tokenHash = await bcrypt.hash(rawCode, TOKEN_BCRYPT_ROUNDS);
  return prisma.verificationToken.create({
    data: {
      userId,
      type,
      tokenHash,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      attempts:  0,
      used:      false,
    },
  });
}

async function cleanup(userId: string) {
  await prisma.verificationToken.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/verify/phone', () => {

  it('1. Valid code → 200, status=ACTIVE, cookies set', async () => {
    const user = await makeUser(`v1-${Date.now()}`);
    await createToken(user.id, '123456', VerificationTokenType.PHONE_OTP);

    const res = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: user.id, code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('ACTIVE');
    expect(res.body.user.phoneVerified).toBe(true);
    expect(res.body.user.passwordHash).toBeUndefined();

    const rawCookies = res.headers['set-cookie'];
    const cookieStr  = Array.isArray(rawCookies) ? rawCookies.join('; ') : (rawCookies ?? '');
    expect(cookieStr.toLowerCase()).toMatch(/accesstoken=/);
    expect(cookieStr.toLowerCase()).toMatch(/refreshtoken=/);

    await cleanup(user.id);
  });

  it('2. GET /api/auth/me works after phone verification', async () => {
    const user = await makeUser(`v2-${Date.now()}`);
    await createToken(user.id, '654321', VerificationTokenType.PHONE_OTP);

    const verifyRes = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: user.id, code: '654321' });
    expect(verifyRes.status).toBe(200);

    const cookies = verifyRes.headers['set-cookie'];
    const meRes   = await request(testApp)
      .get('/api/auth/me')
      .set('Cookie', Array.isArray(cookies) ? cookies : [cookies ?? '']);

    expect(meRes.status).toBe(200);
    expect(meRes.body.authenticated).toBe(true);
    await cleanup(user.id);
  });

  it('3. POST /api/auth/login succeeds after verification (was 403 before)', async () => {
    const user = await makeUser(`v3-${Date.now()}`);
    await createToken(user.id, '111222', VerificationTokenType.PHONE_OTP);

    // Before verification — login blocked
    const before = await request(testApp)
      .post('/api/auth/login')
      .send({ identifier: user.phone, password: STRONG_PASSWORD });
    expect(before.status).toBe(403);
    expect(before.body.code).toBe('PENDING_VERIFICATION');

    // Verify
    await request(testApp).post('/api/auth/verify/phone').send({ userId: user.id, code: '111222' });

    // After verification — login allowed
    const after = await request(testApp)
      .post('/api/auth/login')
      .send({ identifier: user.phone, password: STRONG_PASSWORD });
    expect(after.status).toBe(200);
    await cleanup(user.id);
  });

  it('4. Wrong code → 422 INVALID_CODE', async () => {
    const user = await makeUser(`v4-${Date.now()}`);
    await createToken(user.id, '999999', VerificationTokenType.PHONE_OTP);

    const res = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: user.id, code: '000000' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INVALID_CODE');
    await cleanup(user.id);
  });

  it('5. Wrong code increments attempts in DB', async () => {
    const user = await makeUser(`v5-${Date.now()}`);
    await createToken(user.id, '888888', VerificationTokenType.PHONE_OTP);

    await request(testApp).post('/api/auth/verify/phone').send({ userId: user.id, code: '000000' });

    const token = await prisma.verificationToken.findFirst({ where: { userId: user.id } });
    expect(token?.attempts).toBe(1);
    await cleanup(user.id);
  });

  it('6. 5 wrong codes → 410 MAX_ATTEMPTS', async () => {
    const user = await makeUser(`v6-${Date.now()}`);
    await createToken(user.id, '777777', VerificationTokenType.PHONE_OTP);

    for (let i = 0; i < 5; i++) {
      await request(testApp).post('/api/auth/verify/phone').send({ userId: user.id, code: '000000' });
    }
    const res = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: user.id, code: '777777' }); // correct code but exhausted
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('MAX_ATTEMPTS');
    await cleanup(user.id);
  });

  it('7. Expired token → 410 CODE_EXPIRED', async () => {
    const user = await makeUser(`v7-${Date.now()}`);
    await createToken(user.id, '555555', VerificationTokenType.PHONE_OTP, -1); // already expired

    const res = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: user.id, code: '555555' });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('CODE_EXPIRED');
    await cleanup(user.id);
  });

  it('8. Already-ACTIVE account → 400 ALREADY_VERIFIED', async () => {
    const user = await makeUser(`v8-${Date.now()}`);
    await createToken(user.id, '444444', VerificationTokenType.PHONE_OTP);
    // Verify once
    await request(testApp).post('/api/auth/verify/phone').send({ userId: user.id, code: '444444' });

    // Try again
    await createToken(user.id, '333333', VerificationTokenType.PHONE_OTP);
    const res = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: user.id, code: '333333' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ALREADY_VERIFIED');
    await cleanup(user.id);
  });

  it('9. Unknown userId → 404', async () => {
    const res = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: '00000000-0000-0000-0000-000000000000', code: '123456' });
    expect(res.status).toBe(404);
  });

  it('10. phoneVerified = true written to DB on success', async () => {
    const user = await makeUser(`v10-${Date.now()}`);
    await createToken(user.id, '246810', VerificationTokenType.PHONE_OTP);
    await request(testApp).post('/api/auth/verify/phone').send({ userId: user.id, code: '246810' });

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.phoneVerified).toBe(true);
    expect(updated?.status).toBe(AccountStatus.ACTIVE);
    await cleanup(user.id);
  });

  it('11. PHONE_VERIFIED AuditLog event written', async () => {
    const user = await makeUser(`v11-${Date.now()}`);
    await createToken(user.id, '135791', VerificationTokenType.PHONE_OTP);
    await request(testApp).post('/api/auth/verify/phone').send({ userId: user.id, code: '135791' });

    const log = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'PHONE_VERIFIED' },
    });
    expect(log).not.toBeNull();
    await cleanup(user.id);
  });

  it('12. passwordHash never returned in verify response', async () => {
    const user = await makeUser(`v12-${Date.now()}`);
    await createToken(user.id, '202020', VerificationTokenType.PHONE_OTP);
    const res = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: user.id, code: '202020' });
    expect(res.body.user?.passwordHash).toBeUndefined();
    await cleanup(user.id);
  });

  it('13. Missing code field → 400 validation error', async () => {
    const res = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(400);
    expect(res.body.details?.code).toBeDefined();
  });

  it('14. Non-numeric code → 400 validation error', async () => {
    const res = await request(testApp)
      .post('/api/auth/verify/phone')
      .send({ userId: '00000000-0000-0000-0000-000000000000', code: 'abcdef' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/verify/email', () => {

  it('15. Valid email token → 200, emailVerified = true', async () => {
    const rawToken = 'a'.repeat(64); // 64 hex chars
    const user = await makeUser(`ve1-${Date.now()}`, { hasPhone: false, hasEmail: true });
    await createToken(user.id, rawToken, VerificationTokenType.EMAIL_TOKEN);

    const res = await request(testApp)
      .post('/api/auth/verify/email')
      .send({ userId: user.id, token: rawToken });

    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);
    expect(res.body.user.status).toBe('ACTIVE');
    await cleanup(user.id);
  });

  it('16. Wrong email token → 422 INVALID_CODE', async () => {
    const user = await makeUser(`ve2-${Date.now()}`, { hasPhone: false, hasEmail: true });
    await createToken(user.id, 'b'.repeat(64), VerificationTokenType.EMAIL_TOKEN);

    const res = await request(testApp)
      .post('/api/auth/verify/email')
      .send({ userId: user.id, token: 'c'.repeat(64) });
    expect(res.status).toBe(422);
    await cleanup(user.id);
  });

  it('17. Expired email token → 410 CODE_EXPIRED', async () => {
    const rawToken = 'd'.repeat(64);
    const user = await makeUser(`ve3-${Date.now()}`, { hasPhone: false, hasEmail: true });
    await createToken(user.id, rawToken, VerificationTokenType.EMAIL_TOKEN, -1);

    const res = await request(testApp)
      .post('/api/auth/verify/email')
      .send({ userId: user.id, token: rawToken });
    expect(res.status).toBe(410);
    await cleanup(user.id);
  });

  it('18. EMAIL_VERIFIED AuditLog event written', async () => {
    const rawToken = 'e'.repeat(64);
    const user = await makeUser(`ve4-${Date.now()}`, { hasPhone: false, hasEmail: true });
    await createToken(user.id, rawToken, VerificationTokenType.EMAIL_TOKEN);
    await request(testApp).post('/api/auth/verify/email').send({ userId: user.id, token: rawToken });

    const log = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'EMAIL_VERIFIED' },
    });
    expect(log).not.toBeNull();
    await cleanup(user.id);
  });
});

describe('POST /api/auth/verify/resend', () => {

  it('19. Resend invalidates old token and creates new one', async () => {
    const user  = await makeUser(`vr1-${Date.now()}`);
    const first = await createToken(user.id, '111111', VerificationTokenType.PHONE_OTP);
    await prisma.verificationToken.update({
      where: { id: first.id },
      data: { createdAt: new Date(Date.now() - 65000) },
    });

    // Resend (no real SMS — console provider in tests)
    await request(testApp)
      .post('/api/auth/verify/resend')
      .send({ userId: user.id, type: 'phone' });

    const oldToken = await prisma.verificationToken.findUnique({ where: { id: first.id } });
    expect(oldToken?.used).toBe(true);

    const newToken = await prisma.verificationToken.findFirst({
      where:   { userId: user.id, type: VerificationTokenType.PHONE_OTP, used: false },
      orderBy: { createdAt: 'desc' },
    });
    expect(newToken).not.toBeNull();
    expect(newToken?.id).not.toBe(first.id);
    await cleanup(user.id);
  });

  it('20. Resend returns 200 with cooldownSeconds', async () => {
    const user = await makeUser(`vr2-${Date.now()}`);
    const res  = await request(testApp)
      .post('/api/auth/verify/resend')
      .send({ userId: user.id, type: 'phone' });

    expect(res.status).toBe(200);
    expect(typeof res.body.cooldownSeconds).toBe('number');
    await cleanup(user.id);
  });

  it('21. Resend within cooldown → 409 RESEND_COOLDOWN with retryAfterSeconds', async () => {
    const user = await makeUser(`vr3-${Date.now()}`);
    // Create a token very recently (simulates cooldown)
    await createToken(user.id, '222222', VerificationTokenType.PHONE_OTP);

    const res = await request(testApp)
      .post('/api/auth/verify/resend')
      .send({ userId: user.id, type: 'phone' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('RESEND_COOLDOWN');
    expect(typeof res.body.retryAfterSeconds).toBe('number');
    await cleanup(user.id);
  });

  it('22. Resend for already-verified phone → 400 ALREADY_VERIFIED', async () => {
    const user = await makeUser(`vr4-${Date.now()}`);
    // Manually mark verified
    await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });

    const res = await request(testApp)
      .post('/api/auth/verify/resend')
      .send({ userId: user.id, type: 'phone' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ALREADY_VERIFIED');
    await cleanup(user.id);
  });

  it('23. Resend unknown userId → 404', async () => {
    const res = await request(testApp)
      .post('/api/auth/verify/resend')
      .send({ userId: '00000000-0000-0000-0000-000000000000', type: 'phone' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/auth/verification-status', () => {

  it('24. Returns correct verification flags', async () => {
    const user = await makeUser(`vs1-${Date.now()}`);
    const res  = await request(testApp)
      .get(`/api/auth/verification-status?userId=${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING_VERIFICATION');
    expect(res.body.phoneVerified).toBe(false);
    expect(res.body.hasPhone).toBe(true);
    await cleanup(user.id);
  });

  it('25. Missing userId → 400', async () => {
    const res = await request(testApp).get('/api/auth/verification-status');
    expect(res.status).toBe(400);
  });
});

afterAll(async () => { await prisma.$disconnect(); });
