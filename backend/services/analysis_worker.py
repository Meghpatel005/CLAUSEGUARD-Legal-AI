"""
Background analysis jobs (in-process asyncio tasks).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Set

from services.analyzer import analyze_document
from storage.document_repository import document_repository

logger = logging.getLogger(__name__)

_running: Set[str] = set()
_lock = asyncio.Lock()


async def run_analysis_job(document_id: str, text: str) -> None:
    async with _lock:
        if document_id in _running:
            return
        _running.add(document_id)

    try:
        await document_repository.set_analysis_status(document_id, "processing")
        analysis = await analyze_document(document_id, text)
        await document_repository.set_analysis(document_id, analysis)
        logger.info("Background analysis completed for %s.", document_id)
    except Exception as exc:
        logger.exception("Background analysis failed for %s.", document_id)
        await document_repository.set_analysis_failed(document_id, str(exc))
    finally:
        async with _lock:
            _running.discard(document_id)


def schedule_analysis(document_id: str, text: str) -> None:
    asyncio.create_task(run_analysis_job(document_id, text))
