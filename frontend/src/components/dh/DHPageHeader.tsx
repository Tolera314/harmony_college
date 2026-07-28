'use client';

import React from 'react';

interface DHPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  /** Heading level — default h1, use h2 for sub-sections */
  as?: 'h1' | 'h2';
}

export const DHPageHeader: React.FC<DHPageHeaderProps> = ({
  title, subtitle, icon, actions, as: Heading = 'h1',
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div className="flex items-center gap-3">
      {icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: 'var(--accent-gold-subtle)',
            border: '1px solid var(--accent-gold-border)',
            color: 'var(--brand-gold)',
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <div>
        <Heading
          className="font-serif text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </Heading>
        {subtitle && (
          <p className="font-sans text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);
