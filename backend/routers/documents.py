"""
Document router — upload, list, analyze, delete (user-scoped).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from auth.dependencies import CurrentUser
from config import settings
from models.user import UserRole
from services.analyzer import analyze_document
from services.pdf_extractor import extract_text_from_pdf
from services.text_chunker import chunk_text
from storage.document_repository import document_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    content = await file.read()

    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="File exceeds the upload size limit.")

    try:
        text, page_count = extract_text_from_pdf(content)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        logger.exception("Unexpected PDF extraction error.")
        raise HTTPException(status_code=422, detail="PDF processing failed.")

    chunks = chunk_text(text, settings.max_chunk_size, settings.chunk_overlap)
    doc = await document_repository.create(
        owner_id=current_user.id,
        original_filename=file.filename,
        pdf_bytes=content,
        text=text,
        chunks=chunks,
        page_count=page_count,
    )

    return {
        "document_id": doc["document_id"],
        "filename": doc["filename"],
        "page_count": doc["page_count"],
        "word_count": doc["word_count"],
        "upload_time": doc["uploaded_at"],
    }


@router.get("")
async def list_documents(current_user: CurrentUser):
    return await document_repository.list_for_user(current_user)


@router.post("/{document_id}/analyze")
async def analyze(document_id: str, current_user: CurrentUser):
    doc = await document_repository.get_for_user(document_id, current_user)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc["is_analyzed"] and doc["analysis"]:
        logger.info("Returning cached analysis for %s.", document_id)
        return doc["analysis"]

    try:
        analysis = await analyze_document(document_id, doc["text"])
        await document_repository.set_analysis(document_id, analysis)
        return analysis
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception:
        logger.exception("Analysis failed for document %s.", document_id)
        raise HTTPException(
            status_code=500,
            detail="Analysis failed. Check server logs and your AI API keys in backend/.env.",
        )


@router.get("/{document_id}")
async def get_document(document_id: str, current_user: CurrentUser):
    doc = await document_repository.get_for_user(document_id, current_user)
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


@router.get("/{document_id}/annotated")
async def get_annotated_document(document_id: str, current_user: CurrentUser):
    from fastapi.responses import Response
    from services.pdf_annotator import annotate_pdf_with_analysis
    from storage.file_storage import pdf_path

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
    
    return Response(
        content=annotated_pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="annotated_{doc["filename"]}"'}
    )


@router.delete("/{document_id}")
async def delete_document(document_id: str, current_user: CurrentUser):
    doc = await document_repository.get_for_user(document_id, current_user)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if current_user.role != UserRole.ADMIN and doc["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this document.")

    await document_repository.delete(document_id)
    return {"ok": True, "document_id": document_id}
