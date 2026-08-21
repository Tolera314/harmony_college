import { prisma } from '../../lib/prisma';
import { writeHRAudit } from './hrAuditService';
import { getEmailProvider } from '../../lib/providers';

export async function listPayrollRecords() {
  return prisma.hRPayrollRecord.findMany({
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    include: {
      approvals: { orderBy: { createdAt: 'asc' } },
      _count: { select: { payslips: true } },
    },
  });
}

export async function getPayrollById(id: string) {
  const record = await prisma.hRPayrollRecord.findUnique({
    where: { id },
    include: {
      approvals: { orderBy: { createdAt: 'asc' } },
      payslips: {
        include: {
          employee: { select: { id: true, fullName: true, avatarUrl: true, employeeCode: true } },
        },
        orderBy: { employee: { fullName: 'asc' } },
      },
    },
  });
  if (!record) throw new Error('Payroll record not found');
  return record;
}

export async function approvePayroll(
  id: string,
  comment: string | undefined,
  actorName: string,
  actorUserId?: string,
) {
  const record = await prisma.hRPayrollRecord.findUnique({ where: { id } });
  if (!record) throw new Error('Payroll record not found');
  if (record.stage !== 'PENDING_HR_APPROVAL') {
    throw new Error('Payroll is not awaiting HR approval');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.hRPayrollRecord.update({
      where: { id },
      data:  { stage: 'APPROVED' },
    });
    await tx.hRPayrollApproval.updateMany({
      where: { payrollId: id, status: 'PENDING' },
      data:  { status: 'APPROVED', approvedAt: new Date(), comment: comment ?? null },
    });
    return upd;
  });

  await writeHRAudit({
    actorUserId, actorName,
    action: 'Payroll Approved',
    employeeName: 'All Staff',
    module: 'Payroll',
    description: `${record.month} ${record.year} payroll approved by ${actorName}. Net: ETB ${record.totalNet.toLocaleString()}.`,
    status: 'SUCCESS',
  });

  // Email the approving HR officer a confirmation receipt
  try {
    if (actorUserId) {
      const approverUser = await prisma.user.findUnique({
        where: { id: actorUserId },
        select: { email: true, fullName: true },
      });
      if (approverUser?.email) {
        const emailProvider = getEmailProvider();
        await emailProvider.sendHrNotificationEmail(approverUser.email, {
          recipientName: approverUser.fullName,
          subject:       `Payroll Approved — ${record.month} ${record.year}`,
          heading:       `Payroll Approved: ${record.month} ${record.year}`,
          body: `You have approved the ${record.month} ${record.year} payroll.\n\nTotal Employees: ${record.employeeCount}\nTotal Gross:     ETB ${record.totalGross.toLocaleString()}\nTotal Net:       ETB ${record.totalNet.toLocaleString()}\n\nPayslips will be released to employees upon locking.`,
        });
      }
    }
  } catch (emailErr) {
    console.error('[hrPayrollService] Failed to send payroll approval email:', emailErr);
  }

  return updated;
}

export async function lockPayroll(id: string, actorName: string, actorUserId?: string) {
  const record = await prisma.hRPayrollRecord.findUnique({ where: { id } });
  if (!record) throw new Error('Payroll record not found');
  if (record.stage !== 'APPROVED') throw new Error('Payroll must be approved before locking');

  const updated = await prisma.hRPayrollRecord.update({
    where: { id },
    data:  { stage: 'LOCKED' },
  });

  await writeHRAudit({
    actorUserId, actorName, action: 'Payroll Locked', employeeName: 'All Staff',
    module: 'Payroll',
    description: `${record.month} ${record.year} payroll locked. Payslips released.`,
    status: 'SUCCESS',
  });

  return updated;
}
