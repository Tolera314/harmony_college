/**
 * Monthly Installment Service — Harmony College
 * Manages the creation, status, countdown, and balances of monthly payment installments for students.
 * Enforces that students only see published fees for their actual enrolled program.
 * Calculates countdowns from actual stored deadlines and enforces overdue logic.
 */
import { prisma }                from '../../lib/prisma';
import { ProgramType }           from '@prisma/client';
import { formatBillingLabel, syncInstallmentsForConfig } from './tuitionConfigService';
import { createNotification }    from '../notificationService';

export const SUPPORTED_PAYMENT_METHODS = [
  'Commercial Bank of Ethiopia (CBE)',
  'Awash Bank',
  'Cooperative Bank',
  'Telebirr',
];

export const DEFAULT_PAYMENT_INSTRUCTIONS =
  'Please deposit or transfer your monthly tuition using CBE (Acc: 1000123456789), Awash Bank (Acc: 01320987654300), Cooperative Bank of Oromia (Acc: 10000456789), or Telebirr (Merchant ID: 889900). Include your full name and Student ID as the transfer reference, and upload the payment confirmation receipt.';

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ── Status sync: update DUE / OVERDUE for open installments ───────────────────

export async function syncInstallmentStatuses(): Promise<{ updated: number }> {
  const now = new Date();

  // Mark UPCOMING -> OVERDUE or DUE based on dueDate
  // If dueDate < now and status is UPCOMING or DUE -> OVERDUE
  const overdue = await prisma.monthlyInstallment.updateMany({
    where: {
      status: { in: ['UPCOMING', 'DUE'] },
      dueDate: { lt: now },
    },
    data: { status: 'OVERDUE' },
  });

  return { updated: overdue.count };
}

// ── Core: generate installments for student (legacy / admission helper) ───────

export async function generateInstallmentsForStudent(studentRecordId: string): Promise<{
  created: number;
  alreadyExisted: number;
  monthlyAmount: number | null;
  configFound: boolean;
}> {
  const sr = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: { financialAccount: true, program: true },
  });

  if (!sr) throw new Error('Student record not found.');

  // Find all active published configs for this student's program
  const configs = await prisma.tuitionConfiguration.findMany({
    where: {
      academicContext: sr.programType,
      programId: sr.programId,
      status: 'PUBLISHED',
      isActive: true,
    },
    orderBy: { billingMonth: 'asc' },
  });

  let created = 0;
  let alreadyExisted = 0;

  for (const cfg of configs) {
    const res = await syncInstallmentsForConfig(cfg.id);
    created += res;
  }

  return {
    created,
    alreadyExisted,
    monthlyAmount: configs[0]?.monthlyAmount ?? null,
    configFound: configs.length > 0,
  };
}

// ── Student view: get installments for a student ──────────────────────────────

export async function getStudentInstallments(studentRecordId: string) {
  // Sync overdue statuses first
  await syncInstallmentStatuses();

  const sr = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      department: { select: { id: true, name: true, code: true, programType: true } },
      program: { select: { id: true, name: true, code: true } },
      financialAccount: true,
    },
  });

  if (!sr) throw new Error('Student record not found.');

  // Ensure any newly published fees for this student's program are synced
  const publishedConfigs = await prisma.tuitionConfiguration.findMany({
    where: {
      academicContext: sr.programType,
      programId: sr.programId,
      status: 'PUBLISHED',
      isActive: true,
    },
  });

  for (const cfg of publishedConfigs) {
    await syncInstallmentsForConfig(cfg.id);
  }

  // Fetch only installments associated with this student
  // Students must see ONLY fees associated with their actual program enrollment and category.
  // Draft fees must never be visible to students!
  const installments = await prisma.monthlyInstallment.findMany({
    where: {
      studentRecordId,
      academicContext: sr.programType,
      OR: [
        // Linked to a published config
        { tuitionConfig: { status: 'PUBLISHED', isActive: true, programId: sr.programId } },
        // Or if already paid, preserve the historical installment record
        { status: 'PAID' },
      ],
    },
    include: {
      tuitionConfig: {
        select: {
          id: true,
          monthlyAmount: true,
          dueDate: true,
          paymentInstructions: true,
          status: true,
          revision: true,
          billingMonth: true,
          program: { select: { id: true, name: true, code: true } },
        },
      },
      submissions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          amount: true,
          paymentDate: true,
          paymentMethod: true,
          referenceNumber: true,
          evidenceUrl: true,
          evidenceFileName: true,
          note: true,
          rejectionReason: true,
          reviewedAt: true,
          createdAt: true,
        },
      },
      receipt: {
        select: {
          id: true,
          receiptNumber: true,
          amountPaid: true,
          paymentDate: true,
          paymentMethod: true,
          referenceNumber: true,
          billingMonth: true,
          billingLabel: true,
          approvedAt: true,
        },
      },
    },
    orderBy: { billingMonth: 'asc' },
  });

  const now = new Date();

  const formattedInstallments = installments.map((inst, idx) => {
    const isPaid = inst.status === 'PAID';
    const latestSubmission = inst.submissions[0];
    const hasApprovedReceipt = !!inst.receipt;

    // Balance calculation:
    // Monthly fee = expectedAmount
    // Paid amount = sum of approved receipts/payments for this installment
    const paidAmount = isPaid ? inst.expectedAmount : (hasApprovedReceipt ? inst.receipt!.amountPaid : 0);
    const outstandingBalance = Math.max(0, inst.expectedAmount - paidAmount);

    // Compute status reliably server-side:
    // When deadline passes and payment remains unpaid, show overdue status!
    // A fully paid fee must NOT remain marked as unpaid or overdue.
    let computedStatus = inst.status;
    if (isPaid) {
      computedStatus = 'PAID';
    } else if (latestSubmission && latestSubmission.status === 'PENDING_REVIEW') {
      computedStatus = 'PENDING_REVIEW';
    } else if (latestSubmission && latestSubmission.status === 'REJECTED' && inst.status === 'REJECTED') {
      computedStatus = 'REJECTED';
    } else if (inst.dueDate < now) {
      computedStatus = 'OVERDUE';
    } else {
      const diffDays = Math.ceil((inst.dueDate.getTime() - now.getTime()) / 86400000);
      computedStatus = diffDays <= 7 ? 'DUE' : 'UPCOMING';
    }

    const instructions = inst.tuitionConfig?.paymentInstructions || DEFAULT_PAYMENT_INSTRUCTIONS;

    return {
      ...inst,
      monthLabel: inst.billingLabel || formatBillingLabel(inst.billingMonth),
      monthIndex: idx + 1,
      status: computedStatus,
      paidAmount,
      outstandingBalance,
      paymentInstructions: instructions,
      paymentSubmissions: inst.submissions,
      latestSubmission: latestSubmission ?? null,
      receipts: inst.receipt ? [inst.receipt] : [],
      programName: sr.program?.name,
      programCode: sr.program?.code,
    };
  });

  // Next unpaid installment for the primary countdown banner
  // Priority: OVERDUE > DUE > REJECTED > PENDING_REVIEW > UPCOMING
  const unpaidList = formattedInstallments.filter((i) => i.status !== 'PAID');
  const nextDue =
    unpaidList.find((i) => i.status === 'OVERDUE') ||
    unpaidList.find((i) => i.status === 'DUE') ||
    unpaidList.find((i) => i.status === 'REJECTED') ||
    unpaidList.find((i) => i.status === 'PENDING_REVIEW') ||
    unpaidList[0] ||
    null;

  let countdown: {
    daysLeft: number;
    hoursLeft: number;
    minutesLeft: number;
    secondsLeft: number;
    diffSeconds: number;
    isOverdue: boolean;
    isDueToday: boolean;
    label: string;
    statusBadge: string;
    dueDate: string;
    targetDate: string;
    amount: number;
  } | null = null;

  if (nextDue) {
    const diffMs = nextDue.dueDate.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const isOverdue = diffSeconds < 0;
    const absSeconds = Math.abs(diffSeconds);

    const daysLeft = Math.floor(absSeconds / 86400);
    const hoursLeft = Math.floor((absSeconds % 86400) / 3600);
    const minutesLeft = Math.floor((absSeconds % 3600) / 60);
    const secondsLeft = absSeconds % 60;
    const isDueToday = !isOverdue && daysLeft === 0;

    let label = `${daysLeft}d ${hoursLeft}h ${minutesLeft}m`;
    if (isDueToday) {
      label = `DUE TODAY (${hoursLeft}h ${minutesLeft}m remaining)`;
    } else if (isOverdue) {
      label = `${daysLeft}d ${hoursLeft}h OVERDUE`;
    }

    countdown = {
      daysLeft,
      hoursLeft,
      minutesLeft,
      secondsLeft,
      diffSeconds,
      isOverdue,
      isDueToday,
      label,
      statusBadge: nextDue.status,
      dueDate: nextDue.dueDate.toISOString(),
      targetDate: nextDue.dueDate.toISOString(),
      amount: nextDue.outstandingBalance,
    };
  }

  // Aggregate balance calculations:
  const totalExpected = formattedInstallments.reduce((sum, i) => sum + i.expectedAmount, 0);
  const totalPaid = formattedInstallments.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalOutstanding = Math.max(0, totalExpected - totalPaid);

  // All approved receipts for this student
  const allReceipts = await prisma.paymentReceipt.findMany({
    where: { studentRecordId },
    orderBy: { approvedAt: 'desc' },
  });

  // All payment submissions history
  const allSubmissions = await prisma.paymentSubmission.findMany({
    where: { studentRecordId },
    include: {
      installment: { select: { billingLabel: true, billingMonth: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    installments: formattedInstallments,
    nextDue,
    countdown,
    totalExpected,
    totalPaid,
    totalOutstanding,
    hasConfig: formattedInstallments.length > 0,
    departmentName: sr.department?.name,
    programName: sr.program?.name,
    programCode: sr.program?.code,
    programType: sr.programType,
    shortProgramDuration: sr.shortProgramDuration ?? undefined,
    paymentMethods: SUPPORTED_PAYMENT_METHODS,
    receipts: allReceipts,
    paymentHistory: allSubmissions.map((s) => ({
      ...s,
      billingLabel: s.installment.billingLabel,
      billingMonth: s.installment.billingMonth,
    })),
  };
}

// ── Send payment reminders for overdue/due installments ───────────────────────

export async function sendPaymentReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(dueSoon.getDate() + 3);

  const installments = await prisma.monthlyInstallment.findMany({
    where: {
      status: { in: ['DUE', 'OVERDUE', 'UPCOMING'] },
      dueDate: { lte: dueSoon },
    },
    include: {
      studentRecord: {
        include: {
          user: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  let sent = 0;
  for (const inst of installments) {
    const userId = inst.studentRecord.user.id;
    const daysOverdue = Math.max(0, Math.round((now.getTime() - inst.dueDate.getTime()) / 86400000));
    const isOverdue = inst.status === 'OVERDUE';

    await createNotification({
      userId,
      title: isOverdue ? '⚠️ Tuition Payment Overdue' : '💳 Tuition Payment Reminder',
      message: isOverdue
        ? `Your tuition payment for ${inst.billingLabel} is ${daysOverdue} days overdue. Amount: ETB ${inst.expectedAmount.toLocaleString()}. Please submit your payment receipt immediately.`
        : `Your tuition payment for ${inst.billingLabel} is due on ${inst.dueDate.toLocaleDateString()}. Amount: ETB ${inst.expectedAmount.toLocaleString()}.`,
      type: isOverdue ? 'WARNING' : 'INFO',
      module: 'FINANCE',
      entityId: inst.id,
      actionTab: 'financials',
    }).catch(() => {});
    sent++;
  }

  return { sent };
}
