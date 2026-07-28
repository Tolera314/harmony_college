'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { FONavTab, FONotification } from '../../../types/finance';

interface FONotificationsViewProps {
  notifications: FONotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  setActiveTab: (tab: FONavTab) => void;
}

const typeConfig: Record<FONotification['type'], { label: string; color: string; dot: string }> = {
  payment_received:      { label: 'Payment',       color: 'text-(--status-success)', dot: 'bg-emerald-400' },
  payment_overdue:       { label: 'Overdue',        color: 'text-(--status-danger)',    dot: 'bg-rose-400'    },
  installment_due:       { label: 'Installment',    color: 'text-(--status-warning)',   dot: 'bg-amber-400'   },
  reconciliation_failed: { label: 'Reconciliation', color: 'text-red-400',     dot: 'bg-red-400'     },
  large_payment:         { label: 'Large Payment',  color: 'text-(--brand-gold)',   dot: 'bg-[#E9C349]'  },
  system:                { label: 'System',         color: 'text-blue-400',    dot: 'bg-blue-400'    },
  reminder:              { label: 'Reminder',       color: 'text-purple-400',  dot: 'bg-purple-400'  },
};

const typeEmoji: Record<FONotification['type'], string> = {
  payment_received: '💳', payment_overdue: '⚠️', installment_due: '📅',
  reconciliation_failed: '🔄', large_payment: '💰', system: '🖥️', reminder: '🔔',
};

export const FONotificationsView: React.FC<FONotificationsViewProps> = ({
  notifications, onMarkRead, onMarkAllRead, setActiveTab,
}) => {
  const [filter, setFilter] = useState<FONotification['type'] | 'All'>('All');

  const filtered = filter === 'All'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filters: (FONotification['type'] | 'All')[] = [
    'All', 'payment_received', 'payment_overdue', 'installment_due',
    'reconciliation_failed', 'large_payment', 'system', 'reminder',
  ];

  const filterLabel = (f: typeof filter) => f === 'All' ? 'All' : typeConfig[f as FONotification['type']].label;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread · ${notifications.length} total`}
        icon={<Bell className="w-5 h-5" />}
        badge={unreadCount > 0 ? <Badge variant="gold">{unreadCount} new</Badge> : undefined}
        actions={
          unreadCount > 0 && (
            <Button variant="ghost" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={onMarkAllRead}>
              Mark All Read
            </Button>
          )
        }
      />

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-(--text-faint) shrink-0" />
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all border ${
              filter === f
                ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border)'
                : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay)'
            }`}>
            {filterLabel(f)}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="font-serif text-lg font-bold text-(--text-faint)">No notifications</p>
            <p className="font-sans text-sm text-(--text-faint) mt-1">You&apos;re all caught up.</p>
          </div>
        )}
        {filtered.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => { onMarkRead(n.id); setActiveTab(n.tab); }}
            className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:border-white/20 ${
              n.read
                ? 'border-(--border-subtle) bg-transparent'
                : 'border-(--accent-gold-border) bg-[#E9C349]/3'
            }`}
          >
            {/* Emoji icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${n.read ? 'bg-(--hover-overlay)' : 'bg-(--accent-gold-subtle)'}`}>
              {typeEmoji[n.type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-sans text-sm font-semibold ${n.read ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-[#E9C349] rounded-full shrink-0" />}
                  <span className={`font-mono text-[10px] ${typeConfig[n.type].color}`}>{typeConfig[n.type].label}</span>
                </div>
                <p className="font-mono text-[10px] text-(--text-faint) shrink-0 whitespace-nowrap">{n.timestamp}</p>
              </div>
              <p className="font-sans text-xs text-(--text-muted) mt-1 leading-relaxed line-clamp-2">{n.message}</p>
              {n.amount && (
                <p className="font-mono text-xs text-(--brand-gold) mt-1.5 font-bold">ETB {n.amount.toLocaleString()}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
