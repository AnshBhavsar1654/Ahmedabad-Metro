import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaMapMarkedAlt, FaClock, FaPhoneAlt, FaInfoCircle } from 'react-icons/fa';
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

  return (
    <nav className={`navbar ${isScrolled || !isHomePage ? 'scrolled solid-navbar' : 'transparent-navbar'}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
         <img src="/logo.png" alt="Ahmedabad Metro Logo" className="logo-icon" />
          <span className="logo-text">Ahmedabad Metro</span>
        </Link>

        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className={`nav-link ${isActiveLink('/') ? 'active' : ''}`} onClick={closeMenu}><FaHome /> Home</Link>
          <Link to="/routes" className={`nav-link ${isActiveLink('/routes') ? 'active' : ''}`} onClick={closeMenu}><FaMapMarkedAlt /> Plan Journey</Link>
          <Link to="/facilities" className={`nav-link ${isActiveLink('/facilities') ? 'active' : ''}`} onClick={closeMenu}><MdElevator /> Facilities</Link>
          <Link to="/schedule" className={`nav-link ${isActiveLink('/schedule') ? 'active' : ''}`} onClick={closeMenu}><FaClock /> Schedule</Link>
          <Link to="/contact" className={`nav-link ${isActiveLink('/contact') ? 'active' : ''}`} onClick={closeMenu}><FaPhoneAlt /> Contact</Link>
          <Link to="/stations-info" className={`nav-link ${isActiveLink('/stations-info') ? 'active' : ''}`} onClick={closeMenu}><FaInfoCircle /> Stations Info</Link>
          {/* <Link to="/chat" className={`nav-link ${isActiveLink('/chat') ? 'active' : ''}`} onClick={closeMenu}><FaComments /> Chat</Link> */}
        </div>

        <button className="menu-toggle" onClick={toggleMenu}>
          <div className={`hamburger ${isMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="menu-text">Menu</span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;