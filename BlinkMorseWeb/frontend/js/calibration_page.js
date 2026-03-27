/**
 * Dedicated calibration flow used by all modes before detection starts.
 */

checkAuth();

let faceMesh = null;
let camera = null;
let renderer = null;
let calibrationSession = null;
let isSessionActive = false;

const MODE_TO_PAGE = {
    patient: '/patient_mode.html',
    normal: '/normal_mode.html',
    morse: '/morse_mode.html'
};

const MODE_LABEL = {
    patient: 'Patient Mode',
    normal: 'Normal Morse Mode',
    morse: 'Morse Learning Mode'
};

const params = new URLSearchParams(window.location.search);
const requestedMode = String(params.get('mode') || 'normal').toLowerCase();
const modeName = MODE_TO_PAGE[requestedMode] ? requestedMode : 'normal';
const forceCalibration = params.get('force') === '1';

const modeTextEl = document.getElementById('calibrationModeText');
const statusEl = document.getElementById('statusText');
const instructionEl = document.getElementById('instructionText');
const progressBarEl = document.getElementById('progressBar');
const earValueEl = document.getElementById('earValue');
const startBtn = document.getElementById('startCalibrationBtn');
const cancelBtn = document.getElementById('cancelCalibrationBtn');
const videoElement = document.getElementById('videoFeed');
const canvasElement = document.getElementById('canvasOutput');

function resolveReturnPage() {
    return MODE_TO_PAGE[modeName] || '/mode_selection.html';
}

function redirectToModePage() {
    const destination = `${resolveReturnPage()}?autostart=1`;
    window.location.href = destination;
}

function setProgress(progress, text) {
    const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0));
    if (progressBarEl) {
        progressBarEl.style.width = `${Math.round(safeProgress * 100)}%`;
    }
    if (text && instructionEl) {
        instructionEl.textContent = text;
    }
}

function handleEARUpdate(avgEAR) {
    if (earValueEl && Number.isFinite(avgEAR)) {
        earValueEl.textContent = avgEAR.toFixed(3);
    }
}

function handleFaceMeshResults(results) {
    if (!isSessionActive || !renderer) return;

    const renderResult = renderer.render(results, {
        showFullMesh: true,
        showEyeLandmarks: true,
        meshColor: '#C0C0C070',
        meshLineWidth: 1,
        eyeColor: '#00FF00',
        eyePointSize: 3
    });

    if (renderResult.detected && renderResult.landmarks) {
        calibrationSession?.handleLandmarks(renderResult.landmarks);
    }
}

async function startCalibration() {
    if (isSessionActive) return;

    try {
        if (typeof FaceMesh === 'undefined') {
            throw new Error('MediaPipe Face Mesh not loaded. Check internet connection.');
        }

        startBtn.disabled = true;
        cancelBtn.disabled = false;
        setProgress(0, 'Starting camera...');
        updateStatus('Starting calibration', 'decoding');

        renderer = new FaceMeshRenderer(canvasElement);
        canvasElement.width = 1280;
        canvasElement.height = 720;

        faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(handleFaceMeshResults);

        calibrationSession = BlinkCalibrationManager.createSession(modeName, {
            onPrompt: (message) => {
                if (instructionEl) {
                    instructionEl.textContent = message;
                }
                updateStatus('Calibrating...', 'decoding');
            },
            onProgress: (progress, message) => setProgress(progress, message),
            onEARUpdate: handleEARUpdate
        });

        isSessionActive = true;

        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (isSessionActive && faceMesh) {
                    await faceMesh.send({ image: videoElement });
                }
            },
            width: 1280,
            height: 720
        });

        await camera.start();
        await calibrationSession.start(forceCalibration || true);

        setProgress(1, 'Calibration complete. Redirecting to detection...');
        updateStatus('Calibration complete', 'success');
        showNotification('Calibration complete. Starting detection.', 'success');

        setTimeout(() => {
            redirectToModePage();
        }, 900);
    } catch (error) {
        console.error('[CalibrationPage] Calibration failed:', error);
        showNotification(`Calibration failed: ${error.message}`, 'error');
        updateStatus('Calibration failed', 'error');
        setProgress(0, `Calibration failed: ${error.message}`);
        cleanup();
        startBtn.disabled = false;
        cancelBtn.disabled = true;
    }
}

function cleanup() {
    if (calibrationSession && calibrationSession.isActive()) {
        calibrationSession.cancel(new Error('Calibration stopped'));
    }

    calibrationSession = null;
    isSessionActive = false;

    if (camera) {
        camera.stop();
        camera = null;
    }

    if (faceMesh) {
        faceMesh.close();
        faceMesh = null;
    }

    if (renderer) {
        renderer.clear();
    }

    if (earValueEl) {
        earValueEl.textContent = '--';
    }
}

function init() {
    if (modeTextEl) {
        modeTextEl.textContent = `Calibrating for ${MODE_LABEL[modeName] || 'Selected Mode'}.`;
    }
    if (statusEl) {
        statusEl.textContent = 'Ready to calibrate';
    }

    startBtn.addEventListener('click', startCalibration);
    cancelBtn.addEventListener('click', () => {
        cleanup();
        startBtn.disabled = false;
        cancelBtn.disabled = true;
        setProgress(0, 'Calibration cancelled. Press Start Calibration to try again.');
        updateStatus('Calibration cancelled', 'idle');
    });
}

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', cleanup);