import React from 'react';
import { CalendarClock, ExternalLink } from 'lucide-react';
import schedulePdf from '../data/Tentative-TT-18.05.26.pdf';

const Schedule = () => {
  return (
    <div className="bg-surface-0 min-h-screen pb-10">
      <div className="mx-auto max-w-7xl px-5 pt-8 mb-8 pb-6 border-b border-line-200">
        <h1 className="text-3xl font-bold font-sans text-navy-900 tracking-tight">Metro Schedule</h1>
      </div>

      <div className="mx-auto max-w-7xl px-5 mt-6">
        <div className="mb-6 inline-flex items-center gap-2 rounded-md bg-surface-0 px-3 py-1.5 text-sm font-sans font-medium text-ink-600 border border-line-200">
          <CalendarClock size={16} strokeWidth={1.5} />
          Effective from 18th May 2026
        </div>

        <div className="bg-surface-0 overflow-hidden w-full h-[80vh]">
          <object
            data={schedulePdf}
            type="application/pdf"
            className="block h-full w-full"
          >
            <div className="flex min-h-[60vh] items-center justify-center px-6 py-10 text-center border border-line-200 rounded-lg bg-surface-1">
              <div className="max-w-2xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-0 text-navy-900 border border-line-200 shadow-sm">
                  <ExternalLink strokeWidth={1.5} size={28} />
                </div>
                <h2 className="mt-4 text-xl font-sans font-semibold text-ink-900">Your browser could not display the PDF inline</h2>
                <p className="mt-2 text-sm font-sans leading-6 text-ink-600">
                  The schedule is loaded from the local PDF in src/data, but if inline PDF viewing is disabled in the browser, the file still stays on this page as the embedded content.
                </p>
                <a
                  href={schedulePdf}
                  download="Ahmedabad-Metro-Schedule.pdf"
                  className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-navy-900 text-white font-sans font-semibold text-sm hover:bg-navy-700 transition"
                >
                  Download PDF Instead
                </a>
              </div>
            </div>
          </object>
        </div>
      </div>
    </div>
  );
};

export default Schedule;