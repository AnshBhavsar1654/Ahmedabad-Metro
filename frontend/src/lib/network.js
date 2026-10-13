import { LINES } from './lines';

// Stations of each line in running order (same order as backend/route.py).
export const LINE_STATIONS = {
  red: ['APMC', 'Jivraj Park', 'Rajivnagar', 'Shreyas', 'Paldi', 'Gandhigram', 'Old High Court', 'Usmanpura', 'Vijaynagar', 'Vadaj', 'Ranip', 'Sabarmati Railway Station', 'AEC', 'Sabarmati', 'Motera Stadium', 'Koteshwar Road'],
  blue: ['Thaltej Gam', 'Thaltej', 'Doordarshan Kendra', 'Gurukul Road', 'Gujarat University', 'Commerce Six Road', 'SP Stadium', 'Old High Court', 'Shahpur', 'Ghee Kanta', 'Kalupur Railway Station', 'Kankaria East', 'Apparel Park', 'Amraivadi', 'Rabari Colony', 'Vastral', 'Nirant Cross Road', 'Vastral Gam'],
  yellow: ['Koteshwar Road', 'Vishvakarma College', 'Tapovan Circle', 'Narmada Canal', 'Koba Circle', 'Juna Koba', 'Koba Gam', 'GNLU', 'Raysan', 'Randesan', 'Dholakuva Circle', 'Infocity', 'Sector-1', 'Sector-10A', 'Sachivalaya', 'Akshardham', 'Juna Sachivalaya', 'Sector-16', 'Sector-24', 'Mahatma Mandir'],
  violet: ['GNLU', 'PDEU', 'Gift City'],
  pink: ['Koteshwar Road', 'Ashram Road', 'Koteshwar Prachin Mandir', 'Sabarmati River', 'Sardarnagar', 'Airport'],
  lightblue: ['Gift City', 'GIFT City House', 'Gujarat Biotechnology University', 'Shahpur (Gandhinagar)'],
};

// Stations that aren't open (same as the Status column in backend/data/Location.xlsx). Everything else is operational.
// "wip": not open yet (Sabarmati, and the two lines being built). Routes are shown, but no trains stop and there
// are no fares yet. "construction" (can't be a journey's start or end) is supported but no station uses it now.
export const STATION_STATUS = {
  Sabarmati: 'wip',
  ...Object.fromEntries([...LINE_STATIONS.pink.slice(1), ...LINE_STATIONS.lightblue.slice(1)].map((s) => [s, 'wip'])),
};
export const stationStatus = (station) => STATION_STATUS[station] || 'operational';
export const isOperational = (station) => !STATION_STATUS[station];

export const lineById = Object.fromEntries(LINES.map((l) => [l.id, l]));

// station -> [line ids], in LINES order.
export const STATION_LINES = {};
LINES.forEach((line) =>
  LINE_STATIONS[line.id].forEach((s) => {
    (STATION_LINES[s] = STATION_LINES[s] || []).push(line.id);
  })
);

export const ALL_STATIONS = Object.keys(STATION_LINES).sort((a, b) => a.localeCompare(b));
export const isInterchange = (station) => (STATION_LINES[station] || []).length > 1;

// ---------------------------------------------------------------- schematic layout
//
// A diagram, not a map: lines run straight with even spacing, like the Tokyo and Paris diagrams.
// Blue runs west-east; Red runs south-north and crosses Blue at Old High Court; Yellow climbs north-east
// from Koteshwar Road to GNLU, then north to Sachivalaya and west to Mahatma Mandir; Violet runs east to GIFT City.
// The lines being built: Pink drops south-east from Koteshwar Road to the Airport; Light Blue climbs north-east
// from GIFT City to Shahpur.
// Each label is placed on the side of its line that no other line or label uses.

const S = 40; // spacing between stations
const OHC = { x: 380, y: 980 };
const DIAG = 30; // x and y step on the diagonal

const UP_RIGHT = { dx: 7, dy: -9, anchor: 'start', rotate: -40 };
const DOWN_LEFT = { dx: -7, dy: 15, anchor: 'end', rotate: -40 };
const RIGHT = { dx: 14, dy: 4, anchor: 'start', rotate: 0 };
const BELOW_RIGHT = { dx: 10, dy: 22, anchor: 'start', rotate: 0 };
const LEFT = { dx: -14, dy: 4, anchor: 'end', rotate: 0 };

const place = {};
const put = (name, x, y, label) => {
  if (!place[name]) place[name] = { x, y, label };
};

// Interchanges first, so their label placement wins.
put('Old High Court', OHC.x, OHC.y, { dx: -14, dy: -12, anchor: 'end', rotate: 0 });

LINE_STATIONS.blue.forEach((name, i) => {
  const x = OHC.x + (i - 7) * S;
  put(name, x, OHC.y, i < 7 ? DOWN_LEFT : UP_RIGHT);
});

LINE_STATIONS.red.forEach((name, i) => {
  const y = OHC.y - (i - 6) * S;
  put(name, OHC.x, y, i < 6 ? RIGHT : LEFT);
});

const KOTESHWAR = place['Koteshwar Road'];
LINE_STATIONS.yellow.forEach((name, i) => {
  if (i <= 7) {
    put(name, KOTESHWAR.x + i * DIAG, KOTESHWAR.y - i * DIAG, i === 7 ? LEFT : RIGHT);
  } else if (i <= 14) {
    const gnlu = place.GNLU;
    put(name, gnlu.x, gnlu.y - (i - 7) * S, i === 14 ? UP_RIGHT : LEFT);
  } else {
    const sachivalaya = place.Sachivalaya;
    put(name, sachivalaya.x - (i - 14) * S, sachivalaya.y, UP_RIGHT);
  }
});

LINE_STATIONS.violet.forEach((name, i) => {
  const gnlu = place.GNLU;
  // GIFT City's label goes below: the Light Blue Line leaves it up and to the right.
  put(name, gnlu.x + i * S, gnlu.y, i === 2 ? BELOW_RIGHT : UP_RIGHT);
});

LINE_STATIONS.pink.forEach((name, i) => {
  put(name, KOTESHWAR.x + i * DIAG, KOTESHWAR.y + i * DIAG, RIGHT);
});

const GIFT = place['Gift City'];
LINE_STATIONS.lightblue.forEach((name, i) => {
  put(name, GIFT.x + i * DIAG, GIFT.y - i * DIAG, RIGHT);
});

export const STATION_POSITIONS = place;

// Frame the diagram around every station and its label (label width estimated from its length).
const extents = Object.entries(place).map(([name, { x, y, label }]) => {
  const w = name.length * 7.4;
  const cos = Math.cos((label.rotate * Math.PI) / 180);
  const sin = Math.abs(Math.sin((label.rotate * Math.PI) / 180));
  const reachX = w * cos * (label.anchor === 'end' ? -1 : 1);
  const lx = x + label.dx;
  return { left: Math.min(x, lx, lx + reachX), right: Math.max(x, lx, lx + reachX), top: Math.min(y, y + label.dy - w * sin * (label.rotate ? 1 : 0)), bottom: Math.max(y, y + label.dy + (label.anchor === 'end' && label.rotate ? w * sin : 0)) };
});
const PAD = 24;
const minX = Math.min(...extents.map((e) => e.left)) - PAD;
const minY = Math.min(...extents.map((e) => e.top)) - PAD;
export const DIAGRAM_VIEWBOX = {
  x: minX,
  y: minY,
  width: Math.max(...extents.map((e) => e.right)) + PAD - minX,
  height: Math.max(...extents.map((e) => e.bottom)) + PAD - minY,
};

export const linePoints = (lineId) => LINE_STATIONS[lineId].map((s) => [place[s].x, place[s].y]);

// ---------------------------------------------------------------- per-station facts

const normName = (s) => s.toLowerCase().replace(/\(interchange\)/, '').replace(/[^a-z0-9]/g, '').replace('amraiwadi', 'amraivadi').replace('vishwakarma', 'vishvakarma');

const BY_NORM = Object.fromEntries(ALL_STATIONS.map((s) => [normName(s), s]));
// The network's name for a station as spelled in other data ("Amraiwadi", "GNLU (Interchange)"), or undefined.
export const networkName = (name) => BY_NORM[normName(name)];

// Gates, lifts and elevated/underground from data/stationData.json, keyed by the network's station names.
export const indexGateData = (entries) => {
  const byNorm = Object.fromEntries(entries.map((e) => [normName(e.name), e]));
  return Object.fromEntries(ALL_STATIONS.map((s) => [s, byNorm[normName(s)] || null]));
};

// Published service frequency (knowledge base), as translation keys: t(LINE_FREQUENCY[id]).
// Yellow and Violet run only the timetabled through trains.
export const LINE_FREQUENCY = {
  blue: 'freq.blue',
  red: 'freq.red',
  yellow: 'freq.timetable',
  violet: 'freq.timetable',
  pink: 'freq.wip',
  lightblue: 'freq.wip',
};

// Operating hours from the knowledge base: 6:30 AM to 11:00 PM daily.
export const SERVICE_HOURS = { open: 6 * 60 + 30, close: 23 * 60 };

export const serviceStatus = (date = new Date()) => {
  // Ahmedabad time, whatever the viewer's time zone.
  const ist = new Date(date.getTime() + (date.getTimezoneOffset() + 330) * 60000);
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  return { running: minutes >= SERVICE_HOURS.open && minutes < SERVICE_HOURS.close };
};
