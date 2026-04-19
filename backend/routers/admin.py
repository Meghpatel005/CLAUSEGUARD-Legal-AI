"""
Admin router.

Simple, mock-friendly endpoints for project administration.
No authentication layer is applied by design for this assignment scope.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from storage.document_store import document_store

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
async def list_users():
    """
    Return a mock list of users.
    """
    return [
        {"id": "u1", "name": "Admin User", "email": "admin@clauseguard.local", "role": "admin"},
        {"id": "u2", "name": "Demo Reviewer", "email": "reviewer@clauseguard.local", "role": "reviewer"},
    ]


@router.get("/documents")
async def list_documents():
    """
    Return all documents currently in the in-memory store.
    """
    docs = document_store.list_all()
    return {
        "total": len(docs),
        "documents": [
            {
                "document_id": doc["document_id"],
                "filename": doc["filename"],
                "page_count": doc["page_count"],
                "word_count": doc["word_count"],
                "uploaded_at": doc["uploaded_at"],
                "is_analyzed": doc["is_analyzed"],
            }
            for doc in docs
        ],
    }


@router.delete("/document/{document_id}")
async def delete_document(document_id: str):
    """
    Delete a stored document by ID.
    """
    deleted = document_store.delete(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document deleted successfully.", "document_id": document_id}
