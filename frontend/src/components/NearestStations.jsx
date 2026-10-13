import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, X, LocateFixed, Link as LinkIcon, MapPin, History, CircleAlert, Navigation, ChevronRight } from 'lucide-react';
import LineBadge from './LineBadge';
import { STATION_LINES } from '../lib/network';
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

const LABEL_CLEARANCE_PX = 44; // a pill is about 50 x 18 px
const LABEL_SPOTS = [0.5, 0.62, 0.38, 0.72, 0.3, 0.8, 0.22, 0.88];

// Distance written on each path. Paths to nearby stations often share a stretch, and short ones end right at
// a pin, so each label tries spots along its path (in screen pixels, at the current zoom) and takes the first
// one clear of the start, the pins and the labels already placed.
const DistanceLabels = ({ stations, start, colors }) => {
  const map = useMap();
  const [, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const avoid = [start, ...stations.map((st) => [st.latitude, st.longitude])].map((p) => map.latLngToContainerPoint(p));
  const placed = [];
  return stations.map((station, index) => {
    const path = station.path || [start, [station.latitude, station.longitude]];
    let best = null;
    for (const fraction of LABEL_SPOTS) {
      const latlng = pointAlong(path, fraction);
      const px = map.latLngToContainerPoint(latlng);
      const clearance = Math.min(...[...avoid, ...placed].map((q) => px.distanceTo(q)));
      if (!best || clearance > best.clearance) best = { latlng, px, clearance };
      if (clearance >= LABEL_CLEARANCE_PX) break;
    }
    placed.push(best.px);
    return (
      <Marker
        key={`distance-${station.name}`}
        position={best.latlng}
        icon={distanceLabelIcon(distanceText(station), colors[index])}
        interactive={false}
        zIndexOffset={500}
      />
    );
  });
};

const distanceText = (station) =>
  station.distance == null ? 'distance unavailable' : `${station.distance_type === 'straight' ? '≈ ' : ''}${station.distance} km`;

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
      reject(new Error('Geolocation is not supported by this browser.'));
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
  if (err.response) return `The server returned an error (${err.response.status}). Please try again.`;
  if (err.request) return 'Could not reach the server. Check your connection and try again.';
  return err.message || 'Something went wrong. Please try again.';
};

const Alert = ({ children, onDismiss }) => (
  <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-md border-l-4 border-alert-600 bg-surface-1 px-4 py-3 text-sm text-ink-900">
    <div className="flex gap-2">
      <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-alert-600" />
      <div>{children}</div>
    </div>
    {onDismiss && (
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-ink-600 hover:text-ink-900">
        <X size={16} strokeWidth={1.75} />
      </button>
    )}
  </div>
);

const NearestStations = () => {
  const { theme } = useTheme();
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
          params: { q: `${query}, Ahmedabad, Gujarat`, format: 'json', limit: 5 },
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
  }, [searchQuery]);

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
      if (!Array.isArray(data)) setError('The server sent an unexpected response.');
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
      await fetchStations(23.0225, 72.5714, null, 'Ahmedabad centre');
      setError("We couldn't get your location, so results are for central Ahmedabad. Allow location access, or search for a place.");
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
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) throw new Error('The link did not contain valid coordinates.');
      setMapsLink('');
      await fetchStations(latitude, longitude, null, data.place_name || 'Google Maps location');
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
      <PageHeader title="Nearest Stations" subtitle="Find the closest metro stations to you or to any place in Ahmedabad" />

      <div className="mx-auto mt-6 max-w-7xl px-5">
        <div className="rounded-lg border border-line-200 bg-surface-1 p-5">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
              <label htmlFor="place-search" className="sr-only">Search a landmark or place</label>
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
                placeholder="Search a landmark or place, e.g. Sabarmati Ashram"
                className={`${inputClass} pl-10 pr-10`}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
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
                    <p className="px-4 py-3 text-sm text-ink-600">No places found. Try a different name, or paste a Google Maps link below.</p>
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
                      <li className="px-4 py-1 text-xs font-semibold text-ink-600">Recent searches</li>
                      {recentSearches.map((place) => (
                        <li key={place.name} className="flex items-center hover:bg-surface-0">
                          <button
                            type="button"
                            onClick={() => selectPlace(place)}
                            className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2 text-left text-sm text-ink-900"
                          >
                            <History size={14} strokeWidth={1.75} className="shrink-0 text-ink-600" />
                            <span className="truncate">{place.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => removeFromHistory(e, place.name)}
                            aria-label={`Remove ${place.name} from recent searches`}
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
              Use my location
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-ink-600">Popular places</span>
            {FAMOUS_LANDMARKS.map((landmark) => (
              <button
                key={landmark.name}
                type="button"
                onClick={() => selectPlace(landmark)}
                className="rounded-full border border-line-200 px-3 py-1.5 text-xs font-medium text-ink-900 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {landmark.name}
              </button>
            ))}
          </div>

          <form onSubmit={submitMapsLink} className="mt-5 border-t border-line-200 pt-4">
            <label htmlFor="maps-link" className="mb-2 block text-sm font-semibold text-ink-900">Paste a Google Maps link</label>
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
                {resolvingLink ? 'Finding place…' : 'Use link'}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-600">Use this if search can't find the place. We read the coordinates from the link.</p>
          </form>
        </div>

        <div className="mt-6">
          {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

          {loading ? (
            <NearestStationsSectionSkeleton />
          ) : !userLocation ? (
            <div className="rounded-lg border border-dashed border-line-200 bg-surface-1 p-10 text-center">
              <Navigation size={28} strokeWidth={1.5} className="mx-auto text-ink-300" />
              <p className="mt-3 font-sans text-base font-semibold text-ink-900">Where are you starting from?</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">Use your location, search for a place, or pick a popular one to see the three closest stations by road.</p>
            </div>
          ) : (
            <>
              {accuracy != null && (
                <p className="mb-5 text-sm text-ink-600">
                  Location accuracy: <span className={`font-mono font-semibold tabular-nums ${accuracyTone}`}>{accuracy} m</span>
                  {accuracy > 100 && <span className="ml-2">Low accuracy. Turn on GPS or move outdoors, then use your location again.</span>}
                </p>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section>
                  <h2 className="mb-4 font-sans text-lg font-semibold text-ink-900">
                    Nearest stations{placeName ? <span className="font-normal text-ink-600"> to {placeName}</span> : null}
                  </h2>

                  {nearestStations.length === 0 ? (
                    <div className="rounded-lg border border-line-200 bg-surface-1 p-8 text-center">
                      <p className="font-sans text-base font-semibold text-ink-900">No stations found</p>
                      <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">Try searching for a different place.</p>
                    </div>
                  ) : (
                    <ol className="grid gap-4">
                      {nearestStations.map((station, index) => (
                        <li key={station.name} className="rounded-lg border border-line-200 bg-surface-1 p-5">
                          <div className="flex gap-4">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold text-white"
                              style={{ backgroundColor: rankColors[index] }}
                              aria-label={`Rank ${index + 1}`}
                            >
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate font-sans text-base font-semibold text-ink-900">{station.name}</h3>
                                <span className="flex shrink-0 gap-1">
                                  {(STATION_LINES[station.name] || []).map((id) => <LineBadge key={id} line={id} size="sm" />)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-ink-600">
                                <span className="font-mono tabular-nums text-ink-900">{station.distance != null ? `${station.distance} km` : '—'}</span>{' '}
                                {station.distance_type === 'straight' ? 'in a straight line (road distance unavailable)' : 'by road'}
                              </p>
                              <Link
                                to={`/stations?station=${encodeURIComponent(station.name)}`}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                              >
                                Next trains, gates and fares <ChevronRight size={14} />
                              </Link>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section className="rounded-lg border border-line-200 bg-surface-1 p-5">
                  <h2 className="mb-4 font-sans text-lg font-semibold text-ink-900">Map</h2>
                  <div className="overflow-hidden rounded-md border border-line-200">
                    <MapContainer center={userLocation} zoom={15} className="h-[420px] w-full">
                      <BaseTiles />
                      <FitToPoints points={mapPoints} />

                      <Marker position={userLocation} icon={userIcon}>
                        <Popup>
                          <strong>{placeName || 'Your location'}</strong>
                          {accuracy != null && <div>Accuracy: {accuracy} m</div>}
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
                            <span className="font-sans font-semibold">{station.name}</span>
                          </Tooltip>
                          <Popup>
                            <strong>{station.name}</strong>
                            <div>
                              #{index + 1}, {distanceText(station)}
                              {station.distance_type === 'road' ? ' by road' : ''}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full border-2 border-white bg-ink-900 shadow" /> {placeName || 'You'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {rankColors.map((c) => (
                        <span key={c} className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />
                      ))}{' '}
                      Nearest stations
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <svg width="22" height="4" aria-hidden="true">
                        <line x1="2" y1="2" x2="20" y2="2" stroke="rgb(var(--ink-600))" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.5 5" />
                      </svg>
                      Way there
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
