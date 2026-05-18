from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

from db.connection import get_db
from models.user import UserInDB, UserRole
from storage.file_storage import delete_pdf, save_pdf


def _doc_to_api(doc: dict) -> Dict[str, Any]:
    """Map MongoDB document to API-facing shape (backward compatible)."""
    doc_id = str(doc["_id"])
    analysis = doc.get("analysis")
    status = doc.get("status", "uploaded")
    is_analyzed = status == "analyzed" or analysis is not None
    return {
        "document_id": doc_id,
        "owner_id": doc["owner_id"],
        "filename": doc["original_filename"],
        "original_filename": doc["original_filename"],
        "stored_filename": doc["filename"],
        "page_count": doc["page_count"],
        "word_count": doc.get("word_count", len(doc.get("extracted_text", "").split())),
        "uploaded_at": doc["upload_timestamp"].isoformat(),
        "upload_timestamp": doc["upload_timestamp"],
        "is_analyzed": is_analyzed,
        "status": status,
        "analysis_status": status,
        "analysis_error": doc.get("analysis_error"),
        "analysis": analysis,
        "page_texts": doc.get("page_texts", []),
        "file_size": doc.get("file_size", 0),
        # Internal fields for services
        "text": doc.get("extracted_text", ""),
        "chunks": doc.get("chunks", []),
    }


class DocumentRepository:
    @property
    def _col(self):
        return get_db().documents

    async def create(
        self,
        owner_id: str,
        original_filename: str,
        pdf_bytes: bytes,
        text: str,
        chunks: List[str],
        page_count: int,
        page_texts: List[str] | None = None,
    ) -> Dict[str, Any]:
        stored_name, _path = save_pdf(pdf_bytes, original_filename)
        now = datetime.now(timezone.utc)
        doc = {
            "owner_id": owner_id,
            "filename": stored_name,
            "original_filename": original_filename,
            "upload_timestamp": now,
            "page_count": page_count,
            "extracted_text": text,
            "chunks": chunks,
            "analysis": None,
            "status": "uploaded",
            "file_size": len(pdf_bytes),
            "word_count": len(text.split()),
            "page_texts": page_texts or [],
            "analysis_error": None,
        }
        result = await self._col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _doc_to_api(doc)

    async def get(self, document_id: str) -> Optional[Dict[str, Any]]:
        oid = ObjectId(document_id) if ObjectId.is_valid(document_id) else None
        if oid is None:
            return None
        doc = await self._col.find_one({"_id": oid})
        return _doc_to_api(doc) if doc else None

    async def get_for_user(
        self, document_id: str, user: UserInDB
    ) -> Optional[Dict[str, Any]]:
        doc = await self.get(document_id)
        if not doc:
            return None
        if user.role != UserRole.ADMIN and doc["owner_id"] != user.id:
            return None
        return doc

    async def list_for_user(self, user: UserInDB) -> List[Dict[str, Any]]:
        query = {} if user.role == UserRole.ADMIN else {"owner_id": user.id}
        cursor = self._col.find(query).sort("upload_timestamp", -1)
        items: List[Dict[str, Any]] = []
        async for doc in cursor:
            api = _doc_to_api(doc)
            items.append(
                {
                    "document_id": api["document_id"],
                    "filename": api["filename"],
                    "page_count": api["page_count"],
                    "word_count": api["word_count"],
                    "uploaded_at": api["uploaded_at"],
                    "is_analyzed": api["is_analyzed"],
                    "status": api["status"],
                    "analysis_status": api["status"],
                    "analysis_error": api.get("analysis_error"),
                    "file_size": api["file_size"],
                    "owner_id": api["owner_id"],
                }
            )
        return items

    async def set_analysis_status(self, document_id: str, status: str) -> None:
        oid = ObjectId(document_id)
        await self._col.update_one(
            {"_id": oid},
            {"$set": {"status": status, "analysis_error": None}},
        )

    async def set_analysis_failed(self, document_id: str, error: str) -> None:
        oid = ObjectId(document_id)
        await self._col.update_one(
            {"_id": oid},
            {
                "$set": {
                    "status": "failed",
                    "analysis_error": error[:500],
                }
            },
        )

    async def set_analysis(self, document_id: str, analysis: dict) -> None:
        oid = ObjectId(document_id)
        await self._col.update_one(
            {"_id": oid},
            {
                "$set": {
                    "analysis": analysis,
                    "status": "analyzed",
                    "analysis_error": None,
                }
            },
        )

    async def delete(self, document_id: str) -> bool:
        oid = ObjectId(document_id) if ObjectId.is_valid(document_id) else None
        if oid is None:
            return False
        doc = await self._col.find_one({"_id": oid})
        if not doc:
            return False
        delete_pdf(doc["filename"])
        await self._col.delete_one({"_id": oid})
        await get_db().chats.delete_many({"document_id": document_id})
        return True


document_repository = DocumentRepository()
