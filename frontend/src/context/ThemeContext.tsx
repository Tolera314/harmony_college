'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeId = 'dark' | 'navy' | 'forest';

export interface Theme {
  id: ThemeId;
  name: string;
  bg: string;
  desc: string;
}

export const THEMES: Theme[] = [
  { id: 'dark',   name: 'Dark (Default)', bg: '#0F0F10', desc: 'Deep obsidian' },
  { id: 'navy',   name: 'Deep Navy',      bg: '#060c1a', desc: 'Midnight blue' },
  { id: 'forest', name: 'Dark Forest',    bg: '#070f0a', desc: 'Deep green' },
];

const STORAGE_KEY = 'hc-theme';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  themes: THEMES,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute('data-theme', id);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('dark');

  // On mount: read saved theme and apply before first paint
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES.find((t) => t.id === saved)) {
        setThemeState(saved);
        applyTheme(saved);
      } else {
        applyTheme('dark');
      }
    } catch {
      applyTheme('dark');
    }
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
    applyTheme(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
