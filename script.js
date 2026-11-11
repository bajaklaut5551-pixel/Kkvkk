
const game = document.getElementById("game");
const dino = document.getElementById("dino");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const stageElement = document.getElementById("stage");
const gameOverScreen = document.getElementById("game-over");
const finalScore = document.getElementById("final-score");

const GAME_HEIGHT = 250;

let dinoY = 0;
let velocityY = 0;
let gravity = 0.65;
let jumpPower = 12;

let score = 0;
let stage = 1;
let speed = 5.5;

let gameRunning = true;
let obstacles = [];

let spawnDistance = 0;
let nextSpawn = 450;

let lastTime = 0;
let animationId;

let isDucking = false;

let bestScore = Number(localStorage.getItem("dinoBest")) || 0;
bestElement.textContent = bestScore;

// Background themes
const backgrounds = [
    "#dff3ff", // Blue sky
    "#fff1d6", // Sunset
    "#e5e5e5", // Cloudy
    "#c9e8d0", // Green atmosphere
    "#252d42"  // Night
];

// Jump
function jump() {
    if (!gameRunning || isDucking) return;

    if (dinoY <= 0) {
        velocityY = jumpPower;
    }
}

// Duck
function duck(value) {
    if (!gameRunning) return;

    isDucking = value;
    dino.classList.toggle("duck", value);
}

// Keyboard controls
document.addEventListener("keydown", event => {
    if (
        event.code === "Space" ||
        event.code === "ArrowUp"
    ) {
        event.preventDefault();

        if (!event.repeat) jump();
    }

    if (event.code === "ArrowDown") {
        duck(true);
    }
});

document.addEventListener("keyup", event => {
    if (event.code === "ArrowDown") {
        duck(false);
    }
});

// Mobile controls
game.addEventListener("pointerdown", event => {
    if (!gameRunning) return;

    if (event.pointerType === "touch") {
        jump();
    }
});

// Generate obstacles
function createObstacle() {
    const obstacle = document.createElement("div");

    let type;
    let width;
    let height;
    let bottom = 0;

    const chance = Math.random();

    if (chance < 0.65) {
        // Cactus variations
        type = "cactus";

        const variation = Math.random();

        if (variation < 0.40) {
            obstacle.textContent = "🌵";
            obstacle.className = "obstacle cactus";
            width = 34;
            height = 40;

        } else if (variation < 0.72) {
            obstacle.textContent = "🌵";
            obstacle.className = "obstacle cactus tall";
            width = 38;
            height = 55;

        } else {
            obstacle.textContent = "🌵🌵";
            obstacle.className = "obstacle cactus double";
            width = 62;
            height = 43;
        }

    } else {
        // Seagull variations
        type = "seagull";

        obstacle.textContent = "🐦";
        obstacle.className = "obstacle seagull";

        width = 42;
        height = 28;

        // Low birds require ducking.
        // High birds require staying on the ground.
        bottom = Math.random() < 0.5 ? 38 : 95;
    }

    obstacle.style.left = game.clientWidth + "px";
    obstacle.style.bottom = bottom + "px";

    game.appendChild(obstacle);

    obstacles.push({
        element: obstacle,
        type,
        x: game.clientWidth,
        width,
        height,
        bottom
    });
}

// Collision detection
function checkCollision(obstacle) {
    const dinoLeft = 58;
    const dinoRight = 90;

    const dinoBottom = dinoY;
    const dinoHeight = isDucking ? 35 : 55;
    const dinoTop = dinoY + dinoHeight;

    // Slightly smaller hitboxes for fair gameplay
    const obstacleLeft = obstacle.x + 6;
    const obstacleRight = obstacle.x + obstacle.width - 6;

    const obstacleBottom = obstacle.bottom + 4;
    const obstacleTop = obstacle.bottom + obstacle.height - 4;

    return (
        dinoRight > obstacleLeft &&
        dinoLeft < obstacleRight &&
        dinoTop > obstacleBottom &&
        dinoBottom < obstacleTop
    );
}

// Update difficulty
function updateDifficulty() {
    const newStage = Math.floor(score / 100) + 1;

    if (newStage !== stage) {
        stage = newStage;
        stageElement.textContent = stage;
    }

    // Speed increases with every stage
    speed = Math.min(5.5 + (stage - 1) * 0.75, 15);

    // Change environment every 100 points
    const themeIndex = Math.min(
        Math.floor((stage - 1) / 2),
        backgrounds.length - 1
    );

    game.style.backgroundColor = backgrounds[themeIndex];
}

// End game
function endGame() {
    gameRunning = false;

    cancelAnimationFrame(animationId);

    finalScore.textContent = Math.floor(score);

    gameOverScreen.style.display = "flex";

    if (score > bestScore) {
        bestScore = Math.floor(score);

        localStorage.setItem("dinoBest", bestScore);

        bestElement.textContent = bestScore;
    }
}

// Update game
function update(delta) {
    const dt = Math.min(delta / 16.67, 2);

    // Score increases with survival time
    score += 0.12 * dt;

    scoreElement.textContent = Math.floor(score);

    updateDifficulty();

    // Dinosaur physics
    if (!isDucking) {
        velocityY -= gravity * dt;
        dinoY += velocityY * dt;
    } else if (dinoY > 0) {
        velocityY -= gravity * dt;
        dinoY += velocityY * dt;
    }

    if (dinoY <= 0) {
        dinoY = 0;
        velocityY = 0;
    }

    dino.style.bottom = dinoY + "px";

    // Spawn obstacles according to distance
    spawnDistance += speed * dt;

    if (spawnDistance >= nextSpawn) {
        createObstacle();

        spawnDistance = 0;

        const minGap = Math.max(280, 390 - stage * 7);
        const maxGap = Math.max(360, 550 - stage * 10);

        nextSpawn = minGap + Math.random() * (maxGap - minGap);
    }

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];

        obstacle.x -= speed * dt;

        obstacle.element.style.left = obstacle.x + "px";

        if (checkCollision(obstacle)) {
            endGame();
            return;
        }

        // Remove obstacles outside screen
        if (obstacle.x < -obstacle.width) {
            obstacle.element.remove();
            obstacles.splice(i, 1);
        }
    }
}

// Main game loop
function gameLoop(timestamp) {
    if (!gameRunning) return;

    const delta = lastTime
        ? timestamp - lastTime
        : 16.67;

    lastTime = timestamp;

    update(delta);

    if (gameRunning) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// Restart
function restartGame() {
    cancelAnimationFrame(animationId);

    obstacles.forEach(obstacle => {
        obstacle.element.remove();
    });

    obstacles = [];

    score = 0;
    stage = 1;
    speed = 5.5;

    dinoY = 0;
    velocityY = 0;

    isDucking = false;
    dino.classList.remove("duck");

    spawnDistance = 0;
    nextSpawn = 450;

    scoreElement.textContent = "0";
    stageElement.textContent = "1";

    game.style.backgroundColor = backgrounds[0];

    gameOverScreen.style.display = "none";

    gameRunning = true;
    lastTime = 0;

    animationId = requestAnimationFrame(gameLoop);
}

// Start game
animationId = requestAnimationFrame(gameLoop);
