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

export default function FinanceOfficerPage() {
  const [activeTab,     setActiveTab]     = useState<FONavTab>('overview');
  const [notifications, setNotifications] = useState<FONotification[]>(initialNotifs);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [logoutOpen,    setLogoutOpen]    = useState(false);

  const unreadCount           = notifications.filter((n) => !n.read).length;
  const pendingReconciliation = reconciliationEntries.filter((e) => e.status === 'Unmatched' || e.status === 'Pending Review').length;
  const overdueCount          = financeStudents.filter((s) => s.riskLevel === 'Critical' || s.paymentStatus === 'Overdue').length;

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
      {/* Background — deep obsidian with soft radial gold gradients */}
      <div className="fixed inset-0 bg-[var(--bg-base)] transition-colors duration-300 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] bg-[#E9C349]/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#E9C349]/4 rounded-full blur-[120px]" />
        <div className="absolute top-3/4 left-1/4 w-[400px] h-[400px] bg-[#E9C349]/3 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_edges,rgba(0,0,0,0.5)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 min-h-screen text-white">
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

          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
            {renderView()}
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
