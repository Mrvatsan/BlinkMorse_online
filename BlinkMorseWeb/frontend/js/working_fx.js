/**
 * Working Modes Interactive Effects
 * Canvas particle background with a different theme (tech/neural net style)
 */

document.addEventListener("DOMContentLoaded", () => {
    initCustomCursor();
    initWorkingCanvasBackground();
});

// ===== CUSTOM CURSOR =====
function initCustomCursor() {
    const cursor = document.createElement('div');
    const cursorRing = document.createElement('div');

    cursor.classList.add('custom-cursor');
    cursorRing.classList.add('custom-cursor-ring');

    document.body.appendChild(cursor);
    document.body.appendChild(cursorRing);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
        cursor.style.opacity = '1';
        cursorRing.style.opacity = '1';
    });

    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
        cursorRing.style.opacity = '0';
    });

    document.addEventListener('mousedown', () => cursorRing.classList.add('active'));
    document.addEventListener('mouseup', () => cursorRing.classList.remove('active'));

    function tick() {
        ringX += (mouseX - ringX) * 0.12;
        ringY += (mouseY - ringY) * 0.12;
        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top = ringY + 'px';
        requestAnimationFrame(tick);
    }
    tick();
}

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
    const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
    const mouse = { x: null, y: null, radius: isDarkTheme ? 180 : 240 };

    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
        mouse.radius = isDarkTheme ? 180 : 240;
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

    // Theme-Aware Colors
    function getParticleColors() {
        const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
        if (isDarkTheme) {
            return [
                'rgba(0, 210, 90, 0.70)',    // green
                'rgba(0, 190, 80, 0.65)',    // lighter green
                'rgba(20, 180, 70, 0.68)'    // darker green
            ];
        } else {
            return [
                'rgba(0, 160, 70, 0.55)',   // green
                'rgba(0, 190, 90, 0.50)',   // lighter green
                'rgba(20, 140, 60, 0.52)'   // darker green
            ];
        }
    }

    let colors = getParticleColors();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
            this.size = isDarkTheme ? (Math.random() * 4 + 2) : (Math.random() * 5 + 3);
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
                if (distance < 0.001) return;

                if (distance < mouse.radius) {
                    // Pull particles slightly towards mouse, but mostly just agitate them
                    let forceDirectionX = dx / distance;
                    let forceDirectionY = dy / distance;
                    let force = (mouse.radius - distance) / mouse.radius;

                    // Repel with higher force in light theme for more visible interaction
                    const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
                    const forceMultiplier = isDarkTheme ? 2 : 3.5;
                    this.x -= forceDirectionX * force * forceMultiplier;
                    this.y -= forceDirectionY * force * forceMultiplier;
                }
            }
        }
    }

    function init() {
        particles = [];
        const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
        const count = isDarkTheme ? (width * height) / 12000 : (width * height) / 10000;
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function connect() {
        const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                let dx = particles[a].x - particles[b].x;
                let dy = particles[a].y - particles[b].y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                // If mouse is near, increase connection radius
                let maxDist = isDarkTheme ? 120 : 140;
                if (mouse.x != null && mouse.y != null) {
                    let mouseDistA = Math.sqrt(Math.pow(mouse.x - particles[a].x, 2) + Math.pow(mouse.y - particles[a].y, 2));
                    if (mouseDistA < 150) maxDist = isDarkTheme ? 160 : 200;
                }

                if (dist < maxDist) {
                    let opacity = 1 - (dist / maxDist);
                    // Theme-aware connection lines
                    const lineColor = isDarkTheme
                        ? `rgba(0, 210, 90, ${opacity * 0.55})`
                        : `rgba(0, 170, 75, ${opacity * 0.38})`;
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = isDarkTheme ? 1.2 : 1.5;
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

    // Listen for theme changes and update colors
    const observer = new MutationObserver(() => {
        colors = getParticleColors();
        // Update particles with new colors
        for (let p of particles) {
            p.color = colors[Math.floor(Math.random() * colors.length)];
        }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
}
