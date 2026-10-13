"""Download the metro track geometry into data/tracks.json. Run when the network changes (new line or
extension), then rebuild:

    python scripts/fetch_tracks.py      (from backend/)
    python scripts/build_network.py

Sources, all OpenStreetMap:
1. every metro track in the Ahmedabad-Gandhinagar area (Overpass API). This is complete on its own.
2. When Overpass is busy: each line's route relations from the main OpenStreetMap API, merged with the track
   already saved in data/tracks.json, so a refresh never loses track it had (route relations miss some pieces).
Depot, yard and siding tracks are left out: a traced path must never run through them.

Each piece is filed under its line by name; unnamed main-line pieces (crossovers, junctions) go under "shared".
Map data © OpenStreetMap contributors (ODbL).
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
HEADERS = {"User-Agent": "AhmedabadMetroApp/1.0 (track geometry for a rider website)"}
OSM_API = "https://api.openstreetmap.org/api/0.6"
OVERPASS_URLS = [  # public servers, tried in order (the main one is often busy)
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# OpenStreetMap route relations per line (both directions). Find new ones with an Overpass query for
# relation["route"="subway"] around Ahmedabad.
RELATIONS = {
    "blue": [8312433, 9521935],
    "red": [8312443, 14658372],
    "yellow": [18391194, 18391195],
    "violet": [18084555, 18084556],
}
# Lines still being built have no route relation yet; their planned track is mapped as single ways.
PLANNED_WAYS = {
    "lightblue": [1482920013],  # GIFT City to Shahpur extension (railway=proposed)
}

AREA = (22.95, 72.48, 23.27, 72.72)  # south, west, north, east: Ahmedabad to Gandhinagar and GIFT City

# Piece name -> line. Checked in order; OpenStreetMap names vary ("Line-2: Motera Stadium – Mahatma Mandir").
NAME_TO_LINE = [("blue line", "blue"), ("red line", "red"), ("yellow line", "yellow"), ("line-2", "yellow"),
                ("violet line", "violet"), ("gift city", "violet")]
NOT_MAIN_LINE = {"yard", "siding", "spur", "depot"}


def _get_json(url, data=None):
    request = urllib.request.Request(url, data=data, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.load(response)


def _line_for(name):
    name = (name or "").lower()
    return next((line for key, line in NAME_TO_LINE if key in name), None)


def _area_from_overpass():
    """Every main-line metro track in AREA, as (line or "shared", piece), or None if Overpass is unavailable."""
    query = f'[out:json][timeout:120];way["railway"="subway"]{AREA};out geom tags;'
    for url in OVERPASS_URLS:
        try:
            result = _get_json(url, urllib.parse.urlencode({"data": query}).encode())
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            print(f"  {url}: {exc}")
            continue
        return [
            (_line_for(el["tags"].get("name")) or "shared",
             {"id": f"way/{el['id']}", "coords": [[round(p["lat"], 7), round(p["lon"], 7)] for p in el["geometry"]]})
            for el in result["elements"]
            if el["type"] == "way" and el.get("geometry") and el.get("tags", {}).get("service") not in NOT_MAIN_LINE
        ]
    return None


def _planned_ways(way_ids):
    """Planned track (single OpenStreetMap ways) from the main OpenStreetMap API."""
    ways = []
    for wid in way_ids:
        elements = _get_json(f"{OSM_API}/way/{wid}/full.json")["elements"]
        nodes = {el["id"]: (el["lat"], el["lon"]) for el in elements if el["type"] == "node"}
        way = next(el for el in elements if el["type"] == "way")
        ways.append({"id": f"way/{wid}", "coords": [[round(nodes[n][0], 7), round(nodes[n][1], 7)] for n in way["nodes"]]})
    return ways


def _ways_from_osm_api(relation_ids):
    """The main OpenStreetMap API: each relation with all its ways and nodes ("full")."""
    ways = {}
    for rid in relation_ids:
        elements = _get_json(f"{OSM_API}/relation/{rid}/full.json")["elements"]
        nodes = {el["id"]: (el["lat"], el["lon"]) for el in elements if el["type"] == "node"}
        for el in elements:
            tags = el.get("tags", {})
            if el["type"] == "way" and "railway" in tags:
                ways[el["id"]] = {"id": f"way/{el['id']}", "service": tags.get("service"),
                                  "coords": [[round(nodes[n][0], 7), round(nodes[n][1], 7)] for n in el["nodes"] if n in nodes]}
    return list(ways.values())


def main():
    lines = {line: {} for line in [*RELATIONS, "shared"]}
    pieces = _area_from_overpass()
    if pieces is not None:
        for line, piece in pieces:
            lines[line][piece["id"]] = piece
    else:
        print("Overpass unavailable: using the route relations plus the track already saved")
        try:
            with open(os.path.join(DATA_DIR, "tracks.json"), encoding="utf-8") as f:
                for line, saved in json.load(f)["lines"].items():
                    for piece in saved:
                        lines.setdefault(line, {})[piece["id"]] = piece
        except (OSError, ValueError, KeyError):
            pass
        for line, relation_ids in RELATIONS.items():
            for way in _ways_from_osm_api(relation_ids):
                if way.pop("service", None) not in NOT_MAIN_LINE:
                    lines[line][way["id"]] = way

    for line, way_ids in PLANNED_WAYS.items():
        for way in _planned_ways(way_ids):
            lines.setdefault(line, {})[way["id"]] = way

    for line, found in lines.items():
        if line != "shared" and line not in PLANNED_WAYS and not found:
            sys.exit(f"fetch_tracks: no track found for the {line} line")
        print(f"{line}: {len(found)} pieces, {sum(len(p['coords']) for p in found.values())} points")

    with open(os.path.join(DATA_DIR, "tracks.json"), "w", encoding="utf-8") as f:
        json.dump({
            "source": "OpenStreetMap contributors (ODbL)",
            "relations": RELATIONS,
            "lines": {line: list(found.values()) for line, found in lines.items()},
        }, f)
    print("saved data/tracks.json")


if __name__ == "__main__":
    main()
