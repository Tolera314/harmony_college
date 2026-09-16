'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  CheckCircle2, AlertCircle, Eye, EyeOff, Building2, User,
  Mail, ShieldAlert, ArrowRight, ShieldCheck, Lock
} from 'lucide-react';

interface InvitationValidation {
  isValid: boolean;
  reason?: string;
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
  departmentName?: string;
  departmentCode?: string;
  expiresAt?: string;
}

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  ADMIN: 'Administrator',
  REGISTRAR: 'Registrar Officer',
  FINANCE_OFFICER: 'Finance Officer',
  HR_OFFICER: 'HR Officer',
  DEPARTMENT_HEAD: 'Department Head',
  INSTRUCTOR: 'Faculty Instructor',
};

function ActivateAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invState, setInvState] = useState<InvitationValidation | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setInvState({ isValid: false, reason: 'INVALID_TOKEN' });
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(`/api/auth/invitations/validate?token=${encodeURIComponent(token!)}`);
        const data = await res.json();
        setInvState(data);
      } catch {
        setInvState({ isValid: false, reason: 'SERVER_ERROR' });
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMsg('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to activate your account.');
      }

      setSuccess(true);
      setRedirectUrl(data.redirectUrl ?? '/signin');

      setTimeout(() => {
        router.push(data.redirectUrl ?? '/signin');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message ?? 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4 font-sans">
        <div className="bg-[#141417] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 border-2 border-[#E9C349] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Verifying institutional activation token...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4 font-sans">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#141417] border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-white">Account Successfully Activated</h2>
            <p className="text-zinc-400 text-sm mt-2">Welcome to the Harmony College institutional platform. Your password has been saved securely.</p>
          </div>
          <button
            onClick={() => router.push(redirectUrl || '/signin')}
            className="w-full py-3 bg-[#E9C349] text-[#0F0F10] font-bold rounded-xl text-sm hover:bg-[#f0cf60] transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            Sign In to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  if (!invState?.isValid) {
    const reason = invState?.reason;

    let title = 'Invalid Activation Link';
    let description = 'This activation token is invalid, expired, or has already been used.';

    if (reason === 'EXPIRED') {
      title = 'Activation Link Expired';
      description = `The activation link for ${invState?.email ?? 'this account'} has expired (valid for 48 hours). Please contact the HR Office for a refreshed activation link.`;
    } else if (reason === 'REVOKED') {
      title = 'Activation Revoked';
      description = 'This account activation link was superseded or revoked. Please check with your administrator.';
    } else if (reason === 'ALREADY_ACCEPTED') {
      title = 'Account Already Activated';
      description = `The account for ${invState?.email ?? 'this user'} is already active. You can proceed directly to sign in with your credentials.`;
    }

    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4 font-sans">
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#141417] border border-rose-500/20 rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-white">{title}</h2>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">{description}</p>
          </div>
          <button
            onClick={() => router.push('/signin')}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold rounded-xl text-xs transition-colors"
          >
            Go to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  const roleText = ROLE_DISPLAY[invState.role ?? ''] ?? invState.role;

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col justify-center items-center p-4 font-sans text-white">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6">
        
        {/* Harmony College Branding Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-[#E9C349]/80 p-0.5 bg-black shadow-xl">
            <img src="/logo2.jpg" alt="Harmony College" className="w-full h-full object-cover rounded-full" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-white tracking-wide">Harmony College</h1>
            <p className="text-xs uppercase font-mono tracking-widest text-[#E9C349] font-semibold mt-0.5">
              Faculty &amp; Staff Account Activation
            </p>
          </div>
        </div>

        {/* Assigned Details Card */}
        <div className="bg-[#141417] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-3.5 pb-3.5 border-b border-white/10">
            <div className="w-11 h-11 rounded-xl bg-[#E9C349]/15 border border-[#E9C349]/30 flex items-center justify-center text-[#E9C349] font-bold text-lg font-serif shrink-0">
              {invState.fullName?.charAt(0) ?? 'H'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-white truncate">{invState.fullName}</p>
              <p className="text-zinc-400 text-xs font-mono truncate">{invState.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-zinc-500 text-[10px] uppercase font-mono block">System Role</span>
              <span className="text-[#E9C349] font-semibold mt-1 block truncate">{roleText}</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-zinc-500 text-[10px] uppercase font-mono block">Department</span>
              <span className="text-zinc-200 font-semibold mt-1 block truncate">{invState.departmentName}</span>
            </div>
          </div>
        </div>

        {/* Password Creation Card */}
        <form onSubmit={handleSubmit} className="bg-[#141417] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#E9C349]" /> Set Your Password
            </h2>
            <p className="text-[11px] text-zinc-400 mt-1">
              Create a secure password to complete your institutional onboarding.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Create Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters (letters & numbers)"
                className="w-full px-3.5 py-2.5 pr-10 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E9C349] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Confirm Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#E9C349] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#E9C349] text-[#0F0F10] font-bold rounded-xl text-xs hover:bg-[#f0cf60] transition-colors disabled:opacity-50 mt-2 shadow-lg"
          >
            {submitting ? 'Securing Credentials...' : 'Activate Account & Access Portal'}
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-500">
          &copy; {new Date().getFullYear()} Harmony College &bull; Official Account Security
        </p>
      </motion.div>
    </div>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center p-4 font-sans text-white">
        <p className="text-xs text-zinc-400">Loading activation interface...</p>
      </div>
    }>
      <ActivateAccountContent />
    </Suspense>
  );
}
