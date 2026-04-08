import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaMapMarkedAlt,
  FaClock,
  FaPhoneAlt,
  FaInfoCircle,
  FaTrain,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { MdElevator } from 'react-icons/md';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // run once initially

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    closeMenu(); // Close menu on route change
  }, [location]);

  const isActiveLink = (path) => location.pathname === path;

  const isSolid = isScrolled || !isHomePage;

  const baseLinkClass =
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap';

  const linkClass = (path) =>
    `${baseLinkClass} ${
      isActiveLink(path)
        ? 'bg-brand-800 text-white'
        : isSolid
          ? 'text-slate-900 hover:bg-brand-700/10'
          : 'text-white hover:bg-brand-700/15'
    }`;

  return (
    <nav
      className={
        `fixed top-0 z-[2000] w-full transition-all duration-300 ` +
        (isSolid
          ? 'bg-white/90 backdrop-blur-md border-b border-black/10 shadow-lg'
          : 'bg-transparent')
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 min-h-[64px]">
        <Link to="/" className={isSolid ? 'flex items-center gap-2 no-underline text-slate-900' : 'flex items-center gap-2 no-underline text-white'} onClick={closeMenu}>
          <img src="/logo.png" alt="Ahmedabad Metro Logo" className="h-10 w-10" />
          <span className="font-bold text-lg">Ahmedabad Metro</span>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/" className={linkClass('/')} onClick={closeMenu}><FaHome /> Home</Link>
          <Link to="/routes" className={linkClass('/routes')} onClick={closeMenu}><FaMapMarkedAlt /> Plan Journey</Link>
          <Link to="/stations" className={linkClass('/stations')} onClick={closeMenu}><FaTrain /> Metro Map</Link>
          <Link to="/nearest-stations" className={linkClass('/nearest-stations')} onClick={closeMenu}><FaMapMarkerAlt /> Nearest Stations</Link>
          <Link to="/facilities" className={linkClass('/facilities')} onClick={closeMenu}><MdElevator /> Facilities</Link>
          <Link to="/schedule" className={linkClass('/schedule')} onClick={closeMenu}><FaClock /> Schedule</Link>
          <Link to="/contact" className={linkClass('/contact')} onClick={closeMenu}><FaPhoneAlt /> Contact</Link>
          <Link to="/stations-info" className={linkClass('/stations-info')} onClick={closeMenu}><FaInfoCircle /> Stations Info</Link>
        </div>

        <button
          type="button"
          className={
            `md:hidden inline-flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition ` +
            (isSolid ? 'text-slate-900' : 'text-white')
          }
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <div className="flex flex-col justify-between h-4">
            <span className={`block h-0.5 w-6 rounded transition-all duration-300 ${isSolid ? 'bg-slate-900' : 'bg-white'} ${isMenuOpen ? 'translate-y-[6px] rotate-45' : ''}`} />
            <span className={`block h-0.5 w-6 rounded transition-all duration-300 ${isSolid ? 'bg-slate-900' : 'bg-white'} ${isMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-6 rounded transition-all duration-300 ${isSolid ? 'bg-slate-900' : 'bg-white'} ${isMenuOpen ? '-translate-y-[6px] -rotate-45' : ''}`} />
          </div>
          <span className="text-[10px] mt-1">Menu</span>
        </button>
      </div>

      <div
        className={
          `md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ` +
          (isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0')
        }
      >
        <div
          className={
            `mx-5 mb-4 rounded-xl border p-2 ` +
            (isSolid
              ? 'bg-white border-black/10 shadow'
              : 'bg-white/10 border-white/20 backdrop-blur-md')
          }
        >
          <Link to="/" className={linkClass('/')} onClick={closeMenu}><FaHome /> Home</Link>
          <Link to="/routes" className={linkClass('/routes')} onClick={closeMenu}><FaMapMarkedAlt /> Plan Journey</Link>
          <Link to="/stations" className={linkClass('/stations')} onClick={closeMenu}><FaTrain /> Stations</Link>
          <Link to="/nearest-stations" className={linkClass('/nearest-stations')} onClick={closeMenu}><FaMapMarkerAlt /> Nearest Stations</Link>
          <Link to="/facilities" className={linkClass('/facilities')} onClick={closeMenu}><MdElevator /> Facilities</Link>
          <Link to="/schedule" className={linkClass('/schedule')} onClick={closeMenu}><FaClock /> Schedule</Link>
          <Link to="/contact" className={linkClass('/contact')} onClick={closeMenu}><FaPhoneAlt /> Contact</Link>
          <Link to="/stations-info" className={linkClass('/stations-info')} onClick={closeMenu}><FaInfoCircle /> Stations Info</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;