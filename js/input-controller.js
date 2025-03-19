// Input controller
export class InputController {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchStartY = 0;
        this.touchEndY = 0;
        this.touchStartTime = 0;
        this.keyState = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            Escape: false
        };
        
        // Set up event handlers
        this.setupKeyboardEvents();
        this.setupTouchEvents();
        this.setupButtonEvents();
    }
    
    /**
     * Set up keyboard event handlers
     */
    setupKeyboardEvents() {
        // Handle key down events
        document.addEventListener('keydown', (e) => {
            // Update key state
            if (e.key in this.keyState) {
                if (this.keyState[e.key] === false) { // Only process first press
                    this.keyState[e.key] = true;
                    
                    // Handle Escape key for pause regardless of game state
                    if (e.key === 'Escape') {
                        if (this.game.state === 'playing') {
                            this.game.setState('paused');
                        } else if (this.game.state === 'paused') {
                            // Resume the game
                            if (typeof this.game.resumeGame === 'function') {
                                this.game.resumeGame();
                            } else {
                                this.game.setState('playing');
                            }
                        }
                        return;
                    }
                    
                    // Only process movement keys if game is playing
                    if (this.game.state !== 'playing') return;
                    
                    switch (e.key) {
                        case 'ArrowLeft':
                            this.game.handleInput('left');
                            break;
                        case 'ArrowRight':
                            this.game.handleInput('right');
                            break;
                        case 'ArrowUp':
                            this.game.handleInput('accelerate');
                            break;
                    }
                }
            }
        });
        
        // Handle key up events
        document.addEventListener('keyup', (e) => {
            // Update key state
            if (e.key in this.keyState) {
                this.keyState[e.key] = false;
            }
            
            // Handle acceleration end
            if (e.key === 'ArrowUp' && this.game.state === 'playing') {
                this.game.handleInput('decelerate');
            }
        });
    }
    
    /**
     * Set up touch event handlers for mobile
     */
    setupTouchEvents() {
        const canvas = this.game.canvas;
        const swipeThreshold = 50; // Minimum distance for a swipe to be registered
        
        // Touch start
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
            this.touchStartTime = Date.now();
        }, { passive: false });
        
        // Touch move (for drag gestures)
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling
            
            if (this.game.state !== 'playing') return;
            
            const currentX = e.changedTouches[0].screenX;
            const diffX = currentX - this.touchStartX;
            
            // If moving significantly horizontally, update lane
            if (Math.abs(diffX) > swipeThreshold) {
                // Check if this is a new lane change (not continuous)
                const targetLane = diffX > 0 ? 
                    Math.min(this.game.player.lane + 1, GAME_CONFIG.LANE_COUNT - 1) : 
                    Math.max(this.game.player.lane - 1, 0);
                
                if (targetLane !== this.game.player.targetLane) {
                    if (diffX > 0) {
                        this.game.handleInput('right');
                    } else {
                        this.game.handleInput('left');
                    }
                    // Reset start position after lane change
                    this.touchStartX = currentX;
                }
            }
        }, { passive: false });
        
        // Touch end
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent scrolling
            
            this.touchEndX = e.changedTouches[0].screenX;
            this.touchEndY = e.changedTouches[0].screenY;
            const touchDuration = Date.now() - this.touchStartTime;
            
            // Handle touch events based on game state
            if (this.game.state === 'playing') {
                this.handleGameplayTouch(touchDuration);
            } else if (this.game.state === 'menu' || this.game.state === 'gameOver') {
                this.handleMenuTouch();
            } else if (this.game.state === 'paused') {
                this.handlePausedTouch();
            }
        }, { passive: false });
        
        // Double tap to pause/unpause
        let lastTap = 0;
        canvas.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 300 && tapLength > 0) {
                // Double tap detected
                e.preventDefault();
                
                // Toggle pause state
                if (this.game.state === 'playing') {
                    this.game.setState('paused');
                } else if (this.game.state === 'paused') {
                    if (typeof this.game.resumeGame === 'function') {
                        this.game.resumeGame();
                    } else {
                        this.game.setState('playing');
                    }
                }
            }
            
            lastTap = currentTime;
        });
    }
    
    /**
     * Handle touch input during gameplay
     * @param {number} touchDuration - Duration of the touch in milliseconds
     */
    handleGameplayTouch(touchDuration) {
        const swipeThreshold = 50;
        const dx = this.touchEndX - this.touchStartX;
        const dy = this.touchEndY - this.touchStartY;
        const swipeDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if swipe or tap
        if (swipeDistance > swipeThreshold) {
            // It's a swipe, check direction
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal swipe
                if (dx > 0) {
                    this.game.handleInput('right');
                } else {
                    this.game.handleInput('left');
                }
            } else {
                // Vertical swipe
                if (dy < 0) {
                    // Swipe up - accelerate
                    this.game.handleInput('accelerate');
                    
                    // Auto-decelerate after a short period
                    setTimeout(() => {
                        this.game.handleInput('decelerate');
                    }, 500);
                } else {
                    // Swipe down - brake or pause
                    this.game.setState('paused');
                }
            }
        } else if (touchDuration < 300) {
            // Short tap - accelerate
            this.game.handleInput('accelerate');
            
            // Auto-decelerate after a short period
            setTimeout(() => {
                this.game.handleInput('decelerate');
            }, 500);
        } else {
            // Long press - continuous acceleration
            this.game.handleInput('accelerate');
            
            // Auto-decelerate after a longer period
            setTimeout(() => {
                this.game.handleInput('decelerate');
            }, 1000);
        }
    }
    
    /**
     * Handle touch input on menu screens
     */
    handleMenuTouch() {
        // Simple tap to start game
        const swipeThreshold = 50;
        const dx = this.touchEndX - this.touchStartX;
        const dy = this.touchEndY - this.touchStartY;
        const swipeDistance = Math.sqrt(dx * dx + dy * dy);
        
        if (swipeDistance < swipeThreshold) {
            // It's a tap, try to click the start button
            const startButton = document.getElementById('start-button');
            const restartButton = document.getElementById('restart-button');
            
            if (this.game.state === 'menu' && startButton) {
                startButton.click();
            } else if (this.game.state === 'gameOver' && restartButton) {
                restartButton.click();
            }
        }
    }
    
    /**
     * Handle touch input when game is paused
     */
    handlePausedTouch() {
        // Simple tap to resume game
        const swipeThreshold = 50;
        const dx = this.touchEndX - this.touchStartX;
        const dy = this.touchEndY - this.touchStartY;
        const swipeDistance = Math.sqrt(dx * dx + dy * dy);
        
        if (swipeDistance < swipeThreshold) {
            // It's a tap, try to click the resume button
            const resumeButton = document.getElementById('resume-button');
            
            if (resumeButton) {
                resumeButton.click();
            } else if (typeof this.game.resumeGame === 'function') {
                this.game.resumeGame();
            } else {
                this.game.setState('playing');
            }
        }
    }
    
    /**
     * Set up button event handlers for mobile UI
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
        
        // Mobile control buttons
        if (leftButton) {
            leftButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.state === 'playing') {
                    this.game.handleInput('left');
                }
            }, { passive: false });
            
            leftButton.addEventListener('mousedown', () => {
                if (this.game.state === 'playing') {
                    this.game.handleInput('left');
                }
            });
        }
        
        if (rightButton) {
            rightButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.state === 'playing') {
                    this.game.handleInput('right');
                }
            }, { passive: false });
            
            rightButton.addEventListener('mousedown', () => {
                if (this.game.state === 'playing') {
                    this.game.handleInput('right');
                }
            });
        }
        
        if (accelerateButton) {
            // Touch events
            accelerateButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.game.state === 'playing') {
                    this.game.handleInput('accelerate');
                }
            }, { passive: false });
            
            accelerateButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (this.game.state === 'playing') {
                    this.game.handleInput('decelerate');
                }
            }, { passive: false });
            
            // Mouse events
            accelerateButton.addEventListener('mousedown', () => {
                if (this.game.state === 'playing') {
                    this.game.handleInput('accelerate');
                }
            });
            
            accelerateButton.addEventListener('mouseup', () => {
                if (this.game.state === 'playing') {
                    this.game.handleInput('decelerate');
                }
            });
            
            accelerateButton.addEventListener('mouseleave', () => {
                if (this.game.state === 'playing') {
                    this.game.handleInput('decelerate');
                }
            });
        }
        
        // Start and restart buttons
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.game.setState('playing');
            });
        }
        
        if (restartButton) {
            restartButton.addEventListener('click', () => {
                this.game.setState('playing');
            });
        }
        
        // Settings controls
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                this.toggleSettings();
            });
        }
        
        if (closeSettingsButton) {
            closeSettingsButton.addEventListener('click', () => {
                this.toggleSettings();
            });
        }
        
        if (musicToggle) {
            musicToggle.addEventListener('change', () => {
                this.game.toggleMusic(musicToggle.checked);
            });
        }
        
        if (sfxToggle) {
            sfxToggle.addEventListener('change', () => {
                this.game.toggleSfx(sfxToggle.checked);
            });
        }
        
        // Add pause button for mobile
        this.createPauseButton();
    }
    
    /**
     * Create a pause button for mobile devices
     */
    createPauseButton() {
        if (this.isMobileDevice() && !document.getElementById('pause-button')) {
            const pauseButton = document.createElement('button');
            pauseButton.id = 'pause-button';
            pauseButton.className = 'absolute top-4 left-4 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full z-30 hidden';
            pauseButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            `;
            
            document.getElementById('game-container').appendChild(pauseButton);
            
            pauseButton.addEventListener('click', () => {
                if (this.game.state === 'playing') {
                    this.game.setState('paused');
                }
            });
            
            // Show pause button when game is playing
            this.game.on('stateChange', (newState) => {
                if (newState === 'playing') {
                    pauseButton.classList.remove('hidden');
                } else {
                    pauseButton.classList.add('hidden');
                }
            });
        }
    }
    
    /**
     * Toggle settings panel visibility
     */
    toggleSettings() {
        const settingsPanel = document.getElementById('settings-panel');
        
        if (settingsPanel) {
            const isOpen = settingsPanel.style.transform === 'translateY(0px)';
            settingsPanel.style.transform = isOpen ? '' : 'translateY(0px)';
        }
    }
    
    /**
     * Detect if the device is a mobile/touch device
     * @returns {boolean} True if the device supports touch
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0);
    }
} 