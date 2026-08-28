'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, ChevronRight } from 'lucide-react';
import { CircularProgress } from './OnboardingProgress';
import { Button } from '@/src/components/ui/Button';

interface ProfileCompletionBannerProps {
  completionPct: number;
  applicationNumber?: string;
}

/**
 * Sticky banner shown at the top of the student dashboard
 * when the user's profile is not fully complete.
 */
export function ProfileCompletionBanner({ completionPct, applicationNumber }: ProfileCompletionBannerProps) {
  const router = useRouter();

  if (completionPct >= 100) return null;

  const motivations: Record<string, string> = {
    low:    'Complete your profile to unlock all student services.',
    medium: "You're almost there — just a few more details needed.",
    high:   "Almost done! Submit your application to access everything.",
  };

  const level = completionPct < 40 ? 'low' : completionPct < 80 ? 'medium' : 'high';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      style={{
        background: 'linear-gradient(135deg, rgba(233,195,73,0.08) 0%, rgba(233,195,73,0.03) 100%)',
        border: '1px solid var(--accent-gold-border)',
      }}
      role="complementary"
      aria-label="Profile completion status"
    >
      {/* Progress circle */}
      <div className="relative shrink-0">
        <CircularProgress value={completionPct} size={60} strokeWidth={5} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-xs font-bold" style={{ color: 'var(--brand-gold)' }}>
            {completionPct}%
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-serif text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Complete Your Profile
        </p>
        <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {motivations[level]}
        </p>
        {applicationNumber && (
          <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-faint)' }}>
            Application: {applicationNumber}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
            initial={{ width: '0%' }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* CTA */}
      <Button
        variant="gold"
        size="sm"
        onClick={() => router.push('/onboarding')}
        icon={<ArrowRight className="w-3.5 h-3.5" />}
        className="shrink-0 whitespace-nowrap"
      >
        Continue
      </Button>
    </motion.div>
  );
}

interface LockedFeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  reason?: string;
}

/**
 * A locked feature card that shows a lock overlay and
 * explains what must be done to unlock access.
 */
export function LockedFeatureCard({ title, description, icon: Icon, reason }: LockedFeatureCardProps) {
  const router = useRouter();

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        opacity: 0.75,
      }}
      onClick={() => router.push('/onboarding')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push('/onboarding'); }}
      aria-label={`${title} — locked. Complete your profile to unlock.`}
    >
      {/* Blur overlay */}
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ backgroundColor: 'rgba(15,15,16,0.85)', backdropFilter: 'blur(4px)' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="var(--brand-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p className="text-xs font-semibold font-sans text-center px-4" style={{ color: 'var(--text-primary)' }}>
          {reason ?? 'Complete your profile to unlock'}
        </p>
        <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--brand-gold)' }}>
          <span>Complete profile</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>

      {/* Card content (blurred) */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-default)' }}
          >
            <Icon className="w-5 h-5" style={{ color: 'var(--text-faint)' }} />
          </div>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)' }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="var(--status-warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>
        <h3 className="font-serif text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
      </div>
    </motion.div>
  );
}
