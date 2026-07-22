'use client';

import React from 'react';
import { motion } from 'motion/react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = true,
  onClick
}) => {
  return (
    <motion.div
      whileHover={hoverable ? { y: -4 } : undefined}
      onClick={onClick}
      className={`glass-surface rounded-2xl p-6 border border-white/10 shadow-xl ${
        hoverable ? 'glass-surface-hover cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};
