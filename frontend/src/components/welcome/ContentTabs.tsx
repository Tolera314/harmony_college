'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap, CheckCircle2, ArrowRight,
  MapPin, Mail, Phone as PhoneIcon, Clock,
  ChevronDown, ChevronUp,
  Calendar, Megaphone
} from 'lucide-react';import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { newsData } from '@/src/data/news';
import { schoolsData } from '@/src/data/schools';
import type { PortalTab } from './WelcomePortalLayout';
import type { OnboardingState } from '@/src/lib/onboardingStore';

// ── Shared section wrapper ────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 space-y-6 max-w-5xl">
      <div>
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Programs Tab ──────────────────────────────────────────────────────────────
export function ProgramsTab({ onNavigate }: { onNavigate: (t: PortalTab) => void }) {
  return (
    <Section title="Programs & Departments" subtitle="Explore all 16+ programs offered at Harmony College.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {schoolsData.map((school, idx) => (
          <motion.div key={school.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl transition-all"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
                <GraduationCap className="w-5 h-5" style={{ color: 'var(--brand-gold)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold font-serif" style={{ color: 'var(--text-primary)' }}>{school.name}</p>
                <p className="text-[10px] font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>Dean: {school.dean.split(',')[0]}</p>
              </div>
            </div>
            <p className="text-xs font-sans leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{school.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {school.degrees.map(d => <Badge key={d.name} variant="glass" className="text-[10px]">{d.duration} · {d.level}</Badge>)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--brand-gold)' }}>ETB {school.tuitionPerCredit.toLocaleString()} / credit</span>
              <Button variant="ghost" size="xs" onClick={() => onNavigate('admission')} icon={<ArrowRight className="w-3 h-3" />}>Apply</Button>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ── News Tab ─────────────────────────────────────────────────────────────────
export function NewsTab() {
  return (
    <Section title="Latest News" subtitle="Stay up to date with everything happening at Harmony College.">
      <div className="space-y-5">
        {newsData.map((article, idx) => (
          <motion.div key={article.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
            whileHover={{ y: -2 }}
            className="group flex flex-col sm:flex-row gap-4 rounded-2xl overflow-hidden transition-all"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="sm:w-48 h-40 sm:h-auto overflow-hidden shrink-0">
              <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={article.category === 'Events' ? 'info' : article.category === 'Campus' ? 'emerald' : 'amber'} className="text-[10px]">{article.category}</Badge>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{article.date}</span>
              </div>
              <h3 className="font-serif text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{article.title}</h3>
              <p className="text-xs font-sans leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{article.summary}</p>
              <p className="text-[10px] font-mono mt-2" style={{ color: 'var(--text-faint)' }}>By {article.author}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ── Announcements Tab ─────────────────────────────────────────────────────────
const ANNOUNCEMENTS = [
  { id: '1', title: 'Admission Open for 2026/2027 Academic Year', body: 'Applications for all programs are now open. Complete your profile to secure your spot before the deadline.', date: 'Jul 20, 2026', type: 'urgent' as const },
  { id: '2', title: 'Orientation Week Scheduled for September 2026', body: 'All new students are required to attend orientation week. Attendance will be confirmed after profile submission.', date: 'Jul 15, 2026', type: 'info' as const },
  { id: '3', title: 'Scholarship Applications Now Open', body: 'Merit-based scholarships are available for high-performing applicants. Apply as part of your admission profile.', date: 'Jul 8, 2026', type: 'info' as const },
  { id: '4', title: 'Campus Tour Available Every Saturday', body: 'Visit Harmony College in person. Tours run from 9AM–1PM at the Burayu campus. No booking required.', date: 'Jul 1, 2026', type: 'info' as const },
];

export function AnnouncementsTab() {
  return (
    <Section title="Announcements" subtitle="Official notices from the Harmony College admissions office.">
      <div className="space-y-4">
        {ANNOUNCEMENTS.map((item, idx) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-4 p-5 rounded-2xl"
            style={{
              backgroundColor: item.type === 'urgent' ? 'var(--accent-gold-subtle)' : 'var(--bg-card)',
              border: `1px solid ${item.type === 'urgent' ? 'var(--accent-gold-border)' : 'var(--border-card)'}`,
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.type === 'urgent' ? 'var(--brand-gold)' : 'var(--hover-overlay)' }}>
              <Megaphone className="w-4 h-4" style={{ color: item.type === 'urgent' ? 'var(--bg-base)' : 'var(--text-muted)' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                {item.type === 'urgent' && <Badge variant="gold" className="text-[10px]">Important</Badge>}
              </div>
              <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              <p className="text-[10px] font-mono mt-1.5" style={{ color: 'var(--text-faint)' }}>{item.date}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ── Events Tab ────────────────────────────────────────────────────────────────
const EVENTS = [
  { id: '1', title: 'Open Day — All Programs', date: 'Aug 3, 2026', time: '9:00 AM – 2:00 PM', location: 'Main Campus, Burayu', category: 'Admissions' },
  { id: '2', title: 'Photography Exhibition Opening', date: 'Aug 10, 2026', time: '3:00 PM – 7:00 PM', location: 'Burayu City Hall', category: 'Events' },
  { id: '3', title: 'Student Orientation Week', date: 'Sep 1–5, 2026', time: 'Full Day', location: 'Harmony College Campus', category: 'Academic' },
  { id: '4', title: 'Music Production Showcase', date: 'Sep 12, 2026', time: '5:00 PM – 9:00 PM', location: 'Recording Studio, Campus', category: 'Events' },
  { id: '5', title: 'Application Deadline — Semester I', date: 'Sep 20, 2026', time: '11:59 PM', location: 'Online Portal', category: 'Deadline' },
];

export function EventsTab() {
  return (
    <Section title="Events & Activities" subtitle="Important dates, campus events, and deadlines.">
      <div className="space-y-3">
        {EVENTS.map((event, idx) => (
          <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -1 }}
            className="flex items-center gap-4 p-4 rounded-2xl transition-all"
            style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${event.category === 'Deadline' ? 'var(--status-danger-border)' : 'var(--border-card)'}` }}>
            <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-center" style={{ backgroundColor: event.category === 'Deadline' ? 'var(--status-danger-bg)' : 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
              <Calendar className="w-4 h-4 mb-0.5" style={{ color: event.category === 'Deadline' ? 'var(--status-danger)' : 'var(--brand-gold)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                <Badge variant={event.category === 'Deadline' ? 'danger' : event.category === 'Academic' ? 'info' : 'glass'} className="text-[10px]">{event.category}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                <span>{event.date} · {event.time}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ── Gallery Tab ───────────────────────────────────────────────────────────────
const GALLERY_IMAGES = [
  { src: '/exhibition.png', caption: 'Photography Exhibition', category: 'Visual Arts' },
  { src: '/music.png',      caption: 'Music Production Studio', category: 'Music' },
  { src: '/research.png',   caption: 'Graduate Ceremony',       category: 'Campus' },
  { src: '/cafe.png',       caption: 'Student Commons',         category: 'Campus Life' },
  { src: '/athletics.png',  caption: 'Athletics Center',        category: 'Campus Life' },
  { src: '/Botanical.png',  caption: 'Research Conservatory',   category: 'Academic' },
];

export function GalleryTab() {
  return (
    <Section title="Campus Gallery" subtitle="A glimpse into life at Harmony College, Burayu.">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GALLERY_IMAGES.map((img, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.06 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden group" style={{ aspectRatio: '4/3' }}>
            <img src={img.src} alt={img.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-4 group-hover:translate-y-0 transition-transform">
              <p className="text-xs font-semibold text-white">{img.caption}</p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--brand-gold)' }}>{img.category}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

// ── Admission Guide Tab ───────────────────────────────────────────────────────
const ADMISSION_STEPS = [
  { step: 1, title: 'Create Account', desc: 'Register with your name, phone, and email. Takes less than 2 minutes.' },
  { step: 2, title: 'Verify Contact', desc: 'Confirm your phone number or email with a 6-digit OTP code.' },
  { step: 3, title: 'Complete Profile', desc: 'Fill in personal details, academic information, and upload documents.' },
  { step: 4, title: 'Admissions Review', desc: 'Our team reviews your application within 2–5 business days.' },
  { step: 5, title: 'Enrollment Confirmation', desc: 'Receive your acceptance, pay tuition, and enroll in your courses.' },
];

const REQUIREMENTS = [
  'High school completion certificate or equivalent',
  'Valid Ethiopian National ID (Fayda) or passport',
  'Passport-size profile photograph',
  'Academic transcript (Grade 9–12)',
  'Matric or Ministry exam result (if applicable)',
  'Emergency contact information',
];

const FAQS = [
  { q: 'How long does admission take?', a: 'Applications are reviewed within 2–5 business days. You will receive a decision by SMS or email.' },
  { q: 'What programs are available?', a: 'We offer 16+ programs across photography, music, design, IT, journalism, languages, and pharmacy.' },
  { q: 'Is there an application fee?', a: 'No — applying to Harmony College is completely free.' },
  { q: 'Can I apply for multiple programs?', a: 'Yes. After admission, you may transfer programs subject to availability.' },
  { q: 'What documents do I need?', a: 'A valid ID, school transcript, profile photo, and emergency contact details.' },
  { q: 'Are scholarships available?', a: 'Yes. Merit-based scholarships are available. Apply as part of your admission profile.' },
];

export function AdmissionTab({ onNavigate }: { onNavigate: (t: PortalTab) => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <Section title="Admission Guide" subtitle="Everything you need to know about joining Harmony College.">
      {/* Process */}
      <div>
        <h2 className="font-serif text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Application Process</h2>
        <div className="space-y-3">
          {ADMISSION_STEPS.map((item, idx) => (
            <motion.div key={item.step} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-4 p-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono text-sm font-black" style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--bg-base)' }}>{item.step}</div>
              <div>
                <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div>
        <h2 className="font-serif text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Requirements</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {REQUIREMENTS.map((req, idx) => (
            <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-gold)' }} />
              <span className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>{req}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div>
        <h2 className="font-serif text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold font-sans pr-4" style={{ color: 'var(--text-primary)' }}>{faq.q}</span>
                {openFaq === idx ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-gold)' }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-faint)' }} />}
              </button>
              {openFaq === idx && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-5 pb-4">
                  <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{faq.a}</p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
        <h3 className="font-serif text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Contact Admissions</h3>
        <div className="space-y-2 text-xs font-sans">
          {[
            { icon: MapPin, text: 'Sheger, Burayu, Ethiopia — near Burayu City Administration' },
            { icon: PhoneIcon, text: '+251 911 000 000 · Mon–Fri, 8:00 AM – 5:00 PM' },
            { icon: Mail, text: 'admissions@harmonycollege.edu.et' },
            { icon: Clock, text: 'Office Hours: Monday – Friday, 8:00 AM – 5:00 PM' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--brand-gold)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <Button variant="gold" size="lg" onClick={() => onNavigate('profile')} icon={<ArrowRight className="w-4 h-4" />}>
        Start Your Application
      </Button>
    </Section>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
export function SettingsTab({ state }: { state: OnboardingState }) {
  const [section, setSection] = React.useState<'profile' | 'verify' | 'appearance'>('profile');
  const [emailVerified, setEmailVerified]   = React.useState<boolean | null>(null);
  const [phoneVerified, setPhoneVerified]   = React.useState<boolean | null>(null);
  const [sending, setSending]               = React.useState(false);
  const [otpSent, setOtpSent]               = React.useState<'email' | 'phone' | null>(null);
  const [otp, setOtp]                       = React.useState('');
  const [verifying, setVerifying]           = React.useState(false);
  const [verifyMsg, setVerifyMsg]           = React.useState('');
  const [verifyError, setVerifyError]       = React.useState('');

  React.useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          setEmailVerified(d.user.emailVerified ?? false);
          setPhoneVerified(d.user.phoneVerified ?? false);
        }
      })
      .catch(() => {});
  }, []);

  const sendOtp = async (type: 'email' | 'phone') => {
    setSending(true); setVerifyMsg(''); setVerifyError(''); setOtp('');
    try {
      const res = await fetch('/api/auth/verify/resend', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.account.userId, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send code');
      setOtpSent(type);
      setVerifyMsg(`Verification code sent to your ${type}.`);
    } catch (e: any) { setVerifyError(e.message ?? 'Failed to send code'); }
    finally { setSending(false); }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) { setVerifyError('Enter the code.'); return; }
    setVerifying(true); setVerifyMsg(''); setVerifyError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.account.userId, type: otpSent, code: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Verification failed');
      setVerifyMsg('✓ Verified successfully!');
      if (otpSent === 'email') setEmailVerified(true);
      if (otpSent === 'phone') setPhoneVerified(true);
      setOtpSent(null); setOtp('');
    } catch (e: any) { setVerifyError(e.message ?? 'Verification failed'); }
    finally { setVerifying(false); }
  };

  // Profile step definitions (mirrors wizard steps)
  const STEPS = [
    { step: 1, label: 'Personal Information', fields: ['Nationality', 'Date of Birth', 'Gender', 'City', 'Address'],
      done: !!(state.profile.nationality && state.profile.dob && state.profile.gender && state.profile.city && state.profile.address) },
    { step: 2, label: 'Academic Information', fields: ['Program', 'Academic Year', 'Semester', 'Matric Result'],
      done: !!(state.profile.program && state.profile.academicYear) },
    { step: 3, label: 'Document Uploads', fields: ['Profile Picture', 'Fayda / National ID', 'Transcript'],
      done: !!(state.profile.profilePictureName && state.profile.faydaIdName) },
    { step: 4, label: 'Emergency Contact', fields: ['Contact Name', 'Relationship', 'Phone Number'],
      done: !!(state.profile.emergencyName && state.profile.emergencyPhone) },
    { step: 5, label: 'Review & Submit', fields: ['Review all sections', 'Submit application'],
      done: state.profileCompletionPct >= 100 },
  ];
  const completion = state.profileCompletionPct;
  const completedCount = STEPS.filter(s => s.done).length;

  const NAV = [
    { id: 'profile'    as const, label: 'Complete Profile' },
    { id: 'verify'     as const, label: 'Verify Contact' },
    { id: 'appearance' as const, label: 'Appearance' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>Manage your profile, verification, and preferences.</p>
      </div>

      {/* Section nav */}
      <div className="flex gap-1.5 mb-7 flex-wrap">
        {NAV.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)}
            className="px-4 py-2 rounded-xl font-sans text-xs font-semibold border transition-all"
            style={{
              backgroundColor: section === n.id ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)',
              borderColor:     section === n.id ? 'var(--accent-gold-border)' : 'var(--border-default)',
              color:           section === n.id ? 'var(--brand-gold)'         : 'var(--text-secondary)',
            }}>
            {n.label}
          </button>
        ))}
      </div>

      {/* ── SECTION: Complete Profile ── */}
      {section === 'profile' && (
        <div className="space-y-5">
          {/* Progress summary */}
          <div className="p-5 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(233,195,73,0.1) 0%, rgba(233,195,73,0.03) 100%)', border: '1px solid var(--accent-gold-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
                  {completion >= 100 ? 'Profile Complete 🎉' : 'Complete Your Profile'}
                </p>
                <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {completedCount} of {STEPS.length} sections done
                </p>
              </div>
              <span className="font-mono text-2xl font-black" style={{ color: 'var(--brand-gold)' }}>{completion}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${completion}%`, background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }} />
            </div>
            <p className="text-xs font-sans mt-2" style={{ color: 'var(--text-faint)' }}>
              Application No. <span className="font-mono" style={{ color: 'var(--brand-gold)' }}>{state.applicationNumber}</span>
            </p>
          </div>

          {/* Step cards — each deep-links directly into the wizard at that step */}
          <div className="space-y-2">
            {STEPS.map((s) => (
              <div key={s.step}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: s.done
                    ? '1px solid var(--status-success-border)'
                    : '1px solid var(--border-card)',
                }}>
                {/* Status dot */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: s.done ? 'var(--status-success-bg)' : 'var(--hover-overlay)',
                    border: `1px solid ${s.done ? 'var(--status-success-border)' : 'var(--border-default)'}`,
                  }}>
                  {s.done
                    ? <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--status-success)' }} />
                    : <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-faint)' }}>{s.step}</span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{s.label}</p>
                  <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'var(--text-faint)' }}>
                    {s.fields.join(' · ')}
                  </p>
                </div>

                {!s.done && (
                  <button
                    onClick={() => window.location.href = `/onboarding?step=${s.step}`}
                    className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-sans transition-all"
                    style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--bg-base)' }}>
                    {s.step === 5 ? 'Submit' : 'Fill In →'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Account info */}
          <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <h3 className="text-sm font-semibold font-sans mb-3" style={{ color: 'var(--text-primary)' }}>Account Information</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Full Name',       value: state.account.fullName || '—' },
                { label: 'Phone',           value: state.account.phone    || '—' },
                { label: 'Email',           value: state.account.email    || 'Not provided' },
                { label: 'Application No.', value: state.applicationNumber || '—' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span className="text-xs font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: Verify Contact ── */}
      {section === 'verify' && (
        <div className="space-y-4 max-w-lg">
          <div className="p-5 rounded-2xl space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div>
              <h3 className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>Verify Your Contact</h3>
              <p className="text-xs font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
                Verifying your phone or email secures your account and enables password recovery.
              </p>
            </div>

            {state.account.phone && (
              <div className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>Phone</p>
                  <p className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>{state.account.phone}</p>
                </div>
                {phoneVerified
                  ? <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--status-success)' }}>✓ Verified</span>
                  : <button onClick={() => sendOtp('phone')} disabled={sending || otpSent === 'phone'}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{ backgroundColor: 'var(--accent-gold-subtle)', color: 'var(--brand-gold)', border: '1px solid var(--accent-gold-border)', opacity: sending ? 0.6 : 1 }}>
                      {sending && otpSent === null ? 'Sending…' : 'Send Code'}
                    </button>
                }
              </div>
            )}

            {state.account.email && (
              <div className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>Email</p>
                  <p className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>{state.account.email}</p>
                </div>
                {emailVerified
                  ? <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--status-success)' }}>✓ Verified</span>
                  : <button onClick={() => sendOtp('email')} disabled={sending || otpSent === 'email'}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{ backgroundColor: 'var(--accent-gold-subtle)', color: 'var(--brand-gold)', border: '1px solid var(--accent-gold-border)', opacity: sending ? 0.6 : 1 }}>
                      {sending && otpSent === null ? 'Sending…' : 'Send Code'}
                    </button>
                }
              </div>
            )}

            {otpSent && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Enter the 6-digit code sent to your {otpSent}:
                </p>
                <div className="flex gap-2">
                  <input type="text" inputMode="numeric" maxLength={6} value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono text-center tracking-widest focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
                  <button onClick={verifyOtp} disabled={verifying || otp.length < 4}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--bg-base)', opacity: verifying ? 0.7 : 1 }}>
                    {verifying ? '…' : 'Verify'}
                  </button>
                </div>
              </div>
            )}

            {verifyMsg   && <p className="text-xs font-sans" style={{ color: 'var(--status-success)' }}>{verifyMsg}</p>}
            {verifyError && <p className="text-xs font-sans" style={{ color: 'var(--status-danger)' }}>{verifyError}</p>}
          </div>
        </div>
      )}

      {/* ── SECTION: Appearance ── */}
      {section === 'appearance' && (
        <div className="max-w-lg">
          <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <h3 className="text-sm font-semibold font-sans mb-2" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
            <p className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>Theme preference is managed by the toggle in the header.</p>
          </div>
        </div>
      )}
    </div>
  );
}
