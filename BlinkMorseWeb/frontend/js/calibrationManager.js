/**
 * Mode-aware adaptive blink calibration manager.
 * Stores and retrieves per-mode thresholds in localStorage.
 */
(function initCalibrationManager(global) {
    const STORAGE_KEYS = {
        patient: 'blinkCalibration_patient',
        normal: 'blinkCalibration_normal',
        morse: 'blinkCalibration_morse'
    };

    const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
    const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
    const BASELINE_DURATION_MS = 3000;
    const MIN_VALID_BLINK_SECONDS = 0.05;

    function clampMode(modeName) {
        if (!modeName) return 'normal';
        const normalized = String(modeName).toLowerCase();
        if (!STORAGE_KEYS[normalized]) return 'normal';
        return normalized;
    }

    function getStorageKey(modeName) {
        return STORAGE_KEYS[clampMode(modeName)];
    }

    function getCalibration(modeName) {
        const raw = localStorage.getItem(getStorageKey(modeName));
        if (!raw) return null;

        try {
            const parsed = JSON.parse(raw);
            if (
                typeof parsed.earBaseline !== 'number' ||
                typeof parsed.earThreshold !== 'number' ||
                typeof parsed.minBlinkDuration !== 'number' ||
                typeof parsed.dotThreshold !== 'number'
            ) {
                return null;
            }
            return parsed;
        } catch (error) {
            console.warn('[Calibration] Failed to parse saved calibration:', error);
            return null;
        }
    }

    function saveCalibration(modeName, calibration) {
        localStorage.setItem(getStorageKey(modeName), JSON.stringify(calibration));
    }

    function clearCalibration(modeName) {
        localStorage.removeItem(getStorageKey(modeName));
    }

    function calculateEAR(eyeLandmarks) {
        const A = Math.hypot(
            eyeLandmarks[1].x - eyeLandmarks[5].x,
            eyeLandmarks[1].y - eyeLandmarks[5].y
        );
        const B = Math.hypot(
            eyeLandmarks[2].x - eyeLandmarks[4].x,
            eyeLandmarks[2].y - eyeLandmarks[4].y
        );
        const C = Math.hypot(
            eyeLandmarks[0].x - eyeLandmarks[3].x,
            eyeLandmarks[0].y - eyeLandmarks[3].y
        );

        if (!C) return 1.0;
        return (A + B) / (2.0 * C);
    }

    function average(values) {
        if (!values.length) return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    class CalibrationSession {
        constructor(modeName, options = {}) {
            this.modeName = clampMode(modeName);
            this.options = options;

            this.active = false;
            this.step = 'idle';
            this.subStep = null;

            this.earSamples = [];
            this.baselineStartMs = null;
            this.earBaseline = null;
            this.earThreshold = null;

            this.previousEAR = 1.0;
            this.isBlinking = false;
            this.blinkStartMs = null;

            this.patientBlinks = [];
            this.morseBlinks = [];
            this.shortBlinks = [];
            this.longBlinks = [];

            this.resolvePromise = null;
            this.rejectPromise = null;
        }

        isActive() {
            return this.active;
        }

        start(forceRecalibration) {
            const shouldForce = Boolean(forceRecalibration);
            if (!shouldForce) {
                const existing = getCalibration(this.modeName);
                if (existing) {
                    this.options.onPrompt?.('Using saved calibration. Press Recalibrate to run calibration again.');
                    return Promise.resolve(existing);
                }
            }

            this.active = true;
            this.step = 'baseline';
            this.baselineStartMs = null;
            this.earSamples = [];
            this.previousEAR = 1.0;
            this.patientBlinks = [];
            this.morseBlinks = [];
            this.shortBlinks = [];
            this.longBlinks = [];
            this.subStep = this.modeName === 'normal' ? 'short' : 'generic';

            this.options.onPrompt?.('Step 1/2: Keep your eyes open for 3 seconds.');
            this.options.onProgress?.(0, 'Collecting EAR baseline...');

            return new Promise((resolve, reject) => {
                this.resolvePromise = resolve;
                this.rejectPromise = reject;
            });
        }

        cancel(reason) {
            if (!this.active) return;
            this.finishWithError(reason || new Error('Calibration cancelled'));
        }

        handleLandmarks(landmarks) {
            if (!this.active || !Array.isArray(landmarks) || landmarks.length < 388) {
                return;
            }

            const leftEye = LEFT_EYE_INDICES.map((idx) => landmarks[idx]);
            const rightEye = RIGHT_EYE_INDICES.map((idx) => landmarks[idx]);
            const leftEAR = calculateEAR(leftEye);
            const rightEAR = calculateEAR(rightEye);
            const avgEAR = (leftEAR + rightEAR) / 2.0;
            const nowMs = performance.now();

            this.options.onEARUpdate?.(avgEAR, leftEAR, rightEAR);

            if (this.step === 'baseline') {
                this.processBaseline(avgEAR, nowMs);
                this.previousEAR = avgEAR;
                return;
            }

            if (this.step === 'sampling') {
                this.processSampling(avgEAR, nowMs);
                this.previousEAR = avgEAR;
            }
        }

        processBaseline(avgEAR, nowMs) {
            if (this.baselineStartMs === null) {
                this.baselineStartMs = nowMs;
            }

            this.earSamples.push(avgEAR);
            const elapsedMs = nowMs - this.baselineStartMs;
            const progress = Math.min(1, elapsedMs / BASELINE_DURATION_MS);
            this.options.onProgress?.(progress, 'Collecting EAR baseline...');

            if (elapsedMs < BASELINE_DURATION_MS) {
                return;
            }

            this.earBaseline = average(this.earSamples);
            this.earThreshold = this.earBaseline * 0.75;

            this.step = 'sampling';
            this.options.onProgress?.(0, 'Sampling blinks...');

            if (this.modeName === 'patient') {
                this.options.onPrompt?.('Step 2/2: Blink the way you want to communicate (5 blinks).');
            } else if (this.modeName === 'normal') {
                this.options.onPrompt?.('Step 2/2: Blink SHORT 3 times.');
            } else {
                this.options.onPrompt?.('Step 2/2: Blink clearly 5 times.');
            }
        }

        processSampling(avgEAR, nowMs) {
            const threshold = this.earThreshold;
            if (avgEAR < threshold && this.previousEAR >= threshold) {
                this.isBlinking = true;
                this.blinkStartMs = nowMs;
            }

            if (avgEAR >= threshold && this.previousEAR < threshold && this.isBlinking) {
                this.isBlinking = false;
                const durationSeconds = (nowMs - this.blinkStartMs) / 1000;

                if (durationSeconds < MIN_VALID_BLINK_SECONDS) {
                    return;
                }

                this.registerBlink(durationSeconds);
            }
        }

        registerBlink(durationSeconds) {
            if (this.modeName === 'patient') {
                this.patientBlinks.push(durationSeconds);
                this.options.onProgress?.(this.patientBlinks.length / 5, `Captured ${this.patientBlinks.length}/5 blinks`);

                if (this.patientBlinks.length >= 5) {
                    this.finalizePatientCalibration();
                }
                return;
            }

            if (this.modeName === 'morse') {
                this.morseBlinks.push(durationSeconds);
                this.options.onProgress?.(this.morseBlinks.length / 5, `Captured ${this.morseBlinks.length}/5 blinks`);

                if (this.morseBlinks.length >= 5) {
                    this.finalizeMorseCalibration();
                }
                return;
            }

            if (this.subStep === 'short') {
                this.shortBlinks.push(durationSeconds);
                this.options.onProgress?.(this.shortBlinks.length / 6, `SHORT blink ${this.shortBlinks.length}/3`);

                if (this.shortBlinks.length >= 3) {
                    this.subStep = 'long';
                    this.options.onPrompt?.('Now blink LONG 3 times.');
                }
                return;
            }

            this.longBlinks.push(durationSeconds);
            this.options.onProgress?.((3 + this.longBlinks.length) / 6, `LONG blink ${this.longBlinks.length}/3`);

            if (this.longBlinks.length >= 3) {
                this.finalizeNormalCalibration();
            }
        }

        finalizePatientCalibration() {
            const avgBlink = average(this.patientBlinks);
            const calibration = {
                earBaseline: this.earBaseline,
                earThreshold: this.earThreshold,
                minBlinkDuration: avgBlink * 0.5,
                dotThreshold: avgBlink * 1.8,
                modeName: this.modeName
            };

            this.finishWithCalibration(calibration);
        }

        finalizeNormalCalibration() {
            const shortAvg = average(this.shortBlinks);
            const longAvg = average(this.longBlinks);
            const calibration = {
                earBaseline: this.earBaseline,
                earThreshold: this.earThreshold,
                minBlinkDuration: shortAvg * 0.6,
                dotThreshold: (shortAvg + longAvg) / 2,
                modeName: this.modeName
            };

            this.finishWithCalibration(calibration);
        }

        finalizeMorseCalibration() {
            const avgBlink = average(this.morseBlinks);
            const calibration = {
                earBaseline: this.earBaseline,
                earThreshold: this.earThreshold,
                minBlinkDuration: avgBlink * 0.7,
                dotThreshold: avgBlink * 2.0,
                modeName: this.modeName
            };

            this.finishWithCalibration(calibration);
        }

        finishWithCalibration(calibration) {
            saveCalibration(this.modeName, calibration);
            this.options.onProgress?.(1, 'Calibration complete.');
            this.options.onPrompt?.('Calibration complete. Detection starting...');

            const resolve = this.resolvePromise;
            this.cleanupState();
            resolve?.(calibration);
        }

        finishWithError(error) {
            const reject = this.rejectPromise;
            this.cleanupState();
            reject?.(error);
        }

        cleanupState() {
            this.active = false;
            this.step = 'idle';
            this.subStep = null;
            this.isBlinking = false;
            this.blinkStartMs = null;
            this.resolvePromise = null;
            this.rejectPromise = null;
        }
    }

    const api = {
        getCalibration,
        clearCalibration,
        getStorageKey,
        createSession(modeName, options = {}) {
            return new CalibrationSession(modeName, options);
        }
    };

    global.BlinkCalibrationManager = api;
})(window);
