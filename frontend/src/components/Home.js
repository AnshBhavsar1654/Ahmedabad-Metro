import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMapMarkedAlt } from 'react-icons/fa';
import { HiOutlineMap } from 'react-icons/hi';
import { MdLocationOn } from 'react-icons/md';
import { MdSchedule } from 'react-icons/md';
import '../styles/home.css';

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
      <Link key={index} to={card.to} className="access-card">
        <div className="card-icon">
          {card.icon}
        </div>
        <div className="card-content">
          <h4>{card.title}</h4>
          {card.subtitle && <p>{card.subtitle}</p>}
        </div>
      </Link>
    ));
  };

  return (
    <div className="hero-container">
      <img className="bg-img" src={bgImage} alt="Metro Cover" />
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Ahmedabad Metro</h1>
          
          <div className="datetime-weather">
            <div className="datetime">
              <div className="date">{formatDate(currentTime)}</div>
              <div className="time">{formatTime(currentTime)}</div>
            </div>
            <div className="weather">
              <div className="weather-icon">{getWeatherIcon(temperature.condition)}</div>
              <div className="temperature">
                <span className="current-temp">
                  {isLoading ? '--' : `${temperature.current}°C`}
                </span>
                <span className="high-temp">
                  {isLoading ? '' : `/ ${temperature.high}°F`}
                </span>
              </div>
              <div className="location">Ahmedabad</div>
            </div>
          </div>

          <div className="quick-access">
            <h3>Frequently Used</h3>
            {isSmallScreen ? (
              <div className="scrolling-container">
                <div className="scrolling-content">
                  {renderAccessCards()}
                  {renderAccessCards()}
                </div>
              </div>
            ) : (
              <div className="access-grid">
                {renderAccessCards()}
              </div>
            )}
          </div>
        </div>

        <div className="hero-background">
          <div className="city-silhouette"></div>
          <div className="metro-tower"></div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">54</div>
            <div className="stat-label">Total Stations</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">46</div>
            <div className="stat-label">Operational</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">68.28</div>
            <div className="stat-label">Network (Km)</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">118K+</div>
            <div className="stat-label">Daily Passengers</div>
          </div>
        </div>
      </div>

      <div className="booking-section">
        <div className="section-content">
          <h2 className="section-title">Ticket Booking Methods</h2>
          <div className="booking-grid">
            <div className="booking-card">
              <div className="booking-icon">🎫</div>
              <h3>Ticket Vending Machine</h3>
              <p>Self-service machines at all stations</p>
            </div>
            <div className="booking-card">
              <div className="booking-icon">💳</div>
              <h3>NCMC Smart Card</h3>
              <p>Contactless payment solution</p>
            </div>
            <div className="booking-card">
              <div className="booking-icon">🏪</div>
              <h3>KIOSK Counter</h3>
              <p>Assisted service with staff support</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
