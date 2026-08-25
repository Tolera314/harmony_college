import { prisma } from '../../lib/prisma';

export interface ListAccountsQueryParams {
  search?: string;
  departmentId?: string;
  paymentStatus?: string;
  riskLevel?: string;
  page?: number;
  limit?: number;
}

export async function listStudentAccounts(params: ListAccountsQueryParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.search) {
    where.OR = [
      { studentId: { contains: params.search, mode: 'insensitive' } },
      { user: { fullName: { contains: params.search, mode: 'insensitive' } } },
      { user: { email: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  if (params.departmentId) {
    where.departmentId = params.departmentId;
  }

  const [total, students] = await Promise.all([
    prisma.studentRecord.count({ where }),
    prisma.studentRecord.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, code: true } },
        financialAccount: {
          include: {
            transactions: {
              orderBy: { transactionDate: 'desc' },
              take: 5,
            },
          },
        },
      },
    }),
  ]);

  const mapped = students.map((s) => {
    const acc = s.financialAccount;
    const balance = acc ? acc.balance : 0;
    const tuition = 18500;
    const adminFees = 1850;
    const labFees = 0;
    const libraryFines = 0;
    const scholarshipDiscount = balance < 0 ? Math.abs(balance) : 0;
    const outstanding = Math.max(0, balance);

    let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Deferred' = 'Paid';
    if (outstanding > 15000) paymentStatus = 'Overdue';
    else if (outstanding > 5000) paymentStatus = 'Partial';
    else if (outstanding > 0) paymentStatus = 'Unpaid';

    let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    if (outstanding > 20000) riskLevel = 'Critical';
    else if (outstanding > 10000) riskLevel = 'High';
    else if (outstanding > 3000) riskLevel = 'Medium';

    return {
      id: s.id,
      studentRecordId: s.id,
      userId: s.userId,
      studentId: s.studentId,
      name: s.user.fullName,
      email: s.user.email,
      phone: s.user.phone || 'N/A',
      departmentId: s.departmentId,
      departmentName: s.department?.name || 'General',
      programId: s.programId,
      programName: s.program?.name || 'General Degree',
      year: s.yearLevel,
      tuition,
      adminFees,
      labFees,
      libraryFines,
      scholarshipDiscount,
      totalCharged: tuition + adminFees,
      totalPaid: Math.max(0, tuition + adminFees - outstanding),
      outstanding,
      balance,
      clearedForTerm: acc?.clearedForTerm || null,
      paymentStatus,
      riskLevel,
      lastPaymentDate: acc?.transactions.find((t) => t.type === 'PAYMENT')?.transactionDate || null,
      transactions: acc?.transactions || [],
    };
  });

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    accounts: mapped,
  };
}

export async function getStudentAccountDetail(studentRecordId: string) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      department: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true } },
      financialAccount: {
        include: {
          transactions: {
            orderBy: { transactionDate: 'desc' },
          },
        },
      },
    },
  });

  if (!student) throw new Error('Student record not found');

  let account = student.financialAccount;
  if (!account) {
    account = await prisma.financialAccount.create({
      data: {
        studentRecordId: student.id,
        balance: 0,
      },
      include: { transactions: true },
    });
  }

  const balance = account.balance;
  const outstanding = Math.max(0, balance);

  let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Deferred' = 'Paid';
  if (outstanding > 15000) paymentStatus = 'Overdue';
  else if (outstanding > 5000) paymentStatus = 'Partial';
  else if (outstanding > 0) paymentStatus = 'Unpaid';

  let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (outstanding > 20000) riskLevel = 'Critical';
  else if (outstanding > 10000) riskLevel = 'High';
  else if (outstanding > 3000) riskLevel = 'Medium';

  return {
    id: student.id,
    studentRecordId: student.id,
    userId: student.userId,
    studentId: student.studentId,
    name: student.user.fullName,
    email: student.user.email,
    phone: student.user.phone || 'N/A',
    departmentName: student.department?.name || 'General',
    programName: student.program?.name || 'Degree',
    year: student.yearLevel,
    financialAccountId: account.id,
    balance,
    outstanding,
    clearedForTerm: account.clearedForTerm,
    paymentStatus,
    riskLevel,
    transactions: account.transactions,
  };
}

export async function postCharge(
  studentRecordId: string,
  chargeData: { amount: number; description: string; category: string },
  actorUserId: string
) {
  let account = await prisma.financialAccount.findUnique({
    where: { studentRecordId },
  });

  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId, balance: 0 },
    });
  }

  const receiptId = `CHG-${Date.now().toString(36).toUpperCase()}`;

  const [transaction, updatedAccount] = await prisma.$transaction([
    prisma.financialTransaction.create({
      data: {
        financialAccountId: account.id,
        type: chargeData.category === 'Tuition' ? 'TUITION' : 'FEE',
        amount: Math.abs(chargeData.amount),
        description: chargeData.description,
        category: chargeData.category || 'Fee',
        receiptId,
        status: 'POSTED',
      },
    }),
    prisma.financialAccount.update({
      where: { id: account.id },
      data: {
        balance: account.balance + Math.abs(chargeData.amount),
        lastUpdatedAt: new Date(),
      },
    }),
  ]);

  return { transaction, account: updatedAccount };
}

export async function postCredit(
  studentRecordId: string,
  creditData: { amount: number; description: string; category: string },
  actorUserId: string
) {
  let account = await prisma.financialAccount.findUnique({
    where: { studentRecordId },
  });

  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId, balance: 0 },
    });
  }

  const receiptId = `CRD-${Date.now().toString(36).toUpperCase()}`;

  const [transaction, updatedAccount] = await prisma.$transaction([
    prisma.financialTransaction.create({
      data: {
        financialAccountId: account.id,
        type: creditData.category === 'Scholarship' ? 'SCHOLARSHIP' : 'GRANT',
        amount: -Math.abs(creditData.amount),
        description: creditData.description,
        category: creditData.category || 'Scholarship',
        receiptId,
        status: 'POSTED',
      },
    }),
    prisma.financialAccount.update({
      where: { id: account.id },
      data: {
        balance: account.balance - Math.abs(creditData.amount),
        lastUpdatedAt: new Date(),
      },
    }),
  ]);

  return { transaction, account: updatedAccount };
}

export async function updateAccountClearance(
  studentRecordId: string,
  clearanceData: { clearedForTerm: string | null },
  actorUserId: string
) {
  let account = await prisma.financialAccount.findUnique({
    where: { studentRecordId },
  });

  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId, balance: 0 },
    });
  }

  const updated = await prisma.financialAccount.update({
    where: { id: account.id },
    data: {
      clearedForTerm: clearanceData.clearedForTerm,
      lastUpdatedAt: new Date(),
    },
  });

  return updated;
}
