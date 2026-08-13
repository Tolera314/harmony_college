'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ShieldCheck, ShieldAlert, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Inner component — reads search params (must be inside Suspense)
// ─────────────────────────────────────────────────────────────────────────────

type State = 'loading' | 'success' | 'already_verified' | 'expired' | 'invalid' | 'error';

function VerifyEmailInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [state, setState]   = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const userId = searchParams.get('userId');
    const token  = searchParams.get('token');

    if (!userId || !token) {
      setState('invalid');
      setMessage('This verification link is missing required parameters. Please request a new verification email.');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const res = await fetch('/api/auth/verify/email', {
          method:      'POST',
          headers:     { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, token }),
        });
        const data = await res.json();

        if (cancelled) return;

        if (res.ok) {
          setState('success');
          setMessage('Your email has been verified. Redirecting you now…');
          // Auth cookies are set — route based on profileCompleted
          setTimeout(() => {
            const user = data.user as { profileCompleted?: boolean } | undefined;
            router.push(user?.profileCompleted ? '/dashboard/student' : '/welcome');
          }, 2000);
          return;
        }

        if (data.code === 'ALREADY_VERIFIED') {
          setState('already_verified');
          setMessage('This email address has already been verified. You can sign in now.');
          return;
        }
        if (data.code === 'CODE_EXPIRED') {
          setState('expired');
          setMessage('This verification link has expired. Please sign in to request a new one.');
          return;
        }
        setState('invalid');
        setMessage(data.error ?? 'This verification link is invalid or has already been used.');
      } catch {
        if (!cancelled) {
          setState('error');
          setMessage('Could not reach the server. Please check your connection and try again.');
        }
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [searchParams, router]);

  // ── Icon and accent by state ──────────────────────────────────────────────
  const config: Record<State, { icon: React.ReactNode; color: string; heading: string }> = {
    loading: {
      icon:    <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--brand-gold)' }} />,
      color:   'var(--brand-gold)',
      heading: 'Verifying your email…',
    },
    success: {
      icon:    <ShieldCheck className="w-10 h-10" style={{ color: 'var(--status-success)' }} />,
      color:   'var(--status-success)',
      heading: 'Email Verified!',
    },
    already_verified: {
      icon:    <ShieldCheck className="w-10 h-10" style={{ color: 'var(--status-success)' }} />,
      color:   'var(--status-success)',
      heading: 'Already Verified',
    },
    expired: {
      icon:    <ShieldAlert className="w-10 h-10" style={{ color: 'var(--status-warning, #f59e0b)' }} />,
      color:   'var(--status-warning, #f59e0b)',
      heading: 'Link Expired',
    },
    invalid: {
      icon:    <Mail className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />,
      color:   'var(--text-muted)',
      heading: 'Invalid Link',
    },
    error: {
      icon:    <ShieldAlert className="w-10 h-10" style={{ color: 'var(--status-danger)' }} />,
      color:   'var(--status-danger)',
      heading: 'Something went wrong',
    },
  };

  const { icon, color, heading } = config[state];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0F0F10 0%, #151517 50%, #1a1a1d 100%)' }}
    >
      {/* Gold glow decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-[#D4AF37]/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md rounded-2xl p-10 shadow-2xl text-center"
        style={{
          backgroundColor: 'rgba(15,15,16,0.85)',
          border:          '1px solid var(--accent-gold-border)',
          backdropFilter:  'blur(24px)',
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent-gold-subtle)', border: '1px solid var(--accent-gold-border)' }}
          >
            {icon}
          </div>
        </div>

        <h1
          className="font-serif text-2xl font-bold mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          {heading}
        </h1>

        <p className="text-sm font-sans leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
          {message}
        </p>

        {/* Actions depending on state */}
        {state === 'success' && (
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-default)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'linear' }}
            />
          </div>
        )}

        {(state === 'already_verified' || state === 'expired' || state === 'invalid' || state === 'error') && (
          <Link
            href="/signin"
            className="inline-block px-6 py-3 rounded-xl font-bold text-sm transition-all"
            style={{
              background:  'linear-gradient(135deg, #B49020, #D4AF37)',
              color:       '#0F0F10',
              boxShadow:   '0 0 20px rgba(212,175,55,0.3)',
            }}
          >
            Go to Sign In
          </Link>
        )}

        {/* Harmony College wordmark */}
        <p className="mt-8 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
          Harmony College · Secure Verification
        </p>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page — wrap in Suspense (required for useSearchParams in Next.js App Router)
// ─────────────────────────────────────────────────────────────────────────────

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F10' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D4AF37' }} />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
