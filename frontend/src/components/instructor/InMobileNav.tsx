'use client';

import React from 'react';
import { InstructorNavTab } from '../../types/instructor';
import { LayoutDashboard, BookOpen, CalendarCheck, ClipboardList, ClipboardCheck, Bell, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { GESTURE, SPRING } from '@/src/lib/motion';

interface InMobileNavProps {
  activeTab: InstructorNavTab;
  setActiveTab: (tab: InstructorNavTab) => void;
  unreadCount: number;
  pendingGrades: number;
  activeSession: boolean;
}

export const InMobileNav: React.FC<InMobileNavProps> = ({
  activeTab, setActiveTab, unreadCount, pendingGrades, activeSession,
}) => {
  const items: { id: InstructorNavTab; label: string; icon: React.ReactNode; dot?: boolean }[] = [
    { id: 'overview',   label: 'Dash',    icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'my_classes', label: 'Classes', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'attendance', label: 'Attend.', icon: <CalendarCheck className="w-5 h-5" />, dot: activeSession },
    { id: 'grades',     label: 'Grades',  icon: <ClipboardList className="w-5 h-5" />, dot: pendingGrades > 0 },
    { id: 'assignments',label: 'Assign.', icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: 'quizzes',    label: 'Quizzes', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'notifications', label: 'Alerts', icon: <Bell className="w-5 h-5" />, dot: unreadCount > 0 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-3 pointer-events-none">
      <nav
        aria-label="Mobile Instructor Navigation"
        className="pointer-events-auto max-w-lg mx-auto ds-mobile-nav backdrop-blur-xl border rounded-2xl shadow-2xl flex items-center justify-around px-2 py-1.5"
      >
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button key={item.id} onClick={() => setActiveTab(item.id)} whileTap={{ scale: 0.88 }} aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center w-full py-1.5 touch-target font-sans text-xs font-medium transition-colors ${isActive ? 'ds-mobile-nav-item-active' : 'ds-mobile-nav-item'}`}>
              {isActive && <motion.div layoutId="inMobileActivePill" className="absolute inset-0 ds-mobile-nav-pill rounded-xl border-b-2" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
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
