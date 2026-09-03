'use client';

/**
 * MessagingView — Internal Messaging System
 * Full-featured staff-only messaging UI per message.md specification.
 *
 * Layout:
 *   Left panel  (320px)  — conversation list with search, filters, pin/archive
 *   Center panel (flex-1) — message thread with reply, edit, delete, attachments
 *   Right panel  (240px)  — conversation info, participants (collapsible)
 *
 * Security note: students cannot access this component — every API call
 * they make returns 403. The backend enforces the restriction independently.
 */

import React, {
  useState, useEffect, useRef, useCallback, useId,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Send, Plus, Search, X, ChevronLeft, Users,
  Loader2, Circle, Pin, Archive, BellOff, MoreHorizontal,
  Paperclip, Reply, Pencil, Trash2, AlertCircle, Check,
  CheckCheck, Info, ChevronRight, Building2, Megaphone,
  ArchiveRestore, Bell, Download,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import {
  messagingApi,
  type MsgConversation, type MsgMessage, type MsgEmployee,
  type ConversationType,
} from '../../lib/messagingApi';

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function timeAgo(dateStr: string): string {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)      return 'now';
  if (diff < 3600)    return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800)  return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fullTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:    'Super Admin',
  ADMIN:          'Admin',
  REGISTRAR:      'Registrar',
  FINANCE_OFFICER:'Finance Officer',
  HR_OFFICER:     'HR Officer',
  DEPARTMENT_HEAD:'Dept. Head',
  INSTRUCTOR:     'Instructor',
};

const TYPE_ICON: Record<ConversationType, React.ReactNode> = {
  DIRECT:     <Circle     className="w-3 h-3" />,
  GROUP:      <Users      className="w-3 h-3" />,
  DEPARTMENT: <Building2  className="w-3 h-3" />,
  OFFICIAL:   <Megaphone  className="w-3 h-3" />,
};

const PRIORITY_COLOR: Record<string, string> = {
  NORMAL:    'var(--text-faint)',
  IMPORTANT: 'var(--status-warning, #f59e0b)',
  URGENT:    'var(--status-danger, #ef4444)',
};

function convDisplayName(conv: MsgConversation, myId: string): string {
  if (conv.type !== 'DIRECT') return conv.name ?? 'Group';
  const other = conv.participants.find(p => p.userId !== myId);
  return other?.fullName ?? 'Unknown';
}

function convSubtitle(conv: MsgConversation, myId: string): string {
  if (conv.type === 'DIRECT') {
    const other = conv.participants.find(p => p.userId !== myId);
    return ROLE_LABEL[other?.role ?? ''] ?? other?.role ?? '';
  }
  if (conv.type === 'DEPARTMENT') return `Department · ${conv.participants.length} members`;
  return `${conv.participants.length} members`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  if (status === 'READ')      return <CheckCheck className="w-3 h-3" style={{ color: '#34d399' }} />;
  if (status === 'DELIVERED') return <CheckCheck className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />;
  if (status === 'SENT')      return <Check      className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />;
  if (status === 'FAILED')    return <AlertCircle className="w-3 h-3" style={{ color: 'var(--status-danger)' }} />;
  return null;
}

function FileSize({ bytes }: { bytes: number }) {
  if (bytes < 1024)       return <>{bytes} B</>;
  if (bytes < 1048576)    return <>{(bytes / 1024).toFixed(1)} KB</>;
  return <>{(bytes / 1048576).toFixed(1)} MB</>;
}

interface BubbleProps {
  msg:       MsgMessage;
  isMine:    boolean;
  onReply:   (m: MsgMessage) => void;
  onEdit:    (m: MsgMessage) => void;
  onDelete:  (m: MsgMessage) => void;
}

function Bubble({ msg, isMine, onReply, onEdit, onDelete }: BubbleProps) {
  const [hover, setHover] = useState(false);
  const canEdit   = isMine && !msg.isDeleted && !!msg.editedAt === false;
  const canDelete = isMine && !msg.isDeleted;

  return (
    <div
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2 group`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`max-w-[68%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Reply preview */}
        {msg.replyTo && !msg.replyTo.isDeleted && (
          <div
            className="mb-1 px-3 py-1.5 rounded-xl border-l-2 max-w-full"
            style={{
              borderColor: '#E9C349',
              background:  'rgba(233,195,73,0.07)',
              borderLeftWidth: '3px',
            }}
          >
            <p className="font-mono text-[9px] mb-0.5" style={{ color: '#E9C349' }}>
              {msg.replyTo.sender.fullName}
            </p>
            <p className="font-sans text-xs truncate" style={{ color: 'var(--text-secondary)', maxWidth: '240px' }}>
              {msg.replyTo.content}
            </p>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          {/* Action buttons — shown on hover for received messages */}
          {!isMine && hover && (
            <div className="flex items-center gap-0.5 mb-1">
              <button
                onClick={() => onReply(msg)}
                className="p-1 rounded-lg hover:bg-(--hover-overlay) transition-colors"
                title="Reply"
              >
                <Reply className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
              </button>
            </div>
          )}

          {/* Bubble */}
          <div
            className="px-4 py-2.5 rounded-2xl text-sm font-sans leading-relaxed"
            style={
              isMine
                ? { background: '#E9C349', color: '#0F0F10', borderBottomRightRadius: '4px' }
                : {
                    background:  'var(--bg-glass)',
                    border:      '1px solid var(--border-default)',
                    color:       'var(--text-primary)',
                    borderBottomLeftRadius: '4px',
                  }
            }
          >
            {/* Sender name for group conversations */}
            {!isMine && (
              <p className="font-mono text-[9px] mb-0.5" style={{ color: isMine ? 'rgba(15,15,16,0.5)' : 'var(--text-muted)' }}>
                {msg.sender.fullName}
              </p>
            )}

            {/* Content */}
            {msg.isDeleted ? (
              <p className="italic text-xs" style={{ opacity: 0.5 }}>Message deleted</p>
            ) : (
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            )}

            {/* Attachments */}
            {msg.attachments?.length > 0 && msg.attachments.map(att => (
              <a
                key={att.id}
                href={messagingApi.attachmentUrl(att.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg"
                style={{
                  background: isMine ? 'rgba(0,0,0,0.12)' : 'var(--hover-overlay)',
                  color:      isMine ? '#0F0F10' : 'var(--text-primary)',
                  textDecoration: 'none',
                }}
              >
                <Paperclip className="w-3 h-3 shrink-0" />
                <span className="font-mono text-[10px] truncate max-w-[160px]">
                  {att.originalFileName}
                </span>
                <span className="font-mono text-[9px] opacity-60 shrink-0">
                  <FileSize bytes={att.fileSize} />
                </span>
                <Download className="w-3 h-3 shrink-0 opacity-60" />
              </a>
            ))}

            {/* Footer */}
            <div className="flex items-center gap-1 mt-0.5 justify-end">
              {msg.editedAt && !msg.isDeleted && (
                <span className="font-mono text-[8px]" style={{ opacity: 0.5 }}>edited</span>
              )}
              <span className="font-mono text-[9px]"
                style={{ color: isMine ? 'rgba(15,15,16,0.45)' : 'var(--text-faint)' }}>
                {timeAgo(msg.createdAt)}
              </span>
              {isMine && <StatusIcon status={msg.status} />}
            </div>
          </div>

          {/* Action buttons — shown on hover for sent messages */}
          {isMine && hover && !msg.isDeleted && (
            <div className="flex items-center gap-0.5 mb-1">
              <button onClick={() => onReply(msg)} className="p-1 rounded-lg hover:bg-(--hover-overlay)" title="Reply">
                <Reply className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
              </button>
              {canEdit && (
                <button onClick={() => onEdit(msg)} className="p-1 rounded-lg hover:bg-(--hover-overlay)" title="Edit">
                  <Pencil className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(msg)} className="p-1 rounded-lg hover:bg-(--hover-overlay)" title="Delete">
                  <Trash2 className="w-3 h-3" style={{ color: 'var(--status-danger)' }} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Conversation Modal ────────────────────────────────────────────────────

interface NewConvModalProps {
  myId:    string;
  onClose: () => void;
  onCreate: (conv: MsgConversation) => void;
}

function NewConvModal({ myId, onClose, onCreate }: NewConvModalProps) {
  const [convType, setConvType]         = useState<ConversationType>('DIRECT');
  const [name, setName]                 = useState('');
  const [description, setDescription]  = useState('');
  const [priority, setPriority]         = useState<'NORMAL'|'IMPORTANT'|'URGENT'>('NORMAL');
  const [requiresAck, setRequiresAck]   = useState(false);
  const [searchQ, setSearchQ]           = useState('');
  const [employees, setEmployees]       = useState<MsgEmployee[]>([]);
  const [selected, setSelected]         = useState<MsgEmployee[]>([]);
  const [loading, setLoading]           = useState(false);
  const [creating, setCreating]         = useState(false);
  const [error, setError]               = useState('');
  const searchTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (searchQ.trim().length < 1) { setEmployees([]); return; }
      setLoading(true);
      try {
        const res = await messagingApi.searchEmployees(searchQ);
        setEmployees(res.filter(e => e.id !== myId && !selected.find(s => s.id === e.id)));
      } catch { setEmployees([]); }
      setLoading(false);
    }, 250);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQ, myId, selected]);

  const toggle = (emp: MsgEmployee) => {
    if (convType === 'DIRECT') {
      setSelected([emp]);
    } else {
      setSelected(prev =>
        prev.find(s => s.id === emp.id)
          ? prev.filter(s => s.id !== emp.id)
          : [...prev, emp]
      );
    }
    setSearchQ('');
    setEmployees([]);
  };

  const handleCreate = async () => {
    if (selected.length === 0) { setError('Select at least one recipient.'); return; }
    if ((convType === 'GROUP' || convType === 'OFFICIAL') && !name.trim()) {
      setError('Group name is required.'); return;
    }
    setCreating(true); setError('');
    try {
      const conv = await messagingApi.createConversation({
        type:           convType,
        name:           name.trim() || undefined,
        description:    description.trim() || undefined,
        participantIds: selected.map(s => s.id),
        priority,
        requiresAck,
      });
      onCreate(conv);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create conversation.');
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-default)' }}>
          <span className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            New Conversation
          </span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-(--hover-overlay)">
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {(['DIRECT','GROUP','DEPARTMENT','OFFICIAL'] as ConversationType[]).map(t => (
              <button
                key={t}
                onClick={() => { setConvType(t); setSelected([]); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-sans font-medium transition-all"
                style={{
                  background:   convType === t ? 'rgba(233,195,73,0.12)' : 'var(--bg-input)',
                  borderColor:  convType === t ? '#E9C349' : 'var(--border-default)',
                  color:        convType === t ? '#E9C349' : 'var(--text-secondary)',
                }}
              >
                {TYPE_ICON[t]}
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Name (group/official) */}
          {(convType === 'GROUP' || convType === 'OFFICIAL') && (
            <input
              type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Conversation name *"
              className="w-full px-4 py-2.5 rounded-xl text-sm font-sans bg-(--bg-input) border border-(--border-default) focus:border-(--brand-gold) focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          )}

          {/* Description */}
          {(convType === 'GROUP' || convType === 'OFFICIAL' || convType === 'DEPARTMENT') && (
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-sans bg-(--bg-input) border border-(--border-default) focus:border-(--brand-gold) focus:outline-none resize-none"
              style={{ color: 'var(--text-primary)' }}
            />
          )}

          {/* Priority & Ack (official) */}
          {convType === 'OFFICIAL' && (
            <div className="flex gap-3">
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as typeof priority)}
                className="flex-1 px-3 py-2 rounded-xl text-sm font-sans bg-(--bg-input) border border-(--border-default) focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              >
                <option value="NORMAL">Normal</option>
                <option value="IMPORTANT">Important</option>
                <option value="URGENT">Urgent</option>
              </select>
              <label className="flex items-center gap-2 text-xs font-sans cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={requiresAck}
                  onChange={e => setRequiresAck(e.target.checked)}
                  className="rounded accent-[#E9C349]"
                />
                Requires acknowledgment
              </label>
            </div>
          )}

          {/* Recipient search */}
          {convType !== 'DEPARTMENT' && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'var(--text-faint)' }} />
                <input
                  type="text" value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder={convType === 'DIRECT' ? 'Search staff member…' : 'Add members…'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-sans bg-(--bg-input) border border-(--border-default) focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin"
                    style={{ color: 'var(--text-faint)' }} />
                )}
              </div>
              {employees.length > 0 && (
                <div className="rounded-xl border overflow-hidden"
                  style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}>
                  {employees.slice(0, 8).map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => toggle(emp)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-(--hover-overlay) text-left border-b last:border-b-0 transition-colors"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-serif font-bold text-xs shrink-0"
                        style={{ background: 'rgba(233,195,73,0.12)', color: '#E9C349' }}>
                        {emp.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {emp.fullName}
                        </p>
                        <p className="font-mono text-[9px]" style={{ color: 'var(--text-faint)' }}>
                          {ROLE_LABEL[emp.role] ?? emp.role}
                          {emp.department ? ` · ${emp.department}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Selected members */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(s => (
                <span
                  key={s.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium"
                  style={{ background: 'rgba(233,195,73,0.15)', color: '#E9C349', border: '1px solid rgba(233,195,73,0.3)' }}
                >
                  {s.fullName}
                  <button onClick={() => setSelected(p => p.filter(x => x.id !== s.id))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs font-sans px-1" style={{ color: 'var(--status-danger)' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0 flex gap-3"
          style={{ borderTop: '1px solid var(--border-default)' }}>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-sans font-medium border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={creating || selected.length === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-sans font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: selected.length > 0 ? '#E9C349' : 'rgba(233,195,73,0.2)',
              color:      selected.length > 0 ? '#0F0F10' : 'rgba(233,195,73,0.4)',
            }}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main MessagingView ────────────────────────────────────────────────────────

export function MessagingView() {
  const { connected, onlineUsers, onNewMessage, joinConversation, leaveConversation, markRead } = useSocket();

  // ── State ────────────────────────────────────────────────────────────────
  const [myId,          setMyId]          = useState('');
  const [conversations, setConversations] = useState<MsgConversation[]>([]);
  const [active,        setActive]        = useState<MsgConversation | null>(null);
  const [messages,      setMessages]      = useState<MsgMessage[]>([]);
  const [loadingConvs,  setLoadingConvs]  = useState(true);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [cursor,        setCursor]        = useState<string | undefined>();
  const [hasMore,       setHasMore]       = useState(false);
  const [input,         setInput]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [showNew,       setShowNew]       = useState(false);
  const [searchConv,    setSearchConv]    = useState('');
  const [typingUsers,   setTypingUsers]   = useState<Record<string, string>>({});
  const [showInfo,      setShowInfo]      = useState(false);
  const [showArchived,  setShowArchived]  = useState(false);
  const [editingMsg,    setEditingMsg]    = useState<MsgMessage | null>(null);
  const [replyTo,       setReplyTo]       = useState<MsgMessage | null>(null);
  const [filterType,    setFilterType]    = useState<ConversationType | 'ALL'>('ALL');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [convMenuId,    setConvMenuId]    = useState<string | null>(null);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLTextAreaElement>(null);
  const typingTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const id            = useId();

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.userId) setMyId(d.userId); })
      .catch(() => {});
  }, []);

  const loadConversations = useCallback(async (archived = false) => {
    setLoadingConvs(true);
    try {
      const convos = await messagingApi.listConversations(archived);
      setConversations(convos);
    } catch { /* silently fail */ }
    setLoadingConvs(false);
  }, []);

  useEffect(() => { loadConversations(showArchived); }, [loadConversations, showArchived]);

  const loadMessages = useCallback(async (convId: string, cur?: string) => {
    setLoadingMsgs(true);
    try {
      const msgs = await messagingApi.listMessages(convId, cur);
      if (cur) setMessages(p => [...msgs, ...p]);
      else     setMessages(msgs);
      setHasMore(msgs.length === 30);
      if (msgs.length > 0) setCursor(msgs[0].id);
    } catch { /* ignore */ }
    setLoadingMsgs(false);
  }, []);

  const openConv = useCallback(async (conv: MsgConversation) => {
    if (active?.id === conv.id) return;
    if (active) leaveConversation(active.id);
    setActive(conv);
    setMessages([]);
    setCursor(undefined);
    setHasMore(false);
    setReplyTo(null);
    setEditingMsg(null);
    setInput('');
    joinConversation(conv.id);
    markRead(conv.id);
    await loadMessages(conv.id);
    // Clear unread in local state
    setConversations(p => p.map(c => c.id === conv.id ? { ...c, unreadCount: 0, lastReadAt: new Date().toISOString() } : c));
  }, [active, leaveConversation, joinConversation, markRead, loadMessages]);

  // ── Socket subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    const off = onNewMessage(msg => {
      if (active?.id === msg.conversationId) {
        setMessages(p => [...p, msg as unknown as MsgMessage]);
        markRead(msg.conversationId);
        messagingApi.markRead(msg.conversationId).catch(() => {});
      } else {
        setConversations(p => p.map(c =>
          c.id === msg.conversationId
            ? {
                ...c,
                unreadCount: (c.unreadCount ?? 0) + 1,
                lastMessage: {
                  id:        msg.id,
                  content:   msg.content,
                  senderId:  msg.senderId,
                  senderName: (msg.sender as { fullName?: string }).fullName ?? '',
                  createdAt: msg.createdAt,
                  isDeleted: false,
                },
                lastMessageAt: msg.createdAt,
              }
            : c
        ));
      }
    });
    return off;
  }, [onNewMessage, active, markRead]);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadingMsgs) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, loadingMsgs]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!active || (!input.trim() && !editingMsg)) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    if (editingMsg) {
      // Edit mode
      setSending(true);
      try {
        const updated = await messagingApi.editMessage(editingMsg.id, trimmed);
        setMessages(p => p.map(m => m.id === editingMsg.id ? updated : m));
      } catch (e) {
        console.error('Edit failed', e);
      }
      setEditingMsg(null);
      setInput('');
      setSending(false);
      return;
    }

    setSending(true);
    setInput('');
    setReplyTo(null);
    if (typingTimer.current) clearTimeout(typingTimer.current);

    try {
      await messagingApi.sendMessage(active.id, {
        content:   trimmed,
        replyToId: replyTo?.id,
      });
      // Message will arrive via socket, but also reload to ensure consistency
    } catch (e) {
      console.error('Send failed', e);
      setInput(trimmed); // restore on failure
    }
    setSending(false);
  }, [active, input, editingMsg, replyTo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (!active) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {}, 2000);
  };

  // ── Edit / Delete / Reply ─────────────────────────────────────────────────
  const startEdit = (msg: MsgMessage) => {
    setEditingMsg(msg);
    setInput(msg.content);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const startReply = (msg: MsgMessage) => {
    setReplyTo(msg);
    setEditingMsg(null);
    inputRef.current?.focus();
  };

  const handleDelete = async (msg: MsgMessage) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await messagingApi.deleteMessage(msg.id);
      setMessages(p => p.map(m =>
        m.id === msg.id ? { ...m, isDeleted: true, content: '' } : m
      ));
    } catch (e) { console.error('Delete failed', e); }
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!active) return;
    setUploadingFile(true);
    try {
      await messagingApi.uploadAttachment(active.id, file);
      // New message will arrive via socket
    } catch (e) { console.error('Upload failed', e); }
    setUploadingFile(false);
  };

  // ── Conversation prefs ────────────────────────────────────────────────────
  const togglePin = async (conv: MsgConversation) => {
    try {
      await messagingApi.updatePrefs(conv.id, { isPinned: !conv.isPinned });
      setConversations(p => p.map(c => c.id === conv.id ? { ...c, isPinned: !c.isPinned } : c));
    } catch { /**/ }
    setConvMenuId(null);
  };

  const toggleArchive = async (conv: MsgConversation) => {
    try {
      await messagingApi.updatePrefs(conv.id, { isArchived: !conv.isArchived });
      setConversations(p => p.filter(c => !(c.id === conv.id && !conv.isArchived)));
      if (active?.id === conv.id) { setActive(null); setMessages([]); }
    } catch { /**/ }
    setConvMenuId(null);
  };

  const toggleMute = async (conv: MsgConversation) => {
    try {
      await messagingApi.updatePrefs(conv.id, { isMuted: !conv.isMuted });
      setConversations(p => p.map(c => c.id === conv.id ? { ...c, isMuted: !c.isMuted } : c));
    } catch { /**/ }
    setConvMenuId(null);
  };

  // ── Filtered conversation list ────────────────────────────────────────────
  const filteredConvs = conversations.filter(c => {
    if (filterType !== 'ALL' && c.type !== filterType) return false;
    if (!searchConv.trim()) return true;
    const name   = convDisplayName(c, myId).toLowerCase();
    const search = searchConv.toLowerCase();
    return name.includes(search) ||
      c.lastMessage?.content.toLowerCase().includes(search) ||
      c.participants.some(p => p.fullName.toLowerCase().includes(search));
  });

  const totalUnread = conversations.reduce((a, c) => a + (c.unreadCount ?? 0), 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* New Conversation Modal */}
      <AnimatePresence>
        {showNew && (
          <NewConvModal
            myId={myId}
            onClose={() => setShowNew(false)}
            onCreate={async conv => {
              setShowNew(false);
              await loadConversations(showArchived);
              await openConv(conv);
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}
      >
        {/* ── LEFT: Conversation List ─────────────────────────────────── */}
        <div
          className="w-80 shrink-0 flex flex-col"
          style={{ borderRight: '1px solid var(--border-default)' }}
        >
          {/* Header */}
          <div className="px-4 py-3.5 shrink-0"
            style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: '#E9C349' }} />
                <span className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Messages
                </span>
                {totalUnread > 0 && (
                  <span className="h-5 min-w-[20px] rounded-full flex items-center justify-center font-mono text-[9px] font-bold text-[#0F0F10]"
                    style={{ background: '#E9C349', paddingInline: '4px' }}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
                {!connected && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border"
                    style={{ color: 'var(--status-warning)', borderColor: 'var(--status-warning)' }}>
                    offline
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowArchived(v => !v)}
                  className="p-1.5 rounded-lg hover:bg-(--hover-overlay) transition-colors"
                  title={showArchived ? 'Show active' : 'Show archived'}
                >
                  {showArchived
                    ? <ArchiveRestore className="w-3.5 h-3.5" style={{ color: '#E9C349' }} />
                    : <Archive        className="w-3.5 h-3.5" style={{ color: 'var(--text-faint)' }} />
                  }
                </button>
                <button
                  onClick={() => setShowNew(true)}
                  className="p-1.5 rounded-lg hover:bg-(--hover-overlay) transition-colors"
                  title="New conversation"
                >
                  <Plus className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: 'var(--text-faint)' }} />
              <input
                type="text" value={searchConv}
                onChange={e => setSearchConv(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-sans bg-(--bg-input) border border-(--border-default) focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>

            {/* Type filter */}
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {(['ALL','DIRECT','GROUP','DEPARTMENT','OFFICIAL'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold transition-all"
                  style={{
                    background:  filterType === t ? 'rgba(233,195,73,0.15)' : 'transparent',
                    color:       filterType === t ? '#E9C349' : 'var(--text-faint)',
                    border:      `1px solid ${filterType === t ? 'rgba(233,195,73,0.4)' : 'transparent'}`,
                  }}
                >
                  {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-faint)' }} />
              </div>
            )}
            {!loadingConvs && filteredConvs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center py-12">
                <MessageSquare className="w-10 h-10" style={{ color: 'var(--text-faint)' }} />
                <p className="font-sans text-xs" style={{ color: 'var(--text-muted)' }}>
                  {searchConv ? 'No conversations match your search.' : showArchived ? 'No archived conversations.' : 'No conversations yet.'}
                </p>
                {!searchConv && !showArchived && (
                  <button onClick={() => setShowNew(true)}
                    className="font-sans text-xs hover:underline" style={{ color: '#E9C349' }}>
                    Start a conversation
                  </button>
                )}
              </div>
            )}

            {filteredConvs.map(conv => {
              const isActive   = active?.id === conv.id;
              const name       = convDisplayName(conv, myId);
              const other      = conv.type === 'DIRECT' ? conv.participants.find(p => p.userId !== myId) : null;
              const isOnline   = other ? onlineUsers.has(other.userId) : false;
              const hasUnread  = (conv.unreadCount ?? 0) > 0;
              const menuOpen   = convMenuId === conv.id;

              return (
                <div key={conv.id} className="relative">
                  <button
                    onClick={() => openConv(conv)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      background:   isActive ? 'rgba(233,195,73,0.08)' : 'transparent',
                      borderLeft:   `2px solid ${isActive ? '#E9C349' : 'transparent'}`,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--hover-overlay)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-sm"
                        style={{ background: 'rgba(233,195,73,0.12)', color: '#E9C349' }}>
                        {conv.type === 'DIRECT'
                          ? name.charAt(0).toUpperCase()
                          : TYPE_ICON[conv.type]
                        }
                      </div>
                      {conv.type === 'DIRECT' && (
                        <Circle className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5"
                          style={{ color: isOnline ? '#34d399' : 'var(--text-faint)', fill: isOnline ? '#34d399' : 'var(--text-faint)' }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          {conv.isPinned && <Pin className="w-2.5 h-2.5 shrink-0" style={{ color: '#E9C349' }} />}
                          {conv.isMuted  && <BellOff className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--text-faint)' }} />}
                          <p className="font-sans text-xs truncate"
                            style={{ color: 'var(--text-primary)', fontWeight: hasUnread ? 700 : 500 }}>
                            {name}
                          </p>
                          {conv.priority !== 'NORMAL' && (
                            <AlertCircle className="w-2.5 h-2.5 shrink-0"
                              style={{ color: PRIORITY_COLOR[conv.priority] }} />
                          )}
                        </div>
                        <span className="font-mono text-[9px] shrink-0" style={{ color: 'var(--text-faint)' }}>
                          {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="font-sans text-[11px] truncate"
                          style={{ color: hasUnread ? 'var(--text-secondary)' : 'var(--text-faint)' }}>
                          {conv.lastMessage?.isDeleted
                            ? 'Message deleted'
                            : conv.lastMessage?.content ?? 'No messages yet'}
                        </p>
                        {hasUnread && (
                          <span className="shrink-0 min-w-[16px] h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-bold text-[#0F0F10]"
                            style={{ background: '#E9C349', paddingInline: '3px' }}>
                            {conv.unreadCount! > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Context menu button */}
                  <button
                    onClick={e => { e.stopPropagation(); setConvMenuId(menuOpen ? null : conv.id); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-(--hover-overlay) transition-all"
                    style={{ opacity: isActive || menuOpen ? 1 : undefined }}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--text-faint)' }} />
                  </button>

                  {/* Context menu */}
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setConvMenuId(null)} />
                      <div className="absolute right-2 top-full mt-1 z-30 rounded-xl overflow-hidden shadow-xl"
                        style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', minWidth: '160px' }}>
                        <button onClick={() => togglePin(conv)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-(--hover-overlay) text-left transition-colors">
                          <Pin className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                          <span className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {conv.isPinned ? 'Unpin' : 'Pin'}
                          </span>
                        </button>
                        <button onClick={() => toggleMute(conv)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-(--hover-overlay) text-left transition-colors">
                          {conv.isMuted
                            ? <Bell    className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                            : <BellOff className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                          }
                          <span className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {conv.isMuted ? 'Unmute' : 'Mute'}
                          </span>
                        </button>
                        <button onClick={() => toggleArchive(conv)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-(--hover-overlay) text-left transition-colors">
                          <Archive className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                          <span className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {conv.isArchived ? 'Unarchive' : 'Archive'}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CENTER: Message Thread ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!active ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(233,195,73,0.08)', border: '1px solid rgba(233,195,73,0.2)' }}>
                <MessageSquare className="w-7 h-7" style={{ color: 'rgba(233,195,73,0.5)' }} />
              </div>
              <div>
                <p className="font-serif text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
                  Internal Messages
                </p>
                <p className="font-sans text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Select a conversation or start a new one
                </p>
              </div>
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-sans text-sm font-medium transition-colors"
                style={{ background: 'rgba(233,195,73,0.1)', border: '1px solid rgba(233,195,73,0.3)', color: '#E9C349' }}>
                <Plus className="w-4 h-4" /> New Message
              </button>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="flex items-center gap-3 px-5 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--border-default)' }}>
                <button
                  onClick={() => { leaveConversation(active.id); setActive(null); setMessages([]); }}
                  className="p-1.5 rounded-full transition-colors md:hidden"
                  style={{ color: 'var(--text-muted)' }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-sm shrink-0"
                  style={{ background: 'rgba(233,195,73,0.12)', color: '#E9C349' }}>
                  {active.type === 'DIRECT'
                    ? convDisplayName(active, myId).charAt(0).toUpperCase()
                    : TYPE_ICON[active.type]
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-sans text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {convDisplayName(active, myId)}
                    </p>
                    {active.priority !== 'NORMAL' && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        style={{
                          background: PRIORITY_COLOR[active.priority] + '20',
                          color:      PRIORITY_COLOR[active.priority],
                        }}>
                        {active.priority}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    {Object.keys(typingUsers).length > 0
                      ? `${Object.values(typingUsers)[0]} is typing…`
                      : convSubtitle(active, myId)
                    }
                  </p>
                </div>
                <button
                  onClick={() => setShowInfo(v => !v)}
                  className="p-2 rounded-xl hover:bg-(--hover-overlay) transition-colors"
                  style={{ color: showInfo ? '#E9C349' : 'var(--text-faint)' }}>
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {hasMore && (
                  <button
                    onClick={() => loadMessages(active.id, cursor)}
                    disabled={loadingMsgs}
                    className="w-full text-center font-mono text-[10px] py-2 mb-3 transition-colors"
                    style={{ color: 'var(--text-faint)' }}>
                    {loadingMsgs ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : '↑ Load earlier messages'}
                  </button>
                )}

                {messages.map((msg, idx) => {
                  const prev       = messages[idx - 1];
                  const showDate   = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                          <span className="font-mono text-[9px] px-2 shrink-0" style={{ color: 'var(--text-faint)' }}>
                            {new Date(msg.createdAt).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                        </div>
                      )}
                      <Bubble
                        msg={msg}
                        isMine={msg.senderId === myId}
                        onReply={startReply}
                        onEdit={startEdit}
                        onDelete={handleDelete}
                      />
                    </React.Fragment>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Reply / Edit preview bar */}
              <AnimatePresence>
                {(replyTo || editingMsg) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-5 py-2.5 shrink-0 flex items-center gap-3"
                    style={{ borderTop: '1px solid var(--border-default)', background: 'rgba(233,195,73,0.04)' }}
                  >
                    {editingMsg ? (
                      <>
                        <Pencil className="w-3.5 h-3.5 shrink-0" style={{ color: '#E9C349' }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-[9px] font-semibold" style={{ color: '#E9C349' }}>Editing message</p>
                          <p className="font-sans text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {editingMsg.content}
                          </p>
                        </div>
                      </>
                    ) : replyTo ? (
                      <>
                        <Reply className="w-3.5 h-3.5 shrink-0" style={{ color: '#E9C349' }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-[9px] font-semibold" style={{ color: '#E9C349' }}>
                            Replying to {replyTo.sender.fullName}
                          </p>
                          <p className="font-sans text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {replyTo.content}
                          </p>
                        </div>
                      </>
                    ) : null}
                    <button
                      onClick={() => { setReplyTo(null); setEditingMsg(null); setInput(''); }}
                      className="shrink-0 p-1 rounded-lg hover:bg-(--hover-overlay)">
                      <X className="w-3.5 h-3.5" style={{ color: 'var(--text-faint)' }} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="px-4 py-3 shrink-0"
                style={{ borderTop: '1px solid var(--border-default)' }}>
                <div className="flex items-end gap-2">
                  {/* Attachment */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-2 rounded-xl hover:bg-(--hover-overlay) transition-colors shrink-0"
                    title="Attach file">
                    {uploadingFile
                      ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-faint)' }} />
                      : <Paperclip className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                    }
                  </button>
                  <input
                    ref={fileInputRef} type="file" className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { handleFileUpload(f); e.target.value = ''; }
                    }}
                  />

                  {/* Text input */}
                  <textarea
                    ref={inputRef}
                    id={`msg-input-${id}`}
                    value={input}
                    onChange={e => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={editingMsg ? 'Edit message…' : 'Type a message… (Enter to send, Shift+Enter for new line)'}
                    rows={1}
                    className="flex-1 resize-none px-4 py-2.5 rounded-xl text-sm font-sans bg-(--bg-input) border border-(--border-default) focus:outline-none focus:border-[#E9C349] transition-colors"
                    style={{
                      color:  'var(--text-primary)',
                      maxHeight: '120px',
                      overflowY: input.includes('\n') ? 'auto' : 'hidden',
                    }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                    }}
                  />

                  {/* Send */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="p-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center"
                    style={{
                      background: input.trim() ? '#E9C349' : 'rgba(233,195,73,0.12)',
                      color:      input.trim() ? '#0F0F10' : 'rgba(233,195,73,0.4)',
                    }}>
                    {sending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send    className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: Info panel ────────────────────────────────────────── */}
        <AnimatePresence>
          {showInfo && active && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
              style={{ borderLeft: '1px solid var(--border-default)' }}
            >
              <div className="w-60 h-full flex flex-col">
                {/* Info header */}
                <div className="px-4 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      Conversation Info
                    </span>
                    <button onClick={() => setShowInfo(false)} className="p-1 rounded-lg hover:bg-(--hover-overlay)">
                      <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-faint)' }} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {/* Conversation type */}
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>
                      Type
                    </p>
                    <div className="flex items-center gap-2">
                      {TYPE_ICON[active.type]}
                      <span className="font-sans text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {active.type.charAt(0) + active.type.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {active.description && (
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>
                        Description
                      </p>
                      <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {active.description}
                      </p>
                    </div>
                  )}

                  {/* Priority */}
                  {active.priority !== 'NORMAL' && (
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>
                        Priority
                      </p>
                      <span className="font-mono text-[9px] px-2 py-0.5 rounded-full"
                        style={{
                          background: PRIORITY_COLOR[active.priority] + '20',
                          color:      PRIORITY_COLOR[active.priority],
                        }}>
                        {active.priority}
                      </span>
                    </div>
                  )}

                  {/* Participants */}
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>
                      Members ({active.participants.length})
                    </p>
                    <div className="space-y-2">
                      {active.participants.map(p => {
                        const online = onlineUsers.has(p.userId);
                        return (
                          <div key={p.userId} className="flex items-center gap-2">
                            <div className="relative shrink-0">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center font-serif font-bold text-xs"
                                style={{ background: 'rgba(233,195,73,0.12)', color: '#E9C349' }}>
                                {p.fullName.charAt(0)}
                              </div>
                              <Circle className="absolute -bottom-0.5 -right-0.5 w-2 h-2"
                                style={{ color: online ? '#34d399' : 'var(--text-faint)', fill: online ? '#34d399' : 'var(--text-faint)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-sans text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {p.fullName}
                                {p.userId === myId && <span style={{ color: 'var(--text-faint)' }}> (you)</span>}
                              </p>
                              <p className="font-mono text-[9px]" style={{ color: 'var(--text-faint)' }}>
                                {ROLE_LABEL[p.role] ?? p.role}
                              </p>
                            </div>
                            {p.participantRole === 'ADMIN' && (
                              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: 'rgba(233,195,73,0.1)', color: '#E9C349' }}>
                                admin
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Created */}
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>
                      Created
                    </p>
                    <p className="font-sans text-xs" style={{ color: 'var(--text-muted)' }}>
                      {fullTime(active.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
