"""
Admin router — list users/documents, delete any document.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from auth.dependencies import AdminUser
from storage.document_repository import document_repository
from storage.user_repository import user_repository

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
async def list_users(_admin: AdminUser):
    return await user_repository.list_all()


@router.get("/documents")
async def list_all_documents(_admin: AdminUser):
    return await document_repository.list_for_user(_admin)


@router.delete("/documents/{document_id}")
async def admin_delete_document(document_id: str, _admin: AdminUser):
    deleted = await document_repository.delete(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"ok": True, "document_id": document_id}
