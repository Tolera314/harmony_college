'use client';

import React from 'react';

/**
 * Shared onboarding background — reuses the Harmony College design language.
 * Renders the radial gold atmosphere + glassmorphism foundation used across
 * the entire authentication/onboarding surface.
 */
export function OnboardingBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full relative overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Ambient atmosphere layers */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {/* Primary gold radial glow — top right */}
        <div
          className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(ellipse, rgba(233,195,73,0.07) 0%, transparent 70%)' }}
        />
        {/* Secondary glow — bottom left */}
        <div
          className="absolute bottom-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(ellipse, rgba(233,195,73,0.04) 0%, transparent 70%)' }}
        />
        {/* Vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 40%, var(--overlay-hero-mid) 100%)',
          }}
        />
        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
