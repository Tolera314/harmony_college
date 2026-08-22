import { prisma } from '../../lib/prisma';

export interface FONotificationItem {
  id: string;
  type: 'payment_received' | 'payment_overdue' | 'installment_due' | 'reconciliation_failed' | 'large_payment' | 'system' | 'reminder';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  tab: string;
  amount?: number;
  studentId?: string;
}

const mockNotifs: FONotificationItem[] = [
  {
    id: 'FO-NOTIF-001',
    type: 'payment_received',
    title: 'Registration Payment Verified',
    message: 'Abebe Bikila registration fee payment of ETB 1,500 verified.',
    timestamp: '10 mins ago',
    read: false,
    tab: 'registration_payments',
    amount: 1500,
    studentId: 'HC/2026/0012',
  },
  {
    id: 'FO-NOTIF-002',
    type: 'reconciliation_failed',
    title: 'Gateway Mismatch Alert',
    message: 'Telebirr payment TXN-TB-99201 requires manual matching review.',
    timestamp: '1 hour ago',
    read: false,
    tab: 'reconciliation',
  },
  {
    id: 'FO-NOTIF-003',
    type: 'payment_overdue',
    title: 'Overdue Account Alert',
    message: '14 student accounts in Computer Science department have crossed 30 days overdue.',
    timestamp: '3 hours ago',
    read: true,
    tab: 'outstanding',
  },
];

export async function getNotifications(recipientUserId: string) {
  return { notifications: mockNotifs };
}

export async function markAsRead(notificationId: string, recipientUserId: string) {
  const notif = mockNotifs.find((n) => n.id === notificationId);
  if (notif) notif.read = true;
  return { success: true };
}

export async function markAllAsRead(recipientUserId: string) {
  mockNotifs.forEach((n) => (n.read = true));
  return { success: true };
}

export async function sendPaymentReminder(
  studentRecordId: string,
  message: string,
  senderUserId: string
) {
  const student = await prisma.studentRecord.findUnique({
    where: { id: studentRecordId },
    include: { user: true, financialAccount: true },
  });

  if (!student) throw new Error('Student record not found');

  const balance = student.financialAccount ? student.financialAccount.balance : 0;

  await prisma.notification.create({
    data: {
      userId: student.userId,
      title: 'Tuition Payment Reminder ⚠️',
      message:
        message ||
        `Dear ${student.user.fullName}, you have an outstanding balance of ETB ${balance.toLocaleString()} for the current academic term. Please settle your payment promptly.`,
      type: 'WARNING',
    },
  });

  return { success: true, studentId: student.studentId, studentName: student.user.fullName };
}
