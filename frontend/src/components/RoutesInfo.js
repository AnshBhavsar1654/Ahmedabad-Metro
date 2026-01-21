import React, { useState, useEffect } from 'react';
import { GiPathDistance } from "react-icons/gi";
import { FaSubway } from "react-icons/fa";
const API_URL = "https://ahmedabad-metro-backend.onrender.com";
console.log("API BASE URL:", process.env.REACT_APP_API_BASE_URL);

const RoutesInfo = () => {
  const [stations, setStations] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedDest, setSelectedDest] = useState('');
  const [routeDetails, setRouteDetails] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 480);
  const [expandedSegments, setExpandedSegments] = useState([]);

  // Metro line data
  const metroLines = {
    "Red Line": ["APMC", "Jivraj Park", "Rajivnagar", "Shreyas", "Paldi", "Gandhigram", "Old High Court", "Usmanpura", "Vijaynagar", "Vadaj", "Ranip", "Sabarmati Railway Station", "AEC", "Sabarmati", "Motera Stadium"],
    "Blue Line": ["Thaltej Gam", "Thaltej", "Doordarshan Kendra", "Gurukul Road", "Gujarat University", "Commerce Six Road", "SP Stadium", "Old High Court", "Shahpur", "Ghee Kanta", "Kalupur Railway Station", "Kankaria East", "Apparel Park", "Amraivadi", "Rabari Colony", "Vastral", "Nirant Cross Road", "Vastral Gam"],
    "Yellow Line": ["Motera Stadium", "Koteshwar Road", "Vishvakarma College", "Tapovan Circle", "Narmada Canal", "Koba Circle", "Juna Koba", "Koba Gam", "GNLU", "Raysan", "Randesan", "Dholakuva Circle", "Infocity", "Sector-1", "Sector-10A", "Sachivalaya", "Akshardham", "Juna Sachivalaya", "Sector-16", "Sector-24", "Mahatma Mandir"],
    "Violet Line": ["GNLU", "PDEU", "GIFT City"]
  };

  const lineColors = {
    "Red Line": "#c0392b",
    "Blue Line": "#3498db",
    "Yellow Line": "#ffd700",
    "Violet Line": "#8e44ad"
  };

  // Function to get the color of a station based on its line
  const getStationColor = (stationName) => {
    for (const [lineName, stationList] of Object.entries(metroLines)) {
      if (stationList.includes(stationName)) {
        return lineColors[lineName];
      }
    }
    return "#666"; // Default color if station not found
  };

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/stations`)
      .then(res => res.json())
      .then(data => setStations(data))
      .catch(err => setError('Failed to load stations'));
  }, []);

  useEffect(() => {
    if (routeDetails && routeDetails.interchanges.length > 0) {
      setExpandedSegments(Array(routeDetails.interchanges.length + 1).fill(false));
    }
  }, [routeDetails]);

  const swapStations = () => {
    const temp = selectedSource;
    setSelectedSource(selectedDest);
    setSelectedDest(temp);
  };

  const getStationInstruction = (station, index) => {
    if (!routeDetails || !routeDetails.instructions) return '';
    
    // For the first station (source)
    if (index === 0 && routeDetails.instructions.length > 0) {
      const instruction = routeDetails.instructions[0];
      // Extract just the line info from "Start at StationName (Take Red Line)"
      const match = instruction.match(/\(Take .+?\)$/);
      return match ? ` ${match[0]}` : '';
    }
    
    // For interchange stations
    if (routeDetails.interchanges.includes(station)) {
      const instructionIndex = routeDetails.route.indexOf(station);
      if (instructionIndex >= 0 && instructionIndex < routeDetails.instructions.length) {
        const instruction = routeDetails.instructions[instructionIndex];
        // Check if this is a line change instruction
        if (instruction.includes('Change from')) {
          // Extract just the line change info from "StationName (Change from Red Line to Blue Line)"
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

  const toggleSegment = (index) => {
    const newExpandedSegments = [...expandedSegments];
    newExpandedSegments[index] = !newExpandedSegments[index];
    setExpandedSegments(newExpandedSegments);
  };

  const renderCompactRoute = () => {
    if (!routeDetails || routeDetails.route.length === 0) return null;
    
    const keyStations = [selectedSource, ...routeDetails.interchanges, selectedDest];
    const segments = [];
    let lastIndex = 0;
    
    for (let i = 0; i < keyStations.length - 1; i++) {
      const startStation = keyStations[i];
      const endStation = keyStations[i + 1];
      const startIdx = routeDetails.route.indexOf(startStation, lastIndex);
      const endIdx = routeDetails.route.indexOf(endStation, startIdx + 1);
      
      if (startIdx === -1 || endIdx === -1) break;
      
      segments.push(routeDetails.route.slice(startIdx, endIdx + 1));
      lastIndex = endIdx;
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div
            className="h-6 w-6 rounded-full"
            style={{ backgroundColor: getStationColor(selectedSource) }}
          />
          <div className="font-semibold text-slate-900">
            {selectedSource}
            <span className="text-slate-600">{getStationInstruction(selectedSource, 0)}</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {segments.map((segment, segIndex) => {
            const segmentStations = segment.slice(1, -1);
            const hasIntermediate = segmentStations.length > 0;
            const isExpanded = expandedSegments[segIndex];

            return (
              <React.Fragment key={`seg-${segIndex}`}>
                {hasIntermediate && (
                  <div className="text-center">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 transition"
                      onClick={() => toggleSegment(segIndex)}
                    >
                      {isExpanded ? 'Hide Stations' : `Show ${segmentStations.length} Stations`}
                    </button>
                  </div>
                )}

                {isExpanded && segmentStations.map((station, idx) => {
                  const routeIndex = routeDetails.route.indexOf(station);
                  const isInterchange = routeDetails.interchanges.includes(station);
                  const color = getStationColor(station);

                  return (
                    <div key={`inter-${segIndex}-${idx}`} className="flex items-start gap-3">
                      <div
                        className={
                          `mt-1 flex h-5 w-5 items-center justify-center rounded-full ` +
                          (isInterchange ? 'bg-amber-500' : '')
                        }
                        style={!isInterchange ? { backgroundColor: color } : {}}
                      >
                        {isInterchange && (
                          <span className="text-[10px] font-bold text-white">⇄</span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-slate-700">
                        {station}
                        <span className="text-slate-500">{getStationInstruction(station, routeIndex)}</span>
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-start gap-3">
                  {(() => {
                    const stationName = segment[segment.length - 1];
                    const isLast = segIndex === segments.length - 1;
                    const isInterchange = !isLast && routeDetails.interchanges.includes(stationName);

                    return (
                      <>
                        <div
                          className={
                            `mt-1 flex h-5 w-5 items-center justify-center rounded-full ` +
                            (isInterchange ? 'bg-amber-500' : '')
                          }
                          style={!isInterchange ? { backgroundColor: getStationColor(isLast ? selectedDest : stationName) } : {}}
                        >
                          {isInterchange && (
                            <span className="text-[10px] font-bold text-white">⇄</span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {stationName}
                          <span className="text-slate-500">
                            {isLast ? '' : getStationInstruction(stationName, routeDetails.route.indexOf(stationName))}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10">
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-[0_10px_30px_rgba(26,42,108,0.2)] px-6 py-6 md:px-10 md:py-8 relative overflow-hidden">
        <div className="absolute -right-10 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border-8 border-white/15 md:block" />
        <div className="relative">
          <h1 className="text-2xl md:text-[2.2rem] font-bold tracking-tight">Route Planner</h1>
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
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-200 focus:border-brand-400"
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
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-200 focus:border-brand-400"
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
            `mt-6 mx-auto flex w-full max-w-sm items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow transition ` +
            (loading || !selectedSource || !selectedDest
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-br from-brand-900 to-brand-700 hover:-translate-y-0.5')
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

        {routeDetails && (
          <div className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-900 flex items-center justify-center font-bold text-xl">₹</div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Total Fare</div>
                  <div className="text-2xl font-bold text-slate-900">₹{routeDetails.fare}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-900 flex items-center justify-center text-xl">
                  <GiPathDistance />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Distance</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {typeof routeDetails.distance === 'number'
                      ? `${routeDetails.distance.toFixed(2)} km`
                      : routeDetails.distance}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-900 flex items-center justify-center text-xl">
                  <FaSubway />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Stations</div>
                  <div className="text-2xl font-bold text-slate-900">{routeDetails.route.length} stations</div>
                </div>
              </div>
            </div>

            {routeDetails.interchanges.length > 0 && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="text-base font-bold text-amber-900">Interchange Stations</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {routeDetails.interchanges.map((station, i) => (
                    <div key={i} className="inline-flex items-center overflow-hidden rounded-full bg-white shadow-sm">
                      <span className="bg-amber-500 px-3 py-2 text-xs font-bold text-white">Change</span>
                      <span className="px-3 py-2 text-xs font-semibold text-slate-800">{station}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-bold text-slate-900">Your Journey Route</h3>
              <div className="mt-4">
                {isSmallScreen && routeDetails.interchanges.length > 0 ? (
                  renderCompactRoute()
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full" style={{ backgroundColor: getStationColor(selectedSource) }} />
                      <div className="font-semibold text-slate-900">
                        {selectedSource}
                        <span className="text-slate-600">{getStationInstruction(selectedSource, 0)}</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {routeDetails.route
                        .filter((station) => station !== selectedSource && station !== selectedDest)
                        .map((station, index) => {
                          const routeIndex = routeDetails.route.indexOf(station);
                          const isInterchange = routeDetails.interchanges.includes(station);

                          return (
                            <div key={index} className="flex items-start gap-3">
                              <div
                                className={
                                  `mt-1 flex h-5 w-5 items-center justify-center rounded-full ` +
                                  (isInterchange ? 'bg-amber-500' : '')
                                }
                                style={!isInterchange ? { backgroundColor: getStationColor(station) } : {}}
                              >
                                {isInterchange && <span className="text-[10px] font-bold text-white">⇄</span>}
                              </div>
                              <div className="text-sm font-medium text-slate-700">
                                {station}
                                <span className="text-slate-500">{getStationInstruction(station, routeIndex)}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full" style={{ backgroundColor: getStationColor(selectedDest) }} />
                      <div className="font-bold text-slate-900">{selectedDest}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutesInfo;