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

      <AdminSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }} />
      <AdminLogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
}
