import React from 'react';
import { LINES } from '../lib/lines';

// Line colour is never the only cue: every swatch carries the line name as text.
const LineLegend = ({ className = '' }) => (
  <ul className={`flex flex-wrap gap-x-5 gap-y-1.5 ${className}`}>
    {LINES.map((line) => (
      <li key={line.id} className="flex items-center gap-2 text-sm text-white/90">
        <span className="h-3 w-3 rounded-full border border-white/60" style={{ backgroundColor: line.swatch }} aria-hidden="true" />
        {line.name}
      </li>
    ))}
  </ul>
);

export default LineLegend;
