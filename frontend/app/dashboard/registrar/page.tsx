'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '@/src/hooks/useNotifications';
import { MessagingView } from '@/src/components/messaging/MessagingView';
import {
  ClipboardList, BookOpen, GraduationCap, FileText,
  Users, ShieldAlert, ChevronRight, Calendar, Send,
  ShieldCheck, Grid, LayoutDashboard, Clock, BarChart3,
  Settings, X, LogOut, UserCheck, ToggleLeft, ToggleRight,
  Award,
} from 'lucide-react';
import { Sidebar, GenericNavItem } from '@/src/components/layout/Sidebar';
import { Header } from '@/src/components/layout/Header';
import { MobileNav, GenericMobileNavItem } from '@/src/components/layout/MobileNav';
import { DHLogoutModal } from '@/src/components/dh/DHLogoutModal';
import { ToastContainer, useToast, SkeletonPage } from '@/src/components/ui/States';
import dynamic from 'next/dynamic';
import { settingsApi, notificationsApi, registrarNotifApi, type RegistrarProfile, type RegistrarNotification } from '@/src/lib/registrarApi';

import { DashboardOverview } from '@/src/components/registrar/DashboardOverview';

const RegistrarStudentsView  = dynamic(() => import('@/src/components/registrar/RegistrarStudentsView').then(m => m.RegistrarStudentsView), { ssr: false });
const StudentGradesView      = dynamic(() => import('@/src/components/registrar/StudentGradesView').then(m => m.StudentGradesView), { ssr: false });
const AssignInstructorView   = dynamic(() => import('@/src/components/registrar/AssignInstructorView').then(m => m.AssignInstructorView), { ssr: false });
const RegistrarOnboardingsView = dynamic(() => import('@/src/components/registrar/RegistrarOnboardingsView').then(m => m.RegistrarOnboardingsView), { ssr: false });
const AdmissionsManagement   = dynamic(() => import('@/src/components/registrar/AdmissionsManagement').then(m => m.AdmissionsManagement), { ssr: false });
const CourseCatalog          = dynamic(() => import('@/src/components/registrar/CourseCatalog').then(m => m.CourseCatalog), { ssr: false });
const CourseOfferings        = dynamic(() => import('@/src/components/registrar/CourseOfferings').then(m => m.CourseOfferings), { ssr: false });
const ClassTimetable         = dynamic(() => import('@/src/components/registrar/ClassTimetable').then(m => m.ClassTimetable), { ssr: false });
const EnrollmentManagement   = dynamic(() => import('@/src/components/registrar/EnrollmentManagement').then(m => m.EnrollmentManagement), { ssr: false });
const TranscriptServices     = dynamic(() => import('@/src/components/registrar/TranscriptServices').then(m => m.TranscriptServices), { ssr: false });
const GraduationAuditing     = dynamic(() => import('@/src/components/registrar/GraduationAuditing').then(m => m.GraduationAuditing), { ssr: false });
const DigitalCertificates    = dynamic(() => import('@/src/components/registrar/DigitalCertificates').then(m => m.DigitalCertificates), { ssr: false });
const InteractiveReports     = dynamic(() => import('@/src/components/registrar/InteractiveReports').then(m => m.InteractiveReports), { ssr: false });
const AcademicCalendarView   = dynamic(() => import('@/src/components/registrar/AcademicCalendarView').then(m => m.AcademicCalendarView), { ssr: false });
const AnnouncementsManager   = dynamic(() => import('@/src/components/registrar/AnnouncementsManager').then(m => m.AnnouncementsManager), { ssr: false });
const AuditLogsTimeline      = dynamic(() => import('@/src/components/registrar/AuditLogsTimeline').then(m => m.AuditLogsTimeline), { ssr: false });
const RegistrarSettings      = dynamic(() => import('@/src/components/registrar/RegistrarSettings').then(m => m.RegistrarSettings), { ssr: false });

// ─────────────────────────────────────────────────────────────────────────────

type RegistrarTab =
  | 'dashboard' | 'students' | 'student_grades' | 'assign_instructor' | 'onboardings' | 'admissions' | 'enrollments' | 'catalog' | 'offerings'
  | 'timetable' | 'registration' | 'transcripts' | 'graduation' | 'certificates'
  | 'reports' | 'calendar' | 'announcements' | 'audit_logs' | 'settings' | 'messages';

interface MenuItem { id: RegistrarTab; label: string; icon: React.ComponentType<any> }

const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard',         label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'students',          label: 'Student Records',     icon: Users },
  { id: 'student_grades',    label: 'Student Grades',      icon: Award },
  { id: 'assign_instructor', label: 'Assign Instructor',   icon: UserCheck },
  { id: 'onboardings',       label: 'Onboardings',         icon: ClipboardList },
  { id: 'admissions',   label: 'Admissions',          icon: ClipboardList },
  { id: 'enrollments',  label: 'Course Enrollments',  icon: BookOpen },
  { id: 'catalog',      label: 'Course Catalog',      icon: BookOpen },
  { id: 'offerings',    label: 'Course Offerings',    icon: Grid },
  { id: 'timetable',    label: 'Class Timetable',     icon: Clock },
  { id: 'transcripts',  label: 'Transcripts',         icon: FileText },
  { id: 'graduation',   label: 'Graduation Auditing', icon: GraduationCap },
  { id: 'certificates', label: 'Digital Certificates',icon: ShieldCheck },
  { id: 'reports',      label: 'Interactive Reports', icon: BarChart3 },
  { id: 'calendar',     label: 'Academic Calendar',   icon: Calendar },
  { id: 'announcements',label: 'Announcements',       icon: Send },
  { id: 'audit_logs',   label: 'Audit Logs',          icon: ShieldAlert },
  { id: 'settings',     label: 'Settings',            icon: Settings },
];

const TAB_LABELS: Record<string, string> = {
  ...Object.fromEntries(MENU_ITEMS.map(m => [m.id, m.label])),
  settings: 'Settings Board',
  registration: 'Registration Settings',
  messages: 'Messages',
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification → Tab mapping
// ─────────────────────────────────────────────────────────────────────────────
function notifTab(n: RegistrarNotification): RegistrarTab {
  const { action } = n;
  if (action.startsWith('ADMISSION'))   return 'admissions';
  if (action.startsWith('STUDENT'))     return 'students';
  if (action.startsWith('COURSE_C') || action === 'COURSE_UPDATED' || action === 'COURSE_DEACTIVATED' || action === 'COURSE_REACTIVATED') return 'catalog';
  if (action.startsWith('OFFERING'))    return 'offerings';
  if (action.startsWith('ENROLLMENT'))  return 'enrollments';
  if (action.startsWith('TIMETABLE'))   return 'timetable';
  if (action.startsWith('TRANSCRIPT'))  return 'transcripts';
  if (action.startsWith('GRADUATION'))  return 'graduation';
  if (action.startsWith('CERTIFICATE')) return 'certificates';
  if (action.startsWith('ANNOUNCEMENT'))return 'announcements';
  if (action.startsWith('CALENDAR'))    return 'calendar';
  return 'audit_logs';
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert real audit-log notifications into the format the shared Header expects
// ─────────────────────────────────────────────────────────────────────────────
function toHeaderNotifs(logs: RegistrarNotification[]) {
  return logs.map(n => ({
    id:   n.id,
    text: n.description,
    time: new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    read: false,
    // store tab destination so we can use it on click (via searchResults hack)
    _tab: notifTab(n),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Build searchResults that also include real DB entities
// (The shared Header supports searchResults as { id: T; label: string; sub? }[])
// We extend it with real-time debounced search through the API.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function RegistrarDashboardPage() {
  const [activeTab,      setRawTab]   = useState<RegistrarTab>('dashboard');
  const [tabLoading,     setTabLoading]  = useState(false);
  const [sidebarCollapsed, setSC]     = useState(false);
  const [mobileMenuOpen,   setMM]     = useState(false);
  const [logoutOpen,       setLogout] = useState(false);

  const [profile,       setProfile]  = useState<RegistrarProfile | null>(null);
  const [auditLogs,     setAuditLogs] = useState<RegistrarNotification[]>([]);

  // ── TVET / Short Program switch — persisted across page navigation ─────────
  const [registrarProgramType, setRegistrarProgramType] = useState<'TVET' | 'SHORT_PROGRAM'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('registrar_program_type');
      if (saved === 'TVET' || saved === 'SHORT_PROGRAM') return saved;
    }
    return 'TVET';
  });

  const setProgramType = (pt: 'TVET' | 'SHORT_PROGRAM') => {
    setRegistrarProgramType(pt);
    localStorage.setItem('registrar_program_type', pt);
  };

  // ── Real-time notification badge ────────────────────────────────────────────
  const fetchNotifs = useCallback(() => registrarNotifApi.list({ limit: 20 }), []);
  const markNotifRead = useCallback((id: string) => registrarNotifApi.markRead(id), []);
  const markAllNotifsRead = useCallback(() => registrarNotifApi.markAllRead(), []);

  const { unreadCount } = useNotifications({
    fetchFn:       fetchNotifs,
    markReadFn:    markNotifRead,
    markAllReadFn: markAllNotifsRead,
  });


  // Real-time search state — debounced API query
  const [searchQuery,   setSearchQuery]  = useState('');
  const [searchResults, setSearchResults] = useState<{ id: RegistrarTab; label: string; sub?: string }[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { toast, show: showToast, hide: hideToast } = useToast();

  // Load real profile + recent audit activity on mount
  useEffect(() => {
    settingsApi.getProfile().then(setProfile).catch(() => {});
    notificationsApi.list(12).then(r => {
      const logs = r.logs ?? [];
      setAuditLogs(logs);

    }).catch(() => {});
  }, []);

  // Debounced real search — queries /api/registrar/search?q=
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }

    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/registrar/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        // Map DB results + tab results into the Header's expected shape.
        // DB results all map to a tab (e.g. multiple offerings → 'offerings').
        // We deduplicate: keep only the first DB result per tab, then add
        // tab-name matches that don't overlap. This prevents duplicate keys.
        const seen = new Set<string>();
        const dbMapped: { id: RegistrarTab; label: string; sub?: string }[] = [];
        for (const r of (data.results ?? [])) {
          const key = `${r.type}:${r.tab}`;
          if (!seen.has(key)) {
            seen.add(key);
            dbMapped.push({
              id:    r.tab as RegistrarTab,
              label: r.label,
              sub:   r.sub ? `${r.type.toUpperCase()} · ${r.sub}` : r.type.toUpperCase(),
            });
          }
        }
        const tabMatches = MENU_ITEMS
          .filter(m => m.label.toLowerCase().includes(q.toLowerCase()) && !seen.has(`tab:${m.id}`))
          .map(m => ({ id: m.id as RegistrarTab, label: m.label, sub: 'Navigate to section' }));
        setSearchResults([...dbMapped, ...tabMatches].slice(0, 12));
      } catch { /* silently */ }
    }, 280);
  }, [searchQuery]);

  const setActiveTab = useCallback((tab: RegistrarTab) => {
    if (tab === activeTab) return;
    setTabLoading(true);
    setTimeout(() => { setRawTab(tab); setTabLoading(false); }, 120);
  }, [activeTab]);

  const handleMarkAllRead = useCallback(() => {}, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/signin';
  };

  const sidebarNavItems: GenericNavItem<RegistrarTab>[] = MENU_ITEMS.map(item => ({
    id: item.id, label: item.label, icon: <item.icon className="w-5 h-5" />,
  }));

  const mobileNavItems: GenericMobileNavItem<RegistrarTab>[] = [
    { id: 'dashboard',   label: 'Dash',       icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'students',    label: 'Students',   icon: <Users className="w-5 h-5" /> },
    { id: 'admissions',  label: 'Admissions', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'enrollments', label: 'Enroll',     icon: <BookOpen className="w-5 h-5" /> },
    { id: 'graduation',  label: 'Grad',       icon: <GraduationCap className="w-5 h-5" /> },
  ];

  // Convert real audit logs to the notification shape the Header expects
  const headerNotifications = toHeaderNotifs(auditLogs);

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'dashboard':         return <DashboardOverview setActiveTab={setActiveTab} onOpenCreateCourse={() => setActiveTab('catalog')} programType={registrarProgramType} />;
      case 'students':          return <RegistrarStudentsView programType={registrarProgramType} />;
      case 'student_grades':    return <StudentGradesView programType={registrarProgramType} />;
      case 'assign_instructor': return <AssignInstructorView programType={registrarProgramType} />;
      case 'onboardings':       return <RegistrarOnboardingsView />;
      case 'admissions':   return <AdmissionsManagement />;
      case 'catalog':      return <CourseCatalog />;
      case 'offerings':    return <CourseOfferings />;
      case 'timetable':    return <ClassTimetable />;
      case 'registration': return <RegistrarSettings initialTab="registration" />;
      case 'enrollments':  return <EnrollmentManagement />;
      case 'transcripts':  return <TranscriptServices />;
      case 'graduation':   return <GraduationAuditing />;
      case 'certificates': return <DigitalCertificates />;
      case 'reports':      return <InteractiveReports />;
      case 'calendar':     return <AcademicCalendarView />;
      case 'announcements':return <AnnouncementsManager />;
      case 'audit_logs':   return <AuditLogsTimeline />;
      case 'settings':     return <RegistrarSettings initialTab="account" />;
      case 'messages':     return <MessagingView />;
      default:             return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />

      {/* Theme-aware background — same pattern as other dashboards */}
      <div className="dashboard-bg" aria-hidden="true" />

      <div className="dashboard-content">

        {/* ── Sidebar (fixed left column, logo+brand inside) ── */}
        <Sidebar<RegistrarTab>
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          navItems={sidebarNavItems}
          portalTitle="Registrar"
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSC(!sidebarCollapsed)}
          onLogout={() => setLogout(true)}
          profile={{
            name:       profile?.fullName ?? 'Registrar',
            avatar:     undefined,
            department: 'Registrar Desk',
            employeeId: 'REG-2024-001',
          }}
        />

        {/* ── Right: header + scrollable content ── */}
        <div className={`flex-1 md:pl-20 xl:pl-64 flex flex-col min-h-screen overflow-y-auto max-w-full transition-all duration-300`}>

          {/* Shared Header — sticky top-0 inside this scroll container */}
          <Header<RegistrarTab>
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            portalLabel="Registrar Desk"
            tabLabels={TAB_LABELS}
            notifications={headerNotifications}
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            onMobileMenuToggle={() => setMM(true)}
            onNotificationClick={(id) => {
              const log = auditLogs.find(l => l.id === id);
              if (log) setActiveTab(notifTab(log));
            }}
            profile={{
              name:          profile?.fullName ?? 'Registrar',
              avatar:        undefined,
              roleLabel:     'Registrar Desk',
              onAvatarClick: () => setActiveTab('settings'),
            }}
          />

          {/* Page content */}
          <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 max-w-[1600px] w-full mx-auto">

            {/* ── Program Type Switcher ── */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-(--bg-secondary) border border-(--border-default) shadow-sm">
                <button
                  id="reg-switch-tvet"
                  onClick={() => setProgramType('TVET')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    registrarProgramType === 'TVET'
                      ? 'bg-gradient-to-r from-[var(--brand-gold)] to-[var(--brand-gold-dark)] text-black shadow-md scale-[1.02]'
                      : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--hover-overlay)'
                  }`}
                >
                  {registrarProgramType === 'TVET' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  🎓 TVET
                </button>
                <button
                  id="reg-switch-sp"
                  onClick={() => setProgramType('SHORT_PROGRAM')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    registrarProgramType === 'SHORT_PROGRAM'
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md scale-[1.02]'
                      : 'text-(--text-muted) hover:text-(--text-primary) hover:bg-(--hover-overlay)'
                  }`}
                >
                  {registrarProgramType === 'SHORT_PROGRAM' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  ⏱ Short Program
                </button>
              </div>
              <span className="text-[10px] font-mono text-(--text-faint) uppercase tracking-widest">
                {registrarProgramType === 'TVET' ? 'Viewing TVET academic data' : 'Viewing Short Program academic data'}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${registrarProgramType}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>

        </div>

        {/* ── Bottom mobile nav ── */}
        <MobileNav<RegistrarTab>
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          items={mobileNavItems}
        />
      </div>

      {/* ── Mobile navigation drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMM(false)}
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
                    <h3 className="font-serif font-bold text-sm text-(--text-primary)">Registrar Desk</h3>
                    <p className="text-[10px] text-(--text-faint) font-mono">Mobile Navigation</p>
                  </div>
                </div>
                <button onClick={() => setMM(false)}
                  className="p-2 rounded-xl bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary)">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {MENU_ITEMS.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button key={item.id}
                      onClick={() => { setActiveTab(item.id); setMM(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--brand-gold)/20'
                          : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary)'
                      }`}>
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-(--brand-gold)" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 border-t border-(--border-subtle) space-y-1">
                <button onClick={() => { setActiveTab('settings'); setMM(false); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-(--text-secondary) hover:bg-(--hover-overlay) transition-all">
                  <Settings className="w-4 h-4 text-(--text-muted)" />
                  <span>Settings Board</span>
                </button>
                <button onClick={() => { setMM(false); setLogout(true); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-(--status-danger) hover:bg-(--status-danger-bg) transition-all">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DHLogoutModal isOpen={logoutOpen} onClose={() => setLogout(false)} onConfirm={handleLogout} />
    </>
  );
}
