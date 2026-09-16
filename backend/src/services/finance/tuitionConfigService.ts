/**
 * Tuition Configuration Service — Harmony College
 * Finance Officers configure monthly tuition amounts per academic context
 * (TVET / SHORT_PROGRAM), department, program, and duration.
 */
import { prisma } from '../../lib/prisma';
import { ProgramType } from '@prisma/client';

export interface CreateConfigInput {
  academicContext: ProgramType;
  departmentId: string;
  programId?: string;
  durationMonths?: number;
  academicYearLabel?: string;
  monthlyAmount: number;
  effectiveDate?: Date;
  description?: string;
  createdByUserId: string;
}

export interface UpdateConfigInput {
  monthlyAmount?: number;
  isActive?: boolean;
  description?: string;
  academicYearLabel?: string;
}

export async function listConfigs(params: {
  academicContext?: string;
  departmentId?: string;
  isActive?: boolean;
}) {
  const where: any = {};
  if (params.academicContext) where.academicContext = params.academicContext;
  if (params.departmentId)    where.departmentId    = params.departmentId;
  if (params.isActive !== undefined) where.isActive = params.isActive;

  const configs = await prisma.tuitionConfiguration.findMany({
    where,
    include: {
      department: { select: { id: true, name: true, code: true, programType: true } },
      program:    { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ academicContext: 'asc' }, { createdAt: 'desc' }],
  });

  return configs;
}

export async function getConfigById(id: string) {
  const config = await prisma.tuitionConfiguration.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      program:    { select: { id: true, name: true, code: true } },
    },
  });
  if (!config) throw new Error('Tuition configuration not found.');
  return config;
}

export async function createConfig(input: CreateConfigInput) {
  // Validate department exists with correct programType
  const dept = await prisma.department.findUnique({
    where: { id: input.departmentId },
  });
  if (!dept) throw new Error('Department not found.');

  // Validate program if provided
  if (input.programId) {
    const prog = await prisma.program.findUnique({ where: { id: input.programId } });
    if (!prog) throw new Error('Program not found.');
    if (prog.departmentId !== input.departmentId) {
      throw new Error('Program does not belong to the specified department.');
    }
  }

  // Check for conflicts: prevent duplicate active configs for same context/dept/program/duration/year
  const existing = await prisma.tuitionConfiguration.findFirst({
    where: {
      academicContext:  input.academicContext,
      departmentId:     input.departmentId,
      programId:        input.programId  ?? null,
      durationMonths:   input.durationMonths ?? null,
      academicYearLabel: input.academicYearLabel ?? null,
      isActive: true,
    },
  });
  if (existing) {
    throw new Error(
      'An active tuition configuration already exists for this combination. ' +
      'Deactivate the existing one before creating a new one.'
    );
  }

  const config = await prisma.tuitionConfiguration.create({
    data: {
      academicContext:   input.academicContext,
      departmentId:      input.departmentId,
      programId:         input.programId    ?? null,
      durationMonths:    input.durationMonths ?? null,
      academicYearLabel: input.academicYearLabel ?? null,
      monthlyAmount:     input.monthlyAmount,
      effectiveDate:     input.effectiveDate ?? new Date(),
      description:       input.description  ?? null,
      createdByUserId:   input.createdByUserId,
      isActive: true,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      program:    { select: { id: true, name: true, code: true } },
    },
  });

  return config;
}

export async function updateConfig(id: string, input: UpdateConfigInput) {
  const existing = await prisma.tuitionConfiguration.findUnique({ where: { id } });
  if (!existing) throw new Error('Tuition configuration not found.');

  const updated = await prisma.tuitionConfiguration.update({
    where: { id },
    data: {
      ...(input.monthlyAmount    !== undefined && { monthlyAmount:    input.monthlyAmount }),
      ...(input.isActive         !== undefined && { isActive:         input.isActive }),
      ...(input.description      !== undefined && { description:      input.description }),
      ...(input.academicYearLabel !== undefined && { academicYearLabel: input.academicYearLabel }),
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      program:    { select: { id: true, name: true, code: true } },
    },
  });

  return updated;
}

export async function deleteConfig(id: string) {
  const existing = await prisma.tuitionConfiguration.findUnique({ where: { id } });
  if (!existing) throw new Error('Tuition configuration not found.');

  // Check if any installments reference this config
  const installmentCount = await prisma.monthlyInstallment.count({
    where: { tuitionConfigId: id },
  });
  if (installmentCount > 0) {
    // Soft-delete: deactivate rather than delete
    await prisma.tuitionConfiguration.update({
      where: { id },
      data: { isActive: false },
    });
    return { deleted: false, deactivated: true, message: 'Configuration deactivated (has existing installments). Historical records preserved.' };
  }

  await prisma.tuitionConfiguration.delete({ where: { id } });
  return { deleted: true, deactivated: false, message: 'Configuration deleted.' };
}

/**
 * Find the best matching active tuition configuration for a given student record.
 * Matching priority: most specific (programId + durationMonths) → dept only.
 */
export async function findApplicableConfig(opts: {
  academicContext: ProgramType;
  departmentId: string;
  programId: string;
  durationMonths: number | null;
}): Promise<{ id: string; monthlyAmount: number } | null> {
  // Try most specific first: programId + durationMonths
  if (opts.durationMonths) {
    const cfg = await prisma.tuitionConfiguration.findFirst({
      where: {
        isActive:       true,
        academicContext: opts.academicContext,
        departmentId:   opts.departmentId,
        programId:      opts.programId,
        durationMonths: opts.durationMonths,
      },
      select: { id: true, monthlyAmount: true },
    });
    if (cfg) return cfg;
  }

  // Try programId without durationMonths
  const cfg2 = await prisma.tuitionConfiguration.findFirst({
    where: {
      isActive:       true,
      academicContext: opts.academicContext,
      departmentId:   opts.departmentId,
      programId:      opts.programId,
      durationMonths: null,
    },
    select: { id: true, monthlyAmount: true },
  });
  if (cfg2) return cfg2;

  // Fall back: department-level (any program, any duration)
  const cfg3 = await prisma.tuitionConfiguration.findFirst({
    where: {
      isActive:       true,
      academicContext: opts.academicContext,
      departmentId:   opts.departmentId,
      programId:      null,
    },
    select: { id: true, monthlyAmount: true },
  });

  return cfg3 ?? null;
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

