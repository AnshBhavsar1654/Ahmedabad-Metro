import os
from collections import deque
from math import asin, cos, radians, sin, sqrt
from typing import Dict, List, Optional

import pandas as pd

BASE_DIR = os.path.dirname(__file__)

stations_df = pd.read_excel(os.path.join(BASE_DIR, "Location.xlsx"))
fare_df = pd.read_excel(os.path.join(BASE_DIR, "Fare Matrix.xlsx"))

station_coords: Dict[str, Dict[str, float]] = {
    row["Station"].strip(): {"lat": float(row["Latitude"]), "lon": float(row["Longitude"])}
    for _, row in stations_df.iterrows()
}

# Ordered station lists, one per line. Index in LINES matches LINE_NAMES.
LINES: List[List[str]] = [
    ["APMC", "Jivraj Park", "Rajivnagar", "Shreyas", "Paldi", "Gandhigram", "Old High Court", "Usmanpura", "Vijaynagar", "Vadaj", "Ranip", "Sabarmati Railway Station", "AEC", "Sabarmati", "Motera Stadium", "Koteshwar Road"],
    ["Thaltej Gam", "Thaltej", "Doordarshan Kendra", "Gurukul Road", "Gujarat University", "Commerce Six Road", "SP Stadium", "Old High Court", "Shahpur", "Ghee Kanta", "Kalupur Railway Station", "Kankaria East", "Apparel Park", "Amraivadi", "Rabari Colony", "Vastral", "Nirant Cross Road", "Vastral Gam"],
    ["Koteshwar Road", "Vishvakarma College", "Tapovan Circle", "Narmada Canal", "Koba Circle", "Juna Koba", "Koba Gam", "GNLU", "Raysan", "Randesan", "Dholakuva Circle", "Infocity", "Sector-1", "Sector-10A", "Sachivalaya", "Akshardham", "Juna Sachivalaya", "Sector-16", "Sector-24", "Mahatma Mandir"],
    ["GNLU", "PDEU", "Gift City"],
]
LINE_NAMES = ["Red Line", "Blue Line", "Yellow Line", "Violet Line"]

# station -> [(neighbouring station, line index)]. Interchanges simply appear on several lines.
_graph: Dict[str, List[tuple]] = {}
for _line_idx, _stops in enumerate(LINES):
    for _a, _b in zip(_stops, _stops[1:]):
        _graph.setdefault(_a, []).append((_b, _line_idx))
        _graph.setdefault(_b, []).append((_a, _line_idx))

_station_lookup = {name.lower(): name for name in _graph}


def haversine_distance(lat1, lon1, lat2, lon2):
    """Great-circle distance in km."""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    a = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))


def get_all_stations() -> List[str]:
    return sorted(_graph)


def resolve_station(name: str) -> Optional[str]:
    """Match a station name case-insensitively; returns the canonical name or None."""
    return _station_lookup.get((name or "").strip().lower())


def get_fare(source: str, destination: str) -> Optional[int]:
    """Fare in rupees between two stations (either direction), or None if not listed."""
    for a, b in ((source, destination), (destination, source)):
        match = fare_df[(fare_df["Source"] == a) & (fare_df["Destination"] == b)]
        if len(match):
            return int(match["Fare"].iloc[0])
    return None


def _find_path(source: str, destination: str):
    """Breadth-first search; returns [(station, line index used to reach it)] or None."""
    previous = {source: None}
    queue = deque([source])
    while queue:
        current = queue.popleft()
        if current == destination:
            break
        for neighbour, line_idx in _graph[current]:
            if neighbour not in previous:
                previous[neighbour] = (current, line_idx)
                queue.append(neighbour)
    if destination not in previous:
        return None

    path = []
    node = destination
    while node is not None:
        step = previous[node]
        path.append((node, step[1] if step else None))
        node = step[0] if step else None
    return path[::-1]


def _segment_distance(route: List[str]) -> float:
    total = 0.0
    for a, b in zip(route, route[1:]):
        ca, cb = station_coords.get(a), station_coords.get(b)
        if ca and cb:
            total += haversine_distance(ca["lat"], ca["lon"], cb["lat"], cb["lon"])
    return total


def _empty(error: str):
    return {"route": [], "interchanges": [], "distance": 0, "instructions": [], "error": error}


def calculate_route_details(source: str, destination: str):
    src = resolve_station(source)
    dst = resolve_station(destination)
    if not src:
        return _empty(f"Station '{source}' not found")
    if not dst:
        return _empty(f"Station '{destination}' not found")
    if src == dst:
        return _empty("Source and destination cannot be the same")

    path = _find_path(src, dst)
    if not path:
        return _empty("No route found between these stations")

    route = [station for station, _ in path]
    # The line of the first station is the line of the first leg.
    line_at = [path[1][1]] + [line for _, line in path[1:]]

    # A transfer happens at a middle station where the incoming and outgoing lines differ.
    interchanges = []
    instructions = [f"Start at {src} (Take {LINE_NAMES[line_at[0]]})"]
    for i in range(1, len(route)):
        station = route[i]
        if i < len(route) - 1 and line_at[i + 1] != line_at[i]:
            interchanges.append(station)
            instructions.append(f"{station} (Change from {LINE_NAMES[line_at[i]]} to {LINE_NAMES[line_at[i + 1]]})")
        else:
            instructions.append(station)

    legs, start = [], 0
    for i in range(1, len(route)):
        if i == len(route) - 1 or line_at[i + 1] != line_at[i]:
            legs.append({"line": LINE_NAMES[line_at[i]], "from": route[start], "to": route[i], "stops": i - start})
            start = i

    return {
        "route": route,
        "legs": legs,
        "interchanges": interchanges,
        "distance": round(_segment_distance(route), 2),
        "instructions": instructions,
        "error": None,
    }
