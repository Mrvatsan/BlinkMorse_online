"""
Enhanced TTS Engine with NVIDIA Magpie-TTS support
Provides both pyttsx3 (offline) and NVIDIA Magpie (cloud) TTS options
"""

import pyttsx3
import threading
import queue
import logging
import os
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import Magpie TTS
try:
    from tts_magpie import MagpieTTS
    MAGPIE_AVAILABLE = True
except ImportError:
    MAGPIE_AVAILABLE = False
    logger.warning("Magpie TTS not available. Install nvidia-riva-client to enable.")


class EnhancedTTSEngine:
    """
    Enhanced TTS Engine supporting both offline (pyttsx3) and cloud (Magpie) TTS
    """
    
    def __init__(self, use_magpie: bool = False):
        """
        Initialize the TTS engine
        
        Args:
            use_magpie: If True, use NVIDIA Magpie TTS (requires API key). 
                       If False, use pyttsx3 (offline, default)
        """
        self.use_magpie = use_magpie and MAGPIE_AVAILABLE
        self.magpie_tts = None
        self.audio_counter = 0
        self.output_dir = "tts_output"
        
        # Create output directory for Magpie audio files
        if self.use_magpie:
            os.makedirs(self.output_dir, exist_ok=True)
            try:
                self.magpie_tts = MagpieTTS()
                logger.info("Initialized Magpie TTS (cloud)")
            except Exception as e:
                logger.warning(f"Failed to initialize Magpie TTS: {e}. Falling back to pyttsx3")
                self.use_magpie = False
        
        # Initialize pyttsx3 engine (fallback or default)
        if not self.use_magpie:
            self.queue = queue.Queue()
            self.running = True
            self.thread = threading.Thread(target=self._loop, daemon=True)
            self.thread.start()
            logger.info("Initialized pyttsx3 TTS (offline)")

    def _loop(self):
        """
        Worker thread for pyttsx3 that initializes the engine once and processes the queue.
        """
        try:
            # Initialize engine inside the thread
            engine = pyttsx3.init()
            engine.setProperty('rate', 150)
            engine.setProperty('volume', 1.0)
            
            while self.running:
                try:
                    text = self.queue.get(timeout=0.1)
                except queue.Empty:
                    continue
                
                if text is None:  # Sentinel to stop
                    break
                
                try:
                    engine.say(text)
                    engine.runAndWait()
                except Exception as e:
                    logger.error(f"pyttsx3 Error during playback: {e}")
                
                self.queue.task_done()
                
        except Exception as e:
            logger.error(f"pyttsx3 Initialization Error: {e}")

    def speak(self, text: str, play_audio: bool = True) -> Optional[str]:
        """
        Synthesize and speak the given text
        
        Args:
            text: Text to speak
            play_audio: If True and using Magpie, also play the audio (requires additional setup)
        
        Returns:
            Path to audio file if using Magpie, None if using pyttsx3
        """
        if not text:
            return None
        
        if self.use_magpie and self.magpie_tts:
            # Use NVIDIA Magpie TTS
            self.audio_counter += 1
            output_path = os.path.join(self.output_dir, f"morse_speech_{self.audio_counter}.wav")
            
            success = self.magpie_tts.synthesize(text, output_path)
            if success:
                logger.info(f"Magpie TTS: '{text}' -> {output_path}")
                # TODO: Add audio playback if desired (requires pyaudio or similar)
                return output_path
            else:
                logger.error("Magpie synthesis failed")
                return None
        else:
            # Use pyttsx3
            self.queue.put(text)
            return None

    def stop(self):
        """Stop the background thread (pyttsx3 only)"""
        if not self.use_magpie:
            self.running = False

    def switch_to_magpie(self) -> bool:
        """
        Switch to Magpie TTS at runtime
        
        Returns:
            True if successful, False otherwise
        """
        if not MAGPIE_AVAILABLE:
            logger.error("Magpie TTS not available")
            return False
        
        try:
            if not self.use_magpie:
                self.magpie_tts = MagpieTTS()
                self.use_magpie = True
                os.makedirs(self.output_dir, exist_ok=True)
                logger.info("Switched to Magpie TTS")
            return True
        except Exception as e:
            logger.error(f"Failed to switch to Magpie: {e}")
            return False
    
    def switch_to_pyttsx3(self):
        """Switch to pyttsx3 TTS at runtime"""
        if self.use_magpie:
            self.use_magpie = False
            if not hasattr(self, 'queue'):
                self.queue = queue.Queue()
                self.running = True
                self.thread = threading.Thread(target=self._loop, daemon=True)
                self.thread.start()
            logger.info("Switched to pyttsx3 TTS")


# Backward compatibility: Keep the original TTSEngine class
class TTSEngine(EnhancedTTSEngine):
    """
    Original TTSEngine class for backward compatibility
    Uses pyttsx3 by default
    """
    def __init__(self):
        super().__init__(use_magpie=False)


# Example usage
if __name__ == "__main__":
    import time
    
    # Test pyttsx3
    print("Testing pyttsx3 TTS...")
    tts_offline = EnhancedTTSEngine(use_magpie=False)
    tts_offline.speak("Testing offline text to speech")
    time.sleep(2)
    
    # Test Magpie (if API key is available)
    if os.getenv("NVIDIA_API_KEY"):
        print("\nTesting Magpie TTS...")
        tts_magpie = EnhancedTTSEngine(use_magpie=True)
        audio_file = tts_magpie.speak("Testing NVIDIA Magpie text to speech")
        if audio_file:
            print(f"Audio saved to: {audio_file}")
        time.sleep(2)
    else:
        print("\nSkipping Magpie test (NVIDIA_API_KEY not set)")
    
    print("\nTests completed!")
