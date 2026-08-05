'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

export interface OnboardingStep {
  id: number;
  label: string;
  sublabel?: string;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentStep: number; // 1-indexed
}

/**
 * Horizontal step indicator for the onboarding wizard.
 * Reuses the Harmony College gold accent and design tokens.
 */
export function OnboardingProgress({ steps, currentStep }: OnboardingProgressProps) {
  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex items-center w-full">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.id;
          const isActive    = currentStep === step.id;
          const isLast      = idx === steps.length - 1;

          return (
            <li
              key={step.id}
              className={`flex items-center ${isLast ? 'flex-shrink-0' : 'flex-1'}`}
            >
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <motion.div
                  layout
                  className={`
                    relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 shrink-0
                    ${isCompleted
                      ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)]'
                      : isActive
                      ? 'bg-[var(--accent-gold-subtle)] border-[var(--brand-gold)]'
                      : 'bg-[var(--bg-card)] border-[var(--border-default)]'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-[var(--bg-base)]" strokeWidth={3} />
                  ) : (
                    <span
                      className={`font-mono text-xs font-bold ${
                        isActive ? 'text-[var(--brand-gold)]' : 'text-[var(--text-faint)]'
                      }`}
                    >
                      {step.id}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[var(--brand-gold)]"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </motion.div>

                {/* Label — hidden on very small screens */}
                <div className="hidden sm:block text-center mt-1.5 min-w-[60px]">
                  <p
                    className={`text-[10px] font-semibold font-sans transition-colors leading-tight ${
                      isActive
                        ? 'text-[var(--brand-gold)]'
                        : isCompleted
                        ? 'text-[var(--text-secondary)]'
                        : 'text-[var(--text-faint)]'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-2 sm:mx-3 mt-[-14px] sm:mt-[-28px]">
                  <div className="h-px w-full bg-[var(--border-default)] overflow-hidden rounded-full">
                    <motion.div
                      className="h-full bg-[var(--brand-gold)]"
                      initial={{ width: '0%' }}
                      animate={{ width: isCompleted ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Compact linear progress bar for the apply page header.
 */
export function LinearProgress({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label?: string;
}) {
  const pct = Math.round((value / total) * 100);
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-faint)]">
            {label}
          </span>
          <span className="font-mono text-[10px] text-[var(--brand-gold)] font-bold">
            {pct}%
          </span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--brand-gold-dark), var(--brand-gold))' }}
          initial={{ width: `${((value - 1) / total) * 100}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress indicator for the profile completion widget.
 */
export function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
}: {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--brand-gold)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
      />
    </svg>
  );
}
