import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, Mountain, DoorOpen, Accessibility, X, Clock, Banknote, ArrowRightLeft, CircleDot, Flag } from 'lucide-react';
import LineBadge from './LineBadge';
import stationData from '../data/stationData.json';
import { API_URL } from '../lib/api';
import { LINE_FREQUENCY, STATION_LINES, indexGateData, isInterchange, stationStatus } from '../lib/network';
import { useI18n } from '../i18n';

const GATES = indexGateData(stationData);

const SectionTitle = ({ icon: Icon, children }) => (
  <h3 className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">
    <Icon strokeWidth={1.75} size={14} /> {children}
  </h3>
);

// Next timetabled trains, or the line's published frequency where there is no timetable.
const NextTrains = ({ station }) => {
  const { t, places, station: localName } = useI18n();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setFailed(false);
    fetch(`${API_URL}/api/departures?station=${encodeURIComponent(station)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(setData)
      .catch((err) => err.name !== 'AbortError' && setFailed(true));
    return () => controller.abort();
  }, [station]);

  const frequencies = (
    <ul className="space-y-1.5">
      {STATION_LINES[station]
        .filter((id) => !(data?.directions?.length && (id === 'yellow' || id === 'violet')))
        .map((id) => (
          <li key={id} className="flex items-start gap-2 text-sm text-ink-900">
            <LineBadge line={id} size="sm" className="mt-0.5" />
            <span>{t(LINE_FREQUENCY[id])}</span>
          </li>
        ))}
    </ul>
  );

  if (failed) return frequencies;
  if (!data) return <div className="shimmer h-16 rounded-md" aria-label={t('panel.loadingTrains')} />;

  return (
    <div className="space-y-3">
      {data.directions.map((d) => (
        <div key={d.towards} className="rounded-md border border-line-200">
          <div className="border-b border-line-200 bg-surface-0 px-3 py-1.5 text-xs font-medium text-ink-600">
            {t('panel.towards', { place: places(d.towards) })}
          </div>
          {d.trains.length ? (
            <ul className="divide-y divide-line-100">
              {d.trains.map((train) => (
                <li key={train.time + train.destination} className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-sm">
                  <span className="text-ink-900">{localName(train.destination)}</span>
                  <span className="font-mono tabular-nums text-ink-900">
                    {train.approx && <span className="text-ink-600" title={t('panel.approx')}>≈ </span>}
                    {train.time}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-ink-600">
              {t('panel.noMore')} <span className="font-mono tabular-nums text-ink-900">{d.first}</span>
            </p>
          )}
          <p className="border-t border-line-100 px-3 py-1 font-mono text-[11px] tabular-nums text-ink-600">
            {t('panel.firstLast', { first: d.first, last: d.last })}
          </p>
        </div>
      ))}
      {frequencies}
      {data.source && <p className="text-[11px] text-ink-600">{t('panel.source', { source: t('timetable.source') })}</p>}
    </div>
  );
};

// Fares to every other station, fetched only when the rider opens the table.
const FareTable = ({ station }) => {
  const { t, station: localName } = useI18n();
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setRows(null);
    setOpen(false);
    setFilter('');
  }, [station]);

  useEffect(() => {
    if (!open || rows) return undefined;
    const controller = new AbortController();
    fetch(`${API_URL}/api/fares/from?station=${encodeURIComponent(station)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then(setRows)
      .catch((err) => err.name !== 'AbortError' && setRows([]));
    return () => controller.abort();
  }, [open, rows, station]);

  const term = filter.trim().toLowerCase();
  const shown = (rows || []).filter((r) => r.station.toLowerCase().includes(term) || String(localName(r.station)).toLowerCase().includes(term));

  return (
    <details className="group rounded-md border border-line-200" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-ink-900 hover:bg-surface-0">
        {t('panel.faresFrom', { station: localName(station) })}
        <span className="text-xs text-ink-600 group-open:hidden">{t('panel.show')}</span>
        <span className="hidden text-xs text-ink-600 group-open:inline">{t('panel.hide')}</span>
      </summary>
      <div className="border-t border-line-200 p-3">
        {rows === null ? (
          <div className="shimmer h-24 rounded-md" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-600">{t('panel.faresFailed')}</p>
        ) : (
          <>
            <label htmlFor="fare-filter" className="sr-only">{t('panel.filter')}</label>
            <input
              id="fare-filter"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('panel.filter')}
              className="mb-2 w-full rounded-md border border-line-200 bg-surface-0 px-3 py-1.5 text-sm text-ink-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <ul className="max-h-56 divide-y divide-line-100 overflow-y-auto">
              {shown.map((r) => (
                <li key={r.station} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 text-ink-900">
                    {STATION_LINES[r.station]?.map((id) => <LineBadge key={id} line={id} size="sm" />)}
                    <span className="truncate">{localName(r.station)}</span>
                  </span>
                  <span className="font-mono tabular-nums text-ink-900" title={r.fare == null ? t('routes.fareWip') : undefined}>{r.fare != null ? `₹${r.fare}` : '—'}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  );
};

/**
 * Everything about one station: lines, next trains, gates and lifts, fares, and "plan from / to here".
 * `planFrom` is the station already picked as the journey start (if any).
 */
const StationPanel = ({ station, planFrom, onPlanFrom, onPlanTo, onClose }) => {
  const { t, station: localName, gate, facility } = useI18n();
  const status = stationStatus(station);
  const gates = GATES[station];
  const lines = STATION_LINES[station] || [];
  const TypeIcon = gates?.type === 'Underground' ? ArrowDownToLine : Mountain;

  return (
    <section aria-label={t('panel.aria', { station: localName(station) })} className="flex flex-col gap-5 rounded-lg border border-line-200 bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-sans text-lg font-semibold text-ink-900">{localName(station)}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {lines.map((id) => (
              <LineBadge key={id} line={id} showName className="text-ink-900" />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
            {status !== 'operational' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-alert-600/40 bg-alert-600/10 px-2 py-0.5 font-semibold text-alert-600">
                {t(`status.${status}`)}
              </span>
            )}
            {isInterchange(station) && (
              <span className="inline-flex items-center gap-1 font-medium text-ink-900">
                <ArrowRightLeft size={12} strokeWidth={2} /> {t('panel.interchange')}
              </span>
            )}
            {gates && (
              <span className="inline-flex items-center gap-1">
                <TypeIcon size={12} strokeWidth={1.75} /> {t(`station.${gates.type}`)}
              </span>
            )}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('panel.close')}
            className="rounded-md p-1.5 text-ink-600 transition hover:bg-line-100 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {status !== 'operational' && (
        <p role="note" className="rounded-md border-l-4 border-alert-600 bg-surface-0 px-3 py-2 text-sm text-ink-900">
          {t(status === 'construction' ? 'panel.constructionNote' : 'panel.wipNote')}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPlanFrom(station)}
          disabled={status === 'construction'}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-line-200 px-3 py-2 text-sm font-semibold text-ink-900 transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CircleDot size={16} strokeWidth={1.75} /> {t('panel.fromHere')}
        </button>
        <button
          type="button"
          onClick={() => onPlanTo(station)}
          disabled={planFrom === station || status === 'construction'}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink-300"
        >
          <Flag size={16} strokeWidth={1.75} /> {t('panel.toHere')}
        </button>
      </div>

      {status === 'operational' && (
        <div className="space-y-2">
          <SectionTitle icon={Clock}>{t('panel.nextTrains')}</SectionTitle>
          <NextTrains station={station} />
        </div>
      )}

      <div className="space-y-2">
        <SectionTitle icon={DoorOpen}>{t('panel.gates')}</SectionTitle>
        {gates ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ul className="space-y-1">
              {gates.gates.map((g) => (
                <li key={g} className="flex items-center gap-2 text-sm text-ink-900">
                  <DoorOpen size={14} strokeWidth={1.75} className="shrink-0 text-ink-600" /> {gate(g)}
                </li>
              ))}
            </ul>
            <ul className="space-y-1">
              {gates.facilities.length ? (
                gates.facilities.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-900">
                    <Accessibility size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-600" /> {facility(f)}
                  </li>
                ))
              ) : (
                <li className="text-sm text-ink-600">{t('panel.noLifts')}</li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-ink-600">{t('panel.noGates')}</p>
        )}
      </div>

      {status === 'operational' && (
        <div className="space-y-2">
          <SectionTitle icon={Banknote}>{t('panel.fares')}</SectionTitle>
          <FareTable station={station} />
        </div>
      )}
    </section>
  );
};

export default StationPanel;
