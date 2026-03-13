"""IndicF5 Text-to-Speech integration for Blink Morse Web.

This module wraps the AI4Bharat IndicF5 model and exposes a
small API tailored for the web backend:

    generate_speech(text: str, language: str) -> str

The function converts text into speech for the requested
language and saves it to ``static/audio/output.wav``.

Notes
-----
- This uses the Hugging Face "ai4bharat/IndicF5" model via
  ``transformers.AutoModel`` with ``trust_remote_code=True``.
- IndicF5 is prompt-based: every synthesis call needs a
  reference audio and its transcript. To keep this module
  generic, you should configure a small set of reference
  prompts per language on your system.

Configuration
-------------
Reference prompts are looked up from the environment using
``INDICF5_PROMPTS_DIR`` (directory containing the ``prompts``
folder from the IndicF5 repo). For each language code we map
one reference WAV and its reference text.

If you have the IndicF5 repo checked out next to this project,
set, for example::

    INDICF5_PROMPTS_DIR=/path/to/IndicF5/prompts

You can then edit the ``_PROMPT_CONFIG`` mapping below to
point to actual files from that directory.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict

import numpy as np
import soundfile as sf
from transformers import AutoModel  # type: ignore[import]

from backend.config import STATIC_AUDIO_DIR


MODEL_ID = "ai4bharat/IndicF5"
OUTPUT_FILENAME = "output.wav"


@dataclass
class PromptConfig:
    """Configuration for a single language prompt."""

    ref_audio_path: str
    ref_text: str


# Basic mapping from UI language codes to IndicF5 prompt files.
#
# IMPORTANT: You MUST update these entries to point to real
# prompt WAV files and their exact transcripts from your local
# IndicF5 checkout. The default values below are placeholders
# and will raise a clear error until you change them.
_PROMPT_CONFIG: Dict[str, PromptConfig] = {}


class IndicF5Engine:
    """Singleton wrapper around the IndicF5 model.

    The model is loaded once into memory and reused for all
    requests to avoid heavy reload overhead.
    """

    def __init__(self) -> None:
        prompts_dir = os.getenv("INDICF5_PROMPTS_DIR", "").strip()
        if not prompts_dir:
            raise RuntimeError(
                "INDICF5_PROMPTS_DIR is not set. Please set it to the "
                "path containing the 'prompts' folder from the IndicF5 repo."
            )

        # Build prompt config mapping lazily from the environment path.
        # You should replace the filenames and reference texts to match
        # the actual prompts you have available.
        global _PROMPT_CONFIG
        if not _PROMPT_CONFIG:
            _PROMPT_CONFIG = {
                # NOTE: All filenames and texts below are placeholders.
                # Update each "*_PROMPT_*.wav" to a real file that exists
                # under INDICF5_PROMPTS_DIR and set ref_text to the exact
                # transcript of that audio.
                #
                # You do not need to configure every language; configure
                # only the ones you plan to use.

                # English (fallback / testing; any clear English prompt)
                "en": PromptConfig(
                    ref_audio_path=os.path.join(
                        prompts_dir, "EN_PROMPT_NEUTRAL_00001.wav"
                    ),
                    ref_text="<UPDATE WITH ENGLISH PROMPT TRANSCRIPT>",
                ),

                # Hindi
                "hi": PromptConfig(
                    ref_audio_path=os.path.join(
                        prompts_dir, "HI_PROMPT_NEUTRAL_00001.wav"
                    ),
                    ref_text="<UPDATE WITH HINDI PROMPT TRANSCRIPT>",
                ),

                # Tamil
                "ta": PromptConfig(
                    ref_audio_path=os.path.join(
                        prompts_dir, "TA_PROMPT_NEUTRAL_00001.wav"
                    ),
                    ref_text="<UPDATE WITH TAMIL PROMPT TRANSCRIPT>",
                ),

                # Telugu
                "te": PromptConfig(
                    ref_audio_path=os.path.join(
                        prompts_dir, "TE_PROMPT_NEUTRAL_00001.wav"
                    ),
                    ref_text="<UPDATE WITH TELUGU PROMPT TRANSCRIPT>",
                ),

                # Kannada
                "kn": PromptConfig(
                    ref_audio_path=os.path.join(
                        prompts_dir, "KN_PROMPT_NEUTRAL_00001.wav"
                    ),
                    ref_text="<UPDATE WITH KANNADA PROMPT TRANSCRIPT>",
                ),

                # Malayalam
                "ml": PromptConfig(
                    ref_audio_path=os.path.join(
                        prompts_dir, "ML_PROMPT_NEUTRAL_00001.wav"
                    ),
                    ref_text="<UPDATE WITH MALAYALAM PROMPT TRANSCRIPT>",
                ),

                # Bengali
                "bn": PromptConfig(
                    ref_audio_path=os.path.join(
                        prompts_dir, "BN_PROMPT_NEUTRAL_00001.wav"
                    ),
                    ref_text="<UPDATE WITH BENGALI PROMPT TRANSCRIPT>",
                ),

                # Marathi
                "mr": PromptConfig(
                    ref_audio_path=os.path.join(
                        prompts_dir, "MR_PROMPT_NEUTRAL_00001.wav"
                    ),
                    ref_text="<UPDATE WITH MARATHI PROMPT TRANSCRIPT>",
                ),

                # Gujarati
                "gu": PromptConfig(
                    ref_audio_path=os.path.join(
                        prompts_dir, "GU_PROMPT_NEUTRAL_00001.wav"
                    ),
                    ref_text="<UPDATE WITH GUJARATI PROMPT TRANSCRIPT>",
                ),
            }

        if not _PROMPT_CONFIG:
            raise RuntimeError(
                "IndicF5 prompt configuration is empty. "
                "Edit speech/tts_engine.py and populate _PROMPT_CONFIG "
                "with at least one language mapping."
            )

        # Ensure audio directory exists
        os.makedirs(STATIC_AUDIO_DIR, exist_ok=True)

        # Load the IndicF5 model (heavy; do this once).
        self.model = AutoModel.from_pretrained(MODEL_ID, trust_remote_code=True)
        self.sample_rate = 24000  # As recommended in IndicF5 README

    def synthesize(self, text: str, language: str) -> str:
        """Generate speech for the given text and language.

        Parameters
        ----------
        text:
            Text after translation (already in the target language).
        language:
            Language code ("hi", "ta", ...). Must be present in
            ``_PROMPT_CONFIG``.

        Returns
        -------
        str
            Path to the generated audio file (relative to project root),
            e.g. ``static/audio/output.wav``.
        """
        if not text or not text.strip():
            raise ValueError("Text for TTS cannot be empty")

        text = text.strip()

        if language not in _PROMPT_CONFIG:
            raise ValueError(f"No IndicF5 prompt configured for language: {language}")

        cfg = _PROMPT_CONFIG[language]

        if not os.path.exists(cfg.ref_audio_path):
            raise RuntimeError(f"Reference audio not found: {cfg.ref_audio_path}")

        # Call the model. The remote code defines the exact signature;
        # here we follow the documented usage pattern: the model call
        # returns a NumPy-like audio array.
        audio = self.model(
            text,
            ref_audio_path=cfg.ref_audio_path,
            ref_text=cfg.ref_text,
        )

        # Convert output to float32 NumPy array in the expected range.
        audio_arr = np.asarray(audio, dtype=np.float32)
        if audio_arr.dtype == np.int16:
            audio_arr = audio_arr.astype(np.float32) / 32768.0

        output_path = os.path.join(STATIC_AUDIO_DIR, OUTPUT_FILENAME)
        sf.write(output_path, audio_arr, samplerate=self.sample_rate)
        return output_path


_engine: IndicF5Engine | None = None


def get_tts_engine() -> IndicF5Engine:
    """Return a cached IndicF5Engine instance."""
    global _engine
    if _engine is None:
        _engine = IndicF5Engine()
    return _engine


def generate_speech(text: str, language: str) -> str:
    """Facade used by the FastAPI backend.

    Returns the path to the generated audio file.
    """
    engine = get_tts_engine()
    return engine.synthesize(text=text, language=language)
