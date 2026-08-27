/**
 * Harmony College — Development Database Seed
 * ⚠️  DEVELOPMENT ONLY — NEVER RUN IN PRODUCTION ⚠️
 *
 * Seeds: users, departments, programs, academic years, semesters,
 * courses, instructors, rooms, course offerings, timetables,
 * student records, enrollments, grades, applications, calendar events,
 * announcements, transcript requests, graduation audits.
 *
 * Run: npm run db:seed
 */

import {
  PrismaClient,
  Role,
  AccountStatus,
  ApplicationStatus,
  StudentStatus,
  CourseStatus,
  OfferingStatus,
  EnrollmentStatus,
  TranscriptRequestStatus,
  GraduationStatus,
  CalendarEventType,
  AnnouncementStatus,
  AssignmentStatus,
  SubmissionStatus,
  QuizStatus,
  QuizAttemptStatus,
  AttendanceStatus,
  TransactionType,
  QuestionType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production') {
  console.error('❌  Seed aborted: NODE_ENV is "production".');
  process.exit(1);
}

const prisma = new PrismaClient();
const DEV_PASSWORD = 'Dev@HarmonyTest2025!';
const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  console.log('\n🌱  Harmony College — Full Seed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);

  // ── 1. Core user accounts ────────────────────────────────────────────────
  const userSeeds = [
    { fullName: 'System Administrator', email: 'superadmin@test.local', phone: '+251911000001', role: Role.SUPER_ADMIN },
    { fullName: 'Admin User',           email: 'admin@test.local',      phone: '+251911000002', role: Role.ADMIN },
    { fullName: 'Robel Bekele',         email: 'registrar@test.local',  phone: '+251911000003', role: Role.REGISTRAR },
    { fullName: 'Finance Officer',      email: 'finance@test.local',    phone: '+251911000004', role: Role.FINANCE_OFFICER },
    { fullName: 'HR Officer',           email: 'hr@test.local',         phone: '+251911000005', role: Role.HR_OFFICER },
    { fullName: 'Department Head',      email: 'departmenthead@test.local', phone: '+251911000006', role: Role.DEPARTMENT_HEAD },
    // Instructors
    { fullName: 'Dr. Bekele Ayalew',    email: 'instructor@test.local',   phone: '+251911000007', role: Role.INSTRUCTOR },
    { fullName: 'Prof. Martha Wondimu', email: 'instructor2@test.local',  phone: '+251911000008', role: Role.INSTRUCTOR },
    { fullName: 'Dr. Elias Lemma',      email: 'instructor3@test.local',  phone: '+251911000009', role: Role.INSTRUCTOR },
    { fullName: 'Dr. Abel Tesfaye',     email: 'instructor4@test.local',  phone: '+251911000010', role: Role.INSTRUCTOR },
    { fullName: 'Ato Kebede Belay',     email: 'instructor5@test.local',  phone: '+251911000011', role: Role.INSTRUCTOR },
    // Students
    { fullName: 'Alexander Sterling',   email: 'student@test.local',     phone: '+251911883201', role: Role.STUDENT },
    { fullName: 'Selam Alemayehu',      email: 'selam@test.local',       phone: '+251911223344', role: Role.STUDENT },
    { fullName: 'Yonas Kebede',         email: 'yonas@test.local',       phone: '+251911667788', role: Role.STUDENT },
    { fullName: 'Marta Hailu',          email: 'marta@test.local',       phone: '+251911889900', role: Role.STUDENT },
    { fullName: 'Kidus Tilahun',        email: 'kidus@test.local',       phone: '+251911443322', role: Role.STUDENT },
    { fullName: 'Tigist Bekele',        email: 'tigist@test.local',      phone: '+251911556677', role: Role.STUDENT },
    { fullName: 'Dawit Alemu',          email: 'dawit@test.local',       phone: '+251911334455', role: Role.STUDENT },
    { fullName: 'New Student',          email: 'newstudent@test.local',  phone: '+251911000099', role: Role.STUDENT },
  ];

  const users: Record<string, string> = {};
  for (const s of userSeeds) {
    const isNew = s.email === 'newstudent@test.local';
    // First try to find existing user by email
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    let u;
    if (existing) {
      // Update existing — skip phone update to avoid unique constraint conflicts
      u = await prisma.user.update({
        where: { id: existing.id },
        data: { fullName: s.fullName, passwordHash, failedLoginAttempts: 0 },
      });
    } else {
      // Check if phone is already taken by another record
      const phoneConflict = s.phone
        ? await prisma.user.findUnique({ where: { phone: s.phone } })
        : null;
      u = await prisma.user.create({
        data: {
          fullName: s.fullName, email: s.email,
          phone: phoneConflict ? null : s.phone,
          passwordHash, role: s.role,
          status: AccountStatus.ACTIVE,
          emailVerified: !isNew, phoneVerified: !isNew,
          profileCompleted: !isNew, profileCompletion: isNew ? 0 : 100,
          failedLoginAttempts: 0,
        },
      });
    }
    users[s.email] = u.id;
    console.log(`✅  [${s.role.padEnd(16)}]  ${s.email}`);
  }

  // ── 2. Departments ───────────────────────────────────────────────────────
  console.log('\n📁  Seeding departments...');
  const deptCS = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: { name: 'Computer Science', code: 'CS', description: 'Department of Computer Science and Engineering', isActive: true },
  });
  const deptMATH = await prisma.department.upsert({
    where: { code: 'MATH' },
    update: {},
    create: { name: 'Mathematics', code: 'MATH', description: 'Department of Mathematics and Statistics', isActive: true },
  });
  const deptMECH = await prisma.department.upsert({
    where: { code: 'MECH' },
    update: {},
    create: { name: 'Mechanical Engineering', code: 'MECH', description: 'Department of Mechanical Engineering', isActive: true },
  });
  const deptBUS = await prisma.department.upsert({
    where: { code: 'BUS' },
    update: {},
    create: { name: 'Business Administration', code: 'BUS', description: 'Department of Business Administration', isActive: true },
  });
  const deptENG = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {},
    create: { name: 'English Language', code: 'ENG', description: 'Department of English Language and Literature', isActive: true },
  });
  console.log('   ✓ 5 departments');

  // ── 3. Programs ──────────────────────────────────────────────────────────
  console.log('📚  Seeding programs...');
  const progCS = await prisma.program.upsert({
    where: { code: 'BSCS' },
    update: {},
    create: { name: 'Computer Science (B.Sc.)', code: 'BSCS', durationYears: 4, totalCredits: 132, departmentId: deptCS.id },
  });
  const progMECH = await prisma.program.upsert({
    where: { code: 'BSME' },
    update: {},
    create: { name: 'Mechanical Engineering (B.Sc.)', code: 'BSME', durationYears: 4, totalCredits: 140, departmentId: deptMECH.id },
  });
  const progBUS = await prisma.program.upsert({
    where: { code: 'BABA' },
    update: {},
    create: { name: 'Business Administration (B.A.)', code: 'BABA', durationYears: 4, totalCredits: 120, departmentId: deptBUS.id },
  });
  const progIT = await prisma.program.upsert({
    where: { code: 'BSIT' },
    update: {},
    create: { name: 'Information Technology (B.Sc.)', code: 'BSIT', durationYears: 4, totalCredits: 128, departmentId: deptCS.id },
  });
  console.log('   ✓ 4 programs');

  // ── 4. Academic Years & Semesters ────────────────────────────────────────
  console.log('📅  Seeding academic years & semesters...');
  const ay2024 = await prisma.academicYear.upsert({
    where: { name: '2024-2025' },
    update: {},
    create: {
      name: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
      isCurrent: false, isActive: true,
    },
  });j
  const ay2025 = await prisma.academicYear.upsert({
    where: { name: '2025-2026' },
    update: {},
    create: {
      name: '2025-2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      isCurrent: false, isActive: true,
    },
  });
  const ay2026 = await prisma.academicYear.upsert({
    where: { name: '2026-2027' },
    update: {},
    create: {
      name: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true, isActive: true,
    },
  });

  const sem1_2026 = await prisma.semester.upsert({
    where: { academicYearId_name: { academicYearId: ay2026.id, name: 'Semester I' } },
    update: {},
    create: {
      name: 'Semester I', academicYearId: ay2026.id,
      startDate: new Date('2026-09-01'), endDate: new Date('2027-01-31'),
      registrationStart: new Date('2026-08-01'), registrationEnd: new Date('2026-08-20'),
      addDropDeadline: new Date('2026-09-15'),
      isCurrent: true, isActive: true,
    },
  });
  const sem2_2026 = await prisma.semester.upsert({
    where: { academicYearId_name: { academicYearId: ay2026.id, name: 'Semester II' } },
    update: {},
    create: {
      name: 'Semester II', academicYearId: ay2026.id,
      startDate: new Date('2027-02-01'), endDate: new Date('2027-06-30'),
      registrationStart: new Date('2027-01-05'), registrationEnd: new Date('2027-01-20'),
      addDropDeadline: new Date('2027-02-15'),
      isCurrent: false, isActive: true,
    },
  });
  const sem1_2025 = await prisma.semester.upsert({
    where: { academicYearId_name: { academicYearId: ay2025.id, name: 'Semester I' } },
    update: {},
    create: {
      name: 'Semester I', academicYearId: ay2025.id,
      startDate: new Date('2025-09-01'), endDate: new Date('2026-01-31'),
      registrationStart: new Date('2025-08-01'), registrationEnd: new Date('2025-08-20'),
      addDropDeadline: new Date('2025-09-15'),
      isCurrent: false, isActive: false,
    },
  });
  const sem2_2025 = await prisma.semester.upsert({
    where: { academicYearId_name: { academicYearId: ay2025.id, name: 'Semester II' } },
    update: {},
    create: {
      name: 'Semester II', academicYearId: ay2025.id,
      startDate: new Date('2026-02-01'), endDate: new Date('2026-06-30'),
      registrationStart: new Date('2026-01-05'), registrationEnd: new Date('2026-01-20'),
      addDropDeadline: new Date('2026-02-15'),
      isCurrent: false, isActive: false,
    },
  });
  console.log('   ✓ 3 academic years, 5 semesters');

  // ── 5. Rooms ─────────────────────────────────────────────────────────────
  console.log('🏫  Seeding rooms...');
  const rooms = await Promise.all([
    prisma.room.upsert({ where: { building_name: { building: 'Block A', name: '101' } }, update: {}, create: { name: '101', building: 'Block A', capacity: 60 } }),
    prisma.room.upsert({ where: { building_name: { building: 'Block A', name: '104' } }, update: {}, create: { name: '104', building: 'Block A', capacity: 50 } }),
    prisma.room.upsert({ where: { building_name: { building: 'Block B', name: '201' } }, update: {}, create: { name: '201', building: 'Block B', capacity: 35 } }),
    prisma.room.upsert({ where: { building_name: { building: 'Block B', name: '302' } }, update: {}, create: { name: '302', building: 'Block B', capacity: 30 } }),
    prisma.room.upsert({ where: { building_name: { building: 'Block C', name: '204' } }, update: {}, create: { name: '204', building: 'Block C', capacity: 45 } }),
    prisma.room.upsert({ where: { building_name: { building: 'Block C', name: '101' } }, update: {}, create: { name: '101', building: 'Block C', capacity: 55 } }),
    prisma.room.upsert({ where: { building_name: { building: 'Lab D', name: 'L01' } }, update: {}, create: { name: 'L01', building: 'Lab D', capacity: 25 } }),
  ]);
  const [rA101, rA104, rB201, rB302, rC204, rC101, rLabL01] = rooms;
  console.log('   ✓ 7 rooms');

  // ── 6. Instructor Records ────────────────────────────────────────────────
  console.log('👨‍🏫  Seeding instructor records...');
  const instr1 = await prisma.instructorRecord.upsert({
    where: { userId: users['instructor@test.local'] },
    update: {},
    create: { userId: users['instructor@test.local'], employeeId: 'INS-2020-001', title: 'Dr.', specialization: 'Algorithms & Data Structures', departmentId: deptCS.id },
  });
  const instr2 = await prisma.instructorRecord.upsert({
    where: { userId: users['instructor2@test.local'] },
    update: {},
    create: { userId: users['instructor2@test.local'], employeeId: 'INS-2021-002', title: 'Prof.', specialization: 'Calculus & Analysis', departmentId: deptMATH.id },
  });
  const instr3 = await prisma.instructorRecord.upsert({
    where: { userId: users['instructor3@test.local'] },
    update: {},
    create: { userId: users['instructor3@test.local'], employeeId: 'INS-2022-003', title: 'Dr.', specialization: 'Artificial Intelligence', departmentId: deptCS.id },
  });
  const instr4 = await prisma.instructorRecord.upsert({
    where: { userId: users['instructor4@test.local'] },
    update: {},
    create: { userId: users['instructor4@test.local'], employeeId: 'INS-2022-004', title: 'Dr.', specialization: 'Mechanical Systems', departmentId: deptMECH.id },
  });
  const instr5 = await prisma.instructorRecord.upsert({
    where: { userId: users['instructor5@test.local'] },
    update: {},
    create: { userId: users['instructor5@test.local'], employeeId: 'INS-2023-005', title: 'Ato', specialization: 'Business Strategy', departmentId: deptBUS.id },
  });
  console.log('   ✓ 5 instructor records');

  // ── 6b. Department Head Record ───────────────────────────────────────────
  console.log('👩‍💼  Seeding department head record...');
  await prisma.departmentHeadRecord.upsert({
    where:  { userId: users['departmenthead@test.local'] },
    update: {},
    create: {
      userId:       users['departmenthead@test.local'],
      employeeId:   'DH-2024-001',
      title:        'Department Head & Associate Professor',
      isActive:     true,
      departmentId: deptCS.id,
    },
  });
  // Seed a few sample leave requests for CS faculty
  const dhRecord = await prisma.departmentHeadRecord.findUnique({
    where: { userId: users['departmenthead@test.local'] },
  });
  if (dhRecord) {
    const leaveSeeds = [
      {
        instructorId: instr1.id,
        leaveType:    'CONFERENCE' as const,
        startDate:    new Date('2026-09-15'),
        endDate:      new Date('2026-09-19'),
        durationDays: 5,
        reason:       'Presenting research at the International Computer Science Conference in Nairobi.',
        status:       'PENDING_DH' as const,
      },
      {
        instructorId: instr3.id,
        leaveType:    'MEDICAL' as const,
        startDate:    new Date('2026-09-22'),
        endDate:      new Date('2026-09-26'),
        durationDays: 5,
        reason:       'Medical procedure and recovery period. Doctor clearance attached.',
        status:       'PENDING_DH' as const,
      },
      {
        instructorId: instr1.id,
        leaveType:    'RESEARCH' as const,
        startDate:    new Date('2026-08-01'),
        endDate:      new Date('2026-08-14'),
        durationDays: 14,
        reason:       'University-sponsored research collaboration at Addis Ababa University.',
        status:       'DH_APPROVED' as const,
        reviewedByDhId: dhRecord.id,
        dhComment:    'Approved. Research collaboration benefits the department.',
        dhReviewedAt: new Date('2026-07-25'),
      },
    ];
    for (const lr of leaveSeeds) {
      const existing = await prisma.departmentLeaveRequest.findFirst({
        where: { instructorId: lr.instructorId, startDate: lr.startDate },
      });
      if (!existing) {
        await prisma.departmentLeaveRequest.create({ data: lr });
      }
    }
  }
  console.log('   ✓ Department head record & sample leave requests');

  // ── 7. Courses ───────────────────────────────────────────────────────────
  console.log('📖  Seeding courses...');
  const courseData = [
    { code: 'CS101', name: 'Introduction to Computer Science', creditHours: 4, deptId: deptCS.id, desc: 'Core algorithmic paradigms and Python programming.' },
    { code: 'CS201', name: 'Data Structures & Algorithms', creditHours: 4, deptId: deptCS.id, desc: 'Stacks, queues, trees, graphs, and Big O analysis.' },
    { code: 'CS302', name: 'Database Management Systems', creditHours: 3, deptId: deptCS.id, desc: 'SQL, transactions, schema normalization.' },
    { code: 'CS401', name: 'Software Engineering', creditHours: 3, deptId: deptCS.id, desc: 'SDLC, agile, design patterns, testing.' },
    { code: 'CS440', name: 'Artificial Intelligence', creditHours: 4, deptId: deptCS.id, desc: 'Machine learning, neural networks, search algorithms.' },
    { code: 'CS450', name: 'Computer Networks', creditHours: 3, deptId: deptCS.id, desc: 'OSI model, TCP/IP, routing, security.' },
    { code: 'MATH101', name: 'Calculus I', creditHours: 4, deptId: deptMATH.id, desc: 'Limits, derivatives, integrals.' },
    { code: 'MATH201', name: 'Calculus II', creditHours: 3, deptId: deptMATH.id, desc: 'Techniques of integration, sequences, series.' },
    { code: 'MATH302', name: 'Calculus III (Multivariable)', creditHours: 3, deptId: deptMATH.id, desc: 'Partial derivatives, multiple integrals, vector calculus.' },
    { code: 'MATH210', name: 'Linear Algebra', creditHours: 3, deptId: deptMATH.id, desc: 'Matrices, determinants, eigenvalues, vector spaces.' },
    { code: 'MECH101', name: 'Engineering Fundamentals', creditHours: 3, deptId: deptMECH.id, desc: 'Introduction to engineering design.' },
    { code: 'MECH201', name: 'Engineering Statics', creditHours: 3, deptId: deptMECH.id, desc: 'Forces, moments, equilibrium of rigid bodies.' },
    { code: 'MECH301', name: 'Thermodynamics', creditHours: 3, deptId: deptMECH.id, desc: 'Laws of thermodynamics, energy transfer.' },
    { code: 'BUS101', name: 'Principles of Management', creditHours: 3, deptId: deptBUS.id, desc: 'Planning, organizing, leading, controlling.' },
    { code: 'BUS201', name: 'Financial Accounting', creditHours: 3, deptId: deptBUS.id, desc: 'Balance sheets, income statements, cash flow.' },
    { code: 'BUS301', name: 'Marketing Management', creditHours: 3, deptId: deptBUS.id, desc: 'Market analysis, branding, consumer behavior.' },
  ];

  const courseMap: Record<string, string> = {};
  for (const c of courseData) {
    const course = await prisma.course.upsert({
      where: { code: c.code },
      update: {},
      create: { code: c.code, name: c.name, creditHours: c.creditHours, departmentId: c.deptId, description: c.desc, status: CourseStatus.ACTIVE },
    });
    courseMap[c.code] = course.id;
  }
  // Prerequisites
  const prereqs = [
    ['CS201', 'CS101'], ['CS302', 'CS201'], ['CS401', 'CS201'],
    ['CS440', 'CS201'], ['CS440', 'MATH302'], ['CS450', 'CS201'],
    ['MATH201', 'MATH101'], ['MATH302', 'MATH201'], ['MATH210', 'MATH101'],
    ['MECH201', 'MATH101'], ['MECH301', 'MECH201'], ['BUS201', 'BUS101'],
  ];
  for (const [cCode, pCode] of prereqs) {
    await prisma.coursePrerequisite.upsert({
      where: { courseId_prerequisiteId: { courseId: courseMap[cCode], prerequisiteId: courseMap[pCode] } },
      update: {},
      create: { courseId: courseMap[cCode], prerequisiteId: courseMap[pCode] },
    });
  }
  console.log(`   ✓ ${courseData.length} courses, ${prereqs.length} prerequisites`);

  // ── 8. Course Offerings (current semester) ───────────────────────────────
  console.log('🗓️   Seeding course offerings...');
  const offeringsData = [
    { code: 'CS101', instrId: instr1.id, roomId: rA101.id, capacity: 60, section: 'A', status: OfferingStatus.SCHEDULED },
    { code: 'CS201', instrId: instr1.id, roomId: rC204.id, capacity: 45, section: 'A', status: OfferingStatus.SCHEDULED },
    { code: 'CS302', instrId: instr1.id, roomId: rA104.id, capacity: 40, section: 'A', status: OfferingStatus.SCHEDULED },
    { code: 'CS440', instrId: instr3.id, roomId: rB302.id, capacity: 30, section: 'A', status: OfferingStatus.SCHEDULED },
    { code: 'CS450', instrId: instr3.id, roomId: rC101.id, capacity: 50, section: 'A', status: OfferingStatus.DRAFT },
    { code: 'MATH101', instrId: instr2.id, roomId: rA104.id, capacity: 50, section: 'A', status: OfferingStatus.SCHEDULED },
    { code: 'MATH101', instrId: instr2.id, roomId: rA101.id, capacity: 60, section: 'B', status: OfferingStatus.INSTRUCTOR_ASSIGNED },
    { code: 'MATH302', instrId: instr2.id, roomId: rC204.id, capacity: 40, section: 'A', status: OfferingStatus.SCHEDULED },
    { code: 'MECH201', instrId: instr4.id, roomId: rB201.id, capacity: 35, section: 'A', status: OfferingStatus.CLOSED },
    { code: 'BUS101', instrId: instr5.id, roomId: rC101.id, capacity: 55, section: 'A', status: OfferingStatus.SCHEDULED },
    { code: 'BUS201', instrId: instr5.id, roomId: rA104.id, capacity: 45, section: 'A', status: OfferingStatus.DRAFT },
  ];

  const offeringMap: Record<string, string> = {};
  for (const o of offeringsData) {
    const key = `${o.code}-${o.section}`;
    const existing = await prisma.courseOffering.findFirst({
      where: { courseId: courseMap[o.code], semesterId: sem1_2026.id, section: o.section },
    });
    const off = existing ?? await prisma.courseOffering.create({
      data: {
        courseId: courseMap[o.code], semesterId: sem1_2026.id,
        instructorId: o.instrId, roomId: o.roomId,
        capacity: o.capacity, section: o.section, status: o.status,
      },
    });
    offeringMap[key] = off.id;
  }
  console.log(`   ✓ ${offeringsData.length} course offerings`);

  // ── 9. Timetable slots ───────────────────────────────────────────────────
  console.log('⏰  Seeding timetable slots...');
  const timetableData = [
    { key: 'CS101-A', slots: [{ day: 0, start: '09:00', end: '10:30' }, { day: 2, start: '09:00', end: '10:30' }] },
    { key: 'CS201-A', slots: [{ day: 1, start: '10:00', end: '11:30' }, { day: 3, start: '10:00', end: '11:30' }] },
    { key: 'CS302-A', slots: [{ day: 0, start: '13:00', end: '14:30' }, { day: 2, start: '13:00', end: '14:30' }] },
    { key: 'CS440-A', slots: [{ day: 2, start: '14:00', end: '15:30' }, { day: 4, start: '14:00', end: '15:30' }] },
    { key: 'MATH101-A', slots: [{ day: 0, start: '11:00', end: '12:30' }, { day: 2, start: '11:00', end: '12:30' }] },
    { key: 'MATH302-A', slots: [{ day: 1, start: '10:00', end: '11:30' }, { day: 3, start: '10:00', end: '11:30' }] },
    { key: 'MECH201-A', slots: [{ day: 0, start: '16:00', end: '17:30' }, { day: 4, start: '16:00', end: '17:30' }] },
    { key: 'BUS101-A', slots: [{ day: 1, start: '08:00', end: '09:30' }, { day: 3, start: '08:00', end: '09:30' }] },
  ];
  for (const t of timetableData) {
    if (!offeringMap[t.key]) continue;
    const off = offeringsData.find(o => `${o.code}-${o.section}` === t.key)!;
    for (const sl of t.slots) {
      const exists = await prisma.timetableSlot.findFirst({ where: { courseOfferingId: offeringMap[t.key], dayOfWeek: sl.day, startTime: sl.start } });
      if (!exists) {
        await prisma.timetableSlot.create({
          data: { courseOfferingId: offeringMap[t.key], dayOfWeek: sl.day, startTime: sl.start, endTime: sl.end, roomId: off.roomId, instructorId: off.instrId },
        });
      }
    }
  }
  console.log('   ✓ timetable slots');

  // ── 10. Student Records & Profiles ───────────────────────────────────────
  console.log('🎓  Seeding student records...');
  const studentDefs = [
    { email: 'student@test.local',  studentId: 'HC-2024-0001', progId: progCS.id,   deptId: deptCS.id,   year: 3, gpa: 3.72, credits: 92,  status: StudentStatus.ACTIVE,    dob: '2002-05-14', gender: 'Male',   city: 'Addis Ababa' },
    { email: 'selam@test.local',    studentId: 'HC-2024-0012', progId: progCS.id,   deptId: deptCS.id,   year: 3, gpa: 3.92, credits: 88,  status: StudentStatus.ACTIVE,    dob: '2005-04-12', gender: 'Female', city: 'Addis Ababa' },
    { email: 'yonas@test.local',    studentId: 'HC-2024-0015', progId: progMECH.id, deptId: deptMECH.id, year: 2, gpa: 2.85, credits: 56,  status: StudentStatus.ACTIVE,    dob: '2004-11-22', gender: 'Male',   city: 'Adama' },
    { email: 'marta@test.local',    studentId: 'HC-2025-0912', progId: progBUS.id,  deptId: deptBUS.id,  year: 1, gpa: 3.15, credits: 28,  status: StudentStatus.ACTIVE,    dob: '2005-08-30', gender: 'Female', city: 'Hawassa' },
    { email: 'kidus@test.local',    studentId: 'HC-2023-0182', progId: progCS.id,   deptId: deptCS.id,   year: 4, gpa: 1.95, credits: 104, status: StudentStatus.ON_LEAVE,  dob: '2003-01-15', gender: 'Male',   city: 'Bahir Dar' },
    { email: 'tigist@test.local',   studentId: 'HC-2024-0034', progId: progIT.id,   deptId: deptCS.id,   year: 2, gpa: 3.45, credits: 60,  status: StudentStatus.ACTIVE,    dob: '2004-07-22', gender: 'Female', city: 'Dire Dawa' },
    { email: 'dawit@test.local',    studentId: 'HC-2023-0095', progId: progBUS.id,  deptId: deptBUS.id,  year: 3, gpa: 3.10, credits: 84,  status: StudentStatus.SUSPENDED, dob: '2003-03-10', gender: 'Male',   city: 'Mekelle' },
  ];

  const studentRecordMap: Record<string, string> = {};
  for (const sd of studentDefs) {
    const userId = users[sd.email];
    if (!userId) continue;
    const existing = await prisma.studentRecord.findUnique({ where: { userId } });
    const sr = existing ?? await prisma.studentRecord.create({
      data: {
        userId, studentId: sd.studentId, programId: sd.progId, departmentId: sd.deptId,
        yearLevel: sd.year, gpa: sd.gpa, totalCredits: sd.credits, status: sd.status,
        admittedAt: new Date('2024-09-01'),
      },
    });
    studentRecordMap[sd.email] = sr.id;
    // StudentProfile for onboarding
    await prisma.studentProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId, dob: new Date(sd.dob), gender: sd.gender, nationality: 'Ethiopian',
        city: sd.city, address: `Kebele 05, ${sd.city}`,
        program: sd.progId, academicYear: '2026-2027', semester: 'Semester I',
        emergencyName: 'Guardian', emergencyPhone: '+251911000099', emergencyRelationship: 'Parent',
      },
    });
  }
  console.log(`   ✓ ${studentDefs.length} student records`);

  // ── 11. Enrollments & Grades (active students) ───────────────────────────
  console.log('📝  Seeding enrollments...');
  // Past semester grades (completed)
  const pastGrades: Record<string, { grade: string; pts: number }> = {
    'A': { grade: 'A', pts: 4.0 }, 'B+': { grade: 'B+', pts: 3.5 },
    'B': { grade: 'B', pts: 3.0 }, 'C+': { grade: 'C+', pts: 2.5 },
    'C': { grade: 'C', pts: 2.0 },
  };

  const enrollmentSeeds = [
    // Selam — CS Year 3 (active current sem)
    { email: 'selam@test.local', offeringKey: 'CS201-A', status: EnrollmentStatus.ACTIVE, grade: null },
    { email: 'selam@test.local', offeringKey: 'CS302-A', status: EnrollmentStatus.ACTIVE, grade: null },
    { email: 'selam@test.local', offeringKey: 'MATH302-A', status: EnrollmentStatus.FORCE_ADDED, grade: null, override: { reason: 'Prerequisite bypass approved by DH', by: users['registrar@test.local'] } },
    // Yonas — MECH Year 2
    { email: 'yonas@test.local', offeringKey: 'MATH101-A', status: EnrollmentStatus.ACTIVE, grade: null },
    { email: 'yonas@test.local', offeringKey: 'MECH201-A', status: EnrollmentStatus.ACTIVE, grade: null },
    // Marta — BUS Year 1
    { email: 'marta@test.local', offeringKey: 'BUS101-A', status: EnrollmentStatus.ACTIVE, grade: null },
    // Tigist — IT Year 2
    { email: 'tigist@test.local', offeringKey: 'CS101-A', status: EnrollmentStatus.ACTIVE, grade: null },
    { email: 'tigist@test.local', offeringKey: 'MATH101-B', status: EnrollmentStatus.ACTIVE, grade: null },
    // Alexander — CS Year 3
    { email: 'student@test.local', offeringKey: 'CS302-A', status: EnrollmentStatus.ACTIVE, grade: null },
    { email: 'student@test.local', offeringKey: 'CS440-A', status: EnrollmentStatus.ACTIVE, grade: null },
  ];

  for (const e of enrollmentSeeds) {
    const srId = studentRecordMap[e.email];
    const offId = offeringMap[e.offeringKey];
    if (!srId || !offId) continue;
    const exists = await prisma.enrollment.findUnique({ where: { studentRecordId_courseOfferingId: { studentRecordId: srId, courseOfferingId: offId } } });
    if (!exists) {
      const isOverride = e.status === EnrollmentStatus.FORCE_ADDED;
      const en = e as any;
      await prisma.enrollment.create({
        data: {
          studentRecordId: srId, courseOfferingId: offId, status: e.status,
          isOverride, overrideReason: isOverride ? en.override?.reason : null,
          overrideBy: isOverride ? en.override?.by : null,
          overrideAt: isOverride ? new Date() : null,
        },
      });
    }
  }
  console.log(`   ✓ ${enrollmentSeeds.length} enrollments`);

  // ── 12. Admission Applications ───────────────────────────────────────────
  console.log('📋  Seeding admission applications...');
  const appSeeds = [
    { email: 'selam@test.local',  fullName: 'Selam Alemayehu',  status: ApplicationStatus.ACCEPTED, prog: 'Computer Science (B.Sc.)',         gender: 'Female', dob: '2005-04-12', age: 21, city: 'Addis Ababa', phone: '+251911223344', studyMode: 'Regular' },
    { email: 'yonas@test.local',  fullName: 'Yonas Kebede',    status: ApplicationStatus.ACCEPTED, prog: 'Mechanical Engineering (B.Sc.)',  gender: 'Male',   dob: '2004-11-22', age: 22, city: 'Adama',       phone: '+251911667788', studyMode: 'Regular' },
    { email: 'marta@test.local',  fullName: 'Marta Hailu',     status: ApplicationStatus.ACCEPTED, prog: 'Business Administration (B.A.)', gender: 'Female', dob: '2005-08-30', age: 20, city: 'Hawassa',     phone: '+251911889900', studyMode: 'Regular' },
    { email: 'kidus@test.local',  fullName: 'Kidus Tilahun',   status: ApplicationStatus.REJECTED, prog: 'Computer Science (B.Sc.)',       gender: 'Male',   dob: '2003-01-15', age: 23, city: 'Bahir Dar',   phone: '+251911443322', studyMode: 'Evening', reviewComment: 'Insufficient Matric scores (280/350).' },
    { email: 'tigist@test.local', fullName: 'Tigist Bekele',   status: ApplicationStatus.ACCEPTED, prog: 'Information Technology (B.Sc.)', gender: 'Female', dob: '2004-07-22', age: 22, city: 'Dire Dawa',   phone: '+251911556677', studyMode: 'Regular' },
    { email: 'dawit@test.local',  fullName: 'Dawit Alemu',     status: ApplicationStatus.ACCEPTED, prog: 'Business Administration (B.A.)', gender: 'Male',   dob: '2003-03-10', age: 23, city: 'Mekelle',     phone: '+251911334455', studyMode: 'Regular' },
    { email: 'newstudent@test.local', fullName: 'New Student', status: ApplicationStatus.SUBMITTED, prog: 'Computer Science (B.Sc.)',      gender: 'Male',   dob: '2006-01-01', age: 20, city: 'Addis Ababa', phone: '+251911000099', studyMode: 'Regular' },
  ];

  for (const a of appSeeds) {
    const userId = users[a.email];
    if (!userId) continue;
    const exists = await prisma.application.findUnique({ where: { userId } });
    if (!exists) {
      const regId = users['registrar@test.local'];
      await prisma.application.create({
        data: {
          userId, fullName: a.fullName, dob: new Date(a.dob), age: a.age,
          gender: a.gender, nationality: 'Ethiopian', emergencyContact: '+251911000099',
          phone: a.phone, city: a.city, address: `Kebele 03, ${a.city}`,
          program: a.prog, academicYear: '2026-2027', semester: 'Semester I',
          studyMode: a.studyMode, status: a.status,
          reviewComment: a.reviewComment ?? null,
          reviewedBy: (a.status === ApplicationStatus.ACCEPTED || a.status === ApplicationStatus.REJECTED) ? regId : null,
          reviewedAt: (a.status === ApplicationStatus.ACCEPTED || a.status === ApplicationStatus.REJECTED) ? new Date() : null,
          submittedAt: new Date(),
          documents: {
            create: [
              { type: 'MATRIC', fileUrl: '/uploads/sample_matric.pdf' },
              { type: 'GRADE_8', fileUrl: '/uploads/sample_grade8.pdf' },
            ],
          },
        },
      });
    }
  }
  console.log(`   ✓ ${appSeeds.length} applications`);

  // ── 13. Transcript Requests ──────────────────────────────────────────────
  console.log('📄  Seeding transcript requests...');
  const trSeeds = [
    { email: 'selam@test.local',   status: TranscriptRequestStatus.PENDING,    purpose: 'Graduate school application' },
    { email: 'student@test.local', status: TranscriptRequestStatus.ISSUED,     purpose: 'Employment verification', issuedAt: new Date() },
    { email: 'dawit@test.local',   status: TranscriptRequestStatus.PROCESSING, purpose: 'Scholarship application' },
  ];
  for (const t of trSeeds) {
    const srId = studentRecordMap[t.email];
    if (!srId) continue;
    const exists = await prisma.transcriptRequest.findFirst({ where: { studentRecordId: srId } });
    if (!exists) {
      const te = t as any;
      await prisma.transcriptRequest.create({
        data: { studentRecordId: srId, status: t.status, purpose: t.purpose, requestedAt: new Date(), issuedAt: te.issuedAt ?? null },
      });
    }
  }
  console.log('   ✓ transcript requests');

  // ── 14. Graduation Audits ────────────────────────────────────────────────
  console.log('🎓  Seeding graduation audits...');
  const gradSeeds = [
    { email: 'student@test.local', completed: 92,  required: 132, gpa: 3.72, eligible: false, status: GraduationStatus.PENDING },
    { email: 'kidus@test.local',   completed: 104, required: 132, gpa: 1.95, eligible: false, status: GraduationStatus.PENDING },
  ];
  for (const g of gradSeeds) {
    const srId = studentRecordMap[g.email];
    if (!srId) continue;
    const exists = await prisma.graduationAudit.findUnique({ where: { studentRecordId: srId } });
    if (!exists) {
      await prisma.graduationAudit.create({
        data: { studentRecordId: srId, completedCredits: g.completed, requiredCredits: g.required, currentGpa: g.gpa, requiredGpa: 2.0, isEligible: g.eligible, status: g.status },
      });
    }
  }
  console.log('   ✓ graduation audits');

  // ── 15. Academic Calendar Events ─────────────────────────────────────────
  console.log('📅  Seeding calendar events...');
  const calEvents = [
    { title: 'Add/Drop Period Closes', type: CalendarEventType.ADD_DROP_DEADLINE, start: new Date('2026-09-15'), end: new Date('2026-09-15') },
    { title: 'Late Registration Deadline', type: CalendarEventType.REGISTRATION_CLOSE, start: new Date('2026-08-20'), end: new Date('2026-08-20') },
    { title: 'Semester I Begins', type: CalendarEventType.SEMESTER_START, start: new Date('2026-09-01'), end: new Date('2026-09-01') },
    { title: 'Semester I Midterm Exams', type: CalendarEventType.EXAM_PERIOD, start: new Date('2026-11-01'), end: new Date('2026-11-14') },
    { title: 'Semester I Final Exams', type: CalendarEventType.EXAM_PERIOD, start: new Date('2027-01-10'), end: new Date('2027-01-25') },
    { title: 'Semester I Ends', type: CalendarEventType.SEMESTER_END, start: new Date('2027-01-31'), end: new Date('2027-01-31') },
    { title: 'Graduation Ceremony 2026', type: CalendarEventType.GRADUATION, start: new Date('2026-07-15'), end: new Date('2026-07-15') },
    { title: 'Ethiopian New Year (Holiday)', type: CalendarEventType.HOLIDAY, start: new Date('2026-09-11'), end: new Date('2026-09-13') },
    { title: 'Timkat (Holiday)', type: CalendarEventType.HOLIDAY, start: new Date('2027-01-19'), end: new Date('2027-01-20') },
    { title: 'Admission Applications Open', type: CalendarEventType.ADMISSION_DEADLINE, start: new Date('2026-06-01'), end: new Date('2026-07-31') },
  ];
  const regId2 = users['registrar@test.local'];
  for (const ev of calEvents) {
    const exists = await prisma.academicCalendarEvent.findFirst({ where: { title: ev.title } });
    if (!exists) {
      await prisma.academicCalendarEvent.create({
        data: { title: ev.title, eventType: ev.type, startDate: ev.start, endDate: ev.end, isPublished: true, academicYearId: ay2026.id, createdBy: regId2 },
      });
    }
  }
  console.log('   ✓ calendar events');

  // ── 16. Announcements ────────────────────────────────────────────────────
  console.log('📢  Seeding announcements...');
  const announcements = [
    { title: 'Registration Period Now Open — 2026/2027 Semester I', content: 'All eligible students are encouraged to register for courses before the deadline of August 20, 2026. Late registration incurs an additional fee.', status: AnnouncementStatus.PUBLISHED, priority: 'HIGH' },
    { title: 'Add/Drop Period Closes September 15', content: 'Students wishing to add or drop courses must do so before September 15. No changes will be permitted after this date.', status: AnnouncementStatus.PUBLISHED, priority: 'HIGH' },
    { title: 'Academic Calendar Updated for 2026-2027', content: 'The updated academic calendar including all important dates has been published. Please review it carefully.', status: AnnouncementStatus.PUBLISHED, priority: 'NORMAL' },
    { title: 'Scholarship Applications Open', content: 'Merit-based scholarship applications are now open. Students with GPA above 3.5 are encouraged to apply.', status: AnnouncementStatus.DRAFT, priority: 'NORMAL' },
    { title: 'Library System Maintenance', content: 'The digital library will be offline for maintenance on September 5, from 10pm to 2am.', status: AnnouncementStatus.PUBLISHED, priority: 'LOW' },
  ];
  for (const a of announcements) {
    const exists = await prisma.announcement.findFirst({ where: { title: a.title } });
    if (!exists) {
      await prisma.announcement.create({
        data: {
          title: a.title, content: a.content, status: a.status, priority: a.priority,
          targetAudience: 'ALL', createdBy: regId2,
          publishedBy: a.status === AnnouncementStatus.PUBLISHED ? regId2 : null,
          publishedAt: a.status === AnnouncementStatus.PUBLISHED ? new Date() : null,
        },
      });
    }
  }
  console.log('   ✓ announcements');

  // ── 17. Registrar Audit Logs ─────────────────────────────────────────────
  console.log('🔍  Seeding audit logs...');
  const auditSeeds = [
    { action: 'ADMISSION_APPROVED' as const, entity: 'Application', entityId: 'seed', desc: 'Admission approved for Selam Alemayehu' },
    { action: 'ADMISSION_APPROVED' as const, entity: 'Application', entityId: 'seed', desc: 'Admission approved for Marta Hailu' },
    { action: 'ADMISSION_REJECTED' as const, entity: 'Application', entityId: 'seed', desc: 'Admission rejected for Kidus Tilahun — insufficient scores' },
    { action: 'COURSE_CREATED' as const,     entity: 'Course',       entityId: 'seed', desc: 'Course CS440 Artificial Intelligence created' },
    { action: 'OFFERING_CREATED' as const,   entity: 'CourseOffering', entityId: 'seed', desc: 'Course offering CS101-A created for Semester I 2026' },
    { action: 'ENROLLMENT_FORCE_ADDED' as const, entity: 'Enrollment', entityId: 'seed', desc: 'Force-added Selam Alemayehu to MATH302 — prerequisite bypass' },
    { action: 'STUDENT_SUSPENDED' as const,  entity: 'StudentRecord', entityId: 'seed', desc: 'Student Dawit Alemu suspended pending review' },
  ];
  for (const al of auditSeeds) {
    await prisma.registrarAuditLog.create({
      data: { userId: regId2, action: al.action, entityType: al.entity, entityId: al.entityId, description: al.desc, metadata: { seeded: true } },
    });
  }
  console.log('   ✓ registrar audit logs');

  // ── 18. Program Requirements ─────────────────────────────────────────────
  await prisma.programRequirement.deleteMany({ where: { programId: progCS.id } });
  await prisma.programRequirement.createMany({ data: [
    { programId: progCS.id, category: 'CORE', description: 'Core CS courses', requiredCredits: 80, minimumGPA: 2.0 },
    { programId: progCS.id, category: 'ELECTIVE', description: 'CS elective courses', requiredCredits: 20, minimumGPA: 2.0 },
    { programId: progCS.id, category: 'GENERAL', description: 'General education requirements', requiredCredits: 32, minimumGPA: 2.0 },
  ]});
  await prisma.programRequirement.deleteMany({ where: { programId: progBUS.id } });
  await prisma.programRequirement.createMany({ data: [
    { programId: progBUS.id, category: 'CORE', description: 'Core Business courses', requiredCredits: 72, minimumGPA: 2.0 },
    { programId: progBUS.id, category: 'GENERAL', description: 'General education requirements', requiredCredits: 48, minimumGPA: 2.0 },
  ]});
  console.log('   ✓ program requirements');

  // ── 19. Student Dashboard Data (assignments, quizzes, attendance, financials) ──
  await seedStudentDashboardData();

  // ── 20. Grade Scale ─────────────────────────────────────────────────────
  console.log('📊  Seeding grade scale...');
  const GRADE_SCALE_DATA = [
    { letterGrade: 'A+', gradePoints: 4.0, description: 'Outstanding',       isPassing: true,  displayOrder: 1  },
    { letterGrade: 'A',  gradePoints: 4.0, description: 'Excellent',          isPassing: true,  displayOrder: 2  },
    { letterGrade: 'A-', gradePoints: 3.7, description: 'Very Good',          isPassing: true,  displayOrder: 3  },
    { letterGrade: 'B+', gradePoints: 3.5, description: 'Good Plus',          isPassing: true,  displayOrder: 4  },
    { letterGrade: 'B',  gradePoints: 3.0, description: 'Good',               isPassing: true,  displayOrder: 5  },
    { letterGrade: 'B-', gradePoints: 2.7, description: 'Good Minus',         isPassing: true,  displayOrder: 6  },
    { letterGrade: 'C+', gradePoints: 2.5, description: 'Satisfactory Plus',  isPassing: true,  displayOrder: 7  },
    { letterGrade: 'C',  gradePoints: 2.0, description: 'Satisfactory',       isPassing: true,  displayOrder: 8  },
    { letterGrade: 'C-', gradePoints: 1.7, description: 'Satisfactory Minus', isPassing: true,  displayOrder: 9  },
    { letterGrade: 'D+', gradePoints: 1.5, description: 'Passing Plus',       isPassing: true,  displayOrder: 10 },
    { letterGrade: 'D',  gradePoints: 1.0, description: 'Passing',            isPassing: true,  displayOrder: 11 },
    { letterGrade: 'F',  gradePoints: 0.0, description: 'Failing',            isPassing: false, displayOrder: 12 },
    { letterGrade: 'I',  gradePoints: 0.0, description: 'Incomplete',         isPassing: false, displayOrder: 13 },
    { letterGrade: 'W',  gradePoints: 0.0, description: 'Withdrawn',          isPassing: false, displayOrder: 14 },
    { letterGrade: 'NG', gradePoints: 0.0, description: 'No Grade',           isPassing: false, displayOrder: 15 },
  ];
  for (const row of GRADE_SCALE_DATA) {
    await prisma.gradeScale.upsert({
      where:  { letterGrade: row.letterGrade },
      update: { gradePoints: row.gradePoints, description: row.description, isPassing: row.isPassing, displayOrder: row.displayOrder },
      create: row,
    });
  }
  console.log(`   ✓ ${GRADE_SCALE_DATA.length} grade scale entries`);

  // ── 21. Instructor Notifications ────────────────────────────────────────
  console.log('🔔  Seeding instructor notifications...');
  const instructorUsers = [
    users['instructor@test.local'],
    users['instructor2@test.local'],
    users['instructor3@test.local'],
    users['instructor4@test.local'],
    users['instructor5@test.local'],
  ].filter(Boolean);

  for (const instrUserId of instructorUsers) {
    const existingNotifs = await prisma.notification.count({ where: { userId: instrUserId } });
    if (existingNotifs > 0) continue;
    await prisma.notification.createMany({
      data: [
        {
          userId:     instrUserId,
          title:      'Grade Submission Deadline',
          message:    'Final grades for Semester I must be submitted by January 31, 2027.',
          type:       'WARNING',
          entityType: 'GradeDeadline',
          entityId:   instrUserId,
        },
        {
          userId:     instrUserId,
          title:      'Low Attendance Alert',
          message:    '2 students in your class are below the 75% attendance threshold.',
          type:       'WARNING',
          entityType: 'AttendanceAlert',
          entityId:   instrUserId,
        },
        {
          userId:     instrUserId,
          title:      'New Enrollment',
          message:    'A student has been enrolled in your course via force-add by the Registrar.',
          type:       'INFO',
          entityType: 'Enrollment',
          entityId:   instrUserId,
        },
        {
          userId:     instrUserId,
          title:      'Ungraded Submissions',
          message:    'You have ungraded assignment submissions awaiting review.',
          type:       'INFO',
          entityType: 'Assignment',
          entityId:   instrUserId,
        },
        {
          userId:     instrUserId,
          title:      'Schedule Confirmed',
          message:    'Your timetable for Semester I 2026-2027 has been confirmed by the Registrar.',
          type:       'SUCCESS',
          entityType: 'Timetable',
          entityId:   instrUserId,
        },
      ],
      skipDuplicates: true,
    });
  }
  console.log('   ✓ instructor notifications');

  // ── 22. Today's Class Sessions (for live attendance testing) ─────────────
  console.log('📆  Seeding today\'s class sessions...');
  const todayOfferingKeys = ['CS101-A', 'CS201-A', 'CS302-A'];
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const key of todayOfferingKeys) {
    const offeringId = offeringMap[key];
    if (!offeringId) continue;
    const startTime = '09:00';
    const endTime   = '10:30';
    await prisma.classSession.upsert({
      where: {
        courseOfferingId_date_startTime: {
          courseOfferingId: offeringId,
          date:             todayDate,
          startTime,
        },
      },
      update: {},
      create: {
        courseOfferingId: offeringId,
        date:             todayDate,
        startTime,
        endTime,
        topic:            'Today\'s Live Session',
      },
    });
  }
  console.log('   ✓ today\'s class sessions');

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉  Seeding complete');
  console.log(`\n   Dev password (all accounts): ${DEV_PASSWORD}`);
  console.log('\n   Key accounts:');
  console.log('   registrar@test.local  →  Registrar Dashboard');
  console.log('   student@test.local    →  Student Dashboard');
  console.log('   instructor@test.local →  Instructor Dashboard');
  console.log('\n   ⛔  These accounts must NEVER exist in production.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e: unknown) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function seedStudentDashboardData(): Promise<void> {
  console.log('\n📚  Seeding student dashboard data...');

  // ── Get all student records + their active enrollments ────────────────────
  const studentRecords = await prisma.studentRecord.findMany({
    include: {
      enrollments: {
        where: { status: { in: ['ACTIVE', 'FORCE_ADDED'] } },
        include: {
          courseOffering: {
            include: { course: true, semester: true, instructor: true },
          },
        },
      },
      user: { select: { fullName: true } },
    },
  });

  for (const sr of studentRecords) {
    // ── Financial Account ────────────────────────────────────────────────────
    const existingAccount = await prisma.financialAccount.findUnique({
      where: { studentRecordId: sr.id },
    });
    if (!existingAccount) {
      const account = await prisma.financialAccount.create({
        data: {
          studentRecordId: sr.id,
          balance: 0,
          clearedForTerm: 'Fall 2026',
        },
      });
      // Create realistic transactions
      await prisma.financialTransaction.createMany({
        data: [
          { financialAccountId: account.id, type: TransactionType.TUITION,     amount: 18500, description: 'Fall 2026 Undergraduate Tuition',   category: 'Tuition',     receiptId: `TUI-${sr.id.slice(0,8)}-001`, status: 'POSTED', transactionDate: new Date('2026-08-15') },
          { financialAccountId: account.id, type: TransactionType.FEE,         amount: 1200,  description: 'Student Health & Insurance Fee',      category: 'Fee',         receiptId: `FEE-${sr.id.slice(0,8)}-001`, status: 'POSTED', transactionDate: new Date('2026-08-15') },
          { financialAccountId: account.id, type: TransactionType.FEE,         amount: 650,   description: 'Technology & Infrastructure Fee',     category: 'Fee',         receiptId: `FEE-${sr.id.slice(0,8)}-002`, status: 'POSTED', transactionDate: new Date('2026-08-15') },
          { financialAccountId: account.id, type: TransactionType.SCHOLARSHIP, amount: -15000, description: "Dean's Merit Scholarship",           category: 'Scholarship', receiptId: `SCH-${sr.id.slice(0,8)}-001`, status: 'POSTED', transactionDate: new Date('2026-08-01') },
          { financialAccountId: account.id, type: TransactionType.GRANT,       amount: -5350, description: 'Departmental Research Grant',         category: 'Grant',       receiptId: `GRT-${sr.id.slice(0,8)}-001`, status: 'POSTED', transactionDate: new Date('2026-08-01') },
        ],
        skipDuplicates: true,
      });
      // Update balance to 0 (cleared)
      await prisma.financialAccount.update({
        where: { id: account.id },
        data: { balance: 0 },
      });
    }

    // ── Notification Preferences ─────────────────────────────────────────────
    await prisma.studentNotificationPreference.upsert({
      where: { studentRecordId: sr.id },
      update: {},
      create: { studentRecordId: sr.id, gradeAlerts: true, tuitionReminders: true, registrarNotices: true, advisorMessages: true },
    });

    // ── Assignments & Quizzes per enrollment ─────────────────────────────────
    for (const enroll of sr.enrollments) {
      const offering = enroll.courseOffering;
      const instructorUserId = offering.instructor?.userId ?? null;
      if (!instructorUserId) continue;

      // Check if assignments already exist for this offering
      const existingAssignments = await prisma.assignment.count({
        where: { courseOfferingId: offering.id },
      });
      if (existingAssignments > 0) continue;

      // ── 3 Assignments per course ─────────────────────────────────────────
      const a1 = await prisma.assignment.create({
        data: {
          courseOfferingId: offering.id,
          createdBy: instructorUserId,
          title: `${offering.course.code} — Midterm Project`,
          description: `Comprehensive midterm project for ${offering.course.name}. Apply core concepts covered in the first half of the semester.`,
          instructions: '1. Review the course materials from weeks 1-7.\n2. Complete the project according to the rubric provided.\n3. Submit as a ZIP file containing all source files.\n4. Include a brief README with your approach.\n5. Maximum file size: 250 MB.',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          totalPoints: 100,
          status: AssignmentStatus.PUBLISHED,
          attachments: {
            create: [
              { fileName: `${offering.course.code}_Midterm_Rubric.pdf`, fileUrl: '/uploads/sample_rubric.pdf', fileSize: '180 KB', fileType: 'PDF' },
            ],
          },
        },
      });

      const a2 = await prisma.assignment.create({
        data: {
          courseOfferingId: offering.id,
          createdBy: instructorUserId,
          title: `${offering.course.code} — Lab Exercise 2`,
          description: `Practical lab exercise applying techniques from the recent lectures on ${offering.course.name}.`,
          instructions: '1. Complete all tasks in the lab sheet.\n2. Document your results with screenshots.\n3. Submit as a single PDF report.',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days — urgent
          totalPoints: 50,
          status: AssignmentStatus.PUBLISHED,
        },
      });

      const a3 = await prisma.assignment.create({
        data: {
          courseOfferingId: offering.id,
          createdBy: instructorUserId,
          title: `${offering.course.code} — Assignment 1`,
          description: `First assignment for ${offering.course.name}.`,
          instructions: '1. Read the provided materials.\n2. Answer all questions in full sentences.\n3. Submit as a Word document or PDF.',
          dueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago — past
          totalPoints: 100,
          status: AssignmentStatus.PUBLISHED,
          allowLateSubmit: false,
        },
      });

      // ── Submission for past assignment (graded) ────────────────────────────
      const existingSubmission = await prisma.assignmentSubmission.findUnique({
        where: { assignmentId_studentRecordId: { assignmentId: a3.id, studentRecordId: sr.id } },
      });
      if (!existingSubmission) {
        await prisma.assignmentSubmission.create({
          data: {
            assignmentId: a3.id,
            studentRecordId: sr.id,
            status: SubmissionStatus.GRADED,
            submittedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            textContent: 'Assignment completed as per instructions. Applied core concepts from the lecture materials.',
            score: 92,
            letterGrade: 'A',
            feedback: 'Excellent work! Your analysis is thorough and well-structured. The approach you took in section 3 was particularly innovative.',
            gradedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            gradedBy: instructorUserId,
          },
        });
      }

      // ── 2 Quizzes per course ─────────────────────────────────────────────
      const existingQuizzes = await prisma.quiz.count({
        where: { courseOfferingId: offering.id },
      });
      if (existingQuizzes > 0) continue;

      const quiz1 = await prisma.quiz.create({
        data: {
          courseOfferingId: offering.id,
          createdBy: instructorUserId,
          title: `${offering.course.code} — Fundamentals Quiz`,
          description: `A comprehensive quiz testing your understanding of ${offering.course.name} fundamentals.`,
          instructions: 'You have 30 minutes to complete this quiz. All questions are mandatory. No external resources allowed.',
          durationMinutes: 30,
          availableFrom: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          availableUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          passingScore: 60,
          maxAttempts: 1,
          totalPoints: 10,
          showResultsImmediately: true,
          status: QuizStatus.ACTIVE,
          questions: {
            create: [
              {
                type: QuestionType.MCQ,
                questionText: `What is the primary purpose of ${offering.course.name}?`,
                points: 2,
                orderIndex: 0,
                options: {
                  create: [
                    { text: 'To provide theoretical knowledge only', isCorrect: false, orderIndex: 0 },
                    { text: 'To apply core concepts in practical scenarios', isCorrect: true,  orderIndex: 1 },
                    { text: 'To memorize facts and formulas', isCorrect: false, orderIndex: 2 },
                    { text: 'None of the above', isCorrect: false, orderIndex: 3 },
                  ],
                },
              },
              {
                type: QuestionType.MCQ,
                questionText: 'Which approach is most effective when solving complex problems in this field?',
                points: 2,
                orderIndex: 1,
                options: {
                  create: [
                    { text: 'Trial and error without planning', isCorrect: false, orderIndex: 0 },
                    { text: 'Systematic analysis and structured methodology', isCorrect: true,  orderIndex: 1 },
                    { text: 'Copying existing solutions directly', isCorrect: false, orderIndex: 2 },
                    { text: 'Skipping the planning phase', isCorrect: false, orderIndex: 3 },
                  ],
                },
              },
              {
                type: QuestionType.TRUE_FALSE,
                questionText: 'Documentation is an essential part of professional work in this field.',
                points: 2,
                orderIndex: 2,
                options: {
                  create: [
                    { text: 'True',  isCorrect: true,  orderIndex: 0 },
                    { text: 'False', isCorrect: false, orderIndex: 1 },
                  ],
                },
              },
              {
                type: QuestionType.SHORT_ANSWER,
                questionText: `Briefly explain one key concept you have learned in ${offering.course.name} so far.`,
                points: 4,
                orderIndex: 3,
              },
            ],
          },
        },
      });

      // Past graded quiz attempt for this student
      const q1WithQuestions = await prisma.quiz.findUnique({
        where: { id: quiz1.id },
        include: { questions: { include: { options: { where: { isCorrect: true } } }, orderBy: { orderIndex: 'asc' } } },
      });

      if (q1WithQuestions) {
        const attempt = await prisma.quizAttempt.create({
          data: {
            quizId: quiz1.id,
            studentRecordId: sr.id,
            status: QuizAttemptStatus.GRADED,
            startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
            timeSpentSeconds: 25 * 60,
            score: 8,
            percentageScore: 80,
            isPassing: true,
            feedback: 'Good understanding of the fundamentals. Review the short answer question for deeper insight.',
            gradedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            gradedBy: instructorUserId,
          },
        });

        // Create answers for graded attempt
        for (const q of q1WithQuestions.questions) {
          const correctOpt = q.options[0];
          await prisma.quizAnswer.create({
            data: {
              attemptId: attempt.id,
              questionId: q.id,
              selectedOptionId: correctOpt?.id ?? null,
              answerText: q.type === QuestionType.SHORT_ANSWER
                ? `This concept is fundamental to understanding ${offering.course.name} and involves systematic application of learned principles.`
                : null,
              isCorrect: q.type !== QuestionType.SHORT_ANSWER ? true : null,
              pointsEarned: q.type !== QuestionType.SHORT_ANSWER ? q.points : 2,
            },
          }).catch(() => {});
        }
      }

      // Second quiz — upcoming / pending
      await prisma.quiz.create({
        data: {
          courseOfferingId: offering.id,
          createdBy: instructorUserId,
          title: `${offering.course.code} — Midterm Assessment`,
          description: `Comprehensive midterm assessment covering all topics from the first half of the semester.`,
          instructions: 'You have 60 minutes to complete this assessment. Read each question carefully. Partial credit may be awarded for short answers.',
          durationMinutes: 60,
          availableFrom: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          availableUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          passingScore: 70,
          maxAttempts: 1,
          totalPoints: 50,
          showResultsImmediately: false,
          status: QuizStatus.PUBLISHED,
          questions: {
            create: [
              {
                type: QuestionType.MCQ,
                questionText: 'Which of the following best describes the core principle of this subject?',
                points: 5,
                orderIndex: 0,
                options: {
                  create: [
                    { text: 'Optimization and efficiency', isCorrect: true,  orderIndex: 0 },
                    { text: 'Randomized approaches', isCorrect: false, orderIndex: 1 },
                    { text: 'Brute force solutions', isCorrect: false, orderIndex: 2 },
                    { text: 'Manual processing only', isCorrect: false, orderIndex: 3 },
                  ],
                },
              },
              {
                type: QuestionType.ESSAY,
                questionText: `Discuss in detail how the concepts from ${offering.course.name} apply to a real-world scenario of your choice.`,
                points: 20,
                orderIndex: 1,
              },
              {
                type: QuestionType.TRUE_FALSE,
                questionText: 'Continuous learning and adaptation are essential in this professional field.',
                points: 5,
                orderIndex: 2,
                options: {
                  create: [
                    { text: 'True',  isCorrect: true,  orderIndex: 0 },
                    { text: 'False', isCorrect: false, orderIndex: 1 },
                  ],
                },
              },
              {
                type: QuestionType.SHORT_ANSWER,
                questionText: 'List three best practices that professionals in this field should follow.',
                points: 20,
                orderIndex: 3,
              },
            ],
          },
        },
      });

      // ── Attendance sessions via ClassSession ────────────────────────────
      const existingClassSessions = await prisma.classSession.count({
        where: { courseOfferingId: offering.id },
      });
      if (existingClassSessions > 0) continue;

      const weekDays = [0, 2]; // Mon, Wed (matching timetable pattern)
      const sessionsToCreate = 8;
      for (let i = 0; i < sessionsToCreate; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (sessionsToCreate - i) * 7 + weekDays[i % 2]);
        date.setHours(9, 0, 0, 0);

        // Create ClassSession first
        const classSession = await prisma.classSession.upsert({
          where: {
            courseOfferingId_date_startTime: {
              courseOfferingId: offering.id,
              date,
              startTime: '09:00',
            },
          },
          update: {},
          create: {
            courseOfferingId: offering.id,
            date,
            startTime: '09:00',
            endTime:   '10:30',
            topic:     `Week ${i + 1} — ${offering.course.name}`,
          },
        });

        // Create AttendanceSession for this ClassSession
        const attendSession = await prisma.attendanceSession.upsert({
          where: { classSessionId: classSession.id },
          update: {},
          create: {
            classSessionId: classSession.id,
            openedBy:       instructorUserId,
            lifecycle:      'FINALIZED',
            openedAt:       date,
            closedAt:       new Date(date.getTime() + 90 * 60 * 1000),
            finalizedAt:    new Date(date.getTime() + 120 * 60 * 1000),
          },
        });

        // Mark student as present (97% rate → 1 absent)
        const status = i === 3 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
        await prisma.attendanceRecord.upsert({
          where: {
            attendanceSessionId_studentRecordId: {
              attendanceSessionId: attendSession.id,
              studentRecordId:     sr.id,
            },
          },
          update: {},
          create: {
            attendanceSessionId: attendSession.id,
            studentRecordId:     sr.id,
            status,
            method:  'MANUAL',
            markedAt: date,
            markedBy: instructorUserId,
          },
        }).catch(() => {});
      }
    }

    console.log(`   ✓ Dashboard data for ${sr.user.fullName} (${sr.studentId})`);
  }

  // ── Notifications for students ──────────────────────────────────────────
  const students = await prisma.studentRecord.findMany({
    select: { userId: true, studentId: true },
  });
  for (const st of students) {
    const existingNotifs = await prisma.notification.count({ where: { userId: st.userId } });
    if (existingNotifs > 0) continue;
    await prisma.notification.createMany({
      data: [
        { userId: st.userId, title: 'Assignment Graded', message: 'Your Assignment 1 has been graded. Score: 92/100.', type: 'SUCCESS', entityType: 'Assignment' },
        { userId: st.userId, title: 'Quiz Available', message: 'A new quiz is available for your course. Opens in 3 days.', type: 'INFO', entityType: 'Quiz' },
        { userId: st.userId, title: 'Registration Reminder', message: 'Course registration for Semester II opens on January 5, 2027.', type: 'WARNING', entityType: 'Calendar' },
        { userId: st.userId, title: 'Financial Aid Applied', message: 'Your Dean\'s Merit Scholarship has been applied to your account.', type: 'SUCCESS', entityType: 'Financial' },
      ],
      skipDuplicates: true,
    });
  }
  console.log('   ✓ Student notifications');
  console.log('✅  Student dashboard data complete');
}

// Export for use in main seed
