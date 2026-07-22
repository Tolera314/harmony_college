'use client';

import React from 'react';
import { motion } from 'motion/react';

interface SkeletonCardProps {
  rows?: number;
  className?: string;
}

function Shimmer({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden bg-white/8 rounded-xl ${className}`}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ translateX: ['−100%', '200%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ rows = 3, className = '' }) => (
  <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 ${className}`}>
    <div className="flex items-center justify-between">
      <Shimmer className="h-4 w-32" />
      <Shimmer className="h-8 w-8 rounded-xl" />
    </div>
    <Shimmer className="h-8 w-24" />
    {Array.from({ length: rows }).map((_, i) => (
      <Shimmer key={i} className={`h-3 ${i === 0 ? 'w-full' : i === 1 ? 'w-4/5' : 'w-3/5'}`} />
    ))}
  </div>
);

export const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-4 p-4 border-b border-white/5">
    <Shimmer className="w-8 h-8 rounded-full" />
    <div className="flex-1 space-y-2">
      <Shimmer className="h-3 w-48" />
      <Shimmer className="h-2.5 w-32" />
    </div>
    <Shimmer className="h-6 w-16 rounded-full" />
    <Shimmer className="h-6 w-16 rounded-full" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
    <div className="p-4 border-b border-white/10 flex gap-4">
      {[60, 120, 80, 90, 70].map((w, i) => <Shimmer key={i} className={`h-3`} style={{ width: w }} />)}
    </div>
    {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
  </div>
);
