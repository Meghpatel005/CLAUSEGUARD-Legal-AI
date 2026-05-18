from __future__ import annotations

import os
from typing import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("MONGODB_DB_NAME", "clauseguard_test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("UPLOAD_DIR", "uploads_test")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("ANALYSIS_SYNC", "true")
os.environ["ADMIN_EMAIL"] = ""
os.environ["ADMIN_PASSWORD"] = ""

from db.connection import close_db, get_db, init_db  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await close_db()


@pytest.fixture(autouse=True)
async def wipe_db(client: AsyncClient):
    db = get_db()
    for name in ("users", "documents", "chats"):
        await db[name].delete_many({})
    yield


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    res = await client.post(
        "/api/auth/signup",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "testpass12",
        },
    )
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
