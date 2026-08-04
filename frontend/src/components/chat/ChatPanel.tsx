'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, X, Send, ChevronLeft, Users,
  Plus, Circle, Loader2, Search,
} from 'lucide-react';
import {
  useSocket, ChatMessage, Conversation,
} from '../../context/SocketContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// ── helpers ───────────────────────────────────────────────────────────────────
function getDisplayName(conv: Conversation, myId: string) {
  if (conv.isGroup) return conv.name ?? 'Group Chat';
  const other = conv.participants.find((p) => p.id !== myId);
  return other?.email ?? 'Unknown';
}

function timeAgo(dateStr: string) {
  const d   = new Date(dateStr);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60)    return 'now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString();
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMine }: { msg: ChatMessage; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div
        className={`max-w-[72%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed font-sans ${
          isMine
            ? 'bg-[#E9C349] text-[#0F0F10] rounded-br-sm'
            : 'bg-white/10 text-white rounded-bl-sm'
        }`}
      >
        {!isMine && (
          <p className="font-mono text-[9px] text-white/50 mb-0.5">{msg.sender.email}</p>
        )}
        {msg.content}
        <p className={`font-mono text-[9px] mt-0.5 text-right ${isMine ? 'text-[#0F0F10]/50' : 'text-white/30'}`}>
          {timeAgo(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface ChatPanelProps {
  /** When true, the floating button is hidden — panel is controlled by parent */
  isControlled?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ChatPanel({ isControlled = false, isOpen: controlledOpen, onClose }: ChatPanelProps) {
  const { connected, onlineUsers, joinConversation, leaveConversation,
    sendMessage, sendTyping, sendStopTyping, markRead,
    onNewMessage, onTyping, onStopTyping } = useSocket();

  const [openInternal, setOpenInternal] = useState(false);
  const open    = isControlled ? (controlledOpen ?? false) : openInternal;
  const setOpen = isControlled
    ? (v: boolean | ((p: boolean) => boolean)) => {
        const next = typeof v === 'function' ? v(controlledOpen ?? false) : v;
        if (!next && onClose) onClose();
      }
    : setOpenInternal;
  const [view, setView]               = useState<'list' | 'window' | 'new'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv]   = useState<Conversation | null>(null);
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [cursor, setCursor]           = useState<string | undefined>();
  const [hasMore, setHasMore]         = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // userId → email
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [allowedUsers, setAllowedUsers] = useState<{ id: string; email: string; role: string }[]>([]);
  const [userSearch, setUserSearch]   = useState('');
  const [myId, setMyId]               = useState<string>('');

  const bottomRef    = useRef<HTMLDivElement>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Get current user id ───────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.userId) setMyId(d.userId); })
      .catch(() => {});
  }, []);

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/chat/conversations`, { credentials: 'include' });
      if (!r.ok) { setLoading(false); return; }
      const data = await r.json();
      const list: Conversation[] = Array.isArray(data) ? data : [];
      setConversations(list);

      const unread = list.reduce((acc, c) => {
        if (!c.lastMessage) return acc;
        if (!c.lastReadAt) return acc + 1;
        return new Date(c.lastMessage.createdAt) > new Date(c.lastReadAt) ? acc + 1 : acc;
      }, 0);
      setUnreadTotal(unread);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) loadConversations();
  }, [open, loadConversations]);

  // ── Load messages for active conversation ─────────────────────────────────
  const loadMessages = useCallback(async (convId: string, cur?: string) => {
    setLoadingMsgs(true);
    try {
      const url = cur
        ? `${API}/api/chat/conversations/${convId}/messages?cursor=${cur}`
        : `${API}/api/chat/conversations/${convId}/messages`;
      const r = await fetch(url, { credentials: 'include' });
      const data: ChatMessage[] = await r.json();
      if (cur) {
        setMessages((prev) => [...data, ...prev]);
      } else {
        setMessages(data);
      }
      setHasMore(data.length === 30);
      if (data.length > 0) setCursor(data[0].id);
    } catch { /* ignore */ }
    setLoadingMsgs(false);
  }, []);

  // ── Open a conversation ───────────────────────────────────────────────────
  const openConversation = useCallback((conv: Conversation) => {
    if (activeConv) leaveConversation(activeConv.id);
    setActiveConv(conv);
    setMessages([]);
    setCursor(undefined);
    setView('window');
    joinConversation(conv.id);
    markRead(conv.id);
    loadMessages(conv.id);
    // Update unread locally
    setConversations((prev) => prev.map((c) =>
      c.id === conv.id ? { ...c, lastReadAt: new Date().toISOString() } : c
    ));
  }, [activeConv, leaveConversation, joinConversation, markRead, loadMessages]);

  // ── Socket: incoming messages ─────────────────────────────────────────────
  useEffect(() => {
    const off = onNewMessage((msg) => {
      if (activeConv?.id === msg.conversationId) {
        setMessages((prev) => [...prev, msg]);
        markRead(msg.conversationId);
      } else {
        // Bump unread count
        setUnreadTotal((n) => n + 1);
        setConversations((prev) => prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: { content: msg.content, senderEmail: msg.sender.email, createdAt: msg.createdAt } }
            : c
        ));
      }
    });
    return off;
  }, [onNewMessage, activeConv, markRead]);

  // ── Socket: typing ────────────────────────────────────────────────────────
  useEffect(() => {
    const offT = onTyping(({ conversationId, userId, email }) => {
      if (conversationId === activeConv?.id) {
        setTypingUsers((p) => ({ ...p, [userId]: email }));
      }
    });
    const offS = onStopTyping(({ conversationId, userId }) => {
      if (conversationId === activeConv?.id) {
        setTypingUsers((p) => { const n = { ...p }; delete n[userId]; return n; });
      }
    });
    return () => { offT(); offS(); };
  }, [onTyping, onStopTyping, activeConv]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim() || !activeConv) return;
    sendMessage(activeConv.id, input.trim());
    setInput('');
    sendStopTyping(activeConv.id);
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (!activeConv) return;
    sendTyping(activeConv.id);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendStopTyping(activeConv.id), 2000);
  };

  // ── New conversation: load allowed users ──────────────────────────────────
  const openNewChat = async () => {
    setView('new');
    try {
      const r = await fetch(`${API}/api/chat/users`, { credentials: 'include' });
      if (!r.ok) return;
      const data = await r.json();
      setAllowedUsers(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  const startDM = async (targetId: string) => {
    try {
      const r = await fetch(`${API}/api/chat/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserIds: [targetId], isGroup: false }),
      });
      const conv: Conversation = await r.json();
      await loadConversations();
      openConversation(conv);
    } catch { /* ignore */ }
  };

  const filteredUsers = allowedUsers.filter((u) =>
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const typingList = Object.values(typingUsers);

  return (
    <>
      {/* ── Floating button — hidden when controlled by sidebar ─────────── */}
      {!isControlled && (
      <motion.button
        onClick={() => setOpen((p) => !p)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-24 right-4 sm:right-6 z-[9997] w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl focus:outline-none"
        style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' }}
        aria-label="Toggle Chat"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-5 h-5 text-white" />
              </motion.span>
            : <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <MessageCircle className="w-5 h-5 text-white" />
              </motion.span>
          }
        </AnimatePresence>
        {unreadTotal > 0 && !open && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full text-white font-mono text-[10px] font-bold flex items-center justify-center border-2 border-[#0F0F10]">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
        {/* connected dot */}
        <span className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0F0F10] ${connected ? 'bg-emerald-400' : 'bg-white/30'}`} />
      </motion.button>
      )}

      {/* ── Panel ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-40 right-4 sm:right-6 z-[9996] w-[calc(100vw-2rem)] sm:w-[360px] flex flex-col rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ height: '480px', background: 'var(--bg-panel, #141617)' }}
          >
            {/* ── List view ─────────────────────────────────────────────── */}
            {view === 'list' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    <span className="font-serif text-sm font-bold text-white">Messages</span>
                    {!connected && <span className="font-mono text-[9px] text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full">offline</span>}
                  </div>
                  <button onClick={openNewChat}
                    className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    title="New message">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading && (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                    </div>
                  )}
                  {!loading && conversations.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
                      <Users className="w-8 h-8 text-white/10" />
                      <p className="font-sans text-xs text-white/30">No conversations yet.</p>
                      <button onClick={openNewChat} className="font-sans text-xs text-blue-400 hover:underline">Start a new chat</button>
                    </div>
                  )}
                  {conversations.map((conv) => {
                    const name   = getDisplayName(conv, myId);
                    const other  = conv.participants.find((p) => p.id !== myId);
                    const online = other ? onlineUsers.has(other.id) : false;
                    const unread = conv.lastMessage && (!conv.lastReadAt || new Date(conv.lastMessage.createdAt) > new Date(conv.lastReadAt));
                    return (
                      <button key={conv.id} onClick={() => openConversation(conv)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-serif font-bold text-sm text-blue-400">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          {!conv.isGroup && (
                            <Circle className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${online ? 'text-emerald-400 fill-emerald-400' : 'text-white/20 fill-white/20'}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`font-sans text-xs truncate ${unread ? 'font-bold text-white' : 'text-white/70'}`}>{name}</p>
                            {conv.lastMessage && (
                              <span className="font-mono text-[9px] text-white/30 shrink-0 ml-1">{timeAgo(conv.lastMessage.createdAt)}</span>
                            )}
                          </div>
                          <p className={`font-sans text-[11px] truncate mt-0.5 ${unread ? 'text-white/70' : 'text-white/40'}`}>
                            {conv.lastMessage?.content ?? 'No messages yet'}
                          </p>
                        </div>
                        {unread && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Message window ─────────────────────────────────────────── */}
            {view === 'window' && activeConv && (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-3 px-3 py-3 border-b border-white/10 shrink-0">
                  <button onClick={() => { leaveConversation(activeConv.id); setView('list'); setActiveConv(null); }}
                    className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-xs font-semibold text-white truncate">{getDisplayName(activeConv, myId)}</p>
                    {typingList.length > 0 && (
                      <p className="font-mono text-[9px] text-blue-400">{typingList[0]} is typing…</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                  {hasMore && (
                    <button onClick={() => loadMessages(activeConv.id, cursor)}
                      className="w-full text-center font-mono text-[10px] text-white/30 hover:text-white/60 py-2 transition-colors">
                      {loadingMsgs ? 'Loading…' : 'Load earlier messages'}
                    </button>
                  )}
                  {messages.map((msg) => (
                    <Bubble key={msg.id} msg={msg} isMine={msg.senderId === myId} />
                  ))}
                  {typingList.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      {[0,1,2].map((i) => (
                        <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"
                          animate={{ y: [0,-4,0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-3 py-2.5 border-t border-white/10 shrink-0">
                  <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-blue-500/40 transition-colors">
                    <textarea
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Type a message…"
                      rows={1}
                      className="flex-1 bg-transparent font-sans text-sm text-white placeholder:text-white/30 outline-none resize-none max-h-28"
                      style={{ minHeight: '22px' }}
                    />
                    <button onClick={handleSend} disabled={!input.trim()}
                      className="w-7 h-7 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-30 flex items-center justify-center text-white transition-colors shrink-0 mb-0.5">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-mono text-[9px] text-white/20 text-center mt-1">Enter to send · Shift+Enter for newline</p>
                </div>
              </div>
            )}

            {/* ── New chat / user picker ──────────────────────────────────── */}
            {view === 'new' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-4 py-3.5 border-b border-white/10 shrink-0">
                  <button onClick={() => setView('list')} className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-serif text-sm font-bold text-white">New Message</span>
                </div>
                <div className="px-4 pt-3 shrink-0">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by email…"
                      className="flex-1 bg-transparent font-sans text-xs text-white placeholder:text-white/30 outline-none" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-2">
                  {filteredUsers.length === 0 && (
                    <p className="font-sans text-xs text-white/30 text-center py-8">No users found.</p>
                  )}
                  {filteredUsers.map((u) => (
                    <button key={u.id} onClick={() => startDM(u.id)}
                      className="w-full flex items-center gap-3 py-2.5 hover:bg-white/5 rounded-xl px-2 transition-colors text-left">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-serif font-bold text-sm text-blue-400 shrink-0">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-sans text-xs text-white truncate">{u.email}</p>
                        <p className="font-mono text-[9px] text-white/40">{u.role}</p>
                      </div>
                      {onlineUsers.has(u.id) && <Circle className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 shrink-0 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
