import { prisma } from '../../lib/prisma';

export async function writeHRAudit(params: {
  actorUserId?: string;
  actorName: string;
  action: string;
  employeeName?: string;
  module: string;
  description: string;
  status?: 'SUCCESS' | 'WARNING' | 'FAILED';
  metadata?: Record<string, unknown>;
}) {
  return prisma.hRAuditLog.create({
    data: {
      actorUserId:  params.actorUserId ?? null,
      actorName:    params.actorName,
      action:       params.action,
      employeeName: params.employeeName ?? 'All Staff',
      module:       params.module,
      description:  params.description,
      status:       params.status ?? 'SUCCESS',
      metadata:     params.metadata as any ?? null,
    },
  });
}

export async function listAuditLogs(q: {
  page: number; limit: number;
  search?: string; module?: string;
}) {
  const { page, limit, search, module: mod } = q;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (mod && mod !== 'All') where.module = mod;
  if (search) {
    where.OR = [
      { action:       { contains: search, mode: 'insensitive' } },
      { employeeName: { contains: search, mode: 'insensitive' } },
      { description:  { contains: search, mode: 'insensitive' } },
      { actorName:    { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.hRAuditLog.count({ where }),
    prisma.hRAuditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), logs };
}
