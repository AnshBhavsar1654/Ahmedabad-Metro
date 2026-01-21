import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkedAlt } from 'react-icons/fa';
import { HiOutlineMap } from 'react-icons/hi';
import { MdLocationOn } from 'react-icons/md';
import { MdSchedule } from 'react-icons/md';

const Home = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [temperature, setTemperature] = useState({ current: '--', high: '--', condition: 'Loading...' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 480);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          "https://api.openweathermap.org/data/2.5/weather?q=Ahmedabad,IN&appid=502bb8635ab3708269a5f468827d3841&units=metric"
        );
        
        if (response.ok) {
          const data = await response.json();
          setTemperature({
            current: Math.round(data.main.temp),
            high: Math.round(data.main.temp_max * 1.8 + 32),
            condition: data.weather[0].main
          });
        } else {
          setTemperature({ current: 32, high: 90, condition: 'Sunny' });
        }
      } catch (error) {
        console.error('Weather fetch failed:', error);
        setTemperature({ current: 32, high: 90, condition: 'Sunny' });
      } finally {
        setIsLoading(false);
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

  // Updated function to determine background image based on new time periods
  const getBgImage = (hour) => {
    if (hour >= 5 && hour < 17) {
      return "/afternoon.png";
    } else if (hour >= 17 && hour < 20) {
      return "/evening.png";
    } else {
      return "/cover.png";
    }
  };

  // Compute the background image using current time
  const bgImage = getBgImage(currentTime.getHours());

  const accessCards = [
    {
      to: "/routes",
      icon: <FaMapMarkedAlt style={{ color: 'white', fontSize: '24px' }} />,
      title: "Route Planning",
      subtitle: "Plan Journey"
    },
    {
      to: "/stations",
      icon: <HiOutlineMap style={{ color: 'white', fontSize: '24px' }} />,
      title: "Metro Map",
      subtitle: ""
    },
    {
      to: "/nearest-stations",
      icon: <MdLocationOn size={28} color="white" />,
      title: "Nearest",
      subtitle: "Find Stations"
    },
    {
      to: "/schedule",
      icon: <MdSchedule size={28} color="white" />,
      title: "Metro Schedule",
      subtitle: "Timetable"
    }
  ];

  const renderAccessCards = () => {
    return accessCards.map((card, index) => (
      <Link
        key={index}
        to={card.to}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-4 text-center text-white shadow-[0_8px_32px_rgba(31,38,135,0.37)] backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/25"
      >
        <div className="text-2xl">{card.icon}</div>
        <div>
          <h4 className="text-sm font-semibold drop-shadow">{card.title}</h4>
          {card.subtitle && <p className="text-xs text-white/80">{card.subtitle}</p>}
        </div>
      </Link>
    ));
  };

  return (
    <div className="w-full">
      <section className="relative min-h-screen w-full overflow-hidden">
        <img className="absolute inset-0 h-full w-full object-cover brightness-50" src={bgImage} alt="Metro Cover" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-16">
          <div className="w-full max-w-3xl text-center text-white">
            <h1 className="text-4xl sm:text-5xl font-extralight bg-gradient-to-r from-white to-amber-300 bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              Welcome to Ahmedabad Metro
            </h1>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
              <div>
                <div className="text-sm text-white/90">{formatDate(currentTime)}</div>
                <div className="mt-1 text-2xl font-semibold">{formatTime(currentTime)}</div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-2xl">{getWeatherIcon(temperature.condition)}</div>
                <div className="text-left">
                  <div className="text-xl font-semibold">
                    {isLoading ? '--' : `${temperature.current}°C`}
                    <span className="text-sm text-white/80">{isLoading ? '' : ` / ${temperature.high}°F`}</span>
                  </div>
                  <div className="text-sm text-white/80">Ahmedabad</div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-base font-semibold text-white/90">Frequently Used</h3>

              <div className={isSmallScreen ? 'mt-4 flex gap-3 overflow-x-auto pb-2 justify-start' : 'mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4'}>
                {renderAccessCards()}
                {isSmallScreen && renderAccessCards()}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mt-6 px-5 pb-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { n: '54', l: 'Total Stations' },
              { n: '54', l: 'Operational' },
              { n: '68.28', l: 'Network (Km)' },
              { n: '118K+', l: 'Daily Passengers' }
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-slate-900/80 text-white p-5 text-center shadow transition hover:-translate-y-1">
                <div className="text-3xl font-bold text-white">{s.n}</div>
                <div className="mt-1 text-xs text-white/80">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-100 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-slate-900">Ticket Booking Methods</h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="text-4xl">🎫</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Ticket Vending Machine</h3>
              <p className="mt-2 text-sm text-slate-600">Self-service machines at all stations</p>
            </div>

            <div className="rounded-2xl bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="text-4xl">💳</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">NCMC Smart Card</h3>
              <p className="mt-2 text-sm text-slate-600">Contactless payment solution</p>
            </div>

            <div className="rounded-2xl bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="text-4xl">🏪</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">KIOSK Counter</h3>
              <p className="mt-2 text-sm text-slate-600">Assisted service with staff support</p>
            </div>

            <div className="rounded-2xl bg-white p-7 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="text-4xl">📱</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">E-Ticket (Mobile App)</h3>
              <p className="mt-2 text-sm text-slate-600">Book e-tickets on your smartphone</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <a
                  href="https://play.google.com/store/apps/details?id=com.gujaratmetrorail.gmrcamddigitalticketing&hl=en_IN&pli=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-2 transition hover:scale-105"
                >
                  <img src="https://freelogopng.com/images/all_img/1664285914google-play-logo-png.png" alt="Android" className="h-6 w-6" />
                </a>
                <a
                  href="https://apps.apple.com/in/app/ahmedabad-metro-official-app/id6670203895"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-2 transition hover:scale-105"
                >
                  <img src="https://seekvectors.com/files/download/f1f44e5b764dd072f4f711f1c079fe60.jpg" alt="iOS" className="h-6 w-6" />
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