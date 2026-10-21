"""Tools the agent can call, so fares, routes, timetables, station details and policies come from the app's data.

Every tool returns a dict and never raises: problems go back to the model as {"error": ...} so it can tell the rider.
"""
import functools
import json
from typing import Any, Callable, Dict, List

from langchain_core.tools import BaseTool, tool

from chatbot import knowledge
from chatbot.rules import find_stations
from metro import DATA_DIR, timetable
from metro.network import LINE_NAMES, LINES, calculate_route_details, get_fare, station_status


def _safe(fn: Callable[..., Dict[str, Any]]) -> Callable[..., Dict[str, Any]]:
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # a data bug must not kill the answer
            print(f"[tools] {fn.__name__} failed: {exc}")
            return {"error": "The lookup failed. Tell the rider to use /routes."}

    return wrapper


def _resolve(name: str) -> List[str]:
    return find_stations(str(name or ""))


@tool(parse_docstring=True)
@_safe
def get_journey(from_station: str, to_station: str) -> Dict[str, Any]:
    """Official fare (in rupees), route, line changes, distance and estimated travel time between two metro stations.

    Use for any fare, route, 'how do I get to', 'how long' or 'how many stations' question.

    Args:
        from_station: Starting station, as the rider wrote it (any language).
        to_station: Destination station, as the rider wrote it (any language).
    """
    src, dst = _resolve(from_station), _resolve(to_station)
    if not src:
        return {"error": f"No station matches '{from_station}'. Ask the rider which station they mean."}
    if not dst:
        return {"error": f"No station matches '{to_station}'. Ask the rider which station they mean."}
    a, b = src[0], dst[0]
    result = calculate_route_details(a, b)
    if result["error"]:
        return {"error": result["error"]}
    fare = get_fare(a, b)
    closed = result["not_operational"]
    return {
        "from": a,
        "to": b,
        "fare_rupees": fare if fare is not None else ("not published yet (work in progress)" if closed else "not listed"),
        "stations_not_open": closed or None,  # under construction: trains pass; work in progress: not running yet
        "distance_km": result["distance"],
        "stations_count": len(result["route"]),
        "interchanges": result["interchanges"],
        "legs": result["legs"],
        "estimated_minutes": timetable.journey_minutes(result["legs"]),
        "no_change_of_train_needed": timetable.through_service(result["legs"]),
    }


@tool(parse_docstring=True)
@_safe
def get_line_stations(line: str) -> Dict[str, Any]:
    """All stations on one metro line, in order.

    Args:
        line: Red, Blue, Yellow, Violet, Pink or Light Blue.
    """
    wanted = str(line or "").lower().replace("purple", "violet")
    # Longest names first, so "light blue" isn't taken for "blue".
    for name, stops in sorted(zip(LINE_NAMES, LINES), key=lambda pair: -len(pair[0])):
        if name.lower().removesuffix(" line") in wanted:
            return {"line": name, "stations_in_order": stops}
    return {"error": f"Unknown line '{line}'. Lines are: {', '.join(LINE_NAMES)}."}


# Gates, lifts and elevated/underground per station: the same file the website's /stations-info page shows.
_GATES_PATH = DATA_DIR.parent.parent / "frontend" / "src" / "data" / "stationData.json"


@functools.cache
def gate_data() -> Dict[str, Dict[str, Any]]:
    gates: Dict[str, Dict[str, Any]] = {}
    try:
        with open(_GATES_PATH, encoding="utf-8") as f:
            for entry in json.load(f):
                found = find_stations(entry["name"])  # "Old High Court (Interchange)", "Gheekanta"...
                if found:
                    gates[found[0]] = entry
    except (OSError, ValueError) as exc:
        print(f"[tools] station gate data unavailable: {exc}")
    return gates


@tool(parse_docstring=True)
@_safe
def get_station_info(station: str) -> Dict[str, Any]:
    """A station's lines, whether it is an interchange, whether it is open, elevated or underground, its entry/exit gates and where its lifts are.

    Args:
        station: Station name, as the rider wrote it (any language).
    """
    found = _resolve(station)
    if not found:
        return {"error": f"No station matches '{station}'."}
    name = found[0]
    lines = [line for line, stops in zip(LINE_NAMES, LINES) if name in stops]
    info: Dict[str, Any] = {"station": name, "status": station_status(name), "lines": lines, "is_interchange": len(lines) > 1}
    gates = gate_data().get(name)
    if gates:
        info.update(type=gates["type"], entry_exit_gates=gates["gates"], lifts=gates["facilities"])
    return info


@tool(parse_docstring=True)
@_safe
def get_next_trains(station: str) -> Dict[str, Any]:
    """Next timetabled trains from a station in each direction, plus the first and last train of the day.

    Covers stations on the APMC to Mahatma Mandir / GIFT City trains. Use for 'when is the next train',
    'first train' or 'last train' questions.

    Args:
        station: Station name, as the rider wrote it (any language).
    """
    found = _resolve(station)
    if not found:
        return {"error": f"No station matches '{station}'."}
    if station_status(found[0]) != "operational":
        return {"station": found[0], "status": station_status(found[0]),
                "note": "No trains stop here yet (under construction: trains pass without stopping; work in progress: line not running)."}
    result = timetable.departures(found[0])
    if result is None:
        return {"station": found[0], "note": "This station is not in the published timetable (it covers the APMC to "
                "Mahatma Mandir / GIFT City trains). Use the train frequency in the knowledge base."}
    return {**result, "note": "Times marked approx are interpolated between timetable points. An empty list means no "
            "more trains today; 'first' and 'last' are the day's first and last trains."}


@tool(parse_docstring=True)
@_safe
def search_knowledge_base(query: str) -> Dict[str, Any]:
    """Search the official Ahmedabad Metro knowledge base: tickets, passes, concessions, smart card, NCMC, refunds, penalties, timings, frequency, luggage, facilities, safety, lost and found, contacts.

    Use whenever the knowledge base excerpts in the rider's message don't answer the question.

    Args:
        query: A few English keywords, even if the rider wrote in Gujarati or Hindi (e.g. "student pass concession").
    """
    found = knowledge.search(query)
    if not found:
        return {"result": "Nothing in the knowledge base matches. Say you don't have that information."}
    return {"sections": [s.text() for s in found]}


TOOLS: List[BaseTool] = [get_journey, get_line_stations, get_station_info, get_next_trains, search_knowledge_base]
