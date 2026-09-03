/**
 * Internal Messaging API client
 * Connects to /api/messages/* — staff-only endpoints.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const MSG  = `${BASE}/api/messages`;

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConversationType = 'DIRECT' | 'GROUP' | 'DEPARTMENT' | 'OFFICIAL';
export type MessagePriority  = 'NORMAL' | 'IMPORTANT' | 'URGENT';
export type MessageStatus    = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface MsgParticipant {
  userId:          string;
  fullName:        string;
  role:            string;
  email:           string | null;
  department:      string | null;
  participantRole: string;
  lastReadAt:      string | null;
}

export interface MsgAttachment {
  id:               string;
  messageId:        string;
  originalFileName: string;
  mimeType:         string;
  fileSize:         number;
  storagePath:      string;
  uploadedAt:       string;
}

export interface MsgMessage {
  id:          string;
  conversationId: string;
  senderId:    string;
  content:     string;
  messageType: string;
  status:      MessageStatus;
  replyToId:   string | null;
  replyTo:     { id: string; content: string; isDeleted: boolean; sender: { id: string; fullName: string } } | null;
  editedAt:    string | null;
  isDeleted:   boolean;
  createdAt:   string;
  sender:      { id: string; fullName: string; role: string; email: string | null };
  attachments: MsgAttachment[];
}

export interface MsgConversation {
  id:              string;
  type:            ConversationType;
  name:            string | null;
  description:     string | null;
  departmentId:    string | null;
  priority:        MessagePriority;
  requiresAck:     boolean;
  expiresAt:       string | null;
  lastMessageAt:   string | null;
  isActive:        boolean;
  createdAt:       string;
  participantRole: string;
  isPinned:        boolean;
  isArchived:      boolean;
  isMuted:         boolean;
  lastReadAt:      string | null;
  participants:    MsgParticipant[];
  lastMessage:     { id: string; content: string; senderId: string; senderName: string; createdAt: string; isDeleted: boolean } | null;
  unreadCount:     number;
}

export interface MsgEmployee {
  id:         string;
  fullName:   string;
  role:       string;
  email:      string | null;
  department: string | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const messagingApi = {
  // Employee search
  searchEmployees: (q: string, limit = 20) =>
    apiFetch<MsgEmployee[]>(`${MSG}/employees?q=${encodeURIComponent(q)}&limit=${limit}`),

  // Unread count
  getUnreadCount: () =>
    apiFetch<{ total: number; perConversation: Record<string, number> }>(`${MSG}/unread`),

  // Conversations
  listConversations: (archived = false) =>
    apiFetch<MsgConversation[]>(`${MSG}/conversations?archived=${archived}`),

  getConversation: (id: string) =>
    apiFetch<MsgConversation>(`${MSG}/conversations/${id}`),

  createConversation: (data: {
    type:           ConversationType;
    name?:          string;
    description?:   string;
    participantIds: string[];
    departmentId?:  string;
    priority?:      MessagePriority;
    requiresAck?:   boolean;
    expiresAt?:     string;
  }) =>
    apiFetch<MsgConversation>(`${MSG}/conversations`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    }),

  updatePrefs: (id: string, prefs: { isMuted?: boolean; isPinned?: boolean; isArchived?: boolean }) =>
    apiFetch<unknown>(`${MSG}/conversations/${id}/prefs`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(prefs),
    }),

  addParticipants: (id: string, userIds: string[]) =>
    apiFetch<{ success: boolean }>(`${MSG}/conversations/${id}/participants`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userIds }),
    }),

  removeParticipant: (id: string, userId: string) =>
    apiFetch<{ success: boolean }>(`${MSG}/conversations/${id}/participants/${userId}`, {
      method: 'DELETE',
    }),

  markRead: (id: string) =>
    apiFetch<{ success: boolean }>(`${MSG}/conversations/${id}/read`, { method: 'POST' }),

  // Department conversation
  getOrCreateDepartment: (departmentId: string) =>
    apiFetch<MsgConversation>(`${MSG}/department/${departmentId}`, { method: 'POST' }),

  // Messages
  listMessages: (conversationId: string, cursor?: string) =>
    apiFetch<MsgMessage[]>(
      `${MSG}/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ''}`
    ),

  sendMessage: (conversationId: string, data: { content: string; replyToId?: string }) =>
    apiFetch<MsgMessage>(`${MSG}/conversations/${conversationId}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    }),

  editMessage: (messageId: string, content: string) =>
    apiFetch<MsgMessage>(`${MSG}/messages/${messageId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content }),
    }),

  deleteMessage: (messageId: string, admin = false) =>
    apiFetch<unknown>(`${MSG}/messages/${messageId}?type=${admin ? 'admin' : 'self'}`, {
      method: 'DELETE',
    }),

  acknowledgeMessage: (messageId: string) =>
    apiFetch<{ success: boolean }>(`${MSG}/messages/${messageId}/acknowledge`, { method: 'POST' }),

  // Attachment download URL
  attachmentUrl: (attachmentId: string) => `${MSG}/attachments/${attachmentId}`,

  // Upload attachment (returns message)
  uploadAttachment: (conversationId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${MSG}/conversations/${conversationId}/attachments`, {
      method:      'POST',
      credentials: 'include',
      body:        fd,
    }).then(async r => {
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error((b as { error?: string }).error ?? 'Upload failed');
      }
      return r.json() as Promise<MsgMessage>;
    });
  },
};
