import { prisma } from './src/lib/prisma';

async function debugInvitation() {
  console.log('=== DEBUGGING STAFF INVITATION ISSUE ===\n');

  // 1. Check StaffInvitation records
  const invitations = await prisma.staffInvitation.findMany({
    include: {
      department: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log('📧 STAFF INVITATIONS:');
  console.log(`Total invitations: ${invitations.length}\n`);
  
  for (const inv of invitations) {
    console.log(`ID: ${inv.id}`);
    console.log(`Name: ${inv.fullName}`);
    console.log(`Email: ${inv.email}`);
    console.log(`Role: ${inv.role}`);
    console.log(`Department ID: ${inv.departmentId}`);
    console.log(`Department Name: ${inv.department?.name || 'N/A'}`);
    console.log(`Created: ${inv.createdAt}`);
    console.log(`Accepted: ${inv.acceptedAt || 'Not yet'}`);
    console.log('---\n');
  }

  // 2. Check HREmployee records
  const hrEmployees = await prisma.hREmployee.findMany({
    include: {
      department: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('\n👥 HR EMPLOYEES:');
  console.log(`Total HR employees: ${hrEmployees.length}\n`);
  
  for (const emp of hrEmployees) {
    console.log(`ID: ${emp.id}`);
    console.log(`Name: ${emp.fullName}`);
    console.log(`Email: ${emp.email}`);
    console.log(`Status: ${emp.status}`);
    console.log(`System Role: ${emp.systemRole || 'N/A'}`);
    console.log(`Department: ${emp.department?.name || 'N/A'}`);
    console.log(`Created: ${emp.createdAt}`);
    console.log('---\n');
  }

  // 3. Check HRDepartment mapping
  console.log('\n🏢 HR DEPARTMENTS:');
  const hrDepts = await prisma.hRDepartment.findMany({
    where: { isActive: true },
    select: { id: true, name: true, isActive: true },
  });
  
  console.log(`Total active HR departments: ${hrDepts.length}\n`);
  hrDepts.forEach(dept => {
    console.log(`- ${dept.name} (${dept.id})`);
  });

  // 4. Check Academic Departments
  console.log('\n🎓 ACADEMIC DEPARTMENTS:');
  const acadDepts = await prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, parentId: true },
    take: 10,
  });
  
  console.log(`Total active academic departments: ${acadDepts.length}\n`);
  acadDepts.forEach(dept => {
    console.log(`- ${dept.name} (${dept.code}) - ID: ${dept.id} - Parent: ${dept.parentId || 'None'}`);
  });

  // 5. Cross-reference: Check if invited email has HREmployee
  console.log('\n🔍 CROSS-REFERENCE CHECK:');
  for (const inv of invitations) {
    const hrEmp = await prisma.hREmployee.findFirst({
      where: { email: inv.email },
    });
    
    console.log(`Invitation: ${inv.fullName} (${inv.email})`);
    console.log(`  Has HREmployee record: ${hrEmp ? '✅ YES' : '❌ NO'}`);
    if (hrEmp) {
      console.log(`  HREmployee Status: ${hrEmp.status}`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

debugInvitation().catch(console.error);
