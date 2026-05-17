from __future__ import annotations

import os
from typing import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("MONGODB_DB_NAME", "clauseguard_test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("UPLOAD_DIR", "uploads_test")

from db.connection import get_db  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app, lifespan="on")
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


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
