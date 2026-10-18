import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInvitedStaff() {
  try {
    console.log('\n🔍 Checking StaffInvitation records...\n');
    
    const invitations = await prisma.staffInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        department: true,
      },
    });

    if (invitations.length === 0) {
      console.log('❌ No staff invitations found in database.\n');
    } else {
      console.log(`✅ Found ${invitations.length} recent invitation(s):\n`);
      invitations.forEach((inv, idx) => {
        console.log(`${idx + 1}. ${inv.fullName} (${inv.email})`);
        console.log(`   Role: ${inv.role}`);
        console.log(`   Department: ${inv.department?.name || 'N/A'}`);
        console.log(`   Created: ${inv.createdAt}`);
        console.log(`   Accepted: ${inv.acceptedAt ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    console.log('\n🔍 Checking HREmployee records with PENDING status...\n');
    
    const pendingEmployees = await prisma.hREmployee.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        department: true,
      },
    });

    if (pendingEmployees.length === 0) {
      console.log('❌ No PENDING employees found in HREmployee table.\n');
    } else {
      console.log(`✅ Found ${pendingEmployees.length} pending employee(s):\n`);
      pendingEmployees.forEach((emp, idx) => {
        console.log(`${idx + 1}. ${emp.fullName} (${emp.email})`);
        console.log(`   Employee Code: ${emp.employeeCode}`);
        console.log(`   Department: ${emp.department?.name || 'N/A'}`);
        console.log(`   Status: ${emp.status}`);
        console.log(`   System Role: ${emp.systemRole}`);
        console.log(`   Created: ${emp.createdAt}`);
        console.log('');
      });
    }

    console.log('\n🔍 Checking all HREmployee records (last 5)...\n');
    
    const allEmployees = await prisma.hREmployee.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        email: true,
        employeeCode: true,
        status: true,
        systemRole: true,
        createdAt: true,
      },
    });

    console.log(`Total recent employees: ${allEmployees.length}\n`);
    allEmployees.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.fullName} - ${emp.status} - ${emp.email}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvitedStaff();
