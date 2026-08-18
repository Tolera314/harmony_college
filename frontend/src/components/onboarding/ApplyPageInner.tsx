'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Phone, Mail, Lock, Eye, EyeOff, ArrowRight,
  Shield, GraduationCap, Users, BookOpen, CheckCircle2
} from 'lucide-react';

import { OnboardingBackground } from './OnboardingBackground';
import { OTPVerification } from './OTPVerification';
import { PasswordStrength } from './PasswordStrength';
import { LinearProgress } from './OnboardingProgress';
import { Button } from '@/src/components/ui/Button';
import ThemeToggle from '@/src/components/ThemeToggle';
import {
  advanceToVerify,
  clearOnboardingState,
  loadOnboardingState,
  type AccountData,
} from '@/src/lib/onboardingStore';
import type { VerifiedUser } from './OTPVerification';

type Stage = 'create' | 'verify';

// ── Floating label input ──────────────────────────────────────────────────────
function FloatingInput({
  id, icon: Icon, label, type = 'text', value, onChange, error, hint,
  required, suffix,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <Icon
        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
        style={{
          color: error
            ? 'var(--status-danger)'
            : value
            ? 'var(--brand-gold)'
            : 'var(--text-muted)',
        }}
      />
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        placeholder={label}
        className="w-full py-3.5 pl-11 pr-4 rounded-xl border text-sm font-sans transition-all focus:outline-none peer placeholder-transparent"
        style={{
          backgroundColor: 'var(--bg-input)',
          borderColor: error ? 'var(--status-danger)' : value ? 'var(--brand-gold)' : 'var(--border-default)',
          color: 'var(--text-primary)',
          boxShadow: value && !error ? '0 0 0 3px var(--accent-gold-glow)' : undefined,
        }}
      />
      <label
        htmlFor={id}
        className="absolute left-11 -top-2 px-1 text-[11px] font-sans font-medium transition-all
          peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm
          peer-focus:-top-2 peer-focus:text-[11px]"
        style={{
          backgroundColor: 'var(--bg-base)',
          color: error ? 'var(--status-danger)' : value ? 'var(--brand-gold)' : 'var(--text-muted)',
        }}
      >
        {label}{required && <span aria-hidden="true" className="ml-0.5" style={{ color: 'var(--status-danger)' }}>*</span>}
      </label>
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 ml-1 text-[11px] font-sans" style={{ color: 'var(--status-danger)' }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 ml-1 text-[11px] font-sans" style={{ color: 'var(--text-faint)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────────────────
function Checkbox({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex items-center justify-center w-5 h-5 shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer appearance-none w-5 h-5 rounded-md border-2 transition-all cursor-pointer"
          style={{
            borderColor: checked ? 'var(--brand-gold)' : 'var(--border-strong)',
            backgroundColor: checked ? 'var(--brand-gold)' : 'transparent',
          }}
        />
        {checked && (
          <svg
            className="absolute w-3 h-3 pointer-events-none"
            viewBox="0 0 12 12"
            fill="none"
            stroke="var(--bg-base)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2 6 5 9 10 3" />
          </svg>
        )}
      </div>
      <span className="text-xs font-sans leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ApplyPageInner() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('create');
  const [account, setAccount] = useState<AccountData>({
    fullName: '', phone: '', email: '', password: '', userId: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AccountData | 'confirm' | 'terms', string>>>({});
  const [isCreating, setIsCreating] = useState(false);

  // No OTP/verify stage in apply anymore — verification lives in Settings.

  // Restore state if user navigated back or redirected from signin
  useEffect(() => {
    // Previously, ?userId=...&step=verify would show the OTP screen here.
    // Verification is now done from Settings, so we ignore that redirect
    // and let the signin page send PENDING_VERIFICATION users to /welcome instead.
    // Clean up any stale sessionStorage verify state.
    const saved = loadOnboardingState();
    if (saved.stage === 'verify-contact') {
      clearOnboardingState();
    }
  }, []);

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!account.fullName.trim()) errs.fullName = 'Full name is required.';
    else if (account.fullName.trim().split(' ').length < 2) errs.fullName = 'Please enter your full name.';

    if (!account.phone.trim()) errs.phone = 'Phone number is required.';
    else if (!/^(?:\+251|0)[79]\d{8}$/.test(account.phone)) errs.phone = 'Enter a valid Ethiopian phone (09XX… or +251…).';

    if (account.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
      errs.email = 'Enter a valid email address.';
    }

    if (!account.password) errs.password = 'Password is required.';
    else if (account.password.length < 8) errs.password = 'Minimum 8 characters.';

    if (!confirmPassword) errs.confirm = 'Please confirm your password.';
    else if (account.password !== confirmPassword) errs.confirm = 'Passwords do not match.';

    if (!acceptTerms) errs.terms = 'You must accept the terms to continue.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsCreating(true);

    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName:        account.fullName,
          phone:           account.phone  || undefined,
          email:           account.email  || undefined,
          password:        account.password,
          confirmPassword,
          acceptTerms:     true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Surface the first field error the backend returned, or the top-level error
        if (data.details) {
          const firstField = Object.keys(data.details)[0] as
            keyof (typeof errors);
          const firstMessage = data.details[firstField]?.[0] ?? 'Registration failed.';
          setErrors((prev) => ({ ...prev, [firstField]: firstMessage }));
        } else {
          setErrors((prev) => ({ ...prev, fullName: data.error ?? 'Registration failed.' }));
        }
        return;
      }

      // Success — backend now sets auth cookies on registration,
      // so we can redirect straight to /welcome.
      advanceToVerify({ ...account, userId: data.user.id });
      clearOnboardingState();
      router.push('/welcome');
    } catch {
      setErrors((prev) => ({
        ...prev,
        fullName: 'Could not reach the server. Please check your connection.',
      }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleVerified = (user: VerifiedUser) => {
    // Auth cookies are now set by the backend — clear the sessionStorage
    // onboarding state so the welcome page reads from the real session.
    clearOnboardingState();
    if (user.profileCompleted) {
      router.push('/dashboard/student');
    } else {
      router.push('/welcome');
    }
  };

  const handleChangeContact = () => {
    setStage('create');
  };

  const setField = (key: keyof AccountData) => (val: string) => {
    setAccount((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  return (
    <OnboardingBackground>
      <div className="min-h-screen w-full flex flex-col lg:flex-row">

        {/* ── Left panel — Brand Hero ──────────────────────────────────── */}
        <div className="relative lg:w-[45%] h-52 lg:h-screen shrink-0 overflow-hidden">
          <Image
            src="/hero.png"
            alt="Harmony College campus"
            fill
            priority
            sizes="45vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(15,15,16,0.92) 0%, rgba(15,15,16,0.5) 60%, transparent 100%)' }}
          />
          <div
            className="absolute inset-0 lg:hidden"
            style={{ background: 'linear-gradient(to top, rgba(15,15,16,1) 0%, transparent 60%)' }}
          />

          <div className="absolute inset-0 flex flex-col justify-between p-8 lg:p-12">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[var(--brand-gold)]/40">
                <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover" />
              </div>
              <div className="hidden lg:block">
                <span className="font-serif text-lg font-bold text-white leading-none block">Harmony</span>
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold block mt-0.5" style={{ color: 'var(--brand-gold)' }}>College</span>
              </div>
            </motion.div>

            {/* Hero copy */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="mt-auto lg:mt-0 lg:my-auto max-w-md"
            >
              <span
                className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
                style={{
                  color: 'var(--brand-gold)',
                  border: '1px solid var(--accent-gold-border)',
                  backgroundColor: 'var(--accent-gold-subtle)',
                }}
              >
                Student Admission
              </span>
              <h1 className="text-3xl lg:text-5xl font-serif font-semibold text-white leading-[1.1] mb-4">
                Your Future<br />Begins Here.
              </h1>
              <p className="text-sm lg:text-base font-sans leading-relaxed hidden lg:block" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Join hundreds of students building creative and professional careers at Harmony College.
              </p>
            </motion.div>

            {/* Stats — desktop only */}
            <div className="hidden lg:grid grid-cols-3 gap-3 pb-4">
              {[
                { value: '500+', label: 'Students', icon: Users },
                { value: '10+',  label: 'Programs', icon: BookOpen },
                { value: '90%',  label: 'Placement', icon: GraduationCap },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5 + idx * 0.1 }}
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <stat.icon className="absolute -right-1 -top-1 w-10 h-10 opacity-5" style={{ color: 'var(--brand-gold)' }} />
                  <div className="font-serif text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] font-sans uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel — Form ───────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 min-h-screen lg:min-h-0 relative"
          style={{ background: 'linear-gradient(135deg, var(--bg-base) 0%, #151517 50%, #1a1a1d 100%)' }}
        >
          {/* Theme toggle */}
          <div className="absolute top-4 right-4 lg:top-6 lg:right-6 z-20">
            <ThemeToggle />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-lg"
          >
            {/* Card */}
            <div
              className="rounded-2xl p-8 lg:p-10 shadow-2xl"
              style={{
                backgroundColor: 'rgba(15,15,16,0.8)',
                border: '1px solid var(--accent-gold-border)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* Stage header */}
              <div className="mb-7">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-mono font-bold uppercase tracking-widest"
                    style={{ color: 'var(--brand-gold)' }}
                  >
                    {stage === 'create' ? 'Step 1 of 1' : 'Step 2 of 2'}
                  </span>
                </div>
                <LinearProgress
                  value={stage === 'create' ? 1 : 2}
                  total={stage === 'create' ? 1 : 2}
                />
                <h2 className="font-serif text-2xl font-bold mt-5 mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {stage === 'create' ? 'Create Your Account' : 'Verify Your Contact'}
                </h2>
                <p className="text-sm font-sans" style={{ color: 'var(--text-muted)' }}>
                  {stage === 'create'
                    ? 'Takes less than 30 seconds. No academic details required yet.'
                    : 'Enter the verification code we just sent you.'}
                </p>
              </div>

              {/* ── Stage: Create Account ── */}
              <AnimatePresence mode="wait">
                {stage === 'create' && (
                  <motion.form
                    key="create"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleCreateAccount}
                    noValidate
                    className="space-y-4"
                  >
                    <FloatingInput
                      id="fullName"
                      icon={User}
                      label="Full Name"
                      value={account.fullName}
                      onChange={setField('fullName')}
                      error={errors.fullName}
                      hint="First and last name"
                      required
                    />

                    <FloatingInput
                      id="phone"
                      icon={Phone}
                      label="Phone Number"
                      type="tel"
                      value={account.phone}
                      onChange={setField('phone')}
                      error={errors.phone}
                      hint="09XX XXX XXXX or +251…"
                      required
                    />

                    <FloatingInput
                      id="email"
                      icon={Mail}
                      label="Email Address (Optional)"
                      type="email"
                      value={account.email}
                      onChange={setField('email')}
                      error={errors.email}
                    />

                    <div>
                      <FloatingInput
                        id="password"
                        icon={Lock}
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={account.password}
                        onChange={setField('password')}
                        error={errors.password}
                        required
                        suffix={
                          <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
                            className="p-1 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        }
                      />
                      <PasswordStrength password={account.password} />
                    </div>

                    <FloatingInput
                      id="confirmPassword"
                      icon={Lock}
                      label="Confirm Password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(v) => {
                        setConfirmPassword(v);
                        if (errors.confirm) setErrors((p) => { const n = { ...p }; delete n.confirm; return n; });
                      }}
                      error={errors.confirm}
                      required
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowConfirm((p) => !p)}
                          className="p-1 rounded-lg transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />

                    {/* Terms */}
                    <div className="pt-1">
                      <Checkbox
                        checked={acceptTerms}
                        onChange={(v) => {
                          setAcceptTerms(v);
                          if (errors.terms) setErrors((p) => { const n = { ...p }; delete n.terms; return n; });
                        }}
                        label={
                          <>
                            I agree to the{' '}
                            <a href="#" className="underline" style={{ color: 'var(--brand-gold)' }}>
                              Terms of Service
                            </a>{' '}
                            and{' '}
                            <a href="#" className="underline" style={{ color: 'var(--brand-gold)' }}>
                              Privacy Policy
                            </a>
                          </>
                        }
                      />
                      {errors.terms && (
                        <p className="mt-1.5 ml-8 text-[11px] font-sans" style={{ color: 'var(--status-danger)' }}>
                          {errors.terms}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="gold"
                      size="lg"
                      type="submit"
                      className="w-full mt-2"
                      disabled={isCreating}
                      icon={
                        isCreating
                          ? <span className="w-4 h-4 border-2 border-[var(--bg-base)]/30 border-t-[var(--bg-base)] rounded-full animate-spin" />
                          : <ArrowRight className="w-4 h-4" />
                      }
                    >
                      {isCreating ? 'Creating Account…' : 'Create Account'}
                    </Button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="h-[1px] flex-1 bg-white/10" />
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">Or Apply With</span>
                      <div className="h-[1px] flex-1 bg-white/10" />
                    </div>

                    {/* Social Auth Options */}
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <button
                        type="button"
                        onClick={() => { window.location.href = '/api/auth/oauth/google'; }}
                        title="Sign up with Google"
                        className="flex items-center justify-center py-2.5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer shadow-sm hover:border-[#D4AF37]/50"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => { window.location.href = '/api/auth/oauth/facebook'; }}
                        title="Sign up with Facebook"
                        className="flex items-center justify-center py-2.5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer shadow-sm hover:border-[#D4AF37]/50"
                      >
                        {/* Facebook Logo */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.532-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" fill="#1877F2"/>
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 justify-center pt-1">
                      <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-faint)' }} />
                      <span className="text-[10px] font-sans uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                        Protected with enterprise encryption
                      </span>
                    </div>
                  </motion.form>
                )}

                {/* ── Stage: Verify Contact ── */}
                {stage === 'verify' && (
                  <motion.div
                    key="verify"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                  <OTPVerification
                      userId={account.userId}
                      contactType={account.phone ? 'phone' : 'email'}
                      contactValue={account.phone || account.email}
                      onVerified={handleVerified}
                      onChangeContact={handleChangeContact}
                      onBack={handleChangeContact}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Already have account */}
              {stage === 'create' && (
                <p className="text-center text-xs font-sans mt-6 pt-5 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
                  Already have an account?{' '}
                  <Link href="/signin" className="font-semibold transition-colors" style={{ color: 'var(--brand-gold)' }}>
                    Sign In
                  </Link>
                </p>
              )}
            </div>

            {/* Feature pills */}
            {stage === 'create' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap justify-center gap-2 mt-5"
              >
                {[
                  'Free to apply',
                  'No documents required yet',
                  'Results in 2–5 days',
                  'Secure & encrypted',
                ].map((text) => (
                  <span
                    key={text}
                    className="flex items-center gap-1.5 text-[10px] font-sans px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--hover-overlay)', border: '1px solid var(--border-subtle)', color: 'var(--text-faint)' }}
                  >
                    <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: 'var(--brand-gold)' }} />
                    {text}
                  </span>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </OnboardingBackground>
  );
}
