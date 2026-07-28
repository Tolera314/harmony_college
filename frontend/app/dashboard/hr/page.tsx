'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HRNavTab, HRNotification } from '@/src/types/hr';
import { hrProfile, hrKPIs, hrNotifications as initialNotifs } from '@/src/data/hrData';
import { HRSidebar }           from '@/src/components/hr/HRSidebar';
import { HRHeader }            from '@/src/components/hr/HRHeader';
import { HRMobileNav }         from '@/src/components/hr/HRMobileNav';
import { HRSearchModal }       from '@/src/components/hr/HRSearchModal';
import { HRLogoutModal }       from '@/src/components/hr/HRLogoutModal';
import { HROverviewView }      from '@/src/components/hr/views/HROverviewView';
import { HREmployeesView }     from '@/src/components/hr/views/HREmployeesView';
import { HROnboardingView }    from '@/src/components/hr/views/HROnboardingView';
import { HRLeaveView }         from '@/src/components/hr/views/HRLeaveView';
import { HRPayrollView }       from '@/src/components/hr/views/HRPayrollView';
import { HRPerformanceView }   from '@/src/components/hr/views/HRPerformanceView';
import { HRDocumentsView }     from '@/src/components/hr/views/HRDocumentsView';
import { HRReportsView }       from '@/src/components/hr/views/HRReportsView';
import { HRNotificationsView } from '@/src/components/hr/views/HRNotificationsView';
import { HRAuditLogView }      from '@/src/components/hr/views/HRAuditLogView';
import { HRSettingsView }      from '@/src/components/hr/views/HRSettingsView';
import { ToastContainer, useToast, SessionExpiredOverlay, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';

export default function HRDashboardPage() {
  const [activeTab,     setRawTab]       = useState<HRNavTab>('overview');
  const [notifications, setNotifications] = useState<HRNotification[]>(initialNotifs);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [logoutOpen,    setLogoutOpen]    = useState(false);
  const [tabLoading,    setTabLoading]    = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const unreadCount  = notifications.filter(n => !n.read).length;
  const pendingLeave = hrKPIs.pendingLeaveRequests;

  const setActiveTab = (tab: HRNavTab) => {
    if (tab === activeTab) return;
    setTabLoading(true);
    setTimeout(() => { setRawTab(tab); setTabLoading(false); }, 120);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleLogout = async () => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/signout`,
      { method: 'POST', credentials: 'include' }
    ).catch(() => {});
    window.location.href = '/signin';
  };

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'overview':       return <HROverviewView setActiveTab={setActiveTab} />;
      case 'employees':      return <HREmployeesView />;
      case 'onboarding':     return <HROnboardingView />;
      case 'leave':          return <HRLeaveView />;
      case 'payroll':        return <HRPayrollView />;
      case 'performance':    return <HRPerformanceView />;
      case 'documents':      return <HRDocumentsView />;
      case 'reports':        return <HRReportsView />;
      case 'notifications':  return (
        <HRNotificationsView
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          setActiveTab={setActiveTab}
        />
      );
      case 'audit_log':      return <HRAuditLogView />;
      case 'settings':       return <HRSettingsView profile={hrProfile} />;
      default:               return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
      <SessionExpiredOverlay isVisible={false} onSignIn={() => { window.location.href = '/signin'; }} />

      <div className="dashboard-bg" aria-hidden="true" />

      <div className="dashboard-content">
        <HRSidebar
          activeTab={activeTab} setActiveTab={setActiveTab} profile={hrProfile}
          unreadCount={unreadCount} pendingLeave={pendingLeave} onLogout={() => setLogoutOpen(true)}
        />
        <div className="md:pl-20 xl:pl-64 flex flex-col min-h-screen transition-all duration-300">
          <HRHeader
            activeTab={activeTab} setActiveTab={setActiveTab} profile={hrProfile}
            notifications={notifications} unreadCount={unreadCount}
            onMarkRead={handleMarkRead} onOpenSearch={() => setSearchOpen(true)}
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

      <HRSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }} />
      <HRLogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
}
