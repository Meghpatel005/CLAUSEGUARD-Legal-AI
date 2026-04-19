"""
Unit tests for text chunking and retrieval.
"""

from __future__ import annotations

from services.retriever import retrieve_relevant_chunks
from services.text_chunker import chunk_text


def test_chunk_text_basic_split():
    text = " ".join([f"w{i}" for i in range(25)])
    chunks = chunk_text(text, chunk_size=10, overlap=2)

    assert len(chunks) >= 3
    assert chunks[0].startswith("w0")
    assert "w8 w9" in chunks[0]
    assert chunks[1].startswith("w8")


def test_chunk_text_empty_input():
    assert chunk_text("") == []


def test_chunk_text_handles_large_document():
    large_text = " ".join(["clause"] * 3000)
    chunks = chunk_text(large_text, chunk_size=500, overlap=50)

    assert len(chunks) > 1
    assert all(len(chunk.split()) <= 500 for chunk in chunks)


def test_retrieve_relevant_chunks_returns_ranked_results():
    chunks = [
        "Payment is due within 30 days.",
        "Termination requires a 60 day notice period.",
        "Confidentiality obligations survive for two years.",
    ]

    results = retrieve_relevant_chunks("What are the payment terms?", chunks, top_k=2)

    assert len(results) == 2
    assert "Payment is due" in results[0]


def test_retrieve_relevant_chunks_with_empty_query_returns_first_chunks():
    chunks = ["alpha text", "beta text", "gamma text"]
    results = retrieve_relevant_chunks("", chunks, top_k=2)
    assert results == ["alpha text", "beta text"]


def test_retrieve_relevant_chunks_with_no_chunks():
    assert retrieve_relevant_chunks("termination", [], top_k=3) == []
