'use client';

import React from 'react';
import { NavTab } from '../../types';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  GraduationCap,
  CreditCard,
  BarChart3,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { GESTURE, SPRING } from '@/src/lib/motion';

export interface GenericMobileNavItem<T extends string = string> {
  id: T;
  label: string;
  icon: React.ReactNode;
  dot?: boolean;
}

interface MobileNavProps<T extends string = NavTab> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  items?: GenericMobileNavItem<T>[];
}

const defaultStudentItems: GenericMobileNavItem<NavTab>[] = [
  { id: 'dashboard',  label: 'Dash',      icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'my_courses', label: 'Courses',   icon: <BookOpen className="w-5 h-5" /> },
  { id: 'timetable',  label: 'Timetable', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'grades',     label: 'Grades',    icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'support',    label: 'Advisor',   icon: <HelpCircle className="w-5 h-5" /> },
];

export const MobileNav = <T extends string = NavTab>({ activeTab, setActiveTab, items }: MobileNavProps<T>) => {
  const navItems = (items ?? defaultStudentItems) as GenericMobileNavItem<T>[];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-3 pointer-events-none">
      <nav
        aria-label="Mobile Bottom Navigation"
        className="pointer-events-auto max-w-lg mx-auto ds-mobile-nav backdrop-blur-xl border rounded-2xl shadow-2xl flex items-center justify-around px-2 py-1.5"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileTap={{ scale: 0.88 }}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center w-full py-1.5 touch-target font-sans text-xs font-medium transition-colors ${
                isActive ? 'ds-mobile-nav-item-active' : 'ds-mobile-nav-item'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMobileTabPill"
                  className="absolute inset-0 ds-mobile-nav-pill rounded-xl border-b-2"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {item.icon}
                {item.dot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 ds-mobile-nav-dot rounded-full border" />}
              </span>
              <span className="relative z-10 text-[10px] mt-0.5 tracking-tight leading-none">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};

