'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminNavTab, AdminNotification, UserRole } from '@/src/types/admin';
import { adminProfile } from '@/src/data/adminData';
import { adminNotifications as initialNotifs, maintenanceConfig } from '@/src/data/adminData2';
import { AdminSidebar }        from '@/src/components/admin/AdminSidebar';
import { AdminHeader }         from '@/src/components/admin/AdminHeader';
import { AdminMobileNav }      from '@/src/components/admin/AdminMobileNav';
import { AdminSearchModal }    from '@/src/components/admin/AdminSearchModal';
import { AdminLogoutModal }    from '@/src/components/admin/AdminLogoutModal';
import { ImpersonationBanner } from '@/src/components/admin/ImpersonationBanner';
import { AdminOverviewView }   from '@/src/components/admin/views/AdminOverviewView';
import { AdminUsersView }      from '@/src/components/admin/views/AdminUsersView';
import { AdminStudentsView }   from '@/src/components/admin/views/AdminStudentsView';
import { AdminFacultyView }    from '@/src/components/admin/views/AdminFacultyView';
import { AdminDepartmentsView} from '@/src/components/admin/views/AdminDepartmentsView';
import { AdminProgramsView }   from '@/src/components/admin/views/AdminProgramsView';
import { AdminAdmissionsView } from '@/src/components/admin/views/AdminAdmissionsView';
import { AdminSecurityView }   from '@/src/components/admin/views/AdminSecurityView';
import { AdminBackupView }     from '@/src/components/admin/views/AdminBackupView';
import { AdminPaymentsView }   from '@/src/components/admin/views/AdminPaymentsView';
import { AdminNotificationsView } from '@/src/components/admin/views/AdminNotificationsView';
import { AdminAuditLogsView }  from '@/src/components/admin/views/AdminAuditLogsView';
import { AdminSettingsView }   from '@/src/components/admin/views/AdminSettingsView';
import { AdminSystemConfigView } from '@/src/components/admin/views/AdminSystemConfigView';
import { ChatView } from '@/src/components/chat/ChatView';
import {
  AdminRegistrarView, AdminAttendanceView, AdminFinanceView,
  AdminHRView, AdminDocumentsView, AdminReportsView,
} from '@/src/components/admin/views/AdminGenericViews';
import { ToastContainer, useToast, SessionExpiredOverlay, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';

export default function AdminDashboardPage() {
  const [activeTab,       setRawTab]       = useState<AdminNavTab>('overview');
  const [notifications,   setNotifications] = useState<AdminNotification[]>(initialNotifs);
  const [searchOpen,      setSearchOpen]    = useState(false);
  const [logoutOpen,      setLogoutOpen]    = useState(false);
  const [tabLoading,      setTabLoading]    = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(maintenanceConfig.enabled);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [impersonating, setImpersonating]   = useState<{
    targetName: string; targetRole: UserRole; startTime: string;
  } | null>(null);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const unreadCount = notifications.filter(n => !n.read).length;

  const setActiveTab = (tab: AdminNavTab) => {
    if (tab === activeTab) return;
    setTabLoading(true);
    setTimeout(() => { setRawTab(tab); setTabLoading(false); }, 120);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
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
      case 'overview':      return <AdminOverviewView setActiveTab={setActiveTab} />;
      case 'users':         return <AdminUsersView />;
      case 'students':      return <AdminStudentsView />;
      case 'faculty':       return <AdminFacultyView />;
      case 'departments':   return <AdminDepartmentsView />;
      case 'programs':      return <AdminProgramsView />;
      case 'admissions':    return <AdminAdmissionsView />;
      case 'registrar':     return <AdminRegistrarView />;
      case 'attendance':    return <AdminAttendanceView />;
      case 'finance':       return <AdminFinanceView />;
      case 'hr':            return <AdminHRView />;
      case 'payments':      return <AdminPaymentsView />;
      case 'documents':     return <AdminDocumentsView />;
      case 'reports':       return <AdminReportsView />;
      case 'audit_logs':    return <AdminAuditLogsView />;
      case 'security':      return <AdminSecurityView />;
      case 'backup':        return <AdminBackupView />;
      case 'system_config': return <AdminSystemConfigView />;
      case 'notifications': return (
        <AdminNotificationsView
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          setActiveTab={setActiveTab}
        />
      );
      case 'settings':      return <AdminSettingsView profile={adminProfile} />;
      case 'messages':      return <ChatView />;
      default:              return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
      <SessionExpiredOverlay isVisible={false} onSignIn={() => { window.location.href = '/signin'; }} />

      <div className="dashboard-bg" aria-hidden="true" />

      <div className="dashboard-content">
        <AdminSidebar
          activeTab={activeTab} setActiveTab={setActiveTab} profile={adminProfile}
          unreadCount={unreadCount} onLogout={() => setLogoutOpen(true)}
        />
        <div className="md:pl-16 xl:pl-60 flex flex-col min-h-screen transition-all duration-300">
          <AdminHeader
            activeTab={activeTab} setActiveTab={setActiveTab} profile={adminProfile}
            notifications={notifications} unreadCount={unreadCount}
            onMarkRead={handleMarkRead} onOpenSearch={() => setSearchOpen(true)}
            academicYear="2024–2025" maintenanceMode={maintenanceMode}
            onMobileMenuToggle={() => setMobileMenuOpen(true)}
          />
          {impersonating && (
            <ImpersonationBanner
              targetName={impersonating.targetName}
              targetRole={impersonating.targetRole}
              startTime={impersonating.startTime}
              onExit={() => setImpersonating(null)}
            />
          )}
          <main id="main-content" className={`flex-1 px-4 sm:px-5 lg:px-7 pt-7 pb-24 md:pb-7 ${impersonating ? 'mt-10' : ''}`}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <AdminMobileNav activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={unreadCount} />
      </div>

      {/* Admin Mobile Navigation Drawer Overlay */}
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
                    <h3 className="font-serif font-bold text-sm text-(--text-primary)">System Admin</h3>
                    <p className="text-[10px] text-(--text-faint) font-mono">Executive Control</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary)">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {[
                  { id: 'overview', label: 'Executive Dashboard' },
                  { id: 'users', label: 'Users & Roles' },
                  { id: 'students', label: 'Students' },
                  { id: 'faculty', label: 'Faculty' },
                  { id: 'departments', label: 'Departments' },
                  { id: 'programs', label: 'Programs' },
                  { id: 'admissions', label: 'Admissions' },
                  { id: 'registrar', label: 'Registrar' },
                  { id: 'attendance', label: 'Attendance' },
                  { id: 'finance', label: 'Finance' },
                  { id: 'hr', label: 'HR Management' },
                  { id: 'payments', label: 'Payments' },
                  { id: 'documents', label: 'Documents' },
                  { id: 'reports', label: 'Reports' },
                  { id: 'audit_logs', label: 'Audit Logs' },
                  { id: 'security', label: 'Security Center' },
                  { id: 'backup', label: 'Backup & Recovery' },
                  { id: 'system_config', label: 'System Configuration' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'settings', label: 'Settings' },
                ].map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as AdminNavTab);
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

      <AdminSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }} />
      <AdminLogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
}
