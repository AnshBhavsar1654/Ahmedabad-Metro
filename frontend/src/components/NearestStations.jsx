import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { NearestStationsDropdownSkeleton, NearestStationsSectionSkeleton } from './Skeleton';
const API_URL = (process.env.REACT_APP_API_BASE_URL || "https://ahmedabad-metro-backend.onrender.com").replace(/\/+$/, "");

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Create custom red icon for user/searched location
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

// Component to dynamically pan map center when user searches
const ChangeMapView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
};

const FAMOUS_LANDMARKS = [
  { name: 'Sabarmati Ashram', lat: 23.0605, lng: 72.5801 },
  { name: 'Kankaria Lake', lat: 23.0062, lng: 72.5997 },
  { name: 'Science City', lat: 23.0805, lng: 72.5029 },
  { name: 'Manek Chowk', lat: 23.0232, lng: 72.5898 },
  { name: 'ISKCON Temple', lat: 23.0231, lng: 72.5085 },
  { name: 'Law Garden', lat: 23.0249, lng: 72.5630 },
  { name: 'Ahmedabad One Mall', lat: 23.0406, lng: 72.5318 }
];

const NearestStations = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearestStations, setNearestStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search feature states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [searchedPlaceName, setSearchedPlaceName] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [isResolvingLink, setIsResolvingLink] = useState(false);

  // Load search history
  useEffect(() => {
    const saved = localStorage.getItem('metro_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing recent searches', e);
      }
    }
  }, []);

  // Close suggestions dropdown on window click
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowHistory(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const saveToHistory = (place) => {
    let updated = [place, ...recentSearches.filter(item => item.name !== place.name)];
    updated = updated.slice(0, 5); // Keep up to 5 items
    setRecentSearches(updated);
    localStorage.setItem('metro_recent_searches', JSON.stringify(updated));
  };

  const removeFromHistory = (e, name) => {
    e.stopPropagation();
    const updated = recentSearches.filter(item => item.name !== name);
    setRecentSearches(updated);
    localStorage.setItem('metro_recent_searches', JSON.stringify(updated));
  };

  // Autocomplete place suggestions from Nominatim (OpenStreetMap)
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSuggestionsLoading(true);
      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: `${searchQuery}, Ahmedabad, Gujarat`,
            format: 'json',
            limit: 5,
            addressdetails: 1
          },
          headers: {
            'User-Agent': 'Ahmedabad-Metro-Explorer'
          }
        });
        setSuggestions(response.data);
      } catch (err) {
        console.error('Autocomplete API error', err);
      } finally {
        setIsSuggestionsLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

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

  const fetchStationsForCoordinates = useCallback(async (latitude, longitude, accuracy = null, placeName = null) => {
    setLoading(true);
    setError('');
    setUserLocation([latitude, longitude]);
    setLocationAccuracy(accuracy);
    setSearchedPlaceName(placeName);
    
    try {
      const response = await axios.get(`${API_URL}/api/stations/nearby`, {
        params: { lat: latitude, lng: longitude }
      });
      
      const stationsData = response.data;
      if (Array.isArray(stationsData)) {
        setNearestStations(stationsData);
      } else if (stationsData && Array.isArray(stationsData.stations)) {
        setNearestStations(stationsData.stations);
      } else {
        console.warn('API response is not an array:', stationsData);
        setNearestStations([]);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching nearby stations:', err);
      setNearestStations([]);
      if (err.response) {
        setError(`Server error: ${err.response.status} - ${err.response.statusText}`);
      } else if (err.request) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Error fetching stations: ' + err.message);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchLocationAndStations = useCallback(async () => {
    try {
      setError('');
      const position = await getHighAccuracyLocation();
      const { latitude, longitude, accuracy } = position.coords;
      await fetchStationsForCoordinates(latitude, longitude, Math.round(accuracy), null);
    } catch (err) {
      console.error('Error:', err);
      // Fallback center: Ahmedabad
      const defaultLat = 23.0225;
      const defaultLng = 72.5714;
      setError('Could not get your precise location. Defaulting to Ahmedabad Center. Use the search bar above to search for landmarks.');
      await fetchStationsForCoordinates(defaultLat, defaultLng, null, "Ahmedabad Center");
    }
  }, [fetchStationsForCoordinates]);

  const handleRefreshLocation = async () => {
    setIsRefreshing(true);
    setLoading(true);
    await fetchLocationAndStations();
  };

  const handleSelectLocation = (place) => {
    const lat = parseFloat(place.lat || place.latitude);
    const lng = parseFloat(place.lon || place.longitude || place.lng);
    const name = place.display_name || place.name;
    
    saveToHistory({ name, lat, lng });
    fetchStationsForCoordinates(lat, lng, null, name);
    
    setSearchQuery('');
    setSuggestions([]);
    setShowHistory(false);
  };

  const handleGoogleMapsLinkSubmit = async (e) => {
    e.preventDefault();

    const link = googleMapsLink.trim();
    if (!link) {
      setError('Please paste a Google Maps link first.');
      return;
    }

    setLoading(true);
    setIsResolvingLink(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/location/resolve-google-maps`, {
        url: link,
      });

      const latitude = parseFloat(response.data.latitude);
      const longitude = parseFloat(response.data.longitude);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        throw new Error('The link did not contain valid coordinates.');
      }

      const placeName = response.data.place_name || 'Google Maps location';
      setGoogleMapsLink('');
      await fetchStationsForCoordinates(latitude, longitude, null, placeName);
    } catch (err) {
      console.error('Google Maps link resolution error:', err);
      setError(
        err.response?.data?.error ||
        err.message ||
        'Could not resolve coordinates from the Google Maps link.'
      );
      setLoading(false);
    } finally {
      setIsResolvingLink(false);
    }
  };

  return (
    <div className="bg-surface-0 min-h-screen pb-10">
      <div className="mx-auto max-w-7xl px-5 pt-8 mb-8 pb-6 border-b border-line-200">
        <h1 className="text-3xl font-bold font-sans text-navy-900 tracking-tight">Find Nearest Metro Stations</h1>
        <p className="text-base text-ink-600 mt-2">Discover the closest metro stations to any landmark in Ahmedabad</p>
      </div>

      <div className="mx-auto max-w-7xl px-5 mt-6">
      {/* Search Input, Landmarks, and History Container */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Search Landmark or Place</h3>
        <div className="relative flex flex-col md:flex-row gap-3">
          <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowHistory(true);
              }}
              onFocus={() => setShowHistory(true)}
              placeholder="e.g. Sabarmati Ashram, Vastrapur Lake, Kalupur..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}

            {/* Suggestions & History Dropdown */}
            {showHistory && (searchQuery.trim().length >= 3 || (searchQuery.trim().length === 0 && recentSearches.length > 0)) && (
              <div className="absolute top-[105%] left-0 right-0 z-[1000] rounded-xl border border-slate-200 bg-white shadow-lg max-h-[300px] overflow-y-auto">
                {isSuggestionsLoading && (
                  <NearestStationsDropdownSkeleton />
                )}
                
                {suggestions.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">Search Results</div>
                    {suggestions.map((place, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectLocation(place)}
                        className="cursor-pointer px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-start gap-2 border-b last:border-b-0 border-slate-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-slate-400">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span className="truncate">{place.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length < 3 && recentSearches.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">Recent Searches</div>
                    {recentSearches.map((place, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectLocation(place)}
                        className="cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between border-b last:border-b-0 border-slate-100"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span className="truncate">{place.name}</span>
                        </div>
                        <button
                          onClick={(e) => removeFromHistory(e, place.name)}
                          className="text-slate-400 hover:text-red-500 px-2 py-1 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={handleRefreshLocation}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold text-sm px-5 py-3 transition shrink-0 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Use Current Location
          </button>
        </div>

        <form onSubmit={handleGoogleMapsLinkSubmit} className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Paste Google Maps Link
              </label>
              <input
                type="url"
                value={googleMapsLink}
                onChange={(e) => setGoogleMapsLink(e.target.value)}
                placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 focus:outline-none"
              />
              <p className="mt-2 text-xs text-slate-500">
                If search cannot find the place, paste a Google Maps share link and we will use its coordinates.
              </p>
            </div>
            <button
              type="submit"
              disabled={isResolvingLink || !googleMapsLink.trim()}
              className={
                `rounded-xl px-5 py-3 text-sm font-semibold transition shrink-0 shadow-sm ` +
                (isResolvingLink || !googleMapsLink.trim()
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-brand-700 text-white hover:bg-brand-800')
              }
            >
              {isResolvingLink ? 'Resolving...' : 'Use Link'}
            </button>
          </div>
        </form>

        {/* Famous Landmarks suggestion chips */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase mr-1">Famous Places:</span>
          {FAMOUS_LANDMARKS.map((landmark, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectLocation(landmark)}
              className="rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-700 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
            >
              {landmark.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <NearestStationsSectionSkeleton />
        ) : (
          <>
            {error && (
              <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm animate-pulse">
                <div className="flex gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <div>{error}</div>
                </div>
                <button onClick={() => setError('')} className="text-amber-600 hover:text-amber-850 font-bold px-1">✕</button>
              </div>
            )}
            
            {locationAccuracy && (
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
            )}
            
            {locationAccuracy && locationAccuracy > 100 && (
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
            
            {userLocation && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                  Nearest Stations
                  <span className="h-px flex-1 bg-gradient-to-r from-brand-900 to-transparent" />
                </h2>
                {nearestStations.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                        <circle cx="12" cy="10" r="3"></circle>
                        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"></path>
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-slate-800">No stations found nearby</p>
                    <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                      No metro stations were found near the selected location. Try searching for a different landmark or place.
                    </p>
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
                  {userLocation && (
                    <MapContainer 
                      center={userLocation} 
                      zoom={15} 
                      className="h-[420px] w-full"
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      
                      <ChangeMapView center={userLocation} />
                      
                      {/* User/Searched location marker with custom red icon */}
                      <Marker position={userLocation} icon={userLocationIcon}>
                        <Popup>
                          <div className="text-sm">
                            <strong>{searchedPlaceName || 'Your Location'}</strong>
                            {locationAccuracy && <div>Accuracy: {locationAccuracy}m</div>}
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
                                <div>Road distance: {station.distance || 'N/A'} km</div>
                                <div className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs">Rank: #{index + 1}</div>
                              </div>
                            </Popup>
                          </Marker>
                        ) : null
                      ))}
                    </MapContainer>
                  )}
                </div>
              </div>
            </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default NearestStations;