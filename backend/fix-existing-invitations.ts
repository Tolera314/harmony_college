import { prisma } from './src/lib/prisma';

/**
 * Retroactively create HREmployee records for existing StaffInvitations
 * that don't have corresponding HREmployee records yet.
 */
async function fixExistingInvitations() {
  console.log('🔧 Fixing existing staff invitations...\n');

  // Find all pending invitations that don't have HREmployee records
  const invitations = await prisma.staffInvitation.findMany({
    where: {
      acceptedAt: null,
      revokedAt: null,
    },
    include: {
      department: {
        select: { id: true, name: true },
      },
    },
  });

  console.log(`Found ${invitations.length} pending invitation(s)\n`);

  let fixed = 0;
  let skipped = 0;

  for (const inv of invitations) {
    console.log(`Processing: ${inv.fullName} (${inv.email})`);

    // Check if HREmployee already exists
    const existingHREmployee = await prisma.hREmployee.findFirst({
      where: { email: inv.email },
    });

    if (existingHREmployee) {
      console.log(`  ⏭️  Already has HREmployee record (status: ${existingHREmployee.status})\n`);
      skipped++;
      continue;
    }

    // Find matching Department
    let targetDeptId: string | null = null;
    if (inv.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: inv.departmentId },
        select: { id: true },
      });
      if (dept) targetDeptId = dept.id;
    }
    if (!targetDeptId && inv.department?.name) {
      const dept = await prisma.department.findFirst({
        where: { name: { equals: inv.department.name, mode: 'insensitive' } },
        select: { id: true },
      });
      if (dept) targetDeptId = dept.id;
    }
    if (!targetDeptId) {
      const fallbackDept = await prisma.department.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (fallbackDept) targetDeptId = fallbackDept.id;
    }

    if (!targetDeptId) {
      console.log(`  ❌ No active department found - cannot create HREmployee\n`);
      skipped++;
      continue;
    }

    // Generate employee code
    let empCode = inv.employeeId?.trim() || '';
    if (!empCode) {
      empCode = `HC-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    // Check for conflicts and regenerate if needed
    let codeConflict = await prisma.hREmployee.findUnique({
      where: { employeeCode: empCode },
      select: { id: true },
    });
    while (codeConflict) {
      empCode = `HC-${Math.floor(10000 + Math.random() * 90000)}`;
      codeConflict = await prisma.hREmployee.findUnique({
        where: { employeeCode: empCode },
        select: { id: true },
      });
    }

    // Create HREmployee record with PENDING status
    await prisma.hREmployee.create({
      data: {
        employeeCode: empCode,
        fullName: inv.fullName,
        email: inv.email,
        phone: inv.phone || '',
        departmentId: targetDeptId,
        position: inv.positionTitle || 'Staff Member',
        systemRole: inv.role,
        employmentType: 'FULL_TIME',
        contractStatus: 'PROBATION',
        status: 'PENDING', // Will change to ACTIVE when they accept invitation
        hireDate: new Date(),
        gender: 'MALE', // Default, can be updated later
        basicSalary: 0, // Default, should be updated by HR
        isActive: true,
      },
    });

    console.log(`  ✅ Created HREmployee record (status: PENDING)\n`);
    fixed++;
  }

  console.log('📊 Summary:');
  console.log(`   Fixed:   ${fixed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${invitations.length}`);

  await prisma.$disconnect();
}

fixExistingInvitations().catch(console.error);
