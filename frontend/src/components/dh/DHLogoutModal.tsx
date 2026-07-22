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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-[#141617] rounded-3xl max-w-sm w-full p-8 border border-white/10 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/50 border border-rose-900/40 flex items-center justify-center">
              <LogOut className="w-6 h-6 text-rose-400" />
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="font-serif text-2xl font-bold text-white mb-2">Sign Out</h2>
          <p className="font-sans text-sm text-white/60 leading-relaxed mb-8">
            You&apos;ll be signed out of the Harmony College Department Head Portal. Any unsaved changes will be lost.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={onConfirm} icon={<LogOut className="w-4 h-4" />}>
              Sign Out
            </Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
