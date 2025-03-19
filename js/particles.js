// Particle system for visual effects
import { randomNumber } from './utility.js';
import { GAME_CONFIG } from './constants.js';

export class ParticleSystem {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];
        this.emitters = [];
    }
    
    /**
     * Create a particle emitter
     * @param {Object} config - Emitter configuration
     * @param {number} config.x - X position
     * @param {number} config.y - Y position
     * @param {number} config.count - Number of particles to emit
     * @param {Object} config.speed - Speed range {min, max}
     * @param {Object} config.size - Size range {min, max}
     * @param {Object} config.lifetime - Lifetime range {min, max}
     * @param {string[]} config.colors - Array of colors
     * @param {number} config.gravity - Gravity effect
     * @param {boolean} config.oneShot - Whether to emit particles once or continuously
     * @returns {Object} Emitter reference
     */
    createEmitter(config) {
        const emitter = {
            x: config.x || 0,
            y: config.y || 0,
            count: config.count || 10,
            speed: config.speed || { min: 20, max: 50 },
            size: config.size || { min: 2, max: 5 },
            lifetime: config.lifetime || { min: 500, max: 1000 },
            colors: config.colors || ['#ffffff'],
            gravity: config.gravity || 0,
            oneShot: config.oneShot !== undefined ? config.oneShot : true,
            active: true,
            lastEmitTime: 0,
            emitInterval: config.emitInterval || 200
        };
        
        this.emitters.push(emitter);
        
        if (emitter.oneShot) {
            this.emit(emitter);
        }
        
        return emitter;
    }
    
    /**
     * Emit particles from an emitter
     * @param {Object} emitter - The emitter to emit from
     */
    emit(emitter) {
        if (!emitter.active) return;
        
        // Create particles
        for (let i = 0; i < emitter.count; i++) {
            // Don't exceed the max particles limit
            if (this.particles.length >= GAME_CONFIG.MAX_PARTICLES) {
                // Remove oldest particle
                this.particles.shift();
            }
            
            const angle = Math.random() * Math.PI * 2;
            const speed = randomNumber(emitter.speed.min, emitter.speed.max);
            const size = randomNumber(emitter.size.min, emitter.size.max);
            const lifetime = randomNumber(emitter.lifetime.min, emitter.lifetime.max);
            const color = emitter.colors[Math.floor(Math.random() * emitter.colors.length)];
            
            this.particles.push({
                x: emitter.x,
                y: emitter.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color,
                lifetime,
                age: 0,
                gravity: emitter.gravity
            });
        }
    }
    
    /**
     * Create a one-time particle explosion
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} config - Explosion configuration
     */
    explosion(x, y, config) {
        this.createEmitter({
            x,
            y,
            ...config,
            oneShot: true
        });
    }
    
    /**
     * Update all particles and emitters
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        // Update emitters
        for (let i = this.emitters.length - 1; i >= 0; i--) {
            const emitter = this.emitters[i];
            
            if (!emitter.oneShot && emitter.active) {
                emitter.lastEmitTime += delta * 1000;
                
                if (emitter.lastEmitTime >= emitter.emitInterval) {
                    this.emit(emitter);
                    emitter.lastEmitTime = 0;
                }
            }
            
            // Remove inactive one-shot emitters
            if (emitter.oneShot && !this.particles.some(p => p.emitterIndex === i)) {
                this.emitters.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Apply gravity
            particle.vy += particle.gravity * delta;
            
            // Move particle
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            
            // Age particle
            particle.age += delta * 1000;
            
            // Remove dead particles
            if (particle.age >= particle.lifetime) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Draw all particles
     */
    draw() {
        this.ctx.save();
        
        // Use additive blending for glow effect
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Draw each particle
        for (const particle of this.particles) {
            const opacity = 1 - (particle.age / particle.lifetime);
            
            this.ctx.globalAlpha = opacity;
            this.ctx.fillStyle = particle.color;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    /**
     * Clear all particles and emitters
     */
    clear() {
        this.particles = [];
        this.emitters = [];
    }
    
    /**
     * Stop an emitter
     * @param {Object} emitter - The emitter to stop
     */
    stopEmitter(emitter) {
        emitter.active = false;
    }
} 