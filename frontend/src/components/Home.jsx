import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TicketCheck, CreditCard, Users, Smartphone, Map, MapPin, CalendarClock, Route, ArrowRight,
  Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, ExternalLink,
} from 'lucide-react';
import { API_URL } from '../lib/api';

const WEATHER_ICONS = {
  Clear: Sun,
  Clouds: Cloud,
  Rain: CloudRain,
  Drizzle: CloudRain,
  Thunderstorm: CloudLightning,
  Snow: Snowflake,
  Mist: CloudFog,
  Haze: CloudFog,
  Smoke: CloudFog,
  Dust: CloudFog,
  Fog: CloudFog,
};

const QUICK_LINKS = [
  { to: '/routes', icon: Route, title: 'Plan Journey', subtitle: 'Route and fare' },
  { to: '/stations', icon: Map, title: 'Metro Map', subtitle: 'Network' },
  { to: '/nearest-stations', icon: MapPin, title: 'Nearest Stations', subtitle: 'Near you' },
  { to: '/schedule', icon: CalendarClock, title: 'Schedule', subtitle: 'Timetable' },
];

const NETWORK_FACTS = [
  { value: '54', label: 'stations' },
  { value: '4', label: 'lines' },
  { value: '68.28 km', label: 'network' },
  { value: '118K+', label: 'daily riders' },
];

const TICKET_METHODS = [
  { icon: TicketCheck, title: 'Ticket vending machine', text: 'Self-service machines at all stations' },
  { icon: CreditCard, title: 'NCMC smart card', text: 'Tap in and out with a contactless card' },
  { icon: Users, title: 'Kiosk counter', text: 'Staff-assisted ticketing at the station' },
];

// Cover photo follows the time of day.
const coverFor = (hour) => (hour >= 5 && hour < 17 ? '/afternoon.png' : hour >= 17 && hour < 20 ? '/evening.png' : '/cover.png');

// Ticks on its own so the rest of the page doesn't re-render every second.
const Clock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <div className="text-sm text-white/90">
        {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
        {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </div>
    </div>
  );
};

const Weather = () => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const key = process.env.REACT_APP_WEATHER_API_KEY;
    if (!key) return undefined;
    const city = process.env.REACT_APP_WEATHER_CITY || 'Ahmedabad,IN';
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        setWeather({ temp: Math.round(data.main.temp), condition: data.weather[0].main });
      } catch {
        /* weather is optional; show nothing if it fails */
      }
    };

    load();
    const timer = setInterval(load, 600000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  if (!weather) return null;
  const Icon = WEATHER_ICONS[weather.condition] || Cloud;
  return (
    <div className="flex items-center gap-3">
      <Icon strokeWidth={1.5} size={30} aria-hidden="true" />
      <div className="text-left">
        <div className="font-mono text-xl font-semibold tabular-nums">{weather.temp}°C</div>
        <div className="text-sm text-white/80">Ahmedabad, {weather.condition.toLowerCase()}</div>
      </div>
    </div>
  );
};

const selectClass =
  'w-full rounded-md border border-line-200 bg-surface-1 px-3 py-2.5 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-line-100';

// The primary task, right on the hero: pick two stations and jump to the planner with the result.
const JourneyPlanner = () => {
  const navigate = useNavigate();
  const [stations, setStations] = useState(null);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/stations`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setStations(Array.isArray(data) ? data : []))
      .catch((err) => err.name !== 'AbortError' && setStations([]));
    return () => controller.abort();
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    navigate('/routes', { state: source && destination && source !== destination ? { source, destination } : null });
  };

  const loading = stations === null;
  const unavailable = stations !== null && stations.length === 0;
  const canGo = unavailable || (source && destination && source !== destination);

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-line-200 bg-surface-1 p-4 text-left shadow-lg" aria-label="Plan a journey">
      <div className="mb-3 font-sans text-base font-semibold text-ink-900">Where are you headed?</div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        {!unavailable && (
          <>
            <div>
              <label htmlFor="home-from" className="mb-1 block text-xs font-medium text-ink-600">From</label>
              <select id="home-from" value={source} onChange={(e) => setSource(e.target.value)} disabled={loading} className={selectClass}>
                <option value="">{loading ? 'Loading stations…' : 'Choose station'}</option>
                {(stations || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="home-to" className="mb-1 block text-xs font-medium text-ink-600">To</label>
              <select id="home-to" value={destination} onChange={(e) => setDestination(e.target.value)} disabled={loading} className={selectClass}>
                <option value="">{loading ? 'Loading stations…' : 'Choose station'}</option>
                {(stations || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={!canGo}
          className={`inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink-300 ${unavailable ? 'md:col-span-3' : ''}`}
        >
          Find route <ArrowRight strokeWidth={1.75} size={16} />
        </button>
      </div>
    </form>
  );
};

const Home = () => {
  const [cover, setCover] = useState(() => coverFor(new Date().getHours()));

  useEffect(() => {
    const timer = setInterval(() => setCover(coverFor(new Date().getHours())), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-full w-full flex-col bg-surface-0">
      <section className="relative flex min-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden">
        <img className="absolute inset-0 h-full w-full object-cover" src={cover} alt="" />
        <div className="absolute inset-0 bg-navy-900/60" aria-hidden="true" />

        <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-12">
          <div className="w-full max-w-3xl text-center text-white">
            <h1 className="font-sans text-4xl font-light tracking-tight drop-shadow-lg sm:text-5xl">Welcome to Ahmedabad Metro</h1>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              <Clock />
              <Weather />
            </div>

            <div className="mt-10">
              <JourneyPlanner />
            </div>

            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_LINKS.map(({ to, icon: Icon, title, subtitle }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-4 text-center backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Icon strokeWidth={1.75} size={24} />
                    <span className="text-sm font-semibold">{title}</span>
                    <span className="text-xs text-white/70">{subtitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ul className="relative z-10 flex gap-8 overflow-x-auto border-t border-white/15 bg-navy-900 px-5 py-3 text-white sm:justify-center">
          {NETWORK_FACTS.map(({ value, label }) => (
            <li key={label} className="flex shrink-0 items-baseline gap-2">
              <span className="font-mono text-base font-semibold tabular-nums">{value}</span>
              <span className="text-sm text-white/70">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-sans text-xl font-semibold text-ink-900">Ways to buy a ticket</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TICKET_METHODS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-lg border border-line-200 bg-surface-1 p-6">
                <Icon strokeWidth={1.5} size={32} className="text-accent" />
                <h3 className="mt-4 font-sans text-base font-semibold text-ink-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{text}</p>
              </div>
            ))}

            <div className="rounded-lg border border-line-200 bg-surface-1 p-6">
              <Smartphone strokeWidth={1.5} size={32} className="text-accent" />
              <h3 className="mt-4 font-sans text-base font-semibold text-ink-900">E-ticket (mobile app)</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">Book tickets on your phone</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { href: 'https://play.google.com/store/apps/details?id=com.gujaratmetrorail.gmrcamddigitalticketing&hl=en_IN&pli=1', label: 'Google Play' },
                  { href: 'https://apps.apple.com/in/app/ahmedabad-metro-official-app/id6670203895', label: 'App Store' },
                ].map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-line-200 px-3 py-1.5 text-sm font-medium text-accent transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {label} <ExternalLink size={14} strokeWidth={1.75} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
