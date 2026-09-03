'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HRNavTab } from '@/src/types/hr';
import { HRSidebar }           from '@/src/components/hr/HRSidebar';
import { HRHeader }            from '@/src/components/hr/HRHeader';
import { HRMobileNav }         from '@/src/components/hr/HRMobileNav';
import { HRSearchModal }       from '@/src/components/hr/HRSearchModal';
import { HRLogoutModal }       from '@/src/components/hr/HRLogoutModal';
import { HROverviewView }      from '@/src/components/hr/views/HROverviewView';
import { HREmployeesView }     from '@/src/components/hr/views/HREmployeesView';
import { HROnboardingView }    from '@/src/components/hr/views/HROnboardingView';
import { HROffboardingView }   from '@/src/components/hr/views/HROffboardingView';
import { HRLeaveView }         from '@/src/components/hr/views/HRLeaveView';
import { HRPayrollView }       from '@/src/components/hr/views/HRPayrollView';
import { HRPerformanceView }   from '@/src/components/hr/views/HRPerformanceView';
import { HRDocumentsView }     from '@/src/components/hr/views/HRDocumentsView';
import { HRReportsView }       from '@/src/components/hr/views/HRReportsView';
import { HRNotificationsView } from '@/src/components/hr/views/HRNotificationsView';
import { HRAuditLogView }      from '@/src/components/hr/views/HRAuditLogView';
import { HRSettingsView }      from '@/src/components/hr/views/HRSettingsView';
import { HRSalaryHistoryView } from '@/src/components/hr/views/HRSalaryHistoryView';
import { ToastContainer, useToast, SessionExpiredOverlay, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';
import { MessagingView } from '@/src/components/messaging/MessagingView';
import { hrNotificationsApi, type HRNotificationApi } from '@/src/lib/hrApi';
import { useNotifications } from '@/src/hooks/useNotifications';

// Static fallback profile used only while the real profile loads (or if the API is unreachable)
const fallbackProfile = {
  name: 'HR Officer',
  title: 'Human Resources',
  department: 'Human Resources',
  email: 'hr@harmony.edu',
  phone: '',
  officeRoom: '',
  avatar: '/tigist.png',
  employeeId: 'HC-HR-0001',
  academicYear: '2024–2025',
  currentPayrollMonth: 'Current',
};

export default function HRDashboardPage() {
  const [activeTab,      setRawTab]        = useState<HRNavTab>('overview');

  const [pendingLeave,   setPendingLeave]   = useState(0);
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [logoutOpen,     setLogoutOpen]     = useState(false);
  const [tabLoading,     setTabLoading]     = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile,        setProfile]        = useState(fallbackProfile);
  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Real-time notification badge + inbox via unified hook ─────────────────
  // Fetches on mount, subscribes to notification:new socket event,
  // updates badge instantly without polling.
  const {
    items:       notifItems,
    unreadCount,
    markRead:    handleMarkRead,
    reload:      reloadNotifs,
  } = useNotifications({
    fetchFn:       () => hrNotificationsApi.list(),
    markReadFn:    (id) => hrNotificationsApi.markRead(id),
    markAllReadFn: () => hrNotificationsApi.markAllRead(),
  });

  // Keep headerNotifs in sync with the hook's items (top 7 for the bell dropdown)
  const headerNotifs = (notifItems as unknown as HRNotificationApi[]).slice(0, 7);

  // Load profile on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d?.user?.fullName) {
          setProfile(p => ({ ...p, name: d.user.fullName, email: d.user.email ?? p.email }));
        }
      })
      .catch(() => {});
  }, []);

  const setActiveTab = useCallback((tab: HRNavTab) => {
    if (tab === activeTab) return;
    setTabLoading(true);
    setTimeout(() => { setRawTab(tab); setTabLoading(false); }, 120);
  }, [activeTab]);

  // Mark one notification read — optimistic update + background API call






  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/signin';
  };

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'overview':      return <HROverviewView setActiveTab={setActiveTab} />;
      case 'employees':     return <HREmployeesView />;
      case 'onboarding':    return <HROnboardingView />;
      case 'offboarding':   return <HROffboardingView />;
      case 'leave':         return <HRLeaveView />;
      case 'payroll':       return <HRPayrollView />;
      case 'performance':   return <HRPerformanceView />;
      case 'documents':     return <HRDocumentsView />;
      case 'salary_history': return <HRSalaryHistoryView />;
      case 'reports':       return <HRReportsView />;
      case 'notifications': return (
        <HRNotificationsView
          setActiveTab={setActiveTab}
          onUnreadCountChange={() => reloadNotifs()}
        />
      );
      case 'audit_log':     return <HRAuditLogView />;
      case 'settings':      return <HRSettingsView profile={profile as any} />;
      case 'messages':      return <MessagingView />;
      default:              return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
      <SessionExpiredOverlay isVisible={false} onSignIn={() => { window.location.href = '/signin'; }} />

      <div className="dashboard-bg" aria-hidden="true" />

      <div className="dashboard-content">
        <HRSidebar
          activeTab={activeTab} setActiveTab={setActiveTab} profile={profile as any}
          unreadCount={unreadCount} pendingLeave={pendingLeave} onLogout={() => setLogoutOpen(true)}
        />
        <div className="flex-1 md:pl-20 xl:pl-64 flex flex-col min-h-screen overflow-y-auto max-w-full transition-all duration-300">
          <HRHeader
            activeTab={activeTab} setActiveTab={setActiveTab} profile={profile as any}
            notifications={headerNotifs} unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            onOpenSearch={() => setSearchOpen(true)}
            onMobileMenuToggle={() => setMobileMenuOpen(true)}
          />
          <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <HRMobileNav activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={unreadCount} pendingLeave={pendingLeave} />
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden" />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-(--bg-modal) border-r border-(--border-default) flex flex-col md:hidden shadow-2xl">
              <div className="p-4 border-b border-(--border-subtle) flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl text-(--text-inverse) flex items-center justify-center font-serif font-bold text-lg shadow bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-gold-dark)]">H</div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-(--text-primary)">HR Officer</h3>
                    <p className="text-[10px] text-(--text-faint) font-mono">Human Resources Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary)">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {([
                  ['overview','Dashboard'], ['employees','Employees'], ['onboarding','Onboarding'], ['offboarding','Offboarding'],
                  ['leave','Leave Management'], ['payroll','Payroll'], ['performance','Performance'],
                  ['documents','Documents'], ['salary_history','Salary & Contracts'], ['reports','Reports'], ['notifications','Notifications'],
                  ['audit_log','Audit Logs'], ['settings','Settings'],
                ] as [HRNavTab, string][]).map(([id, label]) => {
                  const isActive = activeTab === id;
                  return (
                    <button key={id} onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--brand-gold)/20' : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary)'}`}>
                      <span>{label}</span>
                      {isActive && <span className="text-(--brand-gold)">→</span>}
                    </button>
                  );
                })}
              </div>
              <div className="p-3 border-t border-(--border-subtle)">
                <button onClick={() => { setMobileMenuOpen(false); setLogoutOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-(--status-danger) hover:bg-(--status-danger-bg) transition-all">
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <HRSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }} />
      <HRLogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
}