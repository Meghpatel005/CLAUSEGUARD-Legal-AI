"""
Integration/API tests for documents and chat routers.
"""

from __future__ import annotations

from storage.document_store import document_store


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_upload_document_success(client, monkeypatch, sample_pdf_bytes):
    monkeypatch.setattr("routers.documents.extract_text_from_pdf", lambda _: ("alpha beta gamma", 2))
    monkeypatch.setattr("routers.documents.chunk_text", lambda text, size, overlap: [text[:5], text[6:]])

    response = client.post(
        "/api/documents/upload",
        files={"file": ("contract.pdf", sample_pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert "document_id" in data
    assert data["filename"] == "contract.pdf"
    assert data["page_count"] == 2
    assert data["word_count"] == 3


def test_upload_document_rejects_non_pdf(client):
    response = client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )
    assert response.status_code == 400
    assert "Only PDF files are accepted" in response.json()["detail"]


def test_upload_document_handles_empty_extraction(client, monkeypatch, sample_pdf_bytes):
    def raise_no_text(_: bytes):
        raise ValueError("No extractable text found.")

    monkeypatch.setattr("routers.documents.extract_text_from_pdf", raise_no_text)

    response = client.post(
        "/api/documents/upload",
        files={"file": ("empty.pdf", sample_pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 422
    assert "No extractable text found" in response.json()["detail"]


def test_analyze_endpoint_success(client, monkeypatch):
    doc_id = document_store.create("doc.pdf", "hello world", ["hello world"], 1)

    async def fake_analyze(document_id: str, text: str):
        assert document_id == doc_id
        assert text == "hello world"
        return {
            "document_id": document_id,
            "document_type": "NDA",
            "summary": "Mock summary",
            "key_parties": ["A", "B"],
            "effective_date": None,
            "overall_risk_score": 22,
            "overall_risk_level": "low",
            "clauses": [],
            "analyzed_at": "2026-01-01T00:00:00Z",
        }

    monkeypatch.setattr("routers.documents.analyze_document", fake_analyze)

    response = client.post(f"/api/documents/{doc_id}/analyze")
    assert response.status_code == 200
    assert response.json()["document_id"] == doc_id
    assert response.json()["document_type"] == "NDA"


def test_chat_endpoint_success(client, monkeypatch):
    doc_id = document_store.create(
        "agreement.pdf",
        "Payment and termination clauses",
        ["Payment is due in 30 days.", "Either party may terminate with notice."],
        1,
    )
    document_store.set_analysis(
        doc_id,
        {
            "document_id": doc_id,
            "document_type": "Service Agreement",
            "summary": "Agreement between two parties.",
            "key_parties": ["Alpha", "Beta"],
            "effective_date": None,
            "overall_risk_score": 30,
            "overall_risk_level": "medium",
            "clauses": [],
            "analyzed_at": "2026-01-01T00:00:00Z",
        },
    )

    monkeypatch.setattr("routers.chat.retrieve_relevant_chunks", lambda query, chunks, top_k: chunks[:1])

    async def fake_complete(messages, json_mode, temperature, max_tokens):  # noqa: ANN001
        assert messages[0]["role"] == "system"
        assert json_mode is False
        return "The payment term is net 30 days."

    monkeypatch.setattr("routers.chat.ai_client.complete", fake_complete)

    response = client.post(
        "/api/chat",
        json={"document_id": doc_id, "message": "What are the payment terms?", "history": []},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "The payment term is net 30 days."
    assert data["sources_used"] == 1


def test_chat_endpoint_requires_analysis(client):
    doc_id = document_store.create("agreement.pdf", "raw text", ["raw text"], 1)

    response = client.post(
        "/api/chat",
        json={"document_id": doc_id, "message": "Any risk?", "history": []},
    )

    assert response.status_code == 400
    assert "must be analysed" in response.json()["detail"]


def test_admin_documents_list_and_delete(client):
    doc_id = document_store.create("admin-doc.pdf", "text body", ["text body"], 1)

    list_response = client.get("/api/admin/documents")
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload["total"] == 1
    assert payload["documents"][0]["document_id"] == doc_id

    delete_response = client.delete(f"/api/admin/document/{doc_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["document_id"] == doc_id

    not_found_response = client.delete(f"/api/admin/document/{doc_id}")
    assert not_found_response.status_code == 404


def test_admin_users_mock_endpoint(client):
    response = client.get("/api/admin/users")
    assert response.status_code == 200
    users = response.json()
    assert isinstance(users, list)
    assert len(users) >= 1
    assert "email" in users[0]
