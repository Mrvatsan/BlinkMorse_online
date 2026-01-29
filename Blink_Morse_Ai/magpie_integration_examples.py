"""
Example Integration: Blink Morse AI with NVIDIA Magpie TTS

This module demonstrates how to integrate NVIDIA Magpie-TTS into the Blink Morse AI pipeline.
Two integration approaches are shown:

1. Using the standalone tts_magpie module
2. Using the enhanced TTS engine (supports both pyttsx3 and Magpie)
"""

import os
import time
from morse_logic import MorseDecoder
from tts_magpie import speak_text, MagpieTTS


# ============================================================================
# APPROACH 1: Direct Integration with tts_magpie.py
# ============================================================================

def example_direct_magpie_integration():
    """
    Example showing direct use of the Magpie TTS module
    """
    print("=" * 60)
    print("APPROACH 1: Direct Magpie TTS Integration")
    print("=" * 60)
    
    # Simulate Morse decoding
    decoder = MorseDecoder()
    
    # Example: User blinks "HELP" in Morse code
    # H = .... (4 dots)
    # E = . (1 dot)
    # L = .-.. (dot, dash, dot, dot)
    # P = .--. (dot, dash, dash, dot)
    
    # Simulate the decoded output
    decoded_messages = [
        "HELP",
        "WATER",
        "EMERGENCY",
        "YES",
        "NO"
    ]
    
    # Check if API key is set
    if not os.getenv("NVIDIA_API_KEY"):
        print("ERROR: NVIDIA_API_KEY environment variable not set!")
        print("Set it using: $env:NVIDIA_API_KEY = 'your-api-key-here'")
        return
    
    try:
        # Initialize Magpie TTS
        print("\nInitializing NVIDIA Magpie TTS...")
        magpie = MagpieTTS()
        
        # Process each decoded message
        for i, message in enumerate(decoded_messages, 1):
            print(f"\n[{i}] Decoded Morse: '{message}'")
            
            # Synthesize speech
            output_file = f"morse_output_{i}.wav"
            success = magpie.synthesize(
                text=message,
                output_path=output_file,
                voice="Magpie-Multilingual.EN-US.Aria",
                language_code="en-US"
            )
            
            if success:
                print(f"    ✓ Audio saved: {output_file}")
            else:
                print(f"    ✗ Failed to synthesize")
            
            time.sleep(0.5)  # Small delay between requests
        
        print("\n" + "=" * 60)
        print("Direct integration complete!")
        
    except Exception as e:
        print(f"ERROR: {e}")


# ============================================================================
# APPROACH 2: Using Enhanced TTS Engine (Drop-in Replacement)
# ============================================================================

def example_enhanced_engine_integration():
    """
    Example showing the enhanced TTS engine that supports both modes
    This is a drop-in replacement for the existing TTSEngine
    """
    print("\n" + "=" * 60)
    print("APPROACH 2: Enhanced TTS Engine (Seamless Switch)")
    print("=" * 60)
    
    from tts_engine_enhanced import EnhancedTTSEngine
    
    # Check if API key is set
    if not os.getenv("NVIDIA_API_KEY"):
        print("\nNVIDIA_API_KEY not set. Using offline pyttsx3 instead.")
        use_magpie = False
    else:
        use_magpie = True
    
    # Initialize enhanced TTS engine
    print(f"\nInitializing TTS Engine (Magpie: {use_magpie})...")
    tts = EnhancedTTSEngine(use_magpie=use_magpie)
    
    # Simulate Morse decoding
    decoder = MorseDecoder()
    
    test_messages = [
        "Patient mode activated",
        "Blink Morse AI ready",
        "Emergency detected"
    ]
    
    for message in test_messages:
        print(f"\nSpeaking: '{message}'")
        audio_path = tts.speak(message)
        if audio_path:
            print(f"  Audio file: {audio_path}")
        time.sleep(1)
    
    print("\n" + "=" * 60)
    print("Enhanced engine integration complete!")


# ============================================================================
# APPROACH 3: Minimal Integration Example for app.py
# ============================================================================

def example_app_integration():
    """
    Shows minimal changes needed to integrate into app.py
    """
    print("\n" + "=" * 60)
    print("APPROACH 3: Minimal app.py Integration Example")
    print("=" * 60)
    
    print("""
# In app.py, replace this:
from tts_engine import TTSEngine

# With this:
from tts_engine_enhanced import EnhancedTTSEngine

# Then in main():
# Option 1: Use Magpie TTS (requires API key)
tts = EnhancedTTSEngine(use_magpie=True)

# Option 2: Use default pyttsx3 (offline, no API key needed)
tts = EnhancedTTSEngine(use_magpie=False)

# Option 3: Auto-detect (uses Magpie if API key exists, else pyttsx3)
import os
use_magpie = bool(os.getenv("NVIDIA_API_KEY"))
tts = EnhancedTTSEngine(use_magpie=use_magpie)

# The rest of the code remains unchanged!
# The speak() method works exactly the same way.
    """)


# ============================================================================
# APPROACH 4: Calling Magpie from Morse Decoding Events
# ============================================================================

def example_morse_event_integration():
    """
    Example showing how to trigger TTS when Morse decoding completes a word
    """
    print("\n" + "=" * 60)
    print("APPROACH 4: Event-Driven TTS Integration")
    print("=" * 60)
    
    print("""
# This shows how to call TTS when a word is completed in Morse decoding

from morse_logic import MorseDecoder
from tts_magpie import MagpieTTS

# Initialize
decoder = MorseDecoder()
magpie = MagpieTTS()

# In your main loop (app.py), when a word is completed:
def on_word_completed(word):
    \"\"\"Called when Morse decoder completes a word\"\"\"
    print(f"Word completed: {word}")
    
    # Synthesize and save audio
    output_file = f"morse_{word.lower()}.wav"
    magpie.synthesize(word, output_file)
    
    # Optionally, play the audio here using pyaudio or similar
    # play_audio(output_file)

# Example usage:
# When WORD_PAUSE_THRESHOLD is exceeded in app.py:
completed_word = decoder.complete_word()
if completed_word:
    on_word_completed(completed_word)
    """)


# ============================================================================
# Main Testing Function
# ============================================================================

def main():
    """Run all integration examples"""
    
    print("\n" + "=" * 80)
    print(" " * 20 + "NVIDIA Magpie TTS Integration Examples")
    print("=" * 80)
    
    # Run examples
    example_direct_magpie_integration()
    time.sleep(1)
    
    example_enhanced_engine_integration()
    time.sleep(1)
    
    example_app_integration()
    time.sleep(1)
    
    example_morse_event_integration()
    
    print("\n" + "=" * 80)
    print("All integration examples completed!")
    print("=" * 80)
    
    # Additional information
    print("\n" + "SETUP INSTRUCTIONS:")
    print("-" * 80)
    print("1. Set your NVIDIA API key:")
    print("   PowerShell: $env:NVIDIA_API_KEY = 'your-api-key-here'")
    print("   Bash:       export NVIDIA_API_KEY='your-api-key-here'")
    print()
    print("2. Packages are already installed:")
    print("   ✓ nvidia-riva-client")
    print("   ✓ pyttsx3")
    print()
    print("3. Choose your integration approach:")
    print("   - Direct:   Use tts_magpie.py directly")
    print("   - Enhanced: Use tts_engine_enhanced.py (recommended)")
    print("   - Minimal:  Modify existing app.py minimally")
    print("=" * 80)


if __name__ == "__main__":
    main()
