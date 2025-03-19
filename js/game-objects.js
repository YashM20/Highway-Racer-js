// Game objects classes
import { GAME_CONFIG, OBSTACLE_TYPES, POWER_UP_TYPES, PARTICLE_CONFIG } from './constants.js';
import { checkCollision } from './utility.js';

/**
 * Base class for all game objects
 */
export class GameObject {
    constructor(x, y, width, height, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.markedForDeletion = false;
    }
    
    /**
     * Check collision with another game object
     * @param {GameObject} other - The other game object
     * @returns {boolean} True if objects are colliding
     */
    isCollidingWith(other) {
        return checkCollision(this, other);
    }
    
    /**
     * Update game object state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Base update logic - to be overridden by subclasses
    }
    
    /**
     * Draw game object
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

/**
 * Player class
 */
export class Player extends GameObject {
    constructor(laneWidth, gameHeight) {
        const width = GAME_CONFIG.PLAYER_WIDTH;
        const height = GAME_CONFIG.PLAYER_HEIGHT;
        const x = laneWidth + (laneWidth - width) / 2;
        const y = gameHeight - height - 20;
        
        super(x, y, width, height, '#00ff00');
        
        this.laneWidth = laneWidth;
        this.gameHeight = gameHeight;
        this.lane = 1; // Center lane
        this.targetLane = 1; // For smooth lane transitions
        this.laneChangeSpeed = 10; // Speed of lane change animation
        this.baseX = x; // Starting X position for reference
        this.speed = GAME_CONFIG.BASE_GAME_SPEED;
        this.isAccelerating = false;
        this.lives = GAME_CONFIG.STARTING_LIVES;
        this.invincible = false;
        this.invincibleTime = 0;
        this.hasShield = false;
        this.power = null;
        this.powerUpTime = 0;
        
        // Visual effects
        this.blinkInterval = 200; // ms
        this.lastBlinkTime = 0;
        this.visible = true;
    }
    
    /**
     * Move player to the left lane
     */
    moveLeft() {
        if (this.targetLane > 0) {
            this.targetLane--;
        }
    }
    
    /**
     * Move player to the right lane
     */
    moveRight() {
        if (this.targetLane < GAME_CONFIG.LANE_COUNT - 1) {
            this.targetLane++;
        }
    }
    
    /**
     * Set player speed
     * @param {number} newSpeed - New speed value
     */
    setSpeed(newSpeed) {
        this.speed = newSpeed;
    }
    
    /**
     * Make player accelerate
     */
    accelerate() {
        this.isAccelerating = true;
        this.speed = Math.min(this.speed * 1.5, GAME_CONFIG.MAX_GAME_SPEED);
    }
    
    /**
     * Make player decelerate
     */
    decelerate() {
        this.isAccelerating = false;
        this.speed = GAME_CONFIG.BASE_GAME_SPEED;
    }
    
    /**
     * Apply a power-up to the player
     * @param {string} powerType - Type of power-up
     * @param {number} duration - Duration in milliseconds
     */
    applyPowerUp(powerType, duration = 5000) {
        this.power = powerType;
        this.powerUpTime = duration;
        
        switch (powerType) {
            case 'invincibility':
                this.invincible = true;
                this.hasShield = true;
                break;
            case 'slowMotion':
                // Handled in game logic
                break;
            case 'addLife':
                this.lives = Math.min(this.lives + 1, 5); // Max 5 lives
                break;
            case 'doubleScore':
                // Handled in game logic
                break;
        }
    }
    
    /**
     * Handle player taking damage
     * @returns {boolean} Whether player died
     */
    takeDamage() {
        if (this.invincible) return false;
        
        this.lives--;
        
        if (this.lives <= 0) {
            return true; // Player died
        }
        
        // Temporary invincibility after taking damage
        this.invincible = true;
        this.invincibleTime = GAME_CONFIG.INVINCIBILITY_DURATION;
        return false;
    }
    
    /**
     * Update player state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Smooth lane transition
        const targetX = this.laneWidth * this.targetLane + (this.laneWidth - this.width) / 2;
        const dx = targetX - this.x;
        
        if (Math.abs(dx) > 0.1) {
            this.x += dx * this.laneChangeSpeed * deltaTime;
        } else {
            this.x = targetX;
            this.lane = this.targetLane;
        }
        
        // Update invincibility
        if (this.invincible) {
            if (this.power !== 'invincibility') {
                this.invincibleTime -= deltaTime * 1000;
                
                if (this.invincibleTime <= 0) {
                    this.invincible = false;
                    this.visible = true;
                } else {
                    // Blink effect
                    this.lastBlinkTime += deltaTime * 1000;
                    if (this.lastBlinkTime >= this.blinkInterval) {
                        this.visible = !this.visible;
                        this.lastBlinkTime = 0;
                    }
                }
            }
        }
        
        // Update power-up timer
        if (this.power) {
            this.powerUpTime -= deltaTime * 1000;
            
            if (this.powerUpTime <= 0) {
                // Remove power-up effects
                switch (this.power) {
                    case 'invincibility':
                        this.invincible = false;
                        this.hasShield = false;
                        break;
                    case 'slowMotion':
                        // Handled in game logic
                        break;
                    case 'doubleScore':
                        // Handled in game logic
                        break;
                }
                
                this.power = null;
                this.visible = true;
            }
        }
    }
    
    /**
     * Draw the player
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} assets - Game assets
     */
    draw(ctx, assets) {
        if (!this.visible) return;
        
        // Use sprite if available
        if (assets && assets.images.player_car) {
            ctx.drawImage(assets.images.player_car, this.x, this.y, this.width, this.height);
        } else {
            // Fallback to basic drawing
            // Car body
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Windows
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height * 0.3);
            
            // Wheels
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x - 5, this.y + 10, 5, 20);
            ctx.fillRect(this.x - 5, this.y + this.height - 30, 5, 20);
            ctx.fillRect(this.x + this.width, this.y + 10, 5, 20);
            ctx.fillRect(this.x + this.width, this.y + this.height - 30, 5, 20);
        }
        
        // Draw speed effect when accelerating
        if (this.isAccelerating) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([5, 15]);
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + this.height);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height + 30);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw shield effect if active
        if (this.hasShield) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width / 2,
                this.y + this.height / 2,
                Math.max(this.width, this.height) * 0.7,
                0,
                Math.PI * 2
            );
            ctx.stroke();
            ctx.lineWidth = 1;
        }
    }
}

/**
 * Obstacle class
 */
export class Obstacle extends GameObject {
    constructor(lane, laneWidth, type) {
        const obstacleType = type || OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
        const x = lane * laneWidth + (laneWidth - obstacleType.width) / 2;
        const y = -obstacleType.height;
        
        super(x, y, obstacleType.width, obstacleType.height, obstacleType.color);
        
        this.lane = lane;
        this.type = obstacleType.type;
        this.speed = (1 + Math.random() * 0.5);
        this.points = obstacleType.points;
        this.sprite = obstacleType.sprite;
        
        // Adjust hitbox for more forgiving collisions
        if (obstacleType.hitboxAdjustment) {
            this.hitbox = {
                x: this.x + obstacleType.hitboxAdjustment.x,
                y: this.y + obstacleType.hitboxAdjustment.y,
                width: this.width + obstacleType.hitboxAdjustment.width,
                height: this.height + obstacleType.hitboxAdjustment.height
            };
        } else {
            this.hitbox = this;
        }
    }
    
    /**
     * Update obstacle position
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} playerSpeed - Current player speed
     * @param {number} gameHeight - Height of game area
     * @param {number} timeScale - Time scaling factor (for slow motion)
     */
    update(deltaTime, playerSpeed, gameHeight, timeScale = 1) {
        this.y += this.speed * playerSpeed * GAME_CONFIG.BASE_SPEED_FACTOR * deltaTime * timeScale;
        
        // Update hitbox position
        if (this.hitbox !== this) {
            this.hitbox.x = this.x;
            this.hitbox.y = this.y;
        }
        
        // Mark for deletion if out of screen
        if (this.y > gameHeight) {
            this.markedForDeletion = true;
        }
    }
    
    /**
     * Draw the obstacle
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} assets - Game assets
     */
    draw(ctx, assets) {
        // Use sprite if available
        if (assets && assets.images[this.type]) {
            ctx.drawImage(assets.images[this.type], this.x, this.y, this.width, this.height);
        } else {
            // Fallback to basic drawing
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Add some details to obstacles
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + this.width * 0.1, this.y + this.height * 0.1, this.width * 0.8, this.height * 0.2);
            ctx.fillRect(this.x + this.width * 0.1, this.y + this.height * 0.7, this.width * 0.8, this.height * 0.2);
        }
        
        // Debug: draw hitbox
        // ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        // ctx.strokeRect(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
    }
}

/**
 * Power-up class
 */
export class PowerUp extends GameObject {
    constructor(lane, laneWidth, typeOverride = null) {
        // Select a power-up type, allowing for an override to force specific types
        let powerUpType;
        if (typeOverride) {
            powerUpType = POWER_UP_TYPES.find(p => p.type === typeOverride) || 
                          POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
        } else {
            powerUpType = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
        }
        
        // Calculate size and position
        const width = powerUpType.width;
        const height = powerUpType.height;
        const x = lane * laneWidth + (laneWidth - width) / 2;
        const y = -height; // Start above the screen
        
        super(x, y, width, height, powerUpType.color);
        
        this.lane = lane;
        this.type = powerUpType.type;
        this.effect = powerUpType.effect;
        this.duration = powerUpType.duration || 0;
        this.sprite = powerUpType.sprite;
        this.pulseDirection = 1;
        this.pulseAmount = 0;
        this.spinAngle = 0;
        this.glowOpacity = 0.5;
        this.glowDirection = 1;
        this.value = 10;
        this.points = 50;
        
        // Visual effects
        this.pulseSpeed = 2; // Speed of size pulsing
        this.rotationSpeed = Math.PI; // Rotation speed (in radians per second)
        
        // Type-specific enhancements
        if (this.type === 'shield' || this.type === 'extraLife') {
            // Make important power-ups more eye-catching
            this.pulseSpeed = 3;
            this.rotationSpeed = Math.PI * 1.5;
            
            // Larger size for important power-ups
            this.width += 5;
            this.height += 5;
            
            // Custom trail particles
            this.lastTrailTime = 0;
            this.trailInterval = 100; // ms between trail particles
            
            // Distinctive colors
            if (this.type === 'shield') {
                this.trailColor = '#4ade80';
            } else { // extraLife
                this.trailColor = '#ec4899';
            }
        }
    }
    
    /**
     * Update power-up
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} playerSpeed - Player's current speed
     * @param {number} gameHeight - Height of the game area
     * @param {number} timeScale - Time scale factor (for slow motion)
     */
    update(deltaTime, playerSpeed, gameHeight, timeScale = 1) {
        // Move power-up down the screen based on player speed
        const scaledDelta = deltaTime * timeScale;
        this.y += playerSpeed * GAME_CONFIG.BASE_SPEED_FACTOR * scaledDelta;
        
        // Animate pulsing
        if (this.pulseDirection === 1) {
            this.pulseAmount += this.pulseSpeed * scaledDelta;
            if (this.pulseAmount >= 5) {
                this.pulseDirection = -1;
            }
        } else {
            this.pulseAmount -= this.pulseSpeed * scaledDelta;
            if (this.pulseAmount <= 0) {
                this.pulseDirection = 1;
            }
        }
        
        // Animate rotation
        this.spinAngle += this.rotationSpeed * scaledDelta;
        if (this.spinAngle > Math.PI * 2) {
            this.spinAngle -= Math.PI * 2;
        }
        
        // Animate glow
        if (this.glowDirection === 1) {
            this.glowOpacity += 0.5 * scaledDelta;
            if (this.glowOpacity >= 0.8) {
                this.glowDirection = -1;
            }
        } else {
            this.glowOpacity -= 0.5 * scaledDelta;
            if (this.glowOpacity <= 0.3) {
                this.glowDirection = 1;
            }
        }
        
        // Trail particles for important power-ups
        if ((this.type === 'shield' || this.type === 'extraLife') && 
            Date.now() - this.lastTrailTime > this.trailInterval) {
            // We can't directly create particles here, but we can flag for creation
            this.shouldCreateTrail = true;
            this.lastTrailTime = Date.now();
        }
        
        // Mark for deletion if off screen
        if (this.y > gameHeight) {
            this.markedForDeletion = true;
        }
    }
    
    /**
     * Draw the power-up
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} assets - Game assets
     */
    draw(ctx, assets) {
        ctx.save();
        
        // Enhanced glow effect for shield and extra life
        if (this.type === 'shield' || this.type === 'extraLife') {
            const glowSize = 25 + Math.sin(Date.now() / 200) * 5;
            const glowColor = this.type === 'shield' ? 
                `rgba(74, 222, 128, ${this.glowOpacity})` : 
                `rgba(236, 72, 153, ${this.glowOpacity})`;
            
            // Outer glow
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = glowSize;
            
            // Draw halo around important power-ups
            ctx.beginPath();
            ctx.arc(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.width * 0.75 + this.pulseAmount,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = glowColor.replace(')', ', 0.2)').replace('rgba', 'rgba');
            ctx.fill();
        } else {
            // Normal glow effect for other power-ups
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
        }
        
        // Translate to center of the power-up for rotation
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.spinAngle);
        
        // Get sprite based on type
        const spriteKey = this.type === 'shield' ? 'shield' : 
                         this.type === 'slowTime' ? 'clock' :
                         this.type === 'extraLife' ? 'heart' : 'coin';
        
        // Draw sprite if available, otherwise draw a colored rectangle
        if (assets && assets.images && assets.images[spriteKey]) {
            const sprite = assets.images[spriteKey];
            ctx.drawImage(
                sprite,
                -this.width / 2 - this.pulseAmount / 2,
                -this.height / 2 - this.pulseAmount / 2,
                this.width + this.pulseAmount,
                this.height + this.pulseAmount
            );
        } else {
            // Fallback to colored rectangle
            ctx.fillStyle = this.color;
            ctx.fillRect(
                -this.width / 2 - this.pulseAmount / 2,
                -this.height / 2 - this.pulseAmount / 2,
                this.width + this.pulseAmount,
                this.height + this.pulseAmount
            );
        }
        
        ctx.restore();
    }
} 