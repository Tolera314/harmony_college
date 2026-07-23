'use client';

import React from 'react';
import { HRNavTab, HROfficerProfile } from '../../types/hr';
import {
  LayoutDashboard, Users, UserPlus, CalendarCheck, Banknote,
  TrendingUp, FolderOpen, BarChart3, Bell, ClipboardList, Settings, LogOut,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '../ui/Badge';

interface HRSidebarProps {
  activeTab: HRNavTab;
  setActiveTab: (tab: HRNavTab) => void;
  profile: HROfficerProfile;
  unreadCount: number;
  pendingLeave: number;
  onLogout: () => void;
}

type NavItem = { id: HRNavTab; label: string; icon: React.ReactNode; badge?: string; badgeVariant?: 'gold'|'rose'|'amber' };

export const HRSidebar: React.FC<HRSidebarProps> = ({
  activeTab, setActiveTab, profile, unreadCount, pendingLeave, onLogout,
}) => {
  const navItems: NavItem[] = [
    { id: 'overview',    label: 'Dashboard',         icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'employees',   label: 'Employees',         icon: <Users className="w-5 h-5" /> },
    { id: 'onboarding',  label: 'Onboarding',        icon: <UserPlus className="w-5 h-5" /> },
    {
      id: 'leave',       label: 'Leave Management',  icon: <CalendarCheck className="w-5 h-5" />,
      badge: pendingLeave > 0 ? String(pendingLeave) : undefined, badgeVariant: 'amber',
    },
    { id: 'payroll',     label: 'Payroll',           icon: <Banknote className="w-5 h-5" /> },
    { id: 'performance', label: 'Performance',       icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'documents',   label: 'Documents',         icon: <FolderOpen className="w-5 h-5" /> },
    { id: 'reports',     label: 'Reports',           icon: <BarChart3 className="w-5 h-5" /> },
    {
      id: 'notifications', label: 'Notifications',  icon: <Bell className="w-5 h-5" />,
      badge: unreadCount > 0 ? String(unreadCount) : undefined, badgeVariant: 'rose',
    },
    { id: 'audit_log',   label: 'Audit Logs',        icon: <ClipboardList className="w-5 h-5" /> },
  ];

  return (
    <aside
      aria-label="HR Navigation"
      className="h-screen w-20 xl:w-64 fixed left-0 top-0 bg-[#0F0F10]/95 backdrop-blur-xl border-r border-white/10 flex-col py-6 px-3 xl:px-4 z-50 hidden md:flex! transition-all duration-300 shadow-xl"
    >
      {/* Logo */}
      <div className="mb-7 px-2">
        <button
          onClick={() => setActiveTab('overview')}
          className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9C349] rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#E9C349] to-[#b8951d] text-[#0F0F10] flex items-center justify-center font-serif font-bold text-xl shadow-md shrink-0 group-hover:scale-105 transition-transform">
            H
          </div>
          <div className="hidden xl:block">
            <span className="font-serif text-xl font-bold text-white tracking-tight block leading-none">Harmony</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#E9C349] font-bold block mt-1">HR Officer</span>
          </div>
        </button>

        {/* Role context badge */}
        <div className="hidden xl:block mt-4 px-1">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="font-sans text-[11px] font-semibold text-white/80 leading-tight">{profile.department}</p>
            <p className="font-mono text-[10px] text-[#E9C349] mt-0.5">{profile.currentPayrollMonth}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
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
              className={`relative flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl font-sans text-sm font-medium transition-all group touch-target ${
                isActive ? 'text-[#E9C349] font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="hrActivePill"
                  className="absolute inset-0 bg-[#E9C349]/12 rounded-xl border-l-[3px] border-[#E9C349]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 shrink-0 ${isActive ? 'text-[#E9C349]' : 'text-white/50 group-hover:text-white transition-colors'}`}>
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
      <div className="mt-auto border-t border-white/10 pt-4 space-y-1 shrink-0">
        <motion.button
          onClick={() => setActiveTab('settings')}
          whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl transition-all font-sans text-sm font-medium touch-target ${
            activeTab === 'settings' ? 'bg-[#E9C349]/12 text-[#E9C349]' : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className="hidden xl:inline">Settings</span>
        </motion.button>
        <motion.button
          onClick={onLogout}
          whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl text-rose-400 hover:bg-rose-950/30 transition-colors font-sans text-sm font-medium touch-target"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden xl:inline">Log Out</span>
        </motion.button>

        {/* Profile chip */}
        <div className="flex items-center gap-3 px-2 pt-3 border-t border-white/5 mt-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#E9C349]/40 shrink-0">
            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden hidden xl:block">
            <p className="font-sans text-xs font-semibold text-white truncate">{profile.name}</p>
            <p className="font-mono text-[10px] text-white/50 truncate">{profile.employeeId}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
