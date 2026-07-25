'use client';

import React from 'react';
import { HRNavTab } from '../../types/hr';
import { LayoutDashboard, Users, CalendarCheck, Banknote, TrendingUp, Bell } from 'lucide-react';
import { motion } from 'motion/react';

interface HRMobileNavProps {
  activeTab: HRNavTab;
  setActiveTab: (tab: HRNavTab) => void;
  unreadCount: number;
  pendingLeave: number;
}

export const HRMobileNav: React.FC<HRMobileNavProps> = ({ activeTab, setActiveTab, unreadCount, pendingLeave }) => {
  const items: { id: HRNavTab; label: string; icon: React.ReactNode; dot?: boolean }[] = [
    { id: 'overview',     label: 'Dash',    icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'employees',    label: 'Staff',   icon: <Users className="w-5 h-5" /> },
    { id: 'leave',        label: 'Leave',   icon: <CalendarCheck className="w-5 h-5" />, dot: pendingLeave > 0 },
    { id: 'payroll',      label: 'Payroll', icon: <Banknote className="w-5 h-5" /> },
    { id: 'performance',  label: 'Perf.',   icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'notifications',label: 'Alerts',  icon: <Bell className="w-5 h-5" />, dot: unreadCount > 0 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-3 pointer-events-none">
      <nav
        aria-label="Mobile HR Navigation"
        className="pointer-events-auto max-w-lg mx-auto bg-[#141617]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-around px-2 py-1.5"
      >
        {items.map(item => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileTap={{ scale: 0.88 }}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center w-full py-1.5 touch-target font-sans text-xs font-medium transition-colors ${isActive ? 'text-[#E9C349] font-bold' : 'text-white/60'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="hrMobilePill"
                  className="absolute inset-0 bg-[#E9C349]/15 rounded-xl border-b-2 border-[#E9C349]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {item.icon}
                {item.dot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-[#0F0F10]" />}
              </span>
              <span className="relative z-10 text-[10px] mt-0.5 tracking-tight leading-none">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};
