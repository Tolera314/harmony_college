'use client';

/**
 * MessagingView — Internal Staff Messaging (Harmony College)
 * Professional, role-aware, real-time messaging system for college staff & employees.
 *
 * Requirements fulfilled:
 * - Staff fetched and searchable primarily by full name with supporting role/department
 * - Redundant "Contact" section and "New" button/modal removed in favor of unified navigation
 * - Consistent, standardized layout across desktop, tablet, and mobile
 * - Real-time synchronization via Socket.IO for messages, previews, unread badges, and read receipts
 */

import React, {
  useState, useEffect, useRef, useCallback, useId, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Search, X, Users, Loader2, Pin, Archive,
  BellOff, MoreHorizontal, Reply, Pencil,
  Trash2, AlertCircle, Check, CheckCheck, Info, ChevronRight,
  Building2, Megaphone, ArchiveRestore, Bell,
  ArrowLeft, MessageSquare, Shield, CheckCircle2,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import {
  messagingApi,
  type MsgConversation, type MsgMessage, type MsgEmployee,
} from '../../lib/messagingApi';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & THEMING
// ─────────────────────────────────────────────────────────────────────────────

const GOLD        = '#E9C349';
const GOLD_BG     = 'rgba(233,195,73,0.12)';
const GOLD_BORDER = 'rgba(233,195,73,0.25)';

// Sent bubble: deep navy/slate so gold text pops — receiver: card bg
const SENT_BG     = '#1E2D45';   // deep blue-navy for sender
const SENT_TEXT   = '#E8EDF5';   // near-white for sender text
const SENT_META   = 'rgba(232,237,245,0.55)';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:     'Super Admin',
  ADMIN:           'Administrator',
  REGISTRAR:       'Registrar Officer',
  FINANCE_OFFICER: 'Finance Officer',
  HR_OFFICER:      'HR Officer',
  DEPARTMENT_HEAD: 'Department Head',
  INSTRUCTOR:      'Instructor',
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN:     '#8b5cf6',
  ADMIN:           '#3b82f6',
  REGISTRAR:       '#10b981',
  FINANCE_OFFICER: '#f59e0b',
  HR_OFFICER:      '#ec4899',
  DEPARTMENT_HEAD: '#06b6d4',
  INSTRUCTOR:      GOLD,
};

// Role-based staff tabs — Admin & Super Admin appear only under "All"
type RoleTab = 'all' | 'instructors' | 'hr' | 'registrars' | 'department_heads' | 'financial_officers';

const ROLE_TABS: { id: RoleTab; label: string; roles?: string[] }[] = [
  { id: 'all',               label: 'All' },
  { id: 'instructors',       label: 'Instructors',       roles: ['INSTRUCTOR'] },
  { id: 'hr',                label: 'HR',                roles: ['HR_OFFICER'] },
  { id: 'registrars',        label: 'Registrars',        roles: ['REGISTRAR'] },
  { id: 'department_heads',  label: 'Department Heads',  roles: ['DEPARTMENT_HEAD'] },
  { id: 'financial_officers',label: 'Financial Officers', roles: ['FINANCE_OFFICER'] },
];

const PRIORITY_COLOR: Record<string, string> = {
  NORMAL:    'var(--text-faint)',
  IMPORTANT: '#f59e0b',
  URGENT:    '#ef4444',
};

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)     return 'now';
  if (s < 3600)   return `${Math.floor(s / 60)}m`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return new Date(d).toLocaleDateString([], { weekday: 'short' });
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function msgTime(d: string): string {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dateLabel(d: string): string {
  const dt = new Date(d), today = new Date();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (dt.toDateString() === today.toDateString()) return 'Today';
  if (dt.toDateString() === yest.toDateString())  return 'Yesterday';
  return dt.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function convName(c: MsgConversation, myId: string): string {
  if (c.type !== 'DIRECT') return c.name ?? 'Group';
  const other = (c.participants ?? []).find(p => p.userId !== myId);
  return other?.fullName ?? 'Unknown Staff';
}

function convSub(c: MsgConversation, myId: string): string {
  if (c.type === 'DIRECT') {
    const o = (c.participants ?? []).find(p => p.userId !== myId);
    const r = ROLE_LABEL[o?.role ?? ''] ?? o?.role ?? 'Staff';
    return o?.department ? `${r} · ${o.department}` : r;
  }
  return `${(c.participants ?? []).length} member${(c.participants ?? []).length !== 1 ? 's' : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({
  name, role, size = 40, online,
}: {
  name: string | undefined | null;
  role?: string;
  size?: number;
  online?: boolean;
}) {
  const color   = ROLE_COLOR[role ?? ''] ?? GOLD;
  const safe    = name || '?';
  const letters = safe === '?'
    ? '?'
    : safe.trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const dotSize = Math.max(8, Math.round(size * 0.26));

  return (
    <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full flex items-center justify-center font-bold font-serif"
        style={{
          background: `${color}18`,
          border: `1.5px solid ${color}40`,
          color,
          fontSize: Math.max(11, Math.round(size * 0.38)),
          lineHeight: 1,
        }}
      >
        {letters}
      </div>
      {online !== undefined && (
        <span
          className="absolute rounded-full border-2"
          style={{
            width: dotSize,
            height: dotSize,
            bottom: 0,
            right: 0,
            background: online ? '#22c55e' : '#71717a',
            borderColor: 'var(--bg-surface, #0f0f10)',
          }}
          title={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY STATUS TICKS
// ─────────────────────────────────────────────────────────────────────────────

function Ticks({ s }: { s: string }) {
  if (s === 'READ')      return <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-blue-400" /></span>;
  if (s === 'DELIVERED') return <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 opacity-60" /></span>;
  if (s === 'SENT')      return <span title="Sent"><Check className="w-3.5 h-3.5 opacity-50" /></span>;
  if (s === 'FAILED')    return <span title="Failed"><AlertCircle className="w-3.5 h-3.5 text-red-500" /></span>;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT MENU (Reply, Edit, Delete)
// ─────────────────────────────────────────────────────────────────────────────

interface CtxMenu {
  x: number;
  y: number;
  msg: MsgMessage;
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────

interface BubbleProps {
  msg: MsgMessage;
  isMine: boolean;
  showName: boolean;
  onCtx: (e: React.MouseEvent, m: MsgMessage) => void;
}

function Bubble({ msg, isMine, showName, onCtx }: BubbleProps) {
  const accent = ROLE_COLOR[msg.sender.role] ?? GOLD;

  return (
    <div
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1.5 px-3 md:px-5 group`}
      onContextMenu={e => { e.preventDefault(); onCtx(e, msg); }}
    >
      {/* Received avatar */}
      {!isMine && (
        <div className="w-7 shrink-0 self-end mr-1.5 mb-0.5">
          {showName && <Avatar name={msg.sender.fullName} role={msg.sender.role} size={28} />}
        </div>
      )}

      <div className={`max-w-[82%] sm:max-w-[70%] md:max-w-[62%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender name for group messages */}
        {!isMine && showName && (
          <p className="font-sans text-[11px] font-semibold mb-1 px-1 flex items-center gap-1.5" style={{ color: accent }}>
            {msg.sender.fullName}
            <span className="font-mono text-[9px] font-normal opacity-70">
              {ROLE_LABEL[msg.sender.role] ?? msg.sender.role}
            </span>
          </p>
        )}

        {/* Reply preview */}
        {msg.replyTo && !msg.replyTo.isDeleted && (
          <div className="mb-1 w-full">
            <div
              className="flex rounded-xl overflow-hidden text-xs"
              style={{
                borderLeft: `3px solid ${isMine ? GOLD : accent}`,
                background: isMine ? 'rgba(255,255,255,0.07)' : 'var(--bg-card, rgba(255,255,255,0.04))',
              }}
            >
              <div className="px-2.5 py-1.5 flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate" style={{ color: isMine ? GOLD : accent }}>
                  {msg.replyTo.sender.fullName}
                </p>
                <p className="text-[11px] truncate" style={{ opacity: 0.65, color: isMine ? SENT_TEXT : 'var(--text-muted)' }}>
                  {msg.replyTo.content}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bubble container */}
        <div
          className="rounded-2xl text-sm font-sans leading-relaxed shadow-md transition-shadow hover:shadow-lg"
          style={isMine
            ? {
                background: SENT_BG,
                color: SENT_TEXT,
                borderBottomRightRadius: '3px',
                minWidth: 70,
                boxShadow: '0 2px 12px rgba(30,45,69,0.35)',
              }
            : {
                background: 'var(--bg-card, rgba(255,255,255,0.07))',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                borderBottomLeftRadius: '3px',
                minWidth: 70,
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              }
          }
        >
          <div className="px-3.5 py-2.5">
            {msg.isDeleted ? (
              <em className="text-xs opacity-40 italic">This message was deleted</em>
            ) : (
              <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
            )}

            {/* Time + status metadata */}
            <div className="flex items-center justify-end gap-1 mt-1.5 -mb-0.5 select-none">
              {msg.editedAt && !msg.isDeleted && (
                <span className="font-mono text-[8px] opacity-45">edited</span>
              )}
              <span
                className="font-mono text-[10px]"
                style={{ color: isMine ? SENT_META : 'var(--text-faint)' }}
              >
                {msgTime(msg.createdAt)}
              </span>
              {isMine && <Ticks s={msg.status} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION ITEM
// ─────────────────────────────────────────────────────────────────────────────

function ConvItem({
  conv, myId, isActive, online, onOpen, onPin, onArchive, onMute, onDelete,
}: {
  conv: MsgConversation;
  myId: string;
  isActive: boolean;
  online: boolean;
  onOpen: () => void;
  onPin: () => void;
  onArchive: () => void;
  onMute: () => void;
  onDelete?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const nm      = convName(conv, myId);
  const sub     = convSub(conv, myId);
  const other   = conv.type === 'DIRECT' ? (conv.participants ?? []).find(p => p.userId !== myId) : null;
  const unread  = (conv.unreadCount ?? 0) > 0;
  const preview = conv.lastMessage?.isDeleted
    ? 'Message deleted'
    : conv.lastMessage?.content
    ? (conv.lastMessage.content.slice(0, 42) + (conv.lastMessage.content.length > 42 ? '…' : ''))
    : 'No messages yet';

  return (
    <div className="relative group">
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors relative"
        style={{
          background: isActive ? `${GOLD}14` : 'transparent',
          borderLeft: `3px solid ${isActive ? GOLD : 'transparent'}`,
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--hover-overlay)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {conv.type === 'DIRECT' && other ? (
          <Avatar name={other.fullName} role={other.role} size={42} online={online} />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: GOLD_BG, border: `1.5px solid ${GOLD_BORDER}` }}
          >
            {conv.type === 'DEPARTMENT' ? <Building2 className="w-5 h-5 text-(--brand-gold)" />
             : conv.type === 'OFFICIAL'   ? <Megaphone className="w-5 h-5 text-(--brand-gold)" />
             : <Users className="w-5 h-5 text-(--brand-gold)" />}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              {conv.isPinned && <Pin className="w-3 h-3 shrink-0" style={{ color: GOLD }} />}
              {conv.isMuted  && <BellOff className="w-3 h-3 shrink-0 text-(--text-faint)" />}
              {/* Full Name / Group Name — primary */}
              <p
                className="font-sans text-sm truncate"
                style={{ color: 'var(--text-primary)', fontWeight: unread ? 700 : 500 }}
              >
                {nm}
              </p>
            </div>
            <span className="font-mono text-[10px] shrink-0 text-(--text-faint)">
              {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ''}
            </span>
          </div>

          {/* Supporting line: Role & Department for direct, or member count for groups */}
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <p className="font-sans text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {sub}
            </p>
            {unread && (
              <span
                className="shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-mono text-[9px] font-bold px-1"
                style={{ background: GOLD, color: '#0F0F10' }}
              >
                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
              </span>
            )}
          </div>

          {/* Message preview */}
          <p
            className="font-sans text-xs truncate mt-0.5"
            style={{ color: unread ? 'var(--text-secondary)' : 'var(--text-faint)' }}
          >
            {preview}
          </p>
        </div>
      </button>

      {/* Context options trigger */}
      <button
        onClick={e => { e.stopPropagation(); setMenu(v => !v); }}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-(--hover-overlay) opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: isActive || menu ? 1 : undefined }}
        title="More options"
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-(--text-faint)" />
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
          <div
            className="absolute right-2 top-full mt-1 z-30 rounded-2xl overflow-hidden shadow-2xl py-1"
            style={{ background: 'var(--bg-modal, #18181b)', border: '1px solid var(--border-default)', minWidth: 150 }}
          >
            {[
              { icon: <Pin className="w-3.5 h-3.5" />, label: conv.isPinned ? 'Unpin' : 'Pin', fn: onPin },
              { icon: conv.isMuted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />, label: conv.isMuted ? 'Unmute' : 'Mute', fn: onMute },
              { icon: <Archive className="w-3.5 h-3.5" />, label: conv.isArchived ? 'Unarchive' : 'Archive', fn: onArchive },
              ...(onDelete ? [{ icon: <Trash2 className="w-3.5 h-3.5 text-red-400" />, label: 'Delete Chat', fn: onDelete, danger: true }] : []),
            ].map((item: any) => (
              <button
                key={item.label}
                onClick={() => { item.fn(); setMenu(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-(--hover-overlay) text-left transition-colors text-xs font-sans ${
                  item.danger ? 'text-red-400 hover:text-red-300' : 'text-(--text-secondary)'
                }`}
              >
                <span className={item.danger ? 'text-red-400' : 'text-(--text-muted)'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MESSAGING VIEW
// ─────────────────────────────────────────────────────────────────────────────

export function MessagingView() {
  const {
    connected,
    onlineUsers,
    onNewMessage,
    onMessageStatus,
    onMessageEdited,
    onMessageDeleted,
    onConversationCreated,
    onRead,
    joinConversation,
    leaveConversation,
    markRead,
  } = useSocket();

  const [myId,         setMyId]         = useState('');
  const [convs,        setConvs]        = useState<MsgConversation[]>([]);
  const [active,       setActive]       = useState<MsgConversation | null>(null);
  const [messages,     setMessages]     = useState<MsgMessage[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [cursor,       setCursor]       = useState<string | undefined>();
  const [hasMore,      setHasMore]      = useState(false);
  const [input,        setInput]        = useState('');
  const [sending,      setSending]      = useState(false);
  const [searchConv,   setSearchConv]   = useState('');
  const [allStaff,     setAllStaff]     = useState<MsgEmployee[]>([]);
  const [staffResults, setStaffResults] = useState<MsgEmployee[]>([]);
  const [searchingStaff, setSearchingStaff] = useState(false);
  const [showInfo,     setShowInfo]     = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingMsg,   setEditingMsg]   = useState<MsgMessage | null>(null);
  const [replyTo,      setReplyTo]      = useState<MsgMessage | null>(null);
  const [roleTab,      setRoleTab]      = useState<RoleTab>('all');
  const [ctxMenu,      setCtxMenu]      = useState<CtxMenu | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const uid       = useId();

  // Hide AI assistant bubble while messaging is open
  useEffect(() => {
    document.body.setAttribute('data-messaging-active', '1');
    return () => document.body.removeAttribute('data-messaging-active');
  }, []);

  // Fetch current user id
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const id = d.user?.id ?? d.userId ?? '';
        if (id) setMyId(id);
      })
      .catch(() => {});
  }, []);

  // Load conversations
  const loadConvs = useCallback(async (arch = false) => {
    setLoadingConvs(true);
    try {
      setConvs(await messagingApi.listConversations(arch));
    } catch {
      // ignore
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    loadConvs(showArchived);
  }, [loadConvs, showArchived, connected]);

  // Pre-load all staff (no students) on mount
  useEffect(() => {
    messagingApi.searchEmployees('', 1000)
      .then(res => setAllStaff(res))
      .catch(() => {});
  }, []);

  // Load messages for a conversation
  const loadMsgs = useCallback(async (cid: string, cur?: string) => {
    setLoadingMsgs(true);
    try {
      const msgs = await messagingApi.listMessages(cid, cur);
      if (cur) {
        setMessages(p => [...msgs, ...p]);
      } else {
        setMessages(msgs);
      }
      setHasMore(msgs.length === 30);
      if (msgs.length > 0) setCursor(msgs[0].id);
    } catch {
      // ignore
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // Open conversation
  const openConv = useCallback(async (c: MsgConversation) => {
    if (active?.id === c.id) return;
    if (active) leaveConversation(active.id);
    setActive(c);
    setMessages([]);
    setCursor(undefined);
    setHasMore(false);
    setReplyTo(null);
    setEditingMsg(null);
    setInput('');
    setShowInfo(false);

    joinConversation(c.id);
    markRead(c.id);
    messagingApi.markRead(c.id).catch(() => {});

    await loadMsgs(c.id);
    setConvs(p => p.map(x => x.id === c.id ? { ...x, unreadCount: 0 } : x));
  }, [active, leaveConversation, joinConversation, markRead, loadMsgs]);

  // Direct start from staff search / browse
  const startDM = useCallback(async (emp: MsgEmployee) => {
    try {
      // 1. Check if conversation already exists in loaded convs
      const existing = convs.find(c =>
        c.type === 'DIRECT' &&
        (c.participants ?? []).some(p => p.userId === emp.id)
      );
      if (existing) {
        setSearchConv('');
        setStaffResults([]);
        await openConv(existing);
        return;
      }

      // 2. Otherwise create or fetch via backend
      const c = await messagingApi.createConversation({
        type: 'DIRECT',
        participantIds: [emp.id],
      });
      setSearchConv('');
      setStaffResults([]);
      await loadConvs(showArchived);
      await openConv(c);
    } catch (err) {
      console.error('[startDM]', err);
    }
  }, [convs, loadConvs, openConv, showArchived]);

  // Unified Search for staff by full name (filters allStaff client-side if already loaded)
  useEffect(() => {
    const q = searchConv.trim().toLowerCase();
    if (!q || q.length < 2) {
      setStaffResults([]);
      setSearchingStaff(false);
      return;
    }

    if (allStaff.length > 0) {
      // Filter from pre-loaded list — instant
      const filtered = allStaff.filter(e =>
        e.id !== myId &&
        (e.fullName.toLowerCase().includes(q) ||
         (e.department?.toLowerCase().includes(q) ?? false) ||
         (e.position?.toLowerCase().includes(q) ?? false))
      );
      setStaffResults(filtered.slice(0, 20));
      return;
    }

    // Fallback: API search
    setSearchingStaff(true);
    const timer = setTimeout(() => {
      messagingApi.searchEmployees(q, 20)
        .then(res => setStaffResults(res.filter(e => e.id !== myId)))
        .catch(() => setStaffResults([]))
        .finally(() => setSearchingStaff(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchConv, myId, allStaff]);

  // ── REAL-TIME SOCKET SUBSCRIPTIONS ─────────────────────────────────────────

  // 1. New incoming message
  useEffect(() => {
    return onNewMessage(rawMsg => {
      const msg = rawMsg as MsgMessage;

      // If in active conversation -> append immediately
      if (active?.id === msg.conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        markRead(msg.conversationId);
        messagingApi.markRead(msg.conversationId).catch(() => {});
      }

      // Update conversation list preview, unread count, and ordering
      setConvs(prevConvs => {
        const found = prevConvs.find(c => c.id === msg.conversationId);
        if (found) {
          const isCurrentActive = active?.id === msg.conversationId;
          const updated: MsgConversation = {
            ...found,
            unreadCount: isCurrentActive ? 0 : (found.unreadCount ?? 0) + 1,
            lastMessage: {
              id:         msg.id,
              content:    msg.content,
              senderId:   msg.senderId,
              senderName: (msg.sender as any)?.fullName ?? 'Staff',
              createdAt:  msg.createdAt,
              isDeleted:  false,
            },
            lastMessageAt: msg.createdAt,
          };
          // Move conversation to the top
          return [updated, ...prevConvs.filter(c => c.id !== msg.conversationId)];
        }
        // If not found in list, reload conversations so new chat appears
        loadConvs(showArchived);
        return prevConvs;
      });
    });
  }, [onNewMessage, active, markRead, loadConvs, showArchived]);

  // 2. Message delivery and read status updates
  useEffect(() => {
    return onMessageStatus(evt => {
      if (active?.id === evt.conversationId) {
        setMessages(prev =>
          prev.map(m => {
            if (evt.messageId && m.id === evt.messageId) {
              return { ...m, status: evt.status as any };
            }
            if (evt.status === 'READ' && m.senderId === myId) {
              return { ...m, status: 'READ' };
            }
            return m;
          })
        );
      }
    });
  }, [onMessageStatus, active, myId]);

  // 3. Message edit sync
  useEffect(() => {
    return onMessageEdited(evt => {
      if (active?.id === evt.conversationId) {
        setMessages(prev =>
          prev.map(m => m.id === evt.messageId ? { ...m, content: evt.content, editedAt: evt.editedAt } : m)
        );
      }
    });
  }, [onMessageEdited, active]);

  // 4. Message deletion sync
  useEffect(() => {
    return onMessageDeleted(evt => {
      if (active?.id === evt.conversationId) {
        setMessages(prev =>
          prev.map(m => m.id === evt.messageId ? { ...m, isDeleted: true, content: '' } : m)
        );
      }
    });
  }, [onMessageDeleted, active]);

  // 5. Conversation created broadcast
  useEffect(() => {
    return onConversationCreated(() => {
      loadConvs(showArchived);
    });
  }, [onConversationCreated, loadConvs, showArchived]);

  // Auto-scroll on new message
  useEffect(() => {
    if (!loadingMsgs) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, loadingMsgs]);

  // Send message or commit edit
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !active) return;

    if (editingMsg) {
      setSending(true);
      try {
        const updated = await messagingApi.editMessage(editingMsg.id, text);
        setMessages(p => p.map(m => m.id === editingMsg.id ? updated : m));
      } catch {
        // ignore
      }
      setEditingMsg(null);
      setInput('');
      setSending(false);
      return;
    }

    setSending(true);
    const replyTarget = replyTo;
    setInput('');
    setReplyTo(null);

    try {
      const created = await messagingApi.sendMessage(active.id, {
        content:   text,
        replyToId: replyTarget?.id,
      });
      // Optimistic append in case socket event is delayed
      setMessages(prev => {
        if (prev.some(m => m.id === created.id)) return prev;
        return [...prev, created];
      });
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [active, input, editingMsg, replyTo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Context menu actions
  const openCtx = (e: React.MouseEvent, msg: MsgMessage) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, msg });
  };
  const closeCtx = () => setCtxMenu(null);

  const doReply = (m: MsgMessage) => {
    setReplyTo(m);
    setEditingMsg(null);
    inputRef.current?.focus();
    closeCtx();
  };

  const doEdit = (m: MsgMessage) => {
    setEditingMsg(m);
    setInput(m.content);
    setReplyTo(null);
    inputRef.current?.focus();
    closeCtx();
  };

  const doDelete = async (m: MsgMessage) => {
    closeCtx();
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await messagingApi.deleteMessage(m.id);
      setMessages(p => p.map(x => x.id === m.id ? { ...x, isDeleted: true, content: '' } : x));
    } catch {
      // ignore
    }
  };

  // Preferences toggles
  const togglePin = async (c: MsgConversation) => {
    await messagingApi.updatePrefs(c.id, { isPinned: !c.isPinned }).catch(() => {});
    setConvs(p => p.map(x => x.id === c.id ? { ...x, isPinned: !x.isPinned } : x));
  };

  const toggleArchive = async (c: MsgConversation) => {
    await messagingApi.updatePrefs(c.id, { isArchived: !c.isArchived }).catch(() => {});
    setConvs(p => p.filter(x => x.id !== c.id));
    if (active?.id === c.id) {
      setActive(null);
      setMessages([]);
    }
  };

  const toggleMute = async (c: MsgConversation) => {
    await messagingApi.updatePrefs(c.id, { isMuted: !c.isMuted }).catch(() => {});
    setConvs(p => p.map(x => x.id === c.id ? { ...x, isMuted: !x.isMuted } : x));
  };

  const deleteConv = async (c: MsgConversation) => {
    const targetName = convName(c, myId);
    if (!window.confirm(`Delete conversation with "${targetName}"? All messages in this conversation will be permanently removed.`)) return;
    try {
      await messagingApi.deleteConversation(c.id);
      setConvs(p => p.filter(x => x.id !== c.id));
      if (active?.id === c.id) {
        leaveConversation(c.id);
        setActive(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('[deleteConv]', err);
    }
  };

  // Staff visible in current role tab (for sidebar browse)
  const tabStaff = useMemo(() => {
    const tab = ROLE_TABS.find(t => t.id === roleTab);
    const pool = searchConv.trim().length >= 2 ? staffResults : allStaff.filter(e => e.id !== myId);
    if (!tab || !tab.roles) return pool;  // 'all' tab
    return pool.filter(e => tab.roles!.includes(e.role));
  }, [roleTab, allStaff, staffResults, searchConv, myId]);

  // Filtered & deduplicated conversations
  const filteredConvs = useMemo(() => {
    const tab = ROLE_TABS.find(t => t.id === roleTab);
    const filtered = convs.filter(c => {
      // Role-tab filter
      if (tab?.roles) {
        if (c.type === 'DIRECT') {
          const other = (c.participants ?? []).find(p => p.userId !== myId);
          if (!other || !tab.roles.includes(other.role)) return false;
        } else {
          return false;
        }
      }
      // Search filter
      if (!searchConv.trim()) return true;
      const s = searchConv.toLowerCase();
      const n = convName(c, myId).toLowerCase();
      const last = c.lastMessage?.content?.toLowerCase() ?? '';
      const part = (c.participants ?? []).some(p => p.fullName?.toLowerCase().includes(s));
      return n.includes(s) || last.includes(s) || part;
    });

    // Deduplicate DIRECT conversations by other participant's userId
    const seen = new Set<string>();
    const result: MsgConversation[] = [];
    for (const c of filtered) {
      if (c.type === 'DIRECT') {
        const other = (c.participants ?? []).find(p => p.userId !== myId);
        if (other) {
          if (seen.has(other.userId)) continue;
          seen.add(other.userId);
        }
        // Don't show direct conversation with 0 messages unless it is active
        if (!c.lastMessage && active?.id !== c.id) continue;
      }
      result.push(c);
    }
    return result;
  }, [convs, roleTab, searchConv, myId, active]);

  const totalUnread = convs.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
  const otherUser   = active?.type === 'DIRECT' ? (active.participants ?? []).find(p => p.userId !== myId) : null;
  const isGroup     = active && active.type !== 'DIRECT';

  return (
    <>
      {/* Right-click Context Menu */}
      <AnimatePresence>
        {ctxMenu && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={closeCtx}
              onContextMenu={e => { e.preventDefault(); closeCtx(); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.1 }}
              className="fixed z-[9999] rounded-2xl overflow-hidden shadow-2xl py-1"
              style={{
                left: Math.min(ctxMenu.x, window.innerWidth - 180),
                top:  Math.min(ctxMenu.y, window.innerHeight - 160),
                background: 'var(--bg-modal, #18181b)',
                border: '1px solid var(--border-default)',
                minWidth: 160,
              }}
            >
              <button
                onClick={() => doReply(ctxMenu.msg)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-(--hover-overlay) text-left transition-colors text-xs font-sans text-(--text-secondary)"
              >
                <Reply className="w-3.5 h-3.5 text-(--text-muted)" />
                <span>Reply</span>
              </button>
              {ctxMenu.msg.senderId === myId && !ctxMenu.msg.isDeleted && (
                <>
                  <button
                    onClick={() => doEdit(ctxMenu.msg)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-(--hover-overlay) text-left transition-colors text-xs font-sans text-(--text-secondary)"
                  >
                    <Pencil className="w-3.5 h-3.5 text-(--text-muted)" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => doDelete(ctxMenu.msg)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-(--hover-overlay) text-left transition-colors text-xs font-sans text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        className="h-[calc(100vh-8.5rem)] flex rounded-2xl overflow-hidden shadow-sm"
        style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}
      >
        {/* ── LEFT CONVERSATION PANEL ────────────────────────────────────────── */}
        <div
          className={`${active ? 'hidden md:flex' : 'flex'} w-full md:w-84 xl:w-92 shrink-0 flex-col`}
          style={{ borderRight: '1px solid var(--border-default)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Messages
                </span>
                {totalUnread > 0 && (
                  <span
                    className="h-5 min-w-[20px] rounded-full flex items-center justify-center font-mono text-[9px] font-bold px-1.5"
                    style={{ background: GOLD, color: '#0F0F10' }}
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
                {!connected && (
                  <span
                    className="font-mono text-[9px] px-2 py-0.5 rounded-full border text-amber-500 border-amber-500/30"
                  >
                    connecting…
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowArchived(v => !v)}
                  className="p-2 rounded-xl hover:bg-(--hover-overlay) text-(--text-faint) hover:text-(--text-primary) transition-colors"
                  title={showArchived ? 'View Active Chats' : 'View Archived Chats'}
                >
                  {showArchived ? (
                    <ArchiveRestore className="w-4 h-4" style={{ color: GOLD }} />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Unified Search: messages + staff by full name */}
            <div className="relative mb-2.5">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-(--text-faint)"
              />
              <input
                type="text"
                value={searchConv}
                onChange={e => setSearchConv(e.target.value)}
                placeholder="Search staff by full name or chats…"
                className="w-full pl-9 pr-8 py-2 rounded-full text-xs font-sans border focus:outline-none transition-colors"
                style={{
                  background: 'var(--bg-input, rgba(255,255,255,0.05))',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
              {searchConv && (
                <button
                  onClick={() => { setSearchConv(''); setStaffResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-(--text-faint) hover:text-(--text-primary)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role-Based Navigation Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {ROLE_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setRoleTab(tab.id)}
                  className="shrink-0 px-2.5 py-1 rounded-full font-sans text-[11px] font-semibold transition-all"
                  style={{
                    background: roleTab === tab.id ? GOLD_BG : 'transparent',
                    color:      roleTab === tab.id ? GOLD : 'var(--text-faint)',
                    border:     `1px solid ${roleTab === tab.id ? GOLD_BORDER : 'transparent'}`,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List & Staff Browse / Search */}
          <div className="flex-1 overflow-y-auto">

            {/* Loading indicator */}
            {loadingConvs && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
              </div>
            )}

            {/* ── CASE 1: SEARCH ACTIVE (across any tab) ─────────────────── */}
            {!loadingConvs && searchConv.trim().length >= 2 && (
              <>
                {/* Staff results from search */}
                {tabStaff.length > 0 && (
                  <div className="border-b pb-1 mb-1" style={{ borderColor: 'var(--border-subtle)' }}>
                    <p className="font-mono text-[9px] uppercase tracking-wider font-semibold px-4 py-1.5" style={{ color: 'var(--text-faint)' }}>
                      Staff matching &quot;{searchConv}&quot; ({tabStaff.length})
                    </p>
                    {tabStaff.map(emp => {
                      const online    = onlineUsers.has(emp.id);
                      const roleColor = ROLE_COLOR[emp.role] ?? GOLD;
                      return (
                        <button
                          key={emp.id}
                          onClick={() => startDM(emp)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-(--hover-overlay)"
                          title={`Message ${emp.fullName}`}
                        >
                          <Avatar name={emp.fullName} role={emp.role} size={38} online={online} />
                          <div className="flex-1 min-w-0">
                            <p className="font-sans text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {emp.fullName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                                style={{ background: `${roleColor}1A`, color: roleColor }}
                              >
                                {ROLE_LABEL[emp.role] ?? emp.role}
                              </span>
                              {(emp.department ?? emp.position) && (
                                <span className="font-sans text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>
                                  {emp.department ?? emp.position}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-30" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Conversations matching search */}
                {filteredConvs.length > 0 && (
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider font-semibold px-4 py-1.5" style={{ color: 'var(--text-faint)' }}>
                      Conversations ({filteredConvs.length})
                    </p>
                    {filteredConvs.map(c => {
                      const other = c.type === 'DIRECT' ? (c.participants ?? []).find(p => p.userId !== myId) : null;
                      return (
                        <ConvItem
                          key={c.id}
                          conv={c}
                          myId={myId}
                          isActive={active?.id === c.id}
                          online={other ? onlineUsers.has(other.userId) : false}
                          onOpen={() => openConv(c)}
                          onPin={() => togglePin(c)}
                          onArchive={() => toggleArchive(c)}
                          onMute={() => toggleMute(c)}
                          onDelete={() => deleteConv(c)}
                        />
                      );
                    })}
                  </div>
                )}

                {tabStaff.length === 0 && filteredConvs.length === 0 && (
                  <p className="font-sans text-xs px-4 py-8 text-center" style={{ color: 'var(--text-faint)' }}>
                    No staff or conversations matching &quot;{searchConv}&quot;
                  </p>
                )}
              </>
            )}

            {/* ── CASE 2: ROLE TAB SELECTED (e.g. instructors, hr, registrars) ─── */}
            {!loadingConvs && !searchConv.trim() && roleTab !== 'all' && (
              <div>
                {tabStaff.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <p className="font-sans text-xs" style={{ color: 'var(--text-faint)' }}>
                      No staff members in this role.
                    </p>
                  </div>
                ) : (
                  tabStaff.map(emp => {
                    // Check if an existing direct conversation exists for this staff member
                    const conv = filteredConvs.find(c =>
                      c.type === 'DIRECT' &&
                      (c.participants ?? []).some(p => p.userId === emp.id)
                    );

                    // If a conversation exists, show full conversation card
                    if (conv) {
                      return (
                        <ConvItem
                          key={conv.id}
                          conv={conv}
                          myId={myId}
                          isActive={active?.id === conv.id}
                          online={onlineUsers.has(emp.id)}
                          onOpen={() => openConv(conv)}
                          onPin={() => togglePin(conv)}
                          onArchive={() => toggleArchive(conv)}
                          onMute={() => toggleMute(conv)}
                          onDelete={() => deleteConv(conv)}
                        />
                      );
                    }

                    // Otherwise show staff item — click immediately opens/creates DM
                    const online    = onlineUsers.has(emp.id);
                    const roleColor = ROLE_COLOR[emp.role] ?? GOLD;
                    return (
                      <button
                        key={emp.id}
                        onClick={() => startDM(emp)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-(--hover-overlay)"
                        title={`Message ${emp.fullName}`}
                      >
                        <Avatar name={emp.fullName} role={emp.role} size={38} online={online} />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {emp.fullName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: `${roleColor}1A`, color: roleColor }}
                            >
                              {ROLE_LABEL[emp.role] ?? emp.role}
                            </span>
                            {(emp.department ?? emp.position) && (
                              <span className="font-sans text-[11px] truncate" style={{ color: 'var(--text-faint)' }}>
                                {emp.department ?? emp.position}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-30" />
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* ── CASE 3: "ALL" TAB (default conversations view) ─────────── */}
            {!loadingConvs && !searchConv.trim() && roleTab === 'all' && (
              <div>
                {filteredConvs.map(c => {
                  const other = c.type === 'DIRECT' ? (c.participants ?? []).find(p => p.userId !== myId) : null;
                  return (
                    <ConvItem
                      key={c.id}
                      conv={c}
                      myId={myId}
                      isActive={active?.id === c.id}
                      online={other ? onlineUsers.has(other.userId) : false}
                      onOpen={() => openConv(c)}
                      onPin={() => togglePin(c)}
                      onArchive={() => toggleArchive(c)}
                      onMute={() => toggleMute(c)}
                      onDelete={() => deleteConv(c)}
                    />
                  );
                })}

                {filteredConvs.length === 0 && (
                  <div className="text-center py-10 px-4">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-25" style={{ color: GOLD }} />
                    <p className="font-sans text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {showArchived ? 'No archived conversations' : 'No conversations yet'}
                    </p>
                    <p className="font-sans text-xs mt-1 max-w-[220px] mx-auto leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                      Select a role tab above (e.g. Instructors, HR, Registrars) or search by name to message any colleague.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── CENTER CHAT PANEL ──────────────────────────────────────────────── */}
        <div className={`${active ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 bg-(--bg-surface)`}>
          {!active ? (
            /* Welcome prompt when no conversation is selected on desktop */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner"
                style={{ background: GOLD_BG, border: `1px solid ${GOLD_BORDER}` }}
              >
                <MessageSquare className="w-8 h-8" style={{ color: GOLD }} />
              </div>
              <div>
                <p className="font-serif text-lg font-bold mb-1.5 text-(--text-primary)">
                  Harmony College Messaging
                </p>
                <p className="font-sans text-xs text-(--text-muted) max-w-[280px] leading-relaxed">
                  Select an existing conversation or search for a staff member by full name to communicate in real time.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div
                className="flex items-center gap-3 px-4 py-2.5 shrink-0"
                style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}
              >
                {/* Mobile Back Button */}
                <button
                  onClick={() => {
                    leaveConversation(active.id);
                    setActive(null);
                    setMessages([]);
                  }}
                  className="p-1.5 rounded-full hover:bg-(--hover-overlay) md:hidden text-(--text-muted)"
                  title="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {active.type === 'DIRECT' && otherUser ? (
                  <Avatar
                    name={otherUser.fullName}
                    role={otherUser.role}
                    size={38}
                    online={onlineUsers.has(otherUser.userId)}
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: GOLD_BG, border: `1.5px solid ${GOLD_BORDER}` }}
                  >
                    {active.type === 'DEPARTMENT' ? <Building2 className="w-4 h-4 text-(--brand-gold)" />
                     : active.type === 'OFFICIAL'   ? <Megaphone className="w-4 h-4 text-(--brand-gold)" />
                     : <Users className="w-4 h-4 text-(--brand-gold)" />}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Primary Name */}
                    <p className="font-sans text-sm font-semibold truncate text-(--text-primary)">
                      {convName(active, myId)}
                    </p>
                    {active.priority !== 'NORMAL' && (
                      <span
                        className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
                        style={{
                          background: PRIORITY_COLOR[active.priority] + '20',
                          color:      PRIORITY_COLOR[active.priority],
                        }}
                      >
                        {active.priority}
                      </span>
                    )}
                  </div>

                  {/* Supporting subtitle: Role & Department */}
                  <p className="font-sans text-xs truncate text-(--text-muted)">
                    {convSub(active, myId)}
                    {active.type === 'DIRECT' && otherUser && (
                      <span className="ml-1.5 font-mono text-[10px]">
                        {onlineUsers.has(otherUser.userId) ? (
                          <span className="text-emerald-500 font-semibold">· online</span>
                        ) : (
                          <span className="text-(--text-faint)">· offline</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>

                {/* Info drawer toggle */}
                <button
                  onClick={() => setShowInfo(v => !v)}
                  className="p-2 rounded-xl hover:bg-(--hover-overlay) transition-colors"
                  style={{ color: showInfo ? GOLD : 'var(--text-faint)' }}
                  title="Conversation Details"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto py-3">
                {hasMore && (
                  <button
                    onClick={() => loadMsgs(active.id, cursor)}
                    disabled={loadingMsgs}
                    className="block mx-auto mb-3 px-3 py-1 rounded-full font-mono text-[10px] bg-(--bg-card) border border-(--border-subtle) text-(--text-faint) hover:text-(--text-primary)"
                  >
                    {loadingMsgs ? 'Loading…' : '↑ Load earlier messages'}
                  </button>
                )}

                {messages.map((msg, idx) => {
                  const prev   = messages[idx - 1];
                  const newDay = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                  const showNm = !!isGroup && msg.senderId !== myId && (!prev || prev.senderId !== msg.senderId || newDay);

                  return (
                    <React.Fragment key={msg.id}>
                      {newDay && (
                        <div className="flex items-center gap-3 my-3 px-4">
                          <div className="flex-1 h-px bg-(--border-subtle)" />
                          <span
                            className="font-mono text-[9px] px-2.5 py-0.5 rounded-full shrink-0 bg-(--bg-card) border border-(--border-subtle) text-(--text-faint)"
                          >
                            {dateLabel(msg.createdAt)}
                          </span>
                          <div className="flex-1 h-px bg-(--border-subtle)" />
                        </div>
                      )}
                      <Bubble
                        msg={msg}
                        isMine={msg.senderId === myId}
                        showName={showNm}
                        onCtx={openCtx}
                      />
                    </React.Fragment>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Reply or Edit Banner */}
              <AnimatePresence>
                {(replyTo || editingMsg) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 py-2 shrink-0 flex items-center gap-3 border-t border-(--border-default)"
                    style={{ background: `${GOLD}0e` }}
                  >
                    <div className="flex-1 min-w-0 pl-2.5 border-l-2" style={{ borderColor: GOLD }}>
                      <p className="font-mono text-[10px] font-semibold" style={{ color: GOLD }}>
                        {editingMsg ? 'Editing message' : `Replying to ${replyTo?.sender.fullName}`}
                      </p>
                      <p className="font-sans text-xs truncate text-(--text-muted)">
                        {editingMsg?.content ?? replyTo?.content}
                      </p>
                    </div>
                    <button
                      onClick={() => { setReplyTo(null); setEditingMsg(null); setInput(''); }}
                      className="p-1.5 rounded-full hover:bg-(--hover-overlay) text-(--text-faint)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Input Area */}
              <div
                className="px-3 py-2.5 shrink-0"
                style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}
              >
                {/* Input row: [Textarea] [Send] */}
                <div className="flex items-end gap-1.5">
                  {/* Auto-growing Textarea */}
                  <div
                    className="flex-1 flex items-end rounded-2xl border transition-colors"
                    style={{
                      background: 'var(--bg-input, rgba(255,255,255,0.05))',
                      borderColor: 'var(--border-default)',
                    }}
                  >
                    <textarea
                      ref={inputRef}
                      id={`msg-${uid}`}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={editingMsg ? 'Edit message… (Enter to save)' : 'Type a message… (Enter to send)'}
                      rows={1}
                      className="flex-1 resize-none px-3.5 py-2.5 text-sm font-sans bg-transparent border-none focus:outline-none"
                      style={{
                        color: 'var(--text-primary)',
                        maxHeight: '120px',
                        overflowY: 'auto',
                      }}
                      onInput={e => {
                        const t = e.target as HTMLTextAreaElement;
                        t.style.height = 'auto';
                        t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                      }}
                    />
                  </div>

                  {/* Send button — rightmost */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="p-2.5 rounded-xl shrink-0 transition-all"
                    style={{
                      background: input.trim() ? SENT_BG : 'var(--bg-input, rgba(255,255,255,0.05))',
                      border: `1px solid ${input.trim() ? 'rgba(30,45,69,0.6)' : 'var(--border-default)'}`,
                      color: input.trim() ? GOLD : 'var(--text-faint)',
                      boxShadow: input.trim() ? '0 2px 8px rgba(30,45,69,0.4)' : 'none',
                    }}
                    title="Send message (Enter)"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT INFO DRAWER ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {showInfo && active && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 270, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="shrink-0 overflow-hidden hidden lg:block"
              style={{ borderLeft: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}
            >
              <div className="w-[270px] h-full flex flex-col">
                <div
                  className="flex items-center justify-between px-4 py-3 shrink-0"
                  style={{ borderBottom: '1px solid var(--border-default)' }}
                >
                  <span className="font-serif text-sm font-bold text-(--text-primary)">
                    {active.type === 'DIRECT' ? 'Staff Details' : 'Group Details'}
                  </span>
                  <button
                    onClick={() => setShowInfo(false)}
                    className="p-1 rounded-lg hover:bg-(--hover-overlay) text-(--text-faint)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-5">
                  <div className="flex flex-col items-center text-center mb-5">
                    {active.type === 'DIRECT' && otherUser ? (
                      <Avatar
                        name={otherUser.fullName}
                        role={otherUser.role}
                        size={64}
                        online={onlineUsers.has(otherUser.userId)}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: GOLD_BG, border: `2px solid ${GOLD_BORDER}` }}
                      >
                        {active.type === 'DEPARTMENT' ? <Building2 className="w-7 h-7 text-(--brand-gold)" />
                         : active.type === 'OFFICIAL'   ? <Megaphone className="w-7 h-7 text-(--brand-gold)" />
                         : <Users className="w-7 h-7 text-(--brand-gold)" />}
                      </div>
                    )}

                    <p className="font-serif text-base font-bold mt-3 text-(--text-primary)">
                      {convName(active, myId)}
                    </p>

                    {active.type === 'DIRECT' && otherUser && (
                      <div className="mt-1 space-y-1">
                        <span
                          className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block"
                          style={{
                            background: `${ROLE_COLOR[otherUser.role] ?? GOLD}18`,
                            color: ROLE_COLOR[otherUser.role] ?? GOLD,
                          }}
                        >
                          {ROLE_LABEL[otherUser.role] ?? otherUser.role}
                        </span>
                        {otherUser.department && (
                          <p className="font-sans text-xs text-(--text-muted)">
                            {otherUser.department}
                          </p>
                        )}
                        {otherUser.email && (
                          <p className="font-mono text-[10px] text-(--text-faint)">
                            {otherUser.email}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {active.description && (
                    <div className="mb-4">
                      <p className="font-mono text-[9px] uppercase tracking-wider mb-1 text-(--text-faint)">
                        About
                      </p>
                      <p className="font-sans text-xs leading-relaxed text-(--text-muted)">
                        {active.description}
                      </p>
                    </div>
                  )}

                  {/* Group Members */}
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-2.5 text-(--text-faint)">
                      Participants · {active.participants.length}
                    </p>
                    <div className="space-y-2">
                      {active.participants.map(p => {
                        const on = onlineUsers.has(p.userId);
                        return (
                          <div key={p.userId} className="flex items-center gap-2.5">
                            <Avatar name={p.fullName} role={p.role} size={30} online={on} />
                            <div className="flex-1 min-w-0">
                              <p className="font-sans text-xs font-semibold truncate text-(--text-primary)">
                                {p.fullName}
                                {p.userId === myId && <span className="font-normal text-(--text-faint)"> (you)</span>}
                              </p>
                              <p className="font-mono text-[9px] text-(--text-faint) truncate">
                                {ROLE_LABEL[p.role] ?? p.role}
                              </p>
                            </div>
                            {p.participantRole === 'ADMIN' && (
                              <span
                                className="font-mono text-[8px] px-1.5 py-0.5 rounded font-semibold"
                                style={{ background: GOLD_BG, color: GOLD }}
                              >
                                admin
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}