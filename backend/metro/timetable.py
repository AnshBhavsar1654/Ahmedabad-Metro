"""Travel times and next trains, from GMRC's published timetable (timetable.json, w.e.f. 18 May 2026).

The timetable lists only the through trains between APMC and Mahatma Mandir / GIFT City, at nine timing
points. From it we take:
- running times per segment (computed by scripts/build_network.py and stored in data/network.json);
- departures for every station on that corridor: exact at timing points, interpolated ("approx") elsewhere.
The Blue Line is not in the timetable; its running time is an approximation (about 45 min end to end).
"""
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from metro import DATA_DIR
from metro.network import NETWORK, calculate_route_details

IST = timezone(timedelta(hours=5, minutes=30))
TRANSFER_MINUTES = NETWORK.transfer_minutes  # walking between platforms plus a typical wait
SOURCE = "GMRC timetable w.e.f. 18 May 2026"

with open(DATA_DIR / "timetable.json", encoding="utf-8") as _f:
    TRAINS: List[Dict] = json.load(_f)["trains"]
with open(DATA_DIR / "network.json", encoding="utf-8") as _f:
    _SEGMENTS: List[Dict] = json.load(_f)["segments"]


def _minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _clock(minutes: float) -> str:
    minutes = int(round(minutes)) % (24 * 60)
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


# ---------------------------------------------------------------- running times

# Minutes from each line's first station, from the segment running times in network.json
# (scripts/build_network.py derives them from this same timetable; the Blue Line is an approximation).
LINE_MINUTES: Dict[str, Dict[str, float]] = {}
for _line in NETWORK.lines:
    _minutes_by_segment = {(seg["from"], seg["to"]): seg["minutes"] for seg in _SEGMENTS if seg["line"] == _line["id"]}
    _total, _cumulative = 0.0, {}
    for _i, _station in enumerate(_line["stations"]):
        if _i:
            _total += _minutes_by_segment[(_line["stations"][_i - 1], _station)]
        _cumulative[_station] = _total
    LINE_MINUTES[_line["name"]] = _cumulative


# ---------------------------------------------------------------- next trains

def _train_times(train: Dict) -> List[Tuple[str, float, bool]]:
    """(station, minutes after midnight, approximate?) for every station the train passes."""
    stops = train["stops"]
    path = calculate_route_details(stops[0][0], stops[-1][0])["route"]
    known = {name: _minutes(t) for name, t in stops}
    index = [i for i, s in enumerate(path) if s in known]
    out = []
    for i, j in zip(index, index[1:]):
        ti, tj = known[path[i]], known[path[j]]
        for k in range(i, j):
            out.append((path[k], ti + (tj - ti) * (k - i) / (j - i), k != i))
    out.append((path[index[-1]], known[path[index[-1]]], False))
    return out


_SCHEDULE: List[Dict] = [
    {"direction": t["direction"], "destination": t["stops"][-1][0], "times": _train_times(t)} for t in TRAINS
]
CORRIDOR_STATIONS = {name for train in _SCHEDULE for name, _, _ in train["times"]}


def departures(station: str, now: Optional[datetime] = None, per_direction: int = 3) -> Optional[Dict]:
    """Next through trains from `station` in each direction, or None if no timetabled train calls there."""
    if station not in CORRIDOR_STATIONS:
        return None
    now = now or datetime.now(IST)
    now_min = now.hour * 60 + now.minute
    groups: Dict[str, Dict] = {}
    first, last = {}, {}
    for train in _SCHEDULE:
        for name, minute, approx in train["times"]:
            if name != station or name == train["destination"]:
                continue
            direction = train["direction"]
            first[direction] = min(first.get(direction, minute), minute)
            last[direction] = max(last.get(direction, minute), minute)
            if minute >= now_min:
                groups.setdefault(direction, []).append(
                    {"time": _clock(minute), "destination": train["destination"], "approx": approx, "_m": minute}
                )
    result = []
    for direction in ("up", "down"):
        if direction not in first:
            continue
        trains = sorted(groups.get(direction, []), key=lambda t: t["_m"])[:per_direction]
        for t in trains:
            t.pop("_m")
        result.append({
            "towards": "Mahatma Mandir / GIFT City" if direction == "up" else "APMC",
            "trains": trains,
            "first": _clock(first[direction]),
            "last": _clock(last[direction]),
        })
    return {"station": station, "directions": result, "source": SOURCE}


# ---------------------------------------------------------------- journey time

def _through_train(a: str, b: str) -> bool:
    """True if some timetabled train calls at a and then b, so a change of line there needs no change of train."""
    for train in _SCHEDULE:
        names = [name for name, _, _ in train["times"]]
        if a in names and b in names and names.index(a) < names.index(b):
            return True
    return False


def journey_minutes(legs: List[Dict]) -> int:
    """Estimated time on the train, plus TRANSFER_MINUTES for each change that needs a different train."""
    ride = sum(abs(LINE_MINUTES[leg["line"]][leg["to"]] - LINE_MINUTES[leg["line"]][leg["from"]]) for leg in legs)
    changes = sum(1 for first, second in zip(legs, legs[1:]) if not _through_train(first["from"], second["to"]))
    return int(round(ride + TRANSFER_MINUTES * changes))


def through_service(legs: List[Dict]) -> bool:
    """True if the whole journey can be made without changing trains (it spans several lines)."""
    return len(legs) > 1 and _through_train(legs[0]["from"], legs[-1]["to"])


# ---------------------------------------------------------------- next trains for a journey

_INFREQUENT_LINES = {"Yellow Line", "Violet Line"}  # served only by the timetabled through trains


def journey_trains(legs: List[Dict], now: Optional[datetime] = None, limit: int = 3) -> Optional[Dict]:
    """For a journey onto the Yellow or Violet Line: where to catch a timetabled train, and the next ones
    that actually reach the end of that leg. None for journeys those lines aren't part of."""
    k = next((i for i, leg in enumerate(legs) if leg["line"] in _INFREQUENT_LINES), None)
    if k is None:
        return None
    target = legs[k]["to"]
    board = legs[k]["from"]
    j = k
    while j > 0 and _through_train(legs[j - 1]["from"], target):
        j -= 1
        board = legs[j]["from"]

    now = now or datetime.now(IST)
    now_min = now.hour * 60 + now.minute
    calls = []
    for train in _SCHEDULE:
        names = [name for name, _, _ in train["times"]]
        if board in names and target in names and names.index(board) < names.index(target):
            _, minute, approx = train["times"][names.index(board)]
            calls.append((minute, train["destination"], approx))
    if not calls:
        return None
    calls.sort()
    upcoming = [{"time": _clock(m), "destination": d, "approx": a} for m, d, a in calls if m >= now_min][:limit]
    return {
        "board_at": board,
        "towards": target,
        "trains": upcoming,
        "first": _clock(calls[0][0]),
        "last": _clock(calls[-1][0]),
        "source": SOURCE,
    }


def stay_on_train(legs: List[Dict]) -> List[bool]:
    """For each change of line: True if a through train continues onto the next line (no change of train)."""
    return [_through_train(first["from"], second["to"]) for first, second in zip(legs, legs[1:])]
