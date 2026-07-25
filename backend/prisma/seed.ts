import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

declare const process: { exit: (code?: number) => never };

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Harmony College roles...');

  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const seedUsers = [
    {
      email: 'admin@harmony.edu',
      role: Role.SUPER_ADMIN,
    },
    {
      email: 'registrar@harmony.edu',
      role: Role.REGISTRAR_OFFICER,
    },
    {
      email: 'finance@harmony.edu',
      role: Role.FINANCE_OFFICER,
    },
    {
      email: 'hr@harmony.edu',
      role: Role.HR_OFFICER,
    },
    {
      email: 'lecturer@harmony.edu',
      role: Role.LECTURER,
    },
    {
      email: 'depthead@harmony.edu',
      role: Role.DEPARTMENT_HEAD,
    },
    {
      email: 'student@harmony.edu',
      role: Role.STUDENT,
    },
  ];

  for (const userSeed of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: userSeed.email },
      update: {
        role: userSeed.role,
        passwordHash,
      },
      create: {
        email: userSeed.email,
        passwordHash,
        role: userSeed.role,
      },
    });

    console.log(`✅ Seeded user [${user.role}]: ${user.email} (Password: ${defaultPassword})`);

    // If STUDENT, ensure an Application and Documents exist
    if (userSeed.role === Role.STUDENT) {
      const existingApp = await prisma.application.findUnique({
        where: { userId: user.id },
      });

      if (!existingApp) {
        const app = await prisma.application.create({
          data: {
            userId: user.id,
            fullName: 'Alexander Sterling',
            dob: new Date('2002-05-14'),
            age: 22,
            gender: 'Male',
            nationality: 'Ethiopian',
            emergencyContact: '+251911999001',
            phone: '+251911883201',
            city: 'Addis Ababa',
            address: 'Bole Sub-City, Woreda 03',
            program: 'Computer Science & Engineering',
            academicYear: '2024-2025',
            semester: 'Fall',
            studyMode: 'Regular',
            status: 'ACCEPTED',
            submittedAt: new Date(),
            documents: {
              create: [
                { type: 'MATRIC', fileUrl: '/uploads/sample_matric.pdf' },
                { type: 'GRADE_8', fileUrl: '/uploads/sample_grade8.pdf' },
                { type: 'TRANSCRIPT_9_10', fileUrl: '/uploads/sample_t910.pdf' },
                { type: 'TRANSCRIPT_11_12', fileUrl: '/uploads/sample_t1112.pdf' },
              ],
            },
          },
        });
        console.log(`   📄 Created sample Student Application (${app.status}): ${app.fullName}`);
      }
    }
  }

  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
