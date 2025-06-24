import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import '../styles/NearestStations.css';
const API_URL = process.env.REACT_APP_API_BASE_URL;

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Create custom red icon for user location
const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="25" height="41">
      <path fill="#dc2626" stroke="#991b1b" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  shadowSize: [41, 41]
});

const NearestStations = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearestStations, setNearestStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getHighAccuracyLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      let watchId;
      let bestLocation = null;
      let attempts = 0;
      const maxAttempts = 3;

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      };

      const handleSuccess = (position) => {
        attempts++;
        const currentAccuracy = position.coords.accuracy;
        
        if (!bestLocation || currentAccuracy < bestLocation.coords.accuracy || attempts >= maxAttempts) {
          bestLocation = position;
          setLocationAccuracy(Math.round(currentAccuracy));
        }

        if (currentAccuracy < 20 || attempts >= maxAttempts) {
          if (watchId) navigator.geolocation.clearWatch(watchId);
          resolve(bestLocation);
        }
      };

      const handleError = (error) => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
        
        const fallbackOptions = {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        };

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          fallbackOptions
        );
      };

      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

      setTimeout(() => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
        if (bestLocation) {
          resolve(bestLocation);
        } else {
          reject(new Error('Could not get accurate location'));
        }
      }, 20000);
    });
  };

  const fetchLocationAndStations = async () => {
    try {
      setError('');
      
      const position = await getHighAccuracyLocation();
      const { latitude, longitude, accuracy } = position.coords;
      
      setUserLocation([latitude, longitude]);
      setLocationAccuracy(Math.round(accuracy));
      
      const response = await axios.get('${API_URL}/api/stations/nearby', {
        params: { lat: latitude, lng: longitude }
      });
      
      setNearestStations(response.data);
      
    } catch (err) {
      console.error('Error:', err);
      if (err.code === 1) {
        setError('Location access denied. Please enable location services and refresh the page.');
      } else if (err.code === 2) {
        setError('Location not available. Please check your GPS/WiFi connection.');
      } else if (err.code === 3) {
        setError('Location request timed out. Please try again.');
      } else {
        setError('Error fetching location or stations: ' + err.message);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefreshLocation = async () => {
    setIsRefreshing(true);
    setLoading(true);
    await fetchLocationAndStations();
  };

  useEffect(() => {
    fetchLocationAndStations();
  }, []);

  return (
    <div className="nearest-stations-container">
      <div className="stations-header">
        <div className="header-content">
          <h1>Find Nearest Metro Stations</h1>
          <p>Discover the closest metro stations to your current location</p>
        </div>
        <div className="location-indicator">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>
      
      <div className="stations-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            <p>{isRefreshing ? 'Refreshing location...' : 'Getting precise location...'}</p>
            <p className="loading-note">This may take a few seconds for better accuracy</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button 
              onClick={handleRefreshLocation}
              className="refresh-btn"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="location-controls">
              <div className="accuracy-info">
                <span>Location accuracy: </span>
                <span className={`accuracy-value ${locationAccuracy < 50 ? 'high' : locationAccuracy < 100 ? 'medium' : 'low'}`}>
                  {locationAccuracy}m
                </span>
              </div>
              <button 
                onClick={handleRefreshLocation}
                disabled={isRefreshing}
                className="refresh-location-btn"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Location'}
              </button>
            </div>
            
            {locationAccuracy > 100 && (
              <div className="accuracy-warning">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Location accuracy is low ({locationAccuracy}m). For better results, ensure GPS is enabled and you're outdoors.
              </div>
            )}
            
            <div className="stations-results">
              <div className="stations-list">
                <h2 className="results-title">Nearest Stations</h2>
                <div className="stations-grid">
                  {nearestStations.map((station, index) => (
                    <div key={index} className="station-card">
                      <div className="station-rank">
                        <span className={`rank-badge ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}`}>
                          {index + 1}
                        </span>
                      </div>
                      <div className="station-info">
                        <h3 className="station-name">{station.name}</h3>
                        <div className="station-meta">
                          <div className="distance-info">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="10" r="3"></circle>
                              <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"></path>
                            </svg>
                            <span>{station.distance} km away</span>
                          </div>
                          <div className="coordinates">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="9" y1="3" x2="9" y2="21"></line>
                            </svg>
                            <span>{station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="map-container">
                <h2 className="results-title">Map View</h2>
                <div className="map-wrapper">
                  <MapContainer 
                    center={userLocation} 
                    zoom={15} 
                    className="map-view"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* User location marker with custom red icon */}
                    <Marker position={userLocation} icon={userLocationIcon}>
                      <Popup>
                        <div className="map-popup">
                          <strong>Your Location</strong>
                          <div>Accuracy: {locationAccuracy}m</div>
                          <div className="coordinates">{userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}</div>
                        </div>
                      </Popup>
                    </Marker>
                    
                    {/* Station markers with default blue icons */}
                    {nearestStations.map((station, index) => (
                      <Marker 
                        key={index} 
                        position={[station.latitude, station.longitude]}
                      >
                        <Popup>
                          <div className="map-popup">
                            <strong>{station.name}</strong>
                            <div>Distance: {station.distance} km</div>
                            <div className="station-rank-tag">Rank: #{index + 1}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NearestStations;
