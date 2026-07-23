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

export default function AdminDashboardPage() {
  const [activeTab,       setActiveTab]       = useState<AdminNavTab>('overview');
  const [notifications,   setNotifications]   = useState<AdminNotification[]>(initialNotifs);
  const [searchOpen,      setSearchOpen]      = useState(false);
  const [logoutOpen,      setLogoutOpen]      = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(maintenanceConfig.enabled);

  // Impersonation state
  const [impersonating, setImpersonating] = useState<{
    targetName: string; targetRole: UserRole; startTime: string;
  } | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Ctrl+K
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
      case 'settings': return <AdminSettingsView profile={adminProfile} />;
      default: return null;
    }
  };

  const sidebarOffset = impersonating ? 'md:pl-16 xl:pl-60' : 'md:pl-16 xl:pl-60';

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 bg-[#0F0F10] pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] bg-[#E9C349]/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#E9C349]/3 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_edges,rgba(0,0,0,0.7)_0%,transparent_65%)]" />
      </div>

      <div className="relative z-10 min-h-screen text-white">
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={adminProfile}
          unreadCount={unreadCount}
          onLogout={() => setLogoutOpen(true)}
        />

        <div className={`${sidebarOffset} flex flex-col min-h-screen transition-all duration-300`}>
          <AdminHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={adminProfile}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            onOpenSearch={() => setSearchOpen(true)}
            academicYear="2024–2025"
            maintenanceMode={maintenanceMode}
          />

          {/* Impersonation banner */}
          {impersonating && (
            <ImpersonationBanner
              targetName={impersonating.targetName}
              targetRole={impersonating.targetRole}
              startTime={impersonating.startTime}
              onExit={() => setImpersonating(null)}
            />
          )}

          <main className={`flex-1 px-4 sm:px-5 lg:px-7 pt-7 pb-24 md:pb-7 ${impersonating ? 'mt-10' : ''}`}>
            {renderView()}
          </main>
        </div>

        <AdminMobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCount={unreadCount}
        />
      </div>

      <AdminSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }}
      />
      <AdminLogoutModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
