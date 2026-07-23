'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X, Shield } from 'lucide-react';
import { Button } from '../ui/Button';

interface AdminLogoutModalProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; }

export const AdminLogoutModal: React.FC<AdminLogoutModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ duration: 0.2 }}
          className="bg-[#141617] rounded-3xl max-w-sm w-full p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/50 border border-rose-900/40 flex items-center justify-center">
              <LogOut className="w-6 h-6 text-rose-400" />
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <h2 className="font-serif text-2xl font-bold text-white mb-1.5">Sign Out</h2>
          <p className="font-sans text-sm text-white/60 leading-relaxed mb-2">
            You&apos;ll be signed out of the Harmony College Super Admin Portal.
          </p>
          <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl mb-6 text-xs text-amber-300">
            <Shield className="w-4 h-4 shrink-0" />
            <span>All active sessions and any role override will be terminated.</span>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={onConfirm} icon={<LogOut className="w-4 h-4" />}>Sign Out</Button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
