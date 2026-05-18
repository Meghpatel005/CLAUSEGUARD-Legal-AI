"""
Document router — upload, list, analyze, delete (user-scoped).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import Response

from auth.dependencies import CurrentUser
from config import settings
from models.user import UserRole
from services.analysis_worker import run_analysis_job, schedule_analysis
from services.audit import log_audit
from services.pdf_extractor import extract_text_from_pdf
from services.text_chunker import chunk_text
from storage.document_repository import document_repository
from storage.file_storage import pdf_path
from utils.pdf_validation import validate_pdf_upload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
    request: Request,
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    content = await file.read()

    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="File exceeds the upload size limit.")

    try:
        validate_pdf_upload(content, file.content_type, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        text, page_count, page_texts = extract_text_from_pdf(content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        logger.exception("Unexpected PDF extraction error.")
        raise HTTPException(status_code=422, detail="PDF processing failed.")

    chunks = chunk_text(text, settings.max_chunk_size, settings.chunk_overlap)
    doc = await document_repository.create(
        owner_id=current_user.id,
        original_filename=file.filename or "document.pdf",
        pdf_bytes=content,
        text=text,
        chunks=chunks,
        page_count=page_count,
        page_texts=page_texts,
    )

    await log_audit(
        request=request,
        user_id=current_user.id,
        action="document.upload",
        resource_type="document",
        resource_id=doc["document_id"],
        metadata={"filename": file.filename, "page_count": page_count},
    )

    return {
        "document_id": doc["document_id"],
        "filename": doc["filename"],
        "page_count": page_count,
        "word_count": doc["word_count"],
        "upload_time": doc["uploaded_at"],
    }


@router.get("")
async def list_documents(request: Request, current_user: CurrentUser):
    docs = await document_repository.list_for_user(current_user)
    await log_audit(
        request=request,
        user_id=current_user.id,
        action="document.list",
        resource_type="document",
    )
    return docs


@router.post("/{document_id}/analyze")
async def analyze(request: Request, document_id: str, current_user: CurrentUser):
    doc = await document_repository.get_for_user(document_id, current_user)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc["is_analyzed"] and doc["analysis"]:
        return doc["analysis"]

    status = doc.get("status", "uploaded")
    if status == "processing":
        return {
            "document_id": document_id,
            "status": "processing",
            "message": "Analysis is already in progress.",
        }

    if settings.analysis_sync:
        await run_analysis_job(document_id, doc["text"])
        updated = await document_repository.get_for_user(document_id, current_user)
        if updated and updated.get("status") == "failed":
            raise HTTPException(
                status_code=503,
                detail=updated.get("analysis_error") or "Analysis failed.",
            )
        await log_audit(
            request=request,
            user_id=current_user.id,
            action="document.analyze",
            resource_type="document",
            resource_id=document_id,
        )
        return updated["analysis"] if updated else None

    schedule_analysis(document_id, doc["text"])
    await log_audit(
        request=request,
        user_id=current_user.id,
        action="document.analyze_queued",
        resource_type="document",
        resource_id=document_id,
    )

    return {
        "document_id": document_id,
        "status": "processing",
        "message": "Analysis started. Poll GET /api/documents/{id} for results.",
    }


@router.get("/{document_id}")
async def get_document(request: Request, document_id: str, current_user: CurrentUser):
    doc = await document_repository.get_for_user(document_id, current_user)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    await log_audit(
        request=request,
        user_id=current_user.id,
        action="document.read",
        resource_type="document",
        resource_id=document_id,
    )

    return {
        "document_id": doc["document_id"],
        "filename": doc["filename"],
        "page_count": doc["page_count"],
        "word_count": doc["word_count"],
        "uploaded_at": doc["uploaded_at"],
        "is_analyzed": doc["is_analyzed"],
        "status": doc.get("status"),
        "analysis_status": doc.get("analysis_status"),
        "analysis_error": doc.get("analysis_error"),
        "analysis": doc["analysis"],
    }


@router.get("/{document_id}/annotated")
async def get_annotated_document(
    request: Request, document_id: str, current_user: CurrentUser
):
    from services.pdf_annotator import annotate_pdf_with_analysis

    doc = await document_repository.get_for_user(document_id, current_user)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not doc.get("is_analyzed") or not doc.get("analysis"):
        raise HTTPException(status_code=400, detail="Document has not been analyzed yet.")

    path = pdf_path(doc["stored_filename"])
    if not path.is_file():
        raise HTTPException(status_code=404, detail="PDF file not found on disk.")

    original_pdf_bytes = path.read_bytes()
    annotated_pdf_bytes = annotate_pdf_with_analysis(original_pdf_bytes, doc["analysis"])

    await log_audit(
        request=request,
        user_id=current_user.id,
        action="document.annotated_download",
        resource_type="document",
        resource_id=document_id,
    )

    return Response(
        content=annotated_pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="annotated_{doc["filename"]}"'
        },
    )


@router.delete("/{document_id}")
async def delete_document(
    request: Request, document_id: str, current_user: CurrentUser
):
    doc = await document_repository.get_for_user(document_id, current_user)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if current_user.role != UserRole.ADMIN and doc["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this document.")

    await document_repository.delete(document_id)
    await log_audit(
        request=request,
        user_id=current_user.id,
        action="document.delete",
        resource_type="document",
        resource_id=document_id,
    )
    return {"ok": True, "document_id": document_id}
