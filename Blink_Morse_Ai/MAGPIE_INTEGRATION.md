# NVIDIA Magpie-TTS Integration Guide

This guide explains how to integrate NVIDIA Magpie-TTS (Multilingual) into the Blink Morse AI system.

## 📋 Overview

The integration provides high-quality, cloud-based text-to-speech synthesis using NVIDIA's Magpie-Multilingual model through the Riva Speech API. This enhances the Blink Morse AI system with more natural and clear voice output.

## 🚀 Quick Start

### 1. Prerequisites

All required packages are already installed:
- ✅ `nvidia-riva-client` - NVIDIA Riva Python client
- ✅ `pyttsx3` - Offline TTS (fallback)
- ✅ Python 3.10+

### 2. Get Your API Key

1. Visit [NVIDIA API Catalog](https://build.nvidia.com/)
2. Sign in with your NVIDIA account
3. Navigate to Magpie-TTS or Riva Speech
4. Generate an API key

### 3. Set Environment Variable

**PowerShell (Windows):**
```powershell
$env:NVIDIA_API_KEY = "nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Bash (Linux/Mac):**
```bash
export NVIDIA_API_KEY="nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Permanent (Windows):**
```powershell
[System.Environment]::SetEnvironmentVariable('NVIDIA_API_KEY', 'nvapi-xxxxx', 'User')
```

### 4. Test the Integration

```bash
# Test standalone Magpie TTS
python tts_magpie.py "Hello from NVIDIA Magpie"

# Test enhanced TTS engine
python tts_engine_enhanced.py

# View all integration examples
python magpie_integration_examples.py
```

## 📁 New Files Created

### `tts_magpie.py`
Core module for NVIDIA Magpie-TTS integration.

**Key Features:**
- Direct connection to NVIDIA NVCF gRPC endpoint
- SSL-enabled secure communication
- Error handling and logging
- Voice listing capability
- Simple `speak_text()` function for quick use

**Usage:**
```python
from tts_magpie import speak_text, MagpieTTS

# Simple usage
speak_text("Help needed", "help.wav")

# Advanced usage
tts = MagpieTTS()
tts.synthesize(
    text="Emergency",
    output_path="emergency.wav",
    voice="Magpie-Multilingual.EN-US.Aria",
    language_code="en-US"
)

# List available voices
voices = tts.list_available_voices()
print(voices)
```

### `tts_engine_enhanced.py`
Enhanced TTS engine supporting both offline (pyttsx3) and cloud (Magpie) modes.

**Key Features:**
- Drop-in replacement for existing `TTSEngine`
- Automatic fallback to pyttsx3 if Magpie unavailable
- Runtime switching between TTS modes
- Thread-safe operation
- Backward compatible

**Usage:**
```python
from tts_engine_enhanced import EnhancedTTSEngine

# Use Magpie TTS
tts = EnhancedTTSEngine(use_magpie=True)
tts.speak("Patient mode activated")

# Use offline pyttsx3
tts = EnhancedTTSEngine(use_magpie=False)
tts.speak("Calibration complete")

# Auto-detect based on API key availability
import os
use_magpie = bool(os.getenv("NVIDIA_API_KEY"))
tts = EnhancedTTSEngine(use_magpie=use_magpie)
```

### `magpie_integration_examples.py`
Comprehensive examples showing different integration approaches.

**Includes:**
- Direct Magpie TTS integration
- Enhanced engine usage
- Minimal app.py modifications
- Event-driven TTS triggering
- Complete testing suite

## 🔧 Integration into app.py

### Option 1: Minimal Changes (Recommended)

Replace the TTS engine import in `app.py`:

```python
# OLD
from tts_engine import TTSEngine

# NEW
from tts_engine_enhanced import EnhancedTTSEngine
import os

# In main():
# Auto-detect: uses Magpie if API key exists, else pyttsx3
use_magpie = bool(os.getenv("NVIDIA_API_KEY"))
tts = EnhancedTTSEngine(use_magpie=use_magpie)

# Rest of the code remains UNCHANGED
```

### Option 2: Direct Magpie Integration

For more control, use the Magpie module directly:

```python
from tts_magpie import MagpieTTS

# In main():
try:
    tts = MagpieTTS()
    use_magpie = True
except Exception as e:
    print(f"Magpie unavailable: {e}, using pyttsx3")
    from tts_engine import TTSEngine
    tts = TTSEngine()
    use_magpie = False

# When speaking:
if use_magpie:
    tts.synthesize(text, f"output_{word}.wav")
else:
    tts.speak(text)
```

### Option 3: Event-Driven TTS

Trigger TTS when Morse words are completed:

```python
from tts_magpie import MagpieTTS

magpie = MagpieTTS()

# In your main loop, when a word is completed:
completed_word = decoder.complete_word()
if completed_word:
    output_file = f"morse_{completed_word.lower()}.wav"
    magpie.synthesize(completed_word, output_file)
    print(f"Spoke: {completed_word}")
```

## 🎯 API Configuration

### Default Settings

```python
NVCF_SERVER = "grpc.nvcf.nvidia.com:443"
FUNCTION_ID = "877104f7-e885-42b9-8de8-f6e4c6303969"
DEFAULT_LANGUAGE = "en-US"
DEFAULT_VOICE = "Magpie-Multilingual.EN-US.Aria"
DEFAULT_SAMPLE_RATE = 44100
```

### Available Voices

To list all available voices:

```python
from tts_magpie import MagpieTTS

tts = MagpieTTS()
voices = tts.list_available_voices()

for language, info in voices.items():
    print(f"{language}:")
    for voice in info['voices']:
        print(f"  - {voice}")
```

### Supported Languages

Magpie-Multilingual supports:
- English (en-US)
- Spanish (es-ES, es-MX)
- French (fr-FR)
- German (de-DE)
- Portuguese (pt-BR)
- And more...

## 📊 Comparison: pyttsx3 vs Magpie

| Feature | pyttsx3 | Magpie TTS |
|---------|---------|------------|
| **Quality** | Basic, robotic | High-quality, natural |
| **Speed** | Instant | ~500ms-2s (network) |
| **Cost** | Free | API credits required |
| **Offline** | ✅ Yes | ❌ No (requires internet) |
| **Languages** | Limited | 20+ languages |
| **Voices** | System-dependent | Professional voices |
| **Setup** | Zero config | API key required |

## 🐛 Troubleshooting

### "NVIDIA_API_KEY not found"
**Solution:** Set the environment variable as shown in Quick Start section.

### "ModuleNotFoundError: No module named 'riva'"
**Solution:** Install the package:
```bash
pip install nvidia-riva-client
```

### "SSL handshake failed"
**Solution:** Ensure SSL is enabled and you're using the correct server:
```python
auth = riva.client.Auth(
    use_ssl=True,  # Must be True
    uri="grpc.nvcf.nvidia.com:443"
)
```

### "Authentication failed"
**Solution:** Verify your API key is correct and active.

### Audio playback not working
**Solution:** The module saves audio to WAV files. To play them:
```python
import pyaudio
import wave

# Play audio file
def play_wav(filepath):
    wf = wave.open(filepath, 'rb')
    p = pyaudio.PyAudio()
    stream = p.open(format=p.get_format_from_width(wf.getsampwidth()),
                    channels=wf.getnchannels(),
                    rate=wf.getframerate(),
                    output=True)
    data = wf.readframes(1024)
    while data:
        stream.write(data)
        data = wf.readframes(1024)
    stream.close()
    p.terminate()
```

## 📝 Best Practices

1. **API Key Security**: Never hardcode API keys. Always use environment variables.

2. **Error Handling**: Always wrap TTS calls in try-except blocks:
   ```python
   try:
       tts.synthesize(text, output_path)
   except Exception as e:
       logger.error(f"TTS failed: {e}")
       # Fallback behavior
   ```

3. **Rate Limiting**: Add delays between requests to avoid hitting API limits:
   ```python
   import time
   for message in messages:
       tts.synthesize(message, f"{message}.wav")
       time.sleep(0.5)  # 500ms delay
   ```

4. **Caching**: Cache frequently used phrases to save API calls:
   ```python
   cache = {
       "HELP": "help.wav",
       "EMERGENCY": "emergency.wav"
   }
   
   if word in cache:
       play_cached_audio(cache[word])
   else:
       tts.synthesize(word, output_path)
   ```

5. **Fallback Strategy**: Always have a fallback TTS option:
   ```python
   try:
       magpie_tts.synthesize(text, output)
   except:
       pyttsx3_tts.speak(text)  # Fallback
   ```

## 🔗 Resources

- [NVIDIA Riva Documentation](https://docs.nvidia.com/deeplearning/riva/user-guide/docs/)
- [NVIDIA API Catalog](https://build.nvidia.com/)
- [Riva Python Client GitHub](https://github.com/nvidia-riva/python-clients)
- [Magpie-TTS Model Card](https://build.nvidia.com/nvidia/magpie-tts)

## 📞 Support

For issues related to:
- **Blink Morse AI**: Check the main README.md
- **NVIDIA API**: Visit [NVIDIA Developer Forums](https://forums.developer.nvidia.com/)
- **Riva Client**: Check the [python-clients repository](https://github.com/nvidia-riva/python-clients/issues)

## 📄 License

This integration follows the same license as the Blink Morse AI project. The NVIDIA Riva client is under the MIT license.

---

**Created**: January 2, 2026  
**Author**: AI Assistant for Blink Morse AI Project  
**Version**: 1.0
