from __future__ import annotations

import uuid
from pathlib import Path

from config import settings

_UPLOAD_ROOT = Path(settings.upload_dir)


def ensure_upload_dir() -> Path:
    _UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    return _UPLOAD_ROOT


def save_pdf(content: bytes, original_filename: str) -> tuple[str, Path]:
    """Persist PDF bytes; return (stored_filename, absolute_path)."""
    root = ensure_upload_dir()
    ext = ".pdf"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    path = root / stored_name
    path.write_bytes(content)
    return stored_name, path


def delete_pdf(stored_filename: str) -> None:
    path = _UPLOAD_ROOT / stored_filename
    if path.is_file():
        path.unlink()


def pdf_path(stored_filename: str) -> Path:
    return _UPLOAD_ROOT / stored_filename
