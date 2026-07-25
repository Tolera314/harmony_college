'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

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
  const baseStyles = "inline-flex items-center justify-center font-sans font-semibold rounded-xl transition-all duration-200 focus:outline-none touch-target cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-[#E9C349] text-[#0F0F10] hover:bg-[#d8b238] font-bold shadow-md gold-glow",
    secondary: "bg-white/10 text-white hover:bg-white/15 border border-white/15 backdrop-blur-md",
    outline: "bg-transparent text-[#E9C349] border border-[#E9C349]/40 hover:bg-[#E9C349]/10",
    danger: "bg-[#ffdad6]/10 text-[#ff897d] border border-[#ba1a1a]/40 hover:bg-[#ffdad6]/20",
    ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/5",
    gold: "bg-[#D4AF37] text-[#0F0F10] hover:bg-[#c9a52e] font-bold shadow-[0_0_20px_rgba(212,175,55,0.25)]",
    rose: "bg-rose-600 text-white hover:bg-rose-700 font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)]"
  };

  const sizes = {
    xs: "px-2.5 py-1 text-[10px] gap-1",
    sm: "px-3.5 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-xs sm:text-sm gap-2",
    lg: "px-6 py-3.5 text-sm sm:text-base gap-2.5"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
};
