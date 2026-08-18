'use client';

import React, { useState, useEffect } from 'react';
import { NavTab, StudentProfile } from '@/src/types';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Header } from '@/src/components/layout/Header';
import { MobileNav } from '@/src/components/layout/MobileNav';
import { DashboardView } from '@/src/components/DashboardView';
import { MyCoursesView } from '@/src/components/MyCoursesView';
import { GradesView } from '@/src/components/GradesView';
import { FinancialsView } from '@/src/components/FinancialsView';
import { DegreeAuditView } from '@/src/components/DegreeAuditView';
import { SupportView } from '@/src/components/SupportView';
import { SettingsView } from '@/src/components/SettingsView';
import { StudentAssignmentsView } from '@/src/components/StudentAssignmentsView';
import { StudentQuizzesView } from '@/src/components/StudentQuizzesView';
import { ChatView } from '@/src/components/chat/ChatView';
import { ToastContainer, useToast, SessionExpiredOverlay, SkeletonPage } from '@/src/components/ui/States';
import { ProfileCompletionBanner, LockedFeatureCard } from '@/src/components/onboarding/ProfileCompletionBanner';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  GraduationCap,
  CreditCard,
  BarChart3,
  HelpCircle,
  X,
  ChevronRight,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  initialStudentProfile,
  initialActiveCourses,
  todayTimetable,
  recentAlerts,
  gradeHistory,
  financialTransactions,
  degreeRequirements,
} from '@/src/data/studentData';

// Tabs that require a complete profile
const LOCKED_TABS: NavTab[] = ['my_courses', 'registration', 'assignments', 'quizzes', 'grades', 'financials', 'degree_audit'];

export default function StudentDashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [profile, setProfile] = useState<StudentProfile>(initialStudentProfile);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabLoading, setTabLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [onboardingCompletion, setOnboardingCompletion] = useState(0);
  const [applicationNumber, setApplicationNumber] = useState('');
  const { toast, show: showToast, hide: hideToast } = useToast();

  // Load profile state from backend (/api/auth/me) — backend is source of truth
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          // Session invalid — redirect to sign-in
          window.location.href = '/signin';
          return;
        }
        const data = await res.json();
        if (!data.authenticated) {
          window.location.href = '/signin';
          return;
        }
        const u = data.user;
        // Profile completion gate: incomplete students go to /welcome
        if (u.role === 'STUDENT' && !u.profileCompleted) {
          window.location.href = '/welcome';
          return;
        }

        // Mandatory pre-dashboard gate: registration fee + department selection.
        // Both must be done before the student can access the dashboard.
        // This replaces the previous screenshot-approval gate.
        try {
          const prereqRes = await fetch('/api/student/onboarding/prereqs', { credentials: 'include' });
          if (prereqRes.ok) {
            const prereqs = await prereqRes.json();
            if (!prereqs.feePaid || !prereqs.departmentSelected) {
              window.location.href = '/onboarding/about';
              return;
            }
          }
        } catch { /* network error — allow through to avoid false lockout */ }
        setOnboardingCompletion(u.profileCompletion ?? 0);
        if (u.fullName) setProfile((p) => ({ ...p, name: u.fullName }));
      } catch {
        // Network failure — leave existing state, don't force logout
      }
    };
    load();
  }, []);

  const enrolledCourses = initialActiveCourses;

  const isProfileIncomplete = onboardingCompletion < 100;

  const handleTabChange = (tab: NavTab) => {
    if (tab === activeTab) return;
    // Redirect locked tabs to onboarding
    if (isProfileIncomplete && LOCKED_TABS.includes(tab)) {
      showToast('Complete your profile to access this feature.', 'warning');
      return;
    }
    setTabLoading(true);
    setTimeout(() => { setActiveTab(tab); setTabLoading(false); }, 120);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* network error — proceed with redirect anyway */ }
    window.location.href = '/signin';
  };

  const studentNavItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',    label: 'Dashboard',          icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'my_courses',  label: 'My Courses',          icon: <BookOpen className="w-4 h-4" /> },
    { id: 'assignments', label: 'Assignments',         icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'quizzes',     label: 'Quizzes & Exams',     icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'grades',      label: 'Grades & Transcript', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'financials',  label: 'Financials & Tuition',icon: <CreditCard className="w-4 h-4" /> },
    { id: 'degree_audit',label: 'Degree Audit',        icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'support',     label: 'Support & Advising',  icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            {/* Profile completion banner — visible until profile is complete */}
            {isProfileIncomplete && (
              <ProfileCompletionBanner
                completionPct={onboardingCompletion}
                applicationNumber={applicationNumber}
              />
            )}
            <DashboardView
              profile={profile}
              activeCourses={enrolledCourses}
              timetable={todayTimetable}
              alerts={recentAlerts}
              setActiveTab={handleTabChange}
            />
            {/* Locked features grid — shown when profile incomplete */}
            {isProfileIncomplete && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-8"
              >
                <div className="mb-4">
                  <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Unlock Student Services
                  </h2>
                  <p className="text-xs font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
                    Complete your profile to access all features.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <LockedFeatureCard title="Course Registration" description="Browse and register for your courses for the upcoming semester."
                    icon={BookOpen} />
                  <LockedFeatureCard title="Grades & Transcript" description="View your grades, GPA history, and official transcripts."
                    icon={GraduationCap} />
                  <LockedFeatureCard title="Assignments" description="Access assignments, deadlines, and submission portal."
                    icon={ClipboardList} />
                  <LockedFeatureCard title="Financials & Tuition" description="View your account balance, tuition invoices, and payment history."
                    icon={CreditCard} />
                  <LockedFeatureCard title="Degree Audit" description="Track your degree progress and remaining requirements."
                    icon={BarChart3} />
                  <LockedFeatureCard title="Quizzes & Exams" description="Access exam schedules, quizzes, and results."
                    icon={HelpCircle} />
                </div>

                {/* Marketplace promo */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 rounded-2xl cursor-pointer group"
                  style={{
                    background: 'linear-gradient(135deg, rgba(233,195,73,0.1) 0%, rgba(233,195,73,0.03) 100%)',
                    border: '1px solid var(--accent-gold-border)',
                  }}
                  onClick={() => window.location.href = '/marketplace'}
                  role="link"
                >
                  <div className="text-4xl shrink-0">🛒</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                      Explore the Learning Marketplace
                    </p>
                    <p className="text-xs font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
                      Premium books, video courses, and downloadable resources curated by Harmony College faculty.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--brand-gold)' }} />
                </motion.div>
              </motion.div>
            )}
          </>
        );
      case 'my_courses':
      case 'registration':
        return (
          <MyCoursesView
            enrolledCourses={enrolledCourses}
            setActiveTab={handleTabChange}
          />
        );
      case 'assignments':
        return <StudentAssignmentsView enrolledCourses={enrolledCourses} setActiveTab={handleTabChange} />;
      case 'quizzes':
        return <StudentQuizzesView />;
      case 'grades':
        return <GradesView profile={profile} grades={gradeHistory} />;
      case 'financials':
        return <FinancialsView profile={profile} transactions={financialTransactions} />;
      case 'degree_audit':
        return (
          <DegreeAuditView
            profile={profile}
            requirements={degreeRequirements}
            setActiveTab={handleTabChange}
          />
        );
      case 'support':
        return <SupportView profile={profile} />;
      case 'settings':
        return (
          <SettingsView
            profile={profile}
            setProfile={setProfile}
          />
        );
      case 'messages':
        return <ChatView />;
      default:
        return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
      <SessionExpiredOverlay isVisible={sessionExpired} onSignIn={() => { window.location.href = '/signin'; }} />
      <div className="min-h-screen flex overflow-hidden" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} profile={profile} onLogout={handleLogout} />
        <div className="md:pl-20 xl:pl-64 flex flex-col min-h-screen flex-1 transition-all duration-300 overflow-y-auto max-w-full">
          <Header
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            profile={profile}
            alerts={recentAlerts}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenSearchModal={() => {}}
            onMobileMenuToggle={() => setMobileMenuOpen(true)}
          />
          <main id="main-content" className="flex-1 px-4 sm:px-8 pt-4 pb-24 md:pb-8 max-w-[1600px] w-full mx-auto">
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
          </main>
        </div>
        <MobileNav activeTab={activeTab} setActiveTab={handleTabChange} />

        {/* Student Mobile Navigation Drawer Overlay */}
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
                {/* Drawer Header */}
                <div className="p-4 border-b border-(--border-subtle) flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl text-(--text-inverse) flex items-center justify-center font-serif font-bold text-lg shadow bg-gradient-to-br from-[var(--brand-gold)] to-[var(--brand-gold-dark)]">
                      H
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm text-(--text-primary)">Student Portal</h3>
                      <p className="text-[10px] text-(--text-faint) font-mono">Harmony College</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-(--hover-overlay) text-(--text-muted) hover:text-(--text-primary) transition-colors"
                    aria-label="Close Mobile Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Drawer Nav Items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {studentNavItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleTabChange(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-(--accent-gold-subtle) text-(--brand-gold) border border-(--brand-gold)/20'
                            : 'text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary)'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-(--brand-gold)" />}
                      </button>
                    );
                  })}
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-3 border-t border-(--border-subtle) space-y-1">
                  <button
                    onClick={() => {
                      handleTabChange('settings');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-(--text-secondary) hover:bg-(--hover-overlay) hover:text-(--text-primary) transition-all"
                  >
                    <Settings className="w-4 h-4 text-(--text-muted)" />
                    <span>Settings & Preferences</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-(--status-danger) hover:bg-(--status-danger-bg) transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
