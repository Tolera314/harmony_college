'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, ShieldCheck, ShieldAlert, Loader2, ArrowLeft, LinkIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Shared card — same design as forgot-password and reset-password pages
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Inner page — reads token + email from query params
// ─────────────────────────────────────────────────────────────────────────────
function LinkAccountInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const pendingToken = searchParams.get('token')  ?? '';
  const email        = searchParams.get('email')  ?? '';

  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  // Missing params — show invalid state immediately
  if (!pendingToken || !email) {
    return (
      <AuthCard>
        <div className="text-center space-y-5">
          <ShieldAlert className="w-12 h-12 mx-auto" style={{ color: 'var(--status-danger)' }} />
          <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Invalid Link</h2>
          <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
            This account-linking request is invalid or has expired. Please try signing in again.
          </p>
          <Link href="/signin"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}>
            Back to Sign In
          </Link>
        </div>
      </AuthCard>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setError('Password is required.'); return; }
    setLoading(true); setError('');

    try {
      const res = await fetch('/api/auth/oauth/link-account', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pendingToken, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) {
          setError('This link request has expired. Please try signing in again.');
        } else if (res.status === 401) {
          setError('Incorrect password. Please try again.');
        } else {
          setError(data.error ?? 'Account linking failed. Please try again.');
        }
        return;
      }

      // Success — session cookies are now set by the backend
      setSuccess(true);
      const user = data.user as { role?: string; profileCompleted?: boolean };
      setTimeout(() => {
        if (user.role === 'STUDENT') {
          router.push(user.profileCompleted ? '/dashboard/student' : '/welcome');
        } else {
          const dashMap: Record<string, string> = {
            INSTRUCTOR: '/dashboard/instructor', DEPARTMENT_HEAD: '/dashboard/department-head',
            HR_OFFICER: '/dashboard/hr', FINANCE_OFFICER: '/dashboard/finance-officer',
            REGISTRAR: '/dashboard/registrar', ADMIN: '/dashboard/admin', SUPER_ADMIN: '/dashboard/admin',
          };
          router.push(dashMap[user.role ?? ''] ?? '/dashboard/student');
        }
      }, 1800);
    } catch {
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthCard>
        <div className="text-center space-y-5">
          <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'var(--status-success-bg)', border: '2px solid var(--status-success-border)' }}>
            <ShieldCheck className="w-10 h-10" style={{ color: 'var(--status-success)' }} />
          </motion.div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Account Linked</h2>
          <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
            Your account has been linked successfully. Signing you in now…
          </p>
        </div>
      </AuthCard>
    );
  }

  // Mask the email for display
  const maskedEmail = email.replace(/(.{2})(.+)(@.+)/, '$1•••$3');

  return (
    <AuthCard>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}>
            <LinkIcon className="w-7 h-7" style={{ color: 'var(--brand-gold)' }} />
          </div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Link Your Account
          </h2>
          <p className="text-sm font-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            An existing Harmony College account was found for{' '}
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{maskedEmail}</span>.
            Enter your password to link it with your sign-in provider.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="p-3 rounded-xl text-xs text-center" role="alert"
              style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger)' }}>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Harmony College Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-faint)' }} />
              <input id="password" type={showPw ? 'text' : 'password'} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password" aria-invalid={!!error}
                className="w-full py-3 pl-10 pr-10 rounded-xl border text-sm font-sans focus:outline-none transition-all"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? 'var(--status-danger)' : 'var(--border-default)', color: 'var(--text-primary)' }} />
              <button type="button" onClick={() => setShowPw((p) => !p)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--text-muted)' }}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <motion.button type="submit" disabled={loading || !password.trim()}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #B49020, #D4AF37)', color: '#0F0F10' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" role="status" aria-label="Linking account" /> : 'Link Account & Sign In'}
          </motion.button>
        </form>

        <div className="text-center">
          <Link href="/signin" className="flex items-center justify-center gap-1.5 text-xs font-sans"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-3.5 h-3.5" />Cancel — back to Sign In
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}

export default function LinkAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F10' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D4AF37' }} />
      </div>
    }>
      <LinkAccountInner />
    </Suspense>
  );
}
