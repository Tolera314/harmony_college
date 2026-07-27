'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface DHLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DHLogoutModal: React.FC<DHLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay-modal-bg)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1.0] }}
          className="ds-modal rounded-3xl max-w-sm w-full p-8 border shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)' }}>
              <LogOut className="w-6 h-6" style={{ color: 'var(--status-danger)' }} />
            </div>
            <button onClick={onClose} className="p-2 rounded-full transition-colors" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>
          <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Sign Out</h2>
          <p className="font-sans text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
            You&apos;ll be signed out of the Harmony College Department Head Portal. Any unsaved changes will be lost.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={onConfirm} icon={<LogOut className="w-4 h-4" />}>Sign Out</Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
