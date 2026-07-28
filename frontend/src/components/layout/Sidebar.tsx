'use client';

import React from 'react';
import { NavTab, StudentProfile } from '../../types';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  CreditCard,
  BarChart3,
  HelpCircle,
  Settings,
  LogOut
} from 'lucide-react';
import { motion } from 'motion/react';
import { GESTURE, SPRING } from '@/src/lib/motion';
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
    { id: 'my_courses', label: 'My Courses', icon: <BookOpen className="w-5 h-5" />, badge: 'Sem 5' },
    { id: 'grades', label: 'Grades & Transcript', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'financials', label: 'Financials & Tuition', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'degree_audit', label: 'Degree Audit', icon: <BarChart3 className="w-5 h-5" />, badge: '85%' },
    { id: 'support', label: 'Support & Advising', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <aside
      aria-label="Harmony Main Navigation"
      className="h-screen w-20 xl:w-64 fixed left-0 top-0 ds-sidebar backdrop-blur-xl border-r flex-col py-6 px-3 xl:px-4 z-50 hidden md:!flex transition-all duration-300 shadow-xl"
    >
      {/* Harmony College Logo */}
      <div className="mb-8 px-2 flex items-center justify-between">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 text-left group focus:outline-none ds-focus-ring rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl text-[--text-inverse] flex items-center justify-center font-serif font-bold text-xl shadow-md shrink-0 group-hover:scale-105 transition-transform" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--brand-gold), var(--brand-gold-dark))' }}>
            H
          </div>
          <div className="hidden xl:block">
            <span className="font-serif text-xl font-bold tracking-tight block leading-none" style={{ color: 'var(--text-primary)' }}>
              Harmony
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold block mt-1" style={{ color: 'var(--brand-gold)' }}>
              College SIS
            </span>
          </div>
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1" role="navigation" aria-label="Student portal navigation">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
              className={`relative flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl font-sans text-sm font-medium transition-all group touch-target ${
                isActive ? 'ds-nav-item-active font-semibold' : 'ds-nav-item'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebarPill"
                  className="absolute inset-0 ds-nav-item-active-pill rounded-xl border-l-[3px]"
                  transition={SPRING.pill}
                />
              )}

              <span className={`relative z-10 ${isActive ? 'ds-nav-item-active' : 'ds-nav-item group-hover:text-[--text-primary] transition-colors'}`}>
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

      <div className="mt-auto ds-sidebar-divider border-t pt-4 space-y-1">
        <motion.button
          onClick={() => setActiveTab('settings')}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Settings"
          aria-current={activeTab === 'settings' ? 'page' : undefined}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl transition-all font-sans text-sm font-medium touch-target ${
            activeTab === 'settings' ? 'ds-nav-item-active-pill ds-nav-item-active font-semibold' : 'ds-nav-item'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="hidden xl:inline">Settings</span>
        </motion.button>

        <motion.button
          onClick={onLogout}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Log out"
          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl ds-logout-btn transition-colors font-sans text-sm font-medium touch-target"
        >
          <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="hidden xl:inline">Log Out</span>
        </motion.button>

        {/* Student Avatar Card */}
        <div className="flex items-center gap-3 px-2 pt-3 ds-sidebar-divider border-t mt-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 shrink-0 shadow-sm" style={{ borderColor: 'var(--accent-gold-border)' }}>
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden hidden xl:block">
            <p className="font-sans text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {profile.name}
            </p>
            <p className="font-mono text-[10px] ds-profile-id truncate">
              ID: {profile.id}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
