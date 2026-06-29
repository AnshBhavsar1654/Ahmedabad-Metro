"""
RAG Pipeline for Ahmedabad Metro Chatbot
Uses sentence-transformers for embeddings, FAISS for retrieval,
and Gemini for answer generation.
"""

from __future__ import annotations

import os
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Tuple

import faiss
import numpy as np
import requests
from sentence_transformers import SentenceTransformer

# ─────────────────────────────────────────────────────────────────────────────
# Data classes
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Chunk:
    text: str
    section: str
    chunk_id: int


@dataclass
class RetrievalResult:
    chunks: List[Chunk]
    scores: List[float]


@dataclass
class RAGResponse:
    answer: str
    retrieved_chunks: List[Chunk]
    scores: List[float]
    query: str


# ─────────────────────────────────────────────────────────────────────────────
# Document loading & chunking
# ─────────────────────────────────────────────────────────────────────────────

KB_PATH = Path(__file__).parent / "data" / "metro_kb.txt"

SYSTEM_PROMPT = """You are a helpful, friendly assistant for the Ahmedabad Metro Rail system.
Answer questions ONLY based on the provided context from the metro knowledge base.
Be concise and accurate. If the context does not contain enough information to answer,
say so honestly and suggest the user contact metro helpline at +91-79-22960123.
Always respond in the same language the user uses (English or Gujarati or Hindi).
Format numerical data (fares, timings, phone numbers) clearly."""


def load_and_chunk_knowledge_base(
    kb_path: Path = KB_PATH,
    chunk_size: int = 400,
    overlap: int = 80,
) -> List[Chunk]:
    """
    Load the knowledge base text file and split it into overlapping chunks.
    Sections are detected by '=== SECTION' headers for better metadata.
    """
    text = kb_path.read_text(encoding="utf-8")
    sections: List[Tuple[str, str]] = []

    current_section = "General"
    current_lines: List[str] = []

    for line in text.splitlines():
        if line.startswith("=== SECTION"):
            if current_lines:
                sections.append((current_section, "\n".join(current_lines).strip()))
            current_section = line.strip("= ").strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append((current_section, "\n".join(current_lines).strip()))

    chunks: List[Chunk] = []
    chunk_id = 0

    for section_name, section_text in sections:
        words = section_text.split()
        start = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk_text = " ".join(words[start:end])
            if chunk_text.strip():
                chunks.append(Chunk(
                    text=chunk_text,
                    section=section_name,
                    chunk_id=chunk_id,
                ))
                chunk_id += 1
            if end == len(words):
                break
            start += chunk_size - overlap

    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# Vector Index
# ─────────────────────────────────────────────────────────────────────────────

class MetroVectorIndex:
    """FAISS-based vector store backed by sentence-transformer embeddings."""

    MODEL_NAME = "all-MiniLM-L6-v2"   # fast, lightweight, good quality

    def __init__(self):
        self.model = SentenceTransformer(self.MODEL_NAME)
        self.chunks: List[Chunk] = []
        self.index: faiss.IndexFlatIP | None = None   # Inner-product (cosine after norm)

    def build(self, chunks: List[Chunk]) -> None:
        self.chunks = chunks
        texts = [c.text for c in chunks]
        embeddings = self.model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        embeddings = np.array(embeddings, dtype="float32")

        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings)

    def search(self, query: str, top_k: int = 5) -> RetrievalResult:
        if self.index is None:
            raise RuntimeError("Index not built. Call build() first.")

        q_emb = self.model.encode([query], normalize_embeddings=True)
        q_emb = np.array(q_emb, dtype="float32")

        scores, indices = self.index.search(q_emb, top_k)
        scores = scores[0].tolist()
        indices = indices[0].tolist()

        retrieved = [self.chunks[i] for i in indices if i >= 0]
        valid_scores = [scores[j] for j, i in enumerate(indices) if i >= 0]

        return RetrievalResult(chunks=retrieved, scores=valid_scores)


# ─────────────────────────────────────────────────────────────────────────────
# RAG Pipeline
# ─────────────────────────────────────────────────────────────────────────────

class AhmedabadMetroRAG:
    """Full RAG pipeline: retrieve → augment → generate."""

    def __init__(self, api_key: str | None = None, top_k: int = 5):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.top_k = top_k
        self.vector_index = MetroVectorIndex()
        self._built = False

    def build_index(self) -> None:
        """Load KB and build FAISS index. Safe to call multiple times."""
        if self._built:
            return
        chunks = load_and_chunk_knowledge_base()
        self.vector_index.build(chunks)
        self._built = True

    def _build_context(self, chunks: List[Chunk]) -> str:
        parts = []
        for i, chunk in enumerate(chunks, 1):
            parts.append(f"[Context {i} – {chunk.section}]\n{chunk.text}")
        return "\n\n".join(parts)

    def _build_user_prompt(self, user_question: str, context: str, chat_history: List[dict] | None) -> str:
        history_lines = []
        for msg in (chat_history or [])[-6:]:
            role = (msg.get("role") or "user").strip().lower()
            content = (msg.get("content") or msg.get("text") or "").strip()
            if not content:
                continue
            label = "User" if role == "user" else "Assistant"
            history_lines.append(f"{label}: {content}")

        history_block = "\n".join(history_lines)
        if history_block:
            history_block = f"\n\nConversation history:\n{history_block}"

        return textwrap.dedent(
            f"""
            Context from Ahmedabad Metro Knowledge Base:
            {'─' * 60}
            {context}
            {'─' * 60}
            {history_block}

            User Question: {user_question}
            """
        ).strip()

    def _call_gemini(self, prompt: str) -> str:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is required for RAG generation")

        model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        base_url = os.getenv("GEMINI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
        temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.2"))
        top_p = float(os.getenv("GEMINI_TOP_P", "0.9"))
        max_output_tokens = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "1024"))

        url = f"{base_url}/models/{model}:generateContent"
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
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

        response = requests.post(url, params={"key": self.api_key}, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()

        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError("Gemini returned no candidates")

        content = candidates[0].get("content") or {}
        parts = content.get("parts") or []
        text = parts[0].get("text") if parts else None
        if not text:
            raise RuntimeError("Gemini returned an empty response")

        return text.strip()

    def query(
        self,
        user_question: str,
        chat_history: List[dict] | None = None,
    ) -> RAGResponse:
        """
        Retrieve relevant chunks and generate an answer using Gemini.

        Args:
            user_question: The user's question.
            chat_history: Optional list of prior messages
                          [{"role": "user"|"assistant", "content": "..."}]

        Returns:
            RAGResponse with answer and provenance.
        """
        if not self._built:
            self.build_index()

        # 1. Retrieve
        result = self.vector_index.search(user_question, top_k=self.top_k)

        # 2. Build augmented prompt
        context = self._build_context(result.chunks)
        history_for_prompt = chat_history[:-1] if chat_history else None
        augmented_user_msg = self._build_user_prompt(user_question, context, history_for_prompt)

        # 3. Call Gemini for grounded generation
        answer = self._call_gemini(augmented_user_msg)

        return RAGResponse(
            answer=answer,
            retrieved_chunks=result.chunks,
            scores=result.scores,
            query=user_question,
        )
