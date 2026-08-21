import { prisma } from '../../lib/prisma';
import { writeHRAudit } from './hrAuditService';
import { createNotification } from './hrNotificationService';

const DEFAULT_ASSETS = [
  'Laptop',
  'ID Card',
  'Access Card',
  'Office Keys',
  'Mobile Phone',
  'Parking Pass',
];

/** List all active offboarding records (NOT_STARTED + IN_PROGRESS). */
export async function listOffboarding() {
  return prisma.hROffboardingRecord.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        select: {
          id: true, fullName: true, avatarUrl: true,
          position: true, employeeCode: true,
          department: { select: { name: true } },
        },
      },
      assetChecklist: true,
    },
  });
}

/** Get a single offboarding record by employee id. */
export async function getOffboardingRecord(employeeId: string) {
  const record = await prisma.hROffboardingRecord.findUnique({
    where: { employeeId },
    include: {
      employee: {
        select: {
          id: true, fullName: true, avatarUrl: true,
          position: true, employeeCode: true,
          department: { select: { name: true } },
        },
      },
      assetChecklist: true,
    },
  });
  if (!record) throw new Error('Offboarding record not found');
  return record;
}

/**
 * Initiate offboarding for an employee.
 * Creates the record + default asset checklist + sets employee status to INACTIVE.
 */
export async function startOffboarding(data: {
  employeeId:      string;
  lastWorkingDay:  string;   // YYYY-MM-DD
  exitReason:      string;   // HRExitReason enum value
  customAssets?:   string[]; // additional items beyond the defaults
  initiatedByName:   string;
  initiatedByUserId?: string;
  hrRecipientUserId?: string;
}) {
  const emp = await prisma.hREmployee.findUnique({
    where:  { id: data.employeeId },
    select: { fullName: true, status: true },
  });
  if (!emp) throw new Error('Employee not found');
  if (emp.status === 'TERMINATED') throw new Error('Employee is already terminated');

  const existing = await prisma.hROffboardingRecord.findUnique({
    where:  { employeeId: data.employeeId },
    select: { id: true },
  });
  if (existing) throw new Error('Offboarding already initiated for this employee');

  const assets = [...DEFAULT_ASSETS, ...(data.customAssets ?? [])];

  const record = await prisma.$transaction(async (tx) => {
    const rec = await tx.hROffboardingRecord.create({
      data: {
        employeeId:    data.employeeId,
        lastWorkingDay: new Date(data.lastWorkingDay),
        exitReason:    data.exitReason as any,
        currentStep:   0,
        status:        'IN_PROGRESS',
        assetChecklist: {
          create: assets.map(item => ({ item, returned: false })),
        },
      },
      include: { assetChecklist: true },
    });

    // Set employee status to INACTIVE so they can't log in
    await tx.hREmployee.update({
      where: { id: data.employeeId },
      data:  { status: 'INACTIVE' },
    });

    return rec;
  });

  await writeHRAudit({
    actorUserId:  data.initiatedByUserId,
    actorName:    data.initiatedByName,
    action:       'Offboarding Initiated',
    employeeName: emp.fullName,
    module:       'Offboarding',
    description:  `Offboarding initiated for ${emp.fullName}. Exit: ${data.exitReason}. Last day: ${data.lastWorkingDay}.`,
    status:       'WARNING',
  });

  if (data.hrRecipientUserId) {
    await createNotification({
      recipientUserId: data.hrRecipientUserId,
      employeeId:      data.employeeId,
      type:            'SYSTEM',
      title:           `Offboarding Started: ${emp.fullName}`,
      message:         `Offboarding initiated. Last working day: ${new Date(data.lastWorkingDay).toLocaleDateString()}.`,
      tab:             'onboarding',
    });
  }

  return record;
}

/**
 * Toggle the returned state on an asset checklist item.
 * Also updates currentStep (= count of returned items) and auto-completes
 * when all assets are returned.
 */
export async function updateAssetItem(data: {
  offboardingRecordId: string;
  assetItemId:         string;
  returned:            boolean;
  notes?:              string;
  actorName:           string;
  actorUserId?:        string;
}) {
  const record = await prisma.hROffboardingRecord.findUnique({
    where:   { id: data.offboardingRecordId },
    include: {
      assetChecklist: true,
      employee: { select: { fullName: true } },
    },
  });
  if (!record) throw new Error('Offboarding record not found');
  if (record.status === 'COMPLETED') throw new Error('Offboarding is already completed');

  await prisma.hRAssetCheckItem.update({
    where: { id: data.assetItemId },
    data:  { returned: data.returned, notes: data.notes ?? null },
  });

  // Recount
  const updatedList = record.assetChecklist.map(a =>
    a.id === data.assetItemId ? { ...a, returned: data.returned } : a
  );
  const returnedCount = updatedList.filter(a => a.returned).length;
  const allReturned   = returnedCount === updatedList.length;

  await prisma.hROffboardingRecord.update({
    where: { id: data.offboardingRecordId },
    data: {
      currentStep: returnedCount,
      status:      allReturned ? 'COMPLETED' : 'IN_PROGRESS',
    },
  });

  return prisma.hROffboardingRecord.findUnique({
    where:   { id: data.offboardingRecordId },
    include: { assetChecklist: true, employee: { select: { fullName: true, avatarUrl: true, position: true } } },
  });
}

/**
 * Finalize offboarding — sets employee status to TERMINATED and closes the record.
 */
export async function finalizeOffboarding(data: {
  offboardingRecordId: string;
  actorName:           string;
  actorUserId?:        string;
}) {
  const record = await prisma.hROffboardingRecord.findUnique({
    where:   { id: data.offboardingRecordId },
    include: { employee: { select: { fullName: true, id: true } } },
  });
  if (!record) throw new Error('Offboarding record not found');
  if (record.status === 'COMPLETED') throw new Error('Already completed');

  await prisma.$transaction([
    prisma.hROffboardingRecord.update({
      where: { id: data.offboardingRecordId },
      data:  { status: 'COMPLETED' },
    }),
    prisma.hREmployee.update({
      where: { id: record.employeeId },
      data:  { status: 'TERMINATED', isActive: false },
    }),
  ]);

  await writeHRAudit({
    actorUserId:  data.actorUserId,
    actorName:    data.actorName,
    action:       'Offboarding Finalized',
    employeeName: record.employee.fullName,
    module:       'Offboarding',
    description:  `Offboarding for ${record.employee.fullName} finalized. Status set to TERMINATED.`,
    status:       'SUCCESS',
  });
}
