from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


# ── Enums ──────────────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ── Domain models ──────────────────────────────────────────────────────────

class Clause(BaseModel):
    id: str
    title: str
    text: str
    risk_level: RiskLevel
    risk_reason: str
    category: str


# ── API response shapes ─────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    document_id: str
    filename: str
    page_count: int
    word_count: int
    upload_time: str


class AnalysisResponse(BaseModel):
    document_id: str
    document_type: str
    summary: str
    key_parties: List[str]
    effective_date: Optional[str] = None
    clauses: List[Clause]
    overall_risk_score: int   # 0–100
    overall_risk_level: RiskLevel
    analyzed_at: str


class DocumentStatusResponse(BaseModel):
    document_id: str
    filename: str
    page_count: int
    word_count: int
    uploaded_at: str
    is_analyzed: bool
    analysis: Optional[AnalysisResponse] = None


# ── Chat ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str    # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    document_id: str
    message: str
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    response: str
    sources_used: int


class ChatHistoryResponse(BaseModel):
    document_id: str
    messages: List[ChatMessage]


class DocumentListItem(BaseModel):
    document_id: str
    filename: str
    page_count: int
    word_count: int
    uploaded_at: str
    is_analyzed: bool
    status: str
    file_size: int
    owner_id: Optional[str] = None
