import { prisma } from '../../lib/prisma';
import { writeHRAudit } from './hrAuditService';

const DEFAULT_STEPS = [
  { key: 'personal_info',      label: 'Personal Information',  order: 0 },
  { key: 'employment_details', label: 'Employment Details',    order: 1 },
  { key: 'contract',           label: 'Contract',              order: 2 },
  { key: 'salary',             label: 'Salary & Benefits',     order: 3 },
  { key: 'benefits',           label: 'Benefits',              order: 4 },
  { key: 'documents',          label: 'Documents',             order: 5 },
  { key: 'review',             label: 'Review & Submit',       order: 6 },
];

export interface OnboardingListQuery {
  page:         number;
  limit:        number;
  search?:      string;  // employee name / code
  departmentId?: string;
  status?:      string;  // HROnboardingStatus
}

export async function listOnboardingRecords(q: OnboardingListQuery) {
  const { page, limit, search, departmentId, status } = q;
  const skip = (page - 1) * limit;

  // Build a WHERE for the nested employee filter
  const empWhere: any = {};
  if (departmentId && departmentId !== 'All') empWhere.departmentId = departmentId;
  if (search) {
    empWhere.OR = [
      { fullName:     { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
      { email:        { contains: search, mode: 'insensitive' } },
      { position:     { contains: search, mode: 'insensitive' } },
    ];
  }

  const where: any = {};
  if (status && status !== 'All') where.status = status;
  if (Object.keys(empWhere).length) where.employee = empWhere;

  const [total, records] = await Promise.all([
    prisma.hROnboardingRecord.count({ where }),
    prisma.hROnboardingRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true, fullName: true, avatarUrl: true, position: true, employeeCode: true,
            department: { select: { id: true, name: true } },
          },
        },
        steps: { orderBy: { orderIndex: 'asc' } },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), records };
}

export async function getOnboardingRecord(employeeId: string) {
  return prisma.hROnboardingRecord.findUnique({
    where: { employeeId },
    include: {
      employee: { select: { id: true, fullName: true, avatarUrl: true, position: true } },
      steps:    { orderBy: { orderIndex: 'asc' } },
    },
  });
}

export async function startOnboarding(employeeId: string, actorName: string, actorUserId?: string) {
  const emp = await prisma.hREmployee.findUnique({ where: { id: employeeId }, select: { fullName: true } });
  if (!emp) throw new Error('Employee not found');

  const existing = await prisma.hROnboardingRecord.findUnique({ where: { employeeId }, select: { id: true } });
  if (existing) throw new Error('Onboarding already started for this employee');

  const record = await prisma.hROnboardingRecord.create({
    data: {
      employeeId,
      currentStep: 0,
      status: 'IN_PROGRESS',
      steps: {
        create: DEFAULT_STEPS.map(s => ({ stepKey: s.key, label: s.label, orderIndex: s.order })),
      },
    },
    include: { steps: { orderBy: { orderIndex: 'asc' } } },
  });

  await writeHRAudit({
    actorUserId, actorName, action: 'Onboarding Started', employeeName: emp.fullName,
    module: 'Onboarding',
    description: `Onboarding process started for ${emp.fullName}.`,
    status: 'SUCCESS',
  });

  return record;
}

export async function advanceOnboardingStep(
  employeeId: string,
  stepKey: string,
  completed: boolean,
  actorName: string,
  actorUserId?: string,
) {
  const record = await prisma.hROnboardingRecord.findUnique({
    where: { employeeId },
    include: { steps: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!record) throw new Error('Onboarding record not found');

  await prisma.hROnboardingStep.updateMany({
    where: { recordId: record.id, stepKey },
    data:  { completed },
  });

  const completedCount = record.steps.filter(s => s.stepKey === stepKey ? completed : s.completed).length;
  const allDone        = completedCount === record.steps.length;

  const updated = await prisma.hROnboardingRecord.update({
    where: { id: record.id },
    data: {
      currentStep: Math.min(completedCount, DEFAULT_STEPS.length - 1),
      status:      allDone ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: allDone ? new Date() : null,
    },
    include: { steps: { orderBy: { orderIndex: 'asc' } } },
  });

  return updated;
}

export async function completeOnboarding(employeeId: string, actorName: string, actorUserId?: string) {
  const record = await prisma.hROnboardingRecord.findUnique({
    where:   { employeeId },
    include: { employee: { select: { fullName: true } } },
  });
  if (!record) throw new Error('Onboarding record not found');

  await prisma.hROnboardingRecord.update({
    where: { id: record.id },
    data:  { status: 'COMPLETED', currentStep: DEFAULT_STEPS.length, completedAt: new Date() },
  });

  await prisma.hROnboardingStep.updateMany({
    where: { recordId: record.id },
    data:  { completed: true },
  });

  await writeHRAudit({
    actorUserId, actorName, action: 'Onboarding Completed', employeeName: record.employee.fullName,
    module: 'Onboarding',
    description: `Onboarding completed for ${record.employee.fullName}.`,
    status: 'SUCCESS',
  });
}
