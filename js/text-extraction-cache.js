// Text Extraction Cache - Optimized PDF text extraction with caching
class TextExtractionCache {
    constructor() {
        // Cache structure: Map<filePath, Map<pageNum, textContent>>
        this.textCache = new Map();
        // Cache PDF documents to avoid reloading
        this.pdfDocuments = new Map();
        // LRU tracking for cache eviction
        this.accessOrder = [];
        this.maxCacheSize = 100; // Maximum files to cache
        this.stats = {
            textCacheHits: 0,
            textCacheMisses: 0,
            pdfCacheHits: 0,
            pdfCacheMisses: 0,
            totalExtractions: 0
        };
    }

    /**
     * Get cached text content for a specific page
     * @param {Object} file - File object
     * @param {number} pageNum - Page number (1-indexed)
     * @returns {Object|null} - Cached text content or null
     */
    getCachedText(file, pageNum) {
        const key = this.getFileKey(file);
        
        if (this.textCache.has(key)) {
            const pageCache = this.textCache.get(key);
            if (pageCache.has(pageNum)) {
                this.stats.textCacheHits++;
                this.updateAccessOrder(key);
                console.log(`TextCache: HIT for ${file.name} page ${pageNum}`);
                return pageCache.get(pageNum);
            }
        }
        
        this.stats.textCacheMisses++;
        console.log(`TextCache: MISS for ${file.name} page ${pageNum}`);
        return null;
    }

    /**
     * Cache text content for a specific page
     * @param {Object} file - File object
     * @param {number} pageNum - Page number (1-indexed)
     * @param {Object} textContent - PDF.js text content object
     */
    cacheText(file, pageNum, textContent) {
        const key = this.getFileKey(file);
        
        if (!this.textCache.has(key)) {
            this.textCache.set(key, new Map());
        }
        
        this.textCache.get(key).set(pageNum, textContent);
        this.updateAccessOrder(key);
        this.evictIfNeeded();
        
        console.log(`TextCache: Cached text for ${file.name} page ${pageNum}`);
    }

    /**
     * Get or load PDF document with caching
     * @param {Object} file - File object
     * @returns {Promise<PDFDocument>} - PDF.js document
     */
    async getPdfDocument(file) {
        const key = this.getFileKey(file);
        
        if (this.pdfDocuments.has(key)) {
            this.stats.pdfCacheHits++;
            this.updateAccessOrder(key);
            console.log(`PDFCache: HIT for ${file.name}`);
            return this.pdfDocuments.get(key);
        }
        
        this.stats.pdfCacheMisses++;
        console.log(`PDFCache: MISS for ${file.name}, loading...`);
        
        // Get buffer from BufferManager if available
        let buffer = file.buffer;
        if (window.bufferManager) {
            buffer = window.bufferManager.getBuffer(file) || buffer;
        }
        
        if (!buffer) {
            throw new Error('No buffer available for PDF loading');
        }
        
        // Ensure buffer is Uint8Array
        if (!(buffer instanceof Uint8Array)) {
            buffer = new Uint8Array(buffer);
        }
        
        // Load PDF document
        const pdf = await window.pdfjsLib.getDocument({
            data: buffer,
            disableFontFace: true,
            disableRange: true,
            disableStream: true
        }).promise;
        
        this.pdfDocuments.set(key, pdf);
        this.updateAccessOrder(key);
        this.evictIfNeeded();
        
        console.log(`PDFCache: Loaded and cached ${file.name}`);
        return pdf;
    }

    /**
     * Extract text from a specific page with caching
     * @param {Object} file - File object
     * @param {number} pageNum - Page number (1-indexed)
     * @returns {Promise<Object>} - Text content object
     */
    async extractPageText(file, pageNum) {
        this.stats.totalExtractions++;
        
        // Check cache first
        const cached = this.getCachedText(file, pageNum);
        if (cached) {
            return cached;
        }
        
        // Extract text
        const pdf = await this.getPdfDocument(file);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Cache the result
        this.cacheText(file, pageNum, textContent);
        
        return textContent;
    }

    /**
     * Extract text from a position on a specific page
     * @param {Object} file - File object
     * @param {Object} position - Position object with page, x, y, width, height
     * @returns {Promise<string>} - Extracted text
     */
    async extractTextFromPosition(file, position) {
        if (!position || !position.page) {
            console.warn('Invalid position object');
            return '';
        }
        
        const textContent = await this.extractPageText(file, position.page);
        const pdf = await this.getPdfDocument(file);
        const page = await pdf.getPage(position.page);
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Adjust position for zoom if present
        const scaleAdjustment = position.zoom || 1.0;
        const selectionRect = {
            left: position.x / scaleAdjustment,
            top: position.y / scaleAdjustment,
            right: (position.x + position.width) / scaleAdjustment,
            bottom: (position.y + position.height) / scaleAdjustment
        };
        
        const extractedItems = [];
        const tolerance = 5;
        
        // Filter and extract text items
        for (const item of textContent.items) {
            const transform = item.transform;
            const x = transform[4];
            const y = viewport.height - transform[5];
            const width = item.width;
            const height = item.height;
            
            const itemRect = {
                left: x,
                top: y - height,
                right: x + width,
                bottom: y
            };
            
            // Check intersection with tolerance
            if (this.rectanglesIntersect(selectionRect, itemRect, tolerance)) {
                extractedItems.push({
                    text: item.str,
                    x: x,
                    y: y
                });
            }
        }
        
        // Sort by position (top to bottom, left to right)
        extractedItems.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 5) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });
        
        const extractedText = extractedItems.map(item => item.text).join(' ').trim();
        console.log(`Extracted ${extractedItems.length} text items: "${extractedText}"`);
        
        return extractedText;
    }

    /**
     * Check if two rectangles intersect with tolerance
     * @param {Object} rect1 - First rectangle
     * @param {Object} rect2 - Second rectangle
     * @param {number} tolerance - Tolerance in pixels
     * @returns {boolean} - True if intersecting
     */
    rectanglesIntersect(rect1, rect2, tolerance = 5) {
        const expandedRect1 = {
            left: rect1.left - tolerance,
            top: rect1.top - tolerance,
            right: rect1.right + tolerance,
            bottom: rect1.bottom + tolerance
        };
        
        return !(expandedRect1.right < rect2.left || 
                expandedRect1.left > rect2.right || 
                expandedRect1.bottom < rect2.top || 
                expandedRect1.top > rect2.bottom);
    }

    /**
     * Get file cache key
     * @param {Object} file - File object
     * @returns {string} - Cache key
     */
    getFileKey(file) {
        return file.path || file.name;
    }

    /**
     * Update LRU access order
     * @param {string} key - File key
     */
    updateAccessOrder(key) {
        // Remove existing entry
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        // Add to end (most recently used)
        this.accessOrder.push(key);
    }

    /**
     * Evict least recently used items if cache is full
     */
    evictIfNeeded() {
        while (this.accessOrder.length > this.maxCacheSize) {
            const keyToEvict = this.accessOrder.shift();
            this.textCache.delete(keyToEvict);
            this.pdfDocuments.delete(keyToEvict);
            console.log(`TextCache: Evicted ${keyToEvict} (LRU)`);
        }
    }

    /**
     * Clear all caches
     */
    clear() {
        this.textCache.clear();
        this.pdfDocuments.clear();
        this.accessOrder = [];
        console.log('TextExtractionCache: All caches cleared');
    }

    /**
     * Clear cache for specific file
     * @param {Object} file - File object
     */
    clearFile(file) {
        const key = this.getFileKey(file);
        this.textCache.delete(key);
        this.pdfDocuments.delete(key);
        
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        
        console.log(`TextCache: Cleared cache for ${file.name}`);
    }

    /**
     * Get cache statistics
     * @returns {Object} - Statistics
     */
    getStats() {
        const textHitRate = this.stats.textCacheHits + this.stats.textCacheMisses > 0
            ? ((this.stats.textCacheHits / (this.stats.textCacheHits + this.stats.textCacheMisses)) * 100).toFixed(2)
            : 0;
        
        const pdfHitRate = this.stats.pdfCacheHits + this.stats.pdfCacheMisses > 0
            ? ((this.stats.pdfCacheHits / (this.stats.pdfCacheHits + this.stats.pdfCacheMisses)) * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            textHitRate: `${textHitRate}%`,
            pdfHitRate: `${pdfHitRate}%`,
            cachedFiles: this.accessOrder.length,
            cachedPages: Array.from(this.textCache.values()).reduce((sum, map) => sum + map.size, 0)
        };
    }

    /**
     * Log statistics
     */
    logStats() {
        const stats = this.getStats();
        console.log('=== TextExtractionCache Statistics ===');
        console.log(`Text Cache Hits: ${stats.textCacheHits} (${stats.textHitRate})`);
        console.log(`Text Cache Misses: ${stats.textCacheMisses}`);
        console.log(`PDF Cache Hits: ${stats.pdfCacheHits} (${stats.pdfHitRate})`);
        console.log(`PDF Cache Misses: ${stats.pdfCacheMisses}`);
        console.log(`Total Extractions: ${stats.totalExtractions}`);
        console.log(`Cached Files: ${stats.cachedFiles}`);
        console.log(`Cached Pages: ${stats.cachedPages}`);
        console.log('======================================');
    }
}

// Create singleton instance
const textExtractionCache = new TextExtractionCache();
window.textExtractionCache = textExtractionCache;

console.log('TextExtractionCache initialized and ready');

