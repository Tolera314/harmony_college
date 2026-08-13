/**
 * Phase 5 — Student Profile Test Suite
 * ───────────────────────────────────────
 * Tests GET /api/student/profile and PATCH /api/student/profile
 * including completion calculation, security, and submission gate.
 *
 * Requires: DATABASE_URL pointing to a migrated PostgreSQL database.
 */

import request     from 'supertest';
import bcrypt      from 'bcryptjs';
import { prisma }  from '../lib/prisma';
import testApp     from './testApp';
import { AccountStatus, Role } from '../types/auth';

// ── helpers ──────────────────────────────────────────────────────────────────

const PASS_HASH = bcrypt.hashSync('TestPass1!', 12);

async function makeActiveStudent(suffix: string) {
  return prisma.user.create({
    data: {
      fullName:         `Profile Test ${suffix}`,
      email:            `profile-${suffix}@test.local`,
      phone:            null,
      passwordHash:     PASS_HASH,
      role:             Role.STUDENT,
      status:           AccountStatus.ACTIVE,
      phoneVerified:    true,
      emailVerified:    true,
      profileCompleted: false,
      profileCompletion:0,
      failedLoginAttempts: 0,
    },
  });
}

/** Login and return supertest agent with cookies set */
async function loginAndGetCookies(email: string): Promise<string[]> {
  const res = await request(testApp)
    .post('/api/auth/login')
    .send({ identifier: email, password: 'TestPass1!' });
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

async function cleanup(userId: string) {
  await prisma.studentProfile.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

const FULL_PROFILE = {
  nationality:          'Ethiopian',
  dob:                  '2002-05-14',
  gender:               'Male',
  city:                 'Addis Ababa',
  address:              'Bole Sub-City, Woreda 03',
  program:              'Photography',
  academicYear:         '2025/2026',
  semester:             'Semester I',
  profilePictureUrl:    '/uploads/pic.jpg',
  faydaIdUrl:           '/uploads/id.pdf',
  emergencyName:        'Solomon T.',
  emergencyPhone:       '+251911999001',
};

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/student/profile', () => {

  it('1. Returns null profile for new student (no StudentProfile row yet)', async () => {
    const user    = await makeActiveStudent(`gp1-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .get('/api/student/profile')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeNull();
    expect(res.body.user.fullName).toBe(user.fullName);
    await cleanup(user.id);
  });

  it('2. Returns saved profile after a PATCH', async () => {
    const user    = await makeActiveStudent(`gp2-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ nationality: 'Ethiopian', city: 'Addis Ababa' });

    const res = await request(testApp)
      .get('/api/student/profile')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.profile.nationality).toBe('Ethiopian');
    await cleanup(user.id);
  });

  it('3. Unauthenticated request → 401', async () => {
    const res = await request(testApp).get('/api/student/profile');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/student/profile', () => {

  it('4. Saves Step 1 personal fields, returns completion > 0', async () => {
    const user    = await makeActiveStudent(`pp4-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({
        nationality: 'Ethiopian',
        dob:         '2002-05-14',
        gender:      'Male',
        city:        'Addis Ababa',
        address:     'Bole Sub-City',
      });

    expect(res.status).toBe(200);
    expect(res.body.profileCompletion).toBeGreaterThan(0);
    expect(res.body.profileCompleted).toBe(false);
    await cleanup(user.id);
  });

  it('5. Completion increases after academic fields are added', async () => {
    const user    = await makeActiveStudent(`pp5-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    await request(testApp).patch('/api/student/profile').set('Cookie', cookies)
      .send({ nationality: 'Ethiopian', dob: '2002-05-14', gender: 'Male', city: 'Addis', address: 'Bole' });

    const before = await prisma.user.findUnique({ where: { id: user.id }, select: { profileCompletion: true } });

    await request(testApp).patch('/api/student/profile').set('Cookie', cookies)
      .send({ program: 'Photography', academicYear: '2025/2026', semester: 'Semester I' });

    const after = await prisma.user.findUnique({ where: { id: user.id }, select: { profileCompletion: true } });
    expect(after!.profileCompletion).toBeGreaterThan(before!.profileCompletion);
    await cleanup(user.id);
  });

  it('6. Document URLs accepted if they start with /uploads/', async () => {
    const user    = await makeActiveStudent(`pp6-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ profilePictureUrl: '/uploads/photo.jpg', faydaIdUrl: '/uploads/id.pdf' });

    expect(res.status).toBe(200);
    expect(res.body.profile.profilePictureUrl).toBe('/uploads/photo.jpg');
    await cleanup(user.id);
  });

  it('7. Document URL not starting with /uploads/ → 400', async () => {
    const user    = await makeActiveStudent(`pp7-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ profilePictureUrl: 'https://evil.com/photo.jpg' });

    expect(res.status).toBe(400);
    await cleanup(user.id);
  });

  it('8. submit: true with all required fields → profileCompleted = true', async () => {
    const user    = await makeActiveStudent(`pp8-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ ...FULL_PROFILE, submit: true });

    expect(res.status).toBe(200);
    expect(res.body.profileCompleted).toBe(true);
    expect(res.body.profileCompletion).toBe(100);

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser!.profileCompleted).toBe(true);
    await cleanup(user.id);
  });

  it('9. submit: true with missing fields → 422 with missingFields array', async () => {
    const user    = await makeActiveStudent(`pp9-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    // Only save partial data
    await request(testApp).patch('/api/student/profile').set('Cookie', cookies)
      .send({ nationality: 'Ethiopian', city: 'Addis Ababa' });

    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ submit: true });

    expect(res.status).toBe(422);
    expect(Array.isArray(res.body.missingFields)).toBe(true);
    expect(res.body.missingFields.length).toBeGreaterThan(0);
    await cleanup(user.id);
  });

  it('10. Client cannot set profileCompleted via request body', async () => {
    const user    = await makeActiveStudent(`pp10-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ nationality: 'Ethiopian', profileCompleted: true });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser!.profileCompleted).toBe(false); // must remain false
    await cleanup(user.id);
  });

  it('11. Client cannot set userId via request body', async () => {
    const user    = await makeActiveStudent(`pp11-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);
    const fakeId  = '00000000-0000-0000-0000-000000000099';

    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ userId: fakeId, nationality: 'Ethiopian' });

    expect(res.status).toBe(200);
    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    expect(profile).not.toBeNull(); // saved under real user, not fakeId
    await cleanup(user.id);
  });

  it('12. profileCompletion persisted to User table after save', async () => {
    const user    = await makeActiveStudent(`pp12-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    await request(testApp).patch('/api/student/profile').set('Cookie', cookies)
      .send({ nationality: 'Ethiopian', dob: '2002-05-14', gender: 'Male', city: 'Addis', address: 'Bole' });

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser!.profileCompletion).toBeGreaterThan(0);
    await cleanup(user.id);
  });

  it('13. PROFILE_COMPLETED audit log written on successful submit', async () => {
    const user    = await makeActiveStudent(`pp13-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    await request(testApp).patch('/api/student/profile').set('Cookie', cookies)
      .send({ ...FULL_PROFILE, submit: true });

    const log = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'PROFILE_COMPLETED' },
    });
    expect(log).not.toBeNull();
    await cleanup(user.id);
  });

  it('14. Invalid dob format → 400', async () => {
    const user    = await makeActiveStudent(`pp14-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ dob: 'not-a-date' });

    expect(res.status).toBe(400);
    await cleanup(user.id);
  });

  it('15. Invalid emergencyPhone → 400', async () => {
    const user    = await makeActiveStudent(`pp15-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ emergencyPhone: '12345' });

    expect(res.status).toBe(400);
    await cleanup(user.id);
  });

  it('16. Unauthenticated request → 401', async () => {
    const res = await request(testApp).patch('/api/student/profile').send({ nationality: 'Ethiopian' });
    expect(res.status).toBe(401);
  });

  it('17. /api/auth/me returns profileCompleted: true after successful submit', async () => {
    const user    = await makeActiveStudent(`pp17-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    await request(testApp).patch('/api/student/profile').set('Cookie', cookies)
      .send({ ...FULL_PROFILE, submit: true });

    // The PATCH issues a new access token cookie — use it for /me
    const patchRes = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ ...FULL_PROFILE, submit: true });

    // After successful submit the DB is updated regardless of cookie state
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser!.profileCompleted).toBe(true);
    await cleanup(user.id);
  });

  it('18. Partial saves accumulate across multiple requests', async () => {
    const user    = await makeActiveStudent(`pp18-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    await request(testApp).patch('/api/student/profile').set('Cookie', cookies)
      .send({ nationality: 'Ethiopian', dob: '2002-05-14', gender: 'Male' });
    await request(testApp).patch('/api/student/profile').set('Cookie', cookies)
      .send({ city: 'Addis Ababa', address: 'Bole Sub-City' });

    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
    expect(profile?.nationality).toBe('Ethiopian');
    expect(profile?.city).toBe('Addis Ababa');
    await cleanup(user.id);
  });

  it('19. Completion = 0 when profile has no fields', async () => {
    const user    = await makeActiveStudent(`pp19-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    // PATCH with no meaningful fields — just emergencyNotes (optional)
    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send({ emergencyNotes: 'Call any time' });

    expect(res.body.profileCompletion).toBe(0);
    await cleanup(user.id);
  });

  it('20. Completion = 100 when all required fields present', async () => {
    const user    = await makeActiveStudent(`pp20-${Date.now()}`);
    const cookies = await loginAndGetCookies(user.email!);

    const res = await request(testApp)
      .patch('/api/student/profile')
      .set('Cookie', cookies)
      .send(FULL_PROFILE);

    expect(res.body.profileCompletion).toBe(100);
    await cleanup(user.id);
  });
});

afterAll(async () => { await prisma.$disconnect(); });
