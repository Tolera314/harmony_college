'use client';

import React, { useState } from 'react';
import { NavTab, StudentProfile, AlertItem } from '../../types';
import {
  Search,
  Bell,
  Mail,
  Sun,
  Moon,
  ChevronRight,
  X,
  Command
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  profile: StudentProfile;
  alerts: AlertItem[];
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenSearchModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  profile,
  alerts,
  darkMode,
  setDarkMode,
  searchQuery,
  setSearchQuery,
  onOpenSearchModal
}) => {
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [showMailModal, setShowMailModal] = useState(false);

  const tabLabels: Record<NavTab, string> = {
    dashboard: 'Dashboard',
    registration: 'Course Registration',
    grades: 'Grades & Transcript',
    financials: 'Financials & Tuition',
    degree_audit: 'Degree Audit',
    support: 'Support & Advising',
    settings: 'Settings & Preferences'
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0F0F10]/90 backdrop-blur-xl border-b border-white/10 h-16 flex items-center md:pl-20 xl:pl-64 transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 sm:px-8 py-3">
        {/* Left Side: Brand & Breadcrumb Trail */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="font-serif text-lg sm:text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity"
          >
            Harmony <span className="text-[#E9C349]">College</span>
          </button>
          
          <div className="hidden sm:block h-4 w-[1px] bg-white/15 mx-1" />
          
          <nav className="hidden sm:flex items-center gap-1.5 text-xs lg:text-sm text-white/60">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="hover:text-[#E9C349] transition-colors font-medium"
            >
              Portal
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
            <span className="font-semibold text-white">
              {tabLabels[activeTab]}
            </span>
          </nav>
        </div>

        {/* Right Side: Quick Controls & Search Trigger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Command Search Trigger */}
          <button
            onClick={onOpenSearchModal}
            className="hidden md:flex items-center justify-between gap-3 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/60 w-48 lg:w-64 transition-all"
            aria-label="Search portal resources"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-white/50" />
              <span className="truncate">Search courses, grades...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 border border-white/10 rounded text-[10px] font-mono text-white/60">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>

          <button
            onClick={onOpenSearchModal}
            className="md:hidden p-2 text-white/70 hover:text-[#E9C349] rounded-full hover:bg-white/10 touch-target"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Icon Controls Group */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notification Bell Drawer */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowAlertsDrawer(!showAlertsDrawer);
                  setShowMailModal(false);
                }}
                className="relative p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors touch-target"
                aria-label="View notifications"
                aria-expanded={showAlertsDrawer}
              >
                <Bell className="w-5 h-5" />
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#E9C349] rounded-full flex items-center justify-center text-[#0F0F10] text-[9px] font-mono font-bold">
                    {alerts.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showAlertsDrawer && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAlertsDrawer(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-12 w-80 sm:w-96 bg-[#141617] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <span className="font-serif text-base font-bold text-white">Notifications</span>
                        <div className="flex items-center gap-2">
                          {alerts.length > 0 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold bg-[#E9C349]/15 text-[#E9C349] border border-[#E9C349]/30">
                              {alerts.length} new
                            </span>
                          )}
                          <button onClick={() => setShowAlertsDrawer(false)} className="p-1 rounded-full hover:bg-white/10 text-white/60 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                        {alerts.map((alert) => (
                          <div key={alert.id} className="px-4 py-3.5 hover:bg-white/5 transition-colors flex gap-3">
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${alert.type === 'error' ? 'bg-rose-400' : alert.type === 'secondary' ? 'bg-[#E9C349]' : 'bg-white/40'}`} />
                            <div className="min-w-0">
                              <p className="font-sans text-xs font-semibold text-white">{alert.source}</p>
                              <p className="font-sans text-xs text-white/50 leading-relaxed mt-0.5 line-clamp-2">{alert.message}</p>
                              <p className="font-mono text-[10px] text-white/30 mt-1">{alert.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mail Direct Messages */}
            <div className="relative">
              <button
                onClick={() => { setShowMailModal(!showMailModal); setShowAlertsDrawer(false); }}
                className="p-2 rounded-full hover:bg-white/10 transition-colors touch-target text-white/70 hover:text-white"
                aria-label="View messages"
              >
                <Mail className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMailModal && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMailModal(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-12 w-80 sm:w-96 bg-[#141617] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <span className="font-serif text-base font-bold text-white flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#E9C349]" /> Faculty Messages
                        </span>
                        <button onClick={() => setShowMailModal(false)} className="p-1 rounded-full hover:bg-white/10 text-white/60 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="divide-y divide-white/5">
                        <button className="w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors">
                          <p className="font-sans text-xs font-semibold text-white">Dr. Sarah Jenkins</p>
                          <p className="font-sans text-xs text-white/50 truncate mt-0.5">CS402: Midterm project feedback uploaded.</p>
                          <p className="font-mono text-[10px] text-white/30 mt-1">10:15 AM</p>
                        </button>
                        <button className="w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors">
                          <p className="font-sans text-xs font-semibold text-white">Dr. Marcus Vance (Advisor)</p>
                          <p className="font-sans text-xs text-white/50 truncate mt-0.5">Confirmed your graduation review session.</p>
                          <p className="font-mono text-[10px] text-white/30 mt-1">Yesterday</p>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors touch-target text-white/70 hover:text-white"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-[#E9C349]" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
