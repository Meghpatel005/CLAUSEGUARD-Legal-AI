"""
PDF text extraction.

Uses pdfplumber which handles both simple and layout-complex PDFs well.
Falls back gracefully if a page yields no text (e.g. scanned pages).
"""

from __future__ import annotations

import io
import logging
from typing import Tuple

import pdfplumber

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, int]:
    """
    Extract all text from a PDF given its raw bytes.

    Returns:
        (full_text, page_count)

    Raises:
        ValueError: if the PDF contains no extractable text.
    """
    text_parts: list[str] = []
    page_count = 0

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        page_count = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text_parts.append(page_text.strip())
            except Exception as exc:
                logger.warning("Could not extract text from page %d: %s", i + 1, exc)

    if not text_parts:
        raise ValueError(
            "No extractable text found. The PDF may be scanned or image-only."
        )

    full_text = "\n\n".join(text_parts)
    return full_text, page_count
