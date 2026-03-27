"""
FastAPI Main Application
Handles HTTP endpoints and WebSocket connections
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import time
import sqlite3
import hashlib
import os
# import cv2  # Removed to avoid crash
import base64
from typing import Optional

from backend.config import STATIC_DIR, STATIC_AUDIO_DIR, FRONTEND_DIR
# from backend.services.blink_detection import BlinkDetector # Removed to avoid crash
from backend.services.morse_decoder import MorseDecoder
from backend.services.tts_kokoro import get_tts_service
from backend.services.commands_manager import CommandsManager
from translation.translator import translate_text
from speech.tts_engine import generate_speech as indic_generate_speech
# from backend.utils.helpers import decode_base64_to_frame, encode_frame_to_base64 # Removed to avoid crash

# Initialize FastAPI app
app = FastAPI(
    title="Blink Morse Web API",
    description="Online Assistive AI System for Eye Blink Communication",
    version="1.0.0"
)

# CORS middleware for web browser access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (audio output)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Pydantic models for request/response
class DecodeRequest(BaseModel):
    morse_pattern: str
    patient_mode: bool = False

class TTSRequest(BaseModel):
    text: str


class GenerateSpeechRequest(BaseModel):
    text: str
    language: str
    voice: str = "female"

class UserLoginRequest(BaseModel):
    name: str
    role: str
    password: str

class CommandsUpdateRequest(BaseModel):
    commands: dict


# ============================================================================
# Login persistence (SQLite)
# ============================================================================

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "auth.db")


def init_auth_db():
    """Create auth database and table if missing."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL,
                salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def hash_password(password: str, salt_hex: str) -> str:
    """Derive a secure hash from password + salt."""
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        120000,
    ).hex()


def normalize_name(name: str) -> str:
    return (name or "").strip().lower()


@app.post("/api/login")
async def login_user(request: UserLoginRequest):
    """Register first-time password or validate existing password."""
    user_name = normalize_name(request.name)
    role = (request.role or "user").strip() or "user"
    password = (request.password or "").strip()

    if not user_name:
        raise HTTPException(status_code=400, detail="Name is required")

    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    now = time.time()
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name, role, salt, password_hash FROM users WHERE name = ?",
            (user_name,),
        )
        row = cursor.fetchone()

        # First login for this user: store password in DB
        if row is None:
            salt_hex = os.urandom(16).hex()
            pass_hash = hash_password(password, salt_hex)
            cursor.execute(
                """
                INSERT INTO users (name, role, salt, password_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_name, role, salt_hex, pass_hash, now, now),
            )
            conn.commit()
            return JSONResponse(
                {
                    "success": True,
                    "message": "Login successful",
                    "name": user_name,
                    "role": role,
                }
            )

        saved_name, saved_role, salt_hex, saved_hash = row
        input_hash = hash_password(password, salt_hex)
        if input_hash != saved_hash:
            return JSONResponse(
                {
                    "success": False,
                    "message": "Wrong password, please enter again",
                },
                status_code=401,
            )

        cursor.execute(
            "UPDATE users SET role = ?, updated_at = ? WHERE name = ?",
            (role, now, user_name),
        )
        conn.commit()

        return JSONResponse(
            {
                "success": True,
                "message": "Login successful",
                "name": saved_name,
                "role": role or saved_role,
            }
        )
    finally:
        conn.close()


# ============================================================================
# HTTP Endpoints
# ============================================================================

@app.get("/")
async def serve_frontend():
    """Serve the main frontend page"""
    return FileResponse(f"{FRONTEND_DIR}/index.html")

@app.get("/mode_selection.html")
async def serve_mode_selection():
    """Serve mode selection page"""
    return FileResponse(f"{FRONTEND_DIR}/mode_selection.html")

@app.get("/patient_mode.html")
async def serve_patient_mode():
    """Serve patient mode page"""
    return FileResponse(f"{FRONTEND_DIR}/patient_mode.html")

@app.get("/patient_sensitivity.html")
async def serve_patient_sensitivity():
    """Serve patient sensitivity selection page"""
    return FileResponse(f"{FRONTEND_DIR}/patient_sensitivity.html")

@app.get("/morse_mode.html")
async def serve_morse_mode():
    """Serve morse learning mode page"""
    return FileResponse(f"{FRONTEND_DIR}/morse_mode.html")

@app.get("/normal_mode.html")
async def serve_normal_mode():
    """Serve normal morse mode page"""
    return FileResponse(f"{FRONTEND_DIR}/normal_mode.html")

@app.get("/calibration.html")
async def serve_calibration_page():
    """Serve dedicated calibration page"""
    return FileResponse(f"{FRONTEND_DIR}/calibration.html")

@app.get("/css/{filename}")
async def serve_css(filename: str):
    """Serve CSS files"""
    return FileResponse(f"{FRONTEND_DIR}/css/{filename}")

@app.get("/js/{filename}")
async def serve_javascript(filename: str):
    """Serve JavaScript files"""
    return FileResponse(f"{FRONTEND_DIR}/js/{filename}")

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    Verifies TTS service is available
    """
    try:
        tts = get_tts_service()
        tts_healthy = tts.health_check()
        
        return JSONResponse({
            "status": "healthy",
            "tts_service": "available" if tts_healthy else "unavailable",
            "timestamp": time.time()
        })
    except Exception as e:
        return JSONResponse({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }, status_code=500)

@app.post("/api/decode")
async def decode_morse(request: DecodeRequest):
    """
    Decode a Morse code pattern to text
    
    Args:
        request: DecodeRequest with morse_pattern and patient_mode
        
    Returns:
        JSONResponse with decoded character or error
    """
    try:
        decoder = MorseDecoder()
        decoder.set_patient_mode(request.patient_mode)
        
        decoded = decoder.decode_morse_pattern(request.morse_pattern)
        
        if decoded:
            return JSONResponse({
                "success": True,
                "pattern": request.morse_pattern,
                "decoded": decoded
            })
        else:
            return JSONResponse({
                "success": False,
                "pattern": request.morse_pattern,
                "error": "Invalid Morse pattern"
            })
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech
    
    Args:
        request: TTSRequest with text to convert
        
    Returns:
        JSONResponse with base64-encoded audio data
    """
    try:
        tts = get_tts_service()
        
        # Generate audio as base64
        audio_base64 = tts.text_to_speech_base64(request.text)
        
        if audio_base64:
            return JSONResponse({
                "success": True,
                "text": request.text,
                "audio": audio_base64
            })
        else:
            return JSONResponse({
                "success": False,
                "error": "Failed to generate speech"
            }, status_code=500)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-speech")
async def generate_speech_endpoint(request: GenerateSpeechRequest):
    """Translate text and generate multilingual speech using IndicF5.

    Request body
    ------------
    {
        "text": "I need water",
        "language": "ta",
        "voice": "female"
    }

    Response body
    -------------
    {
        "success": true,
        "translated_text": "...",
        "audio_url": "/static/audio/output.wav"
    }
    """
    raw_text = (request.text or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    voice_profile = (request.voice or "female").strip().lower()
    if voice_profile not in {"default", "male", "female"}:
        voice_profile = "female"

    # Step 1: translate
    try:
        translated = translate_text(raw_text, request.language)
    except ValueError as ve:
        # Validation issues (unsupported language, empty text, etc.)
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except RuntimeError as re:
        # Upstream translation failure (e.g. network issue)
        raise HTTPException(status_code=502, detail=str(re)) from re

    # Step 2: TTS generation.
    # English uses Kokoro directly so selected voice profile is honored.
    # Non-English tries IndicF5 first, then falls back to Kokoro.
    audio_path = None
    indic_error = None
    if request.language == "en":
        try:
            tts = get_tts_service()
            audio_bytes = tts.text_to_speech(translated, voice_profile=voice_profile)
            if not audio_bytes:
                raise RuntimeError("Kokoro did not return audio data")

            fallback_filename = "output_fallback.wav"
            fallback_path = os.path.join(STATIC_AUDIO_DIR, fallback_filename)
            with open(fallback_path, "wb") as f:
                f.write(audio_bytes)
            audio_path = fallback_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}") from e
    else:
        try:
            audio_path = indic_generate_speech(translated, request.language)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve)) from ve
        except Exception as e:
            indic_error = e

    if not audio_path:
        try:
            tts = get_tts_service()
            audio_bytes = tts.text_to_speech(translated, voice_profile=voice_profile)
            if not audio_bytes:
                raise RuntimeError("Kokoro did not return audio data")

            fallback_filename = "output_fallback.wav"
            fallback_path = os.path.join(STATIC_AUDIO_DIR, fallback_filename)
            with open(fallback_path, "wb") as f:
                f.write(audio_bytes)
            audio_path = fallback_path
        except Exception as fallback_error:
            detail = f"TTS generation failed: {fallback_error}"
            if indic_error is not None:
                detail = f"TTS generation failed (IndicF5: {indic_error}; Kokoro: {fallback_error})"
            raise HTTPException(status_code=500, detail=detail) from fallback_error

    # Normalize backend file path to a browser URL under /static
    norm_path = str(audio_path).replace("\\", "/")
    static_root = os.path.abspath(STATIC_DIR).replace("\\", "/")
    abs_audio_path = os.path.abspath(str(audio_path)).replace("\\", "/")

    if abs_audio_path.startswith(static_root.rstrip("/") + "/"):
        rel_path = abs_audio_path[len(static_root.rstrip("/")) + 1 :]
        audio_url = f"/static/{rel_path}"
    elif norm_path.startswith("/static/"):
        audio_url = norm_path
    elif norm_path.startswith("static/"):
        audio_url = "/" + norm_path
    else:
        audio_url = f"/static/audio/{os.path.basename(norm_path)}"

    return JSONResponse({
        "success": True,
        "translated_text": translated,
        "audio_url": audio_url,
        "voice": voice_profile,
    })

@app.get("/api/morse_reference")
async def get_morse_reference():
    """
    Get complete Morse code reference
    
    Returns:
        JSONResponse with Morse code mappings
    """
    reference = MorseDecoder.get_morse_reference()
    return JSONResponse({
        "success": True,
        "morse_code": reference
    })

@app.get("/api/patient_commands")
async def get_patient_commands():
    """
    Get patient mode dict
    """
    commands = CommandsManager.get_commands()
    return JSONResponse({
        "success": True,
        "commands": commands
    })

@app.post("/api/patient_commands")
async def update_patient_commands(request: CommandsUpdateRequest):
    """
    Update patient mode quick commands
    """
    success = CommandsManager.save_commands(request.commands)
    if success:
        return JSONResponse({
            "success": True,
            "message": "Commands updated successfully"
        })
    else:
        return JSONResponse({
            "success": False,
            "error": "Failed to save commands"
        }, status_code=500)


# WebSocket Blink Detection logic commented out as it's no longer used in the new frontend approach
"""
class BlinkSession:
    # ... (BlinkSession implementation)
"""



"""
@app.websocket("/ws/blink")
async def websocket_blink_detection(websocket: WebSocket):
    # ... (websocket_blink_detection implementation)
"""


# ============================================================================
# Startup Event
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("\n" + "=" * 60)
    print("Blink Morse Web - Starting Up")
    print("=" * 60)

    # Ensure auth DB exists for login password persistence
    init_auth_db()
    
    # Initialize TTS service
    try:
        tts = get_tts_service()
        print("NVIDIA Magpie-TTS service initialized")
    except Exception as e:
        print(f"TTS initialization warning: {e}")
        print("   Text-to-speech may not be available")

    # Initialize IndicF5 multilingual TTS (optional, best-effort)
    try:
        from speech.tts_engine import get_tts_engine

        get_tts_engine()
        print("IndicF5 multilingual TTS engine initialized")
    except Exception as e:
        print(f"IndicF5 initialization warning: {e}")
        print("   Multilingual speech may not be available until configured")
    
    print("=" * 60)
    print("Server ready for connections")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
