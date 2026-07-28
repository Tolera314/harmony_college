'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Bell, CheckCheck } from 'lucide-react';
import { AdminNavTab, AdminNotification } from '../../../types/admin';
import { DHPageHeader } from '../../dh/DHPageHeader';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/States';
import { Button } from '../../ui/Button';

interface AdminNotificationsViewProps {
  notifications: AdminNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  setActiveTab: (tab: AdminNavTab) => void;
}

const sevDot: Record<string, string> = { critical: 'bg-(--status-danger)', warning: 'bg-(--status-warning)', info: 'bg-(--status-info)' };
const typeBadge: Record<string, 'rose'|'amber'|'gold'|'glass'|'emerald'> = {
  security: 'rose', payment: 'amber', system: 'gold', backup: 'rose', admission: 'emerald', hr: 'glass', academic: 'glass',
};

export const AdminNotificationsView: React.FC<AdminNotificationsViewProps> = ({
  notifications, onMarkRead, onMarkAllRead, setActiveTab,
}) => {
  const [filter, setFilter] = useState<'all'|'unread'>('all');
  const unreadCount = notifications.filter(n => !n.read).length;
  const displayed = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...DURATION.medium, ...EASE.out }} className="space-y-6 pb-16">
      <DHPageHeader title="Notifications" subtitle={`${unreadCount} unread`} icon={<Bell className="w-5 h-5" />}
        actions={unreadCount > 0 ? <Button variant="secondary" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={onMarkAllRead}>Mark all read</Button> : undefined}
      />
      <div className="flex gap-2">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize ${filter === f ? 'bg-(--accent-gold-subtle) border-(--accent-gold-border) text-(--brand-gold)' : 'bg-(--hover-overlay) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary)'}`}>
            {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <div className="py-20 text-center"><Bell className="w-10 h-10 text-(--text-faint) mx-auto mb-3" /><p className="font-sans text-sm text-(--text-faint)">No notifications.</p></div>
        ) : displayed.map(n => (
          <motion.div key={n.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            onClick={() => { onMarkRead(n.id); setActiveTab(n.tab); }}
            className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${!n.read ? 'bg-(--hover-overlay) border-(--border-strong) hover:bg-(--hover-overlay)' : 'bg-transparent border-(--border-subtle) hover:bg-(--hover-overlay)'}`}>
            <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.read ? 'bg-(--active-overlay)' : sevDot[n.severity]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`font-sans text-sm font-semibold ${n.read ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>{n.title}</p>
                <Badge variant={typeBadge[n.type] ?? 'glass'} className="text-[10px]">{n.type}</Badge>
                <Badge variant={n.severity === 'critical' ? 'rose' : n.severity === 'warning' ? 'amber' : 'glass'} className="text-[10px]">{n.severity}</Badge>
                {!n.read && <span className="font-mono text-[10px] text-(--brand-gold)">NEW</span>}
              </div>
              <p className="font-sans text-xs text-(--text-muted) leading-relaxed mt-1">{n.message}</p>
              <p className="font-mono text-[10px] text-(--text-faint) mt-2">{n.timestamp}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
