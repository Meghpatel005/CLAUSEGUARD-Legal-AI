"""
Word-based overlapping text chunker.

Chunks by word count rather than characters so that each chunk represents
a roughly consistent semantic unit regardless of word length distribution.
Overlap ensures clause boundaries aren't silently split across chunks.
"""

from __future__ import annotations

from typing import List


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Split *text* into overlapping word-count chunks.

    Args:
        text:       Raw document text.
        chunk_size: Target number of words per chunk.
        overlap:    Number of words shared between consecutive chunks.

    Returns:
        List of text chunk strings.
    """
    words = text.split()
    if not words:
        return []

    # Guard against degenerate parameters
    overlap = min(overlap, chunk_size // 2)
    step = max(1, chunk_size - overlap)

    chunks: List[str] = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += step

    return chunks
