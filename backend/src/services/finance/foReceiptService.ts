import { prisma } from '../../lib/prisma';

export async function listReceipts(params: { search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {
    receiptId: { not: null },
  };

  if (params.search) {
    where.OR = [
      { receiptId: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
      { referenceId: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [total, transactions] = await Promise.all([
    prisma.financialTransaction.count({ where }),
    prisma.financialTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { transactionDate: 'desc' },
      include: {
        financialAccount: {
          include: {
            studentRecord: {
              include: {
                user: { select: { fullName: true, email: true, phone: true } },
                program: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const receipts = transactions.map((tx) => {
    const student = tx.financialAccount.studentRecord;
    const amount = Math.abs(tx.amount);
    const dateObj = new Date(tx.transactionDate);

    return {
      id: tx.id,
      receiptNumber: tx.receiptId || `REC-${tx.id.slice(0, 8).toUpperCase()}`,
      studentId: student.studentId,
      studentName: student.user.fullName,
      studentProgramName: student.program?.name || 'Undergraduate Degree',
      amount,
      paymentMethod: tx.referenceId ? 'Telebirr' : 'Cash',
      referenceNumber: tx.referenceId || 'N/A',
      cashierId: 'FO-001',
      cashierName: 'Finance Officer',
      date: dateObj.toISOString().split('T')[0],
      time: dateObj.toTimeString().split(' ')[0].slice(0, 5),
      description: tx.description,
      items: [
        { label: tx.category || 'Tuition Payment', amount },
      ],
      qrCode: `HC-VERIFY-${tx.receiptId || tx.id}`,
      printed: true,
      shared: false,
    };
  });

  return { total, page, limit, totalPages: Math.ceil(total / limit), receipts };
}

export async function getReceiptDetail(idOrReceiptNumber: string) {
  const tx = await prisma.financialTransaction.findFirst({
    where: {
      OR: [{ id: idOrReceiptNumber }, { receiptId: idOrReceiptNumber }],
    },
    include: {
      financialAccount: {
        include: {
          studentRecord: {
            include: {
              user: { select: { fullName: true, email: true, phone: true } },
              program: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!tx) throw new Error('Receipt not found');

  const student = tx.financialAccount.studentRecord;
  const amount = Math.abs(tx.amount);
  const dateObj = new Date(tx.transactionDate);

  return {
    id: tx.id,
    receiptNumber: tx.receiptId || `REC-${tx.id.slice(0, 8).toUpperCase()}`,
    studentId: student.studentId,
    studentName: student.user.fullName,
    studentProgramName: student.program?.name || 'Undergraduate Degree',
    amount,
    paymentMethod: tx.referenceId ? 'Telebirr' : 'Cash',
    referenceNumber: tx.referenceId || 'N/A',
    cashierId: 'FO-001',
    cashierName: 'Finance Officer',
    date: dateObj.toISOString().split('T')[0],
    time: dateObj.toTimeString().split(' ')[0].slice(0, 5),
    description: tx.description,
    items: [
      { label: tx.category || 'Tuition Payment', amount },
    ],
    qrCode: `HC-VERIFY-${tx.receiptId || tx.id}`,
    printed: true,
    shared: false,
  };
}
