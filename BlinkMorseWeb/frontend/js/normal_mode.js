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

// State
let isDetecting = false;

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const speakBtn = document.getElementById('speakBtn');
const videoElement = document.getElementById('videoFeed');
const canvasElement = document.getElementById('canvasOutput');
const earValue = document.getElementById('earValue');
const blinkSymbols = document.getElementById('blinkSymbols');
const currentPattern = document.getElementById('currentPattern');
const currentLetter = document.getElementById('currentLetter');
const decodedText = document.getElementById('decodedText');

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
    
    try {
        const response = await fetchAPI('/api/tts', {
            method: 'POST',
            body: JSON.stringify({ text: word })
        });
        
        if (response.success && response.audio) {
            playAudioBase64(response.audio);
            updateStatus(`Speaking: ${word}`, 'success');
        }
    } catch (error) {
        console.error('[NormalMode] TTS error:', error);
    }
}

/**
 * MediaPipe Face Mesh callback
 */
function onFaceMeshResults(results) {
    if (!isDetecting) return;
    
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
        blinkDetector.processFaceLandmarks(renderResult.landmarks);
    }
}

/**
 * Start detection
 */
async function startDetection() {
    try {
        updateStatus('Starting camera...', 'decoding');
        
        // Initialize renderer
        renderer = new FaceMeshRenderer(canvasElement);
        
        // Initialize blink detector
        blinkDetector = new BlinkDetector({
            earThreshold: 0.21,
            dotDuration: 0.4,
            dashDuration: 0.4,
            onBlinkDetected: handleBlinkDetected,
            onEARUpdate: handleEARUpdate
        });
        
        // Initialize normal mode controller
        normalController = new NormalModeController({
            blinkSymbolsEl: blinkSymbols,
            currentPatternEl: currentPattern,
            currentLetterEl: currentLetter,
            decodedTextEl: decodedText,
            onWordComplete: handleWordComplete
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
        
        // Initialize camera
        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (isDetecting && faceMesh) {
                    await faceMesh.send({ image: videoElement });
                }
            },
            width: 1280,
            height: 720
        });
        
        // Start camera
        await camera.start();
        
        // Set canvas size
        canvasElement.width = 1280;
        canvasElement.height = 720;
        
        // Start detection
        isDetecting = true;
        
        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        resetBtn.disabled = false;
        speakBtn.disabled = false;
        
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
    isDetecting = false;
    
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
    
    // Update UI
    startBtn.disabled = false;
    stopBtn.disabled = true;
    resetBtn.disabled = true;
    speakBtn.disabled = true;
    
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
    
    try {
        updateStatus('Speaking...', 'decoding');
        
        const response = await fetchAPI('/api/tts', {
            method: 'POST',
            body: JSON.stringify({ text: text })
        });
        
        if (response.success && response.audio) {
            playAudioBase64(response.audio);
            updateStatus('Speaking complete', 'success');
        }
    } catch (error) {
        console.error('[NormalMode] TTS error:', error);
        updateStatus('TTS failed', 'error');
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
}

/**
 * Initialize normal mode
 */
function init() {
    console.log('[NormalMode] Initializing...');
    setupEventListeners();
    updateStatus('Ready to start', 'idle');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopDetection();
});
