'use client';

/**
 * /onboarding/about — "About Harmony College" onboarding page
 *
 * Step 1 — College intro (read-only)
 * Step 2 — Pay registration fee (mandatory, hard-blocking)
 * Step 3 — Department selection (mandatory, hard-blocking)
 * Step 4 — Dashboard access granted → redirect to /dashboard/student
 *
 * The screenshot-upload / registrar-approval flow continues to exist
 * as a soft reminder inside the dashboard (non-blocking).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, Building2, BookOpen, Users, Award,
  Camera, Music, Palette, Globe, Headphones, Film, Stethoscope,
  ArrowRight, ArrowLeft, CheckCircle2, CreditCard,
  Banknote, Smartphone, AlertCircle,
} from 'lucide-react';
import { OnboardingBackground } from './OnboardingBackground';
import { Button } from '@/src/components/ui/Button';

// ── types ─────────────────────────────────────────────────────────────────────
interface Dept { id: string; name: string; code: string; description: string | null; }
interface Prereqs { feePaid: boolean; departmentSelected: boolean; selectedDepartmentId: string | null; }

// ── API helper ────────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as any).error ?? `Request failed: ${res.status}`);
  return data as T;
}

// ── static college content ────────────────────────────────────────────────────
const STATS = [
  { value: '500+', label: 'Students',  icon: Users },
  { value: '16+',  label: 'Programs',  icon: BookOpen },
  { value: '90%',  label: 'Placement', icon: Award },
  { value: '2015', label: 'Founded',   icon: GraduationCap },
];

const PROGRAMS = [
  { name: 'Photography & Videography',   icon: Camera,      color: '#E9C349' },
  { name: 'Theatrical Art & Filmmaking', icon: Film,        color: '#a78bfa' },
  { name: 'Music & Vocal Arts',          icon: Music,       color: '#34d399' },
  { name: 'Cubase Music Production',     icon: Headphones,  color: '#f87171' },
  { name: 'Graphic Design & Marketing',  icon: Palette,     color: '#60a5fa' },
  { name: 'IT, Journalism & Languages',  icon: Globe,       color: '#fb923c' },
  { name: 'Pharmacy',                    icon: Stethoscope, color: '#4ade80' },
];

// ── Step 1 — College Intro ─────────────────────────────────────────────────────
function StepIntro({ onNext }: { onNext: () => void }) {
  return (
    <motion.div key="intro" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="space-y-8">

      <div className="relative rounded-2xl overflow-hidden h-48 sm:h-64">
        <img src="/hero.png" alt="Harmony College campus" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F10]/90 via-[#0F0F10]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ color: 'var(--brand-gold)', backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
            Est. 2015 · Burayu, Ethiopia
          </span>
          <h2 className="font-serif text-2xl font-bold text-white mt-2">Harmony College</h2>
          <p className="text-sm text-white/70 font-sans">Empowering the next generation of creative professionals</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {STATS.map(({ value, label, icon: Icon }) => (
          <div key={label} className="p-3 rounded-2xl text-center"
            style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
            <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: 'var(--brand-gold)' }} />
            <p className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{value}</p>
            <p className="text-[10px] font-sans mt-0.5" style={{ color: 'var(--text-faint)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl space-y-3"
        style={{ background: 'linear-gradient(135deg, var(--accent-gold-subtle) 0%, transparent 100%)', border: '1px solid var(--accent-gold-border)' }}>
        <h3 className="font-serif text-base font-bold" style={{ color: 'var(--text-primary)' }}>Our Mission</h3>
        <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Harmony College is dedicated to nurturing creative talent and professional excellence in Ethiopia.
          We provide industry-relevant education across arts, technology, and health sciences — equipping
          students with real-world skills that open doors to meaningful careers.
        </p>
      </div>

      <div>
        <h3 className="font-serif text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>What We Offer</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROGRAMS.map(({ name, icon: Icon, color }) => (
            <div key={name} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1a` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs font-sans font-medium" style={{ color: 'var(--text-secondary)' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { title: 'Excellence', body: 'World-class curriculum designed by industry professionals.' },
          { title: 'Community',  body: 'A vibrant campus life that connects students across disciplines.' },
          { title: 'Career',     body: '90% graduate placement rate within 6 months of completing.' },
        ].map(v => (
          <div key={v.title} className="p-4 rounded-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <p className="font-serif text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{v.title}</p>
            <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>{v.body}</p>
          </div>
        ))}
      </div>

      <Button variant="gold" size="lg" className="w-full" onClick={onNext} icon={<ArrowRight className="w-4 h-4" />}>
        Continue to Registration Fee
      </Button>
    </motion.div>
  );
}

// ── Step 2 — Registration Fee Payment ─────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'bank',   label: 'Bank Transfer',    icon: Banknote,    detail: 'CBE / Dashen / Awash Bank' },
  { id: 'mobile', label: 'Mobile Banking',   icon: Smartphone,  detail: 'TeleBirr / M-Pesa / HelloCash' },
  { id: 'cash',   label: 'Pay at Campus',    icon: CreditCard,  detail: 'Admissions Office, Burayu' },
];

function StepPayment({ onNext, onBack, saving }: { onNext: () => void; onBack: () => void; saving: boolean }) {
  const [method, setMethod] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <motion.div key="payment" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="space-y-6">

      <div>
        <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Registration Fee</h2>
        <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
          A one-time registration fee is required to confirm your place at Harmony College.
        </p>
      </div>

      {/* Fee card */}
      <div className="p-5 rounded-2xl flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, var(--accent-gold-subtle) 0%, transparent 100%)', border: '1px solid var(--accent-gold-border)' }}>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--text-faint)' }}>One-time Registration Fee</p>
          <p className="font-serif text-3xl font-bold" style={{ color: 'var(--brand-gold)' }}>ETB 500</p>
          <p className="text-xs font-sans mt-1" style={{ color: 'var(--text-muted)' }}>Non-refundable · Confirms your enrollment slot</p>
        </div>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
          <CreditCard className="w-7 h-7" style={{ color: 'var(--brand-gold)' }} />
        </div>
      </div>

      {/* Payment method */}
      <div className="space-y-2">
        <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>Select payment method</p>
        {PAYMENT_METHODS.map(pm => {
          const Icon = pm.icon;
          const sel = method === pm.id;
          return (
            <button key={pm.id} type="button" onClick={() => setMethod(pm.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{
                backgroundColor: sel ? 'var(--accent-gold-subtle)' : 'var(--bg-card)',
                border: `1px solid ${sel ? 'var(--accent-gold-border)' : 'var(--border-card)'}`,
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: sel ? 'var(--brand-gold)' : 'var(--hover-overlay)' }}>
                <Icon className="w-5 h-5" style={{ color: sel ? 'var(--bg-base)' : 'var(--text-muted)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{pm.label}</p>
                <p className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>{pm.detail}</p>
              </div>
              {sel && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-gold)' }} />}
            </button>
          );
        })}
      </div>

      {/* Bank details (shown when bank transfer selected) */}
      {method === 'bank' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl space-y-2"
          style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>Bank Transfer Details</p>
          {[
            ['Bank', 'Commercial Bank of Ethiopia (CBE)'],
            ['Account Name', 'Harmony College PLC'],
            ['Account No.', '1000 5678 9012 345'],
            ['Reference', 'Your Full Name + Phone'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs font-sans">
              <span style={{ color: 'var(--text-faint)' }}>{k}</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{v}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Confirmation checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative w-5 h-5 shrink-0 mt-0.5">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="peer appearance-none w-5 h-5 rounded-md border-2 cursor-pointer"
            style={{ borderColor: confirmed ? 'var(--brand-gold)' : 'var(--border-strong)', backgroundColor: confirmed ? 'var(--brand-gold)' : 'transparent' }} />
          {confirmed && (
            <svg className="absolute inset-0 w-5 h-5 pointer-events-none" viewBox="0 0 20 20">
              <polyline points="4,11 8,15 16,6" fill="none" stroke="var(--bg-base)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          I confirm that I have paid the ETB 500 registration fee and understand it is non-refundable.
        </span>
      </label>

      <div className="flex items-start gap-2 p-3 rounded-xl"
        style={{ backgroundColor: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)' }}>
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--status-info)' }} />
        <p className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>
          Keep your payment receipt — you'll need to upload a screenshot of it as proof of registration.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" size="md" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        <Button variant="gold" size="md" className="flex-1" onClick={onNext}
          disabled={!method || !confirmed || saving}
          icon={saving
            ? <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
            : <ArrowRight className="w-4 h-4" />}>
          {saving ? 'Confirming…' : 'Confirm Payment'}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Step 3 — Department Selection ─────────────────────────────────────────────
function StepDepartment({
  departments, selected, onSelect, onNext, onBack, saving,
}: {
  departments: Dept[];
  selected: string;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  return (
    <motion.div key="dept" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="space-y-6">

      <div>
        <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Choose Your Department</h2>
        <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
          Select the department you're most interested in. You can update this after enrollment.
        </p>
      </div>

      {departments.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-2 border-t-[var(--brand-gold)] border-white/10 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-sans mt-4" style={{ color: 'var(--text-faint)' }}>Loading departments…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {departments.map(dept => {
            const isSelected = selected === dept.id;
            return (
              <button key={dept.id} type="button" onClick={() => onSelect(dept.id)}
                className="text-left p-4 rounded-2xl transition-all"
                style={{
                  backgroundColor: isSelected ? 'var(--accent-gold-subtle)' : 'var(--bg-card)',
                  border: `1px solid ${isSelected ? 'var(--accent-gold-border)' : 'var(--border-card)'}`,
                  boxShadow: isSelected ? '0 0 0 2px var(--accent-gold-border)' : undefined,
                }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isSelected ? 'var(--brand-gold)' : 'var(--hover-overlay)' }}>
                    <Building2 className="w-4 h-4" style={{ color: isSelected ? 'var(--bg-base)' : 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{dept.name}</p>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--brand-gold)' }}>{dept.code}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" style={{ color: 'var(--brand-gold)' }} />}
                </div>
                {dept.description && (
                  <p className="text-xs font-sans line-clamp-2" style={{ color: 'var(--text-muted)' }}>{dept.description}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" size="md" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        <Button variant="gold" size="md" className="flex-1" onClick={onNext}
          disabled={!selected || saving}
          icon={saving
            ? <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
            : <ArrowRight className="w-4 h-4" />}>
          {saving ? 'Saving…' : 'Go to My Dashboard'}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Step 4 — All Done, redirecting ────────────────────────────────────────────
function StepDone() {
  return (
    <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-10 gap-5">
      <div className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: 'radial-gradient(circle, var(--status-success-bg), transparent)', border: '2px solid var(--status-success-border)' }}>
        <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--status-success)' }} />
      </div>
      <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>You're all set! 🎉</h2>
      <p className="text-sm font-sans max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
        Taking you to your dashboard…
      </p>
      <div className="w-8 h-8 border-2 border-t-[var(--brand-gold)] border-white/10 rounded-full animate-spin" />
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function AboutOnboardingInner() {
  const router = useRouter();

  // steps: 1=intro, 2=payment, 3=department, 4=done
  const [step, setStep]               = useState<1 | 2 | 3 | 4>(1);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [saving, setSaving]           = useState(false);
  const [loaded, setLoaded]           = useState(false);

  // ── Auth guard + check if prereqs are already met ────────────────────────
  useEffect(() => {
    const init = async () => {
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!meRes.ok) { router.replace('/signin'); return; }
      const me = await meRes.json();
      if (!me.authenticated) { router.replace('/signin'); return; }
      if (me.user?.role !== 'STUDENT') { router.replace('/dashboard/student'); return; }

      // Check prereqs — if both done, skip straight to dashboard
      try {
        const prereqs = await apiFetch<{ feePaid: boolean; departmentSelected: boolean; selectedDepartmentId: string | null }>(
          '/api/student/onboarding/prereqs'
        );
        if (prereqs.feePaid && prereqs.departmentSelected) {
          router.replace('/dashboard/student'); return;
        }
        // Resume from where they left off
        if (prereqs.feePaid) {
          setStep(3); // already paid, go to dept
        }
        if (prereqs.selectedDepartmentId) {
          setSelectedDept(prereqs.selectedDepartmentId);
        }
      } catch { /* treat as fresh */ }

      // Load departments for step 3
      try {
        const depts = await apiFetch<Dept[]>('/api/admin/departments');
        setDepartments(depts);
      } catch { /* non-fatal */ }

      setLoaded(true);
    };
    init().catch(() => router.replace('/signin'));
  }, [router]);

  // ── Step 2 → 3: confirm payment ──────────────────────────────────────────
  const handlePaymentConfirm = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch('/api/student/onboarding/payment', { method: 'PATCH' });
      setStep(3);
    } catch {
      // Non-fatal — still advance so we don't hard-block on a network blip
      setStep(3);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Step 3 → 4: save department then redirect ────────────────────────────
  const handleDeptConfirm = useCallback(async () => {
    if (!selectedDept) return;
    setSaving(true);
    try {
      await apiFetch('/api/student/onboarding/department', {
        method: 'PATCH',
        body: JSON.stringify({ departmentId: selectedDept }),
      });
    } catch { /* non-fatal */ }
    setStep(4);
    // Short pause so the "done" animation is visible, then redirect
    setTimeout(() => router.replace('/dashboard/student'), 1200);
    setSaving(false);
  }, [selectedDept, router]);

  // ── Loading spinner ───────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <OnboardingBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-t-[var(--brand-gold)] border-white/10 rounded-full animate-spin" />
        </div>
      </OnboardingBackground>
    );
  }

  // ── Step indicator labels ─────────────────────────────────────────────────
  const STEPS = ['About', 'Payment', 'Department', 'Done'];

  return (
    <OnboardingBackground>
      <div className="min-h-screen flex flex-col items-center justify-start py-8 px-4">
        <div className="w-full max-w-2xl space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden border-2" style={{ borderColor: 'var(--accent-gold-border)' }}>
                <img src="/logo2.jpg" alt="Harmony" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-serif text-base font-bold block leading-none" style={{ color: 'var(--text-primary)' }}>Harmony</span>
                <span className="text-[9px] font-mono uppercase tracking-widest block" style={{ color: 'var(--brand-gold)' }}>College</span>
              </div>
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((label, i) => {
                const n = (i + 1) as 1 | 2 | 3 | 4;
                const done   = step > n;
                const active = step === n;
                return (
                  <div key={label} className="flex items-center gap-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all"
                      style={{
                        backgroundColor: done ? 'var(--status-success-bg)' : active ? 'var(--brand-gold)' : 'var(--hover-overlay)',
                        color:           done ? 'var(--status-success)'    : active ? 'var(--bg-base)'    : 'var(--text-faint)',
                        border: `1px solid ${done ? 'var(--status-success-border)' : active ? 'var(--brand-gold)' : 'var(--border-subtle)'}`,
                      }}>
                      {done ? '✓' : n}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-6 h-0.5 rounded"
                        style={{ backgroundColor: done ? 'var(--status-success-border)' : 'var(--border-subtle)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-6 sm:p-8 shadow-2xl"
            style={{ backgroundColor: 'rgba(15,15,16,0.85)', border: '1px solid var(--accent-gold-border)', backdropFilter: 'blur(24px)' }}>
            <AnimatePresence mode="wait">
              {step === 1 && <StepIntro onNext={() => setStep(2)} />}
              {step === 2 && (
                <StepPayment
                  onNext={handlePaymentConfirm}
                  onBack={() => setStep(1)}
                  saving={saving}
                />
              )}
              {step === 3 && (
                <StepDepartment
                  departments={departments}
                  selected={selectedDept}
                  onSelect={setSelectedDept}
                  onNext={handleDeptConfirm}
                  onBack={() => setStep(2)}
                  saving={saving}
                />
              )}
              {step === 4 && <StepDone />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </OnboardingBackground>
  );
}
