'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'harmony-theme';

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  // Add transition class to animate the switch
  html.classList.add('theme-transitioning');
  if (theme === 'light') {
    html.classList.add('light');
  } else {
    html.classList.remove('light');
  }
  // Remove transition helper after switch completes
  setTimeout(() => html.classList.remove('theme-transitioning'), 350);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // On mount: read localStorage, then fall back to OS preference
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial: Theme = prefersDark ? 'dark' : 'light';
      setThemeState(initial);
      applyTheme(initial);
    }
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, mounted };
}
