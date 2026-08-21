import { prisma } from '../../lib/prisma';
import { writeHRAudit } from './hrAuditService';

export async function listDocuments(q: { search?: string; category?: string; employeeId?: string }) {
  const { search, category, employeeId } = q;
  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (category && category !== 'All') where.category = category;
  if (search) {
    where.OR = [
      { title:    { contains: search, mode: 'insensitive' } },
      { employee: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return prisma.hRDocument.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
    include: {
      employee: { select: { id: true, fullName: true, avatarUrl: true, employeeCode: true } },
    },
  });
}

export async function createDocument(data: {
  employeeId: string; category: string; title: string;
  fileUrl?: string; fileSize?: string; uploadedByName: string; uploadedByUserId?: string;
  version?: number;
}, actorName: string, actorUserId?: string) {
  const emp = await prisma.hREmployee.findUnique({ where: { id: data.employeeId }, select: { fullName: true } });
  if (!emp) throw new Error('Employee not found');

  const doc = await prisma.hRDocument.create({
    data: {
      employeeId:       data.employeeId,
      category:         data.category as any,
      title:            data.title,
      fileUrl:          data.fileUrl ?? null,
      fileSize:         data.fileSize ?? null,
      uploadedByName:   data.uploadedByName,
      uploadedByUserId: data.uploadedByUserId ?? null,
      version:          data.version ?? 1,
    },
  });

  await writeHRAudit({
    actorUserId, actorName, action: 'Document Uploaded', employeeName: emp.fullName,
    module: 'Documents',
    description: `${data.category} document "${data.title}" uploaded for ${emp.fullName}.`,
    status: 'SUCCESS',
  });

  return doc;
}

export async function deleteDocument(id: string, actorName: string, actorUserId?: string) {
  const doc = await prisma.hRDocument.findUnique({
    where: { id },
    include: { employee: { select: { fullName: true } } },
  });
  if (!doc) throw new Error('Document not found');

  await prisma.hRDocument.delete({ where: { id } });

  await writeHRAudit({
    actorUserId, actorName, action: 'Document Deleted', employeeName: doc.employee.fullName,
    module: 'Documents',
    description: `Document "${doc.title}" deleted for ${doc.employee.fullName}.`,
    status: 'WARNING',
  });
}
