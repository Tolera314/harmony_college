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
  status: string;
  method: string;
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

// ── Timetable types (spec §8 / §28) ──────────────────────────────────────────
export interface TimetableSlotPayload {
  id: string;
  courseOfferingId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomId: string | null;
  instructorId: string | null;
  status: string;
}

export interface TimetableDeletedPayload {
  slotId: string;
  courseOfferingId: string;
}

export interface TimetableConflictPayload {
  conflicts: string[];
  context: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    roomId?: string | null;
    instructorId?: string | null;
  };
}

/** Personal notification sent to a student or instructor when their schedule changes */
export interface MyScheduleChangedEvent {
  offeringId: string;
  courseCode: string;
  changeType: 'CREATED' | 'UPDATED' | 'DELETED';
  summary: string;
  receivedAt: string;
}

// ── In-app notification push (notification:new) ───────────────────────────────
/** Pushed to `user:${userId}` room every time a Notification row is created. */
export interface NotificationPushEvent {
  id:         string;
  userId:     string;
  title:      string;
  message:    string;
  type:       string;
  actionTab:  string | null;
  entityType: string | null;
  entityId:   string | null;
  createdAt:  string;
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

  // ── Timetable emit helpers ─────────────────────────────────────────────────
  joinTimetableRoom:  (semesterId: string) => void;
  leaveTimetableRoom: (semesterId: string) => void;

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

  // ── Timetable event subscriptions (spec §8) ────────────────────────────────
  /** Slot created — broadcast to timetable:${semesterId} room */
  onTimetableCreated:  (cb: (e: TimetableSlotPayload) => void) => () => void;
  /** Slot rescheduled/updated — broadcast to timetable:${semesterId} room */
  onTimetableUpdated:  (cb: (e: TimetableSlotPayload) => void) => () => void;
  /** Slot cancelled/deleted — broadcast to timetable:${semesterId} room */
  onTimetableDeleted:  (cb: (e: TimetableDeletedPayload) => void) => () => void;
  /** Conflict detected during a create/update — broadcast to timetable:${semesterId} room */
  onTimetableConflict: (cb: (e: TimetableConflictPayload) => void) => () => void;
  /** Personal: sent to user:${userId} when their own schedule changes */
  onMyScheduleChanged: (cb: (e: MyScheduleChangedEvent) => void) => () => void;
  /** In-app notification push — increments the unread badge in real time */
  onNotification: (cb: (e: NotificationPushEvent) => void) => () => void;
}

// ── Default (no-op) context ───────────────────────────────────────────────────
const SocketContext = createContext<SocketContextValue>({
  socket: null, connected: false, onlineUsers: new Set(),
  joinConversation:    () => {},
  leaveConversation:   () => {},
  sendMessage:         () => {},
  sendTyping:          () => {},
  sendStopTyping:      () => {},
  markRead:            () => {},
  joinAttendanceRoom:  () => {},
  leaveAttendanceRoom: () => {},
  joinTimetableRoom:   () => {},
  leaveTimetableRoom:  () => {},
  onNewMessage:        () => () => {},
  onTyping:            () => () => {},
  onStopTyping:        () => () => {},
  onPresence:          () => () => {},
  onAttendanceOpened:  () => () => {},
  onAttendanceRecord:  () => () => {},
  onAttendanceClosed:  () => () => {},
  onGradePosted:       () => () => {},
  onTimetableCreated:  () => () => {},
  onTimetableUpdated:  () => () => {},
  onTimetableDeleted:  () => () => {},
  onTimetableConflict: () => () => {},
  onMyScheduleChanged: () => () => {},
  onNotification:      () => () => {},
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

  // ── Timetable emit helpers ────────────────────────────────────────────────
  const joinTimetableRoom  = useCallback((semesterId: string) =>
    socketRef.current?.emit('timetable:join', semesterId), []);
  const leaveTimetableRoom = useCallback((semesterId: string) =>
    socketRef.current?.emit('timetable:leave', semesterId), []);

  // ── Generic subscribe factory ─────────────────────────────────────────────
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

  // ── Timetable event subscriptions ─────────────────────────────────────────
  const onTimetableCreated  = makeSub<TimetableSlotPayload>('timetable:created');
  const onTimetableUpdated  = makeSub<TimetableSlotPayload>('timetable:updated');
  const onTimetableDeleted  = makeSub<TimetableDeletedPayload>('timetable:deleted');
  const onTimetableConflict = makeSub<TimetableConflictPayload>('timetable:conflict');
  const onMyScheduleChanged = makeSub<MyScheduleChangedEvent>('timetable:my_schedule_changed');
  // ── In-app notification subscription ─────────────────────────────────────
  const onNotification = makeSub<NotificationPushEvent>('notification:new');

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current, connected, onlineUsers,
      // chat emits
      joinConversation, leaveConversation, sendMessage,
      sendTyping, sendStopTyping, markRead,
      // attendance emits
      joinAttendanceRoom, leaveAttendanceRoom,
      // timetable emits
      joinTimetableRoom, leaveTimetableRoom,
      // chat subs
      onNewMessage, onTyping, onStopTyping, onPresence,
      // attendance subs
      onAttendanceOpened, onAttendanceRecord, onAttendanceClosed,
      // grade subs
      onGradePosted,
      // timetable subs
      onTimetableCreated, onTimetableUpdated, onTimetableDeleted,
      onTimetableConflict, onMyScheduleChanged,
      // notification push
      onNotification,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
