import { prisma }              from '../../lib/prisma';
import { createNotification } from '../notificationService';

/**
 * Finance Officer notifications are pulled from the real Notification table
 * (same table used by Admin and Registrar). They are scoped to the FO user.
 */
export async function getNotifications(recipientUserId: string) {
  const rows = await prisma.notification.findMany({
    where:   { userId: recipientUserId },
    orderBy: { createdAt: 'desc' },
    take:    50,
  });

  const mapped = rows.map((n) => ({
    id:         n.id,
    type:       mapType(n.type, n.entityType),
    title:      n.title,
    message:    n.message,
    timestamp:  relativeTime(n.createdAt),
    read:       n.isRead,
    tab:        mapTab(n.type, n.entityType),
    entityType: n.entityType,
    entityId:   n.entityId,
    createdAt:  n.createdAt,
  }));

  return { total: mapped.length, notifications: mapped };
}

export async function markAsRead(notificationId: string, recipientUserId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: recipientUserId },
    data:  { isRead: true },
  });
  return { success: true };
}

export async function markAllAsRead(recipientUserId: string) {
  await prisma.notification.updateMany({
    where: { userId: recipientUserId, isRead: false },
    data:  { isRead: true },
  });
  return { success: true };
}

/**
 * Send a tuition-payment reminder to a student.
 * Uses the unified notificationService so the student gets a real-time
 * socket push on their open dashboard tab.
 */
export async function sendPaymentReminder(
  studentRecordId: string,
  message: string,
  senderUserId: string,
) {
  const student = await prisma.studentRecord.findUnique({
    where:   { id: studentRecordId },
    include: { user: true, financialAccount: true },
  });
  if (!student) throw new Error('Student record not found');

  const balance = student.financialAccount?.balance ?? 0;

  // createNotification handles DB insert + socket push in one call
  await createNotification({
    userId:     student.userId,
    title:      'Tuition Payment Reminder',
    message:    message ||
      `Dear ${student.user.fullName}, you have an outstanding balance of ETB ${balance.toLocaleString()} for the current academic term. Please settle your payment promptly.`,
    type:       'WARNING',
    entityType: 'FinancialAccount',
    entityId:   student.financialAccount?.id ?? undefined,
    actionTab:  'financials',
  });

  return {
    success:     true,
    studentId:   student.studentId,
    studentName: student.user.fullName,
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

function mapType(
  type:       string | null,
  entityType: string | null,
): 'payment_received' | 'payment_overdue' | 'reconciliation_failed' | 'large_payment' | 'system' | 'reminder' {
  if (type === 'SUCCESS')               return 'payment_received';
  if (type === 'WARNING')               return 'payment_overdue';
  if (type === 'ERROR')                 return 'reconciliation_failed';
  if (entityType === 'FinancialAccount') return 'payment_overdue';
  return 'system';
}

function mapTab(type: string | null, entityType: string | null): string {
  if (entityType === 'Application')     return 'registration_payments';
  if (entityType === 'FinancialAccount') return 'student_accounts';
  return 'overview';
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
