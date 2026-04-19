"""
ClauseGuard AI — FastAPI application entry point.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import admin, chat, documents

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="ClauseGuard AI",
    description="Legal document analysis and clause risk assessment API.",
    version="1.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────
# Allows the Vite dev server and production build origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite default
        "http://localhost:3000",   # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(admin.router)


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "service": "ClauseGuard AI", "version": "1.0.0"}
