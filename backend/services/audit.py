"""Audit logging helper used by routers."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Request

from storage.audit_repository import audit_repository


def client_ip(request: Request | None) -> Optional[str]:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def log_audit(
    *,
    request: Request | None,
    user_id: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    success: bool = True,
) -> None:
    await audit_repository.log(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=client_ip(request),
        metadata=metadata,
        success=success,
    )
