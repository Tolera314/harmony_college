import { prisma } from '../../lib/prisma';
import { AuditAction } from '../../types/auth';

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

  if (params.search && params.search.trim()) {
    const s = params.search.trim();
    where.OR = [
      { studentId: { contains: s, mode: 'insensitive' } },
      { user: { fullName: { contains: s, mode: 'insensitive' } } },
      { user: { email: { contains: s, mode: 'insensitive' } } },
    ];
  }

  if (params.departmentId) {
    where.departmentId = params.departmentId;
  }

  const students = await prisma.studentRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      department: { select: { id: true, name: true, code: true } },
      program: { select: { id: true, name: true, code: true } },
      financialAccount: {
        include: {
          transactions: {
            where: { status: 'POSTED' },
            orderBy: { transactionDate: 'desc' },
          },
        },
      },
    },
  });

  const mapped = students.map((s) => {
    const acc = s.financialAccount;
    const balance = acc ? acc.balance : 0;
    const activeTxs = acc?.transactions || [];

    const totalCharged = activeTxs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalPaid = activeTxs.filter((t) => t.type === 'PAYMENT').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const scholarshipDiscount = activeTxs
      .filter((t) => t.type === 'SCHOLARSHIP' || t.type === 'GRANT')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const outstanding = Math.max(0, balance);

    let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Deferred' = 'Paid';
    if (outstanding > 15000) paymentStatus = 'Overdue';
    else if (outstanding > 5000) paymentStatus = 'Partial';
    else if (outstanding > 0) paymentStatus = 'Unpaid';

    let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    if (outstanding > 20000) riskLevel = 'Critical';
    else if (outstanding > 10000) riskLevel = 'High';
    else if (outstanding > 3000) riskLevel = 'Medium';

    const oldestChargeTx = activeTxs
      .filter((t) => t.amount > 0)
      .sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime())[0];
    const daysOverdue =
      outstanding > 0 && oldestChargeTx
        ? Math.max(0, Math.floor((Date.now() - oldestChargeTx.transactionDate.getTime()) / (1000 * 60 * 60 * 24)))
        : outstanding > 0
        ? 14
        : 0;

    const lastPaymentTx = activeTxs.find((t) => t.type === 'PAYMENT');

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
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.user.fullName)}`,
      tuition: totalCharged > 0 ? totalCharged : 18500,
      adminFees: 0,
      labFees: 0,
      libraryFines: 0,
      scholarshipDiscount,
      totalCharged: totalCharged > 0 ? totalCharged : 18500,
      totalPaid,
      outstanding,
      balance,
      clearedForTerm: acc?.clearedForTerm || null,
      paymentStatus,
      riskLevel,
      daysOverdue,
      lastPaymentDate: lastPaymentTx ? lastPaymentTx.transactionDate.toISOString() : null,
      transactions: activeTxs.map((t) => ({
        ...t,
        transactionDate: t.transactionDate.toISOString(),
      })),
    };
  });



  let filtered = mapped;
  if (params.paymentStatus && params.paymentStatus !== 'All') {
    filtered = filtered.filter((a) => a.paymentStatus === params.paymentStatus);
  }
  if (params.riskLevel && params.riskLevel !== 'All') {
    filtered = filtered.filter((a) => a.riskLevel === params.riskLevel);
  }

  const total = filtered.length;
  const paginated = filtered.slice(skip, skip + limit);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    accounts: paginated,
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

  const activeTxs = account.transactions.filter((t) => t.status === 'POSTED');
  const totalCharged = activeTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalPaid = activeTxs.filter((t) => t.type === 'PAYMENT').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalAid = activeTxs
    .filter((t) => t.type === 'SCHOLARSHIP' || t.type === 'GRANT')
    .reduce((s, t) => s + Math.abs(t.amount), 0);

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
    totalCharged,
    totalPaid,
    totalAid,
    clearedForTerm: account.clearedForTerm,
    paymentStatus,
    riskLevel,
    transactions: account.transactions.map((t) => ({
      ...t,
      transactionDate: t.transactionDate.toISOString(),
    })),
  };
}

export async function postCharge(
  studentRecordId: string,
  chargeData: { amount: number; description: string; category: string },
  actorUserId: string,
  ipAddress?: string
) {
  if (!chargeData.amount || chargeData.amount <= 0) {
    throw new Error('Valid positive charge amount is required.');
  }

  return prisma.$transaction(async (tx) => {
    let account = await tx.financialAccount.findUnique({
      where: { studentRecordId },
    });

    if (!account) {
      account = await tx.financialAccount.create({
        data: { studentRecordId, balance: 0 },
      });
    }

    const receiptId = `CHG-${Date.now().toString(36).toUpperCase()}`;

    const createdTx = await tx.financialTransaction.create({
      data: {
        financialAccountId: account.id,
        type: chargeData.category === 'Tuition' ? 'TUITION' : 'FEE',
        amount: Math.abs(chargeData.amount),
        description: chargeData.description.trim(),
        category: chargeData.category || 'Fee',
        receiptId,
        status: 'POSTED',
      },
    });

    const activeTxs = await tx.financialTransaction.findMany({
      where: { financialAccountId: account.id, status: 'POSTED' },
      select: { amount: true },
    });

    const newBalance = activeTxs.reduce((sum, item) => sum + item.amount, 0);

    const updatedAccount = await tx.financialAccount.update({
      where: { id: account.id },
      data: {
        balance: Math.round(newBalance * 100) / 100,
        lastUpdatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        action: AuditAction.PROFILE_COMPLETED,
        ipAddress: ipAddress ?? null,
        metadata: {
          event: 'FO_CHARGE_POSTED',
          transactionId: createdTx.id,
          studentRecordId,
          amount: Math.abs(chargeData.amount),
          newBalance: updatedAccount.balance,
          receiptId,
        },
      },
    });

    return { transaction: createdTx, account: updatedAccount };
  });
}

export async function postCredit(
  studentRecordId: string,
  creditData: { amount: number; description: string; category: string },
  actorUserId: string,
  ipAddress?: string
) {
  if (!creditData.amount || creditData.amount <= 0) {
    throw new Error('Valid positive credit/discount amount is required.');
  }

  return prisma.$transaction(async (tx) => {
    let account = await tx.financialAccount.findUnique({
      where: { studentRecordId },
    });

    if (!account) {
      account = await tx.financialAccount.create({
        data: { studentRecordId, balance: 0 },
      });
    }

    const receiptId = `CRD-${Date.now().toString(36).toUpperCase()}`;

    const createdTx = await tx.financialTransaction.create({
      data: {
        financialAccountId: account.id,
        type: creditData.category === 'Scholarship' ? 'SCHOLARSHIP' : 'GRANT',
        amount: -Math.abs(creditData.amount),
        description: creditData.description.trim(),
        category: creditData.category || 'Scholarship',
        receiptId,
        status: 'POSTED',
      },
    });

    const activeTxs = await tx.financialTransaction.findMany({
      where: { financialAccountId: account.id, status: 'POSTED' },
      select: { amount: true },
    });

    const newBalance = activeTxs.reduce((sum, item) => sum + item.amount, 0);

    const updatedAccount = await tx.financialAccount.update({
      where: { id: account.id },
      data: {
        balance: Math.round(newBalance * 100) / 100,
        lastUpdatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        action: AuditAction.PROFILE_COMPLETED,
        ipAddress: ipAddress ?? null,
        metadata: {
          event: 'FO_CREDIT_POSTED',
          transactionId: createdTx.id,
          studentRecordId,
          amount: -Math.abs(creditData.amount),
          newBalance: updatedAccount.balance,
          receiptId,
        },
      },
    });

    return { transaction: createdTx, account: updatedAccount };
  });
}

export async function updateAccountClearance(
  studentRecordId: string,
  clearanceData: { clearedForTerm: string | null },
  actorUserId: string,
  ipAddress?: string
) {
  return prisma.$transaction(async (tx) => {
    let account = await tx.financialAccount.findUnique({
      where: { studentRecordId },
    });

    if (!account) {
      account = await tx.financialAccount.create({
        data: { studentRecordId, balance: 0 },
      });
    }

    const updated = await tx.financialAccount.update({
      where: { id: account.id },
      data: {
        clearedForTerm: clearanceData.clearedForTerm ? clearanceData.clearedForTerm.trim() : null,
        lastUpdatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        action: AuditAction.PROFILE_COMPLETED,
        ipAddress: ipAddress ?? null,
        metadata: {
          event: 'FO_TERM_CLEARANCE_UPDATED',
          studentRecordId,
          clearedForTerm: updated.clearedForTerm,
        },
      },
    });

    return updated;
  });
}
