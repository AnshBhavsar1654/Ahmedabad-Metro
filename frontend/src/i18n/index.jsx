import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';
import hi from './hi';
import gu from './gu';
import { LINE_NAMES, STATION_NAMES } from './names';
import { stationStatus } from '../lib/network';

// The site in English, Hindi or Gujarati. The rider picks a language in the navbar; the choice is remembered in
// this browser. On a first visit, a Hindi or Gujarati browser gets that language.
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
  { code: 'gu', label: 'ગુજરાતી', short: 'ગુ' },
];

const DICTIONARIES = { en, hi, gu };
const LOCALES = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' };
const STORAGE_KEY = 'metro_language';

const initialLanguage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (DICTIONARIES[stored]) return stored;
  } catch {
    /* storage unavailable */
  }
  const browser = (typeof navigator !== 'undefined' && navigator.language) || '';
  return browser.startsWith('gu') ? 'gu' : browser.startsWith('hi') ? 'hi' : 'en';
};

// Lookups by lowercase name, so "GIFT City" and "Gift City" both find the station.
const STATION_BY_LOWER = Object.fromEntries(Object.entries(STATION_NAMES).map(([k, v]) => [k.toLowerCase(), v]));

const buildValue = (lang, setLang) => {
  const dict = DICTIONARIES[lang];

  // t('key', { name: 'x' }): the text in the current language, falling back to English, then to the key.
  const t = (key, vars) => {
    const text = dict[key] ?? en[key] ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : text;
  };

  // Station and line names in the rider's script (English names pass through unchanged).
  const station = (name) => (lang === 'en' || !name ? name : STATION_BY_LOWER[String(name).toLowerCase()]?.[lang] ?? name);
  const line = (name) => (lang === 'en' ? name : LINE_NAMES[name]?.[lang] ?? name);

  // "Mahatma Mandir / GIFT City" -> each part in the rider's script.
  const places = (text) => String(text || '').split(' / ').map(station).join(' / ');

  // Gate data from stationData.json: "Gate No. 1", "Lift No. 04 near Gate No. 01 & 02".
  const gate = (text) => {
    const m = /^Gate No\. (\w+)$/.exec(text);
    return m ? t('gate.label', { n: m[1] }) : text;
  };
  const facility = (text) => {
    const m = /^Lift No\. (\w+) near Gate No\. (.+)$/.exec(text);
    if (!m) return text;
    const gates = m[2].split(/\s*&\s*/).join(` ${t('gate.and')} `);
    return t('gate.lift', { lift: m[1], gates });
  };

  // A station's name with its status when it isn't open: "Airport (Work in progress)".
  const stationOption = (name) => {
    const status = stationStatus(name);
    return status === 'operational' ? station(name) : `${station(name)} (${t(`status.${status}`)})`;
  };

  return { lang, setLang, t, station, stationOption, line, places, gate, facility, locale: LOCALES[lang] };
};

// Without a provider (e.g. a component rendered on its own in a test) everything is English.
const I18nContext = createContext(buildValue('en', () => {}));

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!DICTIONARIES[code]) return;
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* the choice just won't persist */
    }
  }, []);

  const value = useMemo(() => buildValue(lang, setLang), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
