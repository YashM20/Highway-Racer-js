# Highway Racer

A modern HTML5 Canvas racing game where you need to avoid obstacles and survive as long as possible on a busy highway.

## Features

- Smooth gameplay with optimized performance
- Mobile and desktop support with responsive design
- Multiple obstacle types with varied collision mechanics
- Advanced power-up system with smart spawning logic
- Dynamic particle effects with trail systems
- Progressive difficulty with balanced challenges
- Local high score tracking and achievement notifications
- Sound effects and music with fallback options
- Settings customization and game difficulty presets
- Modern UI with stats display and visual feedback
- Pause functionality and touch gesture controls

## How to Play

- Use **Arrow Keys** or **Swipe** to change lanes
- Press **Up Arrow** or **Tap** to accelerate
- Press **Escape** to pause the game
- Collect power-ups to gain advantages
- Avoid obstacles to survive longer
- Your score increases with distance traveled

## Game Mechanics

### Power-ups

- **Shield**: Temporary invincibility with visual effects
- **Slow Motion**: Slows down obstacles for easier navigation
- **Extra Life**: Adds a life with increased spawn rate when needed
- **Double Score**: Doubles points earned for a limited time

### Advanced Spawning System

The game uses an intelligent spawning system for power-ups and obstacles:
- Power-ups spawn in safe lanes away from obstacles
- Shield and heart power-ups have higher priority when player needs them
- Obstacles are placed with safe distances to ensure fair gameplay
- Dynamic spawn rates based on player performance and needs

### Difficulty Progression

The game automatically increases in difficulty over time:
- Obstacles spawn more frequently
- Score multiplier increases
- Vehicle speed increases
- Multiple difficulty presets: Easy, Medium, Hard, and Extreme

## Game Structure

The game has been developed with a modular architecture for maintainability and extensibility:

### Directory Structure

```
├── index.html       # Main HTML file
├── css/
│   ├── styles.css       # Game styles
│   └── notifications.css # Notification system styles
├── js/
│   ├── app.js           # Main application entry point
│   ├── constants.js     # Game configuration constants
│   ├── game-engine.js   # Core game engine
│   ├── game-objects.js  # Game object classes (player, obstacles, etc.)
│   ├── input-controller.js # User input handling
│   ├── notification.js  # In-game notification system
│   ├── particles.js     # Particle system for visual effects
│   └── utility.js       # Helper functions
└── assets/
    ├── audio/       # Game sound effects and music with placeholders
    └── images/      # Game sprites and textures
```

### Technical Implementation

- Uses HTML5 Canvas for rendering
- ES6 modules for code organization
- Howler.js for audio management with fallback placeholders
- Tailwind CSS for responsive styling
- Event-driven architecture with state management
- Object-oriented approach with inheritance
- Frame-rate independent game loop
- Asset preloading system with progress tracking
- Touch gesture detection for mobile devices
- Local storage for saving game progress and preferences

### Visual Enhancements

- Dynamic particle trails for important power-ups
- Glowing effects and visual feedback
- Stats display with icons in the corner
- Smooth transitions and animations
- Responsive design that works on various devices
- Pause menu with game options

## Credits

- **Development**: Advanced HTML5 Car Racing Game
- **Sound Effects**: Using Howler.js with placeholder fallbacks
- **Graphics**: Custom designed with fallback to basic shapes
- **UI Framework**: Tailwind CSS for modern interface

## License

MIT License 