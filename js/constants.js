// Game constants and configuration
export const GAME_CONFIG = {
    // Game area
    LANE_COUNT: 3,
    FPS: 60,
    
    // Game mechanics
    BASE_GAME_SPEED: 1,
    MAX_GAME_SPEED: 3.5,
    SPEED_INCREMENT: 0.1,
    SPEED_INCREASE_INTERVAL: 15000, // milliseconds - more frequent speed increases (was 30000)
    
    // Obstacle spawning
    BASE_OBSTACLE_INTERVAL: 2000, // milliseconds
    MIN_OBSTACLE_INTERVAL: 500, // milliseconds
    OBSTACLE_INTERVAL_DECREASE_RATE: 0.00001,
    
    // Power-up spawning
    POWER_UP_SPAWN_CHANCE: 0.35, // Increased from 0.25 to 0.35 (35% chance)
    POWER_UP_DURATION: 5000, // milliseconds
    POWER_UP_MIN_SPAWN_INTERVAL: 8000, // Minimum time between power-ups (8 seconds)
    
    // Player
    STARTING_LIVES: 3,
    INVINCIBILITY_DURATION: 2000, // milliseconds after collision
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 70,
    
    // Difficulty progression
    DIFFICULTY_INCREASE_RATE: 0.0001,
    SCORE_MULTIPLIER: 10,
    
    // Physics
    BASE_SPEED_FACTOR: 150, // Pixels per second at speed 1
    
    // Performance
    MAX_PARTICLES: 100
};

// Difficulty presets
export const DIFFICULTY_PRESETS = {
    EASY: {
        BASE_GAME_SPEED: 0.8,
        MAX_GAME_SPEED: 2.0,
        SPEED_INCREASE_INTERVAL: 25000,
        POWER_UP_SPAWN_CHANCE: 0.3,
        STARTING_LIVES: 5,
        OBSTACLE_INTERVAL_DECREASE_RATE: 0.000005
    },
    MEDIUM: {
        BASE_GAME_SPEED: 1.0,
        MAX_GAME_SPEED: 3.0,
        SPEED_INCREASE_INTERVAL: 15000,
        POWER_UP_SPAWN_CHANCE: 0.25,
        STARTING_LIVES: 3,
        OBSTACLE_INTERVAL_DECREASE_RATE: 0.00001
    },
    HARD: {
        BASE_GAME_SPEED: 1.2,
        MAX_GAME_SPEED: 3.5,
        SPEED_INCREASE_INTERVAL: 10000,
        POWER_UP_SPAWN_CHANCE: 0.2,
        STARTING_LIVES: 3,
        OBSTACLE_INTERVAL_DECREASE_RATE: 0.00002
    },
    EXTREME: {
        BASE_GAME_SPEED: 1.5,
        MAX_GAME_SPEED: 4.0,
        SPEED_INCREASE_INTERVAL: 8000,
        POWER_UP_SPAWN_CHANCE: 0.15,
        STARTING_LIVES: 2,
        OBSTACLE_INTERVAL_DECREASE_RATE: 0.00003
    }
};

// Asset types for preloading
export const ASSET_TYPES = {
    IMAGE: 'image',
    AUDIO: 'audio'
};

// Obstacle types
export const OBSTACLE_TYPES = [
    { 
        type: 'car', 
        color: '#ff0000', 
        width: 50, 
        height: 80, 
        points: 10,
        sprite: 'enemy_car.png',
        hitboxAdjustment: { x: 0, y: 0, width: -5, height: -5 }
    },
    { 
        type: 'truck', 
        color: '#ff9900', 
        width: 70, 
        height: 120, 
        points: 20,
        sprite: 'enemy_truck.png',
        hitboxAdjustment: { x: 0, y: 0, width: -5, height: -5 }
    },
    { 
        type: 'debris', 
        color: '#0000ff', 
        width: 30, 
        height: 30, 
        points: 5,
        sprite: 'debris.png',
        hitboxAdjustment: { x: 0, y: 0, width: -2, height: -2 }
    }
];

// Power-up types
export const POWER_UP_TYPES = [
    {
        type: 'shield',
        color: '#4ade80',
        duration: 5000, // milliseconds
        width: 30,
        height: 30,
        sprite: 'shield.png',
        effect: 'invincibility'
    },
    {
        type: 'slowTime',
        color: '#2563eb',
        duration: 5000, // milliseconds
        width: 30,
        height: 30,
        sprite: 'clock.png',
        effect: 'slowMotion'
    },
    {
        type: 'extraLife',
        color: '#ec4899',
        width: 30,
        height: 30,
        sprite: 'heart.png',
        effect: 'addLife'
    },
    {
        type: 'scoreBoost',
        color: '#f59e0b',
        duration: 5000, // milliseconds
        width: 30,
        height: 30,
        sprite: 'coin.png',
        effect: 'doubleScore'
    }
];

// Assets to preload
export const ASSETS = {
    images: {
        player_car: 'assets/images/player_car.png',
        enemy_car: 'assets/images/enemy_car.png',
        enemy_truck: 'assets/images/enemy_truck.png',
        road_texture: 'assets/images/road_texture.png',
        background: 'assets/images/background.png',
        debris: 'assets/images/debris.png',
        shield: 'assets/images/shield.png',
        clock: 'assets/images/clock.png',
        heart: 'assets/images/heart.png',
        coin: 'assets/images/coin.png'
    },
    audio: {
        engine: 'assets/audio/engine.mp3',
        crash: 'assets/audio/crash.mp3',
        power_up: 'assets/audio/power_up.mp3',
        achievement: 'assets/audio/achievement.mp3',
        game_music: 'assets/audio/game_music.mp3',
        menu_music: 'assets/audio/menu_music.mp3',
        lane_change: 'assets/audio/lane_change.mp3'
    }
};

// Game states
export const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

// Particle effects config
export const PARTICLE_CONFIG = {
    crash: {
        count: 30,
        speed: { min: 50, max: 150 },
        size: { min: 2, max: 6 },
        lifetime: { min: 500, max: 1000 },
        colors: ['#ff0000', '#ff5500', '#ffaa00', '#ffff00'],
        gravity: 200
    },
    sparkle: {
        count: 10,
        speed: { min: 20, max: 50 },
        size: { min: 1, max: 3 },
        lifetime: { min: 300, max: 600 },
        colors: ['#ffff00', '#ffffff', '#88ff88'],
        gravity: 0
    }
}; 