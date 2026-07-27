'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HRNavTab, HRNotification } from '@/src/types/hr';
import { hrProfile, hrKPIs, hrNotifications as initialNotifs } from '@/src/data/hrData';

import { HRSidebar }           from '@/src/components/hr/HRSidebar';
import { HRHeader }            from '@/src/components/hr/HRHeader';
import { HRMobileNav }         from '@/src/components/hr/HRMobileNav';
import { HRSearchModal }       from '@/src/components/hr/HRSearchModal';
import { HRLogoutModal }       from '@/src/components/hr/HRLogoutModal';

import dynamic from 'next/dynamic';

import { HROverviewView } from '@/src/components/hr/views/HROverviewView';

const HREmployeesView = dynamic(() => import('@/src/components/hr/views/HREmployeesView').then(m => m.HREmployeesView), { ssr: false });
const HROnboardingView = dynamic(() => import('@/src/components/hr/views/HROnboardingView').then(m => m.HROnboardingView), { ssr: false });
const HRLeaveView = dynamic(() => import('@/src/components/hr/views/HRLeaveView').then(m => m.HRLeaveView), { ssr: false });
const HRPayrollView = dynamic(() => import('@/src/components/hr/views/HRPayrollView').then(m => m.HRPayrollView), { ssr: false });
const HRPerformanceView = dynamic(() => import('@/src/components/hr/views/HRPerformanceView').then(m => m.HRPerformanceView), { ssr: false });
const HRDocumentsView = dynamic(() => import('@/src/components/hr/views/HRDocumentsView').then(m => m.HRDocumentsView), { ssr: false });
const HRReportsView = dynamic(() => import('@/src/components/hr/views/HRReportsView').then(m => m.HRReportsView), { ssr: false });
const HRNotificationsView = dynamic(() => import('@/src/components/hr/views/HRNotificationsView').then(m => m.HRNotificationsView), { ssr: false });
const HRAuditLogView = dynamic(() => import('@/src/components/hr/views/HRAuditLogView').then(m => m.HRAuditLogView), { ssr: false });
const HRSettingsView = dynamic(() => import('@/src/components/hr/views/HRSettingsView').then(m => m.HRSettingsView), { ssr: false });

export default function HRDashboardPage() {
  const [activeTab,     setActiveTab]     = useState<HRNavTab>('overview');
  const [notifications, setNotifications] = useState<HRNotification[]>(initialNotifs);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [logoutOpen,    setLogoutOpen]    = useState(false);

  const unreadCount  = notifications.filter(n => !n.read).length;
  const pendingLeave = hrKPIs.pendingLeaveRequests;

  // Ctrl+K global search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
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
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/signout`,
      { method: 'POST', credentials: 'include' }
    ).catch(() => {});
    window.location.href = '/signin';
  };

  const renderView = () => {
    switch (activeTab) {
      case 'overview':       return <HROverviewView setActiveTab={setActiveTab} />;
      case 'employees':      return <HREmployeesView />;
      case 'onboarding':     return <HROnboardingView />;
      case 'leave':          return <HRLeaveView />;
      case 'payroll':        return <HRPayrollView />;
      case 'performance':    return <HRPerformanceView />;
      case 'documents':      return <HRDocumentsView />;
      case 'reports':        return <HRReportsView />;
      case 'notifications':  return (
        <HRNotificationsView
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          setActiveTab={setActiveTab}
        />
      );
      case 'audit_log':      return <HRAuditLogView />;
      case 'settings':       return <HRSettingsView profile={hrProfile} />;
      default:               return null;
    }
  };

  return (
    <>
      {/* Background — deep obsidian with radial gold glow */}
      <div className="fixed inset-0 bg-[var(--bg-base)] transition-colors duration-300 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-[#E9C349]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#E9C349]/4 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_edges,rgba(0,0,0,0.6)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 min-h-screen text-white">
        {/* Sidebar */}
        <HRSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          profile={hrProfile}
          unreadCount={unreadCount}
          pendingLeave={pendingLeave}
          onLogout={() => setLogoutOpen(true)}
        />

        {/* Main */}
        <div className="md:pl-20 xl:pl-64 flex flex-col min-h-screen transition-all duration-300">
          <HRHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={hrProfile}
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            onOpenSearch={() => setSearchOpen(true)}
          />

          <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
            {renderView()}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <HRMobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCount={unreadCount}
          pendingLeave={pendingLeave}
        />
      </div>

      {/* Global modals */}
      <HRSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={tab => { setActiveTab(tab); setSearchOpen(false); }}
      />
      <HRLogoutModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
