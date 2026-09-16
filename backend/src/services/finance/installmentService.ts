/**
 * Monthly Installment Service — Harmony College
 * Manages the creation and status of monthly payment installments for each student.
 * Generates installment schedules upon student registration / admin creation.
 * Automatically updates statuses (DUE, OVERDUE) based on dates.
 */
import { prisma }                from '../../lib/prisma';
import { ProgramType }           from '@prisma/client';
import { findApplicableConfig }  from './tuitionConfigService';
import { createNotification }    from '../notificationService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Parse shortProgramDuration string (e.g. "2 Months") → number of months.
 * Returns null if not parseable.
 */
function parseDurationMonths(duration: string | null): number | null {
  if (!duration) return null;
  const n = parseInt(duration, 10);
  return isNaN(n) ? null : n;
}

// ── Core: generate installments for a student ─────────────────────────────────

/**
 * Creates or ensures monthly installments exist for the student from the current
 * month through the end of their program duration.
 * Safe to call multiple times — idempotent (upsert on billingMonth).
 */
export async function generateInstallmentsForStudent(studentRecordId: string): Promise<{
  created: number;
  alreadyExisted: number;
  monthlyAmount: number | null;
  configFound: boolean;
}> {
  const sr = await prisma.studentRecord.findUnique({
    where:  { id: studentRecordId },
    include: {
      financialAccount: true,
      program:          { select: { id: true } },
      department:       { select: { id: true } },
    },
  });

  if (!sr) throw new Error('Student record not found.');

  // Ensure financial account exists
  let account = sr.financialAccount;
  if (!account) {
    account = await prisma.financialAccount.create({
      data: { studentRecordId },
    });
  }

  const durationMonths = parseDurationMonths(sr.shortProgramDuration);
  const config = await findApplicableConfig({
    academicContext: sr.programType,
    departmentId:    sr.departmentId,
    programId:       sr.programId,
    durationMonths,
  });

  if (!config) {
    // No config configured yet — skip silently, FO must configure first
    return { created: 0, alreadyExisted: 0, monthlyAmount: null, configFound: false };
  }

  // Determine billing period
  const admittedAt  = sr.admittedAt ?? new Date();
  const startDate   = new Date(admittedAt.getFullYear(), admittedAt.getMonth(), 1);
  const totalMonths = durationMonths ?? 12; // default 12 months if TVET / not specified

  let created = 0;
  let alreadyExisted = 0;

  for (let i = 0; i < totalMonths; i++) {
    const billingDate = new Date(startDate);
    billingDate.setMonth(billingDate.getMonth() + i);
    const key   = monthKey(billingDate);
    const label = monthLabel(billingDate);

    // Due on the 5th of the billing month
    const dueDate = new Date(billingDate.getFullYear(), billingDate.getMonth(), 5);

    const now = new Date();
    let status: 'UPCOMING' | 'DUE' | 'OVERDUE' = 'UPCOMING';
    if (dueDate < now) {
      const daysPast = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
      status = daysPast > 14 ? 'OVERDUE' : 'DUE';
    }

    const existing = await prisma.monthlyInstallment.findUnique({
      where: { studentRecordId_billingMonth: { studentRecordId, billingMonth: key } },
    });

    if (existing) {
      alreadyExisted++;
    } else {
      await prisma.monthlyInstallment.create({
        data: {
          financialAccountId: account.id,
          studentRecordId,
          tuitionConfigId:    config.id,
          academicContext:    sr.programType,
          billingMonth:       key,
          billingLabel:       label,
          dueDate,
          expectedAmount:     config.monthlyAmount,
          status,
        },
      });
      created++;
    }
  }

  return { created, alreadyExisted, monthlyAmount: config.monthlyAmount, configFound: true };
}

// ── Status sync: update DUE / OVERDUE for all open installments ───────────────

export async function syncInstallmentStatuses(): Promise<{ updated: number }> {
  const now = new Date();
  const overdueThreshold = new Date(now);
  overdueThreshold.setDate(overdueThreshold.getDate() - 14);

  // Mark UPCOMING → DUE (dueDate < now, within last 14 days)
  const due = await prisma.monthlyInstallment.updateMany({
    where: {
      status:  'UPCOMING',
      dueDate: { lt: now, gte: overdueThreshold },
    },
    data: { status: 'DUE' },
  });

  // Mark UPCOMING or DUE → OVERDUE (dueDate > 14 days ago)
  const overdue = await prisma.monthlyInstallment.updateMany({
    where: {
      status:  { in: ['UPCOMING', 'DUE'] },
      dueDate: { lt: overdueThreshold },
    },
    data: { status: 'OVERDUE' },
  });

  return { updated: due.count + overdue.count };
}

// ── Student view: get installments for a student ──────────────────────────────

export async function getStudentInstallments(studentRecordId: string) {
  // Sync statuses first
  await syncInstallmentStatuses();

  const installments = await prisma.monthlyInstallment.findMany({
    where: { studentRecordId },
    include: {
      submissions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true, status: true, evidenceUrl: true, evidenceFileName: true,
          paymentMethod: true, referenceNumber: true, paymentDate: true,
          rejectionReason: true, amount: true, createdAt: true,
        },
      },
      receipt: {
        select: {
          id: true, receiptNumber: true, amountPaid: true, paymentDate: true,
          paymentMethod: true, billingLabel: true, approvedAt: true,
        },
      },
    },
    orderBy: { billingMonth: 'asc' },
  });

  const sr = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: {
      department: { select: { name: true } },
    },
  });

  const formattedInstallments = installments.map((inst, idx) => ({
    ...inst,
    monthLabel: inst.billingLabel,
    monthIndex: idx + 1,
    paidAmount: inst.status === 'PAID' ? inst.expectedAmount : 0,
    paymentSubmissions: inst.submissions,
    receipts: inst.receipt ? [inst.receipt] : [],
  }));

  // Find next unpaid installment
  const nextDue = formattedInstallments.find(i =>
    ['DUE', 'OVERDUE', 'UPCOMING', 'PENDING_REVIEW', 'REJECTED'].includes(i.status) && i.status !== 'PAID'
  );

  const now = new Date();
  let countdown: {
    daysLeft: number;
    isOverdue: boolean;
    isDueToday: boolean;
    label: string;
    statusBadge: string;
    dueDate: string;
    amount: number;
  } | null = null;

  if (nextDue) {
    const diffMs = nextDue.dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86400000);
    const isOverdue = diffDays < 0;
    const isDueToday = diffDays === 0;
    const daysLeft = Math.abs(diffDays);

    let label = `${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'}`;
    if (isDueToday) label = 'PAYMENT DUE TODAY';
    else if (isOverdue) label = `${daysLeft} ${daysLeft === 1 ? 'DAY' : 'DAYS'} OVERDUE`;

    countdown = {
      daysLeft,
      isOverdue,
      isDueToday,
      label,
      statusBadge: nextDue.status,
      dueDate: nextDue.dueDate.toISOString(),
      amount: nextDue.expectedAmount,
    };
  }

  return {
    installments: formattedInstallments,
    nextDue: nextDue ?? null,
    countdown,
    totalExpected: installments.reduce((s, i) => s + i.expectedAmount, 0),
    totalPaid:     installments.filter(i => i.status === 'PAID').reduce((s, i) => s + i.expectedAmount, 0),
    totalOutstanding: installments
      .filter(i => i.status !== 'PAID')
      .reduce((s, i) => s + i.expectedAmount, 0),
    hasConfig: installments.length > 0,
    departmentName: sr?.department?.name,
    programType: sr?.programType,
    shortProgramDuration: sr?.shortProgramDuration ?? undefined,
  };
}

// ── Send payment reminders for overdue/due installments ───────────────────────

export async function sendPaymentReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(dueSoon.getDate() + 3); // 3 days ahead

  // Find installments due soon or overdue with no pending submission
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
    const name   = inst.studentRecord.user.fullName;
    const daysOverdue = Math.max(0, Math.round(
      (now.getTime() - inst.dueDate.getTime()) / 86400000
    ));

    const isOverdue = inst.status === 'OVERDUE';
    await createNotification({
      userId,
      title:     isOverdue ? '⚠️ Payment Overdue' : '💳 Payment Reminder',
      message:   isOverdue
        ? `Your tuition payment for ${inst.billingLabel} is ${daysOverdue} days overdue. Amount: ETB ${inst.expectedAmount.toLocaleString()}. Please submit your payment evidence immediately.`
        : `Your tuition payment for ${inst.billingLabel} is due on ${inst.dueDate.toLocaleDateString()}. Amount: ETB ${inst.expectedAmount.toLocaleString()}.`,
      type:      isOverdue ? 'WARNING' : 'INFO',
      module:    'FINANCE',
      entityId:  inst.id,
      actionTab: 'financials',
    }).catch(() => {});
    sent++;
  }

  return { sent };
}
