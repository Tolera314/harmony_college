'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, MapPin, BookOpen, Upload, Users, CheckCircle2,
  ArrowLeft, ArrowRight, ChevronRight,
  Flag, Calendar, GraduationCap, Phone,
  Info, Star, Trophy, Camera, Music, Palette,
  Globe, Stethoscope, Film, Headphones,
  Quote, Shield, Clock, Award
} from 'lucide-react';
import { OnboardingBackground } from './OnboardingBackground';
import { OnboardingProgress } from './OnboardingProgress';
import { FileUploadCard, emptyUpload, type UploadState } from './FileUploadCard';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { CircularProgress } from './OnboardingProgress';
import ThemeToggle from '@/src/components/ThemeToggle';
import {
  loadOnboardingState,
  updateProfile,
  completeOnboarding,
  DEFAULT_STATE,
  type ProfileData,
  type OnboardingState,
} from '@/src/lib/onboardingStore';

// ── College Context Data ──────────────────────────────────────────────────────

const COLLEGE_STATS = [
  { value: '500+', label: 'Active Students',  icon: Users },
  { value: '16+',  label: 'Programs Offered', icon: BookOpen },
  { value: '90%',  label: 'Graduate Placement', icon: Award },
  { value: '2015', label: 'Established',       icon: Trophy },
];

const PROGRAMS_PREVIEW = [
  { name: 'Photography & Videography', icon: Camera,     color: '#e9c349' },
  { name: 'Theatrical Art & Filmmaking', icon: Film,     color: '#a78bfa' },
  { name: 'Music & Vocal Arts',        icon: Music,      color: '#34d399' },
  { name: 'Cubase Music Production',   icon: Headphones, color: '#f87171' },
  { name: 'Graphic Design & Marketing',icon: Palette,    color: '#60a5fa' },
  { name: 'IT, Journalism & Languages',icon: Globe,      color: '#fb923c' },
  { name: 'Pharmacy',                  icon: Stethoscope,color: '#4ade80' },
];

const TESTIMONIALS = [
  {
    name: 'Meron Alemu',
    role: 'Commercial Photographer · Class of 2024',
    avatar: '/Meron.png',
    quote: 'I came in with no camera experience and left with a professional portfolio and clients. The instructors treat you like a real artist from day one.',
  },
  {
    name: 'Natnael Getachew',
    role: 'Music Producer · Class of 2024',
    avatar: '/natnael.png',
    quote: 'Within six months of graduating I was producing for artists in Addis. This college gave me my career.',
  },
  {
    name: 'Tigist Haile',
    role: 'Graphic Designer · Class of 2025',
    avatar: '/tigist.png',
    quote: 'I landed a full-time job at a design agency before I even finished the program. The portfolio I built here opened every door.',
  },
];

// Context that changes per wizard step — ties form fields to real college value
const STEP_CONTEXT: Record<number, {
  heading: string;
  body: string;
  highlight?: string;
}> = {
  1: {
    heading: 'Welcome to Harmony College',
    body: 'We use your personal details to prepare your official student record and ensure your enrollment goes smoothly. Everything is stored securely.',
    highlight: 'Est. 2015 · Sheger, Burayu, Ethiopia',
  },
  2: {
    heading: 'Find your creative path',
    body: 'Harmony College offers 16+ programs across creative arts, technology, and health sciences. Your program selection determines your class schedule, fees, and advisor.',
    highlight: '16+ programs · 1-year diplomas · 6-month certificates',
  },
  3: {
    heading: 'Secure document upload',
    body: 'Your documents are used for verification only. Profile photos appear on your student ID and portal. Fayda ID confirms your identity.',
    highlight: 'All uploads are encrypted and confidential',
  },
  4: {
    heading: 'Your safety is our priority',
    body: 'Emergency contacts allow us to reach someone you trust if there is an urgent situation on campus. This information is never shared externally.',
    highlight: 'Used only for on-campus emergencies',
  },
  5: {
    heading: 'Almost there — review carefully',
    body: 'Once submitted, our admissions team reviews your application within 2–5 business days. You will receive a confirmation SMS or email with next steps.',
    highlight: 'Admissions decision in 2–5 business days',
  },
};

// ── Mobile context accordion ─────────────────────────────────────────────────
function MobileContextAccordion({ wizardStep }: { wizardStep: number }) {
  const [open, setOpen] = useState(false);
  const ctx = STEP_CONTEXT[wizardStep];

  return (
    <div className="lg:hidden border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
        aria-expanded={open}
        aria-controls="mobile-context-panel"
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--brand-gold)' }} />
          <span className="text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>
            {ctx.heading}
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight
            className="w-4 h-4 rotate-90"
            style={{ color: 'var(--text-faint)' }}
          />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-context-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Context hint */}
              <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {ctx.body}
              </p>
              {ctx.highlight && (
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 shrink-0" style={{ color: 'var(--brand-gold)' }} />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--brand-gold)' }}>
                    {ctx.highlight}
                  </span>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2">
                {COLLEGE_STATS.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="text-center">
                      <p className="font-mono text-sm font-bold" style={{ color: 'var(--brand-gold)' }}>{stat.value}</p>
                      <p className="text-[9px] font-sans mt-0.5" style={{ color: 'var(--text-faint)' }}>{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Quick testimonial */}
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <img src={TESTIMONIALS[0].avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  <div>
                    <p className="text-[10px] font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{TESTIMONIALS[0].name}</p>
                    <p className="text-[9px] font-sans" style={{ color: 'var(--text-faint)' }}>{TESTIMONIALS[0].role}</p>
                  </div>
                </div>
                <p className="text-[11px] font-sans italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  &ldquo;{TESTIMONIALS[0].quote.slice(0, 100)}…&rdquo;
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── College Context Panel (desktop sidebar) ───────────────────────────────────
function OnboardingContextPanel({
  wizardStep,
  completion,
  applicationNumber,
}: {
  wizardStep: number;
  completion: number;
  applicationNumber: string;
}) {
  const ctx = STEP_CONTEXT[wizardStep];
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Rotate testimonials every 6 s
  useEffect(() => {
    const t = setInterval(() => {
      setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const testimonial = TESTIMONIALS[testimonialIdx];

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-5 pr-1"
      style={{ scrollbarWidth: 'none' }}>

      {/* Step-specific context card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={wizardStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, var(--accent-gold-subtle) 0%, rgba(233,195,73,0.03) 100%)',
            border: '1px solid var(--accent-gold-border)',
          }}
        >
          <h3 className="font-serif text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {ctx.heading}
          </h3>
          <p className="text-xs font-sans leading-relaxed mb-2.5" style={{ color: 'var(--text-secondary)' }}>
            {ctx.body}
          </p>
          {ctx.highlight && (
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 shrink-0" style={{ color: 'var(--brand-gold)' }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--brand-gold)' }}>
                {ctx.highlight}
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        {COLLEGE_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl p-3"
              style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}
            >
              <Icon className="w-3.5 h-3.5 mb-1.5" style={{ color: 'var(--brand-gold)' }} />
              <p className="font-mono text-sm font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                {stat.value}
              </p>
              <p className="text-[10px] font-sans mt-0.5" style={{ color: 'var(--text-faint)' }}>
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Programs preview — highlights on step 2 */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--text-faint)' }}>
          Our Programs
        </p>
        <div className="space-y-1.5">
          {PROGRAMS_PREVIEW.map((prog) => {
            const Icon = prog.icon;
            return (
              <div
                key={prog.name}
                className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg transition-all"
                style={{
                  backgroundColor: wizardStep === 2 ? 'var(--hover-overlay)' : 'transparent',
                  border: wizardStep === 2 ? '1px solid var(--border-subtle)' : '1px solid transparent',
                }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${prog.color}18` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: prog.color }} />
                </div>
                <span className="text-xs font-sans truncate" style={{ color: 'var(--text-secondary)' }}>
                  {prog.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rotating testimonial */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        <Quote className="w-4 h-4 mb-2 opacity-40" style={{ color: 'var(--brand-gold)' }} />
        <AnimatePresence mode="wait">
          <motion.div
            key={testimonialIdx}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-xs font-sans leading-relaxed italic mb-3"
              style={{ color: 'var(--text-secondary)' }}>
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-8 h-8 rounded-full object-cover shrink-0"
                style={{ border: '1px solid var(--accent-gold-border)' }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold font-sans truncate" style={{ color: 'var(--text-primary)' }}>
                  {testimonial.name}
                </p>
                <p className="text-[10px] font-sans truncate" style={{ color: 'var(--text-faint)' }}>
                  {testimonial.role}
                </p>
              </div>
              {/* Star rating */}
              <div className="flex shrink-0 ml-auto">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-2.5 h-2.5 fill-current" style={{ color: 'var(--brand-gold)' }} />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTestimonialIdx(i)}
              className="rounded-full transition-all"
              style={{
                width: i === testimonialIdx ? '16px' : '6px',
                height: '6px',
                backgroundColor: i === testimonialIdx ? 'var(--brand-gold)' : 'var(--border-default)',
              }}
              aria-label={`Testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Application number + progress */}
      {applicationNumber && (
        <div
          className="rounded-xl p-3 flex items-center justify-between"
          style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}
        >
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Application No.
            </p>
            <p className="font-mono text-sm font-bold mt-0.5" style={{ color: 'var(--brand-gold)' }}>
              {applicationNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Profile
            </p>
            <p className="font-mono text-sm font-bold mt-0.5" style={{ color: 'var(--brand-gold)' }}>
              {completion}%
            </p>
          </div>
        </div>
      )}

      {/* Processing time badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ backgroundColor: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)' }}>
        <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--status-info)' }} />
        <p className="text-[11px] font-sans" style={{ color: 'var(--text-secondary)' }}>
          Admissions decisions in <strong>2–5 business days</strong>
        </p>
      </div>
    </div>
  );
}

const PROGRAMS = [
  'Photography', 'Videography', 'Theatrical Art', 'Filmmaking',
  'Music Instruments', 'Vocal Arts', 'Cubase Music Production',
  'Graphic Design', 'Digital Marketing', 'Journalism',
  'Information Technology (IT)', 'English', 'Arabic', 'French',
  'Other Languages', 'Pharmacy',
];

const WIZARD_STEPS = [
  { id: 1, label: 'Personal',   sublabel: 'Info'     },
  { id: 2, label: 'Academic',   sublabel: 'Details'  },
  { id: 3, label: 'Documents',  sublabel: 'Uploads'  },
  { id: 4, label: 'Emergency',  sublabel: 'Contact'  },
  { id: 5, label: 'Review',     sublabel: 'Submit'   },
];

const MOTIVATIONAL: Record<number, string> = {
  1: "Great start! Let's get to know you.",
  2: "Perfect. Now tell us about your academic goals.",
  3: "Almost there — upload your documents.",
  4: "One more step. Add an emergency contact.",
  5: "You're ready! Review and submit your application.",
};

// Reusable field components
function WizardInput({
  id, label, type = 'text', value, onChange, error, required, icon: Icon, children,
}: {
  id: string; label: string; type?: string;
  value: string; onChange: (v: string) => void;
  error?: string; required?: boolean;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span className="ml-1" style={{ color: 'var(--status-danger)' }}>*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
        )}
        {children ?? (
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
            required={required}
            className={`w-full py-3 rounded-xl border text-sm font-sans transition-colors focus:outline-none ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: error ? 'var(--status-danger)' : 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
        )}
      </div>
      {error && <p role="alert" className="text-[11px] font-sans" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </div>
  );
}

function WizardSelect({
  id, label, value, onChange, options, error, required, icon: Icon,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; options: string[];
  error?: string; required?: boolean;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <WizardInput id={id} label={label} value={value} onChange={() => {}} error={error} required={required} icon={Icon}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        required={required}
        className={`w-full py-3 rounded-xl border text-sm font-sans transition-colors focus:outline-none appearance-none cursor-pointer ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
        style={{
          backgroundColor: 'var(--bg-input)',
          borderColor: error ? 'var(--status-danger)' : 'var(--border-default)',
          color: value ? 'var(--text-primary)' : 'var(--text-faint)',
        }}
      >
        <option value="">Select {label}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </WizardInput>
  );
}

// Step 1 — Personal Information
function StepPersonal({ profile, errors, onChange }: {
  profile: ProfileData;
  errors: Partial<Record<keyof ProfileData, string>>;
  onChange: (key: keyof ProfileData, val: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WizardSelect id="nationality" label="Nationality" value={profile.nationality}
          onChange={(v) => onChange('nationality', v)} required error={errors.nationality}
          icon={Flag}
          options={['Ethiopian', 'Kenyan', 'South Sudanese', 'Eritrean', 'Somali', 'Other']} />
        <WizardInput id="dob" label="Date of Birth" type="date" value={profile.dob}
          onChange={(v) => onChange('dob', v)} required error={errors.dob} icon={Calendar}
          children={
            <input id="dob" type="date" value={profile.dob}
              onChange={(e) => onChange('dob', e.target.value)}
              required aria-invalid={!!errors.dob}
              className="w-full py-3 pl-10 pr-4 rounded-xl border text-sm font-sans transition-colors focus:outline-none dark:[color-scheme:dark] light:[color-scheme:light]"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: errors.dob ? 'var(--status-danger)' : 'var(--border-default)', color: 'var(--text-primary)' }} />
          } />
      </div>
      <div>
        <label className="block text-xs font-semibold font-sans mb-2" style={{ color: 'var(--text-secondary)' }}>
          Gender <span style={{ color: 'var(--status-danger)' }}>*</span>
        </label>
        <div className="flex rounded-xl p-1.5 gap-1.5" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
          {['Male', 'Female', 'Prefer not to say'].map((g) => (
            <button key={g} type="button" onClick={() => onChange('gender', g)}
              className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
              style={{
                backgroundColor: profile.gender === g ? 'var(--accent-gold-subtle)' : 'transparent',
                color: profile.gender === g ? 'var(--brand-gold)' : 'var(--text-muted)',
                border: profile.gender === g ? '1px solid var(--accent-gold-border)' : '1px solid transparent',
              }}>
              {g}
            </button>
          ))}
        </div>
        {errors.gender && <p className="mt-1 text-[11px]" style={{ color: 'var(--status-danger)' }}>{errors.gender}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WizardInput id="region" label="Region / Zone" value={profile.region}
          onChange={(v) => onChange('region', v)} icon={MapPin} />
        <WizardInput id="city" label="City" value={profile.city}
          onChange={(v) => onChange('city', v)} required error={errors.city} icon={MapPin} />
      </div>
      <WizardInput id="address" label="Full Address" value={profile.address}
        onChange={(v) => onChange('address', v)} required error={errors.address} />
    </div>
  );
}

// Step 2 — Academic Information
function StepAcademic({ profile, errors, onChange }: {
  profile: ProfileData;
  errors: Partial<Record<keyof ProfileData, string>>;
  onChange: (key: keyof ProfileData, val: string) => void;
}) {
  return (
    <div className="space-y-5">
      <WizardSelect id="program" label="Program Applying For" value={profile.program}
        onChange={(v) => onChange('program', v)} required error={errors.program}
        icon={GraduationCap} options={PROGRAMS} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WizardSelect id="academicYear" label="Academic Year" value={profile.academicYear}
          onChange={(v) => onChange('academicYear', v)} required error={errors.academicYear}
          icon={Calendar}
          options={['2024/2025', '2025/2026', '2026/2027']} />
        <WizardSelect id="semester" label="Semester" value={profile.semester}
          onChange={(v) => onChange('semester', v)} icon={BookOpen}
          options={['Semester I', 'Semester II']} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WizardInput id="matricResult" label="Matric / Grade 12 Result" value={profile.matricResult}
          onChange={(v) => onChange('matricResult', v)} />
        <WizardInput id="ministryResult" label="Ministry Exam Result" value={profile.ministryResult}
          onChange={(v) => onChange('ministryResult', v)} />
      </div>
      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)' }}>
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--status-info)' }} />
          <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Academic documents and transcripts will be uploaded in the next step. You can also provide them later from your student portal.
          </p>
        </div>
      </div>
    </div>
  );
}

// Step 3 — Document Uploads
function StepDocuments({ profilePic, faydaId, transcript, onProfilePic, onFaydaId, onTranscript, onRemoveProfilePic, onRemoveFaydaId, onRemoveTranscript }: {
  profilePic: UploadState; faydaId: UploadState; transcript: UploadState;
  onProfilePic: (f: File) => void; onFaydaId: (f: File) => void; onTranscript: (f: File) => void;
  onRemoveProfilePic: () => void; onRemoveFaydaId: () => void; onRemoveTranscript: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileUploadCard title="Profile Picture" description="Passport-size photo · JPG/PNG · 2 MB max"
          accept="image/jpeg,image/png,image/webp" maxSizeMB={2}
          state={profilePic} onChange={onProfilePic} onRemove={onRemoveProfilePic}
          imagePreview required />
        <FileUploadCard title="Fayda / National ID" description="National ID document · PDF/JPG/PNG · 5 MB max"
          accept=".pdf,image/*" maxSizeMB={5}
          state={faydaId} onChange={onFaydaId} onRemove={onRemoveFaydaId} required />
      </div>
      <FileUploadCard title="Academic Transcript" description="School transcript or certificate · PDF/JPG · 10 MB max"
        accept=".pdf,image/*" maxSizeMB={10}
        state={transcript} onChange={onTranscript} onRemove={onRemoveTranscript} />
      <p className="text-[11px] font-sans" style={{ color: 'var(--text-faint)' }}>
        * Files are stored locally in this demo. Backend integration will handle secure server upload.
      </p>
    </div>
  );
}

// Step 4 — Emergency Contact
function StepEmergency({ profile, errors, onChange }: {
  profile: ProfileData;
  errors: Partial<Record<keyof ProfileData, string>>;
  onChange: (key: keyof ProfileData, val: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WizardInput id="emergencyName" label="Contact Full Name" value={profile.emergencyName}
          onChange={(v) => onChange('emergencyName', v)} required error={errors.emergencyName} icon={User} />
        <WizardSelect id="emergencyRelationship" label="Relationship" value={profile.emergencyRelationship}
          onChange={(v) => onChange('emergencyRelationship', v)} required error={errors.emergencyRelationship}
          icon={Users}
          options={['Parent', 'Guardian', 'Sibling', 'Spouse', 'Relative', 'Friend', 'Other']} />
      </div>
      <WizardInput id="emergencyPhone" label="Emergency Phone Number" type="tel" value={profile.emergencyPhone}
        onChange={(v) => onChange('emergencyPhone', v)} required error={errors.emergencyPhone} icon={Phone} />
      <WizardInput id="emergencyNotes" label="Notes (Optional)" value={profile.emergencyNotes}
        onChange={(v) => onChange('emergencyNotes', v)}
        children={
          <textarea id="emergencyNotes" value={profile.emergencyNotes}
            onChange={(e) => onChange('emergencyNotes', e.target.value)} rows={3}
            placeholder="Any additional information..."
            className="w-full px-4 py-3 rounded-xl border text-sm font-sans transition-colors focus:outline-none resize-none"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
        } />
    </div>
  );
}

// Step 5 — Review & Submit
function StepReview({ state, profilePic, onEdit }: {
  state: OnboardingState;
  profilePic: UploadState;
  onEdit: (step: number) => void;
}) {
  const { account, profile } = state;
  const sections = [
    { step: 1, title: 'Personal Information', icon: User, fields: [
      { label: 'Nationality', value: profile.nationality },
      { label: 'Date of Birth', value: profile.dob },
      { label: 'Gender', value: profile.gender },
      { label: 'City', value: profile.city },
      { label: 'Address', value: profile.address },
    ]},
    { step: 2, title: 'Academic Information', icon: BookOpen, fields: [
      { label: 'Program', value: profile.program },
      { label: 'Academic Year', value: profile.academicYear },
      { label: 'Semester', value: profile.semester },
      { label: 'Matric Result', value: profile.matricResult || '—' },
    ]},
    { step: 3, title: 'Documents', icon: Upload, fields: [
      { label: 'Profile Picture', value: profile.profilePictureName || '—' },
      { label: 'Fayda / National ID', value: profile.faydaIdName || '—' },
      { label: 'Transcript', value: profile.transcriptName || '—' },
    ]},
    { step: 4, title: 'Emergency Contact', icon: Users, fields: [
      { label: 'Name', value: profile.emergencyName },
      { label: 'Relationship', value: profile.emergencyRelationship },
      { label: 'Phone', value: profile.emergencyPhone },
    ]},
  ];

  return (
    <div className="space-y-4">
      {/* Applicant card */}
      <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        {profilePic.preview ? (
          <img src={profilePic.preview} alt="Profile" className="w-14 h-14 rounded-xl object-cover shrink-0 border-2" style={{ borderColor: 'var(--accent-gold-border)' }} />
        ) : (
          <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center font-serif text-xl font-bold" style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)', color: 'var(--brand-gold)' }}>
            {account.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>{account.fullName}</h3>
          <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>{account.phone}{account.email ? ` · ${account.email}` : ''}</p>
          <Badge variant="gold" className="mt-1.5 text-[10px]">{profile.program || 'Program TBD'}</Badge>
        </div>
      </div>

      {sections.map((sec) => {
        const Icon = sec.icon;
        return (
          <div key={sec.step} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-card)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--hover-overlay)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" style={{ color: 'var(--brand-gold)' }} />
                <span className="text-xs font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{sec.title}</span>
              </div>
              <button type="button" onClick={() => onEdit(sec.step)} className="text-[10px] font-semibold font-sans underline transition-colors" style={{ color: 'var(--brand-gold)' }}>
                Edit
              </button>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5" style={{ backgroundColor: 'var(--bg-card)' }}>
              {sec.fields.map((f) => (
                <div key={f.label}>
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{f.label}</p>
                  <p className="text-xs font-sans font-medium mt-0.5 truncate" style={{ color: f.value && f.value !== '—' ? 'var(--text-primary)' : 'var(--text-faint)' }}>{f.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--brand-gold)' }} />
        <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          By submitting, you confirm that all information provided is accurate. You will receive your application number and next steps after submission.
        </p>
      </div>
    </div>
  );
}

// Success screen
function SuccessScreen({ appNumber, onContinue }: { appNumber: string; onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center text-center py-8 gap-6"
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ background: 'radial-gradient(circle, var(--status-success-bg), transparent)', border: '2px solid var(--status-success-border)' }}
      >
        <CheckCircle2 className="w-12 h-12" style={{ color: 'var(--status-success)' }} />
      </motion.div>
      <div>
        <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="font-serif text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Application Submitted!
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="text-sm font-sans mt-2 max-w-sm" style={{ color: 'var(--text-muted)' }}>
          Your application has been received. Our admissions team will review and respond within 2–5 business days.
        </motion.p>
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="w-full max-w-xs p-5 rounded-2xl space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Application Number</p>
        <p className="font-mono text-xl font-bold" style={{ color: 'var(--brand-gold)' }}>{appNumber}</p>
        <p className="text-[11px] font-sans" style={{ color: 'var(--text-muted)' }}>Save this number for future reference.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="w-full max-w-xs space-y-3">
        {[
          { step: '1', text: 'Application under review', done: true },
          { step: '2', text: 'Admissions decision (2–5 days)', done: false },
          { step: '3', text: 'Enrollment confirmation', done: false },
        ].map((item) => (
          <div key={item.step} className="flex items-center gap-3 text-sm font-sans">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono font-bold"
              style={{ backgroundColor: item.done ? 'var(--status-success-bg)' : 'var(--hover-overlay)', border: `1px solid ${item.done ? 'var(--status-success-border)' : 'var(--border-default)'}`, color: item.done ? 'var(--status-success)' : 'var(--text-faint)' }}>
              {item.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.step}
            </div>
            <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.text}</span>
          </div>
        ))}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }} className="w-full max-w-xs">
        <Button variant="gold" size="lg" className="w-full" onClick={onContinue}
          icon={<ArrowRight className="w-4 h-4" />}>
          Continue to Dashboard
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(DEFAULT_STATE);
  const [wizardStep, setWizardStep] = useState(1);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // File upload states (kept in memory — URLs stored in profile state)
  const [profilePic, setProfilePic] = useState<UploadState>(emptyUpload());
  const [faydaId,    setFaydaId]    = useState<UploadState>(emptyUpload());
  const [transcript, setTranscript] = useState<UploadState>(emptyUpload());

  // ── Guard + pre-populate from backend ──────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Check session first
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!meRes.ok) { router.replace('/signin'); return; }
      const meData = await meRes.json();
      if (!meData.authenticated) { router.replace('/signin'); return; }

      // Load existing StudentProfile to pre-fill form
      const profileRes = await fetch('/api/student/profile', { credentials: 'include' });
      let existingProfile: ProfileData = DEFAULT_STATE.profile;
      if (profileRes.ok) {
        const pd = await profileRes.json();
        const bp = pd.profile;
        if (bp) {
          existingProfile = {
            nationality:          bp.nationality          ?? '',
            dob:                  bp.dob ? bp.dob.split('T')[0] : '',
            gender:               bp.gender              ?? '',
            region:               bp.region              ?? '',
            city:                 bp.city                ?? '',
            address:              bp.address             ?? '',
            program:              bp.program             ?? '',
            academicYear:         bp.academicYear        ?? '',
            semester:             bp.semester            ?? '',
            matricResult:         bp.matricResult        ?? '',
            ministryResult:       bp.ministryResult      ?? '',
            profilePictureName:   bp.profilePictureUrl   ? 'Uploaded' : '',
            profilePicturePreview:bp.profilePictureUrl   ?? '',
            faydaIdName:          bp.faydaIdUrl          ? 'Uploaded' : '',
            transcriptName:       bp.transcriptUrl       ? 'Uploaded' : '',
            emergencyName:        bp.emergencyName        ?? '',
            emergencyRelationship:bp.emergencyRelationship ?? '',
            emergencyPhone:       bp.emergencyPhone       ?? '',
            emergencyNotes:       bp.emergencyNotes       ?? '',
          };
          // Pre-fill upload display states with existing URLs
          if (bp.profilePictureUrl) setProfilePic({ file: null, preview: bp.profilePictureUrl, uploading: false, error: '' });
          if (bp.faydaIdUrl)        setFaydaId(   { file: null, preview: bp.faydaIdUrl,        uploading: false, error: '' });
          if (bp.transcriptUrl)     setTranscript( { file: null, preview: bp.transcriptUrl,     uploading: false, error: '' });
        }
      }

      // Build full state
      const s = loadOnboardingState();
      const user = meData.user;
      const merged: OnboardingState = {
        stage:              'complete-profile',
        account:            {
          fullName: user.fullName,
          phone:    user.phone    ?? s.account.phone    ?? '',
          email:    user.email    ?? s.account.email    ?? '',
          password: '',
          userId:   user.id,
        },
        contactVerified:    true,
        profile:            existingProfile,
        applicationNumber:  s.applicationNumber || `HC-${new Date().getFullYear()}-${user.id.slice(0,6).toUpperCase()}`,
        profileCompletionPct: user.profileCompletion,
      };
      setOnboardingState(merged);

      // Deep-link to correct step
      const stepParam = searchParams.get('step');
      if (stepParam) {
        const n = parseInt(stepParam, 10);
        if (n >= 1 && n <= 5) setWizardStep(n);
      }

      setMounted(true);
    };
    init().catch(() => { router.replace('/signin'); });
  }, [router, searchParams]);

  if (!mounted) return null;

  const profile = onboardingState.profile;
  const setField = (key: keyof ProfileData, val: string) => {
    setOnboardingState((prev) => updateProfile(prev, { [key]: val }));
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  // ── File upload — POST to /api/upload then store fileUrl ──────────────────
  const uploadFile = async (file: File): Promise<string | null> => {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form });
      const data = await res.json();
      if (!res.ok) return null;
      return data.fileUrl as string;
    } catch {
      return null;
    }
  };

  const handleFileChange = (type: 'profilePic' | 'faydaId' | 'transcript') => async (file: File) => {
    const preview = URL.createObjectURL(file);
    const setUpState = type === 'profilePic' ? setProfilePic : type === 'faydaId' ? setFaydaId : setTranscript;
    setUpState({ file, preview, uploading: true, error: '' });

    const fileUrl = await uploadFile(file);
    if (!fileUrl) {
      setUpState({ file, preview: '', uploading: false, error: 'Upload failed. Please try again.' });
      return;
    }

    setUpState({ file, preview, uploading: false, error: '' });

    // Store the server URL in profile state
    if (type === 'profilePic') {
      setField('profilePictureName',   file.name);
      setField('profilePicturePreview', fileUrl);
      setOnboardingState((prev) => updateProfile(prev, { profilePicturePreview: fileUrl }));
      // Save to backend immediately
      await fetch('/api/student/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePictureUrl: fileUrl }),
      }).catch(() => {});
    } else if (type === 'faydaId') {
      setField('faydaIdName', file.name);
      await fetch('/api/student/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faydaIdUrl: fileUrl }),
      }).catch(() => {});
    } else {
      setField('transcriptName', file.name);
      await fetch('/api/student/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptUrl: fileUrl }),
      }).catch(() => {});
    }
  };

  const handleRemove = (type: 'profilePic' | 'faydaId' | 'transcript') => () => {
    if (type === 'profilePic') { setProfilePic(emptyUpload()); setField('profilePictureName', ''); setField('profilePicturePreview', ''); }
    else if (type === 'faydaId') { setFaydaId(emptyUpload()); setField('faydaIdName', ''); }
    else { setTranscript(emptyUpload()); setField('transcriptName', ''); }
  };

  // ── Step-level auto-save to backend ─────────────────────────────────────────
  const autoSaveStep = async (step: number): Promise<void> => {
    const p = onboardingState.profile;
    const stepPayload: Record<string, unknown> = {};

    if (step === 1) {
      Object.assign(stepPayload, {
        nationality: p.nationality || undefined,
        dob:         p.dob         || undefined,
        gender:      p.gender      || undefined,
        region:      p.region      || undefined,
        city:        p.city        || undefined,
        address:     p.address     || undefined,
      });
    } else if (step === 2) {
      Object.assign(stepPayload, {
        program:       p.program       || undefined,
        academicYear:  p.academicYear  || undefined,
        semester:      p.semester      || undefined,
        matricResult:  p.matricResult  || undefined,
        ministryResult:p.ministryResult|| undefined,
      });
    } else if (step === 4) {
      Object.assign(stepPayload, {
        emergencyName:         p.emergencyName         || undefined,
        emergencyRelationship: p.emergencyRelationship || undefined,
        emergencyPhone:        p.emergencyPhone        || undefined,
        emergencyNotes:        p.emergencyNotes        || undefined,
      });
    }

    // Remove undefined so they are not sent
    const clean = Object.fromEntries(Object.entries(stepPayload).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) return;

    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clean),
      });
      if (res.ok) {
        const data = await res.json();
        setOnboardingState((prev) => ({ ...prev, profileCompletionPct: data.profileCompletion ?? prev.profileCompletionPct }));
      }
    } catch { /* best-effort */ }
  };

  const validateStep = (): boolean => {
    const errs: typeof errors = {};
    if (wizardStep === 1) {
      if (!profile.nationality) errs.nationality = 'Required.';
      if (!profile.dob)         errs.dob         = 'Required.';
      if (!profile.gender)      errs.gender      = 'Select a gender.';
      if (!profile.city)        errs.city        = 'Required.';
      if (!profile.address)     errs.address     = 'Required.';
    }
    if (wizardStep === 2) {
      if (!profile.program)      errs.program      = 'Select a program.';
      if (!profile.academicYear) errs.academicYear = 'Select an academic year.';
    }
    if (wizardStep === 4) {
      if (!profile.emergencyName)         errs.emergencyName         = 'Required.';
      if (!profile.emergencyRelationship) errs.emergencyRelationship = 'Required.';
      if (!profile.emergencyPhone)        errs.emergencyPhone        = 'Required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    await autoSaveStep(wizardStep);
    if (wizardStep < 5) setWizardStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (wizardStep > 1) setWizardStep((s) => s - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    setSaveError('');

    try {
      const p = onboardingState.profile;
      const payload = {
        nationality:          p.nationality          || undefined,
        dob:                  p.dob                  || undefined,
        gender:               p.gender               || undefined,
        region:               p.region               || undefined,
        city:                 p.city                 || undefined,
        address:              p.address              || undefined,
        program:              p.program              || undefined,
        academicYear:         p.academicYear         || undefined,
        semester:             p.semester             || undefined,
        matricResult:         p.matricResult         || undefined,
        ministryResult:       p.ministryResult       || undefined,
        profilePictureUrl:    p.profilePicturePreview || undefined,
        emergencyName:        p.emergencyName         || undefined,
        emergencyRelationship:p.emergencyRelationship || undefined,
        emergencyPhone:       p.emergencyPhone        || undefined,
        emergencyNotes:       p.emergencyNotes        || undefined,
        submit: true,
      };

      const res = await fetch('/api/student/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 422) {
        // Missing required fields — show error and stop
        const missing: string[] = data.missingFields ?? [];
        setSaveError(`Please complete: ${missing.join(', ')}.`);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setSaveError(data.error ?? 'Submission failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success — update local state
      const completed = completeOnboarding(onboardingState);
      setOnboardingState({ ...completed, profileCompletionPct: 100 });
      setShowSuccess(true);
    } catch {
      setSaveError('Could not reach the server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completion = onboardingState.profileCompletionPct;

  if (showSuccess) {
    return (
      <OnboardingBackground>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl p-8 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-modal)', border: '1px solid var(--accent-gold-border)', backdropFilter: 'blur(24px)' }}>
            <SuccessScreen appNumber={onboardingState.applicationNumber}
              onContinue={() => router.push('/dashboard/student')} />
          </div>
        </div>
      </OnboardingBackground>
    );
  }

  return (
    <OnboardingBackground>
      <div className="min-h-screen flex flex-col lg:flex-row">

        {/* ── Mobile top bar (visible only below lg) ── */}
        <div
          className="lg:hidden flex items-center justify-between px-5 py-3.5 border-b sticky top-0 z-30"
          style={{ backgroundColor: 'var(--bg-header)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(20px)' }}
        >
          {/* Back to portal */}
          <button
            type="button"
            onClick={() => router.push('/welcome')}
            className="flex items-center gap-2 text-xs font-semibold font-sans transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Portal</span>
          </button>

          {/* Mobile progress pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
                  animate={{ width: `${(wizardStep / 5) * 100}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--brand-gold)' }}>
                {wizardStep}/5
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* ── Mobile context accordion (visible only below lg) ── */}
        <MobileContextAccordion wizardStep={wizardStep} />

        {/* ── Left sidebar — full context panel (desktop only) ── */}
        <div className="hidden lg:flex lg:w-80 xl:w-96 shrink-0 lg:min-h-screen flex-col p-8 border-r"
          style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(20px)' }}>
          {/* Brand + theme */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden border-2" style={{ borderColor: 'var(--accent-gold-border)' }}>
                <img src="/logo2.jpg" alt="Harmony" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-serif text-base font-bold block leading-none" style={{ color: 'var(--text-primary)' }}>Harmony</span>
                <span className="text-[9px] font-mono uppercase tracking-widest block mt-0.5" style={{ color: 'var(--brand-gold)' }}>College</span>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* Circular progress — compact */}
          <div className="flex items-center gap-4 mb-6 p-3 rounded-xl shrink-0"
            style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
            <div className="relative shrink-0">
              <CircularProgress value={completion} size={56} strokeWidth={5} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--brand-gold)' }}>{completion}%</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>
                {completion < 40 ? "Let's get started!" : completion < 80 ? "You're doing great!" : "Almost done!"}
              </p>
              <p className="text-[10px] font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Step {wizardStep} of 5 — {WIZARD_STEPS[wizardStep - 1].label}
              </p>
            </div>
          </div>

          {/* Step navigator — compact */}
          <nav className="flex gap-1.5 mb-6 shrink-0" aria-label="Wizard steps">
            {WIZARD_STEPS.map((step) => {
              const isDone = wizardStep > step.id;
              const isActive = wizardStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => { if (isDone) { setWizardStep(step.id); setErrors({}); } }}
                  disabled={!isDone && !isActive}
                  title={step.label}
                  className="flex-1 h-1.5 rounded-full transition-all"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--brand-gold)'
                      : isDone
                      ? 'rgba(233,195,73,0.4)'
                      : 'var(--border-default)',
                    cursor: isDone ? 'pointer' : 'default',
                  }}
                  aria-label={`Step ${step.id}: ${step.label}${isDone ? ' (completed)' : isActive ? ' (current)' : ''}`}
                />
              );
            })}
          </nav>

          {/* Rich college context — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <OnboardingContextPanel
              wizardStep={wizardStep}
              completion={completion}
              applicationNumber={onboardingState.applicationNumber}
            />
          </div>

          {/* Back to portal link */}
          <button
            type="button"
            onClick={() => router.push('/welcome')}
            className="flex items-center gap-2 mt-4 pt-4 text-xs font-sans font-medium transition-colors group"
            style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-faint)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="group-hover:underline">Back to Welcome Portal</span>
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col p-5 lg:p-10 xl:p-14">
          <div className="w-full max-w-2xl mx-auto flex flex-col">
            {/* Step header */}
            <div className="mb-6 lg:mb-8">
              <OnboardingProgress steps={WIZARD_STEPS} currentStep={wizardStep} />
              <div className="mt-5 lg:mt-6">
                <p className="lg:hidden text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--brand-gold)' }}>
                  Step {wizardStep} of 5
                </p>
                <h1 className="font-serif text-xl lg:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {WIZARD_STEPS[wizardStep - 1].label}
                </h1>
                <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
                  {MOTIVATIONAL[wizardStep]}
                </p>
              </div>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={wizardStep}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
                className="w-full"
              >
                {wizardStep === 1 && <StepPersonal profile={profile} errors={errors} onChange={setField} />}
                {wizardStep === 2 && <StepAcademic profile={profile} errors={errors} onChange={setField} />}
                {wizardStep === 3 && (
                  <StepDocuments profilePic={profilePic} faydaId={faydaId} transcript={transcript}
                    onProfilePic={handleFileChange('profilePic')} onFaydaId={handleFileChange('faydaId')}
                    onTranscript={handleFileChange('transcript')}
                    onRemoveProfilePic={handleRemove('profilePic')} onRemoveFaydaId={handleRemove('faydaId')}
                    onRemoveTranscript={handleRemove('transcript')} />
                )}
                {wizardStep === 4 && <StepEmergency profile={profile} errors={errors} onChange={setField} />}
                {wizardStep === 5 && (
                  <StepReview state={onboardingState} profilePic={profilePic}
                    onEdit={(step) => { setWizardStep(step); setErrors({}); }} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="space-y-3 mt-8 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              {/* Save error message */}
              {saveError && (
                <div className="p-3 rounded-xl text-xs font-sans text-center"
                  style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger)' }}>
                  {saveError}
                </div>
              )}
              <div className="flex items-center justify-between">
                <Button variant="secondary" size="md"
                  onClick={handlePrev} disabled={wizardStep === 1}
                  icon={<ArrowLeft className="w-4 h-4" />}>
                  Back
                </Button>
                {wizardStep < 5 ? (
                  <Button variant="gold" size="md" onClick={handleNext}
                    icon={<ArrowRight className="w-4 h-4" />}>
                    Continue
                  </Button>
                ) : (
                  <Button variant="gold" size="lg" onClick={handleSubmit} disabled={isSubmitting}
                    icon={isSubmitting
                      ? <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />
                    }>
                    {isSubmitting ? 'Submitting…' : 'Submit Application'}
                  </Button>
                )}
              </div>
              {/* Save progress & return to portal */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => router.push('/welcome')}
                  className="flex items-center gap-1.5 text-xs font-sans transition-colors group"
                  style={{ color: 'var(--text-faint)' }}
                >
                  <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
                  <span className="group-hover:underline">Save progress &amp; return to portal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OnboardingBackground>
  );
}
