import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding HR employees...\n');

  // First, ensure we have departments
  const depts = await prisma.hRDepartment.findMany();
  if (depts.length === 0) {
    console.log('Creating departments...');
    await prisma.hRDepartment.createMany({
      data: [
        { name: 'Computer Science', budget: 500000, isActive: true },
        { name: 'Mathematics', budget: 400000, isActive: true },
        { name: 'Physics', budget: 450000, isActive: true },
        { name: 'Administration', budget: 300000, isActive: true },
      ],
    });
    console.log('✅ Departments created\n');
  }

  const allDepts = await prisma.hRDepartment.findMany();
  const csDept = allDepts.find(d => d.name === 'Computer Science');
  const mathDept = allDepts.find(d => d.name === 'Mathematics');
  const physicsDept = allDepts.find(d => d.name === 'Physics');
  const adminDept = allDepts.find(d => d.name === 'Administration');

  // Check if we already have employees
  const existingCount = await prisma.hREmployee.count();
  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing employees. Skipping seed to avoid duplicates.`);
    console.log('   Run "npx prisma migrate reset --force" first if you want to reseed.\n');
    return;
  }

  // Create sample employees
  const employees = [
    {
      employeeCode: 'EMP001',
      fullName: 'John Smith',
      email: 'john.smith@harmonycollege.edu',
      phone: '+1234567890',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'MALE' as const,
      address: '123 Main St, City',
      hireDate: new Date('2020-01-15'),
      employmentType: 'FULL_TIME' as const,
      departmentId: csDept?.id || '',
      position: 'Professor',
      basicSalary: 75000.00,
      isActive: true,
    },
    {
      employeeCode: 'EMP002',
      fullName: 'Sarah Johnson',
      email: 'sarah.johnson@harmonycollege.edu',
      phone: '+1234567891',
      dateOfBirth: new Date('1988-07-22'),
      gender: 'FEMALE' as const,
      address: '456 Oak Ave, City',
      hireDate: new Date('2019-08-01'),
      employmentType: 'FULL_TIME' as const,
      departmentId: mathDept?.id || '',
      position: 'Associate Professor',
      basicSalary: 65000.00,
      isActive: true,
    },
    {
      employeeCode: 'EMP003',
      fullName: 'Michael Chen',
      email: 'michael.chen@harmonycollege.edu',
      phone: '+1234567892',
      dateOfBirth: new Date('1990-11-30'),
      gender: 'MALE' as const,
      address: '789 Pine Rd, City',
      hireDate: new Date('2021-03-10'),
      employmentType: 'FULL_TIME' as const,
      departmentId: csDept?.id || '',
      position: 'Assistant Professor',
      basicSalary: 55000.00,
      isActive: true,
    },
    {
      employeeCode: 'EMP004',
      fullName: 'Emily Williams',
      email: 'emily.williams@harmonycollege.edu',
      phone: '+1234567893',
      dateOfBirth: new Date('1987-05-18'),
      gender: 'FEMALE' as const,
      address: '321 Elm St, City',
      hireDate: new Date('2018-09-01'),
      employmentType: 'FULL_TIME' as const,
      departmentId: physicsDept?.id || '',
      position: 'Professor',
      basicSalary: 72000.00,
      isActive: true,
    },
    {
      employeeCode: 'EMP005',
      fullName: 'David Brown',
      email: 'david.brown@harmonycollege.edu',
      phone: '+1234567894',
      dateOfBirth: new Date('1992-09-25'),
      gender: 'MALE' as const,
      address: '654 Maple Dr, City',
      hireDate: new Date('2022-01-05'),
      employmentType: 'PART_TIME' as const,
      departmentId: mathDept?.id || '',
      position: 'Lecturer',
      basicSalary: 35000.00,
      isActive: true,
    },
    {
      employeeCode: 'EMP006',
      fullName: 'Lisa Martinez',
      email: 'lisa.martinez@harmonycollege.edu',
      phone: '+1234567895',
      dateOfBirth: new Date('1983-12-08'),
      gender: 'FEMALE' as const,
      address: '987 Cedar Ln, City',
      hireDate: new Date('2017-06-15'),
      employmentType: 'FULL_TIME' as const,
      departmentId: adminDept?.id || '',
      position: 'Administrative Officer',
      basicSalary: 48000.00,
      isActive: true,
    },
    {
      employeeCode: 'EMP007',
      fullName: 'Robert Taylor',
      email: 'robert.taylor@harmonycollege.edu',
      phone: '+1234567896',
      dateOfBirth: new Date('1989-04-12'),
      gender: 'MALE' as const,
      address: '147 Birch St, City',
      hireDate: new Date('2019-02-20'),
      employmentType: 'FULL_TIME' as const,
      departmentId: physicsDept?.id || '',
      position: 'Associate Professor',
      basicSalary: 68000.00,
      isActive: true,
    },
    {
      employeeCode: 'EMP008',
      fullName: 'Jennifer Anderson',
      email: 'jennifer.anderson@harmonycollege.edu',
      phone: '+1234567897',
      dateOfBirth: new Date('1991-08-03'),
      gender: 'FEMALE' as const,
      address: '258 Spruce Ave, City',
      hireDate: new Date('2020-11-01'),
      employmentType: 'CONTRACT' as const,
      departmentId: csDept?.id || '',
      position: 'Research Associate',
      basicSalary: 42000.00,
      isActive: true,
    },
    {
      employeeCode: 'EMP009',
      fullName: 'James Wilson',
      email: 'james.wilson@harmonycollege.edu',
      phone: '+1234567898',
      dateOfBirth: new Date('1986-01-27'),
      gender: 'MALE' as const,
      address: '369 Willow Rd, City',
      hireDate: new Date('2016-04-10'),
      employmentType: 'FULL_TIME' as const,
      departmentId: adminDept?.id || '',
      position: 'Finance Manager',
      basicSalary: 62000.00,
      isActive: true,
    },
    {
      employeeCode: 'EMP010',
      fullName: 'Maria Garcia',
      email: 'maria.garcia@harmonycollege.edu',
      phone: '+1234567899',
      dateOfBirth: new Date('1984-06-14'),
      gender: 'FEMALE' as const,
      address: '741 Ash Blvd, City',
      hireDate: new Date('2015-07-01'),
      employmentType: 'FULL_TIME' as const,
      departmentId: mathDept?.id || '',
      position: 'Department Head',
      basicSalary: 85000.00,
      isActive: true,
    },
    // Add one inactive employee to test filtering
    {
      employeeCode: 'EMP011',
      fullName: 'Thomas Lee',
      email: 'thomas.lee@harmonycollege.edu',
      phone: '+1234567800',
      dateOfBirth: new Date('1982-10-05'),
      gender: 'MALE' as const,
      address: '852 Cherry Ct, City',
      hireDate: new Date('2014-09-01'),
      contractEndDate: new Date('2024-08-31'),
      employmentType: 'FULL_TIME' as const,
      departmentId: physicsDept?.id || '',
      position: 'Professor',
      basicSalary: 78000.00,
      isActive: false,
    },
  ];

  console.log(`Creating ${employees.length} employees...`);
  
  for (const emp of employees) {
    await prisma.hREmployee.create({ data: emp });
    console.log(`  ✅ ${emp.fullName} (${emp.employeeCode}) - $${emp.basicSalary.toLocaleString()}/month`);
  }

  console.log('\n✨ Seed completed successfully!\n');
  
  const activeCount = await prisma.hREmployee.count({ where: { isActive: true } });
  const inactiveCount = await prisma.hREmployee.count({ where: { isActive: false } });
  
  console.log('📊 Summary:');
  console.log(`   Active employees: ${activeCount}`);
  console.log(`   Inactive employees: ${inactiveCount}`);
  console.log(`   Total employees: ${activeCount + inactiveCount}`);
  console.log('\n🎯 Next steps:');
  console.log('   1. Log in as Finance Officer');
  console.log('   2. Navigate to "Staff Payments" tab');
  console.log('   3. Click "Generate Payroll" for current month');
  console.log('   4. Record payments for staff members\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
