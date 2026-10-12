import React, { useState } from 'react';
import { Download, Info } from 'lucide-react';
import PageHeader from './PageHeader';
import LineLegend from './LineLegend';
import { LINES } from '../lib/lines';

const downloadClass =
  'inline-flex items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

const Stations = () => {
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <PageHeader title="Metro Map" subtitle="Interactive map of all metro stations and lines">
        <LineLegend />
      </PageHeader>

      <div className="mx-auto mt-6 max-w-7xl px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            aria-expanded={showInfo}
            onClick={() => setShowInfo((v) => !v)}
            className={
              'inline-flex items-center gap-2 self-start rounded-md border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
              (showInfo ? 'border-accent bg-navy-100 text-accent' : 'border-line-200 bg-surface-1 text-ink-900 hover:border-accent')
            }
          >
            <Info strokeWidth={1.75} size={16} />
            {showInfo ? 'Hide line summary' : 'Show line summary'}
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="/Route.pdf" download="Ahmedabad_Metro_Route_Guide.pdf" className={downloadClass}>
              <Download strokeWidth={1.75} size={16} /> Download route guide
            </a>
            <a href="/Map.pdf" download="Ahmedabad_Metro_Map.pdf" className={downloadClass}>
              <Download strokeWidth={1.75} size={16} /> Download metro map
            </a>
          </div>
        </div>

        {showInfo && (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LINES.map((line) => (
              <li key={line.id} className="flex items-start gap-3 rounded-lg border border-line-200 bg-surface-1 p-4">
                <span className="mt-1 h-4 w-4 shrink-0 rounded-full border border-line-200" style={{ backgroundColor: line.swatch }} aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-sans text-sm font-semibold text-ink-900">{line.name}</div>
                  <div className="mt-1 text-sm text-ink-900">{line.from} to {line.to}</div>
                  <div className="mt-1 text-xs text-ink-600">{line.label}</div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-line-200 bg-surface-1">
          <iframe
            src="https://www.google.com/maps/d/u/0/embed?mid=1OiBaXz-gpGhD-bGCv55xJBy-mz6O7R0"
            className="block h-[70vh] min-h-[420px] w-full border-0"
            allowFullScreen
            loading="lazy"
            title="Ahmedabad Metro Map"
          />
        </div>
      </div>
    </div>
  );
};

export default Stations;
