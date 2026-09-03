/**
 * Harmony College — Unified Notification Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Single source of truth for ALL in-app notifications that use the generic
 * `Notification` table (students, instructors, registrar, DH, FO, admin).
 *
 * HR notifications now also live in the unified `Notification` table (module='HR').
 *
 * Security contract
 * ─────────────────
 * • Every read / mark-read operation scopes to `userId` in the WHERE clause.
 *   A user can NEVER read or mark another user's notification.
 * • `create()` fires a socket push to `user:${userId}` in the background
 *   (fire-and-forget) so the browser badge increments in real time.
 * • `broadcastToRole()` fans out to all active users of a given role and
 *   pushes each one individually — never exposes one user's data to another.
 *
 * Notification types (stored as plain strings — no enum to keep it flexible)
 * ──────────────────────────────────────────────────────────────────────────────
 *  INFO | SUCCESS | WARNING | ERROR
 *  GRADE | SCHEDULE | ENROLLMENT | ANNOUNCEMENT
 *  LEAVE | PAYROLL | FINANCE | ADMISSION | TRANSCRIPT | GRADUATION | CERTIFICATE
 */

import { prisma }             from '../lib/prisma';
import { pushNotification }   from '../lib/socket';
import type { Role }          from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  userId:      string;
  title:       string;
  message:     string;
  type?:       string;        // default "INFO"
  /** Module namespace. Values: ACADEMIC | HR | FINANCE | ADMIN | SYSTEM. Default: ACADEMIC */
  module?:     string;
  entityType?: string;
  entityId?:   string;
  actionTab?:  string;        // deep-link to a dashboard tab
}

export interface NotificationListQuery {
  userId:      string;
  page?:       number;
  limit?:      number;
  unreadOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE + PUSH (all callers should use this instead of prisma.notification.create)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persists a notification row and immediately pushes it to the target user's
 * open browser tab via Socket.IO (`notification:new` event on `user:${userId}`).
 * The push is fire-and-forget — a push failure never throws.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  const row = await prisma.notification.create({
    data: {
      userId:     input.userId,
      title:      input.title,
      message:    input.message,
      type:       input.type      ?? 'INFO',
      module:     input.module    ?? 'ACADEMIC',
      entityType: input.entityType ?? null,
      entityId:   input.entityId   ?? null,
      actionTab:  input.actionTab  ?? null,
      pushedAt:   null,
    },
  });

  // Real-time push — best-effort, never throws
  try {
    pushNotification({
      id:         row.id,
      userId:     row.userId,
      title:      row.title,
      message:    row.message,
      type:       row.type,
      actionTab:  row.actionTab,
      entityType: row.entityType,
      entityId:   row.entityId,
      createdAt:  row.createdAt.toISOString(),
    });
    // Record that we attempted the push
    await prisma.notification.update({
      where: { id: row.id },
      data:  { pushedAt: new Date() },
    }).catch(() => { /* pushedAt is informational — ignore update failure */ });
  } catch {
    /* socket push failure must never crash the caller */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BROADCAST — fan-out to all active users of a given role (or all roles)
// ─────────────────────────────────────────────────────────────────────────────

export interface BroadcastInput {
  title:       string;
  message:     string;
  type?:       string;
  /** Module namespace. Default: ACADEMIC */
  module?:     string;
  role?:       Role;
  entityType?: string;
  entityId?:   string;
  actionTab?:  string;
}

/**
 * Creates a notification row for every matching active user and pushes each
 * one in real time. Returns the count of rows created.
 *
 * Used by Admin for system-wide announcements.
 */
export async function broadcastNotification(
  input: BroadcastInput,
): Promise<{ sent: number }> {
  const where: Record<string, unknown> = { status: 'ACTIVE' };
  if (input.role) where.role = input.role;

  const users = await prisma.user.findMany({ where, select: { id: true } });
  if (users.length === 0) return { sent: 0 };

  const now = new Date();
  const { randomUUID } = await import('crypto');

  // Build rows with pre-generated IDs — captured before insert so the push loop
  // uses exact IDs with no fuzzy re-fetch. This eliminates the race condition where
  // a concurrent broadcast with the same title could match wrong rows.
  const rows = users.map(u => ({
    id:         randomUUID(),
    userId:     u.id,
    title:      input.title,
    message:    input.message,
    type:       input.type      ?? 'INFO',
    module:     input.module    ?? 'ACADEMIC',
    entityType: input.entityType ?? null,
    entityId:   input.entityId   ?? null,
    actionTab:  input.actionTab  ?? null,
    isRead:     false,
    createdAt:  now,
  }));

  // Bulk insert — skipDuplicates makes retries safe
  await prisma.notification.createMany({ data: rows, skipDuplicates: true });

  // Push each user with the exact row we just inserted — no re-fetch needed
  for (const row of rows) {
    try {
      pushNotification({
        id:         row.id,
        userId:     row.userId,
        title:      row.title,
        message:    row.message,
        type:       row.type,
        actionTab:  row.actionTab,
        entityType: row.entityType,
        entityId:   row.entityId,
        createdAt:  row.createdAt.toISOString(),
      });
    } catch { /* per-user push failure must not abort the loop */ }
  }

  // Stamp pushedAt in bulk (informational only)
  await prisma.notification.updateMany({
    where: { id: { in: rows.map(r => r.id) } },
    data:  { pushedAt: now },
  }).catch(() => {});

  return { sent: rows.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST — scoped strictly to the requesting user
// ─────────────────────────────────────────────────────────────────────────────

export async function listNotifications(q: NotificationListQuery) {
  const page  = Math.max(1,   q.page  ?? 1);
  const limit = Math.min(100, q.limit ?? 20);
  const skip  = (page - 1) * limit;

  const where: Record<string, unknown> = { userId: q.userId };
  if (q.unreadOnly) where.isRead = false;

  const [total, notifications, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, userId: true, title: true, message: true,
        type: true, isRead: true, actionTab: true, module: true,
        entityType: true, entityId: true, createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId: q.userId, isRead: false } }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages:  Math.ceil(total / limit),
    unreadCount,
    notifications,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UNREAD COUNT — lightweight poll for header badge
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK READ — always scoped to userId (prevents IDOR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks a single notification as read.
 * Throws 'Not authorized' if the notification does not belong to `userId`.
 */
export async function markRead(
  notificationId: string,
  userId: string,
): Promise<{ id: string; isRead: boolean }> {
  // updateMany with compound where is the safest pattern:
  // it silently does nothing if userId doesn't match (no separate findUnique round-trip).
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data:  { isRead: true },
  });
  if (result.count === 0) {
    // Either doesn't exist or belongs to another user — same 404 response to
    // avoid enumeration.
    throw new Error('Notification not found.');
  }
  return { id: notificationId, isRead: true };
}

/**
 * Marks ALL unread notifications for `userId` as read.
 */
export async function markAllRead(userId: string): Promise<{ updatedCount: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  });
  return { updatedCount: result.count };
}