import re
from concurrent.futures import ThreadPoolExecutor
from math import asin, cos, radians, sin, sqrt
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, unquote, urljoin, urlparse

import requests

from metro.network import NETWORK

def straight_line_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km (only used to shortlist stations before asking for road distances)."""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    a = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))


OSRM_TABLE_URL = "https://router.project-osrm.org/table/v1/driving"
OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving"

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


def _get_road_distances_km(user_lat: float, user_lng: float, stations: List[Dict[str, Any]]) -> Optional[List[Optional[float]]]:
    """Driving distances from the user to each station via OSRM, or None if unavailable."""
    if not stations:
        return []

    coordinates = [f"{user_lng},{user_lat}"]
    coordinates.extend(f"{s['longitude']},{s['latitude']}" for s in stations)

    try:
        response = requests.get(
            f"{OSRM_TABLE_URL}/" + ";".join(coordinates),
            params={
                "sources": "0",
                "destinations": ";".join(str(i) for i in range(1, len(coordinates))),
                "annotations": "distance",
            },
            timeout=12,
        )
        response.raise_for_status()
        distances = response.json().get("distances")
    except (requests.RequestException, ValueError):
        return None

    if not distances or not distances[0] or len(distances[0]) != len(stations):
        return None
    return [d / 1000 if d is not None else None for d in distances[0]]


def _get_road_path(user_lat: float, user_lng: float, station: Dict[str, Any]) -> Optional[List[List[float]]]:
    """Road path from the user to a station as [[lat, lng], ...] (simplified), or None if OSRM is unavailable.
    Starts and ends exactly at the two markers, so the drawn line joins them."""
    try:
        response = requests.get(
            f"{OSRM_ROUTE_URL}/{user_lng},{user_lat};{station['longitude']},{station['latitude']}",
            params={"overview": "simplified", "geometries": "geojson"},
            timeout=8,
        )
        response.raise_for_status()
        coords = response.json()["routes"][0]["geometry"]["coordinates"]
    except (requests.RequestException, ValueError, KeyError, IndexError):
        return None
    path = [[round(lat, 6), round(lng, 6)] for lng, lat in coords]
    return [[user_lat, user_lng], *path, [station["latitude"], station["longitude"]]]


def get_stations_with_coordinates():
    """All stations with coordinates, for mapping (one entry per station, interchanges included once)."""
    return [{"name": name, "latitude": lat, "longitude": lon} for name, (lat, lon) in sorted(NETWORK.coords.items())]


def get_nearby_stations_data(lat: Optional[float], lng: Optional[float]):
    if lat is None or lng is None:
        raise ValueError("Missing latitude/longitude parameters")
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise ValueError("Invalid coordinates")

    stations = get_stations_with_coordinates()

    # Pre-select the closest candidates by straight line so the routing request stays small.
    for station in stations:
        station["straight"] = straight_line_km(lat, lng, station["latitude"], station["longitude"])
    candidates = sorted(stations, key=lambda s: s["straight"])[:8]

    road_distances = _get_road_distances_km(lat, lng, candidates)
    for index, station in enumerate(candidates):
        road = road_distances[index] if road_distances else None
        station["distance"] = round(road if road is not None else station["straight"], 1)
        station["distance_type"] = "road" if road is not None else "straight"  # the card says which
        station.pop("straight")
    nearest = sorted(candidates, key=lambda s: s["distance"])[:3]

    # The road path to each of the three, fetched together. Without one the map draws a straight line.
    with ThreadPoolExecutor(max_workers=3) as pool:
        paths = list(pool.map(lambda st: _get_road_path(lat, lng, st), nearest))
    for station, path in zip(nearest, paths):
        station["path"] = path
    return nearest


def resolve_google_maps_location_data(url: str):
    return _resolve_google_maps_url(url)
