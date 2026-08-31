'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NavTab, StudentProfile, AlertItem } from '../../types';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  X,
  Command,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '../ui/Badge';
import ThemeToggle from '../ThemeToggle';

export interface HeaderProps<T extends string = NavTab> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  profile?: {
    name?: string;
    avatar?: string;
    roleLabel?: string;
    onAvatarClick?: () => void;
  };
  alerts?: AlertItem[];
  notifications?: { id: string; text: string; time: string; read: boolean }[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onNotificationClick?: (id: string) => void;
  darkMode?: boolean;
  setDarkMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  searchResults?: { id: T; label: string; sub?: string }[];

  onOpenSearchModal?: () => void;
  portalLabel?: string;
  tabLabels?: Record<string, string>;
  onMobileMenuToggle?: () => void;
}

const defaultStudentTabLabels: Record<NavTab, string> = {
  dashboard:    'Dashboard',
  my_courses:   'My Courses',
  timetable:    'My Timetable',
  registration: 'Course Registration',
  assignments:  'Assignments',
  quizzes:      'Quizzes & Exams',
  attendance:   'My Attendance',
  grades:       'Grades & Transcript',
  financials:   'Financials & Tuition',
  degree_audit: 'Degree Audit',
  support:      'Support & Advising',
  settings:     'Settings & Preferences',
};

export const Header = <T extends string = NavTab>({
  activeTab,
  setActiveTab,
  profile,
  alerts = [],
  notifications = [],
  unreadCount: explicitUnreadCount,
  onMarkAllRead,
  onNotificationClick,
  darkMode = true,
  setDarkMode,
  searchQuery = '',
  setSearchQuery,
  searchResults = [],
  onOpenSearchModal,
  portalLabel = 'Portal',
  tabLabels,
  onMobileMenuToggle
}: HeaderProps<T>) => {
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const labels = tabLabels ?? (defaultStudentTabLabels as Record<string, string>);
  const currentTabName = labels[activeTab] ?? String(activeTab).replace('_', ' ');

  const totalUnread = explicitUnreadCount ?? (
    alerts.length > 0 ? alerts.length : notifications.filter(n => !n.read).length
  );

  const query = setSearchQuery ? searchQuery : localQuery;
  const handleQueryChange = (val: string) => {
    if (setSearchQuery) setSearchQuery(val);
    else setLocalQuery(val);
  };

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchDropdownOpen(prev => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute matching tab items if searchResults is empty
  const computedResults: { id: T; label: string; sub?: string }[] = searchResults.length > 0
    ? searchResults
    : query.trim() === ''
      ? []
      : Object.entries(labels)
        .filter(([_, label]) => label.toLowerCase().includes(query.toLowerCase()))
        .map(([id, label]) => ({ id: id as T, label }));

  return (
    <header className="sticky top-0 z-40 w-full ds-header backdrop-blur-xl border-b border-(--border-default) h-16 flex items-center transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 sm:px-8 py-3">

        {/* Left: Brand & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="p-2 md:hidden bg-(--hover-overlay) border border-(--border-default) rounded-xl text-(--text-primary) hover:text-[#E9C349] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setActiveTab(Object.keys(labels)[0] as T)}
            className="font-serif text-lg sm:text-2xl font-bold text-(--text-primary) tracking-tight hover:opacity-80 transition-opacity"
          >
            Harmony <span className="text-[#E9C349]">College</span>
          </button>

          <div className="hidden sm:block h-4 w-[1px] bg-(--border-strong) mx-1" />

          <nav className="hidden sm:flex items-center gap-1.5 text-xs lg:text-sm text-(--text-muted)">
            <button
              onClick={() => setActiveTab(Object.keys(labels)[0] as T)}
              className="hover:text-[#E9C349] transition-colors font-medium"
            >
              {portalLabel}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-(--text-faint)" />
            <span className="font-semibold text-(--text-primary) capitalize">
              {currentTabName}
            </span>
          </nav>
        </div>

        {/* Right Side: Search Dropdown & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Responsive Header Search Dropdown Container */}
          <div className="relative">
            {/* Search Input Bar (Desktop) */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 ds-search border border-(--border-default) focus-within:border-[#D4AF37] rounded-full text-xs text-(--text-primary) w-52 lg:w-72 transition-all">
              <Search className="w-4 h-4 text-(--text-faint) shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  handleQueryChange(e.target.value);
                  if (!searchDropdownOpen) setSearchDropdownOpen(true);
                }}
                placeholder="Search Portal..."
                className="w-full bg-transparent text-xs text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none"
              />
              {query ? (
                <button
                  onClick={() => { handleQueryChange(''); setSearchDropdownOpen(false); }}
                  className="p-0.5 rounded-full hover:bg-(--hover-overlay) text-(--text-faint) hover:text-(--text-primary)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-(--hover-overlay) border border-(--border-default) rounded text-[9px] font-mono text-(--text-faint) shrink-0">
                  <Command className="w-2.5 h-2.5" /> K
                </kbd>
              )}
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={() => {
                setSearchDropdownOpen(prev => !prev);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="md:hidden p-2 text-(--text-muted) hover:text-[#E9C349] rounded-full hover:bg-(--hover-overlay) touch-target"
              aria-label="Open Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Search Results Dropdown Panel */}
            <AnimatePresence>
              {searchDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSearchDropdownOpen(false)}
                  />

                  {/* ── Desktop dropdown: anchored below the search input ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="hidden md:block absolute left-0 top-[calc(100%+8px)] w-80 lg:w-96 bg-(--bg-modal) border border-(--border-default) rounded-2xl shadow-2xl z-50 p-3 font-sans space-y-2"
                  >
                    <div className="flex justify-between items-center px-2 pb-1 border-b border-(--border-subtle) text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">
                      <span>{searchResults.length > 0 ? 'Search Results' : 'Matching Portal Views'}</span>
                      <span className="text-[9px]">Esc to close</span>
                    </div>

                    {computedResults.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                        {computedResults.map((item, idx) => (
                          <button
                            key={`${item.id}-${idx}`}
                            onClick={() => {
                              setActiveTab(item.id);
                              setSearchDropdownOpen(false);
                              handleQueryChange('');
                            }}
                            className="w-full p-2.5 text-left rounded-xl bg-(--hover-overlay) hover:bg-[#D4AF37]/15 hover:text-[#D4AF37] border border-transparent hover:border-[#D4AF37]/20 flex items-center justify-between text-xs transition-all group"
                          >
                            <div>
                              <span className="font-semibold text-(--text-primary) group-hover:text-[#D4AF37] block">
                                {item.label}
                              </span>
                              {item.sub && (
                                <span className="text-[10px] text-(--text-muted) block mt-0.5">
                                  {item.sub}
                                </span>
                              )}
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-(--text-faint) group-hover:text-[#D4AF37] transition-colors" />
                          </button>
                        ))}
                      </div>
                    ) : query.trim() !== '' ? (
                      <div className="py-6 text-center text-xs text-(--text-muted)">
                        No portal views found matching &quot;{query}&quot;
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-(--text-faint)">
                        Type any section name to jump directly
                      </div>
                    )}
                  </motion.div>

                  {/* ── Mobile dropdown: fixed below the header, full width with margin ── */}
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="md:hidden fixed left-3 right-3 top-[68px] bg-(--bg-modal) border border-(--border-default) rounded-2xl shadow-2xl z-50 p-3 font-sans space-y-2"
                  >
                    {/* Mobile search input inside dropdown */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-(--bg-input) border border-(--border-default) rounded-xl">
                      <Search className="w-4 h-4 text-(--text-faint) shrink-0" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        placeholder="Search Portal..."
                        autoFocus
                        className="w-full bg-transparent text-sm text-(--text-primary) placeholder:text-(--text-faint) focus:outline-none"
                      />
                      {query ? (
                        <button onClick={() => handleQueryChange('')} className="p-0.5 text-(--text-faint) hover:text-(--text-primary)">
                          <X className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => setSearchDropdownOpen(false)} className="p-0.5 text-(--text-faint) hover:text-(--text-primary)">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-center px-2 pb-1 border-b border-(--border-subtle) text-[10px] font-mono uppercase tracking-wider text-(--text-faint)">
                      <span>Matching Portal Views</span>
                      <span className="text-[9px]">Tap outside to close</span>
                    </div>

                    {computedResults.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                        {computedResults.map((item, idx) => (
                          <button
                            key={`${item.id}-${idx}`}
                            onClick={() => {
                              setActiveTab(item.id);
                              setSearchDropdownOpen(false);
                              handleQueryChange('');
                            }}
                            className="w-full p-3 text-left rounded-xl bg-(--hover-overlay) active:bg-[#D4AF37]/15 border border-transparent flex items-center justify-between text-sm transition-all group"
                          >
                            <span className="font-semibold text-(--text-primary) group-active:text-[#D4AF37]">
                              {item.label}
                            </span>
                            <ChevronRight className="w-4 h-4 text-(--text-faint) shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : query.trim() !== '' ? (
                      <div className="py-6 text-center text-sm text-(--text-muted)">
                        No portal views found matching &quot;{query}&quot;
                      </div>
                    ) : (
                      <div className="py-4 text-center text-sm text-(--text-faint)">
                        Type any section name to jump directly
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowAlertsDrawer(!showAlertsDrawer)}
                className="relative p-2 rounded-full hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors touch-target"
                aria-label="View notifications"
                aria-expanded={showAlertsDrawer}
              >
                <Bell className="w-5 h-5" />
                {totalUnread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#E9C349] rounded-full flex items-center justify-center text-[#0F0F10] text-[9px] font-mono font-bold">
                    {totalUnread}
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
                      className="absolute right-0 top-12 w-80 sm:w-96 ds-notif-panel border border-(--border-default) rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 ds-notif-panel-header border-b border-(--border-subtle) flex items-center justify-between">
                        <span className="font-serif text-base font-bold text-(--text-primary)">Notifications</span>
                        <div className="flex items-center gap-2">
                          {onMarkAllRead && (
                            <button onClick={onMarkAllRead} className="text-[10px] text-[#E9C349] hover:underline">
                              Mark all read
                            </button>
                          )}
                          {totalUnread > 0 && !onMarkAllRead && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold bg-[#E9C349]/15 text-[#E9C349] border border-[#E9C349]/30">
                              {totalUnread} new
                            </span>
                          )}
                          <button onClick={() => setShowAlertsDrawer(false)} className="p-1 rounded-full hover:bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-(--border-subtle)">
                        {alerts.length > 0 ? (
                          alerts.map((alert) => (
                            <div key={alert.id} className="px-4 py-3.5 hover:bg-(--hover-overlay) transition-colors flex gap-3">
                              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${alert.type === 'error' ? 'bg-rose-400' : alert.type === 'secondary' ? 'bg-[#E9C349]' : 'bg-(--border-strong)'}`} />
                              <div className="min-w-0">
                                <p className="font-sans text-xs font-semibold text-(--text-primary)">{alert.source}</p>
                                <p className="font-sans text-xs text-(--text-secondary) leading-relaxed mt-0.5 line-clamp-2">{alert.message}</p>
                                <p className="font-mono text-[10px] text-(--text-faint) mt-1">{alert.date}</p>
                              </div>
                            </div>
                          ))
                        ) : notifications.length > 0 ? (
                          notifications.map((n) => (
                            onNotificationClick ? (
                              <button
                                key={n.id}
                                onClick={() => { onNotificationClick(n.id); setShowAlertsDrawer(false); }}
                                className={`w-full px-4 py-3.5 hover:bg-(--hover-overlay) transition-colors flex gap-3 text-left group ${!n.read ? 'bg-[#E9C349]/5' : ''}`}
                              >
                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform ${n.read ? 'bg-(--border-strong)' : 'bg-[#E9C349]'}`} />
                                <div className="min-w-0 flex-1">
                                  <p className="font-sans text-xs text-(--text-primary) leading-relaxed group-hover:text-[#E9C349] transition-colors">{n.text}</p>
                                  <p className="font-mono text-[10px] text-(--text-faint) mt-1">{n.time}</p>
                                </div>
                                <ChevronRight className="w-3 h-3 text-(--text-faint) group-hover:text-[#E9C349] mt-1 shrink-0 transition-colors" />
                              </button>
                            ) : (
                              <div key={n.id} className={`px-4 py-3.5 hover:bg-(--hover-overlay) transition-colors flex gap-3 ${!n.read ? 'bg-[#E9C349]/5' : ''}`}>
                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-(--border-strong)' : 'bg-[#E9C349]'}`} />
                                <div className="min-w-0">
                                  <p className="font-sans text-xs text-(--text-primary) leading-relaxed">{n.text}</p>
                                  <p className="font-mono text-[10px] text-(--text-faint) mt-1">{n.time}</p>
                                </div>
                              </div>
                            )
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-(--text-muted)">No notifications</div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            {setDarkMode ? (
              <button
                onClick={() => setDarkMode((prev) => !prev)}
                className="p-2 rounded-full hover:bg-(--hover-overlay) transition-colors touch-target text-(--text-muted) hover:text-(--text-primary)"
                aria-label="Toggle Theme"
              >
                {darkMode ? <Sun className="w-5 h-5 text-[#E9C349]" /> : <Moon className="w-5 h-5" />}
              </button>
            ) : (
              <ThemeToggle />
            )}

            {/* Profile Card */}
            {profile && (
              <button
                onClick={profile.onAvatarClick}
                className="flex items-center gap-2.5 pl-2 border-l border-(--border-default) focus:outline-none group"
                aria-label="Account settings"
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name ?? 'User Avatar'}
                    className="w-9 h-9 rounded-xl border border-(--border-default) object-cover group-hover:border-[#E9C349]/50 transition-colors"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center font-serif font-bold text-sm text-[#D4AF37] group-hover:border-[#D4AF37]/70 transition-colors shrink-0">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                {profile.name && (
                  <div className="hidden lg:block text-left text-xs leading-none">
                    <p className="font-semibold text-(--text-primary)">{profile.name}</p>
                    {profile.roleLabel && (
                      <span className="text-[9px] font-mono text-(--text-faint) uppercase block mt-1">{profile.roleLabel}</span>
                    )}
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
