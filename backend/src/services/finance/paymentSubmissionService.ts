/**
 * Payment Submission Service — Harmony College
 * Handles student payment evidence submissions and Finance Officer review workflow.
 * Approve: marks installment PAID, creates official receipt, notifies student.
 * Reject:  stores reason, notifies student, allows resubmission.
 */
import { prisma }             from '../../lib/prisma';
import { createNotification } from '../notificationService';
import { randomBytes }        from 'crypto';

// ── Receipt number generator ──────────────────────────────────────────────────

async function generateReceiptNumber(): Promise<string> {
  const year  = new Date().getFullYear();
  const count = await prisma.paymentReceipt.count();
  const seq   = String(count + 1).padStart(5, '0');
  return `HC-REC-${year}-${seq}`;
}

// ── Student: submit payment evidence ─────────────────────────────────────────

export async function submitPaymentEvidence(input: {
  studentRecordId: string;
  installmentId:   string;
  amount:          number;
  paymentDate:     Date;
  paymentMethod:   string;
  referenceNumber?: string;
  evidenceUrl:     string;
  evidenceFileName?: string;
  note?: string;
}) {
  // Verify the installment belongs to this student
  const installment = await prisma.monthlyInstallment.findUnique({
    where: { id: input.installmentId },
  });
  if (!installment) throw new Error('Installment not found.');
  if (installment.studentRecordId !== input.studentRecordId) {
    throw new Error('Unauthorized: installment does not belong to this student.');
  }
  if (installment.status === 'PAID') {
    throw new Error('This installment has already been paid.');
  }

  // Cancel any previous PENDING_REVIEW submission for this installment
  await prisma.paymentSubmission.updateMany({
    where: {
      installmentId: input.installmentId,
      status:        'PENDING_REVIEW',
    },
    data: {
      status:         'REJECTED',
      rejectionReason: 'Superseded by new submission.',
      reviewedAt:     new Date(),
    },
  });

  // Create the new submission
  const submission = await prisma.paymentSubmission.create({
    data: {
      installmentId:   input.installmentId,
      studentRecordId: input.studentRecordId,
      amount:          input.amount,
      paymentDate:     input.paymentDate,
      paymentMethod:   input.paymentMethod,
      referenceNumber: input.referenceNumber ?? null,
      evidenceUrl:     input.evidenceUrl,
      evidenceFileName: input.evidenceFileName ?? null,
      note:            input.note ?? null,
      status:          'PENDING_REVIEW',
    },
  });

  // Update installment status → PENDING_REVIEW
  await prisma.monthlyInstallment.update({
    where: { id: input.installmentId },
    data: {
      status:            'PENDING_REVIEW',
      activeSubmissionId: submission.id,
    },
  });

  // Notify Finance Officers
  const foUsers = await prisma.user.findMany({
    where: { role: 'FINANCE_OFFICER', status: 'ACTIVE' },
    select: { id: true },
  });

  const sr = await prisma.studentRecord.findUnique({
    where: { id: input.studentRecordId },
    include: { user: { select: { fullName: true } } },
  });

  for (const fo of foUsers) {
    await createNotification({
      userId:    fo.id,
      title:     'New Payment Submission',
      message:   `${sr?.user.fullName ?? 'A student'} submitted payment evidence for ${installment.billingLabel} (ETB ${input.amount.toLocaleString()}).`,
      type:      'INFO',
      module:    'FINANCE',
      entityId:  submission.id,
      actionTab: 'payments',
    }).catch(() => {});
  }

  return submission;
}

// ── FO: list pending submissions ──────────────────────────────────────────────

export async function listPendingSubmissions(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page  = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip  = (page - 1) * limit;

  const where: any = { status: 'PENDING_REVIEW' };

  if (params.search) {
    where.OR = [
      { studentRecord: { user:      { fullName:  { contains: params.search, mode: 'insensitive' } } } },
      { studentRecord: { studentId: { contains:  params.search, mode: 'insensitive' } } },
      { referenceNumber: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [total, submissions] = await Promise.all([
    prisma.paymentSubmission.count({ where }),
    prisma.paymentSubmission.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        studentRecord: {
          include: {
            user:       { select: { id: true, fullName: true, email: true, phone: true } },
            department: { select: { name: true, code: true } },
            program:    { select: { name: true, code: true } },
          },
        },
        installment: {
          select: {
            id: true, billingLabel: true, billingMonth: true,
            expectedAmount: true, dueDate: true, status: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    submissions: submissions.map((s) => ({
      ...s,
      student: s.studentRecord,
    })),
  };
}

// ── FO: approve submission ────────────────────────────────────────────────────

export async function approveSubmission(input: {
  submissionId:    string;
  reviewedByUserId: string;
}) {
  const submission = await prisma.paymentSubmission.findUnique({
    where: { id: input.submissionId },
    include: { installment: true },
  });
  if (!submission) throw new Error('Payment submission not found.');
  if (submission.status !== 'PENDING_REVIEW') {
    throw new Error(`Cannot approve submission with status: ${submission.status}`);
  }

  const receiptNumber = await generateReceiptNumber();

  // Atomic transaction: approve submission + create receipt + update installment + update account balance
  const result = await prisma.$transaction(async (tx) => {
    // 1. Mark submission approved
    const updatedSubmission = await tx.paymentSubmission.update({
      where: { id: submission.id },
      data: {
        status:           'APPROVED',
        reviewedByUserId: input.reviewedByUserId,
        reviewedAt:       new Date(),
      },
    });

    // 2. Create official receipt
    const receipt = await tx.paymentReceipt.create({
      data: {
        receiptNumber,
        installmentId:   submission.installmentId,
        submissionId:    submission.id,
        studentRecordId: submission.studentRecordId,
        amountPaid:      submission.amount,
        paymentDate:     submission.paymentDate,
        paymentMethod:   submission.paymentMethod,
        referenceNumber: submission.referenceNumber,
        billingMonth:    submission.installment.billingMonth,
        billingLabel:    submission.installment.billingLabel,
        approvedByUserId: input.reviewedByUserId,
        approvedAt:      new Date(),
      },
    });

    // 3. Mark installment as PAID
    await tx.monthlyInstallment.update({
      where: { id: submission.installmentId },
      data: {
        status:    'PAID',
        receiptId: receipt.id,
      },
    });

    // 4. Record a FinancialTransaction credit on the student's account
    let fa = await tx.financialAccount.findUnique({
      where: { studentRecordId: submission.studentRecordId },
    });
    if (!fa) {
      fa = await tx.financialAccount.create({
        data: { studentRecordId: submission.studentRecordId },
      });
    }
    let transaction: any = null;
    if (fa) {
      transaction = await tx.financialTransaction.create({
        data: {
          financialAccountId: fa.id,
          type:        'PAYMENT',
          amount:      -submission.amount, // negative = credit
          description: `Monthly tuition payment — ${submission.installment.billingLabel}`,
          category:    'Tuition',
          receiptId:   receipt.receiptNumber,
          referenceId: submission.referenceNumber ?? null,
          status:      'POSTED',
        },
      });

      // Recalculate balance
      const txns = await tx.financialTransaction.findMany({
        where:  { financialAccountId: fa.id },
        select: { amount: true },
      });
      const newBalance = txns.reduce((s, t) => s + t.amount, 0);
      await tx.financialAccount.update({
        where: { id: fa.id },
        data: {
          balance:       Math.round(newBalance * 100) / 100,
          lastUpdatedAt: new Date(),
        },
      });
    }

    return { updatedSubmission, receipt, transaction };
  });

  // 5. Notify student
  const sr = await prisma.studentRecord.findUnique({
    where:   { id: submission.studentRecordId },
    include: { user: { select: { id: true } } },
  });
  if (sr) {
    await createNotification({
      userId:    sr.user.id,
      title:     '✅ Payment Approved',
      message:   `Your payment for ${submission.installment.billingLabel} has been approved. Receipt: ${receiptNumber}. ETB ${submission.amount.toLocaleString()} recorded.`,
      type:      'SUCCESS',
      module:    'FINANCE',
      entityId:  result.receipt.id,
      actionTab: 'financials',
    }).catch(() => {});
  }

  return { submission: result.updatedSubmission, receipt: result.receipt, transaction: result.transaction };
}

// ── FO: reject submission ─────────────────────────────────────────────────────

export async function rejectSubmission(input: {
  submissionId:    string;
  reviewedByUserId: string;
  rejectionReason: string;
}) {
  const submission = await prisma.paymentSubmission.findUnique({
    where: { id: input.submissionId },
    include: { installment: true },
  });
  if (!submission) throw new Error('Payment submission not found.');
  if (submission.status !== 'PENDING_REVIEW') {
    throw new Error(`Cannot reject submission with status: ${submission.status}`);
  }

  const updatedSubmission = await prisma.$transaction(async (tx) => {
    // Reject the submission
    const updated = await tx.paymentSubmission.update({
      where: { id: submission.id },
      data: {
        status:           'REJECTED',
        rejectionReason:  input.rejectionReason,
        reviewedByUserId: input.reviewedByUserId,
        reviewedAt:       new Date(),
      },
    });

    // Revert installment status to REJECTED
    await tx.monthlyInstallment.update({
      where: { id: submission.installmentId },
      data: {
        status:            'REJECTED',
        activeSubmissionId: null,
      },
    });

    return updated;
  });

  // Notify student
  const sr = await prisma.studentRecord.findUnique({
    where:   { id: submission.studentRecordId },
    include: { user: { select: { id: true } } },
  });
  if (sr) {
    await createNotification({
      userId:    sr.user.id,
      title:     '❌ Payment Submission Rejected',
      message:   `Your payment submission for ${submission.installment.billingLabel} was rejected. Reason: ${input.rejectionReason}. Please resubmit with correct evidence.`,
      type:      'ERROR',
      module:    'FINANCE',
      entityId:  submission.id,
      actionTab: 'financials',
    }).catch(() => {});
  }

  return { rejected: true, submission: updatedSubmission };
}

// ── Student: get submission status for a specific installment ─────────────────

export async function getInstallmentSubmissions(installmentId: string, studentRecordId: string) {
  const installment = await prisma.monthlyInstallment.findUnique({
    where: { id: installmentId },
  });
  if (!installment) throw new Error('Installment not found.');
  if (installment.studentRecordId !== studentRecordId) {
    throw new Error('Unauthorized.');
  }

  const submissions = await prisma.paymentSubmission.findMany({
    where: { installmentId },
    orderBy: { createdAt: 'desc' },
  });

  return submissions;
}

// ── FO: get analytics for monthly payment module ──────────────────────────────

export async function getPaymentSubmissionAnalytics() {
  const [pending, approved, rejected, overdue] = await Promise.all([
    prisma.paymentSubmission.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.paymentSubmission.count({ where: { status: 'APPROVED' } }),
    prisma.paymentSubmission.count({ where: { status: 'REJECTED' } }),
    prisma.monthlyInstallment.count({ where: { status: 'OVERDUE' } }),
  ]);

  const totalCollectedAgg = await prisma.paymentReceipt.aggregate({
    _sum: { amountPaid: true },
  });

  const totalOutstandingAgg = await prisma.monthlyInstallment.aggregate({
    where: { status: { in: ['DUE', 'OVERDUE', 'UPCOMING'] } },
    _sum:  { expectedAmount: true },
  });

  return {
    pending,
    approved,
    rejected,
    overdue,
    pendingCount:       pending,
    approvedCount:      approved,
    rejectedCount:      rejected,
    overdueCount:       overdue,
    totalCollected:     totalCollectedAgg._sum.amountPaid ?? 0,
    totalApprovedAmount: totalCollectedAgg._sum.amountPaid ?? 0,
    totalOutstanding:   totalOutstandingAgg._sum.expectedAmount ?? 0,
  };
}
