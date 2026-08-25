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
      fullName: `HR Test ${role}`,
      email: `hr-test-${emailSuffix}@test.local`,
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

describe('HR Officer API Suite (/api/hr)', () => {
  let hrUser: any;
  let hrCookies: string[];
  let adminUser: any;
  let adminCookies: string[];
  let studentUser: any;
  let studentCookies: string[];

  let testDept: any;
  let testEmp: any;

  beforeAll(async () => {
    const timestamp = Date.now();

    hrUser = await createTestUser(Role.HR_OFFICER, `hr-${timestamp}`);
    hrCookies = await loginAndGetCookies(hrUser.email);

    adminUser = await createTestUser(Role.ADMIN, `admin-${timestamp}`);
    adminCookies = await loginAndGetCookies(adminUser.email);

    studentUser = await createTestUser(Role.STUDENT, `student-${timestamp}`);
    studentCookies = await loginAndGetCookies(studentUser.email);

    testDept = await prisma.hRDepartment.create({
      data: {
        name: `HR Dept Test ${timestamp}`,
        budget: 500000,
      },
    });

    testEmp = await prisma.hREmployee.create({
      data: {
        employeeCode: `EMP-TEST-${timestamp.toString().slice(-4)}`,
        fullName: 'Test HR Employee',
        gender: 'MALE',
        email: `emp-test-${timestamp}@test.local`,
        position: 'Software Engineer',
        departmentId: testDept.id,
        employmentType: 'FULL_TIME',
        hireDate: new Date('2024-01-15'),
        basicSalary: 25000,
        allowances: 3000,
        deductions: 1000,
      },
    });
  });

  afterAll(async () => {
    try {
      if (testEmp?.id) {
        await prisma.hRSalaryHistory.deleteMany({ where: { employeeId: testEmp.id } });
        await prisma.hRContractRenewal.deleteMany({ where: { employeeId: testEmp.id } });
        await prisma.hRLeaveRequest.deleteMany({ where: { employeeId: testEmp.id } });
        await prisma.hRPerformanceReview.deleteMany({ where: { employeeId: testEmp.id } });
        await prisma.hRDocument.deleteMany({ where: { employeeId: testEmp.id } });
        await prisma.hREmployee.delete({ where: { id: testEmp.id } });
      }
      if (testDept?.id) {
        await prisma.hRDepartment.delete({ where: { id: testDept.id } });
      }
      if (hrUser?.id) {
        await prisma.session.deleteMany({ where: { userId: hrUser.id } });
        await prisma.user.delete({ where: { id: hrUser.id } });
      }
      if (adminUser?.id) {
        await prisma.session.deleteMany({ where: { userId: adminUser.id } });
        await prisma.user.delete({ where: { id: adminUser.id } });
      }
      if (studentUser?.id) {
        await prisma.session.deleteMany({ where: { userId: studentUser.id } });
        await prisma.user.delete({ where: { id: studentUser.id } });
      }
      await prisma.$disconnect();
    } catch { /* ignore cleanup errors */ }
  });

  // 1. AUTH & RBAC
  it('1. Returns 401 when no token is provided', async () => {
    const res = await request(testApp).get('/api/hr/dashboard');
    expect(res.status).toBe(401);
  });

  it('2. Returns 403 when STUDENT attempts HR access', async () => {
    const res = await request(testApp)
      .get('/api/hr/dashboard')
      .set('Cookie', studentCookies);
    expect(res.status).toBe(403);
  });

  it('3. Returns 200 for HR_OFFICER accessing dashboard stats', async () => {
    const res = await request(testApp)
      .get('/api/hr/dashboard')
      .set('Cookie', hrCookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kpis).toHaveProperty('totalEmployees');
  });

  it('4. Returns 200 for ADMIN accessing HR dashboard', async () => {
    const res = await request(testApp)
      .get('/api/hr/dashboard')
      .set('Cookie', adminCookies);
    expect(res.status).toBe(200);
  });

  // 2. DEPARTMENTS & EMPLOYEES
  it('5. HR Officer can list departments', async () => {
    const res = await request(testApp)
      .get('/api/hr/departments')
      .set('Cookie', hrCookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('6. HR Officer can list employees', async () => {
    const res = await request(testApp)
      .get('/api/hr/employees')
      .set('Cookie', hrCookies);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('employees');
    expect(Array.isArray(res.body.data.employees)).toBe(true);
  });

  it('7. HR Officer can get single employee detail', async () => {
    const res = await request(testApp)
      .get(`/api/hr/employees/${testEmp.id}`)
      .set('Cookie', hrCookies);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('id', testEmp.id);
  });

  it('8. HR Officer can create a new employee', async () => {
    const ts = Date.now();
    const res = await request(testApp)
      .post('/api/hr/employees')
      .set('Cookie', hrCookies)
      .send({
        employeeCode: `EMP-NEW-${ts.toString().slice(-4)}`,
        fullName: 'New Created Employee',
        gender: 'FEMALE',
        email: `emp-new-${ts}@test.local`,
        position: 'HR Assistant',
        departmentId: testDept.id,
        employmentType: 'FULL_TIME',
        hireDate: '2024-06-01',
        basicSalary: 18000,
        allowances: 2000,
        deductions: 500,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');

    // Cleanup created employee
    if (res.body.data?.id) {
      await prisma.hREmployee.delete({ where: { id: res.body.data.id } }).catch(() => {});
    }
  });

  it('9. HR Officer can update employee details and deactivate', async () => {
    const updateRes = await request(testApp)
      .patch(`/api/hr/employees/${testEmp.id}`)
      .set('Cookie', hrCookies)
      .send({ position: 'Senior Software Engineer' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.position).toBe('Senior Software Engineer');

    const deactRes = await request(testApp)
      .patch(`/api/hr/employees/${testEmp.id}/deactivate`)
      .set('Cookie', hrCookies);
    expect(deactRes.status).toBe(200);
    expect(deactRes.body.data.status).toBe('INACTIVE');
  });

  // 3. SALARY HISTORY & CONTRACT RENEWALS
  it('10. HR Officer can record salary change and fetch history', async () => {
    const postRes = await request(testApp)
      .post(`/api/hr/employees/${testEmp.id}/salary-history`)
      .set('Cookie', hrCookies)
      .send({
        effectiveDate: '2026-08-01',
        basicSalary: 30000,
        allowances: 4000,
        deductions: 1200,
        reason: 'Annual Merit Promotion',
      });
    expect(postRes.status).toBe(201);

    const getRes = await request(testApp)
      .get(`/api/hr/employees/${testEmp.id}/salary-history`)
      .set('Cookie', hrCookies);
    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.data.history)).toBe(true);
  });

  it('11. HR Officer can execute contract renewal and fetch renewals', async () => {
    const postRes = await request(testApp)
      .post(`/api/hr/employees/${testEmp.id}/contract-renewals`)
      .set('Cookie', hrCookies)
      .send({
        newEndDate: '2027-12-31',
        reason: 'Annual Contract Extension',
      });
    expect(postRes.status).toBe(201);

    const getRes = await request(testApp)
      .get(`/api/hr/employees/${testEmp.id}/contract-renewals`)
      .set('Cookie', hrCookies);
    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.data.renewals)).toBe(true);
  });

  // 4. LEAVE & PAYROLL & PERFORMANCE
  it('12. HR Officer can list leave requests and payroll batches', async () => {
    const [leaveRes, payrollRes, perfRes] = await Promise.all([
      request(testApp).get('/api/hr/leave').set('Cookie', hrCookies),
      request(testApp).get('/api/hr/payroll').set('Cookie', hrCookies),
      request(testApp).get('/api/hr/performance').set('Cookie', hrCookies),
    ]);

    expect(leaveRes.status).toBe(200);
    expect(payrollRes.status).toBe(200);
    expect(perfRes.status).toBe(200);
  });

  // 5. AUDIT LOGS & NOTIFICATIONS
  it('13. HR Officer can fetch audit logs and notifications', async () => {
    const [auditRes, notifRes] = await Promise.all([
      request(testApp).get('/api/hr/audit-logs').set('Cookie', hrCookies),
      request(testApp).get('/api/hr/notifications').set('Cookie', hrCookies),
    ]);

    expect(auditRes.status).toBe(200);
    expect(notifRes.status).toBe(200);
  });
});
