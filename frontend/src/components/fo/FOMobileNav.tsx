'use client';

import React from 'react';
import { FONavTab } from '../../types/finance';
import { LayoutDashboard, Users, CreditCard, AlertTriangle, BarChart3, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';

interface FOMobileNavProps {
  activeTab: FONavTab;
  setActiveTab: (tab: FONavTab) => void;
  overdueCount: number;
  unreadCount: number;
}

export const FOMobileNav: React.FC<FOMobileNavProps> = ({
  activeTab, setActiveTab, overdueCount, unreadCount,
}) => {
  const items: { id: FONavTab; label: string; icon: React.ReactNode; dot?: boolean }[] = [
    { id: 'overview',         label: 'Dash',     icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'student_accounts', label: 'Accounts', icon: <Users className="w-5 h-5" /> },
    { id: 'payments',         label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'outstanding',      label: 'Overdue',  icon: <AlertTriangle className="w-5 h-5" />, dot: overdueCount > 0 },
    { id: 'reports',          label: 'Reports',  icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'notifications',    label: 'Alerts',   icon: <Bell className="w-5 h-5" />, dot: unreadCount > 0 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden p-3 pointer-events-none">
      <nav
        aria-label="Mobile Finance Navigation"
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
              className={`relative flex flex-col items-center justify-center w-full py-1.5 touch-target font-sans text-xs font-medium transition-colors ${
                isActive ? 'text-(--brand-gold) font-bold' : 'text-(--text-secondary)'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="foMobileActivePill"
                  className="absolute inset-0 bg-(--accent-gold-subtle) rounded-xl border-b-2 border-[#E9C349]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {item.icon}
                {item.dot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-[#0F0F10]" />
                )}
              </span>
              <span className="relative z-10 text-[10px] mt-0.5 tracking-tight leading-none">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};
