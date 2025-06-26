import React, { useState, useEffect } from 'react';
import '../App.css';
import { GiPathDistance } from "react-icons/gi";
import { FaSubway } from "react-icons/fa";
import '../styles/route-planner.css';
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
      <div className="metro-path compact-view">
        <div className="path-start">
          <div className="station-marker circle-red"></div>
          <div className="station-name">{selectedSource}</div>
        </div>
        
        <div className="path-line">
          {segments.map((segment, segIndex) => {
            const segmentStations = segment.slice(1, -1);
            const hasIntermediate = segmentStations.length > 0;
            const isExpanded = expandedSegments[segIndex];
            
            return (
              <React.Fragment key={`seg-${segIndex}`}>
                {hasIntermediate && (
                  <div className="path-stop compact-segment">
                    <button 
                      className="expand-btn"
                      onClick={() => toggleSegment(segIndex)}
                    >
                      {isExpanded ? 'Hide Stations' : `Show ${segmentStations.length} Stations`}
                    </button>
                  </div>
                )}
                
                {isExpanded && segmentStations.map((station, idx) => (
                  <div key={`inter-${segIndex}-${idx}`} className="path-stop">
                    <div className={`stop-marker ${routeDetails.interchanges.includes(station) ? 'interchange' : ''}`}>
                      {routeDetails.interchanges.includes(station) && (
                        <div className="interchange-icon">⇄</div>
                      )}
                    </div>
                    <div className="stop-name">{station}</div>
                  </div>
                ))}
                
                <div className="path-stop">
                  <div className={`stop-marker ${segIndex === segments.length - 1 ? 'circle-blue' : 
                    routeDetails.interchanges.includes(segment[segment.length - 1]) ? 'interchange' : ''}`}>
                    {segIndex < segments.length - 1 && routeDetails.interchanges.includes(segment[segment.length - 1]) && (
                      <div className="interchange-icon">⇄</div>
                    )}
                  </div>
                  <div className="stop-name">{segment[segment.length - 1]}</div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="route-planner-container">
      <div className="route-header">
        <div className="header-content">
          <h1>Route Planner</h1>
        </div>
        <div className="metro-line"></div>
      </div>
      
      <div className="route-card">
        <div className="station-selectors">
          <div className="station-input">
            <div className="input-header">
              <div className="input-label">
                <div className="circle circle-red"></div>
                <label>From</label>
              </div>
              <div className="station-count">
                {stations.length} stations
              </div>
            </div>
            <select 
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              disabled={loading}
              className={selectedSource ? 'selected' : ''}
            >
              <option value="">Select departure station</option>
              {stations.map(station => (
                <option key={`src-${station}`} value={station}>{station}</option>
              ))}
            </select>
          </div>
          
          <button className="swap-btn" onClick={swapStations} disabled={loading}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 3 21 3 21 7"></polyline>
              <polyline points="7 21 3 21 3 17"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </button>
          
          <div className="station-input">
            <div className="input-header">
              <div className="input-label">
                <div className="circle circle-blue"></div>
                <label>To</label>
              </div>
              <div className="station-count">
                {stations.length} stations
              </div>
            </div>
            <select 
              value={selectedDest}
              onChange={(e) => setSelectedDest(e.target.value)}
              disabled={loading}
              className={selectedDest ? 'selected' : ''}
            >
              <option value="">Select destination station</option>
              {stations.map(station => (
                <option key={`dest-${station}`} value={station}>{station}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={handleProceed}
          className="submit-btn"
          disabled={loading || !selectedSource || !selectedDest}
        >
          {loading ? (
            <div className="loading-spinner">
              <div></div><div></div><div></div><div></div>
            </div>
          ) : (
            'Find Route'
          )}
        </button>

        {error && <div className="error-message">{error}</div>}

        {routeDetails && (
          <div className="route-results">
            <div className="journey-summary">
              <div className="summary-card">
                <div className="summary-icon">₹</div>
                <div>
                  <div className="summary-label">Total Fare</div>
                  <div className="summary-value">₹{routeDetails.fare}</div>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon"><GiPathDistance /></div>
                <div>
                  <div className="summary-label">Distance</div>
                  <div className="summary-value">
                    {typeof routeDetails.distance === 'number' 
                      ? `${routeDetails.distance.toFixed(2)} km`
                      : routeDetails.distance}
                  </div>
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-icon"><FaSubway /></div>
                <div>
                  <div className="summary-label">Stations</div>
                  <div className="summary-value">{routeDetails.route.length} stations</div>
                </div>
              </div>
            </div>

            {routeDetails.interchanges.length > 0 && (
              <div className="interchange-section">
                <h3>Interchange Stations</h3>
                <div className="interchange-list">
                  {routeDetails.interchanges.map((station, i) => (
                    <div key={i} className="interchange-item">
                      <div className="interchange-badge">Change</div>
                      <div className="interchange-name">{station}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="route-visualization">
              <h3>Your Journey Route</h3>
              {isSmallScreen && routeDetails.interchanges.length > 0 ? (
                renderCompactRoute()
              ) : (
                <div className="metro-path">
                  <div className="path-start">
                    <div className="station-marker circle-red"></div>
                    <div className="station-name">{selectedSource}</div>
                  </div>
                  
                  <div className="path-line">
                    {routeDetails.route.filter(station => station !== selectedSource && station !== selectedDest).map((station, index) => (
                      <div key={index} className="path-stop">
                        <div className={`stop-marker ${routeDetails.interchanges.includes(station) ? 'interchange' : ''}`}>
                          {routeDetails.interchanges.includes(station) && (
                            <div className="interchange-icon">⇄</div>
                          )}
                        </div>
                        <div className="stop-name">{station}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="path-end">
                    <div className="station-marker circle-blue"></div>
                    <div className="station-name">{selectedDest}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutesInfo;
