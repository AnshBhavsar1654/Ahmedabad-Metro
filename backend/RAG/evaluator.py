"""
RAGAS Evaluation Module for Ahmedabad Metro RAG Chatbot.

Metrics evaluated:
  • Faithfulness      – Is the answer grounded in the retrieved context?
  • Answer Relevancy  – Does the answer address the question?
  • Context Precision – Are the retrieved chunks relevant to the question?
  • Context Recall    – Does the context cover what's needed for the reference answer?

Requires GEMINI_API_KEY (Gemini is used as the evaluation LLM instead of OpenAI).
"""

from __future__ import annotations

import os
from typing import List, Optional

import pandas as pd
from datasets import Dataset
from langchain_google_genai import ChatGoogleGenerativeAI
from ragas import evaluate
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from langchain_community.embeddings import HuggingFaceEmbeddings

from rag_pipeline import AhmedabadMetroRAG


# ─────────────────────────────────────────────────────────────────────────────
# Default test dataset (question / ground_truth pairs about the KB)
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_TEST_CASES = [
    {
        "question": "What are the operational hours of Ahmedabad Metro?",
        "ground_truth": (
            "Ahmedabad Metro operates from 6:30 AM to 11:00 PM daily. "
            "During major events at Narendra Modi Stadium, services are extended until 12:30 AM."
        ),
    },
    {
        "question": "How much discount do smart card holders get?",
        "ground_truth": "Smart card holders receive a 10% discount on all metro fares.",
    },
    {
        "question": "What is the minimum and maximum fare on Ahmedabad Metro?",
        "ground_truth": "The minimum fare is Rs 5 and the maximum fare is Rs 40.",
    },
    {
        "question": "Are bicycles allowed on the metro?",
        "ground_truth": "No, bicycles are prohibited on Ahmedabad Metro trains.",
    },
    {
        "question": "How often do trains run on the East-West Line during peak hours?",
        "ground_truth": (
            "During weekday peak hours, trains on the East-West Line run every 9 minutes. "
            "During non-peak hours the frequency is every 10 minutes, "
            "and on weekends every 12 minutes."
        ),
    },
    {
        "question": "Which stations serve as interchange points between metro lines?",
        "ground_truth": (
            "The interchange stations are Old High Court, Motera Stadium, and GNLU. "
            "No additional fare is charged for interchanging between lines at these stations."
        ),
    },
    {
        "question": "What should I do if I lose something on the metro?",
        "ground_truth": (
            "Report lost items at any metro station or contact the Lost and Found Office "
            "at Apparel Park Depot, Rajpur Hirpur, Gomtipur, Ahmedabad – 380021. "
            "You can also call 079-22960234. Unclaimed items are kept for six months."
        ),
    },
    {
        "question": "Can children travel free on Ahmedabad Metro?",
        "ground_truth": (
            "Yes. Up to 2 children under 3 feet tall can travel free when accompanied by an adult."
        ),
    },
    {
        "question": "What payment methods are accepted for metro tickets?",
        "ground_truth": (
            "Accepted payment methods include cash, UPI (Paytm, PhonePe, Google Pay), "
            "debit cards, and credit cards."
        ),
    },
    {
        "question": "What is the maximum luggage weight allowed on Ahmedabad Metro?",
        "ground_truth": (
            "The maximum luggage weight allowed is 25 kg, with dimensions not exceeding "
            "80 x 50 x 30 cm."
        ),
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Evaluator class
# ─────────────────────────────────────────────────────────────────────────────

class MetroRAGEvaluator:
    """Runs RAGAS evaluation using Gemini as the judge LLM."""

    METRICS = [faithfulness, answer_relevancy, context_precision, context_recall]

    def __init__(self, rag: AhmedabadMetroRAG, api_key: str | None = None):
        self.rag = rag
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")

        # Wrap Gemini as the RAGAS judge LLM
        gemini_llm = ChatGoogleGenerativeAI(
            model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
            google_api_key=self.api_key,
            temperature=0,
        )
        self._ragas_llm = LangchainLLMWrapper(gemini_llm)

        # Use HuggingFace embeddings for RAGAS (same model as retrieval)
        hf_embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        self._ragas_embeddings = LangchainEmbeddingsWrapper(hf_embeddings)

    def _configure_metrics(self):
        """Inject the Gemini LLM into each RAGAS metric."""
        for metric in self.METRICS:
            metric.llm = self._ragas_llm
            if hasattr(metric, "embeddings"):
                metric.embeddings = self._ragas_embeddings

    def build_eval_dataset(
        self,
        test_cases: Optional[List[dict]] = None,
        progress_callback=None,
    ) -> Dataset:
        """
        Run the RAG pipeline on each test case and collect
        questions, answers, contexts, and ground truths.
        """
        if test_cases is None:
            test_cases = DEFAULT_TEST_CASES

        questions, answers, contexts, ground_truths = [], [], [], []

        for i, tc in enumerate(test_cases):
            if progress_callback:
                progress_callback(i, len(test_cases), tc["question"])

            rag_resp = self.rag.query(tc["question"])
            questions.append(tc["question"])
            answers.append(rag_resp.answer)
            contexts.append([c.text for c in rag_resp.retrieved_chunks])
            ground_truths.append(tc["ground_truth"])

        return Dataset.from_dict({
            "question": questions,
            "answer": answers,
            "contexts": contexts,
            "ground_truth": ground_truths,
        })

    def evaluate(
        self,
        test_cases: Optional[List[dict]] = None,
        progress_callback=None,
    ) -> pd.DataFrame:
        """
        Run full RAGAS evaluation and return a results DataFrame.

        Returns columns:
            question, answer, ground_truth, faithfulness,
            answer_relevancy, context_precision, context_recall
        """
        self._configure_metrics()
        dataset = self.build_eval_dataset(test_cases, progress_callback)

        result = evaluate(
            dataset=dataset,
            metrics=self.METRICS,
            llm=self._ragas_llm,
            embeddings=self._ragas_embeddings,
            raise_exceptions=False,
        )

        base_df = dataset.to_pandas()
        ragas_df = result.to_pandas()

        # Some RAGAS versions return only metric columns, especially when one
        # or more jobs fail with raise_exceptions=False. Keep the original
        # eval records so the Streamlit UI can still render partial results.
        for col in ragas_df.columns:
            base_df[col] = ragas_df[col].values
        df = base_df

        # Round metric columns for readability
        metric_cols = ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]
        for col in metric_cols:
            if col in df.columns:
                df[col] = df[col].round(3)

        return df


def compute_summary_stats(df: pd.DataFrame) -> pd.DataFrame:
    """Return a one-row summary of mean metric scores."""
    metric_cols = ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]
    available = [c for c in metric_cols if c in df.columns]
    summary = df[available].mean().round(3).to_frame(name="Mean Score").T
    return summary
