import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'emerald' | 'amber' | 'rose' | 'glass';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gold',
  className = ''
}) => {
  const variants = {
    gold: "bg-[#E9C349]/15 text-[#E9C349] border border-[#E9C349]/30",
    emerald: "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40",
    amber: "bg-amber-950/40 text-amber-300 border border-amber-800/40",
    rose: "bg-rose-950/40 text-rose-300 border border-rose-800/40",
    glass: "bg-white/10 text-white/90 border border-white/15"
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
