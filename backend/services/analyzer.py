"""
Document analyzer.

Sends the (truncated) document text to the LLM with a structured JSON
prompt and validates the returned payload before persisting it.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict

from services.ai_client import ai_client

logger = logging.getLogger(__name__)

# Maximum words to send; keeps requests inside the model's practical context window
_MAX_ANALYSIS_WORDS = 8_000

_SYSTEM_PROMPT = """You are ClauseGuard AI, a specialist legal document analyst.
Your task is to analyse the provided document and return a single, valid JSON object.
Do NOT include any text outside the JSON object — no markdown fences, no preamble.

Return exactly this structure:

{
  "document_type": "<NDA | Employment Contract | Lease Agreement | Service Agreement | Loan Agreement | Terms of Service | other>",
  "summary": "<3-5 sentence plain-language summary of what this document does and who it binds>",
  "key_parties": ["<party name>", "<party name>"],
  "effective_date": "<ISO date string or null>",
  "overall_risk_score": <integer 0-100>,
  "overall_risk_level": "<low|medium|high|critical>",
  "lawyer_summary": {
    "quick_summary": "<A 1-2 sentence extremely simple summary for non-lawyers>",
    "why_risky": "<Explanation of main risks overall>",
    "watch_out": "<Specific gotchas to watch out for>",
    "questions_to_ask": ["<Question 1 to ask the other party>", "<Question 2>"],
    "lawyer_explanation": "<A professional, practical explanation of the contract's implications>",
    "suggested_rewrite": "<Optional suggestion on how a risky part could be renegotiated>",
    "final_recommendation": "<A clear final recommendation on whether to sign or negotiate>"
  },
  "clauses": [
    {
      "id": "clause_1",
      "title": "<concise clause name>",
      "text": "<verbatim excerpt from the document, max 200 words>",
      "risk_level": "<low|medium|high|critical>",
      "risk_reason": "<one or two sentences explaining the risk or why this clause is notable>",
      "category": "<Termination | Liability | Confidentiality | Payment | IP | Indemnification | Governing Law | Non-Compete | Warranty | other>",
      "risk_type": "<liability risk | payment risk | privacy risk | termination risk | ambiguity risk | general risk>",
      "confidence_score": <integer 0-100>
    }
  ]
}

Guidelines:
- Identify between 5 and 10 of the most legally significant clauses.
- Risk scale: low = standard/acceptable industry norm; medium = worth reviewing; high = significant concern for the signing party; critical = major legal risk or unusually one-sided.
- The summary must be understandable to a non-lawyer.
- The lawyer_summary should feel like a real lawyer explaining the risk in plain English.
- overall_risk_score should be consistent with overall_risk_level:
    low 0-25 | medium 26-50 | high 51-75 | critical 76-100
"""


def _extract_json(raw: str) -> Dict[str, Any]:
    """
    Robustly extract a JSON object from a string that may contain
    markdown fences or extra prose (common with some model variants).
    """
    # Strip ```json ... ``` fences if present
    fenced = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw)
    if fenced:
        raw = fenced.group(1)

    # Find the outermost { ... } block
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON object found in model response.")

    return json.loads(raw[start:end])


def _normalise_analysis(data: Dict[str, Any], document_id: str) -> Dict[str, Any]:
    """Ensure every required field is present with a safe default."""
    valid_risk = {"low", "medium", "high", "critical"}

    data.setdefault("document_type", "Legal Document")
    data.setdefault("summary", "Summary unavailable.")
    data.setdefault("key_parties", [])
    data.setdefault("effective_date", None)
    data.setdefault("overall_risk_score", 0)
    data.setdefault("overall_risk_level", "low")
    data.setdefault("lawyer_summary", {
        "quick_summary": "Summary not provided.",
        "why_risky": "N/A",
        "watch_out": "N/A",
        "questions_to_ask": [],
        "lawyer_explanation": "N/A",
        "suggested_rewrite": "N/A",
        "final_recommendation": "N/A"
    })
    data.setdefault("clauses", [])

    if data["overall_risk_level"] not in valid_risk:
        data["overall_risk_level"] = "medium"

    for idx, clause in enumerate(data["clauses"]):
        clause.setdefault("id", f"clause_{idx + 1}")
        clause.setdefault("title", f"Clause {idx + 1}")
        clause.setdefault("text", "")
        clause.setdefault("risk_level", "low")
        clause.setdefault("risk_reason", "")
        clause.setdefault("category", "General")
        clause.setdefault("risk_type", "general risk")
        clause.setdefault("confidence_score", 80)
        if clause["risk_level"] not in valid_risk:
            clause["risk_level"] = "medium"

    data["document_id"] = document_id
    data["analyzed_at"] = datetime.now(timezone.utc).isoformat()
    return data


async def analyze_document(document_id: str, text: str) -> Dict[str, Any]:
    """
    Run a full clause and risk analysis on *text*.

    Returns a normalised analysis dict ready to be stored and serialised.
    """
    words = text.split()
    if len(words) > _MAX_ANALYSIS_WORDS:
        logger.info(
            "Document %s truncated from %d to %d words for analysis.",
            document_id,
            len(words),
            _MAX_ANALYSIS_WORDS,
        )
        text = " ".join(words[:_MAX_ANALYSIS_WORDS])

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Analyse the following legal document:\n\n{text}",
        },
    ]

    raw = await ai_client.complete(messages, json_mode=True, temperature=0.05, max_tokens=4000)
    data = _extract_json(raw)
    return _normalise_analysis(data, document_id)
