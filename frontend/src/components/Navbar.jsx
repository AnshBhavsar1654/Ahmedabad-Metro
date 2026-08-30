import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Route,
  TrainFront,
  MapPin,
  Accessibility,
  Clock,
  Phone,
  Info,
  Menu,
  X
} from 'lucide-react';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    closeMenu(); // Close menu on route change
  }, [location]);

  const isActiveLink = (path) => location.pathname === path;

  const baseLinkClass =
    'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap';

  const linkClass = (path) =>
    `${baseLinkClass} ${
      isActiveLink(path)
        ? 'border-b-2 border-white text-white'
        : 'text-white/70 hover:text-white border-b-2 border-transparent'
    }`;

  const mobileLinkClass = (path) =>
    `flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors border-b border-white/10 ${
      isActiveLink(path)
        ? 'text-white bg-navy-700'
        : 'text-white/70 hover:text-white hover:bg-navy-700/50'
    }`;

  const iconProps = { strokeWidth: 1.75, size: 20 };

  return (
    <nav className="fixed top-0 z-[2000] w-full bg-navy-900 border-b border-navy-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 min-h-[64px]">
        <Link to="/" className="flex items-center gap-2 no-underline text-white" onClick={closeMenu}>
          <img src="/logo.png" alt="Ahmedabad Metro Logo" className="h-10 w-10" />
          <span className="font-bold text-lg font-sans">Ahmedabad Metro</span>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/" className={linkClass('/')} onClick={closeMenu}><Home {...iconProps} /> Home</Link>
          <Link to="/routes" className={linkClass('/routes')} onClick={closeMenu}><Route {...iconProps} /> Plan Journey</Link>
          <Link to="/stations" className={linkClass('/stations')} onClick={closeMenu}><TrainFront {...iconProps} /> Metro Map</Link>
          <Link to="/nearest-stations" className={linkClass('/nearest-stations')} onClick={closeMenu}><MapPin {...iconProps} /> Nearest Stations</Link>
          <Link to="/facilities" className={linkClass('/facilities')} onClick={closeMenu}><Accessibility {...iconProps} /> Facilities</Link>
          <Link to="/schedule" className={linkClass('/schedule')} onClick={closeMenu}><Clock {...iconProps} /> Schedule</Link>
          <Link to="/contact" className={linkClass('/contact')} onClick={closeMenu}><Phone {...iconProps} /> Contact</Link>
          <Link to="/stations-info" className={linkClass('/stations-info')} onClick={closeMenu}><Info {...iconProps} /> Stations Info</Link>
        </div>

        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-navy-700 transition"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X {...iconProps} /> : <Menu {...iconProps} />}
        </button>
      </div>

      <div
        className={
          `lg:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out bg-navy-900 ` +
          (isMenuOpen ? 'max-h-[500px]' : 'max-h-0')
        }
      >
        <div className="flex flex-col pb-4">
          <Link to="/" className={mobileLinkClass('/')} onClick={closeMenu}><Home {...iconProps} /> Home</Link>
          <Link to="/routes" className={mobileLinkClass('/routes')} onClick={closeMenu}><Route {...iconProps} /> Plan Journey</Link>
          <Link to="/stations" className={mobileLinkClass('/stations')} onClick={closeMenu}><TrainFront {...iconProps} /> Metro Map</Link>
          <Link to="/nearest-stations" className={mobileLinkClass('/nearest-stations')} onClick={closeMenu}><MapPin {...iconProps} /> Nearest Stations</Link>
          <Link to="/facilities" className={mobileLinkClass('/facilities')} onClick={closeMenu}><Accessibility {...iconProps} /> Facilities</Link>
          <Link to="/schedule" className={mobileLinkClass('/schedule')} onClick={closeMenu}><Clock {...iconProps} /> Schedule</Link>
          <Link to="/contact" className={mobileLinkClass('/contact')} onClick={closeMenu}><Phone {...iconProps} /> Contact</Link>
          <Link to="/stations-info" className={mobileLinkClass('/stations-info')} onClick={closeMenu}><Info {...iconProps} /> Stations Info</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;