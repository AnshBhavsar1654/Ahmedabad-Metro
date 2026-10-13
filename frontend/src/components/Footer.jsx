import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, TrainFront, Eye } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaYoutube, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { API_URL } from '../lib/api';

const QUICK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/routes', label: 'Plan Journey' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/contact', label: 'Contact' },
];

const NETWORK_LINKS = [
  { to: '/stations', label: 'Metro Map' },
  { to: '/nearest-stations', label: 'Nearest Stations' },
  { to: '/stations-info', label: 'Stations Info' },
  { to: '/facilities', label: 'Facilities' },
];

// react-icons is only used here: lucide has no brand logos.
const SOCIALS = [
  { href: 'https://www.facebook.com/MetroGMRC', label: 'Facebook', icon: FaFacebookF },
  { href: 'https://x.com/MetroGMRC', label: 'X', icon: FaXTwitter },
  { href: 'https://www.instagram.com/MetroGMRC/', label: 'Instagram', icon: FaInstagram },
  { href: 'https://www.youtube.com/@MetroGMRC', label: 'YouTube', icon: FaYoutube },
  { href: 'https://www.linkedin.com/company/metrogmrc', label: 'LinkedIn', icon: FaLinkedinIn },
];

const VISIT_KEY = 'metro_visit_day';
const today = () => new Date().toISOString().slice(0, 10);

// Counts this browser once a day, then follows the live total and how many people have the site open.
const VisitCounter = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let counted = false;
    try {
      counted = localStorage.getItem(VISIT_KEY) === today();
    } catch {
      /* storage unavailable: count this load */
    }
    if (!counted) {
      fetch(`${API_URL}/api/visits`, { method: 'POST' })
        .then((res) => {
          if (!res.ok) return;
          try {
            localStorage.setItem(VISIT_KEY, today());
          } catch {
            /* fine: worst case this browser is counted again */
          }
        })
        .catch(() => {});
    }

    if (typeof EventSource === 'undefined') return undefined;
    const source = new EventSource(`${API_URL}/api/visits/stream`); // reconnects by itself if dropped
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.total === 'number') setStats(data);
      } catch {
        /* ignore a malformed event */
      }
    };
    return () => source.close();
  }, []);

  if (!stats) return null;
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-ink-600" aria-live="polite">
      <span className="inline-flex items-center gap-1.5">
        <Eye size={15} strokeWidth={1.75} className="text-accent" />
        <span className="font-mono tabular-nums text-ink-900">{stats.total.toLocaleString('en-IN')}</span> visits
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-go-600 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-go-600" />
        </span>
        <span className="font-mono tabular-nums text-ink-900">{stats.online.toLocaleString('en-IN')}</span> online now
      </span>
    </p>
  );
};

const FooterHeading = ({ children }) => <h3 className="font-sans text-base font-semibold text-ink-900">{children}</h3>;

const FooterLinks = ({ links }) => (
  <ul className="mt-3 flex flex-col">
    {links.map(({ to, label }) => (
      <li key={to}>
        <Link to={to} className="block border-l-2 border-transparent py-2 pl-2 text-ink-600 transition hover:border-accent hover:text-accent">
          {label}
        </Link>
      </li>
    ))}
  </ul>
);

const Footer = () => (
  <footer className="mt-auto border-t border-line-200 bg-surface-0">
    <div className="mx-auto max-w-6xl px-5">
      <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900">
              <TrainFront strokeWidth={1.75} size={24} className="text-white" />
            </div>
            <span className="font-sans text-xl font-bold text-accent">Ahmedabad Metro</span>
          </div>
          <p className="mt-4 max-w-[280px] leading-relaxed text-ink-600">
            Making urban transportation efficient, sustainable, and accessible for everyone in Ahmedabad.
          </p>
        </div>

        <nav aria-label="Quick links">
          <FooterHeading>Quick links</FooterHeading>
          <FooterLinks links={QUICK_LINKS} />
        </nav>

        <nav aria-label="Network and services">
          <FooterHeading>Network &amp; services</FooterHeading>
          <FooterLinks links={NETWORK_LINKS} />
        </nav>

        <div>
          <FooterHeading>Follow us</FooterHeading>
          <div className="mt-3 flex gap-3">
            {SOCIALS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-line-200 bg-surface-1 text-accent transition hover:bg-navy-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>

          <div className="mt-5 space-y-2 text-sm text-ink-600">
            <p className="flex items-center gap-2 font-mono tabular-nums">
              <Phone size={16} strokeWidth={1.75} className="text-accent" /> +91-79-23248572
            </p>
            <p className="flex items-center gap-2">
              <Mail size={16} strokeWidth={1.75} className="text-accent" /> info@gujaratmetrorail.com
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-line-200 py-6">
        <VisitCounter />
        <p className="text-center text-sm text-ink-600">
          © {new Date().getFullYear()} Ahmedabad Metro. All rights reserved. Created by{' '}
          <a
            href="https://github.com/AnshBhavsar1654"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Ansh
          </a>
          .
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
