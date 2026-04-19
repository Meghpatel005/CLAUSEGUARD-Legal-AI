"""
Unit tests for PDF extraction logic.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from services.pdf_extractor import extract_text_from_pdf


def test_extract_text_from_pdf_success(monkeypatch: pytest.MonkeyPatch, sample_pdf_bytes: bytes):
    """
    Should merge non-empty page text and return correct page count.
    """

    class FakePDF:
        def __init__(self):
            self.pages = [
                SimpleNamespace(extract_text=lambda: " First page "),
                SimpleNamespace(extract_text=lambda: "Second page"),
                SimpleNamespace(extract_text=lambda: "   "),  # empty page should be ignored
            ]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr("services.pdf_extractor.pdfplumber.open", lambda _: FakePDF())

    text, page_count = extract_text_from_pdf(sample_pdf_bytes)

    assert page_count == 3
    assert text == "First page\n\nSecond page"


def test_extract_text_from_pdf_raises_for_no_text(monkeypatch: pytest.MonkeyPatch, sample_pdf_bytes: bytes):
    """
    Empty/blank pages should raise a clear ValueError.
    """

    class EmptyPDF:
        def __init__(self):
            self.pages = [SimpleNamespace(extract_text=lambda: None), SimpleNamespace(extract_text=lambda: "  ")]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr("services.pdf_extractor.pdfplumber.open", lambda _: EmptyPDF())

    with pytest.raises(ValueError, match="No extractable text found"):
        extract_text_from_pdf(sample_pdf_bytes)


def test_extract_text_from_pdf_invalid_input(monkeypatch: pytest.MonkeyPatch):
    """
    Invalid PDF bytes should bubble up provider exception.
    """

    def _raise_invalid(_: object):
        raise RuntimeError("invalid pdf")

    monkeypatch.setattr("services.pdf_extractor.pdfplumber.open", _raise_invalid)

    with pytest.raises(RuntimeError, match="invalid pdf"):
        extract_text_from_pdf(b"not-a-real-pdf")


def test_extract_text_from_pdf_large_document(monkeypatch: pytest.MonkeyPatch, sample_pdf_bytes: bytes):
    """
    Large page counts should still be processed and merged.
    """

    class LargePDF:
        def __init__(self):
            self.pages = [SimpleNamespace(extract_text=lambda i=i: f"Page {i}") for i in range(120)]

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr("services.pdf_extractor.pdfplumber.open", lambda _: LargePDF())

    text, page_count = extract_text_from_pdf(sample_pdf_bytes)

    assert page_count == 120
    assert "Page 0" in text
    assert "Page 119" in text
