'use client';

import React, { useState } from 'react';
import { FONavTab, FOProfile, FONotification } from '../../types/finance';
import { Search, Bell, ChevronRight, Command, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { Badge } from '../ui/Badge';
import ThemeToggle from '../ThemeToggle';

interface FOHeaderProps {
  activeTab: FONavTab;
  setActiveTab: (tab: FONavTab) => void;
  profile: FOProfile;
  notifications: FONotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onOpenSearch: () => void;
  semesterLabel: string;
  academicYear: string;
}

const tabLabels: Record<FONavTab, string> = {
  overview:         'Dashboard Overview',
  student_accounts: 'Student Accounts',
  payments:         'Payments',
  receipts:         'Receipts',
  outstanding:      'Outstanding Accounts',
  reports:          'Financial Reports',
  reconciliation:   'Payment Reconciliation',
  notifications:    'Notification Center',
  audit_log:        'Audit Log',
  settings:         'Settings',
};

const notifTypeIcon: Record<FONotification['type'], string> = {
  payment_received:       '💳',
  payment_overdue:        '⚠️',
  installment_due:        '📅',
  reconciliation_failed:  '🔄',
  large_payment:          '💰',
  system:                 '🖥️',
  reminder:               '🔔',
};

export const FOHeader: React.FC<FOHeaderProps> = ({
  activeTab, setActiveTab, profile, notifications, unreadCount,
  onMarkRead, onOpenSearch, semesterLabel, academicYear,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full ds-header backdrop-blur-xl border-b h-16 flex items-center md:pl-20 xl:pl-64 transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 sm:px-6 py-3">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('overview')}
            className="font-serif text-lg sm:text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            Harmony <span className="text-(--brand-gold)">Finance</span>
          </button>
          <div className="hidden sm:block h-4 w-px bg-(--active-overlay) mx-1" />
          <nav className="hidden sm:flex items-center gap-1.5 text-xs lg:text-sm " style={{ color: "var(--text-muted)" }} aria-label="Breadcrumb">
            <button onClick={() => setActiveTab('overview')} className="hover:text-[--brand-gold] transition-colors font-medium">
              Portal
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-(--text-faint)" />
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{tabLabels[activeTab]}</span>
          </nav>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Academic year */}
          <Badge variant="glass" className="hidden lg:inline-flex font-mono">{academicYear}</Badge>
          {/* Semester badge */}
          <Badge variant="gold" className="hidden sm:inline-flex">{semesterLabel}</Badge>

          {/* Search trigger */}
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center justify-between gap-3 px-3.5 py-1.5 ds-search border rounded-full text-xs w-48 lg:w-56 transition-all"
            aria-label="Global search (Ctrl+K)"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-(--text-muted)" />
              <span className="truncate">Search students, receipts...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-(--hover-overlay) border border-(--border-default) rounded text-[10px] font-mono text-(--text-secondary)">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-full hover:bg-(--hover-overlay) text-(--text-secondary) transition-colors touch-target"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((p) => !p)}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              className="relative p-2 rounded-full hover:bg-(--hover-overlay) text-(--text-secondary) hover:text-(--text-primary) transition-colors touch-target"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#E9C349] rounded-full flex items-center justify-center text-(--text-inverse) text-[9px] font-mono font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-12 w-80 sm:w-96 ds-notif-panel border rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 ds-notif-panel-header border-b flex items-center justify-between">
                      <span className="font-serif text-base font-bold" style={{ color: "var(--text-primary)" }}>Notifications</span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && <Badge variant="gold">{unreadCount} new</Badge>}
                        <button onClick={() => setNotifOpen(false)} className="p-1 rounded-full hover:bg-(--hover-overlay) text-(--text-secondary) transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y ds-notif-item">
                      {notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => { onMarkRead(n.id); setNotifOpen(false); setActiveTab(n.tab); }}
                          className={`w-full text-left px-4 py-3.5 hover:bg-(--hover-overlay) transition-colors flex gap-3 ${!n.read ? 'bg-[#E9C349]/3' : ''}`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{notifTypeIcon[n.type]}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-sans text-xs font-semibold truncate ${n.read ? 'text-(--text-secondary)' : 'text-(--text-primary)'}`}>{n.title}</p>
                              {!n.read && <span className="w-1.5 h-1.5 bg-[#E9C349] rounded-full shrink-0" />}
                            </div>
                            <p className="font-sans text-xs text-(--text-muted) leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="font-mono text-[10px] text-(--text-faint) mt-1">{n.timestamp}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 border-t border-(--border-default)">
                      <button
                        onClick={() => { setActiveTab('notifications'); setNotifOpen(false); }}
                        className="w-full text-center font-sans text-xs text-(--brand-gold) hover:underline"
                      >
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Avatar */}
          <button
            onClick={() => setActiveTab('settings')}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-(--accent-gold-border) hover:border-(--brand-gold) transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-gold)"
            aria-label="Profile & Settings"
          >
            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    </header>
  );
};
