'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WelcomePortalLayout, type PortalTab } from '@/src/components/welcome/WelcomePortalLayout';
import { HomeTab } from '@/src/components/welcome/HomeTab';
import { ProfileTab } from '@/src/components/welcome/ProfileTab';
import {
  ProgramsTab, NewsTab, AnnouncementsTab,
  EventsTab, GalleryTab, AdmissionTab, SettingsTab,
} from '@/src/components/welcome/ContentTabs';
import {
  DEFAULT_STATE,
  type OnboardingState,
  type ProfileData,
  saveOnboardingState,
} from '@/src/lib/onboardingStore';

// ─────────────────────────────────────────────────────────────────────────────
// Map backend StudentProfile → frontend ProfileData shape
// ─────────────────────────────────────────────────────────────────────────────

interface BackendProfile {
  dob?:                  string | null;
  gender?:               string | null;
  nationality?:          string | null;
  region?:               string | null;
  city?:                 string | null;
  address?:              string | null;
  program?:              string | null;
  academicYear?:         string | null;
  semester?:             string | null;
  matricResult?:         string | null;
  ministryResult?:       string | null;
  profilePictureUrl?:    string | null;
  faydaIdUrl?:           string | null;
  transcriptUrl?:        string | null;
  emergencyName?:        string | null;
  emergencyRelationship?:string | null;
  emergencyPhone?:       string | null;
  emergencyNotes?:       string | null;
}

function mapToProfileData(bp: BackendProfile | null): ProfileData {
  return {
    nationality:          bp?.nationality          ?? '',
    dob:                  bp?.dob ? bp.dob.split('T')[0] : '',
    gender:               bp?.gender              ?? '',
    region:               bp?.region              ?? '',
    city:                 bp?.city                ?? '',
    address:              bp?.address             ?? '',
    program:              bp?.program             ?? '',
    academicYear:         bp?.academicYear        ?? '',
    semester:             bp?.semester            ?? '',
    matricResult:         bp?.matricResult        ?? '',
    ministryResult:       bp?.ministryResult      ?? '',
    profilePictureName:   bp?.profilePictureUrl   ? 'Uploaded' : '',
    profilePicturePreview:bp?.profilePictureUrl   ?? '',
    faydaIdName:          bp?.faydaIdUrl          ? 'Uploaded' : '',
    transcriptName:       bp?.transcriptUrl       ? 'Uploaded' : '',
    emergencyName:        bp?.emergencyName        ?? '',
    emergencyRelationship:bp?.emergencyRelationship ?? '',
    emergencyPhone:       bp?.emergencyPhone       ?? '',
    emergencyNotes:       bp?.emergencyNotes       ?? '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const router  = useRouter();
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [state, setState]   = useState<OnboardingState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  // ── Load from backend (source of truth) ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // 1. Get auth state
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (!meRes.ok) {
          router.replace('/signin');
          return;
        }
        const meData = await meRes.json();
        if (!meData.authenticated) {
          router.replace('/signin');
          return;
        }
        const user = meData.user as {
          id:               string;
          fullName:         string;
          phone:            string | null;
          email:            string | null;
          profileCompletion:number;
          profileCompleted: boolean;
        };

        // 2. Load profile data
        const profileRes = await fetch('/api/student/profile', { credentials: 'include' });
        const profileData = profileRes.ok ? await profileRes.json() : { profile: null };

        // 3. Build synthetic OnboardingState for the existing Welcome Portal components
        const syntheticState: OnboardingState = {
          stage:              user.profileCompleted ? 'success' : 'complete-profile',
          account: {
            fullName: user.fullName,
            phone:    user.phone    ?? '',
            email:    user.email    ?? '',
            password: '',
            userId:   user.id,
          },
          contactVerified:     true,
          profile:             mapToProfileData(profileData.profile),
          applicationNumber:   `HC-${new Date().getFullYear()}-${user.id.slice(0, 6).toUpperCase()}`,
          profileCompletionPct: user.profileCompletion,
        };

        // Write to sessionStorage so onboarding wizard can pick it up
        saveOnboardingState(syntheticState);
        setState(syntheticState);
        setMounted(true);
      } catch {
        // Network failure — fall back to sessionStorage if available
        const { loadOnboardingState } = await import('@/src/lib/onboardingStore');
        const fallback = loadOnboardingState();
        if (fallback.stage === 'create-account' || fallback.stage === 'verify-contact') {
          router.replace('/signin');
          return;
        }
        setState(fallback);
        setMounted(true);
      }
    };
    load();
  }, [router]);

  // Re-sync state when returning from onboarding wizard
  useEffect(() => {
    if (!mounted) return;
    const sync = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (!meRes.ok) return;
        const meData = await meRes.json();
        if (!meData.authenticated) return;
        const u = meData.user;

        const profileRes = await fetch('/api/student/profile', { credentials: 'include' });
        const pd = profileRes.ok ? await profileRes.json() : { profile: null };

        setState((prev) => ({
          ...prev,
          profileCompletionPct: u.profileCompletion,
          stage: u.profileCompleted ? 'success' : 'complete-profile',
          profile: mapToProfileData(pd.profile),
        }));
      } catch { /* ignore */ }
    };

    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sync();
    });
    return () => { window.removeEventListener('focus', sync); };
  }, [mounted]);

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
