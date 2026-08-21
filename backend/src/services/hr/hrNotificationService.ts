import { prisma } from '../../lib/prisma';

export async function listNotifications(recipientUserId: string) {
  return prisma.hRNotification.findMany({
    where: { recipientUserId },
    orderBy: { createdAt: 'desc' },
    include: {
      employee: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });
}

export async function markNotificationRead(id: string, recipientUserId: string) {
  const notif = await prisma.hRNotification.findUnique({ where: { id } });
  if (!notif) throw new Error('Notification not found');
  if (notif.recipientUserId !== recipientUserId) throw new Error('Unauthorized');
  return prisma.hRNotification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllNotificationsRead(recipientUserId: string) {
  return prisma.hRNotification.updateMany({
    where: { recipientUserId, isRead: false },
    data:  { isRead: true },
  });
}

export async function createNotification(data: {
  recipientUserId: string; employeeId?: string; type: string;
  title: string; message: string; tab: string;
}) {
  return prisma.hRNotification.create({
    data: {
      recipientUserId: data.recipientUserId,
      employeeId:      data.employeeId ?? null,
      type:            data.type as any,
      title:           data.title,
      message:         data.message,
      tab:             data.tab,
    },
  });
}
