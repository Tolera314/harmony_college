'use client';

import React, { useState } from 'react';
import { NavTab, StudentProfile, AlertItem } from '../../types';
import { Search, Bell, Mail, ChevronRight, X, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';
import ThemeToggle from '../ThemeToggle';

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
  activeTab, setActiveTab, profile, alerts,
  searchQuery, setSearchQuery, onOpenSearchModal,
}) => {
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [showMailModal, setShowMailModal] = useState(false);

  const tabLabels: Record<NavTab, string> = {
    dashboard: 'Dashboard', registration: 'Course Registration',
    grades: 'Grades & Transcript', financials: 'Financials & Tuition',
    degree_audit: 'Degree Audit', support: 'Support & Advising',
    settings: 'Settings & Preferences',
  };

  return (
    <header className="sticky top-0 z-40 w-full ds-header backdrop-blur-xl border-b h-16 flex items-center md:pl-20 xl:pl-64 transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 sm:px-8 py-3">

        {/* Left: Brand & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setActiveTab('dashboard')} className="font-serif text-lg sm:text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
            Harmony <span style={{ color: 'var(--brand-gold)' }}>College</span>
          </button>
          <div className="hidden sm:block h-4 w-px mx-1" style={{ backgroundColor: 'var(--border-strong)' }} />
          <nav className="hidden sm:flex items-center gap-1.5 text-xs lg:text-sm" style={{ color: 'var(--text-muted)' }}>
            <button onClick={() => setActiveTab('dashboard')} className="hover:text-[--brand-gold] transition-colors font-medium">Portal</button>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" style={{ color: 'var(--text-faint)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{tabLabels[activeTab]}</span>
          </nav>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onOpenSearchModal}
            className="hidden md:flex items-center justify-between gap-3 px-3.5 py-1.5 ds-search border rounded-full text-xs w-48 lg:w-64 transition-all"
            aria-label="Search portal resources">
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 " aria-hidden="true" style={{ color: 'var(--text-faint)' }} />
              <span className="truncate">Search courses, grades...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 border rounded text-[10px] font-mono" style={{ backgroundColor: 'var(--hover-overlay)', borderColor: 'var(--border-default)', color: 'var(--text-faint)' }}>
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
          <button onClick={onOpenSearchModal} className="md:hidden p-2 rounded-full transition-colors touch-target" style={{ color: 'var(--text-muted)' }} aria-label="Search">
            <Search className="w-5 h-5 " aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setShowAlertsDrawer(!showAlertsDrawer); setShowMailModal(false); }}
                className="relative p-2 rounded-full transition-colors touch-target" style={{ color: 'var(--text-muted)' }}
                aria-label="View notifications" aria-expanded={showAlertsDrawer}>
                <Bell className="w-5 h-5" aria-hidden="true" />
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold" style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--text-inverse)' }}>
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
                      className="absolute right-0 top-12 w-80 sm:w-96 ds-notif-panel border rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 ds-notif-panel-header border-b flex items-center justify-between">
                        <span className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</span>
                        <div className="flex items-center gap-2">
                          {alerts.length > 0 && <Badge variant="gold">{alerts.length} new</Badge>}
                          <button onClick={() => setShowAlertsDrawer(false)} className="p-1 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <X className="w-4 h-4 " aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y ds-notif-item">
                        {alerts.map(alert => (
                          <div key={alert.id} className="px-4 py-3.5 ds-notif-item transition-colors flex gap-3">
                            <div className="mt-0.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: alert.type === 'error' ? 'var(--status-danger)' : alert.type === 'secondary' ? 'var(--brand-gold)' : 'var(--text-faint)' }} />
                            <div className="min-w-0">
                              <p className="font-sans text-xs font-semibold ds-notif-title">{alert.source}</p>
                              <p className="font-sans text-xs ds-notif-meta leading-relaxed mt-0.5 line-clamp-2">{alert.message}</p>
                              <p className="font-mono text-[10px] ds-notif-meta mt-1 opacity-50">{alert.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Mail */}
            <div className="relative">
              <button onClick={() => { setShowMailModal(!showMailModal); setShowAlertsDrawer(false); }}
                className="p-2 rounded-full transition-colors touch-target" style={{ color: 'var(--text-muted)' }}
                aria-label="View messages">
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
                      className="absolute right-0 top-12 w-80 sm:w-96 ds-notif-panel border rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 ds-notif-panel-header border-b flex items-center justify-between">
                        <span className="font-serif text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <Mail className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} /> Faculty Messages
                        </span>
                        <button onClick={() => setShowMailModal(false)} className="p-1 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}>
                          <X className="w-4 h-4 " aria-hidden="true" />
                        </button>
                      </div>
                      <div className="divide-y ds-notif-item">
                        <button className="w-full text-left px-4 py-3.5 ds-notif-item transition-colors">
                          <p className="font-sans text-xs font-semibold ds-notif-title">Dr. Sarah Jenkins</p>
                          <p className="font-sans text-xs ds-notif-meta truncate mt-0.5">CS402: Midterm project feedback uploaded.</p>
                          <p className="font-mono text-[10px] ds-notif-meta mt-1 opacity-50">10:15 AM</p>
                        </button>
                        <button className="w-full text-left px-4 py-3.5 ds-notif-item transition-colors">
                          <p className="font-sans text-xs font-semibold ds-notif-title">Dr. Marcus Vance (Advisor)</p>
                          <p className="font-sans text-xs ds-notif-meta truncate mt-0.5">Confirmed your graduation review session.</p>
                          <p className="font-mono text-[10px] ds-notif-meta mt-1 opacity-50">Yesterday</p>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle — now uses the shared ThemeToggle component */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};
