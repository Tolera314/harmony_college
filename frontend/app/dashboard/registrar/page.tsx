'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, BookOpen, GraduationCap, FileText, 
  Users, ShieldAlert,
  Search, ChevronRight, Calendar, Send, ShieldCheck,
  Grid, LayoutDashboard, Clock, BarChart3, Settings
} from 'lucide-react';
import { Sidebar, GenericNavItem } from '@/src/components/layout/Sidebar';
import { Header } from '@/src/components/layout/Header';
import { MobileNav, GenericMobileNavItem } from '@/src/components/layout/MobileNav';
import { DHLogoutModal } from '@/src/components/dh/DHLogoutModal';

import dynamic from 'next/dynamic';

// Dynamic sub-component imports for optimal LCP code splitting
import { DashboardOverview } from '@/src/components/registrar/DashboardOverview';

const AdmissionsManagement = dynamic(() => import('@/src/components/registrar/AdmissionsManagement').then(m => m.AdmissionsManagement), { ssr: false });
const CourseCatalog = dynamic(() => import('@/src/components/registrar/CourseCatalog').then(m => m.CourseCatalog), { ssr: false });
const CourseOfferings = dynamic(() => import('@/src/components/registrar/CourseOfferings').then(m => m.CourseOfferings), { ssr: false });
const ClassTimetable = dynamic(() => import('@/src/components/registrar/ClassTimetable').then(m => m.ClassTimetable), { ssr: false });
const EnrollmentManagement = dynamic(() => import('@/src/components/registrar/EnrollmentManagement').then(m => m.EnrollmentManagement), { ssr: false });
const TranscriptServices = dynamic(() => import('@/src/components/registrar/TranscriptServices').then(m => m.TranscriptServices), { ssr: false });
const GraduationAuditing = dynamic(() => import('@/src/components/registrar/GraduationAuditing').then(m => m.GraduationAuditing), { ssr: false });
const DigitalCertificates = dynamic(() => import('@/src/components/registrar/DigitalCertificates').then(m => m.DigitalCertificates), { ssr: false });
const InteractiveReports = dynamic(() => import('@/src/components/registrar/InteractiveReports').then(m => m.InteractiveReports), { ssr: false });
const AcademicCalendarView = dynamic(() => import('@/src/components/registrar/AcademicCalendarView').then(m => m.AcademicCalendarView), { ssr: false });
const AnnouncementsManager = dynamic(() => import('@/src/components/registrar/AnnouncementsManager').then(m => m.AnnouncementsManager), { ssr: false });
const AuditLogsTimeline = dynamic(() => import('@/src/components/registrar/AuditLogsTimeline').then(m => m.AuditLogsTimeline), { ssr: false });
const RegistrarSettings = dynamic(() => import('@/src/components/registrar/RegistrarSettings').then(m => m.RegistrarSettings), { ssr: false });

type RegistrarTab =
  | 'dashboard' | 'admissions' | 'enrollments' | 'catalog' | 'offerings'
  | 'timetable' | 'registration' | 'transcripts' | 'graduation' | 'certificates'
  | 'reports' | 'calendar' | 'announcements' | 'audit_logs' | 'settings';

interface SidebarItem {
  id: RegistrarTab;
  label: string;
  icon: React.ComponentType<any>;
}

export default function RegistrarDashboardPage() {
  const [activeTab, setActiveTab] = useState<RegistrarTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Theme Toggle Mock
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Global Admissions & Notifications lists
  const [notifications, setNotifications] = useState([
    { id: 'n1', category: 'admissions', text: 'New admission application from Selam Alemayehu', read: false, time: '10m ago' },
    { id: 'n2', category: 'registration', text: 'MATH302 Course offering at 100% capacity limit', read: false, time: '2h ago' },
    { id: 'n3', category: 'graduation', text: 'Graduation file compiled for Yohannes Abebe', read: true, time: '1d ago' },
    { id: 'n4', category: 'system', text: 'Scheduled automated database backup finished', read: true, time: '2d ago' }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleLogout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/signout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    window.location.href = '/signin';
  };

  // Switch tab and automatically open course catalog modal
  const triggerCreateCourse = () => {
    setActiveTab('catalog');
    setTimeout(() => {
      const addCourseBtn = document.querySelector('button[onClick*="setIsModalOpen(true)"]') as HTMLButtonElement;
      if (addCourseBtn) addCourseBtn.click();
    }, 200);
  };

  // Note: Account Settings and Registration Settings are removed from the main sidebar items list
  // and are housed cleanly inside the unified Settings Board (accessed via bottom Settings action button).
  const menuItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admissions', label: 'Admissions', icon: ClipboardList },
    { id: 'enrollments', label: 'Enrollments', icon: Users },
    { id: 'catalog', label: 'Course Catalog', icon: BookOpen },
    { id: 'offerings', label: 'Course Offerings', icon: Grid },
    { id: 'timetable', label: 'Class Timetable', icon: Clock },
    { id: 'transcripts', label: 'Transcripts', icon: FileText },
    { id: 'graduation', label: 'Graduation Auditing', icon: GraduationCap },
    { id: 'certificates', label: 'Digital Certificates', icon: ShieldCheck },
    { id: 'reports', label: 'Interactive Reports', icon: BarChart3 },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
    { id: 'announcements', label: 'Announcements', icon: Send },
    { id: 'audit_logs', label: 'Audit Logs', icon: ShieldAlert }
  ];

  const sidebarNavItems: GenericNavItem<RegistrarTab>[] = menuItems.map((item) => {
    const IconComp = item.icon;
    return {
      id: item.id,
      label: item.label,
      icon: <IconComp className="w-5 h-5" />
    };
  });

  const tabLabelsMap = {
    ...menuItems.reduce((acc, item) => {
      acc[item.id] = item.label;
      return acc;
    }, {} as Record<string, string>),
    settings: 'Settings Board',
    registration: 'Registration Settings'
  };

  const mobileNavItems: GenericMobileNavItem<RegistrarTab>[] = [
    { id: 'dashboard', label: 'Dash', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'admissions', label: 'Admissions', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'catalog', label: 'Catalog', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'enrollments', label: 'Enroll', icon: <Users className="w-5 h-5" /> },
    { id: 'graduation', label: 'Grad', icon: <GraduationCap className="w-5 h-5" /> }
  ];

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview setActiveTab={setActiveTab} onOpenCreateCourse={triggerCreateCourse} />;
      case 'admissions':
        return <AdmissionsManagement />;
      case 'catalog':
        return <CourseCatalog />;
      case 'offerings':
        return <CourseOfferings />;
      case 'timetable':
        return <ClassTimetable />;
      case 'registration':
        return <RegistrarSettings initialTab="registration" />;
      case 'enrollments':
        return <EnrollmentManagement />;
      case 'transcripts':
        return <TranscriptServices />;
      case 'graduation':
        return <GraduationAuditing />;
      case 'certificates':
        return <DigitalCertificates />;
      case 'reports':
        return <InteractiveReports />;
      case 'calendar':
        return <AcademicCalendarView />;
      case 'announcements':
        return <AnnouncementsManager />;
      case 'audit_logs':
        return <AuditLogsTimeline />;
      case 'settings':
        return <RegistrarSettings initialTab="account" />;
      default:
        return null;
    }
  };

  // Search filter options
  const searchResults = searchQuery.trim() === '' ? [] : menuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Background radial glow */}
      <div className="fixed inset-0 bg-[var(--bg-base)] transition-colors duration-300 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] bg-[#D4AF37]/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/3 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_edges,rgba(0,0,0,0.75)_0%,transparent_65%)]" />
      </div>

      <div className="relative z-10 min-h-screen text-white font-sans flex overflow-hidden">
        {/* Reused Sidebar component from src/components/layout */}
        <Sidebar<RegistrarTab>
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          navItems={sidebarNavItems}
          portalTitle="Registrar Portal"
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={() => setLogoutOpen(true)}
          profile={{
            name: 'Robel Bekele',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
            department: 'Registrar Desk',
            employeeId: 'REG-2024-001'
          }}
        />

        {/* Right Section Content viewport */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 max-w-full ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
          
          {/* Reused Header component from src/components/layout */}
          <Header<RegistrarTab>
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            portalLabel="Registrar Desk"
            tabLabels={tabLabelsMap}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            darkMode={isDarkMode}
            setDarkMode={setIsDarkMode}
            onMobileMenuToggle={() => setMobileMenuOpen(true)}
            profile={{
              name: 'Robel Bekele',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
              roleLabel: 'Registrar Desk'
            }}
          />

          {/* Main 12-Column Responsive Layout Body content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 max-w-[1600px] w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
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
      </div>

      {/* Reused MobileNav component from src/components/layout */}
      <MobileNav<RegistrarTab>
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        items={mobileNavItems}
      />

      {/* Logout Confirmation Modal — reuses existing shared component */}
      <DHLogoutModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
