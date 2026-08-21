import { prisma } from '../../lib/prisma';
import { writeHRAudit } from './hrAuditService';
import { createNotification } from './hrNotificationService';

/** List all renewal records for an employee, newest first. */
export async function getContractRenewals(employeeId: string) {
  const emp = await prisma.hREmployee.findUnique({
    where:  { id: employeeId },
    select: { fullName: true },
  });
  if (!emp) throw new Error('Employee not found');

  const renewals = await prisma.hRContractRenewal.findMany({
    where:   { employeeId },
    orderBy: { createdAt: 'desc' },
  });
  return { employee: emp, renewals };
}

/**
 * Create a contract renewal:
 * - Validates new end date is after previous end date
 * - Updates employee.contractEndDate and contractStatus → ACTIVE
 * - Appends renewal record
 * - Writes audit log
 * - Sends in-app notification to HR officers
 */
export async function renewContract(data: {
  employeeId:       string;
  newEndDate:       string;   // YYYY-MM-DD
  reason?:          string;
  documentId?:      string;
  approvedByName:   string;
  approvedByUserId?: string;
  hrRecipientUserId?: string; // userId of the HR officer to notify
}) {
  const emp = await prisma.hREmployee.findUnique({
    where:   { id: data.employeeId },
    select:  { fullName: true, contractEndDate: true, contractStatus: true },
  });
  if (!emp) throw new Error('Employee not found');

  const previousEndDate = emp.contractEndDate ?? new Date();
  const newEnd          = new Date(data.newEndDate);

  if (newEnd <= previousEndDate) {
    throw new Error('New contract end date must be after the previous end date');
  }

  const [renewal] = await prisma.$transaction([
    // 1. Create renewal record
    prisma.hRContractRenewal.create({
      data: {
        employeeId:       data.employeeId,
        previousEndDate,
        newEndDate:       newEnd,
        reason:           data.reason ?? null,
        documentId:       data.documentId ?? null,
        approvedByName:   data.approvedByName,
        approvedByUserId: data.approvedByUserId ?? null,
        approvedAt:       new Date(),
      },
    }),
    // 2. Update employee contract fields
    prisma.hREmployee.update({
      where: { id: data.employeeId },
      data: {
        contractEndDate: newEnd,
        contractStatus:  'ACTIVE',
      },
    }),
  ]);

  await writeHRAudit({
    actorUserId:  data.approvedByUserId,
    actorName:    data.approvedByName,
    action:       'Contract Renewed',
    employeeName: emp.fullName,
    module:       'Employees',
    description:  `Contract for ${emp.fullName} renewed to ${data.newEndDate}. ${data.reason ?? ''}`.trim(),
    status:       'SUCCESS',
  });

  // In-app notification to HR officers
  if (data.hrRecipientUserId) {
    await createNotification({
      recipientUserId: data.hrRecipientUserId,
      employeeId:      data.employeeId,
      type:            'CONTRACT',
      title:           `Contract Renewed: ${emp.fullName}`,
      message:         `Contract renewed until ${new Date(data.newEndDate).toLocaleDateString()}. ${data.reason ? `Reason: ${data.reason}` : ''}`.trim(),
      tab:             'employees',
    });
  }

  return renewal;
}
