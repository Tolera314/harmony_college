'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  NavTab, StudentProfile, Course, GradeRecord,
  FinancialTransaction, RequirementCategory, TimetableEvent, AlertItem,
} from '@/src/types';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Header } from '@/src/components/layout/Header';
import { MobileNav } from '@/src/components/layout/MobileNav';
import { DashboardView } from '@/src/components/DashboardView';
import { MyCoursesView } from '@/src/components/MyCoursesView';
import { MyTimetableView } from '@/src/components/MyTimetableView';
import { GradesView } from '@/src/components/GradesView';
import { FinancialsView } from '@/src/components/FinancialsView';
import { DegreeAuditView } from '@/src/components/DegreeAuditView';
import { SupportView } from '@/src/components/SupportView';
import { SettingsView } from '@/src/components/SettingsView';
import { StudentAssignmentsView } from '@/src/components/StudentAssignmentsView';
import { StudentQuizzesView } from '@/src/components/StudentQuizzesView';
import { StudentAttendanceView } from '@/src/components/StudentAttendanceView';
import { ChatView } from '@/src/components/chat/ChatView';
import { ToastContainer, useToast, SessionExpiredOverlay, SkeletonPage } from '@/src/components/ui/States';
import { ProfileCompletionBanner, LockedFeatureCard } from '@/src/components/onboarding/ProfileCompletionBanner';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard, BookOpen, ClipboardList, GraduationCap,
  CreditCard, BarChart3, HelpCircle, X, ChevronRight,
  Settings, LogOut, CalendarCheck, CalendarDays,
} from 'lucide-react';
import {
  initialStudentProfile,
  initialActiveCourses,
  todayTimetable as staticTimetable,
  recentAlerts as staticAlerts,
  gradeHistory as staticGrades,
  financialTransactions as staticTransactions,
  degreeRequirements as staticDegreeReqs,
} from '@/src/data/studentData';
import {
  studentDashApi,
  type DashboardData,
  type CourseDetail,
  type GradeHistory,
  type FinancialSummary,
  type DegreeAudit,
} from '@/src/lib/studentApi';
import { useSocket } from '@/src/context/SocketContext';
import { toEthiopianTimeRange } from '@/src/lib/utils';

// ── Tabs that require a complete profile ──────────────────────────────────────
const LOCKED_TABS: NavTab[] = [
  'my_courses', 'registration', 'assignments', 'quizzes',
  'grades', 'financials', 'degree_audit',
];
// 'attendance' is NOT locked — students can always view their attendance

// ── DAY names for timetable ───────────────────────────────────────────────────
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Map API course → frontend Course type ────────────────────────────────────
function mapApiCourse(c: CourseDetail, assignments: any[]): Course {
  const courseAssignments = assignments.filter(a => a.courseOfferingId === c.offeringId);
  const pendingCount = courseAssignments.filter(a => a.status === 'pending' || a.status === 'late').length;
  return {
    id: c.offeringId,
    code: c.course?.code ?? c.code,
    title: c.course?.name ?? c.name,
    department: c.course?.department ?? '',
    credits: c.course?.creditHours ?? c.creditHours,
    instructor: c.instructor?.name ?? 'TBA',
    instructorTitle: c.instructor?.title ?? '',
    instructorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    progress: c.progress,
    assignmentsDueText: pendingCount > 0 ? `${pendingCount} Assignment${pendingCount > 1 ? 's' : ''} Due` : undefined,
    schedule: c.timetables?.length
      ? c.timetables.map(t => `${DAY_NAMES[t.dayOfWeek]} ${toEthiopianTimeRange(t.startTime, t.endTime)}`).join(', ')
      : 'TBA',
    room: typeof c.room === 'string' ? c.room : (c.room ? `${(c.room as any).building} ${(c.room as any).name}` : 'TBA'),
    description: c.course?.description ?? '',
    syllabusOverview: '',
    status: 'enrolled',
    semester: typeof c.semester === 'string' ? c.semester : `${(c.semester as any)?.name} — ${(c.semester as any)?.academicYear}`,
    attendanceRate: c.attendanceRate,
    currentGrade: c.currentGrade ?? undefined,
    assignments: (c.assignments ?? courseAssignments).map((a: any) => ({
      id: a.id,
      title: a.title,
      dueDate: new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      points: a.totalPoints,
      status: a.status === 'graded' ? 'graded' : a.status === 'submitted' ? 'submitted' : 'pending',
      grade: a.submission?.letterGrade ?? undefined,
      score: a.submission?.score ?? undefined,
      feedback: a.submission?.feedback ?? undefined,
      description: a.description,
      instructions: a.instructions,
      attachments: a.attachments ?? [],
      submittedAt: a.submission?.submittedAt ? new Date(a.submission.submittedAt).toLocaleString() : undefined,
      submittedFile: a.submission?.fileName ? { name: a.submission.fileName, size: a.submission.fileSize ?? '' } : undefined,
      submittedText: a.submission?.textContent ?? undefined,
    })),
    quizzes: (c.quizzes ?? []).map((q: any) => ({
      id: q.id,
      title: q.title,
      description: q.description ?? undefined,
      instructions: q.instructions ?? undefined,
      durationMinutes: q.durationMinutes,
      availableDate: new Date(q.availableFrom).toLocaleDateString(),
      closingDate: new Date(q.availableUntil).toLocaleDateString(),
      passingScore: q.passingScore,
      maxAttempts: q.maxAttempts,
      totalPoints: q.totalPoints,
      showResultsImmediately: q.showResultsImmediately,
      questions: (q.questions ?? []).map((qn: any) => ({
        id: qn.id,
        type: qn.type === 'TRUE_FALSE' ? 'TrueFalse'
          : qn.type === 'FILL_BLANK' ? 'FillBlank'
          : qn.type === 'SHORT_ANSWER' ? 'ShortAnswer'
          : qn.type,
        questionText: qn.questionText,
        points: qn.points,
        options: qn.options?.map((o: any) => o.text) ?? undefined,
      })),
      attempt: q.attempt ? {
        status: q.attempt.status === 'IN_PROGRESS' ? 'in_progress'
          : q.attempt.status === 'SUBMITTED' ? 'submitted' : 'graded',
        startedAt: q.attempt.startedAt,
        submittedAt: q.attempt.submittedAt ?? undefined,
        score: q.attempt.score ?? undefined,
        answers: q.attempt.answers ?? {},
        feedback: q.attempt.feedback ?? undefined,
      } : undefined,
    })),
  };
}

// ── Map API grade → frontend GradeRecord ─────────────────────────────────────
function mapApiGrade(r: any): GradeRecord {
  return {
    id: r.id,
    courseCode: r.courseCode,
    courseTitle: r.courseTitle,
    term: r.term,
    credits: r.credits,
    grade: r.grade,
    numericGpa: r.gradePoints,
    instructor: r.instructor,
  };
}

// ── Map API transaction → frontend FinancialTransaction ──────────────────────
function mapApiTransaction(tx: any): FinancialTransaction {
  return {
    id: tx.id,
    date: new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    description: tx.description,
    category: tx.category as any,
    amount: tx.amount,
    status: tx.status,
    receiptId: tx.receiptId ?? '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function StudentDashboardPage() {
  const [activeTab, setActiveTab]             = useState<NavTab>('dashboard');
  const [profile, setProfile]                 = useState<StudentProfile>(initialStudentProfile);
  const [searchQuery, setSearchQuery]         = useState('');
  const [tabLoading, setTabLoading]           = useState(false);
  const [sessionExpired]                      = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [onboardingCompletion, setOnboardingCompletion] = useState(0);
  const [applicationNumber]                   = useState('');
  const { toast, show: showToast, hide: hideToast } = useToast();

  // ── Realtime socket ───────────────────────────────────────────────────────
  const { onGradePosted } = useSocket();

  // ── Real data state ───────────────────────────────────────────────────────
  const [dashboardData, setDashboardData]     = useState<DashboardData | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [gradeData, setGradeData]             = useState<GradeHistory | null>(null);
  const [financialData, setFinancialData]     = useState<FinancialSummary | null>(null);
  const [degreeData, setDegreeData]           = useState<DegreeAudit | null>(null);
  const [timetable, setTimetable]             = useState<TimetableEvent[]>(staticTimetable);
  const [alerts, setAlerts]                   = useState<AlertItem[]>(staticAlerts);
  const [dataLoaded, setDataLoaded]           = useState<Record<string, boolean>>({});

  const markLoaded = (key: string) => setDataLoaded(prev => ({ ...prev, [key]: true }));

  // ── Grade push notification via socket ────────────────────────────────────
  useEffect(() => {
    const unsub = onGradePosted(ev => {
      showToast(`Grade posted: ${ev.courseCode} — ${ev.grade} (${ev.gradePoints.toFixed(1)} pts)`, 'success');
      // Invalidate grades cache so next visit to Grades tab fetches fresh data
      setDataLoaded(prev => ({ ...prev, grades: false }));
    });
    return unsub;
  }, [onGradePosted, showToast]);

  // ── Session auth + dashboard bootstrap ───────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) { window.location.href = '/signin'; return; }
        const data = await res.json();
        if (!data.authenticated) { window.location.href = '/signin'; return; }
        const u = data.user;
        if (u.role === 'STUDENT' && !u.profileCompleted) { window.location.href = '/welcome'; return; }
        setOnboardingCompletion(u.profileCompletion ?? 0);
        if (u.fullName) setProfile(p => ({ ...p, name: u.fullName, email: u.email ?? p.email }));
        if (u.profileCompleted) loadDashboard();
      } catch { /* keep static on network failure */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const d = await studentDashApi.getDashboard();
      setDashboardData(d);

      setProfile(p => ({
        ...p,
        name:                 d.student.fullName,
        id:                   d.student.studentId,
        email:                d.student.email ?? p.email,
        phone:                d.student.phone ?? p.phone,
        major:                d.student.program,
        cumulativeGpa:        d.kpis.gpa,
        completedCredits:     d.kpis.completedCredits,
        totalRequiredCredits: d.kpis.totalRequiredCredits,
        attendanceRate:       d.kpis.attendanceRate,
        accountBalance:       d.kpis.accountBalance,
        clearedTerm:          d.kpis.clearedForTerm ?? p.clearedTerm,
      }));

      if (d.todayTimetable.length > 0) {
        setTimetable(d.todayTimetable.map((slot, i) => ({
          id: slot.id,
          time: slot.time,
          title: slot.title,
          location: slot.location,
          courseCode: slot.courseCode,
          isCurrent: i === 0,
        })));
      }

      if (d.announcements.length > 0) {
        setAlerts(d.announcements.map(a => ({
          id: a.id,
          source: 'Registrar Office',
          message: a.title,
          date: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : 'Recent',
          type: a.priority === 'HIGH' ? 'error' : 'info',
          urgent: a.priority === 'HIGH',
        })));
      }

      try {
        const assignments = await studentDashApi.getAssignments();
        setEnrolledCourses(d.courses.map(c => mapApiCourse(c as any, assignments)));
      } catch {
        setEnrolledCourses(d.courses.map(c => mapApiCourse(c as any, [])));
      }

      markLoaded('dashboard');
    } catch { /* keep static data */ }
  }, []);

  // ── Lazy-load per-tab data ────────────────────────────────────────────────
  const loadGrades = useCallback(async () => {
    if (dataLoaded['grades']) return;
    try { const g = await studentDashApi.getGrades(); setGradeData(g); markLoaded('grades'); } catch { }
  }, [dataLoaded]);

  const loadFinancials = useCallback(async () => {
    if (dataLoaded['financials']) return;
    try { const f = await studentDashApi.getFinancials(); setFinancialData(f); markLoaded('financials'); } catch { }
  }, [dataLoaded]);

  const loadDegreeAudit = useCallback(async () => {
    if (dataLoaded['degree_audit']) return;
    try { const d = await studentDashApi.getDegreeAudit(); setDegreeData(d); markLoaded('degree_audit'); } catch { }
  }, [dataLoaded]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const grades: GradeRecord[] = gradeData ? gradeData.records.map(mapApiGrade) : staticGrades;

  const transactions: FinancialTransaction[] = financialData
    ? financialData.transactions.map(mapApiTransaction)
    : staticTransactions;

  const financialProfile: StudentProfile = financialData
    ? { ...profile, accountBalance: financialData.balance, clearedTerm: financialData.clearedForTerm ?? profile.clearedTerm }
    : profile;

  const degreeRequirements: RequirementCategory[] = degreeData
    ? degreeData.categories.map(cat => ({
        title: cat.title,
        requiredCredits: cat.requiredCredits,
        completedCredits: cat.completedCredits,
        courses: cat.courses.map(c => ({
          code: c.code,
          title: c.title,
          credits: c.credits,
          status: c.status as any,
          grade: c.grade,
        })),
      }))
    : staticDegreeReqs;

  const degreeProfile: StudentProfile = degreeData
    ? { ...profile, cumulativeGpa: degreeData.progress.cumulativeGPA, completedCredits: degreeData.progress.completedCredits, totalRequiredCredits: degreeData.progress.totalRequired }
    : profile;

  const isProfileIncomplete = onboardingCompletion < 100;

  const handleTabChange = (tab: NavTab) => {
    if (tab === activeTab) return;
    if (isProfileIncomplete && LOCKED_TABS.includes(tab)) {
      showToast('Complete your profile to access this feature.', 'warning');
      return;
    }
    setTabLoading(true);
    if (tab === 'grades') loadGrades();
    if (tab === 'financials') loadFinancials();
    if (tab === 'degree_audit') loadDegreeAudit();
    setTimeout(() => { setActiveTab(tab); setTabLoading(false); }, 120);
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch { }
    window.location.href = '/signin';
  };

  const handlePaymentComplete = useCallback(async () => {
    try {
      const f = await studentDashApi.getFinancials();
      setFinancialData(f);
      setProfile(p => ({ ...p, accountBalance: f.balance, clearedTerm: f.clearedForTerm ?? p.clearedTerm }));
    } catch { }
  }, []);

  // ── Nav items ─────────────────────────────────────────────────────────────
  const studentNavItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',    label: 'Dashboard',            icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'my_courses',   label: 'My Courses',           icon: <BookOpen className="w-4 h-4" /> },
    { id: 'timetable',    label: 'My Timetable',         icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'assignments',  label: 'Assignments',          icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'quizzes',      label: 'Quizzes & Exams',      icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'attendance',   label: 'My Attendance',        icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'grades',       label: 'Grades & Transcript',  icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'financials',   label: 'Financials & Tuition', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'degree_audit', label: 'Degree Audit',         icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'support',      label: 'Support & Advising',   icon: <HelpCircle className="w-4 h-4" /> },
  ];

  // ── renderView ────────────────────────────────────────────────────────────
  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            {isProfileIncomplete && (
              <ProfileCompletionBanner completionPct={onboardingCompletion} applicationNumber={applicationNumber} />
            )}
            <DashboardView
              profile={profile}
              activeCourses={enrolledCourses.length > 0 ? enrolledCourses : initialActiveCourses}
              timetable={timetable}
              alerts={alerts}
              setActiveTab={handleTabChange}
              degreeCompletionPct={degreeData?.progress.completionPercentage}
              upcomingEvents={dashboardData?.upcomingEvents ?? []}
            />
            {isProfileIncomplete && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }} className="mt-8"
              >
                <div className="mb-4">
                  <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Unlock Student Services</h2>
                  <p className="text-xs font-sans mt-1" style={{ color: 'var(--text-muted)' }}>Complete your profile to access all features.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <LockedFeatureCard title="Course Registration"    description="Browse and register for your courses."          icon={BookOpen} />
                  <LockedFeatureCard title="Grades & Transcript"    description="View your grades, GPA, and transcripts."        icon={GraduationCap} />
                  <LockedFeatureCard title="Assignments"            description="Access assignments and submission portal."       icon={ClipboardList} />
                  <LockedFeatureCard title="Financials & Tuition"   description="View balance, invoices, and payment history."   icon={CreditCard} />
                  <LockedFeatureCard title="Degree Audit"           description="Track degree progress and requirements."        icon={BarChart3} />
                  <LockedFeatureCard title="Quizzes & Exams"        description="Access exam schedules and quizzes."             icon={HelpCircle} />
                </div>
              </motion.div>
            )}
          </>
        );
      case 'my_courses':
      case 'registration':
        return <MyCoursesView enrolledCourses={enrolledCourses.length > 0 ? enrolledCourses : initialActiveCourses} setActiveTab={handleTabChange} />;
      case 'timetable':
        return <MyTimetableView />;
      case 'assignments':
        return <StudentAssignmentsView enrolledCourses={enrolledCourses.length > 0 ? enrolledCourses : initialActiveCourses} setActiveTab={handleTabChange} />;
      case 'quizzes':
        return <StudentQuizzesView />;
      case 'attendance':
        return <StudentAttendanceView />;
      case 'grades':
        return (
          <GradesView
            profile={profile}
            grades={grades}
            enrolledCourses={enrolledCourses.map(c => ({ id: c.id, code: c.code, name: c.title, credits: c.credits }))}
          />
        );
      case 'financials':
        return <FinancialsView profile={financialProfile} transactions={transactions} />;
      case 'degree_audit':
        return <DegreeAuditView profile={degreeProfile} requirements={degreeRequirements} setActiveTab={handleTabChange} />;
      case 'support':
        return <SupportView profile={profile} />;
      case 'settings':
        return <SettingsView profile={profile} setProfile={setProfile} />;
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
            alerts={alerts}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
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

        {/* Mobile Navigation Drawer */}
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
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] flex flex-col md:hidden shadow-2xl"
                style={{ backgroundColor: 'var(--bg-modal)', borderRight: '1px solid var(--border-default)' }}
              >
                <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden border-2" style={{ borderColor: 'rgba(233,195,73,0.5)' }}>
                      <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-serif font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Student Portal</p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{profile.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl transition-colors"
                    style={{ backgroundColor: 'var(--hover-overlay)', color: 'var(--text-muted)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                  {studentNavItems.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { handleTabChange(item.id); setMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left"
                        style={isActive
                          ? { backgroundColor: 'var(--accent-gold-subtle)', color: 'var(--brand-gold)', border: '1px solid rgba(233,195,73,0.2)' }
                          : { color: 'var(--text-secondary)' }}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: 'var(--brand-gold)' }} />}
                      </button>
                    );
                  })}
                </nav>

                <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => { handleTabChange('settings'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                    style={{ color: 'var(--status-danger)' }}
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
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
