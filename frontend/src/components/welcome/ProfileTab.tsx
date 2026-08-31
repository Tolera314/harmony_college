'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  User, BookOpen, Upload, Users, CheckCircle2,
  ArrowRight, Clock, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { CircularProgress } from '@/src/components/onboarding/OnboardingProgress';
import type { OnboardingState } from '@/src/lib/onboardingStore';

interface StepCard {
  step: number;
  label: string;
  description: string;
  estimatedTime: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  fields: string[];
}

const PROFILE_STEPS: StepCard[] = [
  {
    step: 1,
    label: 'Personal Information',
    description: 'Nationality, date of birth, gender, region, city, and home address.',
    estimatedTime: '2 min',
    icon: User,
    fields: ['Nationality', 'Date of Birth', 'Gender', 'City', 'Address'],
  },
  {
    step: 2,
    label: 'Academic Information',
    description: 'Program applying for, academic year, semester, and exam results.',
    estimatedTime: '2 min',
    icon: BookOpen,
    fields: ['Program', 'Academic Year', 'Semester', 'Matric Result'],
  },
  {
    step: 3,
    label: 'Document Uploads',
    description: 'Profile picture, Fayda/National ID, and academic transcript.',
    estimatedTime: '3 min',
    icon: Upload,
    fields: ['Profile Picture', 'Fayda / National ID', 'Transcript'],
  },
  {
    step: 4,
    label: 'Emergency Contact',
    description: 'A trusted person we can reach in case of an on-campus emergency.',
    estimatedTime: '1 min',
    icon: Users,
    fields: ['Contact Name', 'Relationship', 'Phone Number'],
  },
  {
    step: 5,
    label: 'Review & Submit',
    description: 'Review all your information and submit your admission application.',
    estimatedTime: '2 min',
    icon: CheckCircle2,
    fields: ['Review all sections', 'Submit application'],
  },
];

function getStepStatus(
  step: number,
  profile: OnboardingState['profile']
): 'complete' | 'partial' | 'empty' {
  const checks: Record<number, () => boolean> = {
    1: () => !!(profile.nationality && profile.dob && profile.gender && profile.city && profile.nationalId),
    2: () => !!(profile.program && profile.academicYear),
    3: () => !!(profile.profilePictureName && profile.faydaIdName),
    4: () => !!(profile.emergencyName && profile.emergencyPhone),
    5: () => false, // submit step always pending unless submitted
  };
  const partial: Record<number, () => boolean> = {
    1: () => !!(profile.nationality || profile.dob || profile.gender),
    2: () => !!(profile.program || profile.academicYear),
    3: () => !!(profile.profilePictureName || profile.faydaIdName),
    4: () => !!(profile.emergencyName || profile.emergencyPhone),
    5: () => false,
  };
  if (checks[step]?.()) return 'complete';
  if (partial[step]?.()) return 'partial';
  return 'empty';
}

interface ProfileTabProps {
  state: OnboardingState;
}

export function ProfileTab({ state }: ProfileTabProps) {
  const router = useRouter();
  const completion = state.profileCompletionPct;
  const allComplete = completion >= 100;

  // Find first incomplete step
  const firstIncomplete = PROFILE_STEPS.find(
    (s) => getStepStatus(s.step, state.profile) !== 'complete'
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-8 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {allComplete ? 'Profile Complete 🎉' : 'Complete Your Profile'}
        </h1>
        <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
          {allComplete
            ? 'Your admission application has been submitted. Our team will review it within 2–5 business days.'
            : 'Complete all sections to submit your admission application and unlock student services.'}
        </p>
      </div>

      {/* Overall progress card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(233,195,73,0.1) 0%, rgba(233,195,73,0.03) 100%)',
          border: '1px solid var(--accent-gold-border)',
        }}
      >
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <CircularProgress value={completion} size={80} strokeWidth={6} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-base font-black" style={{ color: 'var(--brand-gold)' }}>{completion}%</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {completion < 40 ? "Let's get started!" : completion < 80 ? "You're doing great!" : completion < 100 ? 'Almost there!' : 'All done!'}
              </h2>
              {completion === 100 && <Badge variant="success">Submitted</Badge>}
            </div>
            <p className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>
              {completion < 100
                ? `${5 - Math.floor(completion / 25)} sections remaining · Application No. ${state.applicationNumber}`
                : `Application No. ${state.applicationNumber} — Under review`}
            </p>
            <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
          {!allComplete && (
            <Button
              variant="gold"
              size="md"
              onClick={() => router.push(`/onboarding?step=${firstIncomplete?.step ?? 1}`)}
              className="shrink-0 hidden sm:flex"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continue
            </Button>
          )}
        </div>
        {!allComplete && (
          <Button
            variant="gold"
            size="md"
            onClick={() => router.push(`/onboarding?step=${firstIncomplete?.step ?? 1}`)}
            className="w-full mt-4 sm:hidden"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Continue Profile
          </Button>
        )}
      </motion.div>

      {/* Account info row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Full Name', value: state.account.fullName || '—' },
          { label: 'Phone', value: state.account.phone || '—' },
          { label: 'Email', value: state.account.email || 'Not provided' },
        ].map((item) => (
          <div key={item.label} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>{item.label}</p>
            <p className="text-sm font-semibold font-sans truncate" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Step cards */}
      <div className="space-y-3">
        <h3 className="font-serif text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Admission Steps</h3>
        {PROFILE_STEPS.map((step, idx) => {
          const status = getStepStatus(step.step, state.profile);
          const Icon = step.icon;
          const isCurrent = firstIncomplete?.step === step.step;

          return (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: isCurrent
                  ? '1px solid var(--accent-gold-border)'
                  : status === 'complete'
                  ? '1px solid var(--status-success-border)'
                  : '1px solid var(--border-card)',
              }}
            >
              <div className="flex items-center gap-4 p-5">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor:
                      status === 'complete'
                        ? 'var(--status-success-bg)'
                        : isCurrent
                        ? 'var(--accent-gold-subtle)'
                        : 'var(--hover-overlay)',
                    border: `1px solid ${
                      status === 'complete'
                        ? 'var(--status-success-border)'
                        : isCurrent
                        ? 'var(--accent-gold-border)'
                        : 'var(--border-default)'
                    }`,
                  }}
                >
                  {status === 'complete' ? (
                    <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--status-success)' }} />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: isCurrent ? 'var(--brand-gold)' : 'var(--text-faint)' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{step.label}</p>
                    {status === 'complete' && <Badge variant="success" className="text-[10px]">Complete</Badge>}
                    {status === 'partial' && <Badge variant="warning" className="text-[10px]">In Progress</Badge>}
                    {isCurrent && status !== 'complete' && <Badge variant="gold" className="text-[10px]">Up Next</Badge>}
                  </div>
                  <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>{step.description}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>~{step.estimatedTime}</span>
                  </div>
                </div>

                {/* Action — deep-links to the correct wizard step */}
                {status !== 'complete' && (
                  <Button
                    variant={isCurrent ? 'gold' : 'secondary'}
                    size="sm"
                    onClick={() => router.push(`/onboarding?step=${step.step}`)}
                    className="shrink-0"
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    {status === 'partial' ? 'Continue' : 'Start'}
                  </Button>
                )}
              </div>

              {/* Fields preview — expanded for incomplete steps */}
              {status !== 'complete' && (
                <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                  {step.fields.map((f) => (
                    <span key={f} className="text-[10px] font-mono px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--hover-overlay)', color: 'var(--text-faint)', border: '1px solid var(--border-subtle)' }}>
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Reminder */}
      {!allComplete && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--status-info)' }} />
          <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Your admission application is only visible to the Harmony College admissions team once submitted. All information is securely stored.
          </p>
        </div>
      )}
    </div>
  );
}
