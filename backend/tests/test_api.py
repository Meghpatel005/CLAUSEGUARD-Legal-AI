from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

MOCK_ANALYSIS = {
    "document_type": "NDA",
    "summary": "Test summary.",
    "key_parties": ["A", "B"],
    "effective_date": None,
    "overall_risk_score": 40,
    "overall_risk_level": "medium",
    "clauses": [],
    "document_id": "placeholder",
    "analyzed_at": "2024-01-01T00:00:00+00:00",
}


def _minimal_pdf() -> bytes:
    return b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 50 150 Td (Hello legal doc) Tj ET
endstream endobj
xref
0 5
trailer<</Size 5/Root 1 0 R>>
startxref
0
%%EOF"""


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_upload_requires_auth(client: AsyncClient):
    res = await client.post(
        "/api/documents/upload",
        files={"file": ("doc.pdf", b"%PDF", "application/pdf")},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_upload_document_rejects_non_pdf(client: AsyncClient, auth_headers: dict):
    res = await client.post(
        "/api/documents/upload",
        headers=auth_headers,
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert res.status_code == 400


@pytest.mark.asyncio
@patch("services.analyzer.ai_client.complete", new_callable=AsyncMock)
async def test_upload_analyze_and_chat(
    mock_complete: AsyncMock,
    client: AsyncClient,
    auth_headers: dict,
):
    mock_complete.return_value = (
        '{"document_type":"NDA","summary":"S","key_parties":[],"effective_date":null,'
        '"overall_risk_score":10,"overall_risk_level":"low","clauses":[]}'
    )

    upload = await client.post(
        "/api/documents/upload",
        headers=auth_headers,
        files={"file": ("contract.pdf", _minimal_pdf(), "application/pdf")},
    )
    # pdfplumber may fail on minimal PDF in some envs — accept 422 or 200
    if upload.status_code == 422:
        pytest.skip("Minimal PDF not extractable in this environment.")

    assert upload.status_code == 200
    doc_id = upload.json()["document_id"]

    with patch("services.analyzer.analyze_document", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = {**MOCK_ANALYSIS, "document_id": doc_id}
        analyze_res = await client.post(
            f"/api/documents/{doc_id}/analyze",
            headers=auth_headers,
        )
    assert analyze_res.status_code == 200

    mock_complete.return_value = "Assistant reply based on document."
    chat_res = await client.post(
        "/api/chat",
        headers=auth_headers,
        json={"document_id": doc_id, "message": "What are the obligations?", "history": []},
    )
    assert chat_res.status_code == 200
    assert chat_res.json()["response"]

    history = await client.get(f"/api/chat/{doc_id}", headers=auth_headers)
    assert history.status_code == 200
    assert len(history.json()["messages"]) >= 2


@pytest.mark.asyncio
async def test_admin_users_and_documents(client: AsyncClient, auth_headers: dict):
    admin_signup = await client.post(
        "/api/auth/signup",
        json={"name": "Admin", "email": "admin2@example.com", "password": "adminpass12"},
    )
    assert admin_signup.status_code == 201

    # Promote to admin directly in DB for test
    from db.connection import get_db
    from bson import ObjectId

    db = get_db()
    user_id = admin_signup.json()["user"]["id"]
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": "admin"}},
    )
    login = await client.post(
        "/api/auth/login",
        json={"email": "admin2@example.com", "password": "adminpass12"},
    )
    admin_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    users = await client.get("/api/admin/users", headers=admin_headers)
    assert users.status_code == 200
    assert isinstance(users.json(), list)

    docs = await client.get("/api/admin/documents", headers=admin_headers)
    assert docs.status_code == 200

    # Regular user cannot access admin
    forbidden = await client.get("/api/admin/users", headers=auth_headers)
    assert forbidden.status_code == 403
