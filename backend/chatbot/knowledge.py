"""Retrieval over the knowledge base (data/metro_kb.txt): the "R" in the assistant's RAG.

The file is split into its "=== Heading ===" sections and indexed with BM25, plus a bonus for words in a section's
heading (a section is most about what its heading says). Search is lexical and in English: the agent searches with
English keywords whatever language the rider writes in. No embeddings, so no extra API calls or quota per question.
"""
import math
import re
from collections import Counter
from typing import List, NamedTuple, Optional

from metro import DATA_DIR

_STOPWORDS = {
    "the", "and", "for", "are", "can", "how", "what", "when", "where", "which", "who", "why", "with", "you", "your",
    "this", "that", "there", "from", "into", "have", "has", "get", "does", "did", "will", "would", "should", "could",
    "any", "about", "metro", "ahmedabad", "please", "tell", "want", "need", "obtain", "know", "some", "all",
}
MIN_SCORE = 1.5  # below this a section is not really about the question


class Section(NamedTuple):
    title: str
    body: str
    counts: Counter  # body terms
    heading: frozenset  # title terms

    def text(self) -> str:
        return f"{self.title}:\n{self.body}"


def _stem(word: str) -> str:
    """Crude English stemming, enough to match "passes" with "pass" and "penalties" with "penalty"."""
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith("ing") and len(word) > 5:
        return word[:-3]
    if word.endswith(("sses", "xes")):
        return word[:-2]
    if word.endswith("s") and not word.endswith("ss") and len(word) > 3:
        return word[:-1]
    return word


def _terms(text: str) -> List[str]:
    return [_stem(w) for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2 and w not in _STOPWORDS]


with open(DATA_DIR / "metro_kb.txt", encoding="utf-8") as _f:
    KB_TEXT = _f.read()

SECTIONS: List[Section] = []
for _block in re.split(r"\n(?==== )", KB_TEXT):
    _match = re.match(r"=== (.+?) ===\n+", _block)
    if _match:
        _title, _body = _match.group(1), _block[_match.end():].strip()
        SECTIONS.append(Section(_title, _body, Counter(_terms(_body)), frozenset(_terms(_title))))

_IDF = {
    term: math.log(1 + (len(SECTIONS) - df + 0.5) / (df + 0.5))
    for term, df in Counter(t for s in SECTIONS for t in set(s.counts) | s.heading).items()
}
_AVG_LENGTH = sum(sum(s.counts.values()) for s in SECTIONS) / len(SECTIONS)


def _score(section: Section, terms: set) -> float:
    length = sum(section.counts.values())
    norm = 1.2 * (0.25 + 0.75 * length / _AVG_LENGTH)
    body = sum(_IDF[t] * section.counts[t] * 2.2 / (section.counts[t] + norm) for t in terms if t in section.counts)
    return body + sum(2 * _IDF[t] for t in terms & section.heading)


def search(query: str, k: int = 3) -> List[Section]:
    """Up to k sections relevant to `query`, best first. Empty if nothing is relevant."""
    terms = set(_terms(query))
    if not terms:
        return []
    scored = sorted(((_score(s, terms), i) for i, s in enumerate(SECTIONS)), reverse=True)
    return [SECTIONS[i] for score, i in scored[:k] if score >= MIN_SCORE]


def best_section(query: str) -> Optional[str]:
    found = search(query, k=1)
    return found[0].text() if found else None
