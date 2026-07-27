'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Appearance Section — reused across all dashboard settings views.
// Uses the centralized ThemeContext. No props needed.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { motion } from 'motion/react';
import { Monitor, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface AppearanceSectionProps {
  /** Optional header style — 'card' wraps in a Card-like box, 'inline' is borderless */
  variant?: 'card' | 'inline';
  /** Optional section title override */
  title?: string;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  variant = 'card',
  title = 'Appearance',
}) => {
  const { theme: activeTheme, setTheme, themes } = useTheme();

  const content = (
    <div className="space-y-5">
      <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
        <Monitor className="w-5 h-5 text-[#E9C349]" /> {title}
      </h3>

      {/* Theme */}
      <div className="space-y-3">
        <p className="font-mono text-[11px] text-white/40 uppercase tracking-wider">Theme</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themes.map((t) => {
            const isActive = activeTheme === t.id;
            return (
              <motion.button
                key={t.id}
                onClick={() => setTheme(t.id)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                aria-pressed={isActive}
                className={`relative p-4 rounded-2xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9C349] ${
                  isActive
                    ? 'border-[#E9C349]/60 ring-2 ring-[#E9C349]/20'
                    : 'border-white/10 hover:border-white/25'
                }`}
                style={{ backgroundColor: t.bg }}
              >
                {/* Mini preview */}
                <div className="flex gap-1.5 mb-3">
                  <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: 'rgba(233,195,73,0.25)' }} />
                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <div className="h-1.5 rounded-full bg-white/20 w-3/4" />
                    <div className="h-1.5 rounded-full bg-white/10 w-1/2" />
                  </div>
                </div>

                <p className="font-sans text-sm font-semibold text-white">{t.name}</p>
                <p className="font-mono text-[10px] text-white/40 mt-0.5">{t.desc}</p>

                {/* Radio indicator */}
                <div className="absolute top-3 right-3">
                  {isActive ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E9C349] shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0F0F10]" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-white/20 bg-white/5" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
        <p className="font-sans text-xs text-white/40">
          Theme applies instantly and persists after refresh.
        </p>
      </div>
    </div>
  );

  if (variant === 'inline') return content;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
      {content}
    </div>
  );
};
