// PDF.js Loader - Robust PDF.js initialization with retry mechanism
class PDFLibManager {
    constructor() {
        this.ready = false;
        this.loading = false;
        this.loadPromise = null;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        
        // Multiple CDN fallbacks with both HTTPS and HTTP
        this.fallbackUrls = [
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
            'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
            'http://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
            'http://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
        ];
        
        this.workerUrls = [
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
            'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
            'http://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
            'http://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
        ];
    }

    /**
     * Initialize PDF.js with retry mechanism
     * @returns {Promise<boolean>} - True if loaded successfully
     */
    async initialize() {
        if (this.ready) {
            console.log('PDFLibManager: Already initialized');
            return true;
        }

        if (this.loading) {
            console.log('PDFLibManager: Already loading, waiting...');
            return this.loadPromise;
        }

        this.loading = true;
        this.loadPromise = this._initializeInternal();
        
        try {
            const result = await this.loadPromise;
            this.ready = result;
            return result;
        } finally {
            this.loading = false;
        }
    }

    /**
     * Internal initialization logic
     * @private
     */
    async _initializeInternal() {
        console.log('PDFLibManager: Starting initialization...');
        
        // Check if PDF.js is already loaded
        if (window.pdfjsLib) {
            console.log('PDFLibManager: PDF.js already available');
            this._configureWorker();
            return true;
        }

        // Try each CDN URL with retries
        for (const url of this.fallbackUrls) {
            for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
                try {
                    console.log(`PDFLibManager: Attempting to load from ${url} (attempt ${attempt}/${this.maxRetries})`);
                    
                    await this._loadScript(url);
                    
                    if (window.pdfjsLib) {
                        console.log(`✅ PDFLibManager: Successfully loaded from ${url}`);
                        this._configureWorker();
                        return true;
                    }
                    
                    console.warn(`PDFLibManager: Script loaded but pdfjsLib not available from ${url}`);
                    
                } catch (error) {
                    console.warn(`PDFLibManager: Failed to load from ${url} (attempt ${attempt}/${this.maxRetries}):`, error.message);
                    
                    // Exponential backoff before retry
                    if (attempt < this.maxRetries) {
                        const delay = 1000 * Math.pow(2, attempt - 1);
                        console.log(`PDFLibManager: Waiting ${delay}ms before retry...`);
                        await this._sleep(delay);
                    }
                }
            }
        }

        console.error('❌ PDFLibManager: Failed to load PDF.js from all sources');
        return false;
    }

    /**
     * Configure PDF.js worker
     * @private
     */
    _configureWorker() {
        if (!window.pdfjsLib) return;

        // Try to set worker from our fallback URLs
        for (const workerUrl of this.workerUrls) {
            try {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
                console.log(`PDFLibManager: Worker configured with ${workerUrl}`);
                break;
            } catch (error) {
                console.warn(`PDFLibManager: Failed to configure worker with ${workerUrl}:`, error.message);
            }
        }
    }

    /**
     * Load a script dynamically
     * @private
     * @param {string} url - Script URL
     * @returns {Promise<void>}
     */
    _loadScript(url) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            const existing = document.querySelector(`script[src="${url}"]`);
            if (existing) {
                console.log(`PDFLibManager: Script already exists for ${url}`);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.crossOrigin = 'anonymous';
            
            // Set timeout for loading
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error(`Timeout loading script from ${url}`));
            }, 15000); // 15 second timeout

            script.onload = () => {
                clearTimeout(timeout);
                console.log(`PDFLibManager: Script loaded from ${url}`);
                resolve();
            };

            script.onerror = (error) => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error(`Failed to load script from ${url}: ${error.message || 'Unknown error'}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Sleep for specified milliseconds
     * @private
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Wait for PDF.js to be ready
     * @param {number} timeout - Timeout in milliseconds (default: 30000)
     * @returns {Promise<boolean>} - True if ready
     */
    async waitForReady(timeout = 30000) {
        if (this.ready) {
            return true;
        }

        const startTime = Date.now();
        
        while (!this.ready && (Date.now() - startTime) < timeout) {
            if (!this.loading && !this.loadPromise) {
                // Not loading yet, start initialization
                await this.initialize();
            } else {
                // Wait for current loading to complete
                await this._sleep(100);
            }
        }

        if (!this.ready) {
            throw new Error(`PDF.js failed to load within ${timeout}ms`);
        }

        return this.ready;
    }

    /**
     * Check if PDF.js is ready
     * @returns {boolean}
     */
    isReady() {
        return this.ready && !!window.pdfjsLib;
    }

    /**
     * Get PDF.js instance
     * @returns {Object|null} - PDF.js library or null
     */
    getPDFLib() {
        if (!this.ready || !window.pdfjsLib) {
            console.warn('PDFLibManager: PDF.js not ready');
            return null;
        }
        return window.pdfjsLib;
    }

    /**
     * Reload PDF.js (force reinitialization)
     * @returns {Promise<boolean>}
     */
    async reload() {
        console.log('PDFLibManager: Forcing reload...');
        this.ready = false;
        this.loading = false;
        this.loadPromise = null;
        this.retryAttempts = 0;
        
        // Remove existing scripts
        const scripts = document.querySelectorAll('script[src*="pdfjs-dist"]');
        scripts.forEach(script => script.remove());
        
        // Clear window.pdfjsLib
        if (window.pdfjsLib) {
            delete window.pdfjsLib;
        }
        
        return this.initialize();
    }

    /**
     * Get status information
     * @returns {Object}
     */
    getStatus() {
        return {
            ready: this.ready,
            loading: this.loading,
            available: !!window.pdfjsLib,
            retryAttempts: this.retryAttempts
        };
    }

    /**
     * Log status
     */
    logStatus() {
        const status = this.getStatus();
        console.log('=== PDFLibManager Status ===');
        console.log(`Ready: ${status.ready}`);
        console.log(`Loading: ${status.loading}`);
        console.log(`Available: ${status.available}`);
        console.log(`Retry Attempts: ${status.retryAttempts}`);
        console.log('===========================');
    }
}

// Create singleton instance and auto-initialize
const pdfLibManager = new PDFLibManager();
window.pdfLibManager = pdfLibManager;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('PDFLibManager: DOM ready, initializing...');
        pdfLibManager.initialize().then(success => {
            if (success) {
                console.log('✅ PDFLibManager: Initialization successful');
            } else {
                console.error('❌ PDFLibManager: Initialization failed');
            }
        });
    });
} else {
    // DOM already ready, initialize immediately
    console.log('PDFLibManager: DOM already ready, initializing...');
    pdfLibManager.initialize().then(success => {
        if (success) {
            console.log('✅ PDFLibManager: Initialization successful');
        } else {
            console.error('❌ PDFLibManager: Initialization failed');
        }
    });
}

console.log('PDFLibManager loaded and ready to initialize');

