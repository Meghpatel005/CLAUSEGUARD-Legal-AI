"""Audit log persistence for security and compliance."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from db.connection import get_db


class AuditRepository:
    @property
    def _col(self):
        return get_db().audit_logs

    async def log(
        self,
        *,
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        success: bool = True,
    ) -> None:
        await self._col.insert_one(
            {
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "ip_address": ip_address,
                "metadata": metadata or {},
                "success": success,
                "timestamp": datetime.now(timezone.utc),
            }
        )


audit_repository = AuditRepository()
