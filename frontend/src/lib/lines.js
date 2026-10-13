// Official line identity colours (design.md §1.2). `color` is the AA-adjusted value for text and thin strokes.
export const LINES = [
  { id: 'blue', name: 'Blue Line', corridor: 'East-West', label: 'East-West Corridor', color: '#0983CE', colorDark: '#3AA3E8', swatch: '#0983CE', from: 'Thaltej Gam', to: 'Vastral Gam' },
  { id: 'red', name: 'Red Line', corridor: 'North-South', label: 'North-South Corridor', color: '#E0231F', colorDark: '#FF5A63', swatch: '#F52532', from: 'APMC', to: 'Koteshwar Road' },
  { id: 'yellow', name: 'Yellow Line', corridor: 'Corridor-1', label: 'Corridor-1', color: '#C99A00', colorDark: '#FFD60A', swatch: '#FFFF00', from: 'Koteshwar Road', to: 'Mahatma Mandir' },
  { id: 'violet', name: 'Violet Line', corridor: 'Corridor-2', label: 'Corridor-2', color: '#7B12E0', colorDark: '#A86BFF', swatch: '#8F00FF', from: 'GNLU', to: 'GIFT City' },
  // Being built (work in progress): Airport Corridor (Phase 2A) and GIFT City Extension (Phase 2B).
  { id: 'pink', name: 'Pink Line', corridor: 'Airport Corridor', label: 'Airport Corridor', color: '#D6127F', colorDark: '#FF5FB8', swatch: '#F01E96', from: 'Koteshwar Road', to: 'Airport', wip: true },
  { id: 'lightblue', name: 'Light Blue Line', corridor: 'GIFT City Extension', label: 'GIFT City Extension', color: '#1E9FD0', colorDark: '#7DD3F5', swatch: '#5BC8F0', from: 'GIFT City', to: 'Shahpur (Gandhinagar)', wip: true },
];

// Pick the stroke/text colour that reads on the current background.
export const lineColor = (line, theme) => (theme === 'dark' ? line.colorDark : line.color);

export const lineByName = Object.fromEntries(LINES.map((l) => [l.name, l]));
export const lineByCorridor = Object.fromEntries(LINES.map((l) => [l.corridor, l]));
