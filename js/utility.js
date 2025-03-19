// Utility functions for the game

/**
 * Generate a random number between min and max (inclusive)
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} A random number between min and max
 */
export function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if two objects are colliding using simple AABB collision detection
 * @param {Object} object1 - First object with x, y, width, height properties
 * @param {Object} object2 - Second object with x, y, width, height properties
 * @returns {boolean} True if objects are colliding
 */
export function checkCollision(object1, object2) {
    return (
        object1.x < object2.x + object2.width &&
        object1.x + object1.width > object2.x &&
        object1.y < object2.y + object2.height &&
        object1.y + object1.height > object2.y
    );
}

/**
 * Linear interpolation between two values
 * @param {number} start - The start value
 * @param {number} end - The end value
 * @param {number} t - The interpolation factor (0-1)
 * @returns {number} The interpolated value
 */
export function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

/**
 * Clamp a value between min and max
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number} The clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/**
 * Format a number with thousands separators
 * @param {number} num - The number to format
 * @returns {string} The formatted number
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Load an image
 * @param {string} src - The source URL of the image
 * @returns {Promise<HTMLImageElement>} A promise that resolves to the loaded image
 */
export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

/**
 * Load an audio file
 * @param {string} src - The source URL of the audio file
 * @returns {Promise<AudioBuffer>} A promise that resolves to the loaded audio
 */
export function loadAudio(src, howl) {
    return new Promise((resolve) => {
        // Using Howler.js for audio
        const sound = new howl({
            src: [src],
            onload: () => resolve(sound),
            onloaderror: (id, error) => {
                console.error(`Error loading sound ${src}:`, error);
                // Resolve with null to continue even if audio fails to load
                resolve(null);
            }
        });
    });
}

/**
 * Preload multiple assets (images and audio)
 * @param {Object} assets - Object containing asset paths
 * @param {Function} progressCallback - Callback for loading progress
 * @returns {Promise<Object>} Object containing loaded assets
 */
export function preloadAssets(assets, howl, progressCallback = () => {}) {
    const totalAssets = Object.keys(assets.images || {}).length + 
                       Object.keys(assets.audio || {}).length;
    let loadedAssets = 0;
    
    // Create promise for each asset
    const imagePromises = Object.entries(assets.images || {}).map(([key, src]) => {
        return loadImage(src).then(img => {
            loadedAssets++;
            progressCallback(loadedAssets / totalAssets);
            return [key, img];
        }).catch(error => {
            console.error(error);
            loadedAssets++;
            progressCallback(loadedAssets / totalAssets);
            return [key, null];
        });
    });
    
    const audioPromises = Object.entries(assets.audio || {}).map(([key, src]) => {
        return loadAudio(src, howl).then(audio => {
            loadedAssets++;
            progressCallback(loadedAssets / totalAssets);
            return [key, audio];
        });
    });
    
    // Combine all promises
    return Promise.all([...imagePromises, ...audioPromises]).then(results => {
        const loadedAssets = {
            images: {},
            audio: {}
        };
        
        // Separate results into images and audio
        results.forEach(([key, asset]) => {
            if (asset instanceof HTMLImageElement) {
                loadedAssets.images[key] = asset;
            } else if (asset !== null) {
                loadedAssets.audio[key] = asset;
            }
        });
        
        return loadedAssets;
    });
}

/**
 * Save data to localStorage
 * @param {string} key - The key to save under
 * @param {any} data - The data to save
 */
export function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/**
 * Load data from localStorage
 * @param {string} key - The key to load from
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any} The loaded data
 */
export function loadFromLocalStorage(key, defaultValue) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Create a debounced function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} The debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Calculate distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} The distance between the points
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
} 