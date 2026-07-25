'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../lib/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggle, mounted } = useTheme();

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isLight = theme === 'light';

  return (
    <motion.button
      onClick={toggle}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={`
        relative w-9 h-9 rounded-full flex items-center justify-center
        transition-colors duration-300 focus:outline-none
        focus-visible:ring-2 focus-visible:ring-[#E9C349] focus-visible:ring-offset-2
        ${isLight
          ? 'bg-[#111]/8 hover:bg-[#111]/12 text-[#555]'
          : 'bg-white/8 hover:bg-white/12 text-gray-400 hover:text-white'
        }
        ${className}
      `}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLight ? (
          <motion.span
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="absolute"
          >
            <Moon className="w-4 h-4" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="absolute"
          >
            <Sun className="w-4 h-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
