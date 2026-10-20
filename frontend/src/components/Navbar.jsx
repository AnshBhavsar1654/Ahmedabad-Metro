import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../i18n';
import { Home, Route, TrainFront, MapPin, Accessibility, Clock, Phone, Info, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'nav.home', icon: Home },
  { to: '/routes', label: 'nav.routes', icon: Route },
  { to: '/stations', label: 'nav.stations', icon: TrainFront },
  { to: '/nearest-stations', label: 'nav.nearest', icon: MapPin },
  { to: '/facilities', label: 'nav.facilities', icon: Accessibility },
  { to: '/schedule', label: 'nav.schedule', icon: Clock },
  { to: '/contact', label: 'nav.contact', icon: Phone },
  { to: '/stations-info', label: 'nav.stationsInfo', icon: Info },
];

const iconProps = { strokeWidth: 1.75, size: 20 };

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const desktopClass = (to) =>
    'flex items-center gap-2 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors ' +
    (pathname === to ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white');

  const mobileClass = (to) =>
    'flex items-center gap-3 border-b border-white/10 px-4 py-3 text-base font-medium transition-colors ' +
    (pathname === to ? 'bg-chrome-700 text-white' : 'text-white/70 hover:bg-chrome-700/50 hover:text-white');

  return (
    <nav className="fixed top-0 z-[2000] w-full border-b border-white/10 bg-chrome-900" aria-label={t('nav.main')}>
      <div className="relative mx-auto flex min-h-[64px] max-w-7xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-white no-underline">
          <img src="/logo.png" alt={t('app.name')} className="h-10 w-10" />
        </Link>

        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center xl:flex">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={desktopClass(to)} aria-current={pathname === to ? 'page' : undefined}>
              <Icon {...iconProps} /> {t(label)}
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-1 xl:flex">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 xl:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-white transition hover:bg-chrome-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={t('nav.menu')}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? <X {...iconProps} /> : <Menu {...iconProps} />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`overflow-hidden bg-chrome-900 shadow-lg transition-[max-height] duration-300 ease-in-out xl:hidden ${isMenuOpen ? 'max-h-[560px]' : 'max-h-0'}`}
      >
        <div className="flex flex-col pb-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={mobileClass(to)} aria-current={pathname === to ? 'page' : undefined} tabIndex={isMenuOpen ? 0 : -1}>
              <Icon {...iconProps} /> {t(label)}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
