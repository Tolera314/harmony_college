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

  // Store module-level reference so broadcast helpers work without passing io around
  registerIo(io);
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

    // Each socket joins its own personal room for direct notifications (grades, alerts)
    socket.join(`user:${userId}`);

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

    // ── Attendance: join/leave a course-session room ─────────────────────────
    // Instructors and students join `attendance:${courseOfferingId}` to receive live events.
    socket.on('attendance:join', async (courseOfferingId: string) => {
      try {
        if (!courseOfferingId) return;
        // Verify the user has some relation to this offering (enrolled or teaching)
        const { prisma } = await import('./prisma');
        const allowed = await prisma.$queryRaw<{ exists: boolean }[]>`
          SELECT EXISTS(
            SELECT 1 FROM "Enrollment" e
              JOIN "CourseOffering" co ON co.id = e."courseOfferingId"
            WHERE e."studentRecordId" IN (
              SELECT id FROM "StudentRecord" WHERE "userId" = ${userId}
            ) AND co.id = ${courseOfferingId}
            UNION
            SELECT 1 FROM "CourseOffering" co
              JOIN "InstructorRecord" ir ON ir.id = co."instructorId"
            WHERE co.id = ${courseOfferingId} AND ir."userId" = ${userId}
          ) AS exists
        `;
        if (allowed[0]?.exists) {
          socket.join(`attendance:${courseOfferingId}`);
        }
      } catch (err) {
        console.error('[socket:attendance:join]', err);
      }
    });

    socket.on('attendance:leave', (courseOfferingId: string) => {
      socket.leave(`attendance:${courseOfferingId}`);
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

// ── Attendance broadcast helpers (called from attendanceService) ──────────────
// These are module-level so the service can import and call them without a
// direct reference to the io instance. We store it once after initSocket().

let _io: IOServer | null = null;

/**
 * Call once during server startup — keeps a module reference to the io instance
 * so the broadcast helpers below can emit without being passed io explicitly.
 */
export function registerIo(io: IOServer) {
  _io = io;
}

/**
 * Broadcast that a session has been opened.
 * Room: `attendance:${courseOfferingId}`
 */
export function broadcastAttendanceOpened(payload: {
  sessionId: string;
  courseOfferingId: string;
  courseCode: string;
  openedAt: string;
}) {
  _io?.to(`attendance:${payload.courseOfferingId}`).emit('attendance:opened', payload);
}

/**
 * Broadcast a single attendance record update (QR scan or manual mark).
 * Room: `attendance:${courseOfferingId}`
 */
export function broadcastAttendanceRecord(payload: {
  sessionId: string;
  courseOfferingId: string;
  studentRecordId: string;
  studentName: string;
  status: string;
  method: string;
  markedAt: string;
}) {
  _io?.to(`attendance:${payload.courseOfferingId}`).emit('attendance:record', payload);
}

/**
 * Broadcast that a session has been closed or finalized.
 * Room: `attendance:${courseOfferingId}`
 */
export function broadcastAttendanceClosed(payload: {
  sessionId: string;
  courseOfferingId: string;
  status: 'CLOSED' | 'FINALIZED';
  closedAt: string;
}) {
  _io?.to(`attendance:${payload.courseOfferingId}`).emit('attendance:closed', payload);
}

/**
 * Broadcast a grade-posted notification to a specific student's user socket room.
 * Each authenticated socket joins `user:${userId}` on connect.
 */
export function broadcastGradePosted(payload: {
  studentUserId: string;
  courseCode: string;
  courseTitle: string;
  grade: string;
  gradePoints: number;
  term: string;
}) {
  _io?.to(`user:${payload.studentUserId}`).emit('grade:posted', payload);
}
