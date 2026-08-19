'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { InstructorNavTab } from '../../../types/instructor';
import { DHPageHeader }     from '../../dh/DHPageHeader';
import { Badge }            from '../../ui/Badge';
import { EmptyState, SkeletonPage } from '../../ui/States';
import { Button }           from '../../ui/Button';
import {
  instructorNotificationsApi,
  type ApiNotification,
} from '../../../lib/instructorApi';

// ── Map old InstructorNotification shape (from page) or real API shape ────────
interface NormNotif {
  id:        string;
  type:      string;
  title:     string;
  message:   string;
  timestamp: string;
  read:      boolean;
  tab:       InstructorNavTab;
}

interface InNotificationsViewProps {
  // These may come from the page (already loaded) — used as initial state
  notifications:  NormNotif[];
  onMarkRead:     (id: string) => void;
  onMarkAllRead:  () => void;
  setActiveTab:   (tab: InstructorNavTab) => void;
}

const typeConfig: Record<string, { dot: string; badge: 'gold'|'amber'|'rose'|'emerald'|'glass' }> = {
  grade:        { dot: 'bg-[#E9C349]',              badge: 'gold'    },
  attendance:   { dot: 'bg-(--status-warning)',     badge: 'amber'   },
  schedule:     { dot: 'bg-(--status-info)',        badge: 'glass'   },
  enrollment:   { dot: 'bg-(--status-success)',     badge: 'emerald' },
  announcement: { dot: 'bg-(--status-info)',        badge: 'glass'   },
  system:       { dot: 'bg-(--text-faint)',          badge: 'glass'   },
  info:         { dot: 'bg-(--status-info)',        badge: 'glass'   },
  success:      { dot: 'bg-(--status-success)',     badge: 'emerald' },
  warning:      { dot: 'bg-(--status-warning)',     badge: 'amber'   },
  error:        { dot: 'bg-(--status-danger)',      badge: 'rose'    },
};

export const InNotificationsView: React.FC<InNotificationsViewProps> = ({
  notifications: initialNotifs,
  onMarkRead,
  onMarkAllRead,
  setActiveTab,
}) => {
  const [filter,     setFilter]     = useState<'all' | 'unread'>('all');
  const [notifs,     setNotifs]     = useState<NormNotif[]>(initialNotifs);
  const [loading,    setLoading]    = useState(false);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const LIMIT = 20;

  // ── Load from API ─────────────────────────────────────────────────────────
  const loadNotifs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await instructorNotificationsApi.list({
        page:       p,
        limit:      LIMIT,
        unreadOnly: filter === 'unread',
      });
      const mapped: NormNotif[] = res.notifications.map(n => ({
        id:        n.id,
        type:      (n.type ?? 'system').toLowerCase(),
        title:     n.title,
        message:   n.message,
        timestamp: new Date(n.createdAt).toLocaleString(),
        read:      n.isRead,
        tab:       'notifications' as InstructorNavTab,
      }));
      setNotifs(mapped);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch { /* keep existing */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadNotifs(1); }, [loadNotifs]);

  const handleMarkRead = async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    onMarkRead(id);
  };

  const handleMarkAll = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    onMarkAllRead();
  };

  const displayed = notifs;
  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...DURATION.medium, ...EASE.out }}
      className="space-y-6 pb-16"
    >
      <DHPageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        icon={<Bell className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => loadNotifs(1)}>
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={handleMarkAll}>
                Mark all read
              </Button>
            )}
          </div>
        }
      />

      <div className="flex gap-2">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); }}
            className="px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize"
            style={
              filter === f
                ? { backgroundColor: 'var(--accent-gold-subtle)', borderColor: 'var(--accent-gold-border)', color: 'var(--brand-gold)' }
                : { backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
            }
          >
            {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonPage />
      ) : displayed.length === 0 ? (
        <EmptyState
          variant="notifications"
          description={filter === 'unread' ? 'All caught up — no unread notifications.' : 'No notifications yet.'}
          compact
        />
      ) : (
        <div className="space-y-2">
          {displayed.map(n => {
            const cfg = typeConfig[n.type] ?? typeConfig.system;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => { handleMarkRead(n.id); setActiveTab(n.tab); }}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                  !n.read
                    ? 'bg-(--hover-overlay) border-(--border-strong) hover:bg-(--active-overlay)'
                    : 'bg-transparent border-(--border-subtle) hover:bg-(--hover-overlay)'
                }`}
              >
                <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.read ? 'bg-(--active-overlay)' : cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-sans text-sm font-semibold ${n.read ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>
                      {n.title}
                    </p>
                    <Badge variant={cfg.badge} className="text-[10px]">{n.type}</Badge>
                    {!n.read && <span className="font-mono text-[10px] text-(--brand-gold)">NEW</span>}
                  </div>
                  <p className="font-sans text-xs text-(--text-muted) leading-relaxed mt-1">{n.message}</p>
                  <p className="font-mono text-[10px] text-(--text-faint) mt-2">{n.timestamp}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => loadNotifs(page - 1)}>← Prev</Button>
          <span className="font-mono text-xs text-(--text-faint)">Page {page} / {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => loadNotifs(page + 1)}>Next →</Button>
        </div>
      )}
    </motion.div>
  );
};
