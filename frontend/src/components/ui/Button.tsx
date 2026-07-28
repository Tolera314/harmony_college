'use client';

import React from 'react';
import { motion, HTMLMotionProps, useReducedMotion } from 'motion/react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gold' | 'rose';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  ...props
}) => {
  const reduceMotion = useReducedMotion();

  const baseStyles =
    'inline-flex items-center justify-center font-sans font-semibold rounded-xl ' +
    'transition-all duration-200 focus:outline-none ds-focus-ring touch-target ' +
    'cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary:   'bg-[--brand-gold] text-[--text-inverse] hover:bg-[--accent-gold-hover] font-bold shadow-md',
    secondary: 'bg-[--hover-overlay] text-[--text-primary] hover:bg-[--active-overlay] border border-[--border-strong] backdrop-blur-md',
    outline:   'bg-transparent text-[--brand-gold] border border-[--accent-gold-border] hover:bg-[--accent-gold-subtle]',
    danger:    'bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border] hover:bg-[--status-danger-bg]',
    ghost:     'bg-transparent text-[--text-muted] hover:text-[--text-primary] hover:bg-[--hover-overlay]',
    gold:      'bg-[--brand-gold] text-[--text-inverse] hover:bg-[--accent-gold-hover] font-bold shadow-[0_0_20px_var(--accent-gold-glow)]',
    rose:      'bg-[--status-danger] text-white hover:opacity-90 font-bold shadow-[0_0_15px_var(--status-danger-bg)]',
  };

  const sizes: Record<string, string> = {
    xs: 'px-2.5 py-1 text-[10px] gap-1',
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-xs sm:text-sm gap-2',
    lg: 'px-6 py-3.5 text-sm sm:text-base gap-2.5',
  };

  return (
    <motion.button
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
};
