'use client';

/**
 * ConfirmModal — Centered confirmation dialog
 * ────────────────────────────────────────────────────────────────────────────
 * Use ONLY for:
 *   • Logout confirmations
 *   • Destructive action confirmations (delete, revoke, etc.)
 *   • Critical warnings requiring explicit user choice
 *
 * For all other modals (forms, detail views, etc.), use <SlidePanel>
 *
 * Props:
 *   isOpen       — controls visibility
 *   onClose      — called when backdrop or Cancel is clicked
 *   onConfirm    — called when primary action button is clicked
 *   title        — dialog heading
 *   message      — body text
 *   icon         — optional icon ReactNode (e.g., <LogOut />)
 *   variant      — "danger" (red) or "warning" (amber), default "danger"
 *   confirmLabel — text for primary button, default "Confirm"
 *   cancelLabel  — text for secondary button, default "Cancel"
 *   warning      — optional warning message below main message
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  icon?: React.ReactNode;
  variant?: 'danger' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
  warning?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  icon,
  variant = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  warning,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  /* ── Lock body scroll while open ── */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  /* ── Escape key closes modal ── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* ── Focus first button on open ── */
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const iconBgClass =
    variant === 'danger'
      ? 'bg-(--status-danger-bg) border-[var(--status-danger-border)]'
      : 'bg-(--status-warning-bg) border-[var(--status-warning-border)]';

  const iconColorClass = variant === 'danger' ? 'text-(--status-danger)' : 'text-(--status-warning)';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          aria-hidden="false"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-md bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog panel */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1.0] }}
            className="ds-modal rounded-3xl max-w-sm w-full p-8 border shadow-2xl relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon + Close button row */}
            <div className="flex items-center justify-between mb-5">
              {icon && (
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBgClass} border ${iconColorClass}`}
                >
                  {icon}
                </div>
              )}
              <button
                onClick={onClose}
                className="ml-auto p-2 rounded-full transition-colors ds-focus-ring"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-overlay)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title + Message */}
            <h2 className="font-serif text-2xl font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <p className="font-sans text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>

            {/* Optional warning badge */}
            {warning && (
              <div
                className={`flex items-center gap-2 p-3 rounded-xl mb-6 text-xs border ${variant === 'danger' ? 'ds-badge-warning' : 'ds-badge-warning'}`}
              >
                <span className="shrink-0 text-xl" aria-hidden="true">⚠</span>
                <span>{warning}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                {cancelLabel}
              </Button>
              <Button variant={variant === 'warning' ? 'gold' : 'danger'} className="flex-1" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
