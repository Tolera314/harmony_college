/**
 * Harmony College — Department Head (HoD) Integration & Security Test Suite
 * Validates Security, Role-Based Access, Department Authorization, and IDOR protection.
 */

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import testApp from './testApp';
import { Role, OfferingStatus, LeaveStatus, LeaveType, DepartmentHeadAction } from '@prisma/client';

const PASSWORD = 'Password123!';
const HASH = bcrypt.hashSync(PASSWORD, 12);
const ts = Date.now();

describe('Department Head (HoD) Security & Authorization Test Suite', () => {
  let deptAId: string;
  let deptBId: string;

  let hodAUserId: string;
  let hodBUserId: string;
  let instructorAUserId: string;
  let studentAUserId: string;

  let hodACookies: string[];
  let hodBCookies: string[];
  let instructorCookies: string[];
  let studentCookies: string[];

  let courseAId: string;
  let courseBId: string;
  let semesterId: string;
  let academicYearId: string;

  let offeringAId: string;
  let offeringBId: string;
  let instructorARecordId: string;
  let instructorBRecordId: string;
  let studentARecordId: string;
  let studentBRecordId: string;

  let leaveAId: string;
  let leaveBId: string;

  beforeAll(async () => {
    // 1. Create Academic Year and Semester
    const ay = await prisma.academicYear.create({
      data: {
        name:      `Test AY ${ts}`,
        startDate: new Date('2026-01-01'),
        endDate:   new Date('2026-12-31'),
        isCurrent: true,
      },
    });
    academicYearId = ay.id;

    const sem = await prisma.semester.create({
      data: {
        name:              `Fall ${ts}`,
        academicYearId:    ay.id,
        startDate:         new Date('2026-09-01'),
        endDate:           new Date('2026-12-20'),
        registrationStart: new Date('2026-08-01'),
        registrationEnd:   new Date('2026-08-25'),
        addDropDeadline:   new Date('2026-09-15'),
        isCurrent:         true,
      },
    });
    semesterId = sem.id;

    // 2. Create Departments A and B
    const deptA = await prisma.department.create({
      data: { name: `Computer Science ${ts}`, code: `CS_${ts}` },
    });
    deptAId = deptA.id;

    const deptB = await prisma.department.create({
      data: { name: `Electrical Engineering ${ts}`, code: `EE_${ts}` },
    });
    deptBId = deptB.id;

    // 3. Create HoD User for Dept A
    const hodA = await prisma.user.create({
      data: {
        fullName:      'HoD Dept A User',
        email:         `hod-a-${ts}@test.local`,
        passwordHash:  HASH,
        role:          Role.DEPARTMENT_HEAD,
        status:        'ACTIVE',
        emailVerified: true,
        departmentHeadRecord: {
          create: {
            departmentId: deptAId,
            employeeId:   `HODA-${ts}`,
            title:        'Department Chair',
            isActive:     true,
          },
        },
      },
    });
    hodAUserId = hodA.id;

    // 4. Create HoD User for Dept B
    const hodB = await prisma.user.create({
      data: {
        fullName:      'HoD Dept B User',
        email:         `hod-b-${ts}@test.local`,
        passwordHash:  HASH,
        role:          Role.DEPARTMENT_HEAD,
        status:        'ACTIVE',
        emailVerified: true,
        departmentHeadRecord: {
          create: {
            departmentId: deptBId,
            employeeId:   `HODB-${ts}`,
            title:        'Department Head',
            isActive:     true,
          },
        },
      },
    });
    hodBUserId = hodB.id;

    // 5. Create Instructor User for Dept A
    const instrA = await prisma.user.create({
      data: {
        fullName:      'Instructor Dept A',
        email:         `instr-a-${ts}@test.local`,
        passwordHash:  HASH,
        role:          Role.INSTRUCTOR,
        status:        'ACTIVE',
        emailVerified: true,
        instructorRecord: {
          create: {
            departmentId:   deptAId,
            employeeId:     `INSTA-${ts}`,
            title:          'Associate Professor',
            specialization: 'Software Engineering',
            isActive:       true,
          },
        },
      },
    });
    instructorAUserId = instrA.id;
    const instrARec = await prisma.instructorRecord.findUnique({ where: { userId: instrA.id } });
    instructorARecordId = instrARec!.id;

    // 6. Create Instructor User for Dept B
    const instrB = await prisma.user.create({
      data: {
        fullName:      'Instructor Dept B',
        email:         `instr-b-${ts}@test.local`,
        passwordHash:  HASH,
        role:          Role.INSTRUCTOR,
        status:        'ACTIVE',
        emailVerified: true,
        instructorRecord: {
          create: {
            departmentId:   deptBId,
            employeeId:     `INSTB-${ts}`,
            title:          'Assistant Professor',
            specialization: 'Robotics',
            isActive:       true,
          },
        },
      },
    });
    const instrBRec = await prisma.instructorRecord.findUnique({ where: { userId: instrB.id } });
    instructorBRecordId = instrBRec!.id;

    // 7. Create Student User for Dept A
    const progA = await prisma.program.create({
      data: { name: `BS CS ${ts}`, code: `BSCS_${ts}`, departmentId: deptAId, totalCredits: 120 },
    });

    const studA = await prisma.user.create({
      data: {
        fullName:      'Student Dept A',
        email:         `stud-a-${ts}@test.local`,
        passwordHash:  HASH,
        role:          Role.STUDENT,
        status:        'ACTIVE',
        emailVerified: true,
        studentRecord: {
          create: {
            departmentId: deptAId,
            programId:    progA.id,
            studentId:    `STUDA-${ts}`,
            yearLevel:    3,
            gpa:          3.75,
          },
        },
      },
    });
    studentAUserId = studA.id;
    const studARec = await prisma.studentRecord.findUnique({ where: { userId: studA.id } });
    studentARecordId = studARec!.id;

    // 8. Create Student User for Dept B
    const progB = await prisma.program.create({
      data: { name: `BS EE ${ts}`, code: `BSEE_${ts}`, departmentId: deptBId, totalCredits: 120 },
    });
    const studB = await prisma.user.create({
      data: {
        fullName:      'Student Dept B',
        email:         `stud-b-${ts}@test.local`,
        passwordHash:  HASH,
        role:          Role.STUDENT,
        status:        'ACTIVE',
        emailVerified: true,
        studentRecord: {
          create: {
            departmentId: deptBId,
            programId:    progB.id,
            studentId:    `STUDB-${ts}`,
            yearLevel:    2,
            gpa:          3.50,
          },
        },
      },
    });
    const studBRec = await prisma.studentRecord.findUnique({ where: { userId: studB.id } });
    studentBRecordId = studBRec!.id;

    // 9. Create Courses & CourseOfferings for Dept A and Dept B
    const courseA = await prisma.course.create({
      data: { code: `CS101_${ts}`, name: 'Algorithms', departmentId: deptAId, creditHours: 3 },
    });
    courseAId = courseA.id;

    const courseB = await prisma.course.create({
      data: { code: `EE101_${ts}`, name: 'Circuit Analysis', departmentId: deptBId, creditHours: 3 },
    });
    courseBId = courseB.id;

    const offeringA = await prisma.courseOffering.create({
      data: {
        courseId:     courseA.id,
        semesterId:   semesterId,
        instructorId: instructorARecordId,
        capacity:     30,
        section:      '01',
        status:       OfferingStatus.DRAFT,
      },
    });
    offeringAId = offeringA.id;

    const offeringB = await prisma.courseOffering.create({
      data: {
        courseId:     courseB.id,
        semesterId:   semesterId,
        instructorId: instructorBRecordId,
        capacity:     25,
        section:      '01',
        status:       OfferingStatus.DRAFT,
      },
    });
    offeringBId = offeringB.id;

    // 10. Create Leave Requests for Dept A & Dept B Instructors
    const leaveA = await prisma.departmentLeaveRequest.create({
      data: {
        instructorId: instructorARecordId,
        leaveType:    LeaveType.ANNUAL,
        startDate:    new Date('2026-10-01'),
        endDate:      new Date('2026-10-05'),
        durationDays: 5,
        reason:       'Personal vacation',
        status:       LeaveStatus.PENDING_DH,
      },
    });
    leaveAId = leaveA.id;

    const leaveB = await prisma.departmentLeaveRequest.create({
      data: {
        instructorId: instructorBRecordId,
        leaveType:    LeaveType.MEDICAL,
        startDate:    new Date('2026-10-10'),
        endDate:      new Date('2026-10-12'),
        durationDays: 2,
        reason:       'Medical appointment',
        status:       LeaveStatus.PENDING_DH,
      },
    });
    leaveBId = leaveB.id;

    // 11. Obtain Login Cookies for each user role
    const getCookies = async (email: string) => {
      const res = await request(testApp)
        .post('/api/auth/login')
        .send({ identifier: email, password: PASSWORD });
      const cookies = res.headers['set-cookie'];
      return Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    };

    hodACookies        = await getCookies(`hod-a-${ts}@test.local`);
    hodBCookies        = await getCookies(`hod-b-${ts}@test.local`);
    instructorCookies  = await getCookies(`instr-a-${ts}@test.local`);
    studentCookies     = await getCookies(`stud-a-${ts}@test.local`);
  });

  afterAll(async () => {
    // Cleanup generated test data
    await prisma.departmentHeadAuditLog.deleteMany({ where: { userId: { in: [hodAUserId, hodBUserId] } } });
    await prisma.notification.deleteMany({ where: { userId: { in: [hodAUserId, hodBUserId] } } });
    await prisma.departmentLeaveRequest.deleteMany({ where: { id: { in: [leaveAId, leaveBId] } } });
    await prisma.courseOffering.deleteMany({ where: { id: { in: [offeringAId, offeringBId] } } });
    await prisma.course.deleteMany({ where: { id: { in: [courseAId, courseBId] } } });
    await prisma.studentRecord.deleteMany({ where: { id: { in: [studentARecordId, studentBRecordId] } } });
    await prisma.instructorRecord.deleteMany({ where: { id: { in: [instructorARecordId, instructorBRecordId] } } });
    await prisma.program.deleteMany({ where: { departmentId: { in: [deptAId, deptBId] } } });
    await prisma.departmentHeadRecord.deleteMany({ where: { userId: { in: [hodAUserId, hodBUserId] } } });
    await prisma.session.deleteMany({ where: { userId: { in: [hodAUserId, hodBUserId, instructorAUserId, studentAUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [hodAUserId, hodBUserId, instructorAUserId, studentAUserId] } } });
    await prisma.department.deleteMany({ where: { id: { in: [deptAId, deptBId] } } });
    await prisma.semester.delete({ where: { id: semesterId } });
    await prisma.academicYear.delete({ where: { id: academicYearId } });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SECURITY / IDOR TEST CASES
  // ───────────────────────────────────────────────────────────────────────────

  it('1. Unauthenticated user request → 401 Unauthorized', async () => {
    const res = await request(testApp).get('/api/department-head/dashboard');
    expect(res.status).toBe(401);
  });

  it('2. Student role accessing HoD routes → 403 Forbidden', async () => {
    const res = await request(testApp)
      .get('/api/department-head/dashboard')
      .set('Cookie', studentCookies);
    expect(res.status).toBe(403);
  });

  it('3. Instructor role accessing HoD-only routes → 403 Forbidden', async () => {
    const res = await request(testApp)
      .get('/api/department-head/dashboard')
      .set('Cookie', instructorCookies);
    expect(res.status).toBe(403);
  });

  it('4. HoD accessing own department data → 200 OK with correct stats', async () => {
    const res = await request(testApp)
      .get('/api/department-head/dashboard')
      .set('Cookie', hodACookies);

    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeDefined();
    expect(res.body.kpis.activeFaculty).toBe(1);
    expect(res.body.kpis.activeStudents).toBe(1);
    expect(res.body.kpis.pendingOfferings).toBe(1);
  });

  it('5. HoD accessing another department\'s course offering → 403 Forbidden', async () => {
    const res = await request(testApp)
      .get(`/api/department-head/course-offerings/${offeringBId}`)
      .set('Cookie', hodACookies);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not authorized|does not belong/i);
  });

  it('6. HoD accessing another department\'s faculty → 403 Forbidden', async () => {
    const res = await request(testApp)
      .get(`/api/department-head/faculty/${instructorBRecordId}`)
      .set('Cookie', hodACookies);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not authorized|does not belong/i);
  });

  it('7. HoD accessing another department\'s student → 403 Forbidden', async () => {
    const res = await request(testApp)
      .get(`/api/department-head/students/${studentBRecordId}`)
      .set('Cookie', hodACookies);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not authorized|does not belong/i);
  });

  it('8. HoD approving another department\'s course offering → 403 Forbidden', async () => {
    const res = await request(testApp)
      .post(`/api/department-head/course-offerings/${offeringBId}/approve`)
      .set('Cookie', hodACookies);

    expect(res.status).toBe(403);
  });

  it('9. HoD approving already-approved course (non-DRAFT) → 409 Conflict', async () => {
    // First approve offering A (it is DRAFT)
    const appRes = await request(testApp)
      .post(`/api/department-head/course-offerings/${offeringAId}/approve`)
      .set('Cookie', hodACookies);
    expect(appRes.status).toBe(200);

    // Second approve attempt on now-approved offering A → 409
    const secondAppRes = await request(testApp)
      .post(`/api/department-head/course-offerings/${offeringAId}/approve`)
      .set('Cookie', hodACookies);
    expect(secondAppRes.status).toBe(409);
    expect(secondAppRes.body.error).toMatch(/Cannot approve/i);
  });

  it('10. HoD approving unauthorized leave request (from another dept) → 403 Forbidden', async () => {
    const res = await request(testApp)
      .post(`/api/department-head/leave-requests/${leaveBId}/approve`)
      .set('Cookie', hodACookies)
      .send({ comment: 'Approved by unauthorized HoD' });

    expect(res.status).toBe(403);
  });

  it('11. Fake IDs (non-existent UUIDs) → 404 Not Found', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(testApp)
      .get(`/api/department-head/course-offerings/${fakeId}`)
      .set('Cookie', hodACookies);

    expect(res.status).toBe(404);
  });

  it('12. Client-supplied departmentId manipulation → ignored & derived from auth context', async () => {
    // Attempt to request course offerings with query manipulation or payload
    const res = await request(testApp)
      .get(`/api/department-head/course-offerings?departmentId=${deptBId}`)
      .set('Cookie', hodACookies);

    expect(res.status).toBe(200);
    // Should return only offeringA (which belongs to Dept A)
    const offeringIds = res.body.offerings.map((o: any) => o.id);
    expect(offeringIds).not.toContain(offeringBId);
  });

  it('13. Audit log mutation → Blocked / No POST or DELETE endpoints for audit log', async () => {
    const resPost = await request(testApp)
      .post('/api/department-head/audit-log')
      .set('Cookie', hodACookies)
      .send({ action: 'MALICIOUS_INJECTION' });

    expect(resPost.status).toBe(404);

    const resDelete = await request(testApp)
      .delete('/api/department-head/audit-log')
      .set('Cookie', hodACookies);

    expect(resDelete.status).toBe(404);
  });

  it('14. Notification isolation across users → HoD A cannot mark HoD B notification', async () => {
    // Create notification for HoD B
    const notifB = await prisma.notification.create({
      data: {
        userId:  hodBUserId,
        title:   'Dept B Notice',
        message: 'Confidential Dept B notice',
        type:    'INFO',
      },
    });

    // HoD A tries to mark read
    const res = await request(testApp)
      .patch(`/api/department-head/notifications/${notifB.id}/read`)
      .set('Cookie', hodACookies);

    expect(res.status).toBe(403);

    // Clean up
    await prisma.notification.delete({ where: { id: notifB.id } });
  });

  it('15. Department Leave Request approval workflow with audit log creation', async () => {
    const appRes = await request(testApp)
      .post(`/api/department-head/leave-requests/${leaveAId}/approve`)
      .set('Cookie', hodACookies)
      .send({ comment: 'Approved for research trip' });

    expect(appRes.status).toBe(200);
    expect(appRes.body.status).toBe(LeaveStatus.DH_APPROVED);

    // Verify audit log entry
    const auditRes = await request(testApp)
      .get('/api/department-head/audit-log')
      .set('Cookie', hodACookies);

    expect(auditRes.status).toBe(200);
    const actions = auditRes.body.logs.map((l: any) => l.action);
    expect(actions).toContain(DepartmentHeadAction.LEAVE_APPROVED);
  });

  it('16. Department Reports (enrollment, attendance, performance, workload) endpoints work', async () => {
    const [enr, att, perf, work] = await Promise.all([
      request(testApp).get('/api/department-head/reports/enrollment').set('Cookie', hodACookies),
      request(testApp).get('/api/department-head/reports/attendance').set('Cookie', hodACookies),
      request(testApp).get('/api/department-head/reports/performance').set('Cookie', hodACookies),
      request(testApp).get('/api/department-head/reports/workload').set('Cookie', hodACookies),
    ]);

    expect(enr.status).toBe(200);
    expect(att.status).toBe(200);
    expect(perf.status).toBe(200);
    expect(work.status).toBe(200);
  });
});
