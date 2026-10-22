/**
 * Payment Submission Service — Harmony College
 * Handles student payment evidence submissions and Finance Officer review workflow.
 * Approve: marks installment PAID, creates official receipt, updates balance, notifies student.
 * Reject:  stores required reason, preserves submission history, allows resubmission, notifies student.
 */
import { prisma } from '../../lib/prisma';
import { createNotification } from '../notificationService';

// ── Receipt number generator ──────────────────────────────────────────────────

async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.paymentReceipt.count();
  const seq = String(count + 1).padStart(5, '0');
  return `HC-REC-${year}-${seq}`;
}

// ── Student: submit payment evidence ─────────────────────────────────────────

export async function submitPaymentEvidence(input: {
  studentRecordId: string;
  installmentId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  referenceNumber?: string;
  evidenceUrl: string;
  evidenceFileName?: string;
  note?: string;
}) {
  if (!input.amount || input.amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }
  if (!input.paymentMethod) {
    throw new Error('Please select a payment method.');
  }
  if (!input.evidenceUrl) {
    throw new Error('Payment evidence document or screenshot is required.');
  }

  // Verify the installment belongs to this student
  const installment = await prisma.monthlyInstallment.findUnique({
    where: { id: input.installmentId },
  });
  if (!installment) throw new Error('Installment not found.');
  if (installment.studentRecordId !== input.studentRecordId) {
    throw new Error('Unauthorized: installment does not belong to this student.');
  }
  if (installment.status === 'PAID') {
    throw new Error('This installment has already been paid and verified.');
  }

  // Cancel any previous PENDING_REVIEW submission for this installment
  await prisma.paymentSubmission.updateMany({
    where: {
      installmentId: input.installmentId,
      status: 'PENDING_REVIEW',
    },
    data: {
      status: 'REJECTED',
      rejectionReason: 'Superseded by new payment submission.',
      reviewedAt: new Date(),
    },
  });

  // Create the new submission
  const submission = await prisma.paymentSubmission.create({
    data: {
      installmentId: input.installmentId,
      studentRecordId: input.studentRecordId,
      amount: input.amount,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber?.trim() || null,
      evidenceUrl: input.evidenceUrl,
      evidenceFileName: input.evidenceFileName?.trim() || null,
      note: input.note?.trim() || null,
      status: 'PENDING_REVIEW',
    },
  });

  // Update installment status → PENDING_REVIEW
  await prisma.monthlyInstallment.update({
    where: { id: input.installmentId },
    data: {
      status: 'PENDING_REVIEW',
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
      userId: fo.id,
      title: '💳 New Payment Submission',
      message: `${sr?.user.fullName ?? 'A student'} submitted payment proof for ${installment.billingLabel} (ETB ${input.amount.toLocaleString()}).`,
      type: 'INFO',
      module: 'FINANCE',
      entityId: submission.id,
      actionTab: 'payment_submissions',
    }).catch(() => {});
  }

  return submission;
}

// ── FO: list submissions (with status filtering) ──────────────────────────────

export async function listPendingSubmissions(params: {
  search?: string;
  programType?: 'TVET' | 'SHORT_PROGRAM';
  status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL';
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.status && params.status !== 'ALL') {
    where.status = params.status;
  } else if (!params.status) {
    where.status = 'PENDING_REVIEW';
  }

  if (params.programType) {
    where.studentRecord = { programType: params.programType };
  }

  if (params.search) {
    const q = params.search.trim();
    where.OR = [
      { studentRecord: { user: { fullName: { contains: q, mode: 'insensitive' } } } },
      { studentRecord: { studentId: { contains: q, mode: 'insensitive' } } },
      { referenceNumber: { contains: q, mode: 'insensitive' } },
      { paymentMethod: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, submissions] = await Promise.all([
    prisma.paymentSubmission.count({ where }),
    prisma.paymentSubmission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        studentRecord: {
          include: {
            user: { select: { id: true, fullName: true, email: true, phone: true } },
            department: { select: { name: true, code: true, programType: true } },
            program: { select: { name: true, code: true } },
          },
        },
        installment: {
          select: {
            id: true,
            billingLabel: true,
            billingMonth: true,
            expectedAmount: true,
            dueDate: true,
            status: true,
          },
        },
        receipt: {
          select: {
            id: true,
            receiptNumber: true,
            amountPaid: true,
            approvedAt: true,
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
  submissionId: string;
  reviewedByUserId: string;
}) {
  const submission = await prisma.paymentSubmission.findUnique({
    where: { id: input.submissionId },
    include: { installment: true },
  });
  if (!submission) throw new Error('Payment submission not found.');
  if (submission.status !== 'PENDING_REVIEW') {
    throw new Error(`Cannot approve submission with status: ${submission.status}. Only pending submissions can be approved.`);
  }

  const receiptNumber = await generateReceiptNumber();

  // Atomic transaction: approve submission + create receipt + update installment + update account balance
  const result = await prisma.$transaction(async (tx) => {
    // 1. Mark submission approved
    const updatedSubmission = await tx.paymentSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'APPROVED',
        reviewedByUserId: input.reviewedByUserId,
        reviewedAt: new Date(),
      },
    });

    // 2. Create official receipt
    const receipt = await tx.paymentReceipt.create({
      data: {
        receiptNumber,
        installmentId: submission.installmentId,
        submissionId: submission.id,
        studentRecordId: submission.studentRecordId,
        amountPaid: submission.amount,
        paymentDate: submission.paymentDate,
        paymentMethod: submission.paymentMethod,
        referenceNumber: submission.referenceNumber,
        billingMonth: submission.installment.billingMonth,
        billingLabel: submission.installment.billingLabel,
        approvedByUserId: input.reviewedByUserId,
        approvedAt: new Date(),
      },
    });

    // 3. Mark installment as PAID
    await tx.monthlyInstallment.update({
      where: { id: submission.installmentId },
      data: {
        status: 'PAID',
        receiptId: receipt.id,
      },
    });

    // 4. Record a FinancialTransaction credit on the student's account
    let fa = await tx.financialAccount.findUnique({
      where: { studentRecordId: submission.studentRecordId },
      include: {
        studentRecord: {
          select: {
            programType: true,
          },
        },
      },
    });
    if (!fa) {
      const studentRecord = await tx.studentRecord.findUnique({
        where: { id: submission.studentRecordId },
        select: { programType: true },
      });
      fa = await tx.financialAccount.create({
        data: { studentRecordId: submission.studentRecordId },
        include: {
          studentRecord: {
            select: {
              programType: true,
            },
          },
        },
      });
    }

    let transaction: any = null;
    if (fa) {
      transaction = await tx.financialTransaction.create({
        data: {
          financialAccountId: fa.id,
          type: 'PAYMENT',
          amount: -submission.amount, // negative = credit to student account
          description: `Monthly tuition payment — ${submission.installment.billingLabel}`,
          category: 'Tuition',
          financialCategory: 'STUDENT_TUITION', // NEW: structured category
          programType: fa.studentRecord.programType, // NEW: for TVET/Short Program filtering
          receiptId: receipt.receiptNumber,
          referenceId: submission.referenceNumber ?? null,
          status: 'POSTED',
        },
      });

      // Recalculate balance
      const txns = await tx.financialTransaction.findMany({
        where: { financialAccountId: fa.id },
        select: { amount: true },
      });
      const newBalance = txns.reduce((s, t) => s + t.amount, 0);
      await tx.financialAccount.update({
        where: { id: fa.id },
        data: {
          balance: Math.round(newBalance * 100) / 100,
          lastUpdatedAt: new Date(),
        },
      });
    }

    return { updatedSubmission, receipt, transaction };
  });

  // 5. Notify student
  const sr = await prisma.studentRecord.findUnique({
    where: { id: submission.studentRecordId },
    include: { user: { select: { id: true } } },
  });
  if (sr) {
    await createNotification({
      userId: sr.user.id,
      title: '✅ Tuition Payment Approved',
      message: `Your payment for ${submission.installment.billingLabel} has been approved. Official Receipt: ${receiptNumber}. Amount: ETB ${submission.amount.toLocaleString()}.`,
      type: 'SUCCESS',
      module: 'FINANCE',
      entityId: result.receipt.id,
      actionTab: 'financials',
    }).catch(() => {});
  }

  return {
    submission: result.updatedSubmission,
    receipt: result.receipt,
    transaction: result.transaction,
  };
}

// ── FO: reject submission ─────────────────────────────────────────────────────

export async function rejectSubmission(input: {
  submissionId: string;
  reviewedByUserId: string;
  rejectionReason: string;
}) {
  if (!input.rejectionReason || !input.rejectionReason.trim()) {
    throw new Error('Rejection explanation is required.');
  }

  const submission = await prisma.paymentSubmission.findUnique({
    where: { id: input.submissionId },
    include: { installment: true },
  });
  if (!submission) throw new Error('Payment submission not found.');
  if (submission.status !== 'PENDING_REVIEW') {
    throw new Error(`Cannot reject submission with status: ${submission.status}. Only pending submissions can be rejected.`);
  }

  const updatedSubmission = await prisma.$transaction(async (tx) => {
    // 1. Reject the submission and store reason
    const updated = await tx.paymentSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'REJECTED',
        rejectionReason: input.rejectionReason.trim(),
        reviewedByUserId: input.reviewedByUserId,
        reviewedAt: new Date(),
      },
    });

    // 2. Mark installment status to REJECTED so student can correct and resubmit
    await tx.monthlyInstallment.update({
      where: { id: submission.installmentId },
      data: {
        status: 'REJECTED',
        activeSubmissionId: null,
      },
    });

    return updated;
  });

  // 3. Notify student with reason
  const sr = await prisma.studentRecord.findUnique({
    where: { id: submission.studentRecordId },
    include: { user: { select: { id: true } } },
  });
  if (sr) {
    await createNotification({
      userId: sr.user.id,
      title: '❌ Tuition Payment Rejected',
      message: `Your payment proof for ${submission.installment.billingLabel} was rejected. Reason: ${input.rejectionReason.trim()}. Please resubmit with clear payment proof.`,
      type: 'ERROR',
      module: 'FINANCE',
      entityId: submission.id,
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
    where: { status: { in: ['DUE', 'OVERDUE', 'UPCOMING', 'REJECTED'] } },
    _sum: { expectedAmount: true },
  });

  return {
    pending,
    approved,
    rejected,
    overdue,
    pendingCount: pending,
    approvedCount: approved,
    rejectedCount: rejected,
    overdueCount: overdue,
    totalCollected: totalCollectedAgg._sum.amountPaid ?? 0,
    totalApprovedAmount: totalCollectedAgg._sum.amountPaid ?? 0,
    totalOutstanding: totalOutstandingAgg._sum.expectedAmount ?? 0,
  };
}
