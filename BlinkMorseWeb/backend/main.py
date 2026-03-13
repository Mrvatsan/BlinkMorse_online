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

class UserLoginRequest(BaseModel):
    name: str
    role: str

class CommandsUpdateRequest(BaseModel):
    commands: dict


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

@app.get("/morse_mode.html")
async def serve_morse_mode():
    """Serve morse learning mode page"""
    return FileResponse(f"{FRONTEND_DIR}/morse_mode.html")

@app.get("/normal_mode.html")
async def serve_normal_mode():
    """Serve normal morse mode page"""
    return FileResponse(f"{FRONTEND_DIR}/normal_mode.html")

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
        "language": "ta"
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

    # Step 1: translate
    try:
        translated = translate_text(raw_text, request.language)
    except ValueError as ve:
        # Validation issues (unsupported language, empty text, etc.)
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except RuntimeError as re:
        # Upstream translation failure (e.g. network issue)
        raise HTTPException(status_code=502, detail=str(re)) from re

    # Step 2: TTS via IndicF5
    try:
        audio_path = indic_generate_speech(translated, request.language)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve)) from ve
    except Exception as e:  # Catch all TTS errors
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}") from e

    # Normalise path and expose as URL
    norm_path = audio_path.replace("\\", "/")
    if not norm_path.startswith("static/"):
        # Assume file is inside STATIC_AUDIO_DIR when a bare filename is returned
        norm_path = f"{STATIC_AUDIO_DIR}/{norm_path}" if "/" not in norm_path else norm_path

    audio_url = "/" + norm_path.lstrip("/")

    return JSONResponse({
        "success": True,
        "translated_text": translated,
        "audio_url": audio_url,
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
