import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes, useLocation } from 'react-router-dom';
import Home from './components/Home';
import RoutesInfo from './components/RoutesInfo';
import Stations from './components/Stations';
import Contact from './components/Contact';
import Schedule from './components/Schedule';
import NearestStations from './components/NearestStations';
import StationInfo from './components/StationInfo';
import Facilities from './components/Facilities';
import { FaTrain, FaPhoneAlt, FaEnvelope, FaFacebookF, FaInstagram, FaYoutube, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';

// Component to handle scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const iconStyle = { color: 'white', fontSize: '24px' };

  useEffect(() => {
    // Log environment variable during app load
    console.log("API BASE URL:", process.env.REACT_APP_API_BASE_URL);
  }, []);

  const AppLayout = () => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    return (
      <div className="min-h-screen flex flex-col">
        <ScrollToTop />
        <Navbar />
        <main className={isHomePage ? 'flex-1' : 'flex-1 pt-20'}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/routes" element={<RoutesInfo />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/nearest-stations" element={<NearestStations />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/stations-info" element={<StationInfo />} />
            <Route path="/facilities" element={<Facilities />} />
          </Routes>
        </main>
        <footer className="mt-auto bg-surface-0 border-t border-line-200 relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-900">
                    <FaTrain className="text-white text-2xl" />
                  </div>
                  <span className="text-xl font-bold text-navy-900">
                    Ahmedabad Metro
                  </span>
                </div>
                <p className="text-ink-600 leading-relaxed max-w-[280px]">
                  Making urban transportation efficient, sustainable, and accessible for everyone in Ahmedabad.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-ink-900 relative pb-2">
                  Quick Links
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-8 rounded bg-navy-900" />
                </h3>
                <div className="flex flex-col">
                  <Link to="/" className="py-2 pl-2 border-l-2 border-transparent text-ink-600 hover:text-navy-900 hover:border-navy-900 transition">Home</Link>
                  <Link to="/routes" className="py-2 pl-2 border-l-2 border-transparent text-ink-600 hover:text-navy-900 hover:border-navy-900 transition">Plan Journey</Link>
                  <Link to="/schedule" className="py-2 pl-2 border-l-2 border-transparent text-ink-600 hover:text-navy-900 hover:border-navy-900 transition">Schedule</Link>
                  <Link to="/contact" className="py-2 pl-2 border-l-2 border-transparent text-ink-600 hover:text-navy-900 hover:border-navy-900 transition">Contact</Link>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-ink-900 relative pb-2">
                  Network & Services
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-8 rounded bg-navy-900" />
                </h3>
                <div className="flex flex-col">
                  <Link to="/stations" className="py-2 pl-2 border-l-2 border-transparent text-ink-600 hover:text-navy-900 hover:border-navy-900 transition">Stations</Link>
                  <Link to="/nearest-stations" className="py-2 pl-2 border-l-2 border-transparent text-ink-600 hover:text-navy-900 hover:border-navy-900 transition">Nearest Stations</Link>
                  <Link to="/stations-info" className="py-2 pl-2 border-l-2 border-transparent text-ink-600 hover:text-navy-900 hover:border-navy-900 transition">Stations Info</Link>
                  <Link to="/facilities" className="py-2 pl-2 border-l-2 border-transparent text-ink-600 hover:text-navy-900 hover:border-navy-900 transition">Facilities</Link>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-ink-900 relative pb-2">
                  Socials
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-8 rounded bg-navy-900" />
                </h3>

                <div className="flex gap-4">
                  <a
                    href="https://www.facebook.com/MetroGMRC"
                    className="h-11 w-11 rounded-md flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition"
                    aria-label="Facebook"
                  >
                    <FaFacebookF style={iconStyle} />
                  </a>
                  <a
                    href="https://x.com/@MetroGMRC"
                    className="h-11 w-11 rounded-md flex items-center justify-center bg-black/5 border border-black/20 text-black hover:bg-black hover:text-white transition"
                    aria-label="X"
                  >
                    <FaXTwitter style={iconStyle} />
                  </a>
                  <a
                    href="https://www.instagram.com/MetroGMRC/"
                    className="h-11 w-11 rounded-md flex items-center justify-center bg-[#E1306C]/10 border border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C] hover:text-white transition"
                    aria-label="Instagram"
                  >
                    <FaInstagram style={iconStyle} />
                  </a>
                  <a
                    href="https://www.youtube.com/@MetroGMRC"
                    className="h-11 w-11 rounded-md flex items-center justify-center bg-[#FF0000]/10 border border-[#FF0000]/30 text-[#FF0000] hover:bg-[#FF0000] hover:text-white transition"
                    aria-label="YouTube"
                  >
                    <FaYoutube style={iconStyle} />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/metrogmrc"
                    className="h-11 w-11 rounded-md flex items-center justify-center bg-[#0A66C2]/10 border border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition"
                    aria-label="LinkedIn"
                  >
                    <FaLinkedinIn style={iconStyle} />
                  </a>
                </div>

                <div className="space-y-2 text-ink-600 font-mono text-sm">
                  <p className="flex items-center gap-2">
                    <FaPhoneAlt className="text-navy-900" />
                    +91-79-23248572
                  </p>
                  <p className="flex items-center gap-2 font-sans">
                    <FaEnvelope className="text-navy-900" />
                    info@gujaratmetrorail.com
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-line-200 py-6">
              <p className="text-center text-ink-600">© 2026 Ahmedabad Metro. All rights reserved.</p>
            </div>
          </div>
        </footer>
        <ChatWidget />
      </div>
    );
  };

  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;