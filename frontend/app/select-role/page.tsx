'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import {
  GraduationCap,
  Users,
  UserCog,
  Shield,
  DollarSign,
  ClipboardList,
  ChevronRight,
  Loader2,
} from 'lucide-react';

const ROLE_META: Record<string, { label: string; description: string; color: string; url: string }> = {
  DEPARTMENT_HEAD: {
    label: 'Department Head',
    description: 'Manage your department — faculty, courses, class sections, approvals & academic oversight.',
    color: '#E9C349',
    url: '/dashboard/department-head',
  },
  INSTRUCTOR: {
    label: 'Instructor',
    description: 'Teach your courses — manage rosters, grades, attendance, assignments & student progress.',
    color: '#6366f1',
    url: '/dashboard/instructor',
  },
  HR_OFFICER: {
    label: 'HR Officer',
    description: 'Handle human resources — staff records, leave requests, payroll & compliance.',
    color: '#10b981',
    url: '/dashboard/hr',
  },
  REGISTRAR: {
    label: 'Registrar',
    description: 'Manage student enrollment, academic records, transcripts & graduation.',
    color: '#f59e0b',
    url: '/dashboard/registrar',
  },
  FINANCE_OFFICER: {
    label: 'Finance Officer',
    description: 'Oversee tuition fees, payments, financial accounts & reports.',
    color: '#3b82f6',
    url: '/dashboard/finance-officer',
  },
  ADMIN: {
    label: 'Administrator',
    description: 'Full administrative access — manage users, system settings & all resources.',
    color: '#ef4444',
    url: '/dashboard/admin',
  },
  SUPER_ADMIN: {
    label: 'Super Administrator',
    description: 'Complete system control with full access to all administrative functions.',
    color: '#dc2626',
    url: '/dashboard/admin',
  },
  STUDENT: {
    label: 'Student',
    description: 'Access your courses, grades, schedule, and academic progress.',
    color: '#06b6d4',
    url: '/dashboard/student',
  },
};

const ROLE_ICONS: Record<string, string> = {
  DEPARTMENT_HEAD: '🏛️',
  INSTRUCTOR: '🎓',
  HR_OFFICER: '👥',
  REGISTRAR: '📋',
  FINANCE_OFFICER: '💰',
  ADMIN: '🛡️',
  SUPER_ADMIN: '⚡',
  STUDENT: '📚',
};

function SelectRoleContent() {
  const searchParams = useSearchParams();
  const [roles, setRoles] = useState<string[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = searchParams.get('roles');
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (Array.isArray(parsed)) setRoles(parsed);
      }
    } catch {
      setError('Unable to determine available roles. Please sign in again.');
    }
  }, [searchParams]);

  const handleSelect = async (role: string) => {
    setSwitching(role);
    setError('');
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to select role. Please try again.');
        setSwitching(null);
        return;
      }

      window.location.href = data.targetUrl ?? ROLE_META[role]?.url ?? '/dashboard/student';
    } catch {
      setError('Could not reach the server. Please check your connection.');
      setSwitching(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-base, #0f0f10)' }}
    >
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #E9C349 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl relative z-10"
      >
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-bold mb-1" style={{ color: 'var(--text-primary, #fff)' }}>
            Harmony <span style={{ color: '#E9C349' }}>College</span>
          </h2>
        </div>

        {/* Badge */}
        <div className="text-center mb-8">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border mb-5"
            style={{ background: 'rgba(233,195,73,0.1)', borderColor: 'rgba(233,195,73,0.3)', color: '#E9C349' }}
          >
            <Users className="w-4 h-4" />
            Multiple Roles Detected
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--text-primary, #fff)' }}>
            Choose Your Portal
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted, #888)' }}>
            You have access to multiple dashboards. Select how you want to sign in today.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm text-center border"
            style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        {/* Role cards */}
        <div className="space-y-3">
          {roles.map((role, idx) => {
            const meta = ROLE_META[role];
            if (!meta) return null;
            const isLoading = switching === role;

            return (
              <motion.button
                key={role}
                id={`role-select-${role.toLowerCase()}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.08, duration: 0.4 }}
                onClick={() => handleSelect(role)}
                disabled={!!switching}
                className="w-full text-left group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: isLoading ? meta.color : 'rgba(255,255,255,0.08)',
                  boxShadow: isLoading ? `0 0 0 2px ${meta.color}40` : undefined,
                  opacity: switching && !isLoading ? 0.4 : 1,
                  cursor: switching ? 'not-allowed' : 'pointer',
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${meta.color}15` }}
                  >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: meta.color }} /> : ROLE_ICONS[role]}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-base" style={{ color: 'var(--text-primary, #fff)' }}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted, #888)' }}>
                      {meta.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="flex-shrink-0 w-5 h-5" style={{ color: meta.color }} />
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="text-center mt-7 text-xs" style={{ color: 'var(--text-faint, #555)' }}>
          You can switch roles at any time from the dashboard without signing out.
        </p>
      </motion.div>
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f10' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#E9C349' }} />
        </div>
      }
    >
      <SelectRoleContent />
    </Suspense>
  );
}
