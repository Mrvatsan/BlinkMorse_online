"""
Blink Morse Web - Application Entry Point
Run this file to start the web server
"""
import uvicorn
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    print("=" * 60)
    print("Blink Morse Web - Online Assistive AI System")
    print("=" * 60)
    print(f"Server starting on http://{host}:{port}")
    print("Make sure your webcam is connected")
    print("NVIDIA API Key loaded from .env file")
    print("=" * 60)
    print(f"\nAccess the application at: http://localhost:{port}\n")
    
    # Run the FastAPI application
    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
