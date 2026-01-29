"""
NVIDIA Magpie-TTS Integration Module
Provides text-to-speech synthesis using NVIDIA Riva Magpie-Multilingual model
"""

import os
import wave
import logging
from typing import Optional
import riva.client
from riva.client.proto.riva_audio_pb2 import AudioEncoding

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# NVCF Configuration
NVCF_SERVER = "grpc.nvcf.nvidia.com:443"
FUNCTION_ID = "877104f7-e885-42b9-8de8-f6e4c6303969"
DEFAULT_LANGUAGE = "en-US"
DEFAULT_VOICE = "Magpie-Multilingual.EN-US.Aria"
DEFAULT_SAMPLE_RATE = 44100


class MagpieTTS:
    """NVIDIA Magpie-TTS client for speech synthesis"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Magpie TTS client
        
        Args:
            api_key: NVIDIA API key. If None, reads from NVIDIA_API_KEY environment variable
        """
        self.api_key = api_key or os.getenv("NVIDIA_API_KEY")
        if not self.api_key:
            raise ValueError(
                "NVIDIA API key not found. Set NVIDIA_API_KEY environment variable "
                "or pass api_key parameter."
            )
        
        # Initialize authentication
        metadata = [
            ("function-id", FUNCTION_ID),
            ("authorization", f"Bearer {self.api_key}")
        ]
        
        self.auth = riva.client.Auth(
            use_ssl=True,
            uri=NVCF_SERVER,
            metadata_args=metadata
        )
        
        # Initialize TTS service
        self.service = riva.client.SpeechSynthesisService(self.auth)
        logger.info("Magpie TTS initialized successfully")
    
    def synthesize(
        self,
        text: str,
        output_path: str = "audio.wav",
        voice: str = DEFAULT_VOICE,
        language_code: str = DEFAULT_LANGUAGE,
        sample_rate: int = DEFAULT_SAMPLE_RATE
    ) -> bool:
        """
        Synthesize speech from text and save to WAV file
        
        Args:
            text: Text to synthesize
            output_path: Path to save the output WAV file
            voice: Voice name (default: Magpie-Multilingual.EN-US.Aria)
            language_code: Language code (default: en-US)
            sample_rate: Sample rate in Hz (default: 44100)
        
        Returns:
            True if successful, False otherwise
        """
        if not text or not text.strip():
            logger.warning("Empty text provided, skipping synthesis")
            return False
        
        try:
            logger.info(f"Synthesizing: '{text}' with voice {voice}")
            
            # Synthesize speech
            response = self.service.synthesize(
                text=text,
                voice_name=voice,
                language_code=language_code,
                sample_rate_hz=sample_rate,
                encoding=AudioEncoding.LINEAR_PCM
            )
            
            # Save to WAV file
            with wave.open(output_path, 'wb') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(sample_rate)
                wav_file.writeframesraw(response.audio)
            
            logger.info(f"Audio saved to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            return False
    
    def list_available_voices(self) -> dict:
        """
        List all available voices from the Riva service
        
        Returns:
            Dictionary mapping language codes to available voices
        """
        try:
            config_response = self.service.stub.GetRivaSynthesisConfig(
                riva.client.proto.riva_tts_pb2.RivaSynthesisConfigRequest()
            )
            
            tts_models = {}
            for model_config in config_response.model_config:
                language_code = model_config.parameters.get('language_code', 'unknown')
                voice_name = model_config.parameters.get('voice_name', '')
                subvoices_str = model_config.parameters.get('subvoices', '')
                
                if subvoices_str:
                    subvoices = [v.split(':')[0] for v in subvoices_str.split(',')]
                    full_voice_names = [f"{voice_name}.{sv}" for sv in subvoices]
                else:
                    full_voice_names = [voice_name]
                
                if language_code in tts_models:
                    tts_models[language_code]['voices'].extend(full_voice_names)
                else:
                    tts_models[language_code] = {"voices": full_voice_names}
            
            return dict(sorted(tts_models.items()))
            
        except Exception as e:
            logger.error(f"Failed to list voices: {e}")
            return {}


# Convenience function for easy integration
def speak_text(text: str, output_path: str = "audio.wav", api_key: Optional[str] = None) -> None:
    """
    Simple function to synthesize text to speech
    
    Args:
        text: Text to synthesize
        output_path: Path to save the output WAV file (default: audio.wav)
        api_key: NVIDIA API key (optional, reads from NVIDIA_API_KEY env var if not provided)
    
    Example:
        >>> speak_text("Emergency assistance needed", "emergency.wav")
    """
    try:
        tts = MagpieTTS(api_key=api_key)
        tts.synthesize(text, output_path)
    except Exception as e:
        logger.error(f"Failed to synthesize speech: {e}")


# Example usage
if __name__ == "__main__":
    # Test the module
    import sys
    
    if len(sys.argv) > 1:
        test_text = " ".join(sys.argv[1:])
    else:
        test_text = "This audio is generated from NVIDIA's text to speech model"
    
    # Initialize and synthesize
    try:
        tts = MagpieTTS()
        
        # List available voices
        logger.info("Available voices:")
        voices = tts.list_available_voices()
        for lang, info in voices.items():
            logger.info(f"  {lang}: {info['voices']}")
        
        # Synthesize test text
        tts.synthesize(test_text, "test_output.wav")
        logger.info("Test completed successfully!")
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        sys.exit(1)
