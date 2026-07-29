/**
 * Harmony College — Enterprise Motion System
 * ─────────────────────────────────────────────────────────────────────────
 * Single source of truth for all animation durations, easings, and presets.
 * Every animated component imports from here — never hardcodes values.
 *
 * Design philosophy:
 *   • Fast and purposeful — reinforce hierarchy, not decoration
 *   • Consistent easing — easeOut for appearances, easeInOut for exchanges
 *   • GPU-composited only — opacity, transform, scale, translate
 *   • Reduced-motion aware — all presets respect the user's preference
 *
 * Usage:
 *   import { motion as m } from 'motion/react';
 *   import { SPRING_PILL, fadeUp, DURATION } from '@/src/lib/motion';
 *   <m.div {...fadeUp()} transition={{ ...DURATION.standard, ...EASE.out }} />
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { Transition, Variants } from 'motion/react';

/* ─────────────────────────────────────────────────────────
   DURATION SCALE
   ─────────────────────────────────────────────────────────
   100–150ms  Extra fast   — micro-interactions (badge pulse, dot)
   150–200ms  Fast         — icon buttons, tooltips
   200ms      Standard     — modals, toasts, dropdowns, nav items
   250ms      Medium       — page cards, state transitions
   300ms      Large        — panels, drawers, offline banners
   400ms      Max UI       — complex panels, chart appears (first-render only)
   Never exceed 450ms for interactive UI elements.
   Chart / progress bar fill durations are exempt (data-visualization).
   ───────────────────────────────────────────────────────── */
export const DURATION = {
  /** 120ms — micro: badge, dot, status indicator */
  micro:    { duration: 0.12 },
  /** 150ms — icon buttons, ThemeToggle swap */
  fast:     { duration: 0.15 },
  /** 200ms — modals, toasts, dropdowns */
  standard: { duration: 0.20 },
  /** 250ms — page views, empty/error states */
  medium:   { duration: 0.25 },
  /** 300ms — offline banner, drawers */
  panel:    { duration: 0.30 },
  /** 400ms — chart first-render, large overlays */
  large:    { duration: 0.40 },
} as const;

/* ─────────────────────────────────────────────────────────
   EASING SCALE
   ─────────────────────────────────────────────────────────
   out      — entrances (elements appearing)
   inOut    — exchanges (elements swapping)
   in       — exits (elements disappearing)
   linear   — infinite loops (spinners, shimmer)
   ───────────────────────────────────────────────────────── */
export const EASE = {
  /** Standard entrance — decelerate from fast to still */
  out:    { ease: [0.0, 0.0, 0.2, 1.0] as const },
  /** Exchange — symmetric, balanced */
  inOut:  { ease: [0.4, 0.0, 0.2, 1.0] as const },
  /** Exit — accelerate to disappear */
  in:     { ease: [0.4, 0.0, 1.0, 1.0] as const },
  /** Infinite loops */
  linear: { ease: 'linear' as const },
} as const;

/* ─────────────────────────────────────────────────────────
   SPRING PRESETS
   ─────────────────────────────────────────────────────────
   pill     — sidebar/mobile active indicator (layoutId pill)
   drawer   — slide-in drawers and panels
   ───────────────────────────────────────────────────────── */
export const SPRING = {
  /** Active nav pill — snappy, matches Linear/GitHub nav feel */
  pill:   { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  /** Drawer / panel slide — slightly slower, feels weighty */
  drawer: { type: 'spring', stiffness: 220, damping: 28 } as Transition,
} as const;

/* ─────────────────────────────────────────────────────────
   GESTURE PRESETS
   ─────────────────────────────────────────────────────────
   Applied to whileHover / whileTap / whileDrag.
   Kept subtle — premium feel, not toy-like.
   ───────────────────────────────────────────────────────── */
export const GESTURE = {
  /** Button press feedback */
  buttonTap:   { scale: 0.96 },
  buttonHover: { scale: 1.02 },
  /** Card lift — consistent across all card types */
  cardHover:   { y: -3 },
  /** Sidebar nav item slide */
  navHover:    { x: 4 },
  /** Mobile bottom nav tap */
  mobileNavTap: { scale: 0.88 },
  /** KPI card — subtle lift + scale */
  kpiHover:    { y: -3, scale: 1.008 },
  kpiTap:      { scale: 0.98 },
  /** ThemeToggle */
  iconHover:   { scale: 1.08 },
  iconTap:     { scale: 0.88 },
  /** Disabled — no animation */
  none:        {},
} as const;

/* ─────────────────────────────────────────────────────────
   ANIMATION PRESETS (Variants factory functions)
   ─────────────────────────────────────────────────────────
   Each returns a { initial, animate, exit, transition } object
   ready to spread onto a motion element.
   ───────────────────────────────────────────────────────── */

/** Subtle fade + 6px upward rise — page views, cards, state components */
export function fadeUp(opts?: { duration?: number; delay?: number }): {
  initial: object; animate: object; exit: object; transition: object;
} {
  const dur  = opts?.duration ?? DURATION.medium.duration;
  const del  = opts?.delay ?? 0;
  return {
    initial:    { opacity: 0, y: 6 },
    animate:    { opacity: 1, y: 0 },
    exit:       { opacity: 0, y: 6 },
    transition: { duration: dur, delay: del, ...EASE.out },
  };
}

/** Fade + scale — modals, dialogs, session overlays */
export function scaleIn(opts?: { duration?: number }): {
  initial: object; animate: object; exit: object; transition: object;
} {
  const dur = opts?.duration ?? DURATION.standard.duration;
  return {
    initial:    { opacity: 0, scale: 0.96, y: 8 },
    animate:    { opacity: 1, scale: 1,    y: 0 },
    exit:       { opacity: 0, scale: 0.96, y: 8 },
    transition: { duration: dur, ...EASE.out },
  };
}

/** Pure opacity — overlays, backdrop, tooltips */
export function fadeOnly(opts?: { duration?: number }): {
  initial: object; animate: object; exit: object; transition: object;
} {
  const dur = opts?.duration ?? DURATION.standard.duration;
  return {
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    exit:       { opacity: 0 },
    transition: { duration: dur, ...EASE.inOut },
  };
}

/** Slide up from bottom — mobile drawers, bottom sheets */
export function slideUp(distance = 24, opts?: { duration?: number }): {
  initial: object; animate: object; exit: object; transition: object;
} {
  return {
    initial:    { opacity: 0, y: distance },
    animate:    { opacity: 1, y: 0 },
    exit:       { opacity: 0, y: distance },
    transition: { ...(opts?.duration ? { duration: opts.duration } : DURATION.panel), ...EASE.out },
  };
}

/** Slide from top — offline banner, maintenance banner */
export function slideDown(distance = 48, opts?: { duration?: number }): {
  initial: object; animate: object; exit: object; transition: object;
} {
  return {
    initial:    { opacity: 0, y: -distance },
    animate:    { opacity: 1, y: 0 },
    exit:       { opacity: 0, y: -distance },
    transition: { ...(opts?.duration ? { duration: opts.duration } : DURATION.panel), ...EASE.out },
  };
}

/** Slide from right — drawers, side panels */
export function slideRight(opts?: { duration?: number }): {
  initial: object; animate: object; exit: object; transition: object;
} {
  return {
    initial:    { opacity: 0, x: 24 },
    animate:    { opacity: 1, x: 0  },
    exit:       { opacity: 0, x: 24 },
    transition: SPRING.drawer,
  };
}

/** Toast — slides from top, settles with opacity */
export function toastEntrance(): {
  initial: object; animate: object; exit: object; transition: object;
} {
  return {
    initial:    { opacity: 0, y: -16, scale: 0.97 },
    animate:    { opacity: 1, y: 0,   scale: 1    },
    exit:       { opacity: 0, y: -16, scale: 0.97 },
    transition: { ...DURATION.standard, ...EASE.out },
  };
}

/** Dropdown / popover — scale from origin point */
export function dropdownEntrance(): {
  initial: object; animate: object; exit: object; transition: object;
} {
  return {
    initial:    { opacity: 0, scale: 0.97, y: -4 },
    animate:    { opacity: 1, scale: 1,    y: 0  },
    exit:       { opacity: 0, scale: 0.97, y: -4 },
    transition: { ...DURATION.fast, ...EASE.out },
  };
}

/** Tab content — instant horizontal swap, subtle fade */
export function tabTransition(): {
  initial: object; animate: object; exit: object; transition: object;
} {
  return {
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    exit:       { opacity: 0 },
    transition: { ...DURATION.fast, ...EASE.inOut },
  };
}

/* ─────────────────────────────────────────────────────────
   STAGGER UTILITIES
   ─────────────────────────────────────────────────────────
   For lists, grids, and sequential reveals.
   ───────────────────────────────────────────────────────── */

/** Parent variants for staggered children */
export function staggerParent(staggerMs = 40): Variants {
  return {
    hidden:  {},
    visible: { transition: { staggerChildren: staggerMs / 1000 } },
  };
}

/** Child variant — paired with staggerParent */
export const staggerChild: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { ...DURATION.medium, ...EASE.out } },
};

/* ─────────────────────────────────────────────────────────
   REDUCED-MOTION SAFE VARIANTS
   ─────────────────────────────────────────────────────────
   Pass reduced=true (from useReducedMotion()) to replace
   animated variants with instant opacity transitions.
   ───────────────────────────────────────────────────────── */

/** Returns the appropriate preset, or a no-movement opacity fallback */
export function withReducedMotion<T extends { initial: object; animate: object; exit: object; transition: object }>(
  preset: T,
  reduced: boolean | null
): T | { initial: object; animate: object; exit: object; transition: object } {
  if (!reduced) return preset;
  return {
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    exit:       { opacity: 0 },
    transition: { duration: 0 },
  };
}

/** Reduced-motion safe gesture props */
export function gestures(
  hover: object,
  tap: object,
  reduced: boolean | null
): { whileHover?: object; whileTap?: object } {
  if (reduced) return {};
  return { whileHover: hover, whileTap: tap };
}
