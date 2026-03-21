# API Documentation - Blink Morse Web

## Overview

Blink Morse Web provides both REST API endpoints and WebSocket connections for real-time communication.

**Base URL**: `http://localhost:8000`

---

## REST API Endpoints

### User Login

**Endpoint**: `POST /api/login`

**Description**: First login for a username stores a password hash. Next logins must use the same password.

**Request Body**:
```json
{
  "name": "vatsan",
  "role": "user",
  "password": "secret123"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Login successful",
  "name": "vatsan",
  "role": "user"
}
```

**Response** (Wrong Password):
```json
{
  "success": false,
  "message": "Wrong password, please enter again"
}
```

---

### Health Check

**Endpoint**: `GET /health`

**Description**: Check server and TTS service status

**Response**:
```json
{
  "status": "healthy",
  "tts_service": "available",
  "timestamp": 1704484800.0
}
```

---

### Decode Morse Pattern

**Endpoint**: `POST /api/decode`

**Description**: Decode a Morse code pattern to text

**Request Body**:
```json
{
  "morse_pattern": ".-",
  "patient_mode": false
}
```

**Response** (Success):
```json
{
  "success": true,
  "pattern": ".-",
  "decoded": "A"
}
```

**Response** (Invalid Pattern):
```json
{
  "success": false,
  "pattern": "...---",
  "error": "Invalid Morse pattern"
}
```

---

### Text-to-Speech

**Endpoint**: `POST /api/tts`

**Description**: Convert text to speech (returns base64 audio)

**Request Body**:
```json
{
  "text": "Hello World"
}
```

**Response** (Success):
```json
{
  "success": true,
  "text": "Hello World",
  "audio": "UklGRiQAAABXQVZFZm10IBAAA..." 
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Failed to generate speech"
}
```

---

### Multilingual Text → Speech (IndicF5)

**Endpoint**: `POST /api/generate-speech`

**Description**: Translate English text into a selected Indian language and generate speech audio using the IndicF5 model. Returns translated text and a URL to the WAV file.

**Supported output languages** (Normal & Patient modes):

- English (default)
- Tamil
- Hindi
- Telugu
- Kannada
- Malayalam
- Bengali
- Marathi
- Gujarati

**API language codes** (for `language` field):

- `en` – English
- `ta` – Tamil
- `hi` – Hindi
- `te` – Telugu
- `kn` – Kannada
- `ml` – Malayalam
- `bn` – Bengali
- `mr` – Marathi
- `gu` – Gujarati

**Request Body**:
```json
{
  "text": "I need water",
  "language": "ta"
}
```

**Processing Pipeline**:

1. Validate non-empty `text`.
2. Translate from English into `language` using the translation service.
3. Generate speech with IndicF5 using a language-specific prompt.
4. Save audio to `static/audio/output.wav`.

**Response** (Success):
```json
{
  "success": true,
  "translated_text": "...",  
  "audio_url": "/static/audio/output.wav"
}
```

**Response** (Client Error - unsupported language / empty text):
```json
{
  "detail": "Unsupported language code: xx"
}
```

**Response** (Upstream translation error):
```json
{
  "detail": "Translation failed: <reason>"
}
```

**Response** (TTS configuration / runtime error):
```json
{
  "detail": "TTS generation failed: <reason>"
}
```

---

### Get Morse Reference

**Endpoint**: `GET /api/morse_reference`

**Description**: Get complete Morse code mapping

**Response**:
```json
{
  "success": true,
  "morse_code": {
    "A": ".-",
    "B": "-...",
    "C": "-.-.",
    ...
  }
}
```

---

### Get Patient Commands

**Endpoint**: `GET /api/patient_commands`

**Description**: Get patient mode quick commands

**Response**:
```json
{
  "success": true,
  "commands": {
    "food": "..-. --- --- -..",
    "water": ".-- .- - . .-.",
    "help": ".... . .-.. .--.",
    ...
  }
}
```

---

## WebSocket API

### Blink Detection WebSocket

**Endpoint**: `WS /ws/blink`

**Description**: Real-time blink detection and Morse decoding

### Connection Flow

1. **Connect** to WebSocket
2. **Send** initialization message
3. **Send** video frames
4. **Receive** detection results

### Message Types

#### Client → Server

**Initialize Session**:
```json
{
  "type": "init",
  "patient_mode": true
}
```

**Send Video Frame**:
```json
{
  "type": "frame",
  "frame": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Reset Session**:
```json
{
  "type": "reset"
}
```

**Ping (Keep-Alive)**:
```json
{
  "type": "ping"
}
```

#### Server → Client

**Connection Confirmed**:
```json
{
  "type": "status",
  "status": "connected",
  "patient_mode": true,
  "message": "Blink detection session started",
  "timestamp": 1704484800.0
}
```

**Blink Detected**:
```json
{
  "type": "status",
  "status": "blink_detected",
  "blink_type": "dot",
  "morse_pattern": ".-",
  "timestamp": 1704484801.0
}
```

**Letter Decoded**:
```json
{
  "type": "status",
  "status": "letter_decoded",
  "letter": "A",
  "current_word": "A",
  "timestamp": 1704484802.0
}
```

**Word Complete**:
```json
{
  "type": "status",
  "status": "word_complete",
  "word": "HELP",
  "full_text": "HELP ",
  "timestamp": 1704484805.0
}
```

**TTS Ready**:
```json
{
  "type": "status",
  "status": "tts_ready",
  "word": "HELP",
  "audio": "UklGRiQAAABXQVZFZm10IBAAA...",
  "timestamp": 1704484806.0
}
```

**Frame State Update**:
```json
{
  "type": "state",
  "ear": 0.215,
  "morse_pattern": ".-",
  "current_word": "A",
  "decoded_text": "HELP ",
  "status": "decoding",
  "annotated_frame": "data:image/jpeg;base64,/9j/4AAQ...",
  "timestamp": 1704484801.5
}
```

**Error**:
```json
{
  "type": "status",
  "status": "error",
  "error": "Camera feed error",
  "timestamp": 1704484807.0
}
```

---

## Data Models

### Eye Aspect Ratio (EAR)

- **Type**: Float
- **Range**: 0.0 - 1.0
- **Threshold**: ~0.21 (configurable)
- **Description**: Ratio indicating eye openness

### Blink Types

- **dot**: Quick blink (< 0.4s)
- **dash**: Long blink (≥ 0.4s)

### Status Types

- **idle**: No activity
- **decoding**: Processing blinks
- **success**: Action completed
- **error**: Error occurred

### Morse Pattern Format

- **Characters**: `.` (dot) and `-` (dash)
- **Example**: `.-` (letter A)
- **Display**: Spaced for readability: `. -`

---

## Error Codes

### HTTP Errors

- **400**: Bad Request (invalid input)
- **500**: Internal Server Error
- **503**: Service Unavailable (TTS error)

### WebSocket Errors

- **Connection Closed**: Network issue or server restart
- **Invalid Message**: Malformed JSON
- **Camera Error**: Camera access denied or failure

---

## Rate Limits

- **REST API**: No limits (local deployment)
- **WebSocket**: 10 frames/second recommended
- **TTS**: Subject to NVIDIA API limits

---

## Authentication

The landing page login now validates username/password via `POST /api/login`.
Password hashes are stored in a local SQLite database for repeat login validation.

Current scope:
- Local username + password verification
- No JWT session tokens
- Session maintained in browser sessionStorage

For production:
- Implement JWT or OAuth
- Add API keys for endpoints
- Secure WebSocket connections (WSS)

---

## Examples

### JavaScript (Fetch API)

```javascript
// Get Morse reference
const response = await fetch('http://localhost:8000/api/morse_reference');
const data = await response.json();
console.log(data.morse_code);

// Text-to-Speech
const ttsResponse = await fetch('http://localhost:8000/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Hello' })
});
const ttsData = await ttsResponse.json();
// Play audio: ttsData.audio (base64)
```

### JavaScript (WebSocket)

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/blink');

ws.onopen = () => {
  // Initialize
  ws.send(JSON.stringify({
    type: 'init',
    patient_mode: true
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'status' && data.status === 'tts_ready') {
    // Play audio
    playAudio(data.audio);
  }
};

// Send frame
function sendFrame(base64Image) {
  ws.send(JSON.stringify({
    type: 'frame',
    frame: base64Image
  }));
}
```

### Python (Requests)

```python
import requests

# Get patient commands
response = requests.get('http://localhost:8000/api/patient_commands')
commands = response.json()
print(commands['commands'])

# Decode morse
response = requests.post(
    'http://localhost:8000/api/decode',
    json={'morse_pattern': '...', 'patient_mode': False}
)
result = response.json()
print(result['decoded'])  # 'S'
```

---

## Performance Optimization

### Client-Side

- **Frame Rate**: Send 5-10 frames/second (not 30+)
- **Image Quality**: JPEG quality 70-80% sufficient
- **Resolution**: 640x480 adequate for detection

### Server-Side

- **Async Processing**: FastAPI handles concurrency
- **Resource Limits**: Monitor CPU/RAM usage
- **Caching**: TTS responses can be cached

---

## Security Best Practices

1. **HTTPS**: Use SSL in production
2. **WSS**: Secure WebSocket connections
3. **API Keys**: Never expose in client code
4. **CORS**: Configure allowed origins
5. **Input Validation**: Sanitize all inputs
6. **Rate Limiting**: Implement for production

---

## Deployment

### Local Development

```bash
uvicorn backend.main:app --reload
```

### Production

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker (Future)

```dockerfile
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0"]
```

---

**For more information, see the main [README.md](README.md)**
