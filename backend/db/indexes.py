from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorDatabase


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db.users.create_index("email", unique=True)
    await db.documents.create_index("owner_id")
    await db.documents.create_index([("owner_id", 1), ("upload_timestamp", -1)])
    await db.chats.create_index([("user_id", 1), ("document_id", 1)], unique=True)
    await db.chats.create_index([("user_id", 1), ("updated_at", -1)])
