/**
 * Monthly Fee Setup & Tuition Configuration Service — Harmony College
 * Finance Officers configure monthly tuition amounts per academic context
 * (TVET / SHORT_PROGRAM), program, and payment month.
 */
import { prisma } from '../../lib/prisma';
import { ProgramType } from '@prisma/client';

export interface CreateConfigInput {
  academicContext: ProgramType;
  departmentId?: string;
  programId: string;
  durationMonths?: number;
  academicYearLabel?: string;
  billingMonth: string; // e.g. "2026-10"
  billingLabel?: string; // e.g. "October 2026"
  monthlyAmount: number;
  dueDate: Date | string;
  paymentInstructions?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  description?: string;
  createdByUserId: string;
}

export interface UpdateConfigInput {
  monthlyAmount?: number;
  dueDate?: Date | string;
  paymentInstructions?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  isActive?: boolean;
  description?: string;
  academicYearLabel?: string;
}

export interface ReviseConfigInput {
  monthlyAmount?: number;
  dueDate?: Date | string;
  paymentInstructions?: string;
  description?: string;
  revisedByUserId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatBillingLabel(billingMonth: string): string {
  // billingMonth format: YYYY-MM
  const parts = billingMonth.split('-');
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
  return billingMonth;
}

// ── Get Programs for Fee Setup ────────────────────────────────────────────────

export async function getProgramsForFeeSetup(academicContext?: 'TVET' | 'SHORT_PROGRAM') {
  const where: any = { isActive: true };
  if (academicContext) {
    where.department = { programType: academicContext };
  }

  const programs = await prisma.program.findMany({
    where,
    include: {
      department: {
        select: { id: true, name: true, code: true, programType: true },
      },
      studentRecords: {
        where: {
          status: { notIn: ['SUSPENDED'] },
          ...(academicContext ? { programType: academicContext } : {}),
        },
        select: {
          id: true,
          studentId: true,
          programType: true,
          status: true,
          admittedAt: true,
          user: {
            select: {
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      _count: {
        select: {
          studentRecords: {
            where: {
              status: { notIn: ['SUSPENDED'] },
              ...(academicContext ? { programType: academicContext } : {}),
            },
          },
        },
      },
    },
    orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
  });

  return programs.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    departmentId: p.departmentId,
    departmentName: p.department.name,
    departmentCode: p.department.code,
    programType: p.department.programType,
    durationYears: p.durationYears,
    enrolledStudentCount: p._count.studentRecords,
    enrolledStudents: p.studentRecords.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      fullName: s.user.fullName,
      email: s.user.email,
      phone: s.user.phone,
      status: s.status,
      programType: s.programType,
      departmentName: p.department.name,
      programName: p.name,
    })),
  }));
}

export async function getRegisteredStudentsForFeeSetup(academicContext?: 'TVET' | 'SHORT_PROGRAM') {
  const where: any = {
    status: { notIn: ['SUSPENDED'] },
  };
  if (academicContext) {
    where.programType = academicContext;
  }

  const students = await prisma.studentRecord.findMany({
    where,
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
          programType: true,
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: [
      { programType: 'asc' },
      { department: { name: 'asc' } },
      { user: { fullName: 'asc' } },
    ],
  });

  return students.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    fullName: s.user.fullName,
    email: s.user.email,
    phone: s.user.phone,
    status: s.status,
    programType: s.programType,
    departmentId: s.departmentId,
    departmentName: s.department?.name ?? '—',
    departmentCode: s.department?.code ?? '—',
    programId: s.programId,
    programName: s.program?.name ?? '—',
    programCode: s.program?.code ?? '—',
  }));
}

// ── List Monthly Fee Configurations ───────────────────────────────────────────

export async function listConfigs(params: {
  academicContext?: string;
  departmentId?: string;
  programId?: string;
  status?: string;
  billingMonth?: string;
  isActive?: boolean;
}) {
  const where: any = {};
  if (params.academicContext && params.academicContext !== 'ALL') {
    where.academicContext = params.academicContext as ProgramType;
  }
  if (params.departmentId && params.departmentId !== 'ALL') {
    where.departmentId = params.departmentId;
  }
  if (params.programId && params.programId !== 'ALL') {
    where.programId = params.programId;
  }
  if (params.status && params.status !== 'ALL') {
    where.status = params.status;
  }
  if (params.billingMonth) {
    where.billingMonth = params.billingMonth;
  }
  if (params.isActive !== undefined) {
    where.isActive = params.isActive;
  }

  const configs = await prisma.tuitionConfiguration.findMany({
    where,
    include: {
      department: { select: { id: true, name: true, code: true, programType: true } },
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: {
              studentRecords: {
                where: { status: { notIn: ['SUSPENDED'] } },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { billingMonth: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return configs.map((cfg) => ({
    ...cfg,
    billingLabel: cfg.billingMonth ? formatBillingLabel(cfg.billingMonth) : (cfg.academicYearLabel ?? 'Tuition Fee'),
    enrolledStudentCount: cfg.program?._count?.studentRecords ?? 0,
  }));
}

export async function getConfigById(id: string) {
  const config = await prisma.tuitionConfiguration.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true, programType: true } },
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          _count: { select: { studentRecords: true } },
        },
      },
    },
  });
  if (!config) throw new Error('Monthly fee configuration not found.');
  return {
    ...config,
    billingLabel: config.billingMonth ? formatBillingLabel(config.billingMonth) : (config.academicYearLabel ?? 'Tuition Fee'),
    enrolledStudentCount: config.program?._count?.studentRecords ?? 0,
  };
}

// ── Create Monthly Fee Setup ──────────────────────────────────────────────────

export async function createConfig(input: Partial<CreateConfigInput> & {
  academicContext: ProgramType;
  monthlyAmount: number;
  createdByUserId: string;
}) {
  let programId = input.programId;
  let departmentId = input.departmentId;

  // If programId not provided but departmentId provided, find the primary program in department
  if (!programId && departmentId) {
    const prog = await prisma.program.findFirst({
      where: { departmentId, department: { programType: input.academicContext } },
    });
    if (prog) {
      programId = prog.id;
    }
  }

  // If programId provided, validate it
  if (programId) {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { department: true },
    });
    if (!program) throw new Error('Selected program was not found.');
    if (program.department.programType !== input.academicContext) {
      throw new Error(
        `Program "${program.name}" belongs to ${program.department.programType}, but category ${input.academicContext} was selected. Categories must remain strictly separated.`
      );
    }
    departmentId = departmentId || program.departmentId;
  } else if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new Error('Department not found.');
  } else {
    throw new Error('Either programId or departmentId must be provided.');
  }

  // Validate amount
  if (!input.monthlyAmount || input.monthlyAmount <= 0) {
    throw new Error('Monthly tuition amount must be greater than zero.');
  }

  const now = new Date();
  const billingMonth =
    input.billingMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const parsedDueDate = input.dueDate
    ? new Date(input.dueDate)
    : new Date(now.getFullYear(), now.getMonth(), 28);
  if (isNaN(parsedDueDate.getTime())) {
    throw new Error('Valid payment deadline is required.');
  }

  const status = input.status || 'PUBLISHED';

  // Conflict Prevention:
  // Check for duplicate active fee setup for the same program/department, category, and month
  const existing = await prisma.tuitionConfiguration.findFirst({
    where: {
      academicContext: input.academicContext,
      departmentId: departmentId!,
      programId: programId ?? null,
      billingMonth,
      durationMonths: input.durationMonths ?? null,
      isActive: true,
    },
  });

  if (existing) {
    if (existing.status === 'DRAFT') {
      throw new Error(
        `A draft fee already exists for this program for ${formatBillingLabel(billingMonth)}. Please review and publish the existing draft.`
      );
    }
    throw new Error(
      `An active fee configuration already exists for this program and period (${formatBillingLabel(billingMonth)}). Please use the revision workflow to update this fee.`
    );
  }

  // Create the Configuration
  const config = await prisma.tuitionConfiguration.create({
    data: {
      academicContext: input.academicContext,
      departmentId: departmentId!,
      programId: programId ?? null,
      durationMonths: input.durationMonths ?? null,
      academicYearLabel: input.academicYearLabel ?? `${parsedDueDate.getFullYear()}`,
      billingMonth,
      dueDate: parsedDueDate,
      paymentInstructions: input.paymentInstructions?.trim() || null,
      status,
      revision: 1,
      monthlyAmount: input.monthlyAmount,
      effectiveDate: parsedDueDate,
      description: input.description?.trim() || null,
      createdByUserId: input.createdByUserId,
      isActive: true,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true } },
    },
  });

  // If published, immediately sync installments for eligible students
  if (status === 'PUBLISHED') {
    await syncInstallmentsForConfig(config.id);
  }

  return {
    ...config,
    billingLabel: formatBillingLabel(config.billingMonth!),
  };
}

// ── Publish Draft Monthly Fee Setup ───────────────────────────────────────────

export async function publishConfig(id: string) {
  const existing = await prisma.tuitionConfiguration.findUnique({
    where: { id },
    include: { program: true },
  });
  if (!existing) throw new Error('Monthly fee configuration not found.');
  if (existing.status === 'PUBLISHED') {
    return existing; // already published
  }

  const updated = await prisma.tuitionConfiguration.update({
    where: { id },
    data: { status: 'PUBLISHED' },
    include: {
      department: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true } },
    },
  });

  // Generate/sync installments for enrolled students
  await syncInstallmentsForConfig(id);

  return {
    ...updated,
    billingLabel: updated.billingMonth ? formatBillingLabel(updated.billingMonth) : 'Tuition Fee',
  };
}

// ── Revise Published Fee Setup ────────────────────────────────────────────────

export async function reviseConfig(id: string, input: ReviseConfigInput) {
  const existing = await prisma.tuitionConfiguration.findUnique({
    where: { id },
    include: { program: true },
  });
  if (!existing) throw new Error('Monthly fee configuration not found.');

  const newAmount = input.monthlyAmount !== undefined ? input.monthlyAmount : existing.monthlyAmount;
  if (newAmount <= 0) {
    throw new Error('Monthly tuition amount must be greater than zero.');
  }

  const newDueDate = input.dueDate ? new Date(input.dueDate) : existing.dueDate;
  if (!newDueDate || isNaN(newDueDate.getTime())) {
    throw new Error('Valid payment deadline is required.');
  }

  const updated = await prisma.tuitionConfiguration.update({
    where: { id },
    data: {
      monthlyAmount: newAmount,
      dueDate: newDueDate,
      paymentInstructions: input.paymentInstructions !== undefined ? input.paymentInstructions.trim() : existing.paymentInstructions,
      description: input.description?.trim() || existing.description,
      revision: (existing.revision || 1) + 1,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true } },
    },
  });

  // Safe revision: update UNPAID installments only!
  // Editing or revising a fee must NOT silently change historical fee amounts, previously approved payments, or existing receipts.
  if (existing.billingMonth) {
    const installments = await prisma.monthlyInstallment.findMany({
      where: {
        tuitionConfigId: id,
        billingMonth: existing.billingMonth,
      },
      include: {
        receipt: true,
        submissions: { where: { status: 'APPROVED' } },
      },
    });

    for (const inst of installments) {
      // If already paid or has approved receipt/submission, DO NOT TOUCH IT!
      if (inst.status === 'PAID' || inst.receipt || inst.submissions.length > 0) {
        continue;
      }

      // Update unpaid installment amount and deadline
      const now = new Date();
      let status = inst.status;
      if (status !== 'PENDING_REVIEW' && status !== 'REJECTED') {
        status = newDueDate < now ? 'OVERDUE' : 'DUE';
      }

      await prisma.monthlyInstallment.update({
        where: { id: inst.id },
        data: {
          expectedAmount: newAmount,
          dueDate: newDueDate,
          status,
        },
      });
    }
  }

  return {
    ...updated,
    billingLabel: updated.billingMonth ? formatBillingLabel(updated.billingMonth) : 'Tuition Fee',
  };
}

// ── Update Config (General / Draft Edit) ───────────────────────────────────────

export async function updateConfig(id: string, input: UpdateConfigInput) {
  const existing = await prisma.tuitionConfiguration.findUnique({ where: { id } });
  if (!existing) throw new Error('Monthly fee configuration not found.');

  const data: any = {};
  if (input.monthlyAmount !== undefined) {
    if (input.monthlyAmount <= 0) throw new Error('Amount must be greater than zero.');
    data.monthlyAmount = input.monthlyAmount;
  }
  if (input.dueDate !== undefined) {
    const d = new Date(input.dueDate);
    if (isNaN(d.getTime())) throw new Error('Invalid deadline date.');
    data.dueDate = d;
  }
  if (input.paymentInstructions !== undefined) {
    data.paymentInstructions = input.paymentInstructions.trim();
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }
  if (input.description !== undefined) {
    data.description = input.description.trim();
  }
  if (input.academicYearLabel !== undefined) {
    data.academicYearLabel = input.academicYearLabel.trim();
  }

  const updated = await prisma.tuitionConfiguration.update({
    where: { id },
    data,
    include: {
      department: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true } },
    },
  });

  if (updated.status === 'PUBLISHED') {
    await syncInstallmentsForConfig(id);
  }

  return {
    ...updated,
    billingLabel: updated.billingMonth ? formatBillingLabel(updated.billingMonth) : 'Tuition Fee',
  };
}

// ── Delete / Deactivate Config ────────────────────────────────────────────────

export async function deleteConfig(id: string) {
  const existing = await prisma.tuitionConfiguration.findUnique({ where: { id } });
  if (!existing) throw new Error('Monthly fee configuration not found.');

  // Check if any installments reference this config
  const installmentCount = await prisma.monthlyInstallment.count({
    where: { tuitionConfigId: id },
  });
  if (installmentCount > 0) {
    // Soft-delete: deactivate rather than delete to preserve history
    await prisma.tuitionConfiguration.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      deleted: false,
      deactivated: true,
      message: 'Fee configuration deactivated. Historical records and receipts preserved.',
    };
  }

  await prisma.tuitionConfiguration.delete({ where: { id } });
  return { deleted: true, deactivated: false, message: 'Fee configuration deleted.' };
}

// ── Sync Installments for a Published Config ──────────────────────────────────

/**
 * Creates or updates MonthlyInstallment rows for all students currently enrolled
 * in the program of a published TuitionConfiguration.
 */
export async function syncInstallmentsForConfig(configId: string): Promise<number> {
  const config = await prisma.tuitionConfiguration.findUnique({
    where: { id: configId },
    include: { program: true },
  });
  if (!config || config.status !== 'PUBLISHED' || !config.isActive) return 0;
  if (!config.billingMonth || !config.dueDate) return 0;

  // Find all active students enrolled in this program and matching academicContext
  const students = await prisma.studentRecord.findMany({
    where: {
      programId: config.programId ?? undefined,
      departmentId: config.programId ? undefined : config.departmentId,
      programType: config.academicContext,
      status: { notIn: ['SUSPENDED'] },
    },
    include: { financialAccount: true },
  });

  const billingLabel = formatBillingLabel(config.billingMonth);
  const now = new Date();
  let initialStatus: 'UPCOMING' | 'DUE' | 'OVERDUE' = 'UPCOMING';
  if (config.dueDate < now) {
    initialStatus = 'OVERDUE';
  } else {
    const diffDays = Math.ceil((config.dueDate.getTime() - now.getTime()) / 86400000);
    initialStatus = diffDays <= 7 ? 'DUE' : 'UPCOMING';
  }

  let count = 0;
  for (const student of students) {
    // Ensure student has a financial account
    let fa = student.financialAccount;
    if (!fa) {
      fa = await prisma.financialAccount.create({
        data: { studentRecordId: student.id },
      });
    }

    const existingInst = await prisma.monthlyInstallment.findUnique({
      where: {
        studentRecordId_billingMonth: {
          studentRecordId: student.id,
          billingMonth: config.billingMonth,
        },
      },
      include: { receipt: true },
    });

    if (!existingInst) {
      await prisma.monthlyInstallment.create({
        data: {
          financialAccountId: fa.id,
          studentRecordId: student.id,
          tuitionConfigId: config.id,
          academicContext: config.academicContext,
          billingMonth: config.billingMonth,
          billingLabel,
          dueDate: config.dueDate,
          expectedAmount: config.monthlyAmount,
          status: initialStatus,
        },
      });
      count++;
    } else if (existingInst.status !== 'PAID' && !existingInst.receipt) {
      // If unpaid, sync to this published config
      await prisma.monthlyInstallment.update({
        where: { id: existingInst.id },
        data: {
          tuitionConfigId: config.id,
          expectedAmount: config.monthlyAmount,
          dueDate: config.dueDate,
          billingLabel,
        },
      });
    }
  }

  return count;
}

// ── Dynamic Tuition Config Resolution (backward compatibility) ────────────────

export async function findApplicableConfig(opts: {
  academicContext: ProgramType;
  departmentId: string;
  programId: string;
  durationMonths: number | null;
}): Promise<{ id: string; monthlyAmount: number } | null> {
  // Try most specific first: programId + active
  const cfg = await prisma.tuitionConfiguration.findFirst({
    where: {
      isActive: true,
      status: 'PUBLISHED',
      academicContext: opts.academicContext,
      programId: opts.programId,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, monthlyAmount: true },
  });
  if (cfg) return cfg;

  // Fallback: department level
  const cfg2 = await prisma.tuitionConfiguration.findFirst({
    where: {
      isActive: true,
      status: 'PUBLISHED',
      academicContext: opts.academicContext,
      departmentId: opts.departmentId,
      programId: null,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, monthlyAmount: true },
  });

  return cfg2 ?? null;
}

export async function findConfigForStudent(studentRecordId: string) {
  const sr = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
  });
  if (!sr) return null;
  const durationMonths = sr.shortProgramDuration ? parseInt(sr.shortProgramDuration, 10) : null;
  const config = await findApplicableConfig({
    academicContext: sr.programType,
    departmentId: sr.departmentId,
    programId: sr.programId,
    durationMonths: isNaN(durationMonths as number) ? null : durationMonths,
  });
  if (!config) return null;
  return {
    ...config,
    academicContext: sr.programType,
  };
}
