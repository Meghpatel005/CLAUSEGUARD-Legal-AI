"""
MongoDB connection manager (Motor async driver).
"""

from __future__ import annotations

import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import settings

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def init_db() -> AsyncIOMotorDatabase:
    """Connect to MongoDB and ensure indexes."""
    global _client, _db

    if _db is not None:
        return _db

    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _db = _client[settings.mongodb_db_name]

    await _client.admin.command("ping")
    logger.info("Connected to MongoDB database '%s'.", settings.mongodb_db_name)

    from db.indexes import ensure_indexes

    await ensure_indexes(_db)
    return _db


async def close_db() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
        logger.info("MongoDB connection closed.")
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database is not initialized. Call init_db() on application startup.")
    return _db
