// Game engine
import { GAME_CONFIG, GAME_STATES, PARTICLE_CONFIG, ASSETS } from './constants.js';
import { Player, Obstacle, PowerUp } from './game-objects.js';
import { ParticleSystem } from './particles.js';
import { randomNumber, clamp, formatNumber, loadFromLocalStorage, saveToLocalStorage, preloadAssets } from './utility.js';
import { AUDIO_PLACEHOLDERS } from '../assets/audio/placeholders.js';
import { NotificationSystem } from './notification.js';

export class GameEngine {
    constructor(canvas, uiElements) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ui = uiElements;
        
        // Game state
        this.state = GAME_STATES.MENU;
        this.score = 0;
        this.highScore = loadFromLocalStorage('highScore', 0);
        this.gameTime = 0;
        this.lastObstacleTime = 0;
        this.lastSpeedIncreaseTime = 0;
        this.lastPowerUpTime = 0;
        this.timeScale = 1; // For slow motion effects
        this.scoreMultiplier = 1;
        this.distance = 0;
        this.gameSpeed = 1;
        this.roadOffset = 0;
        this.difficulty = 1;
        
        // Game objects
        this.player = null;
        this.obstacles = [];
        this.powerUps = [];
        
        // Game systems
        this.particleSystem = new ParticleSystem(this.ctx);
        
        // Animation frame ID for cancellation
        this.animationId = null;
        
        // Asset loading
        this.assets = null;
        this.assetsLoaded = false;
        this.loadingProgress = 0;
        
        // Audio settings
        this.musicEnabled = true;
        this.sfxEnabled = true;
        
        // Use global notification system
        this.notificationSystem = window.notificationSystem;
        
        // Track previous scores for milestone notifications
        this.previousScore = 0;
    }
    
    /**
     * Initialize the game
     */
    async init() {
        // Load game assets
        await this.loadAssets();
        
        // Set up initial screen
        this.updateHighScoreDisplay();
        
        // Set canvas size
        this.resizeCanvas();
        
        // Set up event handlers
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        
        // Set initial state
        this.setState(GAME_STATES.MENU);
    }
    
    /**
     * Load game assets
     */
    async loadAssets() {
        // Load Howler.js before loading assets
        const Howl = window.Howl;
        
        try {
            // Check if we need to use fallback assets
            const useFallbackAudio = Object.values(ASSETS.audio).some(path => {
                try {
                    const response = fetch(path, { method: 'HEAD' });
                    return !response.ok;
                } catch (e) {
                    return true;
                }
            });
            
            if (useFallbackAudio) {
                console.log('Using fallback audio assets');
                // Use placeholder audio files
                Object.keys(ASSETS.audio).forEach(key => {
                    if (AUDIO_PLACEHOLDERS[key]) {
                        ASSETS.audio[key] = AUDIO_PLACEHOLDERS[key];
                    }
                });
            }
            
            // Update loading UI
            this.updateLoadingProgress(0, 'Loading assets...');
            
            this.assets = await preloadAssets(ASSETS, Howl, (progress) => {
                this.loadingProgress = progress;
                this.updateLoadingProgress(progress, 'Loading assets...');
            });
            
            this.assetsLoaded = true;
            this.updateLoadingProgress(1, 'Ready!');
        } catch (error) {
            console.error('Failed to load assets:', error);
            // Continue with fallback graphics
            this.assets = { images: {}, audio: {} };
            this.assetsLoaded = true;
            this.updateLoadingProgress(1, 'Ready with limited features');
        }
    }
    
    /**
     * Update loading progress display
     * @param {number} progress - Progress from 0 to 1
     * @param {string} message - Loading message to display
     */
    updateLoadingProgress(progress, message) {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            const progressBar = loadingIndicator.querySelector('.progress-bar');
            const progressText = loadingIndicator.querySelector('.progress-text');
            const messageElement = loadingIndicator.querySelector('.loading-message');
            
            if (progressBar) {
                progressBar.style.width = `${progress * 100}%`;
            }
            
            if (progressText) {
                progressText.textContent = `${Math.round(progress * 100)}%`;
            }
            
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }
    
    /**
     * Set the game state
     * @param {string} newState - New game state from GAME_STATES
     */
    setState(newState) {
        this.state = newState;
        
        switch (newState) {
            case GAME_STATES.MENU:
                this.showMenu();
                break;
                
            case GAME_STATES.PLAYING:
                this.startGame();
                break;
                
            case GAME_STATES.PAUSED:
                // Pause game logic
                this.pauseGame();
                break;
                
            case GAME_STATES.GAME_OVER:
                this.endGame();
                break;
        }
    }
    
    /**
     * Show the main menu
     */
    showMenu() {
        // Show start screen
        this.ui.startScreen.classList.remove('hidden');
        this.ui.gameOverScreen.classList.add('hidden');
        this.ui.settingsButton.classList.add('hidden');
        this.ui.gameUI.classList.add('hidden');
        
        // Play menu music if enabled
        if (this.musicEnabled && this.assets && this.assets.audio.menu_music) {
            this.assets.audio.menu_music.play();
        }
        
        // Cancel any existing game loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Start the game
     */
    startGame() {
        // Reset game state
        this.score = 0;
        this.previousScore = 0;
        this.gameTime = 0;
        this.lastObstacleTime = 0;
        this.lastSpeedIncreaseTime = 0;
        this.lastPowerUpTime = 0;
        this.timeScale = 1;
        this.scoreMultiplier = 1;
        this.distance = 0;
        this.gameSpeed = GAME_CONFIG.BASE_GAME_SPEED;
        this.roadOffset = 0;
        this.difficulty = 1;
        
        // Clear existing objects
        this.obstacles = [];
        this.powerUps = [];
        this.particleSystem.clear();
        
        // Initialize player
        const laneWidth = this.canvas.width / GAME_CONFIG.LANE_COUNT;
        this.player = new Player(laneWidth, this.canvas.height);
        
        // Update UI
        this.ui.startScreen.classList.add('hidden');
        this.ui.gameOverScreen.classList.add('hidden');
        this.ui.settingsButton.classList.remove('hidden');
        this.ui.gameUI.classList.remove('hidden');
        this.updateScoreDisplay();
        this.updateSpeedDisplay();
        this.updateLivesDisplay();
        
        // Stop menu music if playing
        if (this.assets && this.assets.audio.menu_music) {
            this.assets.audio.menu_music.stop();
        }
        
        // Play game music if enabled
        if (this.musicEnabled && this.assets && this.assets.audio.game_music) {
            this.assets.audio.game_music.play();
        }
        
        // Play engine sound if enabled
        if (this.sfxEnabled && this.assets && this.assets.audio.engine) {
            this.assets.audio.engine.play();
        }
        
        // Show welcome notification
        if (this.notificationSystem) {
            this.notificationSystem.info('Game Started! Good luck!');
        }
        
        // Start game loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.gameLoop(0);
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        // Stop the game loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Create/show pause menu if it doesn't exist
        let pauseMenu = document.getElementById('pause-menu');
        if (!pauseMenu) {
            pauseMenu = document.createElement('div');
            pauseMenu.id = 'pause-menu';
            pauseMenu.className = 'game-screen';
            pauseMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            
            pauseMenu.innerHTML = `
                <h1 class="game-title">Game Paused</h1>
                <div class="flex flex-col gap-4 mt-6">
                    <button id="resume-button" class="game-button">Resume Game</button>
                    <button id="restart-button-pause" class="game-button bg-green-600 hover:bg-green-500">Restart Game</button>
                    <button id="exit-button" class="game-button bg-red-600 hover:bg-red-500">Exit to Menu</button>
                </div>
            `;
            
            document.getElementById('game-container').appendChild(pauseMenu);
            
            // Add event listeners
            document.getElementById('resume-button').addEventListener('click', () => {
                this.resumeGame();
            });
            
            document.getElementById('restart-button-pause').addEventListener('click', () => {
                pauseMenu.classList.add('hidden');
                this.setState(GAME_STATES.PLAYING);
            });
            
            document.getElementById('exit-button').addEventListener('click', () => {
                pauseMenu.classList.add('hidden');
                this.setState(GAME_STATES.MENU);
            });
        }
        
        pauseMenu.classList.remove('hidden');
        
        // Pause audio
        if (this.assets && this.assets.audio.engine) {
            this.assets.audio.engine.pause();
        }
        
        if (this.assets && this.assets.audio.game_music) {
            this.assets.audio.game_music.pause();
        }
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        // Hide pause menu
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            pauseMenu.classList.add('hidden');
        }
        
        // Resume audio
        if (this.musicEnabled && this.assets && this.assets.audio.game_music) {
            this.assets.audio.game_music.play();
        }
        
        if (this.sfxEnabled && this.assets && this.assets.audio.engine) {
            this.assets.audio.engine.play();
        }
        
        // Resume game state
        this.state = GAME_STATES.PLAYING;
        
        // Continue game loop
        this.gameLoop(0);
    }
    
    /**
     * End the game (game over)
     */
    endGame() {
        // Stop game loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Stop engine sound
        if (this.assets && this.assets.audio.engine) {
            this.assets.audio.engine.stop();
        }
        
        // Play crash sound
        if (this.sfxEnabled && this.assets && this.assets.audio.crash) {
            this.assets.audio.crash.play();
        }
        
        // Update high score and show notification
        if (this.score > this.highScore) {
            this.highScore = this.score;
            saveToLocalStorage('highScore', this.highScore);
            
            // Show high score notification
            if (this.notificationSystem) {
                this.notificationSystem.success(`New High Score: ${formatNumber(this.score)}!`);
            }
        } else if (this.notificationSystem) {
            this.notificationSystem.warning(`Game Over! Final Score: ${formatNumber(this.score)}`);
        }
        
        // Update UI
        this.ui.finalScoreDisplay.textContent = formatNumber(this.score);
        this.ui.finalHighScoreDisplay.textContent = formatNumber(this.highScore);
        this.ui.gameOverScreen.classList.remove('hidden');
        this.ui.settingsButton.classList.add('hidden');
    }
    
    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp from requestAnimationFrame
     */
    gameLoop(timestamp) {
        if (this.state !== GAME_STATES.PLAYING) return;
        
        // Calculate delta time
        const deltaTime = this.gameTime > 0 ? (timestamp - this.gameTime) / 1000 : 0.016;
        this.gameTime = timestamp;
        
        // Apply time scale (for slow motion effect)
        const scaledDelta = deltaTime * this.timeScale;
        
        // Update game objects
        this.update(scaledDelta);
        
        // Draw the game
        this.draw();
        
        // Continue game loop
        this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Update game state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Limit deltaTime to avoid large jumps
        const delta = Math.min(deltaTime, 0.1);
        
        // Update player
        this.player.update(delta);
        
        // Update road animation
        this.roadOffset += this.player.speed * 200 * delta * this.timeScale;
        if (this.roadOffset >= this.canvas.height) {
            this.roadOffset -= this.canvas.height;
        }
        
        // Update obstacles
        this.updateObstacles(delta);
        
        // Update power-ups
        this.updatePowerUps(delta);
        
        // Update particles
        this.particleSystem.update(delta);
        
        // Check for collisions
        this.checkCollisions();
        
        // Spawn new obstacles
        if (this.gameTime - this.lastObstacleTime > this.getObstacleSpawnInterval()) {
            this.spawnObstacle();
            this.lastObstacleTime = this.gameTime;
        }
        
        // Spawn new power-ups
        if (this.gameTime - this.lastPowerUpTime > this.getPowerUpSpawnInterval()) {
            if (Math.random() < GAME_CONFIG.POWER_UP_SPAWN_CHANCE) {
                this.spawnPowerUp();
            }
            this.lastPowerUpTime = this.gameTime;
        }
        
        // Increase difficulty over time
        if (this.gameTime - this.lastSpeedIncreaseTime > GAME_CONFIG.SPEED_INCREASE_INTERVAL) {
            this.increaseDifficulty();
            this.lastSpeedIncreaseTime = this.gameTime;
        }
        
        // Update score based on distance traveled
        const speedFactor = this.player.speed * this.scoreMultiplier;
        const oldScore = this.score;
        this.score += Math.floor(delta * speedFactor * GAME_CONFIG.SCORE_MULTIPLIER);
        this.updateScoreDisplay();
        
        // Check for score milestones (every 1000 points)
        if (this.notificationSystem && Math.floor(this.score / 1000) > Math.floor(this.previousScore / 1000)) {
            const milestone = Math.floor(this.score / 1000) * 1000;
            this.notificationSystem.success(`Score Milestone: ${formatNumber(milestone)}!`);
            
            // Play achievement sound
            if (this.sfxEnabled && this.assets && this.assets.audio.achievement) {
                this.assets.audio.achievement.play();
            }
        }
        this.previousScore = this.score;
        
        // Update speed display if needed
        if (Math.floor(this.player.speed * 10) !== Math.floor(this.gameSpeed * 10)) {
            this.gameSpeed = this.player.speed;
            this.updateSpeedDisplay();
        }
    }
    
    /**
     * Draw the game
     */
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw road
        this.drawRoad();
        
        // Draw power-ups
        this.drawPowerUps();
        
        // Draw obstacles
        this.drawObstacles();
        
        // Draw particles
        this.particleSystem.draw();
        
        // Draw player
        this.player.draw(this.ctx, this.assets);
    }
    
    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        // If player exists, update its position for new dimensions
        if (this.player) {
            const laneWidth = this.canvas.width / GAME_CONFIG.LANE_COUNT;
            this.player.laneWidth = laneWidth;
            this.player.y = this.canvas.height - this.player.height - 20;
            
            // Update player x position based on lane
            const targetX = laneWidth * this.player.lane + (laneWidth - this.player.width) / 2;
            this.player.x = targetX;
        }
        
        // Redraw if in game state
        if (this.state === GAME_STATES.PLAYING) {
            this.draw();
        }
    }
    
    /**
     * Calculate obstacle spawn interval based on difficulty
     * @returns {number} Interval in milliseconds
     */
    getObstacleSpawnInterval() {
        return Math.max(
            GAME_CONFIG.MIN_OBSTACLE_INTERVAL,
            GAME_CONFIG.BASE_OBSTACLE_INTERVAL - this.score * GAME_CONFIG.OBSTACLE_INTERVAL_DECREASE_RATE
        );
    }
    
    /**
     * Calculate power-up spawn interval
     * @returns {number} Interval in milliseconds
     */
    getPowerUpSpawnInterval() {
        // Use minimum power-up spawn interval as a base
        return Math.max(
            GAME_CONFIG.POWER_UP_MIN_SPAWN_INTERVAL,
            this.getObstacleSpawnInterval() * 3
        );
    }
    
    /**
     * Increase game difficulty
     */
    increaseDifficulty() {
        this.difficulty += GAME_CONFIG.DIFFICULTY_INCREASE_RATE;
        
        // Gradually increase speed up to max speed
        if (this.player && this.player.speed < GAME_CONFIG.MAX_GAME_SPEED) {
            // Calculate new speed with a smoother progression
            const newSpeed = Math.min(
                this.player.speed + GAME_CONFIG.SPEED_INCREMENT,
                GAME_CONFIG.MAX_GAME_SPEED
            );
            
            // Apply new speed
            this.player.setSpeed(newSpeed);
            
            // Update UI
            this.updateSpeedDisplay();
            
            // Show notification for speed increase
            if (this.notificationSystem && Math.floor(newSpeed * 10) > Math.floor(this.player.speed * 10)) {
                this.notificationSystem.warning(`Speed increased: ${newSpeed.toFixed(1)}x`);
            }
        }
    }
    
    /**
     * Set game difficulty based on preset
     * @param {string} difficulty - Difficulty level: 'easy', 'medium', 'hard', 'extreme'
     */
    setDifficulty(difficulty) {
        const preset = DIFFICULTY_PRESETS[difficulty.toUpperCase()];
        if (!preset) return;
        
        // Apply difficulty settings
        GAME_CONFIG.BASE_GAME_SPEED = preset.BASE_GAME_SPEED;
        GAME_CONFIG.MAX_GAME_SPEED = preset.MAX_GAME_SPEED;
        GAME_CONFIG.SPEED_INCREASE_INTERVAL = preset.SPEED_INCREASE_INTERVAL;
        GAME_CONFIG.POWER_UP_SPAWN_CHANCE = preset.POWER_UP_SPAWN_CHANCE;
        GAME_CONFIG.STARTING_LIVES = preset.STARTING_LIVES;
        GAME_CONFIG.OBSTACLE_INTERVAL_DECREASE_RATE = preset.OBSTACLE_INTERVAL_DECREASE_RATE;
        
        // Reset player if exists
        if (this.player) {
            this.player.lives = GAME_CONFIG.STARTING_LIVES;
            this.player.setSpeed(GAME_CONFIG.BASE_GAME_SPEED);
            this.updateLivesDisplay();
        }
        
        // Show notification
        if (this.notificationSystem) {
            this.notificationSystem.info(`Difficulty set to ${difficulty}`);
        }
    }
    
    /**
     * Spawn a new obstacle
     */
    spawnObstacle() {
        const laneWidth = this.canvas.width / GAME_CONFIG.LANE_COUNT;
        
        // Add smarter lane selection to avoid obstacles too close together
        let lane;
        const minSafeDistance = 150; // Minimum safe distance between obstacles
        
        if (this.obstacles.length > 0) {
            // Check existing obstacles in each lane
            const lanesWithRecentObstacles = [];
            
            this.obstacles.forEach(obs => {
                if (obs.y < minSafeDistance) {
                    lanesWithRecentObstacles.push(obs.lane);
                }
            });
            
            // Filter out lanes that have recent obstacles
            const safeLanes = Array.from(Array(GAME_CONFIG.LANE_COUNT).keys())
                .filter(l => !lanesWithRecentObstacles.includes(l));
            
            if (safeLanes.length > 0) {
                // Choose a random safe lane
                lane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
            } else {
                // If all lanes have recent obstacles, just pick a random lane
                lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
            }
        } else {
            lane = Math.floor(Math.random() * GAME_CONFIG.LANE_COUNT);
        }
        
        this.obstacles.push(new Obstacle(lane, laneWidth));
    }
    
    /**
     * Spawn a new power-up
     */
    spawnPowerUp() {
        const laneWidth = this.canvas.width / GAME_CONFIG.LANE_COUNT;
        
        // Find safe lanes (lanes without obstacles near the top)
        const safeDistance = 150; // Minimum safe distance from obstacles
        const occupiedLanes = [];
        
        // Check which lanes have obstacles near the top of the screen
        this.obstacles.forEach(obstacle => {
            if (obstacle.y < safeDistance) {
                occupiedLanes.push(obstacle.lane);
            }
        });
        
        // Filter out occupied lanes to find safe ones
        const safeLanes = Array.from(Array(GAME_CONFIG.LANE_COUNT).keys())
            .filter(lane => !occupiedLanes.includes(lane));
        
        // If no safe lanes, delay power-up spawn
        if (safeLanes.length === 0) {
            // Try again later
            this.lastPowerUpTime = this.gameTime - this.getPowerUpSpawnInterval() + 1000;
            return;
        }
        
        // Select a random safe lane
        const lane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
        
        // Bias towards shield and health power-ups to ensure they spawn more often
        let powerUpType = null;
        const rand = Math.random();
        
        // Dynamic spawn rates based on player state
        if (this.player.lives === 1) {
            // When player has 1 life left: 60% heart, 30% shield, 10% others
            if (rand < 0.6) {
                powerUpType = 'extraLife';
            } else if (rand < 0.9) {
                powerUpType = 'shield';
            }
        } else if (this.timeSinceLastPowerUp && this.timeSinceLastPowerUpType) {
            // Track time since last power-up type to ensure variety
            const timeSinceShield = this.timeSinceLastPowerUpType.shield || 0;
            const timeSinceHeart = this.timeSinceLastPowerUpType.extraLife || 0;
            
            // Boost spawn rate for power-ups that haven't appeared for a while
            if (timeSinceShield > 30000 && timeSinceHeart > 30000) {
                // Neither has spawned in 30 seconds: 45% shield, 45% heart, 10% others
                if (rand < 0.45) {
                    powerUpType = 'shield';
                } else if (rand < 0.9) {
                    powerUpType = 'extraLife';
                }
            } else if (timeSinceShield > 30000) {
                // Shield hasn't spawned in 30 seconds: 60% shield, 20% heart, 20% others
                if (rand < 0.6) {
                    powerUpType = 'shield';
                } else if (rand < 0.8) {
                    powerUpType = 'extraLife';
                }
            } else if (timeSinceHeart > 30000) {
                // Heart hasn't spawned in 30 seconds: 60% heart, 20% shield, 20% others
                if (rand < 0.6) {
                    powerUpType = 'extraLife';
                } else if (rand < 0.8) {
                    powerUpType = 'shield';
                }
            } else {
                // Default distribution: 35% shield, 35% heart, 30% others
                if (rand < 0.35) {
                    powerUpType = 'shield';
                } else if (rand < 0.7) {
                    powerUpType = 'extraLife';
                }
            }
        } else {
            // First power-ups: 40% shield, 40% heart, 20% others
            if (rand < 0.4) {
                powerUpType = 'shield';
            } else if (rand < 0.8) {
                powerUpType = 'extraLife';
            }
        }
        
        // Create the power-up
        this.powerUps.push(new PowerUp(lane, laneWidth, powerUpType));
        
        // Track time since specific power-up types
        const currentTime = Date.now();
        if (!this.timeSinceLastPowerUpType) {
            this.timeSinceLastPowerUpType = {};
        }
        
        // Update all power-up type timers
        const powerUpTypes = POWER_UP_TYPES.map(p => p.type);
        powerUpTypes.forEach(type => {
            if (type === powerUpType) {
                this.timeSinceLastPowerUpType[type] = 0; // Reset timer for spawned type
            } else {
                // Increment timer for other types
                this.timeSinceLastPowerUpType[type] = (this.timeSinceLastPowerUpType[type] || 0) + 
                    (currentTime - (this.lastPowerUpTypeTime || currentTime));
            }
        });
        
        this.lastPowerUpTypeTime = currentTime;
    }
    
    /**
     * Update obstacles
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateObstacles(deltaTime) {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            obstacle.update(deltaTime, this.player.speed, this.canvas.height, this.timeScale);
            
            // Remove obstacles that are marked for deletion
            if (obstacle.markedForDeletion) {
                this.obstacles.splice(i, 1);
                
                // Add points for successfully avoiding obstacle
                this.score += Math.floor(obstacle.points * this.player.speed * this.scoreMultiplier);
            }
        }
    }
    
    /**
     * Update power-ups
     * @param {number} deltaTime - Time since last update in seconds
     */
    updatePowerUps(deltaTime) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            powerUp.update(deltaTime, this.player.speed, this.canvas.height, this.timeScale);
            
            // Create trail particles for important power-ups if flagged
            if (powerUp.shouldCreateTrail) {
                // Create small sparkle effect behind power-up
                const particleConfig = {
                    count: 3,
                    speed: { min: 5, max: 20 },
                    size: { min: 1, max: 3 },
                    lifetime: { min: 300, max: 600 },
                    colors: [powerUp.trailColor],
                    gravity: 0
                };
                
                this.particleSystem.explosion(
                    powerUp.x + powerUp.width / 2,
                    powerUp.y + powerUp.height / 2,
                    particleConfig
                );
                
                // Reset flag
                powerUp.shouldCreateTrail = false;
            }
            
            // Remove power-ups that are marked for deletion
            if (powerUp.markedForDeletion) {
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    /**
     * Check for collisions
     */
    checkCollisions() {
        if (this.player.invincible) return;
        
        // Check obstacle collisions
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            
            if (this.player.isCollidingWith(obstacle.hitbox || obstacle)) {
                // Create explosion effect
                this.particleSystem.explosion(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    PARTICLE_CONFIG.crash
                );
                
                // Handle collision
                const isDead = this.player.takeDamage();
                if (isDead) {
                    this.setState(GAME_STATES.GAME_OVER);
                } else {
                    this.updateLivesDisplay();
                    
                    // Show crash notification
                    if (this.notificationSystem) {
                        this.notificationSystem.error(`Crash! Lives: ${this.player.lives}`);
                    }
                    
                    // Play damage sound
                    if (this.sfxEnabled && this.assets && this.assets.audio.crash) {
                        this.assets.audio.crash.play();
                    }
                }
                
                // Remove the obstacle
                this.obstacles.splice(i, 1);
                break;
            }
        }
        
        // Check power-up collisions
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (this.player.isCollidingWith(powerUp)) {
                // Apply power-up effect
                this.applyPowerUp(powerUp);
                
                // Remove the power-up
                this.powerUps.splice(i, 1);
                
                // Play power-up sound
                if (this.sfxEnabled && this.assets && this.assets.audio.power_up) {
                    this.assets.audio.power_up.play();
                }
                
                // Create sparkle effect
                this.particleSystem.explosion(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    PARTICLE_CONFIG.sparkle
                );
                
                break;
            }
        }
    }
    
    /**
     * Apply power-up effect
     * @param {PowerUp} powerUp - The power-up to apply
     */
    applyPowerUp(powerUp) {
        switch (powerUp.effect) {
            case 'invincibility':
                this.player.applyPowerUp('invincibility', powerUp.duration);
                this.showPowerUpIndicator('Shield', powerUp.duration);
                if (this.notificationSystem) {
                    this.notificationSystem.info('Shield Activated!');
                }
                break;
                
            case 'slowMotion':
                this.timeScale = 0.5;
                setTimeout(() => {
                    this.timeScale = 1;
                }, powerUp.duration);
                this.player.applyPowerUp('slowMotion', powerUp.duration);
                this.showPowerUpIndicator('Slow Motion', powerUp.duration);
                if (this.notificationSystem) {
                    this.notificationSystem.info('Time Slowed!');
                }
                break;
                
            case 'addLife':
                this.player.applyPowerUp('addLife');
                this.updateLivesDisplay();
                this.showPowerUpIndicator('Extra Life', 1000);
                if (this.notificationSystem) {
                    this.notificationSystem.success('Extra Life!');
                }
                break;
                
            case 'doubleScore':
                this.scoreMultiplier = 2;
                setTimeout(() => {
                    this.scoreMultiplier = 1;
                }, powerUp.duration);
                this.player.applyPowerUp('doubleScore', powerUp.duration);
                this.showPowerUpIndicator('Double Score', powerUp.duration);
                if (this.notificationSystem) {
                    this.notificationSystem.success('Double Score!');
                }
                break;
        }
    }
    
    /**
     * Show power-up indicator
     * @param {string} text - Text to display
     * @param {number} duration - Duration to show
     */
    showPowerUpIndicator(text, duration) {
        // Create or get power-up indicator element
        let indicator = document.getElementById('power-up-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'power-up-indicator';
            this.ui.gameUI.appendChild(indicator);
        }
        
        // Create or get progress bar
        let progressBar = indicator.querySelector('.power-up-timer');
        if (!progressBar) {
            const progressContainer = document.createElement('div');
            progressContainer.className = 'power-up-timer';
            
            const progress = document.createElement('div');
            progress.className = 'power-up-progress';
            
            progressContainer.appendChild(progress);
            progressBar = progressContainer;
            
            indicator.innerHTML = '';
            indicator.textContent = text;
            indicator.appendChild(progressContainer);
        } else {
            indicator.firstChild.textContent = text;
        }
        
        // Show indicator
        indicator.classList.remove('hidden');
        
        // Animate progress bar
        const progress = progressBar.querySelector('.power-up-progress');
        progress.style.width = '100%';
        
        // Create animation for progress bar
        const startTime = Date.now();
        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 1 - elapsed / duration);
            progress.style.width = `${remaining * 100}%`;
            
            if (elapsed < duration) {
                requestAnimationFrame(updateProgress);
            } else {
                indicator.classList.add('hidden');
            }
        };
        
        updateProgress();
    }
    
    /**
     * Draw the road
     */
    drawRoad() {
        // Draw background if available
        if (this.assets && this.assets.images.background) {
            // Create repeating background pattern
            this.ctx.fillStyle = this.ctx.createPattern(this.assets.images.background, 'repeat');
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Fallback to solid color
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Road background
        if (this.assets && this.assets.images.road_texture) {
            // Create pattern from road texture with vertical scrolling
            const pattern = this.ctx.createPattern(this.assets.images.road_texture, 'repeat');
            
            // Apply road texture with perspective effect
            this.ctx.save();
            
            // Translate to create scrolling effect
            this.ctx.translate(0, this.roadOffset % this.assets.images.road_texture.height);
            
            this.ctx.fillStyle = pattern;
            this.ctx.fillRect(0, -this.assets.images.road_texture.height, this.canvas.width, this.canvas.height + this.assets.images.road_texture.height);
            
            this.ctx.restore();
        } else {
            // Fallback to solid color
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Lane dividers
        const laneWidth = this.canvas.width / GAME_CONFIG.LANE_COUNT;
        this.ctx.strokeStyle = '#fff';
        this.ctx.setLineDash([20, 20]); // Dashed line
        
        // Animated lane dividers
        for (let i = 1; i < GAME_CONFIG.LANE_COUNT; i++) {
            const x = i * laneWidth;
            
            this.ctx.beginPath();
            
            // Draw dashed lines with animation
            for (let y = -this.roadOffset % 40; y < this.canvas.height; y += 40) {
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x, y + 20);
            }
            
            this.ctx.stroke();
        }
        this.ctx.setLineDash([]); // Reset to solid line
        
        // Road edges
        this.ctx.strokeStyle = '#ff0';
        this.ctx.lineWidth = 5;
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width, 0);
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.stroke();
        
        this.ctx.lineWidth = 1;
    }
    
    /**
     * Draw obstacles
     */
    drawObstacles() {
        for (const obstacle of this.obstacles) {
            obstacle.draw(this.ctx, this.assets);
        }
    }
    
    /**
     * Draw power-ups
     */
    drawPowerUps() {
        for (const powerUp of this.powerUps) {
            powerUp.draw(this.ctx, this.assets);
        }
    }
    
    /**
     * Update score display
     */
    updateScoreDisplay() {
        // Update both old and new score displays
        this.ui.scoreDisplay.textContent = formatNumber(this.score);
        
        // Update new score display if it exists
        const newScoreDisplay = document.getElementById('score');
        if (newScoreDisplay) {
            newScoreDisplay.textContent = formatNumber(this.score);
        }
    }
    
    /**
     * Update speed display
     */
    updateSpeedDisplay() {
        // Update both old and new speed displays
        this.ui.speedDisplay.textContent = this.player ? this.player.speed.toFixed(1) : '1.0';
        
        // Update new speed display if it exists
        const newSpeedDisplay = document.getElementById('speed');
        if (newSpeedDisplay) {
            newSpeedDisplay.textContent = this.player ? this.player.speed.toFixed(1) : '1.0';
        }
    }
    
    /**
     * Update lives display
     */
    updateLivesDisplay() {
        // Update both old and new lives displays
        this.ui.livesDisplay.textContent = this.player ? this.player.lives : GAME_CONFIG.STARTING_LIVES;
        
        // Update new lives display if it exists
        const newLivesDisplay = document.getElementById('lives');
        if (newLivesDisplay) {
            newLivesDisplay.textContent = this.player ? this.player.lives : GAME_CONFIG.STARTING_LIVES;
        }
    }
    
    /**
     * Update high score display
     */
    updateHighScoreDisplay() {
        this.ui.highScoreDisplay.textContent = formatNumber(this.highScore);
    }
    
    /**
     * Handle player input
     * @param {string} input - Input type: 'left', 'right', 'accelerate', 'decelerate'
     */
    handleInput(input) {
        if (this.state !== GAME_STATES.PLAYING || !this.player) return;
        
        switch (input) {
            case 'left':
                this.player.moveLeft();
                if (this.sfxEnabled && this.assets && this.assets.audio.lane_change) {
                    this.assets.audio.lane_change.play();
                }
                break;
                
            case 'right':
                this.player.moveRight();
                if (this.sfxEnabled && this.assets && this.assets.audio.lane_change) {
                    this.assets.audio.lane_change.play();
                }
                break;
                
            case 'accelerate':
                this.player.accelerate();
                break;
                
            case 'decelerate':
                this.player.decelerate();
                break;
        }
    }
    
    /**
     * Toggle music enabled state
     * @param {boolean} enabled - Whether music should be enabled
     */
    toggleMusic(enabled) {
        this.musicEnabled = enabled;
        
        // Toggle currently playing music
        if (this.assets) {
            if (this.state === GAME_STATES.PLAYING && this.assets.audio.game_music) {
                if (enabled) {
                    this.assets.audio.game_music.play();
                } else {
                    this.assets.audio.game_music.stop();
                }
            } else if (this.state === GAME_STATES.MENU && this.assets.audio.menu_music) {
                if (enabled) {
                    this.assets.audio.menu_music.play();
                } else {
                    this.assets.audio.menu_music.stop();
                }
            }
        }
    }
    
    /**
     * Toggle sound effects enabled state
     * @param {boolean} enabled - Whether sound effects should be enabled
     */
    toggleSfx(enabled) {
        this.sfxEnabled = enabled;
        
        // Toggle engine sound if playing
        if (this.assets && this.assets.audio.engine) {
            if (this.state === GAME_STATES.PLAYING) {
                if (enabled) {
                    this.assets.audio.engine.play();
                } else {
                    this.assets.audio.engine.stop();
                }
            }
        }
    }
} 