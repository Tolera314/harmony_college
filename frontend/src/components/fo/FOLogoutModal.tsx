'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/src/lib/motion';
import { LogOut, X, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface FOLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const FOLogoutModal: React.FC<FOLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-(--bg-card-solid) rounded-3xl max-w-sm w-full p-8 border border-(--border-default) shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-(--status-danger-bg) border border-(--status-danger-border) flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-(--status-danger)" />
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-(--hover-overlay) text-(--text-muted) transition-colors touch-target"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 id="logout-title" className="font-serif text-2xl font-bold text-(--text-primary) mb-2">
            Sign Out
          </h2>
          <p className="font-sans text-sm text-(--text-secondary) leading-relaxed mb-2">
            You&apos;re about to sign out of the Harmony College Finance Portal.
          </p>
          <p className="font-sans text-xs text-(--status-warning)/80 bg-(--status-warning-bg) border border-amber-900/30 rounded-xl px-3 py-2 mb-8">
            Any unsaved changes or open payment forms will be discarded.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={onConfirm} icon={<LogOut className="w-4 h-4" />}>
              Sign Out
            </Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
