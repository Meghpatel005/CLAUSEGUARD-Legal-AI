from __future__ import annotations

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # AI provider keys
    groq_api_key: str = ""
    openrouter_api_key: str = ""

    # Model selection
    groq_model: str = "llama-3.3-70b-versatile"
    openrouter_model: str = "deepseek/deepseek-chat"

    # Retrieval / chunking parameters
    max_chunk_size: int = 500
    chunk_overlap: int = 50
    max_chunks_for_retrieval: int = 5

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "clauseguard"

    # JWT
    jwt_secret_key: str = "change-me-in-production-use-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24

    # File uploads
    upload_dir: str = "uploads"
    max_upload_bytes: int = 20 * 1024 * 1024

    # CORS (comma-separated origins)
    cors_origins: str = (
        "http://localhost:5173,http://localhost:3000,"
        "http://127.0.0.1:5173,http://127.0.0.1:3000"
    )

    # Optional bootstrap admin (created on startup if user does not exist)
    admin_email: str = ""
    admin_password: str = ""
    admin_name: str = "Admin"

    # HttpOnly auth cookie
    auth_cookie_name: str = "clauseguard_token"
    auth_cookie_secure: bool = False  # set True behind HTTPS in production
    auth_cookie_samesite: str = "lax"

    # Background analysis (set true in tests for synchronous analyze)
    analysis_sync: bool = False

    # Rate limiting
    rate_limit_enabled: bool = True
    rate_limit_default: str = "120/minute"
    rate_limit_analyze: str = "15/hour"
    rate_limit_auth: str = "30/minute"

    # OCR (scanned PDFs) — requires: pip install pytesseract pillow && brew install tesseract
    ocr_enabled: bool = True
    ocr_dpi: int = 200

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _strip_cors(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
