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
