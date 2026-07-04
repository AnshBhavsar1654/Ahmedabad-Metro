import os
import re
from urllib.parse import parse_qs, unquote, urlparse
from typing import Any, Dict, List, Optional

import pandas as pd
import requests
from geopy.distance import geodesic

FARE_PATH = os.path.join(os.path.dirname(__file__), "Fare Matrix.xlsx")
STATIONS_PATH = os.path.join(os.path.dirname(__file__), "Location.xlsx")
OSRM_TABLE_URL = "https://router.project-osrm.org/table/v1/driving"

stations_df = pd.read_excel(STATIONS_PATH)


def _extract_coordinates_from_url(url: str):
    patterns = [
        r"@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)",
        r"(?:[?&](?:q|query|ll)=)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)",
        r"(?:/place/[^/]+/)?@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)",
        r"!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)",
        r"!4d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)",
    ]

    candidates = [url]
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)
    for key in ("q", "query", "ll", "center"):
        values = query_params.get(key, [])
        candidates.extend(values)

    for candidate in candidates:
        candidate_text = unquote(candidate)
        for pattern in patterns:
            match = re.search(pattern, candidate_text)
            if match:
                first, second = float(match.group(1)), float(match.group(2))
                if pattern == r"!4d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)":
                    return second, first
                return first, second

    return None


def _resolve_google_maps_url(url: str):
    normalized_url = (url or "").strip()
    if not normalized_url:
        raise ValueError("Missing Google Maps URL")

    if not normalized_url.startswith(("http://", "https://")):
        normalized_url = f"https://{normalized_url}"

    parsed = urlparse(normalized_url)
    host = (parsed.netloc or "").lower()
    if "google" not in host and "goo.gl" not in host and "maps.app.goo.gl" not in normalized_url:
        raise ValueError("Please provide a Google Maps link")

    try:
        response = requests.get(
            normalized_url,
            allow_redirects=True,
            timeout=12,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            },
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise ValueError(f"Unable to resolve Google Maps link: {str(exc)}") from exc

    candidates = [response.url, normalized_url]
    for candidate in candidates:
        coordinates = _extract_coordinates_from_url(candidate)
        if coordinates:
            latitude, longitude = coordinates
            return {
                "latitude": latitude,
                "longitude": longitude,
                "resolved_url": response.url,
                "place_name": "Google Maps location",
            }

    raise ValueError("Could not extract coordinates from the provided Google Maps link")


def _format_osrm_coord(latitude: float, longitude: float) -> str:
    return f"{longitude},{latitude}"


def _get_road_distances_km(user_lat: float, user_lng: float, stations: List[Dict[str, Any]]) -> Optional[List[Optional[float]]]:
    if not stations:
        return []

    coordinates = [_format_osrm_coord(user_lat, user_lng)]
    for station in stations:
        coordinates.append(_format_osrm_coord(float(station["latitude"]), float(station["longitude"])))

    params = {
        "sources": "0",
        "destinations": ";".join(str(index) for index in range(1, len(coordinates))),
        "annotations": "distance",
    }

    response = requests.get(
        f"{OSRM_TABLE_URL}/" + ";".join(coordinates),
        params=params,
        timeout=12,
    )
    response.raise_for_status()

    data = response.json()
    distances = data.get("distances") if isinstance(data, dict) else None
    if not distances or not distances[0]:
        return None

    return [distance / 1000 if distance is not None else None for distance in distances[0]]


def get_stations_with_coordinates():
    """Returns all stations with their coordinates for mapping"""
    stations_list = []
    for _, row in stations_df.iterrows():
        stations_list.append(
            {
                "name": row["Station"],
                "latitude": row["Latitude"],
                "longitude": row["Longitude"],
            }
        )
    return stations_list


def get_nearby_stations_data(lat: Optional[float], lng: Optional[float]):
    user_lat = lat
    user_lng = lng
    if None in [user_lat, user_lng]:
        raise ValueError("Missing latitude/longitude parameters")
    if not (-90 <= user_lat <= 90) or not (-180 <= user_lng <= 180):
        raise ValueError("Invalid coordinates")

    stations = []
    for _, row in stations_df.iterrows():
        stations.append(
            {
                "name": row["Station"],
                "latitude": float(row["Latitude"]),
                "longitude": float(row["Longitude"]),
            }
        )

    road_distances = _get_road_distances_km(user_lat, user_lng, stations)

    if road_distances and len(road_distances) == len(stations):
        for station, distance in zip(stations, road_distances):
            station["distance"] = round(distance, 1) if distance is not None else None
        return sorted(
            stations,
            key=lambda x: x["distance"] if x["distance"] is not None else float("inf"),
        )[:3]

    user_coords = (user_lat, user_lng)
    for station in stations:
        station_coords = (station["latitude"], station["longitude"])
        distance = geodesic(user_coords, station_coords).kilometers
        station["distance"] = round(distance, 1)

    return sorted(stations, key=lambda x: x["distance"])[:3]


def resolve_google_maps_location_data(url: str):
    result = _resolve_google_maps_url(url)
    return result