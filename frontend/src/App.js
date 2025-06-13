import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes, useLocation } from 'react-router-dom';
import './styles/navbar.css';
import './styles/footer.css';
import './styles/main.css';
import Home from './components/Home';
import RoutesInfo from './components/RoutesInfo';
import Stations from './components/Stations';
import Contact from './components/Contact';
import Chat from './components/Chat';
import Schedule from './components/Schedule';
import NearestStations from './components/NearestStations';
import StationInfo from './components/StationInfo';
import Facilities from './components/Facilities';
import { FaHome, FaMapMarkedAlt, FaTrain, FaClock, FaPhoneAlt, FaComments, FaInfoCircle, FaEnvelope, FaFacebookF, FaTwitter, FaInstagram, FaYoutube, FaLinkedinIn } from 'react-icons/fa';
import { MdElevator } from "react-icons/md";

// Navbar component with active link detection
function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className={`enhanced-navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <div className="logo-icon">
            <FaTrain style={{ color: 'white', fontSize: '24px' }} />
          </div>
          <span className="logo-text">Ahmedabad Metro</span>
        </Link>
        
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link 
            to="/" 
            className={`nav-link ${isActiveLink('/') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon"><FaHome /></span>
            Home
          </Link>
          <Link 
            to="/routes" 
            className={`nav-link ${isActiveLink('/routes') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon"><FaMapMarkedAlt /></span>
            Plan Journey
          </Link>
          <Link 
            to="/facilities" 
            className={`nav-link ${isActiveLink('/facilities') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon"><MdElevator /></span>
            Facilities
          </Link>
          <Link 
            to="/schedule" 
            className={`nav-link ${isActiveLink('/schedule') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon"><FaClock /></span>
            Schedule
          </Link>
          <Link 
            to="/contact" 
            className={`nav-link ${isActiveLink('/contact') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon"><FaPhoneAlt /></span>
            Contact
          </Link>
          <Link 
            to="/stations-info" 
            className={`nav-link ${isActiveLink('/stations-info') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon"><FaInfoCircle /></span>
            Stations Info
          </Link>
          <Link 
            to="/chat" 
            className={`nav-link ${isActiveLink('/chat') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <span className="nav-icon"><FaComments /></span>
            Chat
          </Link>
        </div>
        
        <div className="nav-extras">
          
          <button className="menu-toggle" onClick={toggleMenu}>
            <span className={`hamburger ${isMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="menu-text">Menu</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

function App() {
  const iconStyle = { color: 'white', fontSize: '24px' };
  
  return (
    <Router>
      <div className="App">
        <Navbar />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/routes" element={<RoutesInfo />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/nearest-stations" element={<NearestStations />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/stations-info" element={<StationInfo />} />
            <Route path="/facilities" element={<Facilities />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </main>

        <footer className="enhanced-footer">
          <div className="footer-container">
            <div className="footer-content">
              <div className="footer-section">
                <div className="footer-logo">
                  <FaTrain style={{ color: 'white', fontSize: '24px' }} />
                  <span className="logo-text">Ahmedabad Metro</span>
                </div>
                <p className="footer-description">
                  Making urban transportation efficient, sustainable, and accessible for everyone in Ahmedabad.
                </p>
              </div>

              <div className="footer-section">
                <h3 className="footer-title">Quick Links</h3>
                <div className="footer-links">
                  <Link to="/" className="footer-link">Home</Link>
                  <Link to="/routes" className="footer-link">Plan Journey</Link>
                  <Link to="/stations" className="footer-link">Stations</Link>
                  <Link to="/schedule" className="footer-link">Schedule</Link>
                </div>
              </div>

              <div className="footer-section">
                <h3 className="footer-title">Services</h3>
                <div className="footer-links">
                  <Link to="/nearest-stations" className="footer-link">Nearest Stations</Link>
                  <Link to="/chat" className="footer-link">Chat Support</Link>
                  <Link to="/contact" className="footer-link">Contact Us</Link>
                </div>
              </div>
              
              <div className="footer-section">
                <h3 className="footer-title">Socials</h3>
                <div className="footer-social">
                  <a href="https://www.facebook.com/MetroGMRC" className="social-link" aria-label="Facebook" color='white'>
                    <FaFacebookF style={iconStyle} />
                  </a>
                  <a href="https://x.com/@MetroGMRC" className="social-link" aria-label="Twitter">
                    <FaTwitter style={iconStyle} />
                  </a>
                  <a href="https://www.instagram.com/MetroGMRC/" className="social-link" aria-label="Instagram">
                    <FaInstagram style={iconStyle} />
                  </a>
                  <a href="https://www.youtube.com/@MetroGMRC" className="social-link" aria-label="YouTube">
                    <FaYoutube style={iconStyle} />
                  </a>
                  <a href="https://www.linkedin.com/company/metrogmrc" className="social-link" aria-label="LinkedIn">
                    <FaLinkedinIn style={iconStyle} />
                  </a>
                </div>
                <div className="footer-contact">
                  <p>
                    <FaPhoneAlt style={{ marginRight: '8px', color: 'white' }} />
                    +91-79-23248572
                  </p>
                  <p>
                    <FaEnvelope style={{ marginRight: '8px', color: 'white' }} />
                    info@gujaratmetrorail.com
                  </p>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <div className="footer-bottom-content">
                <p>&copy; 2025 Ansh Bhavsar. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;