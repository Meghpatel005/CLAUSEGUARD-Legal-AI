"""
Chat router.

Implements RAG-lite: the top-k most relevant document chunks are injected
into the system prompt on every turn.  This keeps the implementation
stateless on the server side (no retrieval index to maintain) while
grounding the model firmly in the uploaded document.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from config import settings
from models.schemas import ChatRequest, ChatResponse
from services.ai_client import ai_client
from services.retriever import retrieve_relevant_chunks
from storage.document_store import document_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

_SYSTEM_TEMPLATE = """\
You are ClauseGuard AI, a precise and professional legal document assistant.
The user has uploaded a legal document for review.

Document type  : {document_type}
Document summary:
{summary}

The following excerpts from the document are most relevant to the user's question.
Use them — and only them — to construct your answer:

────────────────────────────────────────────────────────────
{context}
────────────────────────────────────────────────────────────

Instructions:
• Answer based strictly on the excerpts above.
• If the information is not in the excerpts, say so explicitly.
• Be concise, professional, and precise.
• When referencing a clause, quote briefly and explain plainly.
• Do not speculate or add information absent from the document.
"""


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Respond to a user question grounded in the uploaded document.

    Retrieves the most relevant chunks via TF-IDF, builds a context-rich
    system prompt, and delegates generation to the AI client.
    """
    doc = document_store.get(request.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not doc["is_analyzed"]:
        raise HTTPException(
            status_code=400,
            detail="Document must be analysed before starting a chat session.",
        )

    # Retrieve top-k relevant chunks for this question
    relevant_chunks = retrieve_relevant_chunks(
        request.message,
        doc["chunks"],
        top_k=settings.max_chunks_for_retrieval,
    )
    context = "\n\n---\n\n".join(relevant_chunks) if relevant_chunks else "(No relevant excerpts found.)"

    analysis = doc["analysis"]
    system_prompt = _SYSTEM_TEMPLATE.format(
        document_type=analysis.get("document_type", "Legal Document"),
        summary=analysis.get("summary", ""),
        context=context,
    )

    # Build message list: system + last 8 history turns + current message
    messages = [{"role": "system", "content": system_prompt}]
    for msg in request.history[-8:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})

    try:
        response_text = await ai_client.complete(
            messages,
            json_mode=False,
            temperature=0.2,
            max_tokens=1024,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Chat completion failed.")
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}")

    return ChatResponse(response=response_text, sources_used=len(relevant_chunks))
