from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId

from db.connection import get_db


class ChatRepository:
    @property
    def _col(self):
        return get_db().chats

    async def get_thread(
        self, user_id: str, document_id: str
    ) -> Optional[Dict[str, Any]]:
        doc = await self._col.find_one(
            {"user_id": user_id, "document_id": document_id}
        )
        if not doc:
            return None
        return {
            "id": str(doc["_id"]),
            "user_id": doc["user_id"],
            "document_id": doc["document_id"],
            "messages": doc.get("messages", []),
            "created_at": doc["created_at"],
            "updated_at": doc["updated_at"],
        }

    async def get_messages(self, user_id: str, document_id: str) -> List[dict]:
        thread = await self.get_thread(user_id, document_id)
        return thread["messages"] if thread else []

    async def append_messages(
        self,
        user_id: str,
        document_id: str,
        new_messages: List[dict],
    ) -> List[dict]:
        now = datetime.now(timezone.utc)
        existing = await self._col.find_one(
            {"user_id": user_id, "document_id": document_id}
        )

        if existing:
            updated_messages = list(existing.get("messages", [])) + new_messages
            await self._col.update_one(
                {"_id": existing["_id"]},
                {"$set": {"messages": updated_messages, "updated_at": now}},
            )
            return updated_messages

        doc = {
            "user_id": user_id,
            "document_id": document_id,
            "messages": new_messages,
            "created_at": now,
            "updated_at": now,
        }
        await self._col.insert_one(doc)
        return new_messages

    async def replace_messages(
        self, user_id: str, document_id: str, messages: List[dict]
    ) -> None:
        now = datetime.now(timezone.utc)
        await self._col.update_one(
            {"user_id": user_id, "document_id": document_id},
            {
                "$set": {"messages": messages, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )

    async def list_threads_for_user(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self._col.find({"user_id": user_id}).sort("updated_at", -1)
        threads: List[Dict[str, Any]] = []
        async for doc in cursor:
            msgs = doc.get("messages", [])
            last_user = next(
                (m for m in reversed(msgs) if m.get("role") == "user"),
                None,
            )
            threads.append(
                {
                    "document_id": doc["document_id"],
                    "message_count": len(msgs),
                    "preview": (last_user or {}).get("content", "")[:72],
                    "updated_at": doc["updated_at"].isoformat(),
                }
            )
        return threads

    async def clear_thread(self, user_id: str, document_id: str) -> None:
        await self._col.update_one(
            {"user_id": user_id, "document_id": document_id},
            {"$set": {"messages": [], "updated_at": datetime.now(timezone.utc)}},
        )


chat_repository = ChatRepository()
