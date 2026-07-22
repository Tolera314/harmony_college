'use client';

import React from 'react';

interface DHPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const DHPageHeader: React.FC<DHPageHeaderProps> = ({ title, subtitle, icon, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-[#E9C349]/15 border border-[#E9C349]/30 flex items-center justify-center text-[#E9C349] shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="font-sans text-xs sm:text-sm text-white/50 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);
