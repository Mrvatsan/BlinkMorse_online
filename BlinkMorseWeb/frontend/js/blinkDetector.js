/**
 * Blink Detector Module
 * Reusable blink detection logic with EAR calculation
 */

class BlinkDetector {
    constructor(options = {}) {
        // Thresholds
        this.EAR_THRESHOLD = options.earThreshold || 0.21;
        this.DOT_DURATION_MAX = options.dotDuration || 0.4;
        this.DASH_DURATION_MIN = options.dashDuration || 0.4;
        
        // Eye landmark indices
        this.LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
        this.RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
        
        // State
        this.previousEAR = 1.0;
        this.isBlinking = false;
        this.blinkStartTime = null;
        this.lastBlinkEndTime = null;
        
        // Callbacks
        this.onBlinkDetected = options.onBlinkDetected || null;
        this.onEARUpdate = options.onEARUpdate || null;
    }
    
    /**
     * Calculate Eye Aspect Ratio (EAR)
     * @param {Array} eyeLandmarks - 6 eye landmark points
     * @returns {number} EAR value
     */
    calculateEAR(eyeLandmarks) {
        // Vertical distances
        const A = Math.hypot(
            eyeLandmarks[1].x - eyeLandmarks[5].x,
            eyeLandmarks[1].y - eyeLandmarks[5].y
        );
        const B = Math.hypot(
            eyeLandmarks[2].x - eyeLandmarks[4].x,
            eyeLandmarks[2].y - eyeLandmarks[4].y
        );
        
        // Horizontal distance
        const C = Math.hypot(
            eyeLandmarks[0].x - eyeLandmarks[3].x,
            eyeLandmarks[0].y - eyeLandmarks[3].y
        );
        
        // EAR formula
        if (C === 0) return 1.0;
        return (A + B) / (2.0 * C);
    }
    
    /**
     * Extract eye landmarks from face mesh
     * @param {Array} landmarks - Full face landmarks (468 points)
     * @param {Array} indices - Eye landmark indices
     * @returns {Array} Eye landmarks
     */
    getEyeLandmarks(landmarks, indices) {
        return indices.map(idx => landmarks[idx]);
    }
    
    /**
     * Process face landmarks and detect blinks
     * @param {Array} landmarks - Full face landmarks from MediaPipe
     * @returns {Object|null} Blink event or null
     */
    processFaceLandmarks(landmarks) {
        // Extract eye landmarks
        const leftEyeLandmarks = this.getEyeLandmarks(landmarks, this.LEFT_EYE_INDICES);
        const rightEyeLandmarks = this.getEyeLandmarks(landmarks, this.RIGHT_EYE_INDICES);
        
        // Calculate EAR
        const leftEAR = this.calculateEAR(leftEyeLandmarks);
        const rightEAR = this.calculateEAR(rightEyeLandmarks);
        const avgEAR = (leftEAR + rightEAR) / 2.0;
        
        // Callback for EAR updates
        if (this.onEARUpdate) {
            this.onEARUpdate(avgEAR, leftEAR, rightEAR);
        }
        
        // Detect blink
        return this.detectBlink(avgEAR);
    }
    
    /**
     * Detect blink and classify as dot or dash
     * @param {number} avgEAR - Average Eye Aspect Ratio
     * @returns {Object|null} Blink event { type: 'dot'|'dash', duration, symbol }
     */
    detectBlink(avgEAR) {
        const currentTime = Date.now() / 1000;  // Convert to seconds
        
        // Detect blink start (eyes close)
        if (avgEAR < this.EAR_THRESHOLD && this.previousEAR >= this.EAR_THRESHOLD) {
            this.isBlinking = true;
            this.blinkStartTime = currentTime;
            console.log('[BlinkDetector] Eyes closed - Blink started');
        }
        
        // Detect blink end (eyes open)
        if (avgEAR >= this.EAR_THRESHOLD && this.previousEAR < this.EAR_THRESHOLD && this.isBlinking) {
            this.isBlinking = false;
            const duration = currentTime - this.blinkStartTime;
            this.lastBlinkEndTime = currentTime;
            
            // Classify blink
            let blinkEvent = null;
            if (duration < this.DOT_DURATION_MAX) {
                blinkEvent = {
                    type: 'dot',
                    symbol: '.',
                    duration: duration,
                    timestamp: currentTime
                };
                console.log(`[BlinkDetector] DOT detected (${duration.toFixed(2)}s)`);
            } else if (duration >= this.DASH_DURATION_MIN) {
                blinkEvent = {
                    type: 'dash',
                    symbol: '-',
                    duration: duration,
                    timestamp: currentTime
                };
                console.log(`[BlinkDetector] DASH detected (${duration.toFixed(2)}s)`);
            }
            
            // Callback
            if (blinkEvent && this.onBlinkDetected) {
                this.onBlinkDetected(blinkEvent);
            }
            
            this.previousEAR = avgEAR;
            return blinkEvent;
        }
        
        this.previousEAR = avgEAR;
        return null;
    }
    
    /**
     * Get time since last blink
     * @returns {number} Seconds since last blink
     */
    getTimeSinceLastBlink() {
        if (!this.lastBlinkEndTime) return Infinity;
        return (Date.now() / 1000) - this.lastBlinkEndTime;
    }
    
    /**
     * Reset detector state
     */
    reset() {
        this.previousEAR = 1.0;
        this.isBlinking = false;
        this.blinkStartTime = null;
        this.lastBlinkEndTime = null;
        console.log('[BlinkDetector] Reset');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlinkDetector;
}
