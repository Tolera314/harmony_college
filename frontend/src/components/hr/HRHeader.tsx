'use client';

import React, { useState } from 'react';
import { HRNavTab, HROfficerProfile, HRNotification } from '../../types/hr';
import { Search, Bell, ChevronRight, Command, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';
import ThemeToggle from '../ThemeToggle';

interface HRHeaderProps {
  activeTab: HRNavTab;
  setActiveTab: (tab: HRNavTab) => void;
  profile: HROfficerProfile;
  notifications: HRNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onOpenSearch: () => void;
  onMobileMenuToggle?: () => void;
}

const TAB_LABELS: Record<HRNavTab, string> = {
  overview: 'Dashboard', employees: 'Employees', onboarding: 'Onboarding',
  leave: 'Leave Management', payroll: 'Payroll', performance: 'Performance',
  documents: 'Documents', reports: 'Reports', notifications: 'Notifications',
  audit_log: 'Audit Logs', settings: 'Settings', messages: 'Messages',
};

const NOTIF_DOT: Record<string, string> = {
  leave: 'var(--status-warning)', payroll: 'var(--brand-gold)',
  performance: 'var(--status-info)', contract: 'var(--status-danger)',
  onboarding: 'var(--status-success)', system: 'var(--text-faint)',
};

export const HRHeader: React.FC<HRHeaderProps> = ({
  activeTab, setActiveTab, profile, notifications, unreadCount, onMarkRead, onOpenSearch, onMobileMenuToggle,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full ds-header backdrop-blur-xl border-b h-16 flex items-center transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 sm:px-6 py-3">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="p-2 md:hidden bg-(--hover-overlay) border border-(--border-default) rounded-xl text-(--text-primary) hover:text-[#E9C349] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <button onClick={() => setActiveTab('overview')} className="font-serif text-lg sm:text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
            Harmony <span style={{ color: 'var(--brand-gold)' }}>College</span>
          </button>
          <div className="hidden sm:block h-4 w-px mx-1" style={{ backgroundColor: 'var(--border-strong)' }} />
          <nav className="hidden sm:flex items-center gap-1.5 text-xs lg:text-sm" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <button onClick={() => setActiveTab('overview')} className="hover:text-[--brand-gold] transition-colors font-medium">HR Portal</button>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" style={{ color: 'var(--text-faint)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{TAB_LABELS[activeTab]}</span>
          </nav>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Badge variant="gold" className="hidden sm:inline-flex">{profile.currentPayrollMonth}</Badge>

          <button onClick={onOpenSearch}
            className="hidden md:flex items-center justify-between gap-3 px-3.5 py-1.5 ds-search border rounded-full text-xs w-48 lg:w-52 transition-all"
            aria-label="Global search">
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-faint)' }} />
              <span className="truncate">Search employees...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 border rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}>
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>
          <button onClick={onOpenSearch} className="md:hidden p-2 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }} aria-label="Search">
            <Search className="w-5 h-5 " aria-hidden="true" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button onClick={() => setNotifOpen(p => !p)}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              className="relative p-2 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}>
              <Bell className="w-5 h-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold" style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--text-inverse)' }}>
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
                      <span className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && <Badge variant="gold">{unreadCount} new</Badge>}
                        <button onClick={() => setNotifOpen(false)} className="p-1 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4 " aria-hidden="true" /></button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y ds-notif-item">
                      {notifications.slice(0, 7).map(n => (
                        <button key={n.id}
                          onClick={() => { onMarkRead(n.id); setNotifOpen(false); setActiveTab(n.tab); }}
                          className="w-full text-left px-4 py-3.5 ds-notif-item transition-colors flex gap-3"
                          style={{ backgroundColor: !n.read ? 'var(--hover-overlay)' : 'transparent' }}>
                          <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: n.read ? 'var(--text-faint)' : NOTIF_DOT[n.type] ?? 'var(--brand-gold)' }} />
                          <div className="min-w-0">
                            <p className="font-sans text-xs font-semibold ds-notif-title" style={{ opacity: n.read ? 0.6 : 1 }}>{n.title}</p>
                            <p className="font-sans text-xs ds-notif-meta leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="font-mono text-[10px] ds-notif-meta mt-1 opacity-50">{n.timestamp}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-3 ds-notif-panel-header border-t">
                      <button onClick={() => { setActiveTab('notifications'); setNotifOpen(false); }} className="w-full text-center font-sans text-xs hover:underline" style={{ color: 'var(--brand-gold)' }}>
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
          <button onClick={() => setActiveTab('settings')}
            className="w-9 h-9 rounded-full overflow-hidden border-2 transition-colors focus:outline-none ds-focus-ring"
            style={{ borderColor: 'var(--accent-gold-border)' }}
            aria-label="Settings">
            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    </header>
  );
};
