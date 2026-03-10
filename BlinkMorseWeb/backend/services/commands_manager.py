import json
import os
from typing import Dict

# Define the path to the patient commands JSON file
COMMANDS_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
    "data", 
    "patient_commands.json"
)

# Hardcoded defaults matching the original PATIENT_MORSE_MAP
DEFAULT_COMMANDS = {
    '.': 'YES',
    '.-': 'NO',
    '...': 'WATER',
    '-.': 'PAIN',
    '..--': 'EMERGENCY',
    '---': 'FAMILY',
    '..': 'BATHROOM'
}

class CommandsManager:
    """Manages reading and writing patient mode commands"""
    
    @classmethod
    def get_commands(cls) -> Dict[str, str]:
        """
        Retrieves the commands from the JSON file. 
        If the file doesn't exist, it creates it with the defaults.
        """
        # Ensure the data directory exists
        os.makedirs(os.path.dirname(COMMANDS_FILE_PATH), exist_ok=True)
        
        if not os.path.exists(COMMANDS_FILE_PATH):
            cls.save_commands(DEFAULT_COMMANDS)
            return DEFAULT_COMMANDS.copy()
            
        try:
            with open(COMMANDS_FILE_PATH, 'r') as f:
                commands = json.load(f)
                return commands
        except Exception as e:
            print(f"Error loading commands: {e}")
            # Fallback to defaults
            return DEFAULT_COMMANDS.copy()
            
    @classmethod
    def save_commands(cls, commands: Dict[str, str]) -> bool:
        """
        Saves the provided commands dictionary to the JSON file.
        """
        try:
            os.makedirs(os.path.dirname(COMMANDS_FILE_PATH), exist_ok=True)
            with open(COMMANDS_FILE_PATH, 'w') as f:
                json.dump(commands, f, indent=4)
            return True
        except Exception as e:
            print(f"Error saving commands: {e}")
            return False
