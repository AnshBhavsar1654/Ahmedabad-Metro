import React, { useState } from 'react';

const Schedule = () => {
  const [isZoomed, setIsZoomed] = useState(false);
  
  const scheduleImage = "https://www.gujaratmetrorail.com/ahmedabad/wp-content/uploads/2026/01/FINAL-KA-BHI-FINAL-REVISED-FINAL-TRAIN-TIME-TABLE.jpg";
  
  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

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
        <button
          type="button"
          className={
            `inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ` +
            (isZoomed
              ? 'bg-brand-800 text-white border-brand-800 shadow'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50')
          }
          onClick={toggleZoom}
        >
          {isZoomed ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              Zoom Out
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              Zoom In
            </>
          )}
        </button>

        <div className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 border border-white/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Effective from 16th January 2026
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className={isZoomed ? 'overflow-auto' : 'overflow-hidden'}>
          <img
            src={scheduleImage}
            alt="Ahmedabad Metro Schedule"
            className={
              `block w-full h-auto select-none transition-transform duration-300 origin-top ` +
              (isZoomed ? 'scale-125 md:scale-150' : 'scale-100')
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Schedule;