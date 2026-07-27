import difflib
import json
import os
import re
import traceback
from typing import Any, List, Tuple

import pandas as pd
from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

from location_service import get_nearby_stations_data
from route import calculate_route_details, get_all_stations

load_dotenv()

FARE_PATH = os.path.join(os.path.dirname(__file__), "Fare Matrix.xlsx")
fare_matrix = pd.read_excel(FARE_PATH)

_KB_TEXT = None
_STATION_CATALOG_PROMPT = None
_SYSTEM_PROMPT = None

DEFAULT_GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]
DEFAULT_TEMPERATURE = 0.2
DEFAULT_MAX_OUTPUT_TOKENS = 768


def _read_kb_text() -> str:
    global _KB_TEXT
    if _KB_TEXT is not None:
        return _KB_TEXT

    base_dir = os.path.dirname(__file__)
    for name in ("metro_kb.txt", "Metro_KB.txt"):
        path = os.path.join(base_dir, name)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                _KB_TEXT = f.read()
                return _KB_TEXT
    raise FileNotFoundError("Knowledge base file metro_kb.txt not found in backend/.")


def _match_station(name: str, valid_stations: List[str]) -> str:
    matches = difflib.get_close_matches(name, valid_stations, n=1, cutoff=0.5)
    return matches[0] if matches else name


def _normalize_station_name(name: str) -> str:
    cleaned = (name or "").strip()
    return _match_station(cleaned, get_all_stations()) if cleaned else ""


def _fare_for_stations(source: str, destination: str) -> int:
    if not source or not destination:
        return 0
    m = fare_matrix[(fare_matrix["Source"] == source) & (fare_matrix["Destination"] == destination)]
    if len(m) == 0:
        m = fare_matrix[(fare_matrix["Source"] == destination) & (fare_matrix["Destination"] == source)]
        if len(m) == 0:
            return 0
    return int(m["Fare"].iloc[0])


def _search_kb(query: str) -> str:
    kb_text = _read_kb_text()
    sections = re.split(r"\n(?==== SECTION)", kb_text)
    words = [w.lower() for w in re.findall(r"\w+", query) if len(w) > 2]
    if not words:
        return kb_text[:1500]
    scores = []
    for sec in sections:
        sec_lower = sec.lower()
        score = sum(sec_lower.count(w) for w in words)
        scores.append((score, sec.strip()))
    scores.sort(key=lambda x: x[0], reverse=True)
    results = [s[1] for s in scores if s[0] > 0][:3]
    return "\n\n".join(results) if results else kb_text[:1500]


def _convert_history(conversation_history: List[dict]) -> List[Any]:
    messages: List[Any] = []
    for msg in (conversation_history or [])[-6:]:
        role = str(msg.get("role", "")).lower()
        text = str(msg.get("text", "")).strip()
        if not text:
            continue
        if role == "assistant":
            messages.append(AIMessage(content=text))
        else:
            messages.append(HumanMessage(content=text))
    return messages


def _build_station_catalog_prompt() -> str:
    global _STATION_CATALOG_PROMPT
    if _STATION_CATALOG_PROMPT is None:
        _STATION_CATALOG_PROMPT = "\n".join(f"- {s}" for s in get_all_stations())
    return _STATION_CATALOG_PROMPT


def _build_system_prompt() -> str:
    global _SYSTEM_PROMPT
    if _SYSTEM_PROMPT is None:
        catalog = _build_station_catalog_prompt()
        _SYSTEM_PROMPT = f"""You are Ahmedabad Metro Assistant.

Instructions:
- For simple greetings (e.g. "hello", "hi", "hey", "namaste") or general conversational remarks, respond warmly and directly. DO NOT call any tool for greetings.
- If the user's message is about nearest stations, nearby stations, finding stations close to their location, or similar, DO NOT use any tools. Instead, reply that they should visit the nearest stations page and provide a clickable HTML link for it: <a href="/nearest-stations">Nearest Stations</a>.
- Call tools ONLY when the user asks a specific question requiring data:
  - metro_route: route, distance, directions, or trip planning between two stations.
  - metro_fare: fare between two stations.
  - metro_kb_search: metro info, hours, tickets, smart cards, NCMC, lost & found, rules, penalties, emergency contacts.

Response rules:
- Respond in the user's language (English/Gujarati/Hindi).
- Never invent routes or fares; call matching tools when requested.
- Infer exact station names from the catalog below.
- Do not output raw JSON or tool signatures to the user.

Station catalog:
{catalog}
"""
    return _SYSTEM_PROMPT


def _build_tools():
    @tool("metro_route")
    def metro_route(source: str, destination: str) -> str:
        """Get metro route, interchanges, distance and instructions between two stations."""
        src = _normalize_station_name(source)
        dst = _normalize_station_name(destination)
        if not src or not dst:
            return "Please provide both source and destination stations."

        res = calculate_route_details(src, dst)
        if res.get("error"):
            return f"Route lookup failed: {res['error']}"

        fare = _fare_for_stations(src, dst)
        lines = [
            f"Route from {src} to {dst}:",
            f"Fare: ₹{fare}",
            f"Distance: {res['distance']} km",
        ]
        if res.get("interchanges"):
            lines.append(f"Interchanges: {', '.join(res['interchanges'])}")
        if res.get("instructions"):
            lines.append("Steps:")
            lines.extend(f"{i + 1}. {step}" for i, step in enumerate(res["instructions"]))
        return "\n".join(lines)

    @tool("metro_fare")
    def metro_fare(source: str, destination: str) -> str:
        """Calculate metro fare between two stations."""
        src = _normalize_station_name(source)
        dst = _normalize_station_name(destination)
        if not src or not dst:
            return "Please provide both source and destination stations."
        fare = _fare_for_stations(src, dst)
        return f"Fare from {src} to {dst}: ₹{fare}"

    @tool("metro_kb_search")
    def metro_kb_search(query: str) -> str:
        """Retrieve relevant metro knowledge base passages for general or factual queries."""
        try:
            return _search_kb(query)
        except Exception as exc:
            return f"KB lookup failed: {exc}"

    return [metro_route, metro_fare, metro_kb_search]


def _content_to_text(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            txt = _content_to_text(item)
            if txt:
                parts.append(txt)
        return "\n".join(parts).strip()
    if isinstance(content, dict):
        for k in ("text", "content", "value", "message"):
            if k in content and content[k]:
                return _content_to_text(content[k])
        return json.dumps(content, ensure_ascii=False)
    return str(content).strip()


def ask_gemini(user_message: str, api_key: str, conversation_history: List[dict] = None, model: str = None) -> Tuple[str, str]:
    """Answer a metro query using Gemini LLM with function calling tools."""
    if not api_key:
        return ("The chatbot is currently unavailable. Please check API key configuration.", "auto")

    os.environ["GOOGLE_API_KEY"] = api_key
    os.environ["GEMINI_API_KEY"] = api_key

    tools = _build_tools()
    tool_map = {t.name: t for t in tools}

    requested_model = model or os.getenv("GEMINI_MODEL") or "gemini-2.5-flash-lite"
    models_to_try = [requested_model]
    for m in DEFAULT_GEMINI_MODELS:
        if m not in models_to_try:
            models_to_try.append(m)

    last_exception = None
    for model_name in models_to_try:
        try:
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                api_key=api_key,
                temperature=DEFAULT_TEMPERATURE,
                max_output_tokens=DEFAULT_MAX_OUTPUT_TOKENS,
            )
            llm_with_tools = llm.bind_tools(tools)

            messages = [SystemMessage(content=_build_system_prompt())]
            messages.extend(_convert_history(conversation_history or []))
            messages.append(HumanMessage(content=user_message))

            for _ in range(3):
                response = llm_with_tools.invoke(messages)
                messages.append(response)

                tool_calls = getattr(response, "tool_calls", None)
                if not tool_calls:
                    break

                for tc in tool_calls:
                    t_name = tc.get("name")
                    t_args = tc.get("args", {})
                    t_id = tc.get("id", "")
                    selected_tool = tool_map.get(t_name)
                    if selected_tool:
                        t_output = str(selected_tool.invoke(t_args))
                    else:
                        t_output = f"Tool {t_name} not found."
                    messages.append(ToolMessage(content=t_output, tool_call_id=t_id))

            reply = _content_to_text(messages[-1].content)
            if reply:
                return (reply, "auto")
        except Exception as exc:
            last_exception = exc
            err_str = str(exc)
            if "API_KEY_INVALID" in err_str or "API key not valid" in err_str or "400" in err_str and "key" in err_str.lower():
                raise RuntimeError("Invalid Gemini API key provided.") from exc
            continue

    if last_exception:
        err_text = str(last_exception)
        print(f"[ERROR ask_gemini] All models failed. Last exception: {err_text}")
        traceback.print_exc()
        if "429" in err_text or "RESOURCE_EXHAUSTED" in err_text or "quota" in err_text.lower():
            raise RuntimeError("Rate limit exceeded.") from last_exception
        raise RuntimeError(f"Chatbot service error: {err_text}") from last_exception

    return ("Sorry, I couldn't generate a response right now.", "auto")