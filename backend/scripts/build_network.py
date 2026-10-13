"""Build network.json from the Excel sheets. Run after editing either sheet:

    pip install pandas openpyxl
    python scripts/build_network.py      (from backend/)

Inputs
- Location.xlsx: Station, Latitude, Longitude, Line. Rows of one Line are that corridor's stations in
  running order; a station on two corridors (an interchange) has one row per corridor.
- Fare Matrix.xlsx: Source, Destination, Fare (rupees). GMRC charges by origin and destination, not by the
  route taken, so one fare per pair is all routing needs.
- timetable.json: GMRC timetable points, used to estimate the running time of every segment.

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
# corridor in Location.xlsx; that is what connects the lines.
LINES = [
    {"id": "red", "name": "Red Line", "corridor": "North South Corridor", "order": "as listed"},
    {"id": "blue", "name": "Blue Line", "corridor": "East West Corridor", "order": "reversed"},
    {"id": "yellow", "name": "Yellow Line", "corridor": "Corridor-1", "order": "as listed"},
    {"id": "violet", "name": "Violet Line", "corridor": "Corridor-2", "order": "as listed"},
]
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
    stations = {}
    for row in df.itertuples(index=False):
        coord = (round(float(row.Latitude), 7), round(float(row.Longitude), 7))
        if row.Station in stations and stations[row.Station] != coord:
            fail(f"{row.Station} has two different coordinates")
        stations[row.Station] = coord

    lines = []
    for spec in LINES:
        stops = df.loc[df["Line"] == spec["corridor"], "Station"].tolist()
        if not stops:
            fail(f"no rows for corridor {spec['corridor']!r} in Location.xlsx")
        if spec["order"] == "reversed":
            stops.reverse()
        lines.append({"id": spec["id"], "name": spec["name"], "corridor": spec["corridor"], "stations": stops})
    unknown = set(df["Line"]) - {spec["corridor"] for spec in LINES}
    if unknown:
        fail(f"corridors in Location.xlsx with no line configured: {sorted(unknown)}")
    return stations, lines


def segment_minutes(lines):
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


def load_fares(stations, km):
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
    stations, lines = load_stations_and_lines()
    minutes = segment_minutes(lines)
    segments = []
    for line in lines:
        for k, (a, b) in enumerate(zip(line["stations"], line["stations"][1:])):
            if a not in stations or b not in stations:
                fail(f"{line['name']}: no coordinates for {a if a not in stations else b}")
            segments.append({"line": line["id"], "from": a, "to": b,
                             "km": round(km_between(stations[a], stations[b]), 3), "minutes": minutes[(line["id"], k)]})

    km = shortest_km(stations, segments)
    unreachable = [s for s in stations if len(km[s]) != len(stations)]
    if unreachable:
        fail(f"stations not connected to the rest of the network: {unreachable}")
    fares, fixes = load_fares(stations, km)

    network = {
        "built_from": ["Location.xlsx", "Fare Matrix.xlsx", "timetable.json"],
        "transfer_minutes": TRANSFER_MINUTES,
        "stations": {s: {"lat": lat, "lon": lon} for s, (lat, lon) in sorted(stations.items())},
        "lines": lines,
        "segments": segments,
        "fares": {a: dict(sorted(row.items())) for a, row in sorted(fares.items())},
        "data_fixes": fixes,
    }
    return network, fixes


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
