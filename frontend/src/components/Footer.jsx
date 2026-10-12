import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, TrainFront } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaYoutube, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

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

      <div className="border-t border-line-200 py-6">
        <p className="text-center text-sm text-ink-600">© {new Date().getFullYear()} Ahmedabad Metro. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
