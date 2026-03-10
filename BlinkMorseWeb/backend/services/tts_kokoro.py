"""
local Kokoro-82M TTS Service
Converts text to speech using hexgrad/Kokoro-82M model via kokoro pipeline
"""
import os
import io
import base64
import soundfile as sf
from typing import Optional

from backend.config import STATIC_AUDIO_DIR

try:
    from kokoro import KPipeline
except ImportError:
    print("Warning: kokoro package not installed. Run 'pip install kokoro soundfile'")
    KPipeline = None

class KokoroTTS:
    """
    Text-to-Speech service using local Kokoro-82M
    """
    
    def __init__(self):
        # Create static audio directory if it doesn't exist
        os.makedirs(STATIC_AUDIO_DIR, exist_ok=True)
        
        self.pipeline = None
        self._initialize_pipeline()
    
    def _initialize_pipeline(self):
        """Initialize Kokoro Pipeline"""
        if KPipeline is None:
            print("❌ Cannot initialize Kokoro TTS: package not installed.")
            return

        try:
            # Initialize pipeline with English language ('a' for American English)
            self.pipeline = KPipeline(lang_code='a')
            print("✅ Kokoro-82M TTS pipeline initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize Kokoro pipeline: {e}")
            raise

    def text_to_speech(self, text: str) -> Optional[bytes]:
        """
        Convert text to speech audio (WAV bytes)
        """
        if not text or not text.strip() or self.pipeline is None:
            return None
            
        try:
            text = text.strip()
            
            # Generate speech generator
            # We use the default voice 'af_heart' (american female). 
            # You can change it depending on downloaded voices.
            voice = 'af_heart' 
            
            # Generate audio data
            generator = self.pipeline(
                text, voice=voice, 
                speed=1.0, split_pattern=r'\n+'
            )
            
            # Collect generated audio chunks (audio is a numpy array)
            audio_chunks = []
            
            # generator yields (graphemes, phonemes, audio)
            for i, (gs, ps, audio) in enumerate(generator):
                audio_chunks.append(audio)
            
            if not audio_chunks:
                print(f"⚠️  No audio generated for text: {text}")
                return None
                
            # For simplicity, if there are multiple chunks, we grab the first.
            # In most cases, short words/sentences will be just 1 chunk.
            import numpy as np
            full_audio = np.concatenate(audio_chunks)
            
            # Save audio to in-memory WAV using soundfile
            wav_buffer = io.BytesIO()
            # Kokoro sample rate is usually 24000
            sample_rate = 24000 
            sf.write(wav_buffer, full_audio, sample_rate, format='WAV', subtype='PCM_16')
            
            wav_buffer.seek(0)
            return wav_buffer.read()
            
        except Exception as e:
            print(f"❌ Kokoro TTS Error: {e}")
            return None
            
    def text_to_speech_base64(self, text: str) -> Optional[str]:
        """
        Convert text to speech and return as base64 string
        Useful for embedding in HTML/JSON
        """
        audio_data = self.text_to_speech(text)
        
        if not audio_data:
            return None
        
        return base64.b64encode(audio_data).decode('utf-8')

    def health_check(self) -> bool:
        """
        Check if TTS service is available
        """
        return self.pipeline is not None

# Singleton instance
_tts_instance = None

def get_tts_service() -> KokoroTTS:
    """
    Get or create TTS service singleton
    """
    global _tts_instance
    
    if _tts_instance is None:
        _tts_instance = KokoroTTS()
    
    return _tts_instance
