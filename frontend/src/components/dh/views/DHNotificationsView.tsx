'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCheck } from 'lucide-react';
import { DHNavTab, DHNotification } from '../../../types/department';
import { DHPageHeader } from '../DHPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

const typeConfig: Record<DHNotification['type'], { dot: string; badge: 'gold'|'amber'|'rose'|'glass' }> = {
  approval: { dot: 'bg-[#E9C349]', badge: 'gold' },
  info:     { dot: 'bg-sky-400',   badge: 'glass' },
  alert:    { dot: 'bg-amber-400', badge: 'amber' },
  warning:  { dot: 'bg-rose-400',  badge: 'rose' },
};

interface DHNotificationsViewProps {
  notifications: DHNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  setActiveTab: (tab: DHNavTab) => void;
}

export const DHNotificationsView: React.FC<DHNotificationsViewProps> = ({
  notifications, onMarkRead, onMarkAllRead, setActiveTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayed = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <DHPageHeader
        title="Notification Center"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        icon={<Bell className="w-5 h-5" />}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={onMarkAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-all capitalize ${filter === f ? 'bg-[#E9C349]/15 border-[#E9C349]/40 text-[#E9C349]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
            {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <div className="py-20 text-center">
            <Bell className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="font-sans text-sm text-white/30">
              {filter === 'unread' ? 'All caught up — no unread notifications.' : 'No notifications yet.'}
            </p>
          </div>
        ) : displayed.map((n) => {
          const cfg = typeConfig[n.type];
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                !n.read
                  ? 'bg-white/[0.04] border-white/15 hover:bg-white/[0.07]'
                  : 'bg-transparent border-white/8 hover:bg-white/5'
              }`}
              onClick={() => { onMarkRead(n.id); setActiveTab(n.module); }}
            >
              <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.read ? 'bg-white/15' : cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-sans text-sm font-semibold ${n.read ? 'text-white/60' : 'text-white'}`}>{n.title}</p>
                  <Badge variant={cfg.badge} className="text-[10px]">{n.type}</Badge>
                  {!n.read && <span className="font-mono text-[10px] text-[#E9C349]">NEW</span>}
                </div>
                <p className="font-sans text-xs text-white/50 leading-relaxed mt-1">{n.message}</p>
                <p className="font-mono text-[10px] text-white/30 mt-2">{n.timestamp}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
