"""
Blink Detection Service
Detects eye blinks from video frames using MediaPipe Face Mesh
"""
import cv2
import numpy as np
import mediapipe as mp
from typing import Tuple, Optional
from backend.config import (
    EAR_THRESHOLD,
    LEFT_EYE_INDICES,
    RIGHT_EYE_INDICES,
    FACE_MESH_MAX_FACES,
    FACE_MESH_MIN_DETECTION_CONFIDENCE,
    FACE_MESH_MIN_TRACKING_CONFIDENCE
)


class BlinkDetector:
    """
    Detects eye blinks using Eye Aspect Ratio (EAR) method
    with MediaPipe Face Mesh landmarks
    """
    
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=FACE_MESH_MAX_FACES,
            refine_landmarks=True,
            min_detection_confidence=FACE_MESH_MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=FACE_MESH_MIN_TRACKING_CONFIDENCE
        )
        self.ear_threshold = EAR_THRESHOLD
        self.blink_detected = False
        self.prev_ear = 1.0
        
    def calculate_ear(self, eye_landmarks: np.ndarray) -> float:
        """
        Calculate Eye Aspect Ratio (EAR)
        
        EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
        where p1-p6 are the eye landmark points
        
        Args:
            eye_landmarks: Array of eye landmark coordinates
            
        Returns:
            float: Eye Aspect Ratio value
        """
        # Vertical distances
        A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
        
        # Horizontal distance
        C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
        
        # EAR calculation
        if C == 0:
            return 1.0
            
        ear = (A + B) / (2.0 * C)
        return ear
    
    def get_eye_landmarks(self, landmarks, indices: list, 
                         width: int, height: int) -> np.ndarray:
        """
        Extract eye landmarks from face mesh
        
        Args:
            landmarks: MediaPipe face mesh landmarks
            indices: List of landmark indices for the eye
            width: Image width
            height: Image height
            
        Returns:
            np.ndarray: Array of eye landmark coordinates
        """
        coords = []
        for idx in indices:
            landmark = landmarks[idx]
            x = int(landmark.x * width)
            y = int(landmark.y * height)
            coords.append([x, y])
        
        return np.array(coords, dtype=np.float32)
    
    def detect_blink(self, frame: np.ndarray) -> Tuple[bool, float, Optional[np.ndarray]]:
        """
        Detect blink in a single frame
        
        Args:
            frame: Input image frame (BGR format)
            
        Returns:
            Tuple of (blink_detected, current_ear, annotated_frame)
        """
        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        
        blink = False
        current_ear = 1.0
        annotated_frame = frame.copy()
        
        if results.multi_face_landmarks:
            face_landmarks = results.multi_face_landmarks[0]
            
            h, w = frame.shape[:2]
            
            # Get left and right eye landmarks
            left_eye = self.get_eye_landmarks(
                face_landmarks.landmark, 
                LEFT_EYE_INDICES, 
                w, h
            )
            right_eye = self.get_eye_landmarks(
                face_landmarks.landmark,
                RIGHT_EYE_INDICES,
                w, h
            )
            
            # Calculate EAR for both eyes
            left_ear = self.calculate_ear(left_eye)
            right_ear = self.calculate_ear(right_eye)
            
            # Average EAR
            current_ear = (left_ear + right_ear) / 2.0
            
            # Detect blink (EAR drops below threshold)
            if current_ear < self.ear_threshold and self.prev_ear >= self.ear_threshold:
                blink = True
                self.blink_detected = True
            elif current_ear >= self.ear_threshold:
                self.blink_detected = False
            
            self.prev_ear = current_ear
            
            # Draw eye landmarks on frame (visual feedback)
            for point in left_eye:
                cv2.circle(annotated_frame, tuple(point.astype(int)), 2, (0, 255, 0), -1)
            for point in right_eye:
                cv2.circle(annotated_frame, tuple(point.astype(int)), 2, (0, 255, 0), -1)
        
        return blink, current_ear, annotated_frame
    
    def is_eyes_closed(self, ear: float) -> bool:
        """
        Check if eyes are currently closed
        
        Args:
            ear: Current Eye Aspect Ratio
            
        Returns:
            bool: True if eyes are closed
        """
        return ear < self.ear_threshold
    
    def cleanup(self):
        """Release resources"""
        if hasattr(self, 'face_mesh'):
            self.face_mesh.close()
