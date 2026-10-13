import React, { useState } from 'react';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { LINES, lineColor } from '../lib/lines';
import { useTheme } from '../lib/theme';
import { DIAGRAM_VIEWBOX, LINE_STATIONS, STATION_LINES, STATION_POSITIONS, isInterchange, linePoints } from '../lib/network';

const ZOOMS = [1, 1.35, 1.8, 2.4];
const MIN_WIDTH = 720; // below this the labels get too small to read, so the diagram scrolls instead

const zoomButton =
  'flex h-9 w-9 items-center justify-center text-ink-900 transition hover:bg-line-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-40';

/**
 * Schematic network diagram (in the spirit of the Tokyo and Paris metro diagrams).
 * Click or press Enter on a station to select it. `highlight` dims every line but one;
 * `route` (a list of stations) dims everything off the route.
 */
const NetworkMap = ({ selected, onSelect, highlight = null, route = null }) => {
  const { theme } = useTheme();
  const [zoom, setZoom] = useState(0);
  const { x, y, width, height } = DIAGRAM_VIEWBOX;
  const onRoute = route ? new Set(route) : null;

  const dimLine = (id) => (highlight && id !== highlight) || (onRoute && !LINE_STATIONS[id].some((s) => onRoute.has(s)));
  const dimStation = (name) =>
    (highlight && !STATION_LINES[name].includes(highlight)) || (onRoute && !onRoute.has(name));

  const activate = (name) => onSelect?.(name === selected ? null : name);

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-md border border-line-200 bg-surface-1 shadow-lg">
        <button type="button" className={zoomButton} onClick={() => setZoom((z) => Math.min(z + 1, ZOOMS.length - 1))} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in">
          <Plus strokeWidth={1.75} size={18} />
        </button>
        <button type="button" className={`${zoomButton} border-y border-line-200`} onClick={() => setZoom((z) => Math.max(z - 1, 0))} disabled={zoom === 0} aria-label="Zoom out">
          <Minus strokeWidth={1.75} size={18} />
        </button>
        <button type="button" className={zoomButton} onClick={() => setZoom(0)} disabled={zoom === 0} aria-label="Fit diagram">
          <Maximize2 strokeWidth={1.75} size={16} />
        </button>
      </div>

      <div className="max-h-[78vh] overflow-auto">
        <svg
          viewBox={`${x} ${y} ${width} ${height}`}
          style={{ width: `${ZOOMS[zoom] * 100}%`, minWidth: `${MIN_WIDTH * ZOOMS[zoom]}px` }}
          className="block select-none"
          role="group"
          aria-label="Ahmedabad Metro network diagram. Select a station for details."
        >
          {LINES.map((line) => (
            <polyline
              key={line.id}
              points={linePoints(line.id).map((p) => p.join(',')).join(' ')}
              fill="none"
              stroke={lineColor(line, theme)}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={dimLine(line.id) ? 0.15 : 1}
              className="transition-opacity"
            />
          ))}

          {Object.entries(STATION_POSITIONS).map(([name, { x: sx, y: sy, label }]) => {
            const lines = STATION_LINES[name];
            const interchange = isInterchange(name);
            const isSelected = name === selected;
            const color = lineColor(LINES.find((l) => l.id === lines[0]), theme);
            const lx = sx + label.dx;
            const ly = sy + label.dy;
            return (
              <g
                key={name}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${name}, ${lines.map((id) => LINES.find((l) => l.id === id).name).join(' and ')}`}
                onClick={() => activate(name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate(name);
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>.focus-ring]:opacity-100"
                opacity={dimStation(name) ? 0.3 : 1}
              >
                <circle cx={sx} cy={sy} r={16} fill="transparent" />
                <circle className="focus-ring opacity-0" cx={sx} cy={sy} r={15} fill="none" stroke="rgb(var(--accent))" strokeWidth={2} strokeDasharray="3 3" />
                {isSelected && <circle cx={sx} cy={sy} r={15} fill="rgb(var(--accent) / 0.18)" stroke="rgb(var(--accent))" strokeWidth={2.5} />}
                {interchange ? (
                  <circle cx={sx} cy={sy} r={9} fill="rgb(var(--surface-1))" stroke="rgb(var(--ink-900))" strokeWidth={3.5} />
                ) : (
                  <circle cx={sx} cy={sy} r={6} fill="rgb(var(--surface-1))" stroke={color} strokeWidth={3.5} />
                )}
                <text
                  x={lx}
                  y={ly}
                  textAnchor={label.anchor}
                  transform={label.rotate ? `rotate(${label.rotate} ${lx} ${ly})` : undefined}
                  fontSize={13}
                  fontWeight={isSelected || interchange ? 700 : 500}
                  fill="rgb(var(--ink-900))"
                  className="font-sans"
                >
                  {name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default NetworkMap;
