# Blink Morse Web - Online Assistive AI System

A fully online, web-based assistive communication system that converts eye blinks into Morse code, text, and speech using AI.

## 🎯 Overview

**Blink Morse Web** is a professional assistive AI system designed for:
- **Patients** with speech impairments
- **Caregivers** and layman users

The system detects eye blinks via webcam, decodes Morse patterns into text, and converts text to speech using NVIDIA Magpie-TTS.

## 🏗️ Architecture

```
Browser (Camera + UI)
       ↓
WebSocket Connection
       ↓
FastAPI Backend (Blink Detection)
       ↓
Morse Decoder Service
       ↓
Text Output
       ↓
NVIDIA Magpie-TTS (Online)
       ↓
Audio Output (Browser)
```

## 🚀 Features

### Patient Mode
- Real-time camera feed
- Pre-defined Morse patterns for common needs:
  - Food, Water, Help, Emergency
  - Pain, Bathroom, Yes/No
- Live status indicators
- Automatic text-to-speech

### Morse Learning Mode
- Complete A-Z Morse code reference
- Visual timing guides
- Practice-oriented interface

## 📋 Prerequisites

- Python 3.8+
- Webcam
- NVIDIA API Key (for Magpie-TTS)
- Modern web browser (Chrome/Firefox/Edge)

## 🔧 Installation

### 1. Clone and Navigate
```bash
cd BlinkMorseWeb
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Set Environment Variables
Create a `.env` file in the root directory:
```env
NVIDIA_API_KEY=your_nvidia_api_key_here
HOST=0.0.0.0
PORT=8000
```

## 🎮 Usage

### Start the Server
```bash
python run.py
```

Or using uvicorn directly:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Access the Application
Open your browser and navigate to:
```
http://localhost:8000
```

## 📁 Project Structure

```
BlinkMorseWeb/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration settings
│   ├── services/
│   │   ├── blink_detection.py  # Eye blink detection
│   │   ├── morse_decoder.py    # Morse code decoder
│   │   └── tts_magpie.py       # NVIDIA Magpie-TTS
│   └── utils/
│       └── helpers.py          # Utility functions
├── frontend/
│   ├── index.html              # Entry/Login screen
│   ├── mode_selection.html     # Mode selection
│   ├── patient_mode.html       # Patient interface
│   ├── morse_mode.html         # Learning interface
│   ├── css/
│   │   └── styles.css          # Main stylesheet
│   └── js/
│       ├── common.js           # Shared utilities
│       ├── patient_mode.js     # Patient mode logic
│       └── morse_mode.js       # Morse mode logic
├── static/
│   └── audio/                  # Generated audio files
├── .env                        # Environment variables
├── requirements.txt            # Python dependencies
├── run.py                      # Application entry point
└── README.md                   # This file
```

## 🎨 UI Features

- **Vibrant, Medical-Assistive Theme**: Clean, accessible colors
- **Interactive Landing & Selection Unified Background**: A sleek, dark theme with an active, particle-simulated mesh background that reacts to the user's custom cursor
- **Large Interactive Elements**: Easy for all users
- **Real-time Visual Feedback**: Status indicators and animations
- **Responsive Design**: Works on desktop and tablet
- **Accessibility First**: High contrast, clear typography

## 🔐 Security

- API keys stored in environment variables
- No hardcoded secrets
- Local login passwords are stored as salted hashes in SQLite
- Secure WebSocket connections
- Client-side camera permissions

## ⚡ API Endpoints

### REST Endpoints
- `GET /` - Serve frontend
- `GET /health` - Health check
- `POST /api/login` - Register/validate user password
- `POST /api/decode` - Decode Morse to text
- `POST /api/tts` - Convert text to speech

### WebSocket Endpoint
- `WS /ws/blink` - Real-time blink detection

## 🐛 Error Handling

The system handles:
- Camera access failures
- API connection issues
- No blink detected scenarios
- Network interruptions
- Invalid Morse patterns

## 📊 Morse Code Reference

### Patient Mode Quick Commands (Simplified)
| Pattern | Meaning | Description |
|---------|---------|-------------|
| `.` | YES | Single short blink |
| `.-` | NO | Short then long blink |
| `...` | WATER | Three short blinks |
| `-.` | PAIN | Long then short blink |
| `..--` | EMERGENCY | Two short, two long |
| `---` | FAMILY | Three long blinks |
| `..` | BATHROOM | Two short blinks |

**Note**: Patient mode uses ONLY these simplified patterns for easy communication.

### Learner Mode (Standard A-Z Morse)
Complete alphabet with standard International Morse Code patterns.
- One letter at a time
- No numbers or special characters (for simplicity)
- Visual timing guide included

## 🛠️ Development

### Running in Development Mode
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Testing Blink Detection
The system automatically calibrates based on:
- Eye Aspect Ratio (EAR)
- Blink duration thresholds
- Timing between blinks

### Customizing Thresholds
Edit `backend/config.py`:
```python
EAR_THRESHOLD = 0.21
DOT_DURATION_MAX = 0.4
DASH_DURATION_MIN = 0.4
LETTER_PAUSE = 1.0
WORD_PAUSE = 2.5
```

## 🌐 Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

## 📞 Support

For issues or questions:
1. Check error logs in browser console
2. Verify NVIDIA API key is set
3. Ensure camera permissions are granted
4. Check network connectivity

## 📝 License

This is a professional assistive AI system for evaluation and deployment.

## 🙏 Acknowledgments

- NVIDIA Riva for Magpie-TTS
- MediaPipe for facial landmark detection
- FastAPI framework
- OpenCV for image processing

---

**Built with ❤️ for assistive communication**
