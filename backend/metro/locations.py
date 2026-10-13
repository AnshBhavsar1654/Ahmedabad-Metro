import re
from concurrent.futures import ThreadPoolExecutor
from math import asin, cos, radians, sin, sqrt
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, unquote, urljoin, urlparse

import requests

from metro.network import NETWORK, is_operational

def straight_line_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km (only used to shortlist stations before asking for road distances)."""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    a = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))


# Routing services, best first: walking routes (FOSSGIS, OpenStreetMap's German chapter), then driving routes
# (OSRM demo server) if that is down. Both are free for light use; send few requests and identify the app.
ROUTERS = [
    ("walk", "https://routing.openstreetmap.de/routed-foot", "foot"),
    ("road", "https://router.project-osrm.org", "driving"),
]
ROUTER_HEADERS = {"User-Agent": "AhmedabadMetroApp/1.0 (nearest-station finder)"}

# Only these hosts are fetched server-side (and every redirect hop is checked against them).
ALLOWED_MAPS_HOSTS = {
    "maps.app.goo.gl",
    "goo.gl",
    "maps.google.com",
    "google.com",
    "www.google.com",
    "google.co.in",
    "www.google.co.in",
}
MAX_REDIRECTS = 5

_NUM = r"(-?\d+(?:\.\d+)?)"
# (pattern, latitude group, longitude group)
_COORD_PATTERNS = [
    (rf"@{_NUM},{_NUM}", 1, 2),
    (rf"[?&](?:q|query|ll|center)={_NUM},{_NUM}", 1, 2),
    (rf"!3d{_NUM}!4d{_NUM}", 1, 2),
    (rf"!4d{_NUM}!3d{_NUM}", 2, 1),
]


def _extract_coordinates_from_url(url: str):
    candidates = [url]
    query = parse_qs(urlparse(url).query)
    for key in ("q", "query", "ll", "center"):
        candidates.extend(query.get(key, []))

    for candidate in candidates:
        text = unquote(candidate)
        for pattern, lat_group, lng_group in _COORD_PATTERNS:
            match = re.search(pattern, text)
            if match:
                lat, lng = float(match.group(lat_group)), float(match.group(lng_group))
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    return lat, lng
    return None


def _is_allowed_maps_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https") and (parsed.hostname or "").lower() in ALLOWED_MAPS_HOSTS


def _resolve_google_maps_url(url: str):
    normalized = (url or "").strip()
    if not normalized:
        raise ValueError("Missing Google Maps URL")
    if not normalized.startswith(("http://", "https://")):
        normalized = f"https://{normalized}"
    if not _is_allowed_maps_url(normalized):
        raise ValueError("Please provide a Google Maps link")

    # Coordinates are often already in the pasted link; no request needed.
    coordinates = _extract_coordinates_from_url(normalized)
    final_url = normalized

    if not coordinates:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; AhmedabadMetroBot/1.0)"}
        try:
            current = normalized
            for _ in range(MAX_REDIRECTS + 1):
                response = requests.get(current, allow_redirects=False, timeout=10, headers=headers)
                if response.is_redirect and response.headers.get("Location"):
                    current = urljoin(current, response.headers["Location"])
                    if not _is_allowed_maps_url(current):
                        raise ValueError("Please provide a Google Maps link")
                    coordinates = _extract_coordinates_from_url(current)
                    if coordinates:
                        break
                    continue
                response.raise_for_status()
                break
            final_url = current
        except requests.RequestException as exc:
            raise ValueError("Unable to open that Google Maps link") from exc

    if not coordinates:
        raise ValueError("Could not extract coordinates from the provided Google Maps link")

    latitude, longitude = coordinates
    return {
        "latitude": latitude,
        "longitude": longitude,
        "resolved_url": final_url,
        "place_name": "Google Maps location",
    }


def _table(base: str, profile: str, lat: float, lng: float, stations: List[Dict[str, Any]]):
    """Distances (km) and durations (min) from the user to each station, or None if the service is unavailable."""
    coordinates = ";".join([f"{lng},{lat}", *(f"{s['longitude']},{s['latitude']}" for s in stations)])
    try:
        response = requests.get(
            f"{base}/table/v1/{profile}/{coordinates}",
            params={"sources": "0", "annotations": "distance,duration"},
            headers=ROUTER_HEADERS,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        distances, durations = data["distances"][0][1:], data["durations"][0][1:]
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError):
        return None
    if len(distances) != len(stations) or any(d is None for d in distances):
        return None
    return [d / 1000 for d in distances], [t / 60 if t is not None else None for t in durations]


def _route_path(base: str, profile: str, lat: float, lng: float, station: Dict[str, Any]) -> Optional[List[List[float]]]:
    """Path from the user to a station as [[lat, lng], ...], or None. Starts and ends exactly at the two markers."""
    try:
        response = requests.get(
            f"{base}/route/v1/{profile}/{lng},{lat};{station['longitude']},{station['latitude']}",
            params={"overview": "full", "geometries": "geojson"},
            headers=ROUTER_HEADERS,
            timeout=10,
        )
        response.raise_for_status()
        coords = response.json()["routes"][0]["geometry"]["coordinates"]
    except (requests.RequestException, ValueError, KeyError, IndexError):
        return None
    path = [[round(p_lat, 6), round(p_lng, 6)] for p_lng, p_lat in coords]
    return [[lat, lng], *path, [station["latitude"], station["longitude"]]]


def get_stations_with_coordinates():
    """All stations with coordinates, for mapping (one entry per station, interchanges included once)."""
    return [{"name": name, "latitude": lat, "longitude": lon} for name, (lat, lon) in sorted(NETWORK.coords.items())]


def get_nearby_stations_data(lat: Optional[float], lng: Optional[float]):
    if lat is None or lng is None:
        raise ValueError("Missing latitude/longitude parameters")
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise ValueError("Invalid coordinates")

    # Only stations a rider can use today.
    stations = [s for s in get_stations_with_coordinates() if is_operational(s["name"])]

    # Pre-select the closest candidates by straight line so the routing request stays small.
    for station in stations:
        station["straight"] = straight_line_km(lat, lng, station["latitude"], station["longitude"])
    candidates = sorted(stations, key=lambda s: s["straight"])[:8]

    # Walking distance and time from the first routing service that answers; a straight line if none does.
    router = None
    for kind, base, profile in ROUTERS:
        table = _table(base, profile, lat, lng, candidates)
        if table:
            router = (kind, base, profile)
            for station, km, minutes in zip(candidates, *table):
                station.update(distance=round(km, 1), distance_type=kind,
                               walk_minutes=round(minutes) if kind == "walk" and minutes is not None else None)
            break
    for station in candidates:
        if router is None:
            station.update(distance=round(station["straight"], 1), distance_type="straight", walk_minutes=None)
        station.pop("straight")
    nearest = sorted(candidates, key=lambda s: s["distance"])[:3]

    # The path to each of the three, from the same service, fetched together. Without one the map draws a
    # straight line.
    paths = [None] * len(nearest)
    if router:
        _, base, profile = router
        with ThreadPoolExecutor(max_workers=3) as pool:
            paths = list(pool.map(lambda st: _route_path(base, profile, lat, lng, st), nearest))
    for station, path in zip(nearest, paths):
        station["path"] = path
    return nearest


def resolve_google_maps_location_data(url: str):
    return _resolve_google_maps_url(url)
