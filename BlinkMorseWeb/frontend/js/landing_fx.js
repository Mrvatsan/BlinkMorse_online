/**
 * Landing Page Interactive Effects
 * Canvas particle background, custom cursor, scroll reveals, navbar
 */

document.addEventListener("DOMContentLoaded", () => {
    initCustomCursor();
    initCanvasBackground();
    initScrollReveal();
    initNavbarScroll();
    initLoginCardHover();
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

// ===== CANVAS PARTICLE BACKGROUND =====
function initCanvasBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height, particles;
    const mouse = { x: null, y: null, radius: 150 };

    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * 2 + 0.8;
            this.baseX = this.x;
            this.baseY = this.y;
            this.density = (Math.random() * 25) + 2;
        }

        draw() {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }

        update() {
            if (mouse.x == null || mouse.y == null) return;
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let forceX = dx / distance;
            let forceY = dy / distance;
            let maxDist = mouse.radius;
            let force = (maxDist - distance) / maxDist;

            if (distance < mouse.radius) {
                this.x -= forceX * force * this.density;
                this.y -= forceY * force * this.density;
            } else {
                if (this.x !== this.baseX) this.x -= (this.x - this.baseX) / 12;
                if (this.y !== this.baseY) this.y -= (this.y - this.baseY) / 12;
            }
        }
    }

    function init() {
        particles = [];
        const count = (width * height) / 9000;
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
                if (dist < 110) {
                    let opacity = 1 - (dist / 110);
                    ctx.strokeStyle = `rgba(0, 200, 81, ${opacity * 0.18})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
