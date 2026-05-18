"""
Lightweight in-memory rate limiting middleware.
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable, DefaultDict, Tuple

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import settings

# (client_key, path_prefix) -> list[timestamps]
_buckets: DefaultDict[Tuple[str, str], list[float]] = defaultdict(list)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _path_bucket(path: str) -> str:
    if "/analyze" in path:
        return "analyze"
    if path.startswith("/api/auth"):
        return "auth"
    return "default"


def _limit_for_bucket(bucket: str) -> Tuple[int, int]:
    """Return (max_requests, window_seconds)."""
    if bucket == "analyze":
        return (15, 3600)
    if bucket == "auth":
        return (30, 60)
    return (120, 60)


def _allow(key: Tuple[str, str]) -> bool:
    bucket_type = key[1]
    max_req, window = _limit_for_bucket(bucket_type)
    now = time.time()
    window_start = now - window
    hits = [t for t in _buckets[key] if t > window_start]
    if len(hits) >= max_req:
        _buckets[key] = hits
        return False
    hits.append(now)
    _buckets[key] = hits
    return True


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not settings.rate_limit_enabled:
            return await call_next(request)

        if request.url.path in ("/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        bucket = _path_bucket(request.url.path)
        key = (_client_key(request), bucket)
        if not _allow(key):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
            )
        return await call_next(request)


def register_rate_limiting(app) -> None:
    app.add_middleware(RateLimitMiddleware)
