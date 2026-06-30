import os
from typing import List, Tuple
import requests
import json
import difflib
import pandas as pd
from dotenv import load_dotenv

from route import calculate_route_details, get_all_stations

load_dotenv()

# Load Fare Matrix
FARE_PATH = os.path.join(os.path.dirname(__file__), "Fare Matrix.xlsx")
fare_matrix = pd.read_excel(FARE_PATH)


def _read_kb_text() -> str:
    """
    Reads metro knowledge base text. Supports both filenames to be safe on Linux deployments.
    """
    base_dir = os.path.dirname(__file__)
    candidates = [
        os.path.join(base_dir, "metro_kb.txt"),
        os.path.join(base_dir, "Metro_KB.txt"),
    ]
    for path in candidates:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    raise FileNotFoundError("Knowledge base file not found (expected metro_kb.txt or Metro_KB.txt in backend/).")


def _build_prompt(kb_text: str, user_message: str, conversation_history: List[dict] = None) -> str:
    """
    Builds a concise, high-signal prompt for metro Q&A grounded in the KB.
    Includes conversation history for context when available.
    """
    # Get prompt template from env or use default
    prompt_template = os.getenv(
        "GEMINI_PROMPT_TEMPLATE",
        """You are "Ahmedabad Metro Assistant", a helpful customer support assistant for Ahmedabad Metro.

IMPORTANT RULES:
- AUTOMATICALLY detect the language of the user's question (English, Hindi, Gujarati, or mixed languages like Hinglish/Gujarati+English).
- Respond in the SAME language(s) the user used. If they use mixed languages (e.g., "mujhe metro ka samay batao" or "mane metro no samay ko"), respond naturally in that mixed style.
- Answer based ONLY on the provided Knowledge Base content below. If the answer is not in the KB, say you don't know and suggest what the user can check next (e.g., official website / helpline), without making up facts.
- Keep responses clear and practical. Use short bullet points when helpful.
- If the user asks for route/fare between stations, ask for missing details (source/destination) instead of guessing.
- Use the conversation history below to understand follow-up questions and maintain context.{history_context}

Knowledge Base (verbatim):
\"\"\"{kb_text}\"\"\"

Current user question:
\"\"\"{user_message}\"\"\"
"""
    )
    
    history_context = ""
    if conversation_history and len(conversation_history) > 0:
        history_context = "\n\nPrevious conversation context:\n"
        for msg in conversation_history[-6:]:  # Last 6 messages for context
            role_label = "User" if msg.get("role") == "user" else "Assistant"
            history_context += f"{role_label}: {msg.get('text', '')}\n"
        history_context += "\n"
    
    return prompt_template.format(
        history_context=history_context,
        kb_text=kb_text,
        user_message=user_message
    ).strip()


def _classify_intent_and_extract(message: str, api_key: str, model: str, base_url: str) -> dict:
    prompt = f"""You are a query classifier for the Ahmedabad Metro chatbot.
Given the user's message, determine if the user is asking about the route, distance, instructions or fare between two specific stations.

Message: "{message}"

If the message is about a route or fare between two stations, extract the source and destination stations and return JSON in this exact format:
{{"intent": "route_fare", "source": "station_name", "destination": "station_name"}}

If the message is asking for general information (timings, rules, smart card, general metro info, etc.) or doesn't mention two stations, return:
{{"intent": "general"}}

Return ONLY the JSON. No markdown formatting, no backticks, no other text."""

    url = f"{base_url}/models/{model}:generateContent"
    params = {"key": api_key}
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0, "response_mime_type": "application/json"},
    }
    try:
        resp = requests.post(url, params=params, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except Exception:
        # Fail silently and fall back to general intent rather than leaking exceptions
        return {"intent": "general"}


def _match_station(name: str, valid_stations: List[str]) -> str:
    matches = difflib.get_close_matches(name, valid_stations, n=1, cutoff=0.5)
    if matches:
        return matches[0]
    return name


def _heuristically_extract_stations(message: str, valid_stations: List[str]) -> Tuple[str, str]:
    """
    Looks for valid station names inside the user message.
    Bypasses Gemini intent classification if two distinct stations are detected.
    """
    msg = message.lower()
    found_stations = []
    
    # Sort by length descending to match longer station names first
    sorted_stations = sorted(valid_stations, key=len, reverse=True)
    
    for station in sorted_stations:
        station_lower = station.lower()
        if f" {station_lower} " in f" {msg} " or msg.startswith(station_lower) or msg.endswith(station_lower):
            found_stations.append(station)
            msg = msg.replace(station_lower, "")
            
    if len(found_stations) < 2:
        # Check individual words for close fuzzy matches
        words = [w.strip("?,.!-") for w in message.split() if len(w.strip("?,.!-")) > 3]
        for word in words:
            matches = difflib.get_close_matches(word, valid_stations, n=1, cutoff=0.75)
            if matches and matches[0] not in found_stations:
                found_stations.append(matches[0])
                if len(found_stations) == 2:
                    break
                    
    if len(found_stations) >= 2:
        return found_stations[0], found_stations[1]
    return "", ""


def ask_gemini(user_message: str, api_key: str, conversation_history: List[dict] = None, model: str = None) -> Tuple[str, str]:
    """
    Sends a grounded prompt to Gemini with conversation history and returns (reply_text, language_hint).
    First checks if query intent is route/fare, and returns route details/fare directly using local logic.
    """
    if model is None:
        model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    gemini_base_url = os.getenv("GEMINI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    
    all_stations = get_all_stations()
    source_extracted, dest_extracted = _heuristically_extract_stations(user_message, all_stations)
    
    if source_extracted and dest_extracted:
        intent = "route_fare"
        classification = {"intent": "route_fare", "source": source_extracted, "destination": dest_extracted}
    else:
        # 1. Classify intent
        classification = _classify_intent_and_extract(user_message, api_key, model, gemini_base_url)
        intent = classification.get("intent", "general")
    
    if intent == "route_fare":
        source_raw = classification.get("source", "")
        dest_raw = classification.get("destination", "")
        
        source = _match_station(source_raw, all_stations)
        destination = _match_station(dest_raw, all_stations)
        
        if source and destination and source != destination:
            route_result = calculate_route_details(source, destination)
            
            fare_value = 0
            try:
                matching_fare = fare_matrix[(fare_matrix["Source"] == source) & (fare_matrix["Destination"] == destination)]
                fare_value = int(matching_fare["Fare"].iloc[0]) if len(matching_fare) > 0 else 0
            except Exception:
                pass
            
            if not route_result.get("error"):
                interchanges = route_result['interchanges']
                dist = route_result['distance']
                
                response_text = f"🚆 **Route & Fare: {source} to {destination}**\n\n"
                response_text += f"**Fare:** ₹{fare_value}\n"
                response_text += f"**Distance:** {dist} km\n\n"
                
                if interchanges:
                    response_text += f"**Interchange required at:** {', '.join(interchanges)}\n\n"
                
                response_text += "**Instructions:**\n"
                for idx, inst in enumerate(route_result['instructions'], 1):
                    response_text += f"{idx}. {inst}\n"
                    
                return (response_text, "auto")

    # 2. General Query
    temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.2"))
    top_p = float(os.getenv("GEMINI_TOP_P", "0.9"))
    max_output_tokens = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "512"))
    
    kb_text = _read_kb_text()
    prompt = _build_prompt(kb_text=kb_text, user_message=user_message, conversation_history=conversation_history or [])

    url = f"{gemini_base_url}/models/{model}:generateContent"
    params = {"key": api_key}
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "topP": top_p,
            "maxOutputTokens": max_output_tokens,
        },
    }

    try:
        resp = requests.post(url, params=params, json=payload, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as exc:
        status_code = exc.response.status_code if (exc.response is not None) else "Unknown"
        if status_code == 429:
            raise RuntimeError("The chatbot is currently experiencing high volume (Rate Limit Exceeded). Please wait a moment and try again.")
        raise RuntimeError(f"Chatbot API request failed with status code {status_code}.")

    data = resp.json()
    candidates = data.get("candidates") or []
    if not candidates:
        return ("Sorry, I couldn't generate a response right now.", "auto")

    content = (candidates[0].get("content") or {})
    parts = content.get("parts") or []
    text = parts[0].get("text") if parts else None
    if not text:
        return ("Sorry, I couldn't generate a response right now.", "auto")

    return (text.strip(), "auto")

