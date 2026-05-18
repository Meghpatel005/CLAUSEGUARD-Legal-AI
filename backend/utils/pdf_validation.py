"""PDF MIME and magic-byte validation."""

from __future__ import annotations

PDF_MAGIC = b"%PDF"
ALLOWED_MIME_TYPES = frozenset(
    {
        "application/pdf",
        "application/x-pdf",
        "application/acrobat",
        "applications/vnd.pdf",
    }
)


def validate_pdf_upload(content: bytes, content_type: str | None, filename: str | None) -> None:
    if not content:
        raise ValueError("Uploaded file is empty.")

    if not content.startswith(PDF_MAGIC):
        raise ValueError("Invalid PDF: file does not have a valid PDF signature (%PDF).")

    # Trailing junk after %%EOF is common; ensure header looks like PDF
    if len(content) < 100:
        raise ValueError("Invalid PDF: file is too small to be a valid document.")

    if filename and not filename.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are accepted.")

    if content_type:
        base = content_type.split(";")[0].strip().lower()
        if base not in ALLOWED_MIME_TYPES:
            raise ValueError(
                f"Invalid content type '{content_type}'. Expected application/pdf."
            )
