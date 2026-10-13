import { LINES } from './lines';

// Stations of each line in running order (same order as backend/route.py).
export const LINE_STATIONS = {
  red: ['APMC', 'Jivraj Park', 'Rajivnagar', 'Shreyas', 'Paldi', 'Gandhigram', 'Old High Court', 'Usmanpura', 'Vijaynagar', 'Vadaj', 'Ranip', 'Sabarmati Railway Station', 'AEC', 'Sabarmati', 'Motera Stadium', 'Koteshwar Road'],
  blue: ['Thaltej Gam', 'Thaltej', 'Doordarshan Kendra', 'Gurukul Road', 'Gujarat University', 'Commerce Six Road', 'SP Stadium', 'Old High Court', 'Shahpur', 'Ghee Kanta', 'Kalupur Railway Station', 'Kankaria East', 'Apparel Park', 'Amraivadi', 'Rabari Colony', 'Vastral', 'Nirant Cross Road', 'Vastral Gam'],
  yellow: ['Koteshwar Road', 'Vishvakarma College', 'Tapovan Circle', 'Narmada Canal', 'Koba Circle', 'Juna Koba', 'Koba Gam', 'GNLU', 'Raysan', 'Randesan', 'Dholakuva Circle', 'Infocity', 'Sector-1', 'Sector-10A', 'Sachivalaya', 'Akshardham', 'Juna Sachivalaya', 'Sector-16', 'Sector-24', 'Mahatma Mandir'],
  violet: ['GNLU', 'PDEU', 'Gift City'],
};

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
// Each label is placed on the side of its line that no other line or label uses.

const S = 40; // spacing between stations
const OHC = { x: 380, y: 980 };
const DIAG = 30; // x and y step on the diagonal

const UP_RIGHT = { dx: 7, dy: -9, anchor: 'start', rotate: -40 };
const DOWN_LEFT = { dx: -7, dy: 15, anchor: 'end', rotate: -40 };
const RIGHT = { dx: 14, dy: 4, anchor: 'start', rotate: 0 };
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
  put(name, gnlu.x + i * S, gnlu.y, UP_RIGHT);
});

export const STATION_POSITIONS = place;

const xs = Object.values(place).map((p) => p.x);
const ys = Object.values(place).map((p) => p.y);
// Room for the longest labels (rotated ones reach about 90px out).
export const DIAGRAM_VIEWBOX = {
  x: Math.min(...xs) - 120,
  y: Math.min(...ys) - 100,
  width: Math.max(...xs) - Math.min(...xs) + 240,
  height: Math.max(...ys) - Math.min(...ys) + 140,
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

// Published service frequency (knowledge base). Yellow and Violet run only the timetabled through trains.
export const LINE_FREQUENCY = {
  blue: 'Every 9–10 min on weekdays, 12 min at weekends',
  red: 'Every 10–12 min',
  yellow: 'Runs to a timetable: check the next trains',
  violet: 'Runs to a timetable: check the next trains',
};

// Operating hours from the knowledge base: 6:30 AM to 11:00 PM daily.
export const SERVICE_HOURS = { open: 6 * 60 + 30, close: 23 * 60 };

export const serviceStatus = (date = new Date()) => {
  // Ahmedabad time, whatever the viewer's time zone.
  const ist = new Date(date.getTime() + (date.getTimezoneOffset() + 330) * 60000);
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  return { running: minutes >= SERVICE_HOURS.open && minutes < SERVICE_HOURS.close };
};
