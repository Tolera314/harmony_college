import request from 'supertest';
import bcrypt from 'bcryptjs';
import testApp from './testApp';
import { prisma } from '../lib/prisma';
import { AccountStatus, Role } from '@prisma/client';

const STRONG_PASSWORD = 'TestPass1!';
const STRONG_HASH = bcrypt.hashSync(STRONG_PASSWORD, 12);

async function createTestUser(role: Role, emailSuffix: string) {
  return prisma.user.create({
    data: {
      fullName: `FO Test ${role}`,
      email: `fo-test-${emailSuffix}@test.local`,
      passwordHash: STRONG_HASH,
      role,
      status: AccountStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: true,
      profileCompleted: true,
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

describe('Finance Officer API Suite (/api/finance-officer)', () => {
  let foUser: any;
  let foCookies: string[];
  let adminUser: any;
  let adminCookies: string[];
  let studentUser: any;
  let studentCookies: string[];

  let testDept: any;
  let testProg: any;
  let studentRec: any;

  beforeAll(async () => {
    const timestamp = Date.now();

    foUser = await createTestUser(Role.FINANCE_OFFICER, `fo-${timestamp}`);
    foCookies = await loginAndGetCookies(foUser.email);

    adminUser = await createTestUser(Role.ADMIN, `admin-${timestamp}`);
    adminCookies = await loginAndGetCookies(adminUser.email);

    studentUser = await createTestUser(Role.STUDENT, `student-${timestamp}`);
    studentCookies = await loginAndGetCookies(studentUser.email);

    testDept = await prisma.department.create({
      data: {
        name: `FO Dept Test ${timestamp}`,
        code: `FOD${timestamp.toString().slice(-4)}`,
        description: 'Finance test dept',
      },
    });

    testProg = await prisma.program.create({
      data: {
        name: `FO Prog Test ${timestamp}`,
        code: `FOP${timestamp.toString().slice(-4)}`,
        departmentId: testDept.id,
        durationYears: 4,
      },
    });

    studentRec = await prisma.studentRecord.create({
      data: {
        userId: studentUser.id,
        studentId: `HC-${timestamp.toString().slice(-6)}`,
        departmentId: testDept.id,
        programId: testProg.id,
        yearLevel: 2,
      },
    });

    await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        registrationFeePaid: true,
        registrationFeePaidAt: new Date(),
        paymentVerifiedByFinance: false,
      },
    });
  });

  afterAll(async () => {
    try {
      if (studentRec?.id) {
        await prisma.financialTransaction.deleteMany({
          where: { financialAccount: { studentRecordId: studentRec.id } },
        });
        await prisma.financialAccount.deleteMany({
          where: { studentRecordId: studentRec.id },
        });
        await prisma.studentRecord.delete({ where: { id: studentRec.id } });
      }
      if (studentUser?.id) {
        await prisma.studentProfile.deleteMany({ where: { userId: studentUser.id } });
        await prisma.session.deleteMany({ where: { userId: studentUser.id } });
        await prisma.user.delete({ where: { id: studentUser.id } });
      }
      if (foUser?.id) {
        await prisma.session.deleteMany({ where: { userId: foUser.id } });
        await prisma.user.delete({ where: { id: foUser.id } });
      }
      if (adminUser?.id) {
        await prisma.session.deleteMany({ where: { userId: adminUser.id } });
        await prisma.user.delete({ where: { id: adminUser.id } });
      }
      if (testProg?.id) await prisma.program.delete({ where: { id: testProg.id } });
      if (testDept?.id) await prisma.department.delete({ where: { id: testDept.id } });
      await prisma.$disconnect();
    } catch { /* ignore cleanup errors */ }
  });

  it('1. Returns 401 when no token is provided', async () => {
    const res = await request(testApp).get('/api/finance-officer/overview');
    expect(res.status).toBe(401);
  });

  it('2. Returns 403 when STUDENT attempts finance officer access', async () => {
    const res = await request(testApp)
      .get('/api/finance-officer/overview')
      .set('Cookie', studentCookies);
    expect(res.status).toBe(403);
  });

  it('3. Returns 200 for FINANCE_OFFICER accessing overview', async () => {
    const res = await request(testApp)
      .get('/api/finance-officer/overview')
      .set('Cookie', foCookies);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpis');
    expect(res.body.kpis).toHaveProperty('totalRevenue');
    expect(res.body).toHaveProperty('monthlyRevenue');
  });

  it('4. Returns 200 for ADMIN accessing finance officer endpoints', async () => {
    const res = await request(testApp)
      .get('/api/finance-officer/overview')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
  });

  it('5. Finance Officer can list student accounts', async () => {
    const res = await request(testApp)
      .get('/api/finance-officer/student-accounts')
      .set('Cookie', foCookies);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accounts');
    expect(Array.isArray(res.body.accounts)).toBe(true);
  });

  it('6. Finance Officer can fetch single student account detail', async () => {
    const res = await request(testApp)
      .get(`/api/finance-officer/student-accounts/${studentRec.id}`)
      .set('Cookie', foCookies);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('studentRecordId', studentRec.id);
    expect(res.body).toHaveProperty('balance');
  });

  it('7. Finance Officer can post a charge to a student account', async () => {
    const res = await request(testApp)
      .post(`/api/finance-officer/student-accounts/${studentRec.id}/charge`)
      .set('Cookie', foCookies)
      .send({
        amount: 2500,
        description: 'Lab Facility Fee',
        category: 'Fee',
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('transaction');
    expect(res.body.transaction.amount).toBe(2500);
  });

  it('8. Finance Officer can post a credit to a student account', async () => {
    const res = await request(testApp)
      .post(`/api/finance-officer/student-accounts/${studentRec.id}/credit`)
      .set('Cookie', foCookies)
      .send({
        amount: 500,
        description: 'Merit Grant',
        category: 'Grant',
      });
    expect(res.status).toBe(200);
    expect(res.body.transaction.amount).toBe(-500);
  });

  it('9. Finance Officer can record a student payment', async () => {
    const res = await request(testApp)
      .post('/api/finance-officer/payments/record')
      .set('Cookie', foCookies)
      .send({
        studentRecordId: studentRec.id,
        amount: 2000,
        paymentMethod: 'Telebirr',
        referenceNumber: 'TB-TEST-0099',
        description: 'Tuition Installment',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('receiptId');
    expect(res.body.transaction.amount).toBe(-2000);
  });

  it('10. Finance Officer can list pending registration fee payments', async () => {
    const res = await request(testApp)
      .get('/api/finance-officer/payments/pending')
      .set('Cookie', foCookies);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('payments');
  });

  it('11. Finance Officer can verify and unverify registration fee payment', async () => {
    const verifyRes = await request(testApp)
      .post(`/api/finance-officer/payments/${studentUser.id}/verify`)
      .set('Cookie', foCookies);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.paymentVerifiedByFinance).toBe(true);

    const unverifyRes = await request(testApp)
      .post(`/api/finance-officer/payments/${studentUser.id}/unverify`)
      .set('Cookie', foCookies);
    expect(unverifyRes.status).toBe(200);
    expect(unverifyRes.body.paymentVerifiedByFinance).toBe(false);
  });

  it('12. Finance Officer can list transactions, receipts, and reconciliation entries', async () => {
    const [txRes, recRes, reconRes] = await Promise.all([
      request(testApp)
        .get('/api/finance-officer/transactions')
        .set('Cookie', foCookies),
      request(testApp)
        .get('/api/finance-officer/receipts')
        .set('Cookie', foCookies),
      request(testApp)
        .get('/api/finance-officer/reconciliation')
        .set('Cookie', foCookies),
    ]);

    expect(txRes.status).toBe(200);
    expect(recRes.status).toBe(200);
    expect(reconRes.status).toBe(200);
  });

  it('13. Finance Officer can fetch financial reports, audit logs, and settings', async () => {
    const [repRes, auditRes, settingsRes] = await Promise.all([
      request(testApp)
        .get('/api/finance-officer/reports/summary')
        .set('Cookie', foCookies),
      request(testApp)
        .get('/api/finance-officer/audit-logs')
        .set('Cookie', foCookies),
      request(testApp)
        .get('/api/finance-officer/settings')
        .set('Cookie', foCookies),
    ]);

    expect(repRes.status).toBe(200);
    expect(auditRes.status).toBe(200);
    expect(settingsRes.status).toBe(200);
  });
});
