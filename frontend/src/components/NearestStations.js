import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
const API_URL = (process.env.REACT_APP_API_BASE_URL || "https://ahmedabad-metro-backend.onrender.com").replace(/\/+$/, "");

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
  const [nearestStations, setNearestStations] = useState([]); // Initialize as empty array
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

  const fetchLocationAndStations = useCallback(async () => {
    try {
      setError('');
      
      const position = await getHighAccuracyLocation();
      const { latitude, longitude, accuracy } = position.coords;
      
      setUserLocation([latitude, longitude]);
      setLocationAccuracy(Math.round(accuracy));
      
      const response = await axios.get(`${API_URL}/api/stations/nearby`, {
        params: { lat: latitude, lng: longitude }
      });
      
      // Ensure the response data is an array
      const stationsData = response.data;
      if (Array.isArray(stationsData)) {
        setNearestStations(stationsData);
      } else if (stationsData && Array.isArray(stationsData.stations)) {
        // Handle case where stations are nested in a 'stations' property
        setNearestStations(stationsData.stations);
      } else {
        console.warn('API response is not an array:', stationsData);
        setNearestStations([]);
        setError('Invalid response format from server');
      }
      
    } catch (err) {
      console.error('Error:', err);
      setNearestStations([]); // Reset to empty array on error
      
      if (err.code === 1) {
        setError('Location access denied. Please enable location services and refresh the page.');
      } else if (err.code === 2) {
        setError('Location not available. Please check your GPS/WiFi connection.');
      } else if (err.code === 3) {
        setError('Location request timed out. Please try again.');
      } else if (err.response) {
        // API error
        setError(`Server error: ${err.response.status} - ${err.response.statusText}`);
      } else if (err.request) {
        // Network error
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Error fetching location or stations: ' + err.message);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefreshLocation = async () => {
    setIsRefreshing(true);
    setLoading(true);
    await fetchLocationAndStations();
  };

  useEffect(() => {
    fetchLocationAndStations();
  }, [fetchLocationAndStations]);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10">
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-[0_10px_30px_rgba(26,42,108,0.2)] px-6 py-6 md:px-10 md:py-8 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-[2.2rem] font-bold tracking-tight">Find Nearest Metro Stations</h1>
          <p className="mt-2 text-white/90 max-w-2xl">Discover the closest metro stations to your current location</p>
        </div>
        <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
            <p className="mt-5 text-lg font-semibold text-slate-800">{isRefreshing ? 'Refreshing location...' : 'Getting precise location...'}</p>
            <p className="mt-2 text-sm text-slate-500">This may take a few seconds for better accuracy</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">⚠️</div>
            <p className="mt-4 text-slate-800 font-semibold">{error}</p>
            <button
              type="button"
              onClick={handleRefreshLocation}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-brand-900 to-brand-700 px-8 py-3 text-white font-semibold shadow hover:-translate-y-0.5 transition"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-700">
                Location accuracy:{' '}
                <span
                  className={
                    `font-bold ` +
                    (locationAccuracy < 50
                      ? 'text-emerald-600'
                      : locationAccuracy < 100
                        ? 'text-orange-600'
                        : 'text-red-600')
                  }
                >
                  {locationAccuracy}m
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshLocation}
                disabled={isRefreshing}
                className={
                  `inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition ` +
                  (isRefreshing
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100')
                }
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Location'}
              </button>
            </div>
            
            {locationAccuracy > 100 && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                  Location accuracy is low ({locationAccuracy}m). For better results, ensure GPS is enabled and you're outdoors.
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                  Nearest Stations
                  <span className="h-px flex-1 bg-gradient-to-r from-brand-900 to-transparent" />
                </h2>
                {nearestStations.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-slate-700 font-semibold">No stations found nearby. This might be due to:</p>
                    <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1">
                      <li>Limited station data in the database</li>
                      <li>Your location being far from metro stations</li>
                      <li>Server connectivity issues</li>
                    </ul>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {nearestStations.map((station, index) => (
                      <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <span
                              className={
                                `flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold ` +
                                (index === 0
                                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-[0_4px_10px_rgba(16,185,129,0.3)]'
                                  : index === 1
                                    ? 'bg-gradient-to-br from-brand-600 to-brand-800 shadow-[0_4px_10px_rgba(59,130,246,0.3)]'
                                    : 'bg-gradient-to-br from-orange-600 to-orange-800 shadow-[0_4px_10px_rgba(234,88,12,0.3)]')
                              }
                            >
                              {index + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 truncate">{station.name || 'Unknown Station'}</h3>
                            <div className="mt-3 space-y-2 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="10" r="3"></circle>
                                  <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"></path>
                                </svg>
                                <span>{station.distance || 'N/A'} km away</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                  <line x1="9" y1="3" x2="9" y2="21"></line>
                                </svg>
                                <span className="font-mono text-[12px] rounded border border-slate-200 bg-slate-50 px-2 py-0.5">
                                  {station.latitude ? station.latitude.toFixed(6) : 'N/A'}, {station.longitude ? station.longitude.toFixed(6) : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                  Map View
                  <span className="h-px flex-1 bg-gradient-to-r from-brand-900 to-transparent" />
                </h2>
                <div className="overflow-hidden rounded-xl shadow">
                  <MapContainer 
                    center={userLocation} 
                    zoom={15} 
                    className="h-[420px] w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* User location marker with custom red icon */}
                    <Marker position={userLocation} icon={userLocationIcon}>
                      <Popup>
                        <div className="text-sm">
                          <strong>Your Location</strong>
                          <div>Accuracy: {locationAccuracy}m</div>
                          <div className="mt-1 font-mono text-xs">{userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}</div>
                        </div>
                      </Popup>
                    </Marker>
                    
                    {/* Station markers with default blue icons */}
                    {nearestStations.map((station, index) => (
                      station.latitude && station.longitude ? (
                        <Marker 
                          key={index} 
                          position={[station.latitude, station.longitude]}
                        >
                          <Popup>
                            <div className="text-sm">
                              <strong>{station.name || 'Unknown Station'}</strong>
                              <div>Distance: {station.distance || 'N/A'} km</div>
                              <div className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs">Rank: #{index + 1}</div>
                            </div>
                          </Popup>
                        </Marker>
                      ) : null
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