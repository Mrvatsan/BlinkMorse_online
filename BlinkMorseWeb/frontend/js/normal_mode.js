/**
 * Normal Morse Mode - Free-form Morse Communication
 * For advanced users who know International Morse Code
 */

// Check authentication
checkAuth();

// MediaPipe Face Mesh
let faceMesh = null;
let camera = null;
let renderer = null;
let blinkDetector = null;
let normalController = null;
let calibrationSession = null;
let calibrationConfig = null;
let performanceMonitor = null;

// Debug toggle: set to false to disable all monitoring calculations and UI.
const enablePerformanceMonitor = true;

// State
let isDetecting = false;
let isSessionActive = false;
let lastFaceSeenAt = 0;
let faceBlockedWarningShown = false;
const MODE_NAME = 'normal';

const FACE_BLOCKED_WARNING_DELAY_MS = 2500;

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const speakBtn = document.getElementById('speakBtn');
const recalibrateBtn = document.getElementById('recalibrateBtn');
const videoElement = document.getElementById('videoFeed');
const canvasElement = document.getElementById('canvasOutput');
const earValue = document.getElementById('earValue');
const blinkSymbols = document.getElementById('blinkSymbols');
const currentPattern = document.getElementById('currentPattern');
const currentLetter = document.getElementById('currentLetter');
const decodedText = document.getElementById('decodedText');
const translatedTextEl = document.getElementById('translatedText');
const languageSelect = document.getElementById('languageSelect');

/**
 * Handle blink detected from BlinkDetector
 */
function handleBlinkDetected(blinkEvent) {
    if (!isDetecting || !normalController) return;

    // Pass blink to normal mode controller
    normalController.handleBlink(blinkEvent);
}

/**
 * Handle EAR updates from BlinkDetector
 */
function handleEARUpdate(avgEAR, leftEAR, rightEAR) {
    earValue.textContent = avgEAR.toFixed(3);
}

/**
 * Handle word complete (trigger TTS)
 */
async function handleWordComplete(word) {
    console.log(`[NormalMode] Word complete, triggering TTS: ${word}`);

    await generateAndPlaySpeech(word);
}

/**
 * MediaPipe Face Mesh callback
 */
function onFaceMeshResults(results) {
    if (!isSessionActive) return;

    const shouldTrackPerformance = enablePerformanceMonitor && performanceMonitor;
    const frameStartTime = shouldTrackPerformance ? performance.now() : 0;

    try {

        // Render full 468-point face mesh
        const renderResult = renderer.render(results, {
            showFullMesh: true,
            showEyeLandmarks: true,
            meshColor: '#C0C0C070',
            meshLineWidth: 1,
            eyeColor: '#00FF00',
            eyePointSize: 3
        });

        // Process landmarks for blink detection
        if (renderResult.detected && renderResult.landmarks) {
            lastFaceSeenAt = Date.now();

            if (faceBlockedWarningShown) {
                faceBlockedWarningShown = false;
                updateStatus('Face detected - Detection resumed', 'success');
                showNotification('Face detected again. Detection resumed.', 'success');
            }

            if (calibrationSession && calibrationSession.isActive()) {
                calibrationSession.handleLandmarks(renderResult.landmarks);
                return;
            }

            if (!isDetecting || !blinkDetector) {
                return;
            }

            blinkDetector.processFaceLandmarks(renderResult.landmarks);
            return;
        }

        const blockedDuration = Date.now() - lastFaceSeenAt;
        if (blockedDuration >= FACE_BLOCKED_WARNING_DELAY_MS && !faceBlockedWarningShown) {
            faceBlockedWarningShown = true;
            updateStatus('Face/camera blocked. Please clear view and align your face.', 'error');
            showNotification('Face or camera appears blocked. Please clear the camera view.', 'warning');
        }
    } finally {
        if (shouldTrackPerformance) {
            performanceMonitor.updateFrame(performance.now() - frameStartTime);
        }
    }
}

/**
 * Start detection
 */
async function startDetection(options = {}) {
    const forceCalibration = Boolean(options.forceCalibration);

    try {
        updateStatus('Starting camera...', 'decoding');

        // Initialize renderer
        renderer = new FaceMeshRenderer(canvasElement);

        // Initialize normal mode controller
        normalController = new NormalModeController({
            blinkSymbolsEl: blinkSymbols,
            currentPatternEl: currentPattern,
            currentLetterEl: currentLetter,
            decodedTextEl: decodedText,
            onWordComplete: handleWordComplete,
            onPatternUpdate: handlePatternUpdate
        });

        // Check MediaPipe availability
        if (typeof FaceMesh === 'undefined') {
            throw new Error('MediaPipe Face Mesh not loaded. Check internet connection.');
        }

        // Initialize MediaPipe Face Mesh
        faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onFaceMeshResults);

        // Set canvas size before camera frames start arriving
        canvasElement.width = 1280;
        canvasElement.height = 720;

        // Keep stream active during calibration and detection.
        isSessionActive = true;
        isDetecting = false;
        lastFaceSeenAt = Date.now();
        faceBlockedWarningShown = false;

        calibrationSession = BlinkCalibrationManager.createSession(MODE_NAME, {
            onPrompt: (message) => updateStatus(message, 'decoding'),
            onEARUpdate: handleEARUpdate
        });

        // Initialize camera
        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (isSessionActive && faceMesh) {
                    await faceMesh.send({ image: videoElement });
                }
            },
            width: 1280,
            height: 720
        });

        // Start camera
        await camera.start();

        calibrationConfig = await calibrationSession.start(forceCalibration);
        blinkDetector = new BlinkDetector({
            earThreshold: calibrationConfig.earThreshold,
            dotDuration: calibrationConfig.dotThreshold,
            dashDuration: calibrationConfig.dotThreshold,
            onBlinkDetected: handleBlinkDetected,
            onEARUpdate: handleEARUpdate
        });

        if (enablePerformanceMonitor && window.PerformanceMonitor) {
            if (!performanceMonitor) {
                performanceMonitor = new window.PerformanceMonitor({
                    enabled: true,
                    updateIntervalMs: 500,
                    container: videoElement ? videoElement.parentElement : null
                });
            } else {
                performanceMonitor.setEnabled(true);
                performanceMonitor.reset();
                performanceMonitor.attach(videoElement ? videoElement.parentElement : null);
            }
        }

        isDetecting = true;

        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        resetBtn.disabled = false;
        speakBtn.disabled = false;
        if (recalibrateBtn) {
            recalibrateBtn.disabled = false;
        }

        updateStatus('Detecting - Blink freely!', 'success');
        console.log('[NormalMode] Started with full MediaPipe Face Mesh');

    } catch (error) {
        console.error('[NormalMode] Error starting:', error);
        updateStatus('Failed to start: ' + error.message, 'error');
        stopDetection();
    }
}

/**
 * Stop detection
 */
function stopDetection() {
    if (calibrationSession && calibrationSession.isActive()) {
        calibrationSession.cancel(new Error('Calibration interrupted'));
    }

    calibrationSession = null;
    calibrationConfig = null;
    isSessionActive = false;
    isDetecting = false;
    faceBlockedWarningShown = false;

    // Stop camera
    if (camera) {
        camera.stop();
        camera = null;
    }

    // Clear face mesh
    if (faceMesh) {
        faceMesh.close();
        faceMesh = null;
    }

    // Clear canvas
    if (renderer) {
        renderer.clear();
    }

    if (performanceMonitor) {
        performanceMonitor.setEnabled(false);
    }

    // Update UI
    startBtn.disabled = false;
    stopBtn.disabled = true;
    resetBtn.disabled = true;
    speakBtn.disabled = true;
    if (recalibrateBtn) {
        recalibrateBtn.disabled = true;
    }

    earValue.textContent = '--';

    updateStatus('Stopped', 'idle');
    console.log('[NormalMode] Stopped');
}

/**
 * Reset decoded text
 */
function resetText() {
    if (normalController) {
        normalController.reset();
    }
    updateStatus('Text cleared', 'idle');
}

/**
 * Speak current decoded text
 */
async function speakCurrentText() {
    if (!normalController) return;

    const text = normalController.getDecodedText().trim();

    if (!text || text === '--') {
        updateStatus('No text to speak', 'error');
        return;
    }
    await generateAndPlaySpeech(text);
}

/**
 * Call backend multilingual pipeline and play audio.
 */
async function generateAndPlaySpeech(text) {
    const language = languageSelect ? languageSelect.value : 'en';

    try {
        updateStatus('Generating speech...', 'decoding');

        const response = await fetchAPI('/api/generate-speech', {
            method: 'POST',
            body: JSON.stringify({
                text: text,
                language: language
            })
        });

        if (response.success) {
            if (translatedTextEl) {
                translatedTextEl.textContent = response.translated_text || text;
            }

            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer && response.audio_url) {
                audioPlayer.src = response.audio_url;
                audioPlayer.play().catch(err => {
                    console.error('Audio playback error:', err);
                });
            }

            updateStatus('Speech ready', 'success');
        } else {
            console.error('Multilingual TTS error:', response.error || 'Unknown error');
            updateStatus('Speech generation failed', 'error');
        }
    } catch (error) {
        console.error('[NormalMode] /api/generate-speech error:', error);
        updateStatus('Speech generation failed', 'error');
    }
}

/**
 * Update status indicator
 */
function updateStatus(text, status) {
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');

    if (statusText) {
        statusText.textContent = text;
    }

    if (statusIndicator) {
        statusIndicator.className = `status-indicator status-${status}`;
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    startBtn.addEventListener('click', startDetection);
    stopBtn.addEventListener('click', stopDetection);
    resetBtn.addEventListener('click', resetText);
    speakBtn.addEventListener('click', speakCurrentText);
    if (recalibrateBtn) {
        recalibrateBtn.addEventListener('click', async () => {
            stopDetection();
            await startDetection({ forceCalibration: true });
        });
    }
}

/**
 * Initialize quick reference UI
 */
function initQuickReference() {
    const grid = document.getElementById('quickRefGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Sort items by length of morse code, then alphabetically
    const entries = Object.entries(MORSE_CODE_STANDARD).sort((a, b) => {
        if (a[1].length !== b[1].length) return a[1].length - b[1].length;
        return a[0].localeCompare(b[0]);
    });

    entries.forEach(([char, pattern]) => {
        const div = document.createElement('div');
        div.className = 'ref-item';
        div.dataset.char = char;
        div.dataset.pattern = pattern;
        div.style.cssText = 'background: rgba(255,255,255,0.1); border-radius: 6px; padding: 5px 10px; display: flex; align-items: center; gap: 8px; font-family: monospace; font-size: 1.1rem; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s ease;';

        div.innerHTML = `<strong style="color: var(--primary-blue); font-size: 1.2rem;">${char}</strong> <span style="color: white; letter-spacing: 2px;">${pattern}</span>`;
        grid.appendChild(div);
    });

    document.getElementById('matchCount').textContent = `${entries.length} combinations`;
}

/**
 * Handle live pattern updates to filter the quick reference
 */
function handlePatternUpdate(pattern) {
    const grid = document.getElementById('quickRefGrid');
    if (!grid) return;

    const items = grid.querySelectorAll('.ref-item');
    let matchCount = 0;

    const cleanPattern = (pattern && pattern !== '--') ? pattern.trim() : '';

    items.forEach(item => {
        const itemPattern = item.dataset.pattern;

        if (!cleanPattern || itemPattern.startsWith(cleanPattern)) {
            item.style.display = 'flex';
            if (cleanPattern && itemPattern === cleanPattern) {
                item.style.background = 'rgba(0, 255, 0, 0.2)';
                item.style.borderColor = 'var(--accent-green)';
            } else {
                item.style.background = 'rgba(255,255,255,0.1)';
                item.style.borderColor = 'rgba(255,255,255,0.05)';
            }
            matchCount++;
        } else {
            item.style.display = 'none';
        }
    });

    const countEl = document.getElementById('matchCount');
    if (countEl) {
        if (!cleanPattern) {
            countEl.textContent = `${items.length} combinations`;
        } else {
            countEl.textContent = `${matchCount} matches`;
        }
    }
}

/**
 * Initialize normal mode
 */
function init() {
    console.log('[NormalMode] Initializing...');
    setupEventListeners();
    initQuickReference();
    if (enablePerformanceMonitor && window.PerformanceMonitor) {
        performanceMonitor = new window.PerformanceMonitor({
            enabled: false,
            updateIntervalMs: 500
        });
    }
    updateStatus('Ready to start', 'idle');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopDetection();
});
