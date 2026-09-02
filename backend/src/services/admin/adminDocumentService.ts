import { prisma } from '../../lib/prisma';

export interface AdminDocumentItem {
  id: string;
  title: string;
  category: 'STUDENT_ADMISSION' | 'HR_STAFF' | 'FINANCIAL_RECEIPT' | 'INSTITUTIONAL';
  fileUrl: string | null;
  fileType: string;
  fileSizeLabel?: string;
  entityName: string;
  entityId: string;
  description: string;
  uploadedAt: string;
  metadata?: any;
}

export async function getDocumentStats() {
  const [studentProfiles, hrEmployees, financialTransactions] = await Promise.all([
    prisma.studentProfile.findMany({
      select: {
        id: true,
        faydaIdUrl: true,
        transcriptUrl: true,
        profilePictureUrl: true,
      },
    }),
    prisma.hREmployee.count(),
    prisma.financialTransaction.count({
      where: { receiptId: { not: null } },
    }),
  ]);

  let studentDocCount = 0;
  for (const sp of studentProfiles) {
    if (sp.faydaIdUrl) studentDocCount++;
    if (sp.transcriptUrl) studentDocCount++;
    if (sp.profilePictureUrl) studentDocCount++;
  }

  const totalCount = studentDocCount + hrEmployees + financialTransactions;

  return {
    totalDocuments: totalCount,
    studentDocs: studentDocCount,
    hrDocs: hrEmployees,
    financialReceipts: financialTransactions,
    institutionalDocs: 0,
  };
}

export async function listAdminDocuments(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const search = params.search?.toLowerCase();
  const category = params.category;

  const items: AdminDocumentItem[] = [];

  // 1. Student Onboarding Documents
  if (!category || category === 'STUDENT_ADMISSION') {
    const studentProfiles = await prisma.studentProfile.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        selectedDepartment: { select: { code: true } },
      },
      take: 100,
    });

    for (const sp of studentProfiles) {
      const studentName = sp.user?.fullName || 'Student';
      if (search && !studentName.toLowerCase().includes(search) && !sp.user?.email?.toLowerCase().includes(search)) {
        continue;
      }

      if (sp.faydaIdUrl) {
        items.push({
          id: `doc-fayda-${sp.id}`,
          title: `National Fayda ID — ${studentName}`,
          category: 'STUDENT_ADMISSION',
          fileUrl: sp.faydaIdUrl,
          fileType: 'PDF / Image',
          entityName: studentName,
          entityId: sp.id,
          description: `Fayda National Identification Document for ${studentName} (${sp.selectedDepartment?.code ?? 'General'})`,
          uploadedAt: sp.createdAt.toISOString(),
        });
      }

      if (sp.transcriptUrl) {
        items.push({
          id: `doc-transcript-${sp.id}`,
          title: `High School Transcript — ${studentName}`,
          category: 'STUDENT_ADMISSION',
          fileUrl: sp.transcriptUrl,
          fileType: 'PDF',
          entityName: studentName,
          entityId: sp.id,
          description: `Official High School Transcript & Examination Results for ${studentName}`,
          uploadedAt: sp.createdAt.toISOString(),
        });
      }

      if (sp.profilePictureUrl) {
        items.push({
          id: `doc-photo-${sp.id}`,
          title: `ID Photograph — ${studentName}`,
          category: 'STUDENT_ADMISSION',
          fileUrl: sp.profilePictureUrl,
          fileType: 'JPG / PNG',
          entityName: studentName,
          entityId: sp.id,
          description: `Official Student ID Card Passport Photo for ${studentName}`,
          uploadedAt: sp.createdAt.toISOString(),
        });
      }
    }
  }

  // 2. HR Staff Documents
  if (!category || category === 'HR_STAFF') {
    const employees = await prisma.hREmployee.findMany({
      include: {
        department: { select: { name: true } },
      },
      take: 100,
    });

    for (const emp of employees) {
      if (search && !emp.fullName.toLowerCase().includes(search) && !emp.employeeCode.toLowerCase().includes(search)) {
        continue;
      }

      items.push({
        id: `doc-hr-${emp.id}`,
        title: `Employment Contract & File — ${emp.fullName}`,
        category: 'HR_STAFF',
        fileUrl: emp.avatarUrl || null,
        fileType: 'PDF Document',
        entityName: emp.fullName,
        entityId: emp.employeeCode,
        description: `Official Staff Contract & Personnel File for ${emp.position} (${emp.department?.name ?? 'HR'})`,
        uploadedAt: emp.hireDate ? emp.hireDate.toISOString() : emp.createdAt.toISOString(),
        metadata: {
          employmentType: emp.employmentType,
          status: emp.status,
        },
      });
    }
  }

  // 3. Financial Receipts
  if (!category || category === 'FINANCIAL_RECEIPT') {
    const receipts = await prisma.financialTransaction.findMany({
      where: { receiptId: { not: null } },
      include: {
        financialAccount: {
          include: {
            studentRecord: {
              include: { user: { select: { fullName: true } } },
            },
          },
        },
      },
      take: 100,
      orderBy: { transactionDate: 'desc' },
    });

    for (const r of receipts) {
      const studentName = r.financialAccount?.studentRecord?.user?.fullName || 'Student Account';
      if (search && !studentName.toLowerCase().includes(search) && !r.receiptId?.toLowerCase().includes(search)) {
        continue;
      }

      items.push({
        id: `doc-receipt-${r.id}`,
        title: `Receipt ${r.receiptId} — ${studentName}`,
        category: 'FINANCIAL_RECEIPT',
        fileUrl: null, // printable receipt generated dynamically
        fileType: 'Payment Receipt',
        entityName: studentName,
        entityId: r.receiptId || r.id,
        description: `${r.description} (Amount: ETB ${Math.abs(r.amount).toLocaleString()})`,
        uploadedAt: r.transactionDate.toISOString(),
        metadata: {
          receiptId: r.receiptId,
          amount: r.amount,
          type: r.type,
          referenceId: r.referenceId,
        },
      });
    }
  }

  // Sort by date descending
  items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = items.slice((page - 1) * limit, page * limit);

  return {
    total,
    page,
    limit,
    totalPages,
    documents: paginated,
  };
}
