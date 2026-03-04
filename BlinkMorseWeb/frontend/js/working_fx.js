/**
 * Working Modes Interactive Effects
 * Canvas particle background with a different theme (tech/neural net style)
 */

document.addEventListener("DOMContentLoaded", () => {
    initWorkingCanvasBackground();
});

// ===== CANVAS PARTICLE BACKGROUND (TECH THEME) =====
function initWorkingCanvasBackground() {
    // Inject canvas and styles dynamically if not present
    let canvas = document.getElementById('bg-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        document.body.prepend(canvas);

        const style = document.createElement('style');
        style.innerHTML = `
            #bg-canvas {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 0;
                pointer-events: none;
            }
            .container, .patient-layout, .normal-layout, .learner-layout {
                position: relative;
                z-index: 2;
            }
        `;
        document.head.appendChild(style);
    }

    const ctx = canvas.getContext('2d');
    let width, height, particles;
    const mouse = { x: null, y: null, radius: 180 };

    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    document.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Theme Colors: Cyber Blue & Purple
    const colors = [
        'rgba(51, 133, 214, 0.6)',   // primary-blue
        'rgba(153, 51, 255, 0.5)',   // accent-purple
        'rgba(0, 200, 81, 0.4)'      // touch of accent-green
    ];

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 3 + 1;
            this.speedX = (Math.random() - 0.5) * 0.8;
            this.speedY = (Math.random() - 0.5) * 0.8;
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            // Draw hexagon or square instead of circle for tech feel
            if (this.size > 2) {
                ctx.rect(this.x, this.y, this.size, this.size);
            } else {
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            }
            ctx.closePath();
            ctx.fill();
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Bounce off edges
            if (this.x < 0 || this.x > width) this.speedX *= -1;
            if (this.y < 0 || this.y > height) this.speedY *= -1;

            // Mouse interaction
            if (mouse.x != null && mouse.y != null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius) {
                    // Pull particles slightly towards mouse, but mostly just agitate them
                    let forceDirectionX = dx / distance;
                    let forceDirectionY = dy / distance;
                    let force = (mouse.radius - distance) / mouse.radius;

                    // Repel slightly
                    this.x -= forceDirectionX * force * 2;
                    this.y -= forceDirectionY * force * 2;
                }
            }
        }
    }

    function init() {
        particles = [];
        const count = (width * height) / 12000; // slightly less dense
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function connect() {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                let dx = particles[a].x - particles[b].x;
                let dy = particles[a].y - particles[b].y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                // If mouse is near, increase connection radius
                let maxDist = 120;
                if (mouse.x != null && mouse.y != null) {
                    let mouseDistA = Math.sqrt(Math.pow(mouse.x - particles[a].x, 2) + Math.pow(mouse.y - particles[a].y, 2));
                    if (mouseDistA < 150) maxDist = 160;
                }

                if (dist < maxDist) {
                    let opacity = 1 - (dist / maxDist);
                    // Blue-purple connection lines
                    ctx.strokeStyle = `rgba(100, 150, 255, ${opacity * 0.25})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        for (let p of particles) {
            p.update();
            p.draw();
        }
        connect();
        requestAnimationFrame(animate);
    }

    init();
    animate();
}
