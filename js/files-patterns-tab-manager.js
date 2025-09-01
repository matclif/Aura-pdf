// Files & Patterns Tab Manager - Handles both file operations and pattern creation
class FilesPatternsTabManager {
    constructor() {
        this.bindEvents();
        this.currentSelection = null;
    }

    bindEvents() {
        console.log('Files & Patterns Tab Manager: Binding events...');
        
        // File operation buttons
        const openFilesBtn = document.getElementById('openFilesBtn');
        console.log('Files & Patterns Tab Manager: openFilesBtn found:', !!openFilesBtn);
        if (openFilesBtn) {
            openFilesBtn.addEventListener('click', () => this.openFiles());
            console.log('Files & Patterns Tab Manager: openFilesBtn event bound');
        } else {
            console.error('Files & Patterns Tab Manager: openFilesBtn not found!');
        }

        const selectFolderBtn = document.getElementById('selectFolderBtn');
        if (selectFolderBtn) {
            selectFolderBtn.addEventListener('click', () => this.selectFolder());
        }

        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllFiles());
        }

        const bulkRenameBtn = document.getElementById('bulkRenameBtn');
        if (bulkRenameBtn) {
            bulkRenameBtn.addEventListener('click', () => this.openBulkRename());
        }

        // Pattern creation buttons
        const saveVisualPatternBtn = document.getElementById('saveVisualPatternBtn');
        if (saveVisualPatternBtn) {
            saveVisualPatternBtn.addEventListener('click', () => this.saveVisualPattern());
        }

        const cancelPatternBtn = document.getElementById('cancelPatternBtn');
        if (cancelPatternBtn) {
            cancelPatternBtn.addEventListener('click', () => this.cancelPatternCreation());
        }
    }

    // --- File Handling Functions ---
    async openFiles() {
        try {
            console.log('Files & Patterns: Opening file dialog...');
            const result = await ipcRenderer.invoke('open-file-dialog', {
                title: 'Select PDF Files',
                properties: ['openFile', 'multiSelections']
            });

            if (!result.canceled && result.filePaths.length > 0) {
                console.log(`Files & Patterns: Selected ${result.filePaths.length} files`);
                for (const filePath of result.filePaths) {
                    await this.addFile(filePath);
                }
                this.updateFileList();
                this.updateUI();
                console.log(`Files & Patterns: Loaded ${window.tabFileManager.getFileCount('files-patterns')} files`);
            }
        } catch (error) {
            console.error('Error opening files:', error);
        }
    }

    async selectFolder() {
        try {
            const result = await ipcRenderer.invoke('open-folder-dialog', {
                title: 'Select Folder with PDF Files'
            });

            if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                const folderPath = result.filePaths[0];
                const pdfFiles = await ipcRenderer.invoke('get-pdf-files-from-folder', folderPath);
                
                if (pdfFiles && pdfFiles.length > 0) {
                    for (const filePath of pdfFiles) {
                        await this.addFile(filePath);
                    }
                    this.updateFileList();
                    this.updateUI();
                }
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
        }
    }

    async addFile(filePath) {
        try {
            const fileResult = await ipcRenderer.invoke('read-pdf-file', filePath);
            if (!fileResult.success) {
                throw new Error(fileResult.error);
            }

            const statsResult = await ipcRenderer.invoke('get-file-stats', filePath);
            
            const file = {
                path: filePath,
                name: this.getFileName(filePath),
                basename: this.getBaseName(filePath),
                size: fileResult.size,
                buffer: fileResult.buffer,
                pages: 0,
                text: '',
                modified: statsResult.success ? new Date(statsResult.modified) : new Date(),
                selected: false
            };

            // Get page count from PDF
            try {
                const pdf = await pdfjsLib.getDocument({ data: file.buffer }).promise;
                file.pages = pdf.numPages;
            } catch (error) {
                console.error('Error getting page count:', error);
                file.pages = 0;
            }

            window.tabFileManager.addFile('files-patterns', file);
        } catch (error) {
            console.error('Error adding file:', error);
        }
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        const files = window.tabFileManager.getFiles('files-patterns');
        
        if (files.length === 0) {
            fileList.innerHTML = `
                <div class="empty-files">
                    <p>No PDF files loaded</p>
                    <p>Click "Open PDF Files" to get started</p>
                </div>
            `;
            return;
        }

        fileList.innerHTML = files.map((file, index) => `
            <div class="file-item ${file.selected ? 'selected' : ''}" onclick="filesPatternsTabManager.selectFile(${index})">
                <div class="file-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-details">
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                        <span class="file-pages">${file.pages} pages</span>
                        <span class="file-modified">${file.modified.toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-icon btn-danger" onclick="filesPatternsTabManager.removeFile(${index})" title="Remove File">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateUI() {
        const hasFiles = window.tabFileManager.hasFiles('files-patterns');
        
        // Update button states
        const bulkRenameBtn = document.getElementById('bulkRenameBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');
        
        if (bulkRenameBtn) bulkRenameBtn.disabled = !hasFiles;
        if (clearAllBtn) clearAllBtn.disabled = !hasFiles;
    }

    selectFile(index) {
        const files = window.tabFileManager.getFiles('files-patterns');
        if (index < 0 || index >= files.length) return;

        console.log(`Files & Patterns: Selecting file at index ${index}: ${files[index].name}`);

        // Deselect previous file
        files.forEach(file => file.selected = false);
        
        // Select new file
        files[index].selected = true;
        window.tabFileManager.setSelectedFile('files-patterns', files[index]);
        
        this.updateFileList();
        
        // Load PDF preview
        this.loadPDFPreview(files[index]);
        
        // Update current file name display
        this.updateCurrentFileName(files[index].name);
        
        console.log(`Files & Patterns: File selected and preview loaded`);
    }

    removeFile(index) {
        window.tabFileManager.removeFile('files-patterns', index);
        this.updateFileList();
        this.updateUI();
    }

    loadPDFPreview(file) {
        if (!file || !file.buffer) return;
        
        try {
            if (window.interactivePDFViewer) {
                const uint8Array = new Uint8Array(file.buffer);
                window.interactivePDFViewer.loadPDF(uint8Array);
            } else {
                console.error('Interactive PDF viewer not available');
            }
        } catch (error) {
            console.error('Error loading PDF preview:', error);
        }
    }

    updateCurrentFileName(fileName) {
        const currentFileNameElement = document.getElementById('currentFileName');
        if (currentFileNameElement) {
            currentFileNameElement.textContent = fileName;
        }
    }

    clearAllFiles() {
        if (confirm('Are you sure you want to clear all files?')) {
            window.tabFileManager.clearFiles('files-patterns');
            this.updateFileList();
            this.updateUI();
        }
    }

    openBulkRename() {
        // Switch to bulk tab and pass files
        if (window.app) {
            window.app.switchTab('bulk');
        }
        
        // Also copy files to bulk tab if needed
        const files = window.tabFileManager.getFiles('files-patterns');
        if (files.length > 0) {
            // Clear bulk tab files first
            window.tabFileManager.clearFiles('bulk');
            
            // Copy files to bulk tab
            files.forEach(file => {
                window.tabFileManager.addFile('bulk', file);
            });
            
            // Update bulk tab UI
            if (window.bulkTabManager) {
                window.bulkTabManager.updateFileList();
                window.bulkTabManager.updateUI();
            }
        }
    }

    // --- Pattern Creation Functions ---
    onSelectionMade(selection) {
        console.log('Files & Patterns: onSelectionMade called with selection:', selection);
        this.currentSelection = selection;
        this.showPatternCreationForm();
    }

    saveVisualPattern() {
        console.log('Files & Patterns: saveVisualPattern called');
        console.log('Files & Patterns: currentSelection:', this.currentSelection);
        
        if (!this.currentSelection) {
            console.error('Files & Patterns: No current selection');
            this.setStatus('Please make a selection first');
            return;
        }

        const patternName = document.getElementById('newPatternName');
        console.log('Files & Patterns: patternName element found:', !!patternName);
        if (!patternName) {
            console.error('Files & Patterns: Pattern name input not found');
            this.setStatus('Please enter a pattern name before saving');
            return;
        }

        const name = patternName.value.trim();
        console.log('Files & Patterns: Pattern name value:', name);
        if (!name) {
            console.error('Files & Patterns: Pattern name is empty');
            this.setStatus('Please enter a pattern name before saving');
            return;
        }

        // Get extracted text from the current selection
        let extractedText = '';
        console.log('Files & Patterns: interactivePDFViewer available:', !!window.interactivePDFViewer);
        console.log('Files & Patterns: getExtractedText function available:', !!(window.interactivePDFViewer && typeof window.interactivePDFViewer.getExtractedText === 'function'));
        
        if (window.interactivePDFViewer && typeof window.interactivePDFViewer.getExtractedText === 'function') {
            extractedText = window.interactivePDFViewer.getExtractedText();
            console.log('Files & Patterns: Extracted text from viewer:', extractedText);
        }

        if (!extractedText || extractedText.trim().length === 0) {
            // Try to get text from the selection object
            extractedText = this.currentSelection.extractedText || '';
            console.log('Files & Patterns: Extracted text from selection object:', extractedText);
            if (!extractedText || extractedText.trim().length === 0) {
                console.error('Files & Patterns: No text could be extracted');
                this.setStatus('No text could be extracted. Please try selecting a different area or enter text manually.');
                return;
            }
        }

        // Create the pattern object
        const pattern = {
            name: name,
            type: 'visual_position',
            position: {
                page: this.currentSelection.page,
                x: this.currentSelection.x,
                y: this.currentSelection.y,
                width: this.currentSelection.width,
                height: this.currentSelection.height,
                zoom: this.currentSelection.zoom || 1
            },
            sampleText: extractedText.trim(),
            description: `Extracts text from page ${this.currentSelection.page} at position (${this.currentSelection.x}, ${this.currentSelection.y})`,
            created: new Date().toISOString()
        };

        // Save to localStorage
        try {
            const existingPatterns = JSON.parse(localStorage.getItem('pdf-renamer-patterns') || '[]');
            existingPatterns.push(pattern);
            localStorage.setItem('pdf-renamer-patterns', JSON.stringify(existingPatterns));
            
            // Update the patterns array in the main app
            if (window.app && window.app.patterns) {
                window.app.patterns = existingPatterns;
            }
            
            // Show success message
            this.setStatus(`Visual pattern "${name}" saved successfully`);
            
            // Clear the pattern name input
            if (patternName) {
                patternName.value = '';
            }
            
            // Update preview
            this.updatePatternPreview();
            
        } catch (error) {
            console.error('Error saving pattern:', error);
            this.setStatus('Error saving pattern: ' + error.message);
        }
    }

    cancelPatternCreation() {
        this.clearPatternCreationForm();
        this.clearSelection();
        this.hidePatternCreationForm();
        console.log('Files & Patterns: Pattern creation cancelled.');
    }

    // --- Helper Functions for UI ---
    setCurrentSelection(selectionData) {
        this.currentSelection = selectionData;
        console.log('Files & Patterns: Selection updated:', this.currentSelection);
        this.showPatternCreationForm();
    }

    clearSelection() {
        this.currentSelection = null;
        
        // Hide pattern creation form
        const patternCreationForm = document.getElementById('patternCreationForm');
        if (patternCreationForm) {
            patternCreationForm.style.display = 'none';
        }
        
        // Clear pattern name
        const newPatternName = document.getElementById('newPatternName');
        if (newPatternName) {
            newPatternName.value = '';
        }
        
        // Update preview
        this.updatePatternPreview();
    }

    updatePatternPreview() {
        console.log('Files & Patterns: updatePatternPreview called');
        
        const newPatternName = document.getElementById('newPatternName');
        const previewContent = document.querySelector('#patternPreviewSection .preview-content');
        
        console.log('Files & Patterns: newPatternName element found:', !!newPatternName);
        console.log('Files & Patterns: previewContent element found:', !!previewContent);
        
        if (!newPatternName) {
            console.error('Files & Patterns: Pattern name input not found');
            return;
        }
        
        if (!previewContent) {
            console.error('Files & Patterns: Preview content element not found');
            return;
        }
        
        const patternName = newPatternName.value.trim();
        console.log('Files & Patterns: Pattern name value:', patternName);
        
        if (patternName && this.currentSelection) {
            const previewText = `Pattern: ${patternName}\nText: ${this.currentSelection.extractedText || 'No text extracted'}`;
            console.log('Files & Patterns: Setting preview text:', previewText);
            previewContent.textContent = previewText;
        } else if (this.currentSelection) {
            const previewText = 'Make a selection to see pattern preview';
            console.log('Files & Patterns: Setting default preview text:', previewText);
            previewContent.textContent = previewText;
        } else {
            const previewText = 'No selection made yet';
            console.log('Files & Patterns: Setting no selection preview text:', previewText);
            previewContent.textContent = previewText;
        }
    }
    
    clearPatternCreationForm() {
        const form = document.getElementById('patternCreationForm');
        if (form) {
            const nameInput = document.getElementById('newPatternName');
            const descInput = document.getElementById('patternDescription');
            if (nameInput) nameInput.value = '';
            if (descInput) descInput.value = '';
            this.hidePatternCreationForm();
        }
    }

    setStatus(message) {
        if (window.app && typeof window.app.setStatus === 'function') {
            window.app.setStatus(message);
        } else {
            console.log('Status:', message);
        }
    }

    hidePatternCreationForm() {
        const form = document.getElementById('patternCreationForm');
        if (form) {
            form.style.display = 'none';
        }
    }

    showPatternCreationForm() {
        console.log('Files & Patterns: Showing pattern creation form');
        const patternCreationForm = document.getElementById('patternCreationForm');
        console.log('Files & Patterns: patternCreationForm element found:', !!patternCreationForm);
        if (patternCreationForm) {
            patternCreationForm.style.display = 'block';
            console.log('Files & Patterns: Pattern creation form displayed');
        } else {
            console.error('Files & Patterns: Pattern creation form not found!');
        }
        
        // Enable the save button when showing the form (selection was made)
        const saveVisualPatternBtn = document.getElementById('saveVisualPatternBtn');
        console.log('Files & Patterns: saveVisualPatternBtn found:', !!saveVisualPatternBtn);
        if (saveVisualPatternBtn) {
            saveVisualPatternBtn.disabled = false;
            console.log('Files & Patterns: Save button enabled');
        } else {
            console.error('Files & Patterns: Save button not found!');
        }
        
        // Update the preview
        this.updatePatternPreview();
        
        // Debug: Check if form is visible
        setTimeout(() => {
            const form = document.getElementById('patternCreationForm');
            const computedStyle = window.getComputedStyle(form);
            console.log('Files & Patterns: Form display style:', computedStyle.display);
            console.log('Files & Patterns: Form visibility:', computedStyle.visibility);
            console.log('Files & Patterns: Form is visible:', form.style.display !== 'none');
        }, 100);
    }

    // Utility functions
    getFileName(path) {
        return path.split('/').pop() || path.split('\\').pop();
    }

    getBaseName(path) {
        const fileName = this.getFileName(path);
        return fileName.replace(/\.[^/.]+$/, '');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize files & patterns tab manager
let filesPatternsTabManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('Files & Patterns Tab Manager: DOM ready, creating instance...');
    try {
        filesPatternsTabManager = new FilesPatternsTabManager();
        window.filesPatternsTabManager = filesPatternsTabManager;
        console.log('Files & Patterns Tab Manager: Successfully created and assigned to window');
    } catch (error) {
        console.error('Files & Patterns Tab Manager: Failed to create instance.', error);
    }
});