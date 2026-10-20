import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useI18n } from '../i18n';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark');
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-md p-2 text-ink-600 transition hover:bg-chrome-700 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <Icon strokeWidth={1.75} size={20} />
    </button>
  );
};

export default ThemeToggle;
