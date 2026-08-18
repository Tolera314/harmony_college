'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, ArrowLeft, ArrowRight, RefreshCw, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Stage = 'request' | 'otp' | 'reset' | 'success';

const RESEND_COOLDOWN = 60;
const OTP_LENGTH     = 6;

// ─────────────────────────────────────────────────────────────────────────────
// Shared styled card wrapper (matches signin/verify-email design)
// ─────────────────────────────────────────────────────────────────────────────
function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #0F0F10 0%, #151517 50%, #1a1a1d 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-[#D4AF37]/5 rounded-full blur-[100px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{
          backgroundColor: 'rgba(15,15,16,0.85)',
          border:          '1px solid var(--accent-gold-border)',
          backdropFilter:  'blur(24px)',
        }}
      >
        {/* Logo */}
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared field component
// ─────────────────────────────────────────────────────────────────────────────
function Field({
  id, label, type = 'text', value, onChange, error, icon: Icon, suffix, autoComplete,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; error?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  suffix?: React.ReactNode; autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="relative group">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: error ? 'var(--status-danger)' : 'var(--text-faint)' }}>
          <Icon className="w-4 h-4" />
        </span>
        <input
          id={id} type={type} value={value} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          className="w-full py-3 pl-10 pr-10 rounded-xl border text-sm font-sans focus:outline-none transition-all"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor:     error ? 'var(--status-danger)' : 'var(--border-default)',
            color:           'var(--text-primary)',
          }}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="text-[11px]" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Password strength indicator (reused pattern)
// ─────────────────────────────────────────────────────────────────────────────
function PasswordHints({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters',    ok: password.length >= 8 },
    { label: 'One uppercase letter',      ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter',      ok: /[a-z]/.test(password) },
    { label: 'One number',                ok: /[0-9]/.test(password) },
    { label: 'One special character',     ok: /[^A-Za-z0-9]/.test(password) },
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
// Stage: Request
// ─────────────────────────────────────────────────────────────────────────────
function StageRequest({ onSent }: { onSent: (identifier: string, userId: string) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      // Phase 7 C1: backend returns userId + otp:true for phone-only OTP users
      if (data.otp && data.userId) {
        onSent(identifier.trim(), data.userId);
      } else {
        onSent(identifier.trim(), '');
      }
    } catch {
      // On network failure, still show success to prevent enumeration
      onSent(identifier.trim(), '');
    }
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4" role="status" aria-live="polite">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
          <Mail className="w-7 h-7" style={{ color: 'var(--brand-gold)' }} />
        </div>
        <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Check your inbox</h2>
        <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          If an account matches the information provided, you will receive instructions to reset your password.
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          Didn't receive anything? Check your spam folder or{' '}
          <button type="button" className="underline" style={{ color: 'var(--brand-gold)' }} onClick={() => setSubmitted(false)}>
            try again
          </button>.
        </p>
        <Link href="/signin" className="flex items-center justify-center gap-1.5 text-xs font-sans"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft className="w-3.5 h-3.5" />Back to Sign In
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Forgot your password?</h2>
        <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
          Enter the email or phone number associated with your account.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field id="identifier" label="Email or Phone Number" value={identifier}
          onChange={setIdentifier} icon={Mail} autoComplete="username" />
        <motion.button
          type="submit" disabled={loading || !identifier.trim()}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><span>Send Recovery Instructions</span><ArrowRight className="w-4 h-4" /></>
          }
        </motion.button>
      </form>
      <div className="text-center">
        <Link href="/signin" className="flex items-center justify-center gap-1.5 text-xs font-sans"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft className="w-3.5 h-3.5" />Back to Sign In
        </Link>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage: OTP (phone-only users) — Phase 7 C1 fix
// Shows 6-digit input + new password fields together.
// On submit: calls POST /api/auth/forgot-password/phone-otp { userId, token, password, confirmPassword }
// userId comes from a lookup by phone identifier after the request is sent.
// ─────────────────────────────────────────────────────────────────────────────
function StageOtp({
  userId, contactValue,
  onVerified,
}: { userId: string; contactValue: string; onVerified: (token: string) => void }) {
  const [digits,      setDigits]      = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [countdown,   setCountdown]   = useState(RESEND_COOLDOWN);
  const [canResend,   setCanResend]   = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => { setTimeout(() => inputRefs.current[0]?.focus(), 300); }, []);

  const handleChange = useCallback((idx: number, val: string) => {
    setError('');
    if (val.length === OTP_LENGTH && /^\d+$/.test(val)) {
      setDigits(val.split('')); inputRefs.current[OTP_LENGTH - 1]?.focus(); return;
    }
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[idx] = d; setDigits(next);
    if (d && idx < OTP_LENGTH - 1) setTimeout(() => inputRefs.current[idx + 1]?.focus(), 0);
  }, [digits]);

  const handleKeyDown = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits]; next[idx - 1] = ''; setDigits(next);
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft'  && idx > 0)           inputRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < OTP_LENGTH-1) inputRefs.current[idx + 1]?.focus();
  }, [digits]);

  const verify = useCallback(async () => {
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) { setError('Please enter all 6 digits.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/auth/reset-password/validate?userId=${userId}&token=${code}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'MAX_ATTEMPTS') { setMaxAttempts(true); setError('Too many attempts. Please request a new code.'); }
        else setError(data.message ?? 'Incorrect code. Please try again.');
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        onVerified(code);
      }
    } catch { setError('Could not reach the server. Please check your connection.'); }
    finally   { setLoading(false); }
  }, [digits, userId, onVerified]);

  useEffect(() => {
    if (digits.every((d) => d !== '') && !loading && !maxAttempts) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const masked = contactValue.replace(/(\+?\d{3})\d+(\d{3})$/, '$1•••$2');

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
          <Phone className="w-7 h-7" style={{ color: 'var(--brand-gold)' }} />
        </div>
        <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Enter verification code</h2>
        <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
          We sent a 6-digit code to <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{masked}</span>
        </p>
      </div>

      <div className="flex justify-center gap-2" role="group" aria-label="Reset code">
        {digits.map((d, i) => (
          <input key={i} ref={(el) => { inputRefs.current[i] = el; }}
            type="text" inputMode="numeric" maxLength={6} value={d}
            disabled={maxAttempts}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            aria-label={`Digit ${i + 1}`}
            className="w-11 h-14 text-center text-xl font-bold font-mono rounded-xl border-2 transition-all focus:outline-none disabled:opacity-40"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor:     error ? 'var(--status-danger)' : d ? 'var(--brand-gold)' : 'var(--border-default)',
              color:           d ? 'var(--brand-gold)' : 'var(--text-primary)',
            }}
          />
        ))}
      </div>

      {error && <p role="alert" className="text-center text-xs" style={{ color: 'var(--status-danger)' }}>{error}</p>}

      {!maxAttempts && (
        <motion.button type="button" onClick={verify} disabled={loading || digits.some((d) => !d)}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
        </motion.button>
      )}

      <div className="flex justify-between items-center text-xs font-sans">
        <button type="button" disabled={!canResend}
          onClick={() => { setCanResend(false); setCountdown(RESEND_COOLDOWN); setDigits(Array(OTP_LENGTH).fill('')); setError(''); setMaxAttempts(false); }}
          className="flex items-center gap-1.5 disabled:opacity-40"
          style={{ color: canResend ? 'var(--brand-gold)' : 'var(--text-faint)' }}>
          <RefreshCw className="w-3.5 h-3.5" />
          {canResend ? 'Resend code' : `Resend in ${countdown}s`}
        </button>
        <Link href="/forgot-password" className="underline" style={{ color: 'var(--text-muted)' }}>
          Try a different method
        </Link>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage: Reset (new password form)
// ─────────────────────────────────────────────────────────────────────────────
function StageReset({ userId, token, onSuccess }: { userId: string; token: string; onSuccess: () => void }) {
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showCon,   setShowCon]   = useState(false);
  const [errors,    setErrors]    = useState<{ password?: string; confirm?: string; general?: string }>({});
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (password !== confirm) errs.confirm = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setErrors({});
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, token, password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
          setErrors({ password: data.details.password?.[0], confirm: data.details.confirmPassword?.[0], general: data.details.general?.[0] });
        } else {
          setErrors({ general: data.error ?? 'Reset failed. Please try again.' });
        }
      } else {
        onSuccess();
      }
    } catch { setErrors({ general: 'Could not reach the server.' }); }
    finally   { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create a new password</h2>
        <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>Your new password must meet the security requirements.</p>
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
            value={password} onChange={setPassword} error={errors.password} icon={Lock}
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
          value={confirm} onChange={setConfirm} error={errors.confirm} icon={Lock}
          autoComplete="new-password"
          suffix={
            <button type="button" onClick={() => setShowCon((p) => !p)} className="p-1"
              aria-label={showCon ? 'Hide password' : 'Show password'}
              style={{ color: 'var(--text-muted)' }}>
              {showCon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <motion.button type="submit" disabled={loading}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Reset Password</span><ArrowRight className="w-4 h-4" /></>}
        </motion.button>
      </form>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage: Success
// ─────────────────────────────────────────────────────────────────────────────
function StageSuccess() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
      <motion.div
        initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
        style={{ background: 'var(--status-success-bg)', border: '2px solid var(--status-success-border)' }}>
        <ShieldCheck className="w-10 h-10" style={{ color: 'var(--status-success)' }} />
      </motion.div>
      <div>
        <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Password Updated</h2>
        <p className="text-sm font-sans mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Your Harmony College password has been changed successfully.
          For your security, you have been signed out of all previous sessions.
        </p>
      </div>
      <Link href="/signin"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
        style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}>
        Sign In
      </Link>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page (wraps everything, driven by searchParams for OTP pre-fill)
// ─────────────────────────────────────────────────────────────────────────────
function ForgotPasswordInner() {
  const searchParams = useSearchParams();
  const [stage,        setStage]        = useState<Stage>('request');
  const [identifier,   setIdentifier]   = useState('');
  const [userId,       setUserId]        = useState(searchParams.get('userId') ?? '');
  const [resetToken,   setResetToken]   = useState('');

  const handleSent = (id: string, resolvedUserId: string) => {
    setIdentifier(id);
    // Phase 7 C1: backend returns userId for phone-only OTP users
    if (resolvedUserId) {
      setUserId(resolvedUserId);
      setStage('otp');
    }
    // Email users: stay on request stage (shows "check your inbox" message)
  };

  const handleOtpVerified = (token: string) => {
    setResetToken(token);
    setStage('reset');
  };

  return (
    <AuthCard>
      <AnimatePresence mode="wait">
        {stage === 'request' && (
          <motion.div key="request" exit={{ opacity: 0, x: -20 }}>
            <StageRequest onSent={handleSent} />
          </motion.div>
        )}
        {stage === 'otp' && (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <StageOtp userId={userId} contactValue={identifier} onVerified={handleOtpVerified} />
          </motion.div>
        )}
        {stage === 'reset' && (
          <motion.div key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <StageReset userId={userId} token={resetToken} onSuccess={() => setStage('success')} />
          </motion.div>
        )}
        {stage === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <StageSuccess />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F10' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D4AF37' }} />
      </div>
    }>
      <ForgotPasswordInner />
    </Suspense>
  );
}
