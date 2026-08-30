import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route, MapPin, TrainFront, Banknote, Map, ArrowRightLeft } from 'lucide-react';
import { RouteDetailsSkeleton } from './Skeleton';

const API_URL = (process.env.REACT_APP_API_BASE_URL || "https://ahmedabad-metro-backend.onrender.com").replace(/\/+$/, "");

const metroLines = {
  "Red Line": ["APMC", "Jivraj Park", "Rajivnagar", "Shreyas", "Paldi", "Gandhigram", "Old High Court", "Usmanpura", "Vijaynagar", "Vadaj", "Ranip", "Sabarmati Railway Station", "AEC", "Sabarmati", "Motera Stadium", "Koteshwar Road"],
  "Blue Line": ["Thaltej Gam", "Thaltej", "Doordarshan Kendra", "Gurukul Road", "Gujarat University", "Commerce Six Road", "SP Stadium", "Old High Court", "Shahpur", "Ghee Kanta", "Kalupur Railway Station", "Kankaria East", "Apparel Park", "Amraivadi", "Rabari Colony", "Vastral", "Nirant Cross Road", "Vastral Gam"],
  "Yellow Line": ["Koteshwar Road", "Vishvakarma College", "Tapovan Circle", "Narmada Canal", "Koba Circle", "Juna Koba", "Koba Gam", "GNLU", "Raysan", "Randesan", "Dholakuva Circle", "Infocity", "Sector-1", "Sector-10A", "Sachivalaya", "Akshardham", "Juna Sachivalaya", "Sector-16", "Sector-24", "Mahatma Mandir"],
  "Violet Line": ["GNLU", "PDEU", "Gift City"]
};

// Use the UI-adjusted accessible hexes from section 1.2
const lineColors = {
  "Red Line": "#E0231F",
  "Blue Line": "#0983CE",
  "Yellow Line": "#C99A00",
  "Violet Line": "#7B12E0"
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const createRingIcon = (borderColor, size = [16, 16], isLarge = false, borderWidth = 3) => {
  const iconSize = isLarge ? [size[0] * 1.5, size[1] * 1.5] : size;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${iconSize[0]}px;
      height: ${iconSize[1]}px;
      background-color: #ffffff;
      border: ${borderWidth}px solid ${borderColor};
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    "></div>`,
    iconSize: iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
  });
};

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
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedDest, setSelectedDest] = useState('');
  const [routeDetails, setRouteDetails] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapCenter] = useState([23.0225, 72.5714]);
  const [mapZoom] = useState(11);
  const [animatedPos, setAnimatedPos] = useState(null);
  const animationRafIdRef = useRef(null);

  const getStationColor = (stationName) => {
    for (const [lineName, stationList] of Object.entries(metroLines)) {
      if (stationList.includes(stationName)) {
        return lineColors[lineName];
      }
    }
    return "#4B5160"; // ink-600
  };
  


  useEffect(() => {
    fetch(`${API_URL}/api/stations`)
      .then(res => res.json())
      .then(data => setStations(data))
      .catch(err => setError('Failed to load stations'));

    fetch(`${API_URL}/api/stations/coordinates`)
      .then(res => res.json())
      .then(data => {
        const coordsMap = {};
        data.forEach(station => {
          coordsMap[station.name] = [station.latitude, station.longitude];
        });
        setStationCoords(coordsMap);
      })
      .catch(err => console.error('Failed to load station coordinates:', err));
  }, []);

  const swapStations = () => {
    const temp = selectedSource;
    setSelectedSource(selectedDest);
    setSelectedDest(temp);
  };

  const getStationInstruction = (station, index) => {
    if (!routeDetails || !routeDetails.instructions) return '';
    
    if (index === 0 && routeDetails.instructions.length > 0) {
      const instruction = routeDetails.instructions[0];
      const match = instruction.match(/\(Take .+?\)$/);
      return match ? ` ${match[0]}` : '';
    }
    
    if (routeDetails.interchanges.includes(station)) {
      const instructionIndex = routeDetails.route.indexOf(station);
      if (instructionIndex >= 0 && instructionIndex < routeDetails.instructions.length) {
        const instruction = routeDetails.instructions[instructionIndex];
        if (instruction.includes('Change from')) {
          const match = instruction.match(/\(Change from .+?\)$/);
          return match ? ` ${match[0]}` : '';
        }
      }
    }
    
    return '';
  };

  const handleProceed = async () => {
    if (!selectedSource || !selectedDest) {
      setError('Please select both source and destination');
      return;
    }
    
    if (selectedSource === selectedDest) {
      setError('Source and destination cannot be the same');
      return;
    }

    setLoading(true);
    setError('');
    setRouteDetails(null);

    try {
      const routeResponse = await fetch(`${API_URL}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: selectedSource, destination: selectedDest })
      });

      if (!routeResponse.ok) {
        const errorData = await routeResponse.json();
        throw new Error(errorData.error || 'Failed to calculate route');
      }

      const routeData = await routeResponse.json();

      const fareResponse = await fetch(`${API_URL}/api/fare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: selectedSource, destination: selectedDest })
      });

      if (!fareResponse.ok) {
        const errorData = await fareResponse.json();
        throw new Error(errorData.error || 'Failed to calculate fare');
      }

      const fareData = await fareResponse.json();

      setRouteDetails({
        route: routeData.route || [],
        interchanges: routeData.interchanges || [],
        instructions: routeData.instructions || [],
        fare: fareData.fare || 0,
        distance: routeData.distance || 0
      });

    } catch (err) {
      setError(err.message);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const routePolyline = useMemo(() => {
    if (!routeDetails || !routeDetails.route || Object.keys(stationCoords).length === 0) return [];
    return routeDetails.route
      .map(station => stationCoords[station])
      .filter(coord => coord !== undefined);
  }, [routeDetails, stationCoords]);

  const allMetroLines = useMemo(() => {
    if (Object.keys(stationCoords).length === 0) return [];
    const lines = [];
    Object.entries(metroLines).forEach(([lineName, stations]) => {
      const coords = stations
        .map(station => stationCoords[station])
        .filter(coord => coord !== undefined);
      if (coords.length > 1) {
        lines.push({ name: lineName, coords, color: lineColors[lineName] });
      }
    });
    return lines;
  }, [stationCoords]);

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
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:#0E2340;border:3px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }, []);

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
      <div className="mx-auto max-w-7xl px-5 pt-8 mb-8 pb-6 border-b border-line-200">
        <h1 className="text-3xl font-bold font-sans text-navy-900 tracking-tight">Plan Journey</h1>
        <p className="text-base text-ink-600 mt-2">Find the best route, fare, and travel time</p>
      </div>

      <div className="mx-auto max-w-7xl px-5 mt-6">
        {/* Form Card */}
        <div className="rounded-lg bg-surface-1 border border-line-200 p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-ink-900 font-sans text-sm">
                  <span className="h-2 w-2 rounded-full bg-ink-900" />
                  <label>From</label>
                </div>
                <div className="font-mono text-xs text-ink-600 px-2 py-1 bg-surface-0 rounded-full border border-line-200">{stations.length} stations</div>
              </div>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-line-200 bg-surface-0 px-4 py-2.5 text-sm font-sans text-ink-900 focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 transition"
              >
                <option value="">Select departure station</option>
                {stations.map((station) => (
                  <option key={`src-${station}`} value={station}>{station}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={swapStations}
                disabled={loading}
                className="mt-2 inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-200 bg-surface-0 text-ink-900 hover:bg-line-100 transition disabled:opacity-60"
                aria-label="Swap"
              >
                <ArrowRightLeft strokeWidth={1.5} size={18} />
              </button>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-ink-900 font-sans text-sm">
                  <span className="h-2 w-2 rounded-full bg-navy-900" />
                  <label>To</label>
                </div>
                <div className="font-mono text-xs text-ink-600 px-2 py-1 bg-surface-0 rounded-full border border-line-200">{stations.length} stations</div>
              </div>
              <select
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-line-200 bg-surface-0 px-4 py-2.5 text-sm font-sans text-ink-900 focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 transition"
              >
                <option value="">Select destination station</option>
                {stations.map((station) => (
                  <option key={`dest-${station}`} value={station}>{station}</option>
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
                'Find Route'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-5 rounded-md border border-alert-600/30 bg-alert-600/10 px-4 py-3 text-sm font-semibold text-alert-600 text-center font-sans">
              {error}
            </div>
          )}
        </div>

        {loading && <div className="mt-6"><RouteDetailsSkeleton /></div>}

        {routeDetails && !loading && (
          <div className="mt-6 space-y-6">
            {/* Route Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-line-200 bg-surface-1 p-5 flex items-center justify-between">
                <div>
                  <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-600 mb-1">Total Fare</div>
                  <div className="font-mono text-2xl text-navy-900 tabular-nums">₹{routeDetails.fare}</div>
                </div>
                <Banknote className="text-ink-600 opacity-50" strokeWidth={1.5} size={28} />
              </div>

              <div className="rounded-lg border border-line-200 bg-surface-1 p-5 flex items-center justify-between">
                <div>
                  <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-600 mb-1">Distance</div>
                  <div className="font-mono text-2xl text-navy-900 tabular-nums">
                    {typeof routeDetails.distance === 'number'
                      ? `${routeDetails.distance.toFixed(2)} km`
                      : routeDetails.distance}
                  </div>
                </div>
                <Route className="text-ink-600 opacity-50" strokeWidth={1.5} size={28} />
              </div>

              <div className="rounded-lg border border-line-200 bg-surface-1 p-5 flex items-center justify-between">
                <div>
                  <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-600 mb-1">Stations</div>
                  <div className="font-mono text-2xl text-navy-900 tabular-nums">{routeDetails.route.length}</div>
                </div>
                <TrainFront className="text-ink-600 opacity-50" strokeWidth={1.5} size={28} />
              </div>

              <div className="rounded-lg border border-line-200 bg-surface-1 p-5 flex items-center justify-between">
                <div>
                  <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-600 mb-1">Interchanges</div>
                  <div className="font-mono text-2xl text-navy-900 tabular-nums">{routeDetails.interchanges.length}</div>
                </div>
                <ArrowRightLeft className="text-ink-600 opacity-50" strokeWidth={1.5} size={28} />
              </div>
            </div>

            {/* Map and Route Display */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Map */}
              <div className="rounded-lg border border-line-200 bg-surface-1 overflow-hidden flex flex-col h-[500px]">
                <div className="border-b border-line-200 px-4 py-3 bg-surface-0 flex items-center gap-2">
                  <Map size={16} className="text-ink-900" />
                  <h3 className="font-sans font-semibold text-sm text-ink-900">Route Map</h3>
                </div>
                <div className="flex-1 w-full relative">
                  {Object.keys(stationCoords).length > 0 && (
                    <MapContainer
                      center={mapCenter}
                      zoom={mapZoom}
                      style={{ height: '100%', width: '100%', zIndex: 0 }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors"
                        className="map-tiles"
                      />
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
                            opacity: 0.3
                          }}
                        />
                      ))}

                      {/* Selected route (highlight) */}
                      {routePolyline.length > 1 && (
                        <>
                          <Polyline
                            positions={routePolyline}
                            pathOptions={{
                              color: '#0E2340', // navy-900 for route highlight
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
                            <Marker key={name} position={coords} icon={createRingIcon('#12151B', [14, 14])}>
                              <Tooltip className="station-tooltip" direction="top" offset={[0, -10]} opacity={1} permanent>
                                <span className="font-sans font-semibold">{name}</span>
                              </Tooltip>
                            </Marker>
                          );
                        }
                        if (isDest) {
                          return (
                            <Marker key={name} position={coords} icon={createRingIcon('#0E2340', [14, 14])}>
                              <Tooltip className="station-tooltip" direction="top" offset={[0, -10]} opacity={1} permanent>
                                <span className="font-sans font-semibold">{name}</span>
                              </Tooltip>
                            </Marker>
                          );
                        }
                        if (isInRoute) {
                          return (
                            <Marker key={name} position={coords} icon={createRingIcon(stationBorderColor, [10, 10], false, 2)}>
                              {showPermanentLabel ? (
                                <Tooltip className="station-tooltip" direction="top" offset={[0, -10]} opacity={1} permanent>
                                  <span className="font-sans">{name}</span>
                                </Tooltip>
                              ) : (
                                <Tooltip className="station-tooltip" direction="top" offset={[0, -10]} opacity={0.9}>
                                  <span className="font-sans">{name}</span>
                                </Tooltip>
                              )}
                            </Marker>
                          );
                        }
                        return (
                          <Marker key={name} position={coords} icon={createRingIcon(stationBorderColor, [8, 8], false, 2)}>
                            <Tooltip className="station-tooltip" direction="top" offset={[0, -8]} opacity={0.9}>
                              <span className="font-sans text-xs">{name}</span>
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
                  <h3 className="font-sans font-semibold text-sm text-ink-900">Your Journey</h3>
                </div>
                <div className="p-5 flex-1 overflow-y-auto hide-scrollbar">
                  <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-line-200">
                    {/* Source */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-6">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-line-200 bg-surface-1 text-ink-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <MapPin size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-md border border-line-200 bg-surface-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-bold text-ink-900 font-sans">{selectedSource}</div>
                        </div>
                        <div className="text-sm text-ink-600 font-sans">
                          Start
                        </div>
                      </div>
                    </div>

                    {/* Intermediate stations */}
                    {routeDetails.route
                      .filter((station) => station !== selectedSource && station !== selectedDest)
                      .map((station, index) => {
                        const routeIndex = routeDetails.route.indexOf(station);
                        const isInterchange = routeDetails.interchanges.includes(station);
                        const stationColor = getStationColor(station);
                        const instruction = getStationInstruction(station, routeIndex);

                        return (
                          <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-6">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-surface-0 bg-surface-1 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" style={{ borderColor: isInterchange ? stationColor : '#E2E8F0' }}>
                               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stationColor }}></div>
                            </div>
                            <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-md border ${isInterchange ? 'border-navy-900 bg-navy-100/30' : 'border-line-100 bg-surface-1'}`}>
                              <div className="font-semibold text-ink-900 font-sans">{station}</div>
                              {isInterchange && (
                                <div className="text-sm text-navy-900 font-sans mt-1 font-medium">
                                  Interchange {instruction && `· ${instruction}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {/* Destination */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-line-200 bg-navy-900 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <MapPin size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-md border border-navy-900 bg-navy-100/30">
                        <div className="font-bold text-ink-900 font-sans">{selectedDest}</div>
                        <div className="text-sm text-navy-900 font-sans font-medium mt-1">
                          Destination
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutesInfo;
