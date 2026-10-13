import React from 'react';

// Page title shared by every sub-page (design.md §4): plain text on the page background, with clear space
// below the navbar.
const PageHeader = ({ title, subtitle, children }) => (
  <header className="mx-auto max-w-7xl px-5 pt-8">
    <h1 className="font-sans text-2xl font-semibold tracking-tight text-ink-900 md:text-[1.9rem]">{title}</h1>
    {subtitle && <p className="mt-1.5 text-sm text-ink-600 md:text-base">{subtitle}</p>}
    {children && <div className="mt-3">{children}</div>}
  </header>
);

export default PageHeader;
