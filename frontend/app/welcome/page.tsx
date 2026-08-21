'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ArrowRight, GraduationCap } from 'lucide-react';
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
  // Show congrats screen for brand-new students (0% completion).
  // Stored in sessionStorage so it only shows once per browser session.
  const [showCongrats, setShowCongrats] = useState(false);

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

        // Show congratulations screen for brand-new students who haven't
        // been greeted yet this session.
        const greetedKey = `congrats_shown_${user.id}`;
        const alreadyShown = sessionStorage.getItem(greetedKey);
        if (!alreadyShown && user.profileCompletion === 0 && !user.profileCompleted) {
          setShowCongrats(true);
        }

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

  // ── Congratulations overlay for brand-new students ────────────────────────
  const handleCongratsClose = () => {
    const userId = state.account.userId;
    if (userId) sessionStorage.setItem(`congrats_shown_${userId}`, '1');
    setShowCongrats(false);
  };

  if (showCongrats) {
    return (
      <CongratsScreen
        state={state}
        onClose={handleCongratsClose}
      />
    );
  }

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

// ── Inline confetti for the congratulations screen ───────────────────────────

interface CongratsScreenProps {
  state: OnboardingState;
  onClose: () => void;
}

function CongratsScreen({ state, onClose }: CongratsScreenProps) {
  const firstName = state.account.fullName.split(' ')[0] || 'Student';

  // Play applause sound the moment the card appears — not on button click
  React.useEffect(() => {
    try {
      const audio = new Audio('/sounds/pwlpl-applause-sound-effect-521104.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch { /* browser blocked autoplay — silent */ }
  }, []);

  const handleContinue = () => {
    onClose(); // marks congrats as seen in sessionStorage
    window.location.href = '/onboarding/about';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <CongratsConfetti />
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'rgba(15,15,16,0.96)', border: '1px solid var(--accent-gold-border)', backdropFilter: 'blur(24px)' }}
      >
        {/* Gold top bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }} />

        <div className="p-8 text-center space-y-6">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'radial-gradient(circle, rgba(233,195,73,0.25), transparent)', border: '2px solid var(--accent-gold-border)' }}
          >
            <GraduationCap className="w-10 h-10" style={{ color: 'var(--brand-gold)' }} />
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <h1 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Welcome, {firstName}!
            </h1>
            <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Your account has been created successfully.
            </p>
            <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
              You are successfully part of the{' '}
              <span className="font-semibold" style={{ color: 'var(--brand-gold)' }}>
                Harmony College
              </span>{' '}
              community.
            </p>
          </motion.div>

          {/* Application number card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left"
            style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--status-success)' }} />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Application Number</p>
              <p className="font-mono font-bold text-sm" style={{ color: 'var(--brand-gold)' }}>
                {state.applicationNumber}
              </p>
            </div>
          </motion.div>

          {/* Continue button → /onboarding/about */}
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold font-sans transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))', color: 'var(--bg-base)' }}
          >
            Continue <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

const CONFETTI_COLOURS = ['#E9C349','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#ffffff'];

function CongratsConfetti() {
  const particles = React.useMemo(() =>
    Array.from({ length: 52 }, (_, i) => ({
      id: i,
      x:  Math.random() * 100,
      vx: (Math.random() - 0.5) * 30,
      vy: -(50 + Math.random() * 45),
      size: 6 + Math.random() * 9,
      colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
      delay: Math.random() * 0.4,
      rotate: Math.random() * 720,
      dur: 1.5 + Math.random() * 0.9,
    })), []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {particles.map(p => (
        <motion.div key={p.id}
          initial={{ left: `${p.x}vw`, top: '100vh', opacity: 1, rotate: 0, scale: 1 }}
          animate={{ left: `calc(${p.x}vw + ${p.vx}vw)`, top: `calc(100vh + ${p.vy}vh)`, opacity: [1, 1, 0], rotate: p.rotate, scale: [1, 1.2, 0.5] }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
          style={{ position: 'fixed', width: p.size, height: p.size * 0.5, backgroundColor: p.colour, borderRadius: p.size < 10 ? '50%' : 2 }}
        />
      ))}
    </div>
  );
}
