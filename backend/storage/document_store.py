"""
In-memory document store.

Engineering note: for an academic or single-user deployment this is a
valid, defensible choice — it removes the operational overhead of a database
while keeping the session lifecycle clean.  A production upgrade path would
swap this class for a SQLite or Postgres-backed equivalent without touching
any other layer.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional


class DocumentStore:
    def __init__(self) -> None:
        self._documents: Dict[str, dict] = {}

    # ── Write ──────────────────────────────────────────────────────────────

    def create(
        self,
        filename: str,
        text: str,
        chunks: List[str],
        page_count: int,
    ) -> str:
        doc_id = uuid.uuid4().hex[:10]
        self._documents[doc_id] = {
            "document_id": doc_id,
            "filename": filename,
            "text": text,
            "chunks": chunks,
            "page_count": page_count,
            "word_count": len(text.split()),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "is_analyzed": False,
            "analysis": None,
        }
        return doc_id

    def set_analysis(self, doc_id: str, analysis: dict) -> None:
        if doc_id in self._documents:
            self._documents[doc_id]["analysis"] = analysis
            self._documents[doc_id]["is_analyzed"] = True

    # ── Read ───────────────────────────────────────────────────────────────

    def get(self, doc_id: str) -> Optional[dict]:
        return self._documents.get(doc_id)

    def exists(self, doc_id: str) -> bool:
        return doc_id in self._documents


# Singleton — imported by all routers and services
document_store = DocumentStore()
