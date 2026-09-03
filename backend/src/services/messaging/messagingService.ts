/**
 * Internal Messaging Service — Harmony College
 * ─────────────────────────────────────────────────────────────────────────────
 * Staff-only, role-based communication system per message.md specification.
 *
 * Security contract
 * ─────────────────
 * • STUDENT role is blocked at the middleware layer AND here — double guard.
 * • All conversation reads verify the requester is an active participant.
 * • Message edit/delete verify sender ownership.
 * • Attachment downloads verify conversation membership.
 * • departmentId on DEPARTMENT conversations is cross-checked against real
 *   Department records — cannot fabricate a department conversation.
 */

import { prisma }            from '../../lib/prisma';
import { Role }              from '../../types/auth';
import { randomUUID }        from 'crypto';
import type { ConversationType, MessagePriority } from '@prisma/client';

// ── Communication policy ──────────────────────────────────────────────────────
// Per message.md §3: role + department + membership must be checked.
// Simplified to: any staff can communicate with any other staff.
// STUDENT is always blocked. Fine-grained configurable policy can be added later.

const STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR,
  Role.FINANCE_OFFICER, Role.HR_OFFICER, Role.DEPARTMENT_HEAD,
  Role.INSTRUCTOR,
];

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

// ── Employee search ───────────────────────────────────────────────────────────

export async function searchEmployees(
  requesterId: string,
  requesterRole: Role,
  q: string,
  limit = 20,
) {
  if (!isStaff(requesterRole)) throw new Error('Staff only.');

  const where: Record<string, unknown> = {
    id:     { not: requesterId },
    role:   { in: STAFF_ROLES },
    status: 'ACTIVE',
  };

  if (q.trim()) {
    where.OR = [
      { fullName: { contains: q.trim(), mode: 'insensitive' } },
      { email:    { contains: q.trim(), mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    take: limit,
    select: {
      id:       true,
      fullName: true,
      role:     true,
      email:    true,
      instructorRecord: { select: { department: { select: { name: true } } } },
      departmentHeadRecord: { select: { department: { select: { name: true } } } },
    },
    orderBy: { fullName: 'asc' },
  });

  return users.map(u => ({
    id:         u.id,
    fullName:   u.fullName,
    role:       u.role,
    email:      u.email,
    department:
      u.instructorRecord?.department?.name ??
      u.departmentHeadRecord?.department?.name ??
      null,
  }));
}

// ── Conversations ─────────────────────────────────────────────────────────────

export async function listConversations(userId: string, includeArchived = false) {
  const participations = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      leftAt:     null,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    include: {
      conversation: {
        include: {
          participants: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  id: true, fullName: true, role: true, email: true,
                  instructorRecord: { select: { department: { select: { name: true } } } },
                  departmentHeadRecord: { select: { department: { select: { name: true } } } },
                },
              },
            },
          },
          messages: {
            where:   { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take:    1,
            include: { sender: { select: { id: true, fullName: true } } },
          },
        },
      },
    },
    orderBy: [
      { isPinned: 'desc' },
      { conversation: { lastMessageAt: 'desc' } },
    ],
  });

  return participations.map(p => {
    const conv     = p.conversation;
    const lastMsg  = conv.messages[0] ?? null;
    const myPart   = p;

    // Count unread: messages after lastReadAt that I didn't send
    const unreadCount = 0; // computed separately via getUnreadCount for performance

    return {
      id:            conv.id,
      type:          conv.type,
      name:          conv.name,
      description:   conv.description,
      departmentId:  conv.departmentId,
      priority:      conv.priority,
      requiresAck:   conv.requiresAck,
      expiresAt:     conv.expiresAt,
      lastMessageAt: conv.lastMessageAt,
      isActive:      conv.isActive,
      createdAt:     conv.createdAt,
      // My participation state
      participantRole: myPart.participantRole,
      isPinned:        myPart.isPinned,
      isArchived:      myPart.isArchived,
      isMuted:         myPart.isMuted,
      lastReadAt:      myPart.lastReadAt,
      lastReadMessageId: myPart.lastReadMessageId,
      participants: conv.participants.map(pp => ({
        userId:   pp.userId,
        fullName: pp.user.fullName,
        role:     pp.user.role,
        email:    pp.user.email,
        department:
          pp.user.instructorRecord?.department?.name ??
          pp.user.departmentHeadRecord?.department?.name ?? null,
        participantRole: pp.participantRole,
        lastReadAt:      pp.lastReadAt,
      })),
      lastMessage: lastMsg ? {
        id:        lastMsg.id,
        content:   lastMsg.isDeleted ? '[Message deleted]' : lastMsg.content,
        senderId:  lastMsg.senderId,
        senderName: lastMsg.sender.fullName,
        createdAt: lastMsg.createdAt,
        isDeleted: lastMsg.isDeleted,
      } : null,
      unreadCount,
    };
  });
}

export async function getUnreadCounts(userId: string): Promise<Record<string, number>> {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId, leftAt: null },
    select: {
      conversationId: true,
      lastReadAt:     true,
    },
  });

  const counts: Record<string, number> = {};
  await Promise.all(
    participations.map(async p => {
      const count = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          senderId:       { not: userId },
          isDeleted:      false,
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      });
      counts[p.conversationId] = count;
    })
  );
  return counts;
}

export async function getConversation(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!p || p.leftAt) throw new Error('Not a participant.');

  return prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      participants: {
        where: { leftAt: null },
        include: {
          user: {
            select: {
              id: true, fullName: true, role: true, email: true,
              instructorRecord: { select: { department: { select: { name: true } } } },
              departmentHeadRecord: { select: { department: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
}

export async function createConversation(
  creatorId:    string,
  creatorRole:  Role,
  input: {
    type:          ConversationType;
    name?:         string;
    description?:  string;
    participantIds: string[];
    departmentId?: string;
    priority?:     MessagePriority;
    requiresAck?:  boolean;
    expiresAt?:    Date;
  },
) {
  if (!isStaff(creatorRole)) throw new Error('Staff only.');

  // Validate all participants are active staff
  const targets = await prisma.user.findMany({
    where: { id: { in: input.participantIds }, status: 'ACTIVE' },
    select: { id: true, role: true },
  });

  for (const t of targets) {
    if (!isStaff(t.role as Role)) {
      throw new Error(`User ${t.id} is not staff and cannot join internal messaging.`);
    }
  }

  // For DIRECT: reuse existing conversation between exactly these two users
  if (input.type === 'DIRECT') {
    if (input.participantIds.length !== 1) {
      throw new Error('Direct messages require exactly one recipient.');
    }
    const targetId = input.participantIds[0];
    const existing = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        participants: {
          every: { userId: { in: [creatorId, targetId] }, leftAt: null },
        },
        AND: [
          { participants: { some: { userId: creatorId } } },
          { participants: { some: { userId: targetId  } } },
        ],
      },
    });
    if (existing) {
      // Restore archived state if it was archived
      await prisma.conversationParticipant.updateMany({
        where:  { conversationId: existing.id, userId: creatorId },
        data:   { isArchived: false, leftAt: null },
      });
      return existing;
    }
  }

  // For DEPARTMENT: validate departmentId exists
  if (input.type === 'DEPARTMENT') {
    if (!input.departmentId) throw new Error('departmentId required for DEPARTMENT conversations.');
    const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!dept) throw new Error('Department not found.');
  }

  // OFFICIAL type restricted to ADMIN/SUPER_ADMIN
  if (input.type === 'OFFICIAL') {
    if (creatorRole !== Role.ADMIN && creatorRole !== Role.SUPER_ADMIN) {
      throw new Error('Only ADMIN or SUPER_ADMIN can create official messages.');
    }
  }

  const allParticipants = [...new Set([creatorId, ...input.participantIds])];
  const now = new Date();

  const conv = await prisma.conversation.create({
    data: {
      type:        input.type,
      name:        input.name ?? null,
      description: input.description ?? null,
      createdById: creatorId,
      departmentId: input.departmentId ?? null,
      priority:    input.priority    ?? 'NORMAL',
      requiresAck: input.requiresAck ?? false,
      expiresAt:   input.expiresAt   ?? null,
      participants: {
        create: allParticipants.map(uid => ({
          userId:         uid,
          participantRole: uid === creatorId ? 'ADMIN' : 'MEMBER',
          joinedAt:       now,
        })),
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, fullName: true, role: true } } } },
    },
  });

  return conv;
}

export async function addParticipants(
  conversationId: string,
  requesterId:    string,
  userIds:        string[],
) {
  const myPart = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: requesterId } },
  });
  if (!myPart || myPart.leftAt) throw new Error('Not a participant.');
  if (myPart.participantRole !== 'ADMIN') throw new Error('Only group admins can add members.');

  // Validate new members are active staff
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, status: 'ACTIVE' },
    select: { id: true, role: true },
  });
  for (const u of users) {
    if (!isStaff(u.role as Role)) throw new Error(`User ${u.id} is not staff.`);
  }

  await prisma.$transaction(
    users.map(u =>
      prisma.conversationParticipant.upsert({
        where:  { conversationId_userId: { conversationId, userId: u.id } },
        update: { leftAt: null, joinedAt: new Date() },
        create: { conversationId, userId: u.id, participantRole: 'MEMBER', joinedAt: new Date() },
      })
    )
  );
}

export async function removeParticipant(
  conversationId: string,
  requesterId:    string,
  targetUserId:   string,
) {
  const myPart = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: requesterId } },
  });
  if (!myPart || myPart.leftAt) throw new Error('Not a participant.');
  if (myPart.participantRole !== 'ADMIN' && requesterId !== targetUserId) {
    throw new Error('Only group admins can remove other members.');
  }
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
    data:  { leftAt: new Date() },
  });
}

export async function updateParticipantPrefs(
  conversationId: string,
  userId:         string,
  prefs: { isMuted?: boolean; isPinned?: boolean; isArchived?: boolean },
) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!p || p.leftAt) throw new Error('Not a participant.');

  return prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data:  prefs,
  });
}

// ── Messages ──────────────────────────────────────────────────────────────────

const MSG_PAGE_SIZE = 30;

const msgInclude = {
  sender: { select: { id: true, fullName: true, role: true, email: true } },
  attachments: true,
  replyTo: {
    select: {
      id: true, content: true, isDeleted: true,
      sender: { select: { id: true, fullName: true } },
    },
  },
};

export async function listMessages(
  conversationId: string,
  userId:         string,
  cursor?:        string,
) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!p || p.leftAt) throw new Error('Not a participant.');

  const messages = await prisma.message.findMany({
    where:   { conversationId },
    orderBy: { createdAt: 'desc' },
    take:    MSG_PAGE_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: msgInclude,
  });

  return messages.reverse().map(m => sanitiseMessage(m, userId));
}

export async function sendMessage(
  conversationId: string,
  senderId:       string,
  senderRole:     Role,
  input: {
    content:     string;
    replyToId?:  string;
    messageType?: string;
  },
) {
  if (!isStaff(senderRole)) throw new Error('Staff only.');

  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
  });
  if (!p || p.leftAt) throw new Error('Not a participant.');

  const content = input.content.trim();
  if (!content) throw new Error('Message content cannot be empty.');
  if (content.length > 8000) throw new Error('Message too long (max 8000 characters).');

  const now = new Date();

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content,
      messageType: input.messageType ?? 'TEXT',
      status:      'SENT',
      replyToId:   input.replyToId ?? null,
      createdAt:   now,
    },
    include: msgInclude,
  });

  // Update conversation lastMessageAt + sender's lastReadAt
  await Promise.all([
    prisma.conversation.update({
      where: { id: conversationId },
      data:  { lastMessageAt: now, updatedAt: now },
    }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: senderId } },
      data:  { lastReadAt: now, lastReadMessageId: message.id },
    }),
  ]);

  return sanitiseMessage(message, senderId);
}

export async function editMessage(
  messageId: string,
  userId:    string,
  content:   string,
) {
  const msg = await prisma.message.findUnique({
    where:   { id: messageId },
    select:  { id: true, senderId: true, conversationId: true, createdAt: true, isDeleted: true },
  });
  if (!msg)            throw new Error('Message not found.');
  if (msg.isDeleted)   throw new Error('Cannot edit a deleted message.');
  if (msg.senderId !== userId) throw new Error('Cannot edit another user\'s message.');

  // Allow editing within 24 hours
  const hoursSince = (Date.now() - msg.createdAt.getTime()) / 3_600_000;
  if (hoursSince > 24) throw new Error('Messages can only be edited within 24 hours.');

  const trimmed = content.trim();
  if (!trimmed) throw new Error('Message content cannot be empty.');

  return prisma.message.update({
    where:   { id: messageId },
    data:    { content: trimmed, editedAt: new Date(), editedById: userId },
    include: msgInclude,
  });
}

export async function deleteMessage(
  messageId:  string,
  userId:     string,
  userRole:   Role,
  deleteType: 'SELF' | 'ADMIN',
) {
  const msg = await prisma.message.findUnique({
    where:  { id: messageId },
    select: { id: true, senderId: true, conversationId: true, isDeleted: true },
  });
  if (!msg)          throw new Error('Message not found.');
  if (msg.isDeleted) throw new Error('Message already deleted.');

  // ADMIN delete — requires ADMIN/SUPER_ADMIN role and is audited
  if (deleteType === 'ADMIN') {
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
      throw new Error('Administrative deletion requires ADMIN role.');
    }
  } else {
    if (msg.senderId !== userId) throw new Error('Cannot delete another user\'s message.');
  }

  return prisma.message.update({
    where: { id: messageId },
    data:  { isDeleted: true, deletedAt: new Date(), deletedById: userId, content: '' },
  });
}

export async function markConversationRead(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!p || p.leftAt) throw new Error('Not a participant.');

  const lastMsg = await prisma.message.findFirst({
    where:   { conversationId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    select:  { id: true },
  });

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data:  {
      lastReadAt:       new Date(),
      lastReadMessageId: lastMsg?.id ?? null,
    },
  });

  // Update message statuses to READ for messages this user received
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId:  { not: userId },
      status:    { in: ['SENT', 'DELIVERED'] },
      isDeleted: false,
    },
    data: { status: 'READ' },
  });
}

export async function acknowledgeMessage(messageId: string, userId: string) {
  await prisma.messageAcknowledgment.upsert({
    where:  { messageId_userId: { messageId, userId } },
    update: {},
    create: { id: randomUUID(), messageId, userId, acknowledgedAt: new Date() },
  });
}

// ── Attachments ───────────────────────────────────────────────────────────────

export async function createAttachment(
  messageId:       string,
  userId:          string,
  fileInfo: {
    originalFileName: string;
    storedFileName:   string;
    mimeType:         string;
    fileSize:         number;
    storagePath:      string;
  },
) {
  // Verify sender owns this message
  const msg = await prisma.message.findUnique({
    where:  { id: messageId },
    select: { senderId: true, conversationId: true },
  });
  if (!msg) throw new Error('Message not found.');
  if (msg.senderId !== userId) throw new Error('Not your message.');

  return prisma.messageAttachment.create({
    data: { id: randomUUID(), messageId, ...fileInfo },
  });
}

export async function getAttachment(attachmentId: string, userId: string) {
  const att = await prisma.messageAttachment.findUnique({
    where:   { id: attachmentId },
    include: { message: { select: { conversationId: true } } },
  });
  if (!att) throw new Error('Attachment not found.');

  // Verify requester is a participant of the conversation
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: att.message.conversationId, userId } },
  });
  if (!p || p.leftAt) throw new Error('Not authorised to access this attachment.');

  return att;
}

// ── Department conversation bootstrap ────────────────────────────────────────

export async function getOrCreateDepartmentConversation(
  departmentId: string,
  requesterId:  string,
  requesterRole: Role,
) {
  if (!isStaff(requesterRole)) throw new Error('Staff only.');

  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept || !dept.isActive) throw new Error('Department not found or inactive.');

  const existing = await prisma.conversation.findFirst({
    where: { type: 'DEPARTMENT', departmentId, isActive: true },
  });
  if (existing) {
    // Ensure requester is a participant
    await prisma.conversationParticipant.upsert({
      where:  { conversationId_userId: { conversationId: existing.id, userId: requesterId } },
      update: { leftAt: null },
      create: {
        conversationId: existing.id,
        userId: requesterId,
        participantRole: 'MEMBER',
        joinedAt: new Date(),
      },
    });
    return existing;
  }

  // Find all staff belonging to this department
  const instructors = await prisma.instructorRecord.findMany({
    where:  { departmentId, isActive: true },
    select: { userId: true },
  });
  const deptHeads = await prisma.departmentHeadRecord.findMany({
    where:  { departmentId, isActive: true },
    select: { userId: true },
  });

  const memberIds = [
    ...new Set([
      requesterId,
      ...instructors.map(i => i.userId),
      ...deptHeads.map(d => d.userId),
    ]),
  ];

  return prisma.conversation.create({
    data: {
      type:        'DEPARTMENT',
      name:        `${dept.name} Staff`,
      description: `Official communication channel for ${dept.name} department`,
      createdById: requesterId,
      departmentId,
      participants: {
        create: memberIds.map(uid => ({
          userId:         uid,
          participantRole: uid === requesterId ? 'ADMIN' : 'MEMBER',
          joinedAt:       new Date(),
        })),
      },
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitiseMessage(msg: Record<string, unknown>, _viewerId: string): Record<string, unknown> {
  return {
    ...msg,
    content: (msg.isDeleted as boolean) ? '[Message deleted]' : msg.content,
  };
}
