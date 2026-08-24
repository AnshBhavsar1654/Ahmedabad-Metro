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
        <footer className="mt-auto bg-white/95 backdrop-blur-xl border-t border-black/10 shadow-[0_-2px_16px_rgba(0,0,0,0.07)] relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent" />

          <div className="mx-auto max-w-6xl px-5">
            <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
                    <FaTrain className="text-white text-2xl" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-br from-brand-800 to-brand-500 bg-clip-text text-transparent">
                    Ahmedabad Metro
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed max-w-[280px]">
                  Making urban transportation efficient, sustainable, and accessible for everyone in Ahmedabad.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-slate-700 relative pb-2">
                  Quick Links
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-8 rounded bg-gradient-to-r from-brand-500 to-brand-700" />
                </h3>
                <div className="flex flex-col">
                  <Link to="/" className="py-2 pl-2 border-l-2 border-transparent text-slate-500 hover:text-brand-600 hover:border-brand-500 hover:translate-x-1 transition">Home</Link>
                  <Link to="/routes" className="py-2 pl-2 border-l-2 border-transparent text-slate-500 hover:text-brand-600 hover:border-brand-500 hover:translate-x-1 transition">Plan Journey</Link>
                  <Link to="/schedule" className="py-2 pl-2 border-l-2 border-transparent text-slate-500 hover:text-brand-600 hover:border-brand-500 hover:translate-x-1 transition">Schedule</Link>
                  <Link to="/contact" className="py-2 pl-2 border-l-2 border-transparent text-slate-500 hover:text-brand-600 hover:border-brand-500 hover:translate-x-1 transition">Contact</Link>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-slate-700 relative pb-2">
                  Network & Services
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-8 rounded bg-gradient-to-r from-brand-500 to-brand-700" />
                </h3>
                <div className="flex flex-col">
                  <Link to="/stations" className="py-2 pl-2 border-l-2 border-transparent text-slate-500 hover:text-brand-600 hover:border-brand-500 hover:translate-x-1 transition">Stations</Link>
                  <Link to="/nearest-stations" className="py-2 pl-2 border-l-2 border-transparent text-slate-500 hover:text-brand-600 hover:border-brand-500 hover:translate-x-1 transition">Nearest Stations</Link>
                  <Link to="/stations-info" className="py-2 pl-2 border-l-2 border-transparent text-slate-500 hover:text-brand-600 hover:border-brand-500 hover:translate-x-1 transition">Stations Info</Link>
                  <Link to="/facilities" className="py-2 pl-2 border-l-2 border-transparent text-slate-500 hover:text-brand-600 hover:border-brand-500 hover:translate-x-1 transition">Facilities</Link>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-slate-700 relative pb-2">
                  Socials
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-8 rounded bg-gradient-to-r from-brand-500 to-brand-700" />
                </h3>

                <div className="flex gap-4">
                  <a
                    href="https://www.facebook.com/MetroGMRC"
                    className="h-11 w-11 rounded-xl flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2] hover:text-white hover:-translate-y-0.5 transition"
                    aria-label="Facebook"
                  >
                    <FaFacebookF style={iconStyle} />
                  </a>
                  <a
                    href="https://x.com/@MetroGMRC"
                    className="h-11 w-11 rounded-xl flex items-center justify-center bg-black/5 border border-black/20 text-black hover:bg-black hover:text-white hover:-translate-y-0.5 transition"
                    aria-label="X"
                  >
                    <FaXTwitter style={iconStyle} />
                  </a>
                  <a
                    href="https://www.instagram.com/MetroGMRC/"
                    className="h-11 w-11 rounded-xl flex items-center justify-center bg-[#E1306C]/10 border border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C] hover:text-white hover:-translate-y-0.5 transition"
                    aria-label="Instagram"
                  >
                    <FaInstagram style={iconStyle} />
                  </a>
                  <a
                    href="https://www.youtube.com/@MetroGMRC"
                    className="h-11 w-11 rounded-xl flex items-center justify-center bg-[#FF0000]/10 border border-[#FF0000]/30 text-[#FF0000] hover:bg-[#FF0000] hover:text-white hover:-translate-y-0.5 transition"
                    aria-label="YouTube"
                  >
                    <FaYoutube style={iconStyle} />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/metrogmrc"
                    className="h-11 w-11 rounded-xl flex items-center justify-center bg-[#0A66C2]/10 border border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white hover:-translate-y-0.5 transition"
                    aria-label="LinkedIn"
                  >
                    <FaLinkedinIn style={iconStyle} />
                  </a>
                </div>

                <div className="space-y-2 text-slate-500">
                  <p className="flex items-center gap-2">
                    <FaPhoneAlt className="text-brand-500" />
                    +91-79-23248572
                  </p>
                  <p className="flex items-center gap-2">
                    <FaEnvelope className="text-brand-500" />
                    info@gujaratmetrorail.com
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-black/10 py-6">
              <p className="text-center text-slate-500">© 2025 Ahmedabad Metro. All rights reserved.</p>
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