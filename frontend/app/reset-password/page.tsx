'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, ShieldCheck, ShieldAlert, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

// ─── Shared helpers (mirroring forgot-password page patterns) ────────────────

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #0F0F10 0%, #151517 50%, #1a1a1d 100%)' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-[#D4AF37]/5 rounded-full blur-[100px]" />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: 'rgba(15,15,16,0.85)', border: '1px solid var(--accent-gold-border)', backdropFilter: 'blur(24px)' }}>
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2" style={{ borderColor: 'rgba(233,195,73,0.4)' }}>
            <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
          </div>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function Field({ id, label, type = 'text', value, onChange, error, suffix, autoComplete }: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; error?: string;
  suffix?: React.ReactNode; autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: error ? 'var(--status-danger)' : 'var(--text-faint)' }} />
        <input id={id} type={type} value={value} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          className="w-full py-3 pl-10 pr-10 rounded-xl border text-sm font-sans focus:outline-none transition-all"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? 'var(--status-danger)' : 'var(--border-default)', color: 'var(--text-primary)' }} />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="text-[11px]" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </div>
  );
}

function PasswordHints({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters',  ok: password.length >= 8 },
    { label: 'At least one letter',     ok: /[A-Za-z]/.test(password) },
    { label: 'At least one number',     ok: /[0-9]/.test(password) },
    { label: 'Letters and numbers only', ok: password.length > 0 && /^[A-Za-z0-9]+$/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      {checks.map(({ label, ok }) => (
        <li key={label} className="flex items-center gap-2 text-[11px] font-sans"
          style={{ color: ok ? 'var(--status-success)' : 'var(--text-faint)' }}>
          <span aria-hidden>{ok ? '✓' : '○'}</span>{label}
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
type PageState = 'validating' | 'form' | 'submitting' | 'success' | 'expired' | 'invalid';

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const userId  = searchParams.get('userId') ?? '';
  const token   = searchParams.get('token')  ?? '';

  const [pageState, setPageState] = useState<PageState>('validating');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showCon,   setShowCon]   = useState(false);
  const [errors,    setErrors]    = useState<{ password?: string; confirm?: string; general?: string }>({});

  // Validate token on mount
  useEffect(() => {
    if (!userId || !token) { setPageState('invalid'); return; }
    fetch(`/api/auth/reset-password/validate?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) setPageState('form');
        else setPageState(data.code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid');
      })
      .catch(() => setPageState('invalid'));
  }, [userId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (password !== confirm) errs.confirm = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setPageState('submitting'); setErrors({});
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, token, password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPageState('form');
        if (data.details) setErrors({ password: data.details.password?.[0], confirm: data.details.confirmPassword?.[0] });
        else if (data.code === 'TOKEN_EXPIRED') setPageState('expired');
        else setErrors({ general: data.error ?? 'Reset failed. Please try again.' });
      } else {
        setPageState('success');
      }
    } catch {
      setPageState('form');
      setErrors({ general: 'Could not reach the server. Please check your connection.' });
    }
  };

  // ── Validating ──
  if (pageState === 'validating') {
    return (
      <AuthCard>
        <div className="text-center space-y-4 py-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: 'var(--brand-gold)' }} />
          <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>Validating your reset link…</p>
        </div>
      </AuthCard>
    );
  }

  // ── Expired ──
  if (pageState === 'expired') {
    return (
      <AuthCard>
        <div className="text-center space-y-5">
          <ShieldAlert className="w-12 h-12 mx-auto" style={{ color: 'var(--status-warning, #f59e0b)' }} />
          <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Reset Link Expired</h2>
          <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            This password reset link has expired. Reset links are only valid for 15 minutes.
          </p>
          <Link href="/forgot-password"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}>
            Request a New Reset Link
          </Link>
          <div className="pt-1">
            <Link href="/signin" className="flex items-center justify-center gap-1.5 text-xs font-sans"
              style={{ color: 'var(--text-muted)' }}>
              <ArrowLeft className="w-3.5 h-3.5" />Back to Sign In
            </Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  // ── Invalid ──
  if (pageState === 'invalid') {
    return (
      <AuthCard>
        <div className="text-center space-y-5">
          <ShieldAlert className="w-12 h-12 mx-auto" style={{ color: 'var(--status-danger)' }} />
          <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Invalid Reset Link</h2>
          <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            This password reset link is invalid or has already been used.
          </p>
          <Link href="/forgot-password"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}>
            Request a New Reset Link
          </Link>
        </div>
      </AuthCard>
    );
  }

  // ── Success ──
  if (pageState === 'success') {
    return (
      <AuthCard>
        <div className="text-center space-y-5">
          <motion.div
            initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'var(--status-success-bg)', border: '2px solid var(--status-success-border)' }}>
            <ShieldCheck className="w-10 h-10" style={{ color: 'var(--status-success)' }} />
          </motion.div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Password Updated</h2>
          <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Your Harmony College password has been changed successfully.
            For your security, you have been signed out of all previous sessions.
          </p>
          <Link href="/signin"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}>
            Sign In
          </Link>
        </div>
      </AuthCard>
    );
  }

  // ── Form (and submitting) ──
  return (
    <AuthCard>
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create a new password</h2>
          <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
            Your new password must meet the security requirements.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errors.general && (
            <div className="p-3 rounded-xl text-xs text-center" role="alert"
              style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger)' }}>
              {errors.general}
            </div>
          )}
          <div>
            <Field id="password" label="New Password" type={showPw ? 'text' : 'password'}
              value={password} onChange={setPassword} error={errors.password}
              autoComplete="new-password"
              suffix={
                <button type="button" onClick={() => setShowPw((p) => !p)} className="p-1"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <PasswordHints password={password} />
          </div>
          <Field id="confirm" label="Confirm New Password" type={showCon ? 'text' : 'password'}
            value={confirm} onChange={setConfirm} error={errors.confirm}
            autoComplete="new-password"
            suffix={
              <button type="button" onClick={() => setShowCon((p) => !p)} className="p-1"
                aria-label={showCon ? 'Hide password' : 'Show password'}
                style={{ color: 'var(--text-muted)' }}>
                {showCon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <motion.button type="submit" disabled={pageState === 'submitting'}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}>
            {pageState === 'submitting'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><span>Reset Password</span><ArrowRight className="w-4 h-4" /></>}
          </motion.button>
        </form>
        <div className="text-center">
          <Link href="/signin" className="flex items-center justify-center gap-1.5 text-xs font-sans"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-3.5 h-3.5" />Back to Sign In
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F10' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D4AF37' }} />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}
