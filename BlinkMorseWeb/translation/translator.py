"""Translation utilities for Blink Morse Web.

Provides a simple interface to translate English text into
multiple Indian languages using googletrans.

This module is intentionally small and pluggable so you can
swap out the backend (e.g., IndicTrans, custom models) later
without changing the API surface.
"""
from __future__ import annotations

from typing import Dict

from googletrans import Translator


# Language codes supported by the UI
SUPPORTED_LANGUAGES: Dict[str, str] = {
    "en": "English",
    "ta": "Tamil",
    "hi": "Hindi",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "bn": "Bengali",
    "mr": "Marathi",
    "gu": "Gujarati",
}


_translator: Translator | None = None


def _get_client() -> Translator:
    """Get or create a singleton googletrans client."""
    global _translator
    if _translator is None:
        _translator = Translator()
    return _translator


def translate_text(text: str, target_language: str) -> str:
    """Translate English text into the requested language.

    Parameters
    ----------
    text:
        Source text generated from Morse code (assumed English).
    target_language:
        Language code (e.g. "en", "ta", "hi", ...).

    Returns
    -------
    str
        Translated text (or original text when target is English).

    Raises
    ------
    ValueError
        If text is empty or language is unsupported.
    RuntimeError
        If the translation service fails.
    """
    if not text or not text.strip():
        raise ValueError("Text for translation cannot be empty")

    text = text.strip()

    if target_language not in SUPPORTED_LANGUAGES:
        raise ValueError(f"Unsupported language code: {target_language}")

    # No-op for English
    if target_language == "en":
        return text

    try:
        client = _get_client()
        result = client.translate(text, src="en", dest=target_language)
        return result.text
    except Exception as exc:  # pragma: no cover - network dependency
        # Surface a clean error to the caller
        raise RuntimeError(f"Translation failed: {exc}") from exc
