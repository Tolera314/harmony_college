import { prisma } from '../../lib/prisma';
import { writeHRAudit } from './hrAuditService';

export interface EmployeeListQuery {
  page: number; limit: number;
  search?: string; departmentId?: string;
  status?: string; employmentType?: string;
}

export async function listEmployees(q: EmployeeListQuery) {
  const { page, limit, search, departmentId, status, employmentType } = q;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status && status !== 'All')         where.status = status;
  if (employmentType && employmentType !== 'All') where.employmentType = employmentType;
  if (departmentId && departmentId !== 'All') where.departmentId = departmentId;
  if (search) {
    where.OR = [
      { fullName:     { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
      { position:     { contains: search, mode: 'insensitive' } },
      { email:        { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, employees] = await Promise.all([
    prisma.hREmployee.count({ where }),
    prisma.hREmployee.findMany({
      where, skip, take: limit,
      orderBy: { fullName: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        manager:    { select: { id: true, fullName: true } },
      },
    }),
  ]);

  // Strip highly sensitive fields from list view
  const safe = employees.map(({ nationalId: _ni, bankAccount: _ba, taxNumber: _tn, ...rest }) => rest);

  return { total, page, limit, totalPages: Math.ceil(total / limit), employees: safe };
}

export async function getEmployeeById(id: string) {
  return prisma.hREmployee.findUnique({
    where: { id },
    include: {
      department: true,
      manager:    { select: { id: true, fullName: true, position: true } },
      leaveRequests: {
        orderBy: { submittedAt: 'desc' },
        take: 5,
        select: { id: true, leaveType: true, startDate: true, endDate: true, daysCount: true, status: true, submittedAt: true },
      },
      performanceReviews: {
        orderBy: { dueDate: 'desc' },
        take: 3,
        select: { id: true, cycle: true, period: true, status: true, overallScore: true, dueDate: true },
      },
      documents: {
        orderBy: { uploadedAt: 'desc' },
        take: 10,
        select: { id: true, category: true, title: true, fileSize: true, uploadedAt: true, version: true },
      },
    },
  });
}

/** Full employee detail — includes sensitive fields (nationalId, bankAccount, taxNumber). HR roles only. */
export async function getEmployeeByIdFull(id: string) {
  return prisma.hREmployee.findUnique({
    where: { id },
    include: {
      department: true,
      manager:    { select: { id: true, fullName: true, position: true } },
      leaveRequests: {
        orderBy: { submittedAt: 'desc' },
        take: 5,
        select: { id: true, leaveType: true, startDate: true, endDate: true, daysCount: true, status: true, submittedAt: true },
      },
      performanceReviews: {
        orderBy: { dueDate: 'desc' },
        take: 3,
        select: { id: true, cycle: true, period: true, status: true, overallScore: true, dueDate: true },
      },
      documents: {
        orderBy: { uploadedAt: 'desc' },
        take: 10,
        select: { id: true, category: true, title: true, fileSize: true, uploadedAt: true, version: true },
      },
    },
  });
}

export async function createEmployee(data: {
  employeeCode: string; departmentId: string; fullName: string; gender: string;
  email: string; phone?: string; position: string; employmentType: string;
  hireDate: string; contractEndDate?: string; managerId?: string;
  education?: string; experienceYears?: number;
  basicSalary: number; allowances: number; deductions: number;
  nationalId?: string; bankAccount?: string; taxNumber?: string;
  emergencyName?: string; emergencyPhone?: string; emergencyRelation?: string;
  avatarUrl?: string;
}, actorName: string, actorUserId?: string) {
  // Uniqueness checks
  const [codeExists, emailExists] = await Promise.all([
    prisma.hREmployee.findUnique({ where: { employeeCode: data.employeeCode }, select: { id: true } }),
    prisma.hREmployee.findUnique({ where: { email: data.email }, select: { id: true } }),
  ]);
  if (codeExists) throw new Error(`Employee code ${data.employeeCode} already exists`);
  if (emailExists) throw new Error(`Email ${data.email} is already in use`);

  const dept = await prisma.hRDepartment.findUnique({ where: { id: data.departmentId }, select: { id: true } });
  if (!dept) throw new Error('Department not found');

  const employee = await prisma.hREmployee.create({
    data: {
      employeeCode: data.employeeCode,
      departmentId: data.departmentId,
      fullName:     data.fullName,
      gender:       data.gender as any,
      email:        data.email,
      phone:        data.phone,
      position:     data.position,
      employmentType: data.employmentType as any,
      hireDate:     new Date(data.hireDate),
      contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
      managerId:    data.managerId ?? null,
      education:    data.education,
      experienceYears: data.experienceYears ?? 0,
      basicSalary:  data.basicSalary,
      allowances:   data.allowances,
      deductions:   data.deductions,
      nationalId:   data.nationalId,
      bankAccount:  data.bankAccount,
      taxNumber:    data.taxNumber,
      emergencyName:     data.emergencyName,
      emergencyPhone:    data.emergencyPhone,
      emergencyRelation: data.emergencyRelation,
      avatarUrl:    data.avatarUrl,
      contractStatus: data.contractEndDate ? 'EXPIRING_SOON' : 'ACTIVE',
    },
  });

  // Seed leave balances for new employee
  const year = new Date().getFullYear();
  for (const [type, entitled] of [['ANNUAL',20],['SICK',15],['STUDY',10]] as [string,number][]) {
    await prisma.hRLeaveBalance.create({
      data: { employeeId: employee.id, leaveType: type as any, entitled, taken: 0, remaining: entitled, year },
    });
  }

  await writeHRAudit({
    actorUserId, actorName, action: 'Employee Created', employeeName: data.fullName,
    module: 'Employees', description: `New employee ${data.fullName} (${data.employeeCode}) created.`,
    status: 'SUCCESS',
  });

  return employee;
}

export async function updateEmployee(id: string, data: Partial<{
  departmentId: string; position: string; employmentType: string; contractStatus: string;
  status: string; contractEndDate: string | null; managerId: string | null;
  fullName: string; email: string; phone: string; education: string; experienceYears: number;
  basicSalary: number; allowances: number; deductions: number;
  nationalId: string; bankAccount: string; taxNumber: string;
  emergencyName: string; emergencyPhone: string; emergencyRelation: string;
  avatarUrl: string;
}>, actorName: string, actorUserId?: string) {
  const employee = await prisma.hREmployee.findUnique({ where: { id }, select: { fullName: true } });
  if (!employee) throw new Error('Employee not found');

  if (data.email) {
    const conflict = await prisma.hREmployee.findFirst({ where: { email: data.email, NOT: { id } }, select: { id: true } });
    if (conflict) throw new Error(`Email ${data.email} is already in use`);
  }

  const updated = await prisma.hREmployee.update({
    where: { id },
    data: {
      ...( data.departmentId   && { departmentId:   data.departmentId }),
      ...( data.position       && { position:       data.position }),
      ...( data.employmentType && { employmentType: data.employmentType as any }),
      ...( data.contractStatus && { contractStatus: data.contractStatus as any }),
      ...( data.status         && { status:         data.status as any }),
      ...( 'contractEndDate' in data && { contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null }),
      ...( 'managerId' in data && { managerId: data.managerId }),
      ...( data.fullName       && { fullName:       data.fullName }),
      ...( data.email          && { email:          data.email }),
      ...( data.phone          !== undefined && { phone: data.phone }),
      ...( data.education      && { education:      data.education }),
      ...( data.experienceYears !== undefined && { experienceYears: data.experienceYears }),
      ...( data.basicSalary    !== undefined && { basicSalary:  data.basicSalary }),
      ...( data.allowances     !== undefined && { allowances:   data.allowances }),
      ...( data.deductions     !== undefined && { deductions:   data.deductions }),
      ...( data.nationalId     !== undefined && { nationalId:   data.nationalId }),
      ...( data.bankAccount    !== undefined && { bankAccount:  data.bankAccount }),
      ...( data.taxNumber      !== undefined && { taxNumber:    data.taxNumber }),
      ...( data.emergencyName  !== undefined && { emergencyName:     data.emergencyName }),
      ...( data.emergencyPhone !== undefined && { emergencyPhone:    data.emergencyPhone }),
      ...( data.emergencyRelation !== undefined && { emergencyRelation: data.emergencyRelation }),
      ...( data.avatarUrl      !== undefined && { avatarUrl:    data.avatarUrl }),
    },
  });

  await writeHRAudit({
    actorUserId, actorName, action: 'Employee Updated', employeeName: employee.fullName,
    module: 'Employees', description: `Employee record updated for ${employee.fullName}.`,
    status: 'SUCCESS',
  });

  return updated;
}

export async function deactivateEmployee(id: string, actorName: string, actorUserId?: string) {
  const employee = await prisma.hREmployee.findUnique({ where: { id }, select: { fullName: true, status: true } });
  if (!employee) throw new Error('Employee not found');
  if (employee.status === 'TERMINATED') throw new Error('Employee is already terminated');

  const updated = await prisma.hREmployee.update({
    where: { id },
    data:  { status: 'INACTIVE', isActive: false },
  });

  await writeHRAudit({
    actorUserId, actorName, action: 'Employee Deactivated', employeeName: employee.fullName,
    module: 'Employees', description: `Employee ${employee.fullName} deactivated.`,
    status: 'SUCCESS',
  });

  return updated;
}

export async function getDepartments() {
  return prisma.hRDepartment.findMany({
    where: { isActive: true },
    include: { _count: { select: { employees: { where: { status: 'ACTIVE' } } } } },
    orderBy: { name: 'asc' },
  });
}
