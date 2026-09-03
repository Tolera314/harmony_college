'use client';

/**
 * useNotifications — role-agnostic in-app notification hook
 * ──────────────────────────────────────────────────────────
 * Works for every dashboard role by accepting injectable fetch / mutate
 * functions.  Each caller passes its own API client methods so there is
 * zero duplication across roles.
 *
 * Features
 * ────────
 * • Initial fetch on mount via `fetchFn`
 * • Real-time badge bump: subscribes to `notification:new` socket event
 *   and prepends the new item without a re-fetch
 * • `markRead(id)` — optimistic update + background API call
 * • `markAllRead()` — optimistic update + background API call
 * • `unreadCount` derived from `items` (single source of truth)
 *
 * Usage
 * ─────
 *   const { items, unreadCount, markRead, markAllRead, loading } =
 *     useNotifications({
 *       fetchFn:       () => instructorNotificationsApi.list({ limit: 50 }),
 *       markReadFn:    (id) => instructorNotificationsApi.markRead(id),
 *       markAllReadFn: () => instructorNotificationsApi.markAllRead(),
 *     });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket, type NotificationPushEvent } from '../context/SocketContext';

// ── Minimal notification shape the hook cares about ───────────────────────────
export interface NotifItem {
  id:         string;
  title:      string;
  message:    string;
  type:       string;
  isRead:     boolean;
  actionTab?: string | null;
  entityType?: string | null;
  entityId?:  string | null;
  createdAt:  string;
}

// ── Shape returned by any role's list endpoint ────────────────────────────────
// Some roles return `isRead`, the FO API returns `read` — we normalise both.
interface RawNotifItem {
  id:         string;
  title:      string;
  message:    string;
  type?:      string;
  isRead?:    boolean;
  read?:      boolean;          // FO API uses this field name
  actionTab?: string | null;
  entityType?: string | null;
  entityId?:  string | null;
  createdAt:  string;
}

interface FetchResult {
  notifications: RawNotifItem[];
  unreadCount?:  number;
  [key: string]: unknown;
}

function normalise(raw: RawNotifItem): NotifItem {
  return {
    id:         raw.id,
    title:      raw.title,
    message:    raw.message,
    type:       raw.type ?? 'INFO',
    isRead:     raw.isRead ?? raw.read ?? false,
    actionTab:  raw.actionTab ?? null,
    entityType: raw.entityType ?? null,
    entityId:   raw.entityId   ?? null,
    createdAt:  raw.createdAt,
  };
}

export interface UseNotificationsOptions {
  /** Calls the role's notification list endpoint */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchFn:       () => Promise<any>;
  /** Calls the role's mark-one-read endpoint */
  markReadFn:    (id: string) => Promise<unknown>;
  /** Calls the role's mark-all-read endpoint */
  markAllReadFn: () => Promise<unknown>;
  /** How many items to keep in the local list (default: 50) */
  maxItems?: number;
}

export interface UseNotificationsResult {
  items:        NotifItem[];
  unreadCount:  number;
  loading:      boolean;
  markRead:     (id: string) => void;
  markAllRead:  () => void;
  /** Re-fetch from the server (call after navigating to the notifications tab) */
  reload:       () => Promise<void>;
}

export function useNotifications({
  fetchFn,
  markReadFn,
  markAllReadFn,
  maxItems = 50,
}: UseNotificationsOptions): UseNotificationsResult {
  const [items,   setItems]   = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Track mounted state so async callbacks don't update unmounted component
  const mounted = useRef(true);

  // Keep latest callback references so inline arrow functions in caller components
  // never trigger infinite re-render loops
  const fetchFnRef = useRef(fetchFn);
  const markReadFnRef = useRef(markReadFn);
  const markAllReadFnRef = useRef(markAllReadFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
    markReadFnRef.current = markReadFn;
    markAllReadFnRef.current = markAllReadFn;
  });

  const { onNotification } = useSocket();

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFnRef.current();
      if (!mounted.current) return;
      setItems((res.notifications ?? []).slice(0, maxItems).map(normalise));
    } catch {
      /* fetch failures are silent — stale UI is better than a crash */
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    mounted.current = true;
    reload();
    return () => { mounted.current = false; };
  }, [reload]);

  // ── Real-time push: prepend without re-fetch ──────────────────────────────
  useEffect(() => {
    const unsub = onNotification((ev: NotificationPushEvent) => {
      const newItem: NotifItem = {
        id:         ev.id,
        title:      ev.title,
        message:    ev.message,
        type:       ev.type,
        isRead:     false,          // always unread when first pushed
        actionTab:  ev.actionTab,
        entityType: ev.entityType,
        entityId:   ev.entityId,
        createdAt:  ev.createdAt,
      };
      setItems(prev => [newItem, ...prev].slice(0, maxItems));
    });
    return unsub;
  }, [onNotification, maxItems]);

  // ── Derived unread count ──────────────────────────────────────────────────
  const unreadCount = items.filter(n => !n.isRead).length;

  // ── Mark one read (optimistic) ────────────────────────────────────────────
  const markRead = useCallback((id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    markReadFnRef.current(id).catch(() => {
      // Roll back on failure
      setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
    });
  }, []);

  // ── Mark all read (optimistic) ────────────────────────────────────────────
  const markAllRead = useCallback(() => {
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    markAllReadFnRef.current().catch(() => {
      // Re-fetch to restore truth on failure
      reload();
    });
  }, [reload]);

  return { items, unreadCount, loading, markRead, markAllRead, reload };
}
