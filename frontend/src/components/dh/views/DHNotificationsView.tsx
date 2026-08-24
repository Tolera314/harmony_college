'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Bell, CheckCheck } from 'lucide-react';
import { hodNotificationsApi, type ApiNotification } from '../../../lib/hodApi';
import { DHNavTab } from '../../../types/department';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { EmptyState, ErrorState } from '../../ui/States';
import { Button } from '../../ui/Button';

const typeConfig = (type: string): { dot: string; badge: 'gold' | 'amber' | 'rose' | 'glass' } => {
  switch (type?.toUpperCase()) {
    case 'SUCCESS': return { dot: 'bg-[#E9C349]', badge: 'gold' };
    case 'WARNING': return { dot: 'bg-(--status-warning)', badge: 'amber' };
    case 'ERROR':   return { dot: 'bg-(--status-danger)',  badge: 'rose' };
    default:        return { dot: 'bg-(--status-info)',    badge: 'glass' };
  }
};

interface DHNotificationsViewProps {
  notifications:  ApiNotification[];
  onMarkRead:     (id: string) => void;
  onMarkAllRead:  () => void;
  setActiveTab:   (tab: DHNavTab) => void;
}

export const DHNotificationsView: React.FC<DHNotificationsViewProps> = ({
  notifications: propNotifs,
  onMarkRead,
  onMarkAllRead,
  setActiveTab,
}) => {
  const [notifications, setNotifications] = useState<ApiNotification[]>(propNotifs);
  const [total,         setTotal]         = useState(propNotifs.length);
  const [unreadCount,   setUnreadCount]   = useState(propNotifs.filter(n => !n.isRead).length);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [filter,        setFilter]        = useState<'all' | 'unread'>('all');
  const LIMIT = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await hodNotificationsApi.list({
        page:       p,
        limit:      LIMIT,
        unreadOnly: filter === 'unread',
      });
      setNotifications(res.notifications);
      setTotal(res.total);
      setUnreadCount(res.unreadCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(page); }, [page, filter, load]);

  const handleMarkRead = async (id: string) => {
    try {
      await hodNotificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      onMarkRead(id);
    } catch { /* silently fail */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await hodNotificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      onMarkAllRead();
    } catch { /* silently fail */ }
  };

  const displayed = notifications;
  const totalPages = Math.ceil(total / LIMIT);

  if (error) return <ErrorState variant="generic" description={error} onRetry={() => load(page)} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Notification Center"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        icon={<Bell className="w-5 h-5" />}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-2">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize ${filter === f ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-6 h-6 rounded-full border-2 border-(--brand-gold) border-t-transparent" />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          variant="notifications"
          description={filter === 'unread' ? 'All caught up — no unread notifications.' : 'No notifications yet.'}
          compact
        />
      ) : (
        <div className="space-y-2">
          {displayed.map(n => {
            const cfg = typeConfig(n.type);
            return (
              <motion.div
                key={n.id} layout
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${!n.isRead ? 'bg-(--hover-overlay) border-(--border-strong)' : 'bg-transparent border-(--border-subtle) hover:bg-(--hover-overlay)'}`}
                onClick={() => handleMarkRead(n.id)}
              >
                <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.isRead ? 'bg-(--active-overlay)' : cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-sans text-sm font-semibold ${n.isRead ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>{n.title}</p>
                    <Badge variant={cfg.badge} className="text-[10px]">{n.type}</Badge>
                    {!n.isRead && <span className="font-mono text-[10px] text-(--brand-gold)">NEW</span>}
                  </div>
                  <p className="font-sans text-xs text-(--text-muted) leading-relaxed mt-1">{n.message}</p>
                  <p className="font-mono text-[10px] text-(--text-faint) mt-2">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-sans text-xs text-(--text-faint)">{total} notifications · Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
