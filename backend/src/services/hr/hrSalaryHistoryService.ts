import { prisma } from '../../lib/prisma';
import { writeHRAudit } from './hrAuditService';

/** Return full salary history for one employee, newest first. */
export async function getSalaryHistory(employeeId: string) {
  const emp = await prisma.hREmployee.findUnique({
    where:  { id: employeeId },
    select: { fullName: true },
  });
  if (!emp) throw new Error('Employee not found');

  const history = await prisma.hRSalaryHistory.findMany({
    where:   { employeeId },
    orderBy: { effectiveDate: 'desc' },
  });
  return { employee: emp, history };
}

/**
 * Record a salary change.
 * Also updates the employee's live salary fields so the payroll always
 * uses the latest figures.
 */
export async function recordSalaryChange(data: {
  employeeId:    string;
  effectiveDate: string;   // YYYY-MM-DD
  basicSalary:   number;
  allowances:    number;
  deductions:    number;
  reason?:       string;
  changedByName:   string;
  changedByUserId?: string;
}) {
  const emp = await prisma.hREmployee.findUnique({
    where:  { id: data.employeeId },
    select: { fullName: true, basicSalary: true, allowances: true },
  });
  if (!emp) throw new Error('Employee not found');

  if (data.basicSalary < 0) throw new Error('Basic salary cannot be negative');
  if (data.allowances  < 0) throw new Error('Allowances cannot be negative');

  const gross = data.basicSalary + data.allowances;

  const [entry] = await prisma.$transaction([
    // 1. Append-only history record
    prisma.hRSalaryHistory.create({
      data: {
        employeeId:      data.employeeId,
        effectiveDate:   new Date(data.effectiveDate),
        basicSalary:     data.basicSalary,
        allowances:      data.allowances,
        deductions:      data.deductions,
        grossSalary:     gross,
        reason:          data.reason ?? null,
        changedByName:   data.changedByName,
        changedByUserId: data.changedByUserId ?? null,
      },
    }),
    // 2. Update live salary on employee record
    prisma.hREmployee.update({
      where: { id: data.employeeId },
      data: {
        basicSalary: data.basicSalary,
        allowances:  data.allowances,
        deductions:  data.deductions,
      },
    }),
  ]);

  await writeHRAudit({
    actorUserId:  data.changedByUserId,
    actorName:    data.changedByName,
    action:       'Salary Updated',
    employeeName: emp.fullName,
    module:       'Employees',
    description:  `Salary updated for ${emp.fullName}. New gross: ETB ${gross.toLocaleString()}. ${data.reason ? `Reason: ${data.reason}` : ''}`.trim(),
    status:       'SUCCESS',
  });

  return entry;
}
