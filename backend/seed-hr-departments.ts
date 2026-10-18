import { prisma } from './src/lib/prisma';

async function seedHRDepartments() {
  console.log('🌱 Seeding HR Departments from Academic Departments...\n');

  // Get all active parent academic departments (not subdivisions)
  const academicDepts = await prisma.department.findMany({
    where: {
      isActive: true,
      parentId: null, // Only parent departments
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  console.log(`Found ${academicDepts.length} parent academic departments\n`);

  let created = 0;
  let skipped = 0;

  for (const dept of academicDepts) {
    // Check if HRDepartment already exists with this ID or name
    const existing = await prisma.hRDepartment.findFirst({
      where: {
        OR: [
          { id: dept.id },
          { name: dept.name },
        ],
      },
    });

    if (existing) {
      console.log(`⏭️  Skipped: ${dept.name} (already exists)`);
      skipped++;
      continue;
    }

    // Create HRDepartment with same ID as academic department
    await prisma.hRDepartment.create({
      data: {
        id: dept.id,
        name: dept.name,
        isActive: true,
      },
    });

    console.log(`✅ Created: ${dept.name}`);
    created++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${academicDepts.length}`);

  await prisma.$disconnect();
}

seedHRDepartments().catch(console.error);
