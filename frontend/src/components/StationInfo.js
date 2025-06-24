import React, { useState, useEffect } from 'react';
import { Mountain, Minus } from 'lucide-react';
import { FaDoorOpen } from "react-icons/fa";
import stationData from '../data/stationData.json';
import '../styles/info-page.css';

const StationInfo = () => {
  const [stations, setStations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStationData = () => {
      setStations(stationData);
      setIsLoading(false);
    };

    // Simulate API/JSON loading delay
    setTimeout(fetchStationData, 800);
  }, []);

  const filteredStations = stations.filter(station => {
    // Apply corridor filter
    if (filter !== 'all' && station.corridor !== filter) return false;
    
    // Apply search filter
    if (searchTerm && !station.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  if (isLoading) {
    return (
      <div className="station-info-container">
        <div className="loading-spinner">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p>Loading station information...</p>
      </div>
    );
  }

  return (
    <div className="station-info-container">
      <div className="station-header">
        <div className="header-content">
          <h1>Entry-Exit Information</h1>
          <p>Gate details and accessibility facilities at all Ahmedabad Metro stations</p>
        </div>
        <div className="metro-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="16" rx="2" />
            <path d="M12 18v-6" />
            <circle cx="8.5" cy="10.5" r="1.5" />
            <circle cx="15.5" cy="10.5" r="1.5" />
            <path d="M6 22h12" />
          </svg>
        </div>
      </div>
      
      <div className="station-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search stations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button className="search-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Stations
          </button>
          <button 
            className={`tab-btn ${filter === 'East-West' ? 'active' : ''}`}
            onClick={() => setFilter('East-West')}
          >
            East-West Corridor
          </button>
          <button 
            className={`tab-btn ${filter === 'North-South' ? 'active' : ''}`}
            onClick={() => setFilter('North-South')}
          >
            North-South Corridor
          </button>
          <button 
            className={`tab-btn ${filter === 'Corridor-1' ? 'active' : ''}`}
            onClick={() => setFilter('Corridor-1')}
          >
            Corridor-1
          </button>
          <button 
            className={`tab-btn ${filter === 'Corridor-2' ? 'active' : ''}`}
            onClick={() => setFilter('Corridor-2')}
          >
            Corridor-2
          </button>
        </div>
      </div>
      
      <div className="station-count">
        Showing {filteredStations.length} of {stations.length} stations
      </div>
      
      <div className="station-cards">
        {filteredStations.map(station => (
          <div key={station.id} className="station-card">
            <div className="station-header">
              <h3>{station.name}</h3>
              <div className="station-tags">
                <span className={`corridor-tag ${
                  station.corridor === 'East-West' ? 'east-west' : 
                  station.corridor === 'North-South' ? 'north-south' :
                  station.corridor === 'Corridor-1' ? 'corridor-1' :
                  station.corridor === 'Corridor-2' ? 'corridor-2' : 'default'
                }`}>
                  {station.corridor}
                </span>
                <span className="type-tag">
                  {station.type === 'Elevated' ? (
                    <>
                      <Mountain size={14} />
                      <span>Elevated</span>
                    </>
                  ) : station.type === 'Underground' ? (
                    <>
                      <Minus size={14} />
                      <span>Underground</span>
                    </>
                  ) : (
                    <span>{station.type}</span>
                  )}
                </span>
              </div>
            </div>
            
            <div className="station-details">
              <div className="detail-section">
                <h4>Operational Gates</h4>
                <div className="gate-list">
                  {station.gates.map((gate, index) => (
                    <div key={index} className="gate-item">
                      <FaDoorOpen size={24} color='#000066' />
                      <span>{gate}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="detail-section">
                <h4>Accessibility Facilities</h4>
                <div className="facility-list">
                  {station.facilities.length > 0 ? (
                    station.facilities.map((facility, index) => (
                      <div key={index} className="facility-item">
                        <div className="facility-icon">♿</div>
                        <span>{facility}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-facilities">
                      No dedicated facilities listed
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StationInfo;