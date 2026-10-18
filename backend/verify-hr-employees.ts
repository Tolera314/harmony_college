import { prisma } from './src/lib/prisma';

async function verifyHREmployees() {
  console.log('✅ Verifying HR Employees are visible...\n');

  const employees = await prisma.hREmployee.findMany({
    include: {
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`📊 Total HR Employees: ${employees.length}\n`);

  if (employees.length === 0) {
    console.log('⚠️  No HR employees found in the database.\n');
  } else {
    console.log('👥 HR EMPLOYEES LIST:\n');
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.fullName}`);
      console.log(`   Employee Code: ${emp.employeeCode}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Status: ${emp.status}`);
      console.log(`   System Role: ${emp.systemRole || 'N/A'}`);
      console.log(`   Position: ${emp.position}`);
      console.log(`   Department: ${emp.department?.name || 'N/A'}`);
      console.log(`   Employment Type: ${emp.employmentType}`);
      console.log(`   Linked to User: ${emp.user ? `Yes (${emp.user.fullName})` : 'No (Pending invitation)'}`);
      console.log('');
    });
  }

  // Check pending invitations
  const pendingInvitations = await prisma.staffInvitation.findMany({
    where: {
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      department: {
        select: { name: true },
      },
    },
  });

  console.log(`📧 Pending Invitations: ${pendingInvitations.length}\n`);
  if (pendingInvitations.length > 0) {
    pendingInvitations.forEach((inv, index) => {
      console.log(`${index + 1}. ${inv.fullName} (${inv.email})`);
      console.log(`   Role: ${inv.role}`);
      console.log(`   Department: ${inv.department?.name || 'N/A'}`);
      console.log(`   Expires: ${inv.expiresAt.toLocaleString()}`);
      console.log('');
    });
  }

  console.log('✅ Verification complete!\n');
  console.log('💡 All invited staff should appear in the HR employees table with PENDING status.');
  console.log('💡 When they accept the invitation via email, their status will change to ACTIVE.\n');

  await prisma.$disconnect();
}

verifyHREmployees().catch(console.error);
