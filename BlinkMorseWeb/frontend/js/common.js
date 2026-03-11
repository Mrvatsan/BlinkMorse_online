/**
 * Common Utilities
 * Shared functions across all pages
 */

// API Base URL
const API_BASE = window.location.origin;

/**
 * Navigate back to mode selection menu
 */
function backToMenu() {
    window.location.href = '/mode_selection.html';
}

/**
 * Check if user is logged in
 */
function checkAuth() {
    const userName = sessionStorage.getItem('userName');
    if (!userName) {
        window.location.href = '/';
        return false;
    }
    return true;
}

/**
 * Get user info from session
 */
function getUserInfo() {
    return {
        name: sessionStorage.getItem('userName') || 'Guest',
        role: sessionStorage.getItem('userRole') || 'user'
    };
}

/**
 * Display user info on page
 */
function displayUserInfo(elementId) {
    const user = getUserInfo();
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = `${user.name} (${user.role})`;
    }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    // Check if toast container exists, if not create one
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Create new toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;

    // Add icon based on type
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

    // Append toast to container
    container.appendChild(toast);

    // Remove toast after 3.5 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3500);
}

/**
 * Format Morse pattern for display
 */
function formatMorsePattern(pattern) {
    if (!pattern) return '...';
    return pattern.split('').join(' ');
}

/**
 * Fetch JSON from API
 */
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Convert base64 audio to blob URL
 */
function base64ToAudioURL(base64Audio) {
    // Remove data URL prefix if present
    const base64Data = base64Audio.includes(',')
        ? base64Audio.split(',')[1]
        : base64Audio;

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob
    const blob = new Blob([bytes], { type: 'audio/wav' });

    // Create object URL
    return URL.createObjectURL(blob);
}

/**
 * Play audio from base64 data
 */
function playAudioBase64(base64Audio, audioElementId = 'audioPlayer') {
    try {
        const audioElement = document.getElementById(audioElementId);
        if (!audioElement) {
            console.error('Audio element not found');
            return;
        }

        // Create audio URL
        const audioURL = base64ToAudioURL(base64Audio);

        // Set source and play
        audioElement.src = audioURL;
        audioElement.play().catch(err => {
            console.error('Audio playback error:', err);
        });

        // Clean up URL after playing
        audioElement.onended = () => {
            URL.revokeObjectURL(audioURL);
        };

    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

/**
 * Update status indicator
 */
function updateStatus(statusText, statusType = 'idle') {
    const indicator = document.getElementById('statusIndicator');
    const textElement = document.getElementById('statusText');
    const dotElement = indicator?.querySelector('.status-dot');

    if (!indicator || !textElement) return;

    // Remove all status classes
    indicator.classList.remove('status-idle', 'status-decoding', 'status-success', 'status-error');

    // Add appropriate class
    indicator.classList.add(`status-${statusType}`);

    // Update text
    textElement.textContent = statusText;

    // Update dot color
    if (dotElement) {
        const colors = {
            idle: 'var(--status-idle)',
            decoding: 'var(--status-decoding)',
            success: 'var(--status-success)',
            error: 'var(--status-error)'
        };
        dotElement.style.background = colors[statusType] || colors.idle;
    }
}

/**
 * WebSocket connection manager
 */
class WebSocketManager {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.messageHandlers = {};
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsURL = `${protocol}//${window.location.host}${this.endpoint}`;

                console.log('Connecting to WebSocket:', wsURL);

                this.ws = new WebSocket(wsURL);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onclose = () => {
                    console.log('WebSocket closed');
                    this.connected = false;
                    this.handleReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            const messageType = data.type;

            if (this.messageHandlers[messageType]) {
                this.messageHandlers[messageType](data);
            } else if (this.messageHandlers['*']) {
                this.messageHandlers['*'](data);
            }

        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    on(messageType, handler) {
        this.messageHandlers[messageType] = handler;
    }

    send(data) {
        if (this.connected && this.ws) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.error('WebSocket not connected');
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

            setTimeout(() => {
                this.connect().catch(err => {
                    console.error('Reconnection failed:', err);
                });
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
            updateStatus('Connection lost', 'error');
        }
    }

    close() {
        if (this.ws) {
            this.connected = false;
            this.ws.close();
            this.ws = null;
        }
    }
}

// Export for use in other scripts
window.WebSocketManager = WebSocketManager;
