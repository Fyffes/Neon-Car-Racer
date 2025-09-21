const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

// Game state
let gameRunning = true;
let score = 0;
let distance = 0;
let level = 1;
let fuel = 100;
let maxSpeedReached = 0;

// Player car
const player = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 120,
    width: 30,
    height: 60,
    speed: 0,
    maxSpeed: 12,
    acceleration: 0.3,
    friction: 0.15,
    nitro: 100,
    color: '#00ffff',
    trail: [],
    angle: 0
};

// Traffic cars
let trafficCars = [];
let roadLines = [];
let particles = [];
let powerUps = [];
let roadOffset = 0;

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        e.preventDefault();
    }
    if (e.code === 'KeyR') {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Initialize road lines
for (let i = 0; i < 20; i++) {
    roadLines.push({
        x: canvas.width / 2,
        y: i * 50,
        width: 6,
        height: 30
    });
}

// Player controls
function updatePlayer() {
    // Acceleration and braking
    if (keys['KeyW']) {
        if (fuel > 0) {
            player.speed = Math.min(player.speed + player.acceleration, player.maxSpeed);
            fuel -= 0.05;
        }
    } else if (keys['KeyS'] || keys['Space']) {
        player.speed = Math.max(player.speed - player.acceleration * 1.5, -player.maxSpeed * 0.5);
    } else {
        player.speed = Math.max(player.speed - player.friction, 0);
    }

    // Steering
    if (keys['KeyA'] && player.x > 50) {
        player.x -= 6;
        player.angle = -0.1;
    } else if (keys['KeyD'] && player.x < canvas.width - 80) {
        player.x += 6;
        player.angle = 0.1;
    } else {
        player.angle *= 0.8;
    }

    // Nitro boost
    if (keys['ShiftLeft'] && player.nitro > 0) {
        player.speed = Math.min(player.speed + 0.5, player.maxSpeed * 1.5);
        player.nitro -= 1;
        // Nitro particles
        for (let i = 0; i < 3; i++) {
            createParticle(player.x + player.width/2, player.y + player.height, '#ff6600', 2);
        }
    } else if (player.nitro < 100) {
        player.nitro += 0.1;
    }

    // Update max speed
    const currentSpeed = Math.floor(player.speed * 15);
    maxSpeedReached = Math.max(maxSpeedReached, currentSpeed);

    // Add to trail
    player.trail.push({
        x: player.x + player.width/2,
        y: player.y + player.height,
        alpha: 1
    });
    if (player.trail.length > 8) {
        player.trail.shift();
    }

    // Update trail alpha
    player.trail.forEach((point, index) => {
        point.alpha = index / player.trail.length * 0.5;
    });
}

// Traffic system
function createTrafficCar() {
    const lanes = [150, 250, 350, 450, 550, 650];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const colors = ['#ff0080', '#00ff80', '#ff8000', '#8000ff', '#ffff00'];

    trafficCars.push({
        x: lane,
        y: -60,
        width: 25,
        height: 50,
        speed: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: Math.random() > 0.8 ? 'truck' : 'car'
    });
}

function updateTraffic() {
    // Move existing cars
    for (let i = trafficCars.length - 1; i >= 0; i--) {
        const car = trafficCars[i];
        car.y += car.speed + player.speed;

        if (car.y > canvas.height + 60) {
            trafficCars.splice(i, 1);
            score += 10;
        }
    }

    // Create new cars
    if (Math.random() < 0.02 + level * 0.005) {
        createTrafficCar();
    }
}

// Power-ups
function createPowerUp() {
    const lanes = [150, 250, 350, 450, 550, 650];
    const types = ['fuel', 'nitro', 'score', 'shield'];
    const colors = ['#00ff00', '#ff6600', '#ffff00', '#0080ff'];

    const type = types[Math.floor(Math.random() * types.length)];

    powerUps.push({
        x: lanes[Math.floor(Math.random() * lanes.length)],
        y: -30,
        width: 20,
        height: 20,
        type: type,
        color: colors[types.indexOf(type)],
        rotation: 0,
        pulse: 0
    });
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.y += 3 + player.speed;
        powerUp.rotation += 0.1;
        powerUp.pulse += 0.2;

        if (powerUp.y > canvas.height + 30) {
            powerUps.splice(i, 1);
        }
    }

    if (Math.random() < 0.008) {
        createPowerUp();
    }
}

// Particle system
function createParticle(x, y, color, life = 1) {
    particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        velocityX: (Math.random() - 0.5) * 8,
        velocityY: Math.random() * 5 + 2,
        life: life,
        maxLife: life,
        color: color,
        size: Math.random() * 4 + 2
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.velocityX;
        p.y += p.velocityY + player.speed;
        p.life -= 0.02;

        if (p.life <= 0 || p.y > canvas.height + 50) {
            particles.splice(i, 1);
        }
    }
}

// Collision detection
function checkCollisions() {
    // Traffic collisions
    for (let car of trafficCars) {
        if (player.x < car.x + car.width - 5 &&
            player.x + player.width > car.x + 5 &&
            player.y < car.y + car.height - 5 &&
            player.y + player.height > car.y + 5) {
            gameOver();
            return;
        }
    }

    // Power-up collisions
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if (player.x < powerUp.x + powerUp.width &&
            player.x + player.width > powerUp.x &&
            player.y < powerUp.y + powerUp.height &&
            player.y + player.height > powerUp.y) {

            // Apply power-up effect
            switch (powerUp.type) {
                case 'fuel':
                    fuel = Math.min(fuel + 30, 100);
                    break;
                case 'nitro':
                    player.nitro = Math.min(player.nitro + 50, 100);
                    break;
                case 'score':
                    score += 100;
                    break;
                case 'shield':
                    score += 50;
                    break;
            }

            // Explosion effect
            for (let j = 0; j < 15; j++) {
                createParticle(powerUp.x, powerUp.y, powerUp.color, 1.5);
            }

            powerUps.splice(i, 1);
        }
    }
}

// Drawing functions
function drawNeonShape(x, y, width, height, color, glow = true) {
    if (glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
    if (glow) ctx.shadowBlur = 0;
}

function drawRoad() {
    // Road surface
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#001122');
    gradient.addColorStop(0.2, '#002244');
    gradient.addColorStop(0.5, '#003366');
    gradient.addColorStop(0.8, '#002244');
    gradient.addColorStop(1, '#001122');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Road markings
    roadOffset += player.speed;
    if (roadOffset > 50) roadOffset = 0;

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < roadLines.length; i++) {
        const line = roadLines[i];
        const y = (line.y + roadOffset) % (canvas.height + 100);
        ctx.fillRect(line.x - line.width/2, y, line.width, line.height);
    }

    // Road borders
    drawNeonShape(100, 0, 4, canvas.height, '#00ffff');
    drawNeonShape(700, 0, 4, canvas.height, '#00ffff');
}

function drawPlayer() {
    ctx.save();

    // Draw trail
    ctx.globalCompositeOperation = 'screen';
    for (let point of player.trail) {
        ctx.globalAlpha = point.alpha;
        drawNeonShape(point.x - 3, point.y - 3, 6, 6, player.color, false);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Draw car with rotation
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    ctx.rotate(player.angle);

    // Car body
    drawNeonShape(-player.width/2, -player.height/2, player.width, player.height, player.color);

    // Car details
    drawNeonShape(-player.width/2 + 3, -player.height/2 + 5, player.width - 6, 8, '#ffffff');
    drawNeonShape(-player.width/2 + 3, player.height/2 - 13, player.width - 6, 8, '#ff0000');

    ctx.restore();
}

function drawTraffic() {
    for (let car of trafficCars) {
        if (car.type === 'truck') {
            drawNeonShape(car.x, car.y - 10, car.width, car.height + 20, car.color);
        } else {
            drawNeonShape(car.x, car.y, car.width, car.height, car.color);
        }

        // Headlights
        drawNeonShape(car.x + 2, car.y + car.height - 5, 4, 3, '#ffffff');
        drawNeonShape(car.x + car.width - 6, car.y + car.height - 5, 4, 3, '#ffffff');
    }
}

function drawPowerUps() {
    for (let powerUp of powerUps) {
        ctx.save();
        ctx.translate(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
        ctx.rotate(powerUp.rotation);

        const pulseSize = Math.sin(powerUp.pulse) * 3;
        drawNeonShape(-powerUp.width/2 - pulseSize, -powerUp.height/2 - pulseSize,
                    powerUp.width + pulseSize * 2, powerUp.height + pulseSize * 2, powerUp.color);

        ctx.restore();
    }
}

function drawParticles() {
    for (let p of particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        drawNeonShape(p.x - p.size/2, p.y - p.size/2, p.size, p.size, p.color, false);
    }
    ctx.globalAlpha = 1;
}

function drawMinimap() {
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    minimapCtx.fillRect(0, 0, 150, 100);

    // Player dot
    const playerMapX = (player.x / canvas.width) * 150;
    minimapCtx.fillStyle = '#00ffff';
    minimapCtx.fillRect(playerMapX - 2, 85, 4, 8);

    // Traffic dots
    minimapCtx.fillStyle = '#ff0080';
    for (let car of trafficCars) {
        const carMapX = (car.x / canvas.width) * 150;
        const carMapY = (car.y / canvas.height) * 80;
        minimapCtx.fillRect(carMapX - 1, carMapY, 2, 4);
    }
}

function updateUI() {
    document.getElementById('score').textContent = Math.floor(score);
    document.getElementById('level').textContent = level;
    document.getElementById('distance').textContent = Math.floor(distance);
    document.getElementById('fuel').textContent = Math.floor(fuel);
    document.getElementById('speedValue').textContent = Math.floor(player.speed * 15);

    // Update level
    const newLevel = Math.floor(distance / 1000) + 1;
    if (newLevel > level) {
        level = newLevel;
        score += 500;
    }
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;

    updatePlayer();
    updateTraffic();
    updatePowerUps();
    updateParticles();
    checkCollisions();

    drawRoad();
    drawParticles();
    drawTraffic();
    drawPowerUps();
    drawPlayer();
    drawMinimap();

    // Update distance and score
    distance += player.speed * 0.1;
    score += player.speed * 0.2;

    // Check fuel
    if (fuel <= 0) {
        gameOver();
        return;
    }

    updateUI();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = Math.floor(score);
    document.getElementById('finalDistance').textContent = Math.floor(distance);
    document.getElementById('maxSpeed').textContent = maxSpeedReached;
    document.getElementById('gameOver').style.display = 'block';

    // Crash particles
    for (let i = 0; i < 50; i++) {
        createParticle(player.x + player.width/2, player.y + player.height/2, '#ff0000', 2);
    }
}

function restartGame() {
    gameRunning = true;
    score = 0;
    distance = 0;
    level = 1;
    fuel = 100;
    maxSpeedReached = 0;
    player.x = canvas.width / 2 - 15;
    player.y = canvas.height - 120;
    player.speed = 0;
    player.nitro = 100;
    player.trail = [];
    player.angle = 0;
    trafficCars = [];
    particles = [];
    powerUps = [];
    roadOffset = 0;
    document.getElementById('gameOver').style.display = 'none';
    gameLoop();
}

// Start the game
gameLoop();