import { prisma } from '../../lib/prisma';

export async function listReceipts(params: { search?: string; paymentMethod?: string; page?: number; limit?: number }) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {
    receiptId: { not: null },
  };

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { receiptId: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { referenceId: { contains: q, mode: 'insensitive' } },
      {
        financialAccount: {
          studentRecord: {
            OR: [
              { studentId: { contains: q, mode: 'insensitive' } },
              { user: { fullName: { contains: q, mode: 'insensitive' } } },
            ],
          },
        },
      },
    ];
  }

  const [total, transactions, allReceiptTxs] = await Promise.all([
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
    prisma.financialTransaction.findMany({
      where: { receiptId: { not: null } },
      select: { amount: true },
    }),
  ]);

  const totalAmount = allReceiptTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const receipts = transactions.map((tx) => {
    const student = tx.financialAccount.studentRecord;
    const amount = Math.abs(tx.amount);
    const dateObj = new Date(tx.transactionDate);

    // Determine payment method from description or referenceId
    let paymentMethod = 'Cash';
    const descLower = (tx.description || '').toLowerCase();
    if (descLower.includes('telebirr') || tx.referenceId?.toLowerCase().startsWith('tb')) {
      paymentMethod = 'Telebirr';
    } else if (descLower.includes('chapa') || tx.referenceId?.toLowerCase().startsWith('chp')) {
      paymentMethod = 'Chapa';
    } else if (descLower.includes('bank') || tx.referenceId?.toLowerCase().includes('cbe')) {
      paymentMethod = 'Bank Transfer';
    }

    return {
      id: tx.id,
      receiptNumber: tx.receiptId || `REC-${tx.id.slice(0, 8).toUpperCase()}`,
      studentId: student.studentId,
      studentName: student.user.fullName,
      studentProgramName: student.program?.name || student.department?.name || 'Degree Program',
      amount,
      paymentMethod,
      referenceNumber: tx.referenceId || 'N/A',
      cashierId: 'FO-001',
      cashierName: 'Finance Office',
      date: dateObj.toISOString().split('T')[0],
      time: dateObj.toTimeString().split(' ')[0].slice(0, 5),
      description: tx.description,
      items: [
        { label: tx.category || 'Tuition / College Fee Payment', amount },
      ],
      qrCode: `HC-VERIFY-${tx.receiptId || tx.id}`,
      printed: true,
      shared: false,
    };
  });

  // Optional in-memory filter if paymentMethod is specified
  let filteredReceipts = receipts;
  if (params.paymentMethod && params.paymentMethod !== 'All') {
    filteredReceipts = receipts.filter(r => r.paymentMethod.toLowerCase() === params.paymentMethod!.toLowerCase());
  }

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalAmount,
    receipts: filteredReceipts,
  };
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

  let paymentMethod = 'Cash';
  const descLower = (tx.description || '').toLowerCase();
  if (descLower.includes('telebirr') || tx.referenceId?.toLowerCase().startsWith('tb')) {
    paymentMethod = 'Telebirr';
  } else if (descLower.includes('chapa') || tx.referenceId?.toLowerCase().startsWith('chp')) {
    paymentMethod = 'Chapa';
  } else if (descLower.includes('bank') || tx.referenceId?.toLowerCase().includes('cbe')) {
    paymentMethod = 'Bank Transfer';
  }

  return {
    id: tx.id,
    receiptNumber: tx.receiptId || `REC-${tx.id.slice(0, 8).toUpperCase()}`,
    studentId: student.studentId,
    studentName: student.user.fullName,
    studentProgramName: student.program?.name || student.department?.name || 'Degree Program',
    amount,
    paymentMethod,
    referenceNumber: tx.referenceId || 'N/A',
    cashierId: 'FO-001',
    cashierName: 'Finance Office',
    date: dateObj.toISOString().split('T')[0],
    time: dateObj.toTimeString().split(' ')[0].slice(0, 5),
    description: tx.description,
    items: [
      { label: tx.category || 'Tuition / College Fee Payment', amount },
    ],
    qrCode: `HC-VERIFY-${tx.receiptId || tx.id}`,
    printed: true,
    shared: false,
  };
}

