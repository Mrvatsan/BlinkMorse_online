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
import cv2
import base64
from typing import Optional

from backend.config import STATIC_AUDIO_DIR, FRONTEND_DIR
from backend.services.blink_detection import BlinkDetector
from backend.services.morse_decoder import MorseDecoder
from backend.services.tts_magpie import get_tts_service
from backend.utils.helpers import decode_base64_to_frame, encode_frame_to_base64

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
app.mount("/static", StaticFiles(directory="static"), name="static")

# Pydantic models for request/response
class DecodeRequest(BaseModel):
    morse_pattern: str
    patient_mode: bool = False

class TTSRequest(BaseModel):
    text: str

class UserLoginRequest(BaseModel):
    name: str
    role: str


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

@app.get("/css/styles.css")
async def serve_styles():
    """Serve CSS styles"""
    return FileResponse(f"{FRONTEND_DIR}/css/styles.css")

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
    Get patient mode quick commands
    
    Returns:
        JSONResponse with patient command mappings
    """
    commands = MorseDecoder.get_patient_commands()
    return JSONResponse({
        "success": True,
        "commands": commands
    })


# ============================================================================
# WebSocket Endpoint for Real-Time Blink Detection
# ============================================================================

class BlinkSession:
    """Manages a single user's blink detection session"""
    
    def __init__(self, websocket: WebSocket, patient_mode: bool = False):
        self.websocket = websocket
        self.detector = BlinkDetector()
        self.decoder = MorseDecoder()
        self.decoder.set_patient_mode(patient_mode)
        self.active = True
        
    async def send_status(self, status: str, data: dict = None):
        """Send status update to client"""
        message = {
            "type": "status",
            "status": status,
            "timestamp": time.time()
        }
        if data:
            message.update(data)
        
        await self.websocket.send_json(message)
    
    async def process_frame(self, frame_data: str):
        """Process a video frame for blink detection"""
        # Decode frame from base64
        frame = decode_base64_to_frame(frame_data)
        
        if frame is None:
            await self.send_status("error", {"error": "Invalid frame data"})
            return
        
        # Detect blink
        blink, ear, annotated_frame = self.detector.detect_blink(frame)
        
        # Check if eyes are closed (start blink)
        if self.detector.is_eyes_closed(ear) and not self.decoder.is_blinking:
            self.decoder.start_blink()
        
        # Check if eyes opened (end blink)
        if not self.detector.is_eyes_closed(ear) and self.decoder.is_blinking:
            blink_type = self.decoder.end_blink()
            if blink_type:
                await self.send_status("blink_detected", {
                    "blink_type": blink_type,
                    "morse_pattern": self.decoder.get_current_morse_pattern()
                })
        
        # Check for letter/word timeouts
        timeout_result = self.decoder.check_timeouts()
        
        if timeout_result['letter']:
            await self.send_status("letter_decoded", {
                "letter": timeout_result['letter'],
                "current_word": self.decoder.get_current_word()
            })
        
        if timeout_result['word']:
            # Word complete - trigger TTS
            word = timeout_result['word']
            await self.send_status("word_complete", {
                "word": word,
                "full_text": self.decoder.get_decoded_text()
            })
            
            # Generate speech
            try:
                tts = get_tts_service()
                audio_base64 = tts.text_to_speech_base64(word)
                
                if audio_base64:
                    await self.send_status("tts_ready", {
                        "word": word,
                        "audio": audio_base64
                    })
            except Exception as e:
                await self.send_status("tts_error", {"error": str(e)})
        
        # Send current state
        await self.websocket.send_json({
            "type": "state",
            "ear": round(ear, 3),
            "morse_pattern": self.decoder.get_current_morse_pattern(),
            "current_word": self.decoder.get_current_word(),
            "decoded_text": self.decoder.get_decoded_text(),
            "status": timeout_result['status'],
            "annotated_frame": encode_frame_to_base64(annotated_frame)
        })
    
    def cleanup(self):
        """Clean up resources"""
        self.detector.cleanup()
        self.active = False


@app.websocket("/ws/blink")
async def websocket_blink_detection(websocket: WebSocket):
    """
    WebSocket endpoint for real-time blink detection
    
    Client sends video frames, server responds with blink detection results
    """
    await websocket.accept()
    
    session = None
    
    try:
        # Wait for initialization message
        init_msg = await websocket.receive_json()
        
        if init_msg.get("type") != "init":
            await websocket.send_json({
                "type": "error",
                "error": "Expected init message"
            })
            await websocket.close()
            return
        
        # Create session
        patient_mode = init_msg.get("patient_mode", False)
        session = BlinkSession(websocket, patient_mode)
        
        await session.send_status("connected", {
            "patient_mode": patient_mode,
            "message": "Blink detection session started"
        })
        
        # Main processing loop
        while session.active:
            try:
                message = await websocket.receive_json()
                
                msg_type = message.get("type")
                
                if msg_type == "frame":
                    # Process video frame
                    frame_data = message.get("frame")
                    await session.process_frame(frame_data)
                
                elif msg_type == "reset":
                    # Reset decoder state
                    session.decoder.reset()
                    await session.send_status("reset", {
                        "message": "Session reset"
                    })
                
                elif msg_type == "ping":
                    # Keep-alive ping
                    await websocket.send_json({"type": "pong"})
                
                else:
                    await session.send_status("error", {
                        "error": f"Unknown message type: {msg_type}"
                    })
            
            except WebSocketDisconnect:
                break
            
            except Exception as e:
                await session.send_status("error", {
                    "error": str(e)
                })
    
    except Exception as e:
        print(f"WebSocket error: {e}")
    
    finally:
        if session:
            session.cleanup()
        
        try:
            await websocket.close()
        except:
            pass


# ============================================================================
# Startup Event
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("\n" + "=" * 60)
    print("🚀 Blink Morse Web - Starting Up")
    print("=" * 60)
    
    # Initialize TTS service
    try:
        tts = get_tts_service()
        print("✅ NVIDIA Magpie-TTS service initialized")
    except Exception as e:
        print(f"⚠️  TTS initialization warning: {e}")
        print("   Text-to-speech may not be available")
    
    print("=" * 60)
    print("✨ Server ready for connections")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
