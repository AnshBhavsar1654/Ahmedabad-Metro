import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, X, LocateFixed, Link as LinkIcon, MapPin, History, CircleAlert, Navigation, ChevronRight } from 'lucide-react';
import LineBadge from './LineBadge';
import { STATION_LINES } from '../lib/network';
import { useI18n } from '../i18n';
import PageHeader from './PageHeader';
import BaseTiles from './BaseTiles';
import { useTheme, mapPalette } from '../lib/theme';
import { NearestStationsDropdownSkeleton, NearestStationsSectionSkeleton } from './Skeleton';
import { API_URL } from '../lib/api';

const HISTORY_KEY = 'metro_recent_searches';

const FAMOUS_LANDMARKS = [
  { name: 'Sabarmati Ashram', lat: 23.0605, lng: 72.5801 },
  { name: 'Kankaria Lake', lat: 23.0062, lng: 72.5997 },
  { name: 'Science City', lat: 23.0805, lng: 72.5029 },
  { name: 'Manek Chowk', lat: 23.0232, lng: 72.5898 },
  { name: 'ISKCON Temple', lat: 23.0231, lng: 72.5085 },
  { name: 'Law Garden', lat: 23.0249, lng: 72.563 },
  { name: 'Ahmedabad One Mall', lat: 23.0406, lng: 72.5318 },
];

// One colour per result (1st, 2nd, 3rd), shared by its map pin, its path and its card. Chosen to stay clear of
// the four line colours, which mean "this line" everywhere else in the app.
const RANK_COLORS = {
  light: ['#0D9488', '#EA580C', '#DB2777'],
  dark: ['#2DD4BF', '#FB923C', '#F472B6'],
};

// "You are here": a solid dot with a soft halo.
const youIcon = (color) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color}33;display:flex;align-items:center;justify-content:center"><div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

// Numbered station pin in the result's colour.
const rankIcon = (color, rank) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);color:#fff;font:700 13px/22px 'IBM Plex Mono',monospace;text-align:center">${rank}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

// Distance label, as a pill in the result's colour.
const distanceLabelIcon = (text, color) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<span class="distance-pill" style="color:${color};border-color:${color}">${text}</span>`,
    iconSize: [0, 0],
  });

// The point `fraction` of the way along a path.
const pointAlong = (path, fraction) => {
  const pts = path.map((p) => L.latLng(p));
  const lengths = pts.slice(1).map((p, i) => pts[i].distanceTo(p));
  let remaining = lengths.reduce((a, b) => a + b, 0) * fraction;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const t = lengths[i] ? remaining / lengths[i] : 0;
      return [pts[i].lat + (pts[i + 1].lat - pts[i].lat) * t, pts[i].lng + (pts[i + 1].lng - pts[i].lng) * t];
    }
    remaining -= lengths[i];
  }
  return path[path.length - 1];
};

const LABEL_SPOTS = [0.5, 0.62, 0.38, 0.72, 0.3, 0.8, 0.22, 0.88, 0.15, 0.94];

// Screen rectangles (px) as [left, top, right, bottom].
const box = (cx, cy, w, h) => [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
const pillWidth = (text) => text.length * 6.8 + 16; // 11px monospace, plus padding
const nameWidth = (text) => text.length * 6.6 + 14; // 11px semibold sans, plus padding

// Distance written on each path. Paths to nearby stations often share a stretch, and short ones end right at
// a pin, so each label tries spots along its path (in screen pixels, at the current zoom) and takes the first
// one that covers nothing: not the start, a pin, a station name, or another label. Failing that, the one that
// covers least.
const DistanceLabels = ({ stations, start, colors }) => {
  const { t, station: localName } = useI18n();
  const map = useMap();
  const [, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const at = (p) => map.latLngToContainerPoint(p);
  const s0 = at(start);
  const taken = [box(s0.x, s0.y, 30, 30)];
  stations.forEach((st) => {
    const p = at([st.latitude, st.longitude]);
    taken.push(box(p.x, p.y, 30, 30));
    const w = nameWidth(localName(st.name));
    taken.push([p.x + 14, p.y - 10, p.x + 14 + w, p.y + 10]); // the name label, right of the pin
  });

  return stations.map((station, index) => {
    const path = station.path || [start, [station.latitude, station.longitude]];
    const text = distanceText(station, t);
    let best = null;
    for (const fraction of LABEL_SPOTS) {
      const latlng = pointAlong(path, fraction);
      const p = at(latlng);
      const rect = box(p.x, p.y, pillWidth(text), 20);
      const covered = taken.reduce((sum, t) => sum + overlap(rect, t), 0);
      if (!best || covered < best.covered) best = { latlng, rect, covered };
      if (covered === 0) break;
    }
    taken.push(best.rect);
    return (
      <Marker
        key={`distance-${station.name}`}
        position={best.latlng}
        icon={distanceLabelIcon(text, colors[index])}
        interactive={false}
        zIndexOffset={500}
      />
    );
  });
};

const distanceText = (station, t) => {
  if (station.distance == null) return t('near.unavailable');
  const km = `${station.distance} ${t('unit.km')}`;
  if (station.distance_type === 'walk' && station.walk_minutes != null) return `${km} · ${station.walk_minutes} ${t('unit.min')}`;
  return `${station.distance_type === 'straight' ? '≈ ' : ''}${km}`;
};

// How the distance was measured, in words, for the cards (translation keys).
const DISTANCE_KIND = {
  walk: 'near.walk',
  road: 'near.road',
  straight: 'near.straight',
};

// Frame the searched point together with the stations found for it.
const FitToPoints = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    else map.setView(points[0], 15);
  }, [points, map]);
  return null;
};

const readHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (items) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable: history just won't persist */
  }
};

const getPosition = (options) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('near.noGeo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

// Try GPS first, then fall back to a coarse network location.
const getBestPosition = async () => {
  try {
    return await getPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  } catch {
    return getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }
};

const describeRequestError = (err) => {
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response) return `error.status|${err.response.status}`;
  if (err.request) return 'error.unreachable';
  return err.message || 'error.generic';
};

const Alert = ({ children, onDismiss }) => {
  const { t } = useI18n();
  return (
  <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-md border-l-4 border-alert-600 bg-surface-1 px-4 py-3 text-sm text-ink-900">
    <div className="flex gap-2">
      <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-alert-600" />
      <div>{children}</div>
    </div>
    {onDismiss && (
      <button type="button" onClick={onDismiss} aria-label={t('common.dismiss')} className="shrink-0 text-ink-600 hover:text-ink-900">
        <X size={16} strokeWidth={1.75} />
      </button>
    )}
  </div>
  );
};

const NearestStations = () => {
  const { theme } = useTheme();
  const { t, lang, station: localName } = useI18n();
  // Error keys ("error.status|503") and place names that have translations ("Sabarmati Ashram", "near.centre").
  const showError = (e) => {
    const [key, status] = e.split('|');
    return t(key, { status });
  };
  const placeLabel = (name) => {
    if (!name) return name;
    if (name.startsWith('near.')) return t(name);
    const label = t(`place.${name}`);
    return label === `place.${name}` ? name : label;
  };
  const palette = mapPalette(theme);
  const userIcon = useMemo(() => youIcon(palette.ink), [palette]);
  const rankColors = RANK_COLORS[theme] || RANK_COLORS.light;
  const [userLocation, setUserLocation] = useState(null);
  const [nearestStations, setNearestStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accuracy, setAccuracy] = useState(null);
  const [placeName, setPlaceName] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(readHistory);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mapsLink, setMapsLink] = useState('');
  const [resolvingLink, setResolvingLink] = useState(false);

  const latestRequest = useRef(0);

  useEffect(() => {
    const close = () => setShowDropdown(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const updateHistory = (items) => {
    setRecentSearches(items);
    writeHistory(items);
  };

  const saveToHistory = (place) =>
    updateHistory([place, ...recentSearches.filter((item) => item.name !== place.name)].slice(0, 5));

  const removeFromHistory = (e, name) => {
    e.stopPropagation();
    updateHistory(recentSearches.filter((item) => item.name !== name));
  };

  // Debounced place autocomplete (OpenStreetMap Nominatim).
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { q: `${query}, Ahmedabad, Gujarat`, format: 'json', limit: 5, 'accept-language': `${lang},en` },
          signal: controller.signal,
        });
        setSuggestions(response.data);
      } catch (err) {
        if (!axios.isCancel(err)) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, lang]);

  const fetchStations = useCallback(async (latitude, longitude, locationAccuracy = null, name = null) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError('');
    setUserLocation([latitude, longitude]);
    setAccuracy(locationAccuracy);
    setPlaceName(name);

    try {
      const { data } = await axios.get(`${API_URL}/api/stations/nearby`, { params: { lat: latitude, lng: longitude } });
      if (requestId !== latestRequest.current) return;
      setNearestStations(Array.isArray(data) ? data : []);
      if (!Array.isArray(data)) setError('error.unexpected');
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setNearestStations([]);
      setError(describeRequestError(err));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  const locateMe = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { coords } = await getBestPosition();
      await fetchStations(coords.latitude, coords.longitude, Math.round(coords.accuracy), null);
    } catch {
      await fetchStations(23.0225, 72.5714, null, 'near.centre');
      setError('near.locationFailed');
    }
  }, [fetchStations]);

  const selectPlace = (place) => {
    const latitude = parseFloat(place.lat ?? place.latitude);
    const longitude = parseFloat(place.lon ?? place.lng ?? place.longitude);
    const name = place.display_name || place.name;
    saveToHistory({ name, lat: latitude, lng: longitude });
    fetchStations(latitude, longitude, null, name);
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  const submitMapsLink = async (e) => {
    e.preventDefault();
    const link = mapsLink.trim();
    if (!link) return;

    setResolvingLink(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_URL}/api/location/resolve-google-maps`, { url: link });
      const latitude = parseFloat(data.latitude);
      const longitude = parseFloat(data.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) throw new Error('near.badLink');
      setMapsLink('');
      await fetchStations(latitude, longitude, null, data.place_name === 'Google Maps location' || !data.place_name ? 'near.mapsPlace' : data.place_name);
    } catch (err) {
      setError(describeRequestError(err));
    } finally {
      setResolvingLink(false);
    }
  };

  // Frame the start, the stations and the whole of every path.
  const mapPoints = useMemo(
    () => (userLocation ? [userLocation, ...nearestStations.flatMap((st) => st.path || [[st.latitude, st.longitude]])] : []),
    [userLocation, nearestStations]
  );
  const accuracyTone = accuracy < 50 ? 'text-go-600' : accuracy < 100 ? 'text-ink-900' : 'text-alert-600';

  const inputClass =
    'w-full rounded-md border border-line-200 bg-surface-0 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent';
  const secondaryButton =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-line-200 bg-surface-1 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <PageHeader title={t('near.title')} subtitle={t('near.subtitle')} />

      <div className="mx-auto mt-6 max-w-7xl px-5">
        <div className="rounded-lg border border-line-200 bg-surface-1 p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
              <label htmlFor="place-search" className="sr-only">{t('near.searchLabel')}</label>
              <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600" />
              <input
                id="place-search"
                type="text"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={t('near.searchPlaceholder')}
                className={`${inputClass} pl-10 pr-10`}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={t('near.clear')}
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-600 hover:text-ink-900"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              )}

              {showDropdown && (searchQuery.trim().length >= 3 || (!searchQuery.trim() && recentSearches.length > 0)) && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[1000] max-h-[300px] overflow-y-auto rounded-md border border-line-200 bg-surface-1 shadow-lg">
                  {suggestionsLoading && <NearestStationsDropdownSkeleton />}

                  {!suggestionsLoading && searchQuery.trim().length >= 3 && suggestions.length === 0 && (
                    <p className="px-4 py-3 text-sm text-ink-600">{t('near.noPlaces')}</p>
                  )}

                  {suggestions.length > 0 && (
                    <ul className="py-2">
                      {suggestions.map((place) => (
                        <li key={place.place_id}>
                          <button
                            type="button"
                            onClick={() => selectPlace(place)}
                            className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm text-ink-900 hover:bg-surface-0"
                          >
                            <MapPin size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-600" />
                            <span className="line-clamp-2">{place.display_name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!searchQuery.trim() && recentSearches.length > 0 && (
                    <ul className="py-2">
                      <li className="px-4 py-1 text-xs font-semibold text-ink-600">{t('near.recentSearches')}</li>
                      {recentSearches.map((place) => (
                        <li key={place.name} className="flex items-center hover:bg-surface-0">
                          <button
                            type="button"
                            onClick={() => selectPlace(place)}
                            className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2 text-left text-sm text-ink-900"
                          >
                            <History size={14} strokeWidth={1.75} className="shrink-0 text-ink-600" />
                            <span className="truncate">{placeLabel(place.name)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => removeFromHistory(e, place.name)}
                            aria-label={t('near.remove', { place: placeLabel(place.name) })}
                            className="px-3 py-2 text-ink-600 hover:text-alert-600"
                          >
                            <X size={14} strokeWidth={1.75} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button type="button" onClick={locateMe} disabled={loading} className={`${secondaryButton} disabled:cursor-not-allowed disabled:opacity-60`}>
              <LocateFixed size={16} strokeWidth={1.75} />
              {t('near.useLocation')}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-ink-600">{t('near.popular')}</span>
            {FAMOUS_LANDMARKS.map((landmark) => (
              <button
                key={landmark.name}
                type="button"
                onClick={() => selectPlace(landmark)}
                className="rounded-full border border-line-200 px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {placeLabel(landmark.name)}
              </button>
            ))}
          </div>

          <form onSubmit={submitMapsLink} className="mt-5 border-t border-line-200 pt-4">
            <label htmlFor="maps-link" className="mb-2 block text-sm font-semibold text-ink-900">{t('near.linkLabel')}</label>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <LinkIcon size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600" />
                <input
                  id="maps-link"
                  type="url"
                  value={mapsLink}
                  onChange={(e) => setMapsLink(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className={`${inputClass} pl-9 pr-4`}
                />
              </div>
              <button
                type="submit"
                disabled={resolvingLink || !mapsLink.trim()}
                className="shrink-0 rounded-md bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink-300"
              >
                {resolvingLink ? t('near.finding') : t('near.useLink')}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-600">{t('near.linkHelp')}</p>
          </form>
        </div>

        <div className="mt-6">
          {error && <Alert onDismiss={() => setError('')}>{showError(error)}</Alert>}

          {loading ? (
            <NearestStationsSectionSkeleton />
          ) : !userLocation ? (
            <div className="rounded-lg border border-dashed border-line-200 bg-surface-1 p-10 text-center">
              <Navigation size={28} strokeWidth={1.5} className="mx-auto text-ink-300" />
              <p className="mt-3 font-sans text-base font-semibold text-ink-900">{t('near.emptyTitle')}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">{t('near.emptyText')}</p>
            </div>
          ) : (
            <>
              {accuracy != null && (
                <p className="mb-5 text-sm text-ink-600">
                  {t('near.accuracy')} <span className={`font-mono font-semibold tabular-nums ${accuracyTone}`}>{accuracy} m</span>
                  {accuracy > 100 && <span className="ml-2">{t('near.lowAccuracy')}</span>}
                </p>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section>
                  <h2 className="mb-4 font-sans text-lg font-semibold text-ink-900">
                    {t('near.heading')}
                    {placeName ? <span className="font-normal text-ink-600"> {t('near.toPlace', { place: placeLabel(placeName) })}</span> : null}
                  </h2>

                  {nearestStations.length === 0 ? (
                    <div className="rounded-lg border border-line-200 bg-surface-1 p-8 text-center">
                      <p className="font-sans text-base font-semibold text-ink-900">{t('near.none')}</p>
                      <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">{t('near.tryOther')}</p>
                    </div>
                  ) : (
                    <ol className="grid gap-4">
                      {nearestStations.map((station, index) => (
                        <li key={station.name} className="rounded-lg border border-line-200 bg-surface-1 p-5">
                          <div className="flex gap-4">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold text-white"
                              style={{ backgroundColor: rankColors[index] }}
                              aria-label={t('near.rank', { n: index + 1 })}
                            >
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate font-sans text-base font-semibold text-ink-900">{localName(station.name)}</h3>
                                <span className="flex shrink-0 gap-1">
                                  {(STATION_LINES[station.name] || []).map((id) => <LineBadge key={id} line={id} size="sm" />)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-ink-600">
                                <span className="font-mono tabular-nums text-ink-900">{station.distance != null ? `${station.distance} ${t('unit.km')}` : '—'}</span>{' '}
                                {t(DISTANCE_KIND[station.distance_type] || 'near.road')}
                                {station.walk_minutes != null && (
                                  <>
                                    {` · ${t('near.about')} `}
                                    <span className="font-mono tabular-nums text-ink-900">{station.walk_minutes} {t('unit.min')}</span>
                                  </>
                                )}
                              </p>
                              <Link
                                to={`/stations?station=${encodeURIComponent(station.name)}`}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                              >
                                {t('near.nextLink')} <ChevronRight size={14} />
                              </Link>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section className="rounded-lg border border-line-200 bg-surface-1 p-5">
                  <h2 className="mb-4 font-sans text-lg font-semibold text-ink-900">{t('near.map')}</h2>
                  <div className="overflow-hidden rounded-md border border-line-200">
                    <MapContainer center={userLocation} zoom={15} className="h-[420px] w-full">
                      <BaseTiles />
                      <FitToPoints points={mapPoints} />

                      <Marker position={userLocation} icon={userIcon}>
                        <Popup>
                          <strong>{placeLabel(placeName) || t('near.yourLocation')}</strong>
                          {accuracy != null && <div>{t('near.accuracyPopup', { m: accuracy })}</div>}
                        </Popup>
                      </Marker>

                      {/* Dotted path to each station (by road when available), its distance written halfway along. */}
                      {nearestStations.map((station, index) => (
                        <Polyline
                          key={`path-${station.name}`}
                          positions={station.path || [userLocation, [station.latitude, station.longitude]]}
                          pathOptions={{ color: rankColors[index], weight: 4, opacity: 0.9, dashArray: '1 9', lineCap: 'round' }}
                        />
                      ))}
                      <DistanceLabels stations={nearestStations} start={userLocation} colors={rankColors} />

                      {nearestStations.map((station, index) => (
                        <Marker
                          key={station.name}
                          position={[station.latitude, station.longitude]}
                          icon={rankIcon(rankColors[index], index + 1)}
                          zIndexOffset={1000 - index}
                        >
                          <Tooltip permanent direction="right" offset={[14, 0]} className="station-tooltip" opacity={1}>
                            <span className="font-sans font-semibold">{localName(station.name)}</span>
                          </Tooltip>
                          <Popup>
                            <strong>{localName(station.name)}</strong>
                            <div>
                              #{index + 1}, {distanceText(station, t)} {t(DISTANCE_KIND[station.distance_type] || 'near.road')}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full border-2 border-white bg-ink-900 shadow" /> {placeLabel(placeName) || t('near.you')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {rankColors.map((c) => (
                        <span key={c} className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />
                      ))}{' '}
                      {t('near.legendStations')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <svg width="22" height="4" aria-hidden="true">
                        <line x1="2" y1="2" x2="20" y2="2" stroke="rgb(var(--ink-600))" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.5 5" />
                      </svg>
                      {t('near.legendRoute')}
                    </span>
                  </p>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NearestStations;
