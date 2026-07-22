'use client';

import React, { useState } from 'react';
import { DHNavTab, DHProfile, DHNotification } from '../../types/department';
import { Search, Bell, ChevronRight, Command, X, BookOpen, Users, GraduationCap, CheckSquare, BarChart3, CalendarCheck, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';
import { courses, faculty, students } from '../../data/departmentData';

interface DHHeaderProps {
  activeTab: DHNavTab;
  setActiveTab: (tab: DHNavTab) => void;
  profile: DHProfile;
  notifications: DHNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onOpenSearch: () => void;
  semesterLabel: string;
}

const tabLabels: Record<DHNavTab, string> = {
  overview: 'Dashboard Overview', courses: 'Course Offerings', faculty: 'Faculty Management',
  students: 'Student Performance', reports: 'Department Reports', attendance: 'Attendance Tracking',
  approvals: 'Approval Center', leave_requests: 'Faculty Leave Requests',
  notifications: 'Notification Center', audit_log: 'Audit Log', settings: 'Settings',
};

export const DHHeader: React.FC<DHHeaderProps> = ({
  activeTab, setActiveTab, profile, notifications, unreadCount, onMarkRead, onOpenSearch, semesterLabel,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read);

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
            <button onClick={() => setActiveTab('overview')} className="hover:text-[#E9C349] transition-colors font-medium">Portal</button>
            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
            <span className="font-semibold text-white">{tabLabels[activeTab]}</span>
          </nav>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Semester badge */}
          <Badge variant="gold" className="hidden sm:inline-flex">{semesterLabel}</Badge>

          {/* Search trigger */}
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center justify-between gap-3 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/60 w-48 lg:w-56 transition-all"
            aria-label="Global search"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-white/50" />
              <span className="truncate">Search faculty, courses...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[10px] font-mono text-white/60">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
          <button onClick={onOpenSearch} className="md:hidden p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((p) => !p)}
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
                      {notifications.slice(0, 8).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => { onMarkRead(n.id); setNotifOpen(false); setActiveTab(n.module); }}
                          className={`w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors flex gap-3 ${!n.read ? 'bg-white/3' : ''}`}
                        >
                          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-white/20' : n.type === 'alert' || n.type === 'warning' ? 'bg-amber-400' : 'bg-[#E9C349]'}`} />
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
