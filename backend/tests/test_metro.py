# Run with: pip install pytest httpx && pytest   (from the backend/ folder)
import pytest
from fastapi.testclient import TestClient

from app import app
from metro.network import calculate_route_details, get_all_stations, get_fare

client = TestClient(app)


def test_all_stations_are_routable():
    from metro.network import station_status

    stations = get_all_stations()
    assert len(stations) == 62
    assert sum(station_status(s) == "operational" for s in stations) == 53
    usable = [s for s in stations if station_status(s) != "under construction"]
    assert all(calculate_route_details("Paldi", s)["error"] is None for s in usable if s != "Paldi")


def test_route_through_two_interchanges():
    result = calculate_route_details("APMC", "Gift City")
    assert result["interchanges"] == ["Koteshwar Road", "GNLU"]
    assert result["instructions"][0] == "Start at APMC (Take Red Line)"


def test_route_is_symmetric_and_case_insensitive():
    forward = calculate_route_details("sp stadium", "Motera Stadium")
    backward = calculate_route_details("Motera Stadium", "SP Stadium")
    assert forward["route"] == backward["route"][::-1]


def test_route_errors():
    assert calculate_route_details("APMC", "APMC")["error"]
    assert calculate_route_details("Nowhere", "APMC")["error"]


def test_fare_exists_both_ways():
    assert get_fare("Paldi", "Thaltej") == get_fare("Thaltej", "Paldi")


@pytest.mark.parametrize(
    "url",
    ["https://evil-google.com/maps", "http://127.0.0.1:5000/", "https://google.com.evil.io/x", "file:///etc/passwd"],
)
def test_maps_resolver_rejects_foreign_hosts(url):
    assert client.post("/api/location/resolve-google-maps", json={"url": url}).status_code == 400


def test_maps_resolver_reads_coordinates_from_link():
    res = client.post("/api/location/resolve-google-maps", json={"url": "https://www.google.com/maps/place/X/@23.02,72.57,15z"})
    assert res.json()["latitude"] == 23.02


def test_chat_validates_input():
    assert client.post("/api/chat/stream", json={"message": "  "}).status_code == 400
    assert client.post("/api/chat/stream", json={"message": "x" * 1001}).status_code == 400


def test_health_route():
    assert client.get("/health").json() == {"status": "ok"}


def test_keepalive_disabled_without_url(monkeypatch):
    from metro.keepalive import start_keepalive

    monkeypatch.delenv("RENDER_EXTERNAL_URL", raising=False)
    monkeypatch.delenv("KEEPALIVE_URL", raising=False)
    start_keepalive()()  # returns a no-op stop function and starts no thread


# ---------------------------------------------------------------- timetable (GMRC, w.e.f. 18 May 2026)

def test_journey_time_matches_the_timetable():
    from metro import timetable

    apmc_gift = calculate_route_details("APMC", "Gift City")
    assert abs(timetable.journey_minutes(apmc_gift["legs"]) - 57) <= 2  # 06:45 -> 07:42 in the timetable
    assert timetable.through_service(apmc_gift["legs"]) is True
    paldi_thaltej = calculate_route_details("Paldi", "Thaltej")  # Red to Blue: a real change of train
    assert timetable.through_service(paldi_thaltej["legs"]) is False


def test_departures_exact_at_timing_points_and_approx_between():
    from datetime import datetime

    from metro import timetable

    at_seven = datetime(2026, 10, 13, 7, 0, tzinfo=timetable.IST)
    up = timetable.departures("Koteshwar Road", at_seven)["directions"][0]
    assert up["trains"][0] == {"time": "07:21", "destination": "Gift City", "approx": False}
    assert up["first"] == "06:55"
    paldi = timetable.departures("Paldi", at_seven)["directions"][0]["trains"][0]
    assert paldi["approx"] is True
    assert timetable.departures("Thaltej") is None  # Blue Line: not in the timetable


def test_no_trains_left_late_at_night():
    from datetime import datetime

    from metro import timetable

    late = timetable.departures("GNLU", datetime(2026, 10, 13, 23, 30, tzinfo=timetable.IST))
    assert all(d["trains"] == [] for d in late["directions"])


def test_route_endpoint_returns_time_and_legs():
    body = client.post("/api/route", json={"source": "APMC", "destination": "Gift City"}).json()
    assert body["through_service"] is True and len(body["legs"]) == 3 and body["duration_minutes"] > 0


def test_departures_and_fare_table_endpoints():
    assert client.get("/api/departures", params={"station": "gnlu"}).json()["station"] == "GNLU"
    assert client.get("/api/departures", params={"station": "thaltej"}).json()["directions"] == []
    assert client.get("/api/departures", params={"station": "mars"}).status_code == 400
    fares = client.get("/api/fares/from", params={"station": "Paldi"}).json()
    assert len(fares) == 61 and {"station": "Thaltej", "fare": 15} in fares
    assert {"station": "Airport", "fare": None} in fares  # work in progress: no fare published yet


def test_journey_trains_only_list_trains_that_reach_the_destination():
    from datetime import datetime

    from metro import timetable

    at_seven = datetime(2026, 10, 13, 7, 0, tzinfo=timetable.IST)
    to_infocity = timetable.journey_trains(calculate_route_details("Paldi", "Infocity")["legs"], at_seven)
    assert to_infocity["board_at"] == "Paldi"  # through train from the Red Line: no change at Koteshwar Road
    assert {t["destination"] for t in to_infocity["trains"]} == {"Mahatma Mandir"}  # GIFT City trains skip Infocity
    to_gift = timetable.journey_trains(calculate_route_details("Infocity", "Gift City")["legs"], at_seven)
    assert (to_gift["board_at"], to_gift["towards"]) == ("Infocity", "GNLU")  # first train to catch; change at GNLU
    assert timetable.journey_trains(calculate_route_details("Paldi", "Thaltej")["legs"]) is None


# ---------------------------------------------------------------- visit counter

def test_visits_count_persist_and_limit_per_ip(tmp_path, monkeypatch):
    import asyncio

    from metro import visits

    monkeypatch.setattr(visits, "VISITS_FILE", str(tmp_path / "visits.json"))
    c = visits.VisitCounter()
    assert c.total == 0

    async def run():
        for _ in range(visits.MAX_VISITS_PER_IP_PER_HOUR + 3):
            await c.record("203.0.113.1")
        await c.record("203.0.113.2")

    asyncio.run(run())
    assert c.total == visits.MAX_VISITS_PER_IP_PER_HOUR + 1  # one IP can't inflate the count
    assert visits.VisitCounter().total == c.total  # survives a restart via the file


def test_visit_stream_reports_online_and_new_visits(tmp_path, monkeypatch):
    import asyncio

    from metro import visits

    monkeypatch.setattr(visits, "VISITS_FILE", str(tmp_path / "visits.json"))

    async def run():
        c = visits.VisitCounter()
        stream = c.stream()
        first = await stream.__anext__()
        assert first == {"total": 0, "online": 1}
        await c.record("198.51.100.7")
        assert await asyncio.wait_for(stream.__anext__(), 2) == {"total": 1, "online": 1}
        await stream.aclose()
        await asyncio.sleep(0)
        assert c.online == 0

    asyncio.run(run())


def test_visit_endpoints(tmp_path, monkeypatch):
    from metro import visits

    monkeypatch.setattr(visits, "VISITS_FILE", str(tmp_path / "visits.json"))  # don't touch the real count
    monkeypatch.setattr(visits.counter, "total", visits.counter.total)  # restored after the test
    before = client.get("/api/visits").json()["total"]
    after = client.post("/api/visits", headers={"x-forwarded-for": "192.0.2.44"}).json()["total"]
    assert after == before + 1


# ---------------------------------------------------------------- routing on networks with more than one route

def toy_network(lines, transfer=5):
    """lines: {line_id: [(station, minutes to next), ..., (last station, None)]}"""
    stations = {s for stops in lines.values() for s, _ in stops}
    segments = [
        {"line": lid, "from": a, "to": b, "km": 1.0, "minutes": m}
        for lid, stops in lines.items()
        for (a, m), (b, _) in zip(stops, stops[1:])
    ]
    from metro.network import Network

    return Network({
        "transfer_minutes": transfer,
        "stations": {s: {"lat": 23.0, "lon": 72.5} for s in stations},
        "lines": [{"id": lid, "name": f"{lid.title()} Line", "stations": [s for s, _ in stops]} for lid, stops in lines.items()],
        "segments": segments,
        "fares": {},
    })


def test_quickest_route_wins_and_alternatives_are_offered():
    # A loop: A-B-C-D on the x line (6 min) or A-E-D on the y line (10 min).
    net = toy_network({"x": [("A", 2), ("B", 2), ("C", 2), ("D", None)], "y": [("A", 5), ("E", 5), ("D", None)]})
    routes = net.find_routes("A", "D")
    assert [r["route"] for r in routes] == [["A", "B", "C", "D"], ["A", "E", "D"]]
    assert [r["minutes"] for r in routes] == [6, 10]


def test_changing_lines_costs_time():
    # Two stops and a change of line (1 + 5 + 1 = 7 min) loses to a direct ride of 6 min, though it has fewer stations.
    net = toy_network({"x": [("A", 1), ("C", None)], "y": [("C", 1), ("D", None)], "z": [("A", 3), ("F", 3), ("D", None)]})
    best = net.find_routes("A", "D")[0]
    assert best["route"] == ["A", "F", "D"] and best["interchanges"] == []
    cheap_change = toy_network({"x": [("A", 1), ("C", None)], "y": [("C", 1), ("D", None)], "z": [("A", 3), ("F", 3), ("D", None)]}, transfer=1)
    assert cheap_change.find_routes("A", "D")[0]["interchanges"] == ["C"]


def test_far_slower_detours_are_not_offered():
    net = toy_network({"x": [("A", 2), ("D", None)], "y": [("A", 30), ("E", 30), ("D", None)]})
    assert len(net.find_routes("A", "D")) == 1


def test_legs_follow_line_changes():
    result = calculate_route_details("Thaltej", "Gift City")
    assert [(l["line"], l["from"], l["to"]) for l in result["legs"]] == [
        ("Blue Line", "Thaltej", "Old High Court"),
        ("Red Line", "Old High Court", "Koteshwar Road"),
        ("Yellow Line", "Koteshwar Road", "GNLU"),
        ("Violet Line", "GNLU", "Gift City"),
    ]
    assert result["interchanges"] == ["Old High Court", "Koteshwar Road", "GNLU"]
    assert result["alternatives"] == []  # today's network has one route between any two stations


def test_fares_are_the_same_both_ways_for_every_pair():
    from metro.network import is_operational

    stations = [s for s in get_all_stations() if is_operational(s)]
    assert all(get_fare(a, b) == get_fare(b, a) is not None for a in stations for b in stations)
    assert get_fare("Sector-16", "Gift City") == 20  # the sheet disagrees with itself here; see scripts/build_network.py


def test_network_json_matches_the_excel_sheets():
    pytest.importorskip("pandas")
    import json

    from scripts import build_network

    built, _ = build_network.build()
    with open(build_network.os.path.join(build_network.DATA_DIR, "network.json"), encoding="utf-8") as f:
        assert json.load(f) == json.loads(json.dumps(built)), "network.json is stale: run python scripts/build_network.py"


def test_interchanges_agree_between_excel_network_and_knowledge_base():
    import re

    from metro import DATA_DIR

    from metro.network import NETWORK

    from_network = {s: set(lines) for s, lines in NETWORK.station_lines.items() if len(lines) > 1}
    with open(DATA_DIR / "metro_kb.txt", encoding="utf-8") as f:
        section = f.read().split("Line Interchanges")[1].split("\n\n")[0]
    names = {"Red Line": "red", "Blue Line": "blue", "Yellow Line": "yellow", "Violet Line": "violet"}
    names.update({"Pink Line": "pink", "Light Blue Line": "lightblue"})
    from_kb = {
        station: {names[line] for line in re.split(r", | and ", lines)}
        for station, lines in re.findall(r"- (.+?) station \((.+?)\)", section)
    }
    assert from_network == from_kb == {
        "Old High Court": {"red", "blue"},
        "Koteshwar Road": {"red", "yellow", "pink"},
        "GNLU": {"yellow", "violet"},
        "Gift City": {"violet", "lightblue"},
    }


def test_nearby_stations_work_without_the_routing_service(monkeypatch):
    import requests

    from metro import locations

    def offline(*args, **kwargs):
        raise requests.ConnectionError("no network")

    monkeypatch.setattr(locations.requests, "get", offline)
    nearest = locations.get_nearby_stations_data(23.0185, 72.5624)  # at Paldi
    assert [s["name"] for s in nearest][0] == "Paldi" and len(nearest) == 3
    assert all(s["distance_type"] == "straight" and s["path"] is None for s in nearest)


def test_nearby_stations_fall_back_from_walking_to_driving_routes(monkeypatch):
    import requests

    from metro import locations

    class Reply:
        def __init__(self, data):
            self.data = data

        def raise_for_status(self):
            pass

        def json(self):
            return self.data

    def fake_get(url, params=None, **kwargs):
        if "routed-foot" in url:
            raise requests.ConnectionError("walking service down")
        if "/table/" in url:
            n = len(url.rsplit("/", 1)[1].split(";")) - 1
            return Reply({"distances": [[0, *[1000.0 * (i + 1) for i in range(n)]]], "durations": [[0, *[60.0] * n]]})
        return Reply({"routes": [{"geometry": {"coordinates": [[72.56, 23.02], [72.57, 23.03]]}}]})

    monkeypatch.setattr(locations.requests, "get", fake_get)
    nearest = locations.get_nearby_stations_data(23.0185, 72.5624)
    assert [s["distance_type"] for s in nearest] == ["road"] * 3 and nearest[0]["walk_minutes"] is None
    assert nearest[0]["path"][0] == [23.0185, 72.5624] and len(nearest[0]["path"]) == 4



# ---------------------------------------------------------------- stations that aren't open

def test_sabarmati_is_work_in_progress_and_trips_through_it_are_not_flagged():
    to_sabarmati = client.post("/api/route", json={"source": "Paldi", "destination": "Sabarmati"}).json()
    assert to_sabarmati["route"][-1] == "Sabarmati" and to_sabarmati["not_operational"] == {"Sabarmati": "work in progress"}
    assert client.post("/api/fare", json={"source": "Sabarmati", "destination": "Paldi"}).json() == {"fare": None}
    through = calculate_route_details("AEC", "Motera Stadium")
    assert "Sabarmati" in through["route"] and through["not_operational"] == {}  # trains just pass through
    assert client.get("/api/departures", params={"station": "Sabarmati"}).json()["directions"] == []


def test_work_in_progress_stations_route_but_have_no_fare():
    body = client.post("/api/route", json={"source": "Paldi", "destination": "Airport"}).json()
    assert body["route"][-1] == "Airport" and "Koteshwar Road" in body["route"]
    assert body["not_operational"]["Airport"] == "work in progress"
    assert client.post("/api/fare", json={"source": "Paldi", "destination": "Airport"}).json() == {"fare": None}
    gift = calculate_route_details("GNLU", "Shahpur (Gandhinagar)")
    assert [leg["line"] for leg in gift["legs"]] == ["Violet Line", "Light Blue Line"]
    lines = {l["id"]: l["status"] for l in client.get("/api/lines").json()}
    assert lines["pink"] == lines["lightblue"] == "work in progress" and lines["red"] == "operational"


def test_nearest_stations_only_list_open_stations(monkeypatch):
    import requests

    from metro import locations

    monkeypatch.setattr(locations.requests, "get", lambda *a, **k: (_ for _ in ()).throw(requests.ConnectionError()))
    near_sabarmati = [s["name"] for s in locations.get_nearby_stations_data(23.08563, 72.592206)]
    near_airport = [s["name"] for s in locations.get_nearby_stations_data(23.07188, 72.61976)]
    assert "Sabarmati" not in near_sabarmati and "Airport" not in near_airport


def test_frontend_network_matches_the_backend():
    """frontend/src/lib/network.js keeps its own copy of line order and station status for the diagram."""
    import os
    import re

    from metro.network import NETWORK, station_status

    path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "lib", "network.js")
    if not os.path.exists(path):
        pytest.skip("frontend not checked out")
    js = open(path, encoding="utf-8").read()
    block = js.split("export const LINE_STATIONS = {")[1].split("};")[0]
    frontend_lines = {lid: re.findall(r"'([^']+)'", body) for lid, body in re.findall(r"(\w+): \[([^\]]*)\]", block)}
    assert frontend_lines == {line["id"]: line["stations"] for line in NETWORK.lines}
    frontend_named = dict(re.findall(r"^  (\w+): '(construction|wip)',", js, re.M))
    assert {s: "under construction" for s, v in frontend_named.items() if v == "construction"} == {
        s: v for s, v in NETWORK.status.items() if v == "under construction"}
    wip = {s for s in NETWORK.coords if station_status(s) == "work in progress"}
    assert wip == set(frontend_lines["pink"][1:] + frontend_lines["lightblue"][1:]) | {s for s, v in frontend_named.items() if v == "wip"}
