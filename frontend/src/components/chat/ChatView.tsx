'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, Send, ChevronLeft, Users, Plus,
  Circle, Loader2, Search, X,
} from 'lucide-react';
import { useSocket, ChatMessage, Conversation } from '../../context/SocketContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)    return 'now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString();
}

function getDisplayName(conv: Conversation, myId: string) {
  if (conv.isGroup) return conv.name ?? 'Group Chat';
  const other = conv.participants.find((p) => p.id !== myId);
  return other?.email ?? 'Unknown';
}

// ── Message bubble — uses CSS vars so it adapts to every theme ────────────────
function Bubble({ msg, isMine }: { msg: ChatMessage; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className="max-w-[65%] px-4 py-2.5 rounded-2xl text-sm font-sans leading-relaxed"
        style={
          isMine
            ? {
                background: '#E9C349',
                color: '#0F0F10',
                borderBottomRightRadius: '4px',
              }
            : {
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                borderBottomLeftRadius: '4px',
              }
        }
      >
        {!isMine && (
          <p className="font-mono text-[9px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
            {msg.sender.email}
          </p>
        )}
        {msg.content}
        <p
          className="font-mono text-[9px] mt-0.5 text-right"
          style={{ color: isMine ? 'rgba(15,15,16,0.45)' : 'var(--text-faint)' }}
        >
          {timeAgo(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ChatView() {
  const {
    connected, onlineUsers,
    joinConversation, leaveConversation,
    sendMessage, sendTyping, sendStopTyping, markRead,
    onNewMessage, onTyping, onStopTyping,
  } = useSocket();

  const [view, setView]                   = useState<'list' | 'window' | 'new'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv]       = useState<Conversation | null>(null);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [cursor, setCursor]               = useState<string | undefined>();
  const [hasMore, setHasMore]             = useState(false);
  const [typingUsers, setTypingUsers]     = useState<Record<string, string>>({});
  const [allowedUsers, setAllowedUsers]   = useState<{ id: string; email: string; role: string }[]>([]);
  const [userSearch, setUserSearch]       = useState('');
  const [myId, setMyId]                   = useState('');

  const bottomRef   = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.userId) setMyId(d.userId); })
      .catch(() => {});
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/chat/conversations`, { credentials: 'include' });
      if (!r.ok) { setLoading(false); return; }
      const data = await r.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string, cur?: string) => {
    setLoadingMsgs(true);
    try {
      const url = cur
        ? `${API}/api/chat/conversations/${convId}/messages?cursor=${cur}`
        : `${API}/api/chat/conversations/${convId}/messages`;
      const r = await fetch(url, { credentials: 'include' });
      const data: ChatMessage[] = await r.json();
      if (cur) setMessages((p) => [...data, ...p]);
      else     setMessages(data);
      setHasMore(data.length === 30);
      if (data.length > 0) setCursor(data[0].id);
    } catch { /* ignore */ }
    setLoadingMsgs(false);
  }, []);

  const openConv = useCallback((conv: Conversation) => {
    if (activeConv) leaveConversation(activeConv.id);
    setActiveConv(conv);
    setMessages([]);
    setCursor(undefined);
    setView('window');
    joinConversation(conv.id);
    markRead(conv.id);
    loadMessages(conv.id);
    setConversations((p) => p.map((c) =>
      c.id === conv.id ? { ...c, lastReadAt: new Date().toISOString() } : c
    ));
  }, [activeConv, leaveConversation, joinConversation, markRead, loadMessages]);

  useEffect(() => {
    const off = onNewMessage((msg) => {
      if (activeConv?.id === msg.conversationId) {
        setMessages((p) => [...p, msg]);
        markRead(msg.conversationId);
      } else {
        setConversations((p) => p.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: { content: msg.content, senderEmail: msg.sender.email, createdAt: msg.createdAt } }
            : c
        ));
      }
    });
    return off;
  }, [onNewMessage, activeConv, markRead]);

  useEffect(() => {
    const offT = onTyping(({ conversationId, userId, email }) => {
      if (conversationId === activeConv?.id)
        setTypingUsers((p) => ({ ...p, [userId]: email }));
    });
    const offS = onStopTyping(({ conversationId, userId }) => {
      if (conversationId === activeConv?.id)
        setTypingUsers((p) => { const n = { ...p }; delete n[userId]; return n; });
    });
    return () => { offT(); offS(); };
  }, [onTyping, onStopTyping, activeConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !activeConv) return;
    sendMessage(activeConv.id, input.trim());
    setInput('');
    sendStopTyping(activeConv.id);
  };

  const handleInput = (val: string) => {
    setInput(val);
    if (!activeConv) return;
    sendTyping(activeConv.id);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendStopTyping(activeConv.id), 2000);
  };

  const openNew = async () => {
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
      openConv(conv);
    } catch { /* ignore */ }
  };

  const typingList   = Object.values(typingUsers);
  const filteredUsers = allowedUsers.filter((u) =>
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden"
      style={{
        border:     '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
      }}
    >
      {/* ── Left: conversation list ──────────────────────────────────────── */}
      <div
        className="w-72 shrink-0 flex flex-col"
        style={{ borderRight: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" style={{ color: '#E9C349' }} />
            <span className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Messages
            </span>
            {!connected && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border"
                style={{ color: 'var(--status-warning, #f59e0b)', borderColor: 'var(--status-warning, #f59e0b)' }}>
                offline
              </span>
            )}
          </div>
          <button
            onClick={openNew}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#E9C349'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
            title="New message"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-faint)' }} />
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <Users className="w-10 h-10" style={{ color: 'var(--text-faint)' }} />
              <p className="font-sans text-xs" style={{ color: 'var(--text-muted)' }}>
                No conversations yet.
              </p>
              <button
                onClick={openNew}
                className="font-sans text-xs hover:underline"
                style={{ color: '#E9C349' }}
              >
                Start a new chat
              </button>
            </div>
          )}

          {conversations.map((conv) => {
            const name     = getDisplayName(conv, myId);
            const other    = conv.participants.find((p) => p.id !== myId);
            const online   = other ? onlineUsers.has(other.id) : false;
            const isActive = activeConv?.id === conv.id;
            const unread   = conv.lastMessage &&
              (!conv.lastReadAt || new Date(conv.lastMessage.createdAt) > new Date(conv.lastReadAt));

            return (
              <button
                key={conv.id}
                onClick={() => openConv(conv)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{
                  background:   isActive ? 'rgba(233,195,73,0.08)' : 'transparent',
                  borderLeft:   isActive ? '2px solid #E9C349' : '2px solid transparent',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--hover-overlay, rgba(255,255,255,0.04))';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div className="relative shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-sm"
                    style={{
                      background:   'rgba(233,195,73,0.12)',
                      border:       '1px solid rgba(233,195,73,0.25)',
                      color:        '#E9C349',
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  {!conv.isGroup && (
                    <Circle
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3"
                      style={{
                        color: online ? '#34d399' : 'var(--text-faint)',
                        fill:  online ? '#34d399' : 'var(--text-faint)',
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className="font-sans text-xs truncate"
                      style={{
                        color:      unread ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: unread ? 700 : 500,
                      }}
                    >
                      {name}
                    </p>
                    {conv.lastMessage && (
                      <span className="font-mono text-[9px] shrink-0 ml-1" style={{ color: 'var(--text-faint)' }}>
                        {timeAgo(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p
                    className="font-sans text-[11px] truncate mt-0.5"
                    style={{ color: unread ? 'var(--text-secondary)' : 'var(--text-faint)' }}
                  >
                    {conv.lastMessage?.content ?? 'No messages yet'}
                  </p>
                </div>
                {unread && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#E9C349' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: message window / empty state / new chat ───────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <AnimatePresence mode="wait">

          {/* Empty state */}
          {view === 'list' && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(233,195,73,0.08)', border: '1px solid rgba(233,195,73,0.2)' }}
              >
                <MessageCircle className="w-8 h-8" style={{ color: 'rgba(233,195,73,0.5)' }} />
              </div>
              <div>
                <p className="font-serif text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
                  Select a conversation
                </p>
                <p className="font-sans text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  or start a new one
                </p>
              </div>
              <button
                onClick={openNew}
                className="px-5 py-2 rounded-xl font-sans text-sm font-medium transition-colors flex items-center gap-2"
                style={{
                  background:   'rgba(233,195,73,0.1)',
                  border:       '1px solid rgba(233,195,73,0.3)',
                  color:        '#E9C349',
                }}
              >
                <Plus className="w-4 h-4" /> New Message
              </button>
            </motion.div>
          )}

          {/* Message window */}
          {view === 'window' && activeConv && (
            <motion.div key="window" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0">

              {/* Header */}
              <div
                className="flex items-center gap-3 px-5 py-3.5 shrink-0"
                style={{ borderBottom: '1px solid var(--border-default)' }}
              >
                <button
                  onClick={() => { leaveConversation(activeConv.id); setView('list'); setActiveConv(null); }}
                  className="p-1.5 rounded-full transition-colors md:hidden"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-sm shrink-0"
                  style={{ background: 'rgba(233,195,73,0.12)', border: '1px solid rgba(233,195,73,0.25)', color: '#E9C349' }}
                >
                  {getDisplayName(activeConv, myId).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {getDisplayName(activeConv, myId)}
                  </p>
                  {typingList.length > 0
                    ? <p className="font-mono text-[10px]" style={{ color: '#E9C349' }}>{typingList[0]} is typing…</p>
                    : <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
                        {activeConv.participants.find((p) => p.id !== myId)?.role ?? ''}
                      </p>
                  }
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {hasMore && (
                  <button
                    onClick={() => loadMessages(activeConv.id, cursor)}
                    className="w-full text-center font-mono text-[10px] py-2 transition-colors mb-2"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    {loadingMsgs ? 'Loading…' : '↑ Load earlier messages'}
                  </button>
                )}
                {messages.map((msg) => (
                  <Bubble key={msg.id} msg={msg} isMine={msg.senderId === myId} />
                ))}
                {typingList.length > 0 && (
                  <div className="flex items-center gap-1.5 px-1 py-1 mb-1">
                    {[0,1,2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ background: 'rgba(233,195,73,0.6)' }}
                        animate={{ y: [0,-4,0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div
                className="px-5 py-3 shrink-0"
                style={{ borderTop: '1px solid var(--border-default)' }}
              >
                <div
                  className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-colors"
                  style={{
                    background: 'var(--bg-glass)',
                    border:     '1px solid var(--border-default)',
                  }}
                  onFocusCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(233,195,73,0.4)'; }}
                  onBlurCapture={(e)  => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
                >
                  <textarea
                    value={input}
                    onChange={(e) => handleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Type a message…"
                    rows={1}
                    className="flex-1 bg-transparent font-sans text-sm outline-none resize-none max-h-32 leading-relaxed"
                    style={{
                      color:           'var(--text-primary)',
                      minHeight:       '22px',
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 disabled:opacity-30"
                    style={{ background: '#E9C349', color: '#0F0F10' }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="font-mono text-[9px] text-center mt-1.5" style={{ color: 'var(--text-faint)' }}>
                  Enter to send · Shift+Enter for newline
                </p>
              </div>
            </motion.div>
          )}

          {/* New chat — user picker */}
          {view === 'new' && (
            <motion.div key="new" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0">

              <div
                className="flex items-center gap-3 px-5 py-3.5 shrink-0"
                style={{ borderBottom: '1px solid var(--border-default)' }}
              >
                <button
                  onClick={() => setView('list')}
                  className="p-1.5 rounded-full transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  New Message
                </span>
              </div>

              <div className="px-5 pt-4 pb-2 shrink-0">
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors"
                  style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-default)' }}
                >
                  <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-faint)' }} />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by email…"
                    className="flex-1 bg-transparent font-sans text-sm outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  {userSearch && (
                    <button onClick={() => setUserSearch('')} style={{ color: 'var(--text-faint)' }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1">
                {filteredUsers.length === 0 && (
                  <p className="font-sans text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>
                    No users found.
                  </p>
                )}
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startDM(u.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-overlay, rgba(255,255,255,0.04))'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-sm shrink-0"
                      style={{ background: 'rgba(233,195,73,0.12)', border: '1px solid rgba(233,195,73,0.25)', color: '#E9C349' }}
                    >
                      {u.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-sm truncate" style={{ color: 'var(--text-primary)' }}>{u.email}</p>
                      <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{u.role}</p>
                    </div>
                    {onlineUsers.has(u.id) && (
                      <Circle className="w-2.5 h-2.5 shrink-0" style={{ color: '#34d399', fill: '#34d399' }} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
