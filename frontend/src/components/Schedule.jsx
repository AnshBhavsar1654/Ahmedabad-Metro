import React from 'react';
import { CalendarClock, Download } from 'lucide-react';
import PageHeader from './PageHeader';
import schedulePdf from '../data/Tentative-TT-18.05.26.pdf';

const Schedule = () => (
  <div className="min-h-screen bg-surface-0 pb-10">
    <PageHeader title="Schedule" subtitle="Train timetable for all lines">
      <span className="inline-flex items-center gap-2 rounded-md border border-line-200 bg-surface-1 px-3 py-1 text-sm text-ink-900">
        <CalendarClock strokeWidth={1.75} size={16} />
        Effective from <span className="font-mono">18 May 2026</span>
      </span>
    </PageHeader>

    <div className="mx-auto mt-6 max-w-7xl px-5">
      <div className="rounded-lg border border-line-200 bg-surface-1 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-600">Timetable as published by GMRC. The viewer may not display on some phones; download the PDF instead.</p>
          <a
            href={schedulePdf}
            download="Ahmedabad-Metro-Schedule.pdf"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <Download strokeWidth={1.75} size={16} /> Download PDF
          </a>
        </div>

        <object data={schedulePdf} type="application/pdf" aria-label="Metro timetable" className="block h-[70vh] min-h-[420px] w-full rounded-md border border-line-200">
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-600">
            Your browser can't show the timetable here. Use the Download PDF button above.
          </div>
        </object>
      </div>
    </div>
  </div>
);

export default Schedule;
