import os
from typing import List, Tuple

import requests


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
    history_context = ""
    if conversation_history and len(conversation_history) > 0:
        history_context = "\n\nPrevious conversation context:\n"
        for msg in conversation_history[-6:]:  # Last 6 messages for context
            role_label = "User" if msg.get("role") == "user" else "Assistant"
            history_context += f"{role_label}: {msg.get('text', '')}\n"
        history_context += "\n"
    
    return f"""
You are "Ahmedabad Metro Assistant", a helpful customer support assistant for Ahmedabad Metro.

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
""".strip()


def ask_gemini(user_message: str, api_key: str, conversation_history: List[dict] = None, model: str = "gemini-2.5-flash") -> Tuple[str, str]:
    """
    Sends a grounded prompt to Gemini with conversation history and returns (reply_text, language_hint).
    Language hint is just "auto" since Gemini detects it automatically.
    """
    kb_text = _read_kb_text()
    prompt = _build_prompt(kb_text=kb_text, user_message=user_message, conversation_history=conversation_history or [])

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    params = {"key": api_key}
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.9,
            "maxOutputTokens": 512,
        },
    }

    resp = requests.post(url, params=params, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # Typical shape: candidates[0].content.parts[0].text
    candidates = data.get("candidates") or []
    if not candidates:
        return ("Sorry, I couldn't generate a response right now.", "auto")

    content = (candidates[0].get("content") or {})
    parts = content.get("parts") or []
    text = parts[0].get("text") if parts else None
    if not text:
        return ("Sorry, I couldn't generate a response right now.", "auto")

    return (text.strip(), "auto")