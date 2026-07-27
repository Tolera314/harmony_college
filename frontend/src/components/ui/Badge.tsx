'use client';

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'emerald' | 'amber' | 'rose' | 'glass' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gold',
  className = ''
}) => {
  const variants: Record<string, string> = {
    gold:    "bg-[--accent-gold-subtle] text-[--brand-gold] border border-[--accent-gold-border]",
    emerald: "ds-badge-success border",
    amber:   "ds-badge-warning border",
    rose:    "ds-badge-danger border",
    glass:   "bg-[--hover-overlay] text-[--text-secondary] border border-[--border-default]",
    success: "ds-badge-success border",
    warning: "ds-badge-warning border",
    danger:  "ds-badge-danger border",
    info:    "ds-badge-info border",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold ${variants[variant] ?? variants.gold} ${className}`}
    >
      {children}
    </span>
  );
};
