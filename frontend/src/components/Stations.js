import React, { useState } from 'react';

const Stations = () => {
  const [showInfo, setShowInfo] = useState(true);

  const handleDownloadPDF = (filePath, fileName) => {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10">
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 text-white shadow-[0_10px_30px_rgba(26,42,108,0.2)] px-6 py-6 md:px-10 md:py-8 flex items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-[2.2rem] font-bold tracking-tight">Ahmedabad Metro Map</h1>
          <p className="mt-2 text-white/90 max-w-2xl">Interactive map of all metro stations and lines</p>
        </div>
        <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="16" rx="2" />
            <path d="M12 18v-6" />
            <circle cx="8.5" cy="10.5" r="1.5" />
            <circle cx="15.5" cy="10.5" r="1.5" />
            <path d="M6 22h12" />
          </svg>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className={
            `inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ` +
            (showInfo
              ? 'bg-brand-50 text-brand-900 border-brand-200'
              : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50')
          }
          onClick={() => setShowInfo(!showInfo)}
        >
          {showInfo ? 'Hide Info' : 'Show Info'}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5 transition"
            onClick={() => handleDownloadPDF('/Route.pdf', 'Ahmedabad_Metro_Route_Guide.pdf')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Route Guide
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5 transition"
            onClick={() => handleDownloadPDF('/Map.pdf', 'Ahmedabad_Metro_Map.pdf')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Metro Map
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3">Metro Lines</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#3498db' }} />
                <div>Line 1: Vastral Gam to Thaltej Gam (EW Corridor)</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#c0392b' }} />
                <div>Line 2: APMC to Motera Stadium (NS Corridor)</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#ffd700' }} />
                <div>Line 3: Motera Stadium to Mahatma Mandir (Corridor-1)</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#8e44ad' }} />
                <div>Line 4: GNLU to GIFT City (Corridor-2)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border-2 border-brand-800/20 bg-white shadow-[0_15px_35px_rgba(0,0,0,0.1)]">
        <iframe
          src="https://www.google.com/maps/d/u/0/embed?mid=1OiBaXz-gpGhD-bGCv55xJBy-mz6O7R0"
          width="100%"
          height="600"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          title="Ahmedabad Metro Map"
        ></iframe>
      </div>
    </div>
  );
};

export default Stations;