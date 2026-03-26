/**
 * Lightweight performance monitor for real-time webcam processing loops.
 * Tracks rolling FPS (last 1 second) and per-frame processing latency.
 */
class PerformanceMonitor {
    constructor(options = {}) {
        this.enabled = Boolean(options.enabled);
        this.updateIntervalMs = typeof options.updateIntervalMs === 'number' ? options.updateIntervalMs : 500;

        this.frameTimestamps = [];
        this.lastLatencyMs = 0;
        this.currentFPS = 0;

        this.lastUIUpdateAt = 0;
        this.lastRenderedFPS = null;
        this.lastRenderedLatency = null;

        this.panelEl = null;
        this.fpsEl = null;
        this.latencyEl = null;

        if (this.enabled && options.container) {
            this.attach(options.container);
        }
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
        if (!this.enabled) {
            this.reset();
            this.detach();
        }
    }

    attach(container) {
        if (!this.enabled || !container || this.panelEl) {
            return;
        }

        this.ensureStyles();

        this.panelEl = document.createElement('div');
        this.panelEl.className = 'perf-monitor-panel perf-fps-good';

        const fpsLine = document.createElement('div');
        fpsLine.className = 'perf-monitor-line';
        fpsLine.innerHTML = 'FPS: <span>--</span>';

        const latencyLine = document.createElement('div');
        latencyLine.className = 'perf-monitor-line';
        latencyLine.innerHTML = 'Latency: <span>-- ms</span>';

        this.fpsEl = fpsLine.querySelector('span');
        this.latencyEl = latencyLine.querySelector('span');

        this.panelEl.appendChild(fpsLine);
        this.panelEl.appendChild(latencyLine);
        container.appendChild(this.panelEl);
    }

    detach() {
        if (this.panelEl && this.panelEl.parentNode) {
            this.panelEl.parentNode.removeChild(this.panelEl);
        }
        this.panelEl = null;
        this.fpsEl = null;
        this.latencyEl = null;
    }

    updateFrame(latencyMs) {
        if (!this.enabled) {
            return;
        }

        const now = performance.now();
        this.lastLatencyMs = latencyMs;

        this.frameTimestamps.push(now);
        const cutoff = now - 1000;
        while (this.frameTimestamps.length && this.frameTimestamps[0] < cutoff) {
            this.frameTimestamps.shift();
        }

        this.currentFPS = this.frameTimestamps.length;

        if (this.panelEl && now - this.lastUIUpdateAt >= this.updateIntervalMs) {
            this.lastUIUpdateAt = now;
            this.render();
        }
    }

    getFPS() {
        return this.currentFPS;
    }

    getLatency() {
        return this.lastLatencyMs;
    }

    reset() {
        this.frameTimestamps = [];
        this.lastLatencyMs = 0;
        this.currentFPS = 0;
        this.lastUIUpdateAt = 0;
        this.lastRenderedFPS = null;
        this.lastRenderedLatency = null;
    }

    render() {
        if (!this.fpsEl || !this.latencyEl || !this.panelEl) {
            return;
        }

        const fps = Math.round(this.currentFPS);
        const latency = this.lastLatencyMs;

        if (this.lastRenderedFPS !== fps) {
            this.fpsEl.textContent = String(fps);
            this.lastRenderedFPS = fps;
        }

        const latencyDisplay = `${latency.toFixed(1)} ms`;
        if (this.lastRenderedLatency !== latencyDisplay) {
            this.latencyEl.textContent = latencyDisplay;
            this.lastRenderedLatency = latencyDisplay;
        }

        this.panelEl.classList.remove('perf-fps-low', 'perf-fps-medium', 'perf-fps-good');
        if (fps < 15) {
            this.panelEl.classList.add('perf-fps-low');
        } else if (fps <= 25) {
            this.panelEl.classList.add('perf-fps-medium');
        } else {
            this.panelEl.classList.add('perf-fps-good');
        }
    }

    ensureStyles() {
        if (document.getElementById('perf-monitor-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'perf-monitor-styles';
        style.textContent = `
            .perf-monitor-panel {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 20;
                pointer-events: none;
                min-width: 120px;
                padding: 8px 10px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.25);
                background: rgba(0, 0, 0, 0.45);
                color: #e8f5e9;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 0.82rem;
                line-height: 1.3;
                backdrop-filter: blur(2px);
            }
            .perf-monitor-line {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                white-space: nowrap;
            }
            .perf-fps-low {
                border-color: rgba(255, 82, 82, 0.9);
                box-shadow: 0 0 0 1px rgba(255, 82, 82, 0.25) inset;
            }
            .perf-fps-medium {
                border-color: rgba(255, 193, 7, 0.95);
                box-shadow: 0 0 0 1px rgba(255, 193, 7, 0.22) inset;
            }
            .perf-fps-good {
                border-color: rgba(0, 200, 81, 0.95);
                box-shadow: 0 0 0 1px rgba(0, 200, 81, 0.2) inset;
            }
        `;

        document.head.appendChild(style);
    }
}

if (typeof window !== 'undefined') {
    window.PerformanceMonitor = PerformanceMonitor;
}
