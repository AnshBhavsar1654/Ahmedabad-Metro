# Run with: pip install pytest httpx && pytest   (from the backend/ folder)
import pytest
from fastapi.testclient import TestClient

from app import app
from route import calculate_route_details, get_all_stations, get_fare

client = TestClient(app)


def test_all_stations_are_routable():
    stations = get_all_stations()
    assert len(stations) == 54
    assert all(calculate_route_details(stations[0], s)["error"] is None for s in stations[1:])


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
    assert client.post("/api/chat", json={"message": "  "}).status_code == 400
    assert client.post("/api/chat", json={"message": "x" * 1001}).status_code == 400


def test_health_route():
    assert client.get("/health").json() == {"status": "ok"}


def test_keepalive_disabled_without_url(monkeypatch):
    from keepalive import start_keepalive

    monkeypatch.delenv("RENDER_EXTERNAL_URL", raising=False)
    monkeypatch.delenv("KEEPALIVE_URL", raising=False)
    start_keepalive()()  # returns a no-op stop function and starts no thread
