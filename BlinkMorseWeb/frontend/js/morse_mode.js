/**
 * Morse Learning Mode - Camera-based Practical Training
 * Learn Morse code by doing, not reading
 */

// Check authentication
checkAuth();

// MediaPipe Face Mesh
let faceMesh = null;
let camera = null;
let renderer = null;
let blinkDetector = null;
let learnerController = null;

// State
let isLearning = false;
let letterSubmissionTimer = null;

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const skipBtn = document.getElementById('skipBtn');
const videoElement = document.getElementById('videoFeed');
const canvasElement = document.getElementById('canvasOutput');
const earValue = document.getElementById('earValue');
const targetLetterEl = document.getElementById('targetLetter');
const targetPatternEl = document.getElementById('targetPattern');
const userInputEl = document.getElementById('userInput');
const feedbackEl = document.getElementById('feedback');
const scoreEl = document.getElementById('score');
const languageSelect = document.getElementById('languageSelect');
const audioPlayer = document.getElementById('audioPlayer');

/**
 * Handle blink detected from BlinkDetector
 */
function handleBlinkDetected(blinkEvent) {
    if (!isLearning || !learnerController) return;
    
    const { symbol } = blinkEvent;
    
    // Add blink to learner controller
    learnerController.addBlinkInput(symbol);
    
    // Reset submission timer
    if (letterSubmissionTimer) {
        clearTimeout(letterSubmissionTimer);
    }
    
    // Set new timer to auto-submit after 1 second
    letterSubmissionTimer = setTimeout(() => {
        learnerController.checkPattern();
        letterSubmissionTimer = null;
    }, 1000);
}

/**
 * Handle EAR updates from BlinkDetector
 */
function handleEARUpdate(avgEAR, leftEAR, rightEAR) {
    earValue.textContent = avgEAR.toFixed(3);
}

/**
 * Handle correct answer
 */
function handleCorrect(letter, pattern) {
    console.log(`[Learner] ✅ Correct! ${letter} = ${pattern}`);
    const spokenPattern = pattern.replace(/\./g, 'dot ').replace(/-/g, 'dash ').trim();
    generateAndPlaySpeech(`Correct. ${letter}. Pattern: ${spokenPattern}`);
}

/**
 * Handle incorrect answer
 */
function handleIncorrect(userInput, correctPattern) {
    console.log(`[Learner] ❌ Wrong! Got: ${userInput}, Expected: ${correctPattern}`);
    const spokenPattern = correctPattern.replace(/\./g, 'dot ').replace(/-/g, 'dash ').trim();
    generateAndPlaySpeech(`Not correct. Try again. Correct pattern is ${spokenPattern}`);
}

/**
 * Handle learner challenge start
 */
function handleChallengeStart(letter, pattern) {
    const spokenPattern = pattern.replace(/\./g, 'dot ').replace(/-/g, 'dash ').trim();
    generateAndPlaySpeech(`Practice letter ${letter}. Pattern: ${spokenPattern}`);
}

/**
 * Call backend multilingual pipeline and play audio.
 */
async function generateAndPlaySpeech(text) {
    const language = languageSelect ? languageSelect.value : 'en';

    try {
        const response = await fetchAPI('/api/generate-speech', {
            method: 'POST',
            body: JSON.stringify({
                text: text,
                language: language
            })
        });

        if (response.success && audioPlayer && response.audio_url) {
            audioPlayer.pause();
            audioPlayer.src = response.audio_url;
            audioPlayer.currentTime = 0;
            audioPlayer.play().catch(err => {
                console.error('Learner audio playback error:', err);
            });
        } else if (!response.success) {
            console.error('Learner TTS error:', response.error || 'Unknown error');
        }
    } catch (error) {
        console.error('[LearnerMode] /api/generate-speech error:', error);
    }
}

/**
 * MediaPipe Face Mesh callback
 */
function onFaceMeshResults(results) {
    if (!isLearning) return;
    
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
 * Start learning session
 */
async function startLearning() {
    try {
        console.log('[Learner] Starting camera...');
        
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
        
        // Initialize learner controller
        learnerController = new LearnerModeController({
            targetLetterEl: targetLetterEl,
            targetPatternEl: targetPatternEl,
            userInputEl: userInputEl,
            feedbackEl: feedbackEl,
            scoreEl: scoreEl,
            onCorrect: handleCorrect,
            onIncorrect: handleIncorrect,
            onChallengeStart: handleChallengeStart
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

        // Start learning before camera starts streaming frames
        isLearning = true;
        
        // Initialize camera
        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (isLearning && faceMesh) {
                    await faceMesh.send({ image: videoElement });
                }
            },
            width: 1280,
            height: 720
        });
        
        // Start camera
        await camera.start();

        // Start learning session
        learnerController.startNewChallenge();
        
        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        skipBtn.disabled = false;
        
        console.log('[Learner] Started successfully with FULL MediaPipe Face Mesh');
        
    } catch (error) {
        console.error('[Learner] Error starting:', error);
        alert('Failed to start: ' + error.message);
        stopLearning();
    }
}

/**
 * Stop learning session
 */
function stopLearning() {
    isLearning = false;
    
    // Clear timer
    if (letterSubmissionTimer) {
        clearTimeout(letterSubmissionTimer);
        letterSubmissionTimer = null;
    }
    
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
    skipBtn.disabled = true;
    
    earValue.textContent = '--';
    
    console.log('[Learner] Stopped');
}

/**
 * Skip current letter (show next challenge)
 */
function skipLetter() {
    if (learnerController && isLearning) {
        learnerController.startNewChallenge();
        
        // Clear submission timer
        if (letterSubmissionTimer) {
            clearTimeout(letterSubmissionTimer);
            letterSubmissionTimer = null;
        }
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    startBtn.addEventListener('click', startLearning);
    stopBtn.addEventListener('click', stopLearning);
    skipBtn.addEventListener('click', skipLetter);
}

/**
 * Initialize learner mode
 */
function init() {
    console.log('[Learner] Initializing...');
    setupEventListeners();
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopLearning();
});
