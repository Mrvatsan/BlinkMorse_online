"""
Utility Helper Functions
"""
import base64
import numpy as np
import cv2
from typing import Optional


def encode_frame_to_base64(frame: np.ndarray) -> str:
    """
    Encode OpenCV frame to base64 string for web transmission
    
    Args:
        frame: OpenCV image frame (BGR)
        
    Returns:
        str: Base64-encoded JPEG image
    """
    # Encode frame as JPEG
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    
    # Convert to base64
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
    
    return f"data:image/jpeg;base64,{jpg_as_text}"


def decode_base64_to_frame(base64_str: str) -> Optional[np.ndarray]:
    """
    Decode base64 string to OpenCV frame
    
    Args:
        base64_str: Base64-encoded image data
        
    Returns:
        Optional[np.ndarray]: OpenCV image frame or None
    """
    try:
        # Remove data URL prefix if present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        # Decode base64
        img_data = base64.b64decode(base64_str)
        
        # Convert to numpy array
        nparr = np.frombuffer(img_data, np.uint8)
        
        # Decode image
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        return frame
        
    except Exception as e:
        print(f"Error decoding base64 frame: {e}")
        return None


def validate_api_key(api_key: str) -> bool:
    """
    Validate NVIDIA API key format
    
    Args:
        api_key: API key string
        
    Returns:
        bool: True if format is valid
    """
    if not api_key or len(api_key) < 10:
        return False
    
    return True


def format_morse_for_display(morse_pattern: str) -> str:
    """
    Format Morse pattern for display with spacing
    
    Args:
        morse_pattern: Raw morse pattern (e.g., '.-')
        
    Returns:
        str: Formatted pattern (e.g., '. -')
    """
    return ' '.join(list(morse_pattern))
