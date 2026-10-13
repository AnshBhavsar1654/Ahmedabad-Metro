import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`inline-flex items-center justify-center rounded-md p-2 text-white/80 transition hover:bg-chrome-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${className}`}
    >
      <Icon strokeWidth={1.75} size={20} />
    </button>
  );
};

export default ThemeToggle;
