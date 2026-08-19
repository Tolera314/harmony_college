'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, BookOpen, FileText, Image as ImageIcon,
  Newspaper, Calendar, Phone, HelpCircle,
  GraduationCap, CreditCard,
  Star, Quote,
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
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
  href?: string;
}[] = [
  { id: 'programs',      label: 'Explore Programs',       description: 'Browse 16+ programs & departments',   icon: BookOpen,   color: '#a78bfa' },
  { id: 'admission',     label: 'Admission Guide',        description: 'Requirements, process & timelines',   icon: FileText,   color: '#34d399' },
  { id: 'gallery',       label: 'Campus Gallery',         description: 'See life at Harmony College',         icon: ImageIcon,  color: '#60a5fa' },
  { id: 'news',          label: 'Latest News',            description: 'Stay updated with campus news',       icon: Newspaper,  color: '#f87171' },
  { id: 'events',        label: 'Events & Activities',    description: 'Upcoming events & important dates',   icon: Calendar,   color: '#fb923c' },
  { id: 'announcements', label: 'Announcements',          description: 'Official notices from admissions',    icon: HelpCircle, color: '#38bdf8' },
  { id: 'admission',     label: 'Contact Admissions',     description: 'Get help from our admissions team',   icon: Phone,      color: '#4ade80' },
];

interface HomeTabProps {
  state: OnboardingState;
  onNavigate: (tab: PortalTab) => void;
}

export function HomeTab({ state, onNavigate }: HomeTabProps) {
  const name = state.account.fullName.split(' ')[0] || 'Student';

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
                    Your account is ready. Complete your registration — pay the fee and select your department — to unlock your Student Dashboard.
                  </motion.p>
                </div>

              {/* ── Mandatory Action Card: Payment + Department ── */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-sm"
              >
                <div
                  className="p-4 rounded-2xl space-y-3 cursor-pointer group transition-all hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(233,195,73,0.14) 0%, rgba(233,195,73,0.04) 100%)',
                    border: '1px solid var(--accent-gold-border)',
                  }}
                  onClick={() => window.location.href = '/onboarding/about'}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && (window.location.href = '/onboarding/about')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--bg-base)' }}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold font-sans" style={{ color: 'var(--text-primary)' }}>
                        Complete Registration
                      </p>
                      <p className="text-[10px] font-sans" style={{ color: 'var(--text-muted)' }}>
                        Pay registration fee · Select department
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-auto shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--brand-gold)' }} />
                  </div>
                  <p className="text-[11px] font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    These two steps unlock your Student Dashboard — messaging, courses, grades, and more.
                  </p>
                </div>
              </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-wrap gap-3 pt-1"
                >
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={() => window.location.href = '/onboarding/about'}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Start Registration
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => onNavigate('programs')}
                  >
                    Explore Programs
                  </Button>
                </motion.div>
              </div>

              {/* Right: registration status badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2, type: 'spring' }}
                className="hidden sm:flex flex-col items-center gap-3"
              >
                <div className="p-4 rounded-2xl text-center space-y-2"
                  style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)', minWidth: 120 }}>
                  <CreditCard className="w-8 h-8 mx-auto" style={{ color: 'var(--brand-gold)' }} />
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Next Step</p>
                  <p className="text-xs font-bold font-sans" style={{ color: 'var(--brand-gold)' }}>Pay & Select</p>
                </div>
                <Badge variant="gold" className="text-[10px]">#{state.applicationNumber}</Badge>
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

      {/* ── Marketplace promo ── */}
      <section>
        <motion.a
          href="/marketplace"
          whileHover={{ scale: 1.005 }}
          className="flex flex-col sm:flex-row items-center gap-5 p-6 rounded-2xl cursor-pointer group"
          style={{
            background: 'linear-gradient(135deg, rgba(233,195,73,0.1) 0%, rgba(233,195,73,0.03) 100%)',
            border: '1px solid var(--accent-gold-border)',
          }}
        >
          <div className="text-5xl shrink-0">📚</div>
          <div className="flex-1">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--brand-gold)' }}>
              Learning Marketplace
            </p>
            <h3 className="font-serif text-lg sm:text-xl font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Premium Resources for Every Program
            </h3>
            <p className="text-xs sm:text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
              Books, video courses, and downloadable assets curated by Harmony College faculty. Start learning today.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--brand-gold)' }}>
              <span>Browse Marketplace</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.a>
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

      {/* ── Student Success Stories ── */}      <section>
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

    </div>
  );
}
