'use client';

import React from 'react';
import { AdminNavTab, AdminProfile } from '../../types/admin';
import {
  LayoutDashboard, Users, GraduationCap, UserCheck, Building2, BookOpen,
  ClipboardList, CalendarCheck, DollarSign, Users2, CreditCard, FolderOpen,
  BarChart3, FileText, Shield, HardDrive, Settings2, Bell, Settings, LogOut,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '../ui/Badge';

interface AdminSidebarProps {
  activeTab: AdminNavTab;
  setActiveTab: (tab: AdminNavTab) => void;
  profile: AdminProfile;
  unreadCount: number;
  onLogout: () => void;
}

type NavItem = { id: AdminNavTab; label: string; icon: React.ReactNode; badge?: string; badgeVariant?: 'gold'|'rose'|'amber'|'emerald'; group?: string };

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',       label: 'Dashboard',          icon: <LayoutDashboard className="w-4 h-4" />, group: 'executive' },
  { id: 'users',          label: 'Users & Roles',      icon: <Users className="w-4 h-4" />,           group: 'identity' },
  { id: 'students',       label: 'Students',           icon: <GraduationCap className="w-4 h-4" />,   group: 'identity' },
  { id: 'faculty',        label: 'Faculty',            icon: <UserCheck className="w-4 h-4" />,        group: 'identity' },
  { id: 'departments',    label: 'Departments',        icon: <Building2 className="w-4 h-4" />,        group: 'academic' },
  { id: 'programs',       label: 'Programs',           icon: <BookOpen className="w-4 h-4" />,         group: 'academic' },
  { id: 'admissions',     label: 'Admissions',         icon: <ClipboardList className="w-4 h-4" />,    group: 'academic' },
  { id: 'registrar',      label: 'Registrar',          icon: <FileText className="w-4 h-4" />,         group: 'academic' },
  { id: 'attendance',     label: 'Attendance',         icon: <CalendarCheck className="w-4 h-4" />,    group: 'academic' },
  { id: 'finance',        label: 'Finance',            icon: <DollarSign className="w-4 h-4" />,       group: 'operations' },
  { id: 'hr',             label: 'HR',                 icon: <Users2 className="w-4 h-4" />,           group: 'operations' },
  { id: 'payments',       label: 'Payments',           icon: <CreditCard className="w-4 h-4" />,       group: 'operations' },
  { id: 'documents',      label: 'Documents',          icon: <FolderOpen className="w-4 h-4" />,       group: 'operations' },
  { id: 'reports',        label: 'Reports',            icon: <BarChart3 className="w-4 h-4" />,        group: 'operations' },
  { id: 'audit_logs',     label: 'Audit Logs',         icon: <FileText className="w-4 h-4" />,         group: 'system' },
  { id: 'security',       label: 'Security',           icon: <Shield className="w-4 h-4" />,           group: 'system' },
  { id: 'backup',         label: 'Backup & Recovery',  icon: <HardDrive className="w-4 h-4" />,        group: 'system' },
  { id: 'system_config',  label: 'System Config',      icon: <Settings2 className="w-4 h-4" />,        group: 'system' },
];

const GROUP_LABELS: Record<string, string> = {
  executive: 'Executive',
  identity: 'Identity',
  academic: 'Academic',
  operations: 'Operations',
  system: 'System',
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab, setActiveTab, profile, unreadCount, onLogout,
}) => {
  const groups = Array.from(new Set(NAV_ITEMS.map(n => n.group)));

  return (
    <aside
      aria-label="Super Admin Navigation"
      className="h-screen w-16 xl:w-60 fixed left-0 top-0 bg-[#0F0F10]/98 backdrop-blur-xl border-r border-white/8 flex-col py-4 px-2 xl:px-3 z-50 hidden md:flex! transition-all duration-300 shadow-2xl overflow-y-auto"
    >
      {/* Logo */}
      <div className="mb-5 px-1.5 flex items-center gap-2.5 shrink-0">
        <button onClick={() => setActiveTab('overview')} className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9C349] rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#E9C349] to-[#b8951d] text-[#0F0F10] flex items-center justify-center font-serif font-bold text-lg shadow-md shrink-0 group-hover:scale-105 transition-transform">
            H
          </div>
          <div className="hidden xl:block">
            <span className="font-serif text-base font-bold text-white tracking-tight block leading-none">Harmony</span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#E9C349] font-bold block mt-0.5">Super Admin</span>
          </div>
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-4" role="navigation">
        {groups.map(group => (
          <div key={group}>
            <p className="hidden xl:block font-mono text-[9px] uppercase tracking-widest text-white/25 px-2 mb-1">{GROUP_LABELS[group]}</p>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter(n => n.group === group).map(item => {
                const isActive = activeTab === item.id;
                const badge = item.id === 'notifications' && unreadCount > 0 ? String(unreadCount) : item.badge;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.97 }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-lg font-sans text-xs font-medium transition-all group touch-target ${
                      isActive ? 'text-[#E9C349] font-semibold' : 'text-white/55 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="adminActivePill"
                        className="absolute inset-0 bg-[#E9C349]/10 rounded-lg border-l-[2px] border-[#E9C349]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 shrink-0 ${isActive ? 'text-[#E9C349]' : 'text-white/40 group-hover:text-white transition-colors'}`}>
                      {item.icon}
                    </span>
                    <span className="relative z-10 hidden xl:inline truncate flex-1">{item.label}</span>
                    {badge && (
                      <Badge variant={item.badgeVariant ?? 'rose'} className="relative z-10 hidden xl:inline-block text-[9px] py-0 shrink-0">
                        {badge}
                      </Badge>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mt-3 border-t border-white/8 pt-3 space-y-0.5 shrink-0">
        <motion.button onClick={() => setActiveTab('notifications')} whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
          className={`relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-sans text-xs font-medium transition-all touch-target ${activeTab === 'notifications' ? 'bg-[#E9C349]/10 text-[#E9C349]' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}>
          <Bell className="w-4 h-4 shrink-0" />
          <span className="hidden xl:inline">Notifications</span>
          {unreadCount > 0 && <Badge variant="rose" className="hidden xl:inline-block text-[9px] py-0">{unreadCount}</Badge>}
        </motion.button>
        <motion.button onClick={() => setActiveTab('settings')} whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-sans text-xs font-medium transition-all touch-target ${activeTab === 'settings' ? 'bg-[#E9C349]/10 text-[#E9C349]' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}>
          <Settings className="w-4 h-4 shrink-0" />
          <span className="hidden xl:inline">Settings</span>
        </motion.button>
        <motion.button onClick={onLogout} whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-rose-400 hover:bg-rose-950/30 transition-colors font-sans text-xs font-medium touch-target">
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden xl:inline">Log Out</span>
        </motion.button>
        <div className="flex items-center gap-2.5 px-1.5 pt-2.5 border-t border-white/5 mt-1">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#E9C349]/40 shrink-0">
            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden hidden xl:block">
            <p className="font-sans text-xs font-semibold text-white truncate">{profile.name}</p>
            <p className="font-mono text-[9px] text-[#E9C349] truncate">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
