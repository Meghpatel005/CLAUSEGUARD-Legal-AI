"""
AI client abstraction.

Primary provider : Groq  (llama-3.3-70b-versatile — fast, large context)
Fallback provider: OpenRouter (DeepSeek / Gemini via standard OpenAI schema)

The two-tier fallback means the application stays operational even during
Groq rate-limit windows, which is an important resilience property.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import httpx
from groq import AsyncGroq

from config import settings

logger = logging.getLogger(__name__)

_OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"


class AIClient:
    def __init__(self) -> None:
        self._groq: Optional[AsyncGroq] = (
            AsyncGroq(api_key=settings.groq_api_key)
            if settings.groq_api_key
            else None
        )

    # ── Public interface ───────────────────────────────────────────────────

    async def complete(
        self,
        messages: List[Dict[str, str]],
        *,
        json_mode: bool = False,
        temperature: float = 0.1,
        max_tokens: int = 4000,
    ) -> str:
        """
        Request a completion, trying Groq first then OpenRouter.

        Args:
            messages:    OpenAI-compatible message list.
            json_mode:   Ask the model to return valid JSON only.
            temperature: Sampling temperature.
            max_tokens:  Maximum response tokens.

        Returns:
            Raw text content of the model's response.

        Raises:
            RuntimeError: if no provider is configured or both fail.
        """
        if self._groq and settings.groq_api_key:
            try:
                return await self._groq_complete(
                    messages, json_mode, temperature, max_tokens
                )
            except Exception as exc:
                err_text = str(exc).lower()
                if "invalid_api_key" in err_text or "invalid api key" in err_text:
                    logger.warning("Groq API key rejected. Falling back to OpenRouter.")
                else:
                    logger.warning("Groq request failed (%s). Falling back to OpenRouter.", exc)

        if settings.openrouter_api_key:
            try:
                return await self._openrouter_complete(
                    messages, json_mode, temperature, max_tokens
                )
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 401:
                    raise RuntimeError(
                        "OpenRouter rejected the API key (401). "
                        "Check OPENROUTER_API_KEY in backend/.env — it should start with sk-or-v1-."
                    ) from exc
                raise RuntimeError(
                    f"OpenRouter request failed ({exc.response.status_code})."
                ) from exc

        raise RuntimeError(
            "No AI provider is configured. "
            "Set GROQ_API_KEY and/or OPENROUTER_API_KEY in your .env file."
        )

    # ── Provider implementations ───────────────────────────────────────────

    async def _groq_complete(
        self,
        messages: List[Dict],
        json_mode: bool,
        temperature: float,
        max_tokens: int,
    ) -> str:
        kwargs: Dict[str, Any] = dict(
            model=settings.groq_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self._groq.chat.completions.create(**kwargs)
        return response.choices[0].message.content

    async def _openrouter_complete(
        self,
        messages: List[Dict],
        json_mode: bool,
        temperature: float,
        max_tokens: int,
    ) -> str:
        payload: Dict[str, Any] = {
            "model": settings.openrouter_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                _OPENROUTER_BASE,
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://clauseguard.local",
                    "X-Title": "ClauseGuard AI",
                },
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]


# Module-level singleton
ai_client = AIClient()
