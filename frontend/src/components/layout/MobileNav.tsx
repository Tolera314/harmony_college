'use client';

import React from 'react';
import { NavTab } from '../../types';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  CreditCard,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { GESTURE, SPRING } from '@/src/lib/motion';

interface MobileNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const items: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',   label: 'Dash',    icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'my_courses',  label: 'Courses', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'grades',      label: 'Grades',  icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'financials',  label: 'Tuition', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'degree_audit',label: 'Degree',  icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'support',     label: 'Advisor', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-3 pointer-events-none">
      <nav
        aria-label="Mobile Bottom Navigation"
        className="pointer-events-auto max-w-lg mx-auto ds-mobile-nav backdrop-blur-xl border rounded-2xl shadow-2xl flex items-center justify-around px-2 py-1.5"
      >
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileTap={{ scale: 0.88 }}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center w-full py-1.5 touch-target font-sans text-xs font-medium transition-colors ${isActive ? 'ds-mobile-nav-item-active' : 'ds-mobile-nav-item'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMobileTabPill"
                  className="absolute inset-0 ds-mobile-nav-pill rounded-xl border-b-2"
                  transition={SPRING.pill}
                />
              )}
              <span className="relative z-10" aria-hidden="true">{item.icon}</span>
              <span className="relative z-10 text-[10px] mt-0.5 tracking-tight leading-none">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};
