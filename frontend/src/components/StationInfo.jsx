import React, { useMemo, useState } from 'react';
import { Mountain, ArrowDownToLine, Search, DoorOpen, Accessibility } from 'lucide-react';
import stationData from '../data/stationData.json';
import PageHeader from './PageHeader';
import { LINES, lineByCorridor, lineColor } from '../lib/lines';
import { useTheme } from '../lib/theme';

const filters = [{ key: 'all', label: 'All stations' }, ...LINES.map((l) => ({ key: l.corridor, label: l.corridor, line: l }))];

const SubHeading = ({ children }) => (
  <h4 className="border-b border-line-200 pb-2 font-sans text-sm font-semibold text-ink-900">{children}</h4>
);

const StationInfo = () => {
  const { theme } = useTheme();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return stationData.filter(
      (s) => (filter === 'all' || s.corridor === filter) && (!term || s.name.toLowerCase().includes(term))
    );
  }, [filter, searchTerm]);

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <PageHeader title="Entry–Exit Information" subtitle="Gate details and accessibility facilities by station" />

      <div className="mx-auto mt-6 max-w-7xl px-5">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <label htmlFor="station-search" className="sr-only">Search stations</label>
            <Search strokeWidth={1.75} size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600" />
            <input
              id="station-search"
              type="search"
              placeholder="Search stations"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-line-200 bg-surface-1 py-2.5 pl-10 pr-4 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by corridor">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
                  (filter === f.key ? 'border-accent bg-navy-900 text-white' : 'border-line-200 bg-surface-1 text-ink-900 hover:border-accent')
                }
              >
                {f.line && <span className="h-2.5 w-2.5 rounded-full border border-white/50" style={{ backgroundColor: f.line.swatch }} aria-hidden="true" />}
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-6 font-mono text-xs text-ink-600" aria-live="polite">
          Showing {filteredStations.length} of {stationData.length} stations
        </p>

        {filteredStations.length === 0 && (
          <p className="rounded-lg border border-line-200 bg-surface-1 p-8 text-center text-sm text-ink-600">
            No stations match "{searchTerm}". Check the spelling or clear the corridor filter.
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {filteredStations.map((station) => {
            const line = lineByCorridor[station.corridor];
            const TypeIcon = station.type === 'Underground' ? ArrowDownToLine : Mountain;
            return (
              <article key={station.id} className="flex flex-col overflow-hidden rounded-lg border border-line-200 bg-surface-1">
                <div
                  className="flex items-start justify-between gap-4 border-b border-line-200 border-l-4 p-5"
                  style={{ borderLeftColor: line ? lineColor(line, theme) : undefined }}
                >
                  <h3 className="font-sans text-base font-semibold text-ink-900">{station.name}</h3>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-ink-600">
                    <span className="font-medium">{line ? line.name : station.corridor}</span>
                    <span className="inline-flex items-center gap-1">
                      <TypeIcon size={12} strokeWidth={1.75} /> {station.type}
                    </span>
                  </div>
                </div>

                <div className="grid flex-1 gap-6 p-5 sm:grid-cols-2">
                  <div>
                    <SubHeading>Operational gates</SubHeading>
                    <ul className="mt-3 space-y-2">
                      {station.gates.map((gate) => (
                        <li key={gate} className="flex items-start gap-2 text-sm text-ink-900">
                          <DoorOpen size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-600" />
                          {gate}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <SubHeading>Facilities</SubHeading>
                    {station.facilities.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {station.facilities.map((facility) => (
                          <li key={facility} className="flex items-start gap-2 text-sm text-ink-900">
                            <Accessibility size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-600" />
                            {facility}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-ink-600">No dedicated facilities listed</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StationInfo;
