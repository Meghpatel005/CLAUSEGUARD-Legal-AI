"""
PDF Annotator using PyMuPDF (fitz).

Risk-based highlights with improved phrase matching and page-aware search.
"""

from __future__ import annotations

import io
import logging
import re
from typing import Any, Dict, List, Optional

import fitz

logger = logging.getLogger(__name__)

_colors = {
    "critical": (1.0, 0.2, 0.2),
    "high": (1.0, 0.4, 0.4),
    "medium": (1.0, 0.9, 0.2),
    "low": (0.4, 0.9, 0.4),
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\n", " ")).strip()


def _search_phrases(text: str, min_words: int = 4, chunk_size: int = 8) -> List[str]:
    words = _normalize(text).split()
    if not words:
        return []
    phrases: List[str] = []
    if len(words) <= min_words:
        return [_normalize(text)]
    for i in range(0, len(words), chunk_size):
        phrase = " ".join(words[i : i + chunk_size])
        if len(phrase) >= 10:
            phrases.append(phrase)
    return phrases[:12]


def _search_on_page(page: fitz.Page, phrase: str) -> list:
    clean = _normalize(phrase)
    if len(clean) < 6:
        return []
    hits = page.search_for(clean, quads=True)
    if hits:
        return hits
    # Fallback: shorter window if full phrase not found (PDF line-break quirks)
    words = clean.split()
    if len(words) >= 6:
        mid = " ".join(words[1:-1])
        if len(mid) >= 8:
            return page.search_for(mid, quads=True)
    return []


def annotate_pdf_with_analysis(pdf_bytes: bytes, analysis: Dict[str, Any]) -> bytes:
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        logger.error("Failed to open PDF for annotation: %s", e)
        return pdf_bytes

    clauses = analysis.get("clauses", [])

    for clause in clauses:
        text = clause.get("text", "").strip()
        risk_level = clause.get("risk_level", "medium")
        risk_reason = clause.get("risk_reason", "")
        title = clause.get("title", "Clause")
        citation = clause.get("citation", "")
        page_num = clause.get("page_number")

        color = _colors.get(risk_level, _colors["medium"])
        if not text:
            continue

        phrases = _search_phrases(text)
        clause_annotated = False

        page_indices: List[int]
        if page_num and isinstance(page_num, int) and 1 <= page_num <= len(doc):
            page_indices = [page_num - 1]
        else:
            page_indices = list(range(len(doc)))

        for page_idx in page_indices:
            page = doc[page_idx]
            for phrase in phrases:
                for inst in _search_on_page(page, phrase):
                    highlight = page.add_highlight_annot(inst)
                    highlight.set_colors(stroke=color)
                    highlight.update()

                    if not clause_annotated and risk_level in ("high", "critical"):
                        point = inst[0] if isinstance(inst, list) else inst.ul
                        note_body = f"[{risk_level.upper()}] {title}\n{citation}\n\n{risk_reason}"
                        note = page.add_text_annot(point, note_body[:500])
                        note.update()
                        clause_annotated = True
                    break
                if clause_annotated:
                    break

    try:
        out_buffer = io.BytesIO()
        doc.save(out_buffer, garbage=4, deflate=True)
        doc.close()
        return out_buffer.getvalue()
    except Exception as e:
        logger.error("Failed to save annotated PDF: %s", e)
        return pdf_bytes
