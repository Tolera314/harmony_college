/**
 * Harmony College — Admin Dashboard API Integration Tests
 */

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import testApp from './testApp';
import { AccountStatus, Role, StudentStatus, CourseStatus, ApplicationStatus } from '@prisma/client';

const STRONG_PASSWORD = 'TestPass1!';
const STRONG_HASH = bcrypt.hashSync(STRONG_PASSWORD, 12);

async function createTestUser(role: Role, emailSuffix: string) {
  return prisma.user.create({
    data: {
      fullName:         `Admin Test ${role}`,
      email:            `admin-test-${emailSuffix}@test.local`,
      passwordHash:     STRONG_HASH,
      role,
      status:           AccountStatus.ACTIVE,
      emailVerified:    true,
      phoneVerified:    true,
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

async function cleanupUser(userId: string) {
  await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.auditLog.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

describe('Admin Dashboard API Suite (/api/admin)', () => {
  let adminUser: any;
  let adminCookies: string[];
  let studentUser: any;
  let studentCookies: string[];

  beforeAll(async () => {
    adminUser = await createTestUser(Role.ADMIN, `admin-${Date.now()}`);
    adminCookies = await loginAndGetCookies(adminUser.email!);

    studentUser = await createTestUser(Role.STUDENT, `student-${Date.now()}`);
    studentCookies = await loginAndGetCookies(studentUser.email!);
  });

  afterAll(async () => {
    if (adminUser?.id) await cleanupUser(adminUser.id);
    if (studentUser?.id) await cleanupUser(studentUser.id);
    await prisma.$disconnect();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. AUTH & RBAC
  // ───────────────────────────────────────────────────────────────────────────

  it('1. Returns 401 when no token is provided', async () => {
    const res = await request(testApp).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('2. Returns 403 when STUDENT attempts admin access', async () => {
    const res = await request(testApp)
      .get('/api/admin/dashboard')
      .set('Cookie', studentCookies);
    expect(res.status).toBe(403);
  });

  it('3. Returns 200 for ADMIN accessing dashboard stats', async () => {
    const res = await request(testApp)
      .get('/api/admin/dashboard')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBeDefined();
    expect(res.body.totalStudents).toBeDefined();
    expect(res.body.totalInstructors).toBeDefined();
    expect(res.body.totalDepartments).toBeDefined();
    expect(res.body.totalPrograms).toBeDefined();
    expect(res.body.totalCourses).toBeDefined();
    expect(res.body.usersByRole).toBeDefined();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. USER MANAGEMENT CRUD
  // ───────────────────────────────────────────────────────────────────────────

  it('4. Admin can list users with pagination and search', async () => {
    const res = await request(testApp)
      .get('/api/admin/users?page=1&limit=10&search=Admin')
      .set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('5. Admin can create a new staff user', async () => {
    const email = `staff-${Date.now()}@test.local`;
    const res = await request(testApp)
      .post('/api/admin/users')
      .set('Cookie', adminCookies)
      .send({
        fullName: 'Test Registrar Staff',
        email,
        password: 'Password123',
        role: Role.REGISTRAR,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.role).toBe(Role.REGISTRAR);

    await cleanupUser(res.body.id);
  });

  it('6. Admin can update a user details and status', async () => {
    const testTarget = await createTestUser(Role.STUDENT, `target-${Date.now()}`);

    // Update details
    const patchRes = await request(testApp)
      .patch(`/api/admin/users/${testTarget.id}`)
      .set('Cookie', adminCookies)
      .send({ fullName: 'Updated Target Name' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.fullName).toBe('Updated Target Name');

    // Update status
    const statusRes = await request(testApp)
      .patch(`/api/admin/users/${testTarget.id}/status`)
      .set('Cookie', adminCookies)
      .send({ status: AccountStatus.SUSPENDED, reason: 'Testing suspension' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe(AccountStatus.SUSPENDED);

    await cleanupUser(testTarget.id);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. DEPARTMENT, PROGRAM, COURSE, ACADEMIC YEAR, SEMESTER CRUD
  // ───────────────────────────────────────────────────────────────────────────

  let createdDeptId: string;
  let createdProgId: string;
  let createdCourseId: string;
  let createdAyId: string;
  let createdSemesterId: string;

  it('7. Admin can perform Department CRUD', async () => {
    // Create
    const code = `D${Math.floor(100 + Math.random() * 900)}`;
    const createRes = await request(testApp)
      .post('/api/admin/departments')
      .set('Cookie', adminCookies)
      .send({ name: `Department ${code}`, code, description: 'Test Department' });

    expect(createRes.status).toBe(201);
    createdDeptId = createRes.body.id;

    // List
    const listRes = await request(testApp)
      .get('/api/admin/departments')
      .set('Cookie', adminCookies);
    expect(listRes.status).toBe(200);

    // Get detail
    const detailRes = await request(testApp)
      .get(`/api/admin/departments/${createdDeptId}`)
      .set('Cookie', adminCookies);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.code).toBe(code);

    // Update
    const updateRes = await request(testApp)
      .patch(`/api/admin/departments/${createdDeptId}`)
      .set('Cookie', adminCookies)
      .send({ name: `Updated Dept ${code}` });
    expect(updateRes.status).toBe(200);
  });

  it('8. Admin can perform Program CRUD', async () => {
    const code = `P${Math.floor(100 + Math.random() * 900)}`;
    const createRes = await request(testApp)
      .post('/api/admin/programs')
      .set('Cookie', adminCookies)
      .send({
        name: `Program ${code}`,
        code,
        description: 'Test Program',
        durationYears: 4,
        totalCredits: 120,
        departmentId: createdDeptId,
      });

    expect(createRes.status).toBe(201);
    createdProgId = createRes.body.id;

    const listRes = await request(testApp)
      .get(`/api/admin/programs?departmentId=${createdDeptId}`)
      .set('Cookie', adminCookies);
    expect(listRes.status).toBe(200);

    const detailRes = await request(testApp)
      .get(`/api/admin/programs/${createdProgId}`)
      .set('Cookie', adminCookies);
    expect(detailRes.status).toBe(200);
  });

  it('9. Admin can perform Student CRUD', async () => {
    const studentCode = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
    const createRes = await request(testApp)
      .post('/api/admin/students')
      .set('Cookie', adminCookies)
      .send({
        fullName: 'Admin Created Student',
        email: `student-crud-${Date.now()}@test.local`,
        password: 'Password123!',
        programId: createdProgId,
        departmentId: createdDeptId,
        studentId: studentCode,
        yearLevel: 1,
      });

    expect(createRes.status).toBe(201);
    const createdStudent = createRes.body;

    const listRes = await request(testApp)
      .get(`/api/admin/students?search=${studentCode}`)
      .set('Cookie', adminCookies);
    expect(listRes.status).toBe(200);
    expect(listRes.body.students.length).toBeGreaterThanOrEqual(1);

    const detailRes = await request(testApp)
      .get(`/api/admin/students/${createdStudent.id}`)
      .set('Cookie', adminCookies);
    expect(detailRes.status).toBe(200);

    const updateRes = await request(testApp)
      .patch(`/api/admin/students/${createdStudent.id}`)
      .set('Cookie', adminCookies)
      .send({ yearLevel: 2, gpa: 3.5 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.yearLevel).toBe(2);

    const deleteRes = await request(testApp)
      .delete(`/api/admin/students/${createdStudent.id}`)
      .set('Cookie', adminCookies);
    expect(deleteRes.status).toBe(200);

    await cleanupUser(createdStudent.userId);
  });

  it('10. Admin can perform Instructor CRUD', async () => {
    const empId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
    const createRes = await request(testApp)
      .post('/api/admin/instructors')
      .set('Cookie', adminCookies)
      .send({
        fullName: 'Admin Created Instructor',
        email: `instructor-crud-${Date.now()}@test.local`,
        password: 'Password123!',
        employeeId: empId,
        title: 'Assistant Professor',
        specialization: 'Computer Science',
        departmentId: createdDeptId,
      });

    expect(createRes.status).toBe(201);
    const createdInst = createRes.body;

    const listRes = await request(testApp)
      .get(`/api/admin/instructors?departmentId=${createdDeptId}`)
      .set('Cookie', adminCookies);
    expect(listRes.status).toBe(200);

    const detailRes = await request(testApp)
      .get(`/api/admin/instructors/${createdInst.id}`)
      .set('Cookie', adminCookies);
    expect(detailRes.status).toBe(200);

    const updateRes = await request(testApp)
      .patch(`/api/admin/instructors/${createdInst.id}`)
      .set('Cookie', adminCookies)
      .send({ title: 'Associate Professor' });
    expect(updateRes.status).toBe(200);

    const deleteRes = await request(testApp)
      .delete(`/api/admin/instructors/${createdInst.id}`)
      .set('Cookie', adminCookies);
    expect(deleteRes.status).toBe(200);

    await cleanupUser(createdInst.userId);
  });

  it('11. Admin can perform Course CRUD', async () => {
    const code = `CS${Math.floor(100 + Math.random() * 900)}`;
    const createRes = await request(testApp)
      .post('/api/admin/courses')
      .set('Cookie', adminCookies)
      .send({
        code,
        name: `Intro to ${code}`,
        description: 'Course description',
        creditHours: 3,
        departmentId: createdDeptId,
      });

    expect(createRes.status).toBe(201);
    createdCourseId = createRes.body.id;

    const listRes = await request(testApp)
      .get(`/api/admin/courses?departmentId=${createdDeptId}`)
      .set('Cookie', adminCookies);
    expect(listRes.status).toBe(200);

    const detailRes = await request(testApp)
      .get(`/api/admin/courses/${createdCourseId}`)
      .set('Cookie', adminCookies);
    expect(detailRes.status).toBe(200);

    const updateRes = await request(testApp)
      .patch(`/api/admin/courses/${createdCourseId}`)
      .set('Cookie', adminCookies)
      .send({ creditHours: 4 });
    expect(updateRes.status).toBe(200);

    const deleteRes = await request(testApp)
      .delete(`/api/admin/courses/${createdCourseId}`)
      .set('Cookie', adminCookies);
    expect(deleteRes.status).toBe(200);
  });

  it('12. Admin can perform Academic Year & Semester CRUD', async () => {
    const ayName = `AY-${Date.now()}`;
    const ayCreate = await request(testApp)
      .post('/api/admin/academic-years')
      .set('Cookie', adminCookies)
      .send({
        name: ayName,
        startDate: '2026-09-01',
        endDate: '2027-06-30',
        isCurrent: false,
      });

    expect(ayCreate.status).toBe(201);
    createdAyId = ayCreate.body.id;

    const semCreate = await request(testApp)
      .post('/api/admin/semesters')
      .set('Cookie', adminCookies)
      .send({
        name: 'Fall Semester',
        academicYearId: createdAyId,
        startDate: '2026-09-01',
        endDate: '2026-12-31',
        registrationStart: '2026-08-01',
        registrationEnd: '2026-08-31',
        addDropDeadline: '2026-09-15',
      });

    expect(semCreate.status).toBe(201);
    createdSemesterId = semCreate.body.id;

    const semsRes = await request(testApp)
      .get(`/api/admin/semesters?academicYearId=${createdAyId}`)
      .set('Cookie', adminCookies);
    expect(semsRes.status).toBe(200);
    expect(semsRes.body.length).toBeGreaterThanOrEqual(1);

    // Clean up academic year and semester
    await prisma.semester.delete({ where: { id: createdSemesterId } }).catch(() => {});
    await prisma.academicYear.delete({ where: { id: createdAyId } }).catch(() => {});
  });

  it('13. Clean up created department and program', async () => {
    if (createdCourseId) await prisma.course.delete({ where: { id: createdCourseId } }).catch(() => {});
    if (createdProgId)   await prisma.program.delete({ where: { id: createdProgId } }).catch(() => {});
    if (createdDeptId)   await prisma.department.delete({ where: { id: createdDeptId } }).catch(() => {});
  });
});
