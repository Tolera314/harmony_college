/**
 * Harmony College — Development Database Seed
 * ─────────────────────────────────────────────
 * ⚠️  DEVELOPMENT ONLY — NEVER RUN IN PRODUCTION ⚠️
 *
 * Creates one test account per role so every dashboard can be exercised
 * locally without manual registration.
 *
 * Default password for all seed accounts: Dev@HarmonyTest2025!
 * (intentionally distinct from any real password pattern)
 *
 * To run:
 *   npm run db:seed
 */

import { PrismaClient, Role, AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Abort immediately if someone tries to run this against production.
if (process.env.NODE_ENV === 'production') {
  console.error(
    '❌  Seed aborted: NODE_ENV is "production".\n' +
    '   This script must never run in a production environment.'
  );
  process.exit(1);
}

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// SEED CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Development-only password.
 * Cost factor 12 matches the production setting so seed data exercises the
 * same hash comparison path as real login.
 */
const DEV_PASSWORD = 'Dev@HarmonyTest2025!';
const BCRYPT_ROUNDS = 12;

interface SeedUser {
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  /** Seed students as ACTIVE so they can log in immediately. */
  status: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  profileCompletion: number;
}

const SEED_USERS: SeedUser[] = [
  // ── Super Admin ───────────────────────────────────────────────────────────
  {
    fullName:         'System Administrator',
    email:            'superadmin@test.local',
    phone:            '+251911000001',
    role:             Role.SUPER_ADMIN,
    status:           AccountStatus.ACTIVE,
    emailVerified:    true,
    phoneVerified:    true,
    profileCompleted: true,
    profileCompletion: 100,
  },
  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    fullName:         'Admin User',
    email:            'admin@test.local',
    phone:            '+251911000002',
    role:             Role.ADMIN,
    status:           AccountStatus.ACTIVE,
    emailVerified:    true,
    phoneVerified:    true,
    profileCompleted: true,
    profileCompletion: 100,
  },
  // ── Registrar ─────────────────────────────────────────────────────────────
  {
    fullName:         'Registrar Officer',
    email:            'registrar@test.local',
    phone:            '+251911000003',
    role:             Role.REGISTRAR,
    status:           AccountStatus.ACTIVE,
    emailVerified:    true,
    phoneVerified:    true,
    profileCompleted: true,
    profileCompletion: 100,
  },
  // ── Finance Officer ───────────────────────────────────────────────────────
  {
    fullName:         'Finance Officer',
    email:            'finance@test.local',
    phone:            '+251911000004',
    role:             Role.FINANCE_OFFICER,
    status:           AccountStatus.ACTIVE,
    emailVerified:    true,
    phoneVerified:    true,
    profileCompleted: true,
    profileCompletion: 100,
  },
  // ── HR Officer ────────────────────────────────────────────────────────────
  {
    fullName:         'HR Officer',
    email:            'hr@test.local',
    phone:            '+251911000005',
    role:             Role.HR_OFFICER,
    status:           AccountStatus.ACTIVE,
    emailVerified:    true,
    phoneVerified:    true,
    profileCompleted: true,
    profileCompletion: 100,
  },
  // ── Department Head ───────────────────────────────────────────────────────
  {
    fullName:         'Department Head',
    email:            'departmenthead@test.local',
    phone:            '+251911000006',
    role:             Role.DEPARTMENT_HEAD,
    status:           AccountStatus.ACTIVE,
    emailVerified:    true,
    phoneVerified:    true,
    profileCompleted: true,
    profileCompletion: 100,
  },
  // ── Instructor ────────────────────────────────────────────────────────────
  {
    fullName:         'Instructor User',
    email:            'instructor@test.local',
    phone:            '+251911000007',
    role:             Role.INSTRUCTOR,
    status:           AccountStatus.ACTIVE,
    emailVerified:    true,
    phoneVerified:    true,
    profileCompleted: true,
    profileCompletion: 100,
  },
  // ── Student — profile complete ────────────────────────────────────────────
  {
    fullName:         'Alexander Sterling',
    email:            'student@test.local',
    phone:            '+251911883201',
    role:             Role.STUDENT,
    status:           AccountStatus.ACTIVE,
    emailVerified:    true,
    phoneVerified:    true,
    profileCompleted: true,
    profileCompletion: 100,
  },
  // ── Student — profile incomplete (tests the Welcome Portal flow) ──────────
  {
    fullName:         'New Student',
    email:            'newstudent@test.local',
    phone:            '+251911000009',
    role:             Role.STUDENT,
    status:           AccountStatus.ACTIVE,
    emailVerified:    false,
    phoneVerified:    false,
    profileCompleted: false,
    profileCompletion: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('');
  console.log('🌱  Harmony College — Development Seed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   NODE_ENV : ${process.env.NODE_ENV ?? 'undefined'}`);
  console.log('   ⚠️   For development / testing only');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Hash once — all seed accounts share the same dev password.
  console.log('🔐  Hashing development password…');
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);

  for (const seed of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        fullName:          seed.fullName,
        phone:             seed.phone,
        role:              seed.role,
        status:            seed.status,
        passwordHash,
        emailVerified:     seed.emailVerified,
        phoneVerified:     seed.phoneVerified,
        profileCompleted:  seed.profileCompleted,
        profileCompletion: seed.profileCompletion,
        // Reset security counter on re-seed
        failedLoginAttempts: 0,
      },
      create: {
        fullName:            seed.fullName,
        email:               seed.email,
        phone:               seed.phone,
        passwordHash,
        role:                seed.role,
        status:              seed.status,
        emailVerified:       seed.emailVerified,
        phoneVerified:       seed.phoneVerified,
        profileCompleted:    seed.profileCompleted,
        profileCompletion:   seed.profileCompletion,
        failedLoginAttempts: 0,
      },
    });

    console.log(`✅  [${user.role.padEnd(16)}]  ${user.email}`);

    // ── Sample data for the complete student account ───────────────────────
    if (seed.role === Role.STUDENT && seed.profileCompleted) {
      // StudentProfile
      const existingProfile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
      });

      if (!existingProfile) {
        await prisma.studentProfile.create({
          data: {
            userId:               user.id,
            dob:                  new Date('2002-05-14'),
            gender:               'Male',
            nationality:          'Ethiopian',
            region:               'Addis Ababa City Administration',
            city:                 'Addis Ababa',
            address:              'Bole Sub-City, Woreda 03',
            program:              'Computer Science & Engineering',
            academicYear:         '2024/2025',
            semester:             'Semester I',
            emergencyName:        'Solomon Sterling',
            emergencyRelationship:'Parent',
            emergencyPhone:       '+251911999001',
          },
        });
        console.log(`   📋  Created StudentProfile for ${user.email}`);
      }

      // Application (legacy admissions record — kept for backward compatibility)
      const existingApp = await prisma.application.findUnique({
        where: { userId: user.id },
      });

      if (!existingApp) {
        const app = await prisma.application.create({
          data: {
            userId:          user.id,
            fullName:        seed.fullName,
            dob:             new Date('2002-05-14'),
            age:             22,
            gender:          'Male',
            nationality:     'Ethiopian',
            emergencyContact: '+251911999001',
            phone:           '+251911883201',
            city:            'Addis Ababa',
            address:         'Bole Sub-City, Woreda 03',
            program:         'Computer Science & Engineering',
            academicYear:    '2024-2025',
            semester:        'Fall',
            studyMode:       'Regular',
            status:          'ACCEPTED',
            submittedAt:     new Date(),
            documents: {
              create: [
                { type: 'MATRIC',           fileUrl: '/uploads/sample_matric.pdf' },
                { type: 'GRADE_8',          fileUrl: '/uploads/sample_grade8.pdf' },
                { type: 'TRANSCRIPT_9_10',  fileUrl: '/uploads/sample_t910.pdf' },
                { type: 'TRANSCRIPT_11_12', fileUrl: '/uploads/sample_t1112.pdf' },
              ],
            },
          },
        });
        console.log(`   📄  Created Application [${app.status}] for ${user.email}`);
      }
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉  Seeding complete');
  console.log('');
  console.log('   Dev password (all accounts):');
  console.log(`   ${DEV_PASSWORD}`);
  console.log('');
  console.log('   ⛔  These accounts must NEVER exist in production.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

main()
  .catch((e: unknown) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
