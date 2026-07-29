'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from 'motion/react';
import { GESTURE } from '@/src/lib/motion';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hoverable = true, onClick }) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileHover={hoverable && !reduced ? GESTURE.cardHover : undefined}
      onClick={onClick}
      className={`ds-card rounded-2xl p-6 border shadow-xl transition-colors ${
        hoverable ? 'cursor-pointer hover:shadow-2xl' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};
