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
import { ChatView } from '@/src/components/chat/ChatView';

export default function HRDashboardPage() {
  const [activeTab,     setRawTab]       = useState<HRNavTab>('overview');
  const [notifications, setNotifications] = useState<HRNotification[]>(initialNotifs);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [logoutOpen,    setLogoutOpen]    = useState(false);
  const [tabLoading,    setTabLoading]    = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
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
      case 'messages':       return <ChatView />;
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

      {/* HR Mobile Navigation Drawer Overlay */}
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
                    <h3 className="font-serif font-bold text-sm text-(--text-primary)">HR Officer</h3>
                    <p className="text-[10px] text-(--text-faint) font-mono">Human Resources Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary)">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {[
                  { id: 'overview', label: 'Dashboard' },
                  { id: 'employees', label: 'Employees' },
                  { id: 'onboarding', label: 'Onboarding' },
                  { id: 'leave', label: 'Leave Management' },
                  { id: 'payroll', label: 'Payroll' },
                  { id: 'performance', label: 'Performance' },
                  { id: 'documents', label: 'Documents' },
                  { id: 'reports', label: 'Reports' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'audit_log', label: 'Audit Logs' },
                  { id: 'settings', label: 'Settings' },
                ].map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as HRNavTab);
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

      <HRSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }} />
      <HRLogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
}
