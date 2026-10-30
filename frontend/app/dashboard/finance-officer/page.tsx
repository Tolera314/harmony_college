'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FONavTab, FONotification, FOProfile } from '@/src/types/finance';
import { foProfile, foNotifications as initialNotifs, financeStudents } from '@/src/data/financeData';
import { FOSidebar }           from '@/src/components/fo/FOSidebar';
import { FOHeader }            from '@/src/components/fo/FOHeader';
import { FOMobileNav }         from '@/src/components/fo/FOMobileNav';
import { FOSearchModal }       from '@/src/components/fo/FOSearchModal';
import { FOLogoutModal }       from '@/src/components/fo/FOLogoutModal';
import { FOOverviewView }        from '@/src/components/fo/views/FOOverviewView';
import { FOTuitionSetupView }    from '@/src/components/fo/views/FOTuitionSetupView';
import { FOPaymentSubmissionsView } from '@/src/components/fo/views/FOPaymentSubmissionsView';
import { FORegistrationPaymentsView } from '@/src/components/fo/views/FORegistrationPaymentsView';
import { FOStudentPaymentsView } from '@/src/components/fo/views/FOStudentPaymentsView';
import { FOStaffPaymentsView } from '@/src/components/fo/views/FOStaffPaymentsView';
import { FOReportsView }         from '@/src/components/fo/views/FOReportsView';
import { FONotificationsView }   from '@/src/components/fo/views/FONotificationsView';
import { FOAuditLogView }        from '@/src/components/fo/views/FOAuditLogView';
import { FOSettingsView }        from '@/src/components/fo/views/FOSettingsView';
import { MessagingView }               from '@/src/components/messaging/MessagingView';
import { ToastContainer, useToast, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { useRealtimeNotifications } from '@/src/hooks/useRealtimeNotifications';

import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/src/lib/foApi';

const DEFAULT_FO_PROFILE: FOProfile = {
  name: 'Finance Officer',
  title: 'Finance & Accounts',
  department: 'Finance Office',
  email: 'finance@harmony.edu',
  phone: '',
  officeRoom: 'Finance Hall',
  avatar: '/logo2.jpg',
  employeeId: 'HC-FIN-001',
  academicYear: '2026-2027',
  currentSemester: 'Semester I',
};

export default function FinanceOfficerPage() {
  const [activeTab,          setRawTab]       = useState<FONavTab>('overview');
  const [profile,            setProfile]      = useState<FOProfile>(DEFAULT_FO_PROFILE);
  const [notifications,      setNotifications] = useState<FONotification[]>([]);
  const [searchOpen,         setSearchOpen]    = useState(false);
  const [logoutOpen,         setLogoutOpen]    = useState(false);
  const [tabLoading,         setTabLoading]    = useState(false);
  const [mobileMenuOpen,     setMobileMenuOpen] = useState(false);
  const [overdueCount,       setOverdueCount]  = useState(0);
  const [programType,        setProgramType]   = useState<'TVET' | 'SHORT_PROGRAM'>('TVET');
  const { toast, show: showToast, hide: hideToast } = useToast();

  // Load programType from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fo_program_type');
    if (saved === 'TVET' || saved === 'SHORT_PROGRAM') {
      setProgramType(saved);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setProfile(p => ({
            ...p,
            name: data.user.fullName || p.name,
            email: data.user.email || p.email,
            phone: data.user.phone || p.phone,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const { unreadCount, playNotificationSound } = useRealtimeNotifications({
    enabled: true,
  });

  // Fetch logged in user profile from auth API
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated && data.user) {
          setProfile((prev) => ({
            ...prev,
            name: data.user.fullName || prev.name,
            email: data.user.email || prev.email,
            phone: data.user.phone || prev.phone,
            avatar: data.user.avatarUrl || prev.avatar,
            employeeId: data.user.id ? `EMP-FO-${data.user.id.slice(-4).toUpperCase()}` : prev.employeeId,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch real notifications from database API
  const fetchNotifs = useCallback(async () => {
    try {
      const data = await getNotifications();
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch {
      // Keep current state fallback
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs, activeTab]);

  // Fetch real overdue accounts count from database API
  useEffect(() => {
    fetch('/api/finance-officer/outstanding?limit=100', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data.accounts)) {
          const realOverdue = data.accounts.filter((a: any) => a.outstanding > 0).length;
          setOverdueCount(realOverdue);
        }
      })
      .catch(() => {});
  }, [activeTab]);

  const setActiveTab = (tab: FONavTab) => {
    if (tab === (activeTab as string)) return;
    setTabLoading(true);
    setTimeout(() => { setRawTab(tab as FONavTab); setTabLoading(false); }, 120);
  };


  // Ctrl+K global search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    markNotificationRead(id).catch(() => {});
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead().catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/signin';
  };

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'overview':            return <FOOverviewView setActiveTab={setActiveTab} programType={programType} profile={profile} />;
      case 'tuition_setup':       return (
        <FOTuitionSetupView
          programType={programType}
          onProgramTypeChange={(pt) => {
            setProgramType(pt);
            localStorage.setItem('fo_program_type', pt);
          }}
        />
      );
      case 'payment_submissions': return <FOPaymentSubmissionsView programType={programType} />;
      case 'registration_payments': return <FORegistrationPaymentsView programType={programType} />;
      case 'outstanding':      return <FOStudentPaymentsView programType={programType} />;
      case 'staff_payments':   return <FOStaffPaymentsView />;
      case 'reports':          return <FOReportsView programType={programType} />;
      case 'notifications':    return (
        <FONotificationsView
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          setActiveTab={setActiveTab}
        />
      );
      case 'audit_log':        return <FOAuditLogView programType={programType} />;
      case 'settings':         return <FOSettingsView />;
      case 'messages':         return <MessagingView />;
      default:                 return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      {/* Background — theme-aware: obsidian+gold in dark, warm layered in light */}
      <div className="dashboard-bg" aria-hidden="true" />

      <div className="dashboard-content">
        {/* Sidebar */}
        <FOSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={profile}
          unreadCount={unreadCount}
          overdueCount={overdueCount}
          onLogout={() => setLogoutOpen(true)}
        />

        {/* Main content */}
        <div className="flex-1 md:pl-20 xl:pl-64 flex flex-col min-h-screen overflow-y-auto max-w-full transition-all duration-300">
          <FOHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={profile}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            onOpenSearch={() => setSearchOpen(true)}
            semesterLabel={profile.currentSemester}
            academicYear={profile.academicYear}
            onMobileMenuToggle={() => setMobileMenuOpen(true)}
          />

          {/* Program Type Toggle */}
          <div className="sticky top-16 z-30 bg-(--bg-primary)/95 backdrop-blur-xl border-b border-(--border-default) px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-(--bg-secondary) border border-(--border-default) shadow-sm">
                  <button
                    onClick={() => {
                      setProgramType('TVET');
                      localStorage.setItem('fo_program_type', 'TVET');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      programType === 'TVET'
                        ? 'bg-gradient-to-r from-[var(--brand-gold)] to-[var(--brand-gold-dark)] text-black shadow-md scale-[1.02]'
                        : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--hover-overlay)'
                    }`}
                  >
                    {programType === 'TVET' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    🎓 TVET Program
                  </button>
                  <button
                    onClick={() => {
                      setProgramType('SHORT_PROGRAM');
                      localStorage.setItem('fo_program_type', 'SHORT_PROGRAM');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      programType === 'SHORT_PROGRAM'
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md scale-[1.02]'
                        : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--hover-overlay)'
                    }`}
                  >
                    {programType === 'SHORT_PROGRAM' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    ⏱ Short Program
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-(--text-faint) uppercase tracking-widest">
                    {programType === 'TVET' ? '📊 Viewing TVET Financial Data' : '📊 Viewing Short Program Financial Data'}
                  </span>
                  {programType === 'TVET' ? (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/20">
                      TVET TRACK
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      SHORT PROGRAM TRACK
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Mobile bottom nav */}
        <FOMobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          overdueCount={overdueCount}
          unreadCount={unreadCount}
        />
      </div>

      {/* Finance Officer Mobile Navigation Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-(--bg-modal) border-r border-(--border-default) flex flex-col md:hidden shadow-2xl"
            >
              <div className="p-4 border-b border-(--border-subtle) flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl text-(--text-inverse) flex items-center justify-center font-serif font-bold text-lg shadow bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-gold-dark)]">
                    H
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-(--text-primary)">Finance Officer</h3>
                    <p className="text-[10px] text-(--text-faint) font-mono">Bursar & Payments</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary)">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {[
                  { id: 'overview', label: 'Dashboard Overview' },
                  { id: 'tuition_setup', label: 'Monthly Fee Setup' },
                  { id: 'payment_submissions', label: 'Payment Submissions' },
                  { id: 'registration_payments', label: 'Reg. Fee Verification' },
                  { id: 'outstanding', label: 'Student Payments' },
                  { id: 'reports', label: 'Financial Reports' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'audit_log', label: 'Audit Log' },
                  { id: 'settings', label: 'Settings' },
                ].map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as FONavTab);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--brand-gold)/20'
                          : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary)'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <span className="text-(--brand-gold)">→</span>}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 border-t border-(--border-subtle) space-y-1">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setLogoutOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-(--status-danger) hover:bg-(--status-danger-bg) transition-all"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global modals */}
      <FOSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab) => { setActiveTab(tab); setSearchOpen(false); }}
      />
      <FOLogoutModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
