import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mountain, ArrowDownToLine, Search, DoorOpen, Accessibility, MapPin } from 'lucide-react';
import LineBadge from './LineBadge';
import stationData from '../data/stationData.json';
import PageHeader from './PageHeader';
import { LINES, lineByCorridor, lineColor } from '../lib/lines';
import { useTheme } from '../lib/theme';
import { STATION_LINES, networkName as toNetworkName, stationStatus } from '../lib/network';
import { useI18n } from '../i18n';

// Lines still being built have no gate data yet, so they get no filter.
const filters = [{ key: 'all' }, ...LINES.filter((l) => !l.wip).map((l) => ({ key: l.corridor, line: l }))];

const SubHeading = ({ children }) => (
  <h4 className="border-b border-line-200 pb-2 font-sans text-sm font-semibold text-ink-900">{children}</h4>
);

const StationInfo = () => {
  const { theme } = useTheme();
  const { t, station: localName, gate, facility } = useI18n();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    // An interchange belongs to every line it serves, not just the one corridor its gate data is filed under.
    const servesFilter = (s) => {
      if (filter === 'all') return true;
      const name = toNetworkName(s.name);
      return name ? STATION_LINES[name].includes(lineByCorridor[filter].id) : s.corridor === filter;
    };
    // Match the English name or the name in the rider's script.
    const matches = (s) => !term || s.name.toLowerCase().includes(term) || String(localName(toNetworkName(s.name) || s.name)).toLowerCase().includes(term);
    return stationData.filter((s) => servesFilter(s) && matches(s));
  }, [filter, searchTerm, localName]);

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <PageHeader title={t('info.title')} subtitle={t('info.subtitle')} />

      <div className="mx-auto mt-6 max-w-7xl px-5">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <label htmlFor="station-search" className="sr-only">{t('info.search')}</label>
            <Search strokeWidth={1.75} size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600" />
            <input
              id="station-search"
              type="search"
              placeholder={t('info.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-line-200 bg-surface-1 py-2.5 pl-10 pr-4 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label={t('info.filter')}>
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
                {f.line ? t(`corridor.${f.line.id}`) : t('info.all')}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-6 font-mono text-xs text-ink-600" aria-live="polite">
          {t('info.showing', { n: filteredStations.length, total: stationData.length })}
        </p>

        {filteredStations.length === 0 && (
          <p className="rounded-lg border border-line-200 bg-surface-1 p-8 text-center text-sm text-ink-600">
            {t('info.noMatch', { term: searchTerm })}
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {filteredStations.map((station) => {
            const line = lineByCorridor[station.corridor];
            const TypeIcon = station.type === 'Underground' ? ArrowDownToLine : Mountain;
            const networkName = toNetworkName(station.name);
            return (
              <article key={station.id} className="flex flex-col overflow-hidden rounded-lg border border-line-200 bg-surface-1">
                <div
                  className="flex items-start justify-between gap-4 border-b border-line-200 border-l-4 p-5"
                  style={{ borderLeftColor: line ? lineColor(line, theme) : undefined }}
                >
                  <div className="min-w-0">
                    <h3 className="font-sans text-base font-semibold text-ink-900">{networkName ? localName(networkName) : station.name}</h3>
                    {networkName && stationStatus(networkName) !== 'operational' && (
                      <span className="mt-1 mr-2 inline-flex rounded-full border border-alert-600/40 bg-alert-600/10 px-2 py-0.5 text-[11px] font-semibold text-alert-600">
                        {t(`status.${stationStatus(networkName)}`)}
                      </span>
                    )}
                    {networkName && (
                      <Link to={`/stations?station=${encodeURIComponent(networkName)}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                        <MapPin size={12} strokeWidth={2} /> {t('info.nextLink')}
                      </Link>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-ink-600">
                    <span className="flex items-center gap-1">
                      {(networkName ? STATION_LINES[networkName] : line ? [line.id] : []).map((id) => (
                        <LineBadge key={id} line={id} size="sm" />
                      ))}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <TypeIcon size={12} strokeWidth={1.75} /> {t(`station.${station.type}`)}
                    </span>
                  </div>
                </div>

                <div className="grid flex-1 gap-6 p-5 sm:grid-cols-2">
                  <div>
                    <SubHeading>{t('info.gates')}</SubHeading>
                    <ul className="mt-3 space-y-2">
                      {station.gates.map((g) => (
                        <li key={g} className="flex items-start gap-2 text-sm text-ink-900">
                          <DoorOpen size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-600" />
                          {gate(g)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <SubHeading>{t('info.facilities')}</SubHeading>
                    {station.facilities.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {station.facilities.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-ink-900">
                            <Accessibility size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-600" />
                            {facility(f)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-ink-600">{t('info.noFacilities')}</p>
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
