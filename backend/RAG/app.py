"""
Ahmedabad Metro RAG Chatbot — Streamlit App
Run with: streamlit run app.py
"""

import os
import time
from typing import List, Optional

import pandas as pd
import streamlit as st

# ─────────────────────────────────────────────────────────────────────────────
# Page config (must be first Streamlit call)
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Ahmedabad Metro Assistant",
    page_icon="🚇",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────────────────────────────
# Custom CSS
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* Metro brand colors */
:root {
    --metro-blue: #003087;
    --metro-orange: #FF6600;
    --metro-light: #F0F4FF;
}

/* Header */
.metro-header {
    background: linear-gradient(135deg, #003087 0%, #0055B3 100%);
    color: white;
    padding: 1.2rem 1.5rem;
    border-radius: 12px;
    margin-bottom: 1.2rem;
    display: flex;
    align-items: center;
    gap: 12px;
}
.metro-header h1 { margin: 0; font-size: 1.6rem; }
.metro-header p  { margin: 4px 0 0 0; opacity: 0.85; font-size: 0.9rem; }

/* Chat bubbles */
.user-bubble {
    background: #003087;
    color: white;
    padding: 10px 14px;
    border-radius: 18px 18px 4px 18px;
    margin: 6px 0 6px auto;
    max-width: 75%;
    width: fit-content;
    word-wrap: break-word;
}
.bot-bubble {
    background: #F0F4FF;
    color: #1a1a2e;
    padding: 10px 14px;
    border-radius: 18px 18px 18px 4px;
    margin: 6px auto 6px 0;
    max-width: 80%;
    width: fit-content;
    word-wrap: break-word;
    border-left: 3px solid #FF6600;
}

/* Source cards */
.source-card {
    background: #fff;
    border: 1px solid #dde3f0;
    border-radius: 8px;
    padding: 8px 12px;
    margin: 4px 0;
    font-size: 0.82rem;
    color: #444;
}
.source-score {
    color: #FF6600;
    font-weight: 600;
}

/* Metric cards */
.metric-card {
    background: #F0F4FF;
    border-radius: 10px;
    padding: 14px;
    text-align: center;
    border-top: 4px solid #003087;
}
.metric-card .value {
    font-size: 2rem;
    font-weight: 700;
    color: #003087;
}
.metric-card .label {
    font-size: 0.8rem;
    color: #555;
    margin-top: 2px;
}

/* Quick question chips */
.chip-container { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }

/* Sidebar info */
.info-box {
    background: #F0F4FF;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 0.83rem;
    margin-top: 8px;
}
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# Sidebar — API key + settings
# ─────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.image("https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/Gujarat_Metro_Rail_Corporation_logo.svg/200px-Gujarat_Metro_Rail_Corporation_logo.svg.png",
             width=160)
    st.markdown("### ⚙️ Configuration")

    api_key_input = st.text_input(
        "Gemini API Key",
        value=os.environ.get("GEMINI_API_KEY", ""),
        type="password",
        help="Your Gemini API key. Also readable from env var GEMINI_API_KEY.",
    )

    st.markdown("---")
    top_k = st.slider("Retrieved chunks (top-k)", min_value=2, max_value=10, value=5,
                       help="Number of knowledge-base chunks retrieved per query.")
    show_sources = st.toggle("Show source chunks", value=True)

    st.markdown("---")
    st.markdown("""
    <div class="info-box">
    <b>📞 Metro Helpline</b><br>
    +91-79-22960123<br>
    care@gujaratmetrorail.com<br><br>
    <b>Lost & Found</b><br>
    079-22960234<br><br>
    <b>Emergency</b><br>
    079-22960000
    </div>
    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# Load RAG pipeline (cached across reruns)
# ─────────────────────────────────────────────────────────────────────────────
@st.cache_resource(show_spinner="🔄 Building knowledge index…")
def load_rag_pipeline(api_key: str, top_k: int):
    from rag_pipeline import AhmedabadMetroRAG
    rag = AhmedabadMetroRAG(api_key=api_key, top_k=top_k)
    rag.build_index()
    return rag


# ─────────────────────────────────────────────────────────────────────────────
# Header
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="metro-header">
  <span style="font-size:2.2rem">🚇</span>
  <div>
    <h1>Ahmedabad Metro Assistant</h1>
    <p>Your AI guide to Gujarat Metro Rail — fares, routes, schedules & more</p>
  </div>
</div>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# Tabs
# ─────────────────────────────────────────────────────────────────────────────
tab_chat, tab_eval, tab_kb = st.tabs(["💬 Chat", "📊 RAG Evaluation", "📚 Knowledge Base"])


# ════════════════════════════════════════════════════════════════════════════
# TAB 1 — CHAT
# ════════════════════════════════════════════════════════════════════════════
with tab_chat:
    if not api_key_input:
        st.warning("⚠️  Please enter your Gemini API key in the sidebar to start chatting.")
        st.stop()

    rag = load_rag_pipeline(api_key_input, top_k)

    # Session state
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "rag_responses" not in st.session_state:
        st.session_state.rag_responses = {}   # maps msg index → RAGResponse

    # Quick question chips
    QUICK_QUESTIONS = [
        "What are the metro timings?",
        "How much is the fare?",
        "How do I get a smart card?",
        "Which stations have interchange?",
        "What if I lose something?",
        "Are pets allowed on the metro?",
    ]

    st.markdown("**Quick questions:**")
    cols = st.columns(len(QUICK_QUESTIONS))
    for col, q in zip(cols, QUICK_QUESTIONS):
        if col.button(q, key=f"chip_{q}", use_container_width=True):
            st.session_state._quick_question = q

    st.markdown("---")

    # Chat history display
    chat_container = st.container()
    with chat_container:
        for i, msg in enumerate(st.session_state.messages):
            if msg["role"] == "user":
                st.markdown(f'<div class="user-bubble">🧑 {msg["content"]}</div>',
                            unsafe_allow_html=True)
            else:
                st.markdown(f'<div class="bot-bubble">🚇 {msg["content"]}</div>',
                            unsafe_allow_html=True)

                # Show sources if toggled
                if show_sources and i in st.session_state.rag_responses:
                    rag_resp = st.session_state.rag_responses[i]
                    with st.expander(f"📎 {len(rag_resp.retrieved_chunks)} source chunks used", expanded=False):
                        for chunk, score in zip(rag_resp.retrieved_chunks, rag_resp.scores):
                            st.markdown(
                                f'<div class="source-card">'
                                f'<b>{chunk.section}</b> '
                                f'<span class="source-score">[score: {score:.3f}]</span><br>'
                                f'{chunk.text[:300]}{"…" if len(chunk.text) > 300 else ""}'
                                f'</div>',
                                unsafe_allow_html=True,
                            )

    # Clear chat button
    col_input, col_clear = st.columns([5, 1])
    with col_clear:
        if st.button("🗑️ Clear", use_container_width=True):
            st.session_state.messages = []
            st.session_state.rag_responses = {}
            st.rerun()

    # Handle quick question pre-fill
    default_input = ""
    if hasattr(st.session_state, "_quick_question"):
        default_input = st.session_state._quick_question
        del st.session_state._quick_question

    # Input box
    with col_input:
        user_input = st.chat_input("Ask anything about Ahmedabad Metro…")

    if user_input or default_input:
        question = user_input or default_input

        # Append user message
        st.session_state.messages.append({"role": "user", "content": question})

        # Generate answer
        with st.spinner("🔍 Searching knowledge base…"):
            history_for_rag = [
                {"role": m["role"], "content": m["content"]}
                for m in st.session_state.messages
            ]
            rag_resp = rag.query(question, chat_history=history_for_rag)

        # Append assistant message
        assistant_idx = len(st.session_state.messages)
        st.session_state.messages.append({"role": "assistant", "content": rag_resp.answer})
        st.session_state.rag_responses[assistant_idx] = rag_resp

        st.rerun()


# ════════════════════════════════════════════════════════════════════════════
# TAB 2 — RAG EVALUATION (RAGAS)
# ════════════════════════════════════════════════════════════════════════════
with tab_eval:
    st.markdown("### 📊 RAGAS Evaluation Dashboard")
    st.markdown(
        "Evaluate the RAG pipeline using four RAGAS metrics. "
        "Gemini acts as the judge LLM — no OpenAI key required."
    )

    if not api_key_input:
        st.warning("⚠️  Please enter your Gemini API key in the sidebar.")
        st.stop()

    from evaluator import DEFAULT_TEST_CASES, MetroRAGEvaluator, compute_summary_stats

    # Custom test case editor
    with st.expander("✏️  Edit / Add Test Cases", expanded=False):
        st.markdown("Add or modify test cases below (JSON format):")
        default_tc_text = "\n".join(
            f'Q: {tc["question"]}\nA: {tc["ground_truth"]}\n'
            for tc in DEFAULT_TEST_CASES
        )
        st.text_area("Test cases preview (read-only)", value=default_tc_text, height=200,
                     disabled=True)
        st.info("To add custom test cases, edit `evaluator.py → DEFAULT_TEST_CASES`.")

    col_run, col_n = st.columns([3, 1])
    with col_n:
        num_cases = st.number_input("# cases to evaluate", min_value=1,
                                    max_value=len(DEFAULT_TEST_CASES),
                                    value=min(5, len(DEFAULT_TEST_CASES)))
    with col_run:
        run_eval = st.button("▶️  Run RAGAS Evaluation", type="primary", use_container_width=True)

    if run_eval:
        rag_for_eval = load_rag_pipeline(api_key_input, top_k)
        evaluator = MetroRAGEvaluator(rag=rag_for_eval, api_key=api_key_input)
        test_cases = DEFAULT_TEST_CASES[:num_cases]

        progress_bar = st.progress(0, text="Preparing evaluation…")
        status_text = st.empty()

        def update_progress(i, total, question):
            pct = int((i / total) * 60)   # first 60% = dataset building
            progress_bar.progress(pct, text=f"Running RAG for: {question[:60]}…")
            status_text.markdown(f"*Processing question {i+1}/{total}*")

        with st.spinner("Running RAGAS evaluation (this takes ~1–2 min)…"):
            try:
                progress_bar.progress(0, text="Building evaluation dataset…")
                df = evaluator.evaluate(
                    test_cases=test_cases,
                    progress_callback=update_progress,
                )
                progress_bar.progress(100, text="✅ Evaluation complete!")
                status_text.empty()
                st.session_state["eval_df"] = df
            except Exception as e:
                st.error(f"Evaluation failed: {e}")
                progress_bar.empty()

    # Display results
    if "eval_df" in st.session_state:
        df = st.session_state["eval_df"]
        summary = compute_summary_stats(df)

        st.markdown("#### 🎯 Overall Scores")
        metric_cols = ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]
        metric_labels = {
            "faithfulness": "Faithfulness",
            "answer_relevancy": "Answer Relevancy",
            "context_precision": "Context Precision",
            "context_recall": "Context Recall",
        }
        score_cols = st.columns(len(metric_cols))
        for col, m in zip(score_cols, metric_cols):
            val = summary[m].values[0] if m in summary.columns else "N/A"
            color = (
                "#2ecc71" if isinstance(val, float) and val >= 0.8
                else "#f39c12" if isinstance(val, float) and val >= 0.6
                else "#e74c3c"
            )
            col.markdown(
                f'<div class="metric-card">'
                f'<div class="value" style="color:{color}">{val}</div>'
                f'<div class="label">{metric_labels.get(m, m)}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

        st.markdown("#### 📋 Per-Question Results")
        display_cols = ["question"] + [m for m in metric_cols if m in df.columns]
        st.dataframe(
            df[display_cols].style.background_gradient(
                subset=[m for m in metric_cols if m in df.columns],
                cmap="RdYlGn",
                vmin=0, vmax=1,
            ),
            use_container_width=True,
            height=350,
        )

        st.markdown("#### 💬 Answer Details")
        for _, row in df.iterrows():
            with st.expander(f"Q: {row['question'][:80]}"):
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown("**Generated Answer**")
                    st.info(row.get("answer", "N/A"))
                with col2:
                    st.markdown("**Ground Truth**")
                    st.success(row.get("ground_truth", "N/A"))
                # metric summary for this row
                m_vals = {metric_labels[m]: row[m] for m in metric_cols if m in row}
                st.markdown("**Scores:** " + "  |  ".join(f"{k}: `{v}`" for k, v in m_vals.items()))

        # Download button
        csv = df.to_csv(index=False).encode("utf-8")
        st.download_button("⬇️  Download Full Results (CSV)", csv,
                           "ragas_eval_results.csv", "text/csv")


# ════════════════════════════════════════════════════════════════════════════
# TAB 3 — KNOWLEDGE BASE VIEWER
# ════════════════════════════════════════════════════════════════════════════
with tab_kb:
    st.markdown("### 📚 Knowledge Base Explorer")
    from rag_pipeline import load_and_chunk_knowledge_base

    chunks = load_and_chunk_knowledge_base()
    sections = sorted(set(c.section for c in chunks))

    col_filter, col_search = st.columns([1, 2])
    with col_filter:
        selected_section = st.selectbox("Filter by section", ["All"] + sections)
    with col_search:
        search_term = st.text_input("🔍 Search text", placeholder="e.g. smart card, fare, interchange")

    filtered = [
        c for c in chunks
        if (selected_section == "All" or c.section == selected_section)
        and (not search_term or search_term.lower() in c.text.lower())
    ]

    st.markdown(f"Showing **{len(filtered)}** of **{len(chunks)}** chunks")
    for chunk in filtered:
        with st.expander(f"[{chunk.chunk_id}] {chunk.section}"):
            st.markdown(chunk.text)
