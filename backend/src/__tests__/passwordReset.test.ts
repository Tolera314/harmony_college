/**
 * Phase 6 — Password Reset Test Suite
 * Requires: DATABASE_URL pointing to a migrated PostgreSQL database.
 */

import request     from 'supertest';
import bcrypt      from 'bcryptjs';
import { prisma }  from '../lib/prisma';
import testApp     from './testApp';
import { AccountStatus, Role } from '../types/auth';
import { TOKEN_BCRYPT_ROUNDS } from '../types/auth';

const PASS_HASH = bcrypt.hashSync('OldPass1!', 12);

async function makeUser(suffix: string, opts?: { status?: AccountStatus; hasEmail?: boolean; hasPhone?: boolean }) {
  const hasEmail = opts?.hasEmail !== false;
  const hasPhone = opts?.hasPhone ?? false;
  return prisma.user.create({
    data: {
      fullName:          `Reset Test ${suffix}`,
      email:             hasEmail ? `reset-${suffix}@test.local` : null,
      phone:             hasPhone ? `+2519130${suffix.slice(0,5).padStart(5,'0')}` : null,
      passwordHash:      PASS_HASH,
      role:              Role.STUDENT,
      status:            opts?.status ?? AccountStatus.ACTIVE,
      emailVerified:     true,
      phoneVerified:     hasPhone,
      profileCompleted:  false,
      profileCompletion: 25,
      failedLoginAttempts: 0,
    },
  });
}

async function createResetToken(userId: string, rawToken: string, opts?: { expiresInSeconds?: number; used?: boolean }) {
  const tokenHash = await bcrypt.hash(rawToken, TOKEN_BCRYPT_ROUNDS);
  return prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      used:      opts?.used      ?? false,
      attempts:  0,
      expiresAt: new Date(Date.now() + (opts?.expiresInSeconds ?? 900) * 1000),
    },
  });
}

async function cleanup(userId: string) {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {

  it('1. Valid email → 200 generic message', async () => {
    const user = await makeUser(`fp1-${Date.now()}`);
    const res  = await request(testApp).post('/api/auth/forgot-password').send({ identifier: user.email });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if an account/i);
    await cleanup(user.id);
  });

  it('2. Unknown email → 200 same generic message (enumeration protection)', async () => {
    const resUnknown = await request(testApp).post('/api/auth/forgot-password').send({ identifier: 'nobody@nowhere.local' });
    const resKnown   = await request(testApp).post('/api/auth/forgot-password').send({ identifier: 'also-nobody@test.local' });
    expect(resUnknown.status).toBe(200);
    expect(resKnown.status).toBe(200);
    expect(resUnknown.body.message).toBe(resKnown.body.message);
  });

  it('3. Missing identifier → still returns generic 200 (no validation leak)', async () => {
    const res = await request(testApp).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(200);
  });

  it('4. PasswordResetToken created for known account', async () => {
    const user = await makeUser(`fp4-${Date.now()}`);
    await request(testApp).post('/api/auth/forgot-password').send({ identifier: user.email });
    const token = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } });
    expect(token).not.toBeNull();
    expect(token!.used).toBe(false);
    await cleanup(user.id);
  });

  it('5. PASSWORD_RESET_REQUESTED audit event written', async () => {
    const user = await makeUser(`fp5-${Date.now()}`);
    await request(testApp).post('/api/auth/forgot-password').send({ identifier: user.email });
    const log = await prisma.auditLog.findFirst({ where: { userId: user.id, action: 'PASSWORD_RESET_REQUESTED' } });
    expect(log).not.toBeNull();
    await cleanup(user.id);
  });
});

describe('GET /api/auth/reset-password/validate', () => {

  it('6. Valid token → { valid: true }', async () => {
    const user     = await makeUser(`rv6-${Date.now()}`);
    const rawToken = 'a'.repeat(64);
    await createResetToken(user.id, rawToken);
    const res = await request(testApp).get(`/api/auth/reset-password/validate?userId=${user.id}&token=${rawToken}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    await cleanup(user.id);
  });

  it('7. Wrong token → { valid: false, code: INVALID_TOKEN }', async () => {
    const user = await makeUser(`rv7-${Date.now()}`);
    await createResetToken(user.id, 'b'.repeat(64));
    const res = await request(testApp).get(`/api/auth/reset-password/validate?userId=${user.id}&token=${'c'.repeat(64)}`);
    expect(res.body.valid).toBe(false);
    expect(res.body.code).toBe('INVALID_TOKEN');
    await cleanup(user.id);
  });

  it('8. Expired token → { valid: false, code: TOKEN_EXPIRED }', async () => {
    const user     = await makeUser(`rv8-${Date.now()}`);
    const rawToken = 'd'.repeat(64);
    await createResetToken(user.id, rawToken, { expiresInSeconds: -1 });
    const res = await request(testApp).get(`/api/auth/reset-password/validate?userId=${user.id}&token=${rawToken}`);
    expect(res.body.valid).toBe(false);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
    await cleanup(user.id);
  });

  it('9. Missing params → 400', async () => {
    const res = await request(testApp).get('/api/auth/reset-password/validate');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {

  it('10. Valid token + valid new password → 200', async () => {
    const user     = await makeUser(`rp10-${Date.now()}`);
    const rawToken = 'e'.repeat(64);
    await createResetToken(user.id, rawToken);
    const res = await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    expect(res.status).toBe(200);
    await cleanup(user.id);
  });

  it('11. Password hash updated in DB', async () => {
    const user     = await makeUser(`rp11-${Date.now()}`);
    const rawToken = 'f'.repeat(64);
    await createResetToken(user.id, rawToken);
    await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    const newHashWorks = await bcrypt.compare('NewPass1!', updated!.passwordHash!);
    const oldHashWorks = await bcrypt.compare('OldPass1!', updated!.passwordHash!);
    expect(newHashWorks).toBe(true);
    expect(oldHashWorks).toBe(false);
    await cleanup(user.id);
  });

  it('12. Old password no longer works after reset', async () => {
    const user     = await makeUser(`rp12-${Date.now()}`);
    const rawToken = 'g'.repeat(64);
    await createResetToken(user.id, rawToken);
    await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    const loginRes = await request(testApp).post('/api/auth/login')
      .send({ identifier: user.email, password: 'OldPass1!' });
    expect(loginRes.status).toBe(401);
    await cleanup(user.id);
  });

  it('13. Can login with new password', async () => {
    const user     = await makeUser(`rp13-${Date.now()}`);
    const rawToken = 'h'.repeat(64);
    await createResetToken(user.id, rawToken);
    await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    const loginRes = await request(testApp).post('/api/auth/login')
      .send({ identifier: user.email, password: 'NewPass1!' });
    expect(loginRes.status).toBe(200);
    await cleanup(user.id);
  });

  it('14. All sessions deleted after reset', async () => {
    const user     = await makeUser(`rp14-${Date.now()}`);
    // Create a session
    await prisma.session.create({
      data: { userId: user.id, refreshTokenHash: 'hash', expiresAt: new Date(Date.now() + 99999999), lastUsedAt: new Date() },
    });
    const rawToken = 'i'.repeat(64);
    await createResetToken(user.id, rawToken);
    await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions.length).toBe(0);
    await cleanup(user.id);
  });

  it('15. Reused (used) token → 400 INVALID_TOKEN', async () => {
    const user     = await makeUser(`rp15-${Date.now()}`);
    const rawToken = 'j'.repeat(64);
    await createResetToken(user.id, rawToken, { used: true });
    const res = await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    expect(res.status).toBe(400);
    await cleanup(user.id);
  });

  it('16. Expired token → 410 TOKEN_EXPIRED', async () => {
    const user     = await makeUser(`rp16-${Date.now()}`);
    const rawToken = 'k'.repeat(64);
    await createResetToken(user.id, rawToken, { expiresInSeconds: -1 });
    const res = await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
    await cleanup(user.id);
  });

  it('17. Wrong token → 422 INVALID_CODE', async () => {
    const user = await makeUser(`rp17-${Date.now()}`);
    await createResetToken(user.id, 'l'.repeat(64));
    const res = await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: 'm'.repeat(64), password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    expect(res.status).toBe(422);
    await cleanup(user.id);
  });

  it('18. Weak new password → 400 validation error', async () => {
    const user     = await makeUser(`rp18-${Date.now()}`);
    const rawToken = 'n'.repeat(64);
    await createResetToken(user.id, rawToken);
    const res = await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'weak', confirmPassword: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.details?.password).toBeDefined();
    await cleanup(user.id);
  });

  it('19. Password mismatch → 400 validation error', async () => {
    const user     = await makeUser(`rp19-${Date.now()}`);
    const rawToken = 'o'.repeat(64);
    await createResetToken(user.id, rawToken);
    const res = await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'Different1!' });
    expect(res.status).toBe(400);
    await cleanup(user.id);
  });

  it('20. Same as current password → 400 SAME_PASSWORD', async () => {
    const user     = await makeUser(`rp20-${Date.now()}`);
    const rawToken = 'p'.repeat(64);
    await createResetToken(user.id, rawToken);
    const res = await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'OldPass1!', confirmPassword: 'OldPass1!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SAME_PASSWORD');
    await cleanup(user.id);
  });

  it('21. profileCompleted unchanged after reset', async () => {
    const user     = await makeUser(`rp21-${Date.now()}`);
    const rawToken = 'q'.repeat(64);
    await createResetToken(user.id, rawToken);
    await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.profileCompleted).toBe(false);
    expect(updated!.profileCompletion).toBe(25);
    await cleanup(user.id);
  });

  it('22. PASSWORD_RESET_COMPLETED audit event written', async () => {
    const user     = await makeUser(`rp22-${Date.now()}`);
    const rawToken = 'r'.repeat(64);
    await createResetToken(user.id, rawToken);
    await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    const log = await prisma.auditLog.findFirst({ where: { userId: user.id, action: 'PASSWORD_RESET_COMPLETED' } });
    expect(log).not.toBeNull();
    await cleanup(user.id);
  });

  it('23. LOCKED account unlocked after successful reset', async () => {
    const user     = await makeUser(`rp23-${Date.now()}`, { status: AccountStatus.LOCKED });
    const rawToken = 's'.repeat(64);
    await createResetToken(user.id, rawToken);
    await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.status).toBe(AccountStatus.ACTIVE);
    expect(updated!.failedLoginAttempts).toBe(0);
    await cleanup(user.id);
  });

  it('24. Raw token never in response body', async () => {
    const user     = await makeUser(`rp24-${Date.now()}`);
    const rawToken = 't'.repeat(64);
    await createResetToken(user.id, rawToken);
    const res = await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(rawToken);
    await cleanup(user.id);
  });

  it('25. PENDING_VERIFICATION account becomes ACTIVE after reset', async () => {
    const user     = await makeUser(`rp25-${Date.now()}`, { status: AccountStatus.PENDING_VERIFICATION });
    const rawToken = 'u'.repeat(64);
    await createResetToken(user.id, rawToken);
    await request(testApp).post('/api/auth/reset-password')
      .send({ userId: user.id, token: rawToken, password: 'NewPass1!', confirmPassword: 'NewPass1!' });
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.status).toBe(AccountStatus.ACTIVE);
    await cleanup(user.id);
  });
});

afterAll(async () => { await prisma.$disconnect(); });
