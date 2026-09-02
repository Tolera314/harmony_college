/**
 * HR Notification Service
 * ─────────────────────────────────────────────────────────────────────────────
 * All HR notifications now live in the unified `Notification` table with
 * `module = 'HR'`.  This replaces the old `HRNotification` table completely.
 *
 * Every write goes through the top-level `notificationService.createNotification()`
 * which handles DB insert + real-time Socket.IO push in one call.
 *
 * HR-specific fields are mapped as follows:
 *   recipientUserId → userId
 *   employeeId      → entityId   (entityType = 'HREmployee')
 *   tab             → actionTab
 *   type            → type       (LEAVE | PAYROLL | CONTRACT | ONBOARDING | PERFORMANCE | SYSTEM)
 *   module          = 'HR'       (always)
 */

import { prisma }                              from '../../lib/prisma';
import { createNotification as coreCreate }    from '../notificationService';

// ── List HR notifications for a given HR officer (userId-scoped, module=HR) ──

export async function listNotifications(recipientUserId: string) {
  return prisma.notification.findMany({
    where:   { userId: recipientUserId, module: 'HR' },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Mark one read (compound WHERE prevents IDOR) ──────────────────────────────

export async function markNotificationRead(id: string, recipientUserId: string) {
  const result = await prisma.notification.updateMany({
    where: { id, userId: recipientUserId, module: 'HR' },
    data:  { isRead: true },
  });
  if (result.count === 0) throw new Error('Notification not found.');
  return { id, isRead: true };
}

// ── Mark all read for this HR officer ─────────────────────────────────────────

export async function markAllNotificationsRead(recipientUserId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId: recipientUserId, module: 'HR', isRead: false },
    data:  { isRead: true },
  });
  return { updatedCount: result.count };
}

// ── Create an HR notification (persists + socket-pushes instantly) ────────────
//
// `employeeId` is stored as `entityId` with `entityType = 'HREmployee'` so the
// frontend can still look up the related employee if needed.
//
// Named `createNotification` for backward compatibility with callers that already
// do:  import { createNotification } from './hrNotificationService';

export async function createNotification(data: {
  recipientUserId: string;
  employeeId?:     string;
  type:            string;  // LEAVE | PAYROLL | CONTRACT | ONBOARDING | PERFORMANCE | SYSTEM
  title:           string;
  message:         string;
  tab:             string;  // HRNavTab deep-link (e.g. 'leave', 'employees')
}) {
  await coreCreate({
    userId:     data.recipientUserId,
    title:      data.title,
    message:    data.message,
    type:       data.type,
    module:     'HR',
    entityType: 'HREmployee',
    entityId:   data.employeeId,
    actionTab:  data.tab,
  });
}
