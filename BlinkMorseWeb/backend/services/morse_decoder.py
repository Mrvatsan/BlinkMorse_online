"""
Morse Code Decoder Service
Converts blink patterns into Morse code and decodes to text
"""
import time
from typing import Optional, List, Dict
from backend.config import (
    DOT_DURATION_MAX,
    DASH_DURATION_MIN,
    LETTER_PAUSE,
    WORD_PAUSE,
    PATIENT_COMMANDS
)


class MorseDecoder:
    """
    Decodes Morse code patterns from blink timings
    Supports both simplified patient mode and standard learner mode
    """
    
    # SIMPLIFIED PATIENT MODE MAPPING (Easy, Short Patterns)
    PATIENT_MORSE_MAP = {
        '.': 'YES',
        '.-': 'NO',
        '...': 'WATER',
        '-.': 'PAIN',
        '..--': 'EMERGENCY',
        '---': 'FAMILY',
        '..': 'BATHROOM'
    }
    
    # STANDARD A-Z MORSE CODE (Learner Mode Only)
    MORSE_CODE_DICT = {
        '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
        '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
        '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
        '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
        '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
        '--..': 'Z'
    }
    
    def __init__(self):
        self.current_morse = []
        self.current_word = []
        self.decoded_text = ""
        self.last_blink_time = None
        self.blink_start_time = None
        self.is_blinking = False
        self.patient_mode = False
        
    def set_patient_mode(self, enabled: bool):
        """Enable or disable patient mode"""
        self.patient_mode = enabled
        
    def start_blink(self):
        """Mark the start of a blink"""
        self.blink_start_time = time.time()
        self.is_blinking = True
        
    def end_blink(self) -> Optional[str]:
        """
        Mark the end of a blink and determine if it's a dot or dash
        
        Returns:
            Optional[str]: 'dot' or 'dash' or None
        """
        if not self.is_blinking or self.blink_start_time is None:
            return None
            
        duration = time.time() - self.blink_start_time
        self.last_blink_time = time.time()
        self.is_blinking = False
        
        # Determine dot or dash based on duration
        if duration < DOT_DURATION_MAX:
            self.current_morse.append('.')
            return 'dot'
        elif duration >= DASH_DURATION_MIN:
            self.current_morse.append('-')
            return 'dash'
        
        return None
    
    def check_timeouts(self) -> Dict[str, Optional[str]]:
        """
        Check for letter and word pauses
        
        Returns:
            Dict with 'letter' and 'word' keys containing decoded text or None
        """
        result = {'letter': None, 'word': None, 'status': 'idle'}
        
        if self.last_blink_time is None:
            return result
            
        elapsed = time.time() - self.last_blink_time
        
        # Check for word pause (longer)
        if elapsed >= WORD_PAUSE and len(self.current_word) > 0:
            # Complete word
            word = ''.join(self.current_word)
            self.decoded_text += word + " "
            self.current_word = []
            self.current_morse = []
            result['word'] = word
            result['status'] = 'word_complete'
            return result
        
        # Check for letter pause
        if elapsed >= LETTER_PAUSE and len(self.current_morse) > 0:
            # Decode current morse pattern
            morse_pattern = ''.join(self.current_morse)
            letter = self.decode_morse_pattern(morse_pattern)
            
            if letter:
                self.current_word.append(letter)
                result['letter'] = letter
                result['status'] = 'letter_complete'
            
            self.current_morse = []
            return result
        
        # Check status
        if len(self.current_morse) > 0:
            result['status'] = 'decoding'
        
        return result
    
    def decode_morse_pattern(self, pattern: str) -> Optional[str]:
        """
        Decode a Morse code pattern to a character/command
        
        Args:
            pattern: Morse code pattern (e.g., '.-' for A or NO)
            
        Returns:
            Optional[str]: Decoded character/command or None
        """
        # PATIENT MODE: Use simplified mapping only
        if self.patient_mode:
            result = self.PATIENT_MORSE_MAP.get(pattern, None)
            if result is None:
                print(f"[Patient Mode] Pattern not recognized: {pattern}")
            return result
        
        # LEARNER MODE: Use standard A-Z Morse only
        else:
            result = self.MORSE_CODE_DICT.get(pattern, None)
            if result is None:
                print(f"[Learner Mode] Invalid pattern: {pattern}")
            return result
    
    def get_current_morse_pattern(self) -> str:
        """Get the current Morse pattern being built"""
        return ''.join(self.current_morse)
    
    def get_current_word(self) -> str:
        """Get the current word being built"""
        return ''.join(self.current_word)
    
    def get_decoded_text(self) -> str:
        """Get all decoded text"""
        return self.decoded_text
    
    def reset(self):
        """Reset all decoder state"""
        self.current_morse = []
        self.current_word = []
        self.decoded_text = ""
        self.last_blink_time = None
        self.blink_start_time = None
        self.is_blinking = False
    
    @staticmethod
    def get_morse_reference() -> Dict[str, str]:
        """
        Get complete Morse code reference for LEARNER mode
        
        Returns:
            Dict mapping characters to Morse code
        """
        return {v: k for k, v in MorseDecoder.MORSE_CODE_DICT.items()}
    
    @staticmethod
    def get_patient_commands() -> Dict[str, str]:
        """
        Get patient mode simplified commands
        
        Returns:
            Dict mapping command names to Morse patterns
        """
        return MorseDecoder.PATIENT_MORSE_MAP.copy()
