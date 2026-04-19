"""
Unit tests for analyzer + AI client behavior.
"""

from __future__ import annotations

import asyncio
import json

import pytest

from services import analyzer
from services.ai_client import AIClient


def test_extract_json_with_markdown_fence():
    raw = """```json
    {"document_type":"NDA","clauses":[]}
    ```"""
    parsed = analyzer._extract_json(raw)
    assert parsed["document_type"] == "NDA"
    assert parsed["clauses"] == []


def test_extract_json_invalid_input():
    with pytest.raises(ValueError, match="No JSON object found"):
        analyzer._extract_json("there is no json here")


def test_normalise_analysis_applies_defaults():
    result = analyzer._normalise_analysis({"overall_risk_level": "bad-value"}, "doc123")
    assert result["document_id"] == "doc123"
    assert result["overall_risk_level"] == "medium"
    assert isinstance(result["clauses"], list)
    assert "analyzed_at" in result


def test_analyze_document_with_mocked_ai_response(monkeypatch: pytest.MonkeyPatch):
    async def fake_complete(messages, json_mode, temperature, max_tokens):  # noqa: ANN001
        # Ensure analyzer is calling AI client with expected parameters.
        assert messages[0]["role"] == "system"
        assert json_mode is True
        assert temperature == 0.05
        assert max_tokens == 4000
        return json.dumps(
            {
                "document_type": "Service Agreement",
                "summary": "A simple services agreement.",
                "key_parties": ["Alpha Corp", "Beta LLC"],
                "effective_date": "2026-01-01",
                "overall_risk_score": 35,
                "overall_risk_level": "medium",
                "clauses": [{"title": "Termination", "text": "Either party may terminate."}],
            }
        )

    monkeypatch.setattr(analyzer.ai_client, "complete", fake_complete)

    result = asyncio.run(analyzer.analyze_document("doc-1", "Some legal text for analysis."))

    assert result["document_id"] == "doc-1"
    assert result["document_type"] == "Service Agreement"
    assert result["overall_risk_level"] == "medium"
    assert result["clauses"][0]["id"] == "clause_1"


def test_analyze_document_truncates_large_input(monkeypatch: pytest.MonkeyPatch):
    captured = {"user_prompt": ""}

    async def fake_complete(messages, json_mode, temperature, max_tokens):  # noqa: ANN001
        captured["user_prompt"] = messages[1]["content"]
        return '{"document_type":"NDA","summary":"ok","key_parties":[],"overall_risk_score":10,"overall_risk_level":"low","clauses":[]}'

    monkeypatch.setattr(analyzer.ai_client, "complete", fake_complete)

    very_large_text = "word " * 9005
    result = asyncio.run(analyzer.analyze_document("big-doc", very_large_text))

    # Keep this assertion beginner-friendly: check approximate size, not exact prompt text.
    assert len(captured["user_prompt"].split()) <= 8_010
    assert result["document_id"] == "big-doc"


def test_ai_client_raises_when_no_provider_configured(monkeypatch: pytest.MonkeyPatch):
    # Force "no providers configured" branch.
    monkeypatch.setattr("services.ai_client.settings.groq_api_key", "")
    monkeypatch.setattr("services.ai_client.settings.openrouter_api_key", "")

    client = AIClient()

    with pytest.raises(RuntimeError, match="No AI provider is configured"):
        asyncio.run(client.complete([{"role": "user", "content": "hello"}]))
