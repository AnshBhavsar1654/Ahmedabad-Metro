"""The LLM layer: a LangGraph tool-calling agent (LangChain `create_agent`) on Gemini, streamed, with racing models.

- Each Gemini model gets its own agent graph: model node -> tools node -> model node ... until it answers.
  The tools are in chatbot/tools.py (fares, routes, timetables, station gates, knowledge-base search).
- Models race: the first one starts at once, and each further model joins if nobody has answered within
  HEDGE_SECONDS (or as soon as a model fails). The first to say something wins; the others are cancelled.
- A model that just failed is skipped for a while (circuit breaker). If every model is cooling down they are
  all tried anyway.
"""
import asyncio
import functools
import os
import time
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

from google.genai import errors
from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessageChunk
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph.state import CompiledStateGraph

from chatbot.tools import TOOLS

# (model, thinking). Gemini 2.x takes a thinking budget in tokens (0 = off), Gemini 3 a level (minimal, low...).
# Gemini 2.5 Flash-Lite first for its free-tier limits; a Gemini 3 model only steps in if it fails or is slow.
DEFAULT_MODELS: List[Tuple[str, str]] = [
    ("gemini-2.5-flash-lite", "0"),
    ("gemini-3.5-flash-lite", "minimal"),
]
HEDGE_SECONDS = 4  # no answer yet: start the next model alongside
FIRST_CHUNK_SECONDS = 15  # per model: connect + think + tool calls until the first word
NEXT_CHUNK_SECONDS = 15
TOTAL_DEADLINE_SECONDS = 30
MAX_TOOL_ROUNDS = 3
COOLDOWN_SECONDS = {"rate_limit": 60, "soft": 45, "hard": 600}

Messages = List[Dict[str, str]]  # [{"role": "user" | "assistant", "content": ...}]


class LLMError(Exception):
    """`kind` is 'config', 'rate_limit' or 'unavailable'."""

    def __init__(self, kind: str, detail: str = ""):
        super().__init__(detail or kind)
        self.kind = kind


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default


def configured_models() -> List[Tuple[str, str]]:
    raw = os.getenv("GEMINI_MODELS", "").strip()
    if not raw:
        return DEFAULT_MODELS
    models = []
    for item in raw.split(","):
        name, _, level = item.strip().partition(":")
        if name:
            models.append((name, level or "low"))
    return models or DEFAULT_MODELS


# ---------------------------------------------------------------- the agent

def chat_model(api_key: str, model: str, level: str) -> BaseChatModel:
    """Seam for tests: the chat model behind one agent."""
    if level.isdigit():  # Gemini 2.x: a thinking budget, and a low temperature for factual answers
        settings = {"thinking_budget": int(level), "temperature": _env_float("GEMINI_TEMPERATURE", 0.2)}
    else:  # Gemini 3: a thinking level; its sampling settings are fixed
        settings = {"thinking_level": level}
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key,
        **settings,
        max_output_tokens=int(_env_float("GEMINI_MAX_OUTPUT_TOKENS", 1024)),
        timeout=TOTAL_DEADLINE_SECONDS,
        max_retries=1,  # 1 means no retries; other models race instead
    )


@functools.lru_cache(maxsize=16)
def build_agent(api_key: str, model: str, level: str, system: str) -> CompiledStateGraph:
    """One compiled graph per model, reused so connections stay open between questions."""
    return create_agent(chat_model(api_key, model, level), tools=TOOLS, system_prompt=system)


async def _with_timeout(awaitable, seconds: float):
    if seconds <= 0:
        raise asyncio.TimeoutError()
    return await asyncio.wait_for(awaitable, seconds)


async def _texts(stream, deadline: float) -> AsyncIterator[Tuple[Any, dict]]:
    """(chunk, metadata) pairs from a LangGraph or chat-model stream, each within its time limit."""
    first = True
    try:
        while True:
            limit = FIRST_CHUNK_SECONDS if first else NEXT_CHUNK_SECONDS
            try:
                item = await _with_timeout(stream.__anext__(), min(limit, deadline - time.monotonic()))
            except StopAsyncIteration:
                return
            token, meta = item if isinstance(item, tuple) else (item, {})
            if isinstance(token, AIMessageChunk) and token.text:
                first = False
            yield token, meta
    finally:
        await stream.aclose()


async def _run_agent(
    api_key: str, model: str, level: str, system: str, messages: Messages, deadline: float
) -> AsyncIterator[str]:
    """The answer's text as the model writes it. Tool calls and tool results are handled inside the graph."""
    stream = build_agent(api_key, model, level, system).astream(
        {"messages": messages},
        stream_mode="messages",
        config={"recursion_limit": 2 * MAX_TOOL_ROUNDS + 2},
    )
    answered, tool_results = False, []
    async for token, meta in _texts(stream, deadline):
        if meta.get("langgraph_node") == "tools":
            outcome = "error" if '"error"' in str(token.content) else "ok"
            print(f"[llm] {model} tool {token.name} -> {outcome}")
            tool_results.append(f"{token.name}: {token.content}")
        elif isinstance(token, AIMessageChunk) and token.text:
            answered = True
            yield token.text
    if answered or not tool_results:
        return

    # Gemini 2.5 Flash-Lite often goes silent after a tool result. Ask once more with the results as plain text.
    print(f"[llm] {model} said nothing after its tools; asking again with the results")
    last = messages[-1]
    retry = [*messages[:-1], {**last, "content": f"{last['content']}\n\n[Tool results:\n" + "\n".join(tool_results)
                              + "]\nAnswer the rider now, using these results."}]
    stream = chat_model(api_key, model, level).astream([{"role": "system", "content": system}, *retry])
    async for token, _ in _texts(stream, deadline):
        if token.text:
            yield token.text


# ---------------------------------------------------------------- errors and circuit breaker

def _gemini_error(exc: BaseException) -> Optional[errors.APIError]:
    cause: Optional[BaseException] = exc
    while cause is not None and not isinstance(cause, errors.APIError):
        cause = cause.__cause__ or cause.__context__  # LangChain wraps the Gemini error
    return cause


def classify(exc: BaseException) -> str:
    """'config' (bad key), 'rate_limit', 'hard' (model gone or rejects our settings) or 'soft' (timeout, overload)."""
    if isinstance(exc, LLMError):
        return exc.kind if exc.kind in ("config", "rate_limit") else "soft"
    cause = _gemini_error(exc)
    if cause is None:
        return "soft"
    text = f"{cause.status} {cause.message}".lower()
    if cause.code == 401 or "api key" in text or "api_key" in text:
        return "config"
    if cause.code == 429:
        return "rate_limit"
    if cause.code in (400, 403, 404):
        return "hard"
    return "soft"


def cooldown_seconds(exc: BaseException, kind: str) -> float:
    """How long to skip a model. A used-up daily quota says "retry in 17h": believe it (up to an hour)."""
    cause = _gemini_error(exc)
    details = (cause.details or {}).get("error", {}).get("details", []) if cause and isinstance(cause.details, dict) else []
    for item in details:
        delay = str(item.get("retryDelay", "")) if isinstance(item, dict) else ""
        if delay.endswith("s") and delay[:-1].replace(".", "", 1).isdigit():
            return min(max(float(delay[:-1]), COOLDOWN_SECONDS[kind]), 3600)
    return COOLDOWN_SECONDS[kind]


_cooldown: Dict[str, float] = {}


def _models_to_try() -> List[Tuple[str, str]]:
    models = configured_models()
    now = time.monotonic()
    ready = [m for m in models if _cooldown.get(m[0], 0) <= now]
    return ready or models


# ---------------------------------------------------------------- the race

async def stream_reply(api_key: str, system: str, messages: Messages) -> AsyncIterator[str]:
    """Yields the answer in pieces. Raises LLMError if no model produced anything.

    An exception after the first piece means the answer was cut off; the caller decides what to say.
    """
    deadline = time.monotonic() + TOTAL_DEADLINE_SECONDS
    waiting = list(_models_to_try())
    events: asyncio.Queue = asyncio.Queue()
    running: Dict[str, asyncio.Task] = {}
    started: Dict[str, float] = {}
    winner: Optional[str] = None
    next_start = 0.0

    async def race(model: str, level: str) -> None:
        try:
            async for piece in _run_agent(api_key, model, level, system, messages, deadline):
                events.put_nowait((model, piece, None))
            events.put_nowait((model, None, None))
        except Exception as exc:
            events.put_nowait((model, None, exc))

    def start_next() -> None:
        nonlocal next_start
        model, level = waiting.pop(0)
        started[model] = time.monotonic()
        running[model] = asyncio.create_task(race(model, level))
        next_start = time.monotonic() + HEDGE_SECONDS

    try:
        start_next()
        while True:
            now = time.monotonic()
            hedge = winner is None and waiting and deadline - now > 3
            try:
                model, piece, exc = await _with_timeout(events.get(), min(deadline, next_start) - now if hedge else deadline - now)
            except asyncio.TimeoutError:
                if hedge and time.monotonic() < deadline:
                    start_next()
                    continue
                raise LLMError("unavailable", "no model answered in time")

            if winner not in (None, model):
                continue  # a cancelled loser's last words
            if piece is not None:
                if winner is None:
                    winner = model
                    for other, task in running.items():
                        if other != model:
                            task.cancel()
                yield piece
                continue

            running.pop(model, None)
            if exc is None and winner == model:
                _cooldown.pop(model, None)
                print(f"[llm] {model} answered in {time.monotonic() - started[model]:.1f}s")
                return
            if winner == model:
                raise exc  # cut off mid-answer
            error = exc or LLMError("unavailable", f"{model} returned an empty reply")
            kind = classify(error)
            print(f"[llm] {model} failed ({kind}) after {time.monotonic() - started[model]:.1f}s: "
                  f"{str(error)[:200] or type(error).__name__}")
            if kind == "config":
                raise LLMError("config", str(error)) from error
            _cooldown[model] = time.monotonic() + cooldown_seconds(error, kind)
            if not running:
                if not waiting or deadline - time.monotonic() < 3:
                    raise LLMError("rate_limit" if kind == "rate_limit" else "unavailable", str(error)) from error
                start_next()
    finally:
        for task in running.values():
            task.cancel()
        await asyncio.gather(*running.values(), return_exceptions=True)
