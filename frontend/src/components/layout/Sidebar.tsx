'use client';

import React from 'react';
import { NavTab, StudentProfile } from '../../types';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  CreditCard,
  BarChart3,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  UserCheck,
  ShoppingBag
} from 'lucide-react';
import { motion } from 'motion/react';
import { GESTURE, SPRING } from '@/src/lib/motion';
import { Badge } from '../ui/Badge';
import { ChatSidebarButton } from '../chat/ChatSidebarButton';

export interface GenericNavItem<T extends string = string> {
  id: T;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'gold' | 'rose' | 'amber' | 'emerald';
}

interface SidebarProps<T extends string = NavTab> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  profile?: {
    name?: string;
    id?: string;
    avatar?: string;
    major?: string;
    department?: string;
    employeeId?: string;
  };
  navItems?: GenericNavItem<T>[];
  portalTitle?: string;
  onLogout?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const defaultStudentNavItems: GenericNavItem<NavTab>[] = [
  { id: 'dashboard',    label: 'Dashboard',            icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'my_courses',   label: 'My Courses',           icon: <BookOpen className="w-5 h-5" />, badge: 'Fall 24' },
  { id: 'timetable',    label: 'My Timetable',         icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'assignments',  label: 'Assignments',          icon: <ClipboardList className="w-5 h-5" />, badge: '3 Due', badgeVariant: 'amber' },
  { id: 'quizzes',      label: 'Quizzes & Exams',      icon: <HelpCircle className="w-5 h-5" /> },
  { id: 'grades',       label: 'Grades & Transcript',  icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'financials',   label: 'Financials & Tuition', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'degree_audit', label: 'Degree Audit',         icon: <BarChart3 className="w-5 h-5" />, badge: '85%' },
  { id: 'support',      label: 'Support & Advising',   icon: <HelpCircle className="w-5 h-5" /> },
];

export const Sidebar = <T extends string = NavTab>({
  activeTab,
  setActiveTab,
  profile,
  navItems,
  portalTitle = 'College SIS',
  onLogout,
  collapsed = false,
  onToggleCollapse
}: SidebarProps<T>) => {
  const items = (navItems ?? defaultStudentNavItems) as GenericNavItem<T>[];

  return (
    <aside
      aria-label="Harmony Navigation"
      className={`h-screen fixed left-0 top-0 ds-sidebar backdrop-blur-xl border-r border-(--border-default) flex-col py-6 px-3 xl:px-4 z-50 hidden md:!flex transition-all duration-300 shadow-xl ${collapsed ? 'w-20' : 'w-20 xl:w-64'
        }`}
    >
      {/* Harmony College Logo */}
      <div className="mb-6 px-2 flex items-center justify-between">
        <button
          onClick={() => setActiveTab(items[0]?.id)}
          className="flex items-center gap-3 text-left group focus:outline-none ds-focus-ring rounded-xl"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#E9C349]/50 shrink-0 group-hover:scale-105 transition-transform shadow-md">
            <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="hidden xl:block">
              <span className="font-serif text-xl font-bold tracking-tight block leading-none text-(--text-primary)">
                Harmony
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold block mt-1 text-(--brand-gold)">
                {portalTitle}
              </span>
            </div>
          )}
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg transition-colors border border-transparent hover:border-(--border-default) text-(--text-faint) hover:text-(--text-primary) hover:bg-(--hover-overlay)"
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" role="navigation">
        {items.map((item) => {
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
              className={`relative flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl font-sans text-sm font-medium transition-all group touch-target ${isActive ? 'ds-nav-item-active font-semibold' : 'ds-nav-item'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebarPill"
                  className="absolute inset-0 ds-nav-item-active-pill rounded-xl border-l-[3px]"
                  transition={SPRING.pill}
                />
              )}

              <span className={`relative z-10 shrink-0 ${isActive ? 'text-[#E9C349]' : 'text-(--text-muted) group-hover:text-(--text-primary) transition-colors'}`}>
                {item.icon}
              </span>

              {!collapsed && (
                <span className="relative z-10 hidden xl:inline truncate flex-1">{item.label}</span>
              )}

              {item.badge && !collapsed && (
                <Badge variant={item.badgeVariant ?? 'gold'} className="relative z-10 hidden xl:inline-block text-[10px]">
                  {item.badge}
                </Badge>
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-(--border-subtle) pt-4 space-y-1 shrink-0">
        <ChatSidebarButton variant="expanded" accent="#E9C349" isActive={activeTab === 'messages'} onClick={() => setActiveTab('messages' as any)} />

        {/* Marketplace shortcut */}
        <motion.a
          href="/marketplace"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Marketplace"
          title="Learning Marketplace"
          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl transition-all font-sans text-sm font-medium touch-target ds-nav-item"
        >
          <ShoppingBag className="w-5 h-5 shrink-0 text-[#E9C349]" />
          {!collapsed && <span className="hidden xl:inline">Marketplace</span>}
        </motion.a>
        <motion.button
          onClick={() => setActiveTab('settings' as T)}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Settings"
          aria-current={activeTab === 'settings' ? 'page' : undefined}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl transition-all font-sans text-sm font-medium touch-target ${activeTab === ('settings' as T)
              ? 'ds-nav-item-active font-semibold bg-[#E9C349]/12'
              : 'ds-nav-item'
            }`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="hidden xl:inline">Settings</span>}
        </motion.button>

        {onLogout && (
          <motion.button
            onClick={onLogout}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 text-left rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors font-sans text-sm font-medium touch-target"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="hidden xl:inline">Log Out</span>}
          </motion.button>
        )}

        {/* Profile Avatar Card */}
        {profile && (
          <div className="flex items-center gap-3 px-2 pt-3 border-t border-(--border-subtle) mt-2">
            {profile.avatar && (
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#E9C349]/40 shrink-0 shadow-sm">
                <img
                  src={profile.avatar}
                  alt={profile.name ?? 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {!collapsed && (
              <div className="overflow-hidden hidden xl:block">
                <p className="font-sans text-xs font-semibold truncate text-(--text-primary)">
                  {profile.name}
                </p>
                <p className="font-mono text-[10px] truncate text-(--text-muted)">
                  {profile.id ? `ID: ${profile.id}` : profile.department ?? profile.employeeId ?? ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

