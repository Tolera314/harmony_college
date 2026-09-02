'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FONavTab, FONotification } from '@/src/types/finance';
import { foProfile } from '@/src/data/financeData';
import { FOSidebar }           from '@/src/components/fo/FOSidebar';
import { FOHeader }            from '@/src/components/fo/FOHeader';
import { FOMobileNav }         from '@/src/components/fo/FOMobileNav';
import { FOSearchModal }       from '@/src/components/fo/FOSearchModal';
import { FOLogoutModal }       from '@/src/components/fo/FOLogoutModal';
import { FOOverviewView }        from '@/src/components/fo/views/FOOverviewView';
import { FOStudentAccountsView } from '@/src/components/fo/views/FOStudentAccountsView';
import { FORegistrationPaymentsView } from '@/src/components/fo/views/FORegistrationPaymentsView';
import { FOPaymentsView }        from '@/src/components/fo/views/FOPaymentsView';
import { FOReceiptsView }        from '@/src/components/fo/views/FOReceiptsView';
import { FOOutstandingView }     from '@/src/components/fo/views/FOOutstandingView';
import { FOReportsView }         from '@/src/components/fo/views/FOReportsView';
import { FOReconciliationView }  from '@/src/components/fo/views/FOReconciliationView';
import { FONotificationsView }   from '@/src/components/fo/views/FONotificationsView';
import { FOAuditLogView }        from '@/src/components/fo/views/FOAuditLogView';
import { FOSettingsView }        from '@/src/components/fo/views/FOSettingsView';
import { ChatView }               from '@/src/components/chat/ChatView';
import { ToastContainer, useToast, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';
import { getReconciliationEntries, getOutstandingAccounts, getNotifications as foGetNotifications, markNotificationRead as foMarkNotifRead, markAllNotificationsRead as foMarkAllNotifRead } from '@/src/lib/foApi';
import { useNotifications } from '@/src/hooks/useNotifications';

export default function FinanceOfficerPage() {
  const [activeTab,          setRawTab]       = useState<FONavTab>('overview');
  const [notifications,      setNotifications] = useState<FONotification[]>([]);
  const [searchOpen,         setSearchOpen]    = useState(false);
  const [logoutOpen,         setLogoutOpen]    = useState(false);
  const [tabLoading,         setTabLoading]    = useState(false);
  const [mobileMenuOpen,     setMobileMenuOpen] = useState(false);
  const [pendingReconciliation, setPendingRecon] = useState(0);
  const [overdueCount,       setOverdueCount]  = useState(0);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const { unreadCount } = useNotifications({
    fetchFn:       () => foGetNotifications(),
    markReadFn:    (id) => foMarkNotifRead(id),
    markAllReadFn: () => foMarkAllNotifRead(),
  });

  // Load live badge counts on mount
  useEffect(() => {
    getReconciliationEntries({ status: 'Unmatched' })
      .then((d: any) => setPendingRecon((d?.entries ?? d ?? []).length))
      .catch(() => {});
    getOutstandingAccounts({ limit: 1 })
      .then((d: any) => setOverdueCount(d?.total ?? 0))
      .catch(() => {});
  }, []);

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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/signin';
  };

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'overview':         return <FOOverviewView setActiveTab={setActiveTab} />;
      case 'student_accounts': return <FOStudentAccountsView />;
      case 'payments':         return <FOPaymentsView />;
      case 'registration_payments': return <FORegistrationPaymentsView />;
      case 'receipts':         return <FOReceiptsView />;
      case 'outstanding':      return <FOOutstandingView />;
      case 'reports':          return <FOReportsView />;
      case 'reconciliation':   return <FOReconciliationView />;
      case 'notifications':    return (
        <FONotificationsView
          setActiveTab={setActiveTab}
        />
      );
      case 'audit_log':        return <FOAuditLogView />;
      case 'settings':         return <FOSettingsView />;
      case 'messages':         return <ChatView />;
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
          profile={foProfile}
          unreadCount={unreadCount}
          pendingReconciliation={pendingReconciliation}
          overdueCount={overdueCount}
          onLogout={() => setLogoutOpen(true)}
        />

        {/* Main content */}
        <div className="flex-1 md:pl-20 xl:pl-64 flex flex-col min-h-screen overflow-y-auto max-w-full transition-all duration-300">
          <FOHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={foProfile}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={() => {}}
            onOpenSearch={() => setSearchOpen(true)}
            semesterLabel={foProfile.currentSemester}
            academicYear={foProfile.academicYear}
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
                  { id: 'student_accounts', label: 'Student Accounts' },
                  { id: 'payments', label: 'Payments' },
                  { id: 'receipts', label: 'Receipts' },
                  { id: 'outstanding', label: 'Outstanding Accounts' },
                  { id: 'reports', label: 'Financial Reports' },
                  { id: 'reconciliation', label: 'Payment Reconciliation' },
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
