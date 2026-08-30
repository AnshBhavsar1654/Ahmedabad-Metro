import React, { useState, useEffect } from 'react';
import { Mountain, Minus, Search, DoorOpen, Accessibility } from 'lucide-react';
import stationData from '../data/stationData.json';
import { StationInfoSkeleton } from './Skeleton';

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

    setTimeout(fetchStationData, 800);
  }, []);

  const filteredStations = stations.filter(station => {
    if (filter !== 'all' && station.corridor !== filter) return false;
    if (searchTerm && !station.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return <StationInfoSkeleton />;
  }

  return (
    <div className="bg-surface-0 min-h-screen pb-10">
      <div className="mx-auto max-w-7xl px-5 pt-8 mb-8 pb-6 border-b border-line-200">
        <h1 className="text-3xl font-bold font-sans text-navy-900 tracking-tight">Entry-Exit Information</h1>
        <p className="text-base text-ink-600 mt-2">Gate details and accessibility facilities at all Ahmedabad Metro stations</p>
      </div>

      <div className="mx-auto max-w-7xl px-5 mt-6">
        {/* Search & Filter */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              placeholder="Search stations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-line-200 bg-surface-0 py-2.5 pl-10 pr-4 text-sm font-sans text-ink-900 focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 transition"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-600">
              <Search strokeWidth={1.5} size={18} />
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 rounded-md border border-line-200 bg-surface-1 p-1">
            {[
              { key: 'all', label: 'All Stations' },
              { key: 'East-West', label: 'East-West' },
              { key: 'North-South', label: 'North-South' },
              { key: 'Corridor-1', label: 'Corridor-1' },
              { key: 'Corridor-2', label: 'Corridor-2' }
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={
                  `rounded px-3 py-1.5 text-sm font-sans font-semibold transition ` +
                  (filter === t.key
                    ? 'bg-white text-navy-900 shadow-sm border border-line-200'
                    : 'text-ink-600 hover:text-ink-900 hover:bg-surface-0')
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="lg:hidden">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Select corridor"
              className="w-full rounded-md border border-line-200 bg-surface-0 px-4 py-2.5 text-sm font-sans text-ink-900 focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 transition"
            >
              <option value="all">All Stations</option>
              <option value="East-West">East-West Corridor</option>
              <option value="North-South">North-South Corridor</option>
              <option value="Corridor-1">Corridor-1</option>
              <option value="Corridor-2">Corridor-2</option>
            </select>
          </div>
        </div>

        <div className="mb-6 font-mono text-xs text-ink-600">
          Showing {filteredStations.length} of {stations.length} stations
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {filteredStations.map((station) => {
            // Updated corridor badges using official colors for borders
            const corridorStyles =
              station.corridor === 'East-West'
                ? 'border-l-4 border-l-[#0983CE]' // Blue Line
                : station.corridor === 'North-South'
                  ? 'border-l-4 border-l-[#E0231F]' // Red Line
                  : station.corridor === 'Corridor-1'
                    ? 'border-l-4 border-l-[#C99A00]' // Yellow Line
                    : station.corridor === 'Corridor-2'
                      ? 'border-l-4 border-l-[#7B12E0]' // Violet Line
                      : 'border-l-4 border-l-line-200';

            return (
              <div key={station.id} className="border border-line-200 bg-surface-0 overflow-hidden flex flex-col">
                <div className={`border-b border-line-200 p-5 flex items-start justify-between gap-4 bg-surface-1 ${corridorStyles}`}>
                  <h3 className="text-base font-semibold font-sans text-ink-900">{station.name}</h3>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[11px] font-sans font-semibold tracking-wide text-ink-600 uppercase">
                      {station.corridor}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-600 uppercase">
                      {station.type === 'Elevated' ? (
                        <>
                          <Mountain size={12} />
                          <span>Elevated</span>
                        </>
                      ) : station.type === 'Underground' ? (
                        <>
                          <Minus size={12} />
                          <span>Underground</span>
                        </>
                      ) : (
                        <span>{station.type}</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 p-5 sm:grid-cols-2 flex-1">
                  <div>
                    <h4 className="text-[11px] font-semibold tracking-[0.1em] text-ink-600 uppercase border-b border-line-200 pb-2 font-sans">Operational Gates</h4>
                    <div className="mt-3 space-y-3">
                      {station.gates.map((gate, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <DoorOpen size={16} className="text-ink-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                          <span className="text-sm font-sans text-ink-900">{gate}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-semibold tracking-[0.1em] text-ink-600 uppercase border-b border-line-200 pb-2 font-sans">Facilities</h4>
                    <div className="mt-3 space-y-3">
                      {station.facilities.length > 0 ? (
                        station.facilities.map((facility, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Accessibility size={16} className="text-ink-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                            <span className="text-sm font-sans text-ink-900">{facility}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm font-sans text-ink-500 italic">
                          No dedicated facilities listed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StationInfo;