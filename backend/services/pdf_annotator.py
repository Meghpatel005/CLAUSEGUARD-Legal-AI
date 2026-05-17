"""
PDF Annotator using PyMuPDF (fitz).

Provides functionality to take an original PDF and an AI analysis,
and generate a new PDF with risk-based highlights and comments.
"""

from __future__ import annotations

import io
import logging
from typing import Any, Dict

import fitz

logger = logging.getLogger(__name__)

def annotate_pdf_with_analysis(pdf_bytes: bytes, analysis: Dict[str, Any]) -> bytes:
    """
    Annotate the provided PDF bytes with highlights based on the AI analysis.
    
    Colors:
      - Critical / High: Red
      - Medium: Yellow
      - Low: Green
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        logger.error("Failed to open PDF for annotation: %s", e)
        return pdf_bytes

    clauses = analysis.get("clauses", [])
    
    # RGB colors for PyMuPDF (values between 0 and 1)
    colors = {
        "critical": (1.0, 0.2, 0.2),  # Light Red
        "high": (1.0, 0.4, 0.4),      # Red
        "medium": (1.0, 0.9, 0.2),    # Yellow
        "low": (0.4, 0.9, 0.4)        # Green
    }

    for clause in clauses:
        text = clause.get("text", "").strip()
        risk_level = clause.get("risk_level", "medium")
        risk_reason = clause.get("risk_reason", "")
        title = clause.get("title", "Clause")
        
        color = colors.get(risk_level, colors["medium"])

        if not text:
            continue

        # To handle line breaks and PDF text formatting quirks, we split the 
        # clause text into smaller phrases (e.g., 5-8 words) and search for those.
        words = text.split()
        if not words:
            continue
            
        chunk_size = 6
        phrases = [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]
        
        clause_annotated = False

        for page in doc:
            for i, phrase in enumerate(phrases):
                clean_phrase = phrase.replace('\n', ' ').strip()
                # Skip very short fragments that might match randomly
                if len(clean_phrase) < 6:
                    continue
                
                # quads=True provides quadrilateral coordinates, better for text that might be slightly angled or multi-line
                instances = page.search_for(clean_phrase, quads=True)
                
                for inst in instances:
                    # Add highlight
                    highlight = page.add_highlight_annot(inst)
                    highlight.set_colors(stroke=color)
                    highlight.update()
                    
                    # Add a popup note to the first found instance of this clause
                    if not clause_annotated and risk_level in ["high", "critical"]:
                        # Use the top-left point of the quad to place the note
                        point = inst[0] if isinstance(inst, list) else inst.ul
                        note = page.add_text_annot(point, f"[{risk_level.upper()} RISK] {title}\n\n{risk_reason}")
                        note.update()
                        clause_annotated = True

    try:
        out_buffer = io.BytesIO()
        doc.save(out_buffer)
        doc.close()
        return out_buffer.getvalue()
    except Exception as e:
        logger.error("Failed to save annotated PDF: %s", e)
        return pdf_bytes
