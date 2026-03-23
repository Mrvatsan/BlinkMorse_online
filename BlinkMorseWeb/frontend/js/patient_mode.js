/**
 * Patient Mode - Real-time Blink Detection with MediaPipe Face Mesh
 * Simplified Morse logic with live camera feed and FULL 468-point face mesh
 */

// Check authentication
checkAuth();
displayUserInfo('userInfo');

// MediaPipe Face Mesh
let faceMesh = null;
let camera = null;
let renderer = null;
let blinkDetector = null;
let calibrationSession = null;
let calibrationConfig = null;

// State management
let wsManager = null;
let isDetecting = false;
let isSessionActive = false;
let blinkSymbolsBuffer = [];
let lastAudioUrl = null; // Cache the latest speech URL for replay
let lastFaceSeenAt = 0;
let faceBlockedWarningShown = false;
const MODE_NAME = 'patient';

const FACE_BLOCKED_WARNING_DELAY_MS = 2500;

// Timing for letter/word detection
let lastBlinkEndTime = null;
const LETTER_PAUSE = 1.0;
const WORD_PAUSE = 2.5;

// Current morse pattern
let currentMorsePattern = '';

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const repeatBtn = document.getElementById('repeatBtn');
const recalibrateBtn = document.getElementById('recalibrateBtn');
const videoElement = document.getElementById('videoFeed');
const canvasElement = document.getElementById('canvasOutput');
const earValue = document.getElementById('earValue');
const blinkSymbols = document.getElementById('blinkSymbols');
const morsePattern = document.getElementById('morsePattern');
const currentWord = document.getElementById('currentWord');
const fullMessage = document.getElementById('fullMessage');
const translatedTextEl = document.getElementById('translatedText');
const languageSelect = document.getElementById('languageSelect');

/**
 * Handle blink detection from BlinkDetector module
 */
function handleBlinkDetected(blinkEvent) {
    const { symbol, type, duration } = blinkEvent;

    // Add to pattern
    currentMorsePattern += symbol;
    blinkSymbolsBuffer.push(symbol);
    lastBlinkEndTime = blinkEvent.timestamp;

    // Update UI
    blinkSymbols.textContent = blinkSymbolsBuffer.join(' ');
    morsePattern.textContent = currentMorsePattern || '--';

    // Flash effect
    blinkSymbols.style.color = '#00ff00';
    setTimeout(() => {
        blinkSymbols.style.color = 'var(--accent-green)';
    }, 200);

    updateStatus(`Blink: ${type}`, 'decoding');
}

/**
 * Handle EAR updates from BlinkDetector
 */
function handleEARUpdate(avgEAR, leftEAR, rightEAR) {
    earValue.textContent = avgEAR.toFixed(3);
}

/**
 * Check for letter/word completion based on pause duration
 */
function checkForPauses() {
    if (!blinkDetector || !lastBlinkEndTime || currentMorsePattern.length === 0) {
        return;
    }

    const timeSinceLastBlink = blinkDetector.getTimeSinceLastBlink();

    // Word pause
    if (timeSinceLastBlink >= WORD_PAUSE) {
        decodeAndSpeak(currentMorsePattern, true);
        currentMorsePattern = '';
        blinkSymbolsBuffer = [];
        blinkSymbols.textContent = '...';
        morsePattern.textContent = '--';
        lastBlinkEndTime = null;
    }
    // Letter pause
    else if (timeSinceLastBlink >= LETTER_PAUSE) {
        decodeAndSpeak(currentMorsePattern, false);
        currentMorsePattern = '';
        blinkSymbolsBuffer = [];
        blinkSymbols.textContent = '...';
        morsePattern.textContent = '--';
        lastBlinkEndTime = null;
    }
}

/**
 * Decode morse pattern and trigger TTS
 */
async function decodeAndSpeak(pattern, isWord) {
    try {
        // Decode pattern via API
        const response = await fetchAPI('/api/decode', {
            method: 'POST',
            body: JSON.stringify({
                morse_pattern: pattern,
                patient_mode: true
            })
        });

        if (response.success) {
            const decoded = response.decoded;
            console.log(`[Decode] ${pattern} → ${decoded}`);

            currentWord.textContent = decoded;
            updateStatus(`Decoded: ${decoded}`, 'success');

            // Trigger multilingual TTS pipeline
            await generateAndPlaySpeech(decoded);

            fullMessage.textContent = (fullMessage.textContent === '--' ? '' : fullMessage.textContent) + decoded + ' ';
            currentWord.textContent = '--';

            if (isDetecting) {
                repeatBtn.disabled = !lastAudioUrl;
            }
        } else {
            console.warn(`[Decode] Pattern not recognized: ${pattern}`);
            updateStatus('Pattern not recognized', 'error');
            currentWord.textContent = '???';
            setTimeout(() => {
                currentWord.textContent = '--';
                updateStatus('Ready', 'idle');
            }, 2000);
        }
    } catch (error) {
        console.error('[Decode] Error:', error);
    }
}

/**
 * MediaPipe Face Mesh callback
 */
function onFaceMeshResults(results) {
    if (!isSessionActive) return;

    // Render full 468-point face mesh
    const renderResult = renderer.render(results, {
        showFullMesh: true,          // Show complete face mesh
        showEyeLandmarks: true,      // Highlight eyes for blink detection
        meshColor: '#C0C0C070',      // Semi-transparent mesh
        meshLineWidth: 1,
        eyeColor: '#00FF00',         // Green eye landmarks
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
    } else {
        const blockedDuration = Date.now() - lastFaceSeenAt;
        if (blockedDuration >= FACE_BLOCKED_WARNING_DELAY_MS && !faceBlockedWarningShown) {
            faceBlockedWarningShown = true;
            updateStatus('Face/camera blocked. Please clear view and align your face.', 'error');
            showNotification('Face or camera appears blocked. Please clear the camera view.', 'warning');
        }
    }

    // Check for letter/word pauses
    checkForPauses();
}

/**
 * Draw eye landmarks on canvas (REMOVED - now handled by renderer)
 */
// function drawEyeLandmarks(landmarks, color) { ... }

/**
 * Initialize patient mode
 */
async function init() {
    try {
        // Load patient commands reference
        await loadPatientCommands();

        // Setup event listeners
        setupEventListeners();

        updateStatus('Ready to start', 'idle');

    } catch (error) {
        console.error('Initialization error:', error);
        updateStatus('Initialization failed', 'error');
    }
}

/**
 * Load patient commands from API
 */
async function loadPatientCommands() {
    try {
        const response = await fetchAPI('/api/patient_commands');

        if (response.success) {
            displayPatientCommands(response.commands);
        }

    } catch (error) {
        console.error('Error loading commands:', error);
        document.getElementById('commandsList').innerHTML =
            '<p class="text-danger">Failed to load commands</p>';
    }
}

/**
 * Display patient commands in the reference panel
 */
function displayPatientCommands(commands) {
    const container = document.getElementById('commandsList');
    container.innerHTML = '';

    const commandLabels = {
        '.': 'YES',
        '.-': 'NO',
        '...': 'WATER',
        '-.': 'PAIN',
        '..--': 'EMERGENCY',
        '---': 'FAMILY',
        '..': 'BATHROOM'
    };

    for (const [pattern, command] of Object.entries(commands)) {
        const item = document.createElement('div');
        item.className = 'morse-item';
        item.innerHTML = `
            <span class="morse-label">${command}</span>
            <span class="morse-pattern">${formatMorsePattern(pattern)}</span>
        `;
        container.appendChild(item);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    startBtn.addEventListener('click', startDetection);
    stopBtn.addEventListener('click', stopDetection);
    resetBtn.addEventListener('click', resetSession);
    if (recalibrateBtn) {
        recalibrateBtn.addEventListener('click', async () => {
            stopDetection();
            await startDetection({ forceCalibration: true });
        });
    }
    repeatBtn.addEventListener('click', () => {
        if (lastAudioUrl) {
            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer) {
                audioPlayer.play().catch(err => {
                    console.error('Audio playback error:', err);
                });
                updateStatus('Repeating speech', 'success');
            }
        }
    });
}

/**
 * Start blink detection with MediaPipe Face Mesh
 */
async function startDetection(options = {}) {
    const forceCalibration = Boolean(options.forceCalibration);

    try {
        updateStatus('Starting camera...', 'decoding');

        // Initialize renderer
        renderer = new FaceMeshRenderer(canvasElement);

        // Check if MediaPipe is loaded
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
        isDetecting = true;

        // Clear previous data
        blinkSymbolsBuffer = [];
        blinkSymbols.textContent = '...';
        currentMorsePattern = '';
        morsePattern.textContent = '--';
        blinkDetector.reset();

        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        resetBtn.disabled = false;
        repeatBtn.disabled = !lastAudioUrl;
        if (recalibrateBtn) {
            recalibrateBtn.disabled = false;
        }

        updateStatus('Detecting blinks...', 'success');
        console.log('[Camera] Started successfully with FULL MediaPipe Face Mesh (468 landmarks)');

    } catch (error) {
        console.error('Error starting detection:', error);
        updateStatus('Failed to start: ' + error.message, 'error');
        stopDetection();
    }
}

/**
 * Stop blink detection
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

    // Clear buffers
    blinkSymbolsBuffer = [];
    currentMorsePattern = '';

    // Reset UI
    startBtn.disabled = false;
    stopBtn.disabled = true;
    resetBtn.disabled = true;
    repeatBtn.disabled = true;
    if (recalibrateBtn) {
        recalibrateBtn.disabled = true;
    }

    earValue.textContent = '--';
    blinkSymbols.textContent = '...';
    morsePattern.textContent = '--';

    updateStatus('Stopped', 'idle');
    console.log('[Camera] Stopped');
}

/**
 * Reset session (clear all text)
 */
function resetSession() {
    currentWord.textContent = '--';
    fullMessage.textContent = '--';
    morsePattern.textContent = '--';
    blinkSymbolsBuffer = [];
    blinkSymbols.textContent = '...';
    currentMorsePattern = '';
    if (translatedTextEl) {
        translatedTextEl.textContent = '--';
    }

    updateStatus('Session reset', 'idle');
    console.log('[Session] Reset');
}

/**
 * Call backend multilingual pipeline and play audio for decoded text.
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
                lastAudioUrl = response.audio_url;
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
        console.error('[PatientMode] /api/generate-speech error:', error);
        updateStatus('Speech generation failed', 'error');
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopDetection();
});
