# Aura PDF™ Performance Features - Quick Start Guide

## 🚀 Getting Started

The performance optimizations in Aura PDF™ v2.0.0 are **automatically enabled** and require no configuration. However, you can monitor and interact with them for debugging and optimization purposes.

---

## 📊 Viewing Performance Metrics

### Option 1: Quick Performance Report

Open the browser console (F12 or Cmd+Option+I) and type:

```javascript
window.showPerformanceReport()
```

This displays a comprehensive report including:
- Operation statistics (bulk rename, text extraction, etc.)
- Buffer cache performance
- Text extraction cache performance
- PDF.js library status

### Option 2: Individual Module Stats

**Buffer Manager:**
```javascript
window.bufferManager.logStats()
```

**Text Extraction Cache:**
```javascript
window.textExtractionCache.logStats()
```

**PDF.js Loader:**
```javascript
window.pdfLibManager.logStatus()
```

---

## 🔧 Advanced Usage

### Monitoring a Specific Operation

```javascript
// Start tracking
const opId = window.performanceMonitor.startOperation('myOperation', {
    customField: 'customValue'
});

// Your operation here
await doSomething();

// End tracking
window.performanceMonitor.endOperation('myOperation', opId, 'success');

// View stats
const stats = window.performanceMonitor.getStats('myOperation');
console.log(stats);
```

### Clearing Caches

If you need to free memory or debug cache issues:

```javascript
// Clear text extraction cache
window.textExtractionCache.clear();

// Clear cache for a specific file
window.textExtractionCache.clearFile(fileObject);

// Reset performance statistics
window.performanceMonitor.clear();
```

### Exporting Performance Data

```javascript
// Get report as JSON
const report = window.performanceMonitor.exportReport();

// Download report
const blob = new Blob([report], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'aura-pdf-performance-report.json';
a.click();
```

---

## 🐛 Debugging Tips

### Issue: Slow Bulk Rename

1. Check buffer cache hit rate:
```javascript
window.bufferManager.getStats()
// Look for hitRate - should be >80%
```

2. Check memory usage:
```javascript
console.log(performance.memory);
```

3. View detailed operation metrics:
```javascript
window.showPerformanceReport()
```

### Issue: Text Extraction Not Working

1. Check if PDF.js is loaded:
```javascript
window.pdfLibManager.isReady()
// Should return true
```

2. Check cache stats:
```javascript
window.textExtractionCache.getStats()
// Look for totalExtractions and hit rates
```

3. Force PDF.js reload if needed:
```javascript
await window.pdfLibManager.reload()
```

### Issue: High Memory Usage

1. Check how many files are cached:
```javascript
const stats = window.textExtractionCache.getStats();
console.log(`Cached files: ${stats.cachedFiles}`);
console.log(`Cached pages: ${stats.cachedPages}`);
```

2. Clear cache to free memory:
```javascript
window.textExtractionCache.clear();
```

---

## 📈 Performance Tips

### 1. Batch Operations
Process files in batches rather than one-by-one to maximize cache efficiency.

### 2. Monitor Cache Hit Rates
- Buffer cache should be **>80%**
- Text cache should be **>70%**
- PDF cache should be **>90%**

If rates are low, files may be too diverse or cache size needs adjustment.

### 3. Use Console Logging
Enable verbose logging for debugging:
```javascript
// See all buffer manager operations
// Already enabled automatically
```

### 4. Regular Performance Checks
Periodically check performance during heavy usage:
```javascript
// Set up interval check
setInterval(() => {
    console.log('=== Periodic Performance Check ===');
    window.bufferManager.logStats();
    window.textExtractionCache.logStats();
}, 60000); // Every minute
```

---

## 🎯 Expected Performance Benchmarks

### Bulk Rename
- **100 files:** 3-4 seconds (30-40ms per file)
- **500 files:** 15-20 seconds (30-40ms per file)
- **1000 files:** 30-40 seconds (30-40ms per file)

### Text Extraction
- **First extraction:** 50-100ms per page
- **Cached extraction:** 5-10ms per page
- **100 files, 3 patterns:** 2-3 seconds total

### File Loading
- **Single file:** 20-30ms
- **50 files:** 1-2 seconds
- **100 files:** 2-3 seconds

If you're seeing significantly slower performance, run:
```javascript
window.showPerformanceReport()
```
to identify bottlenecks.

---

## 🆘 Troubleshooting

### Problem: "PDF.js not available" error

**Solution:**
```javascript
// Check status
window.pdfLibManager.getStatus()

// Force reload
await window.pdfLibManager.reload()
```

### Problem: Memory keeps growing

**Solution:**
```javascript
// Clear all caches
window.textExtractionCache.clear();

// Check for improvement
console.log(performance.memory);
```

### Problem: Very slow bulk rename

**Solution:**
```javascript
// Check if async I/O is being used
// (Should be automatic in v2.0.0)

// View operation breakdown
window.performanceMonitor.getStats('bulkRenames')

// Check buffer efficiency
window.bufferManager.getStats()
```

---

## 📞 Getting Help

If you encounter performance issues not covered here:

1. **Generate a performance report:**
   ```javascript
   window.showPerformanceReport()
   ```

2. **Export the report:**
   ```javascript
   const report = window.performanceMonitor.exportReport();
   console.log(report); // Copy and save this
   ```

3. **Include system information:**
   - Operating System
   - Number of files being processed
   - File sizes
   - Operation being performed

4. **Contact:**
   - Email: juncliff44@gmail.com
   - Include the performance report and system info

---

## 🔄 Updates

Performance features are continuously monitored and improved. Check `PERFORMANCE_OPTIMIZATIONS.md` for detailed technical documentation and the latest optimizations.

---

**Version:** 2.0.0  
**Last Updated:** October 1, 2025

