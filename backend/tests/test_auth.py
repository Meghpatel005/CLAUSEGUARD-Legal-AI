from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup_and_login(client: AsyncClient):
    signup = await client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@example.com", "password": "securepass1"},
    )
    assert signup.status_code == 201
    body = signup.json()
    assert body["access_token"]
    assert body["user"]["email"] == "alice@example.com"

    login = await client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "securepass1"},
    )
    assert login.status_code == 200
    assert login.json()["access_token"]

    me = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["name"] == "Alice"


@pytest.mark.asyncio
async def test_signup_duplicate_email(client: AsyncClient):
    payload = {"name": "Bob", "email": "bob@example.com", "password": "securepass1"}
    assert (await client.post("/api/auth/signup", json=payload)).status_code == 201
    dup = await client.post("/api/auth/signup", json=payload)
    assert dup.status_code == 400
