import React, { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './components/Home';
import RoutesInfo from './components/RoutesInfo';
import Stations from './components/Stations';
import Contact from './components/Contact';
import Schedule from './components/Schedule';
import NearestStations from './components/NearestStations';
import StationInfo from './components/StationInfo';
import Facilities from './components/Facilities';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <div className="flex min-h-screen flex-col">
        <ScrollToTop />
        <Navbar />
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/routes" element={<RoutesInfo />} />
            <Route path="/stations" element={<Stations />} />
            <Route path="/nearest-stations" element={<NearestStations />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/stations-info" element={<StationInfo />} />
            <Route path="/facilities" element={<Facilities />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <ChatWidget />
      </div>
    </Router>
  );
}

export default App;
