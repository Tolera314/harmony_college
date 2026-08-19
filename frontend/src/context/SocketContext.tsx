'use client';

import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';

// ── Chat types ────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; email: string; role: string };
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name: string | null;
  createdAt: string;
  participants: { id: string; email: string; role: string; lastReadAt: string | null }[];
  lastMessage: { content: string; senderEmail: string; createdAt: string } | null;
  lastReadAt: string | null;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  email: string;
}

// ── Attendance types ──────────────────────────────────────────────────────────
export interface AttendanceOpenedEvent {
  sessionId: string;
  courseOfferingId: string;
  courseCode: string;
  openedAt: string;
}

export interface AttendanceRecordEvent {
  sessionId: string;
  courseOfferingId: string;
  studentRecordId: string;
  studentName: string;
  status: string;   // 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'
  method: string;   // 'QR' | 'MANUAL'
  markedAt: string;
}

export interface AttendanceClosedEvent {
  sessionId: string;
  courseOfferingId: string;
  status: 'CLOSED' | 'FINALIZED';
  closedAt: string;
}

// ── Grade notification type ───────────────────────────────────────────────────
export interface GradePostedEvent {
  studentUserId: string;
  courseCode: string;
  courseTitle: string;
  grade: string;
  gradePoints: number;
  term: string;
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: Set<string>;

  // ── Chat emit helpers ──────────────────────────────────────────────────────
  joinConversation:  (id: string) => void;
  leaveConversation: (id: string) => void;
  sendMessage:       (conversationId: string, content: string) => void;
  sendTyping:        (conversationId: string) => void;
  sendStopTyping:    (conversationId: string) => void;
  markRead:          (conversationId: string) => void;

  // ── Attendance emit helpers ────────────────────────────────────────────────
  joinAttendanceRoom:  (courseOfferingId: string) => void;
  leaveAttendanceRoom: (courseOfferingId: string) => void;

  // ── Chat event subscriptions ───────────────────────────────────────────────
  onNewMessage:  (cb: (msg: ChatMessage) => void) => () => void;
  onTyping:      (cb: (e: TypingEvent) => void) => () => void;
  onStopTyping:  (cb: (e: { conversationId: string; userId: string }) => void) => () => void;
  onPresence:    (cb: (e: { userId: string; online: boolean }) => void) => () => void;

  // ── Attendance event subscriptions ────────────────────────────────────────
  onAttendanceOpened:  (cb: (e: AttendanceOpenedEvent) => void) => () => void;
  onAttendanceRecord:  (cb: (e: AttendanceRecordEvent) => void) => () => void;
  onAttendanceClosed:  (cb: (e: AttendanceClosedEvent) => void) => () => void;

  // ── Grade notification subscription ───────────────────────────────────────
  onGradePosted: (cb: (e: GradePostedEvent) => void) => () => void;
}

// ── Default (no-op) context ───────────────────────────────────────────────────
const SocketContext = createContext<SocketContextValue>({
  socket: null, connected: false, onlineUsers: new Set(),
  joinConversation:  () => {},
  leaveConversation: () => {},
  sendMessage:       () => {},
  sendTyping:        () => {},
  sendStopTyping:    () => {},
  markRead:          () => {},
  joinAttendanceRoom:  () => {},
  leaveAttendanceRoom: () => {},
  onNewMessage:        () => () => {},
  onTyping:            () => () => {},
  onStopTyping:        () => () => {},
  onPresence:          () => () => {},
  onAttendanceOpened:  () => () => {},
  onAttendanceRecord:  () => () => {},
  onAttendanceClosed:  () => () => {},
  onGradePosted:       () => () => {},
});

export function useSocket() { return useContext(SocketContext); }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ── Provider ──────────────────────────────────────────────────────────────────
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef  = useRef<Socket | null>(null);
  const [connected, setConnected]     = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence', ({ userId, online }: { userId: string; online: boolean }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (online) next.add(userId); else next.delete(userId);
        return next;
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  // ── Chat emit helpers ─────────────────────────────────────────────────────
  const joinConversation  = useCallback((id: string) =>
    socketRef.current?.emit('joinConversation', id), []);
  const leaveConversation = useCallback((id: string) =>
    socketRef.current?.emit('leaveConversation', id), []);
  const sendMessage       = useCallback((conversationId: string, content: string) =>
    socketRef.current?.emit('sendMessage', { conversationId, content }), []);
  const sendTyping        = useCallback((id: string) =>
    socketRef.current?.emit('typing', id), []);
  const sendStopTyping    = useCallback((id: string) =>
    socketRef.current?.emit('stopTyping', id), []);
  const markRead          = useCallback((id: string) =>
    socketRef.current?.emit('markRead', id), []);

  // ── Attendance emit helpers ───────────────────────────────────────────────
  const joinAttendanceRoom  = useCallback((courseOfferingId: string) =>
    socketRef.current?.emit('attendance:join', courseOfferingId), []);
  const leaveAttendanceRoom = useCallback((courseOfferingId: string) =>
    socketRef.current?.emit('attendance:leave', courseOfferingId), []);

  // ── Generic subscribe factory — memoised ──────────────────────────────────
  function makeSub<T>(event: string) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useCallback((cb: (e: T) => void) => {
      socketRef.current?.on(event, cb);
      return () => { socketRef.current?.off(event, cb); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  }

  // ── Chat event subscriptions ──────────────────────────────────────────────
  const onNewMessage  = makeSub<ChatMessage>('newMessage');
  const onTyping      = makeSub<TypingEvent>('typing');
  const onStopTyping  = makeSub<{ conversationId: string; userId: string }>('stopTyping');
  const onPresence    = makeSub<{ userId: string; online: boolean }>('presence');

  // ── Attendance event subscriptions ───────────────────────────────────────
  const onAttendanceOpened = makeSub<AttendanceOpenedEvent>('attendance:opened');
  const onAttendanceRecord = makeSub<AttendanceRecordEvent>('attendance:record');
  const onAttendanceClosed = makeSub<AttendanceClosedEvent>('attendance:closed');

  // ── Grade notification subscription ──────────────────────────────────────
  const onGradePosted = makeSub<GradePostedEvent>('grade:posted');

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current, connected, onlineUsers,
      // chat emits
      joinConversation, leaveConversation, sendMessage,
      sendTyping, sendStopTyping, markRead,
      // attendance emits
      joinAttendanceRoom, leaveAttendanceRoom,
      // chat subs
      onNewMessage, onTyping, onStopTyping, onPresence,
      // attendance subs
      onAttendanceOpened, onAttendanceRecord, onAttendanceClosed,
      // grade subs
      onGradePosted,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
