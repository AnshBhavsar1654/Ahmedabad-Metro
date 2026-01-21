import React, { useState, useEffect } from 'react';
import { Mountain, Minus } from 'lucide-react';
import { FaDoorOpen } from "react-icons/fa";
import stationData from '../data/stationData.json';

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
    return (
      <div className="mx-auto max-w-6xl px-5 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
          <p className="mt-5 text-lg font-semibold text-slate-800">Loading station information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10">
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-[0_10px_30px_rgba(26,42,108,0.2)] px-6 py-6 md:px-10 md:py-8 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-[2.2rem] font-bold tracking-tight">Entry-Exit Information</h1>
          <p className="mt-2 text-white/90 max-w-2xl">Gate details and accessibility facilities at all Ahmedabad Metro stations</p>
        </div>
        <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="16" rx="2" />
            <path d="M12 18v-6" />
            <circle cx="8.5" cy="10.5" r="1.5" />
            <circle cx="15.5" cy="10.5" r="1.5" />
            <path d="M6 22h12" />
          </svg>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              placeholder="Search stations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border-2 border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-200 focus:border-brand-400"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-100 p-2">
            {[
              { key: 'all', label: 'All Stations' },
              { key: 'East-West', label: 'East-West Corridor' },
              { key: 'North-South', label: 'North-South Corridor' },
              { key: 'Corridor-1', label: 'Corridor-1' },
              { key: 'Corridor-2', label: 'Corridor-2' }
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={
                  `rounded-lg px-4 py-2 text-sm font-semibold transition ` +
                  (filter === t.key
                    ? 'bg-white text-brand-900 shadow'
                    : 'text-slate-700 hover:bg-white/70')
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
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-brand-200 focus:border-brand-400"
            >
              <option value="all">All Stations</option>
              <option value="East-West">East-West Corridor</option>
              <option value="North-South">North-South Corridor</option>
              <option value="Corridor-1">Corridor-1</option>
              <option value="Corridor-2">Corridor-2</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 inline-flex rounded-full border border-sky-200 bg-sky-50 px-5 py-2 text-sm font-bold text-sky-800">
        Showing {filteredStations.length} of {stations.length} stations
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {filteredStations.map((station) => {
          const corridorBadge =
            station.corridor === 'East-West'
              ? 'bg-red-50 text-red-700 border-red-200'
              : station.corridor === 'North-South'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : station.corridor === 'Corridor-1'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : station.corridor === 'Corridor-2'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200';

          return (
            <div key={station.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-5 flex items-start justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-900">{station.name}</h3>

                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${corridorBadge}`}>
                    {station.corridor}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
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

              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-bold tracking-wide text-slate-700 uppercase border-b-2 border-slate-200 pb-2">Operational Gates</h4>
                  <div className="mt-3 space-y-2">
                    {station.gates.map((gate, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                          <FaDoorOpen size={18} color="#000066" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{gate}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold tracking-wide text-slate-700 uppercase border-b-2 border-slate-200 pb-2">Accessibility Facilities</h4>
                  <div className="mt-3 space-y-2">
                    {station.facilities.length > 0 ? (
                      station.facilities.map((facility, index) => (
                        <div key={index} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center">♿</div>
                          <span className="text-sm font-semibold text-slate-700">{facility}</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500 text-center italic">
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
  );
};

export default StationInfo;