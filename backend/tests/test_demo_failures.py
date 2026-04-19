"""
Demo failure tests for report screenshots.

These are marked xfail so they do not break normal CI runs.
If you want to force real failures in output screenshots, run with:
    pytest tests/test_demo_failures.py --runxfail -v
"""

from __future__ import annotations

import pytest


@pytest.mark.xfail(strict=True, reason="Demo fail case: expected mismatch example")
def test_demo_failure_wrong_math_expectation():
    assert 2 + 2 == 5


@pytest.mark.xfail(strict=True, reason="Demo fail case: wrong status code example")
def test_demo_failure_wrong_status_code_expectation(client):
    response = client.get("/health")
    assert response.status_code == 500


@pytest.mark.xfail(strict=True, reason="Demo fail case: wrong string content example")
def test_demo_failure_wrong_content_expectation():
    output = "ClauseGuard AI"
    assert "Production Ready Audit" in output
