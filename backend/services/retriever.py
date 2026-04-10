"""
Lightweight TF-IDF retriever.

Rationale: A full vector-store (FAISS, Chroma, Pinecone) introduces significant
operational complexity for marginal accuracy gains on the document sizes typical
in legal review workflows (< 50 pages).  TF-IDF over word-tokenised chunks is
reproducible, explainable, dependency-free, and sufficiently accurate for
retrieval over a single document — making it the right default here.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import List

# Common English stop words — removing them improves IDF signal quality
_STOP_WORDS = frozenset(
    "a an the and or but in on at to for of with by from as is was are were "
    "be been being have has had do does did will would could should may might "
    "shall must that this these those it its i we you he she they their our "
    "your his her its not no nor so yet both either each few more most other "
    "some such than then there when where which who whom how all any because "
    "been being between into through during before after above below up down "
    "out off over under again further then once".split()
)


def _tokenise(text: str) -> List[str]:
    tokens = re.findall(r"\b[a-z]{2,}\b", text.lower())
    return [t for t in tokens if t not in _STOP_WORDS]


def _tf_idf_score(query_tokens: List[str], chunk: str, all_chunks: List[str]) -> float:
    """Compute TF-IDF relevance score of *chunk* against *query_tokens*."""
    chunk_tokens = _tokenise(chunk)
    if not chunk_tokens:
        return 0.0

    chunk_counts = Counter(chunk_tokens)
    n_docs = len(all_chunks)
    score = 0.0

    for token in set(query_tokens):
        tf = chunk_counts.get(token, 0) / len(chunk_tokens)
        doc_freq = sum(1 for c in all_chunks if token in _tokenise(c))
        idf = math.log((n_docs + 1) / (doc_freq + 1)) + 1.0
        score += tf * idf

    return score


def retrieve_relevant_chunks(
    query: str,
    chunks: List[str],
    top_k: int = 5,
) -> List[str]:
    """
    Return the *top_k* most query-relevant chunks from *chunks*.

    Args:
        query:  Natural language question from the user.
        chunks: All document chunks produced by text_chunker.
        top_k:  Maximum number of chunks to return.

    Returns:
        List of chunk strings sorted by descending relevance, length ≤ top_k.
    """
    if not chunks:
        return []

    query_tokens = _tokenise(query)
    if not query_tokens:
        return chunks[:top_k]

    scored = [
        (chunk, _tf_idf_score(query_tokens, chunk, chunks))
        for chunk in chunks
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [chunk for chunk, _ in scored[:top_k]]
