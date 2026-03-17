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
    const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
    const mouse = { x: null, y: null, radius: isDarkTheme ? 150 : 200 };

    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
        mouse.radius = isDarkTheme ? 150 : 200;
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

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
            this.size = isDarkTheme ? (Math.random() * 3 + 1.5) : (Math.random() * 4.5 + 2.0);
            this.baseX = this.x;
            this.baseY = this.y;
            this.density = (Math.random() * 25) + 2;
        }

        draw() {
            const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
            const particleColor = isDarkTheme ? 'rgba(0, 210, 90, 0.70)' : 'rgba(0, 160, 70, 0.55)';
            ctx.fillStyle = particleColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fill();
        }

        update() {
            const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';

            if (mouse.x == null || mouse.y == null) {
                if (this.x !== this.baseX) this.x -= (this.x - this.baseX) / 12;
                if (this.y !== this.baseY) this.y -= (this.y - this.baseY) / 12;
                return;
            }

            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 0.001) return;
            let forceX = dx / distance;
            let forceY = dy / distance;
            let maxDist = mouse.radius;
            let force = Math.max(0, (maxDist - distance) / maxDist);

            if (distance < mouse.radius) {
                // Keep light theme responsive but smoother to avoid flicker-like jumps.
                const interactionStrength = isDarkTheme ? 1.0 : 0.45;
                this.x -= forceX * force * this.density * interactionStrength;
                this.y -= forceY * force * this.density * interactionStrength;
            } else {
                if (this.x !== this.baseX) this.x -= (this.x - this.baseX) / 12;
                if (this.y !== this.baseY) this.y -= (this.y - this.baseY) / 12;
            }
        }
    }

    function init() {
        particles = [];
        const isDarkTheme = !document.body.hasAttribute('data-theme') || document.body.getAttribute('data-theme') === 'dark';
        const count = isDarkTheme ? (width * height) / 9000 : (width * height) / 7000;
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
                if (dist < 110) {
                    let opacity = 1 - (dist / 110);
                    const lineColor = isDarkTheme 
                        ? `rgba(0, 210, 90, ${opacity * 0.55})` 
                        : `rgba(0, 180, 80, ${opacity * 0.35})`;
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = isDarkTheme ? 0.8 : 1.5;
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

    // Listen for theme changes
    const observer = new MutationObserver(() => {
        // Theme changed, animation will automatically use new colors on next draw
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    function checkReveal() {
        const windowHeight = window.innerHeight;
        reveals.forEach(el => {
            const top = el.getBoundingClientRect().top;
            const revealPoint = 120;
            if (top < windowHeight - revealPoint) {
                el.classList.add('visible');
            }
        });
    }

    window.addEventListener('scroll', checkReveal);
    checkReveal(); // initial check
}

// ===== NAVBAR SCROLL EFFECT =====
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ===== LOGIN CARD 3D HOVER =====
function initLoginCardHover() {
    const card = document.querySelector('.login-card');
    if (!card) return;

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 15;
        const rotateY = (centerX - x) / 15;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
}
