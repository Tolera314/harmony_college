import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { verifyJWT } from './auth';
import { prisma } from './prisma';

// ── Online presence map: userId → Set<socketId> ───────────────────────────────
const onlineUsers = new Map<string, Set<string>>();

function setOnline(userId: string, socketId: string) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId)!.add(socketId);
}
function setOffline(userId: string, socketId: string) {
  onlineUsers.get(userId)?.delete(socketId);
  if (onlineUsers.get(userId)?.size === 0) onlineUsers.delete(userId);
}
export function isOnline(userId: string) {
  return (onlineUsers.get(userId)?.size ?? 0) > 0;
}

// ── Extended socket with auth payload ────────────────────────────────────────
interface AuthSocket extends Socket {
  userId?: string;
  email?: string;
  role?: string;
}

export function initSocket(httpServer: HttpServer, frontendUrl: string): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: frontendUrl,
      credentials: true,
    },
  });

  // ── JWT Auth middleware ───────────────────────────────────────────────────
  io.use(async (socket: AuthSocket, next) => {
    try {
      // Accept token from cookie or handshake auth
      const token: string | undefined =
        socket.handshake.auth?.token ??
        socket.handshake.headers?.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('session='))
          ?.split('=')[1];

      if (!token) return next(new Error('Authentication required.'));

      const payload = await verifyJWT(token);
      if (!payload) return next(new Error('Invalid or expired token.'));

      socket.userId = payload.userId as string;
      socket.email  = payload.email  as string;
      socket.role   = payload.role   as string;
      next();
    } catch {
      next(new Error('Authentication failed.'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    const userId = socket.userId!;

    setOnline(userId, socket.id);

    // Broadcast online status to all
    socket.broadcast.emit('presence', { userId, online: true });

    // ── joinConversation ────────────────────────────────────────────────────
    socket.on('joinConversation', async (conversationId: string) => {
      try {
        // Verify participant
        const p = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!p) return;
        socket.join(conversationId);
      } catch (err) {
        console.error('[socket:joinConversation]', err);
      }
    });

    // ── leaveConversation ───────────────────────────────────────────────────
    socket.on('leaveConversation', (conversationId: string) => {
      socket.leave(conversationId);
    });

    // ── sendMessage ─────────────────────────────────────────────────────────
    socket.on('sendMessage', async (data: { conversationId: string; content: string }) => {
      try {
        const { conversationId, content } = data;

        if (!content?.trim()) return;

        // Verify participant
        const p = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!p) return;

        // Persist
        const message = await prisma.message.create({
          data: { conversationId, senderId: userId, content: content.trim() },
          include: { sender: { select: { id: true, email: true, role: true } } },
        });

        // Update lastReadAt for sender
        await prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId, userId } },
          data: { lastReadAt: new Date() },
        });

        // Broadcast to everyone in the room (including sender)
        io.to(conversationId).emit('newMessage', message);
      } catch (err) {
        console.error('[socket:sendMessage]', err);
      }
    });

    // ── markRead ────────────────────────────────────────────────────────────
    socket.on('markRead', async (conversationId: string) => {
      try {
        await prisma.conversationParticipant.update({
          where: { conversationId_userId: { conversationId, userId } },
          data: { lastReadAt: new Date() },
        });
        // Notify others in room so they can update unread counts
        socket.to(conversationId).emit('read', { conversationId, userId });
      } catch (err) {
        console.error('[socket:markRead]', err);
      }
    });

    // ── typing / stopTyping ─────────────────────────────────────────────────
    socket.on('typing', (conversationId: string) => {
      socket.to(conversationId).emit('typing', { conversationId, userId, email: socket.email });
    });

    socket.on('stopTyping', (conversationId: string) => {
      socket.to(conversationId).emit('stopTyping', { conversationId, userId });
    });

    // ── disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      setOffline(userId, socket.id);
      if (!isOnline(userId)) {
        socket.broadcast.emit('presence', { userId, online: false });
      }
    });
  });

  return io;
}
