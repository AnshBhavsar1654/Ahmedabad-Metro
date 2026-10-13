import React from 'react';
import { lineById } from '../lib/network';

// Line pictogram, as on the Paris and Barcelona maps: a square in the line's official colour with its initial.
// Colour is never the only cue: the initial is always there, and `showName` adds the full name.
const TEXT_ON = { yellow: '#12151B' };

const SIZES = {
  sm: 'h-4 w-4 text-[10px] rounded-[3px]',
  md: 'h-5 w-5 text-[11px] rounded',
  lg: 'h-7 w-7 text-sm rounded-md',
};

const LineBadge = ({ line: id, size = 'md', showName = false, className = '' }) => {
  const line = lineById[id];
  if (!line) return null;
  const badge = (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-sans font-bold leading-none ${SIZES[size]}`}
      style={{ backgroundColor: line.swatch, color: TEXT_ON[id] || '#FFFFFF' }}
      aria-hidden={showName ? 'true' : undefined}
      role={showName ? undefined : 'img'}
      aria-label={showName ? undefined : line.name}
      title={line.name}
    >
      {line.name[0]}
    </span>
  );
  if (!showName) return <span className={className}>{badge}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {badge}
      <span className="text-sm font-medium">{line.name}</span>
    </span>
  );
};

export default LineBadge;
