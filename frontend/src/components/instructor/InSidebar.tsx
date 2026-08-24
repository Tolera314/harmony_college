'use client';

import React from 'react';
import { InstructorNavTab, InstructorProfile } from '../../types/instructor';
import {
  LayoutDashboard, BookOpen, CalendarCheck, CalendarDays, GraduationCap, ClipboardList,
  FolderOpen, Megaphone, BarChart3, Bell, FileText, Settings, LogOut,
  ClipboardCheck, HelpCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ChatSidebarButton } from '../chat/ChatSidebarButton';
import { GESTURE, SPRING } from '@/src/lib/motion';
import { Badge } from '../ui/Badge';

interface InSidebarProps {
  activeTab: InstructorNavTab;
  setActiveTab: (tab: InstructorNavTab) => void;
  profile: InstructorProfile;
  unreadCount: number;
  pendingGrades: number;
  activeSession: boolean;
  onLogout: () => void;
}

type NavItem = {
  id: InstructorNavTab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'gold' | 'rose' | 'amber' | 'emerald';
};

export const InSidebar: React.FC<InSidebarProps> = ({
  activeTab, setActiveTab, profile, unreadCount, pendingGrades, activeSession, onLogout,
}) => {
  const navItems: NavItem[] = [
    { id: 'overview',       label: 'Dashboard',        icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'my_classes',     label: 'My Classes',       icon: <BookOpen className="w-5 h-5" /> },
    { id: 'schedule',       label: 'My Schedule',      icon: <CalendarDays className="w-5 h-5" /> },
    {
      id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-5 h-5" />,
      badge: activeSession ? 'Live' : undefined, badgeVariant: 'emerald',
    },
    { id: 'students',       label: 'Students',         icon: <GraduationCap className="w-5 h-5" /> },
    {
      id: 'grades', label: 'Grades', icon: <ClipboardList className="w-5 h-5" />,
      badge: pendingGrades > 0 ? String(pendingGrades) : undefined, badgeVariant: 'gold',
    },
    { id: 'assignments',    label: 'Assignments',      icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: 'quizzes',        label: 'Quizzes & Exams',  icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'materials',      label: 'Course Materials', icon: <FolderOpen className="w-5 h-5" /> },
    { id: 'announcements',  label: 'Announcements',    icon: <Megaphone className="w-5 h-5" /> },
    { id: 'reports',        label: 'Reports',          icon: <BarChart3 className="w-5 h-5" /> },
    {
      id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" />,
      badge: unreadCount > 0 ? String(unreadCount) : undefined, badgeVariant: 'rose',
    },
    { id: 'audit_log',      label: 'Audit Log',        icon: <FileText className="w-5 h-5" /> },
  ];

  return (
    <aside
      aria-label="Instructor Navigation"
      className="h-screen w-20 xl:w-64 fixed left-0 top-0 ds-sidebar backdrop-blur-xl border-r flex-col py-6 px-3 xl:px-4 z-50 hidden md:!flex transition-all duration-300 shadow-xl"
    >
      {/* Logo + role badge */}
      <div className="mb-7 px-2">
        <button onClick={() => setActiveTab('overview')} className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9C349] rounded-xl">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#E9C349]/50 shrink-0 group-hover:scale-105 transition-transform shadow-md">
            <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
          </div>
          <div className="hidden xl:block">
            <span className="font-serif text-xl font-bold tracking-tight block leading-none" style={{ color: 'var(--text-primary)' }}>Harmony</span>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold block mt-1" style={{ color: 'var(--brand-gold)' }}>Instructor</span>
          </div>
        </button>

        <div className="hidden xl:block mt-4 px-1">
          <div className="p-3 ds-role-badge border rounded-xl">
            <p className="font-sans text-[11px] font-semibold ds-role-badge-text leading-tight truncate">{profile.specialization}</p>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--brand-gold)' }}>{profile.currentSemester}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto" role="navigation">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label} title={item.label} className={`relative flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl font-sans text-sm font-medium transition-all group touch-target ${
                isActive ? 'ds-nav-item-active font-semibold' : 'ds-nav-item'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="inActivePill"
                  className="absolute inset-0 ds-nav-item-active-pill rounded-xl border-l-[3px]"
                  transition={SPRING.pill}
                />
              )}
              <span className={`relative z-10 shrink-0 ${isActive ? 'ds-nav-item-active' : 'ds-nav-item group-hover:text-[--text-primary] transition-colors'}`}>
                {item.icon}
              </span>
              <span className="relative z-10 hidden xl:inline truncate flex-1">{item.label}</span>
              {item.badge && (
                <Badge variant={item.badgeVariant ?? 'gold'} className="relative z-10 hidden xl:inline-block text-[10px] py-0 shrink-0">
                  {item.badge}
                </Badge>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto ds-sidebar-divider border-t pt-4 space-y-1 shrink-0">
        <ChatSidebarButton variant="expanded" accent="#E9C349" isActive={activeTab === 'messages'} onClick={() => setActiveTab('messages' as any)} />
        <motion.button
          onClick={() => setActiveTab('settings')}
          whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl transition-all font-sans text-sm font-medium touch-target ${
            activeTab === 'settings' ? 'ds-nav-item-active-pill ds-nav-item-active' : 'ds-nav-item'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="hidden xl:inline">Settings</span>
        </motion.button>
        <motion.button
          onClick={onLogout}
          whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl ds-logout-btn transition-colors font-sans text-sm font-medium touch-target"
        >
          <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="hidden xl:inline">Log Out</span>
        </motion.button>

        <div className="flex items-center gap-3 px-2 pt-3 ds-sidebar-divider border-t mt-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: 'var(--accent-gold-border)' }}>
            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden hidden xl:block">
            <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{profile.name}</p>
            <p className="font-mono text-[10px] ds-profile-id truncate">{profile.employeeId}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
