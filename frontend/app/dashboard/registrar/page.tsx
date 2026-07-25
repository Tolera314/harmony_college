'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, BookOpen, GraduationCap, FileText, 
  Users, ShieldAlert, LogOut,
  Menu, Bell, Search, User, Sun, Moon, 
  ChevronRight, Calendar, Send, ShieldCheck,
  Grid, LayoutDashboard, Clock, BarChart3, Settings
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

// Import sub-components
import { DashboardOverview }     from '@/src/components/registrar/DashboardOverview';
import { AdmissionsManagement }   from '@/src/components/registrar/AdmissionsManagement';
import { CourseCatalog }          from '@/src/components/registrar/CourseCatalog';
import { CourseOfferings }         from '@/src/components/registrar/CourseOfferings';
import { ClassTimetable }          from '@/src/components/registrar/ClassTimetable';
import { RegistrationSettings }    from '@/src/components/registrar/RegistrationSettings';
import { EnrollmentManagement }    from '@/src/components/registrar/EnrollmentManagement';
import { TranscriptServices }      from '@/src/components/registrar/TranscriptServices';
import { GraduationAuditing }      from '@/src/components/registrar/GraduationAuditing';
import { DigitalCertificates }     from '@/src/components/registrar/DigitalCertificates';
import { InteractiveReports }      from '@/src/components/registrar/InteractiveReports';
import { AcademicCalendarView }    from '@/src/components/registrar/AcademicCalendarView';
import { AnnouncementsManager }    from '@/src/components/registrar/AnnouncementsManager';
import { AuditLogsTimeline }       from '@/src/components/registrar/AuditLogsTimeline';
import { RegistrarSettings }       from '@/src/components/registrar/RegistrarSettings';

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
  const [searchOpen, setSearchOpen] = useState(false);
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
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Shortcut for Ctrl+K global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  const [autoOpenCatalogModal, setAutoOpenCatalogModal] = useState(false);
  const triggerCreateCourse = () => {
    setActiveTab('catalog');
    setAutoOpenCatalogModal(true);
    // Simulate delay for component render
    setTimeout(() => {
      const addCourseBtn = document.querySelector('button[onClick*="setIsModalOpen(true)"]') as HTMLButtonElement;
      if (addCourseBtn) addCourseBtn.click();
    }, 200);
  };

  const menuItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admissions', label: 'Admissions', icon: ClipboardList },
    { id: 'enrollments', label: 'Enrollments', icon: Users },
    { id: 'catalog', label: 'Course Catalog', icon: BookOpen },
    { id: 'offerings', label: 'Course Offerings', icon: Grid },
    { id: 'timetable', label: 'Class Timetable', icon: Clock },
    { id: 'registration', label: 'Registration Settings', icon: Settings },
    { id: 'transcripts', label: 'Transcripts', icon: FileText },
    { id: 'graduation', label: 'Graduation Auditing', icon: GraduationCap },
    { id: 'certificates', label: 'Digital Certificates', icon: ShieldCheck },
    { id: 'reports', label: 'Interactive Reports', icon: BarChart3 },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
    { id: 'announcements', label: 'Announcements', icon: Send },
    { id: 'audit_logs', label: 'Audit Logs', icon: ShieldAlert },
    { id: 'settings', label: 'Account Settings', icon: User }
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
        return <RegistrationSettings />;
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
        return <RegistrarSettings />;
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
      <div className="fixed inset-0 bg-[#0F0F10] pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] bg-[#D4AF37]/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/3 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_edges,rgba(0,0,0,0.75)_0%,transparent_65%)]" />
      </div>

      <div className="relative z-10 min-h-screen text-white font-sans flex overflow-hidden">
        
        {/* Left Sidebar: Collapsible, Sticky, Glass */}
        <aside 
          className={`hidden md:flex flex-col border-r border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 shrink-0 sticky top-0 h-screen z-30 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 shadow-inner">
                <GraduationCap className="w-5 h-5 text-[#D4AF37]" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <h2 className="text-xs font-serif font-bold text-white tracking-widest uppercase">Harmony College</h2>
                  <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">Registrar Portal</p>
                </div>
              )}
            </div>
            
            {/* Collapse toggle */}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all group ${
                    isActive 
                      ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#D4AF37]' 
                      : 'border border-transparent text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#D4AF37]' : 'text-white/40 group-hover:text-white'
                  }`} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-white/10">
            <button 
              onClick={() => setLogoutOpen(true)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/25 transition-all group`}
            >
              <LogOut className="w-4 h-4 text-rose-500/70 group-hover:text-rose-400 shrink-0" />
              {!sidebarCollapsed && <span>Logout Session</span>}
            </button>
          </div>
        </aside>

        {/* Right Section Content viewport */}
        <div className="flex-1 flex flex-col min-h-screen overflow-y-auto max-w-full">
          
          {/* Top Sticky Navigation bar */}
          <header className="sticky top-0 bg-[#0F0F10]/60 border-b border-white/10 backdrop-blur-md z-20 px-6 py-4 flex justify-between items-center">
            
            {/* Left: Mobile Toggle & Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(true)} 
                className="p-2 md:hidden bg-white/5 border border-white/10 rounded-xl text-white/70"
              >
                <Menu className="w-4 h-4" />
              </button>
              
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/50 font-semibold font-sans">
                <span className="hover:text-white transition-colors cursor-pointer">Registrar Desk</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[#D4AF37] capitalize font-semibold">{activeTab.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Right: Search, Notifs, Profile, Dark Mode */}
            <div className="flex items-center gap-4">
              
              {/* Instant global search button */}
              <button 
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/15 rounded-xl text-xs text-white/40 transition-all font-sans cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-white/40" />
                <span>Search Portal...</span>
                <kbd className="bg-black/50 border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-widest text-white/35">Ctrl+K</kbd>
              </button>

              {/* Theme Toggle Button */}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 bg-white/5 border border-white/10 hover:border-white/15 rounded-xl text-white/50 hover:text-white transition-all cursor-pointer"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notification dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="p-2.5 bg-white/5 border border-white/10 hover:border-white/15 rounded-xl text-white/50 hover:text-white transition-all relative cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4AF37] border border-[#0F0F10] text-[#0F0F10] font-mono text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notifDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setNotifDropdownOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2.5 w-72 bg-[#0F0F10] border border-white/10 rounded-2xl p-4 shadow-2xl z-40 space-y-3.5 font-sans text-xs"
                      >
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <h4 className="font-semibold text-white">Notifications</h4>
                          <button onClick={handleMarkAllRead} className="text-[10px] text-[#D4AF37] hover:underline">Mark all read</button>
                        </div>
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {notifications.map(n => (
                            <div key={n.id} className={`p-2 rounded-xl border flex items-start gap-2 ${n.read ? 'bg-transparent border-transparent text-white/50' : 'bg-[#D4AF37]/5 border-[#D4AF37]/15 text-white'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#D4AF37]'}`} />
                              <div>
                                <p className="leading-normal">{n.text}</p>
                                <span className="text-[9px] font-mono text-white/35 block mt-0.5">{n.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Registrar mini profile card */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80" 
                  alt="Registrar Avatar" 
                  className="w-9 h-9 rounded-xl border border-white/10 object-cover"
                />
                <div className="hidden lg:block text-left text-xs leading-none">
                  <p className="font-semibold text-white">Robel Bekele</p>
                  <span className="text-[9px] font-mono text-white/40 uppercase block mt-1">Registrar Desk</span>
                </div>
              </div>

            </div>
          </header>

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

      {/* Global Instant Search Modal (Ctrl+K) */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="absolute inset-0 bg-black"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0F0F10] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 font-sans"
            >
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Instant Search by Name, Course Code, or Tab..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4 border-t border-white/5 pt-3 space-y-1.5">
                  <p className="text-[9px] font-mono text-white/40 uppercase">Matching Tabs / Sub-views</p>
                  <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                    {searchResults.map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full p-2.5 text-left rounded-xl bg-white/5 hover:bg-[#D4AF37]/15 hover:text-[#D4AF37] border border-transparent hover:border-[#D4AF37]/20 flex items-center justify-between text-xs transition-all"
                      >
                        <span className="font-semibold text-white/80">{item.label}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {logoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setLogoutOpen(false)}
              className="absolute inset-0 bg-black"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-[#0F0F10] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 font-sans text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-serif font-bold text-white">Log Out Session</h3>
                <p className="text-xs text-white/40 leading-relaxed">Are you sure you want to log out from the registrar portal? Any unsaved configs will be discarded.</p>
              </div>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="secondary" size="sm" onClick={() => setLogoutOpen(false)} className="flex-1 py-2 font-semibold">
                  Cancel
                </Button>
                <Button variant="rose" size="sm" onClick={handleLogout} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  Log Out
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
