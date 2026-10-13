import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, GitBranch, Map as MapIcon, MousePointerClick, X, CircleDot } from 'lucide-react';
import PageHeader from './PageHeader';
import NetworkMap from './NetworkMap';
import StationPanel from './StationPanel';
import LineBadge from './LineBadge';
import { LINES } from '../lib/lines';
import { ALL_STATIONS, LINE_STATIONS } from '../lib/network';
import { useI18n } from '../i18n';

const downloadClass =
  'inline-flex items-center justify-center gap-2 rounded-md border border-line-200 bg-surface-1 px-4 py-2 text-sm font-semibold text-ink-900 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

const tabClass = (active) =>
  'inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ' +
  (active ? 'border-accent text-ink-900' : 'border-transparent text-ink-600 hover:text-ink-900');

const Stations = () => {
  const navigate = useNavigate();
  const { t, station: localName, stationOption, line: lineName } = useI18n();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('diagram');
  const [planFrom, setPlanFrom] = useState(null);

  // Selection lives in the URL, so a station or line view can be shared (?station=Paldi, ?line=blue).
  const station = ALL_STATIONS.includes(params.get('station')) ? params.get('station') : null;
  const line = LINES.some((l) => l.id === params.get('line')) ? params.get('line') : null;

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (station && window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('station-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [station]);

  const planTo = (to) => {
    const query = new URLSearchParams({ ...(planFrom && planFrom !== to ? { from: planFrom } : {}), to });
    navigate(`/routes?${query}`);
  };

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <PageHeader title={t('map.title')} subtitle={t('map.subtitle')} />

      <div className="mx-auto mt-6 max-w-7xl px-5">
        <div className="flex flex-col gap-3 border-b border-line-200 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex" role="tablist" aria-label={t('map.view')}>
            <button type="button" role="tab" aria-selected={view === 'diagram'} className={tabClass(view === 'diagram')} onClick={() => setView('diagram')}>
              <GitBranch size={16} strokeWidth={1.75} /> {t('map.diagram')}
            </button>
            <button type="button" role="tab" aria-selected={view === 'street'} className={tabClass(view === 'street')} onClick={() => setView('street')}>
              <MapIcon size={16} strokeWidth={1.75} /> {t('map.street')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pb-2">
            <a href="/Map.pdf" download="Ahmedabad_Metro_Map.pdf" className={downloadClass}>
              <Download strokeWidth={1.75} size={16} /> {t('map.mapPdf')}
            </a>
            <a href="/Route.pdf" download="Ahmedabad_Metro_Route_Guide.pdf" className={downloadClass}>
              <Download strokeWidth={1.75} size={16} /> {t('map.routePdf')}
            </a>
          </div>
        </div>

        {view === 'street' ? (
          <div className="mt-6 overflow-hidden rounded-lg border border-line-200 bg-surface-1">
            <iframe
              src="https://www.google.com/maps/d/u/0/embed?mid=1OiBaXz-gpGhD-bGCv55xJBy-mz6O7R0"
              className="block h-[70vh] min-h-[420px] w-full border-0"
              allowFullScreen
              loading="lazy"
              title={t('map.streetTitle')}
            />
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('map.oneLine')}>
                <button
                  type="button"
                  aria-pressed={!line}
                  onClick={() => update({ line: null })}
                  className={
                    'rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
                    (!line ? 'border-accent bg-navy-900 text-white' : 'border-line-200 bg-surface-1 text-ink-900 hover:border-accent')
                  }
                >
                  {t('map.allLines')}
                </button>
                {LINES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={line === l.id}
                    onClick={() => update({ line: line === l.id ? null : l.id })}
                    className={
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
                      (line === l.id ? 'border-accent bg-navy-100 text-ink-900' : 'border-line-200 bg-surface-1 text-ink-900 hover:border-accent')
                    }
                  >
                    <LineBadge line={l.id} size="sm" />
                    {lineName(l.name)}
                    <span className="font-mono text-xs tabular-nums text-ink-600">{LINE_STATIONS[l.id].length}</span>
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="map-station" className="sr-only">{t('map.goTo')}</label>
                <select
                  id="map-station"
                  value={station || ''}
                  onChange={(e) => update({ station: e.target.value || null })}
                  className="w-full rounded-md border border-line-200 bg-surface-1 px-3 py-2 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent lg:w-64"
                >
                  <option value="">{t('map.find')}</option>
                  {ALL_STATIONS.map((s) => (
                    <option key={s} value={s}>{stationOption(s)}</option>
                  ))}
                </select>
              </div>
            </div>

            {planFrom && (
              <div role="status" className="mt-4 flex items-center justify-between gap-3 rounded-md border border-accent bg-navy-100 px-4 py-2.5 text-sm text-ink-900">
                <span className="flex items-center gap-2">
                  <CircleDot size={16} strokeWidth={1.75} className="text-accent" />
                  {t('map.planning', { station: localName(planFrom) })}
                </span>
                <button type="button" onClick={() => setPlanFrom(null)} aria-label={t('map.cancel')} className="rounded p-1 text-ink-600 hover:text-ink-900">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="overflow-hidden rounded-lg border border-line-200 bg-surface-1">
                <NetworkMap selected={station} onSelect={(s) => update({ station: s })} highlight={line} />
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line-200 px-4 py-2 text-xs text-ink-600">
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="rgb(var(--surface-1))" stroke="rgb(var(--ink-900))" strokeWidth="2.5" /></svg>
                    {t('map.interchange')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="26" height="8" aria-hidden="true"><line x1="2" y1="4" x2="24" y2="4" stroke="rgb(var(--ink-600))" strokeWidth="4" strokeDasharray="6 4" /></svg>
                    {t('status.wip')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="rgb(var(--surface-1))" stroke="rgb(var(--ink-600))" strokeWidth="2.5" strokeDasharray="2.5 2" /></svg>
                    {t('status.construction')} / {t('status.wip')}
                  </span>
                  <span>{t('map.notToScale')}</span>
                </div>
              </div>

              <div id="station-panel" className="lg:sticky lg:top-20">
                {station ? (
                  <StationPanel
                    station={station}
                    planFrom={planFrom}
                    onPlanFrom={(s) => setPlanFrom(s)}
                    onPlanTo={planTo}
                    onClose={() => update({ station: null })}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-200 bg-surface-1 p-8 text-center">
                    <MousePointerClick size={28} strokeWidth={1.5} className="text-ink-600" />
                    <p className="text-sm text-ink-600">
                      {t('map.empty')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Stations;
