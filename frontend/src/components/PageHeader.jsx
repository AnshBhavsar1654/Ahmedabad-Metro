import React from 'react';

// Slim "wayfinding bar" shared by every sub-page (design.md §4).
const PageHeader = ({ title, subtitle, children }) => (
  <header className="bg-navy-900 border-t border-white/10">
    <div className="mx-auto max-w-7xl px-5 py-5">
      <h1 className="font-sans text-xl font-semibold tracking-tight text-white md:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  </header>
);

export default PageHeader;
