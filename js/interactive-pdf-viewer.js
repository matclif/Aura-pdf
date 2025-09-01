// Interactive PDF Viewer with Box Selection
class InteractivePDFViewer {
    constructor() {
        this.pdf = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.zoomLevel = 1.0;
        this.canvas = null;
        this.context = null;
        this.selectionMode = false;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.currentSelection = null;
        this.textItems = [];
        this.selectionOverlay = null;
        this.selectionCanvas = null;
        
        this.initializeViewer();
        this.bindEvents();
    }
    
    initializeViewer() {
        const previewContainer = document.getElementById('pdfPreview');
        
        // Clear existing content
        previewContainer.innerHTML = `
            <div class="no-pdf-selected">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDF Selected</h3>
                <p>Select a PDF from the file list to view and create patterns</p>
            </div>
        `;
        
        this.updateControls();
        this.setupSelectionOverlay();
    }
    
    setupSelectionOverlay() {
        this.selectionOverlay = document.getElementById('selectionOverlay');
        this.selectionCanvas = document.getElementById('selectionCanvas');
        
        // Initialize selection canvas context
        const ctx = this.selectionCanvas.getContext('2d');
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
    }
    
    bindEvents() {
        // Selection mode toggle
        const toggleBtn = document.getElementById('toggleSelectionMode');
        if (toggleBtn) {
            console.log('Selection mode button found, binding click event');
            toggleBtn.addEventListener('click', () => {
                console.log('Selection mode button clicked!');
                this.toggleSelectionMode();
            });
        } else {
            console.error('Selection mode button NOT FOUND!');
        }
        
        // Selection canvas events
        if (this.selectionCanvas) {
            console.log('Selection canvas found, binding mouse events');
            this.selectionCanvas.addEventListener('mousedown', (e) => this.startSelection(e));
            this.selectionCanvas.addEventListener('mousemove', (e) => this.updateSelection(e));
            this.selectionCanvas.addEventListener('mouseup', (e) => this.endSelection(e));
        } else {
            console.error('Selection canvas NOT FOUND!');
        }
        
        // Zoom buttons
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        
        if (zoomInBtn) {
            console.log('Zoom in button found, binding click event');
            zoomInBtn.addEventListener('click', () => {
                console.log('Zoom in clicked!');
                this.zoomIn();
            });
        } else {
            console.error('Zoom in button NOT FOUND!');
        }
        
        if (zoomOutBtn) {
            console.log('Zoom out button found, binding click event');
            zoomOutBtn.addEventListener('click', () => {
                console.log('Zoom out clicked!');
                this.zoomOut();
            });
        } else {
            console.error('Zoom out button NOT FOUND!');
        }
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selectionMode) {
                this.clearSelection();
            }
        });
        
        // Click outside to clear selection
        if (this.selectionOverlay) {
            this.selectionOverlay.addEventListener('click', (e) => {
                if (e.target === this.selectionOverlay) {
                    this.clearSelection();
                }
            });
        } else {
            console.error('Selection overlay NOT FOUND!');
        }
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
            
            // Extract text items for selection
            await this.extractTextItems(page, viewport);
            
            // Update selection canvas size
            this.updateSelectionCanvas(viewport);
            
        } catch (error) {
            console.error('Error rendering page:', error);
            this.showError('Failed to render page: ' + error.message);
        }
    }
    
    createCanvas(viewport) {
        const previewContainer = document.getElementById('pdfPreview');
        
        // Clear container
        previewContainer.innerHTML = '';
        
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
        
        canvasContainer.appendChild(this.canvas);
        previewContainer.appendChild(canvasContainer);
    }
    
    async extractTextItems(page, viewport) {
        this.textItems = [];
        
        try {
            const textContent = await page.getTextContent();
            
            textContent.items.forEach((textItem, index) => {
                const transform = textItem.transform;
                const x = transform[4] * viewport.scale;
                const y = viewport.height - (transform[5] * viewport.scale);
                const width = textItem.width * viewport.scale;
                const height = textItem.height * viewport.scale;
                
                this.textItems.push({
                    text: textItem.str,
                    x: x,
                    y: y - height, // Adjust for top-left origin
                    width: width,
                    height: height,
                    index: index
                });
            });
            
        } catch (error) {
            console.error('Error extracting text items:', error);
        }
    }
    
    updateSelectionCanvas(viewport) {
        if (!this.selectionCanvas) {
            console.error('Selection canvas not available for sizing');
            return;
        }
        
        const previewElement = document.getElementById('pdfPreview');
        if (!previewElement) {
            console.error('PDF preview element not found');
            return;
        }
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const previewRect = previewElement.getBoundingClientRect();
        
        console.log('Canvas rect:', canvasRect);
        console.log('Preview rect:', previewRect);
        
        this.selectionCanvas.width = canvasRect.width;
        this.selectionCanvas.height = canvasRect.height;
        this.selectionCanvas.style.left = (canvasRect.left - previewRect.left) + 'px';
        this.selectionCanvas.style.top = (canvasRect.top - previewRect.top) + 'px';
        this.selectionCanvas.style.width = canvasRect.width + 'px';
        this.selectionCanvas.style.height = canvasRect.height + 'px';
        
        console.log('Selection canvas positioned at:', {
            left: this.selectionCanvas.style.left,
            top: this.selectionCanvas.style.top,
            width: this.selectionCanvas.style.width,
            height: this.selectionCanvas.style.height
        });
    }
    
    toggleSelectionMode() {
        console.log('toggleSelectionMode called, current state:', this.selectionMode);
        this.selectionMode = !this.selectionMode;
        console.log('New selection mode state:', this.selectionMode);
        
        const button = document.getElementById('toggleSelectionMode');
        const overlay = document.getElementById('selectionOverlay');
        const previewContainer = document.getElementById('pdfPreviewContainer');
        
        console.log('Button found:', !!button);
        console.log('Overlay found:', !!overlay);
        console.log('Preview container found:', !!previewContainer);
        
        if (this.selectionMode) {
            button.innerHTML = '<i class="fas fa-times"></i> Exit Selection';
            button.classList.remove('btn-info');
            button.classList.add('btn-warning');
            overlay.classList.add('active');
            previewContainer.classList.add('selection-mode');
            
            console.log('Selection mode enabled, overlay should be visible');
        } else {
            button.innerHTML = '<i class="fas fa-crosshairs"></i> Selection Mode';
            button.classList.remove('btn-warning');
            button.classList.add('btn-info');
            overlay.classList.remove('active');
            previewContainer.classList.remove('selection-mode');
            this.clearSelection();
            
            console.log('Selection mode disabled, overlay hidden');
        }
    }
    
    startSelection(e) {
        if (!this.selectionMode || !this.canvas) return;
        
        this.isSelecting = true;
        const rect = this.selectionCanvas.getBoundingClientRect();
        this.selectionStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.selectionCanvas.style.cursor = 'crosshair';
    }
    
    updateSelection(e) {
        if (!this.isSelecting || !this.selectionStart) return;
        
        const rect = this.selectionCanvas.getBoundingClientRect();
        this.selectionEnd = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.drawSelection();
    }
    
    endSelection(e) {
        if (!this.isSelecting || !this.selectionStart) return;
        
        this.isSelecting = false;
        
        const rect = this.selectionCanvas.getBoundingClientRect();
        this.selectionEnd = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Create final selection
        this.finalizeSelection();
    }
    
    drawSelection() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const ctx = this.selectionCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        // Draw selection rectangle
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
    }
    
    finalizeSelection() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        // Minimum selection size
        if (width < 10 || height < 10) {
            this.clearSelection();
            return;
        }
        
        // Convert to PDF coordinates (accounting for zoom and canvas positioning)
        const canvasRect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / canvasRect.width;
        const scaleY = this.canvas.height / canvasRect.height;
        
        this.currentSelection = {
            page: this.currentPage,
            x: Math.round((x * scaleX) / this.zoomLevel),
            y: Math.round((y * scaleY) / this.zoomLevel),
            width: Math.round((width * scaleX) / this.zoomLevel),
            height: Math.round((height * scaleY) / this.zoomLevel),
            displayX: x,
            displayY: y,
            displayWidth: width,
            displayHeight: height,
            zoom: this.zoomLevel
        };
        
        // Extract text from selection
        const extractedText = this.extractTextFromSelection(this.currentSelection);
        this.currentSelection.extractedText = extractedText;
        
        // Update UI
        this.updateSelectionDetails();
        
        // Show selection details
        const selectionDetails = document.getElementById('selectionDetails');
        if (selectionDetails) {
            selectionDetails.style.display = 'block';
        }
        
        // Make selection permanent
        
        // Notify the app that a selection was made
        if (window.app && typeof window.app.onSelectionMade === 'function') {
            window.app.onSelectionMade(this.currentSelection);
        }
        
        // Also notify the Files & Patterns tab manager
        if (window.filesPatternsTabManager && typeof window.filesPatternsTabManager.onSelectionMade === 'function') {
            console.log('Interactive PDF Viewer: Notifying Files & Patterns tab manager');
            window.filesPatternsTabManager.onSelectionMade(this.currentSelection);
        } else {
            console.log('Interactive PDF Viewer: Files & Patterns tab manager not available');
        }
        this.drawFinalSelection();
    }
    
    extractTextFromSelection(selection) {
        console.log('Interactive PDF Viewer: extractTextFromSelection called with:', selection);
        console.log('Interactive PDF Viewer: textItems available:', this.textItems ? this.textItems.length : 'none');
        
        const extractedItems = [];
        
        // Convert selection coordinates back to text coordinate system
        const selectionRect = {
            left: selection.x * this.zoomLevel,
            top: selection.y * this.zoomLevel,
            right: (selection.x + selection.width) * this.zoomLevel,
            bottom: (selection.y + selection.height) * this.zoomLevel
        };
        
        console.log('Interactive PDF Viewer: Selection rect:', selectionRect);
        
        this.textItems.forEach(item => {
            const itemRect = {
                left: item.x,
                top: item.y,
                right: item.x + item.width,
                bottom: item.y + item.height
            };
            
            // Check if text item intersects with selection
            if (this.rectanglesIntersect(selectionRect, itemRect)) {
                extractedItems.push(item);
            }
        });
        
        console.log('Interactive PDF Viewer: Extracted items:', extractedItems.length);
        
        // Sort by position (top to bottom, left to right)
        extractedItems.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 5) { // Same line
                return a.x - b.x;
            }
            return a.y - b.y;
        });
        
        const rawText = extractedItems.map(item => item.text).join(' ').trim();
        const cleanedText = this.cleanExtractedText(rawText);
        console.log('Interactive PDF Viewer: Raw text:', rawText);
        console.log('Interactive PDF Viewer: Cleaned text:', cleanedText);
        
        return cleanedText;
    }
    
    cleanExtractedText(text) {
        if (!text) return text;
        
        // Remove unwanted characters and clean up the text
        let cleaned = text
            // Remove commas, periods, and other punctuation that might interfere with filenames
            .replace(/[,.;:!?]/g, '')
            // Remove extra spaces
            .replace(/\s+/g, ' ')
            // Remove leading/trailing spaces
            .trim();
        
        return cleaned;
    }
    
    rectanglesIntersect(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }
    
    drawFinalSelection() {
        if (!this.currentSelection) return;
        
        const ctx = this.selectionCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        
        const { displayX, displayY, displayWidth, displayHeight } = this.currentSelection;
        
        // Draw final selection with different style
        ctx.strokeStyle = '#28a745';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(40, 167, 69, 0.15)';
        
        ctx.fillRect(displayX, displayY, displayWidth, displayHeight);
        ctx.strokeRect(displayX, displayY, displayWidth, displayHeight);
        
        // Add corner handles
        this.drawCornerHandles(displayX, displayY, displayWidth, displayHeight);
    }
    
    drawCornerHandles(x, y, width, height) {
        const ctx = this.selectionCanvas.getContext('2d');
        const handleSize = 8;
        
        ctx.fillStyle = '#28a745';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        
        // Top-left
        ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        
        // Top-right
        ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
        
        // Bottom-left
        ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        
        // Bottom-right
        ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
    }
    
    clearSelection() {
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.currentSelection = null;
        
        if (this.selectionCanvas) {
            const ctx = this.selectionCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        }
        
        this.clearSelectionDetails();
        
        // Hide selection details
        const selectionDetails = document.getElementById('selectionDetails');
        if (selectionDetails) {
            selectionDetails.style.display = 'none';
        }
        
        // Notify the app that selection was cleared
        if (window.app && typeof window.app.onSelectionCleared === 'function') {
            window.app.onSelectionCleared();
        }
        
        // Also notify the Files & Patterns tab manager
        if (window.filesPatternsTabManager && typeof window.filesPatternsTabManager.clearSelection === 'function') {
            window.filesPatternsTabManager.clearSelection();
        }
    }
    
    updateSelectionDetails() {
        if (!this.currentSelection) return;
        
        document.getElementById('selectedPage').textContent = this.currentSelection.page;
        document.getElementById('selectedPosition').textContent = 
            `(${this.currentSelection.x}, ${this.currentSelection.y})`;
        document.getElementById('selectedSize').textContent = 
            `${this.currentSelection.width} × ${this.currentSelection.height}`;
        document.getElementById('extractedTextPreview').textContent = 
            this.currentSelection.extractedText || 'No text found in selection';
        
        // Update pattern preview
        this.updatePatternPreview();
        
        // Enable save button
        document.getElementById('saveVisualPatternBtn').disabled = false;
    }
    
    clearSelectionDetails() {
        // Only clear details if there's actually no selection
        if (this.currentSelection) {
            return; // Don't clear if there's a selection
        }
        
        // Safely update selection details with null checks
        const selectedPage = document.getElementById('selectedPage');
        const selectedPosition = document.getElementById('selectedPosition');
        const selectedSize = document.getElementById('selectedSize');
        const extractedTextPreview = document.getElementById('extractedTextPreview');
        const previewContent = document.querySelector('.preview-content');
        const saveVisualPatternBtn = document.getElementById('saveVisualPatternBtn');
        
        if (selectedPage) selectedPage.textContent = '-';
        if (selectedPosition) selectedPosition.textContent = 'No selection';
        if (selectedSize) selectedSize.textContent = '-';
        if (extractedTextPreview) extractedTextPreview.textContent = 'Make a selection above to extract text';
        
        // Clear pattern preview
        if (previewContent) previewContent.textContent = 'Make a selection to see pattern preview';
        
        // Disable save button
        if (saveVisualPatternBtn) saveVisualPatternBtn.disabled = true;
    }
    
    updatePatternPreview() {
        const nameElement = document.getElementById('newPatternName');
        const name = nameElement ? nameElement.value.trim() || 'Unnamed Pattern' : 'Unnamed Pattern';
        const extractedText = this.currentSelection?.extractedText || '';
        
        const previewContent = document.querySelector('.preview-content');
        if (previewContent) {
            previewContent.innerHTML = `
                <strong>Pattern Name:</strong> ${this.escapeHtml(name)}<br>
                <strong>Extracted Text:</strong> "${this.escapeHtml(extractedText)}"<br>
                <strong>Position:</strong> Page ${this.currentSelection?.page}, (${this.currentSelection?.x}, ${this.currentSelection?.y})<br>
                <strong>Size:</strong> ${this.currentSelection?.width} × ${this.currentSelection?.height}
            `;
        }
    }
    
    showPatternCreationPanel() {
        document.getElementById('renamePanel').classList.remove('active');
        document.getElementById('patternCreationPanel').classList.add('active');
    }
    
    showRenamePanel() {
        document.getElementById('patternCreationPanel').classList.remove('active');
        document.getElementById('renamePanel').classList.add('active');
    }
    
    // Navigation methods
    async nextPage() {
        if (!this.pdf || this.currentPage >= this.totalPages) return;
        
        this.currentPage++;
        this.clearSelection();
        await this.renderPage();
        this.updateControls();
    }
    
    async previousPage() {
        if (!this.pdf || this.currentPage <= 1) return;
        
        this.currentPage--;
        this.clearSelection();
        await this.renderPage();
        this.updateControls();
    }
    
    async goToPage(pageNumber) {
        if (!this.pdf || pageNumber < 1 || pageNumber > this.totalPages) return;
        
        this.currentPage = pageNumber;
        this.clearSelection();
        await this.renderPage();
        this.updateControls();
    }
    
    // Zoom methods
    async zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.25, 3.0);
        this.clearSelection();
        await this.renderPage();
        this.updateControls();
    }
    
    async zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.25, 0.25);
        this.clearSelection();
        await this.renderPage();
        this.updateControls();
    }
    
    async setZoom(level) {
        this.zoomLevel = Math.max(0.25, Math.min(3.0, level));
        this.clearSelection();
        await this.renderPage();
        this.updateControls();
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
        
        // Update selection mode button
        document.getElementById('toggleSelectionMode').disabled = !this.pdf;
    }
    
    showError(message) {
        const previewContainer = document.getElementById('pdfPreview');
        previewContainer.innerHTML = `
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
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Get current selection data for pattern saving
    getCurrentSelection() {
        return this.currentSelection;
    }
    
    // Get extracted text from current selection
    getExtractedText() {
        if (!this.currentSelection) return '';
        return this.currentSelection.extractedText || '';
    }
}

// Patterns Tab PDF Viewer
class PatternsPDFViewer {
    constructor() {
        this.pdf = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.zoomLevel = 1.0;
        this.canvas = null;
        this.context = null;
        this.selectionMode = false;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.currentSelection = null;
        this.textItems = [];
        this.selectionOverlay = null;
        this.selectionCanvas = null;
        
        this.initializeViewer();
        this.bindEvents();
    }
    
    initializeViewer() {
        const previewContainer = document.getElementById('pdfPreviewPatterns');
        
        // Clear existing content
        previewContainer.innerHTML = `
            <div class="no-pdf-selected-patterns">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDF Selected</h3>
                <p>Load a PDF file to start pattern extraction</p>
            </div>
        `;
        
        this.updateControls();
        this.setupSelectionOverlay();
    }
    
    setupSelectionOverlay() {
        this.selectionOverlay = document.getElementById('selectionOverlayPatterns');
        this.selectionCanvas = document.getElementById('selectionCanvasPatterns');
        
        // Check if elements exist before proceeding
        if (!this.selectionOverlay || !this.selectionCanvas) {
            console.warn('Selection overlay elements not found, retrying in 100ms...');
            setTimeout(() => this.setupSelectionOverlay(), 100);
            return;
        }
        
        try {
            // Initialize selection canvas context
            const ctx = this.selectionCanvas.getContext('2d');
            ctx.strokeStyle = '#007bff';
            ctx.lineWidth = 2;
            ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
            console.log('Selection overlay setup complete');
        } catch (error) {
            console.error('Error setting up selection overlay:', error);
        }
    }
    
    bindEvents() {
        // Wait for DOM to be ready
        setTimeout(() => {
            try {
                // Selection mode toggle
                const toggleBtn = document.getElementById('toggleSelectionModePatterns');
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', () => {
                        this.toggleSelectionMode();
                    });
                }
                
                // Selection canvas events
                if (this.selectionCanvas) {
                    this.selectionCanvas.addEventListener('mousedown', (e) => this.startSelection(e));
                    this.selectionCanvas.addEventListener('mousemove', (e) => this.updateSelection(e));
                    this.selectionCanvas.addEventListener('mouseup', (e) => this.endSelection(e));
                }
                
                // Keyboard events
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.selectionMode) {
                        this.clearSelection();
                    }
                });
                
                // Click outside to clear selection
                if (this.selectionOverlay) {
                    this.selectionOverlay.addEventListener('click', (e) => {
                        if (e.target === this.selectionOverlay) {
                            this.clearSelection();
                        }
                    });
                }
                
                // Navigation buttons
                const prevBtn = document.getElementById('prevPageBtnPatterns');
                if (prevBtn) {
                    prevBtn.addEventListener('click', () => {
                        this.previousPage();
                    });
                }
                
                const nextBtn = document.getElementById('nextPageBtnPatterns');
                if (nextBtn) {
                    nextBtn.addEventListener('click', () => {
                        this.nextPage();
                    });
                }
                
                // Zoom buttons
                const zoomInBtn = document.getElementById('zoomInBtnPatterns');
                if (zoomInBtn) {
                    zoomInBtn.addEventListener('click', () => {
                        this.zoomIn();
                    });
                }
                
                const zoomOutBtn = document.getElementById('zoomOutBtnPatterns');
                if (zoomOutBtn) {
                    zoomOutBtn.addEventListener('click', () => {
                        this.zoomOut();
                    });
                }
                
                console.log('PatternsPDFViewer events bound successfully');
            } catch (error) {
                console.error('Error binding PatternsPDFViewer events:', error);
            }
        }, 100);
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
            console.log('PatternsPDFViewer: Rendering page...');
            
            const page = await this.pdf.getPage(this.currentPage);
            const viewport = page.getViewport({ scale: this.zoomLevel });
            
            const previewContainer = document.getElementById('pdfPreviewPatterns');
            if (!previewContainer) {
                console.error('PatternsPDFViewer: pdfPreviewPatterns container not found!');
                return;
            }
            
            console.log('PatternsPDFViewer: Found preview container, clearing content...');
            previewContainer.innerHTML = '';
            
            // Create canvas for the page
            this.canvas = document.createElement('canvas');
            this.context = this.canvas.getContext('2d');
            
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            this.canvas.style.width = '100%';
            this.canvas.style.height = 'auto';
            this.canvas.style.maxWidth = '100%';
            
            previewContainer.appendChild(this.canvas);
            console.log('PatternsPDFViewer: Canvas added to container');
            
            // Render the page
            const renderContext = {
                canvasContext: this.context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            console.log('PatternsPDFViewer: Page rendered successfully');
            
            // Update selection overlay
            this.updateSelectionOverlay();
            
        } catch (error) {
            console.error('Error rendering page:', error);
            this.showError('Failed to render page: ' + error.message);
        }
    }
    
    updateSelectionOverlay() {
        if (!this.canvas) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const previewContainer = document.getElementById('pdfPreviewContainerPatterns');
        const containerRect = previewContainer.getBoundingClientRect();
        
        this.selectionCanvas.width = canvasRect.width;
        this.selectionCanvas.height = canvasRect.height;
        this.selectionCanvas.style.width = canvasRect.width + 'px';
        this.selectionCanvas.style.height = canvasRect.height + 'px';
        this.selectionCanvas.style.left = (canvasRect.left - containerRect.left) + 'px';
        this.selectionCanvas.style.top = (canvasRect.top - containerRect.top) + 'px';
    }
    
    updateControls() {
        // Update page info
        document.getElementById('currentPagePatterns').textContent = this.currentPage;
        document.getElementById('totalPagesPatterns').textContent = this.totalPages;
        
        // Update zoom level
        document.getElementById('zoomLevelPatterns').textContent = Math.round(this.zoomLevel * 100) + '%';
        
        // Update navigation buttons
        document.getElementById('prevPageBtnPatterns').disabled = this.currentPage <= 1;
        document.getElementById('nextPageBtnPatterns').disabled = this.currentPage >= this.totalPages;
        
        // Update selection mode button
        document.getElementById('toggleSelectionModePatterns').disabled = !this.pdf;
    }
    
    toggleSelectionMode() {
        this.selectionMode = !this.selectionMode;
        const button = document.getElementById('toggleSelectionModePatterns');
        
        if (this.selectionMode) {
            button.classList.add('btn-success');
            button.classList.remove('btn-info');
            button.innerHTML = '<i class="fas fa-check"></i> Selection Active';
            this.selectionOverlay.classList.add('active');
            this.selectionCanvas.classList.add('active');
        } else {
            button.classList.remove('btn-success');
            button.classList.add('btn-info');
            button.innerHTML = '<i class="fas fa-crosshairs"></i> Selection Mode';
            this.selectionOverlay.classList.remove('active');
            this.selectionCanvas.classList.remove('active');
            this.clearSelection();
        }
    }
    
    startSelection(e) {
        if (!this.selectionMode) return;
        
        this.isSelecting = true;
        const rect = this.selectionCanvas.getBoundingClientRect();
        this.selectionStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.selectionEnd = { ...this.selectionStart };
        this.drawSelection();
    }
    
    updateSelection(e) {
        if (!this.isSelecting || !this.selectionMode) return;
        
        const rect = this.selectionCanvas.getBoundingClientRect();
        this.selectionEnd = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.drawSelection();
    }
    
    endSelection(e) {
        if (!this.isSelecting || !this.selectionMode) return;
        
        this.isSelecting = false;
        
        if (this.selectionStart && this.selectionEnd) {
            this.currentSelection = {
                start: { ...this.selectionStart },
                end: { ...this.selectionEnd }
            };
            
            console.log('PatternsPDFViewer: Selection created:', this.currentSelection);
            this.updateSelectionDetails();
            
            // Enable save button immediately when selection is made
            const saveBtn = document.getElementById('saveVisualPatternBtn');
            if (saveBtn) {
                saveBtn.disabled = false;
                console.log('PatternsPDFViewer: Save button enabled after selection');
            }
        } else {
            console.log('PatternsPDFViewer: No selection created - missing start or end');
        }
    }
    
    drawSelection() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        const ctx = this.selectionCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        if (width > 0 && height > 0) {
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
        }
    }
    
    updateSelectionDetails() {
        if (!this.currentSelection) return;
        
        console.log('PatternsPDFViewer: Updating selection details...');
        
        const start = this.currentSelection.start;
        const end = this.currentSelection.end;
        
        // Store page number in the selection object for pattern saving
        this.currentSelection.page = this.currentPage;
        
        document.getElementById('selectedPage').textContent = this.currentPage;
        document.getElementById('selectedPosition').textContent = 
            `(${Math.round(start.x)}, ${Math.round(start.y)}) to (${Math.round(end.x)}, ${Math.round(end.y)})`;
        
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        document.getElementById('selectedSize').textContent = 
            `${Math.round(width)} × ${Math.round(height)} pixels`;
        
        console.log('PatternsPDFViewer: Selection details updated, calling extractTextFromSelection...');
        
        // Extract text from selection
        this.extractTextFromSelection();
    }
    
    async extractTextFromSelection() {
        if (!this.currentSelection || !this.pdf) return;
        
        try {
            console.log('PatternsPDFViewer: Extracting text from selection...');
            
            const page = await this.pdf.getPage(this.currentPage);
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Convert canvas coordinates to PDF coordinates
            const canvasRect = this.canvas.getBoundingClientRect();
            const scaleX = viewport.width / canvasRect.width;
            const scaleY = viewport.height / canvasRect.height;
            
            const pdfStartX = this.currentSelection.start.x * scaleX;
            const pdfStartY = viewport.height - (this.currentSelection.start.y * scaleY);
            const pdfEndX = this.currentSelection.end.x * scaleX;
            const pdfEndY = viewport.height - (this.currentSelection.end.y * scaleY);
            
            console.log('PatternsPDFViewer: Canvas rect:', canvasRect);
            console.log('PatternsPDFViewer: Viewport:', viewport);
            console.log('PatternsPDFViewer: Scale factors:', { scaleX, scaleY });
            console.log('PatternsPDFViewer: PDF coordinates:', { pdfStartX, pdfStartY, pdfEndX, pdfEndY });
            
            const textContent = await page.getTextContent();
            console.log('PatternsPDFViewer: Text content items:', textContent.items.length);
            
            let extractedText = '';
            let foundItems = 0;
            
            // Use a more flexible text extraction approach
            for (const item of textContent.items) {
                const itemX = item.transform[4];
                const itemY = item.transform[5];
                const itemWidth = item.width;
                const itemHeight = item.height;
                
                // Check if text item overlaps with selection bounds (more flexible)
                const itemRight = itemX + itemWidth;
                const itemBottom = itemY + itemHeight;
                
                const selectionLeft = Math.min(pdfStartX, pdfEndX);
                const selectionRight = Math.max(pdfStartX, pdfEndX);
                const selectionTop = Math.min(pdfStartY, pdfEndY);
                const selectionBottom = Math.max(pdfStartY, pdfEndY);
                
                // Check for overlap instead of strict containment
                if (itemX < selectionRight && itemRight > selectionLeft && 
                    itemY < selectionBottom && itemBottom > selectionTop) {
                    extractedText += item.str + ' ';
                    foundItems++;
                    console.log('PatternsPDFViewer: Found text item:', { 
                        text: item.str, 
                        x: itemX, 
                        y: itemY, 
                        width: itemWidth, 
                        height: itemHeight 
                    });
                }
            }
            
            extractedText = extractedText.trim();
            console.log('PatternsPDFViewer: Extracted text:', extractedText);
            console.log('PatternsPDFViewer: Found items:', foundItems);
            
            // Update preview
            const previewElement = document.getElementById('extractedTextPreview');
            if (previewElement) {
                previewElement.textContent = extractedText || 'No text found in selection';
                console.log('PatternsPDFViewer: Updated extracted text preview:', extractedText || 'No text found in selection');
            } else {
                console.error('PatternsPDFViewer: extractedTextPreview element not found!');
            }
            
            // Enable save button if text was extracted
            const saveBtn = document.getElementById('saveVisualPatternBtn');
            if (saveBtn) {
                saveBtn.disabled = !extractedText;
                console.log('PatternsPDFViewer: Save button found, disabled:', !extractedText);
                console.log('PatternsPDFViewer: Extracted text length:', extractedText ? extractedText.length : 0);
            } else {
                console.error('PatternsPDFViewer: saveVisualPatternBtn element not found!');
            }
            
            // Store extracted text for pattern creation
            this.extractedText = extractedText;
            
        } catch (error) {
            console.error('Error extracting text:', error);
            const previewElement = document.getElementById('extractedTextPreview');
            if (previewElement) {
                previewElement.textContent = 'Error extracting text: ' + error.message;
            }
        }
    }
    
    clearSelection() {
        this.currentSelection = null;
        this.selectionStart = null;
        this.selectionEnd = null;
        
        if (this.selectionCanvas) {
            const ctx = this.selectionCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
        }
        
        // Reset selection details
        document.getElementById('selectedPage').textContent = '-';
        document.getElementById('selectedPosition').textContent = 'No selection';
        document.getElementById('selectedSize').textContent = '-';
        document.getElementById('extractedTextPreview').textContent = 'Make a selection above to extract text';
        
        // Clear manual text entry
        const manualText = document.getElementById('manualPatternText');
        if (manualText) {
            manualText.value = '';
        }
        
        // Disable save button
        const saveBtn = document.getElementById('saveVisualPatternBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
        }
    }
    
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderPage();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.renderPage();
        }
    }
    
    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.2, 3.0);
        this.renderPage();
    }
    
    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.3);
        this.renderPage();
    }
    
    showError(message) {
        const previewContainer = document.getElementById('pdfPreviewPatterns');
        previewContainer.innerHTML = `
            <div class="no-pdf-selected-patterns">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
    
    getCurrentSelection() {
        return this.currentSelection;
    }
    
    getExtractedText() {
        return this.extractedText || '';
    }
    
    // Debug method to test text extraction manually
    async testTextExtraction() {
        console.log('PatternsPDFViewer: Testing text extraction manually...');
        
        if (!this.pdf) {
            console.log('PatternsPDFViewer: No PDF loaded');
            return;
        }
        
        try {
            const page = await this.pdf.getPage(this.currentPage);
            const textContent = await page.getTextContent();
            console.log('PatternsPDFViewer: Total text items found:', textContent.items.length);
            
            if (textContent.items.length > 0) {
                console.log('PatternsPDFViewer: First few text items:');
                textContent.items.slice(0, 5).forEach((item, index) => {
                    console.log(`  Item ${index}: "${item.str}" at (${item.transform[4]}, ${item.transform[5]})`);
                });
            }
            
            // Try to extract some sample text
            let sampleText = '';
            textContent.items.slice(0, 3).forEach(item => {
                sampleText += item.str + ' ';
            });
            
            this.extractedText = sampleText.trim();
            console.log('PatternsPDFViewer: Sample text extracted:', this.extractedText);
            
            // Try to enable save button
            const saveBtn = document.getElementById('saveVisualPatternBtn');
            if (saveBtn) {
                saveBtn.disabled = !this.extractedText;
                console.log('PatternsPDFViewer: Save button disabled after test:', !this.extractedText);
            }
            
        } catch (error) {
            console.error('PatternsPDFViewer: Error in test text extraction:', error);
        }
    }
    
    updatePatternPreview() {
        if (!this.currentSelection) return;
        
        const start = this.currentSelection.start;
        const end = this.currentSelection.end;
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        const previewElement = document.getElementById('patternPreview');
        if (previewElement) {
            const previewContent = previewElement.querySelector('.preview-content');
            if (previewContent) {
                previewContent.innerHTML = `
                    <strong>Pattern Name:</strong> ${document.getElementById('newPatternName').value || 'Unnamed'}<br>
                    <strong>Extracted Text:</strong> "${this.extractedText || 'No text extracted'}"<br>
                    <strong>Position:</strong> Page ${this.currentPage}, (${Math.round(start.x)}, ${Math.round(start.y)})<br>
                    <strong>Size:</strong> ${Math.round(width)} × ${Math.round(height)} pixels
                `;
            }
        }
    }
}

// Initialize interactive PDF viewer when DOM is loaded
let interactivePDFViewer;
document.addEventListener('DOMContentLoaded', () => {
    interactivePDFViewer = new InteractivePDFViewer();
    window.interactivePDFViewer = interactivePDFViewer;
});

// Initialize Patterns PDF Viewer
// NOTE: This viewer is no longer used since we consolidated into the main Files & Patterns tab
// let patternsPDFViewer;
// document.addEventListener('DOMContentLoaded', () => {
//     patternsPDFViewer = new PatternsPDFViewer();
//     window.patternsPDFViewer = patternsPDFViewer;
// });
