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

export default function DepartmentHeadPage() {
  const [activeTab,     setActiveTab]     = useState<DHNavTab>('overview');
  const [notifications, setNotifications] = useState<DHNotification[]>(initialNotifs);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [logoutOpen,    setLogoutOpen]    = useState(false);

  const pendingCount = approvalRequests.filter((a) => a.status === 'Pending').length;
  const unreadCount  = notifications.filter((n) => !n.read).length;

  // Ctrl+K global search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
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
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/signout`,
      { method: 'POST', credentials: 'include' }
    );
    window.location.href = '/signin';
  };

  const renderView = () => {
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
      {/* Background — deep obsidian with subtle radial gold glow */}
      <div className="fixed inset-0 bg-[#0F0F10] pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-[#E9C349]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#E9C349]/4 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_edges,rgba(0,0,0,0.6)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 min-h-screen text-white">
        {/* Sidebar */}
        <DHSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={dhProfile}
          pendingCount={pendingCount}
          unreadCount={unreadCount}
          onLogout={() => setLogoutOpen(true)}
        />

        {/* Main content area */}
        <div className="md:pl-20 xl:pl-64 flex flex-col min-h-screen transition-all duration-300">
          <DHHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={dhProfile}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            onOpenSearch={() => setSearchOpen(true)}
            semesterLabel={dhProfile.currentSemester}
          />

          {/* Page content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
            {renderView()}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <DHMobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
          unreadCount={unreadCount}
        />
      </div>

      {/* Global modals */}
      <DHSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab) => { setActiveTab(tab); setSearchOpen(false); }}
      />
      <DHLogoutModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
