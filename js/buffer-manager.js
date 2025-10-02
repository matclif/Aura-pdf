// Buffer Manager - Centralized buffer management to prevent memory leaks
class BufferManager {
    constructor() {
        // Use WeakMap for automatic garbage collection when file objects are removed
        this.buffers = new WeakMap();
        this.stats = {
            hits: 0,
            misses: 0,
            totalBuffersCreated: 0
        };
    }

    /**
     * Get buffer for a file, returns cached version if available
     * @param {Object} file - File object
     * @returns {Uint8Array|null} - Buffer or null if not found
     */
    getBuffer(file) {
        if (this.buffers.has(file)) {
            this.stats.hits++;
            console.log(`BufferManager: Cache HIT for ${file.name} (${this.stats.hits} hits, ${this.stats.misses} misses)`);
            return this.buffers.get(file);
        }
        
        this.stats.misses++;
        console.log(`BufferManager: Cache MISS for ${file.name} (${this.stats.hits} hits, ${this.stats.misses} misses)`);
        return null;
    }

    /**
     * Store buffer for a file (single source of truth)
     * @param {Object} file - File object
     * @param {ArrayBuffer|Uint8Array|Array} buffer - Buffer data
     * @returns {Uint8Array} - Normalized Uint8Array buffer
     */
    setBuffer(file, buffer) {
        // Normalize buffer to Uint8Array (single format)
        let normalizedBuffer;
        
        if (buffer instanceof Uint8Array) {
            normalizedBuffer = buffer;
        } else if (buffer instanceof ArrayBuffer) {
            normalizedBuffer = new Uint8Array(buffer);
        } else if (Array.isArray(buffer)) {
            normalizedBuffer = new Uint8Array(buffer);
        } else if (buffer && buffer.buffer instanceof ArrayBuffer) {
            // Handle TypedArray views
            normalizedBuffer = new Uint8Array(buffer.buffer);
        } else {
            console.error('BufferManager: Invalid buffer type:', buffer?.constructor?.name);
            throw new Error('Invalid buffer format');
        }

        this.buffers.set(file, normalizedBuffer);
        this.stats.totalBuffersCreated++;
        
        console.log(`BufferManager: Stored buffer for ${file.name} (${normalizedBuffer.length} bytes, total: ${this.stats.totalBuffersCreated})`);
        return normalizedBuffer;
    }

    /**
     * Get or create buffer for a file
     * @param {Object} file - File object
     * @param {Function} loaderFn - Async function to load buffer if not cached
     * @returns {Promise<Uint8Array>} - Buffer
     */
    async getOrLoad(file, loaderFn) {
        const cached = this.getBuffer(file);
        if (cached) {
            return cached;
        }

        console.log(`BufferManager: Loading buffer for ${file.name}...`);
        const buffer = await loaderFn();
        return this.setBuffer(file, buffer);
    }

    /**
     * Create a safe copy of a buffer for operations that might detach it
     * @param {Uint8Array} buffer - Original buffer
     * @returns {Uint8Array} - Cloned buffer
     */
    cloneBuffer(buffer) {
        if (!(buffer instanceof Uint8Array)) {
            console.error('BufferManager: Cannot clone non-Uint8Array buffer');
            return buffer;
        }
        
        return new Uint8Array(buffer.slice(0));
    }

    /**
     * Get buffer statistics
     * @returns {Object} - Statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            efficiency: hitRate > 80 ? 'Excellent' : hitRate > 50 ? 'Good' : 'Poor'
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            totalBuffersCreated: 0
        };
        console.log('BufferManager: Statistics reset');
    }

    /**
     * Log current statistics
     */
    logStats() {
        const stats = this.getStats();
        console.log('=== BufferManager Statistics ===');
        console.log(`Cache Hits: ${stats.hits}`);
        console.log(`Cache Misses: ${stats.misses}`);
        console.log(`Hit Rate: ${stats.hitRate} (${stats.efficiency})`);
        console.log(`Total Buffers Created: ${stats.totalBuffersCreated}`);
        console.log('===============================');
    }
}

// Create singleton instance
const bufferManager = new BufferManager();
window.bufferManager = bufferManager;

console.log('BufferManager initialized and ready');

