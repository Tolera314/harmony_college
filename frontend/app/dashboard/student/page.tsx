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
import { ToastContainer, useToast, SessionExpiredOverlay, SkeletonPage } from '@/src/components/ui/States';
import { AnimatePresence, motion } from 'motion/react';
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
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabLoading, setTabLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  /**
   * Enrolled courses are automatically assigned by the Registrar.
   * Students do NOT add or drop courses. The list is read-only.
   */
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
    } catch { /* network error — proceed to redirect anyway */ }
    window.location.href = '/signin';
  };

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
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <ToastContainer variant={toast.variant} message={toast.message} visible={toast.visible} onDismiss={hideToast} />
      <SessionExpiredOverlay isVisible={sessionExpired} onSignIn={() => { window.location.href = '/signin'; }} />
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
          <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} profile={profile} onLogout={handleLogout} />
          <Header
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            profile={profile}
            alerts={recentAlerts}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onOpenSearchModal={() => {}}
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
        </div>
      </div>
    </>
  );
}
