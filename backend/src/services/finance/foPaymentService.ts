import { prisma } from '../../lib/prisma';

const PROFILE_SELECT = {
  userId: true,
  registrationFeePaid: true,
  registrationFeePaidAt: true,
  departmentSelected: true,
  paymentVerifiedByFinance: true,
  paymentVerifiedAt: true,
  paymentVerifiedByUserId: true,
  selectedDepartmentId: true,
  createdAt: true,
  user: {
    select: {
      id: true, fullName: true, email: true, phone: true, createdAt: true,
      application: {
        select: {
          registrationScreenshotUrl: true,
          screenshotUploadedAt:      true,
          onboardingStatus:          true,
          program:                   true,
        },
      },
    },
  },
  selectedDepartment: {
    select: { id: true, name: true, code: true },
  },
} as const;

export async function getPendingRegistrationPayments(query: Record<string, string | undefined>) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));
  const skip = (page - 1) * limit;
  const search = typeof query.search === 'string' ? query.search : undefined;

  const where: any = {
    registrationFeePaid: true,
    paymentVerifiedByFinance: false,
  };
  if (search) {
    where.user = {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [total, profiles] = await Promise.all([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { registrationFeePaidAt: 'desc' },
      select: PROFILE_SELECT,
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), payments: profiles };
}

export async function getVerifiedRegistrationPayments(query: Record<string, string | undefined>) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10) || 20));
  const skip = (page - 1) * limit;
  const search = typeof query.search === 'string' ? query.search : undefined;

  const where: any = { paymentVerifiedByFinance: true };
  if (search) {
    where.user = {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [total, profiles] = await Promise.all([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paymentVerifiedAt: 'desc' },
      select: PROFILE_SELECT,
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), payments: profiles };
}

export async function verifyRegistrationPayment(userId: string, verifierUserId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Student profile not found. Student has not completed onboarding.');
  if (!profile.registrationFeePaid) throw new Error('Student has not submitted their registration fee payment yet.');
  if (profile.paymentVerifiedByFinance) throw new Error('Payment is already verified.');

  const updated = await prisma.studentProfile.update({
    where: { userId },
    data: {
      paymentVerifiedByFinance: true,
      paymentVerifiedAt: new Date(),
      paymentVerifiedByUserId: verifierUserId,
    },
    select: PROFILE_SELECT,
  });

  try {
    await prisma.notification.create({
      data: {
        userId,
        title: 'Payment Verified ✓',
        message: "Your registration fee payment has been verified by the Finance Office. You now appear in the Registrar's admissions queue.",
        type: 'SUCCESS',
      },
    });
  } catch { /* ignore notification errors */ }

  return updated;
}

export async function unverifyRegistrationPayment(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('Student profile not found.');

  const updated = await prisma.studentProfile.update({
    where: { userId },
    data: {
      paymentVerifiedByFinance: false,
      paymentVerifiedAt: null,
      paymentVerifiedByUserId: null,
    },
    select: PROFILE_SELECT,
  });

  return updated;
}

export async function recordStudentPayment(
  paymentData: {
    studentRecordId: string;
    amount: number;
    paymentMethod: 'Cash' | 'Bank Transfer' | 'Telebirr' | 'Chapa';
    referenceNumber?: string;
    description?: string;
    category?: string;
  },
  cashierUserId: string
) {
  let account = await prisma.financialAccount.findUnique({
    where: { studentRecordId: paymentData.studentRecordId },
    include: { studentRecord: true },
  });

  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId: paymentData.studentRecordId, balance: 0 },
      include: { studentRecord: true },
    });
  }

  const receiptId = `REC-${Date.now().toString(36).toUpperCase()}`;

  const [transaction, updatedAccount] = await prisma.$transaction([
    prisma.financialTransaction.create({
      data: {
        financialAccountId: account.id,
        type: 'PAYMENT',
        amount: -Math.abs(paymentData.amount),
        description: paymentData.description || `Payment via ${paymentData.paymentMethod}`,
        category: paymentData.category || 'Tuition',
        receiptId,
        referenceId: paymentData.referenceNumber || null,
        status: 'POSTED',
      },
    }),
    prisma.financialAccount.update({
      where: { id: account.id },
      data: {
        balance: account.balance - Math.abs(paymentData.amount),
        lastUpdatedAt: new Date(),
      },
    }),
  ]);

  if (account.studentRecord?.userId) {
    try {
      await prisma.notification.create({
        data: {
          userId: account.studentRecord.userId,
          title: 'Payment Received ✓',
          message: `Payment of ETB ${paymentData.amount.toLocaleString()} received via ${paymentData.paymentMethod}. Receipt ID: ${receiptId}`,
          type: 'SUCCESS',
        },
      });
    } catch { /* ignore notification errors */ }
  }

  return { transaction, account: updatedAccount, receiptId };
}

export async function listTransactions(params: {
  search?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { description: { contains: params.search, mode: 'insensitive' } },
      { receiptId: { contains: params.search, mode: 'insensitive' } },
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
                user: { select: { fullName: true, email: true } },
                program: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return { total, page, limit, totalPages: Math.ceil(total / limit), transactions };
}

export async function reverseTransaction(transactionId: string, reason: string, actorUserId: string) {
  const tx = await prisma.financialTransaction.findUnique({
    where: { id: transactionId },
    include: { financialAccount: true },
  });

  if (!tx) throw new Error('Transaction not found');
  if (tx.status === 'REVERSED') throw new Error('Transaction is already reversed');

  const reversalEffect = -tx.amount;

  const [updatedTx, updatedAccount] = await prisma.$transaction([
    prisma.financialTransaction.update({
      where: { id: transactionId },
      data: { status: 'REVERSED' },
    }),
    prisma.financialAccount.update({
      where: { id: tx.financialAccountId },
      data: {
        balance: tx.financialAccount.balance + reversalEffect,
        lastUpdatedAt: new Date(),
      },
    }),
  ]);

  return { transaction: updatedTx, account: updatedAccount };
}
