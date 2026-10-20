import React from 'react';
import { Languages } from 'lucide-react';
import { LANGUAGES, useI18n } from '../i18n';

// English / हिन्दी / ગુજરાતી. A native select: works with keyboards, screen readers and phones without extra code.
const LanguageSwitcher = ({ className = '' }) => {
  const { lang, setLang, t } = useI18n();
  return (
    <label className={`relative inline-flex items-center rounded-md text-ink-600 transition hover:bg-chrome-700 hover:text-ink-900 focus-within:ring-2 focus-within:ring-accent ${className}`}>
      <span className="sr-only">{t('lang.label')}</span>
      <Languages strokeWidth={1.75} size={18} className="pointer-events-none absolute left-2" aria-hidden="true" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent py-2 pl-8 pr-2 text-sm font-medium text-inherit focus:outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-chrome-900 text-ink-900">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSwitcher;
