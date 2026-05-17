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

    email = settings.admin_email.lower().strip()
    existing = await user_repository.get_by_email(email)
    if existing:
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
