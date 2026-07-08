import React from 'react';
import schedulePdf from '../data/Tentative-TT-18.05.26.pdf';

const Schedule = () => {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-10">
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-[0_10px_30px_rgba(26,42,108,0.2)] px-6 py-6 md:px-10 md:py-8 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-[2.2rem] font-bold tracking-tight">Ahmedabad Metro Schedule</h1>
        </div>
        <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 border border-white/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Effective from 18th May 2026
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <object
          data={schedulePdf}
          type="application/pdf"
          className="block h-[80vh] w-full bg-slate-50"
        >
          <div className="flex min-h-[60vh] items-center justify-center px-6 py-10 text-center">
            <div className="max-w-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3h7v7"></path>
                  <path d="M10 14 21 3"></path>
                  <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6"></path>
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">Your browser could not display the PDF inline</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The schedule is loaded from the local PDF in src/data, but if inline PDF viewing is disabled in the browser, the file still stays on this page as the embedded content.
              </p>
            </div>
          </div>
        </object>
      </div>
    </div>
  );
};

export default Schedule;