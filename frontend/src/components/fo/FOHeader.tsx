'use client';

import React, { useState } from 'react';
import { FONavTab, FOProfile, FONotification } from '../../types/finance';
import { Search, Bell, ChevronRight, Command, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';

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
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-sidebar)]/90 backdrop-blur-xl border-b border-white/10 h-16 flex items-center md:pl-20 xl:pl-64 transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 sm:px-6 py-3 gap-3 min-w-0">

        {/* Left — brand + breadcrumb */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <button
            onClick={() => setActiveTab('overview')}
            className="font-serif text-lg font-bold text-white tracking-tight hover:opacity-80 transition-opacity whitespace-nowrap shrink-0"
          >
            Harmony <span className="text-[#E9C349]">Finance</span>
          </button>

          {/* Divider + breadcrumb — only on sm+ */}
          <div className="hidden sm:flex items-center gap-1.5 min-w-0">
            <div className="h-4 w-px bg-white/15 mx-1 shrink-0" />
            <nav className="flex items-center gap-1 text-xs lg:text-sm text-white/60 min-w-0" aria-label="Breadcrumb">
              <button
                onClick={() => setActiveTab('overview')}
                className="hover:text-[#E9C349] transition-colors font-medium whitespace-nowrap shrink-0"
              >
                Portal
              </button>
              <ChevronRight className="w-3 h-3 text-white/40 shrink-0" />
              <span className="font-semibold text-white truncate max-w-[180px] lg:max-w-xs">
                {tabLabels[activeTab]}
              </span>
            </nav>
          </div>
        </div>

        {/* Right — controls, never wrap */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Academic year — lg only */}
          <Badge variant="glass" className="hidden lg:inline-flex font-mono text-[10px]">{academicYear}</Badge>
          {/* Semester badge — sm+ */}
          <Badge variant="gold" className="hidden sm:inline-flex text-[10px]">{semesterLabel}</Badge>

          {/* Search bar — md+ */}
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/60 w-44 lg:w-52 transition-all"
            aria-label="Global search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-white/50 shrink-0" />
            <span className="truncate flex-1 text-left">Search...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[10px] font-mono text-white/50 shrink-0">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>

          {/* Search icon — mobile only */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors touch-target"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((p) => !p)}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              className="relative p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors touch-target"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#E9C349] rounded-full flex items-center justify-center text-[#0F0F10] text-[9px] font-mono font-bold">
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
                    className="absolute right-0 top-12 w-80 sm:w-96 bg-[var(--bg-panel)] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <span className="font-serif text-base font-bold text-white">Notifications</span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && <Badge variant="gold">{unreadCount} new</Badge>}
                        <button onClick={() => setNotifOpen(false)} className="p-1 rounded-full hover:bg-white/10 text-white/60 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                      {notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => { onMarkRead(n.id); setNotifOpen(false); setActiveTab(n.tab); }}
                          className={`w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors flex gap-3 ${!n.read ? 'bg-[#E9C349]/3' : ''}`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{notifTypeIcon[n.type]}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`font-sans text-xs font-semibold truncate ${n.read ? 'text-white/60' : 'text-white'}`}>{n.title}</p>
                              {!n.read && <span className="w-1.5 h-1.5 bg-[#E9C349] rounded-full shrink-0" />}
                            </div>
                            <p className="font-sans text-xs text-white/50 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="font-mono text-[10px] text-white/30 mt-1">{n.timestamp}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 border-t border-white/10">
                      <button
                        onClick={() => { setActiveTab('notifications'); setNotifOpen(false); }}
                        className="w-full text-center font-sans text-xs text-[#E9C349] hover:underline"
                      >
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <button
            onClick={() => setActiveTab('settings')}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#E9C349]/40 hover:border-[#E9C349]/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9C349] shrink-0"
            aria-label="Profile & Settings"
          >
            <img src={profile.avatar || undefined} alt={profile.name} className="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    </header>
  );
};
