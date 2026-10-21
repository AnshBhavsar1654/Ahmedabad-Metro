# Run with: pip install pytest httpx && pytest   (from the backend/ folder). No network needed:
# the real LangGraph agent runs on a scripted chat model in place of Gemini.
import asyncio
import json
from typing import Any

import pytest
from fastapi.testclient import TestClient
from google.genai import errors
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessageChunk, ToolMessage, message_chunk_to_message
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult

import app as app_module
from chatbot import agent, tools
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



def test_questions_beyond_a_journey_go_to_the_model():
    assert ask("can I use my smart card to go to gift city?") is None
    assert ask("how do I reach the airport by metro?") is None
    assert ask("which gate has the lift at kalupur railway station?") is None
    assert ask("can i use my smart card to go from paldi to gift city") is None


# ==================================================================================================
# Agent layer
# ==================================================================================================

MODELS = ["model-a", "model-b", "model-c"]  # the race order in these tests (GEMINI_MODELS)


def text_chunk(text):
    return AIMessageChunk(content=text)


def call_chunk(name, **args):
    return AIMessageChunk(content="", tool_call_chunks=[{"name": name, "args": json.dumps(args), "id": "c1", "index": 0}])


def api_error(code, status, message=""):
    return errors.APIError(code, {"error": {"code": code, "status": status, "message": message or status}})


class Hang:
    """A model that never produces anything."""


class FakeChat(BaseChatModel):
    """Stands in for Gemini inside the real LangGraph agent. Each model call takes the next round of its script."""

    name: str
    script: Any

    @property
    def _llm_type(self):
        return "fake"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        raise NotImplementedError

    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        step = self.script.next_round(self.name, messages)
        if isinstance(step, Exception):
            raise step
        if step is Hang:
            await asyncio.sleep(3600)
        for item in step:
            if isinstance(item, Exception):
                raise item
            yield ChatGenerationChunk(message=item)

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        chunks = [chunk async for chunk in self._astream(messages)]
        message = chunks[0].message if chunks else AIMessageChunk(content="")
        for chunk in chunks[1:]:
            message = message + chunk.message
        return ChatResult(generations=[ChatGeneration(message=message_chunk_to_message(message))])


class Script:
    """`plan[model]` is a list of rounds (one per model call); each round is an exception, Hang, or a list of
    chunks (an exception inside the list is raised mid-stream). The last round repeats."""

    def __init__(self, plan):
        self.plan = {model: list(rounds) for model, rounds in plan.items()}
        self.calls = []  # (model, messages) per model call

    def next_round(self, model, messages):
        self.calls.append((model, list(messages)))
        rounds = self.plan.get(model) or [api_error(503, "UNAVAILABLE")]
        return rounds.pop(0) if len(rounds) > 1 else rounds[0]

    @property
    def models(self):
        return [model for model, _ in self.calls]


@pytest.fixture
def script(monkeypatch):
    agent._cooldown.clear()
    chat._cache.clear()
    agent.build_agent.cache_clear()
    monkeypatch.setenv("GEMINI_MODELS", "model-a:0,model-b:minimal,model-c:minimal")

    def install(plan):
        s = Script(plan)
        monkeypatch.setattr(agent, "chat_model", lambda api_key, model, level: FakeChat(name=model, script=s))
        return s

    yield install
    agent.build_agent.cache_clear()


def ask_llm(message="what is the refund policy", history=None):
    async def run():
        return "".join([p async for p in agent.stream_reply("key", "system", chat.build_messages(message, history or []))])

    return asyncio.run(run())


def answer(message, history=None, key="key"):
    async def run():
        texts, source = [], None
        async for event in chat.answer_stream(message, key, history or []):
            if event["type"] == "delta":
                texts.append(event["text"])
            else:
                source = event["source"]
        return {"response": "".join(texts).strip(), "source": source}

    return asyncio.run(run())


# ---------------------------------------------------------------- model race

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
    monkeypatch.setattr(agent, "FIRST_CHUNK_SECONDS", 0.05)
    monkeypatch.setattr(agent, "HEDGE_SECONDS", 10)
    s = script({MODELS[0]: [Hang], MODELS[1]: [[text_chunk("fast answer")]]})
    assert ask_llm() == "fast answer"
    assert s.models[:2] == MODELS[:2]


def test_slow_model_gets_a_racer_and_the_first_answer_wins(script, monkeypatch):
    monkeypatch.setattr(agent, "HEDGE_SECONDS", 0.05)
    s = script({MODELS[0]: [Hang], MODELS[1]: [[text_chunk("racer "), text_chunk("answer")]]})
    assert ask_llm() == "racer answer"
    assert s.models == MODELS[:2]
    assert MODELS[0] not in agent._cooldown  # merely slower, not broken


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
    with pytest.raises(agent.LLMError):
        ask_llm()
    s.plan[MODELS[0]] = [[text_chunk("recovered")]]
    assert ask_llm() == "recovered"


def test_invalid_key_stops_immediately(script):
    s = script({m: [api_error(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.")] for m in MODELS})
    with pytest.raises(agent.LLMError) as info:
        ask_llm()
    assert info.value.kind == "config" and len(s.calls) == 1


def test_wrapped_gemini_errors_are_classified():
    try:
        try:
            raise api_error(429, "RESOURCE_EXHAUSTED")
        except errors.APIError as exc:
            raise RuntimeError("Error calling model") from exc
    except RuntimeError as wrapped:
        assert agent.classify(wrapped) == "rate_limit"


def test_used_up_daily_quota_benches_the_model_for_longer():
    daily = errors.APIError(429, {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "message": "quota", "details": [
        {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "64177s"}]}})
    assert agent.cooldown_seconds(daily, "rate_limit") == 3600
    assert agent.cooldown_seconds(api_error(429, "RESOURCE_EXHAUSTED"), "rate_limit") == 60


def test_models_can_be_configured(monkeypatch):
    monkeypatch.setenv("GEMINI_MODELS", "gemini-x:minimal, gemini-y")
    assert agent.configured_models() == [("gemini-x", "minimal"), ("gemini-y", "low")]
    monkeypatch.delenv("GEMINI_MODELS")
    assert agent.configured_models()[0] == ("gemini-2.5-flash-lite", "0")


def test_thinking_is_a_budget_for_gemini_2_and_a_level_for_gemini_3():
    flash_2 = agent.chat_model("key", "gemini-2.5-flash-lite", "0")
    assert flash_2.thinking_budget == 0 and flash_2.temperature == 0.2
    assert agent.chat_model("key", "gemini-3.5-flash-lite", "minimal").thinking_level == "minimal"


# ---------------------------------------------------------------- tools and retrieval

def call_tool(name, args):
    """Run a tool as the agent would; bad names and arguments come back as errors, as the model sees them."""
    tool = next((t for t in tools.TOOLS if t.name == name), None)
    if tool is None:
        return {"error": f"Unknown tool '{name}'."}
    try:
        return tool.invoke(args)
    except Exception as exc:
        return {"error": f"Bad arguments for {name}: {exc}"}


def test_agent_calls_a_tool_and_answers_from_its_result(script):
    s = script({MODELS[0]: [[call_chunk("get_journey", from_station="ઇન્ફોસિટી", to_station="mahatma mandir")],
                            [text_chunk("The fare is Rs 15.")]]})
    assert ask_llm("how much to go from my office to the temple") == "The fare is Rs 15."
    tool_message = s.calls[1][1][-1]
    assert isinstance(tool_message, ToolMessage) and tool_message.tool_call_id == "c1"
    result = json.loads(tool_message.content)
    assert result["fare_rupees"] == 15 and result["from"] == "Infocity"


def test_silence_after_a_tool_is_answered_from_the_tool_results(script):
    s = script({MODELS[0]: [[call_chunk("get_station_info", station="kalupur")], [text_chunk("")], [text_chunk("Lift near Gate No. 1.")]]})
    assert ask_llm("which gate has the lift at kalupur?") == "Lift near Gate No. 1."
    retry_turn = s.calls[2][1][-1].content
    assert "Tool results:" in retry_turn and "Kalupur Railway Station" in retry_turn
    assert s.models == [MODELS[0]] * 3 and MODELS[0] not in agent._cooldown


def test_station_and_timetable_facts_come_with_the_question():
    turn = chat.build_messages("which gate has the lift at kalupur railway station?", [])[-1]["content"]
    assert "Station facts" in turn and "Lift No. 01 near Gate No. 01" in turn and "Timetable" not in turn
    turn = chat.build_messages("when is the next train from infocity?", [])[-1]["content"]
    assert "Timetable" in turn and "Infocity" in turn


def test_tools_resolve_lines_and_report_unknown_stations():
    assert call_tool("get_line_stations", {"line": "purple"})["stations_in_order"] == ["GNLU", "PDEU", "Gift City"]
    info = call_tool("get_station_info", {"station": "old high court"})
    assert info["is_interchange"] is True and info["entry_exit_gates"] and info["lifts"]
    assert "error" in call_tool("get_journey", {"from_station": "Mars", "to_station": "Paldi"})
    assert "error" in call_tool("get_journey", {"from_station": "Paldi"})  # missing argument
    assert "error" in call_tool("drop_tables", {})


def test_station_info_covers_every_station_with_gate_data():
    assert call_tool("get_station_info", {"station": "ghee kanta"})["type"] == "Underground"
    assert call_tool("get_station_info", {"station": "gift city"})["lines"] == ["Violet Line", "Light Blue Line"]
    assert len(tools.gate_data()) == 54  # every open station on the /stations-info page


def test_knowledge_base_search_tool():
    found = call_tool("search_knowledge_base", {"query": "student pass concession"})
    assert "student pass" in found["sections"][0]
    assert "result" in call_tool("search_knowledge_base", {"query": "xyzzy"})


def test_retrieved_sections_facts_and_time_are_given_to_the_model():
    turn = chat.build_messages("how can i obtain daily metro pass as student?", [])[-1]["content"]
    assert "Knowledge base excerpts" in turn and "does not offer any student pass" in turn and "Now in Ahmedabad" in turn
    turn = chat.build_messages("how long from paldi to thaltej", [])[-1]["content"]
    assert "Facts: Journey Paldi to Thaltej" in turn


def test_follow_ups_retrieve_with_the_previous_question():
    history = [{"role": "user", "text": "is there a student pass?"}, {"role": "bot", "text": "No."}]
    assert "Passes, Student" in chat.build_messages("and for seniors?", history)[-1]["content"]


def test_history_roles_are_mapped():
    messages = chat.build_messages("and the refund?", [{"role": "user", "text": "hi"}, {"role": "bot", "text": "Hello"}])
    assert [m["role"] for m in messages] == ["user", "assistant", "user"]


# ---------------------------------------------------------------- what the rider gets when things fail

def test_model_outage_falls_back_to_knowledge_base(script):
    script({m: [api_error(503, "UNAVAILABLE")] for m in MODELS})
    result = answer("what is the refund policy for tickets")
    assert result["source"] == "kb" and "Refund" in result["response"]


@pytest.mark.parametrize(
    "question, expected",
    [
        ("how can i obtain daily metro pass as student?", "student pass"),
        ("is there a monthly pass", "monthly pass"),
        ("can I take my bicycle on the train", "Bicycles"),
        ("I lost my bag in the train", "Lost & Found Office"),
        ("smart card deposit refund", "security deposit"),
        ("customer care phone number", "22960123"),
        ("can i take my dog", "Pets"),
        ("penalty without ticket", "Rs 50 plus the maximum fare"),
    ],
)
def test_outage_answers_from_the_right_section(script, question, expected):
    script({m: [api_error(503, "UNAVAILABLE")] for m in MODELS})
    result = answer(question)
    assert result["source"] == "kb" and expected in result["response"]


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
        answer("what is the refund policy", key="")


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


def test_rate_limit_per_client(monkeypatch):
    monkeypatch.setattr(app_module, "CHAT_LIMIT_PER_MINUTE", 2)
    app_module._recent.clear()
    headers = {"x-forwarded-for": "203.0.113.9"}
    codes = [client.post("/api/chat/stream", json={"message": "hello"}, headers=headers).status_code for _ in range(3)]
    assert codes == [200, 200, 429]
    other = client.post("/api/chat/stream", json={"message": "hello"}, headers={"x-forwarded-for": "203.0.113.10"})
    assert other.status_code == 200
    app_module._recent.clear()


def test_stations_that_are_not_open():
    assert "isn't open yet" in ask("fare from paldi to sabarmati")
    assert "work in progress" not in ask("route from aec to motera stadium")  # only passes Sabarmati
    assert "work in progress" in ask("fare from vadaj to airport")
    route = ask("route from paldi to airport")
    assert "Pink Line" in route and "work in progress" in route and "₹" not in route
    assert "Light Blue Line" in ask("gift city to shahpur gandhinagar")
    old_shahpur = ask("fare from paldi to shahpur")  # the Blue Line station: change at Old High Court
    assert "₹10" in old_shahpur and "Old High Court" in old_shahpur


def test_light_blue_is_not_taken_for_blue():
    assert call_tool("get_line_stations", {"line": "light blue"})["line"] == "Light Blue Line"
    assert call_tool("get_line_stations", {"line": "blue line"})["line"] == "Blue Line"
