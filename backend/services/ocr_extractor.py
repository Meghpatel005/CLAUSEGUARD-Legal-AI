"""
OCR fallback for scanned / image-only PDFs (requires Tesseract on the host).
"""

from __future__ import annotations

import io
import logging
from typing import List, Tuple

import fitz

from config import settings

logger = logging.getLogger(__name__)


def is_ocr_available() -> bool:
    if not settings.ocr_enabled:
        return False
    try:
        import pytesseract  # noqa: F401
        from PIL import Image  # noqa: F401

        return True
    except ImportError:
        return False


def ocr_pdf_bytes(file_bytes: bytes) -> Tuple[str, int, List[str]]:
    """
    OCR each page via PyMuPDF render + Tesseract.

    Returns:
        (full_text_with_page_markers, page_count, per_page_texts)
    """
    import pytesseract
    from PIL import Image

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    page_count = len(doc)
    page_texts: List[str] = []
    parts: List[str] = []

    zoom = settings.ocr_dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)

    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        text = pytesseract.image_to_string(img) or ""
        text = text.strip()
        page_texts.append(text)
        if text:
            parts.append(f"--- Page {i + 1} ---\n{text}")

    doc.close()

    if not any(t.strip() for t in page_texts):
        raise ValueError(
            "OCR could not extract text. Ensure Tesseract is installed "
            "(macOS: brew install tesseract)."
        )

    return "\n\n".join(parts), page_count, page_texts
