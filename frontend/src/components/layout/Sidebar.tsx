'use client';

import React from 'react';
import { NavTab, StudentProfile } from '../../types';
import {
  LayoutDashboard,
  UserCheck,
  GraduationCap,
  CreditCard,
  BarChart3,
  HelpCircle,
  Settings,
  LogOut
} from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '../ui/Badge';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  profile: StudentProfile;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  onLogout
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'registration', label: 'Course Registration', icon: <UserCheck className="w-5 h-5" />, badge: 'Fall 24' },
    { id: 'grades', label: 'Grades & Transcript', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'financials', label: 'Financials & Tuition', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'degree_audit', label: 'Degree Audit', icon: <BarChart3 className="w-5 h-5" />, badge: '85%' },
    { id: 'support', label: 'Support & Advising', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <aside
      aria-label="Harmony Main Navigation"
      className="h-screen w-20 xl:w-64 fixed left-0 top-0 bg-[#0F0F10]/95 backdrop-blur-xl border-r border-white/10 flex-col py-6 px-3 xl:px-4 z-50 hidden md:!flex transition-all duration-300 shadow-xl"
    >
      {/* Harmony College Logo */}
      <div className="mb-8 px-2 flex items-center justify-between">
      <button
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9C349] rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#E9C349] to-[#b8951d] text-[#0F0F10] flex items-center justify-center font-serif font-bold text-xl shadow-md shrink-0 group-hover:scale-105 transition-transform">
            H
          </div>
          <div className="hidden xl:block">
            <span className="font-serif text-xl font-bold text-white tracking-tight block leading-none">
              Harmony
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#E9C349] font-bold block mt-1">
              College SIS
            </span>
          </div>
        </button>
      </div>

      {/* Main Navigation Links */}
  <nav className="flex-1 flex flex-col gap-1" role="navigation">
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
                isActive
                  ? 'text-[#E9C349] font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebarPill"
                  className="absolute inset-0 bg-[#E9C349]/12 rounded-xl border-l-[3px] border-[#E9C349]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <span className={`relative z-10 ${isActive ? 'text-[#E9C349]' : 'text-white/50 group-hover:text-white transition-colors'}`}>
                {item.icon}
              </span>
              
              <span className="relative z-10 hidden xl:inline truncate flex-1">{item.label}</span>

              {item.badge && (
                <Badge variant="gold" className="relative z-10 hidden xl:inline-block text-[10px]">
                  {item.badge}
                </Badge>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Profile and Settings Section */}
      <div className="mt-auto border-t border-white/10 pt-4 space-y-1.5">
        <motion.button
          onClick={() => setActiveTab('settings')}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl transition-all font-sans text-sm font-medium touch-target ${
            activeTab === 'settings'
              ? 'bg-[#E9C349]/15 text-[#E9C349] font-semibold'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5 text-white/50" />
          <span className="hidden xl:inline">Settings</span>
        </motion.button>

        <motion.button
          onClick={onLogout}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl text-[#ff897d] hover:bg-[#ffdad6]/10 transition-colors font-sans text-sm font-medium touch-target"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden xl:inline">Log Out</span>
        </motion.button>

        {/* Student Avatar Card */}
        <div className="flex items-center gap-3 px-2 pt-3 border-t border-white/5 mt-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#E9C349]/40 shrink-0 shadow-sm">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden hidden xl:block">
            <p className="font-sans text-xs font-semibold text-white truncate">
              {profile.name}
            </p>
            <p className="font-mono text-[10px] text-white/50 truncate">
              ID: {profile.id}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
