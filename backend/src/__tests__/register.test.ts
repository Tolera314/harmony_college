/**
 * POST /api/auth/register — Phase 2 Test Suite
 * ──────────────────────────────────────────────
 * 20 test cases covering every validation rule, security requirement,
 * and database behaviour defined in the Phase 2 specification.
 *
 * Requirements:
 *   - DATABASE_URL must point to a real PostgreSQL database
 *     (set in .env.test or .env before running)
 *   - The database must have had the Phase 1 migration applied
 *
 * Each test that creates a user cleans up after itself so the suite
 * is safe to run repeatedly against a shared dev database.
 */

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import testApp from './testApp';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/api/auth/register';

/** A valid payload that satisfies every validation rule. */
const valid = (overrides: Record<string, unknown> = {}) => ({
  fullName:        'Test Student',
  phone:           '0911234567',
  email:           '',               // optional — empty string is fine
  password:        'StrongPass1!',
  confirmPassword: 'StrongPass1!',
  acceptTerms:     true,
  ...overrides,
});

/** Delete a user by email or phone so tests stay idempotent. */
async function cleanup(email?: string | null, phone?: string | null): Promise<void> {
  if (email) await prisma.user.deleteMany({ where: { email } }).catch(() => {});
  if (phone) {
    // normalizePhone: 09... → +251...
    const normalized = phone.startsWith('0') ? '+251' + phone.slice(1) : phone;
    await prisma.user.deleteMany({ where: { phone: normalized } }).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {

  // ── Test 1 ─────────────────────────────────────────────────────────────────
  it('1. Successful registration — phone only', async () => {
    const phone = '0912000001';
    await cleanup(null, phone);

    const res = await request(testApp).post(BASE).send(valid({ phone, email: '' }));

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/account created/i);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.fullName).toBe('Test Student');
    expect(res.body.user.role).toBe('STUDENT');
    expect(res.body.user.profileCompleted).toBe(false);
    expect(res.body.user.profileCompletion).toBe(0);
    expect(res.body.user.emailVerified).toBe(false);
    expect(res.body.user.phoneVerified).toBe(false);

    await cleanup(null, phone);
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  it('2. Successful registration — email only', async () => {
    const email = 'emailonly@test.local';
    await cleanup(email, null);

    const res = await request(testApp).post(BASE).send(valid({ phone: '', email }));

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('STUDENT');

    await cleanup(email, null);
  });

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  it('3. Successful registration — both email and phone', async () => {
    const email = 'both@test.local';
    const phone = '0912000003';
    await cleanup(email, phone);

    const res = await request(testApp).post(BASE).send(valid({ email, phone }));

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);

    await cleanup(email, phone);
  });

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  it('4. Full name validation — missing full name returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({ fullName: '' }));

    expect(res.status).toBe(400);
    expect(res.body.details?.fullName).toBeDefined();
  });

  // ── Test 5 ─────────────────────────────────────────────────────────────────
  it('5. Full name validation — single word (no space) returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({ fullName: 'Mononym' }));

    expect(res.status).toBe(400);
    expect(res.body.details?.fullName).toBeDefined();
  });

  // ── Test 6 ─────────────────────────────────────────────────────────────────
  it('6. Missing both email and phone returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({ phone: '', email: '' }));

    expect(res.status).toBe(400);
    expect(res.body.details?.phone).toBeDefined();
  });

  // ── Test 7 ─────────────────────────────────────────────────────────────────
  it('7. Invalid email format returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({
      phone: '',
      email: 'not-an-email',
    }));

    expect(res.status).toBe(400);
    expect(res.body.details?.email).toBeDefined();
  });

  // ── Test 8 ─────────────────────────────────────────────────────────────────
  it('8. Invalid phone format returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({
      phone: '12345',
      email: '',
    }));

    expect(res.status).toBe(400);
    expect(res.body.details?.phone).toBeDefined();
  });

  // ── Test 9 ─────────────────────────────────────────────────────────────────
  it('9. Weak password — too short returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({
      password:        'short',
      confirmPassword: 'short',
    }));

    expect(res.status).toBe(400);
    expect(res.body.details?.password).toBeDefined();
  });

  // ── Test 10 ────────────────────────────────────────────────────────────────
  it('10. Weak password — no uppercase returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({
      password:        'weakpass1!',
      confirmPassword: 'weakpass1!',
    }));

    expect(res.status).toBe(400);
    expect(res.body.details?.password).toBeDefined();
  });

  // ── Test 11 ────────────────────────────────────────────────────────────────
  it('11. Weak password — no special character returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({
      password:        'WeakPass1',
      confirmPassword: 'WeakPass1',
    }));

    expect(res.status).toBe(400);
    expect(res.body.details?.password).toBeDefined();
  });

  // ── Test 12 ────────────────────────────────────────────────────────────────
  it('12. Password mismatch returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({
      password:        'StrongPass1!',
      confirmPassword: 'DifferentPass1!',
    }));

    expect(res.status).toBe(400);
    expect(res.body.details?.confirmPassword).toBeDefined();
  });

  // ── Test 13 ────────────────────────────────────────────────────────────────
  it('13. Terms not accepted returns 400', async () => {
    const res = await request(testApp).post(BASE).send(valid({ acceptTerms: false }));

    expect(res.status).toBe(400);
    expect(res.body.details?.acceptTerms).toBeDefined();
  });

  // ── Test 14 ────────────────────────────────────────────────────────────────
  it('14. Duplicate email returns 409', async () => {
    const email = 'duplicate-email@test.local';
    await cleanup(email, null);

    // Create the first account
    await request(testApp).post(BASE).send(valid({ email, phone: '' }));

    // Attempt to create a second account with the same email
    const res = await request(testApp).post(BASE).send(valid({ email, phone: '' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);

    await cleanup(email, null);
  });

  // ── Test 15 ────────────────────────────────────────────────────────────────
  it('15. Duplicate phone returns 409', async () => {
    const phone = '0912000015';
    await cleanup(null, phone);

    await request(testApp).post(BASE).send(valid({ phone, email: '' }));
    const res = await request(testApp).post(BASE).send(valid({ phone, email: '' }));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);

    await cleanup(null, phone);
  });

  // ── Test 16 ────────────────────────────────────────────────────────────────
  it('16. Role cannot be manipulated — SUPER_ADMIN in body is silently ignored', async () => {
    const phone = '0912000016';
    await cleanup(null, phone);

    const res = await request(testApp).post(BASE).send({
      ...valid({ phone, email: '' }),
      role: 'SUPER_ADMIN',   // attacker tries to set role
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('STUDENT');   // backend enforces STUDENT

    await cleanup(null, phone);
  });

  // ── Test 17 ────────────────────────────────────────────────────────────────
  it('17. Role cannot be manipulated — ADMIN in body is silently ignored', async () => {
    const phone = '0912000017';
    await cleanup(null, phone);

    const res = await request(testApp).post(BASE).send({
      ...valid({ phone, email: '' }),
      role: 'ADMIN',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('STUDENT');

    await cleanup(null, phone);
  });

  // ── Test 18 ────────────────────────────────────────────────────────────────
  it('18. Password is hashed — raw password is not stored', async () => {
    const phone = '0912000018';
    await cleanup(null, phone);

    const plainPassword = 'StrongPass1!';
    await request(testApp).post(BASE).send(valid({ phone, email: '', password: plainPassword, confirmPassword: plainPassword }));

    const normalizedPhone = '+251912000018';
    const dbUser = await prisma.user.findUnique({ where: { phone: normalizedPhone } });

    expect(dbUser).not.toBeNull();
    // The stored hash must NOT equal the plaintext password
    expect(dbUser!.passwordHash).not.toBe(plainPassword);
    // bcrypt.compare must return true — proves the hash is correct
    const hashIsValid = await bcrypt.compare(plainPassword, dbUser!.passwordHash!);
    expect(hashIsValid).toBe(true);

    await cleanup(null, phone);
  });

  // ── Test 19 ────────────────────────────────────────────────────────────────
  it('19. passwordHash is never returned in the response', async () => {
    const phone = '0912000019';
    await cleanup(null, phone);

    const res = await request(testApp).post(BASE).send(valid({ phone, email: '' }));

    expect(res.status).toBe(201);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.confirmPassword).toBeUndefined();

    await cleanup(null, phone);
  });

  // ── Test 20 ────────────────────────────────────────────────────────────────
  it('20. No session cookie is set — this phase does not authenticate', async () => {
    const phone = '0912000020';
    await cleanup(null, phone);

    const res = await request(testApp).post(BASE).send(valid({ phone, email: '' }));

    expect(res.status).toBe(201);
    // No Set-Cookie header for a session token
    const setCookie: string | string[] | undefined = res.headers['set-cookie'];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie ?? '');
    expect(cookieStr).not.toMatch(/session=/);
    expect(cookieStr).not.toMatch(/accessToken=/);
    expect(cookieStr).not.toMatch(/refreshToken=/);

    await cleanup(null, phone);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// TEARDOWN — close Prisma connection so Jest exits cleanly
// ─────────────────────────────────────────────────────────────────────────────
afterAll(async () => {
  await prisma.$disconnect();
});
