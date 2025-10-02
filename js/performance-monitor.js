// Performance Monitor - Track and log performance metrics
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fileOperations: [],
            bulkRenames: [],
            textExtractions: [],
            pdfLoads: []
        };
        this.enabled = true;
    }

    /**
     * Start tracking an operation
     * @param {string} operation - Operation name
     * @param {Object} metadata - Optional metadata
     * @returns {string} - Operation ID
     */
    startOperation(operation, metadata = {}) {
        if (!this.enabled) return null;
        
        const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = performance.now();
        
        this.metrics[operation] = this.metrics[operation] || [];
        this.metrics[operation].push({
            id: operationId,
            startTime,
            endTime: null,
            duration: null,
            metadata,
            status: 'in_progress'
        });
        
        console.log(`⏱️ PerformanceMonitor: Started ${operation} (ID: ${operationId})`);
        return operationId;
    }

    /**
     * End tracking an operation
     * @param {string} operation - Operation name
     * @param {string} operationId - Operation ID
     * @param {string} status - Status (success/error)
     */
    endOperation(operation, operationId, status = 'success') {
        if (!this.enabled || !operationId) return;
        
        const operations = this.metrics[operation];
        if (!operations) return;
        
        const op = operations.find(o => o.id === operationId);
        if (!op) return;
        
        op.endTime = performance.now();
        op.duration = op.endTime - op.startTime;
        op.status = status;
        
        console.log(`✅ PerformanceMonitor: Completed ${operation} in ${op.duration.toFixed(2)}ms (${status})`);
    }

    /**
     * Track a bulk rename operation
     * @param {number} fileCount - Number of files
     * @param {number} duration - Duration in ms
     * @param {Object} results - Operation results
     */
    trackBulkRename(fileCount, duration, results = {}) {
        this.metrics.bulkRenames.push({
            timestamp: Date.now(),
            fileCount,
            duration,
            ...results
        });
        
        console.log(`📊 PerformanceMonitor: Bulk rename - ${fileCount} files in ${duration.toFixed(2)}ms (${(duration/fileCount).toFixed(2)}ms per file)`);
    }

    /**
     * Get statistics for an operation type
     * @param {string} operation - Operation name
     * @returns {Object} - Statistics
     */
    getStats(operation) {
        const operations = this.metrics[operation] || [];
        const completed = operations.filter(o => o.duration !== null);
        
        if (completed.length === 0) {
            return {
                count: 0,
                avgDuration: 0,
                minDuration: 0,
                maxDuration: 0,
                totalDuration: 0
            };
        }
        
        const durations = completed.map(o => o.duration);
        const sum = durations.reduce((a, b) => a + b, 0);
        
        return {
            count: completed.length,
            avgDuration: sum / completed.length,
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            totalDuration: sum,
            successRate: (completed.filter(o => o.status === 'success').length / completed.length * 100).toFixed(2) + '%'
        };
    }

    /**
     * Get comprehensive performance report
     * @returns {Object} - Performance report
     */
    getReport() {
        const report = {
            timestamp: new Date().toISOString(),
            enabled: this.enabled,
            operations: {}
        };
        
        for (const operation in this.metrics) {
            if (this.metrics[operation].length > 0) {
                report.operations[operation] = this.getStats(operation);
            }
        }
        
        // Add cache statistics if available
        if (window.bufferManager) {
            report.bufferManager = window.bufferManager.getStats();
        }
        
        if (window.textExtractionCache) {
            report.textExtractionCache = window.textExtractionCache.getStats();
        }
        
        if (window.pdfLibManager) {
            report.pdfLibManager = window.pdfLibManager.getStatus();
        }
        
        return report;
    }

    /**
     * Log performance report to console
     */
    logReport() {
        const report = this.getReport();
        
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║         AURA PDF PERFORMANCE REPORT                      ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`📅 Timestamp: ${report.timestamp}`);
        console.log(`🔧 Monitoring: ${report.enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log('');
        
        if (Object.keys(report.operations).length > 0) {
            console.log('📊 OPERATION STATISTICS:');
            console.log('─────────────────────────────────────────────────────────');
            
            for (const [operation, stats] of Object.entries(report.operations)) {
                console.log(`\n${operation}:`);
                console.log(`  • Count: ${stats.count}`);
                console.log(`  • Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
                console.log(`  • Min Duration: ${stats.minDuration.toFixed(2)}ms`);
                console.log(`  • Max Duration: ${stats.maxDuration.toFixed(2)}ms`);
                console.log(`  • Total Duration: ${stats.totalDuration.toFixed(2)}ms`);
                console.log(`  • Success Rate: ${stats.successRate}`);
            }
        }
        
        console.log('\n');
        
        if (report.bufferManager) {
            console.log('💾 BUFFER MANAGER:');
            console.log('─────────────────────────────────────────────────────────');
            console.log(`  • Cache Hits: ${report.bufferManager.hits}`);
            console.log(`  • Cache Misses: ${report.bufferManager.misses}`);
            console.log(`  • Hit Rate: ${report.bufferManager.hitRate} (${report.bufferManager.efficiency})`);
            console.log(`  • Buffers Created: ${report.bufferManager.totalBuffersCreated}`);
            console.log('');
        }
        
        if (report.textExtractionCache) {
            console.log('📄 TEXT EXTRACTION CACHE:');
            console.log('─────────────────────────────────────────────────────────');
            console.log(`  • Text Cache Hits: ${report.textExtractionCache.textCacheHits} (${report.textExtractionCache.textHitRate})`);
            console.log(`  • PDF Cache Hits: ${report.textExtractionCache.pdfCacheHits} (${report.textExtractionCache.pdfHitRate})`);
            console.log(`  • Total Extractions: ${report.textExtractionCache.totalExtractions}`);
            console.log(`  • Cached Files: ${report.textExtractionCache.cachedFiles}`);
            console.log(`  • Cached Pages: ${report.textExtractionCache.cachedPages}`);
            console.log('');
        }
        
        if (report.pdfLibManager) {
            console.log('📚 PDF.JS LIBRARY:');
            console.log('─────────────────────────────────────────────────────────');
            console.log(`  • Ready: ${report.pdfLibManager.ready ? '✅ YES' : '❌ NO'}`);
            console.log(`  • Available: ${report.pdfLibManager.available ? '✅ YES' : '❌ NO'}`);
            console.log(`  • Loading: ${report.pdfLibManager.loading ? '🔄 YES' : '✅ NO'}`);
            console.log('');
        }
        
        console.log('══════════════════════════════════════════════════════════');
    }

    /**
     * Export report as JSON
     * @returns {string} - JSON string
     */
    exportReport() {
        return JSON.stringify(this.getReport(), null, 2);
    }

    /**
     * Clear all metrics
     */
    clear() {
        for (const operation in this.metrics) {
            this.metrics[operation] = [];
        }
        console.log('PerformanceMonitor: All metrics cleared');
    }

    /**
     * Enable monitoring
     */
    enable() {
        this.enabled = true;
        console.log('PerformanceMonitor: Monitoring ENABLED');
    }

    /**
     * Disable monitoring
     */
    disable() {
        this.enabled = false;
        console.log('PerformanceMonitor: Monitoring DISABLED');
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();
window.performanceMonitor = performanceMonitor;

// Add global shortcut to view performance report
window.showPerformanceReport = () => {
    performanceMonitor.logReport();
};

// Log performance report on window unload
window.addEventListener('beforeunload', () => {
    if (performanceMonitor.enabled) {
        console.log('\n🔚 Final Performance Report:');
        performanceMonitor.logReport();
    }
});

console.log('PerformanceMonitor initialized - Use window.showPerformanceReport() to view metrics');

