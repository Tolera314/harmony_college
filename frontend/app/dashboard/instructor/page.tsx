'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { InstructorNavTab } from '@/src/types/instructor';
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
import { InAssignmentsView }   from '@/src/components/instructor/views/InAssignmentsView';
import { InQuizzesView }       from '@/src/components/instructor/views/InQuizzesView';
import { InMaterialsView }     from '@/src/components/instructor/views/InMaterialsView';
import { InAnnouncementsView } from '@/src/components/instructor/views/InAnnouncementsView';
import { InReportsView }       from '@/src/components/instructor/views/InReportsView';
import { InNotificationsView } from '@/src/components/instructor/views/InNotificationsView';
import { InAuditLogView }      from '@/src/components/instructor/views/InAuditLogView';
import { InSettingsView }      from '@/src/components/instructor/views/InSettingsView';
import { ToastContainer, useToast, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';
import { ChatView } from '@/src/components/chat/ChatView';
import { instructorDashboardApi, instructorNotificationsApi, type ApiNotification, type DashboardData } from '@/src/lib/instructorApi';

// ── Fallback profile shape (populated from API) ───────────────────────────────
const EMPTY_PROFILE = {
  name: '…',
  title: '',
  department: '',
  email: '',
  phone: '',
  officeRoom: '',
  avatar: '/logo2.jpg',
  employeeId: '',
  academicYear: '',
  currentSemester: '',
  specialization: '',
};

// Adapter: convert API response to the InstructorProfile shape expected by UI
function toProfile(data: DashboardData) {
  const i = data.instructor;
  return {
    name:            `${i.title ? i.title + ' ' : ''}${i.fullName}`,
    title:           i.title   ?? '',
    department:      i.department.name,
    email:           i.email   ?? '',
    phone:           i.phone   ?? '',
    officeRoom:      '',
    avatar:          '/logo2.jpg',
    employeeId:      i.employeeId,
    academicYear:    '',          // filled dynamically from offerings
    currentSemester: '',          // filled dynamically
    specialization:  i.specialization ?? '',
  };
}

export default function InstructorDashboardPage() {
  const [activeTab,      setRawTab]       = useState<InstructorNavTab>('overview');
  const [tabLoading,     setTabLoading]   = useState(false);
  const [searchOpen,     setSearchOpen]   = useState(false);
  const [logoutOpen,     setLogoutOpen]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real data
  const [dashData,       setDashData]     = useState<DashboardData | null>(null);
  const [dashLoading,    setDashLoading]  = useState(true);
  const [notifications,  setNotifications] = useState<ApiNotification[]>([]); // full ApiNotification[]
  const [unreadCount,    setUnreadCount]  = useState(0);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Load dashboard data (profile + KPIs) ────────────────────────────────
  const loadDashboard = useCallback(async () => {
    try {
      const data = await instructorDashboardApi.get();
      setDashData(data);
      // Adapt dashboard's slim notification shape to the full ApiNotification shape
      const adapted: ApiNotification[] = data.notifications.map(n => ({
        id:         n.id,
        userId:     '',        // not returned by dashboard summary
        title:      n.title,
        message:    n.message,
        type:       n.type,
        isRead:     n.isRead,
        entityType: null,
        entityId:   null,
        createdAt:  n.createdAt,
      }));
      setNotifications(adapted);
      setUnreadCount(data.unreadNotifications);
    } catch (e) {
      // Dashboard load failed — show toast but don't crash
      showToast(e instanceof Error ? e.message : 'Failed to load dashboard', 'error');
    } finally {
      setDashLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ── Load full notifications when tab opens ───────────────────────────────
  const loadNotifications = useCallback(async () => {
    try {
      const res = await instructorNotificationsApi.list({ limit: 50 });
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch { /* keep existing */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') loadNotifications();
  }, [activeTab, loadNotifications]);

  // ── Keyboard shortcut Ctrl+K / Cmd+K ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const setActiveTab = (tab: InstructorNavTab) => {
    if (tab === activeTab) return;
    setTabLoading(true);
    setTimeout(() => { setRawTab(tab); setTabLoading(false); }, 120);
  };

  // ── Notification helpers ─────────────────────────────────────────────────
  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try { await instructorNotificationsApi.markRead(id); } catch { /* optimistic update stands */ }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try { await instructorNotificationsApi.markAllRead(); } catch { /* optimistic */ }
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/signin';
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const profile = dashData ? toProfile(dashData) : EMPTY_PROFILE;
  // Check if any attendance session is currently OPEN
  const activeSession = dashData?.todaySessions.some(
    s => s.attendanceSessionLifecycle === 'OPEN',
  ) ?? false;
  const pendingGrades = dashData?.kpis.ungradedSubmissions ?? 0;

  const navItemsList: { id: InstructorNavTab; label: string }[] = [
    { id: 'overview',      label: 'Dashboard' },
    { id: 'my_classes',    label: 'My Classes' },
    { id: 'attendance',    label: 'Attendance' },
    { id: 'students',      label: 'Students' },
    { id: 'grades',        label: 'Grades' },
    { id: 'assignments',   label: 'Assignments' },
    { id: 'quizzes',       label: 'Quizzes & Exams' },
    { id: 'materials',     label: 'Course Materials' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'reports',       label: 'Reports' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'audit_log',     label: 'Audit Log' },
    { id: 'settings',      label: 'Settings' },
  ];

  // ── Adapt notifications for the header dropdown ───────────────────────────
  const headerNotifications = notifications.map(n => ({
    id:        n.id,
    type:      (n.type?.toLowerCase() ?? 'system') as any,
    title:     n.title,
    message:   n.message,
    timestamp: new Date(n.createdAt).toLocaleString(),
    read:      n.isRead,
    tab:       'notifications' as InstructorNavTab,
  }));

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'overview':
        return (
          <InOverviewView
            profile={profile}
            dashData={dashData}
            setActiveTab={setActiveTab}
          />
        );
      case 'my_classes':
        return <InMyClassesView setActiveTab={setActiveTab} />;
      case 'attendance':
        return <InAttendanceView />;
      case 'students':
        return <InStudentsView />;
      case 'grades':
        return <InGradesView />;
      case 'assignments':
        return <InAssignmentsView />;
      case 'quizzes':
        return <InQuizzesView />;
      case 'materials':
        return <InMaterialsView />;
      case 'announcements':
        return <InAnnouncementsView />;
      case 'reports':
        return <InReportsView />;
      case 'notifications':
        return (
          <InNotificationsView
            notifications={headerNotifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            setActiveTab={setActiveTab}
          />
        );
      case 'audit_log':
        return <InAuditLogView />;
      case 'settings':
        return <InSettingsView profile={profile} />;
      case 'messages':
        return <ChatView />;
      default:
        return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
      <div className="dashboard-bg" aria-hidden="true" />
      <div className="dashboard-content">
        <InSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={profile}
          unreadCount={unreadCount}
          pendingGrades={pendingGrades}
          activeSession={activeSession}
          onLogout={() => setLogoutOpen(true)}
        />
        <div className="flex-1 md:pl-20 xl:pl-64 flex flex-col min-h-screen overflow-y-auto max-w-full transition-all duration-300">
          <InHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={profile}
            notifications={headerNotifications}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            onOpenSearch={() => setSearchOpen(true)}
            onMobileMenuToggle={() => setMobileMenuOpen(true)}
          />
          <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
            {dashLoading && activeTab === 'overview' ? (
              <SkeletonPage />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {renderView()}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>
        <InMobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCount={unreadCount}
          pendingGrades={pendingGrades}
          activeSession={activeSession}
        />
      </div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-(--bg-modal) border-r border-(--border-default) flex flex-col md:hidden shadow-2xl"
            >
              <div className="p-4 border-b border-(--border-subtle) flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl text-(--text-inverse) flex items-center justify-center font-serif font-bold text-lg shadow bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-gold-dark)]">
                    H
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-(--text-primary)">Instructor Desk</h3>
                    <p className="text-[10px] text-(--text-faint) font-mono">Faculty Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary)">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {navItemsList.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--brand-gold)/20' : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary)'}`}
                    >
                      <span>{item.label}</span>
                      {isActive && <span className="text-(--brand-gold)">→</span>}
                    </button>
                  );
                })}
              </div>
              <div className="p-3 border-t border-(--border-subtle) space-y-1">
                <button
                  onClick={() => { setMobileMenuOpen(false); setLogoutOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-(--status-danger) hover:bg-(--status-danger-bg) transition-all"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <InSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }}
      />
      <DHLogoutModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
