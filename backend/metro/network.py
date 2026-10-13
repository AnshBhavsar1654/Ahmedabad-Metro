"""Routes and fares over the metro network described in data/network.json (built from the Excel sheets
by scripts/build_network.py).

Routing works on (station, line) states, so changing line has a cost of its own:
- riding one segment costs its running time (minutes, from the timetable);
- changing line at an interchange costs `transfer_minutes`.
Dijkstra gives the quickest route; Yen's algorithm gives the next-quickest genuinely different routes, so the
planner keeps working once the network has loops or parallel lines (more than one way between two stations).

Fares are looked up per origin and destination: GMRC charges by the two stations, whatever the route.
"""
import heapq
import json
from typing import Dict, List, Optional, Tuple

from metro import DATA_DIR


State = Tuple[str, str]  # (station, line id)
_START, _END = ("", "start"), ("", "end")



class Network:
    def __init__(self, data: Dict):
        self.transfer_minutes = float(data.get("transfer_minutes", 5))
        self.coords = {name: (c["lat"], c["lon"]) for name, c in data["stations"].items()}
        self.lines = data["lines"]
        self.line_name = {l["id"]: l["name"] for l in self.lines}
        self.fares = data.get("fares", {})
        self._lookup = {name.lower(): name for name in self.coords}

        # Riding edges, both directions, keyed by state.
        self._ride: Dict[State, List[Tuple[State, float, float]]] = {}
        self.station_lines: Dict[str, List[str]] = {}
        for seg in data["segments"]:
            a, b, line = (seg["from"], seg["line"]), (seg["to"], seg["line"]), seg["line"]
            self._ride.setdefault(a, []).append((b, float(seg["minutes"]), float(seg["km"])))
            self._ride.setdefault(b, []).append((a, float(seg["minutes"]), float(seg["km"])))
            for s in (seg["from"], seg["to"]):
                if line not in self.station_lines.setdefault(s, []):
                    self.station_lines[s].append(line)

    # ---------------------------------------------------------------- graph

    def _edges(self, state: State, src: str, dst: str):
        """(next state, cost in minutes) from `state`, including the virtual start and end."""
        if state == _START:
            return [((src, line), 0.0) for line in self.station_lines.get(src, [])]
        station, line = state
        out = [(nxt, minutes) for nxt, minutes, _ in self._ride.get(state, [])]
        out += [((station, other), self.transfer_minutes) for other in self.station_lines[station] if other != line]
        if station == dst:
            out.append((_END, 0.0))
        return out

    def _dijkstra(self, src, dst, banned_edges=frozenset(), banned_states=frozenset(), start=_START, start_cost=0.0):
        dist, prev = {start: start_cost}, {}
        heap = [(start_cost, 0, start)]
        tie = 0
        while heap:
            cost, _, state = heapq.heappop(heap)
            if state == _END:
                path = [state]
                while path[-1] != start:
                    path.append(prev[path[-1]])
                return cost, path[::-1]
            if cost > dist.get(state, float("inf")):
                continue
            for nxt, w in self._edges(state, src, dst):
                if nxt in banned_states or (state, nxt) in banned_edges:
                    continue
                if cost + w < dist.get(nxt, float("inf")):
                    dist[nxt], prev[nxt] = cost + w, state
                    tie += 1
                    heapq.heappush(heap, (cost + w, tie, nxt))
        return None

    def _cost(self, path: List[State], src: str, dst: str) -> float:
        total = 0.0
        for a, b in zip(path, path[1:]):
            total += next(w for nxt, w in self._edges(a, src, dst) if nxt == b)
        return total

    def _k_shortest(self, src: str, dst: str, k: int) -> List[Tuple[float, List[State]]]:
        """Yen's algorithm over (station, line) states: up to k loopless paths, quickest first."""
        first = self._dijkstra(src, dst)
        if not first:
            return []
        found = [first]
        candidates: List[Tuple[float, int, List[State]]] = []
        seen = {tuple(first[1])}
        tie = 0
        while len(found) < k:
            _, last = found[-1]
            for i in range(len(last) - 2):
                spur, root = last[i], last[: i + 1]
                banned_edges = {(p[i], p[i + 1]) for _, p in found if p[: i + 1] == root}
                banned_states = frozenset(root[:-1])
                result = self._dijkstra(src, dst, frozenset(banned_edges), banned_states, start=spur,
                                        start_cost=self._cost(root, src, dst))
                if result:
                    path = root[:-1] + result[1]
                    if tuple(path) not in seen:
                        seen.add(tuple(path))
                        tie += 1
                        heapq.heappush(candidates, (result[0], tie, path))
            if not candidates:
                break
            cost, _, path = heapq.heappop(candidates)
            found.append((cost, path))
        return found

    # ---------------------------------------------------------------- results

    def _describe(self, minutes: float, path: List[State]) -> Optional[Dict]:
        states = [s for s in path if s not in (_START, _END)]
        route = [states[0][0]]
        for s in states[1:]:
            if s[0] != route[-1]:
                route.append(s[0])
        if len(route) != len(set(route)):
            return None  # passes a station twice: never a sensible journey

        # Line used to reach each station along the route, and the legs between line changes.
        legs, km = [], 0.0
        for a, b in zip(states, states[1:]):
            if a[0] == b[0]:
                continue  # a change of line
            km += next(d for nxt, _, d in self._ride[a] if nxt == b)
            line = self.line_name[a[1]]
            if legs and legs[-1]["line"] == line and legs[-1]["to"] == a[0]:
                legs[-1]["to"], legs[-1]["stops"] = b[0], legs[-1]["stops"] + 1
            else:
                legs.append({"line": line, "from": a[0], "to": b[0], "stops": 1})

        interchanges = [leg["to"] for leg in legs[:-1]]
        instructions = [f"Start at {route[0]} (Take {legs[0]['line']})"]
        changes = {leg["to"]: (leg["line"], nxt["line"]) for leg, nxt in zip(legs, legs[1:])}
        for station in route[1:]:
            if station in changes:
                instructions.append(f"{station} (Change from {changes[station][0]} to {changes[station][1]})")
            else:
                instructions.append(station)
        return {
            "route": route,
            "legs": legs,
            "interchanges": interchanges,
            "distance": round(km, 2),
            "minutes": round(minutes, 1),
            "instructions": instructions,
            "error": None,
        }

    def find_routes(self, source: str, destination: str, max_routes: int = 3) -> List[Dict]:
        """Up to `max_routes` different routes, quickest first. Slower alternatives are kept only when they are
        reasonable (at most 50% plus 10 minutes slower than the quickest)."""
        src, dst = self.resolve(source), self.resolve(destination)
        if not src or not dst or src == dst:
            return []
        routes, stations_seen = [], set()
        for minutes, path in self._k_shortest(src, dst, max_routes * 4):
            described = self._describe(minutes, path)
            if not described or tuple(described["route"]) in stations_seen:
                continue
            if routes and minutes > routes[0]["minutes"] * 1.5 + 10:
                break
            stations_seen.add(tuple(described["route"]))
            routes.append(described)
            if len(routes) == max_routes:
                break
        return routes

    def resolve(self, name: str) -> Optional[str]:
        return self._lookup.get((name or "").strip().lower())

    def fare(self, source: str, destination: str) -> Optional[int]:
        return self.fares.get(source, {}).get(destination)


def _empty(error: str):
    return {"route": [], "legs": [], "interchanges": [], "distance": 0, "minutes": None, "instructions": [], "error": error}


with open(DATA_DIR / "network.json", encoding="utf-8") as _f:
    NETWORK = Network(json.load(_f))

# Line order and names as the rest of the app expects them.
LINE_NAMES = [l["name"] for l in NETWORK.lines]
LINES: List[List[str]] = [l["stations"] for l in NETWORK.lines]


def get_all_stations() -> List[str]:
    return sorted(NETWORK.coords)


def resolve_station(name: str) -> Optional[str]:
    """Match a station name case-insensitively; returns the canonical name or None."""
    return NETWORK.resolve(name)


def get_fare(source: str, destination: str) -> Optional[int]:
    """Fare in rupees between two stations (same either way), or None if not listed."""
    return NETWORK.fare(source, destination)


def find_routes(source: str, destination: str, max_routes: int = 3) -> List[Dict]:
    return NETWORK.find_routes(source, destination, max_routes)


def calculate_route_details(source: str, destination: str):
    """The quickest route, with `alternatives` (other reasonable routes, quickest first)."""
    src, dst = resolve_station(source), resolve_station(destination)
    if not src:
        return _empty(f"Station '{source}' not found")
    if not dst:
        return _empty(f"Station '{destination}' not found")
    if src == dst:
        return _empty("Source and destination cannot be the same")
    routes = find_routes(src, dst)
    if not routes:
        return _empty("No route found between these stations")
    best = dict(routes[0])
    best["alternatives"] = routes[1:]
    return best
