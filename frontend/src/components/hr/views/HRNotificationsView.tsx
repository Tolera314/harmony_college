'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Bell, CheckCheck } from 'lucide-react';
import { HRNavTab } from '../../../types/hr';
import { hrNotificationsApi, type HRNotificationApi, type HRNotifType } from '../../../lib/hrApi';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/States';
import { Button } from '../../ui/Button';
import { SkeletonPage, ErrorState } from '../../ui/States';

interface HRNotificationsViewProps {
  setActiveTab: (tab: HRNavTab) => void;
  onUnreadCountChange?: (count: number) => void;
}

const typeConfig: Record<HRNotifType, { dot: string; badge: 'gold'|'amber'|'rose'|'emerald'|'glass' }> = {
  LEAVE:       { dot: 'bg-(--brand-gold)',       badge: 'gold'    },
  PAYROLL:     { dot: 'bg-(--status-success)',    badge: 'emerald' },
  PERFORMANCE: { dot: 'bg-(--status-info)',       badge: 'glass'   },
  CONTRACT:    { dot: 'bg-(--status-warning)',    badge: 'amber'   },
  ONBOARDING:  { dot: 'bg-purple-500',            badge: 'glass'   },
  SYSTEM:      { dot: 'bg-(--text-faint)',        badge: 'glass'   },
};

const typeLabel: Record<HRNotifType, string> = {
  LEAVE: 'Leave', PAYROLL: 'Payroll', PERFORMANCE: 'Performance',
  CONTRACT: 'Contract', ONBOARDING: 'Onboarding', SYSTEM: 'System',
};

export const HRNotificationsView: React.FC<HRNotificationsViewProps> = ({ setActiveTab, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState<HRNotificationApi[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const list = await hrNotificationsApi.list();
      setNotifications(list);
      onUnreadCountChange?.(list.filter(n => !n.isRead).length);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load notifications'); }
    finally { setLoading(false); }
  }, [onUnreadCountChange]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    try {
      await hrNotificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      onUnreadCountChange?.(notifications.filter(n => !n.isRead && n.id !== id).length);
    } catch { /* fail silently */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await hrNotificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      onUnreadCountChange?.(0);
    } catch { /* fail silently */ }
  };

  const unread = notifications.filter(n => !n.isRead);

  if (loading) return <SkeletonPage />;
  if (error)   return <ErrorState variant="network" onRetry={load} description={error} />;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Notifications"
        subtitle={`${unread.length} unread · ${notifications.length} total`}
        icon={<Bell className="w-5 h-5" />}
        actions={
          unread.length > 0
            ? <Button variant="secondary" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={handleMarkAllRead}>
                Mark All Read
              </Button>
            : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState variant="notifications" description="No notifications at this time." />
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const cfg = typeConfig[notif.type] ?? typeConfig.SYSTEM;
            return (
              <motion.div key={notif.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                  !notif.isRead
                    ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border)'
                    : 'bg-(--hover-overlay) border-(--border-subtle) opacity-70'
                }`}
                onClick={() => {
                  if (!notif.isRead) handleMarkRead(notif.id);
                  setActiveTab(notif.tab as HRNavTab);
                }}>
                {/* Dot */}
                <div className="mt-1.5 shrink-0">
                  <span className={`block w-2.5 h-2.5 rounded-full ${!notif.isRead ? cfg.dot : 'bg-(--border-default)'}`} />
                </div>

                {/* Employee avatar */}
                {notif.employee && (
                  <img src={notif.employee.avatarUrl ?? '/tigist.png'} alt="" className="w-9 h-9 rounded-full border border-(--border-default) shrink-0 object-cover" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className={`font-sans text-sm font-semibold leading-snug ${!notif.isRead ? 'text-(--text-primary)' : 'text-(--text-secondary)'}`}>
                      {notif.title}
                    </p>
                    <Badge variant={cfg.badge} className="text-[10px] shrink-0">{typeLabel[notif.type]}</Badge>
                    {!notif.isRead && <Badge variant="gold" className="text-[9px] shrink-0">New</Badge>}
                  </div>
                  <p className="font-sans text-xs leading-relaxed text-(--text-muted) line-clamp-2">{notif.message}</p>
                  <p className="font-mono text-[10px] text-(--text-faint) mt-1.5">
                    {new Date(notif.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Mark read button */}
                {!notif.isRead && (
                  <button
                    onClick={e => { e.stopPropagation(); handleMarkRead(notif.id); }}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-(--hover-overlay) text-(--text-faint) hover:text-(--text-primary) transition-colors"
                    title="Mark as read">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
