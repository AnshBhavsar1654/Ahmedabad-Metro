import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'metro_theme';
const query = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

const readStored = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
};

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

// The class is first set by an inline script in index.html (no flash); this keeps it in sync afterwards.
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => readStored() || (query()?.matches ? 'dark' : 'light'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17325A' : '#0E2340');
  }, [theme]);

  // Until the rider picks a theme themselves, follow the operating system.
  useEffect(() => {
    const media = query();
    if (!media) return undefined;
    const onChange = (e) => !readStored() && setTheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable: choice just won't persist */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

// Colours for things drawn outside Tailwind (Leaflet markers and polylines). Stable objects, safe in hook deps.
const PALETTES = {
  light: { ink: '#12151B', route: '#0E2340', fill: '#FFFFFF', neutral: '#4B5160' },
  dark: { ink: '#E8EAEE', route: '#8DB4F0', fill: '#171C25', neutral: '#A0A7B4' },
};

export const mapPalette = (theme) => PALETTES[theme] || PALETTES.light;
