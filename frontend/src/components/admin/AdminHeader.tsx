'use client';

import React, { useState } from 'react';
import { AdminNavTab, AdminProfile, AdminNotification } from '../../types/admin';
import { Search, Bell, ChevronRight, Command, X, Zap, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';
import ThemeToggle from '../ThemeToggle';

interface AdminHeaderProps {
  activeTab: AdminNavTab;
  setActiveTab: (tab: AdminNavTab) => void;
  profile: AdminProfile;
  notifications: AdminNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onOpenSearch: () => void;
  academicYear: string;
  maintenanceMode: boolean;
  onMobileMenuToggle?: () => void;
}

const TAB_LABELS: Record<AdminNavTab, string> = {
  overview: 'Executive Dashboard', users: 'Users & Roles', students: 'Students',
  faculty: 'Faculty', departments: 'Departments', programs: 'Programs',
  admissions: 'Admissions', registrar: 'Registrar', attendance: 'Attendance',
  finance: 'Finance', hr: 'HR Management', payments: 'Payments',
  documents: 'Documents', reports: 'Reports', audit_logs: 'Audit Logs',
  security: 'Security Center', backup: 'Backup & Recovery',
  system_config: 'System Configuration', notifications: 'Notifications', settings: 'Settings',
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-rose-400', warning: 'bg-amber-400', info: 'bg-sky-400',
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab, setActiveTab, profile, notifications, unreadCount, onMarkRead, onOpenSearch, academicYear, maintenanceMode, onMobileMenuToggle,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      {/* Maintenance mode banner */}
      {maintenanceMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-[#0F0F10] text-xs font-mono font-bold text-center py-1.5 flex items-center justify-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          MAINTENANCE MODE ACTIVE — Only administrators can access the system
        </div>
      )}

      <header className={`sticky z-40 w-full ds-header backdrop-blur-xl border-b h-14 flex items-center md:pl-16 xl:pl-60 transition-all duration-300 ${maintenanceMode ? 'top-7' : 'top-0'}`}>
        <div className="flex justify-between items-center w-full px-4 sm:px-5 py-2">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onMobileMenuToggle && (
              <button
                onClick={onMobileMenuToggle}
                className="p-1.5 md:hidden border rounded-lg transition-colors"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
                aria-label="Toggle Navigation Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setActiveTab('overview')} className="font-serif text-base sm:text-xl font-bold tracking-tight hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
              Harmony <span style={{ color: 'var(--brand-gold)' }}>Admin</span>
            </button>
            <div className="hidden sm:block h-3.5 w-px mx-1" style={{ backgroundColor: 'var(--border-strong)' }} />
            <nav className="hidden sm:flex items-center gap-1 text-xs" aria-label="Breadcrumb" style={{ color: 'var(--text-muted)' }}>
              <button onClick={() => setActiveTab('overview')} className="hover:text-[--brand-gold] transition-colors font-medium">Portal</button>
              <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
              <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{TAB_LABELS[activeTab]}</span>
            </nav>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Badge variant="gold" className="hidden sm:inline-flex text-[10px]">{academicYear}</Badge>

            <button onClick={onOpenSearch}
              className="hidden md:flex items-center justify-between gap-2 px-3 py-1.5 ds-search border rounded-full text-[11px] w-40 lg:w-48 transition-all"
              aria-label="Global search">
              <div className="flex items-center gap-1.5 truncate">
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-faint)' }} />
                <span className="truncate">Search anything...</span>
              </div>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1 py-0.5 border rounded text-[9px] font-mono" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}>
                <Command className="w-2 h-2" />K
              </kbd>
            </button>
            <button onClick={onOpenSearch} className="md:hidden p-2 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }} aria-label="Search">
              <Search className="w-4 h-4 " aria-hidden="true" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(p => !p)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                className="relative p-1.5 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}>
                <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] font-mono font-bold" style={{ backgroundColor: 'var(--status-danger)' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 top-10 w-80 sm:w-96 ds-notif-panel border rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-3.5 ds-notif-panel-header border-b flex items-center justify-between">
                        <span className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>System Notifications</span>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && <Badge variant="rose" className="text-[9px]">{unreadCount} new</Badge>}
                          <button onClick={() => setNotifOpen(false)} className="p-1 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y ds-notif-item">
                        {notifications.slice(0, 8).map(n => (
                          <button key={n.id} onClick={() => { onMarkRead(n.id); setNotifOpen(false); setActiveTab(n.tab); }}
                            className={`w-full text-left px-4 py-3 ds-notif-item transition-colors flex gap-2.5 ${!n.read ? '' : ''}`} style={{ backgroundColor: !n.read ? 'var(--hover-overlay)' : 'transparent' }}>
                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? '' : ''}`} style={{ backgroundColor: n.read ? 'var(--text-faint)' : SEVERITY_DOT[n.severity] }} />
                            <div className="min-w-0">
                              <p className={`font-sans text-xs font-semibold ds-notif-title ${n.read ? 'opacity-60' : ''}`}>{n.title}</p>
                              <p className="font-sans text-[11px] ds-notif-meta leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="font-mono text-[9px] ds-notif-meta mt-1 opacity-50">{n.timestamp}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="p-3 ds-notif-panel-header border-t">
                        <button onClick={() => { setActiveTab('notifications'); setNotifOpen(false); }} className="w-full text-center font-sans text-[11px] hover:underline" style={{ color: 'var(--brand-gold)' }}>
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

            <button onClick={() => setActiveTab('settings')}
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#E9C349]/40 hover:border-[#E9C349]/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9C349]"
              aria-label="Settings">
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
