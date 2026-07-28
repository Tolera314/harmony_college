'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { InstructorNavTab, InstructorNotification } from '@/src/types/instructor';
import { instructorProfile, instructorNotifications as initialNotifs, instructorKPIs } from '@/src/data/instructorData';
import { attendanceSessions } from '@/src/data/instructorData';
import { InSidebar }           from '@/src/components/instructor/InSidebar';
import { InHeader }            from '@/src/components/instructor/InHeader';
import { InMobileNav }         from '@/src/components/instructor/InMobileNav';
import { InSearchModal }       from '@/src/components/instructor/InSearchModal';
import { DHLogoutModal }       from '@/src/components/dh/DHLogoutModal';
import { InOverviewView }      from '@/src/components/instructor/views/InOverviewView';
import { InMyClassesView }     from '@/src/components/instructor/views/InMyClassesView';
import { InAttendanceView }    from '@/src/components/instructor/views/InAttendanceView';
import { InStudentsView }      from '@/src/components/instructor/views/InStudentsView';
import { InGradesView }        from '@/src/components/instructor/views/InGradesView';
import { InMaterialsView }     from '@/src/components/instructor/views/InMaterialsView';
import { InAnnouncementsView } from '@/src/components/instructor/views/InAnnouncementsView';
import { InReportsView }       from '@/src/components/instructor/views/InReportsView';
import { InNotificationsView } from '@/src/components/instructor/views/InNotificationsView';
import { InAuditLogView }      from '@/src/components/instructor/views/InAuditLogView';
import { InSettingsView }      from '@/src/components/instructor/views/InSettingsView';
import { ToastContainer, useToast, SessionExpiredOverlay, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';

export default function InstructorDashboardPage() {
  const [activeTab,     setRawTab]       = useState<InstructorNavTab>('overview');
  const [notifications, setNotifications] = useState<InstructorNotification[]>(initialNotifs);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [logoutOpen,    setLogoutOpen]    = useState(false);
  const [tabLoading,    setTabLoading]    = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const unreadCount    = notifications.filter(n => !n.read).length;
  const pendingGrades  = instructorKPIs.pendingGrades;
  const activeSession  = attendanceSessions.some(s => s.isActive);

  const setActiveTab = (tab: InstructorNavTab) => {
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
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/signout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/signin';
  };

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'overview':       return <InOverviewView profile={instructorProfile} setActiveTab={setActiveTab} />;
      case 'my_classes':     return <InMyClassesView setActiveTab={setActiveTab} />;
      case 'attendance':     return <InAttendanceView />;
      case 'students':       return <InStudentsView />;
      case 'grades':         return <InGradesView />;
      case 'materials':      return <InMaterialsView />;
      case 'announcements':  return <InAnnouncementsView />;
      case 'reports':        return <InReportsView />;
      case 'notifications':  return <InNotificationsView notifications={notifications} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} setActiveTab={setActiveTab} />;
      case 'audit_log':      return <InAuditLogView />;
      case 'settings':       return <InSettingsView profile={instructorProfile} />;
      default:               return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
      <div className="dashboard-bg" aria-hidden="true" />
      <div className="dashboard-content">
        <InSidebar activeTab={activeTab} setActiveTab={setActiveTab} profile={instructorProfile} unreadCount={unreadCount} pendingGrades={pendingGrades} activeSession={activeSession} onLogout={() => setLogoutOpen(true)} />
        <div className="md:pl-20 xl:pl-64 flex flex-col min-h-screen transition-all duration-300">
          <InHeader activeTab={activeTab} setActiveTab={setActiveTab} profile={instructorProfile} notifications={notifications} unreadCount={unreadCount} onMarkRead={handleMarkRead} onOpenSearch={() => setSearchOpen(true)} />
          <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <InMobileNav activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={unreadCount} pendingGrades={pendingGrades} activeSession={activeSession} />
      </div>
      <InSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }} />
      <DHLogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogout} />
    </>
  );
}
