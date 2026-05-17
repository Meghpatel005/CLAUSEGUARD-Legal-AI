"""
ClauseGuard AI — FastAPI application entry point.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.connection import close_db, init_db
from middleware.exception_handlers import register_exception_handlers
from routers import admin, auth, chat, documents
from services.bootstrap import bootstrap_admin_user
from storage.file_storage import ensure_upload_dir

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_upload_dir()
    await init_db()
    await bootstrap_admin_user()
    yield
    await close_db()


app = FastAPI(
    title="ClauseGuard AI",
    description="Legal document analysis and clause risk assessment API.",
    version="2.0.0",
    lifespan=lifespan,
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(admin.router)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "service": "ClauseGuard AI", "version": "2.0.0"}
