'use client';

import React from 'react';

interface FOPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const FOPageHeader: React.FC<FOPageHeaderProps> = ({ title, subtitle, icon, actions, badge }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-(--accent-gold-subtle) border border-(--accent-gold-border) flex items-center justify-center text-(--brand-gold) shrink-0">
          {icon}
        </div>
      )}
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-(--text-primary) tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="font-sans text-xs sm:text-sm text-(--text-muted) mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && (
      <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
    )}
  </div>
);
