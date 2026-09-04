/**
 * Internal Messaging Routes — /api/messages
 * ─────────────────────────────────────────────────────────────────────────────
 * STAFF-ONLY: every endpoint enforces !STUDENT at the middleware level.
 * Students receive 403 even if they guess the URL directly.
 *
 * All responses are scoped to the authenticated user — no user can read
 * another user's conversations unless they are a verified participant.
 */

import { Router, Response }  from 'express';
import path                  from 'path';
import fs                    from 'fs';
import multer                from 'multer';
import { randomBytes }       from 'crypto';
import { z }                 from 'zod';
import { prisma }            from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { Role }              from '../types/auth';
import {
  isOnline,
  broadcastNewMessage,
  broadcastMessageEdited,
  broadcastMessageDeleted,
  broadcastMessageRead,
  broadcastConversationCreated,
} from '../lib/socket';
import { createNotification } from '../services/notificationService';
import * as svc              from '../services/messaging/messagingService';

const router = Router();

// ── All messaging routes require authentication + staff role ──────────────────

const STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR,
  Role.FINANCE_OFFICER, Role.HR_OFFICER, Role.DEPARTMENT_HEAD,
  Role.INSTRUCTOR,
];

router.use(authenticate);
router.use(requireRole(STAFF_ROLES));

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(res: Response, data: unknown, status = 200)      { res.status(status).json(data); }
function fail(res: Response, err: unknown, status = 500)     {
  const msg = err instanceof Error ? err.message : 'Unexpected error';
  const code = msg.includes('Not a participant') || msg.includes('not authorised')
    ? 403
    : msg.includes('not found') || msg.includes('Not found')
    ? 404
    : msg.includes('Staff only') || msg.includes('Cannot delete') || msg.includes('Only ADMIN')
    ? 403
    : msg.includes('already') || msg.includes('too long') || msg.includes('empty') || msg.includes('require')
    ? 400
    : status;
  res.status(code).json({ error: msg });
}
function uid(req: AuthRequest)  { return req.user!.userId; }
function role(req: AuthRequest) { return req.user!.role; }

// ── File upload setup for message attachments ─────────────────────────────────

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads', 'messages');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const msgStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase() || '.bin';
    const stored = `${randomBytes(16).toString('hex')}${ext}`;
    cb(null, stored);
  },
});

const msgUpload = multer({
  storage:    msgStorage,
  limits:     { fileSize: 25 * 1024 * 1024 }, // 25 MB per attachment
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} is not allowed.`));
  },
});

// ── Employee search ───────────────────────────────────────────────────────────
// GET /api/messages/employees?q=<search>&limit=20

router.get('/employees', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q           = (req.query.q as string | undefined) ?? '';
    const parsedLimit = parseInt((req.query.limit as string) ?? '500', 10);
    const limit       = isNaN(parsedLimit) || parsedLimit <= 0 ? 500 : Math.min(1000, parsedLimit);
    ok(res, await svc.searchEmployees(uid(req), role(req), q, limit));
  } catch (e) { fail(res, e); }
});

// ── Unread count (lightweight for sidebar badge) ──────────────────────────────
// GET /api/messages/unread

router.get('/unread', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const counts = await svc.getUnreadCounts(uid(req));
    const total  = Object.values(counts).reduce((a, b) => a + b, 0);
    ok(res, { total, perConversation: counts });
  } catch (e) { fail(res, e); }
});

// ── Conversations ─────────────────────────────────────────────────────────────

// GET /api/messages/conversations?archived=false
router.get('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const archived = req.query.archived === 'true';
    const convos   = await svc.listConversations(uid(req), archived);

    // Augment with unread counts
    const counts = await svc.getUnreadCounts(uid(req));
    const result = convos.map(c => ({ ...c, unreadCount: counts[c.id] ?? 0 }));

    ok(res, result);
  } catch (e) { fail(res, e); }
});

// POST /api/messages/conversations
router.post('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      type:           z.enum(['DIRECT', 'GROUP', 'DEPARTMENT', 'OFFICIAL']),
      name:           z.string().min(1).max(100).optional(),
      description:    z.string().max(500).optional(),
      participantIds: z.array(z.string().uuid()).min(1).max(50),
      departmentId:   z.string().uuid().optional(),
      priority:       z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).optional(),
      requiresAck:    z.boolean().optional(),
      expiresAt:      z.string().datetime().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }

    const conv = await svc.createConversation(uid(req), role(req), {
      ...parsed.data,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    });

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: conv.id, leftAt: null },
      select: { userId: true },
    });
    broadcastConversationCreated(participants.map(p => p.userId), conv as any);

    ok(res, conv, 201);
  } catch (e) { fail(res, e, 400); }
});

// GET /api/messages/conversations/:id
router.get('/conversations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    ok(res, await svc.getConversation(String(req.params['id']), uid(req)));
  } catch (e) { fail(res, e); }
});

// DELETE /api/messages/conversations/:id
router.delete('/conversations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    ok(res, await svc.deleteConversation(String(req.params['id']), uid(req), role(req)));
  } catch (e) { fail(res, e); }
});

// PATCH /api/messages/conversations/:id/prefs
router.patch('/conversations/:id/prefs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      isMuted:    z.boolean().optional(),
      isPinned:   z.boolean().optional(),
      isArchived: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }
    ok(res, await svc.updateParticipantPrefs(String(req.params['id']), uid(req), parsed.data));
  } catch (e) { fail(res, e); }
});

// POST /api/messages/conversations/:id/participants
router.post('/conversations/:id/participants', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userIds } = req.body as { userIds: string[] };
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ error: 'userIds array required.' }); return;
    }
    await svc.addParticipants(String(req.params['id']), uid(req), userIds);
    ok(res, { success: true });
  } catch (e) { fail(res, e, 400); }
});

// DELETE /api/messages/conversations/:id/participants/:userId
router.delete('/conversations/:id/participants/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await svc.removeParticipant(String(req.params['id']), uid(req), String(req.params['userId']));
    ok(res, { success: true });
  } catch (e) { fail(res, e); }
});

// POST /api/messages/conversations/:id/read
router.post('/conversations/:id/read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const convId = String(req.params['id']);
    await svc.markConversationRead(convId, uid(req));

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId, leftAt: null },
      select: { userId: true },
    });
    broadcastMessageRead({
      conversationId: convId,
      readerUserId: uid(req),
      participantUserIds: participants.map(p => p.userId),
    });

    ok(res, { success: true });
  } catch (e) { fail(res, e); }
});

// POST /api/messages/department/:departmentId — get-or-create department conversation
router.post('/department/:departmentId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    ok(res, await svc.getOrCreateDepartmentConversation(String(req.params['departmentId']), uid(req), role(req)));
  } catch (e) { fail(res, e, 400); }
});

// ── Messages ──────────────────────────────────────────────────────────────────

// GET /api/messages/conversations/:id/messages?cursor=<id>
router.get('/conversations/:id/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cursor = req.query.cursor as string | undefined;
    ok(res, await svc.listMessages(String(req.params['id']), uid(req), cursor));
  } catch (e) { fail(res, e); }
});

// POST /api/messages/conversations/:id/messages
router.post('/conversations/:id/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schema = z.object({
      content:     z.string().min(1).max(8000),
      replyToId:   z.string().uuid().optional(),
      messageType: z.enum(['TEXT', 'ATTACHMENT', 'OFFICIAL', 'SYSTEM']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }

    const convId  = String(req.params['id']);
    const message = await svc.sendMessage(convId, uid(req), role(req), parsed.data);

    // Broadcast new message via Socket.IO immediately
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId, leftAt: null },
      select: { userId: true },
    });
    const participantIds = participants.map(pp => pp.userId);
    await broadcastNewMessage(convId, participantIds, message as any, uid(req));

    // ── Notify offline participants ────────────────────────────────────────
    const sender = req.user!;
    setImmediate(async () => {
      try {
        const nonOnlineParts = await prisma.conversationParticipant.findMany({
          where: {
            conversationId: convId,
            userId: { not: sender.userId },
            leftAt: null,
            isMuted: false,
          },
          include: { user: { select: { id: true, fullName: true, status: true } } },
        });

        const conv = await prisma.conversation.findUnique({
          where:  { id: convId },
          select: { name: true, type: true },
        });
        const senderName = await prisma.user.findUnique({
          where:  { id: sender.userId },
          select: { fullName: true },
        });

        for (const p of nonOnlineParts) {
          if (p.user.status !== 'ACTIVE') continue;
          if (isOnline(p.userId)) continue; // socket already notified

          const convName =
            conv?.type === 'DIRECT'
              ? `${senderName?.fullName ?? 'Someone'}`
              : conv?.name ?? 'Group';

          await createNotification({
            userId:     p.userId,
            title:      `New message from ${senderName?.fullName ?? 'Someone'}`,
            message:    `${conv?.type !== 'DIRECT' ? `${convName}: ` : ''}${parsed.data.content.substring(0, 100)}${parsed.data.content.length > 100 ? '…' : ''}`,
            type:       'INFO',
            module:     'SYSTEM',
            entityType: 'Conversation',
            entityId:   String(convId),
            actionTab:  'messages',
          });
        }
      } catch { /* notification failure never blocks message send */ }
    });

    ok(res, message, 201);
  } catch (e) { fail(res, e, 400); }
});

// PATCH /api/messages/messages/:messageId
router.patch('/messages/:messageId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body as { content: string };
    if (!content?.trim()) { res.status(400).json({ error: 'Content required.' }); return; }
    const edited = await svc.editMessage(String(req.params['messageId']), uid(req), content);

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: (edited as any).conversationId, leftAt: null },
      select: { userId: true },
    });
    broadcastMessageEdited({
      conversationId: (edited as any).conversationId,
      messageId: (edited as any).id,
      content: (edited as any).content,
      editedAt: ((edited as any).editedAt ?? new Date()).toISOString(),
      participantUserIds: participants.map(p => p.userId),
    });

    ok(res, edited);
  } catch (e) { fail(res, e); }
});

// DELETE /api/messages/messages/:messageId
router.delete('/messages/:messageId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deleteType = req.query.type === 'admin' ? 'ADMIN' : 'SELF';
    const deleted = await svc.deleteMessage(String(req.params['messageId']), uid(req), role(req), deleteType);

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: (deleted as any).conversationId, leftAt: null },
      select: { userId: true },
    });
    broadcastMessageDeleted({
      conversationId: (deleted as any).conversationId,
      messageId: (deleted as any).id,
      deletedAt: ((deleted as any).deletedAt ?? new Date()).toISOString(),
      participantUserIds: participants.map(p => p.userId),
    });

    ok(res, deleted);
  } catch (e) { fail(res, e); }
});

// POST /api/messages/messages/:messageId/acknowledge
router.post('/messages/:messageId/acknowledge', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await svc.acknowledgeMessage(String(req.params['messageId']), uid(req));
    ok(res, { success: true });
  } catch (e) { fail(res, e); }
});

// ── Attachments ───────────────────────────────────────────────────────────────

// POST /api/messages/conversations/:id/attachments
router.post(
  '/conversations/:id/attachments',
  msgUpload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) { res.status(400).json({ error: 'No file provided.' }); return; }

    try {
      // First create a placeholder message, then attach
      const convId  = String(req.params['id']);
      const message = await svc.sendMessage(convId, uid(req), role(req), {
        content:     req.file.originalname,
        messageType: 'ATTACHMENT',
      });

      const msgId = (message as unknown as { id: string }).id;
      const att = await svc.createAttachment(msgId, uid(req), {
        originalFileName: req.file.originalname,
        storedFileName:   req.file.filename,
        mimeType:         req.file.mimetype,
        fileSize:         req.file.size,
        storagePath:      req.file.path,
      });

      const fullMessage = {
        ...(message as Record<string, unknown>),
        attachments: [att],
      };

      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: convId, leftAt: null },
        select: { userId: true },
      });
      const participantIds = participants.map(pp => pp.userId);
      await broadcastNewMessage(convId, participantIds, fullMessage, uid(req));

      ok(res, fullMessage, 201);
    } catch (e) { fail(res, e); }
  }
);

// GET /api/messages/attachments/:attachmentId — authenticated download
router.get('/attachments/:attachmentId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const att = await svc.getAttachment(String(req.params['attachmentId']), uid(req));

    if (!fs.existsSync(att.storagePath)) {
      res.status(404).json({ error: 'File not found.' }); return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.originalFileName)}"`);
    res.setHeader('Content-Type', att.mimeType);
    res.sendFile(att.storagePath);
  } catch (e) { fail(res, e); }
});

// ── Multer error handler ──────────────────────────────────────────────────────
router.use((err: Error, _req: AuthRequest, res: Response, _next: unknown): void => {
  if (err?.message?.startsWith('File type')) {
    res.status(400).json({ error: err.message });
  } else if (err?.message?.includes('File too large')) {
    res.status(400).json({ error: 'File too large (max 25 MB).' });
  } else {
    res.status(500).json({ error: 'Upload failed.' });
  }
});

export default router;
