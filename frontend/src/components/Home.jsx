import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TicketCheck, CreditCard, Users, Smartphone, Map, MapPin, CalendarClock, Route, ArrowRight,
  Sun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, ExternalLink, History, ChevronRight, TrainFront, GitBranch, Ruler,
} from 'lucide-react';
import { API_URL } from '../lib/api';
import { LINES } from '../lib/lines';
import { ALL_STATIONS, LINE_FREQUENCY, LINE_STATIONS, isOperational, serviceStatus, stationStatus } from '../lib/network';
import { loadRecent } from '../lib/recent';
import LineBadge from './LineBadge';
import { useI18n } from '../i18n';

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
  { to: '/routes', icon: Route, title: 'nav.routes', subtitle: 'home.quick.routes' },
  { to: '/stations', icon: Map, title: 'nav.stations', subtitle: 'home.quick.stations' },
  { to: '/nearest-stations', icon: MapPin, title: 'nav.nearest', subtitle: 'home.quick.nearest' },
  { to: '/schedule', icon: CalendarClock, title: 'nav.schedule', subtitle: 'home.quick.schedule' },
];

const INTERCHANGES = ALL_STATIONS.filter((s) => (LINES.filter((l) => LINE_STATIONS[l.id].includes(s))).length > 1);
const OPEN_STATIONS = ALL_STATIONS.filter(isOperational).length;
const RUNNING_LINES = LINES.filter((l) => !l.wip).length;

// Station and line counts come from the network data, so they stay right when the network grows.
const NETWORK_FACTS = [
  { icon: TrainFront, value: String(ALL_STATIONS.length), label: 'home.fact.stations', note: 'home.fact.operational', vars: { n: OPEN_STATIONS } },
  {
    icon: GitBranch, value: String(LINES.length), label: 'home.fact.lines', badges: true,
    note: 'home.fact.linesNote', vars: { n: RUNNING_LINES, m: LINES.length - RUNNING_LINES },
  },
  { icon: Ruler, value: '76.64', unit: 'unit.km', label: 'home.fact.network', note: 'home.fact.networkNote' },
  { icon: Users, value: '150K+', label: 'home.fact.riders', note: 'home.fact.ridersNote' },
];

const TICKET_METHODS = [
  { icon: TicketCheck, title: 'home.tickets.tvm', text: 'home.tickets.tvmText' },
  { icon: CreditCard, title: 'home.tickets.ncmc', text: 'home.tickets.ncmcText' },
  { icon: Users, title: 'home.tickets.kiosk', text: 'home.tickets.kioskText' },
];

// Cover photo follows the time of day.
const coverFor = (hour) => (hour >= 5 && hour < 17 ? '/afternoon.png' : hour >= 17 && hour < 20 ? '/evening.png' : '/cover.png');

// Ticks on its own so the rest of the page doesn't re-render every second.
const Clock = () => {
  const { locale } = useI18n();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <div className="text-sm text-white/90">
        {now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
        {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </div>
    </div>
  );
};

// Open or closed right now, from the published operating hours (no live data).
const ServiceStatus = () => {
  const { t } = useI18n();
  const [running, setRunning] = useState(() => serviceStatus().running);
  useEffect(() => {
    const timer = setInterval(() => setRunning(serviceStatus().running), 60000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm backdrop-blur-sm">
        <span className={`h-2 w-2 rounded-full ${running ? 'bg-go-600' : 'bg-white/50'}`} aria-hidden="true" />
        {running ? t('home.running') : t('home.closed')}
      </div>
      {!running && <p className="mt-3 text-sm text-white/80">{t('home.coldStart')}</p>}
    </div>
  );
};

const Weather = () => {
  const { t } = useI18n();
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
        <div className="text-sm text-white/80">
          {t('home.weatherPlace', { condition: t(`weather.${weather.condition}`) === `weather.${weather.condition}` ? weather.condition.toLowerCase() : t(`weather.${weather.condition}`) })}
        </div>
      </div>
    </div>
  );
};

const selectClass =
  'w-full rounded-md border border-line-200 bg-surface-1 px-3 py-2.5 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent disabled:bg-line-100';

// The primary task, right on the hero: pick two stations and jump to the planner with the result.
const JourneyPlanner = () => {
  const { t, stationOption } = useI18n();
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
    <form onSubmit={onSubmit} className="rounded-lg border border-line-200 bg-surface-1 p-4 text-left shadow-lg" aria-label={t('home.planAria')}>
      <div className="mb-3 font-sans text-base font-semibold text-ink-900">{t('home.where')}</div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        {!unavailable && (
          <>
            <div>
              <label htmlFor="home-from" className="mb-1 block text-xs font-medium text-ink-600">{t('common.from')}</label>
              <select id="home-from" value={source} onChange={(e) => setSource(e.target.value)} disabled={loading} className={selectClass}>
                <option value="">{loading ? t('home.loadingStations') : t('home.chooseStation')}</option>
                {(stations || []).map((s) => (
                  <option key={s} value={s} disabled={stationStatus(s) === 'construction'}>{stationOption(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="home-to" className="mb-1 block text-xs font-medium text-ink-600">{t('common.to')}</label>
              <select id="home-to" value={destination} onChange={(e) => setDestination(e.target.value)} disabled={loading} className={selectClass}>
                <option value="">{loading ? t('home.loadingStations') : t('home.chooseStation')}</option>
                {(stations || []).map((s) => (
                  <option key={s} value={s} disabled={stationStatus(s) === 'construction'}>{stationOption(s)}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={!canGo}
          className={`inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink-300 ${unavailable ? 'md:col-span-3' : ''}`}
        >
          {t('home.findRoute')} <ArrowRight strokeWidth={1.75} size={16} />
        </button>
      </div>
    </form>
  );
};

const RecentJourneys = () => {
  const { t, station } = useI18n();
  const [recent] = useState(loadRecent);
  if (!recent.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-white/80">
        <History size={14} strokeWidth={1.75} /> {t('common.recent')}
      </span>
      {recent.slice(0, 3).map((j) => (
        <Link
          key={`${j.from}>${j.to}`}
          to={`/routes?${new URLSearchParams({ from: j.from, to: j.to })}`}
          className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {station(j.from)} → {station(j.to)}
        </Link>
      ))}
    </div>
  );
};

const Home = () => {
  const { t, station, line: lineName } = useI18n();
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

        <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-24 pt-12">
          <div className="w-full max-w-3xl text-center text-white">
            <h1 className="font-sans text-4xl font-light tracking-tight drop-shadow-lg sm:text-5xl">{t('home.welcome')}</h1>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              <Clock />
              <Weather />
            </div>
            <div className="mt-4">
              <ServiceStatus />
            </div>

            <div className="mt-8">
              <JourneyPlanner />
              <RecentJourneys />
            </div>

            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_LINKS.map(({ to, icon: Icon, title, subtitle }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-4 text-center backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Icon strokeWidth={1.75} size={24} />
                    <span className="text-sm font-semibold">{t(title)}</span>
                    <span className="text-xs text-white/70">{t(subtitle)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </section>

      {/* Network at a glance: cards that overlap the bottom of the hero. */}
      <section className="relative z-10 -mt-14 px-5" aria-label={t('home.glance')}>
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {NETWORK_FACTS.map(({ icon: Icon, value, unit, label, note, badges, vars }) => (
            <li key={label} className="flex items-start gap-3 rounded-lg border border-line-200 bg-surface-1 p-4 shadow-lg sm:gap-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-100 text-accent sm:h-11 sm:w-11">
                <Icon strokeWidth={1.75} size={20} />
              </span>
              <div className="min-w-0">
                <div className="font-mono text-2xl font-semibold leading-none tabular-nums text-ink-900 sm:text-3xl">
                  {value}
                  {unit && <span className="ml-1 text-base font-medium text-ink-600">{t(unit)}</span>}
                </div>
                <div className="mt-1.5 text-sm font-medium text-ink-900">{t(label)}</div>
                {badges && (
                  <div className="-ml-[52px] mt-1.5 flex justify-center gap-1 sm:ml-0 sm:justify-start">
                    {LINES.map((l) => <LineBadge key={l.id} line={l.id} size="sm" />)}
                  </div>
                )}
                {note && <div className="mt-0.5 text-xs text-ink-600">{t(note, vars)}</div>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-sans text-xl font-semibold text-ink-900">{t('home.network.title')}</h2>
              <p className="mt-1 text-sm text-ink-600">{t('home.network.text', { interchanges: INTERCHANGES.map(station).join(', ') })}</p>
            </div>
            <Link to="/stations" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
              {t('home.network.open')} <ChevronRight size={16} />
            </Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LINES.map((line) => (
              <li key={line.id}>
                <Link
                  to={`/stations?line=${line.id}`}
                  className="group flex h-full flex-col rounded-lg border border-line-200 bg-surface-1 p-5 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-center gap-3">
                    <LineBadge line={line.id} size="lg" />
                    <div>
                      <div className="font-sans text-base font-semibold text-ink-900">
                        {lineName(line.name)}
                        {line.wip && (
                          <div className="mt-1 flex">
                            <span className="inline-block whitespace-nowrap rounded-full border border-alert-600/40 bg-alert-600/10 px-2 py-0.5 text-[11px] font-semibold text-alert-600">
                              {t('status.wip')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-ink-600">{t(`corridor.${line.id}`)}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-ink-900">
                    {station(line.from)} <span className="text-ink-600">{t('common.toBetween')}</span> {station(line.to)}
                  </div>
                  <div className="mt-1 font-mono text-xs tabular-nums text-ink-600">{t('common.stations', { n: LINE_STATIONS[line.id].length })}</div>
                  <div className="mt-3 border-t border-line-100 pt-3 text-xs text-ink-600">{t(LINE_FREQUENCY[line.id])}</div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    {t('home.viewOnMap')} <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-sans text-xl font-semibold text-ink-900">{t('home.tickets.title')}</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TICKET_METHODS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-lg border border-line-200 bg-surface-1 p-6">
                <Icon strokeWidth={1.5} size={32} className="text-accent" />
                <h3 className="mt-4 font-sans text-base font-semibold text-ink-900">{t(title)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{t(text)}</p>
              </div>
            ))}

            <div className="rounded-lg border border-line-200 bg-surface-1 p-6">
              <Smartphone strokeWidth={1.5} size={32} className="text-accent" />
              <h3 className="mt-4 font-sans text-base font-semibold text-ink-900">{t('home.tickets.app')}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{t('home.tickets.appText')}</p>
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
