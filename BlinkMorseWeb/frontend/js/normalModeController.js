/**
 * Normal Morse Mode Controller
 * Free-form Morse communication for advanced users
 */

class NormalModeController {
    constructor(options = {}) {
        // UI Elements
        this.blinkSymbolsEl = options.blinkSymbolsEl;
        this.currentPatternEl = options.currentPatternEl;
        this.currentLetterEl = options.currentLetterEl;
        this.decodedTextEl = options.decodedTextEl;
        
        // Decoder
        this.decoder = new NormalMorseDecoder();
        
        // Timing
        this.lastBlinkTime = null;
        this.letterPauseTimer = null;
        this.wordPauseTimer = null;
        this.LETTER_PAUSE = 1.0;  // seconds
        this.WORD_PAUSE = 2.5;    // seconds
        
        // Blink symbols buffer (for display)
        this.blinkSymbolsBuffer = [];
        this.MAX_SYMBOLS_DISPLAY = 20;
        
        // Callbacks
        this.onWordComplete = options.onWordComplete || null;
        
        // Setup decoder callbacks
        this.decoder.setOnLetterDecoded((char, pattern) => {
            this.handleLetterDecoded(char, pattern);
        });
        
        this.decoder.setOnWordComplete((word) => {
            this.handleWordComplete(word);
        });
        
        this.decoder.setOnPatternUpdate((pattern) => {
            this.updatePatternDisplay(pattern);
        });
    }
    
    /**
     * Handle blink input from BlinkDetector
     * @param {Object} blinkEvent - { symbol, type, duration, timestamp }
     */
    handleBlink(blinkEvent) {
        const { symbol, timestamp } = blinkEvent;
        
        // Add symbol to decoder
        this.decoder.addSymbol(symbol);
        
        // Add to visual buffer
        this.blinkSymbolsBuffer.push(symbol);
        if (this.blinkSymbolsBuffer.length > this.MAX_SYMBOLS_DISPLAY) {
            this.blinkSymbolsBuffer.shift();
        }
        this.updateBlinkSymbolsDisplay();
        
        // Update timing
        this.lastBlinkTime = timestamp;
        
        // Reset timers
        this.resetPauseTimers();
        
        // Start new timers
        this.startPauseTimers();
    }
    
    /**
     * Reset pause detection timers
     */
    resetPauseTimers() {
        if (this.letterPauseTimer) {
            clearTimeout(this.letterPauseTimer);
            this.letterPauseTimer = null;
        }
        
        if (this.wordPauseTimer) {
            clearTimeout(this.wordPauseTimer);
            this.wordPauseTimer = null;
        }
    }
    
    /**
     * Start pause detection timers
     */
    startPauseTimers() {
        // Letter pause timer
        this.letterPauseTimer = setTimeout(() => {
            this.decoder.decodeLetter();
        }, this.LETTER_PAUSE * 1000);
        
        // Word pause timer
        this.wordPauseTimer = setTimeout(() => {
            this.decoder.decodeLetter();  // Decode any remaining pattern
            this.decoder.completeWord();
        }, this.WORD_PAUSE * 1000);
    }
    
    /**
     * Handle letter decoded
     * @param {string} char - Decoded character
     * @param {string} pattern - Morse pattern
     */
    handleLetterDecoded(char, pattern) {
        console.log(`[NormalMode] Letter: ${pattern} → ${char}`);
        
        // Update current letter display
        if (this.currentLetterEl) {
            this.currentLetterEl.textContent = char;
            
            // Flash effect
            this.currentLetterEl.style.color = '#00ff00';
            setTimeout(() => {
                this.currentLetterEl.style.color = 'var(--accent-green)';
            }, 300);
        }
        
        // Update decoded text display
        this.updateDecodedTextDisplay();
    }
    
    /**
     * Handle word complete
     * @param {string} word - Completed word
     */
    handleWordComplete(word) {
        console.log(`[NormalMode] Word complete: ${word}`);
        
        // Update decoded text display
        this.updateDecodedTextDisplay();
        
        // Clear current letter
        if (this.currentLetterEl) {
            this.currentLetterEl.textContent = '--';
        }
        
        // Callback for TTS
        if (this.onWordComplete) {
            this.onWordComplete(word);
        }
    }
    
    /**
     * Update blink symbols display
     */
    updateBlinkSymbolsDisplay() {
        if (this.blinkSymbolsEl) {
            this.blinkSymbolsEl.textContent = this.blinkSymbolsBuffer.join(' ') || '...';
        }
    }
    
    /**
     * Update current pattern display
     * @param {string} pattern - Current Morse pattern
     */
    updatePatternDisplay(pattern) {
        if (this.currentPatternEl) {
            this.currentPatternEl.textContent = pattern || '--';
        }
    }
    
    /**
     * Update decoded text display
     */
    updateDecodedTextDisplay() {
        if (this.decodedTextEl) {
            const text = this.decoder.getDecodedText();
            this.decodedTextEl.textContent = text || '--';
        }
    }
    
    /**
     * Reset controller state
     */
    reset() {
        this.decoder.reset();
        this.blinkSymbolsBuffer = [];
        this.lastBlinkTime = null;
        this.resetPauseTimers();
        
        // Reset UI
        if (this.blinkSymbolsEl) this.blinkSymbolsEl.textContent = '...';
        if (this.currentPatternEl) this.currentPatternEl.textContent = '--';
        if (this.currentLetterEl) this.currentLetterEl.textContent = '--';
        if (this.decodedTextEl) this.decodedTextEl.textContent = '--';
        
        console.log('[NormalMode] Reset');
    }
    
    /**
     * Get decoded text
     * @returns {string}
     */
    getDecodedText() {
        return this.decoder.getDecodedText();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NormalModeController;
}
