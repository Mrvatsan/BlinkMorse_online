/**
 * Face Mesh Renderer Module
 * Renders complete 468-point MediaPipe Face Mesh with FACEMESH_TESSELATION
 */

class FaceMeshRenderer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // MediaPipe Drawing Utils (loaded from CDN)
        this.drawingUtils = window;
    }
    
    /**
     * Render complete face mesh with all 468 landmarks
     * @param {Object} results - MediaPipe Face Mesh results
     * @param {Object} options - Rendering options
     */
    render(results, options = {}) {
        const {
            showFullMesh = true,
            showEyeLandmarks = true,
            meshColor = '#C0C0C070',
            meshLineWidth = 1,
            eyeColor = '#00FF00',
            eyePointSize = 3
        } = options;
        
        this.ctx.save();
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let renderState;

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // Draw full face mesh using FACEMESH_TESSELATION
            if (showFullMesh && typeof FACEMESH_TESSELATION !== 'undefined') {
                this.drawConnectors(
                    landmarks, 
                    FACEMESH_TESSELATION,
                    { color: meshColor, lineWidth: meshLineWidth }
                );
            }
            
            // Draw all 468 landmark points (small dots)
            if (showFullMesh) {
                this.drawLandmarkPoints(landmarks, '#FFFFFF40', 1);
            }
            
            // Draw eye landmarks prominently for blink detection
            if (showEyeLandmarks) {
                const LEFT_EYE = [33, 160, 158, 133, 153, 144];
                const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
                
                this.drawEyeLandmarks(landmarks, LEFT_EYE, eyeColor, eyePointSize);
                this.drawEyeLandmarks(landmarks, RIGHT_EYE, eyeColor, eyePointSize);
            }
            
            // Status text
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.fillText('✓ Face Mesh Active', 10, 30);

            renderState = { detected: true, landmarks };
        } else {
            // No face detected
            this.ctx.fillStyle = '#FF0000';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText('✗ No Face Detected', 10, 30);

            renderState = { detected: false, landmarks: null };
        }
        
        this.ctx.restore();

        return renderState;
    }
    
    /**
     * Draw connectors between landmarks
     */
    drawConnectors(landmarks, connections, style) {
        this.ctx.strokeStyle = style.color;
        this.ctx.lineWidth = style.lineWidth;
        
        for (const connection of connections) {
            const start = landmarks[connection[0]];
            const end = landmarks[connection[1]];
            
            const startX = start.x * this.canvas.width;
            const startY = start.y * this.canvas.height;
            const endX = end.x * this.canvas.width;
            const endY = end.y * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
    }
    
    /**
     * Draw all landmark points as small dots
     */
    drawLandmarkPoints(landmarks, color, size) {
        this.ctx.fillStyle = color;
        
        for (const landmark of landmarks) {
            const x = landmark.x * this.canvas.width;
            const y = landmark.y * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }
    
    /**
     * Draw eye landmarks prominently
     */
    drawEyeLandmarks(landmarks, indices, color, size) {
        this.ctx.fillStyle = color;
        
        for (const idx of indices) {
            const landmark = landmarks[idx];
            const x = landmark.x * this.canvas.width;
            const y = landmark.y * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }
    
    /**
     * Clear canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceMeshRenderer;
}
