'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full font-sans text-xs sm:text-sm">
      {label && (
        <label className="block font-semibold text-white/80">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50">
            {icon}
          </div>
        )}
        <input
          className={`w-full py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#E9C349] text-white placeholder:text-white/40 transition-colors ${
            icon ? 'pl-10 pr-4' : 'px-4'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[#ff897d] text-xs font-mono">{error}</p>}
    </div>
  );
};
