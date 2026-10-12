// Official line identity colours (design.md §1.2). `color` is the AA-adjusted value for text and thin strokes.
export const LINES = [
  { id: 'blue', name: 'Blue Line', corridor: 'East-West', label: 'East-West Corridor', color: '#0983CE', colorDark: '#3AA3E8', swatch: '#0983CE', from: 'Thaltej Gam', to: 'Vastral Gam' },
  { id: 'red', name: 'Red Line', corridor: 'North-South', label: 'North-South Corridor', color: '#E0231F', colorDark: '#FF5A63', swatch: '#F52532', from: 'APMC', to: 'Koteshwar Road' },
  { id: 'yellow', name: 'Yellow Line', corridor: 'Corridor-1', label: 'Corridor-1', color: '#C99A00', colorDark: '#FFD60A', swatch: '#FFFF00', from: 'Koteshwar Road', to: 'Mahatma Mandir' },
  { id: 'violet', name: 'Violet Line', corridor: 'Corridor-2', label: 'Corridor-2', color: '#7B12E0', colorDark: '#A86BFF', swatch: '#8F00FF', from: 'GNLU', to: 'GIFT City' },
];

// Pick the stroke/text colour that reads on the current background.
export const lineColor = (line, theme) => (theme === 'dark' ? line.colorDark : line.color);

export const lineByName = Object.fromEntries(LINES.map((l) => [l.name, l]));
export const lineByCorridor = Object.fromEntries(LINES.map((l) => [l.corridor, l]));
