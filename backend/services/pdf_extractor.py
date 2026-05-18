"""
PDF text extraction with per-page markers and optional OCR fallback.
"""

from __future__ import annotations

import io
import logging
from typing import List, Tuple

import pdfplumber

from config import settings
from services.ocr_extractor import is_ocr_available, ocr_pdf_bytes

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, int, List[str]]:
    """
    Extract text from a PDF. Adds page markers for citation mapping.

    Returns:
        (full_text, page_count, per_page_texts)

    Raises:
        ValueError: if no text can be extracted (even after OCR).
    """
    page_texts: List[str] = []
    page_count = 0

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        page_count = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            try:
                page_text = page.extract_text()
                page_texts.append(page_text.strip() if page_text else "")
            except Exception as exc:
                logger.warning("Could not extract text from page %d: %s", i + 1, exc)
                page_texts.append("")

    if any(t for t in page_texts):
        parts = []
        for i, text in enumerate(page_texts):
            if text:
                parts.append(f"--- Page {i + 1} ---\n{text}")
        return "\n\n".join(parts), page_count, page_texts

    if settings.ocr_enabled and is_ocr_available():
        logger.info("No embedded text found; attempting OCR.")
        return ocr_pdf_bytes(file_bytes)

    raise ValueError(
        "No extractable text found. The PDF may be scanned — install Tesseract "
        "(brew install tesseract) and pytesseract for OCR support."
    )
