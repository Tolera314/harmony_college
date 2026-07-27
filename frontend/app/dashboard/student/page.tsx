'use client';

import React, { useState } from 'react';
import { NavTab, StudentProfile, Course } from '@/src/types';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { Header } from '@/src/components/layout/Header';
import { MobileNav } from '@/src/components/layout/MobileNav';
import dynamic from 'next/dynamic';

import { DashboardView } from '@/src/components/DashboardView';

const CourseRegistrationView = dynamic(() => import('@/src/components/CourseRegistrationView').then(m => m.CourseRegistrationView), { ssr: false });
const GradesView = dynamic(() => import('@/src/components/GradesView').then(m => m.GradesView), { ssr: false });
const FinancialsView = dynamic(() => import('@/src/components/FinancialsView').then(m => m.FinancialsView), { ssr: false });
const DegreeAuditView = dynamic(() => import('@/src/components/DegreeAuditView').then(m => m.DegreeAuditView), { ssr: false });
const SupportView = dynamic(() => import('@/src/components/SupportView').then(m => m.SupportView), { ssr: false });
const SettingsView = dynamic(() => import('@/src/components/SettingsView').then(m => m.SettingsView), { ssr: false });
import {
  initialStudentProfile,
  initialActiveCourses,
  catalogCourses,
  todayTimetable,
  recentAlerts,
  gradeHistory,
  financialTransactions,
  degreeRequirements,
} from '@/src/data/studentData';

export default function StudentDashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [profile, setProfile] = useState<StudentProfile>(initialStudentProfile);
  const [registeredCourses, setRegisteredCourses] = useState<Course[]>(initialActiveCourses);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRegisterCourse = (course: Course) => {
    if (registeredCourses.some((c) => c.id === course.id)) return;
    setRegisteredCourses((prev) => [...prev, { ...course, status: 'registered', progress: 0 }]);
  };

  const handleDropCourse = (courseId: string) => {
    setRegisteredCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  const handleLogout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = '/signin';
  };

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            profile={profile}
            activeCourses={registeredCourses.filter((c) => c.status === 'registered')}
            timetable={todayTimetable}
            alerts={recentAlerts}
            setActiveTab={setActiveTab}
          />
        );
      case 'registration':
        return (
          <CourseRegistrationView
            catalog={catalogCourses}
            registeredCourses={registeredCourses}
            profile={profile}
            onRegisterCourse={handleRegisterCourse}
            onDropCourse={handleDropCourse}
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
            setActiveTab={setActiveTab}
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
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[var(--bg-base)] text-[#f2f0f0]">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={profile}
          onLogout={handleLogout}
        />
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={profile}
          alerts={recentAlerts}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenSearchModal={() => {}}
        />
        <main className="md:pl-20 xl:pl-64 pt-4 px-4 sm:px-8 pb-24 md:pb-8 max-w-[1600px]">
          {renderView()}
        </main>
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}
