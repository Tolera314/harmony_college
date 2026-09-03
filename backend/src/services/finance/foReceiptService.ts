import { prisma } from '../../lib/prisma';

// ── Payment method detection ───────────────────────────────────────────────────
function detectPaymentMethod(
  description: string | null,
  category: string | null,
  referenceId: string | null,
): string {
  const h   = `${description ?? ''} ${category ?? ''} ${referenceId ?? ''}`.toLowerCase();
  const ref = (referenceId ?? '').toUpperCase();

  if (h.includes('cash')                      || ref.startsWith('CASH')) return 'Cash';
  if (h.includes('telebirr')                  || ref.startsWith('TLB'))  return 'Telebirr';
  if (h.includes('chapa')                     || ref.startsWith('CHP'))  return 'Chapa';
  if (h.includes('bank') || h.includes('bt-') || ref.startsWith('BT-')
      || h.includes('cbe') || h.includes('awash') || h.includes('coop')) return 'Bank Transfer';
  if (referenceId) return 'Bank Transfer';   // has a reference → likely electronic
  return 'Cash';
}

// ── List receipts ─────────────────────────────────────────────────────────────

export async function listReceipts(params: {
  search?: string;
  page?:   number;
  limit?:  number;
}) {
  const page  = Math.max(1, params.page  || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip  = (page - 1) * limit;

  const where: any = {
    receiptId: { not: null },
    status:    'POSTED',
  };

  if (params.search) {
    where.OR = [
      { receiptId:   { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
      { referenceId: { contains: params.search, mode: 'insensitive' } },
      {
        financialAccount: {
          studentRecord: {
            user: { fullName: { contains: params.search, mode: 'insensitive' } },
          },
        },
      },
      {
        financialAccount: {
          studentRecord: {
            studentId: { contains: params.search, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  const [total, sumAgg, digitalCount, transactions] = await Promise.all([
    prisma.financialTransaction.count({ where }),
    prisma.financialTransaction.aggregate({
      where,
      _sum: { amount: true },
    }),
    prisma.financialTransaction.count({
      where: {
        ...where,
        OR: [
          { referenceId: { not: null } },
          { category: { in: ['Telebirr', 'Chapa', 'Bank Transfer', 'Electronic'] } },
          { description: { contains: 'telebirr', mode: 'insensitive' } },
          { description: { contains: 'chapa', mode: 'insensitive' } },
          { description: { contains: 'bank', mode: 'insensitive' } },
        ],
      },
    }),
    prisma.financialTransaction.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { transactionDate: 'desc' },
      include: {
        financialAccount: {
          include: {
            studentRecord: {
              include: {
                user:       { select: { fullName: true, email: true, phone: true } },
                program:    { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const totalAmount = Math.abs(sumAgg._sum.amount ?? 0);
  const digital = Math.min(total, digitalCount);
  const printed = Math.max(0, total - digital);

  const receipts = transactions.map((tx) => {
    const student = tx.financialAccount.studentRecord;
    const amount  = Math.abs(tx.amount);
    const dateObj = new Date(tx.transactionDate);
    const method  = detectPaymentMethod(tx.description, tx.category, tx.referenceId);
    const isDigital = method !== 'Cash';

    return {
      id:                  tx.id,
      receiptNumber:       tx.receiptId ?? `REC-${tx.id.slice(0, 8).toUpperCase()}`,
      studentId:           student.studentId ?? '',
      studentName:         student.user.fullName,
      studentProgramName:  student.program?.name ?? 'Undergraduate Degree',
      amount,
      paymentMethod:       method,
      referenceNumber:     tx.referenceId ?? 'N/A',
      cashierId:           'FO-001',
      cashierName:         'Finance Officer',
      date:                dateObj.toISOString().split('T')[0],
      time:                dateObj.toTimeString().slice(0, 5),
      description:         tx.description,
      items:               [{ label: tx.category ?? 'Tuition Payment', amount }],
      qrCode:              `HC-VERIFY-${tx.receiptId ?? tx.id}`,
      printed:             !isDigital,
      shared:              isDigital,
    };
  });

  return {
    total,
    totalAmount,
    printedCount: printed,
    digitalCount: digital,
    stats: {
      totalReceipts: total,
      totalAmount,
      printedCount: printed,
      digitalCount: digital,
    },
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    receipts,
  };
}

// ── Get receipt detail ────────────────────────────────────────────────────────

export async function getReceiptDetail(idOrReceiptNumber: string) {
  const tx = await prisma.financialTransaction.findFirst({
    where: {
      OR:     [{ id: idOrReceiptNumber }, { receiptId: idOrReceiptNumber }],
      status: 'POSTED',
    },
    include: {
      financialAccount: {
        include: {
          studentRecord: {
            include: {
              user:       { select: { fullName: true, email: true, phone: true } },
              program:    { select: { name: true } },
              department: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!tx) throw new Error('Receipt not found');

  const student = tx.financialAccount.studentRecord;
  const amount  = Math.abs(tx.amount);
  const dateObj = new Date(tx.transactionDate);
  const method = detectPaymentMethod(tx.description, tx.category, tx.referenceId);
  const isDigital = method !== 'Cash';

  return {
    id:                  tx.id,
    receiptNumber:       tx.receiptId ?? `REC-${tx.id.slice(0, 8).toUpperCase()}`,
    studentId:           student.studentId ?? '',
    studentName:         student.user.fullName,
    studentProgramName:  student.program?.name ?? 'Undergraduate Degree',
    amount,
    paymentMethod:       method,
    referenceNumber:     tx.referenceId ?? 'N/A',
    cashierId:           'FO-001',
    cashierName:         'Finance Officer',
    date:                dateObj.toISOString().split('T')[0],
    time:                dateObj.toTimeString().slice(0, 5),
    description:         tx.description,
    items:               [{ label: tx.category ?? 'Tuition Payment', amount }],
    qrCode:              `HC-VERIFY-${tx.receiptId ?? tx.id}`,
    printed:             !isDigital,
    shared:              isDigital,
  };
}
