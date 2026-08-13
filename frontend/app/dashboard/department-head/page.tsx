'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DHNavTab, DHNotification } from '@/src/types/department';
import { dhProfile, notifications as initialNotifs, approvalRequests } from '@/src/data/departmentData';
import { DHSidebar }           from '@/src/components/dh/DHSidebar';
import { DHHeader }            from '@/src/components/dh/DHHeader';
import { DHMobileNav }         from '@/src/components/dh/DHMobileNav';
import { DHSearchModal }       from '@/src/components/dh/DHSearchModal';
import { DHLogoutModal }       from '@/src/components/dh/DHLogoutModal';
import { DHOverviewView }      from '@/src/components/dh/views/DHOverviewView';
import { DHCoursesView }       from '@/src/components/dh/views/DHCoursesView';
import { DHFacultyView }       from '@/src/components/dh/views/DHFacultyView';
import { DHStudentsView }      from '@/src/components/dh/views/DHStudentsView';
import { DHApprovalsView }     from '@/src/components/dh/views/DHApprovalsView';
import { DHLeaveRequestsView } from '@/src/components/dh/views/DHLeaveRequestsView';
import { DHReportsView }       from '@/src/components/dh/views/DHReportsView';
import { DHAttendanceView }    from '@/src/components/dh/views/DHAttendanceView';
import { DHNotificationsView } from '@/src/components/dh/views/DHNotificationsView';
import { DHAuditLogView }      from '@/src/components/dh/views/DHAuditLogView';
import { DHSettingsView }      from '@/src/components/dh/views/DHSettingsView';
import { ToastContainer, useToast, SessionExpiredOverlay, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';

export default function DepartmentHeadPage() {
  const [activeTab,     setRawTab]       = useState<DHNavTab>('overview');
  const [notifications, setNotifications] = useState<DHNotification[]>(initialNotifs);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [logoutOpen,    setLogoutOpen]    = useState(false);
  const [tabLoading,    setTabLoading]    = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const pendingCount = approvalRequests.filter(a => a.status === 'Pending').length;
  const unreadCount  = notifications.filter(n => !n.read).length;

  const setActiveTab = (tab: DHNavTab) => {
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
      case 'overview':       return <DHOverviewView profile={dhProfile} setActiveTab={setActiveTab} />;
      case 'courses':        return <DHCoursesView />;
      case 'faculty':        return <DHFacultyView />;
      case 'students':       return <DHStudentsView />;
      case 'approvals':      return <DHApprovalsView />;
      case 'leave_requests': return <DHLeaveRequestsView />;
      case 'reports':        return <DHReportsView />;
      case 'attendance':     return <DHAttendanceView />;
      case 'notifications':  return (
        <DHNotificationsView
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          setActiveTab={setActiveTab}
        />
      );
      case 'audit_log':      return <DHAuditLogView />;
      case 'settings':       return <DHSettingsView profile={dhProfile} />;
      default:               return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
      <SessionExpiredOverlay isVisible={false} onSignIn={() => { window.location.href = '/signin'; }} />

      <div className="dashboard-bg" aria-hidden="true" />

      <div className="dashboard-content">
        <DHSidebar
          activeTab={activeTab} setActiveTab={setActiveTab} profile={dhProfile}
          pendingCount={pendingCount} unreadCount={unreadCount} onLogout={() => setLogoutOpen(true)}
        />
        <div className="md:pl-20 xl:pl-64 flex flex-col min-h-screen transition-all duration-300">
          <DHHeader
            activeTab={activeTab} setActiveTab={setActiveTab} profile={dhProfile}
            notifications={notifications} unreadCount={unreadCount}
            onMarkRead={handleMarkRead} onOpenSearch={() => setSearchOpen(true)}
            semesterLabel={dhProfile.currentSemester}
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
        <DHMobileNav activeTab={activeTab} setActiveTab={setActiveTab} pendingCount={pendingCount} unreadCount={unreadCount} />
      </div>

      {/* Department Head Mobile Navigation Drawer Overlay */}
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
                    <h3 className="font-serif font-bold text-sm text-(--text-primary)">Department Head</h3>
                    <p className="text-[10px] text-(--text-faint) font-mono">Academic Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary)">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {[
                  { id: 'overview', label: 'Dashboard' },
                  { id: 'courses', label: 'Course Offerings' },
                  { id: 'faculty', label: 'Faculty Management' },
                  { id: 'students', label: 'Student Performance' },
                  { id: 'reports', label: 'Department Reports' },
                  { id: 'attendance', label: 'Attendance Tracking' },
                  { id: 'approvals', label: 'Approval Center' },
                  { id: 'leave_requests', label: 'Faculty Leave Requests' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'audit_log', label: 'Audit Log' },
                  { id: 'settings', label: 'Settings' },
                ].map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as DHNavTab);
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

      <DHSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }} />
      <DHLogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
}
