import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Route, TrainFront, Banknote, Map, ArrowRightLeft, Clock, Share2, Check, History } from 'lucide-react';
import PageHeader from './PageHeader';
import BaseTiles from './BaseTiles';
import { RouteDetailsSkeleton } from './Skeleton';
import { API_URL } from '../lib/api';
import { LINES, lineColor } from '../lib/lines';
import { LINE_STATIONS, stationStatus } from '../lib/network';
import { JourneyLegs, NextTrainsCard, OtherRoutes } from './JourneySummary';
import { loadRecent, saveRecent } from '../lib/recent';
import { useI18n } from '../i18n';
import { useTheme, mapPalette } from '../lib/theme';

const lineByName = Object.fromEntries(LINES.map((l) => [l.name, l]));
const metroLines = Object.fromEntries(LINES.map((l) => [l.name, LINE_STATIONS[l.id]]));

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const createRingIcon = (borderColor, fill, size = [16, 16], borderWidth = 3) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:${size[0]}px;height:${size[1]}px;background-color:${fill};border:${borderWidth}px solid ${borderColor};border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });

const MAP_CENTER = [23.0225, 72.5714];

const FitNetworkBounds = ({ bounds }) => {
  const map = useMap();
  const didFitRef = useRef(false);

  useEffect(() => {
    if (!bounds) return;
    if (didFitRef.current) return;
    map.fitBounds(bounds, { padding: [24, 24] });
    didFitRef.current = true;
  }, [bounds, map]);

  return null;
};

const FitRouteBounds = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [36, 36] });
  }, [bounds, map]);

  return null;
};

const RoutesInfo = () => {
  const [stations, setStations] = useState([]);
  const [stationCoords, setStationCoords] = useState({});
  const [lineTracks, setLineTracks] = useState([]); // [{ name, geometry }] along the real track
  const [params, setParams] = useSearchParams();
  // A journey can arrive from the home planner (router state) or a shared link / the metro map (?from=&to=).
  const state = useLocation().state;
  // Read once on arrival; later URL updates (after a search) must not re-trigger the auto-run.
  const [prefill] = useState(
    () => state || (params.get('from') || params.get('to') ? { source: params.get('from') || '', destination: params.get('to') || '' } : null)
  );
  const [recent, setRecent] = useState(loadRecent);
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const { t, station: localName, stationOption, line: lineName } = useI18n();
  // Errors are translation keys, optionally with a station: "routes.closedEnd|Sabarmati".
  const showError = (e) => {
    const [key, name] = String(e).split('|');
    return t(key, { station: localName(name) });
  };
  const palette = mapPalette(theme);
  const [selectedSource, setSelectedSource] = useState(prefill?.source || '');
  const [selectedDest, setSelectedDest] = useState(prefill?.destination || '');
  const [routeDetails, setRouteDetails] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [animatedPos, setAnimatedPos] = useState(null);
  const animationRafIdRef = useRef(null);

  const getStationColor = (stationName) => {
    for (const [lineName, stationList] of Object.entries(metroLines)) {
      if (stationList.includes(stationName)) {
        return lineColor(lineByName[lineName], theme);
      }
    }
    return palette.neutral;
  };
  


  useEffect(() => {
    const getJson = async (path) => {
      const res = await fetch(`${API_URL}${path}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return res.json();
    };

    getJson('/api/stations')
      .then((data) => setStations(Array.isArray(data) ? data : []))
      .catch(() => setError('routes.loadFailed'));

    getJson('/api/stations/coordinates')
      .then((data) => {
        setStationCoords(Object.fromEntries(data.map((st) => [st.name, [st.latitude, st.longitude]])));
      })
      .catch((err) => console.error('Failed to load station coordinates:', err));

    // Without track geometry the lines are drawn station to station, as before.
    getJson('/api/lines')
      .then((data) => setLineTracks(Array.isArray(data) ? data : []))
      .catch(() => setLineTracks([]));
  }, []);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${localName(selectedSource)} → ${localName(selectedDest)}`, text: t('routes.shareText'), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the rider closed the share sheet, or the clipboard is unavailable */
    }
  };

  const runRecent = (from, to) => {
    setSelectedSource(from);
    setSelectedDest(to);
    setPendingRun({ from, to });
  };

  const swapStations = () => {
    const temp = selectedSource;
    setSelectedSource(selectedDest);
    setSelectedDest(temp);
  };

  // What to do at a station on the route: which line to take at the start, and what happens at a line change.
  const stationNote = (index) => {
    const legs = routeDetails?.legs || [];
    if (index === 0 && legs[0]) return t('routes.start', { line: lineName(legs[0].line) });
    const name = routeDetails?.route?.[index];
    const k = legs.findIndex((leg, i) => i < legs.length - 1 && leg.to === name);
    if (k < 0) return '';
    const next = legs[k + 1];
    return legs[k].stay_on_train
      ? t('journey.stay', { station: localName(name), line: lineName(next.line) })
      : t('routes.changeFrom', { from: lineName(legs[k].line), to: lineName(next.line) });
  };

  const handleProceed = useCallback(async () => {
    if (!selectedSource || !selectedDest) {
      setError('routes.needBoth');
      return;
    }
    if (selectedSource === selectedDest) {
      setError('routes.different');
      return;
    }
    // Under construction: trains pass without stopping, so it can't start or end a journey.
    const closed = [selectedSource, selectedDest].find((s) => stationStatus(s) === 'construction');
    if (closed) {
      setError(`routes.closedEnd|${closed}`);
      return;
    }

    setLoading(true);
    setError('');
    setRouteDetails(null);

    const post = async (path) => {
      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: selectedSource, destination: selectedDest }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'error.generic');
      return body;
    };

    try {
      const [routeData, fareData] = await Promise.all([post('/api/route'), post('/api/fare')]);
      setRouteDetails({
        route: routeData.route || [],
        interchanges: routeData.interchanges || [],
        instructions: routeData.instructions || [],
        fare: fareData.fare ?? null,
        distance: routeData.distance || 0,
        legs: routeData.legs || [],
        minutes: routeData.duration_minutes ?? null,
        through: Boolean(routeData.through_service),
        nextTrains: routeData.next_trains || null,
        notOpen: routeData.not_operational || {},
        geometry: routeData.geometry || [],
        alternatives: routeData.alternatives || [],
      });
      setRecent(saveRecent(selectedSource, selectedDest));
      setParams({ from: selectedSource, to: selectedDest }, { replace: true });
    } catch (err) {
      setError(err instanceof TypeError ? 'error.unreachable' : err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSource, selectedDest, setParams]);

  // Arriving from the home planner, a shared link or a recent journey: run the search straight away.
  const autoRan = useRef(false);
  const [pendingRun, setPendingRun] = useState(null);
  useEffect(() => {
    if (pendingRun && selectedSource === pendingRun.from && selectedDest === pendingRun.to) {
      setPendingRun(null);
      handleProceed();
    }
  }, [pendingRun, selectedSource, selectedDest, handleProceed]);
  useEffect(() => {
    if (!autoRan.current && prefill?.source && prefill?.destination && prefill.source !== prefill.destination) {
      autoRan.current = true;
      handleProceed();
    }
  }, [prefill, handleProceed]);

  // The journey along the track (station to station if the server sent no geometry).
  const routePolyline = useMemo(() => {
    if (routeDetails?.geometry?.length > 1) return routeDetails.geometry;
    if (!routeDetails || !routeDetails.route || Object.keys(stationCoords).length === 0) return [];
    return routeDetails.route
      .map(station => stationCoords[station])
      .filter(coord => coord !== undefined);
  }, [routeDetails, stationCoords]);

  const allMetroLines = useMemo(() => {
    const tracked = lineTracks.filter((l) => lineByName[l.name] && l.geometry?.length > 1);
    if (tracked.length) {
      return tracked.map((l) => ({ name: l.name, coords: l.geometry, color: lineColor(lineByName[l.name], theme), wip: l.status === 'work in progress' }));
    }
    if (Object.keys(stationCoords).length === 0) return [];
    const lines = [];
    Object.entries(metroLines).forEach(([lineName, stations]) => {
      const coords = stations
        .map(station => stationCoords[station])
        .filter(coord => coord !== undefined);
      if (coords.length > 1) {
        lines.push({ name: lineName, coords, color: lineColor(lineByName[lineName], theme) });
      }
    });
    return lines;
  }, [lineTracks, stationCoords, theme]);

  const networkBounds = useMemo(() => {
    const coords = Object.values(stationCoords);
    if (!coords || coords.length === 0) return null;
    return L.latLngBounds(coords.map(([lat, lng]) => L.latLng(lat, lng)));
  }, [stationCoords]);

  const routeBounds = useMemo(() => {
    if (!routePolyline || routePolyline.length < 2) return null;
    return L.latLngBounds(routePolyline.map(([lat, lng]) => L.latLng(lat, lng)));
  }, [routePolyline]);

  const animatedIcon = useMemo(() => {
    return L.divIcon({
      className: 'route-anim-marker',
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:${palette.route};border:3px solid ${palette.fill};box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }, [palette]);

  useEffect(() => {
    if (!routePolyline || routePolyline.length < 2) {
      setAnimatedPos(null);
      return;
    }

    if (animationRafIdRef.current) {
      cancelAnimationFrame(animationRafIdRef.current);
      animationRafIdRef.current = null;
    }

    const points = routePolyline.map(([lat, lng]) => L.latLng(lat, lng));
    const segLens = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const len = points[i].distanceTo(points[i + 1]);
      segLens.push(len);
      total += len;
    }
    if (total <= 0) {
      setAnimatedPos(routePolyline[0]);
      return;
    }

    const durationMs = Math.min(14000, Math.max(6500, total / 2));
    const startTs = performance.now();

    const step = (ts) => {
      const t = Math.min(1, (ts - startTs) / durationMs);
      const targetDist = t * total;

      let walked = 0;
      let idx = 0;
      while (idx < segLens.length && walked + segLens[idx] < targetDist) {
        walked += segLens[idx];
        idx++;
      }

      if (idx >= segLens.length) {
        setAnimatedPos(routePolyline[routePolyline.length - 1]);
        return;
      }

      const segT = segLens[idx] === 0 ? 0 : (targetDist - walked) / segLens[idx];
      const a = points[idx];
      const b = points[idx + 1];
      const lat = a.lat + (b.lat - a.lat) * segT;
      const lng = a.lng + (b.lng - a.lng) * segT;
      setAnimatedPos([lat, lng]);

      if (t < 1) {
        animationRafIdRef.current = requestAnimationFrame(step);
      }
    };

    animationRafIdRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRafIdRef.current) {
        cancelAnimationFrame(animationRafIdRef.current);
        animationRafIdRef.current = null;
      }
    };
  }, [routePolyline]);

  return (
    <div className="bg-surface-0 min-h-screen pb-10">
      <PageHeader title={t('routes.title')} subtitle={t('routes.subtitle')} />

      <div className="mx-auto max-w-7xl px-5 mt-6">
        {/* Form Card */}
        <div className="rounded-lg bg-surface-1 border border-line-200 p-6">
          {recent.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600">
                <History size={14} strokeWidth={1.75} /> {t('common.recent')}
              </span>
              {recent.map((j) => (
                <button
                  key={`${j.from}>${j.to}`}
                  type="button"
                  disabled={loading}
                  onClick={() => runRecent(j.from, j.to)}
                  className="rounded-full border border-line-200 bg-surface-0 px-3 py-1 text-xs font-medium text-ink-900 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                >
                  {localName(j.from)} → {localName(j.to)}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-ink-900 font-sans text-sm">
                  <span className="h-2 w-2 rounded-full bg-ink-900" />
                  <label htmlFor="route-from">{t('common.from')}</label>
                </div>
              </div>
              <select
                id="route-from"
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-line-200 bg-surface-0 px-4 py-2.5 text-sm font-sans text-ink-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
              >
                <option value="">{t('routes.chooseFrom')}</option>
                {stations.map((station) => (
                  <option key={`src-${station}`} value={station} disabled={stationStatus(station) === 'construction'}>{stationOption(station)}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={swapStations}
                disabled={loading}
                className="mt-2 inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-200 bg-surface-0 text-ink-900 hover:bg-line-100 transition disabled:opacity-60"
                aria-label={t('routes.swap')}
              >
                <ArrowRightLeft strokeWidth={1.5} size={18} />
              </button>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-ink-900 font-sans text-sm">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <label htmlFor="route-to">{t('common.to')}</label>
                </div>
              </div>
              <select
                id="route-to"
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-line-200 bg-surface-0 px-4 py-2.5 text-sm font-sans text-ink-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
              >
                <option value="">{t('routes.chooseTo')}</option>
                {stations.map((station) => (
                  <option key={`dest-${station}`} value={station} disabled={stationStatus(station) === 'construction'}>{stationOption(station)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleProceed}
              disabled={loading || !selectedSource || !selectedDest}
              className={
                `flex w-full md:w-auto min-w-[200px] items-center justify-center rounded-md px-6 py-2.5 text-sm font-semibold text-white transition ` +
                (loading || !selectedSource || !selectedDest
                  ? 'bg-ink-300 cursor-not-allowed'
                  : 'bg-navy-900 hover:bg-navy-700 active:scale-95')
              }
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
              ) : (
                t('routes.find')
              )}
            </button>
          </div>

          {error && (
            <div role="alert" className="mt-5 rounded-md border-l-4 border-alert-600 bg-surface-0 px-4 py-3 text-sm text-ink-900">
              {showError(error)}
            </div>
          )}
        </div>

        {loading && <div className="mt-6"><RouteDetailsSkeleton /></div>}

        {routeDetails && !loading && (
          <div className="mt-6 space-y-6">
            {/* Route Summary Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: t('routes.fare'),
                  icon: Banknote,
                  value: routeDetails.fare != null ? `₹${routeDetails.fare}` : '—',
                  note: Object.values(routeDetails.notOpen).includes('work in progress') ? t('routes.fareWip') : t('routes.fareNote'),
                },
                { label: t('routes.time'), icon: Clock, value: routeDetails.minutes != null ? `≈ ${routeDetails.minutes} ${t('unit.min')}` : '—', note: t('routes.timeNote') },
                {
                  label: t('routes.stations'),
                  icon: TrainFront,
                  value: routeDetails.route.length,
                  note: typeof routeDetails.distance === 'number' ? `${routeDetails.distance.toFixed(1)} ${t('unit.km')}` : routeDetails.distance,
                },
                {
                  label: t('routes.changes'),
                  icon: ArrowRightLeft,
                  value: routeDetails.legs.filter((l, i) => i < routeDetails.legs.length - 1 && !l.stay_on_train).length,
                  note: (() => {
                    const changeTrains = routeDetails.legs.filter((l, i) => i < routeDetails.legs.length - 1 && !l.stay_on_train).map((l) => l.to);
                    if (changeTrains.length) return t('routes.changeTrains', { stations: changeTrains.map(localName).join(', ') });
                    return routeDetails.legs.length > 1 ? t('routes.through') : t('routes.sameLine');
                  })(),
                },
              ].map(({ label, icon: Icon, value, note }) => (
                <div key={label} className="rounded-lg border border-line-200 bg-surface-1 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="font-sans text-xs font-medium text-ink-600">{label}</div>
                    <Icon className="text-ink-600" strokeWidth={1.5} size={18} />
                  </div>
                  <div className="mt-1 font-mono text-2xl text-accent tabular-nums">{value}</div>
                  <div className="mt-1 text-xs text-ink-600">{note}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-line-200 bg-surface-1">
                <div className="flex items-center justify-between gap-2 border-b border-line-200 bg-surface-0 px-4 py-3">
                  <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-ink-900">
                    <Route size={16} /> {t('routes.how')}
                  </h3>
                  <button
                    type="button"
                    onClick={share}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line-200 bg-surface-1 px-2.5 py-1 text-xs font-semibold text-ink-900 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {copied ? <Check size={14} className="text-go-600" /> : <Share2 size={14} strokeWidth={1.75} />}
                    {copied ? t('routes.copied') : t('routes.share')}
                  </button>
                </div>
                <div className="p-4">
                  <JourneyLegs legs={routeDetails.legs} />
                  {routeDetails.alternatives.length > 0 && <OtherRoutes routes={routeDetails.alternatives} />}
                </div>
              </div>
              {Object.values(routeDetails.notOpen).includes('work in progress') ? (
                <div className="rounded-lg border border-line-200 border-l-4 border-l-alert-600 bg-surface-1 p-5 text-sm text-ink-900">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Clock size={16} /> {t('status.wip')}
                  </div>
                  {t('routes.wipText', {
                    stations: Object.entries(routeDetails.notOpen)
                      .filter(([, status]) => status === 'work in progress')
                      .map(([name]) => localName(name))
                      .join(', '),
                  })}
                </div>
              ) : routeDetails.nextTrains ? (
                <NextTrainsCard data={routeDetails.nextTrains} />
              ) : (
                <div className="rounded-lg border border-line-200 bg-surface-1 p-5 text-sm text-ink-600">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-ink-900">
                    <Clock size={16} /> {t('routes.freqTitle')}
                  </div>
                  {t('routes.freqText')}
                </div>
              )}
            </div>

            {/* Map and Route Display */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Map */}
              <div className="rounded-lg border border-line-200 bg-surface-1 overflow-hidden flex flex-col h-[500px]">
                <div className="border-b border-line-200 px-4 py-3 bg-surface-0 flex items-center gap-2">
                  <Map size={16} className="text-ink-900" />
                  <h3 className="font-sans font-semibold text-sm text-ink-900">{t('routes.map')}</h3>
                </div>
                <div className="flex-1 w-full relative">
                  {Object.keys(stationCoords).length > 0 && (
                    <MapContainer
                      center={MAP_CENTER}
                      zoom={11}
                      style={{ height: '100%', width: '100%', zIndex: 0 }}
                      scrollWheelZoom={true}
                    >
                      <BaseTiles />
                      <FitNetworkBounds bounds={networkBounds} />
                      <FitRouteBounds bounds={routeBounds} />
                      
                      {/* All metro lines (light) */}
                      {allMetroLines.map((line, idx) => (
                        <Polyline
                          key={`line-${idx}`}
                          positions={line.coords}
                          pathOptions={{
                            color: line.color,
                            weight: 3,
                            opacity: line.wip ? 0.45 : 0.3,
                            dashArray: line.wip ? '8 8' : undefined,
                          }}
                        />
                      ))}

                      {/* Selected route (highlight) */}
                      {routePolyline.length > 1 && (
                        <>
                          <Polyline
                            positions={routePolyline}
                            pathOptions={{
                              color: palette.route,
                              weight: 6,
                              opacity: 0.8
                            }}
                          />
                        </>
                      )}

                      {animatedPos && (
                        <Marker
                          position={animatedPos}
                          icon={animatedIcon}
                          interactive={false}
                          zIndexOffset={1000}
                        />
                      )}

                      {/* All stations */}
                      {Object.entries(stationCoords).map(([name, coords]) => {
                        const isInRoute = routeDetails.route.includes(name);
                        const isSource = name === selectedSource;
                        const isDest = name === selectedDest;
                        const isInterchange = routeDetails.interchanges.includes(name);

                        const stationBorderColor = getStationColor(name);
                        const showPermanentLabel = isSource || isDest || isInterchange;

                        if (isSource) {
                          return (
                            <Marker key={name} position={coords} icon={createRingIcon(palette.ink, palette.fill, [14, 14])}>
                              <Tooltip className="station-tooltip" direction="top" offset={[0, -10]} opacity={1} permanent>
                                <span className="font-sans font-semibold">{localName(name)}</span>
                              </Tooltip>
                            </Marker>
                          );
                        }
                        if (isDest) {
                          return (
                            <Marker key={name} position={coords} icon={createRingIcon(palette.route, palette.fill, [14, 14])}>
                              <Tooltip className="station-tooltip" direction="top" offset={[0, -10]} opacity={1} permanent>
                                <span className="font-sans font-semibold">{localName(name)}</span>
                              </Tooltip>
                            </Marker>
                          );
                        }
                        if (isInRoute) {
                          return (
                            <Marker key={name} position={coords} icon={createRingIcon(stationBorderColor, palette.fill, [10, 10], 2)}>
                              {showPermanentLabel ? (
                                <Tooltip className="station-tooltip" direction="top" offset={[0, -10]} opacity={1} permanent>
                                  <span className="font-sans">{localName(name)}</span>
                                </Tooltip>
                              ) : (
                                <Tooltip className="station-tooltip" direction="top" offset={[0, -10]} opacity={0.9}>
                                  <span className="font-sans">{localName(name)}</span>
                                </Tooltip>
                              )}
                            </Marker>
                          );
                        }
                        return (
                          <Marker key={name} position={coords} icon={createRingIcon(stationBorderColor, palette.fill, [8, 8], 2)}>
                            <Tooltip className="station-tooltip" direction="top" offset={[0, -8]} opacity={0.9}>
                              <span className="font-sans text-xs">{localName(name)}</span>
                            </Tooltip>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  )}
                </div>
              </div>

              {/* Route Details */}
              <div className="rounded-lg border border-line-200 bg-surface-1 overflow-hidden flex flex-col h-[500px]">
                <div className="border-b border-line-200 px-4 py-3 bg-surface-0 flex items-center gap-2">
                  <TrainFront size={16} className="text-ink-900" />
                  <h3 className="font-sans font-semibold text-sm text-ink-900">{t('routes.allStops')}</h3>
                </div>
                <ol className="flex-1 overflow-y-auto p-5 hide-scrollbar">
                  {routeDetails.route.map((station, index) => {
                    const isFirst = index === 0;
                    const isLast = index === routeDetails.route.length - 1;
                    const isInterchange = routeDetails.interchanges.includes(station);
                    const note = stationNote(index);
                    const color = getStationColor(station);
                    return (
                      <li key={station} className="relative flex gap-4 pb-5 last:pb-0">
                        {!isLast && <span className="absolute left-[7px] top-4 h-full w-0.5 bg-line-200" aria-hidden="true" />}
                        <span
                          className="relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] bg-surface-1"
                          style={{ borderColor: isFirst || isLast ? palette.route : color }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className={`font-sans text-sm text-ink-900 ${isFirst || isLast || isInterchange ? 'font-semibold' : ''}`}>{localName(station)}</div>
                          {isFirst && <div className="text-xs text-ink-600">{note}</div>}
                          {isLast && <div className="text-xs text-ink-600">{t('routes.destination')}</div>}
                          {isInterchange && <div className="text-xs font-medium text-accent">{note}</div>}
                          {stationStatus(station) !== 'operational' && (
                            <div className="text-xs font-medium text-alert-600">{t(`status.${stationStatus(station)}`)}</div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutesInfo;
