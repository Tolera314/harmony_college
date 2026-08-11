'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadOnboardingState } from '@/src/lib/onboardingStore';
import { WelcomePortalLayout, type PortalTab } from '@/src/components/welcome/WelcomePortalLayout';
import { HomeTab } from '@/src/components/welcome/HomeTab';
import { ProfileTab } from '@/src/components/welcome/ProfileTab';
import {
  ProgramsTab, NewsTab, AnnouncementsTab,
  EventsTab, GalleryTab, AdmissionTab, SettingsTab,
} from '@/src/components/welcome/ContentTabs';

export default function WelcomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [state, setState] = useState(() => loadOnboardingState());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const s = loadOnboardingState();
    // Block access if account hasn't been created and verified
    if (s.stage === 'create-account' || s.stage === 'verify-contact') {
      router.replace('/apply');
      return;
    }
    setState(s);
    setMounted(true);
  }, [router]);

  // Re-sync state whenever the active tab changes — catches return from /onboarding
  useEffect(() => {
    setState(loadOnboardingState());
  }, [activeTab]);

  // Re-sync state when returning from onboarding wizard
  useEffect(() => {
    const sync = () => setState(loadOnboardingState());
    // Fire on tab visibility change (more reliable than 'focus' alone)
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sync();
    });
    return () => {
      window.removeEventListener('focus', sync);
    };
  }, []);

  if (!mounted) return null;

  const renderTab = () => {
    switch (activeTab) {
      case 'home':          return <HomeTab state={state} onNavigate={setActiveTab} />;
      case 'profile':       return <ProfileTab state={state} />;
      case 'programs':      return <ProgramsTab onNavigate={setActiveTab} />;
      case 'news':          return <NewsTab />;
      case 'announcements': return <AnnouncementsTab />;
      case 'events':        return <EventsTab />;
      case 'gallery':       return <GalleryTab />;
      case 'admission':     return <AdmissionTab onNavigate={setActiveTab} />;
      case 'settings':      return <SettingsTab state={state} />;
      default:              return <HomeTab state={state} onNavigate={setActiveTab} />;
    }
  };

  return (
    <WelcomePortalLayout activeTab={activeTab} setActiveTab={setActiveTab} state={state}>
      {renderTab()}
    </WelcomePortalLayout>
  );
}
