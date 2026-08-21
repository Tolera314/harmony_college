'use client';

import React, { useMemo } from 'react';
import { motion } from 'motion/react';

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score: number;      // 0–4
  label: string;
  color: string;
  bgColor: string;
  hints: string[];
}

function analyzePassword(pw: string): StrengthResult {
  if (!pw) {
    return { score: 0, label: '', color: 'transparent', bgColor: 'transparent', hints: [] };
  }

  let score = 0;
  const hints: string[] = [];

  if (pw.length >= 8)  score++;  else hints.push('At least 8 characters');
  if (pw.length >= 12) score++;  else if (pw.length >= 8) hints.push('12+ chars is stronger');
  if (/[A-Za-z]/.test(pw)) score++; else hints.push('Add at least one letter');
  if (/[0-9]/.test(pw)) score++; else hints.push('Include a number');
  if (/^[A-Za-z0-9]+$/.test(pw)) score++; else hints.push('Use only letters and numbers');

  // cap at 4
  const capped = Math.min(score, 4);

  const levels: Record<number, { label: string; color: string; bgColor: string }> = {
    0: { label: 'Too weak',  color: '#ef4444', bgColor: 'var(--status-danger-bg)'  },
    1: { label: 'Weak',      color: '#ef4444', bgColor: 'var(--status-danger-bg)'  },
    2: { label: 'Fair',      color: '#f59e0b', bgColor: 'var(--status-warning-bg)' },
    3: { label: 'Good',      color: '#10b981', bgColor: 'var(--status-success-bg)' },
    4: { label: 'Strong',    color: '#10b981', bgColor: 'var(--status-success-bg)' },
  };

  return { score: capped, hints: hints.slice(0, 2), ...levels[capped] };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const result = useMemo(() => analyzePassword(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2" role="status" aria-label={`Password strength: ${result.label}`}>
      {/* Strength bars */}
      <div className="flex gap-1.5 h-1" aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <div key={level} className="flex-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: result.score >= level ? '100%' : '0%' }}
              style={{ backgroundColor: result.color }}
              transition={{ duration: 0.3, delay: (level - 1) * 0.05, ease: 'easeOut' }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <motion.span
          key={result.label}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[11px] font-semibold font-mono"
          style={{ color: result.color }}
        >
          {result.label}
        </motion.span>
        {result.hints[0] && (
          <span className="text-[10px] text-[var(--text-faint)] font-sans">
            {result.hints[0]}
          </span>
        )}
      </div>
    </div>
  );
}
