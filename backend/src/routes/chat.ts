/**
 * /api/chat — Legacy chat endpoints
 * Updated to use the new Conversation.type field while keeping the
 * isGroup response field for backward compatibility with the existing ChatView.
 *
 * NOTE: New features (group types, official messages, attachments) use
 * /api/messages instead. This router handles the basic 1-on-1 and simple
 * group flows consumed by ChatView.tsx.
 */

import { Router, Response } from 'express';
import { prisma }            from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Role }              from '../types/auth';

const router = Router();

// All chat routes require auth
router.use(requireAuth);

// ── Permission helpers ────────────────────────────────────────────────────────
const ADMIN_ROLES: string[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR];
const PRIVILEGED_ROLES: string[] = [
  Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR,
  Role.FINANCE_OFFICER, Role.HR_OFFICER, Role.DEPARTMENT_HEAD,
];

async function canMessage(
  _requesterId: string,
  requesterRole: string,
  _targetId: string,
  targetRole: string
): Promise<boolean> {
  if (ADMIN_ROLES.includes(requesterRole)) return true;
  if (ADMIN_ROLES.includes(targetRole))    return true;
  if (requesterRole === Role.INSTRUCTOR && targetRole === Role.STUDENT) return true;
  if (requesterRole === Role.STUDENT    && targetRole === Role.INSTRUCTOR) return true;
  if (PRIVILEGED_ROLES.includes(requesterRole) && PRIVILEGED_ROLES.includes(targetRole)) return true;
  return false;
}

// ── GET /api/chat/users ───────────────────────────────────────────────────────
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;

    const users = await prisma.user.findMany({
      where:  { id: { not: userId } },
      select: { id: true, fullName: true, role: true, email: true },
    });

    const allowed = users.filter((u) => {
      if (ADMIN_ROLES.includes(role))   return true;
      if (ADMIN_ROLES.includes(u.role)) return true;
      if (role === Role.INSTRUCTOR && u.role === Role.STUDENT)   return true;
      if (role === Role.STUDENT    && u.role === Role.INSTRUCTOR) return true;
      if (PRIVILEGED_ROLES.includes(role) && PRIVILEGED_ROLES.includes(u.role)) return true;
      return false;
    });

    res.json(allowed);
  } catch (err) {
    console.error('[chat/users]', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

// ── GET /api/chat/conversations ───────────────────────────────────────────────
router.get('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user!;

    const rows = await prisma.conversationParticipant.findMany({
      where: { userId, leftAt: null },
      include: {
        conversation: {
          include: {
            participants: {
              where: { leftAt: null },
              include: { user: { select: { id: true, email: true, role: true } } },
            },
            messages: {
              where:   { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take:    1,
              include: { sender: { select: { email: true } } },
            },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    });

    const convos = rows.map((row) => {
      const conv    = row.conversation;
      const lastMsg = conv.messages[0] ?? null;
      return {
        id:           conv.id,
        isGroup:      conv.type !== 'DIRECT',   // backward compat for ChatView
        type:         conv.type,
        name:         conv.name,
        createdAt:    conv.createdAt,
        participants: conv.participants.map((p) => ({
          ...p.user,
          lastReadAt: p.lastReadAt,
        })),
        lastMessage: lastMsg
          ? {
              content:     lastMsg.isDeleted ? '[Message deleted]' : lastMsg.content,
              senderEmail: lastMsg.sender.email,
              createdAt:   lastMsg.createdAt,
            }
          : null,
        lastReadAt: row.lastReadAt,
      };
    });

    res.json(convos);
  } catch (err) {
    console.error('[chat/conversations]', err);
    res.status(500).json({ error: 'Failed to load conversations.' });
  }
});

// ── GET /api/chat/conversations/:id/messages ──────────────────────────────────
router.get('/conversations/:id/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId }       = req.user!;
    const conversationId   = String(req.params['id']);
    const cursor           = req.query.cursor as string | undefined;
    const PAGE             = 30;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant || participant.leftAt) {
      res.status(403).json({ error: 'Not a participant.' }); return;
    }

    const messages = await prisma.message.findMany({
      where:   { conversationId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take:    PAGE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: { id: true, email: true, role: true } } },
    });

    // Mark as read
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data:  { lastReadAt: new Date() },
    });

    res.json(messages.reverse()); // oldest → newest
  } catch (err) {
    console.error('[chat/messages]', err);
    res.status(500).json({ error: 'Failed to load messages.' });
  }
});

// ── POST /api/chat/conversations ──────────────────────────────────────────────
router.post('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    const { targetUserIds, isGroup, name } = req.body as {
      targetUserIds: string[];
      isGroup?:      boolean;
      name?:         string;
    };

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      res.status(400).json({ error: 'targetUserIds is required.' }); return;
    }

    const targets = await prisma.user.findMany({
      where:  { id: { in: targetUserIds } },
      select: { id: true, role: true },
    });

    for (const target of targets) {
      const allowed = await canMessage(userId, role, target.id, target.role);
      if (!allowed) {
        res.status(403).json({ error: `You are not allowed to message user ${target.id}.` }); return;
      }
    }

    const convType = isGroup ? 'GROUP' : 'DIRECT';

    // For 1-on-1: reuse existing conversation if it exists
    if (!isGroup && targetUserIds.length === 1) {
      const existing = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: targetUserIds[0]! } } },
          ],
        },
        include: {
          participants: { include: { user: { select: { id: true, email: true, role: true } } } },
          messages:     { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (existing) { res.status(200).json(existing); return; }
    }

    const allParticipantIds = [...new Set([userId, ...targetUserIds])];
    const now = new Date();

    const conversation = await prisma.conversation.create({
      data: {
        type:        convType,
        name:        isGroup ? (name ?? 'Group Chat') : null,
        createdById: userId,
        participants: {
          create: allParticipantIds.map((uid) => ({
            userId:          uid,
            participantRole: uid === userId ? 'ADMIN' : 'MEMBER',
            joinedAt:        now,
          })),
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, email: true, role: true } } } },
      },
    });

    res.status(201).json(conversation);
  } catch (err) {
    console.error('[chat/create]', err);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

export default router;
