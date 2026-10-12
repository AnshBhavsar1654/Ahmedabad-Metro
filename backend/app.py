import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

load_dotenv()

from chat import ChatServiceError, ask_gemini  # noqa: E402  (needs env loaded first)
from keepalive import start_keepalive  # noqa: E402
from location_service import get_nearby_stations_data, get_stations_with_coordinates, resolve_google_maps_location_data  # noqa: E402
from route import calculate_route_details, get_all_stations, get_fare, resolve_station  # noqa: E402

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
    }


@app.post("/api/fare")
def calculate_fare(data: RouteRequest):
    source, destination = resolve_station(data.source), resolve_station(data.destination)
    if not source or not destination:
        return error_response("Unknown source or destination station")
    return {"fare": get_fare(source, destination)}


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
}


@app.post("/api/chat")
def chat(data: ChatRequest):
    message = data.message.strip()
    if not message:
        return error_response("Missing message")
    if len(message) > MAX_CHAT_MESSAGE_CHARS:
        return error_response(f"Message is too long (limit {MAX_CHAT_MESSAGE_CHARS} characters)")

    try:
        reply = ask_gemini(message, api_key=os.getenv("GEMINI_API_KEY", ""), conversation_history=data.history)
        return {"response": reply}
    except ChatServiceError as exc:
        print(f"[ERROR /api/chat] {exc.kind}: {exc}")
        status = 429 if exc.kind == "rate_limit" else 503
        return JSONResponse(status_code=status, content={"error": CHAT_ERROR_MESSAGES[exc.kind]})
    except Exception as exc:
        print(f"[ERROR /api/chat] {exc}")
        return JSONResponse(status_code=500, content={"error": CHAT_ERROR_MESSAGES["unavailable"]})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
