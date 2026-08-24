'use client';

/**
 * /onboarding/about
 *
 * Single page — payment method + receipt upload + department selection.
 * One submit button saves everything, then shows a success modal.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, CheckCircle2, CreditCard, Clock,
  Banknote, Smartphone, Upload, X, ClipboardCheck,
} from 'lucide-react';
import { OnboardingBackground } from './OnboardingBackground';
import { Button } from '@/src/components/ui/Button';

// ── types ─────────────────────────────────────────────────────────────────────
interface Dept { id: string; name: string; code: string; description: string | null; }

// ── API helpers ───────────────────────────────────────────────────────────────
let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(r => r.ok).catch(() => false).finally(() => { refreshing = null; });
  return refreshing;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = () => fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  let res = await doFetch();
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (!ok) throw new Error('SESSION_EXPIRED');
    res = await doFetch();
  }
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as any).error ?? `Request failed: ${res.status}`);
  return data as T;
}

async function uploadFile(formData: FormData): Promise<{ fileUrl: string }> {
  const doFetch = () => fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
  let res = await doFetch();
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (!ok) throw new Error('SESSION_EXPIRED');
    res = await doFetch();
  }
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error((data as any).error ?? 'Upload failed');
  return data as { fileUrl: string };
}

// ── Payment methods ───────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'telebirr', label: 'TeleBirr',      icon: Smartphone, detail: 'Pay via TeleBirr mobile wallet' },
  { id: 'cbe',      label: 'CBE Birr',       icon: Smartphone, detail: 'Commercial Bank of Ethiopia app' },
  { id: 'bank',     label: 'Bank Transfer',  icon: Banknote,   detail: 'CBE / Dashen / Awash Bank' },
  { id: 'cash',     label: 'Pay at Campus',  icon: CreditCard, detail: 'Admissions Office, Burayu' },
];

const BANK_DETAILS: Record<string, { label: string; value: string }[]> = {
  telebirr: [
    { label: 'Account Name', value: 'Harmony College PLC' },
    { label: 'TeleBirr No.', value: '0911 234 567' },
    { label: 'Amount',       value: 'ETB 500' },
    { label: 'Reference',    value: 'Your Full Name + Phone' },
  ],
  cbe: [
    { label: 'Account Name', value: 'Harmony College PLC' },
    { label: 'Account No.',  value: '1000 5678 9012 345' },
    { label: 'Bank',         value: 'Commercial Bank of Ethiopia' },
    { label: 'Reference',    value: 'Your Full Name + Phone' },
  ],
  bank: [
    { label: 'Bank',         value: 'CBE / Dashen / Awash' },
    { label: 'Account Name', value: 'Harmony College PLC' },
    { label: 'Account No.',  value: '1000 5678 9012 345' },
    { label: 'Reference',    value: 'Your Full Name + Phone' },
  ],
  cash: [
    { label: 'Location', value: 'Admissions Office, Burayu Campus' },
    { label: 'Hours',    value: 'Mon–Fri 8:00am–5:00pm' },
    { label: 'Amount',   value: 'ETB 500 (cash only)' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS MODAL — shown after all API calls succeed
// ─────────────────────────────────────────────────────────────────────────────
function SuccessModal({ onGoToDashboard, onViewDetails }: {
  onGoToDashboard: () => void;
  onViewDetails:   () => void;
}) {
  // Confetti particles
  const particles = useMemo(() =>
    Array.from({ length: 44 }, (_, i) => ({
      id:     i,
      x:      Math.random() * 100,
      vx:     (Math.random() - 0.5) * 28,
      vy:     -(48 + Math.random() * 40),
      size:   5 + Math.random() * 8,
      colour: ['#E9C349','#10B981','#3B82F6','#8B5CF6','#EC4899','#ffffff'][i % 6],
      delay:  Math.random() * 0.35,
      rotate: Math.random() * 720,
      dur:    1.4 + Math.random() * 0.8,
    })), []);

  const NEXT_STEPS = [
    'Your registration information will be reviewed.',
    'Your selected department / program will be verified.',
    'Your payment will be confirmed by the Finance Office.',
    'Once approved, your registration status will be updated.',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>

      {/* Confetti */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {particles.map(p => (
          <motion.div key={p.id}
            initial={{ left: `${p.x}vw`, top: '100vh', opacity: 1, rotate: 0, scale: 1 }}
            animate={{ left: `calc(${p.x}vw + ${p.vx}vw)`, top: `calc(100vh + ${p.vy}vh)`,
              opacity: [1, 1, 0], rotate: p.rotate, scale: [1, 1.2, 0.5] }}
            transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
            style={{ position: 'fixed', width: p.size, height: p.size * 0.5,
              backgroundColor: p.colour, borderRadius: p.size < 10 ? '50%' : 2 }}
          />
        ))}
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'rgba(15,15,16,0.97)', border: '1px solid var(--accent-gold-border)', backdropFilter: 'blur(24px)' }}
      >
        {/* Gold accent bar */}
        <div className="h-1 w-full"
          style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold), var(--brand-gold-dark))' }} />

        <div className="p-7 sm:p-8 space-y-6">

          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.15 }}
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent)', border: '2px solid var(--status-success-border)' }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--status-success)' }} />
          </motion.div>

          {/* Title & message */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="text-center space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Registration Successful! 🎉
            </h2>
            <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Congratulations! Your registration has been submitted successfully.
            </p>
            <p className="text-xs font-sans leading-relaxed pt-1" style={{ color: 'var(--text-faint)' }}>
              Your application is now under review. Please wait while the school administration
              and registrar verify your registration details and payment.
            </p>
          </motion.div>

          {/* Status badge */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
            className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs font-bold"
              style={{ backgroundColor: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.4)', color: '#EAB308' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#EAB308' }} />
              Status: Under Review
            </div>
          </motion.div>

          {/* What happens next */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
            className="rounded-2xl p-4 space-y-3"
            style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs font-semibold font-sans uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              What happens next?
            </p>
            {NEXT_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-mono font-bold"
                  style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)', color: 'var(--brand-gold)' }}>
                  {i + 1}
                </div>
                <p className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step}</p>
              </div>
            ))}
          </motion.div>

          {/* Buttons */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="flex flex-col sm:flex-row gap-3">
            <Button variant="gold" size="lg" className="flex-1" onClick={onGoToDashboard}
              icon={<ArrowRight className="w-4 h-4" />}>
              Go to Dashboard
            </Button>
            <button onClick={onViewDetails}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold font-sans border transition-all hover:bg-white/[0.04]"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
              View Registration Details
            </button>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function AboutOnboardingInner() {
  const router = useRouter();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [method, setMethod]     = useState('');
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState('');
  const [deptId, setDeptId]     = useState('');
  const [departments, setDepts] = useState<Dept[]>([]);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [loaded, setLoaded]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError]           = useState('');

  // ── Auth guard + load data ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      let me: { authenticated: boolean; user?: { role: string } };
      try {
        me = await apiFetch<{ authenticated: boolean; user?: { role: string } }>('/api/auth/me');
      } catch (e: any) {
        router.replace('/signin'); return;
      }
      if (!me.authenticated) { router.replace('/signin'); return; }
      if (me.user?.role !== 'STUDENT') { router.replace('/dashboard/student'); return; }

      // If both prereqs already met, skip straight to dashboard
      try {
        const prereqs = await apiFetch<{
          feePaid: boolean; departmentSelected: boolean; selectedDepartmentId: string | null;
        }>('/api/student/onboarding/prereqs');

        if (prereqs.feePaid && prereqs.departmentSelected) {
          router.replace('/dashboard/student'); return;
        }
        // Pre-fill department if already saved
        if (prereqs.selectedDepartmentId) setDeptId(prereqs.selectedDepartmentId);
      } catch { /* fresh start */ }

      // Load departments
      try {
        const depts = await apiFetch<Dept[]>('/api/student/onboarding/departments');
        setDepts(depts);
      } catch { /* non-fatal */ }

      setLoaded(true);
    };
    init().catch(() => router.replace('/signin'));
  }, [router]);

  // ── File handler ──────────────────────────────────────────────────────────
  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError('Only images (JPG/PNG) or PDF are accepted.'); return;
    }
    if (f.size > 10 * 1024 * 1024) { setError('File must be under 10 MB.'); return; }
    setError('');
    setFile(f);
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f));
    else setPreview('');
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!method)  { setError('Please choose how you paid.'); return; }
    if (!file)    { setError('Please upload a photo of your payment receipt.'); return; }
    if (!deptId)  { setError('Please select your department.'); return; }

    setSubmitting(true); setError('');
    try {
      // 1. Upload receipt
      const form = new FormData();
      form.append('file', file);
      const { fileUrl } = await uploadFile(form);

      // 2. Submit screenshot + mark fee paid + save department (parallel)
      await Promise.all([
        apiFetch('/api/student/onboarding/screenshot', {
          method: 'PATCH',
          body: JSON.stringify({ screenshotUrl: fileUrl }),
        }),
        apiFetch('/api/student/onboarding/payment', { method: 'PATCH' }),
        apiFetch('/api/student/onboarding/department', {
          method: 'PATCH',
          body: JSON.stringify({ departmentId: deptId }),
        }),
      ]);

      // All API calls succeeded — show the success modal
      setShowSuccess(true);
    } catch (e: any) {
      if (e.message === 'SESSION_EXPIRED') {
        setError('Your session expired. Please sign in again.'); return;
      }
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [method, file, deptId, router]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <OnboardingBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-t-[var(--brand-gold)] border-white/10 rounded-full animate-spin" />
        </div>
      </OnboardingBackground>
    );
  }

  const details = method ? BANK_DETAILS[method] : null;

  return (
    <OnboardingBackground>
      {/* Success modal — shown on top when submission succeeds */}
      <AnimatePresence>
        {showSuccess && (
          <SuccessModal
            onGoToDashboard={() => router.replace('/dashboard/student')}
            onViewDetails={() => {
              setShowSuccess(false);
              router.replace('/dashboard/student');
            }}
          />
        )}
      </AnimatePresence>
      <div className="min-h-screen flex flex-col items-center justify-start py-8 px-4 pb-16">
        <div className="w-full max-w-lg space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border-2 shrink-0"
              style={{ borderColor: 'var(--accent-gold-border)' }}>
              <img src="/logo2.jpg" alt="Harmony" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-serif text-base font-bold block leading-none" style={{ color: 'var(--text-primary)' }}>Harmony College</span>
              <span className="text-[10px] font-sans" style={{ color: 'var(--text-muted)' }}>Complete your registration to access your dashboard</span>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'rgba(15,15,16,0.88)', border: '1px solid var(--accent-gold-border)', backdropFilter: 'blur(24px)' }}>

            <AnimatePresence mode="wait">
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 sm:p-8 space-y-8">

                  {/* ── SECTION 1: Registration Fee ── */}
                  <section className="space-y-4">
                    {/* Title row */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold"
                        style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--bg-base)' }}>1</div>
                      <div>
                        <h2 className="font-serif text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                          Pay Registration Fee
                        </h2>
                        <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          One-time fee of <span className="font-bold" style={{ color: 'var(--brand-gold)' }}>ETB 500</span> — confirms your enrollment slot
                        </p>
                      </div>
                    </div>

                    {/* Payment methods */}
                    <div className="space-y-2">
                      {PAYMENT_METHODS.map(pm => {
                        const Icon = pm.icon;
                        const sel  = method === pm.id;
                        return (
                          <button key={pm.id} type="button" onClick={() => setMethod(pm.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                            style={{
                              backgroundColor: sel ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)',
                              border: `1px solid ${sel ? 'var(--brand-gold)' : 'var(--border-subtle)'}`,
                            }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: sel ? 'var(--brand-gold)' : 'var(--bg-card)' }}>
                              <Icon className="w-4 h-4" style={{ color: sel ? 'var(--bg-base)' : 'var(--text-muted)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{pm.label}</p>
                              <p className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>{pm.detail}</p>
                            </div>
                            <div className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                              style={{ borderColor: sel ? 'var(--brand-gold)' : 'var(--border-strong)', backgroundColor: sel ? 'var(--brand-gold)' : 'transparent' }}>
                              {sel && <span className="w-1.5 h-1.5 rounded-full block" style={{ backgroundColor: 'var(--bg-base)' }} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Payment details — inline under selected method */}
                    <AnimatePresence>
                      {details && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="p-3 rounded-xl space-y-1.5"
                            style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
                            <p className="text-[10px] font-semibold font-sans uppercase tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>
                              Send payment to
                            </p>
                            {details.map(({ label, value }) => (
                              <div key={label} className="flex items-center justify-between gap-4">
                                <span className="text-xs font-sans" style={{ color: 'var(--text-faint)' }}>{label}</span>
                                <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Upload receipt */}
                    <div
                      className="relative rounded-xl cursor-pointer transition-all"
                      style={{
                        border: `2px dashed ${file ? 'var(--status-success-border)' : 'var(--border-strong)'}`,
                        backgroundColor: 'var(--hover-overlay)',
                        minHeight: 100,
                      }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                      onClick={() => document.getElementById('receipt-input')?.click()}
                    >
                      <input id="receipt-input" type="file" accept="image/*,.pdf" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                      {preview ? (
                        <div className="relative">
                          <img src={preview} alt="Receipt" className="w-full max-h-40 object-contain rounded-xl" />
                          <button type="button" onClick={e => { e.stopPropagation(); setFile(null); setPreview(''); }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)' }}>
                            <X className="w-3 h-3" style={{ color: 'var(--status-danger)' }} />
                          </button>
                        </div>
                      ) : file ? (
                        <div className="flex items-center gap-3 px-4 py-4">
                          <CheckCircle2 className="w-6 h-6 shrink-0" style={{ color: 'var(--status-success)' }} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)} KB · Tap to change</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-5">
                          <Upload className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-gold)' }} />
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Upload payment receipt</p>
                            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                              Photo or PDF · Your name &amp; ETB 500 must be visible
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Divider */}
                  <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

                  {/* ── SECTION 2: Department ── */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold"
                        style={{ backgroundColor: 'var(--brand-gold)', color: 'var(--bg-base)' }}>2</div>
                      <div>
                        <h2 className="font-serif text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                          Choose Your Department
                        </h2>
                        <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Which department interests you? You can change this later.
                        </p>
                      </div>
                    </div>

                    {departments.length === 0 ? (
                      <div className="flex items-center gap-2 py-4">
                        <div className="w-5 h-5 border-2 border-t-[var(--brand-gold)] border-white/10 rounded-full animate-spin shrink-0" />
                        <p className="text-sm font-sans" style={{ color: 'var(--text-faint)' }}>Loading departments…</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {departments.map(dept => {
                          const sel = deptId === dept.id;
                          return (
                            <button key={dept.id} type="button" onClick={() => setDeptId(dept.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                              style={{
                                backgroundColor: sel ? 'var(--accent-gold-subtle)' : 'var(--hover-overlay)',
                                border: `1px solid ${sel ? 'var(--brand-gold)' : 'var(--border-subtle)'}`,
                              }}>
                              <div className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                                style={{ borderColor: sel ? 'var(--brand-gold)' : 'var(--border-strong)', backgroundColor: sel ? 'var(--brand-gold)' : 'transparent' }}>
                                {sel && <span className="w-1.5 h-1.5 rounded-full block" style={{ backgroundColor: 'var(--bg-base)' }} />}
                              </div>
                              <span className="flex-1 text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>
                                {dept.name}
                              </span>
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded-md shrink-0"
                                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--brand-gold)', border: '1px solid var(--accent-gold-border)' }}>
                                {dept.code}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Error */}
                  {error && (
                    <p className="text-xs font-sans px-1" style={{ color: 'var(--status-danger)' }}>{error}</p>
                  )}

                  {/* Submit */}
                  <Button
                    variant="gold"
                    size="lg"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={submitting}
                    icon={submitting
                      ? <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
                      : <ArrowRight className="w-4 h-4" />}
                  >
                    {submitting ? 'Submitting…' : 'Complete Registration'}
                  </Button>

                </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </OnboardingBackground>
  );
}
