"""
Shared pytest fixtures for ClauseGuard AI backend tests.
"""

from __future__ import annotations

import os
import sys
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# Add backend directory to import path for stable local test execution.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from storage.document_store import document_store


@pytest.fixture(autouse=True)
def clean_document_store() -> Generator[None, None, None]:
    """
    Ensure each test starts with a clean in-memory store.
    """
    document_store._documents.clear()
    yield
    document_store._documents.clear()


@pytest.fixture
def client() -> TestClient:
    """
    FastAPI test client fixture used by API tests.
    """
    return TestClient(app)


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """
    Minimal placeholder bytes used to simulate uploaded PDF content.
    """
    return b"%PDF-1.4\n%Dummy PDF content for tests\n"


@pytest.fixture
def sample_document_text() -> str:
    """
    Common text used across extraction/chunking/retrieval tests.
    """
    return (
        "This Service Agreement is made between Alpha Corp and Beta LLC. "
        "Payment is due within 30 days of invoice. "
        "Either party may terminate with written notice. "
        "Confidential information must not be shared with third parties."
    )
