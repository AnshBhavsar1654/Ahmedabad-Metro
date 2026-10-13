import json
import os
import time
from collections import deque
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

from chatbot.assistant import ChatServiceError, answer, answer_stream  # noqa: E402  (needs env loaded first)
from metro.keepalive import start_keepalive  # noqa: E402
from metro.locations import get_nearby_stations_data, get_stations_with_coordinates, resolve_google_maps_location_data  # noqa: E402
from metro.network import (  # noqa: E402
    calculate_route_details, get_all_stations, get_fare, get_line_geometries, is_operational, resolve_station, station_status,
)
from metro.visits import counter as visit_counter  # noqa: E402
from metro.timetable import departures, journey_minutes, journey_trains, stay_on_train, through_service  # noqa: E402

MAX_CHAT_MESSAGE_CHARS = 1000

@asynccontextmanager
async def lifespan(_app: FastAPI):
    stop_keepalive = start_keepalive()
    yield
    stop_keepalive()


app = FastAPI(title="Ahmedabad Metro API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ahmedabad-metro-frontend.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class RouteRequest(BaseModel):
    source: str = ""
    destination: str = ""


class ChatRequest(BaseModel):
    message: str = ""
    history: List[Dict[str, Any]] = Field(default_factory=list)


class GoogleMapsLinkRequest(BaseModel):
    url: str = ""


def error_response(message: str, status_code: int = 400):
    return JSONResponse(status_code=status_code, content={"error": message})


@app.get("/")
def home():
    return PlainTextResponse("Backend is running!")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/stations")
def list_stations():
    return get_all_stations()


@app.get("/api/lines")
def list_lines():
    """Each line with its stations and track geometry ([lat, lng] points, first station to last)."""
    return get_line_geometries()


@app.get("/api/stations/coordinates")
def list_station_coordinates():
    return get_stations_with_coordinates()


@app.post("/api/route")
def get_route(data: RouteRequest):
    if not data.source.strip() or not data.destination.strip():
        return error_response("Missing source or destination")

    result = calculate_route_details(data.source, data.destination)
    if result["error"]:
        return error_response(result["error"])

    return {
        "route": result["route"],
        "interchanges": result["interchanges"],
        "distance": result["distance"],
        "instructions": result["instructions"],
        "geometry": result["geometry"],  # along the track, for drawing the journey
        "legs": [
            {**leg, "stay_on_train": stay} for leg, stay in zip(result["legs"], [*stay_on_train(result["legs"]), False])
        ],
        "duration_minutes": journey_minutes(result["legs"]),
        "through_service": through_service(result["legs"]),
        "next_trains": journey_trains(result["legs"]),
        # Stations on the route that aren't open yet, with their status (the planner flags them; no fare then).
        "not_operational": result["not_operational"],
        # Other reasonable routes when the network offers more than one (quickest first). Same fare: GMRC
        # charges by origin and destination.
        "alternatives": [
            {
                "route": alt["route"],
                "legs": alt["legs"],
                "interchanges": alt["interchanges"],
                "distance": alt["distance"],
                "duration_minutes": journey_minutes(alt["legs"]),
            }
            for alt in result.get("alternatives", [])
        ],
    }


@app.post("/api/fare")
def calculate_fare(data: RouteRequest):
    source, destination = resolve_station(data.source), resolve_station(data.destination)
    if not source or not destination:
        return error_response("Unknown source or destination station")
    for name in (source, destination):
        if station_status(name) == "under construction":
            return error_response(f"{name} station is under construction and not open yet")
    return {"fare": get_fare(source, destination)}  # None when a station is work in progress


@app.get("/api/fares/from")
def fares_from(station: str = ""):
    """Fare from one station to every other station, for the station panel's fare table."""
    source = resolve_station(station)
    if not source:
        return error_response("Unknown station")
    if not is_operational(source):
        return []
    return [{"station": s, "fare": get_fare(source, s)} for s in get_all_stations() if s != source]


@app.get("/api/departures")
def station_departures(station: str = ""):
    """Next timetabled trains from a station. `directions` is empty for stations the timetable doesn't cover."""
    name = resolve_station(station)
    if not name:
        return error_response("Unknown station")
    if not is_operational(name):  # trains pass Sabarmati without stopping; new lines aren't running yet
        return {"station": name, "status": station_status(name), "directions": [], "source": None}
    return departures(name) or {"station": name, "status": "operational", "directions": [], "source": None}


@app.get("/api/visits")
def visits_now():
    return visit_counter.snapshot()


@app.post("/api/visits")
async def record_visit(request: Request):
    """The browser calls this once per day; the footer then follows /api/visits/stream."""
    return await visit_counter.record(_client_ip(request))


@app.get("/api/visits/stream")
async def visits_stream():
    """Server-sent events: {"total", "online"} now and after every change, with a heartbeat comment between."""

    async def body():
        async for event in visit_counter.stream():
            yield _sse(event) if event else ": ping\n\n"

    return StreamingResponse(body(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/stations/nearby")
def get_nearby_stations(lat: Optional[float] = None, lng: Optional[float] = None):
    try:
        return get_nearby_stations_data(lat, lng)
    except ValueError as exc:
        return error_response(str(exc))
    except Exception as exc:
        print(f"[ERROR /api/stations/nearby] {exc}")
        return error_response("Failed to find nearby stations", 500)


@app.post("/api/location/resolve-google-maps")
def resolve_google_maps_location(data: GoogleMapsLinkRequest):
    try:
        return resolve_google_maps_location_data(data.url)
    except ValueError as exc:
        return error_response(str(exc))
    except Exception as exc:
        print(f"[ERROR /api/location/resolve-google-maps] {exc}")
        return error_response("Failed to resolve Google Maps link", 500)


CHAT_ERROR_MESSAGES = {
    "config": "The assistant isn't set up correctly right now. Please try again later.",
    "rate_limit": "The assistant is getting a lot of questions right now. Please try again in a minute.",
    "unavailable": "The assistant is unavailable right now. Please try again shortly.",
    "too_many": "You're sending messages very quickly. Please wait a moment and try again.",
}

# Per-client limit, so one script or stuck client can't use up the model quota for everyone.
CHAT_LIMIT_PER_MINUTE = int(os.getenv("CHAT_LIMIT_PER_MINUTE", "20"))
_recent: Dict[str, deque] = {}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")  # Render and Vercel put the real client first
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def _over_limit(ip: str) -> bool:
    now = time.monotonic()
    if len(_recent) > 5000:  # forget idle clients
        for key in [k for k, q in _recent.items() if not q or now - q[-1] > 60]:
            del _recent[key]
    times = _recent.setdefault(ip, deque())
    while times and now - times[0] > 60:
        times.popleft()
    if len(times) >= CHAT_LIMIT_PER_MINUTE:
        return True
    times.append(now)
    return False


def _check_chat_request(data: ChatRequest, request: Request) -> Optional[JSONResponse]:
    message = data.message.strip()
    if not message:
        return error_response("Missing message")
    if len(message) > MAX_CHAT_MESSAGE_CHARS:
        return error_response(f"Message is too long (limit {MAX_CHAT_MESSAGE_CHARS} characters)")
    if _over_limit(_client_ip(request)):
        return error_response(CHAT_ERROR_MESSAGES["too_many"], 429)
    return None


def _chat_error(exc: Exception) -> JSONResponse:
    kind = exc.kind if isinstance(exc, ChatServiceError) else "unavailable"
    print(f"[ERROR /api/chat] {kind}: {exc}")
    status = {"rate_limit": 429, "config": 503, "unavailable": 503}.get(kind, 500)
    return JSONResponse(status_code=status, content={"error": CHAT_ERROR_MESSAGES[kind]})


@app.post("/api/chat")
async def chat(data: ChatRequest, request: Request):
    rejected = _check_chat_request(data, request)
    if rejected:
        return rejected
    started = time.monotonic()
    try:
        result = await answer(data.message.strip(), api_key=os.getenv("GEMINI_API_KEY", ""), history=data.history)
    except Exception as exc:
        return _chat_error(exc)
    print(f"[chat] {result['source']} in {time.monotonic() - started:.2f}s")
    return result


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@app.post("/api/chat/stream")
async def chat_stream(data: ChatRequest, request: Request):
    """Server-sent events: {"type": "delta", "text"} pieces, then {"type": "done", "source"}.

    Failures before the first piece get a normal JSON error with a status code, like /api/chat.
    """
    rejected = _check_chat_request(data, request)
    if rejected:
        return rejected

    started = time.monotonic()
    events = answer_stream(data.message.strip(), api_key=os.getenv("GEMINI_API_KEY", ""), history=data.history)
    try:
        first = await events.__anext__()
    except Exception as exc:
        return _chat_error(exc)

    async def body():
        source = first.get("source")
        try:
            yield _sse(first)
            async for event in events:
                source = event.get("source", source)
                yield _sse(event)
        finally:
            await events.aclose()
            print(f"[chat] {source or 'aborted'} streamed in {time.monotonic() - started:.2f}s "
                  f"(first piece after {first_at:.2f}s)")

    first_at = time.monotonic() - started
    return StreamingResponse(
        body(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
