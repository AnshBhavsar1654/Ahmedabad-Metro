"""Build network.json from the Excel sheets. Run after editing either sheet:

    pip install pandas openpyxl
    python scripts/build_network.py      (from backend/)

Inputs
- Location.xlsx: Station, Latitude, Longitude, Line, Status. Rows of one Line are that corridor's stations in
  running order; a station on two corridors (an interchange) has one row per corridor. Status is Operational,
  Under construction (trains pass, nobody boards) or Work in progress (a line being built: routes are shown,
  fares are not published yet).
- Fare Matrix.xlsx: Source, Destination, Fare (rupees). GMRC charges by origin and destination, not by the
  route taken, so one fare per pair is all routing needs.
- timetable.json: GMRC timetable points, used to estimate the running time of every segment.
- tracks.json: the metro track from OpenStreetMap (scripts/fetch_tracks.py). Each segment between two
  stations is traced along it, so maps draw the real track and distances are track lengths. A segment the
  track data does not cover falls back to a straight line, and the build says so.

Inputs and output live in backend/data/. Output: network.json, the only network file the server reads (no pandas at runtime). The build refuses to
write it if the data is broken (unknown station, unreachable station, missing fare), and prints every
correction it had to make.
"""
import heapq
import json
import os
import sys
from math import asin, cos, radians, sin, sqrt
from statistics import median

import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

# Excel corridor -> line as shown in the app. `order` is the running order the app uses ("as listed" or
# "reversed" relative to the sheet). Interchanges (Old High Court, Koteshwar Road, GNLU) have one row per
# corridor in Location.xlsx; that is what connects the lines. A line whose stations are all still being built
# is a "work in progress" line.
LINES = [
    {"id": "red", "name": "Red Line", "corridor": "North South Corridor", "order": "as listed"},
    {"id": "blue", "name": "Blue Line", "corridor": "East West Corridor", "order": "reversed"},
    {"id": "yellow", "name": "Yellow Line", "corridor": "Corridor-1", "order": "as listed"},
    {"id": "violet", "name": "Violet Line", "corridor": "Corridor-2", "order": "as listed"},
    {"id": "pink", "name": "Pink Line", "corridor": "Airport Corridor", "order": "as listed"},
    {"id": "lightblue", "name": "Light Blue Line", "corridor": "GIFT City Extension", "order": "as listed"},
]
STATUSES = {"Operational": "operational", "Under construction": "under construction", "Work in progress": "work in progress"}
# Lines not in the published timetable and not yet running: time estimated from distance.
ESTIMATE_KMH, ESTIMATE_DWELL_MIN = 34, 0.5
TRANSFER_MINUTES = 5  # walking between platforms plus a typical wait
# Blue Line is not in the published timetable: about 15 min Thaltej Gam to Old High Court, 30 min on to Vastral Gam.
BLUE_TIMING_POINTS = {"Thaltej Gam": 0, "Old High Court": 15, "Vastral Gam": 45}


def km_between(a, b):
    lat1, lon1, lat2, lon2 = map(radians, [*a, *b])
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * asin(sqrt(h))


def fail(message):
    sys.exit(f"build_network: {message}")


def load_stations_and_lines():
    df = pd.read_excel(os.path.join(DATA_DIR, "Location.xlsx"))
    df["Station"] = df["Station"].str.strip()
    df["Line"] = df["Line"].str.strip()
    if "Status" not in df:
        df["Status"] = "Operational"
    stations, status = {}, {}
    for row in df.itertuples(index=False):
        coord = (round(float(row.Latitude), 7), round(float(row.Longitude), 7))
        if row.Station in stations and stations[row.Station] != coord:
            fail(f"{row.Station} has two different coordinates")
        stations[row.Station] = coord
        label = str(row.Status).strip() if isinstance(row.Status, str) else "Operational"
        if label not in STATUSES:
            fail(f"{row.Station}: unknown Status {label!r} (use one of {sorted(STATUSES)})")
        if row.Station in status and status[row.Station] != STATUSES[label]:
            fail(f"{row.Station} has two different statuses")
        status[row.Station] = STATUSES[label]

    lines = []
    for spec in LINES:
        stops = df.loc[df["Line"] == spec["corridor"], "Station"].tolist()
        if not stops:
            fail(f"no rows for corridor {spec['corridor']!r} in Location.xlsx")
        if spec["order"] == "reversed":
            stops.reverse()
        # Work in progress when no station of its own (interchanges aside) is open yet.
        own = [s for s in stops if s not in {x for other in LINES if other is not spec
                                              for x in df.loc[df["Line"] == other["corridor"], "Station"]}]
        line_status = "work in progress" if own and all(status[s] == "work in progress" for s in own) else "operational"
        lines.append({"id": spec["id"], "name": spec["name"], "corridor": spec["corridor"], "status": line_status, "stations": stops})
    unknown = set(df["Line"]) - {spec["corridor"] for spec in LINES}
    if unknown:
        fail(f"corridors in Location.xlsx with no line configured: {sorted(unknown)}")
    return stations, status, lines


def segment_minutes(lines, stations):
    """Minutes per segment: median timetable time between timing points, spread evenly over the stations between."""
    with open(os.path.join(DATA_DIR, "timetable.json"), encoding="utf-8") as f:
        trains = json.load(f)["trains"]
    gaps = {}
    for train in trains:
        for (a, ta), (b, tb) in zip(train["stops"], train["stops"][1:]):
            minutes = (int(tb[:2]) * 60 + int(tb[3:])) - (int(ta[:2]) * 60 + int(ta[3:]))
            gaps.setdefault(frozenset((a, b)), []).append(minutes)
    gaps = {pair: median(values) for pair, values in gaps.items()}
    timed = {s for pair in gaps for s in pair}

    out = {}
    for line in lines:
        stops = line["stations"]
        if line["id"] == "blue":
            points = [(i, BLUE_TIMING_POINTS[s]) for i, s in enumerate(stops) if s in BLUE_TIMING_POINTS]
        elif sum(s in timed for s in stops) < 2:  # not in the timetable: estimate from distance
            for k, (a, b) in enumerate(zip(stops, stops[1:])):
                out[(line["id"], k)] = round(km_between(stations[a], stations[b]) / ESTIMATE_KMH * 60 + ESTIMATE_DWELL_MIN, 2)
            continue
        else:
            idx = [i for i, s in enumerate(stops) if s in timed]
            points, total = [(idx[0], 0.0)], 0.0
            for i, j in zip(idx, idx[1:]):
                total += gaps[frozenset((stops[i], stops[j]))]
                points.append((j, total))
        if points[0][0] != 0 or points[-1][0] != len(stops) - 1:
            fail(f"{line['name']}: timing points do not cover both ends")
        for (i, ti), (j, tj) in zip(points, points[1:]):
            for k in range(i, j):
                out[(line["id"], k)] = round((tj - ti) / (j - i), 2)
    return out


# ---------------------------------------------------------------- track tracing

SNAP_LIMIT_M = 600  # a station further than this from its line's track is not traced
DENSIFY_M = 25  # long straight stretches get extra points, so a station between two far-apart points can snap
JOIN_GAP_M = 40  # track pieces whose ends are this close are joined (small gaps in the map data)
SIMPLIFY_M = 3
MAX_DETOUR = 1.6  # a traced path longer than this x the straight distance (+300 m) is a wrong turn


def metres(a, b):
    return km_between(a, b) * 1000


class Track:
    """The track of one line (or of all lines) as a graph of points."""

    def __init__(self, ways):
        self.points, self.edges, index = [], {}, {}

        def node(p):
            key = (round(p[0], 6), round(p[1], 6))  # pieces share their junction points
            if key not in index:
                index[key] = len(self.points)
                self.points.append(key)
                self.edges[index[key]] = []
            return index[key]

        ends, self.piece_nodes = [], []
        for way in ways:
            coords = []
            for p, q in zip(way["coords"], way["coords"][1:]):
                steps = max(1, int(metres(p, q) // DENSIFY_M))
                coords += [(p[0] + (q[0] - p[0]) * k / steps, p[1] + (q[1] - p[1]) * k / steps) for k in range(steps)]
            coords.append(tuple(way["coords"][-1]))
            ids = [node(p) for p in coords]
            self.piece_nodes.append(ids)
            for a, b in zip(ids, ids[1:]):
                self._link(a, b)
            ends += [ids[0], ids[-1]]
        for i, a in enumerate(ends):  # bridge small gaps between pieces
            for b in ends[i + 1:]:
                if a != b and metres(self.points[a], self.points[b]) < JOIN_GAP_M:
                    self._link(a, b)

    def _link(self, a, b):
        d = metres(self.points[a], self.points[b])
        self.edges[a].append((b, d))
        self.edges[b].append((a, d))

    def candidates(self, p, limit=4):
        """The nearest point on each nearby piece of track (closest first). Double track is mapped as one piece
        per direction, so a station has a candidate on each; tracing tries them all."""
        found = {}
        for ids in self.piece_nodes:
            best = min(ids, key=lambda i: metres(self.points[i], p))
            d = metres(self.points[best], p)
            if d <= SNAP_LIMIT_M:
                found[best] = min(d, found.get(best, d))
        return sorted(found, key=found.get)[:limit]

    def path(self, a, b):
        dist, prev, heap = {a: 0.0}, {}, [(0.0, a)]
        while heap:
            d, u = heapq.heappop(heap)
            if u == b:
                out = [b]
                while out[-1] != a:
                    out.append(prev[out[-1]])
                return [self.points[i] for i in reversed(out)]
            if d > dist[u]:
                continue
            for v, w in self.edges[u]:
                if d + w < dist.get(v, float("inf")):
                    dist[v], prev[v] = d + w, u
                    heapq.heappush(heap, (d + w, v))
        return None


def simplify(points, tolerance_m=SIMPLIFY_M):
    """Douglas-Peucker on a short path (flat-earth distances are fine at this scale)."""
    if len(points) < 3:
        return points
    lat0 = radians(points[0][0])
    xy = [(p[1] * 111320 * cos(lat0), p[0] * 110540) for p in points]
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        i, j = stack.pop()
        (x1, y1), (x2, y2) = xy[i], xy[j]
        seg = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5 or 1e-9
        far, far_d = None, tolerance_m
        for k in range(i + 1, j):
            x0, y0 = xy[k]
            d = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / seg
            if d > far_d:
                far, far_d = k, d
        if far is not None:
            keep[far] = True
            stack += [(i, far), (far, j)]
    return [p for p, k in zip(points, keep) if k]


def trace_segments(stations, lines, notes):
    """{(line id, from, to): geometry along the track}. Segments drawn straight are added to `notes`."""
    with open(os.path.join(DATA_DIR, "tracks.json"), encoding="utf-8") as f:
        tracks = json.load(f)["lines"]
    every_line = Track([w for ways in tracks.values() for w in ways])
    shared = tracks.get("shared", [])
    traced = {}
    for line in lines:
        own = Track(tracks[line["id"]] + shared) if tracks.get(line["id"]) else None
        for a, b in zip(line["stations"], line["stations"][1:]):
            straight = metres(stations[a], stations[b])
            geometry = None
            for track in (own, every_line):  # a line's own track first; others cover shared stretches
                if not track:
                    continue
                best = None
                for na in track.candidates(stations[a]):
                    for nb in track.candidates(stations[b]):
                        path = track.path(na, nb) if na != nb else None
                        if not path:
                            continue
                        length = sum(metres(p, q) for p, q in zip(path, path[1:]))
                        if length <= MAX_DETOUR * straight + 300 and (best is None or length < best[0]):
                            best = (length, path)
                if best:
                    geometry = [list(stations[a]), *[list(p) for p in simplify(best[1])], list(stations[b])]
                    break
            if geometry is None:
                geometry = [list(stations[a]), list(stations[b])]
                notes.append(f"{line['name']} {a} -> {b}: no track in tracks.json, drawn as a straight line.")
            traced[(line["id"], a, b)] = geometry
    return traced


def shortest_km(stations, segments):
    graph = {}
    for seg in segments:
        graph.setdefault(seg["from"], []).append((seg["to"], seg["km"]))
        graph.setdefault(seg["to"], []).append((seg["from"], seg["km"]))

    def from_station(src):
        dist, heap = {src: 0.0}, [(0.0, src)]
        while heap:
            d, s = heapq.heappop(heap)
            if d > dist[s]:
                continue
            for t, w in graph.get(s, []):
                if d + w < dist.get(t, float("inf")):
                    dist[t] = d + w
                    heapq.heappush(heap, (d + w, t))
        return dist

    return {s: from_station(s) for s in stations}


def load_fares(stations, status, km):
    df = pd.read_excel(os.path.join(DATA_DIR, "Fare Matrix.xlsx"))
    df["Source"] = df["Source"].str.strip()
    df["Destination"] = df["Destination"].str.strip()
    raw = {}
    for a, b, fare in df.itertuples(index=False):
        if a not in stations or b not in stations:
            fail(f"Fare Matrix.xlsx names an unknown station: {a!r} / {b!r}")
        if (a, b) in raw and raw[(a, b)] != int(fare):
            fail(f"two different fares for {a} -> {b}")
        raw[(a, b)] = int(fare)

    # Distance band of every fare, from the pairs whose two directions agree. Used to settle disagreements.
    bands = {}
    for (a, b), fare in raw.items():
        if a != b and raw.get((b, a)) == fare:
            lo, hi = bands.get(fare, (float("inf"), 0.0))
            bands[fare] = (min(lo, km[a][b]), max(hi, km[a][b]))

    fares, fixes = {}, []
    names = sorted(stations)
    for i, a in enumerate(names):
        for b in names[i:]:
            there, back = raw.get((a, b)), raw.get((b, a))
            if there is None and back is None:
                if status[a] == "work in progress" or status[b] == "work in progress":
                    continue  # no fares published yet for lines being built
                fail(f"no fare for {a} <-> {b}")
            fare = there if back is None else back if there is None else there
            if there is not None and back is not None and there != back:
                distance = km[a][b]
                fitting = [f for f in (there, back) if bands.get(f, (0, 0))[0] <= distance <= bands.get(f, (0, 0))[1]]
                fare = min(fitting) if fitting else min(there, back)
                fixes.append(f"Fare Matrix.xlsx: {a} -> {b} is Rs {there} but {b} -> {a} is Rs {back}; "
                             f"using Rs {fare} for both ({distance:.1f} km fits that fare's distance band).")
            fares.setdefault(a, {})[b] = fare
            fares.setdefault(b, {})[a] = fare
    return fares, fixes


def build():
    """The network as a dict, plus the list of data corrections made. Exits with a message on broken data."""
    stations, status, lines = load_stations_and_lines()
    minutes = segment_minutes(lines, stations)
    for line in lines:
        missing = [s for s in line["stations"] if s not in stations]
        if missing:
            fail(f"{line['name']}: no coordinates for {missing}")
    track_notes = []
    traced = trace_segments(stations, lines, track_notes)
    segments = []
    for line in lines:
        for k, (a, b) in enumerate(zip(line["stations"], line["stations"][1:])):
            geometry = traced[(line["id"], a, b)]
            km = sum(km_between(p, q) for p, q in zip(geometry, geometry[1:]))  # along the track
            segments.append({"line": line["id"], "from": a, "to": b, "km": round(km, 3),
                             "minutes": minutes[(line["id"], k)], "geometry": geometry})

    km = shortest_km(stations, segments)
    unreachable = [s for s in stations if len(km[s]) != len(stations)]
    if unreachable:
        fail(f"stations not connected to the rest of the network: {unreachable}")
    fares, fixes = load_fares(stations, status, km)

    network = {
        "built_from": ["Location.xlsx", "Fare Matrix.xlsx", "timetable.json", "tracks.json (OpenStreetMap contributors, ODbL)"],
        "transfer_minutes": TRANSFER_MINUTES,
        "stations": {s: {"lat": lat, "lon": lon, "status": status[s]} for s, (lat, lon) in sorted(stations.items())},
        "lines": lines,
        "segments": segments,
        "fares": {a: dict(sorted(row.items())) for a, row in sorted(fares.items())},
        "data_fixes": fixes + track_notes,
    }
    return network, fixes + track_notes


def main():
    network, fixes = build()
    with open(os.path.join(DATA_DIR, "network.json"), "w", encoding="utf-8") as f:
        json.dump(network, f, ensure_ascii=False, indent=1)
    print(f"network.json: {len(network['stations'])} stations, {len(network['lines'])} lines, "
          f"{len(network['segments'])} segments, {sum(len(r) for r in network['fares'].values())} fares")
    for fix in fixes:
        print("  fixed:", fix)


if __name__ == "__main__":
    main()
