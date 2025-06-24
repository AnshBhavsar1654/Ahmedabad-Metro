import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
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
import {FaTrain, FaPhoneAlt, FaEnvelope, FaFacebookF, FaTwitter, FaInstagram, FaYoutube, FaLinkedinIn } from 'react-icons/fa';
import Navbar from './components/Navbar';

function App() {
  const iconStyle = { color: 'white', fontSize: '24px' };

  useEffect(() => {
    // Log environment variable during app load
    console.log("API BASE URL:", process.env.REACT_APP_API_BASE_URL);

    // Dynamically load Botpress 
    const injectScript = document.createElement('script');
    injectScript.src = 'https://cdn.botpress.cloud/webchat/v3.0/inject.js';
    injectScript.async = true;
    document.body.appendChild(injectScript);

    const configScript = document.createElement('script');
    configScript.src = 'https://files.bpcontent.cloud/2025/06/23/12/20250623123006-KM1HLTXZ.js';
    configScript.async = true;
    document.body.appendChild(configScript);

    // Cleanup scripts on component unmount
    return () => {
      document.body.removeChild(injectScript);
      document.body.removeChild(configScript);
    };
  }, []);

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
                <p>© 2025 Ahmedabad Metro. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
