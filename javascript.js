"use strict";

/* ======================================================
   FIJI REEF GUARDIAN
====================================================== */

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

const GAME_STATE = {
    START: "START",
    PLAYING: "PLAYING",
    LEVEL_COMPLETE: "LEVEL_COMPLETE",
    WON: "WON",
    LOST: "LOST"
};

const LEVELS = [
    {
        name: "Coral Lagoon",
        target: 5,
        backgroundTop: [44, 177, 196],
        backgroundBottom: [8, 92, 145],
        obstacleSpeed: 2.2,
        fishCount: 7
    },
    {
        name: "Mangrove Channel",
        target: 7,
        backgroundTop: [28, 132, 130],
        backgroundBottom: [5, 66, 91],
        obstacleSpeed: 3,
        fishCount: 9
    },
    {
        name: "Deep Ocean Reef",
        target: 9,
        backgroundTop: [19, 74, 139],
        backgroundBottom: [3, 20, 70],
        obstacleSpeed: 3.8,
        fishCount: 11
    }
];

const DIFFICULTIES = {
    1: {
        name: "Easy",
        lives: 5,
        speedMultiplier: 0.8
    },
    2: {
        name: "Normal",
        lives: 3,
        speedMultiplier: 1
    },
    3: {
        name: "Hard",
        lives: 2,
        speedMultiplier: 1.3
    }
};


/* ======================================================
   GAME VARIABLES
====================================================== */

let gameState = GAME_STATE.START;
let selectedDifficulty = 2;

let levelIndex = 0;
let score = 0;
let levelScore = 0;
let lives = 3;

let player;
let collectible;
let boat;
let hook;
let shieldPowerUp;

let marineAnimals = [];
let bubbles = [];
let particles = [];

let shieldActive = false;
let shieldTimer = 0;
let hitCooldown = 0;


/*
    These values become true while a mobile direction
    button is being held.
*/
const mobileMovement = {
    up: false,
    down: false,
    left: false,
    right: false
};


/* ======================================================
   P5 SETUP
====================================================== */

function setup() {
    const canvas = createCanvas(
        CANVAS_WIDTH,
        CANVAS_HEIGHT
    );

    canvas.parent("game-container");

    textFont("Arial");

    resetCompleteGame();
    setupMobileControls();
    updateMobileActionButton();
}


/* ======================================================
   MAIN DRAW LOOP
====================================================== */

function draw() {
    updateMobileActionButton();

    drawAreaBackground();
    updateAndDrawMarineLife();
    updateAndDrawBubbles();

    if (gameState === GAME_STATE.START) {
        drawStartScreen();
        return;
    }

    drawReefFloor();

    if (gameState === GAME_STATE.PLAYING) {
        updateGame();
    }

    drawGameObjects();
    drawHud();

    if (gameState === GAME_STATE.LEVEL_COMPLETE) {
        drawLevelCompleteScreen();
    } else if (gameState === GAME_STATE.WON) {
        drawWinScreen();
    } else if (gameState === GAME_STATE.LOST) {
        drawLossScreen();
    }
}


/* ======================================================
   GAME INITIALISATION
====================================================== */

function resetCompleteGame() {
    gameState = GAME_STATE.START;

    levelIndex = 0;
    score = 0;
    levelScore = 0;

    lives = DIFFICULTIES[selectedDifficulty].lives;

    createGameObjects();
    createMarineLife();
    createBubbles();

    particles = [];

    shieldActive = false;
    shieldTimer = 0;
    hitCooldown = 0;

    stopAllMobileMovement();

    updatePageStatus(
        "Select a difficulty and press Space or Start."
    );
}


function startGame() {
    levelIndex = 0;
    score = 0;
    levelScore = 0;

    lives = DIFFICULTIES[selectedDifficulty].lives;

    gameState = GAME_STATE.PLAYING;

    setupLevel();

    updatePageStatus(
        `Playing ${LEVELS[levelIndex].name}.`
    );
}


function setupLevel() {
    levelScore = 0;

    createGameObjects();
    createMarineLife();
    createBubbles();

    particles = [];

    shieldActive = false;
    shieldTimer = 0;
    hitCooldown = 0;

    stopAllMobileMovement();
}


function startNextLevel() {
    levelIndex += 1;

    if (levelIndex >= LEVELS.length) {
        gameState = GAME_STATE.WON;

        updatePageStatus(
            "You restored all three marine habitats!"
        );

        return;
    }

    const maximumLives =
        DIFFICULTIES[selectedDifficulty].lives;

    lives = min(
        lives + 1,
        maximumLives
    );

    gameState = GAME_STATE.PLAYING;

    setupLevel();

    updatePageStatus(
        `Welcome to ${LEVELS[levelIndex].name}.`
    );
}


function createGameObjects() {
    player = {
        x: 130,
        y: CANVAS_HEIGHT / 2,
        radius: 30,
        speed: 4.5,
        direction: 1,
        animation: 0
    };

    collectible = {
        x: random(260, CANVAS_WIDTH - 80),
        y: random(100, CANVAS_HEIGHT - 100),
        radius: 23,
        type: randomWasteType(),
        rotation: random(TWO_PI)
    };

    boat = {
        x: CANVAS_WIDTH + 100,
        y: 120,
        width: 115,
        height: 45,
        speed: currentLevel().obstacleSpeed
    };

    hook = {
        x: random(250, CANVAS_WIDTH - 100),
        y: -100,
        speed: currentLevel().obstacleSpeed + 0.5,
        length: 115
    };

    shieldPowerUp = {
        x: random(200, CANVAS_WIDTH - 80),
        y: random(120, CANVAS_HEIGHT - 100),
        radius: 18,
        visible: random() < 0.65
    };
}


/* ======================================================
   GAME UPDATE
====================================================== */

function updateGame() {
    movePlayer();
    updateBoat();
    updateHook();
    updateShield();
    updateParticles();

    checkCollectibleCollision();
    checkBoatCollision();
    checkHookCollision();
    checkShieldCollision();

    if (hitCooldown > 0) {
        hitCooldown -= 1;
    }

    if (levelScore >= currentLevel().target) {
        stopAllMobileMovement();

        if (levelIndex === LEVELS.length - 1) {
            gameState = GAME_STATE.WON;

            updatePageStatus(
                "You restored all three marine habitats!"
            );
        } else {
            gameState = GAME_STATE.LEVEL_COMPLETE;

            updatePageStatus(
                "Area restored! Press N or Next area."
            );
        }
    }

    if (lives <= 0) {
        gameState = GAME_STATE.LOST;

        stopAllMobileMovement();

        updatePageStatus(
            "The turtle needs your help. Press R or Restart."
        );
    }
}


/* ======================================================
   PLAYER MOVEMENT
====================================================== */

function movePlayer() {
    const playerSpeed =
        player.speed *
        DIFFICULTIES[selectedDifficulty].speedMultiplier;

    if (
        keyIsDown(LEFT_ARROW) ||
        mobileMovement.left
    ) {
        player.x -= playerSpeed;
        player.direction = -1;
    }

    if (
        keyIsDown(RIGHT_ARROW) ||
        mobileMovement.right
    ) {
        player.x += playerSpeed;
        player.direction = 1;
    }

    if (
        keyIsDown(UP_ARROW) ||
        mobileMovement.up
    ) {
        player.y -= playerSpeed;
    }

    if (
        keyIsDown(DOWN_ARROW) ||
        mobileMovement.down
    ) {
        player.y += playerSpeed;
    }

    player.x = constrain(
        player.x,
        player.radius,
        width - player.radius
    );

    player.y = constrain(
        player.y,
        75,
        height - 55
    );

    player.animation += 0.1;
}


/* ======================================================
   HAZARDS
====================================================== */

function updateBoat() {
    boat.x -= (
        boat.speed *
        DIFFICULTIES[selectedDifficulty].speedMultiplier
    );

    if (boat.x < -boat.width) {
        boat.x = width + random(100, 350);
        boat.y = random(100, height - 150);
    }
}


function updateHook() {
    hook.y += (
        hook.speed *
        DIFFICULTIES[selectedDifficulty].speedMultiplier
    );

    if (hook.y > height + hook.length) {
        resetHook();
    }
}


function resetHook() {
    hook.x = random(160, width - 80);
    hook.y = random(-300, -120);
}


/* ======================================================
   COLLISIONS
====================================================== */

function checkCollectibleCollision() {
    const distanceToWaste = dist(
        player.x,
        player.y,
        collectible.x,
        collectible.y
    );

    if (
        distanceToWaste <
        player.radius + collectible.radius
    ) {
        score += 1;
        levelScore += 1;

        createParticles(
            collectible.x,
            collectible.y,
            color(255, 224, 90)
        );

        moveCollectible();

        updatePageStatus(
            `Ocean waste collected: ${levelScore} of ` +
            `${currentLevel().target}.`
        );
    }
}


function checkBoatCollision() {
    const boatCentreX =
        boat.x + boat.width / 2;

    const boatCentreY =
        boat.y + boat.height / 2;

    const distanceToBoat = dist(
        player.x,
        player.y,
        boatCentreX,
        boatCentreY
    );

    if (
        distanceToBoat < 65 &&
        hitCooldown === 0
    ) {
        damagePlayer("boat");
    }
}


function checkHookCollision() {
    const hookEndY =
        hook.y + hook.length;

    const distanceToHook = dist(
        player.x,
        player.y,
        hook.x,
        hookEndY
    );

    if (
        distanceToHook <
        player.radius + 16 &&
        hitCooldown === 0
    ) {
        damagePlayer("fishing hook");
        resetHook();
    }
}


function checkShieldCollision() {
    if (!shieldPowerUp.visible) {
        return;
    }

    const distanceToShield = dist(
        player.x,
        player.y,
        shieldPowerUp.x,
        shieldPowerUp.y
    );

    if (
        distanceToShield <
        player.radius + shieldPowerUp.radius
    ) {
        shieldActive = true;
        shieldTimer = 600;

        shieldPowerUp.visible = false;

        createParticles(
            shieldPowerUp.x,
            shieldPowerUp.y,
            color(100, 240, 255)
        );

        updatePageStatus(
            "Bubble shield activated!"
        );
    }
}


function damagePlayer(hazardName) {
    if (shieldActive) {
        shieldActive = false;
        shieldTimer = 0;

        updatePageStatus(
            `The shield protected you from the ${hazardName}.`
        );
    } else {
        lives -= 1;

        updatePageStatus(
            `The turtle touched a ${hazardName}. ` +
            `${lives} lives remain.`
        );
    }

    hitCooldown = 100;

    createParticles(
        player.x,
        player.y,
        color(255, 95, 95)
    );

    player.x = 120;
    player.y = height / 2;

    boat.x = width + 150;
}


function moveCollectible() {
    collectible.x = random(
        170,
        width - 70
    );

    collectible.y = random(
        100,
        height - 90
    );

    collectible.type =
        randomWasteType();

    collectible.rotation =
        random(TWO_PI);

    if (
        !shieldPowerUp.visible &&
        !shieldActive &&
        random() < 0.25
    ) {
        shieldPowerUp.x =
            random(170, width - 70);

        shieldPowerUp.y =
            random(110, height - 90);

        shieldPowerUp.visible = true;
    }
}


function updateShield() {
    if (!shieldActive) {
        return;
    }

    shieldTimer -= 1;

    if (shieldTimer <= 0) {
        shieldActive = false;
        shieldTimer = 0;

        updatePageStatus(
            "The bubble shield has expired."
        );
    }
}


/* ======================================================
   BACKGROUND
====================================================== */

function drawAreaBackground() {
    const level = currentLevel();

    const topColour = color(
        level.backgroundTop[0],
        level.backgroundTop[1],
        level.backgroundTop[2]
    );

    const bottomColour = color(
        level.backgroundBottom[0],
        level.backgroundBottom[1],
        level.backgroundBottom[2]
    );

    for (let y = 0; y < height; y += 4) {
        const amount = map(
            y,
            0,
            height,
            0,
            1
        );

        const lineColour = lerpColor(
            topColour,
            bottomColour,
            amount
        );

        stroke(lineColour);
        strokeWeight(5);
        line(0, y, width, y);
    }

    noStroke();

    fill(255, 255, 255, 25);
    ellipse(130, 60, 300, 65);
    ellipse(650, 80, 420, 80);
}


function drawReefFloor() {
    noStroke();

    fill(217, 185, 117);

    rect(
        0,
        height - 45,
        width,
        45
    );

    drawCoral(
        80,
        height - 45,
        color(255, 116, 126)
    );

    drawCoral(
        225,
        height - 45,
        color(255, 168, 76)
    );

    drawCoral(
        690,
        height - 45,
        color(207, 110, 255)
    );

    drawCoral(
        825,
        height - 45,
        color(255, 105, 160)
    );

    drawSeaweed(150, height - 42);
    drawSeaweed(365, height - 42);
    drawSeaweed(570, height - 42);
    drawSeaweed(770, height - 42);

    drawStarfish(465, height - 24);
}


function drawCoral(
    x,
    y,
    coralColour
) {
    push();

    translate(x, y);

    stroke(coralColour);
    strokeWeight(10);
    strokeCap(ROUND);

    line(0, 0, 0, -45);
    line(0, -25, -22, -46);
    line(0, -35, 22, -60);
    line(-12, -35, -30, -62);
    line(14, -48, 34, -70);

    pop();
}


function drawSeaweed(x, y) {
    push();

    translate(x, y);

    noFill();
    stroke(45, 174, 104);
    strokeWeight(7);

    bezier(
        0, 0,
        -20, -30,
        20, -60,
        0, -90
    );

    bezier(
        15, 0,
        35, -25,
        5, -55,
        25, -78
    );

    pop();
}


function drawStarfish(x, y) {
    push();

    translate(x, y);

    fill(255, 141, 84);
    noStroke();

    beginShape();

    for (
        let index = 0;
        index < 10;
        index += 1
    ) {
        const angle =
            -HALF_PI +
            index * PI / 5;

        const starRadius =
            index % 2 === 0
                ? 18
                : 8;

        vertex(
            cos(angle) * starRadius,
            sin(angle) * starRadius
        );
    }

    endShape(CLOSE);

    pop();
}


/* ======================================================
   TURTLE
====================================================== */

function drawTurtle() {
    push();

    translate(
        player.x,
        player.y
    );

    scale(
        player.direction,
        1
    );

    /*
        The turtle flashes briefly after a collision.
    */
    if (
        hitCooldown > 0 &&
        frameCount % 8 < 4
    ) {
        drawingContext.globalAlpha = 0.4;
    }

    const flipperMovement =
        sin(player.animation) * 12;

    noStroke();

    fill(60, 166, 122);

    // Rear flippers
    ellipse(
        -24,
        -22 + flipperMovement * 0.2,
        42,
        15
    );

    ellipse(
        -24,
        22 - flipperMovement * 0.2,
        42,
        15
    );

    // Front upper flipper
    push();

    translate(5, -20);

    rotate(
        radians(
            -22 + flipperMovement
        )
    );

    ellipse(0, 0, 68, 18);

    pop();

    // Front lower flipper
    push();

    translate(5, 20);

    rotate(
        radians(
            22 - flipperMovement
        )
    );

    ellipse(0, 0, 68, 18);

    pop();

    // Head
    fill(86, 185, 129);
    ellipse(38, 0, 34, 28);

    // Neck
    rect(22, -10, 24, 20);

    // Shell
    fill(56, 128, 78);
    ellipse(0, 0, 66, 52);

    fill(114, 174, 82);
    ellipse(0, 0, 52, 40);

    // Shell pattern
    stroke(44, 104, 65);
    strokeWeight(2);

    line(-20, -12, 20, 12);
    line(-20, 12, 20, -12);
    line(0, -20, 0, 20);

    ellipse(0, 0, 24, 20);

    // Eye
    noStroke();

    fill(255);
    ellipse(44, -5, 8, 8);

    fill(15);
    ellipse(46, -5, 4, 4);

    // Tail
    fill(60, 166, 122);

    triangle(
        -31, -5,
        -45, 0,
        -31, 5
    );

    if (shieldActive) {
        noFill();

        stroke(120, 245, 255, 210);
        strokeWeight(5);

        ellipse(0, 0, 102, 92);

        stroke(255, 255, 255, 120);
        strokeWeight(2);

        ellipse(-9, -9, 82, 72);
    }

    drawingContext.globalAlpha = 1;

    pop();
}


/* ======================================================
   GAME OBJECTS
====================================================== */

function drawGameObjects() {
    drawCollectible();

    if (shieldPowerUp.visible) {
        drawShieldPowerUp();
    }

    drawBoat();
    drawFishingHook();
    drawParticles();
    drawTurtle();
}


function drawCollectible() {
    push();

    translate(
        collectible.x,
        collectible.y
    );

    rotate(
        collectible.rotation +
        sin(frameCount * 0.03) *
        0.12
    );

    noStroke();

    if (
        collectible.type ===
        "bottle"
    ) {
        fill(130, 220, 235, 210);
        rect(-8, -18, 16, 34, 4);

        fill(60, 130, 220);
        rect(-5, -25, 10, 9, 2);

        fill(230, 245, 255);
        rect(-7, -2, 14, 8);
    }

    if (
        collectible.type ===
        "can"
    ) {
        fill(220);
        rect(-10, -17, 20, 34, 5);

        fill(218, 66, 66);
        rect(-10, -8, 20, 16);

        fill(80);
        ellipse(0, -16, 15, 4);
    }

    if (
        collectible.type ===
        "bag"
    ) {
        fill(255, 242, 245, 190);

        quad(
            -19, -16,
            18, -12,
            14, 20,
            -16, 18
        );

        noFill();

        stroke(255);
        strokeWeight(3);

        arc(
            0,
            -13,
            19,
            18,
            PI,
            TWO_PI
        );
    }

    if (
        collectible.type ===
        "rope"
    ) {
        noFill();

        stroke(214, 159, 69);
        strokeWeight(6);

        ellipse(0, 0, 36, 25);
        line(13, 8, 25, 25);
    }

    if (
        collectible.type ===
        "net"
    ) {
        stroke(180);
        strokeWeight(2);
        noFill();

        rect(-20, -18, 40, 36);

        for (
            let position = -12;
            position <= 12;
            position += 8
        ) {
            line(
                position,
                -18,
                position,
                18
            );

            line(
                -20,
                position,
                20,
                position
            );
        }
    }

    pop();
}


function drawBoat() {
    push();

    translate(
        boat.x,
        boat.y
    );

    noStroke();

    fill(98, 52, 35);

    quad(
        0, 0,
        boat.width, 0,
        boat.width - 20,
        boat.height,
        20,
        boat.height
    );

    fill(238);
    rect(35, -25, 50, 25, 4);

    fill(130, 210, 235);
    rect(45, -19, 14, 12);
    rect(65, -19, 14, 12);

    fill(55);
    rect(81, -42, 7, 18);

    fill(255, 238, 91);
    ellipse(12, 8, 9, 9);

    pop();
}


function drawFishingHook() {
    push();

    stroke(72);
    strokeWeight(3);

    line(
        hook.x,
        hook.y,
        hook.x,
        hook.y + hook.length
    );

    translate(
        hook.x,
        hook.y + hook.length
    );

    noFill();

    stroke(200);
    strokeWeight(6);

    arc(
        0,
        0,
        30,
        38,
        0,
        PI + HALF_PI
    );

    line(0, -19, 0, 0);

    fill(200);
    noStroke();

    triangle(
        -13, 12,
        -21, 3,
        -10, 2
    );

    pop();
}


function drawShieldPowerUp() {
    push();

    translate(
        shieldPowerUp.x,
        shieldPowerUp.y
    );

    const pulse =
        1 +
        sin(frameCount * 0.08) *
        0.12;

    scale(pulse);

    noFill();

    stroke(116, 245, 255);
    strokeWeight(4);

    ellipse(0, 0, 38, 38);

    stroke(255, 255, 255, 160);
    strokeWeight(2);

    arc(
        -3,
        -3,
        27,
        27,
        PI,
        TWO_PI
    );

    pop();
}


/* ======================================================
   MARINE LIFE
====================================================== */

function createMarineLife() {
    marineAnimals = [];

    const animalCount =
        currentLevel().fishCount;

    for (
        let index = 0;
        index < animalCount;
        index += 1
    ) {
        marineAnimals.push({
            type: random([
                "fish",
                "fish",
                "fish",
                "jellyfish",
                "manta"
            ]),

            x: random(width),

            y: random(
                100,
                height - 100
            ),

            size: random(18, 38),

            speed: random(0.4, 1.3),

            direction:
                random() < 0.5
                    ? -1
                    : 1,

            colour: color(
                random(80, 255),
                random(100, 230),
                random(120, 255),
                190
            ),

            phase: random(TWO_PI)
        });
    }
}


function updateAndDrawMarineLife() {
    for (
        const animal
        of marineAnimals
    ) {
        animal.x +=
            animal.speed *
            animal.direction;

        animal.y +=
            sin(
                frameCount * 0.025 +
                animal.phase
            ) * 0.25;

        if (
            animal.direction === 1 &&
            animal.x > width + 60
        ) {
            animal.x = -60;
        }

        if (
            animal.direction === -1 &&
            animal.x < -60
        ) {
            animal.x = width + 60;
        }

        if (
            animal.type === "fish"
        ) {
            drawFish(animal);
        } else if (
            animal.type ===
            "jellyfish"
        ) {
            drawJellyfish(animal);
        } else {
            drawMantaRay(animal);
        }
    }
}


function drawFish(fish) {
    push();

    translate(
        fish.x,
        fish.y
    );

    scale(
        fish.direction,
        1
    );

    noStroke();

    fill(fish.colour);

    ellipse(
        0,
        0,
        fish.size * 1.4,
        fish.size
    );

    triangle(
        -fish.size * 0.55,
        0,
        -fish.size,
        -fish.size * 0.48,
        -fish.size,
        fish.size * 0.48
    );

    fill(255);

    ellipse(
        fish.size * 0.35,
        -fish.size * 0.12,
        6,
        6
    );

    fill(20);

    ellipse(
        fish.size * 0.37,
        -fish.size * 0.12,
        3,
        3
    );

    pop();
}


function drawJellyfish(jellyfish) {
    push();

    translate(
        jellyfish.x,
        jellyfish.y
    );

    noStroke();

    fill(
        red(jellyfish.colour),
        green(jellyfish.colour),
        blue(jellyfish.colour),
        120
    );

    arc(
        0,
        0,
        jellyfish.size,
        jellyfish.size,
        PI,
        TWO_PI,
        CHORD
    );

    stroke(jellyfish.colour);
    strokeWeight(2);
    noFill();

    for (
        let offset = -10;
        offset <= 10;
        offset += 10
    ) {
        const wave =
            sin(
                frameCount * 0.08 +
                offset
            ) * 5;

        bezier(
            offset, 0,
            offset + wave, 10,
            offset - wave, 22,
            offset, 34
        );
    }

    pop();
}


function drawMantaRay(manta) {
    push();

    translate(
        manta.x,
        manta.y
    );

    scale(
        manta.direction,
        1
    );

    fill(manta.colour);
    noStroke();

    beginShape();

    vertex(30, 0);
    vertex(5, -8);
    vertex(-32, -24);
    vertex(-20, 0);
    vertex(-32, 24);
    vertex(5, 8);

    endShape(CLOSE);

    stroke(manta.colour);
    strokeWeight(3);

    line(-18, 0, -48, 0);

    pop();
}


/* ======================================================
   BUBBLES AND PARTICLES
====================================================== */

function createBubbles() {
    bubbles = [];

    for (
        let index = 0;
        index < 28;
        index += 1
    ) {
        bubbles.push({
            x: random(width),
            y: random(height),
            radius: random(2, 8),
            speed: random(0.3, 1.1)
        });
    }
}


function updateAndDrawBubbles() {
    noFill();

    stroke(
        220,
        250,
        255,
        100
    );

    strokeWeight(1.5);

    for (
        const bubble
        of bubbles
    ) {
        bubble.y -= bubble.speed;

        bubble.x +=
            sin(
                frameCount * 0.02 +
                bubble.y
            ) * 0.2;

        if (bubble.y < -15) {
            bubble.y = height + 15;
            bubble.x = random(width);
        }

        ellipse(
            bubble.x,
            bubble.y,
            bubble.radius * 2
        );
    }

    noStroke();
}


function createParticles(
    x,
    y,
    particleColour
) {
    for (
        let index = 0;
        index < 16;
        index += 1
    ) {
        particles.push({
            x: x,
            y: y,
            speedX: random(-3, 3),
            speedY: random(-3, 3),
            life: 255,
            colour: particleColour
        });
    }
}


function updateParticles() {
    for (
        const particle
        of particles
    ) {
        particle.x +=
            particle.speedX;

        particle.y +=
            particle.speedY;

        particle.life -= 6;
    }

    particles =
        particles.filter(
            particle =>
                particle.life > 0
        );
}


function drawParticles() {
    noStroke();

    for (
        const particle
        of particles
    ) {
        fill(
            red(particle.colour),
            green(particle.colour),
            blue(particle.colour),
            particle.life
        );

        ellipse(
            particle.x,
            particle.y,
            8,
            8
        );
    }
}


/* ======================================================
   GAME INFORMATION
====================================================== */

function drawHud() {
    push();

    noStroke();

    fill(
        3,
        24,
        50,
        190
    );

    rect(
        12,
        12,
        width - 24,
        58,
        12
    );

    fill(255);

    textSize(17);
    textAlign(LEFT, CENTER);

    text(
        `Area ${levelIndex + 1}: ` +
        currentLevel().name,
        28,
        31
    );

    text(
        `Waste: ${levelScore}/` +
        currentLevel().target,
        28,
        53
    );

    textAlign(CENTER, CENTER);

    text(
        `Total score: ${score}`,
        width / 2,
        31
    );

    text(
        `Difficulty: ` +
        DIFFICULTIES[
            selectedDifficulty
        ].name,
        width / 2,
        53
    );

    textAlign(RIGHT, CENTER);

    text(
        `Lives: ${"❤".repeat(
            max(0, lives)
        )}`,
        width - 28,
        31
    );

    const shieldMessage =
        shieldActive
            ? `Shield: ${ceil(
                shieldTimer / 60
            )}`
            : "Shield: inactive";

    text(
        shieldMessage,
        width - 28,
        53
    );

    pop();
}


/* ======================================================
   START SCREEN
====================================================== */

function drawStartScreen() {
    push();

    fill(3, 22, 47, 220);
    noStroke();

    rect(
        90,
        105,
        width - 180,
        height - 190,
        25
    );

    textAlign(CENTER, CENTER);

    fill(255, 220, 100);
    textSize(45);

    text(
        "Fiji Reef Guardian",
        width / 2,
        155
    );

    fill(235);
    textSize(20);

    text(
        "Remove ocean waste and protect Fiji's marine life.",
        width / 2,
        205
    );

    fill(130, 240, 224);
    textSize(25);

    text(
        "Choose your difficulty",
        width / 2,
        267
    );

    drawDifficultyButton(
        1,
        width / 2 - 190,
        330
    );

    drawDifficultyButton(
        2,
        width / 2,
        330
    );

    drawDifficultyButton(
        3,
        width / 2 + 190,
        330
    );

    fill(255);
    textSize(23);

    text(
        "Press SPACE or tap START",
        width / 2,
        430
    );

    fill(210);
    textSize(16);

    text(
        "Computer: arrow keys | Mobile: touch controls",
        width / 2,
        470
    );

    fill(170, 235, 240);
    textSize(15);

    text(
        "On mobile, use ◀ or ▶ before starting to change difficulty.",
        width / 2,
        505
    );

    pop();
}


function drawDifficultyButton(
    number,
    x,
    y
) {
    const isSelected =
        selectedDifficulty === number;

    push();

    rectMode(CENTER);

    if (isSelected) {
        fill(255, 213, 94);

        stroke(255);
        strokeWeight(4);
    } else {
        fill(21, 111, 143);

        stroke(130, 225, 235);
        strokeWeight(2);
    }

    rect(
        x,
        y,
        150,
        80,
        15
    );

    noStroke();

    fill(
        isSelected
            ? 25
            : 255
    );

    textAlign(CENTER, CENTER);

    textSize(22);

    text(
        `${number}: ` +
        DIFFICULTIES[number].name,
        x,
        y - 12
    );

    textSize(14);

    text(
        `${DIFFICULTIES[number].lives} lives`,
        x,
        y + 18
    );

    pop();
}


/* ======================================================
   END SCREENS
====================================================== */

function drawLevelCompleteScreen() {
    drawOverlayPanel();

    textAlign(CENTER, CENTER);

    fill(255, 222, 92);
    textSize(44);

    text(
        "Habitat Restored!",
        width / 2,
        height / 2 - 65
    );

    fill(255);
    textSize(22);

    text(
        `${currentLevel().name} is cleaner and safer.`,
        width / 2,
        height / 2
    );

    text(
        "Press N or tap NEXT AREA.",
        width / 2,
        height / 2 + 55
    );
}


function drawWinScreen() {
    drawOverlayPanel();

    textAlign(CENTER, CENTER);

    fill(255, 224, 92);
    textSize(50);

    text(
        "Ocean Guardian!",
        width / 2,
        height / 2 - 80
    );

    fill(255);
    textSize(23);

    text(
        "You restored all three marine habitats.",
        width / 2,
        height / 2 - 15
    );

    fill(132, 245, 220);
    textSize(27);

    text(
        `Final score: ${score}`,
        width / 2,
        height / 2 + 35
    );

    fill(255);
    textSize(19);

    text(
        "Press R or tap RESTART.",
        width / 2,
        height / 2 + 85
    );
}


function drawLossScreen() {
    drawOverlayPanel();

    textAlign(CENTER, CENTER);

    fill(255, 120, 120);
    textSize(48);

    text(
        "The Reef Needs Help",
        width / 2,
        height / 2 - 70
    );

    fill(255);
    textSize(22);

    text(
        `You collected ${score} pieces of ocean waste.`,
        width / 2,
        height / 2
    );

    text(
        "Press R or tap RESTART.",
        width / 2,
        height / 2 + 60
    );
}


function drawOverlayPanel() {
    fill(3, 20, 44, 225);
    noStroke();

    rect(
        100,
        120,
        width - 200,
        height - 240,
        24
    );
}


/* ======================================================
   KEYBOARD CONTROLS
====================================================== */

function keyPressed() {
    if (
        gameState ===
        GAME_STATE.START
    ) {
        if (key === "1") {
            selectDifficulty(1);
        }

        if (key === "2") {
            selectDifficulty(2);
        }

        if (key === "3") {
            selectDifficulty(3);
        }

        if (keyCode === 32) {
            startGame();
            return false;
        }
    }

    if (
        gameState ===
        GAME_STATE.LEVEL_COMPLETE &&
        (
            key === "n" ||
            key === "N" ||
            keyCode === ENTER
        )
    ) {
        startNextLevel();
    }

    if (
        (
            gameState ===
            GAME_STATE.WON ||
            gameState ===
            GAME_STATE.LOST
        ) &&
        (
            key === "r" ||
            key === "R"
        )
    ) {
        resetCompleteGame();
    }

    if (
        keyCode === LEFT_ARROW ||
        keyCode === RIGHT_ARROW ||
        keyCode === UP_ARROW ||
        keyCode === DOWN_ARROW ||
        keyCode === 32
    ) {
        return false;
    }
}


/* ======================================================
   MOBILE CONTROLS
====================================================== */

function setupMobileControls() {
    const upButton =
        document.querySelector(
            "#move-up"
        );

    const downButton =
        document.querySelector(
            "#move-down"
        );

    const leftButton =
        document.querySelector(
            "#move-left"
        );

    const rightButton =
        document.querySelector(
            "#move-right"
        );

    const actionButton =
        document.querySelector(
            "#mobile-action"
        );

    if (
        !upButton ||
        !downButton ||
        !leftButton ||
        !rightButton ||
        !actionButton
    ) {
        console.error(
            "One or more mobile-control buttons were not found."
        );

        return;
    }

    connectMovementButton(
        upButton,
        "up"
    );

    connectMovementButton(
        downButton,
        "down"
    );

    connectMovementButton(
        leftButton,
        "left"
    );

    connectMovementButton(
        rightButton,
        "right"
    );

    actionButton.addEventListener(
        "click",
        handleMobileAction
    );

    window.addEventListener(
        "pointerup",
        stopAllMobileMovement
    );

    window.addEventListener(
        "pointercancel",
        stopAllMobileMovement
    );

    window.addEventListener(
        "blur",
        stopAllMobileMovement
    );
}


function connectMovementButton(
    button,
    direction
) {
    button.addEventListener(
        "pointerdown",
        event => {
            event.preventDefault();

            /*
                Before the game starts, the left and
                right buttons select difficulty.
            */
            if (
                gameState ===
                GAME_STATE.START
            ) {
                if (
                    direction === "left"
                ) {
                    changeDifficulty(-1);
                    return;
                }

                if (
                    direction === "right"
                ) {
                    changeDifficulty(1);
                    return;
                }
            }

            if (
                gameState !==
                GAME_STATE.PLAYING
            ) {
                return;
            }

            mobileMovement[
                direction
            ] = true;

            button.classList.add(
                "active"
            );
        }
    );

    button.addEventListener(
        "pointerup",
        event => {
            event.preventDefault();

            mobileMovement[
                direction
            ] = false;

            button.classList.remove(
                "active"
            );
        }
    );

    button.addEventListener(
        "pointercancel",
        () => {
            mobileMovement[
                direction
            ] = false;

            button.classList.remove(
                "active"
            );
        }
    );

    button.addEventListener(
        "contextmenu",
        event => {
            event.preventDefault();
        }
    );
}


function stopAllMobileMovement() {
    mobileMovement.up = false;
    mobileMovement.down = false;
    mobileMovement.left = false;
    mobileMovement.right = false;

    const movementButtons =
        document.querySelectorAll(
            ".control-button"
        );

    for (
        const button
        of movementButtons
    ) {
        button.classList.remove(
            "active"
        );
    }
}


function handleMobileAction() {
    if (
        gameState ===
        GAME_STATE.START
    ) {
        startGame();
        updateMobileActionButton();
        return;
    }

    if (
        gameState ===
        GAME_STATE.LEVEL_COMPLETE
    ) {
        startNextLevel();
        updateMobileActionButton();
        return;
    }

    if (
        gameState ===
        GAME_STATE.WON ||
        gameState ===
        GAME_STATE.LOST
    ) {
        resetCompleteGame();
        updateMobileActionButton();
    }
}


function updateMobileActionButton() {
    const actionButton =
        document.querySelector(
            "#mobile-action"
        );

    if (!actionButton) {
        return;
    }

    if (
        gameState ===
        GAME_STATE.START
    ) {
        actionButton.textContent =
            "Start";

        actionButton.disabled = false;
        return;
    }

    if (
        gameState ===
        GAME_STATE.LEVEL_COMPLETE
    ) {
        actionButton.textContent =
            "Next area";

        actionButton.disabled = false;
        return;
    }

    if (
        gameState ===
        GAME_STATE.WON ||
        gameState ===
        GAME_STATE.LOST
    ) {
        actionButton.textContent =
            "Restart";

        actionButton.disabled = false;
        return;
    }

    actionButton.textContent =
        "Playing";

    actionButton.disabled = true;
}


/* ======================================================
   DIFFICULTY
====================================================== */

function selectDifficulty(number) {
    selectedDifficulty = constrain(
        number,
        1,
        3
    );

    lives =
        DIFFICULTIES[
            selectedDifficulty
        ].lives;

    updatePageStatus(
        `Difficulty selected: ${
            DIFFICULTIES[
                selectedDifficulty
            ].name
        }.`
    );
}


function changeDifficulty(change) {
    let newDifficulty =
        selectedDifficulty +
        change;

    if (newDifficulty < 1) {
        newDifficulty = 3;
    }

    if (newDifficulty > 3) {
        newDifficulty = 1;
    }

    selectDifficulty(
        newDifficulty
    );
}


/* ======================================================
   HELPER FUNCTIONS
====================================================== */

function currentLevel() {
    return LEVELS[
        constrain(
            levelIndex,
            0,
            LEVELS.length - 1
        )
    ];
}


function randomWasteType() {
    return random([
        "bottle",
        "can",
        "bag",
        "rope",
        "net"
    ]);
}


function updatePageStatus(message) {
    const statusElement =
        document.querySelector(
            "#game-status"
        );

    if (statusElement) {
        statusElement.textContent =
            message;
    }
}