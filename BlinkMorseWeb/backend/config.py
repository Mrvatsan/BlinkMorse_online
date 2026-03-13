"""Configuration Settings for Blink Morse Web.

All filesystem paths are computed relative to the BlinkMorseWeb
project root so the app works regardless of the current working
directory used to start the server.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# NVIDIA API Configuration
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# Blink Detection Thresholds
EAR_THRESHOLD = float(os.getenv("EAR_THRESHOLD", 0.21))
DOT_DURATION_MAX = float(os.getenv("DOT_DURATION_MAX", 0.4))
DASH_DURATION_MIN = float(os.getenv("DASH_DURATION_MIN", 0.4))
LETTER_PAUSE = float(os.getenv("LETTER_PAUSE", 1.0))
WORD_PAUSE = float(os.getenv("WORD_PAUSE", 2.5))

# Camera Settings
CAMERA_WIDTH = int(os.getenv("CAMERA_WIDTH", 1280))
CAMERA_HEIGHT = int(os.getenv("CAMERA_HEIGHT", 720))

# MediaPipe Face Mesh Settings
FACE_MESH_MAX_FACES = 1
FACE_MESH_MIN_DETECTION_CONFIDENCE = 0.5
FACE_MESH_MIN_TRACKING_CONFIDENCE = 0.5

# Eye Landmark Indices (MediaPipe Face Mesh)
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

# NVIDIA Riva TTS Settings
RIVA_SERVER = "grpc.nvcf.nvidia.com:443"
RIVA_VOICE = "English-US.Female-1"
RIVA_SAMPLE_RATE = 22050
RIVA_LANGUAGE_CODE = "en-US"

# SIMPLIFIED PATIENT MODE COMMANDS (Easy Morse Patterns)
PATIENT_COMMANDS = {
    ".": "YES",
    ".-": "NO",
    "...": "WATER",
    "-.": "PAIN",
    "..--": "EMERGENCY",
    "---": "FAMILY",
    "..": "BATHROOM"
}

# Project root: .../BlinkMorseWeb
BASE_DIR = Path(__file__).resolve().parents[1]

# Static File Paths (absolute)
STATIC_DIR = str(BASE_DIR / "static")
STATIC_AUDIO_DIR = str(BASE_DIR / "static" / "audio")
FRONTEND_DIR = str(BASE_DIR / "frontend")

# Validation
if not NVIDIA_API_KEY:
    print("⚠️  WARNING: NVIDIA_API_KEY not set in .env file!")
    print("   TTS functionality will not work without an API key.")
