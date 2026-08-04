'use client';

import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: Set<string>;
  // helpers
  joinConversation: (id: string) => void;
  leaveConversation: (id: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  sendTyping: (conversationId: string) => void;
  sendStopTyping: (conversationId: string) => void;
  markRead: (conversationId: string) => void;
  // live events — attach listeners from components
  onNewMessage: (cb: (msg: ChatMessage) => void) => () => void;
  onTyping: (cb: (e: TypingEvent) => void) => () => void;
  onStopTyping: (cb: (e: { conversationId: string; userId: string }) => void) => () => void;
  onPresence: (cb: (e: { userId: string; online: boolean }) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null, connected: false, onlineUsers: new Set(),
  joinConversation: () => {}, leaveConversation: () => {},
  sendMessage: () => {}, sendTyping: () => {}, sendStopTyping: () => {},
  markRead: () => {},
  onNewMessage: () => () => {}, onTyping: () => () => {},
  onStopTyping: () => () => {}, onPresence: () => () => {},
});

export function useSocket() { return useContext(SocketContext); }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Connect once — auth via session cookie (withCredentials)
    const socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence', ({ userId, online }: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId); else next.delete(userId);
        return next;
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  // ── Emit helpers ─────────────────────────────────────────────────────────
  const joinConversation  = useCallback((id: string) => socketRef.current?.emit('joinConversation', id), []);
  const leaveConversation = useCallback((id: string) => socketRef.current?.emit('leaveConversation', id), []);
  const sendMessage       = useCallback((conversationId: string, content: string) =>
    socketRef.current?.emit('sendMessage', { conversationId, content }), []);
  const sendTyping        = useCallback((id: string) => socketRef.current?.emit('typing', id), []);
  const sendStopTyping    = useCallback((id: string) => socketRef.current?.emit('stopTyping', id), []);
  const markRead          = useCallback((id: string) => socketRef.current?.emit('markRead', id), []);

  // ── Event subscription helpers ────────────────────────────────────────────
  const onNewMessage  = useCallback((cb: (msg: ChatMessage) => void) => {
    socketRef.current?.on('newMessage', cb);
    return () => { socketRef.current?.off('newMessage', cb); };
  }, []);
  const onTyping      = useCallback((cb: (e: TypingEvent) => void) => {
    socketRef.current?.on('typing', cb);
    return () => { socketRef.current?.off('typing', cb); };
  }, []);
  const onStopTyping  = useCallback((cb: (e: { conversationId: string; userId: string }) => void) => {
    socketRef.current?.on('stopTyping', cb);
    return () => { socketRef.current?.off('stopTyping', cb); };
  }, []);
  const onPresence    = useCallback((cb: (e: { userId: string; online: boolean }) => void) => {
    socketRef.current?.on('presence', cb);
    return () => { socketRef.current?.off('presence', cb); };
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current, connected, onlineUsers,
      joinConversation, leaveConversation, sendMessage,
      sendTyping, sendStopTyping, markRead,
      onNewMessage, onTyping, onStopTyping, onPresence,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
