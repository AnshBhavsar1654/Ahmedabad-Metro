import os
from typing import Any, Dict, List, Optional

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import PlainTextResponse
from geopy.distance import geodesic
from pydantic import BaseModel, Field

from chat import ask_gemini
from route import calculate_route_details, get_all_stations


load_dotenv()

app = FastAPI(title="Ahmedabad Metro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ahmedabad-metro-frontend.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

FARE_PATH = os.path.join(os.path.dirname(__file__), "Fare Matrix.xlsx")
STATIONS_PATH = os.path.join(os.path.dirname(__file__), "Location.xlsx")

fare_matrix = pd.read_excel(FARE_PATH)
stations_df = pd.read_excel(STATIONS_PATH)

source_col = "Source"
dest_col = "Destination"
fare_col = "Fare"


class RouteRequest(BaseModel):
    source: str = ""
    destination: str = ""


class ChatRequest(BaseModel):
    message: str = ""
    history: List[Dict[str, Any]] = Field(default_factory=list)


def error_response(message: str, status_code: int = 400):
    return JSONResponse(status_code=status_code, content={"error": message})


@app.get("/")
def home():
    return PlainTextResponse("Backend is running!")


@app.get("/api/stations")
def get_stations():
    try:
        return get_all_stations()
    except Exception as exc:
        return error_response(str(exc), 500)


@app.get("/api/stations/coordinates")
def get_stations_with_coordinates():
    """Returns all stations with their coordinates for mapping"""
    try:
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
    except Exception as exc:
        return error_response(str(exc), 500)


@app.post("/api/route")
def get_route(data: RouteRequest):
    source = data.source.strip()
    destination = data.destination.strip()

    if not source or not destination:
        return error_response("Missing source or destination", 400)

    result = calculate_route_details(source, destination)

    if result["error"]:
        return error_response(result["error"], 400)

    return {
        "route": result["route"],
        "interchanges": result["interchanges"],
        "distance": result["distance"],
        "instructions": result["instructions"],
    }


@app.post("/api/fare")
def get_fare(data: RouteRequest):
    source = data.source.strip()
    destination = data.destination.strip()
    if not source or not destination:
        return error_response("Missing source or destination", 400)

    try:
        matching_fare = fare_matrix[(fare_matrix[source_col] == source) & (fare_matrix[dest_col] == destination)]
        fare_value = int(matching_fare[fare_col].iloc[0]) if len(matching_fare) > 0 else 0
        return {"fare": fare_value}
    except Exception as exc:
        return error_response(f"Fare calculation failed: {str(exc)}", 400)


@app.get("/api/stations/nearby")
def get_nearby_stations(lat: Optional[float] = Query(default=None), lng: Optional[float] = Query(default=None)):
    try:
        user_lat = lat
        user_lng = lng
        if None in [user_lat, user_lng]:
            return error_response("Missing latitude/longitude parameters", 400)
        if not (-90 <= user_lat <= 90) or not (-180 <= user_lng <= 180):
            return error_response("Invalid coordinates", 400)

        stations = []
        for _, row in stations_df.iterrows():
            station_coords = (row["Latitude"], row["Longitude"])
            user_coords = (user_lat, user_lng)
            distance = geodesic(user_coords, station_coords).kilometers

            stations.append(
                {
                    "name": row["Station"],
                    "latitude": row["Latitude"],
                    "longitude": row["Longitude"],
                    "distance": round(distance, 2),
                }
            )

        nearest_stations = sorted(stations, key=lambda x: x["distance"])[:3]
        return nearest_stations
    except Exception:
        return error_response("Failed to find nearby stations", 500)


@app.post("/api/chat")
def chat(data: ChatRequest):
    try:
        message = (data.message or "").strip()
        if not message:
            return error_response("Missing message", 400)

        conversation_history = data.history if isinstance(data.history, list) else []

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return error_response("GEMINI_API_KEY is not configured on the server", 500)

        model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        reply, language = ask_gemini(message, api_key=api_key, conversation_history=conversation_history, model=model)
        return {"response": reply, "language": language}
    except Exception as exc:
        return error_response(f"Chat request failed: {str(exc)}", 500)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)