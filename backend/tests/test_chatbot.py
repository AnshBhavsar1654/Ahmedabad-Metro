# Run with: pip install pytest httpx && pytest   (from the backend/ folder). No network needed:
# the Gemini stream is replaced by scripted chunks built from the real google-genai types.
import asyncio
import json

import pytest
from fastapi.testclient import TestClient
from google.genai import errors, types

import app as app_module
from chatbot import assistant as chat
from chatbot import rules as chat_rules
from chatbot.rules import detect_intent, detect_language, find_stations


def ask(message, history=None):
    return chat.answer_with_rules(message, history or [])


# ---------------------------------------------------------------- understanding

@pytest.mark.parametrize(
    "text, stations",
    [
        ("infocity thi mahatma mandir javanu bhadu ketlu thay?", ["Infocity", "Mahatma Mandir"]),
        ("ઇન્ફોસિટીથી મહાત્મા મંદિર જવાનું ભાડું કેટલું થાય?", ["Infocity", "Mahatma Mandir"]),
        ("ઈન્ફોસિટી થી મહાત્મા મંદિર", ["Infocity", "Mahatma Mandir"]),  # short/long vowel variant
        ("इन्फोसिटी से महात्मा मंदिर का किराया", ["Infocity", "Mahatma Mandir"]),
        ("fare from palde to thaltaj gam", ["Paldi", "Thaltej Gam"]),  # typos
        ("to Vastral Gam from Paldi", ["Paldi", "Vastral Gam"]),  # reads backwards
        ("sector 10a to sector 16", ["Sector-10A", "Sector-16"]),
        ("gift city", ["Gift City"]),
        ("how do I get an NCMC card", []),
        ("what is the refund policy", []),
    ],
)
def test_find_stations(text, stations):
    assert find_stations(text) == stations


def test_language_detection():
    assert detect_language("infocity thi mahatma mandir javanu bhadu ketlu thay") == "gu"
    assert detect_language("ભાડું કેટલું") == "gu"
    assert detect_language("किराया कितना है") == "hi"
    assert detect_language("kya fare hai paldi se vadaj tak") == "hi"
    assert detect_language("fare from paldi to vadaj") == "en"


def test_fare_beats_going_words():
    stations = find_stations("infocity thi mahatma mandir javanu bhadu ketlu thay")
    assert detect_intent("infocity thi mahatma mandir javanu bhadu ketlu thay", stations) == "fare"


# ---------------------------------------------------------------- instant answers

def test_the_original_slow_query_is_answered_instantly_in_gujarati():
    reply = ask("infocity thi mahatma mandir javanu bhadu ketlu thay?")
    assert "ભાડું ₹15" in reply and "ઇન્ફોસિટી" in reply


def test_english_fare_and_route():
    assert "₹15" in ask("fare from paldi to thaltej")
    route = ask("how to go to gift city from vadaj")
    assert "Red Line" in route and "Violet Line" in route


def test_hindi_fare():
    assert "किराया" in ask("इन्फोसिटी से महात्मा मंदिर का किराया") and "₹15" in ask("इन्फोसिटी से महात्मा मंदिर का किराया")


def test_two_stations_alone_mean_a_journey():
    assert "Paldi to Vastral" in ask("paldi vastral")


def test_greeting_and_nearby_need_no_model():
    assert "Hi!" in ask("hello")
    assert "/nearest-stations" in ask("which is the nearest metro station to me")
    assert "/nearest-stations" in ask("najik nu metro station kyu che")


def test_one_station_asks_for_the_other():
    assert "Which station" in ask("fare from paldi")


def test_follow_up_completes_the_question():
    history = [{"role": "user", "text": "fare from paldi?"}, {"role": "bot", "text": "I found Paldi. Which station..."}]
    assert "Fare from Paldi to Thaltej" in ask("thaltej", history)
    history = [{"role": "user", "text": "route from paldi please"}, {"role": "bot", "text": "..."}]
    assert "Paldi to Vastral Gam" in ask("vastral gam", history)


def test_general_questions_go_to_the_model():
    assert ask("what time does the metro start") is None
    assert ask("how long from paldi to vastral gam") is None  # no timing data: model explains


def test_lone_station_name_starts_a_journey_question():
    assert "Which station" in ask("paldi")
    assert "Which station" in ask("Gift City station")
    history = [{"role": "user", "text": "paldi"}, {"role": "bot", "text": "I found Paldi..."}]
    assert "Paldi to Thaltej" in ask("thaltej", history)
    assert ask("paldi station gate timings") is None  # a real question about a station goes to the model


# ==================================================================================================
# LLM layer
# ==================================================================================================

MODELS = [name for name, _ in chat.DEFAULT_MODELS]


def text_chunk(text):
    return types.GenerateContentResponse(
        candidates=[types.Candidate(content=types.Content(role="model", parts=[types.Part(text=text)]))]
    )


def call_chunk(name, **args):
    part = types.Part(function_call=types.FunctionCall(id="c1", name=name, args=args), thought_signature=b"sig")
    return types.GenerateContentResponse(candidates=[types.Candidate(content=types.Content(role="model", parts=[part]))])


def api_error(code, status, message=""):
    return errors.APIError(code, {"error": {"code": code, "status": status, "message": message or status}})


class Hang:
    """A stream that never produces anything."""


class Script:
    """Stands in for the Gemini stream. `plan[model]` is a list of rounds; each round is an exception,
    Hang, or a list of chunks (an exception inside the list is raised mid-stream)."""

    def __init__(self, plan):
        self.plan = {model: list(rounds) for model, rounds in plan.items()}
        self.calls = []  # (model, contents) per round

    async def open(self, api_key, model, contents, config):
        self.calls.append((model, list(contents)))
        rounds = self.plan.get(model) or [api_error(503, "UNAVAILABLE")]
        step = rounds.pop(0) if len(rounds) > 1 else rounds[0]
        if isinstance(step, Exception):
            raise step

        async def stream():
            if step is Hang:
                await asyncio.sleep(3600)
            for item in step:
                if isinstance(item, Exception):
                    raise item
                yield item

        return stream()

    @property
    def models(self):
        return [model for model, _ in self.calls]


@pytest.fixture
def script(monkeypatch):
    chat._cooldown.clear()
    chat._cache.clear()
    monkeypatch.delenv("GEMINI_MODELS", raising=False)

    def install(plan):
        s = Script(plan)
        monkeypatch.setattr(chat, "_open_stream", s.open)
        return s

    return install


def ask_llm(message="what is the refund policy", history=None):
    async def run():
        return "".join([p async for p in chat.stream_reply("key", "system", chat.build_contents(message, history or []))])

    return asyncio.run(run())


def answer(message, history=None):
    return asyncio.run(chat.answer(message, "key", history or []))


# ---------------------------------------------------------------- model chain

def test_streams_pieces_in_order(script):
    script({MODELS[0]: [[text_chunk("Unused tickets "), text_chunk("are refundable.")]]})
    assert ask_llm() == "Unused tickets are refundable."


def test_falls_through_to_next_model(script):
    s = script({
        MODELS[0]: [api_error(429, "RESOURCE_EXHAUSTED")],
        MODELS[1]: [api_error(503, "UNAVAILABLE")],
        MODELS[2]: [[text_chunk("ok from third")]],
    })
    assert ask_llm() == "ok from third"
    assert s.models == MODELS


def test_silent_model_is_abandoned(script, monkeypatch):
    monkeypatch.setattr(chat, "FIRST_CHUNK_SECONDS", 0.05)
    s = script({MODELS[0]: [Hang], MODELS[1]: [[text_chunk("fast answer")]]})
    assert ask_llm() == "fast answer"
    assert s.models[:2] == MODELS[:2]


def test_empty_reply_tries_next_model(script):
    script({MODELS[0]: [[]], MODELS[1]: [[text_chunk("second")]]})
    assert ask_llm() == "second"


def test_failed_models_are_skipped_on_the_next_question(script):
    s = script({
        MODELS[0]: [api_error(429, "RESOURCE_EXHAUSTED")],
        MODELS[1]: [api_error(404, "NOT_FOUND")],
        MODELS[2]: [[text_chunk("answer")]],
    })
    ask_llm()
    s.calls.clear()
    assert ask_llm() == "answer"
    assert s.models == [MODELS[2]]  # no time wasted on the two that just failed


def test_when_every_model_is_cooling_down_all_are_tried(script):
    s = script({m: [api_error(503, "UNAVAILABLE")] for m in MODELS})
    with pytest.raises(chat.LLMError):
        ask_llm()
    s.plan[MODELS[0]] = [[text_chunk("recovered")]]
    assert ask_llm() == "recovered"


def test_invalid_key_stops_immediately(script):
    s = script({m: [api_error(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.")] for m in MODELS})
    with pytest.raises(chat.LLMError) as info:
        ask_llm()
    assert info.value.kind == "config" and len(s.calls) == 1


def test_models_can_be_configured(monkeypatch):
    monkeypatch.setenv("GEMINI_MODELS", "gemini-x:minimal, gemini-y")
    assert chat.configured_models() == [("gemini-x", "minimal"), ("gemini-y", "low")]


# ---------------------------------------------------------------- tools

def test_tool_call_answers_from_the_fare_table(script):
    s = script({MODELS[0]: [[call_chunk("get_journey", from_station="ઇન્ફોસિટી", to_station="mahatma mandir")],
                            [text_chunk("The fare is Rs 15.")]]})
    assert ask_llm("how much to go from my office to the temple") == "The fare is Rs 15."
    second_round = s.calls[1][1]
    model_turn, tool_turn = second_round[-2], second_round[-1]
    assert model_turn.parts[0].thought_signature == b"sig"  # handed back unchanged
    result = tool_turn.parts[0].function_response
    assert result.id == "c1" and result.response["fare_rupees"] == 15 and result.response["from"] == "Infocity"


def test_tools_resolve_lines_and_report_unknown_stations():
    assert chat.call_tool("get_line_stations", {"line": "purple"})["stations_in_order"] == ["GNLU", "PDEU", "Gift City"]
    assert chat.call_tool("get_station_lines", {"station": "old high court"})["is_interchange"] is True
    assert "error" in chat.call_tool("get_journey", {"from_station": "Mars", "to_station": "Paldi"})
    assert "error" in chat.call_tool("get_journey", {"from_station": "Paldi"})  # missing argument
    assert "error" in chat.call_tool("drop_tables", {})


def test_facts_and_time_are_given_to_the_model():
    turn = chat.build_contents("how long from paldi to thaltej", [])[-1].parts[0].text
    assert "Facts: Journey Paldi to Thaltej" in turn and "Now in Ahmedabad" in turn


def test_history_roles_are_mapped():
    contents = chat.build_contents("and the refund?", [{"role": "user", "text": "hi"}, {"role": "bot", "text": "Hello"}])
    assert [c.role for c in contents] == ["user", "model", "user"]


# ---------------------------------------------------------------- what the rider gets when things fail

def test_model_outage_falls_back_to_knowledge_base(script):
    script({m: [api_error(503, "UNAVAILABLE")] for m in MODELS})
    result = answer("what is the refund policy for tickets")
    assert result["source"] == "kb" and "Refund" in result["response"]


def test_outage_without_kb_match_raises(script):
    script({m: [api_error(503, "UNAVAILABLE")] for m in MODELS})
    with pytest.raises(chat.ChatServiceError):
        answer("xyzzy plugh")


def test_bad_key_is_not_hidden_by_fallback(script):
    script({m: [api_error(401, "UNAUTHENTICATED")] for m in MODELS})
    with pytest.raises(chat.ChatServiceError) as info:
        answer("what is the refund policy")
    assert info.value.kind == "config"


def test_missing_key_is_a_config_error():
    with pytest.raises(chat.ChatServiceError):
        asyncio.run(chat.answer("what is the refund policy", "", []))


def test_cut_off_answer_keeps_what_was_said(script):
    script({MODELS[0]: [[text_chunk("Unused tickets are"), api_error(500, "INTERNAL")]]})
    result = answer("what is the refund policy")
    assert result["response"].startswith("Unused tickets are") and chat_rules.INTERRUPTED["en"] in result["response"]
    assert chat._cache_get("what is the refund policy") is None  # a broken answer is never cached


def test_repeated_standalone_questions_hit_the_cache(script):
    s = script({MODELS[0]: [[text_chunk("25 kg")]]})
    assert answer("What is the luggage limit?")["source"] == "llm"
    assert answer("what is the luggage limit") == {"response": "25 kg", "source": "cache"}
    assert len(s.calls) == 1


def test_questions_about_now_are_not_cached(script):
    s = script({MODELS[0]: [[text_chunk("Yes, open until 11 PM.")]]})
    answer("is the metro open now")
    answer("is the metro open now")
    assert len(s.calls) == 2


def test_rules_bug_never_breaks_the_assistant(script, monkeypatch):
    monkeypatch.setattr(chat, "answer_with_rules", lambda *a: (_ for _ in ()).throw(RuntimeError("bug")))
    script({MODELS[0]: [[text_chunk("from model")]]})
    assert answer("anything")["response"] == "from model"


# ---------------------------------------------------------------- HTTP

client = TestClient(app_module.app)


def sse_events(response):
    return [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]


def test_stream_endpoint_sends_pieces_then_done(script, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "key")
    script({MODELS[0]: [[text_chunk("Unused tickets "), text_chunk("are refundable.")]]})
    res = client.post("/api/chat/stream", json={"message": "what is the refund policy"})
    assert res.status_code == 200 and res.headers["content-type"].startswith("text/event-stream")
    events = sse_events(res)
    assert "".join(e["text"] for e in events if e["type"] == "delta") == "Unused tickets are refundable."
    assert events[-1] == {"type": "done", "source": "llm"}


def test_stream_endpoint_answers_rules_without_a_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    events = sse_events(client.post("/api/chat/stream", json={"message": "fare from paldi to thaltej"}))
    assert "₹15" in events[0]["text"] and events[-1]["source"] == "rules"


def test_stream_endpoint_reports_failure_with_a_status_code(script, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "key")
    script({m: [api_error(503, "UNAVAILABLE")] for m in MODELS})
    res = client.post("/api/chat/stream", json={"message": "xyzzy plugh"})
    assert res.status_code == 503 and "unavailable" in res.json()["error"]


def test_json_endpoint_still_works(script, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "key")
    script({MODELS[0]: [[text_chunk("25 kg")]]})
    assert client.post("/api/chat", json={"message": "luggage limit?"}).json() == {"response": "25 kg", "source": "llm"}


def test_rate_limit_per_client(monkeypatch):
    monkeypatch.setattr(app_module, "CHAT_LIMIT_PER_MINUTE", 2)
    app_module._recent.clear()
    headers = {"x-forwarded-for": "203.0.113.9"}
    codes = [client.post("/api/chat", json={"message": "hello"}, headers=headers).status_code for _ in range(3)]
    assert codes == [200, 200, 429]
    other = client.post("/api/chat", json={"message": "hello"}, headers={"x-forwarded-for": "203.0.113.10"})
    assert other.status_code == 200
    app_module._recent.clear()
