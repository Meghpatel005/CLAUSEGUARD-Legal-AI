"""
Optional startup bootstrap (e.g. seed admin user from env).
"""

from __future__ import annotations

import logging

from config import settings
from models.user import UserCreate, UserRole
from storage.user_repository import user_repository

logger = logging.getLogger(__name__)


async def bootstrap_admin_user() -> None:
    if not settings.admin_email or not settings.admin_password:
        return

    from bson import ObjectId

    from db.connection import get_db

    email = settings.admin_email.lower().strip()
    existing = await user_repository.get_by_email(email)
    if existing:
        if existing.role != UserRole.ADMIN:
            await get_db().users.update_one(
                {"_id": ObjectId(existing.id)},
                {"$set": {"role": UserRole.ADMIN.value}},
            )
            logger.info("Promoted existing user %s to admin.", email)
        return

    await user_repository.create(
        UserCreate(
            name=settings.admin_name,
            email=email,
            password=settings.admin_password,
        ),
        role=UserRole.ADMIN,
    )
    logger.info("Bootstrap admin user created for %s.", email)
