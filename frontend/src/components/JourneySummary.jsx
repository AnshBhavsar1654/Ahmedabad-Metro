import React from 'react';
import { ArrowRightLeft, ArrowDown, Clock } from 'lucide-react';
import LineBadge from './LineBadge';
import { LINES, lineColor } from '../lib/lines';
import { useTheme } from '../lib/theme';
import { useI18n } from '../i18n';

const lineByName = Object.fromEntries(LINES.map((l) => [l.name, l]));

/**
 * The journey as legs, one per line, the way Delhi and Tokyo show a route result:
 * board here, ride N stops, then either change trains or stay on a through train.
 */
export const JourneyLegs = ({ legs }) => {
  const { theme } = useTheme();
  const { t, station, line: lineName } = useI18n();
  return (
    <ol className="space-y-0">
      {legs.map((leg, i) => {
        const line = lineByName[leg.line];
        const next = legs[i + 1];
        return (
          <li key={`${leg.line}-${leg.from}`}>
            <div className="flex gap-3">
              <span className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: line ? lineColor(line, theme) : undefined }} aria-hidden="true" />
              <div className="min-w-0 flex-1 py-1">
                <div className="flex flex-wrap items-center gap-2">
                  {line && <LineBadge line={line.id} size="md" />}
                  <span className="text-sm font-semibold text-ink-900">{lineName(leg.line)}</span>
                  <span className="font-mono text-xs tabular-nums text-ink-600">
                    {leg.stops === 1 ? t('common.stop') : t('common.stops', { n: leg.stops })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-900">
                  {station(leg.from)} <span className="text-ink-600">{t('common.toBetween')}</span> {station(leg.to)}
                </p>
              </div>
            </div>
            {next && (
              <div className="my-2 ml-[3px] flex items-center gap-2 border-l-2 border-dashed border-line-200 py-1.5 pl-5 text-xs">
                {leg.stay_on_train ? (
                  <>
                    <ArrowDown size={14} strokeWidth={1.75} className="shrink-0 text-go-600" />
                    <span className="text-ink-900">{t('journey.stay', { station: station(leg.to), line: lineName(next.line) })}</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={14} strokeWidth={1.75} className="shrink-0 text-accent" />
                    <span className="text-ink-900">
                      {t('journey.change', { station: station(leg.to), line: lineName(next.line) })}{' '}
                      <span className="text-ink-600">{t('journey.allow')}</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
};

// Next timetabled trains for journeys onto the Yellow or Violet Line, which run only every half hour or so.
export const NextTrainsCard = ({ data }) => {
  const { t, station } = useI18n();
  return (
    <div className="rounded-lg border border-line-200 bg-surface-1">
      <div className="flex items-center gap-2 border-b border-line-200 bg-surface-0 px-4 py-3">
        <Clock size={16} className="text-ink-900" />
        <h3 className="font-sans text-sm font-semibold text-ink-900">{t('journey.nextFrom', { station: station(data.board_at) })}</h3>
      </div>
      <div className="p-4">
        <p className="text-sm text-ink-600">{t('journey.timetableNote', { station: station(data.towards) })}</p>
        {data.trains.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.trains.map((train) => (
              <li key={train.time + train.destination} className="rounded-md border border-line-200 px-3 py-2">
                <div className="font-mono text-lg font-semibold tabular-nums text-ink-900">
                  {train.approx && <span className="text-sm font-normal text-ink-600" title={t('panel.approx')}>≈</span>}
                  {train.time}
                </div>
                <div className="text-xs text-ink-600">{t('journey.toDest', { station: station(train.destination) })}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-900">{t('journey.noMore', { time: data.first })}</p>
        )}
        <p className="mt-3 font-mono text-[11px] tabular-nums text-ink-600">
          {t('panel.firstLast', { first: data.first, last: data.last })} · {t('timetable.source')}
        </p>
      </div>
    </div>
  );
};

// Other reasonable routes, when the network offers more than one. Same fare: GMRC charges by the two stations.
export const OtherRoutes = ({ routes }) => {
  const { t, station } = useI18n();
  return (
    <div className="mt-5 border-t border-line-200 pt-4">
      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">{t('journey.other')}</h4>
      <ul className="mt-2 divide-y divide-line-100">
        {routes.map((r) => (
          <li key={r.route.join('>')} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                {r.legs.map((leg, i) => {
                  const line = lineByName[leg.line];
                  return line ? <LineBadge key={`${leg.line}-${i}`} line={line.id} size="sm" /> : null;
                })}
              </div>
              <p className="mt-1 truncate text-xs text-ink-600">
                {r.interchanges.length ? t('journey.changeAt', { stations: r.interchanges.map(station).join(', ') }) : t('journey.noChange')} ·{' '}
                {t('common.stations', { n: r.route.length })}
              </p>
            </div>
            <span className="shrink-0 font-mono text-sm tabular-nums text-ink-900">
              ≈ {r.duration_minutes} {t('unit.min')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
