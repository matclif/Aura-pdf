// PDF Viewer with Text Selection
class PDFViewer {
    constructor() {
        this.pdf = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.zoomLevel = 1.0;
        this.canvas = null;
        this.context = null;
        this.textLayer = null;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.textItems = [];
        
        this.initializeViewer();
    }
    
    initializeViewer() {
        const viewerContainer = document.getElementById('pdfViewer');
        
        // Clear existing content
        viewerContainer.innerHTML = `
            <div class="no-pdf-selected">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDF Selected</h3>
                <p>Select a PDF from the file list to view and extract text patterns</p>
            </div>
        `;
        
        this.updateControls();
    }
    
    async loadPDF(uint8Array) {
        try {
            // Set up PDF.js worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            // Load the PDF
            this.pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            this.totalPages = this.pdf.numPages;
            this.currentPage = 1;
            this.zoomLevel = 1.0;
            
            await this.renderPage();
            this.updateControls();
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError('Failed to load PDF: ' + error.message);
        }
    }
    
    async renderPage() {
        if (!this.pdf) return;
        
        try {
            const page = await this.pdf.getPage(this.currentPage);
            const viewport = page.getViewport({ scale: this.zoomLevel });
            
            // Create or update canvas
            this.createCanvas(viewport);
            
            // Render PDF page
            const renderContext = {
                canvasContext: this.context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Render text layer for selection
            await this.renderTextLayer(page, viewport);
            
        } catch (error) {
            console.error('Error rendering page:', error);
            this.showError('Failed to render page: ' + error.message);
        }
    }
    
    createCanvas(viewport) {
        const viewerContainer = document.getElementById('pdfViewer');
        
        // Clear container
        viewerContainer.innerHTML = '';
        
        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'canvas-container';
        canvasContainer.style.position = 'relative';
        canvasContainer.style.display = 'inline-block';
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'pdf-canvas';
        this.canvas.width = viewport.width;
        this.canvas.height = viewport.height;
        this.canvas.style.display = 'block';
        
        this.context = this.canvas.getContext('2d');
        
        // Create text layer
        this.textLayer = document.createElement('div');
        this.textLayer.className = 'text-layer';
        this.textLayer.style.position = 'absolute';
        this.textLayer.style.left = '0';
        this.textLayer.style.top = '0';
        this.textLayer.style.right = '0';
        this.textLayer.style.bottom = '0';
        this.textLayer.style.overflow = 'hidden';
        this.textLayer.style.opacity = '0';
        this.textLayer.style.lineHeight = '1.0';
        this.textLayer.style.userSelect = 'text';
        this.textLayer.style.cursor = 'text';
        
        canvasContainer.appendChild(this.canvas);
        canvasContainer.appendChild(this.textLayer);
        viewerContainer.appendChild(canvasContainer);
        
        // Add selection event listeners
        this.addSelectionListeners();
    }
    
    async renderTextLayer(page, viewport) {
        if (!this.textLayer) return;
        
        try {
            // Clear existing text
            this.textLayer.innerHTML = '';
            this.textItems = [];
            
            // Get text content
            const textContent = await page.getTextContent();
            
            // Create text elements
            textContent.items.forEach((textItem, index) => {
                const textElement = document.createElement('span');
                textElement.textContent = textItem.str;
                textElement.style.position = 'absolute';
                textElement.style.whiteSpace = 'pre';
                textElement.style.color = 'transparent';
                textElement.style.fontSize = Math.round(textItem.height * viewport.scale) + 'px';
                textElement.style.fontFamily = textItem.fontName || 'sans-serif';
                textElement.style.left = (textItem.transform[4] * viewport.scale) + 'px';
                textElement.style.top = (viewport.height - textItem.transform[5] * viewport.scale) + 'px';
                
                // Store text item data
                this.textItems.push({
                    element: textElement,
                    text: textItem.str,
                    bbox: textItem.transform,
                    index: index
                });
                
                this.textLayer.appendChild(textElement);
            });
            
        } catch (error) {
            console.error('Error rendering text layer:', error);
        }
    }
    
    addSelectionListeners() {
        if (!this.textLayer) return;
        
        let isSelecting = false;
        let selectionTimeout;
        
        // Mouse selection
        this.textLayer.addEventListener('mousedown', (e) => {
            isSelecting = true;
            this.clearSelection();
        });
        
        this.textLayer.addEventListener('mouseup', (e) => {
            if (isSelecting) {
                isSelecting = false;
                
                // Delay to allow selection to complete
                clearTimeout(selectionTimeout);
                selectionTimeout = setTimeout(() => {
                    this.handleTextSelection();
                }, 100);
            }
        });
        
        // Touch selection for mobile
        this.textLayer.addEventListener('touchend', (e) => {
            clearTimeout(selectionTimeout);
            selectionTimeout = setTimeout(() => {
                this.handleTextSelection();
            }, 100);
        });
        
        // Handle selection change
        document.addEventListener('selectionchange', () => {
            if (isSelecting) return;
            
            clearTimeout(selectionTimeout);
            selectionTimeout = setTimeout(() => {
                this.handleTextSelection();
            }, 100);
        });
    }
    
    handleTextSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText && selectedText.length > 0) {
            // Check if selection is within our text layer
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            
            // More strict check to ensure selection is only from PDF text layer
            const isWithinPDF = this.textLayer.contains(container) || 
                               this.textLayer === container ||
                               (container.nodeType === Node.TEXT_NODE && this.textLayer.contains(container.parentNode));
            
            if (isWithinPDF) {
                // Additional validation: check if the selection is actually within our PDF canvas area
                const rect = range.getBoundingClientRect();
                const canvasRect = this.canvas.getBoundingClientRect();
                
                // Check if selection is within canvas bounds
                const isWithinCanvas = rect.left >= canvasRect.left && 
                                     rect.right <= canvasRect.right &&
                                     rect.top >= canvasRect.top && 
                                     rect.bottom <= canvasRect.bottom;
                
                if (isWithinCanvas) {
                    // Get the exact selected text by walking through the range
                    const exactText = this.getExactSelectedText(range);
                    
                    const position = {
                        page: this.currentPage,
                        x: Math.round((rect.left - canvasRect.left) / this.zoomLevel),
                        y: Math.round((rect.top - canvasRect.top) / this.zoomLevel),
                        width: Math.round(rect.width / this.zoomLevel),
                        height: Math.round(rect.height / this.zoomLevel),
                        zoom: this.zoomLevel
                    };
                    
                    this.onTextSelected(exactText, position);
                    this.highlightSelection(range);
                } else {
                    // Selection is outside PDF canvas, ignore it
                    console.log('Selection outside PDF canvas, ignoring');
                    this.clearHighlight();
                    this.onTextSelected('');
                }
            } else {
                // Selection is not from PDF text layer, ignore it
                console.log('Selection not from PDF text layer, ignoring');
                this.clearHighlight();
                this.onTextSelected('');
            }
        } else {
            this.clearHighlight();
            this.onTextSelected('');
        }
    }
    
    getExactSelectedText(range) {
        // Create a temporary container to get the exact text content
        const tempDiv = document.createElement('div');
        const clonedRange = range.cloneRange();
        clonedRange.selectNodeContents(tempDiv);
        
        // Get the text content of the range
        const textContent = range.toString();
        
        // Clean up the text - remove extra whitespace and normalize
        const cleanedText = textContent
            .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
            .replace(/\n\s*/g, ' ') // Replace newlines and following spaces with single space
            .trim();
        
        return cleanedText;
    }
    
    highlightSelection(range) {
        this.clearHighlight();
        
        try {
            // Create highlight overlay
            const rect = range.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            const highlight = document.createElement('div');
            highlight.className = 'text-selection-highlight';
            highlight.style.position = 'absolute';
            highlight.style.left = (rect.left - canvasRect.left) + 'px';
            highlight.style.top = (rect.top - canvasRect.top) + 'px';
            highlight.style.width = rect.width + 'px';
            highlight.style.height = rect.height + 'px';
            highlight.style.background = 'rgba(255, 193, 7, 0.3)';
            highlight.style.pointerEvents = 'none';
            highlight.style.borderRadius = '2px';
            
            this.canvas.parentElement.appendChild(highlight);
            
        } catch (error) {
            console.error('Error highlighting selection:', error);
        }
    }
    
    clearHighlight() {
        const highlights = document.querySelectorAll('.text-selection-highlight');
        highlights.forEach(highlight => highlight.remove());
    }
    
    clearSelection() {
        window.getSelection().removeAllRanges();
        this.clearHighlight();
        this.onTextSelected('');
    }
    
    onTextSelected(text, position = null) {
        if (window.app) {
            window.app.onTextSelected(text, position);
        }
    }
    
    // Navigation methods
    async nextPage() {
        if (!this.pdf || this.currentPage >= this.totalPages) return;
        
        this.currentPage++;
        await this.renderPage();
        this.updateControls();
        this.clearSelection();
    }
    
    async previousPage() {
        if (!this.pdf || this.currentPage <= 1) return;
        
        this.currentPage--;
        await this.renderPage();
        this.updateControls();
        this.clearSelection();
    }
    
    async goToPage(pageNumber) {
        if (!this.pdf || pageNumber < 1 || pageNumber > this.totalPages) return;
        
        this.currentPage = pageNumber;
        await this.renderPage();
        this.updateControls();
        this.clearSelection();
    }
    
    // Zoom methods
    async zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.25, 3.0);
        await this.renderPage();
        this.updateControls();
        this.clearSelection();
    }
    
    async zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.25, 0.25);
        await this.renderPage();
        this.updateControls();
        this.clearSelection();
    }
    
    async setZoom(level) {
        this.zoomLevel = Math.max(0.25, Math.min(3.0, level));
        await this.renderPage();
        this.updateControls();
        this.clearSelection();
    }
    
    updateControls() {
        // Update page info
        document.getElementById('currentPage').textContent = this.currentPage || '-';
        document.getElementById('totalPages').textContent = this.totalPages || '-';
        
        // Update navigation buttons
        document.getElementById('prevPageBtn').disabled = !this.pdf || this.currentPage <= 1;
        document.getElementById('nextPageBtn').disabled = !this.pdf || this.currentPage >= this.totalPages;
        
        // Update zoom info
        document.getElementById('zoomLevel').textContent = Math.round(this.zoomLevel * 100) + '%';
        
        // Update zoom buttons
        document.getElementById('zoomInBtn').disabled = !this.pdf || this.zoomLevel >= 3.0;
        document.getElementById('zoomOutBtn').disabled = !this.pdf || this.zoomLevel <= 0.25;
    }
    
    showError(message) {
        const viewerContainer = document.getElementById('pdfViewer');
        viewerContainer.innerHTML = `
            <div class="pdf-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading PDF</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.app.openFiles()">
                    Try Another File
                </button>
            </div>
        `;
    }
    
    // Search functionality
    async searchText(query) {
        if (!this.pdf || !query.trim()) return [];
        
        const results = [];
        
        try {
            for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
                const page = await this.pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                
                if (pageText.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        page: pageNum,
                        text: pageText,
                        matches: this.findMatches(pageText, query)
                    });
                }
            }
        } catch (error) {
            console.error('Error searching text:', error);
        }
        
        return results;
    }
    
    findMatches(text, query) {
        const matches = [];
        const regex = new RegExp(query, 'gi');
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            matches.push({
                index: match.index,
                text: match[0],
                context: this.getContext(text, match.index, 50)
            });
        }
        
        return matches;
    }
    
    getContext(text, index, contextLength) {
        const start = Math.max(0, index - contextLength);
        const end = Math.min(text.length, index + contextLength);
        return text.substring(start, end);
    }
    
    // Export functionality
    getPageText(pageNumber = null) {
        if (!this.pdf) return '';
        
        const page = pageNumber || this.currentPage;
        return this.textItems.map(item => item.text).join(' ');
    }
    
    getAllText() {
        // This would need to be implemented to extract text from all pages
        // For now, return current page text
        return this.getPageText();
    }
}

// Initialize PDF viewer when DOM is loaded
// NOTE: This viewer is no longer used since we consolidated into the main Files & Patterns tab
// let pdfViewer;
// document.addEventListener('DOMContentLoaded', () => {
//     pdfViewer = new PDFViewer();
//     window.pdfViewer = pdfViewer; // Make available globally
// });

// Add CSS for text selection
const style = document.createElement('style');
style.textContent = `
    /* Prevent text selection outside PDF area */
    body {
        user-select: none !important;
    }
    
    /* Allow text selection only in PDF viewer */
    .pdf-viewer-container {
        user-select: text !important;
    }
    
    .text-layer {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        overflow: hidden !important;
        opacity: 0.2 !important;
        line-height: 1.0 !important;
        user-select: text !important;
        cursor: text !important;
    }
    
    .text-layer span {
        position: absolute !important;
        white-space: pre !important;
        color: transparent !important;
    }
    
    .text-layer span::selection {
        background: rgba(255, 193, 7, 0.3) !important;
    }
    
    .text-selection-highlight {
        position: absolute !important;
        background: rgba(255, 193, 7, 0.3) !important;
        pointer-events: none !important;
        border-radius: 2px !important;
        z-index: 10 !important;
    }
    
    .pdf-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #6c757d;
        text-align: center;
        padding: 2rem;
    }
    
    .pdf-error i {
        font-size: 4rem;
        margin-bottom: 1rem;
        color: #dc3545;
        opacity: 0.7;
    }
    
    .pdf-error h3 {
        margin-bottom: 0.5rem;
        color: #495057;
    }
    
    .pdf-error p {
        margin-bottom: 1.5rem;
        max-width: 400px;
    }
`;
document.head.appendChild(style);
