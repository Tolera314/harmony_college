'use client';

import React, { useState } from 'react';
import { HRNavTab, HROfficerProfile, HRNotification } from '../../types/hr';
import { Search, Bell, ChevronRight, Command, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';

interface HRHeaderProps {
  activeTab: HRNavTab;
  setActiveTab: (tab: HRNavTab) => void;
  profile: HROfficerProfile;
  notifications: HRNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onOpenSearch: () => void;
}

const TAB_LABELS: Record<HRNavTab, string> = {
  overview: 'Dashboard', employees: 'Employees', onboarding: 'Onboarding',
  leave: 'Leave Management', payroll: 'Payroll', performance: 'Performance',
  documents: 'Documents', reports: 'Reports', notifications: 'Notifications',
  audit_log: 'Audit Logs', settings: 'Settings',
};

const NOTIF_DOT: Record<string, string> = {
  leave: 'bg-amber-400', payroll: 'bg-[#E9C349]', performance: 'bg-sky-400',
  contract: 'bg-rose-400', onboarding: 'bg-emerald-400', system: 'bg-white/40',
};

export const HRHeader: React.FC<HRHeaderProps> = ({
  activeTab, setActiveTab, profile, notifications, unreadCount, onMarkRead, onOpenSearch,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0F0F10]/90 backdrop-blur-xl border-b border-white/10 h-16 flex items-center md:pl-20 xl:pl-64 transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 sm:px-6 py-3">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setActiveTab('overview')} className="font-serif text-lg sm:text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
            Harmony <span className="text-[#E9C349]">College</span>
          </button>
          <div className="hidden sm:block h-4 w-px bg-white/15 mx-1" />
          <nav className="hidden sm:flex items-center gap-1.5 text-xs lg:text-sm text-white/60" aria-label="Breadcrumb">
            <button onClick={() => setActiveTab('overview')} className="hover:text-[#E9C349] transition-colors font-medium">HR Portal</button>
            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
            <span className="font-semibold text-white">{TAB_LABELS[activeTab]}</span>
          </nav>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Badge variant="gold" className="hidden sm:inline-flex">{profile.currentPayrollMonth}</Badge>

          {/* Search trigger */}
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center justify-between gap-3 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/60 w-48 lg:w-52 transition-all"
            aria-label="Global search"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-white/50 shrink-0" />
              <span className="truncate">Search employees...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[10px] font-mono text-white/60">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>
          <button onClick={onOpenSearch} className="md:hidden p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(p => !p)}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              className="relative p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
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
                    className="absolute right-0 top-12 w-80 sm:w-96 bg-[#141617] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <span className="font-serif text-base font-bold text-white">Notifications</span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && <Badge variant="gold">{unreadCount} new</Badge>}
                        <button onClick={() => setNotifOpen(false)} className="p-1 rounded-full hover:bg-white/10 text-white/60 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                      {notifications.slice(0, 7).map(n => (
                        <button
                          key={n.id}
                          onClick={() => { onMarkRead(n.id); setNotifOpen(false); setActiveTab(n.tab); }}
                          className={`w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors flex gap-3 ${!n.read ? 'bg-white/[0.03]' : ''}`}
                        >
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-white/20' : NOTIF_DOT[n.type] ?? 'bg-[#E9C349]'}`} />
                          <div className="min-w-0">
                            <p className={`font-sans text-xs font-semibold ${n.read ? 'text-white/60' : 'text-white'}`}>{n.title}</p>
                            <p className="font-sans text-xs text-white/50 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="font-mono text-[10px] text-white/30 mt-1">{n.timestamp}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 border-t border-white/10">
                      <button onClick={() => { setActiveTab('notifications'); setNotifOpen(false); }} className="w-full text-center font-sans text-xs text-[#E9C349] hover:underline">
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
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#E9C349]/40 hover:border-[#E9C349]/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9C349]"
            aria-label="Settings"
          >
            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    </header>
  );
};
