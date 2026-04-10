"""
Document router — upload and analysis endpoints.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from config import settings
from services.analyzer import analyze_document
from services.pdf_extractor import extract_text_from_pdf
from services.text_chunker import chunk_text
from storage.document_store import document_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

_MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Accept a PDF upload, extract text, chunk it, and persist it to the store.

    Returns document metadata immediately so the client can display it
    while the (separate) analysis step runs.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    content = await file.read()

    if len(content) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 20 MB limit.")

    try:
        text, page_count = extract_text_from_pdf(content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected PDF extraction error.")
        raise HTTPException(status_code=422, detail=f"PDF processing failed: {exc}")

    chunks = chunk_text(text, settings.max_chunk_size, settings.chunk_overlap)
    doc_id = document_store.create(file.filename, text, chunks, page_count)
    doc = document_store.get(doc_id)

    return {
        "document_id": doc_id,
        "filename": file.filename,
        "page_count": page_count,
        "word_count": doc["word_count"],
        "upload_time": doc["uploaded_at"],
    }


@router.post("/{document_id}/analyze")
async def analyze(document_id: str):
    """
    Run LLM analysis on an already-uploaded document.

    If the document was previously analyzed the cached result is returned
    directly, avoiding redundant API calls.
    """
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc["is_analyzed"]:
        logger.info("Returning cached analysis for %s.", document_id)
        return doc["analysis"]

    try:
        analysis = await analyze_document(document_id, doc["text"])
        document_store.set_analysis(document_id, analysis)
        return analysis
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Analysis failed for document %s.", document_id)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@router.get("/{document_id}")
async def get_document(document_id: str):
    """Return document metadata and analysis (if available)."""
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return {
        "document_id": doc["document_id"],
        "filename": doc["filename"],
        "page_count": doc["page_count"],
        "word_count": doc["word_count"],
        "uploaded_at": doc["uploaded_at"],
        "is_analyzed": doc["is_analyzed"],
        "analysis": doc["analysis"],
    }
