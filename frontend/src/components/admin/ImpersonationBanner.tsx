'use client';

import React from 'react';
import { motion } from 'motion/react';
import { UserCog, X } from 'lucide-react';
import { UserRole } from '../../types/admin';

interface ImpersonationBannerProps {
  targetName: string;
  targetRole: UserRole;
  startTime: string;
  onExit: () => void;
}

export const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({
  targetName, targetRole, startTime, onExit,
}) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="fixed top-14 left-0 right-0 z-50 flex items-center justify-between gap-4 px-4 py-2.5 bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-xl"
    role="alert"
    aria-live="assertive"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
        <UserCog className="w-3.5 h-3.5 text-amber-400" />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-sans min-w-0">
        <span className="font-bold text-amber-300">ROLE OVERRIDE ACTIVE</span>
        <span className="text-amber-200/70">Viewing system as</span>
        <span className="font-semibold text-white">{targetName}</span>
        <span className="font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/25">{targetRole}</span>
        <span className="text-amber-200/50 font-mono text-[10px]">Started {startTime}</span>
      </div>
    </div>
    <button
      onClick={onExit}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/30 text-amber-300 font-sans text-xs font-semibold transition-colors shrink-0 touch-target"
      aria-label="Exit impersonation"
    >
      <X className="w-3.5 h-3.5" />
      Exit Override
    </button>
  </motion.div>
);
