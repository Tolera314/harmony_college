'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, BookOpen, Bell, Newspaper, Calendar,
  Image as ImageIcon, GraduationCap, User, Settings, LogOut,
  ChevronRight, X, Menu, ShoppingBag
} from 'lucide-react';
import ThemeToggle from '@/src/components/ThemeToggle';
import { MobileNav } from '@/src/components/layout/MobileNav';
import { CircularProgress } from '@/src/components/onboarding/OnboardingProgress';
import { Button } from '@/src/components/ui/Button';
import { useRouter } from 'next/navigation';
import type { OnboardingState } from '@/src/lib/onboardingStore';

export type PortalTab =
  | 'home' | 'programs' | 'announcements' | 'news'
  | 'events' | 'gallery' | 'admission' | 'profile' | 'settings';

const NAV_ITEMS: { id: PortalTab; label: string; icon: React.ReactNode }[] = [
  { id: 'home',          label: 'Home',            icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'programs',      label: 'Programs',         icon: <BookOpen className="w-4 h-4" /> },
  { id: 'announcements', label: 'Announcements',    icon: <Bell className="w-4 h-4" /> },
  { id: 'news',          label: 'News',             icon: <Newspaper className="w-4 h-4" /> },
  { id: 'events',        label: 'Events',           icon: <Calendar className="w-4 h-4" /> },
  { id: 'gallery',       label: 'Gallery',          icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'admission',     label: 'Admission Guide',  icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'profile',       label: 'My Profile',       icon: <User className="w-4 h-4" /> },
];

const MOBILE_NAV_ITEMS = [
  { id: 'home' as PortalTab,     label: 'Home',     icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'programs' as PortalTab, label: 'Programs', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'news' as PortalTab,     label: 'News',     icon: <Newspaper className="w-5 h-5" /> },
  { id: 'profile' as PortalTab,  label: 'Profile',  icon: <User className="w-5 h-5" /> },
  { id: 'settings' as PortalTab, label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

interface Props {
  activeTab: PortalTab;
  setActiveTab: (t: PortalTab) => void;
  state: OnboardingState;
  children: React.ReactNode;
}

export function WelcomePortalLayout({ activeTab, setActiveTab, state, children }: Props) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const completion = state.profileCompletionPct;
  const name = state.account.fullName.split(' ')[0] || 'Student';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    router.push('/signin');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* ── Desktop Sidebar ── */}
      <aside
        aria-label="Portal Navigation"
        className="hidden md:flex fixed left-0 top-0 h-screen w-20 xl:w-64 flex-col py-6 px-3 xl:px-4 z-40 ds-sidebar backdrop-blur-xl border-r"
        style={{ borderColor: 'var(--border-default)' }}
      >
        {/* Logo */}
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 mb-6 px-2 group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 group-hover:scale-105 transition-transform" style={{ borderColor: 'rgba(233,195,73,0.5)' }}>
            <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
          </div>
          <div className="hidden xl:block">
            <span className="font-serif text-xl font-bold block leading-none" style={{ color: 'var(--text-primary)' }}>Harmony</span>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold block mt-1" style={{ color: 'var(--brand-gold)' }}>Applicant Portal</span>
          </div>
        </button>

        {/* Profile completion card — sidebar */}
        <div
          className="hidden xl:block mb-5 rounded-2xl p-4 cursor-pointer transition-all"
          onClick={() => setActiveTab('profile')}
          style={{
            background: 'linear-gradient(135deg, var(--accent-gold-subtle) 0%, rgba(233,195,73,0.03) 100%)',
            border: '1px solid var(--accent-gold-border)',
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveTab('profile')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="relative shrink-0">
              <CircularProgress value={completion} size={40} strokeWidth={4} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-[9px] font-bold" style={{ color: 'var(--brand-gold)' }}>{completion}%</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold font-sans truncate" style={{ color: 'var(--text-primary)' }}>Profile Completion</p>
              <p className="text-[10px] font-sans" style={{ color: 'var(--text-muted)' }}>
                {completion < 100 ? 'Continue to unlock' : 'All complete!'}
              </p>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          {completion < 100 && (
            <p className="text-[10px] font-mono mt-2 text-center" style={{ color: 'var(--brand-gold)' }}>
              Tap to continue →
            </p>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium font-sans text-left transition-all ${isActive ? 'ds-nav-item-active font-semibold' : 'ds-nav-item'}`}
              >
                {isActive && (
                  <motion.div layoutId="activePortalPill" className="absolute inset-0 ds-nav-item-active-pill rounded-xl border-l-[3px]" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 shrink-0" style={{ color: isActive ? 'var(--brand-gold)' : undefined }}>{item.icon}</span>
                <span className="relative z-10 hidden xl:inline truncate">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="mt-auto border-t pt-4 space-y-1" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Marketplace shortcut */}
          <a href="/marketplace"
            className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium font-sans transition-all ds-nav-item w-full"
            aria-label="Learning Marketplace">
            <ShoppingBag className="w-4 h-4 shrink-0 text-[#E9C349]" />
            <span className="hidden xl:inline">Marketplace</span>
          </a>
          <motion.button
            onClick={() => setActiveTab('settings')}
            whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium font-sans text-left transition-all ${activeTab === 'settings' ? 'ds-nav-item-active' : 'ds-nav-item'}`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">Settings</span>
          </motion.button>
          <motion.button
            onClick={handleLogout}
            whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium font-sans text-left transition-all ds-logout-btn"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">Sign Out</span>
          </motion.button>
          {/* Profile avatar */}
          <div className="flex items-center gap-3 px-2 pt-3 mt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-serif font-bold text-sm" style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)', color: 'var(--brand-gold)' }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden xl:block overflow-hidden">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{state.account.fullName || 'Applicant'}</p>
              <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{state.applicationNumber}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 ds-header backdrop-blur-xl border-b flex items-center justify-between h-14 px-4 sm:px-6 md:pl-24 xl:pl-72" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-xl ds-nav-item" aria-label="Open menu">
            <Menu className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <button onClick={() => setActiveTab('home')} className="font-serif text-lg font-bold hover:opacity-75 transition-opacity" style={{ color: 'var(--text-primary)' }}>
              Harmony <span style={{ color: 'var(--brand-gold)' }}>College</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-faint)' }} />
            <span className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
              {[...NAV_ITEMS, { id: 'settings' as PortalTab, label: 'Settings' }].find(n => n.id === activeTab)?.label ?? 'Portal'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {completion < 100 ? (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setActiveTab('profile')}
              className="hidden sm:flex"
            >
              Complete Profile · {completion}%
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/dashboard/student')}
              className="hidden sm:flex"
              icon={<LayoutDashboard className="w-3.5 h-3.5" />}
            >
              Go to Dashboard
            </Button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="md:pl-20 xl:pl-64 pb-24 md:pb-8 min-h-screen" id="portal-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab as any} items={MOBILE_NAV_ITEMS as any} />

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 md:hidden"
              style={{ backgroundColor: 'var(--overlay-modal-bg)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col md:hidden shadow-2xl"
              style={{ backgroundColor: 'var(--bg-modal)', borderRight: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border-2" style={{ borderColor: 'rgba(233,195,73,0.4)' }}>
                    <img src="/logo2.jpg" alt="Harmony" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Applicant Portal</p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>Harmony College</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl ds-nav-item" aria-label="Close menu">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Profile pill */}
              <div className="m-3 p-3 rounded-xl cursor-pointer" onClick={() => { setActiveTab('profile'); setMobileOpen(false); }}
                style={{ background: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Profile Completion</p>
                  <span className="font-mono text-sm font-bold" style={{ color: 'var(--brand-gold)' }}>{completion}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }} animate={{ width: `${completion}%` }} transition={{ duration: 0.8 }} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV_ITEMS.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: isActive ? 'var(--accent-gold-subtle)' : 'transparent',
                        color: isActive ? 'var(--brand-gold)' : 'var(--text-secondary)',
                        border: isActive ? '1px solid var(--accent-gold-border)' : '1px solid transparent',
                      }}>
                      <div className="flex items-center gap-3">{item.icon}<span>{item.label}</span></div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
              <div className="p-3 border-t space-y-1" style={{ borderColor: 'var(--border-subtle)' }}>
                <a href="/marketplace"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ds-nav-item">
                  <ShoppingBag className="w-4 h-4 text-[#E9C349]" /><span>Marketplace</span>
                </a>
                <button onClick={() => { setActiveTab('settings'); setMobileOpen(false); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ds-nav-item transition-all">
                  <Settings className="w-4 h-4" /><span>Settings</span>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ds-logout-btn">
                  <LogOut className="w-4 h-4" /><span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Floating CTA — desktop only, when profile incomplete ── */}
      {completion < 100 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.4, type: 'spring' }}
          className="hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl cursor-pointer"
          style={{ background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))', boxShadow: '0 8px 32px rgba(233,195,73,0.35)' }}
          onClick={() => setActiveTab('profile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveTab('profile')}
          aria-label="Continue profile completion"
        >
          <div className="relative">
            <CircularProgress value={completion} size={32} strokeWidth={3} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-[8px] font-black text-black">{completion}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-black leading-none">Continue Profile</p>
            <p className="text-[10px] text-black/70 mt-0.5">{100 - completion}% remaining</p>
          </div>
          <ChevronRight className="w-4 h-4 text-black" />
        </motion.div>
      )}

      {/* ── Floating "Go to Dashboard" — when profile is 100% complete ── */}
      {completion >= 100 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4, type: 'spring' }}
          className="hidden lg:flex fixed bottom-6 right-6 z-40 items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--accent-gold-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
          onClick={() => router.push('/dashboard/student')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/dashboard/student')}
          aria-label="Go to student dashboard"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)' }}>
            <LayoutDashboard className="w-4 h-4" style={{ color: 'var(--status-success)' }} />
          </div>
          <div>
            <p className="text-xs font-bold leading-none" style={{ color: 'var(--text-primary)' }}>Student Dashboard</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Profile complete — enter portal</p>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
        </motion.div>
      )}

      {/* ── Mobile sticky CTA ── */}
      {completion < 100 && (
        <div className="md:hidden fixed bottom-18 left-3 right-3 z-40 pointer-events-none">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={() => setActiveTab('profile')}
            className="pointer-events-auto w-full flex items-center justify-between px-5 py-3 rounded-2xl shadow-2xl"
            style={{ background: 'linear-gradient(135deg, var(--brand-gold-dark), var(--brand-gold))', boxShadow: '0 4px 20px rgba(233,195,73,0.4)' }}
          >
            <div>
              <p className="text-xs font-bold text-black">Complete Your Profile — {completion}%</p>
              <p className="text-[10px] text-black/70 mt-0.5">Unlock all student services</p>
            </div>
            <ChevronRight className="w-5 h-5 text-black" />
          </motion.button>
        </div>
      )}

      {/* ── Mobile "Go to Dashboard" when complete ── */}
      {completion >= 100 && (
        <div className="md:hidden fixed bottom-18 left-3 right-3 z-40 pointer-events-none">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={() => router.push('/dashboard/student')}
            className="pointer-events-auto w-full flex items-center justify-between px-5 py-3 rounded-2xl shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-gold-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          >
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Go to Student Dashboard</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Your profile is complete</p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--brand-gold)' }} />
          </motion.button>
        </div>
      )}
    </div>
  );
}
