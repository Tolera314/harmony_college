'use client';

/**
 * SlidePanel — Shared right-side sliding panel / drawer
 * ────────────────────────────────────────────────────────────────────────────
 * Use this for ALL detail views, forms, and content panels.
 * Use <Modal> (centered) ONLY for small confirmation dialogs.
 *
 * Props:
 *   isOpen   — controls visibility
 *   onClose  — called when backdrop or X is clicked
 *   title    — panel heading (string or ReactNode)
 *   subtitle — optional sub-heading below title
 *   width    — Tailwind max-width class, default "max-w-2xl"
 *   children — panel body content
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { SPRING } from '@/src/lib/motion';

export interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Tailwind width class applied to the panel, e.g. "max-w-xl" or "max-w-3xl". Default: "max-w-2xl" */
  width?: string;
  children: React.ReactNode;
  /** Extra class for the scrollable body area */
  bodyClassName?: string;
}

export const SlidePanel: React.FC<SlidePanelProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 'max-w-2xl',
  children,
  bodyClassName = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Escape key closes panel ── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* ── Focus first interactive element on open ── */
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const el = panelRef.current;
      if (!el) return;
      const first = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-modal="true" role="dialog">
          {/* Backdrop — semi-transparent, no blur so dashboard stays visible */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black"
            aria-hidden="true"
          />

          {/* Panel container — right edge */}
          <div className="absolute inset-y-0 right-0 flex max-w-full">
            <motion.div
              ref={panelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={SPRING.drawer}
              className={`relative flex w-screen flex-col shadow-2xl ${width}`}
              style={{
                backgroundColor: 'var(--bg-modal, var(--bg-base))',
                borderLeft: '1px solid var(--border-default)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-start justify-between gap-4 px-6 py-5 sticky top-0 z-10 shrink-0"
                style={{
                  backgroundColor: 'var(--bg-modal-hdr, var(--bg-sidebar))',
                  borderBottom: '1px solid var(--border-default)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div className="min-w-0">
                  {subtitle && (
                    <p className="text-[10px] font-mono uppercase tracking-widest text-(--text-faint) mb-0.5 truncate">
                      {subtitle}
                    </p>
                  )}
                  {title && (
                    <h2 className="font-serif text-lg font-bold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                      {title}
                    </h2>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close panel"
                  className="shrink-0 p-2 rounded-xl transition-colors border"
                  style={{
                    color: 'var(--text-muted)',
                    backgroundColor: 'var(--hover-overlay)',
                    borderColor: 'var(--border-default)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className={`flex-1 overflow-y-auto p-6 ${bodyClassName}`}>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
