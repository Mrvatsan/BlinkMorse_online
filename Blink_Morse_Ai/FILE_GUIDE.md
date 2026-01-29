# NVIDIA Magpie-TTS Integration - File Guide

## 📂 New Files Overview

```
Blink_Morse_Ai/
│
├── 🎯 CORE MODULES (Use These)
│   ├── tts_magpie.py              ← Core Magpie TTS client
│   └── tts_engine_enhanced.py     ← Enhanced TTS (Magpie + pyttsx3)
│
├── 📚 DOCUMENTATION (Read These)
│   ├── MAGPIE_INTEGRATION.md      ← Complete guide (MAIN DOC)
│   ├── INTEGRATION_SUMMARY.md     ← Quick summary
│   └── QUICK_REFERENCE.py         ← Copy-paste snippets
│
├── 🧪 EXAMPLES (Run These)
│   └── magpie_integration_examples.py  ← 4 integration approaches
│
├── 📦 DEPENDENCIES
│   ├── requirements.txt           ← Updated (includes nvidia-riva-client)
│   └── python-clients/            ← NVIDIA reference repo (cloned)
│
└── 🔧 EXISTING FILES (Unchanged)
    ├── app.py                     ← Main application
    ├── tts_engine.py              ← Original TTS (still works)
    ├── morse_logic.py             ← Morse decoder (unchanged)
    └── ... (other files)
```

---

## 🎯 Which Files to Use?

### For Integration: Choose ONE Approach

#### ✅ **Approach A: Enhanced Engine** (RECOMMENDED)
**File:** `tts_engine_enhanced.py`

**Why?**
- Drop-in replacement for existing TTSEngine
- Supports both Magpie and pyttsx3
- Auto-fallback if API key missing
- Minimal code changes

**How?**
```python
# In app.py:
from tts_engine_enhanced import EnhancedTTSEngine
import os

use_magpie = bool(os.getenv("NVIDIA_API_KEY"))
tts = EnhancedTTSEngine(use_magpie=use_magpie)
# Use tts.speak() as normal
```

---

#### ✅ **Approach B: Direct Magpie**
**File:** `tts_magpie.py`

**Why?**
- More control over synthesis
- Access to all Magpie features
- Simpler if you only want Magpie

**How?**
```python
from tts_magpie import MagpieTTS

tts = MagpieTTS()
tts.synthesize("Help", "help.wav")
```

---

### For Learning & Reference

#### 📖 **Start Here**
1. **MAGPIE_INTEGRATION.md** - Complete documentation
   - Setup instructions
   - API configuration
   - Troubleshooting guide
   - Best practices

#### 💡 **Quick Code**
2. **QUICK_REFERENCE.py** - 10 ready-to-use snippets
   - Copy and paste examples
   - Common patterns
   - Integration templates

#### 🧪 **Try It Out**
3. **magpie_integration_examples.py** - Run to see it work
   - 4 different approaches
   - Live demonstrations
   - Tests with/without API key

#### 📋 **Summary**
4. **INTEGRATION_SUMMARY.md** - What was implemented
   - Overview of changes
   - Technical specs
   - File listing

---

## 🚀 Quick Start Guide

### Step 1: Set API Key (Optional)
```powershell
$env:NVIDIA_API_KEY = "nvapi-your-key-here"
```

### Step 2: Choose Integration Method

**Option 1: Minimal Changes to app.py**
```python
# Change line 11 in app.py from:
from tts_engine import TTSEngine

# To:
from tts_engine_enhanced import EnhancedTTSEngine
import os

# Change line 19 from:
tts = TTSEngine()

# To:
use_magpie = bool(os.getenv("NVIDIA_API_KEY"))
tts = EnhancedTTSEngine(use_magpie=use_magpie)
```

**That's it!** All `tts.speak()` calls work the same.

---

**Option 2: Standalone Usage**
```python
from tts_magpie import speak_text

speak_text("Emergency", "emergency.wav")
```

---

### Step 3: Test It
```bash
# Test module import
python -c "from tts_magpie import MagpieTTS; print('✓ Works')"

# Test synthesis (requires API key)
python tts_magpie.py "Hello from Magpie"

# Run all examples
python magpie_integration_examples.py
```

---

## 📊 File Details

### `tts_magpie.py` (180 lines)
**Purpose:** Core Magpie TTS client

**Main Classes:**
- `MagpieTTS` - Main TTS class
  - `__init__(api_key)` - Initialize with API key
  - `synthesize(text, output_path, voice, language)` - Synthesize speech
  - `list_available_voices()` - Get available voices

**Main Functions:**
- `speak_text(text, output_path, api_key)` - Simple convenience function

**Dependencies:**
- riva.client (NVIDIA)
- wave (standard library)
- os, logging (standard library)

**Key Features:**
- SSL-enabled gRPC connection
- Metadata authentication
- Error handling
- Logging support

---

### `tts_engine_enhanced.py` (160 lines)
**Purpose:** Drop-in replacement for TTSEngine with Magpie support

**Main Classes:**
- `EnhancedTTSEngine` - Enhanced TTS with dual modes
  - `__init__(use_magpie)` - Initialize with mode selection
  - `speak(text, play_audio)` - Speak text (same API as original)
  - `switch_to_magpie()` - Runtime switch to Magpie
  - `switch_to_pyttsx3()` - Runtime switch to pyttsx3
  - `stop()` - Stop background thread

- `TTSEngine` - Backward-compatible class (extends EnhancedTTSEngine)

**Dependencies:**
- pyttsx3 (offline TTS)
- tts_magpie (Magpie TTS)
- threading, queue (standard library)

**Key Features:**
- Dual-mode operation
- Automatic fallback
- Thread-safe
- Backward compatible
- Runtime mode switching

---

### `magpie_integration_examples.py` (280 lines)
**Purpose:** Demonstrates 4 integration approaches

**Functions:**
- `example_direct_magpie_integration()` - Direct Magpie usage
- `example_enhanced_engine_integration()` - Enhanced engine demo
- `example_app_integration()` - App.py modification guide
- `example_morse_event_integration()` - Event-driven TTS
- `main()` - Run all examples

**Usage:**
```bash
python magpie_integration_examples.py
```

---

## 📖 Documentation Files

### `MAGPIE_INTEGRATION.md`
**Sections:**
- 📋 Overview
- 🚀 Quick Start
- 📁 New Files
- 🔧 Integration Options
- 🎯 API Configuration
- 📊 Comparison Table
- 🐛 Troubleshooting
- 📝 Best Practices
- 🔗 Resources

**Length:** ~400 lines  
**Read Time:** 10-15 minutes  
**When to Read:** Before integrating

---

### `INTEGRATION_SUMMARY.md`
**Sections:**
- ✅ Completed Tasks
- 📁 Files Created
- 🎯 Key Features
- 🔧 Integration Options
- 📊 Technical Specs
- 🚀 Quick Start
- 📚 Documentation Links
- 🎭 Voice Support
- ⚠️ Important Notes

**Length:** ~250 lines  
**Read Time:** 5 minutes  
**When to Read:** For quick overview

---

### `QUICK_REFERENCE.py`
**Content:** 10 code snippets
1. Simple one-liner
2. Error handling
3. App integration
4. Batch processing
5. Custom voices
6. List voices
7. Fallback pattern
8. Event-driven
9. Runtime switching
10. Complete integration

**Length:** ~260 lines  
**Read Time:** Browse as needed  
**When to Use:** When coding

---

## 🎓 Learning Path

### Beginner
1. Read **INTEGRATION_SUMMARY.md**
2. Run **magpie_integration_examples.py**
3. Browse **QUICK_REFERENCE.py**

### Intermediate
1. Read **MAGPIE_INTEGRATION.md**
2. Study **tts_engine_enhanced.py**
3. Integrate into app.py

### Advanced
1. Study **tts_magpie.py** source
2. Customize voice/language settings
3. Implement custom caching
4. Add audio playback

---

## 🔍 Find What You Need

### "How do I set up the API key?"
→ **MAGPIE_INTEGRATION.md** - Quick Start section

### "What's the simplest way to use this?"
→ **QUICK_REFERENCE.py** - Snippet #1

### "How do I integrate into app.py?"
→ **MAGPIE_INTEGRATION.md** - Integration Options section  
→ **QUICK_REFERENCE.py** - Snippet #3

### "What voices are available?"
→ **QUICK_REFERENCE.py** - Snippet #6  
→ **MAGPIE_INTEGRATION.md** - Available Voices section

### "It's not working, help!"
→ **MAGPIE_INTEGRATION.md** - Troubleshooting section

### "I want to see it in action"
→ Run: `python magpie_integration_examples.py`

### "How does it compare to pyttsx3?"
→ **MAGPIE_INTEGRATION.md** - Comparison Table  
→ **INTEGRATION_SUMMARY.md** - Comparison section

---

## 🎯 Decision Tree

```
Do you have an NVIDIA API key?
│
├─ YES → Want best quality?
│   │
│   ├─ YES → Use EnhancedTTSEngine(use_magpie=True)
│   │        File: tts_engine_enhanced.py
│   │
│   └─ NO → Use EnhancedTTSEngine(use_magpie=False)
│            File: tts_engine_enhanced.py
│
└─ NO → Want to test anyway?
    │
    ├─ YES → Use EnhancedTTSEngine(use_magpie=False)
    │        Falls back to pyttsx3 automatically
    │
    └─ NO → Keep using original TTSEngine
             File: tts_engine.py (unchanged)
```

---

## ✅ Checklist

### Before Integration
- [ ] Read MAGPIE_INTEGRATION.md Quick Start
- [ ] Obtain NVIDIA API key (if using Magpie)
- [ ] Set NVIDIA_API_KEY environment variable
- [ ] Test: `python tts_magpie.py "test"`

### During Integration
- [ ] Choose integration approach
- [ ] Modify app.py imports
- [ ] Test with offline mode
- [ ] Test with Magpie (if API key available)
- [ ] Check error handling

### After Integration
- [ ] Test all Morse decoding scenarios
- [ ] Verify TTS output quality
- [ ] Monitor API usage
- [ ] Document any custom changes

---

## 💡 Pro Tips

1. **Start Simple:** Use EnhancedTTSEngine with auto-detect
2. **Test Offline First:** Make sure pyttsx3 fallback works
3. **Cache Common Phrases:** Save API calls for frequent words
4. **Monitor Usage:** Check NVIDIA dashboard for API credits
5. **Error Handling:** Always wrap TTS calls in try-except
6. **Logging:** Enable logging for debugging

---

## 🆘 Quick Help

**Q: Which file do I modify?**  
A: `app.py` only (minimal changes)

**Q: Which file do I import?**  
A: `tts_engine_enhanced.py` (recommended) or `tts_magpie.py` (direct)

**Q: Will my existing code break?**  
A: No, backward compatible

**Q: Do I need an API key?**  
A: Only for Magpie. Falls back to pyttsx3 without it.

**Q: Where are audio files saved?**  
A: `tts_output/` directory (auto-created)

**Q: Can I switch modes at runtime?**  
A: Yes, use `tts.switch_to_magpie()` or `tts.switch_to_pyttsx3()`

---

**Last Updated:** January 2, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
