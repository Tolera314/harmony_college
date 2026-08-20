'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { scaleIn, fadeOnly } from '@/src/lib/motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  titleId?: string;
  children: React.ReactNode;
  maxWidth?: string;
  /** Descriptive string for aria-label when title is not a plain string */
  ariaLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  titleId,
  children,
  maxWidth = 'max-w-2xl',
  ariaLabel,
}) => {
  const dialogRef  = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const generatedId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`);
  const labelId = titleId ?? generatedId.current;

  /* ── Remember the element that opened the modal ── */
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  /* ── Focus the dialog on open ── */
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const el = dialogRef.current;
      if (!el) return;
      const first = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (first ?? el).focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  /* ── Escape key + focus trap ── */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }

      /* Focus trap */
      if (e.key !== 'Tab') return;
      const el = dialogRef.current;
      if (!el) return;
      const focusable = Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /* ── Prevent background scroll while open ── */
  useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        /* Backdrop */
        <div
          className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--overlay-modal-bg)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          aria-hidden="false"
          data-modal-root=""
        >
          {/* Dialog panel */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? labelId : undefined}
            aria-label={!title ? (ariaLabel ?? 'Dialog') : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1.0] }}
            className={`ds-modal rounded-3xl border ${maxWidth} w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto focus:outline-none`}
          >
            {title && (
              <div className="flex justify-between items-center pb-4 ds-modal-header border-b">
                <div
                  id={labelId}
                  className="font-serif text-xl sm:text-2xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {title}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="p-2 rounded-full transition-colors touch-target ds-focus-ring"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover-overlay)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            )}
            <div>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
