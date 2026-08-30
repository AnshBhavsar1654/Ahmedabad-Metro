import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TicketCheck, CreditCard, Users, Smartphone, Map, MapPin, CalendarClock, Route } from 'lucide-react';

const Home = () => {
  const [temperature, setTemperature] = useState({ current: '--', condition: 'Loading...' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkScreenSize = () => setIsSmallScreen(window.innerWidth <= 480);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const weatherApiKey = process.env.REACT_APP_WEATHER_API_KEY;
        const weatherCity = process.env.REACT_APP_WEATHER_CITY || 'Ahmedabad,IN';
        
        if (!weatherApiKey) {
          setTemperature({ current: 32, condition: 'Sunny' });
          return;
        }

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${weatherCity}&appid=${weatherApiKey}&units=metric`
        );
        
        if (response.ok) {
          const data = await response.json();
          setTemperature({
            current: Math.round(data.main.temp),
            condition: data.weather[0].main
          });
        } else {
          setTemperature({ current: 32, condition: 'Sunny' });
        }
      } catch (error) {
        setTemperature({ current: 32, condition: 'Sunny' });
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 600000);
    return () => clearInterval(weatherTimer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getWeatherIcon = (condition) => {
    const iconMap = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Haze': '🌫️',
      'Sunny': '☀️'
    };
    return iconMap[condition] || '☀️';
  };

  const getBgImage = (hour) => {
    if (hour >= 5 && hour < 17) {
      return "/afternoon.png";
    } else if (hour >= 17 && hour < 20) {
      return "/evening.png";
    } else {
      return "/cover.png";
    }
  };

  const bgImage = getBgImage(currentTime.getHours());

  const accessCards = [
    { to: "/routes", icon: <Route size={24} className="text-white" />, title: "Route Planning", subtitle: "Plan Journey" },
    { to: "/stations", icon: <Map size={24} className="text-white" />, title: "Metro Map", subtitle: "Network" },
    { to: "/nearest-stations", icon: <MapPin size={24} className="text-white" />, title: "Nearest", subtitle: "Find Stations" },
    { to: "/schedule", icon: <CalendarClock size={24} className="text-white" />, title: "Schedule", subtitle: "Timetable" }
  ];

  return (
    <div className="w-full bg-surface-0 min-h-screen flex flex-col">
      
      {/* Hero Section */}
      <section className="relative min-h-screen w-full overflow-hidden flex flex-col">
        <img className="absolute inset-0 h-full w-full object-cover brightness-50" src={bgImage} alt="Metro Cover" />
        
        {/* We need pt-20 to account for fixed navbar */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-20">
          <div className="w-full max-w-3xl text-center text-white">
            <h1 className="text-4xl sm:text-5xl font-sans font-light bg-gradient-to-r from-white to-amber-300 bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              Welcome to Ahmedabad Metro
            </h1>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
              <div>
                <div className="text-sm font-sans text-white/90">{formatDate(currentTime)}</div>
                <div className="mt-1 text-2xl font-mono font-semibold drop-shadow-md">{formatTime(currentTime)}</div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-2xl drop-shadow-md">{getWeatherIcon(temperature.condition)}</div>
                <div className="text-left">
                  <div className="text-xl font-mono font-semibold drop-shadow-md">
                    {temperature.current}°C
                  </div>
                  <div className="text-sm font-sans text-white/80">Ahmedabad</div>
                </div>
              </div>
            </div>

            <div className="mt-16">
              <h3 className="text-base font-semibold font-sans text-white/90">Frequently Used</h3>
              <div className={isSmallScreen ? 'mt-4 flex gap-3 overflow-x-auto pb-2 justify-start hide-scrollbar' : 'mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4'}>
                {accessCards.map((card, index) => (
                  <Link
                    key={index}
                    to={card.to}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-5 text-center shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/20"
                  >
                    <div>{card.icon}</div>
                    <div>
                      <h4 className="text-sm font-sans font-semibold drop-shadow">{card.title}</h4>
                      {card.subtitle && <p className="text-[11px] font-sans text-white/70">{card.subtitle}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlighted Statistics Section */}
      <section className="px-5 py-16 bg-surface-0 border-t border-line-200">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { n: '54', l: 'Total Stations' },
              { n: '54', l: 'Operational' },
              { n: '68.28', l: 'Network (Km)' },
              { n: '118K+', l: 'Daily Passengers' }
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-line-200 bg-surface-1 p-6 text-center">
                <div className="text-4xl font-mono text-navy-900 font-bold">{s.n}</div>
                <div className="mt-2 text-xs font-sans font-semibold tracking-widest text-ink-600 uppercase">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ticket Booking Methods */}
      <section className="px-5 py-16 bg-surface-0">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-surface-1 p-6 text-center border border-line-200">
              <div className="flex justify-center text-navy-900 mb-4"><TicketCheck strokeWidth={1.5} size={36} /></div>
              <h3 className="text-base font-semibold text-ink-900 font-sans">Ticket Vending Machine</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">Self-service machines at all stations</p>
            </div>

            <div className="rounded-lg bg-surface-1 p-6 text-center border border-line-200">
              <div className="flex justify-center text-navy-900 mb-4"><CreditCard strokeWidth={1.5} size={36} /></div>
              <h3 className="text-base font-semibold text-ink-900 font-sans">NCMC Smart Card</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">Contactless payment solution</p>
            </div>

            <div className="rounded-lg bg-surface-1 p-6 text-center border border-line-200">
              <div className="flex justify-center text-navy-900 mb-4"><Users strokeWidth={1.5} size={36} /></div>
              <h3 className="text-base font-semibold text-ink-900 font-sans">KIOSK Counter</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">Assisted service with staff support</p>
            </div>

            <div className="rounded-lg bg-surface-1 p-6 text-center border border-line-200">
              <div className="flex justify-center text-navy-900 mb-4"><Smartphone strokeWidth={1.5} size={36} /></div>
              <h3 className="text-base font-semibold text-ink-900 font-sans">E-Ticket (Mobile App)</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">Book e-tickets on your smartphone</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <a
                  href="https://play.google.com/store/apps/details?id=com.gujaratmetrorail.gmrcamddigitalticketing&hl=en_IN&pli=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-1 transition hover:bg-line-100"
                >
                  <img src="https://freelogopng.com/images/all_img/1664285914google-play-logo-png.png" alt="Android" className="h-5 w-5 opacity-80 hover:opacity-100" />
                </a>
                <a
                  href="https://apps.apple.com/in/app/ahmedabad-metro-official-app/id6670203895"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-1 transition hover:bg-line-100"
                >
                  <img src="https://seekvectors.com/files/download/f1f44e5b764dd072f4f711f1c079fe60.jpg" alt="iOS" className="h-5 w-5 opacity-80 hover:opacity-100" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;