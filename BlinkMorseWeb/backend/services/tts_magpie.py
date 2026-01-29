"""
NVIDIA Magpie-TTS Service
Converts text to speech using NVIDIA Riva with Magpie-TTS model
"""
import os
import io
import wave
import base64
from typing import Optional
import riva.client
from backend.config import (
    NVIDIA_API_KEY,
    RIVA_SERVER,
    RIVA_VOICE,
    RIVA_SAMPLE_RATE,
    RIVA_LANGUAGE_CODE,
    STATIC_AUDIO_DIR
)


class MagpieTTS:
    """
    Text-to-Speech service using NVIDIA Riva Magpie-TTS
    Handles authentication and audio generation
    """
    
    def __init__(self):
        self.api_key = NVIDIA_API_KEY
        self.server = RIVA_SERVER
        self.voice = RIVA_VOICE
        self.sample_rate = RIVA_SAMPLE_RATE
        self.language_code = RIVA_LANGUAGE_CODE
        
        # Validate API key
        if not self.api_key:
            raise ValueError(
                "NVIDIA_API_KEY not set! "
                "Please set it in your .env file."
            )
        
        # Create static audio directory if it doesn't exist
        os.makedirs(STATIC_AUDIO_DIR, exist_ok=True)
        
        # Initialize Riva authentication
        self.auth = None
        self.tts_service = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Riva TTS client with authentication"""
        try:
            # Create auth with API key for NVCF
            self.auth = riva.client.Auth(
                uri=self.server,
                use_ssl=True,
                metadata_args=[
                    ["function-id", "0149e0cb-21ae-4c95-88e8-5c0671ce1d93"],
                    ["authorization", f"Bearer {self.api_key}"]
                ]
            )
            
            # Create TTS service
            self.tts_service = riva.client.SpeechSynthesisService(self.auth)
            
            print("✅ NVIDIA Magpie-TTS client initialized successfully")
            
        except Exception as e:
            print(f"❌ Failed to initialize TTS client: {e}")
            raise
    
    def text_to_speech(self, text: str) -> Optional[bytes]:
        """
        Convert text to speech audio
        
        Args:
            text: Text to convert to speech
            
        Returns:
            Optional[bytes]: WAV audio data or None on failure
        """
        if not text or not text.strip():
            return None
        
        try:
            # Clean and prepare text
            text = text.strip()
            
            # Generate speech using Riva
            responses = self.tts_service.synthesize_online(
                text=text,
                voice_name=self.voice,
                language_code=self.language_code,
                sample_rate_hz=self.sample_rate
            )
            
            # Collect audio chunks
            audio_chunks = []
            for response in responses:
                audio_chunks.append(response.audio)
            
            # Combine audio data
            if not audio_chunks:
                print(f"⚠️  No audio generated for text: {text}")
                return None
            
            audio_data = b''.join(audio_chunks)
            
            # Create WAV file in memory
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(self.sample_rate)
                wav_file.writeframes(audio_data)
            
            wav_buffer.seek(0)
            return wav_buffer.read()
            
        except Exception as e:
            print(f"❌ TTS Error: {e}")
            return None
    
    def text_to_speech_file(self, text: str, output_filename: str) -> Optional[str]:
        """
        Convert text to speech and save to file
        
        Args:
            text: Text to convert
            output_filename: Name of output file (without path)
            
        Returns:
            Optional[str]: Path to generated file or None
        """
        audio_data = self.text_to_speech(text)
        
        if not audio_data:
            return None
        
        # Save to file
        output_path = os.path.join(STATIC_AUDIO_DIR, output_filename)
        
        try:
            with open(output_path, 'wb') as f:
                f.write(audio_data)
            
            print(f"✅ Audio saved to: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"❌ Failed to save audio file: {e}")
            return None
    
    def text_to_speech_base64(self, text: str) -> Optional[str]:
        """
        Convert text to speech and return as base64 string
        Useful for embedding in HTML/JSON
        
        Args:
            text: Text to convert
            
        Returns:
            Optional[str]: Base64-encoded WAV audio or None
        """
        audio_data = self.text_to_speech(text)
        
        if not audio_data:
            return None
        
        return base64.b64encode(audio_data).decode('utf-8')
    
    def health_check(self) -> bool:
        """
        Check if TTS service is available
        
        Returns:
            bool: True if service is healthy
        """
        try:
            # Try to synthesize a simple test phrase
            test_audio = self.text_to_speech("test")
            return test_audio is not None
        except:
            return False


# Singleton instance
_tts_instance = None


def get_tts_service() -> MagpieTTS:
    """
    Get or create TTS service singleton
    
    Returns:
        MagpieTTS: TTS service instance
    """
    global _tts_instance
    
    if _tts_instance is None:
        _tts_instance = MagpieTTS()
    
    return _tts_instance
