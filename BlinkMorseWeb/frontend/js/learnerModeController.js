/**
 * Learner Mode Controller
 * Hands-on Morse code learning with camera-based blink practice
 */

class LearnerModeController {
    constructor(options = {}) {
        // Morse code alphabet (A-Z only)
        this.MORSE_ALPHABET = {
            'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',
            'E': '.',     'F': '..-.',  'G': '--.',   'H': '....',
            'I': '..',    'J': '.---',  'K': '-.-',   'L': '.-..',
            'M': '--',    'N': '-.',    'O': '---',   'P': '.--.',
            'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
            'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',
            'Y': '-.--',  'Z': '--..'
        };
        
        // State
        this.currentLetter = null;
        this.currentPattern = '';
        this.userInput = '';
        this.score = 0;
        this.attempts = 0;
        
        // UI Elements
        this.targetLetterEl = options.targetLetterEl;
        this.targetPatternEl = options.targetPatternEl;
        this.userInputEl = options.userInputEl;
        this.feedbackEl = options.feedbackEl;
        this.scoreEl = options.scoreEl;
        
        // Callbacks
        this.onCorrect = options.onCorrect || null;
        this.onIncorrect = options.onIncorrect || null;
    }
    
    /**
     * Start learning session with random letter
     */
    startNewChallenge() {
        // Pick random letter
        const letters = Object.keys(this.MORSE_ALPHABET);
        const randomLetter = letters[Math.floor(Math.random() * letters.length)];
        
        this.currentLetter = randomLetter;
        this.currentPattern = this.MORSE_ALPHABET[randomLetter];
        this.userInput = '';
        
        // Update UI
        if (this.targetLetterEl) {
            this.targetLetterEl.textContent = randomLetter;
        }
        if (this.targetPatternEl) {
            this.targetPatternEl.textContent = this.formatPattern(this.currentPattern);
        }
        if (this.userInputEl) {
            this.userInputEl.textContent = '';
        }
        if (this.feedbackEl) {
            this.feedbackEl.textContent = 'Blink the pattern!';
            this.feedbackEl.className = 'feedback-text';
        }
        
        console.log(`[LearnerMode] New challenge: ${randomLetter} = ${this.currentPattern}`);
    }
    
    /**
     * Handle blink input from user
     * @param {string} symbol - '.' or '-'
     */
    addBlinkInput(symbol) {
        this.userInput += symbol;
        
        // Update UI
        if (this.userInputEl) {
            this.userInputEl.textContent = this.formatPattern(this.userInput);
        }
        
        console.log(`[LearnerMode] User input: ${this.userInput}`);
        
        // Check if pattern is too long
        if (this.userInput.length > this.currentPattern.length) {
            this.checkPattern();
        }
    }
    
    /**
     * Check user's pattern against target
     */
    checkPattern() {
        this.attempts++;
        
        if (this.userInput === this.currentPattern) {
            // Correct!
            this.score++;
            this.showFeedback('✅ Correct!', 'success');
            
            if (this.onCorrect) {
                this.onCorrect(this.currentLetter, this.currentPattern);
            }
            
            // Next challenge after delay
            setTimeout(() => {
                this.startNewChallenge();
            }, 1500);
            
        } else {
            // Incorrect
            this.showFeedback(`❌ Wrong! Expected: ${this.formatPattern(this.currentPattern)}`, 'error');
            
            if (this.onIncorrect) {
                this.onIncorrect(this.userInput, this.currentPattern);
            }
            
            // Reset input
            setTimeout(() => {
                this.userInput = '';
                if (this.userInputEl) {
                    this.userInputEl.textContent = '';
                }
                if (this.feedbackEl) {
                    this.feedbackEl.textContent = 'Try again!';
                    this.feedbackEl.className = 'feedback-text';
                }
            }, 2000);
        }
        
        // Update score
        this.updateScore();
    }
    
    /**
     * Show feedback message
     * @param {string} message
     * @param {string} type - 'success' or 'error'
     */
    showFeedback(message, type) {
        if (this.feedbackEl) {
            this.feedbackEl.textContent = message;
            this.feedbackEl.className = `feedback-text feedback-${type}`;
        }
        console.log(`[LearnerMode] ${message}`);
    }
    
    /**
     * Update score display
     */
    updateScore() {
        if (this.scoreEl) {
            const accuracy = this.attempts > 0 
                ? Math.round((this.score / this.attempts) * 100) 
                : 0;
            this.scoreEl.textContent = `Score: ${this.score}/${this.attempts} (${accuracy}%)`;
        }
    }
    
    /**
     * Format pattern with spaces for readability
     * @param {string} pattern
     * @returns {string}
     */
    formatPattern(pattern) {
        return pattern.split('').join(' ');
    }
    
    /**
     * Reset learning session
     */
    reset() {
        this.userInput = '';
        this.score = 0;
        this.attempts = 0;
        this.updateScore();
        this.startNewChallenge();
        console.log('[LearnerMode] Reset');
    }
    
    /**
     * Get current challenge info
     * @returns {Object}
     */
    getCurrentChallenge() {
        return {
            letter: this.currentLetter,
            pattern: this.currentPattern,
            userInput: this.userInput
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LearnerModeController;
}
