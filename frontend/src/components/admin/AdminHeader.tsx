'use client';

import React, { useState } from 'react';
import { AdminNavTab, AdminProfile, AdminNotification } from '../../types/admin';
import { Search, Bell, ChevronRight, Command, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';

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
  activeTab, setActiveTab, profile, notifications, unreadCount, onMarkRead, onOpenSearch, academicYear, maintenanceMode,
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

      <header className={`sticky z-40 w-full bg-[#0F0F10]/92 backdrop-blur-xl border-b border-white/8 h-14 flex items-center md:pl-16 xl:pl-60 transition-all duration-300 ${maintenanceMode ? 'top-7' : 'top-0'}`}>
        <div className="flex justify-between items-center w-full px-4 sm:px-5 py-2">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setActiveTab('overview')} className="font-serif text-base sm:text-xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
              Harmony <span className="text-[#E9C349]">Admin</span>
            </button>
            <div className="hidden sm:block h-3.5 w-px bg-white/15 mx-1" />
            <nav className="hidden sm:flex items-center gap-1 text-xs text-white/50" aria-label="Breadcrumb">
              <button onClick={() => setActiveTab('overview')} className="hover:text-[#E9C349] transition-colors font-medium">Portal</button>
              <ChevronRight className="w-3 h-3 text-white/30" />
              <span className="font-semibold text-white text-xs">{TAB_LABELS[activeTab]}</span>
            </nav>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Badge variant="gold" className="hidden sm:inline-flex text-[10px]">{academicYear}</Badge>

            <button onClick={onOpenSearch}
              className="hidden md:flex items-center justify-between gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] text-white/55 w-40 lg:w-48 transition-all"
              aria-label="Global search">
              <div className="flex items-center gap-1.5 truncate">
                <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <span className="truncate">Search anything...</span>
              </div>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1 py-0.5 bg-white/10 border border-white/10 rounded text-[9px] font-mono text-white/40">
                <Command className="w-2 h-2" />K
              </kbd>
            </button>
            <button onClick={onOpenSearch} className="md:hidden p-2 rounded-full hover:bg-white/10 text-white/60 transition-colors" aria-label="Search">
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(p => !p)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                className="relative p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center text-white text-[8px] font-mono font-bold">
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
                      className="absolute right-0 top-10 w-80 sm:w-96 bg-[#141617] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
                        <span className="font-serif text-sm font-bold text-white">System Notifications</span>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && <Badge variant="rose" className="text-[9px]">{unreadCount} new</Badge>}
                          <button onClick={() => setNotifOpen(false)} className="p-1 rounded-full hover:bg-white/10 text-white/50 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                        {notifications.slice(0, 8).map(n => (
                          <button key={n.id} onClick={() => { onMarkRead(n.id); setNotifOpen(false); setActiveTab(n.tab); }}
                            className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex gap-2.5 ${!n.read ? 'bg-white/[0.02]' : ''}`}>
                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? 'bg-white/20' : SEVERITY_DOT[n.severity]}`} />
                            <div className="min-w-0">
                              <p className={`font-sans text-xs font-semibold ${n.read ? 'text-white/55' : 'text-white'}`}>{n.title}</p>
                              <p className="font-sans text-[11px] text-white/45 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="font-mono text-[9px] text-white/25 mt-1">{n.timestamp}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="p-3 border-t border-white/10">
                        <button onClick={() => { setActiveTab('notifications'); setNotifOpen(false); }} className="w-full text-center font-sans text-[11px] text-[#E9C349] hover:underline">
                          View all notifications
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

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
