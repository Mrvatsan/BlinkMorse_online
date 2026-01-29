# Project Architecture - Blink Morse Web

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐          │
│  │   Login    │→ │   Mode     │→ │Patient/Morse │          │
│  │  Screen    │  │ Selection  │  │    Mode      │          │
│  └────────────┘  └────────────┘  └──────────────┘          │
│         │                               │                    │
│         │ Camera Access                 │ WebSocket          │
│         │ Video Frames                  │ Real-time          │
│         ▼                               ▼                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   WebSocket Handler                   │  │
│  │  • Receives video frames                             │  │
│  │  • Manages blink sessions                            │  │
│  │  • Sends real-time updates                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │    Blink     │→ │    Morse     │→ │   TTS Engine    │  │
│  │  Detection   │  │   Decoder    │  │  (NVIDIA Riva)  │  │
│  │ (MediaPipe)  │  │  (Pattern)   │  │  (Magpie-TTS)   │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│         │                  │                   │             │
│         │                  │                   │             │
└─────────┼──────────────────┼───────────────────┼─────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
    Eye Landmarks      Morse Patterns      NVIDIA Cloud
    EAR Calculation    Text Decoding       Audio Generation
```

## Technology Stack

### Frontend

- **HTML5**: Semantic markup
- **CSS3**: Custom styling with CSS variables
- **JavaScript (ES6+)**: Modern vanilla JS
  - WebSocket API
  - MediaDevices API (Camera)
  - Canvas API (Frame capture)
  - Web Audio API (Playback)

**Why Vanilla JS?**
- No build step required
- Easier deployment
- Simpler for evaluation
- Faster initial load

### Backend

- **FastAPI**: Modern async web framework
- **Uvicorn**: ASGI server
- **WebSockets**: Real-time bidirectional communication
- **Python 3.8+**: Core language

**Key Libraries:**
- `opencv-python`: Image processing
- `mediapipe`: Face mesh detection
- `nvidia-riva-client`: TTS integration
- `python-dotenv`: Environment management

### AI/ML Components

1. **MediaPipe Face Mesh**
   - Real-time facial landmark detection
   - Eye aspect ratio calculation
   - 468 facial landmarks (6 for each eye)

2. **NVIDIA Magpie-TTS**
   - Multilingual text-to-speech
   - High-quality voice synthesis
   - Online API via Riva

## Directory Structure

```
BlinkMorseWeb/
│
├── backend/                    # Python backend
│   ├── main.py                # FastAPI application
│   ├── config.py              # Configuration management
│   │
│   ├── services/              # Business logic
│   │   ├── blink_detection.py # Eye blink detection
│   │   ├── morse_decoder.py   # Morse code logic
│   │   └── tts_magpie.py      # NVIDIA TTS integration
│   │
│   └── utils/                 # Helper functions
│       └── helpers.py         # Utilities
│
├── frontend/                  # Web interface
│   ├── index.html            # Login screen
│   ├── mode_selection.html   # Mode selection
│   ├── patient_mode.html     # Patient interface
│   ├── morse_mode.html       # Learning interface
│   │
│   ├── css/
│   │   └── styles.css        # Main stylesheet
│   │
│   └── js/
│       ├── common.js         # Shared utilities
│       ├── patient_mode.js   # Patient mode logic
│       └── morse_mode.js     # Morse mode logic
│
├── static/                    # Static files
│   └── audio/                # Generated audio files
│
├── .env                       # Environment variables (not in git)
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── requirements.txt          # Python dependencies
├── run.py                    # Application entry point
│
├── README.md                 # Main documentation
├── QUICK_START.md           # Setup guide
├── API_DOCS.md              # API reference
└── ARCHITECTURE.md          # This file
```

## Data Flow

### 1. Blink Detection Flow

```
Camera → Video Stream → JavaScript
                          ↓
                    Capture Frame
                          ↓
                    Base64 Encode
                          ↓
                    WebSocket Send
                          ↓
                    FastAPI Receive
                          ↓
                    Base64 Decode
                          ↓
                    MediaPipe Process
                          ↓
                    Calculate EAR
                          ↓
                    Detect Blink (Yes/No)
                          ↓
                    Return Results
                          ↓
                    WebSocket Send
                          ↓
                    Browser Update UI
```

### 2. Morse Decoding Flow

```
Blink Detected
      ↓
Measure Duration
      ↓
Classify: Dot or Dash
      ↓
Add to Pattern Buffer
      ↓
Check Timeout (Letter/Word)
      ↓
Decode Pattern
      ↓
Lookup Character
      ↓
Build Word/Sentence
      ↓
Trigger TTS (if word complete)
```

### 3. TTS Flow

```
Word Complete
      ↓
Text Input
      ↓
NVIDIA Riva Client
      ↓
gRPC Request to NVCF
      ↓
Magpie-TTS Processing
      ↓
Audio Chunks Received
      ↓
Combine to WAV
      ↓
Base64 Encode
      ↓
Send to Browser
      ↓
Decode & Play
```

## Key Algorithms

### Eye Aspect Ratio (EAR)

```python
def calculate_ear(eye_landmarks):
    # Vertical distances
    A = ||p2 - p6||
    B = ||p3 - p5||
    
    # Horizontal distance
    C = ||p1 - p4||
    
    # EAR formula
    EAR = (A + B) / (2.0 * C)
    
    return EAR
```

**Blink Detection:**
- EAR > 0.21: Eyes open
- EAR < 0.21: Eyes closed
- Transition from open → closed: Blink start
- Transition from closed → open: Blink end

### Morse Timing Logic

```python
# Blink Classification
if duration < 0.4s:
    symbol = "."  # Dot
elif duration >= 0.4s:
    symbol = "-"  # Dash

# Letter/Word Detection
if time_since_last_blink >= 1.0s:
    # Decode letter from pattern
    letter = decode(current_pattern)
    
if time_since_last_blink >= 2.5s:
    # Complete word
    word = combine(current_letters)
    trigger_tts(word)
```

## Design Patterns

### 1. Singleton Pattern

Used for TTS service to avoid multiple initializations:

```python
_tts_instance = None

def get_tts_service():
    global _tts_instance
    if _tts_instance is None:
        _tts_instance = MagpieTTS()
    return _tts_instance
```

### 2. Observer Pattern

WebSocket message handlers:

```javascript
wsManager.on('letter_decoded', (data) => {
    // Handle letter decoded event
});
```

### 3. State Machine

Morse decoder maintains state:
- Idle
- Detecting (building pattern)
- Letter complete
- Word complete

### 4. Service Layer Pattern

Business logic separated into services:
- `BlinkDetector`: Encapsulates blink detection
- `MorseDecoder`: Encapsulates Morse logic
- `MagpieTTS`: Encapsulates TTS functionality

## Performance Considerations

### Frame Rate Optimization

- **Capture**: 10 FPS (100ms interval)
- **Processing**: Async, non-blocking
- **Display**: Real-time updates

**Why 10 FPS?**
- Sufficient for blink detection
- Reduces bandwidth
- Lowers CPU usage
- Maintains responsiveness

### Image Compression

- JPEG quality: 80%
- Resolution: 1280x720
- Base64 encoding overhead: ~37%

### WebSocket Optimization

- Binary frames (future): 50% smaller
- Message batching (future)
- Compression (future)

### Caching Strategy

- Morse code mappings: In-memory
- TTS responses: Could cache common phrases
- Static assets: Browser cache

## Security Considerations

### Current (Local Deployment)

- ✅ No authentication (local only)
- ✅ Environment variables for secrets
- ✅ No data storage
- ✅ Local camera access only

### Production Recommendations

- 🔒 HTTPS/WSS required
- 🔒 JWT authentication
- 🔒 Rate limiting
- 🔒 Input validation & sanitization
- 🔒 CORS policy
- 🔒 CSP headers
- 🔒 Encrypted environment variables

## Scalability

### Current Limitations

- **Single User**: One session at a time (per instance)
- **No Persistence**: Session data not saved
- **No Multi-tenancy**: One deployment per user

### Scaling Options

**Horizontal Scaling:**
- Multiple FastAPI instances
- Load balancer (nginx/HAProxy)
- Redis for session management

**Vertical Scaling:**
- More CPU for faster processing
- More RAM for multiple sessions
- GPU for faster inference (future)

**Database (if needed):**
- PostgreSQL for user data
- Redis for session state
- MongoDB for logs

## Error Handling

### Client-Side

```javascript
try {
    // WebSocket operation
} catch (error) {
    updateStatus('Connection error', 'error');
    // Attempt reconnection
}
```

### Server-Side

```python
try:
    # Blink detection
except Exception as e:
    await session.send_status("error", {"error": str(e)})
```

### Recovery Strategies

1. **WebSocket Disconnect**: Auto-reconnect with exponential backoff
2. **Camera Failure**: Prompt user to check permissions
3. **TTS Failure**: Display error, continue without audio
4. **Invalid Morse**: Ignore pattern, continue detection

## Testing Strategy

### Unit Tests (Recommended)

```python
# test_morse_decoder.py
def test_decode_letter_a():
    decoder = MorseDecoder()
    assert decoder.decode_morse_pattern('.-') == 'A'

def test_blink_detection():
    detector = BlinkDetector()
    # Test with mock frame
```

### Integration Tests

```python
# test_api.py
def test_tts_endpoint():
    response = client.post('/api/tts', json={'text': 'test'})
    assert response.status_code == 200
```

### End-to-End Tests

```javascript
// test_ui.js
describe('Patient Mode', () => {
    it('should connect to WebSocket', async () => {
        // Test WebSocket connection
    });
});
```

## Future Enhancements

### Phase 2 (Recommended)

- ✨ User accounts & profiles
- ✨ Custom phrase library
- ✨ Session history & analytics
- ✨ Multi-language support
- ✨ Mobile app (React Native)

### Phase 3 (Advanced)

- 🚀 AI-powered phrase prediction
- 🚀 Voice command integration
- 🚀 Multi-modal input (blink + gaze)
- 🚀 EMR/EHR integration
- 🚀 Caregiver dashboard

## Deployment Options

### 1. Local Desktop (Current)

```bash
python run.py
```

**Pros**: Simple, private, fast
**Cons**: One user at a time

### 2. Local Network (LAN)

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

**Pros**: Multiple devices, shared access
**Cons**: Network setup required

### 3. Cloud Deployment

**AWS/GCP/Azure:**
- EC2/Compute Engine/VM
- Docker container
- Kubernetes cluster (overkill for now)

**Pros**: Remote access, scalable
**Cons**: Cost, latency, privacy concerns

### 4. Raspberry Pi (Edge Device)

**Pros**: Low cost, portable, private
**Cons**: Limited performance

## Monitoring & Logging

### Recommended Tools

- **Application Logs**: Python `logging` module
- **Metrics**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **Performance**: New Relic / DataDog

### Key Metrics to Track

- Blink detection accuracy
- Frame processing time
- WebSocket connection stability
- TTS generation time
- User session duration

## Conclusion

This architecture provides:
- ✅ Clean separation of concerns
- ✅ Modular, maintainable code
- ✅ Real-time performance
- ✅ Scalability foundation
- ✅ Security best practices
- ✅ Comprehensive error handling

**Production-ready foundation for an assistive AI system.**

---

For implementation details, see:
- [README.md](README.md) - Project overview
- [QUICK_START.md](QUICK_START.md) - Setup guide
- [API_DOCS.md](API_DOCS.md) - API reference
