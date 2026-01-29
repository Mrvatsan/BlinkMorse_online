/**
 * Standard International Morse Code Map
 * Complete A-Z alphabet and 0-9 numbers
 */

const MORSE_CODE_STANDARD = {
    // Alphabet A-Z
    'A': '.-',
    'B': '-...',
    'C': '-.-.',
    'D': '-..',
    'E': '.',
    'F': '..-.',
    'G': '--.',
    'H': '....',
    'I': '..',
    'J': '.---',
    'K': '-.-',
    'L': '.-..',
    'M': '--',
    'N': '-.',
    'O': '---',
    'P': '.--.',
    'Q': '--.-',
    'R': '.-.',
    'S': '...',
    'T': '-',
    'U': '..-',
    'V': '...-',
    'W': '.--',
    'X': '-..-',
    'Y': '-.--',
    'Z': '--..',
    
    // Numbers 0-9
    '0': '-----',
    '1': '.----',
    '2': '..---',
    '3': '...--',
    '4': '....-',
    '5': '.....',
    '6': '-....',
    '7': '--...',
    '8': '---..',
    '9': '----.'
};

/**
 * Reverse map: Morse pattern → Character
 */
const MORSE_TO_CHAR_STANDARD = {};
for (const [char, morse] of Object.entries(MORSE_CODE_STANDARD)) {
    MORSE_TO_CHAR_STANDARD[morse] = char;
}

/**
 * Get character from Morse pattern
 * @param {string} morsePattern - Morse pattern (e.g., '.-')
 * @returns {string|null} Decoded character or null
 */
function decodeStandardMorse(morsePattern) {
    return MORSE_TO_CHAR_STANDARD[morsePattern] || null;
}

/**
 * Get Morse pattern from character
 * @param {string} char - Character (A-Z, 0-9)
 * @returns {string|null} Morse pattern or null
 */
function encodeStandardMorse(char) {
    return MORSE_CODE_STANDARD[char.toUpperCase()] || null;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MORSE_CODE_STANDARD,
        MORSE_TO_CHAR_STANDARD,
        decodeStandardMorse,
        encodeStandardMorse
    };
}
