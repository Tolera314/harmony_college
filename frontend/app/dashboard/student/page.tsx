'use client';

import React, { useState } from 'react';
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
import { ChatView } from '@/src/components/chat/ChatView';
import { ToastContainer, useToast, SessionExpiredOverlay, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  BookOpen,
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

export default function StudentDashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [profile, setProfile] = useState<StudentProfile>(initialStudentProfile);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabLoading, setTabLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const enrolledCourses = initialActiveCourses;

  const handleTabChange = (tab: NavTab) => {
    if (tab === activeTab) return;
    setTabLoading(true);
    setTimeout(() => { setActiveTab(tab); setTabLoading(false); }, 120);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/signout`, {
        method: 'POST', credentials: 'include',
      });
    } catch { /* network error */ }
    window.location.href = '/signin';
  };

  const studentNavItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'my_courses', label: 'My Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'grades', label: 'Grades & Transcript', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'financials', label: 'Financials & Tuition', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'degree_audit', label: 'Degree Audit', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'support', label: 'Support & Advising', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const renderView = () => {
    if (tabLoading) return <SkeletonPage />;
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            profile={profile}
            activeCourses={enrolledCourses}
            timetable={todayTimetable}
            alerts={recentAlerts}
            setActiveTab={handleTabChange}
          />
        );
      case 'my_courses':
      case 'registration':
        return (
          <MyCoursesView
            enrolledCourses={enrolledCourses}
            setActiveTab={handleTabChange}
          />
        );
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
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} profile={profile} onLogout={handleLogout} />
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
        <main id="main-content" className="md:pl-20 xl:pl-64 pt-4 px-4 sm:px-8 pb-24 md:pb-8 max-w-[1600px]">
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
