import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GiPathDistance } from "react-icons/gi";
import { FaSubway, FaMapMarkerAlt, FaExchangeAlt } from "react-icons/fa";

const API_URL = (process.env.REACT_APP_API_BASE_URL || "https://ahmedabad-metro-backend.onrender.com").replace(/\/+$/, "");

// Metro line data (constants - moved outside component)
const metroLines = {
  "Red Line": ["APMC", "Jivraj Park", "Rajivnagar", "Shreyas", "Paldi", "Gandhigram", "Old High Court", "Usmanpura", "Vijaynagar", "Vadaj", "Ranip", "Sabarmati Railway Station", "AEC", "Sabarmati", "Motera Stadium"],
  "Blue Line": ["Thaltej Gam", "Thaltej", "Doordarshan Kendra", "Gurukul Road", "Gujarat University", "Commerce Six Road", "SP Stadium", "Old High Court", "Shahpur", "Ghee Kanta", "Kalupur Railway Station", "Kankaria East", "Apparel Park", "Amraivadi", "Rabari Colony", "Vastral", "Nirant Cross Road", "Vastral Gam"],
  "Yellow Line": ["Motera Stadium", "Koteshwar Road", "Vishvakarma College", "Tapovan Circle", "Narmada Canal", "Koba Circle", "Juna Koba", "Koba Gam", "GNLU", "Raysan", "Randesan", "Dholakuva Circle", "Infocity", "Sector-1", "Sector-10A", "Sachivalaya", "Akshardham", "Juna Sachivalaya", "Sector-16", "Sector-24", "Mahatma Mandir"],
  "Violet Line": ["GNLU", "PDEU", "Gift City"]
};

const lineColors = {
  "Red Line": "#c0392b",
  "Blue Line": "#3498db",
  "Yellow Line": "#ffd700",
  "Violet Line": "#8e44ad"
};

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons for stations
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
      box-shadow: 0 2px 10px rgba(0,0,0,0.18);
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
  const [mapCenter, setMapCenter] = useState([23.0225, 72.5714]); // Ahmedabad center
  const [mapZoom, setMapZoom] = useState(11);
  const [animatedPos, setAnimatedPos] = useState(null);
  const animationRafIdRef = useRef(null);

  // Function to get the color of a station based on its line
  const getStationColor = (stationName) => {
    for (const [lineName, stationList] of Object.entries(metroLines)) {
      if (stationList.includes(stationName)) {
        return lineColors[lineName];
      }
    }
    return "#666";
  };

  // Fetch stations and coordinates
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
        body: JSON.stringify({ 
          source: selectedSource, 
          destination: selectedDest 
        })
      });

      if (!routeResponse.ok) {
        const errorData = await routeResponse.json();
        throw new Error(errorData.error || 'Failed to calculate route');
      }

      const routeData = await routeResponse.json();

      const fareResponse = await fetch(`${API_URL}/api/fare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: selectedSource, 
          destination: selectedDest 
        })
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

  // Get route polyline coordinates
  const routePolyline = useMemo(() => {
    if (!routeDetails || !routeDetails.route || Object.keys(stationCoords).length === 0) return [];
    return routeDetails.route
      .map(station => stationCoords[station])
      .filter(coord => coord !== undefined);
  }, [routeDetails, stationCoords]);

  // Get all metro line polylines (for background)
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
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:#1e40af;border:3px solid #fff;box-shadow:0 8px 16px rgba(30,64,175,0.35);"></div>`,
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
    <div className="mx-auto max-w-7xl px-5 pb-10">
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-[0_10px_30px_rgba(26,42,108,0.2)] px-6 py-6 md:px-10 md:py-8 relative overflow-hidden">
        <div className="absolute -right-10 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border-8 border-white/15 md:block" />
        <div className="relative">
          <h1 className="text-2xl md:text-[2.2rem] font-bold tracking-tight">Plan Your Journey</h1>
          <p className="mt-2 text-sm text-white/90">Find the best route, fare, and travel time</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]" />
                <label>From</label>
              </div>
              <div className="text-xs font-semibold text-slate-500 rounded-full bg-slate-100 px-3 py-1">{stations.length} stations</div>
            </div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-200 focus:border-brand-400 transition"
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
              className="mt-2 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition disabled:opacity-60"
              aria-label="Swap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 3 21 3 21 7"></polyline>
                <polyline points="7 21 3 21 3 17"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <span className="h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.2)]" />
                <label>To</label>
              </div>
              <div className="text-xs font-semibold text-slate-500 rounded-full bg-slate-100 px-3 py-1">{stations.length} stations</div>
            </div>
            <select
              value={selectedDest}
              onChange={(e) => setSelectedDest(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-200 focus:border-brand-400 transition"
            >
              <option value="">Select destination station</option>
              {stations.map((station) => (
                <option key={`dest-${station}`} value={station}>{station}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleProceed}
          disabled={loading || !selectedSource || !selectedDest}
          className={
            `mt-6 mx-auto flex w-full max-w-sm items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition ` +
            (loading || !selectedSource || !selectedDest
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-br from-brand-900 to-brand-700 hover:-translate-y-0.5 hover:shadow-xl')
          }
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white" />
          ) : (
            'Find Route'
          )}
        </button>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 text-center">
            {error}
          </div>
        )}
      </div>

      {routeDetails && (
        <div className="mt-6 space-y-6">
          {/* Route Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                  ₹
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Fare</div>
                  <div className="mt-1 text-3xl font-bold text-slate-900">₹{routeDetails.fare}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-sky-600 to-sky-800 text-white flex items-center justify-center text-2xl shadow-md">
                  <GiPathDistance />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Distance</div>
                  <div className="mt-1 text-3xl font-bold text-slate-900">
                    {typeof routeDetails.distance === 'number'
                      ? `${routeDetails.distance.toFixed(2)} km`
                      : routeDetails.distance}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-lg sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center text-2xl shadow-md">
                  <FaSubway />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stations</div>
                  <div className="mt-1 text-3xl font-bold text-slate-900">{routeDetails.route.length} stops</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map and Route Display */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Map */}
            <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-brand-900 to-brand-700 px-5 py-3 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FaMapMarkerAlt /> Route Map
                </h3>
              </div>
              <div className="h-[500px] w-full">
                {Object.keys(stationCoords).length > 0 && (
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%', backgroundColor: '#f8fafc' }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                    dragging={true}
                    doubleClickZoom={true}
                    touchZoom={true}
                    boxZoom={true}
                    keyboard={true}
                  >
                    <FitNetworkBounds bounds={networkBounds} />
                    <FitRouteBounds bounds={routeBounds} />
                    {/* All metro lines (light) */}
                    {allMetroLines.map((line, idx) => (
                      <Polyline
                        key={`line-${idx}`}
                        positions={line.coords}
                        pathOptions={{
                          color: line.color,
                          weight: 4,
                          opacity: 0.9
                        }}
                      />
                    ))}

                    {/* Selected route (highlight) */}
                    {routePolyline.length > 1 && (
                      <>
                        <Polyline
                          positions={routePolyline}
                          pathOptions={{
                            color: '#2563eb',
                            weight: 14,
                            opacity: 0.25,
                            className: 'route-glow'
                          }}
                        />
                        <Polyline
                          positions={routePolyline}
                          pathOptions={{
                            color: '#1d4ed8',
                            weight: 8,
                            opacity: 0.95
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

                    {/* All stations (light) */}
                    {Object.entries(stationCoords).map(([name, coords]) => {
                      const isInRoute = routeDetails.route.includes(name);
                      const isSource = name === selectedSource;
                      const isDest = name === selectedDest;
                      const isInterchange = routeDetails.interchanges.includes(name);

                      const stationBorderColor = getStationColor(name);
                      const showPermanentLabel = isSource || isDest || isInterchange;

                      if (isSource) {
                        return (
                          <Marker
                            key={name}
                            position={coords}
                            icon={createRingIcon('#ef4444', [18, 18])}
                          >
                            <Tooltip
                              className="station-tooltip"
                              direction="top"
                              offset={[0, -10]}
                              opacity={1}
                              permanent
                            >
                              {name}
                            </Tooltip>
                            <Popup>
                              <div className="font-bold text-red-600">FROM: {name}</div>
                            </Popup>
                          </Marker>
                        );
                      }
                      if (isDest) {
                        return (
                          <Marker
                            key={name}
                            position={coords}
                            icon={createRingIcon('#0ea5e9', [18, 18])}
                          >
                            <Tooltip
                              className="station-tooltip"
                              direction="top"
                              offset={[0, -10]}
                              opacity={1}
                              permanent
                            >
                              {name}
                            </Tooltip>
                            <Popup>
                              <div className="font-bold text-sky-600">TO: {name}</div>
                            </Popup>
                          </Marker>
                        );
                      }
                      if (isInRoute) {
                        return (
                          <Marker
                            key={name}
                            position={coords}
                            icon={createRingIcon(stationBorderColor, [12, 12], false, 2)}
                          >
                            {showPermanentLabel ? (
                              <Tooltip
                                className="station-tooltip"
                                direction="top"
                                offset={[0, -10]}
                                opacity={1}
                                permanent
                              >
                                {name}
                              </Tooltip>
                            ) : (
                              <Tooltip
                                className="station-tooltip"
                                direction="top"
                                offset={[0, -10]}
                                opacity={0.95}
                              >
                                {name}
                              </Tooltip>
                            )}
                            <Popup>
                              <div className="text-sm font-medium">{name}</div>
                              {isInterchange && (
                                <div className="text-xs text-amber-600 mt-1">
                                  <FaExchangeAlt className="inline mr-1" /> Interchange
                                </div>
                              )}
                            </Popup>
                          </Marker>
                        );
                      }
                      return (
                        <Marker
                          key={name}
                          position={coords}
                          icon={createRingIcon(stationBorderColor, [12, 12], false, 2)}
                        >
                          <Tooltip
                            className="station-tooltip"
                            direction="top"
                            offset={[0, -8]}
                            opacity={0.9}
                          >
                            {name}
                          </Tooltip>
                          <Popup>
                            <div className="text-xs text-slate-500">{name}</div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                )}
              </div>
            </div>

            {/* Route Details */}
            <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-brand-900 to-brand-700 px-5 py-3 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FaSubway /> Your Journey Route
                </h3>
              </div>
              <div className="p-6 max-h-[500px] overflow-y-auto">
                <div className="space-y-4">
                  {/* Source */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-red-50 to-white border-2 border-red-200">
                    <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-lg text-slate-900">{selectedSource}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                          <FaMapMarkerAlt /> Start
                        </span>
                        <span className="ml-2 text-slate-500">{getStationInstruction(selectedSource, 0)}</span>
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

                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-4 p-4 rounded-xl border-2 ${
                            isInterchange
                              ? 'bg-gradient-to-r from-amber-50 to-white border-amber-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                            style={{ backgroundColor: isInterchange ? '#f59e0b' : stationColor }}
                          >
                            {isInterchange ? (
                              <FaExchangeAlt className="text-white text-sm" />
                            ) : (
                              <span className="text-white font-bold text-xs">{index + 2}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">{station}</div>
                            <div className="text-sm text-slate-600 mt-1">
                              {isInterchange && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold mr-2">
                                  <FaExchangeAlt /> Change Line
                                </span>
                              )}
                              <span className="text-slate-500">{getStationInstruction(station, routeIndex)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* Destination */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-sky-50 to-white border-2 border-sky-200">
                    <div className="h-10 w-10 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <span className="text-white font-bold text-sm">✓</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-lg text-slate-900">{selectedDest}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">
                          <FaMapMarkerAlt /> Destination
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {routeDetails.interchanges.length > 0 && (
                  <div className="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                    <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <FaExchangeAlt /> Interchange Stations ({routeDetails.interchanges.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {routeDetails.interchanges.map((station, i) => (
                        <div key={i} className="inline-flex items-center overflow-hidden rounded-full bg-white shadow-sm border border-amber-300">
                          <span className="bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">Change</span>
                          <span className="px-3 py-1.5 text-xs font-semibold text-slate-800">{station}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesInfo;
