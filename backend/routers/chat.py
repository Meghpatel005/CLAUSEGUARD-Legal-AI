"""
Chat router — RAG-grounded Q&A with persistent MongoDB history.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from auth.dependencies import CurrentUser
from config import settings
from models.schemas import ChatHistoryResponse, ChatMessage, ChatRequest, ChatResponse
from services.ai_client import ai_client
from services.retriever import retrieve_relevant_chunks
from storage.chat_repository import chat_repository
from storage.document_repository import document_repository

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


@router.get("")
async def list_chat_threads(current_user: CurrentUser):
    """List document chat threads for the current user."""
    return await chat_repository.list_threads_for_user(current_user.id)


@router.get("/{document_id}", response_model=ChatHistoryResponse)
async def get_chat_history(document_id: str, current_user: CurrentUser):
    doc = await document_repository.get_for_user(document_id, current_user)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    stored = await chat_repository.get_messages(current_user.id, document_id)
    messages = [ChatMessage(role=m["role"], content=m["content"]) for m in stored]
    return ChatHistoryResponse(document_id=document_id, messages=messages)


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, current_user: CurrentUser) -> ChatResponse:
    doc = await document_repository.get_for_user(request.document_id, current_user)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not doc["is_analyzed"]:
        raise HTTPException(
            status_code=400,
            detail="Document must be analysed before starting a chat session.",
        )

    relevant_chunks = retrieve_relevant_chunks(
        request.message,
        doc["chunks"],
        top_k=settings.max_chunks_for_retrieval,
    )
    context = "\n\n---\n\n".join(relevant_chunks) if relevant_chunks else "(No relevant excerpts found.)"

    analysis = doc["analysis"] or {}
    system_prompt = _SYSTEM_TEMPLATE.format(
        document_type=analysis.get("document_type", "Legal Document"),
        summary=analysis.get("summary", ""),
        context=context,
    )

    # Prefer persisted history; fall back to client-sent history for compatibility
    persisted = await chat_repository.get_messages(current_user.id, request.document_id)
    if persisted:
        history = persisted
    else:
        history = [{"role": m.role, "content": m.content} for m in request.history]

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-8:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
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
    except Exception:
        logger.exception("Chat completion failed.")
        raise HTTPException(status_code=500, detail="Chat failed.")

    await chat_repository.append_messages(
        current_user.id,
        request.document_id,
        [
            {"role": "user", "content": request.message},
            {
                "role": "assistant",
                "content": response_text,
                "sources_used": len(relevant_chunks),
            },
        ],
    )

    return ChatResponse(response=response_text, sources_used=len(relevant_chunks))
