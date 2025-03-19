// Main application
import { GameEngine } from './game-engine.js';
import { InputController } from './input-controller.js';
import { GAME_STATES } from './constants.js';
import { NotificationSystem } from './notification.js';

class App {
    constructor() {
        // Get game elements
        this.canvas = document.getElementById('game-canvas');
        this.uiElements = {
            startScreen: document.getElementById('start-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            gameUI: document.getElementById('game-ui'),
            scoreDisplay: document.getElementById('score'),
            speedDisplay: document.getElementById('speed'),
            livesDisplay: document.getElementById('lives'),
            finalScoreDisplay: document.getElementById('final-score'),
            highScoreDisplay: document.getElementById('high-score'),
            finalHighScoreDisplay: document.getElementById('final-high-score'),
            settingsButton: document.getElementById('settings-button'),
            settingsPanel: document.getElementById('settings-panel'),
            mobileControls: document.getElementById('mobile-controls')
        };
        
        // Initialize game engine with event emitter functionality
        this.game = this.createGameEngineWithEvents();
        
        // Initialize input controller
        this.input = new InputController(this.game);
        
        // Handle window events
        this.setupWindowEvents();
        
        // Initialize the game
        this.init();
    }
    
    /**
     * Extend GameEngine with event emitter functionality
     * @returns {GameEngine} GameEngine instance with event emitter capabilities
     */
    createGameEngineWithEvents() {
        const game = new GameEngine(this.canvas, this.uiElements);
        
        // Add event emitter functionality
        game.events = {};
        
        game.on = function(event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(callback);
            return this;
        };
        
        game.off = function(event, callback) {
            if (!this.events[event]) return this;
            this.events[event] = this.events[event].filter(cb => cb !== callback);
            return this;
        };
        
        game.emit = function(event, ...args) {
            if (!this.events[event]) return this;
            this.events[event].forEach(callback => callback(...args));
            return this;
        };
        
        // Override setState to emit events
        const originalSetState = game.setState;
        game.setState = function(newState) {
            const oldState = this.state;
            originalSetState.call(this, newState);
            this.emit('stateChange', newState, oldState);
        };
        
        return game;
    }
    
    /**
     * Setup window event handlers
     */
    setupWindowEvents() {
        // Handle visibility change (tab switching, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.game.state === GAME_STATES.PLAYING) {
                // Auto-pause when switching tabs
                this.game.setState(GAME_STATES.PAUSED);
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Handle beforeunload to save game state
        window.addEventListener('beforeunload', () => {
            if (this.game.state === GAME_STATES.PLAYING) {
                // Save current game state to localStorage
                this.saveGameState();
            }
        });
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Additional resize handling beyond canvas resizing
        this.checkOrientation();
    }
    
    /**
     * Check device orientation and show warning if needed
     */
    checkOrientation() {
        if (this.input.isMobileDevice()) {
            const isLandscape = window.innerWidth > window.innerHeight;
            
            // Get or create orientation warning
            let orientationWarning = document.getElementById('orientation-warning');
            
            if (!isLandscape) {
                // Create warning if it doesn't exist
                if (!orientationWarning) {
                    orientationWarning = document.createElement('div');
                    orientationWarning.id = 'orientation-warning';
                    orientationWarning.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 text-white text-center p-6';
                    orientationWarning.innerHTML = `
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 mx-auto mb-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h2 class="text-2xl font-bold mb-2">Rotate Your Device</h2>
                            <p>For the best gaming experience, please rotate your device to landscape mode.</p>
                        </div>
                    `;
                    document.body.appendChild(orientationWarning);
                } else {
                    orientationWarning.classList.remove('hidden');
                }
                
                // Pause game if playing
                if (this.game.state === GAME_STATES.PLAYING) {
                    this.game.setState(GAME_STATES.PAUSED);
                }
            } else if (orientationWarning) {
                orientationWarning.classList.add('hidden');
            }
        }
    }
    
    /**
     * Save current game state to localStorage
     */
    saveGameState() {
        if (!this.game.player) return;
        
        const gameState = {
            score: this.game.score,
            lives: this.game.player.lives,
            lane: this.game.player.lane,
            obstacles: this.game.obstacles.map(obs => ({
                lane: obs.lane,
                y: obs.y,
                type: obs.type
            })),
            powerUps: this.game.powerUps.map(pu => ({
                lane: pu.lane,
                y: pu.y,
                type: pu.type
            })),
            timeScale: this.game.timeScale,
            difficulty: this.game.difficulty
        };
        
        try {
            localStorage.setItem('gameState', JSON.stringify(gameState));
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }
    
    /**
     * Initialize the game
     */
    async init() {
        // Show loading indicator
        this.showLoadingIndicator();
        
        // Create notification system instance
        window.notificationSystem = new NotificationSystem();
        
        // Create game instance
        const gameEngine = new GameEngine(this.canvas, this.uiElements);
        window.gameEngine = gameEngine;
        
        // Initialize the game
        await this.game.init();
        
        // Hide loading indicator
        this.hideLoadingIndicator();
        
        // Check if mobile device and show appropriate controls
        this.checkMobileDevice();
        
        // Check orientation
        this.checkOrientation();
        
        // Register event handlers
        this.registerGameEvents();
        
        // Setup button event handlers for mobile UI
        this.setupButtonEvents();
    }
    
    /**
     * Register game event handlers
     */
    registerGameEvents() {
        // State change events
        this.game.on('stateChange', (newState, oldState) => {
            console.log(`Game state changed from ${oldState} to ${newState}`);
            
            // Update UI elements based on state
            if (newState === GAME_STATES.PLAYING) {
                // Show mobile controls for mobile devices
                if (this.input.isMobileDevice() && this.uiElements.mobileControls) {
                    this.uiElements.mobileControls.classList.remove('hidden');
                }
            } else if (newState === GAME_STATES.PAUSED) {
                // Hide mobile controls when paused
                if (this.uiElements.mobileControls) {
                    this.uiElements.mobileControls.classList.add('hidden');
                }
            }
        });
    }
    
    /**
     * Show loading indicator
     */
    showLoadingIndicator() {
        // Create loading indicator if it doesn't exist
        if (!document.getElementById('loading-indicator')) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'loading-indicator';
            loadingIndicator.className = 'fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-100';
            loadingIndicator.innerHTML = `
                <h2 class="text-2xl font-bold mb-4 text-white">Loading Game</h2>
                <div class="loading-spinner mb-4"></div>
                <div class="w-64 h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div class="progress-bar h-full bg-yellow-500 rounded-full" style="width: 0%"></div>
                </div>
                <p class="progress-text text-white">0%</p>
                <p class="loading-message text-white mt-2">Preparing game assets...</p>
            `;
            
            // Add spinner CSS
            const style = document.createElement('style');
            style.textContent = `
                .loading-spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: #ffc107;
                    animation: spin 1s ease-in-out infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(loadingIndicator);
        }
    }
    
    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            // Fade out animation
            loadingIndicator.style.transition = 'opacity 0.5s ease-in-out';
            loadingIndicator.style.opacity = '0';
            
            // Remove after animation
            setTimeout(() => {
                loadingIndicator.remove();
            }, 500);
        }
    }
    
    /**
     * Check if mobile device and show appropriate controls
     */
    checkMobileDevice() {
        if (this.input.isMobileDevice()) {
            if (this.uiElements.mobileControls) {
                // Initially hide, will be shown when game starts
                this.uiElements.mobileControls.classList.add('hidden');
            }
            
            // Add touch-specific classes to body
            document.body.classList.add('touch-device');
        }
    }
    
    /**
     * Setup button event handlers for mobile UI
     */
    setupButtonEvents() {
        // Mobile control buttons
        const leftButton = document.getElementById('left-button');
        const rightButton = document.getElementById('right-button');
        const accelerateButton = document.getElementById('accelerate-button');
        
        // Start and restart buttons
        const startButton = document.getElementById('start-button');
        const restartButton = document.getElementById('restart-button');
        
        // Settings buttons
        const settingsButton = document.getElementById('settings-button');
        const closeSettingsButton = document.getElementById('close-settings');
        const musicToggle = document.getElementById('music-toggle');
        const sfxToggle = document.getElementById('sfx-toggle');
        
        // Difficulty buttons
        const easyButton = document.getElementById('easy-button');
        const mediumButton = document.getElementById('medium-button');
        const hardButton = document.getElementById('hard-button');
        const extremeButton = document.getElementById('extreme-button');
        
        // Set up difficulty button handlers
        if (easyButton) {
            easyButton.addEventListener('click', () => {
                this.setActiveDifficultyButton(easyButton);
                this.game.setDifficulty('easy');
            });
        }
        
        if (mediumButton) {
            mediumButton.addEventListener('click', () => {
                this.setActiveDifficultyButton(mediumButton);
                this.game.setDifficulty('medium');
            });
            // Set medium as default
            this.setActiveDifficultyButton(mediumButton);
            this.game.setDifficulty('medium');
        }
        
        if (hardButton) {
            hardButton.addEventListener('click', () => {
                this.setActiveDifficultyButton(hardButton);
                this.game.setDifficulty('hard');
            });
        }
        
        if (extremeButton) {
            extremeButton.addEventListener('click', () => {
                this.setActiveDifficultyButton(extremeButton);
                this.game.setDifficulty('extreme');
            });
        }
        
        // Mobile control buttons
        // ... existing code ...
    }
    
    /**
     * Set active difficulty button
     * @param {HTMLElement} activeButton - The button to set as active
     */
    setActiveDifficultyButton(activeButton) {
        // Remove active class from all difficulty buttons
        const difficultyButtons = document.querySelectorAll('.difficulty-button');
        difficultyButtons.forEach(button => {
            button.classList.remove('active');
            button.style.opacity = '0.7';
            button.style.transform = 'scale(1)';
        });
        
        // Add active class to selected button
        activeButton.classList.add('active');
        activeButton.style.opacity = '1';
        activeButton.style.transform = 'scale(1.05)';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
}); 