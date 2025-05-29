import { Simulation } from './src/simulation.js';
import { Body } from './src/body.js';
import * as Vector from './src/vector.js';
import { TEMPLATES } from './src/templates.js';


const AU_IN_EARTH_RADII = 149597870700 / 6371000;
const WORLD_BOUNDS = 20000000; // in Earth radii

// Spawner Presets
const SPAWNER_PRESETS = {
    sun: {
        mass: 333000,
        radius: 109,
        colour: "#ffff00" // Yellow
    },
    earth: {
        mass: 1,
        radius: 1,
        colour: "#1e90ff" // A nice blue
    },
    blackhole: {
        mass: 1e8,
        radius: 5,
        colour: "#111111" // Nearly black
    }
    // add more presets as needed
};
let currentSpawner = "earth";

// Get canvas and context
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// Set up the simulation
const sim = new Simulation();

// --- Animation & Control Variables ---
let running = true;
let timescale = 1; // multiplier
let selectedBody = null; // For editing/deleting
const FPS = 60;
const DT = 1 / FPS;

// --- Camera for Pan & Zoom ---
let camera = {
    offset: [0, 0],   // world coords offset (pixels or AU)
    zoom: 1           // zoom factor (1 = 1:1, 2 = double size, etc)
};

// Velocity drag vector
let isAddingBody = false;
let addStartWorld = null;     // [x, y] world coords where mouse was pressed
let addStartScreen = null;    // [x, y] screen coords for arrow start
let addCurrentScreen = null;  // [x, y] current screen coords (for arrow preview)
let addVelocity = [0, 0];     // velocity vector for prefill

// --- Panning State ---
let isPanning = false;
let lastPan = null;

// Clear All Button
const clearBtn = document.getElementById('clearBtn');
clearBtn.onclick = () => {
    if (confirm("Remove all bodies from the simulation?")) {
        sim.bodies = [];
        draw();
    }
};

// Load Template
templateSelect.onchange = function() {
    const val = this.value;
    if (val && TEMPLATES[val]) {
        // Clear everything
        sim.bodies = [];

        // Reset camera
        camera.offset = [0, 0];   // Center on 0,0
        camera.zoom = 0.01;          // Or pick a nice zoom, e.g., 0.05 for solar system

        // Load scenario
        TEMPLATES[val].setup(sim, AU_IN_EARTH_RADII);

        // Draw
        draw();

        // Description
        templateDesc.textContent = TEMPLATES[val].description;
    } else {
        templateDesc.textContent = '';
    }
};




// --- Pause/Resume Button ---
const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.onclick = () => {
    running = !running;
    pauseBtn.textContent = running ? "Pause" : "Resume";
    if (running) requestAnimationFrame(animate);
};

// -- - Toggle Trails Button ---
let showTrails = true;

const toggleTrailBtn = document.getElementById('toggleTrailBtn');
toggleTrailBtn.onclick = function() {
    showTrails = !showTrails;
    toggleTrailBtn.textContent = showTrails ? "Hide Trails" : "Show Trails";
    if (!showTrails) {
        // Clear all histories
        sim.bodies.forEach(b => b.history = []);
    }
    // If turning on, immediately start collecting new history
    // (No action needed—next sim.step will add positions)
    draw();
};

// --- Toggle Details Button ---
let showDetails = false;

const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
toggleDetailsBtn.onclick = function() {
    showDetails = !showDetails;
    toggleDetailsBtn.textContent = showDetails ? "Hide Details" : "Show Details";
    draw();
};


// --- Timescale Control ---
const timescaleSlider = document.getElementById('timescale');
const timescaleLabel = document.getElementById('timescaleLabel');

// Maps slider position (log10) to actual timescale value
function sliderToTimescale(sliderValue) {
    return Math.pow(10, sliderValue);
}

function formatTimescale(ts) {
    // Display as 1x, 2x, 10x, 0.1x, etc.
    if (ts < 0.1) return ts.toFixed(2) + "x";
    if (ts < 1) return ts.toFixed(1) + "x";
    if (ts < 10) return ts.toFixed(1) + "x";
    return ts >= 100 ? ts.toFixed(0) + "x" : ts.toFixed(1) + "x";
}

// On page load, set slider and label
timescale = sliderToTimescale(timescaleSlider.value);
timescaleLabel.textContent = formatTimescale(timescale);

timescaleSlider.oninput = function() {
    timescale = sliderToTimescale(this.value);
    timescaleLabel.textContent = formatTimescale(timescale);
};

// --- Pan/Zoom Mouse Events ---
canvas.addEventListener('mousedown', function(e) {
    // Right-click (button 2) or middle (button 1) drag for pan
    if (e.button === 2 || e.button === 1) {
        isPanning = true;
        lastPan = [e.clientX, e.clientY];
        e.preventDefault();
        return;
    }
    // Left click + paused + not on body = start velocity drag for new body
    if (!running && e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const world = toWorld([mouseX, mouseY]);
        let clickedBody = sim.bodies.find(
            b => Vector.norm([world[0] - b.position[0], world[1] - b.position[1]]) <= b.radius
        );
        if (!clickedBody) {
            isAddingBody = true;
            addStartWorld = world;
            addStartScreen = [mouseX, mouseY];
            addCurrentScreen = [mouseX, mouseY];
            addVelocity = [0, 0];
        }
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (isPanning) {
        const dx = (e.clientX - lastPan[0]) / camera.zoom;
        const dy = (e.clientY - lastPan[1]) / camera.zoom;
        camera.offset[0] -= dx;
        camera.offset[1] -= dy;
        lastPan = [e.clientX, e.clientY];
        draw(); // Immediate feedback while panning
    }
    if (isAddingBody) {
        const rect = canvas.getBoundingClientRect();
        addCurrentScreen = [e.clientX - rect.left, e.clientY - rect.top];
        draw();
    }
});

canvas.addEventListener('mouseup', function(e) {
    if (isPanning) {
        isPanning = false;
        return;
    }

    // --- Edit existing body by simple click (not dragging to create new) ---
    // Only if: paused, not currently adding, left button
    if (!running && !isAddingBody && e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const world = toWorld([mouseX, mouseY]);
        let clickedBody = sim.bodies.find(
            b => Vector.norm([world[0] - b.position[0], world[1] - b.position[1]]) <= b.radius
        );
        if (clickedBody) {
            showEditBodyMenu(clickedBody, mouseX, mouseY);
            return; // Done, don't spawn new
        }
    }

    // --- Adding a new body by drag/click ---
    if (isAddingBody && e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = addStartWorld;

        const dragVecScreen = [
            addStartScreen[0] - mouseX,
            addStartScreen[1] - mouseY 
        ];
        const scale = 0.005;
        const v_world = [dragVecScreen[0] * scale / camera.zoom, dragVecScreen[1] * scale / camera.zoom];

        if (currentSpawner !== "custom") {
            // --- Spawn preset immediately, no menu ---
            const preset = SPAWNER_PRESETS[currentSpawner];
            if (sim.bodies.length >= 30) {
                alert("Maximum of 30 bodies reached! Please delete some first.");
                return;
            }
            sim.addBody(new Body(
                [Math.round(worldPos[0]), Math.round(worldPos[1])],
                [Number(v_world[0].toFixed(3)), Number(v_world[1].toFixed(3))],
                preset.mass,
                preset.radius,
                preset.colour
            ));
            // Reset state for next spawn
            isAddingBody = false;
            addStartWorld = null;
            addStartScreen = null;
            addCurrentScreen = null;
            addVelocity = [0, 0];
            draw();
        } else {
            // --- Custom: Show menu for configuration ---
            addVelocity = v_world;
            showNewBodyMenuFromDrag(worldPos, addVelocity, addStartScreen[0], addStartScreen[1]);
            isAddingBody = false;
            addStartWorld = null;
            addStartScreen = null;
            addCurrentScreen = null;
            addVelocity = [0, 0];
            draw();
        }
    }
});


canvas.addEventListener('mouseleave', function(e) {
    isPanning = false;
    isAddingBody = false;
});
canvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

canvas.addEventListener('wheel', function(e) {
    // Zoom around mouse pointer
    const mouse = [e.offsetX, e.offsetY];
    const worldBefore = toWorld(mouse);

    camera.zoom *= e.deltaY < 0 ? 1.1 : 0.9;
    camera.zoom = Math.max(0.000025, Math.min(camera.zoom, 10)); // Clamp zoom

    const worldAfter = toWorld(mouse);
    camera.offset[0] += worldBefore[0] - worldAfter[0];
    camera.offset[1] += worldBefore[1] - worldAfter[1];

    draw();
    e.preventDefault();
}, { passive: false });

// --- Touch support for pan/zoom/tap ---

let lastTouch = null;
let pinchStartDist = null;
let pinchStartZoom = null;

canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
        // One finger: pan start
        lastTouch = [e.touches[0].clientX, e.touches[0].clientY];
    } else if (e.touches.length === 2) {
        // Two fingers: pinch zoom start
        pinchStartDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartZoom = camera.zoom;
    }
}, {passive: false});

canvas.addEventListener('touchmove', function(e) {
    if (e.touches.length === 1 && lastTouch) {
        // Pan
        const dx = (e.touches[0].clientX - lastTouch[0]) / camera.zoom;
        const dy = (e.touches[0].clientY - lastTouch[1]) / camera.zoom;
        camera.offset[0] -= dx;
        camera.offset[1] -= dy;
        lastTouch = [e.touches[0].clientX, e.touches[0].clientY];
        draw();
    } else if (e.touches.length === 2 && pinchStartDist !== null) {
        // Pinch zoom
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        let newZoom = pinchStartZoom * (dist / pinchStartDist);
        camera.zoom = Math.max(0.000025, Math.min(newZoom, 10));
        draw();
    }
    e.preventDefault();
}, {passive: false});

canvas.addEventListener('touchend', function(e) {
    if (e.touches.length === 0) {
        lastTouch = null;
        pinchStartDist = null;
        pinchStartZoom = null;
    }
}, {passive: false});

canvas.addEventListener('touchcancel', function(e) {
    lastTouch = null;
    pinchStartDist = null;
    pinchStartZoom = null;
}, {passive: false});

// --- Tap support (simulate click) ---
canvas.addEventListener('touchend', function(e) {
    if (e.changedTouches.length === 1 && e.touches.length === 0) {
        // Very simple: treat as click if not a pinch or drag
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        onCanvasClick({button: 0, clientX: touch.clientX, clientY: touch.clientY, preventDefault: ()=>{}})
    }
}, {passive: false});

// Spawner Preset Selection
document.querySelectorAll('.spawner-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        currentSpawner = btn.dataset.preset;
        // Optionally, highlight the selected button for feedback
        document.querySelectorAll('.spawner-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    });
});

// Set "custom" as selected on load
document.querySelectorAll('.spawner-btn').forEach(btn => {
    if (btn.dataset.preset === 'earth') btn.classList.add('selected');
});

// Scale Marker
function drawScaleMarker() {
    const niceAUs = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    let pixelsPerEarthRadius = camera.zoom;
    let barAU = 1;
    for (let au of niceAUs) {
        const barEarthRadii = au * AU_IN_EARTH_RADII;
        if (barEarthRadii * pixelsPerEarthRadius > 80 && barEarthRadii * pixelsPerEarthRadius < 200) {
            barAU = au;
            break;
        }
    }
    const barPx = barAU * AU_IN_EARTH_RADII * pixelsPerEarthRadius;
    const margin = 40;
    const y = canvas.height - 30;

    ctx.save();
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(margin + barPx, y);
    ctx.stroke();
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#FFF";
    ctx.fillText(barAU + " AU", margin, y - 8);
    ctx.restore();
}

// --- Drawing Functions (using camera) ---
function toScreen([x, y]) {
    return [
        (x - camera.offset[0]) * camera.zoom + canvas.width / 2,
        (y - camera.offset[1]) * camera.zoom + canvas.height / 2
    ];
}

function toWorld([sx, sy]) {
    return [
        (sx - canvas.width / 2) / camera.zoom + camera.offset[0],
        (sy - canvas.height / 2) / camera.zoom + camera.offset[1]
    ];
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw trails (history) only if enabled
    if (showTrails) {
        for (const body of sim.bodies) {
            drawHistoryWithCamera(body);
        }
    }
    // Draw bodies
    for (const body of sim.bodies) {
        drawBodyWithCamera(body);
    }

    drawScaleMarker();

    // Draw velocity arrow for new body if dragging
    if (isAddingBody && addStartScreen && addCurrentScreen) {
    ctx.save();
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2.5;

    // Compute the vector from start to end, then reverse it
    const dx = addStartScreen[0] - addCurrentScreen[0];
    const dy = addStartScreen[1] - addCurrentScreen[1];
    const arrowEnd = [
        addStartScreen[0] + dx,
        addStartScreen[1] + dy
    ];

    ctx.beginPath();
    ctx.moveTo(addStartScreen[0], addStartScreen[1]);
    ctx.lineTo(arrowEnd[0], arrowEnd[1]);
    ctx.stroke();

    // Draw arrowhead
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
        const arrowLen = 15;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(arrowEnd[0], arrowEnd[1]);
        ctx.lineTo(
            arrowEnd[0] - arrowLen * Math.cos(angle - Math.PI / 6),
            arrowEnd[1] - arrowLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(arrowEnd[0], arrowEnd[1]);
        ctx.lineTo(
            arrowEnd[0] - arrowLen * Math.cos(angle + Math.PI / 6),
            arrowEnd[1] - arrowLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }
    ctx.restore();
    }
}

// Replace body.drawHistory(ctx) to use camera
function drawHistoryWithCamera(body) {
    if (body.history.length < 2) return;
    ctx.beginPath();
    let [sx, sy] = toScreen(body.history[0]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < body.history.length; i++) {
        [sx, sy] = toScreen(body.history[i]);
        ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = body.colour;
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Replace body.draw(ctx) to use camera
function drawBodyWithCamera(body) {
    let [sx, sy] = toScreen(body.position);

    // Draw the body as before
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(2, body.radius * camera.zoom), 0, 2 * Math.PI, false);
    ctx.fillStyle = body.colour;
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.stroke();

    // Draw details if enabled
    if (showDetails) {
        // Prepare details text
        const pos = body.position;
        const vel = body.velocity;
        // Format numbers nicely, e.g. 2 decimal places
        const infoLines = [
            `pos: (${pos[0].toFixed(2)}, ${pos[1].toFixed(2)})`,
            `vel: (${vel[0].toFixed(2)}, ${vel[1].toFixed(2)})`,
            `mass: ${body.mass}`,
            `r: ${body.radius}`
        ];

        ctx.save();
        // Fixed pixel size (regardless of zoom)
        ctx.font = "13px 'Fira Mono', 'Consolas', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = body.colour;
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 3;

        // Place text above the body, offset by (body radius in px + 7px) so it never overlaps
        const rPx = Math.max(2, body.radius * camera.zoom);
        const lineHeight = 15;
        let textY = sy - rPx - 7;

        // Draw each line with shadow (stroke) for readability
        for (let i = 0; i < infoLines.length; ++i) {
            // Draw background stroke
            ctx.strokeText(infoLines[i], sx, textY - lineHeight * (infoLines.length - 1 - i));
            // Draw coloured text
            ctx.fillText(infoLines[i], sx, textY - lineHeight * (infoLines.length - 1 - i));
        }

        ctx.restore();
    }
}


// --- Animation Loop ---
function animate(timestamp) {
    if (running) {
        sim.step(DT * timescale);

        // Remove bodies out of bounds (centered at [0,0])
    sim.bodies = sim.bodies.filter(body =>
        Math.abs(body.position[0]) < WORLD_BOUNDS &&
        Math.abs(body.position[1]) < WORLD_BOUNDS
    );

        draw();
        requestAnimationFrame(animate);
    }
}

function onCanvasClick(event) {
    if (running) return; // Only allow when paused
    if (isAddingBody) return; // Ignore: handled by mouseup

    // Only react to left click (button 0)
    if (event.button !== 0) return;

    // If preset is selected, do nothing here!
    if (currentSpawner !== "custom") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const world = toWorld([mouseX, mouseY]);

    // Check if clicking on an existing body (in world coords)
    let clickedBody = sim.bodies.find(
        b => Vector.norm([world[0] - b.position[0], world[1] - b.position[1]]) <= b.radius
    );

    if (clickedBody) {
        showEditBodyMenu(clickedBody, mouseX, mouseY);
    } else {
        showNewBodyMenu(mouseX, mouseY);
    }
}


function showNewBodyMenu(x, y) {
    // Position in world units, zero velocity
    const world = toWorld([x, y]);
    showNewBodyMenuFromDrag(world, [0, 0], x, y);
}

// --- Show New Body Menu for click OR drag ---
function showNewBodyMenuFromDrag(worldPos, velocity, screenX, screenY) {
    const menu = document.getElementById('bodyMenu');
    menu.style.display = 'block';
    menu.style.left = `${screenX + 20}px`;
    menu.style.top = `${screenY + 20}px`;
    const form = document.getElementById('bodyForm');
    form.reset();
    form.x.value = Math.round(worldPos[0]);
    form.y.value = Math.round(worldPos[1]);
    form.vx.value = Number(velocity[0].toFixed(3));
    form.vy.value = Number(velocity[1].toFixed(3));
    form.mass.value = SPAWNER_PRESETS.earth.mass;
    form.radius.value = SPAWNER_PRESETS.earth.radius;
    form.colour.value = SPAWNER_PRESETS.earth.colour;

    form.onsubmit = function(e) {
        e.preventDefault();
        if (sim.bodies.length >= 30) {
            alert("Maximum of 30 bodies reached! Please delete some first.");
            return;
        }
        sim.addBody(new Body(
            [parseFloat(form.x.value), parseFloat(form.y.value)],
            [parseFloat(form.vx.value), parseFloat(form.vy.value)],
            parseFloat(form.mass.value),
            parseFloat(form.radius.value),
            form.colour.value
        ));
        menu.style.display = 'none';
        draw();
    };
}


// --- Show Edit Body Menu ---
function showEditBodyMenu(body, x, y) {
    const menu = document.getElementById('bodyMenu');
    menu.style.display = 'block';
    menu.style.left = `${x + 20}px`;
    menu.style.top = `${y + 20}px`;
    const form = document.getElementById('bodyForm');
    form.x.value = Math.round(body.position[0]);
    form.y.value = Math.round(body.position[1]);
    form.vx.value = body.velocity[0];
    form.vy.value = body.velocity[1];
    form.mass.value = body.mass;
    form.radius.value = body.radius;
    form.colour.value = body.colour;

    form.onsubmit = null;
    form.onsubmit = function(e) {
        e.preventDefault();
        body.position = [parseFloat(form.x.value), parseFloat(form.y.value)];
        body.velocity = [parseFloat(form.vx.value), parseFloat(form.vy.value)];
        body.mass = parseFloat(form.mass.value);
        body.radius = parseFloat(form.radius.value);
        body.colour = form.colour.value;
        menu.style.display = 'none';
        draw();
    };

    const delBtn = document.getElementById('deleteBodyBtn');
    delBtn.onclick = function() {
        sim.bodies = sim.bodies.filter(b => b !== body);
        menu.style.display = 'none';
        draw();
    };
}

// --- Hide menu helper for Cancel buttons ---
window.hideMenu = function() {
    document.getElementById('bodyMenu').style.display = 'none';
};

// --- Start the animation loop ---
requestAnimationFrame(animate);
