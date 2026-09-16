import { prisma } from '../../lib/prisma';

export interface ListAccountsQueryParams {
  search?: string;
  departmentId?: string;
  paymentStatus?: string;
  riskLevel?: string;
  page?: number;
  limit?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function derivePaymentStatus(
  outstanding: number,
  totalCharged: number,
  lastPaymentDate: Date | null,
): 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Deferred' {
  if (outstanding <= 0) return 'Paid';
  if (totalCharged <= 0) return 'Unpaid';
  const now = new Date();
  const daysSinceLastPayment = lastPaymentDate
    ? Math.floor((now.getTime() - lastPaymentDate.getTime()) / 86400000)
    : 9999;
  if (outstanding >= totalCharged && daysSinceLastPayment > 30) return 'Overdue';
  if (outstanding > 0 && daysSinceLastPayment > 60) return 'Overdue';
  if (outstanding > 0 && outstanding < totalCharged) return 'Partial';
  return 'Unpaid';
}

function deriveRiskLevel(
  outstanding: number,
  totalCharged: number,
): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (outstanding <= 0) return 'Low';
  const ratio = totalCharged > 0 ? outstanding / totalCharged : 1;
  if (ratio >= 1 || outstanding > 20000) return 'Critical';
  if (ratio > 0.6 || outstanding > 10000) return 'High';
  if (ratio > 0.3 || outstanding > 3000) return 'Medium';
  return 'Low';
}

// ── List student accounts ─────────────────────────────────────────────────────

export async function listStudentAccounts(params: ListAccountsQueryParams) {
  const page  = Math.max(1, params.page  || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip  = (page - 1) * limit;

  const where: any = {};

  if (params.search) {
    where.OR = [
      { studentId: { contains: params.search, mode: 'insensitive' } },
      { user: { fullName: { contains: params.search, mode: 'insensitive' } } },
      { user: { email:    { contains: params.search, mode: 'insensitive' } } },
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
        user:       { select: { id: true, fullName: true, email: true, phone: true } },
        department: { select: { id: true, name: true, code: true } },
        program:    { select: { id: true, name: true, code: true } },
        financialAccount: {
          include: {
            transactions: {
              where:   { status: { not: 'REVERSED' } },
              orderBy: { transactionDate: 'desc' },
            },
          },
        },
      },
    }),
  ]);

  const mapped = students.map((s) => {
    const acc  = s.financialAccount;
    const txns = acc?.transactions ?? [];

    // Derive real totals from actual transactions
    const totalCharged = txns
      .filter((t) => t.type === 'TUITION' || t.type === 'FEE')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalPaid = txns
      .filter((t) => t.type === 'PAYMENT' && t.status === 'POSTED')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const scholarshipDiscount = txns
      .filter((t) => t.type === 'SCHOLARSHIP' || t.type === 'GRANT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Use account balance as authoritative outstanding (maintained by all operations)
    const balance     = acc?.balance ?? 0;
    const outstanding = Math.max(0, balance);

    const lastPaymentTx = txns.find((t) => t.type === 'PAYMENT' && t.status === 'POSTED');
    const lastPaymentDate = lastPaymentTx?.transactionDate ?? null;

    const paymentStatus = params.paymentStatus as any
      ?? derivePaymentStatus(outstanding, totalCharged, lastPaymentDate);
    const riskLevel     = deriveRiskLevel(outstanding, totalCharged);

    // Filter by paymentStatus if requested
    if (
      params.paymentStatus &&
      params.paymentStatus !== 'All' &&
      derivePaymentStatus(outstanding, totalCharged, lastPaymentDate) !== params.paymentStatus
    ) {
      return null; // filtered out
    }

    // Filter by riskLevel if requested
    if (
      params.riskLevel &&
      params.riskLevel !== 'All' &&
      riskLevel !== params.riskLevel
    ) {
      return null;
    }

    return {
      id:               s.id,
      studentRecordId:  s.id,
      userId:           s.userId,
      studentId:        s.studentId ?? '',
      name:             s.user.fullName,
      email:            s.user.email ?? '',
      phone:            s.user.phone || 'N/A',
      departmentId:     s.departmentId ?? '',
      departmentName:   s.department?.name || 'General',
      programId:        s.programId ?? '',
      programName:      s.program?.name || 'General Degree',
      year:             s.yearLevel ?? 1,
      tuition:          totalCharged,
      adminFees:        0,
      labFees:          0,
      libraryFines:     0,
      otherCharges:     0,
      scholarshipDiscount,
      totalCharged:     totalCharged,
      totalPaid:        totalPaid,
      outstanding,
      balance,
      clearedForTerm:   acc?.clearedForTerm || null,
      paymentStatus:    derivePaymentStatus(outstanding, totalCharged, lastPaymentDate),
      riskLevel,
      daysOverdue:      lastPaymentDate
        ? Math.max(0, Math.floor((Date.now() - lastPaymentDate.getTime()) / 86400000) - 30)
        : outstanding > 0 ? 60 : 0,
      lastPaymentDate:  lastPaymentDate ? lastPaymentDate.toISOString().split('T')[0] : null,
      installmentPlan:  false,
      transactions:     acc?.transactions || [],
    };
  });

  const filtered = mapped.filter(Boolean);

  return {
    total:      filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
    accounts:   filtered,
  };
}

// ── Get single student account detail ────────────────────────────────────────

export async function getStudentAccountDetail(studentRecordId: string) {
  const student = await prisma.studentRecord.findUnique({
    where:   { id: studentRecordId },
    include: {
      user:       { select: { id: true, fullName: true, email: true, phone: true } },
      department: { select: { id: true, name: true, code: true } },
      program:    { select: { id: true, name: true, code: true } },
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
      data:    { studentRecordId: student.id, balance: 0 },
      include: { transactions: true },
    });
  }

  const txns = account.transactions.filter((t) => t.status !== 'REVERSED');

  const totalCharged = txns
    .filter((t) => t.type === 'TUITION' || t.type === 'FEE')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalPaid = txns
    .filter((t) => t.type === 'PAYMENT' && t.status === 'POSTED')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const scholarshipDiscount = txns
    .filter((t) => t.type === 'SCHOLARSHIP' || t.type === 'GRANT')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const balance     = account.balance;
  const outstanding = Math.max(0, balance);

  const lastPaymentTx = txns.find((t) => t.type === 'PAYMENT' && t.status === 'POSTED');

  return {
    id:               student.id,
    studentRecordId:  student.id,
    userId:           student.userId,
    studentId:        student.studentId ?? '',
    name:             student.user.fullName,
    email:            student.user.email ?? '',
    phone:            student.user.phone || 'N/A',
    departmentName:   student.department?.name || 'General',
    programName:      student.program?.name || 'Degree',
    year:             student.yearLevel ?? 1,
    financialAccountId: account.id,
    totalCharged,
    totalPaid,
    scholarshipDiscount,
    balance,
    outstanding,
    clearedForTerm:   account.clearedForTerm,
    paymentStatus:    derivePaymentStatus(outstanding, totalCharged, lastPaymentTx?.transactionDate ?? null),
    riskLevel:        deriveRiskLevel(outstanding, totalCharged),
    lastPaymentDate:  lastPaymentTx?.transactionDate?.toISOString().split('T')[0] ?? null,
    transactions:     account.transactions,
  };
}

// ── Post charge ──────────────────────────────────────────────────────────────

export async function postCharge(
  studentRecordId: string,
  chargeData: { amount: number; description: string; category: string },
  actorUserId: string,
) {
  let account = await prisma.financialAccount.findUnique({ where: { studentRecordId } });

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
        type:               chargeData.category === 'Tuition' ? 'TUITION' : 'FEE',
        amount:             Math.abs(chargeData.amount),   // positive = charge
        description:        chargeData.description,
        category:           chargeData.category || 'Fee',
        receiptId,
        status:             'POSTED',
      },
    }),
    prisma.financialAccount.update({
      where: { id: account.id },
      data:  {
        balance:       account.balance + Math.abs(chargeData.amount),
        lastUpdatedAt: new Date(),
      },
    }),
  ]);

  return { transaction, account: updatedAccount };
}

// ── Post credit (scholarship/discount) ───────────────────────────────────────

export async function postCredit(
  studentRecordId: string,
  creditData: { amount: number; description: string; category: string },
  actorUserId: string,
) {
  let account = await prisma.financialAccount.findUnique({ where: { studentRecordId } });

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
        type:               creditData.category === 'Scholarship' ? 'SCHOLARSHIP' : 'GRANT',
        amount:             -Math.abs(creditData.amount),   // negative = credit
        description:        creditData.description,
        category:           creditData.category || 'Scholarship',
        receiptId,
        status:             'POSTED',
      },
    }),
    prisma.financialAccount.update({
      where: { id: account.id },
      data:  {
        balance:       account.balance - Math.abs(creditData.amount),
        lastUpdatedAt: new Date(),
      },
    }),
  ]);

  return { transaction, account: updatedAccount };
}

// ── Update clearance ──────────────────────────────────────────────────────────

export async function updateAccountClearance(
  studentRecordId: string,
  clearanceData: { clearedForTerm: string | null },
  actorUserId: string,
) {
  let account = await prisma.financialAccount.findUnique({ where: { studentRecordId } });

  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId, balance: 0 },
    });
  }

  const updated = await prisma.financialAccount.update({
    where: { id: account.id },
    data:  {
      clearedForTerm: clearanceData.clearedForTerm,
      lastUpdatedAt:  new Date(),
    },
  });

  return updated;
}
