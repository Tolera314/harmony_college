'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, User, BookOpen, FileText, Image as ImageIcon,
  Newspaper, Calendar, Phone, HelpCircle, Lock,
  GraduationCap, CreditCard, BarChart3, ClipboardList, Award,
  Star, Quote, ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Modal } from '@/src/components/ui/Modal';
import { CircularProgress } from '@/src/components/onboarding/OnboardingProgress';
import type { OnboardingState } from '@/src/lib/onboardingStore';
import type { PortalTab } from './WelcomePortalLayout';
import { newsData } from '@/src/data/news';
import { schoolsData } from '@/src/data/schools';
import { testimonialsData } from '@/src/data/testimonials';

// ── Quick action cards ────────────────────────────────────────────────────────
const QUICK_ACTIONS: {
  id: PortalTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}[] = [
  { id: 'profile',       label: 'Complete Profile',      description: 'Finish your admission application',   icon: User,          color: '#e9c349' },
  { id: 'programs',      label: 'Explore Programs',       description: 'Browse 16+ programs & departments',   icon: BookOpen,      color: '#a78bfa' },
  { id: 'admission',     label: 'Admission Guide',        description: 'Requirements, process & timelines',   icon: FileText,      color: '#34d399' },
  { id: 'gallery',       label: 'Campus Gallery',         description: 'See life at Harmony College',         icon: ImageIcon,     color: '#60a5fa' },
  { id: 'news',          label: 'Latest News',            description: 'Stay updated with campus news',       icon: Newspaper,     color: '#f87171' },
  { id: 'events',        label: 'Events & Activities',    description: 'Upcoming events & important dates',   icon: Calendar,      color: '#fb923c' },
  { id: 'announcements', label: 'Announcements',          description: 'Official notices from admissions',    icon: HelpCircle,    color: '#38bdf8' },
  { id: 'admission',     label: 'Contact Admissions',     description: 'Get help from our admissions team',   icon: Phone,         color: '#4ade80' },
];

// ── Locked feature cards ──────────────────────────────────────────────────────
const LOCKED_FEATURES = [
  { label: 'Course Registration', description: 'Register for your program courses', icon: ClipboardList },
  { label: 'Grades & Transcript', description: 'View academic performance & GPA',   icon: GraduationCap },
  { label: 'Payments & Tuition',  description: 'Pay fees and view invoices',        icon: CreditCard     },
  { label: 'Degree Progress',     description: 'Track completion towards your degree', icon: BarChart3   },
  { label: 'Certificates',        description: 'Request official documents',        icon: Award          },
  { label: 'Digital Student ID',  description: 'Your Harmony College ID card',      icon: User           },
];

interface HomeTabProps {
  state: OnboardingState;
  onNavigate: (tab: PortalTab) => void;
}

export function HomeTab({ state, onNavigate }: HomeTabProps) {
  const [lockedModal, setLockedModal] = useState<string | null>(null);
  const name = state.account.fullName.split(' ')[0] || 'Student';
  const completion = state.profileCompletionPct;

  const latestNews = newsData.slice(0, 3);
  const featuredPrograms = schoolsData.slice(0, 4);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-10 max-w-5xl">

      {/* ── Welcome Hero ── */}
      <section>
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-card-solid) 100%)',
            border: '1px solid var(--accent-gold-border)',
          }}
        >
          {/* Gold atmosphere */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(233,195,73,0.15) 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10 p-7 sm:p-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              {/* Left: greeting */}
              <div className="flex-1 space-y-4">
                <div>
                  <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ color: 'var(--brand-gold)', border: '1px solid var(--accent-gold-border)', backgroundColor: 'var(--accent-gold-subtle)' }}>
                    Applicant Portal
                  </span>
                  <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Welcome, <span style={{ color: 'var(--brand-gold)' }}>{name}</span> 👋
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-sm font-sans mt-2 max-w-md"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {completion < 100
                      ? 'Your account has been created successfully. Complete your admission profile to unlock all student services and begin your journey at Harmony College.'
                      : 'Your application has been submitted. Our admissions team will review it within 2–5 business days. You can now access your student dashboard.'
                    }
                  </motion.p>
                </div>

                {/* Completion bar */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="max-w-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>Profile Completion</span>
                    <span className="font-mono text-sm font-bold" style={{ color: 'var(--brand-gold)' }}>{completion}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${completion}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <p className="text-[11px] font-sans" style={{ color: 'var(--text-faint)' }}>
                    {completion < 40
                      ? "Let's get started — only a few steps to go!"
                      : completion < 80
                      ? "You're doing great! A few more details needed."
                      : "Almost there — submit your application to unlock everything."}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-wrap gap-3 pt-1"
                >
                  {completion < 100 ? (
                    <>
                      <Button
                        variant="gold"
                        size="lg"
                        onClick={() => onNavigate('profile')}
                        icon={<ArrowRight className="w-4 h-4" />}
                      >
                        Continue Profile
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => onNavigate('programs')}
                      >
                        Explore Programs
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="gold"
                        size="lg"
                        onClick={() => window.location.href = '/dashboard/student'}
                        icon={<ArrowRight className="w-4 h-4" />}
                      >
                        Go to Student Dashboard
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => onNavigate('programs')}
                      >
                        Browse Programs
                      </Button>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Right: circular progress */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2, type: 'spring' }}
                className="hidden sm:flex flex-col items-center gap-3"
              >
                <div className="relative">
                  <CircularProgress value={completion} size={120} strokeWidth={8} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-2xl font-black" style={{ color: 'var(--brand-gold)' }}>{completion}%</span>
                    <span className="text-[10px] font-sans" style={{ color: 'var(--text-faint)' }}>Complete</span>
                  </div>
                </div>
                <Badge variant="gold" className="text-[10px]">Application #{state.applicationNumber}</Badge>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={`${action.id}-${idx}`}
                onClick={() => onNavigate(action.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                className="group flex flex-col items-start gap-3 p-4 rounded-2xl text-left transition-all"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${action.color}18` }}>
                  <Icon className="w-4 h-4" style={{ color: action.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold font-sans leading-tight" style={{ color: 'var(--text-primary)' }}>{action.label}</p>
                  <p className="text-[10px] font-sans mt-0.5 line-clamp-2" style={{ color: 'var(--text-faint)' }}>{action.description}</p>
                </div>
                <ArrowRight className="w-3 h-3 ml-auto self-end transition-transform group-hover:translate-x-1" style={{ color: action.color }} />
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── Latest News ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Latest News</h2>
          <button onClick={() => onNavigate('news')} className="text-xs font-semibold font-sans transition-colors" style={{ color: 'var(--brand-gold)' }}>View all →</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {latestNews.map((article, idx) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ y: -3 }}
              className="group rounded-2xl overflow-hidden cursor-pointer transition-all"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
              onClick={() => onNavigate('news')}
            >
              <div className="h-36 overflow-hidden">
                <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4">
                <Badge variant={article.category === 'Events' ? 'info' : article.category === 'Campus' ? 'emerald' : 'amber'} className="text-[10px] mb-2">
                  {article.category}
                </Badge>
                <p className="text-xs font-semibold font-sans line-clamp-2 leading-snug" style={{ color: 'var(--text-primary)' }}>{article.title}</p>
                <p className="text-[10px] font-mono mt-2" style={{ color: 'var(--text-faint)' }}>{article.date}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Featured Programs ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Featured Programs</h2>
          <button onClick={() => onNavigate('programs')} className="text-xs font-semibold font-sans" style={{ color: 'var(--brand-gold)' }}>View all →</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {featuredPrograms.map((school, idx) => (
            <motion.div
              key={school.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -2 }}
              className="group p-5 rounded-2xl cursor-pointer transition-all"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
              onClick={() => onNavigate('programs')}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform" style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
                  <GraduationCap className="w-5 h-5" style={{ color: 'var(--brand-gold)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-serif" style={{ color: 'var(--text-primary)' }}>{school.name}</p>
                  <p className="text-xs font-sans mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{school.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {school.degrees.slice(0, 1).map(d => (
                      <Badge key={d.name} variant="glass" className="text-[10px]">{d.duration}</Badge>
                    ))}
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>ETB {school.tuitionPerCredit.toLocaleString()}/credit</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 mt-1 transition-transform group-hover:translate-x-1" style={{ color: 'var(--text-faint)' }} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Student Success Stories ── */}
      <section>
        <div className="mb-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--brand-gold)' }}>
            Success Stories
          </span>
          <h2 className="font-serif text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            What Our Alumni Say
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {testimonialsData.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              className="p-5 rounded-2xl flex flex-col gap-4"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            >
              <Quote className="w-5 h-5 opacity-30" style={{ color: 'var(--brand-gold)' }} />
              <div className="flex gap-0.5 mb-1">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" style={{ color: 'var(--brand-gold)' }} />
                ))}
              </div>
              <p className="text-xs font-sans leading-relaxed italic flex-1" style={{ color: 'var(--text-secondary)' }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                  style={{ border: '1px solid var(--accent-gold-border)' }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold font-sans truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                  <p className="text-[10px] font-sans truncate" style={{ color: 'var(--text-faint)' }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Locked Student Features — only shown while profile incomplete ── */}
      {completion < 100 && (
        <section>
          <div className="mb-4">
            <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Student Services</h2>
            <p className="text-xs font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
              Complete your profile to unlock these features.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {LOCKED_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <motion.button
                  key={feat.label}
                  onClick={() => setLockedModal(feat.label)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative p-4 rounded-2xl text-left transition-all overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', opacity: 0.75 }}
                >
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10" style={{ backgroundColor: 'var(--overlay-dark-bg)', backdropFilter: 'blur(3px)' }}>
                    <Lock className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
                    <span className="text-[11px] font-semibold font-sans" style={{ color: 'var(--brand-gold)' }}>Complete Profile</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)' }}>
                      <Icon className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{feat.label}</p>
                      <p className="text-[10px] font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>{feat.description}</p>
                    </div>
                  </div>
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)' }}>
                    <Lock className="w-2.5 h-2.5" style={{ color: 'var(--status-warning)' }} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Locked Feature Modal ── */}
      <Modal
        isOpen={!!lockedModal}
        onClose={() => setLockedModal(null)}
        title="Feature Locked"
        maxWidth="max-w-md"
      >
        <div className="space-y-5 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)' }}>
            <Lock className="w-8 h-8" style={{ color: 'var(--status-warning)' }} />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{lockedModal} is Locked</h3>
            <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              This feature is only available to enrolled students with a complete admission profile. Finish your application to unlock it.
            </p>
          </div>
          <div className="space-y-2 text-left">
            {['Complete your personal information', 'Add academic details & program', 'Upload required documents', 'Submit your application'].map((step, i) => {
              const done = i < Math.floor((completion / 100) * 4);
              return (
                <div key={step} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ backgroundColor: done ? 'var(--status-success-bg)' : 'var(--hover-overlay)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold font-mono" style={{ backgroundColor: done ? 'var(--status-success)' : 'var(--border-default)', color: done ? '#fff' : 'var(--text-faint)' }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className="text-xs font-sans" style={{ color: done ? 'var(--status-success)' : 'var(--text-secondary)' }}>{step}</span>
                </div>
              );
            })}
          </div>
          <Button
            variant="gold"
            size="lg"
            className="w-full"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => { setLockedModal(null); onNavigate('profile'); }}
          >
            Continue Profile — {completion}% complete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
