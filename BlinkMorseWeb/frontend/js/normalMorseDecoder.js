/**
 * Normal Morse Decoder
 * Decodes standard International Morse Code (A-Z, 0-9)
 * For advanced users - no simplified patterns
 */

class NormalMorseDecoder {
    constructor() {
        // Use standard International Morse Code
        this.morseMap = MORSE_TO_CHAR_STANDARD;
        
        // State
        this.currentPattern = '';
        this.decodedText = '';
        this.currentWord = '';
        
        // Callbacks
        this.onLetterDecoded = null;
        this.onWordComplete = null;
        this.onPatternUpdate = null;
    }
    
    /**
     * Add a blink symbol to current pattern
     * @param {string} symbol - '.' or '-'
     */
    addSymbol(symbol) {
        this.currentPattern += symbol;
        
        if (this.onPatternUpdate) {
            this.onPatternUpdate(this.currentPattern);
        }
        
        console.log(`[NormalDecoder] Pattern: ${this.currentPattern}`);
    }
    
    /**
     * Decode current pattern as a letter
     * Called after letter pause (1 second)
     */
    decodeLetter() {
        if (this.currentPattern.length === 0) {
            return;
        }
        
        const char = this.morseMap[this.currentPattern];
        
        if (char) {
            this.currentWord += char;
            this.decodedText += char;
            
            console.log(`[NormalDecoder] Letter decoded: ${this.currentPattern} → ${char}`);
            
            if (this.onLetterDecoded) {
                this.onLetterDecoded(char, this.currentPattern);
            }
        } else {
            console.warn(`[NormalDecoder] Unknown pattern: ${this.currentPattern}`);
            
            // Add placeholder for unknown pattern
            this.currentWord += '?';
            this.decodedText += '?';
            
            if (this.onLetterDecoded) {
                this.onLetterDecoded('?', this.currentPattern);
            }
        }
        
        // Reset pattern for next letter
        this.currentPattern = '';
        
        if (this.onPatternUpdate) {
            this.onPatternUpdate('');
        }
    }
    
    /**
     * Complete current word
     * Called after word pause (2.5 seconds)
     */
    completeWord() {
        if (this.currentWord.length === 0) {
            return;
        }
        
        // Add space after word
        this.decodedText += ' ';
        
        console.log(`[NormalDecoder] Word complete: ${this.currentWord}`);
        
        if (this.onWordComplete) {
            this.onWordComplete(this.currentWord);
        }
        
        // Reset word
        this.currentWord = '';
    }
    
    /**
     * Get current decoded text
     * @returns {string}
     */
    getDecodedText() {
        return this.decodedText;
    }
    
    /**
     * Get current pattern being formed
     * @returns {string}
     */
    getCurrentPattern() {
        return this.currentPattern;
    }
    
    /**
     * Get current word being formed
     * @returns {string}
     */
    getCurrentWord() {
        return this.currentWord;
    }
    
    /**
     * Clear all state
     */
    reset() {
        this.currentPattern = '';
        this.decodedText = '';
        this.currentWord = '';
        
        if (this.onPatternUpdate) {
            this.onPatternUpdate('');
        }
        
        console.log('[NormalDecoder] Reset');
    }
    
    /**
     * Set callback for letter decoded
     * @param {Function} callback - (char, pattern) => void
     */
    setOnLetterDecoded(callback) {
        this.onLetterDecoded = callback;
    }
    
    /**
     * Set callback for word complete
     * @param {Function} callback - (word) => void
     */
    setOnWordComplete(callback) {
        this.onWordComplete = callback;
    }
    
    /**
     * Set callback for pattern update
     * @param {Function} callback - (pattern) => void
     */
    setOnPatternUpdate(callback) {
        this.onPatternUpdate = callback;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NormalMorseDecoder;
}
