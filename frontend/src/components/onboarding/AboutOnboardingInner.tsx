'use client';

/**
 * /onboarding/about
 *
 * Step 1 — College intro
 * Step 2 — Pay registration fee: select method → upload payment screenshot → confirm
 * Step 3 — Select department
 * Step 4 — Done (redirect to dashboard)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, Building2, BookOpen, Users, Award,
  Camera, Music, Palette, Globe, Headphones, Film, Stethoscope,
  ArrowRight, ArrowLeft, CheckCircle2, CreditCard,
  Banknote, Smartphone, AlertCircle, Upload, X,
} from 'lucide-react';
import { OnboardingBackground } from './OnboardingBackground';
import { Button } from '@/src/components/ui/Button';

// ── types ─────────────────────────────────────────────────────────────────────
interface Dept { id: string; name: string; code: string; description: string | null; }

// ── API helper with auto-refresh on 401 ───────────────────────────────────────
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

/** Upload a file (multipart/form-data) with auto token refresh on 401. */
async function uploadFile(formData: FormData): Promise<{ fileUrl: string }> {
  const doFetch = () => fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // No Content-Type header — browser sets it automatically with the boundary
  });
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

// ── Static college content ────────────────────────────────────────────────────
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

// ── Payment methods ───────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'telebirr', label: 'TeleBirr',        icon: Smartphone, detail: 'Pay via TeleBirr mobile wallet' },
  { id: 'cbe',      label: 'CBE Birr',         icon: Smartphone, detail: 'Commercial Bank of Ethiopia app' },
  { id: 'bank',     label: 'Bank Transfer',    icon: Banknote,   detail: 'CBE / Dashen / Awash Bank' },
  { id: 'cash',     label: 'Pay at Campus',    icon: CreditCard, detail: 'Admissions Office, Burayu' },
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
// STEP 1 — College Intro
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Pay + Upload Screenshot
// ─────────────────────────────────────────────────────────────────────────────
function StepPayment({
  onNext, onBack, saving,
}: {
  onNext: (screenshotUrl: string) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [method, setMethod]     = useState('');
  const [file, setFile]         = useState<File | null>(null);
  const [preview, setPreview]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');

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

  const handleSubmit = async () => {
    if (!method)  { setError('Please select a payment method.'); return; }
    if (!file)    { setError('Please upload a screenshot of your payment receipt.'); return; }
    setUploading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { fileUrl } = await uploadFile(form);
      onNext(fileUrl);
    } catch (e: any) {
      if (e.message === 'SESSION_EXPIRED') {
        setError('Your session expired. Please sign in again.');
        return;
      }
      setError(e.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const details = method ? BANK_DETAILS[method] : null;

  return (
    <motion.div key="payment" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="space-y-6">

      <div>
        <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Registration Fee</h2>
        <p className="text-sm font-sans mt-1" style={{ color: 'var(--text-muted)' }}>
          Pay the one-time ETB 500 registration fee, then upload your payment screenshot.
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

      {/* Payment method selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>
          1. Select payment method
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map(pm => {
            const Icon = pm.icon;
            const sel = method === pm.id;
            return (
              <button key={pm.id} type="button" onClick={() => setMethod(pm.id)}
                className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                style={{
                  backgroundColor: sel ? 'var(--accent-gold-subtle)' : 'var(--bg-card)',
                  border: `1px solid ${sel ? 'var(--accent-gold-border)' : 'var(--border-card)'}`,
                }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: sel ? 'var(--brand-gold)' : 'var(--hover-overlay)' }}>
                  <Icon className="w-4 h-4" style={{ color: sel ? 'var(--bg-base)' : 'var(--text-muted)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold font-sans truncate" style={{ color: 'var(--text-primary)' }}>{pm.label}</p>
                  <p className="text-[10px] font-sans truncate" style={{ color: 'var(--text-muted)' }}>{pm.detail}</p>
                </div>
                {sel && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-gold)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment details */}
      <AnimatePresence>
        {details && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="p-4 rounded-2xl space-y-2"
            style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs font-semibold font-sans mb-2" style={{ color: 'var(--text-secondary)' }}>Payment Details</p>
            {details.map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs font-sans">
                <span style={{ color: 'var(--text-faint)' }}>{label}</span>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screenshot upload */}
      <div className="space-y-2">
        <p className="text-xs font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>
          2. Upload payment screenshot
        </p>
        <div
          className="relative rounded-2xl transition-all cursor-pointer"
          style={{ border: '2px dashed var(--border-strong)', backgroundColor: 'var(--hover-overlay)', minHeight: 140 }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => document.getElementById('payment-file-input')?.click()}
        >
          <input id="payment-file-input" type="file" accept="image/*,.pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Receipt preview" className="w-full max-h-48 object-contain rounded-2xl" />
              <button type="button" onClick={e => { e.stopPropagation(); setFile(null); setPreview(''); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'var(--status-danger)' }} />
              </button>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--status-success)' }} />
              <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
              <p className="text-xs font-sans" style={{ color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)} KB · Click to change</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
                <Upload className="w-5 h-5" style={{ color: 'var(--brand-gold)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold font-sans" style={{ color: 'var(--text-primary)' }}>
                  Drag & drop or click to upload
                </p>
                <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--text-faint)' }}>JPG, PNG or PDF · Max 10 MB</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs font-sans" style={{ color: 'var(--status-danger)' }}>{error}</p>
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl"
        style={{ backgroundColor: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)' }}>
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--status-info)' }} />
        <p className="text-xs font-sans" style={{ color: 'var(--text-secondary)' }}>
          Make sure your name and the amount (ETB 500) are clearly visible in the screenshot.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" size="md" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        <Button variant="gold" size="md" className="flex-1" onClick={handleSubmit}
          disabled={!method || !file || uploading || saving}
          icon={uploading || saving
            ? <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
            : <ArrowRight className="w-4 h-4" />}>
          {uploading ? 'Uploading…' : saving ? 'Confirming…' : 'Confirm & Continue'}
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Department Selection
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Done
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function AboutOnboardingInner() {
  const router = useRouter();

  const [step, setStep]               = useState<1 | 2 | 3 | 4>(1);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [saving, setSaving]           = useState(false);
  const [loaded, setLoaded]           = useState(false);

  // Auth guard — also handles expired tokens via the apiFetch refresh logic
  useEffect(() => {
    const init = async () => {
      // Use apiFetch so 401 triggers a refresh automatically
      let me: { authenticated: boolean; user?: { role: string } };
      try {
        me = await apiFetch<{ authenticated: boolean; user?: { role: string } }>('/api/auth/me');
      } catch (e: any) {
        if (e.message === 'SESSION_EXPIRED') { router.replace('/signin'); return; }
        router.replace('/signin'); return;
      }

      if (!me.authenticated) { router.replace('/signin'); return; }
      if (me.user?.role !== 'STUDENT') { router.replace('/dashboard/student'); return; }

      // Check prereqs — resume from where they left off
      try {
        const prereqs = await apiFetch<{
          feePaid: boolean; departmentSelected: boolean; selectedDepartmentId: string | null;
        }>('/api/student/onboarding/prereqs');

        if (prereqs.feePaid && prereqs.departmentSelected) {
          router.replace('/dashboard/student'); return;
        }
        if (prereqs.feePaid) setStep(3);
        if (prereqs.selectedDepartmentId) setSelectedDept(prereqs.selectedDepartmentId);
      } catch { /* treat as fresh start */ }

      // Load departments
      try {
        const depts = await apiFetch<Dept[]>('/api/admin/departments');
        setDepartments(depts);
      } catch { /* non-fatal */ }

      setLoaded(true);
    };

    init().catch(() => router.replace('/signin'));
  }, [router]);

  // Step 2 → 3: upload screenshot + record payment
  const handlePaymentConfirm = useCallback(async (screenshotUrl: string) => {
    setSaving(true);
    try {
      // Submit screenshot to the existing screenshot endpoint
      await apiFetch('/api/student/onboarding/screenshot', {
        method: 'PATCH',
        body: JSON.stringify({ screenshotUrl }),
      });
      // Mark fee as paid
      await apiFetch('/api/student/onboarding/payment', { method: 'PATCH' });
      setStep(3);
    } catch {
      // Non-fatal — still advance
      setStep(3);
    } finally {
      setSaving(false);
    }
  }, []);

  // Step 3 → 4: save department then redirect
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
    setTimeout(() => router.replace('/dashboard/student'), 1200);
    setSaving(false);
  }, [selectedDept, router]);

  if (!loaded) {
    return (
      <OnboardingBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-t-[var(--brand-gold)] border-white/10 rounded-full animate-spin" />
        </div>
      </OnboardingBackground>
    );
  }

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
            <div className="flex items-center gap-1.5">
              {STEPS.map((label, i) => {
                const n = (i + 1) as 1 | 2 | 3 | 4;
                const done = step > n; const active = step === n;
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
