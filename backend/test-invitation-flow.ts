import { prisma } from './src/lib/prisma';
import { createStaffInvitation } from './src/services/invitationService';
import { Role } from '@prisma/client';

async function testInvitationFlow() {
  console.log('🧪 Testing Staff Invitation Flow\n');

  // Get an admin user to use as the inviter
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, role: true, fullName: true },
  });

  if (!admin) {
    console.error('❌ No admin user found. Please create an admin user first.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Using admin: ${admin.fullName} (${admin.id})\n`);

  // Get a department to assign
  const dept = await prisma.department.findFirst({
    where: { isActive: true, parentId: null },
    select: { id: true, name: true },
  });

  if (!dept) {
    console.error('❌ No active department found.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Assigning to department: ${dept.name}\n`);

  // Test data for a new staff member
  const testEmail = `test-${Date.now()}@example.com`;
  
  try {
    console.log('📧 Creating staff invitation...\n');
    
    const result = await createStaffInvitation(
      {
        fullName: 'Test Staff Member',
        email: testEmail,
        phone: '+1234567890',
        role: Role.INSTRUCTOR,
        departmentId: dept.id,
        positionTitle: 'Test Instructor',
        gender: 'MALE',
        employmentType: 'FULL_TIME',
        basicSalary: 50000,
        hireDate: new Date().toISOString().split('T')[0],
      },
      admin.id,
      admin.role as Role,
      '127.0.0.1'
    );

    console.log('✅ Invitation created successfully!\n');
    console.log(`Invitation ID: ${result.invitation.id}`);
    console.log(`Status: ${result.invitation.status}`);
    console.log(`Email sent: ${result.emailResult.success ? 'Yes' : 'No (simulated)'}\n`);

    // Now check if HREmployee was created
    const hrEmployee = await prisma.hREmployee.findFirst({
      where: { email: testEmail },
      include: { department: true },
    });

    if (hrEmployee) {
      console.log('✅ HREmployee record created!\n');
      console.log(`Employee Code: ${hrEmployee.employeeCode}`);
      console.log(`Full Name: ${hrEmployee.fullName}`);
      console.log(`Email: ${hrEmployee.email}`);
      console.log(`Status: ${hrEmployee.status}`);
      console.log(`System Role: ${hrEmployee.systemRole}`);
      console.log(`Position: ${hrEmployee.position}`);
      console.log(`Department: ${hrEmployee.department?.name}`);
      console.log(`Employment Type: ${hrEmployee.employmentType}`);
      console.log(`Basic Salary: ${hrEmployee.basicSalary}`);
    } else {
      console.error('❌ HREmployee record was NOT created!');
    }

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await prisma.staffInvitation.delete({ where: { id: result.invitation.id } });
    if (hrEmployee) {
      await prisma.hREmployee.delete({ where: { id: hrEmployee.id } });
    }
    console.log('✅ Test data cleaned up\n');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }

  await prisma.$disconnect();
}

testInvitationFlow().catch(console.error);
