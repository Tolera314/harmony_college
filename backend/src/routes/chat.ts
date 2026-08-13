import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Role } from '../types/auth';

const router = Router();

// All chat routes require auth
router.use(requireAuth);

// ── Permission helpers ────────────────────────────────────────────────────────
// Updated to use the new Role enum values (REGISTRAR_OFFICER → REGISTRAR, LECTURER → INSTRUCTOR).
const ADMIN_ROLES: string[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR];
const PRIVILEGED_ROLES: string[] = [
  Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR,
  Role.FINANCE_OFFICER, Role.HR_OFFICER, Role.DEPARTMENT_HEAD,
];

/** Returns true if the requester is allowed to open a DM with the target */
async function canMessage(
  requesterId: string,
  requesterRole: string,
  targetId: string,
  targetRole: string
): Promise<boolean> {
  // Admin / Registrar can message anyone
  if (ADMIN_ROLES.includes(requesterRole)) return true;

  // Any staff can message Admin / Registrar
  if (ADMIN_ROLES.includes(targetRole)) return true;

  // Instructor ↔ their enrolled students
  if (requesterRole === Role.INSTRUCTOR && targetRole === Role.STUDENT) return true;
  if (requesterRole === Role.STUDENT    && targetRole === Role.INSTRUCTOR) return true;

  // Privileged staff can message each other
  if (PRIVILEGED_ROLES.includes(requesterRole) && PRIVILEGED_ROLES.includes(targetRole)) return true;

  // Student → Student: blocked in v1
  return false;
}

// ── GET /api/chat/users ───────────────────────────────────────────────────────
// Returns the list of users the current user is allowed to message
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;

    const users = await prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, fullName: true, role: true },  // Phase 7 M4: fullName instead of email
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
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: { select: { id: true, email: true, role: true } } },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: { email: true } } },
            },
          },
        },
      },
      orderBy: { conversation: { createdAt: 'desc' } },
    });

    const convos = rows.map((row) => {
      const conv = row.conversation;
      const lastMsg = conv.messages[0] ?? null;
      // Unread = messages after lastReadAt
      return {
        id: conv.id,
        isGroup: conv.isGroup,
        name: conv.name,
        createdAt: conv.createdAt,
        participants: conv.participants.map((p) => ({ ...p.user, lastReadAt: p.lastReadAt })),
        lastMessage: lastMsg
          ? { content: lastMsg.content, senderEmail: lastMsg.sender.email, createdAt: lastMsg.createdAt }
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
// Paginated: ?cursor=<messageId> — loads 30 messages before cursor
router.get('/conversations/:id/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user!;
    const conversationId = req.params['id'] as string;
    const cursor = req.query.cursor as string | undefined;
    const PAGE = 30;

    // Check participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) { res.status(403).json({ error: 'Not a participant.' }); return; }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: PAGE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: { id: true, email: true, role: true } } },
    });

    // Mark as read
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    res.json(messages.reverse()); // oldest → newest
  } catch (err) {
    console.error('[chat/messages]', err);
    res.status(500).json({ error: 'Failed to load messages.' });
  }
});

// ── POST /api/chat/conversations ──────────────────────────────────────────────
// Create a new 1-on-1 or group conversation
router.post('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.user!;
    const { targetUserIds, isGroup, name } = req.body as {
      targetUserIds: string[];
      isGroup?: boolean;
      name?: string;
    };

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      res.status(400).json({ error: 'targetUserIds is required.' });
      return;
    }

    // Permission check for each target
    const targets = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true, role: true },
    });

    for (const target of targets) {
      const ok = await canMessage(userId, role, target.id, target.role);
      if (!ok) {
        res.status(403).json({ error: `You are not allowed to message user ${target.id}.` });
        return;
      }
    }

    // For 1-on-1: reuse existing conversation if it exists
    if (!isGroup && targetUserIds.length === 1) {
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: { every: { userId: { in: [userId, targetUserIds[0]] } } },
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: targetUserIds[0] } } },
          ],
        },
        include: {
          participants: { include: { user: { select: { id: true, email: true, role: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (existing) { res.status(200).json(existing); return; }
    }

    const allParticipantIds = [...new Set([userId, ...targetUserIds])];

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: !!isGroup,
        name: isGroup ? (name ?? 'Group Chat') : null,
        participants: {
          create: allParticipantIds.map((uid) => ({ userId: uid })),
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
