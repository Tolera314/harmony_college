'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Bell, CheckCheck, Check, Filter, Search, X, CheckCircle2 } from 'lucide-react';
import { FOPageHeader } from '../FOPageHeader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
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
  payment_received: '💳',
  payment_overdue: '⚠️',
  installment_due: '📅',
  reconciliation_failed: '🔄',
  large_payment: '💰',
  system: '🖥️',
  reminder: '🔔',
};

export const FONotificationsView: React.FC<FONotificationsViewProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  setActiveTab,
}) => {
  const [filterType, setFilterType]     = useState<FONotification['type'] | 'All'>('All');
  const [readFilter, setReadFilter]     = useState<'All' | 'Unread' | 'Read'>('All');
  const [searchQuery, setSearchQuery]   = useState('');
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE = 6;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filters: (FONotification['type'] | 'All')[] = [
    'All',
    'payment_received',
    'payment_overdue',
    'installment_due',
    'reconciliation_failed',
    'large_payment',
    'system',
    'reminder',
  ];

  const filterLabel = (f: typeof filterType) => (f === 'All' ? 'All Types' : typeConfig[f as FONotification['type']].label);

  const filtered = useMemo(() => {
    let list = [...notifications];

    // Read status filter
    if (readFilter === 'Unread') list = list.filter((n) => !n.read);
    if (readFilter === 'Read') list = list.filter((n) => n.read);

    // Type filter
    if (filterType !== 'All') list = list.filter((n) => n.type === filterType);

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.studentId && n.studentId.toLowerCase().includes(q))
      );
    }

    return list;
  }, [notifications, readFilter, filterType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 pb-16">
      <FOPageHeader
        title="Notifications Center"
        subtitle={`${unreadCount} unread alert${unreadCount === 1 ? '' : 's'} · ${notifications.length} total notifications`}
        icon={<Bell className="w-5 h-5" />}
        badge={unreadCount > 0 ? <Badge variant="gold">{unreadCount} new</Badge> : undefined}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCheck className="w-4 h-4" />}
              onClick={onMarkAllRead}
            >
              Mark All Read ({unreadCount})
            </Button>
          ) : undefined
        }
      />

      {/* Control bar: Search, Status Tabs, Type Chips */}
      <Card hoverable={false} className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-faint)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search notifications by title, message, student ID…"
              className="w-full bg-(--hover-overlay) border border-(--border-default) rounded-xl pl-9 pr-4 py-2 font-sans text-xs sm:text-sm text-(--text-primary) placeholder:text-(--text-faint) outline-none focus:border-(--brand-gold)/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) hover:text-(--text-secondary)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Read / Unread Status Tabs */}
          <div className="flex bg-(--hover-overlay) p-1 rounded-xl border border-(--border-default) shrink-0">
            {(['All', 'Unread', 'Read'] as const).map((st) => {
              const count =
                st === 'Unread' ? unreadCount :
                st === 'Read' ? notifications.length - unreadCount :
                notifications.length;

              return (
                <button
                  key={st}
                  onClick={() => { setReadFilter(st); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${
                    readFilter === st
                      ? 'bg-(--accent-gold-subtle) text-(--brand-gold) font-bold shadow-xs'
                      : 'text-(--text-muted) hover:text-(--text-primary)'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Type Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-(--border-subtle)">
          <Filter className="w-3.5 h-3.5 text-(--text-faint) shrink-0" />
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => { setFilterType(f); setPage(1); }}
              className={`px-3 py-1 rounded-full font-mono text-[11px] transition-all border ${
                filterType === f
                  ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border-(--accent-gold-border) font-medium'
                  : 'bg-(--hover-overlay) text-(--text-muted) border-(--border-default) hover:bg-(--hover-overlay)'
              }`}
            >
              {filterLabel(f)}
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {paginated.length === 0 && (
          <div className="py-16 text-center border border-dashed border-(--border-default) rounded-2xl bg-(--hover-overlay)/40">
            <Bell className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="font-sans text-base font-semibold text-(--text-secondary)">No notifications found</p>
            <p className="font-sans text-xs text-(--text-faint) mt-1">
              {searchQuery || filterType !== 'All' || readFilter !== 'All'
                ? 'Try adjusting your search query or filter chips.'
                : "You're all caught up! No notifications available."}
            </p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {paginated.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (!n.read) onMarkRead(n.id);
                if (n.tab) setActiveTab(n.tab as FONavTab);
              }}
              className={`group flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                n.read
                  ? 'border-(--border-subtle) bg-(--hover-overlay)/30 opacity-80 hover:opacity-100 hover:border-white/15'
                  : 'border-(--accent-gold-border) bg-[#E9C349]/5 shadow-xs hover:border-(--brand-gold)/40'
              }`}
            >
              {/* Category Icon */}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border transition-transform group-hover:scale-105 ${
                  n.read
                    ? 'bg-(--hover-overlay) border-(--border-default)'
                    : 'bg-(--accent-gold-subtle) border-(--accent-gold-border)'
                }`}
              >
                {typeEmoji[n.type] || '🔔'}
              </div>

              {/* Notification Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-sans text-sm font-semibold ${n.read ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2 h-2 bg-[#E9C349] rounded-full shrink-0 animate-pulse" title="Unread notification" />
                    )}
                    <span className={`font-mono text-[10px] font-semibold ${typeConfig[n.type]?.color || 'text-(--text-muted)'}`}>
                      {typeConfig[n.type]?.label || 'Notice'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-(--text-faint) shrink-0">{n.timestamp}</span>
                </div>

                <p className="font-sans text-xs text-(--text-muted) mt-1 leading-relaxed">{n.message}</p>

                {n.amount && (
                  <p className="font-mono text-xs text-(--brand-gold) mt-1.5 font-bold">
                    ETB {n.amount.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Individual Actions (Mark as Read individually) */}
              <div className="flex items-center gap-1.5 shrink-0 self-center" onClick={(e) => e.stopPropagation()}>
                {!n.read ? (
                  <button
                    onClick={() => onMarkRead(n.id)}
                    title="Mark as Read"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-(--accent-gold-subtle) hover:bg-(--accent-gold-subtle) border border-(--accent-gold-border) text-(--brand-gold) font-mono text-[11px] transition-all hover:scale-105 touch-target"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mark Read</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 text-(--text-faint) font-mono text-[10px]" title="Read">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" />
                    <span className="hidden sm:inline">Read</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-(--border-default)">
          <p className="font-mono text-xs text-(--text-faint)">
            Showing <span className="text-(--text-secondary) font-bold">{(page - 1) * PAGE_SIZE + 1}</span>–
            <span className="text-(--text-secondary) font-bold">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of{' '}
            <span className="text-(--text-secondary) font-bold">{filtered.length}</span> notifications
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg font-mono text-xs transition-colors ${
                    p === page
                      ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--accent-gold-border) font-bold'
                      : 'text-(--text-faint) hover:bg-(--hover-overlay) hover:text-(--text-primary)'
                  }`}
                >
                  {p}
                </button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
