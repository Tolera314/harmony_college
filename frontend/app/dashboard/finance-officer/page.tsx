'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FONavTab, FONotification } from '@/src/types/finance';
import { foProfile, foNotifications as initialNotifs, reconciliationEntries, financeStudents } from '@/src/data/financeData';
import { FOSidebar }           from '@/src/components/fo/FOSidebar';
import { FOHeader }            from '@/src/components/fo/FOHeader';
import { FOMobileNav }         from '@/src/components/fo/FOMobileNav';
import { FOSearchModal }       from '@/src/components/fo/FOSearchModal';
import { FOLogoutModal }       from '@/src/components/fo/FOLogoutModal';
import { FOOverviewView }        from '@/src/components/fo/views/FOOverviewView';
import { FOStudentAccountsView } from '@/src/components/fo/views/FOStudentAccountsView';
import { FOPaymentsView }        from '@/src/components/fo/views/FOPaymentsView';
import { FOReceiptsView }        from '@/src/components/fo/views/FOReceiptsView';
import { FOOutstandingView }     from '@/src/components/fo/views/FOOutstandingView';
import { FOReportsView }         from '@/src/components/fo/views/FOReportsView';
import { FOReconciliationView }  from '@/src/components/fo/views/FOReconciliationView';
import { FONotificationsView }   from '@/src/components/fo/views/FONotificationsView';
import { FOAuditLogView }        from '@/src/components/fo/views/FOAuditLogView';
import { FOSettingsView }        from '@/src/components/fo/views/FOSettingsView';
import { ToastContainer, useToast, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';

export default function FinanceOfficerPage() {
  const [activeTab,     setRawTab]       = useState<FONavTab>('overview');
  const [notifications, setNotifications] = useState<FONotification[]>(initialNotifs);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [logoutOpen,    setLogoutOpen]    = useState(false);
  const [tabLoading,    setTabLoading]    = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const unreadCount           = notifications.filter((n) => !n.read).length;
  const pendingReconciliation = reconciliationEntries.filter((e) => e.status === 'Unmatched' || e.status === 'Pending Review').length;
  const overdueCount          = financeStudents.filter((s) => s.riskLevel === 'Critical' || s.paymentStatus === 'Overdue').length;

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
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/signout`,
        { method: 'POST', credentials: 'include' }
      );
    } catch (_) {
      // proceed even if the request fails
    }
    window.location.href = '/signin';
  };

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'overview':         return <FOOverviewView setActiveTab={setActiveTab} />;
      case 'student_accounts': return <FOStudentAccountsView />;
      case 'payments':         return <FOPaymentsView />;
      case 'receipts':         return <FOReceiptsView />;
      case 'outstanding':      return <FOOutstandingView />;
      case 'reports':          return <FOReportsView />;
      case 'reconciliation':   return <FOReconciliationView />;
      case 'notifications':    return (
        <FONotificationsView
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          setActiveTab={setActiveTab}
        />
      );
      case 'audit_log':        return <FOAuditLogView />;
      case 'settings':         return <FOSettingsView />;
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
        <div className="md:pl-20 xl:pl-64 flex flex-col min-h-screen transition-all duration-300">
          <FOHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={foProfile}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            onOpenSearch={() => setSearchOpen(true)}
            semesterLabel={foProfile.currentSemester}
            academicYear={foProfile.academicYear}
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
