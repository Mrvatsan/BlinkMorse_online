"""
Audio TTS Diagnostic Tool
Tests different TTS methods to identify audio issues
"""

import time

print("=" * 60)
print("AUDIO TTS DIAGNOSTIC TEST")
print("=" * 60)

# Test 1: Direct Windows SAPI
print("\n[Test 1] Testing Windows SAPI directly...")
try:
    import win32com.client
    speaker = win32com.client.Dispatch("SAPI.SpVoice")
    print("Speaking: 'Testing direct SAPI. Can you hear this?'")
    speaker.Speak("Testing direct SAPI. Can you hear this?")
    time.sleep(2)
    print("✓ Direct SAPI test complete")
except Exception as e:
    print(f"✗ Direct SAPI failed: {e}")

# Test 2: pyttsx3
print("\n[Test 2] Testing pyttsx3...")
try:
    import pyttsx3
    engine = pyttsx3.init('sapi5')
    engine.setProperty('rate', 150)
    engine.setProperty('volume', 1.0)
    
    voices = engine.getProperty('voices')
    print(f"Available voices: {len(voices)}")
    for i, voice in enumerate(voices):
        print(f"  {i}: {voice.name}")
    
    print("Speaking: 'Testing pyttsx3. Can you hear this?'")
    engine.say("Testing pyttsx3. Can you hear this?")
    engine.runAndWait()
    time.sleep(1)
    print("✓ pyttsx3 test complete")
except Exception as e:
    print(f"✗ pyttsx3 failed: {e}")

# Test 3: Generate WAV file
print("\n[Test 3] Generating audio WAV file...")
try:
    from win32com.client import Dispatch
    speaker = Dispatch("SAPI.SpVoice")
    stream = Dispatch("SAPI.SpFileStream")
    
    from win32com.client import constants
    stream.Open("test_output.wav", 3)  # 3 = SSFMCreateForWrite
    speaker.AudioOutputStream = stream
    
    speaker.Speak("This is a test WAV file. If you can hear this, audio generation works.")
    stream.Close()
    
    print("✓ WAV file created: test_output.wav")
    print("  Please play this file manually to test if WAV generation works")
except Exception as e:
    print(f"✗ WAV generation failed: {e}")

# Test 4: Check audio devices
print("\n[Test 4] Checking system audio...")
try:
    import subprocess
    result = subprocess.run(
        ['powershell', '-Command', 'Get-AudioDevice -List | Select-Object Index, Default, Type, Name'],
        capture_output=True, text=True, timeout=5
    )
    print("Audio devices:")
    print(result.stdout)
except Exception as e:
    print(f"Could not check audio devices: {e}")

print("\n" + "=" * 60)
print("DIAGNOSTIC SUMMARY")
print("=" * 60)
print("If you did NOT hear any speech:")
print("1. Check your computer volume is turned up")
print("2. Check speakers/headphones are connected")
print("3. Try playing the test_output.wav file manually")
print("4. Check Windows Sound settings (default playback device)")
print("\nIf test_output.wav plays but TTS doesn't speak:")
print("- This is a pyttsx3/SAPI threading issue")
print("- Solution: Use the NVIDIA Magpie TTS or generate WAV files")
print("=" * 60)
