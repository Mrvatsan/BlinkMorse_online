"""
Quick Reference: NVIDIA Magpie TTS Integration
===============================================

This file provides quick code snippets for common use cases.
"""

# ============================================================================
# 1. SIMPLE ONE-LINER
# ============================================================================

from tts_magpie import speak_text

# Synthesize text to audio file
speak_text("Help needed", "help.wav")


# ============================================================================
# 2. BASIC USAGE WITH ERROR HANDLING
# ============================================================================

from tts_magpie import MagpieTTS
import os

def safe_speak(text, output_path="output.wav"):
    """Safely synthesize speech with error handling"""
    if not os.getenv("NVIDIA_API_KEY"):
        print("API key not set. Please set NVIDIA_API_KEY environment variable.")
        return False
    
    try:
        tts = MagpieTTS()
        return tts.synthesize(text, output_path)
    except Exception as e:
        print(f"TTS failed: {e}")
        return False

# Usage
safe_speak("Emergency", "emergency.wav")


# ============================================================================
# 3. INTEGRATION INTO EXISTING APP.PY (RECOMMENDED)
# ============================================================================

# At the top of app.py, replace:
# from tts_engine import TTSEngine

# With:
from tts_engine_enhanced import EnhancedTTSEngine
import os

# In main() function, replace:
# tts = TTSEngine()

# With:
use_magpie = bool(os.getenv("NVIDIA_API_KEY"))
tts = EnhancedTTSEngine(use_magpie=use_magpie)

# Everything else stays the same!
# tts.speak("text") works exactly as before


# ============================================================================
# 4. BATCH PROCESSING MULTIPLE MORSE WORDS
# ============================================================================

from tts_magpie import MagpieTTS
import time

def batch_synthesize(words):
    """Synthesize multiple words"""
    tts = MagpieTTS()
    
    for word in words:
        output_file = f"morse_{word.lower()}.wav"
        success = tts.synthesize(word, output_file)
        print(f"{'✓' if success else '✗'} {word} -> {output_file}")
        time.sleep(0.3)  # Rate limiting

# Usage
morse_words = ["HELP", "WATER", "YES", "NO", "EMERGENCY"]
batch_synthesize(morse_words)


# ============================================================================
# 5. CUSTOM VOICE AND LANGUAGE
# ============================================================================

from tts_magpie import MagpieTTS

tts = MagpieTTS()

# English with different voice
tts.synthesize(
    "Hello",
    "hello_en.wav",
    voice="Magpie-Multilingual.EN-US.Aria",
    language_code="en-US"
)

# Spanish
tts.synthesize(
    "Hola",
    "hello_es.wav",
    voice="Magpie-Multilingual.ES-ES.Maria",  # Example voice
    language_code="es-ES"
)


# ============================================================================
# 6. LIST ALL AVAILABLE VOICES
# ============================================================================

from tts_magpie import MagpieTTS
import json

tts = MagpieTTS()
voices = tts.list_available_voices()

# Pretty print
print(json.dumps(voices, indent=2))

# Or iterate
for language, info in voices.items():
    print(f"\n{language}:")
    for voice in info['voices']:
        print(f"  • {voice}")


# ============================================================================
# 7. FALLBACK PATTERN (MAGPIE -> PYTTSX3)
# ============================================================================

import os

def speak_with_fallback(text):
    """Try Magpie first, fallback to pyttsx3"""
    
    # Try Magpie
    if os.getenv("NVIDIA_API_KEY"):
        try:
            from tts_magpie import MagpieTTS
            tts = MagpieTTS()
            if tts.synthesize(text, "output.wav"):
                print(f"Magpie: {text}")
                return
        except Exception as e:
            print(f"Magpie failed: {e}, using fallback")
    
    # Fallback to pyttsx3
    import pyttsx3
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()
    print(f"pyttsx3: {text}")

# Usage
speak_with_fallback("Testing fallback pattern")


# ============================================================================
# 8. EVENT-DRIVEN TTS (MORSE WORD COMPLETION)
# ============================================================================

from morse_logic import MorseDecoder
from tts_magpie import MagpieTTS
import os

# Initialize
decoder = MorseDecoder()
tts = MagpieTTS() if os.getenv("NVIDIA_API_KEY") else None

def on_word_complete(word):
    """Called when Morse decoder completes a word"""
    print(f"Word decoded: {word}")
    
    if tts:
        output_file = f"morse_{word.lower()}.wav"
        tts.synthesize(word, output_file)
    else:
        print("(Magpie not available)")

# In your app.py main loop:
# if time_since_last_blink > WORD_PAUSE_THRESHOLD:
#     completed_word = decoder.complete_word()
#     if completed_word:
#         on_word_complete(completed_word)


# ============================================================================
# 9. RUNTIME SWITCHING BETWEEN TTS ENGINES
# ============================================================================

from tts_engine_enhanced import EnhancedTTSEngine

tts = EnhancedTTSEngine(use_magpie=False)

# Use pyttsx3
tts.speak("Using offline TTS")

# Switch to Magpie (if API key available)
if tts.switch_to_magpie():
    tts.speak("Now using Magpie TTS")
else:
    print("Cannot switch to Magpie (API key missing)")

# Switch back to pyttsx3
tts.switch_to_pyttsx3()
tts.speak("Back to offline TTS")


# ============================================================================
# 10. COMPLETE APP.PY INTEGRATION SNIPPET
# ============================================================================

"""
# Insert at the top of app.py:
from tts_engine_enhanced import EnhancedTTSEngine
import os

# In main() function, find:
#   tts = TTSEngine()

# Replace with:
use_magpie = bool(os.getenv("NVIDIA_API_KEY"))
tts = EnhancedTTSEngine(use_magpie=use_magpie)

if use_magpie:
    print("Using NVIDIA Magpie TTS (cloud)")
else:
    print("Using pyttsx3 TTS (offline)")

# All tts.speak() calls work the same!
# No other changes needed.
"""


# ============================================================================
# NOTES
# ============================================================================

"""
ENVIRONMENT SETUP:
- PowerShell: $env:NVIDIA_API_KEY = "nvapi-xxxxx"
- Bash:       export NVIDIA_API_KEY="nvapi-xxxxx"

FILES:
- tts_magpie.py              : Core Magpie TTS module
- tts_engine_enhanced.py     : Enhanced TTS engine (drop-in replacement)
- magpie_integration_examples.py : Full integration examples
- MAGPIE_INTEGRATION.md      : Complete documentation

DEPENDENCIES (already installed):
- nvidia-riva-client
- pyttsx3
- opencv-python
- mediapipe
- numpy
- scipy

TYPICAL WORKFLOW:
1. Set NVIDIA_API_KEY environment variable
2. Import EnhancedTTSEngine in app.py
3. Initialize with use_magpie=True
4. Use tts.speak() as normal
5. Audio files saved to tts_output/ directory
"""
