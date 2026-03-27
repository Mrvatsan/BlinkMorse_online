/**
 * Blink Detector Module
 * Reusable blink detection logic with EAR calculation
 */

class BlinkDetector {
    constructor(options = {}) {
        // Thresholds
        this.EAR_THRESHOLD = options.earThreshold;
        this.DOT_DURATION_MAX = options.dotDuration;
        this.DASH_DURATION_MIN = options.dashDuration;
        this.MIN_BLINK_DURATION = typeof options.minBlinkDuration === 'number'
            ? options.minBlinkDuration
            : 0.05;
        this.sensitivityProfile = String(options.sensitivityProfile || 'medium').toLowerCase();

        if (
            typeof this.EAR_THRESHOLD !== 'number' ||
            typeof this.DOT_DURATION_MAX !== 'number' ||
            typeof this.DASH_DURATION_MIN !== 'number'
        ) {
            throw new Error('BlinkDetector requires calibrated thresholds.');
        }
        
        // Eye landmark indices
        this.LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
        this.RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
        
        // State
        this.previousEAR = 1.0;
        this.isBlinking = false;
        this.blinkStartTime = null;
        this.lastBlinkEndTime = null;
        this.prevNose = null;

        // Anti-false-positive guards for head turning and unstable face motion.
        this.HEAD_TURN_SKEW_MAX = 0.22;
        this.NOSE_MOVE_MAX = 0.028;
        this.EYE_ASYMMETRY_MAX = 0.35;
        this.BILATERAL_CLOSE_FACTOR = 1.06;

        this.applySensitivityProfile();
        
        // Callbacks
        this.onBlinkDetected = options.onBlinkDetected || null;
        this.onEARUpdate = options.onEARUpdate || null;
    }

    applySensitivityProfile() {
        if (this.sensitivityProfile === 'strict') {
            // Strict should block accidental head-turn events but still accept real blinks.
            this.HEAD_TURN_SKEW_MAX = 0.20;
            this.NOSE_MOVE_MAX = 0.024;
            this.EYE_ASYMMETRY_MAX = 0.30;
            this.BILATERAL_CLOSE_FACTOR = 1.12;
            return;
        }

        if (this.sensitivityProfile === 'loose') {
            this.HEAD_TURN_SKEW_MAX = 0.32;
            this.NOSE_MOVE_MAX = 0.048;
            this.EYE_ASYMMETRY_MAX = 0.55;
            this.BILATERAL_CLOSE_FACTOR = 1.15;
            return;
        }

        // Medium (default)
        this.HEAD_TURN_SKEW_MAX = 0.24;
        this.NOSE_MOVE_MAX = 0.032;
        this.EYE_ASYMMETRY_MAX = 0.40;
        this.BILATERAL_CLOSE_FACTOR = 1.06;
    }

    distance2D(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
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

        const leftEyeWidth = this.distance2D(leftEyeLandmarks[0], leftEyeLandmarks[3]);
        const rightEyeWidth = this.distance2D(rightEyeLandmarks[0], rightEyeLandmarks[3]);
        const eyeWidthMax = Math.max(leftEyeWidth, rightEyeWidth, 1e-6);
        const headTurnSkew = Math.abs(leftEyeWidth - rightEyeWidth) / eyeWidthMax;

        // Nose tip movement is a good proxy for quick head motion.
        const nose = landmarks[1] || landmarks[4] || null;
        let noseMove = 0;
        if (nose && this.prevNose) {
            noseMove = this.distance2D(nose, this.prevNose);
        }
        if (nose) {
            this.prevNose = { x: nose.x, y: nose.y };
        }

        const isHeadTurning = headTurnSkew > this.HEAD_TURN_SKEW_MAX || noseMove > this.NOSE_MOVE_MAX;
        
        // Calculate EAR
        const leftEAR = this.calculateEAR(leftEyeLandmarks);
        const rightEAR = this.calculateEAR(rightEyeLandmarks);
        const avgEAR = (leftEAR + rightEAR) / 2.0;
        const eyeAsymmetry = Math.abs(leftEAR - rightEAR) / Math.max(leftEAR, rightEAR, 1e-6);
        
        // Callback for EAR updates
        if (this.onEARUpdate) {
            this.onEARUpdate(avgEAR, leftEAR, rightEAR);
        }
        
        // Detect blink
        return this.detectBlink(avgEAR, leftEAR, rightEAR, isHeadTurning, eyeAsymmetry);
    }
    
    /**
     * Detect blink and classify as dot or dash
     * @param {number} avgEAR - Average Eye Aspect Ratio
     * @returns {Object|null} Blink event { type: 'dot'|'dash', duration, symbol }
     */
    detectBlink(avgEAR, leftEAR, rightEAR, isHeadTurning, eyeAsymmetry) {
        const currentTime = Date.now() / 1000;  // Convert to seconds

        // Block unreliable blink START conditions caused by head turns/asymmetric eye state.
        // Do not cancel an already-started blink; otherwise long blinks can be lost mid-gesture.
        if (!this.isBlinking && (isHeadTurning || eyeAsymmetry > this.EYE_ASYMMETRY_MAX)) {
            this.previousEAR = avgEAR;
            return null;
        }

        const bilateralClose =
            leftEAR < (this.EAR_THRESHOLD * this.BILATERAL_CLOSE_FACTOR) &&
            rightEAR < (this.EAR_THRESHOLD * this.BILATERAL_CLOSE_FACTOR);
        
        // Detect blink start (eyes close)
        if (
            avgEAR < this.EAR_THRESHOLD &&
            this.previousEAR >= this.EAR_THRESHOLD &&
            bilateralClose
        ) {
            this.isBlinking = true;
            this.blinkStartTime = currentTime;
            console.log('[BlinkDetector] Eyes closed - Blink started');
        }
        
        // Detect blink end (eyes open)
        if (
            avgEAR >= this.EAR_THRESHOLD &&
            this.previousEAR < this.EAR_THRESHOLD &&
            this.isBlinking
        ) {
            this.isBlinking = false;
            const duration = currentTime - this.blinkStartTime;
            this.lastBlinkEndTime = currentTime;

            if (duration < this.MIN_BLINK_DURATION) {
                this.previousEAR = avgEAR;
                return null;
            }
            
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
        this.prevNose = null;
        console.log('[BlinkDetector] Reset');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlinkDetector;
}
