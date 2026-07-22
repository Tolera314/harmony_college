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
        <div className="flex items-center gap-2 sm:gap-4">
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
                className="p-2.5 rounded-full hover:bg-white/10 transition-colors relative touch-target text-white/70"
                aria-label="View notifications"
                aria-expanded={showAlertsDrawer}
              >
                <Bell className="w-5 h-5" />
                {alerts.length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E9C349] rounded-full ring-2 ring-[#0F0F10] animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showAlertsDrawer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#141617] rounded-2xl shadow-2xl border border-white/10 p-4 z-50"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                      <h3 className="font-sans text-sm font-bold text-white flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#E9C349]" />
                        Recent System Alerts ({alerts.length})
                      </h3>
                      <button
                        onClick={() => setShowAlertsDrawer(false)}
                        className="text-white/60 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 rounded-xl border-l-4 text-xs space-y-1 ${
                            alert.type === 'error'
                              ? 'bg-[#ffdad6]/10 border-[#ba1a1a] text-[#ffdad6]'
                              : alert.type === 'secondary'
                              ? 'bg-[#E9C349]/15 border-[#E9C349] text-[#E9C349]'
                              : 'bg-white/5 border-white/30 text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span>{alert.source}</span>
                            <span className="font-mono text-[10px] opacity-75">{alert.date}</span>
                          </div>
                          <p className="leading-relaxed text-[11px] opacity-90">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mail Direct Messages Modal Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowMailModal(!showMailModal);
                  setShowAlertsDrawer(false);
                }}
                className="p-2.5 rounded-full hover:bg-white/10 transition-colors touch-target text-white/70"
                aria-label="View messages"
                aria-expanded={showMailModal}
              >
                <Mail className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMailModal && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#141617] rounded-2xl shadow-2xl border border-white/10 p-4 z-50"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                      <h3 className="font-sans text-sm font-bold text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#E9C349]" />
                        Faculty Direct Messages
                      </h3>
                      <button onClick={() => setShowMailModal(false)}>
                        <X className="w-4 h-4 text-white/60" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-[#E9C349]/30">
                        <div className="flex justify-between font-semibold text-white">
                          <span>Dr. Sarah Jenkins</span>
                          <span className="text-[10px] text-white/50 font-mono">10:15 AM</span>
                        </div>
                        <p className="text-white/60 truncate mt-1">
                          CS402: Midterm project feedback uploaded to portal.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-[#E9C349]/30">
                        <div className="flex justify-between font-semibold text-white">
                          <span>Dr. Marcus Vance (Advisor)</span>
                          <span className="text-[10px] text-white/50 font-mono">Yesterday</span>
                        </div>
                        <p className="text-white/60 truncate mt-1">
                          Confirmed your graduation application review session.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-2.5 rounded-full hover:bg-white/10 transition-colors touch-target"
              aria-label="Toggle Theme Mode"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-[#E9C349]" />
              ) : (
                <Moon className="w-5 h-5 text-white/70" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
