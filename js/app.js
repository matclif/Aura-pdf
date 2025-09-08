// Main Application Logic
const { ipcRenderer } = require('electron');

class AuraPDFApp {
    constructor() {
        this.files = [];
        this.selectedFile = null;
        this.patterns = this.loadPatterns();
        this.currentPage = 1;
        this.totalPages = 0;
        this.zoomLevel = 1.0;
        this.selectedText = '';
        this.selectedTextPosition = null;
        this.textSelections = [];
        
        this.waitForPDFJS().then(() => {
            this.initializeApp();
            this.bindEvents();
            // Load patterns after DOM is ready - only once
            setTimeout(() => {
                this.loadSavedPatterns();
                this.debugPatternState(); // Debug pattern state
            }, 100); // Reduced delay for faster startup
        });
    }
    
    // Wait for PDF.js to be available
    async waitForPDFJS() {
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max wait (reduced from 5 seconds)
        
        while (typeof pdfjsLib === 'undefined' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js failed to load after 2 seconds');
            this.setStatus('Warning: PDF.js not loaded - some features may not work');
        } else {
            console.log('PDF.js loaded successfully');
            // Set up PDF.js worker
            if (pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
        }
    }
    
    debugPatternState() {
        console.log('=== Pattern Debug Info ===');
        console.log('Current patterns array:', this.patterns);
        console.log('Patterns array length:', this.patterns.length);
        console.log('localStorage content:', localStorage.getItem('aura-pdf-patterns'));
        console.log('localStorage parsed:', JSON.parse(localStorage.getItem('aura-pdf-patterns') || '[]'));
        console.log('========================');
    }
    
    initializeApp() {
        this.restoreLastActiveTab(); // Restore last active tab
        
        // Create sample patterns only if localStorage is completely empty
        this.ensureSamplePatterns();
        
        this.setStatus('Ready - Load PDF files to get started');
    }
    
    bindEvents() {
        // Tab switching

        this.bindElement('bulk', 'click', () => this.switchTab('bulk'));
        this.bindElement('split', 'click', () => this.switchTab('split'));
        this.bindElement('files', 'click', () => this.switchTab('files'));
        this.bindElement('settings', 'click', () => this.switchTab('settings'));
        
        // Pattern manager
        this.bindElement('patternManagerBtn', 'click', () => this.openPatternManagerModal());
        this.bindElement('reloadPatternsBtn', 'click', () => this.forceReloadPatterns());
        
        // Rename form
        this.bindElement('renameBtn', 'click', () => this.renameSelectedFile());
        this.bindElement('downloadBtn', 'click', () => this.downloadSelectedFile());
        this.bindElement('newFileName', 'keypress', (e) => {
            if (e.key === 'Enter') this.renameSelectedFile();
        });
        
        // Visual pattern creation - handled by tab manager now
        this.bindElement('cancelPatternBtn', 'click', () => this.cancelPatternCreation());

        
        // Debug button for testing - removed save button manipulation
        
        // Debug text extraction button - removed
        
                // Pattern combination
        this.bindElement('combinePatternsBtn', 'click', () => this.combineSelectedPatterns());
        this.bindElement('singleSecondPattern', 'change', () => this.updateCombineButtonState());
        this.bindElement('singleThirdPattern', 'change', () => this.updateCombineButtonState());
        
        // Bulk rename pattern selection
        document.addEventListener('change', (e) => {
            if (e.target.id === 'selectedPattern' || e.target.id === 'secondPattern' || 
                e.target.id === 'thirdPattern' || e.target.id === 'patternSeparator') {
                this.updateBulkRenamePreview();
            }
        });
        
        // PDF viewer controls are now handled by PatternsPDFViewer
        
        // Menu events from main process
        ipcRenderer.on('menu-open-files', () => this.openFiles());
        ipcRenderer.on('menu-split-pdf', () => this.openSplitModal());
        ipcRenderer.on('menu-bulk-rename', () => this.openBulkRenameModal());
        ipcRenderer.on('menu-pattern-manager', () => this.openPatternManagerModal());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });
        
        // Breadcrumb navigation
        this.bindElement('breadcrumb-main', 'click', () => this.switchTab('files'));
        
        // Files tab events
        this.bindElement('clearAllBtn', 'click', () => this.clearAllFiles());
        
        // PDF viewer controls
        this.bindElement('prevPageBtn', 'click', () => this.previousPage());
        this.bindElement('nextPageBtn', 'click', () => this.nextPage());
        this.bindElement('zoomInBtn', 'click', () => this.zoomIn());
        this.bindElement('zoomOutBtn', 'click', () => this.zoomOut());
        // Do not bind toggleSelectionMode here; InteractivePDFViewer owns this button's handler
        
        // Split tab events
        this.bindElement('splitType', 'change', () => this.updateSplitOptions());
        this.bindElement('splitStartPage', 'input', () => this.updateSplitInfo());
        this.bindElement('splitEndPage', 'input', () => this.updateSplitInfo());
        this.bindElement('splitPagesPerFile', 'input', () => this.updateSplitInfo());
        this.bindElement('splitFileSelect', 'change', () => this.updateSplitInfo());
        this.bindElement('executeSplitBtn', 'click', () => this.executeSplit());
        this.bindElement('clearFilesBtnSplit', 'click', () => this.clearSplitFiles());





    }
    
    // Helper function to safely bind events to elements
    bindElement(elementId, eventType, handler, retryCount = 0) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        } else if (retryCount < 2) {
            // Retry after a short delay for elements that might not be loaded yet
            setTimeout(() => {
                this.bindElement(elementId, eventType, handler, retryCount + 1);
            }, 200);
        } else {
            // Only log warning for critical elements that should always exist
            const criticalElements = ['bulk', 'split', 'files', 'settings'];
            if (criticalElements.includes(elementId)) {
                console.warn(`Critical element with id '${elementId}' not found after retries, skipping event binding`);
            }
            // Silently skip other elements as they might be tab-specific
        }
    }
    
    // Missing functions that are referenced in bindEvents
    openSplitModal() {
        console.log('Opening split modal...');
        // For now, just switch to split tab
        this.switchTab('split');
    }
    
    openPatternManagerModal() {
        console.log('Opening pattern manager modal...');
        // For now, just switch to files tab (patterns are now there)
        this.switchTab('files');
    }
    
    updateBulkRenamePreview() {
        console.log('Updating bulk rename preview...');
        // This will be implemented when we restore bulk rename functionality
    }
    
    updateSplitOptions() {
        const splitType = document.getElementById('splitType')?.value;
        const rangeGroup = document.getElementById('splitRangeGroup');
        const endGroup = document.getElementById('splitEndGroup');
        const countGroup = document.getElementById('splitCountGroup');
        
        if (rangeGroup && endGroup && countGroup) {
            rangeGroup.style.display = splitType === 'range' ? 'block' : 'none';
            endGroup.style.display = splitType === 'range' ? 'block' : 'none';
            countGroup.style.display = splitType === 'count' ? 'block' : 'none';
        }
    }
    
    updateSplitInfo() {
        console.log('Updating split info...');
        // This will be implemented when we restore split functionality
    }
    
    executeSplit() {
        console.log('Executing split...');
        // This will be implemented when we restore split functionality
    }
    
    clearSplitFiles() {
        console.log('Clearing split files...');
        // This will be implemented when we restore split functionality
    }
    
    openBulkRenameModal() {
        console.log('Opening bulk rename modal...');
        const modal = document.getElementById('bulkRenameModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error('Bulk rename modal not found');
        }
    }
    
    // Rename tab functions
    renameSelectedFile() {
        console.log('Renaming selected file...');
        if (!this.selectedFile) {
            alert('Please select a file first');
            return;
        }
        
        const newName = document.getElementById('newFileName').value.trim();
        if (!newName) {
            alert('Please enter a new file name');
            return;
        }
        
        // For now, just show a message
        alert(`Would rename file to: ${newName}`);
    }

    // Rename tab file upload functions
    async uploadPdfForRename() {
        console.log('Uploading PDF for rename...');
        
        if (window.electronAPI) {
            // Desktop app
            try {
                const result = await window.electronAPI.showOpenDialog({
                    title: 'Select PDF File for Rename',
                    properties: ['openFile'],
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    await this.loadPdfForRename(filePath);
                }
            } catch (error) {
                console.error('Error uploading PDF:', error);
                this.setStatus('Error uploading PDF: ' + error.message);
            }
        } else {
            // Web app
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.onchange = async (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    await this.loadPdfForRenameFromWeb(file);
                }
            };
            input.click();
        }
    }

    async selectFolderForRename() {
        console.log('Selecting folder for rename...');
        
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.showOpenDialog({
                    title: 'Select Folder with PDF Files for Rename',
                    properties: ['openDirectory']
                });

                if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                    const folderPath = result.filePaths[0];
                    const pdfFiles = await window.electronAPI.getPdfFilesFromFolder(folderPath);
                    
                    if (pdfFiles && pdfFiles.length > 0) {
                        // Use the first PDF file found
                        await this.loadPdfForRename(pdfFiles[0]);
                    } else {
                        this.setStatus('No PDF files found in the selected folder');
                    }
                }
            } catch (error) {
                console.error('Error selecting folder:', error);
                this.setStatus('Error selecting folder: ' + error.message);
            }
        } else {
            this.setStatus('Folder selection is not supported in web mode. Please use "Upload PDF File" instead.');
        }
    }

    async loadPdfForRename(filePath) {
        try {
            console.log('Loading PDF for rename:', filePath);
            
            const fileResult = await window.electronAPI.readFile(filePath);
            if (!fileResult.success) {
                throw new Error(fileResult.error);
            }

            const statsResult = await window.electronAPI.getFileStats(filePath);
            
            const file = {
                path: filePath,
                name: this.getFileName(filePath),
                basename: this.getBaseName(filePath),
                size: fileResult.size,
                buffer: fileResult.data.slice(0), // Clone buffer to prevent detachment
                pages: 0,
                text: '',
                modified: statsResult.success ? new Date(statsResult.modified) : new Date(),
                selected: false
            };

            // Get page count from PDF
            try {
                if (window.pdfjsLib) {
                    const pdf = await window.pdfjsLib.getDocument({ data: file.buffer }).promise;
                    file.pages = pdf.numPages;
                }
            } catch (error) {
                console.error('Error getting page count:', error);
                file.pages = 0;
            }

            // Add file to files array and select it
            this.files = [file]; // Replace files array with just this file
            this.selectedFile = file; // Set selected file directly to avoid PDF viewer loading
            

            this.setStatus(`PDF loaded for rename: ${file.name}`);
            
        } catch (error) {
            console.error('Error loading PDF for rename:', error);
            this.setStatus('Error loading PDF: ' + error.message);
        }
    }

    async loadPdfForRenameFromWeb(file) {
        try {
            console.log('Loading web PDF for rename:', file.name);
            
            const buffer = await file.arrayBuffer();
            const fileObj = {
                path: file.name,
                name: file.name,
                basename: this.getBaseName(file.name),
                size: file.size,
                buffer: buffer.slice(0), // Clone buffer to prevent detachment
                pages: 0,
                text: '',
                modified: new Date(file.lastModified),
                selected: false
            };

            // Get page count from PDF
            try {
                if (window.pdfjsLib) {
                    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
                    fileObj.pages = pdf.numPages;
                }
            } catch (error) {
                console.error('Error getting page count:', error);
                fileObj.pages = 0;
            }

            // Add file to files array and select it
            this.files = [fileObj]; // Replace files array with just this file
            this.selectedFile = fileObj; // Set selected file directly to avoid PDF viewer loading
            

            this.setStatus(`PDF loaded for rename: ${fileObj.name}`);
            
        } catch (error) {
            console.error('Error loading web PDF for rename:', error);
            this.setStatus('Error loading PDF: ' + error.message);
        }
    }




    
    downloadSelectedFile() {
        console.log('Downloading selected file...');
        if (!this.selectedFile) {
            alert('Please select a file first');
            return;
        }
        
        // For now, just show a message
        alert(`Would download: ${this.selectedFile.name}`);
    }
    
    // Bulk tab functions
    toggleTextSelectionMode() {
        console.log('Toggling text selection mode...');
        if (!window.interactivePDFViewer) {
            this.setStatus('Load a PDF first');
            return;
        }
        window.interactivePDFViewer.toggleSelectionMode();
    }
    
    // Settings tab functions
    openSettings() {
        console.log('Opening settings...');
        // This will be implemented when we restore settings functionality
        alert('Settings - will be implemented');
    }
    
    // Patterns tab functions
    openPatternManager() {
        console.log('Opening pattern manager...');
        // This will be implemented when we restore pattern management functionality
        alert('Pattern manager - will be implemented');
    }
    
    reloadPatterns() {
        console.log('Reloading patterns...');
        this.forceReloadPatterns();
    }
    
    // Files tab functions
    openFilesFromSidebar() {
        console.log('Opening files from sidebar...');
        this.openFiles();
    }
    
    selectFolderFromSidebar() {
        console.log('Selecting folder from sidebar...');
        this.selectFolder();
    }
    
    bulkRenameFromSidebar() {
        console.log('Opening bulk rename from sidebar...');
        this.openBulkRenameModal();
    }
    
    clearAllFilesFromSidebar() {
        console.log('Clearing all files from sidebar...');
        this.clearAllFiles();
    }
    
    // PDF viewer functions
    previousPageFromViewer() {
        console.log('Previous page from viewer...');
        this.previousPage();
    }
    
    nextPageFromViewer() {
        console.log('Next page from viewer...');
        this.nextPage();
    }
    
    zoomInFromViewer() {
        console.log('Zoom in from viewer...');
        this.zoomIn();
    }
    
    zoomOutFromViewer() {
        console.log('Zoom out from viewer...');
        this.zoomOut();
    }
    
    toggleSelectionModeFromViewer() {
        console.log('Toggle selection mode from viewer...');
        this.toggleTextSelectionMode();
    }
    
    // Missing functions that are referenced in bindEvents
    openSplitModal() {
        console.log('Opening split modal...');
        // For now, just switch to split tab
        this.switchTab('split');
    }
    
    openPatternManagerModal() {
        console.log('Opening pattern manager modal...');
        // For now, just switch to patterns tab
        this.switchTab('files');
    }
    
    updateBulkRenamePreview() {
        console.log('Updating bulk rename preview...');
        // This will be implemented when we restore bulk rename functionality
    }
    
    updateSplitOptions() {
        const splitType = document.getElementById('splitType')?.value;
        const rangeGroup = document.getElementById('splitRangeGroup');
        const endGroup = document.getElementById('splitEndGroup');
        const countGroup = document.getElementById('splitCountGroup');
        
        if (rangeGroup && endGroup && countGroup) {
            rangeGroup.style.display = splitType === 'range' ? 'block' : 'none';
            endGroup.style.display = splitType === 'range' ? 'block' : 'none';
            countGroup.style.display = splitType === 'count' ? 'block' : 'none';
        }
    }
    
    updateSplitInfo() {
        console.log('Updating split info...');
        // This will be implemented when we restore split functionality
    }
    
    executeSplit() {
        console.log('Executing split...');
        // This will be implemented when we restore split functionality
    }
    
    clearSplitFiles() {
        console.log('Clearing split files...');
        // This will be implemented when we restore split functionality
    }
    
    openBulkRenameModal() {
        console.log('Opening bulk rename modal...');
        const modal = document.getElementById('bulkRenameModal');
        if (modal) {
            modal.style.display = 'block';
            } else {
            console.error('Bulk rename modal not found');
        }
    }
    
    // Rename tab functions
    renameSelectedFile() {
        console.log('Renaming selected file...');
        if (!this.selectedFile) {
            alert('Please select a file first');
            return;
        }
        
        const newName = document.getElementById('newFileName').value.trim();
        if (!newName) {
            alert('Please enter a new file name');
                return;
            }
            
        // For now, just show a message
        alert(`Would rename file to: ${newName}`);
    }
    
    downloadSelectedFile() {
        console.log('Downloading selected file...');
        if (!this.selectedFile) {
            alert('Please select a file first');
            return;
        }
        
        // For now, just show a message
        alert(`Would download: ${this.selectedFile.name}`);
    }
    
    // Bulk tab functions
    toggleTextSelectionMode() {
        console.log('Toggling text selection mode...');
        // This will be implemented when we restore bulk rename functionality
        alert('Text selection mode toggle - will be implemented');
    }
    
    // Settings tab functions
    openSettings() {
        console.log('Opening settings...');
        // This will be implemented when we restore settings functionality
        alert('Settings - will be implemented');
    }
    
    // Patterns tab functions
    openPatternManager() {
        console.log('Opening pattern manager...');
        // This will be implemented when we restore pattern management functionality
        alert('Pattern manager - will be implemented');
    }
    
    reloadPatterns() {
        console.log('Reloading patterns...');
        this.forceReloadPatterns();
    }
    
    // Files tab functions
    openFilesFromSidebar() {
        console.log('Opening files from sidebar...');
        this.openFiles();
    }
    
    selectFolderFromSidebar() {
        console.log('Selecting folder from sidebar...');
        this.selectFolder();
    }
    
    bulkRenameFromSidebar() {
        console.log('Opening bulk rename from sidebar...');
        this.openBulkRenameModal();
    }
    
    clearAllFilesFromSidebar() {
        console.log('Clearing all files from sidebar...');
        this.clearAllFiles();
    }
    
    // PDF viewer functions
    previousPageFromViewer() {
        console.log('Previous page from viewer...');
        this.previousPage();
    }
    
    nextPageFromViewer() {
        console.log('Next page from viewer...');
        this.nextPage();
    }
    
    zoomInFromViewer() {
        console.log('Zoom in from viewer...');
        this.zoomIn();
    }
    
    zoomOutFromViewer() {
        console.log('Zoom out from viewer...');
        this.zoomOut();
    }
    
    toggleSelectionModeFromViewer() {
        console.log('Toggle selection mode from viewer...');
        this.toggleTextSelectionMode();
    }
    
    // Tab Management
    switchTab(tabName) {
        // Remove active class from all tabs and panes
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        // Add active class to selected tab and pane
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        const tabPane = document.getElementById(`${tabName}-tab`);
        
        if (tabButton) {
            tabButton.classList.add('active');
        }
        if (tabPane) {
            tabPane.classList.add('active');
        }
        
        // Update header to show current tab
        this.updateHeaderForTab(tabName);
        
        // Update status based on tab
        switch(tabName) {
            case 'rename':
                this.setStatus('Rename tab - Rename individual files using patterns');
                break;
            case 'bulk':
                this.setStatus('Bulk tab - Perform operations on multiple files');
                break;
            case 'split':
                this.setStatus('Split tab - Split PDF files into smaller documents');
                break;
            case 'files':
                this.setStatus('Files & Patterns tab - Load PDF files and create text extraction patterns');
                break;
            case 'settings':
                this.setStatus('Settings tab - Configure application preferences');
                break;
        }
        
        // Store the active tab in localStorage for persistence
        localStorage.setItem('active-tab', tabName);
        
        // Show contextual help after a short delay
        setTimeout(() => this.showContextualHelp(), 1000);
    }
    
    // Update header to show current tab context
    updateHeaderForTab(tabName) {
        const headerTitle = document.querySelector('.header-content h1');
        const breadcrumbCurrent = document.getElementById('breadcrumb-current');
        
        if (headerTitle) {
            const tabNames = {
                'bulk': 'Bulk Operations',
                'split': 'Split PDF',
                'files': 'Files & Patterns',
                'settings': 'Settings'
            };
            
            const tabNameDisplay = tabNames[tabName] || 'Aura PDF';
            headerTitle.innerHTML = `<i class="fas fa-file-pdf"></i> Aura PDF App - ${tabNameDisplay}`;
        }
        
        if (breadcrumbCurrent) {
            const tabNames = {
                'bulk': 'Bulk Operations',
                'split': 'Split PDF',
                'files': 'Files & Patterns',
                'settings': 'Settings'
            };
            
            breadcrumbCurrent.textContent = tabNames[tabName] || 'Files & Patterns';
        }
    }
    
    // Auto-switch to appropriate tab based on context
    autoSwitchTab(context) {
        switch(context) {
            case 'file-selected':
                this.switchTab('files');
                break;
            case 'bulk-operation':
                this.switchTab('bulk');
                break;
            case 'split-operation':
                this.switchTab('split');
                break;
            case 'pattern-creation':
                this.switchTab('files');
                break;
            case 'pattern-management':
                this.switchTab('files');
                break;
            default:
                this.switchTab('files');
        }
    }
    
    // Restore last active tab on app initialization
    restoreLastActiveTab() {
        const lastTab = localStorage.getItem('active-tab');
        // Default to 'files' tab for the original workflow
        if (!lastTab || !document.querySelector(`[data-tab="${lastTab}"]`)) {
            this.switchTab('files');
        } else {
            this.switchTab(lastTab);
        }
    }
    
    // Show contextual help based on current tab
    showContextualHelp() {
        const currentTab = document.querySelector('.tab-button.active').dataset.tab;
        let helpText = '';
        
        switch(currentTab) {
            case 'files':
                helpText = '💡 Tip: Drag and drop PDF files here, or use the "Open PDF Files" button. Select a file to preview and rename it.';
                break;
            case 'bulk':
                helpText = '💡 Tip: Use bulk operations to rename multiple files at once. Choose from pattern-based, sequential, or prefix/suffix naming.';
                break;
            case 'split':
                helpText = '💡 Tip: Split large PDFs into smaller files by page count. Perfect for breaking up long documents or creating chapter-based files.';
                break;
            case 'settings':
                helpText = '💡 Tip: Configure your preferences here. Changes are automatically saved.';
                break;
        }
        
        if (helpText) {
            this.setStatus(helpText);
        }
    }
    
    // File operations are now handled by individual tab managers
    async openFiles() {
        // This method is now handled by the Files & Patterns tab manager
        console.log('openFiles called from main app - delegating to tab manager');
    }
    
    // Pattern file operations are now handled by the Files & Patterns tab manager
    async openFilesForPatterns() {
        console.log('openFilesForPatterns called from main app - delegating to tab manager');
    }
    
    // Folder selection is now handled by individual tab managers
    async selectFolder() {
        console.log('selectFolder called from main app - delegating to tab manager');
    }
    
    // File addition is now handled by individual tab managers
    async addFile(filePath) {
        console.log('addFile called from main app - delegating to tab manager');
    }
    
    selectFile(index) {
        if (index < 0 || index >= this.files.length) return;
        
        // Deselect previous file
        if (this.selectedFile) {
            this.selectedFile.selected = false;
        }
        
        // Select new file
        this.selectedFile = this.files[index];
        this.selectedFile.selected = true;
        
        // Update UI
        this.updateFileList();
        this.updateRenamePanel();
        
        // Load PDF preview
        this.loadPDFPreview(this.selectedFile);
        
                        // Switch to files tab
                this.switchTab('files');
    }
    
    removeFile(index) {
        if (index < 0 || index >= this.files.length) return;
        
        const file = this.files[index];
        if (file === this.selectedFile) {
            this.selectedFile = null;
        }
        
        this.files.splice(index, 1);
        this.updateFileList();
        this.updateUI();
        
        if (this.files.length === 0) {
            this.setStatus('No PDF files loaded');
        }
    }
    
    loadPDFPreview(file) {
        if (!file || !file.buffer) return;
        
        if (window.interactivePDFViewer) {
            const uint8Array = new Uint8Array(file.buffer);
            window.interactivePDFViewer.loadPDF(uint8Array);
        }
    }
    
    // PDF Viewer Controls
    previousPage() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.previousPage();
        }
    }
    
    nextPage() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.nextPage();
        }
    }
    
    zoomIn() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.zoomIn();
        }
    }
    
    zoomOut() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.zoomOut();
        }
    }
    
    toggleTextSelectionMode() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.toggleSelectionMode();
        }
    }
    
    // Utility Functions
    getFileName(filePath) {
        return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
    }
    
    getBaseName(filePath) {
        const fileName = this.getFileName(filePath);
        return fileName.replace(/\.pdf$/i, '');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getSampleTextForPattern(pattern) {
        if (!pattern) return '';
        
        switch (pattern.type) {
            case 'visual_position':
                // For visual patterns, return a sample based on the pattern name
                return pattern.name.replace(/[^a-zA-Z0-9]/g, '');
            case 'text':
                // For text patterns, return the pattern text
                return pattern.name;
            default:
                return pattern.name;
        }
    }
    
    updateSinglePatternDropdowns() {
        // These elements no longer exist since we removed the rename tab
        // This method is kept for compatibility but does nothing
        return;
    }
    
    handleKeyboard(e) {
        // Handle keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'o':
                    e.preventDefault();
                    this.openFiles();
                    break;
            }
        }
    }
    
    showContextualHelp() {
        const currentTab = document.querySelector('.tab-button.active').dataset.tab;
        let helpText = '';
        
        switch (currentTab) {
            case 'files':
                helpText = 'Use this tab to load and manage your PDF files. Select files to preview and rename them.';
                break;
            case 'bulk':
                helpText = 'Perform bulk operations on multiple files. Load files first, then use patterns to rename them all.';
                break;
            case 'split':
                helpText = 'Split PDF files into smaller documents. Choose between splitting all pages, by range, or by count.';
                break;
            case 'settings':
                helpText = 'Configure application preferences and settings.';
                break;
        }
        
        if (helpText) {
            this.setStatus(helpText);
        }
    }
    
    setStatus(message) {
        const statusBar = document.getElementById('statusBar');
        if (statusBar) {
            statusBar.textContent = message;
        }
        console.log('Status:', message);
    }
    
    // Initialize the main PDF viewer
    initializeMainViewer() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.initializeViewer();
        }
    }
    
    // Initialize the patterns PDF viewer
    initializePatternsViewer() {
        if (window.patternsPDFViewer) {
            window.patternsPDFViewer.initializeViewer();
        }
    }
    
    // Initialize both viewers
    initializeViewers() {
        this.initializeMainViewer();
        this.initializePatternsViewer();
    }
    
    // Initialize the app after DOM is ready
    initializeApp() {
        this.restoreLastActiveTab(); // Restore last active tab
        
        // Create sample patterns only if localStorage is completely empty
        this.ensureSamplePatterns();
        
        // Initialize PDF viewers
        this.initializeViewers();
        
        this.setStatus('Ready - Load PDF files to get started');
    }
    
    // Ensure sample patterns exist
    ensureSamplePatterns() {
        try {
            const saved = localStorage.getItem('aura-pdf-patterns');
            if (!saved || JSON.parse(saved).length === 0) {
                console.log('Creating sample patterns...');
                this.patterns = [
                    {
                        name: 'Client Name',
                        type: 'text',
                        description: 'Extract client name from PDF',
                        regex: 'client[\\s:]+([a-zA-Z\\s]+)',
                        text: 'Client Name'
                    },
                    {
                        name: 'Case Number',
                        type: 'text',
                        description: 'Extract case number from PDF',
                        regex: 'case[\\s:]+([a-zA-Z0-9\\-]+)',
                        text: 'Case Number'
                    },
                    {
                        name: 'Date',
                        type: 'text',
                        description: 'Extract date from PDF',
                        regex: '(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})',
                        text: 'Date'
                    }
                ];
                this.savePatterns();
            }
        } catch (error) {
            console.error('Error ensuring sample patterns:', error);
        }
    }
    
    // Force reload patterns
    forceReloadPatterns() {
        console.log('Force reloading patterns...');
        this.patterns = this.loadPatterns();
        this.updatePatternList();
        this.setStatus('Patterns reloaded');
    }
    
    // Open pattern manager modal
    openPatternManagerModal() {
        // This will be implemented in the pattern manager
        this.setStatus('Pattern manager coming soon...');
    }
    
    // Open bulk rename modal
    openBulkRenameModal() {
        if (this.files.length === 0) {
            this.setStatus('Please load some PDF files first');
            return;
        }
        
        // This will be implemented in the bulk operations
        this.setStatus('Opening bulk rename modal...');
        // Trigger the bulk rename modal from bulk-operations.js
        if (window.bulkOperations) {
            window.bulkOperations.openModal();
        }
    }
    
    // Open split modal
    openSplitModal() {
        if (this.files.length === 0) {
            this.setStatus('Please load some PDF files first');
            return;
        }
        
        this.switchTab('split');
        this.setStatus('Split tab opened - select files and configure split options');
    }
    
    async loadPDFInfo(file) {
        try {
            const uint8Array = new Uint8Array(file.buffer);
            
            // Check if PDF.js is available
            if (typeof pdfjsLib === 'undefined') {
                console.warn('PDF.js not loaded, skipping text extraction');
                file.pages = 0;
                file.text = '';
                file.suggestions = [file.basename];
                return;
            }
            
            // Wait a bit for PDF.js to be fully initialized
            if (!pdfjsLib.getDocument) {
                console.warn('PDF.js not fully initialized, retrying...');
                await new Promise(resolve => setTimeout(resolve, 100));
                if (!pdfjsLib.getDocument) {
                    console.warn('PDF.js still not available, skipping text extraction');
                    file.pages = 0;
                    file.text = '';
                    file.suggestions = [file.basename];
                    return;
                }
            }
            
            const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            
            file.pages = pdf.numPages;
            
            // Extract text from first few pages for suggestions
            let allText = '';
            const pagesToProcess = Math.min(3, pdf.numPages);
            
            for (let i = 1; i <= pagesToProcess; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                allText += pageText + ' ';
            }
            
            file.text = allText.trim();
            file.suggestions = this.generateSuggestions(file.text, file.basename);
            
        } catch (error) {
            console.error('Error loading PDF info:', error);
            file.pages = 0;
            file.text = '';
            file.suggestions = [file.basename];
        }
    }
    
    generateSuggestions(text, fallback) {
        const suggestions = [];
        
        // Add fallback
        suggestions.push(fallback);
        
        if (!text) return suggestions;
        
        // Common patterns
        const patterns = [
            /invoice[:\s#]*(\d+)/i,
            /document[:\s#]*([a-z0-9]+)/i,
            /report[:\s#]*([a-z0-9\s]+)/i,
            /contract[:\s#]*([a-z0-9\s]+)/i,
            /proposal[:\s#]*([a-z0-9\s]+)/i,
            /(\d{4}[-/]\d{2}[-/]\d{2})/,
            /([A-Z][a-z]+\s+[A-Z][a-z]+)/,
        ];
        
        patterns.forEach(pattern => {
            const match = text.match(pattern);
            if (match && match[1]) {
                const suggestion = match[1].trim().replace(/\s+/g, ' ');
                if (suggestion.length > 2 && suggestion.length < 50) {
                    suggestions.push(suggestion);
                }
            }
        });
        
        // Apply saved patterns
        this.patterns.forEach(pattern => {
            try {
                const regex = new RegExp(pattern.regex, 'i');
                const match = text.match(regex);
                if (match && match[1]) {
                    const suggestion = match[1].trim().replace(/\s+/g, ' ');
                    if (suggestion.length > 2 && suggestion.length < 50) {
                        suggestions.push(`${pattern.name}: ${suggestion}`);
                    }
                }
            } catch (error) {
                console.error('Error applying pattern:', pattern.name, error);
            }
        });
        
        // Remove duplicates
        return [...new Set(suggestions)];
    }
    
    updateFileList() {
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');
        
        fileCount.textContent = `${this.files.length} file(s) loaded`;
        
        if (this.files.length === 0) {
            fileList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-pdf"></i>
                    <p>No PDF files loaded</p>
                    <button class="btn btn-outline" onclick="app.openFiles()">
                        Add PDF Files
                    </button>
                </div>
            `;
            return;
        }
        
        // Limit display to first 100 files to prevent UI slowdown
        const displayFiles = this.files.slice(0, 100);
        const remainingCount = this.files.length - displayFiles.length;
        
        let fileListHTML = displayFiles.map((file, index) => `
            <div class="file-item ${file.selected ? 'selected' : ''}" onclick="app.selectFile(${index})">
                <div class="file-name">${file.name}</div>
                <div class="file-info">
                    <span>${file.pages} pages</span>
                    <span>${this.formatFileSize(file.size)}</span>
                </div>
            </div>
        `).join('');
        
        if (remainingCount > 0) {
            fileListHTML += `
                <div class="file-item info">
                    <div class="file-name">... and ${remainingCount} more files</div>
                    <div class="file-info">
                        <span>Total: ${this.files.length} files</span>
                    </div>
                </div>
            `;
        }
        
        fileList.innerHTML = fileListHTML;
        
        // Also update the pattern list in the patterns tab
        this.updatePatternList();
        
        // Update split tab file list
        this.updateSplitFileSelection();
    }
    
    selectFile(index) {
        // Deselect all files
        this.files.forEach(file => file.selected = false);
        
        // Select the clicked file
        this.files[index].selected = true;
        this.selectedFile = this.files[index];
        this.selectedFileIndex = index;
        
        this.updateFileList();
        this.loadPDFViewer();
        this.updateRenamePanel();
        this.updateUI();
        

        
        // Switch to files tab for better user experience
        this.switchTab('files');
    }
    
    async loadPDFViewer() {
        if (!this.selectedFile) return;
        
        try {
            this.setStatus('Loading PDF preview...');
            
            const uint8Array = new Uint8Array(this.selectedFile.buffer);
            await window.interactivePDFViewer.loadPDF(uint8Array);
            
            // Update viewer header
            document.getElementById('currentFileName').textContent = this.selectedFile.name;
            
            this.setStatus('PDF loaded successfully');
            
        } catch (error) {
            console.error('Error loading PDF viewer:', error);
            this.setStatus('Error loading PDF: ' + error.message);
        }
    }
    
    updateRenamePanel() {
        const newFileNameInput = document.getElementById('newFileName');
        const suggestionChips = document.getElementById('suggestionChips');
        const renameBtn = document.getElementById('renameBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (!this.selectedFile) {
            newFileNameInput.value = '';
            newFileNameInput.disabled = true;
            renameBtn.disabled = true;
            downloadBtn.disabled = true;
            suggestionChips.innerHTML = '';
            return;
        }
        
        newFileNameInput.value = this.selectedFile.basename;
        newFileNameInput.disabled = false;
        renameBtn.disabled = false;
        downloadBtn.disabled = false;
        
        // Update suggestions
        suggestionChips.innerHTML = this.selectedFile.suggestions.map(suggestion => 
            `<span class="suggestion-chip" onclick="app.applySuggestion('${this.escapeHtml(suggestion)}')">${this.escapeHtml(suggestion)}</span>`
        ).join('');
    }
    
    applySuggestion(suggestion) {
        document.getElementById('newFileName').value = suggestion;
    }
    
    async renameSelectedFile() {
        if (!this.selectedFile) return;
        
        const newName = document.getElementById('newFileName').value.trim();
        if (!newName) {
            alert('Please enter a new file name');
            return;
        }
        
        try {
            this.setStatus('Renaming file...');
            
            const dir = this.getDirName(this.selectedFile.path);
            const newPath = `${dir}/${newName}.pdf`;
            
            if (newPath === this.selectedFile.path) {
                this.setStatus('File name unchanged');
                return;
            }
            
            const result = await ipcRenderer.invoke('rename-file', this.selectedFile.path, newPath);
            
            if (result.success) {
                this.selectedFile.path = newPath;
                this.selectedFile.name = `${newName}.pdf`;
                this.selectedFile.basename = newName;
                
                this.updateFileList();
                this.updateRenamePanel();
                this.setStatus(`File renamed to: ${newName}.pdf`);
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error renaming file:', error);
            alert('Error renaming file: ' + error.message);
            this.setStatus('Error renaming file');
        }
    }
    
    async downloadSelectedFile() {
        if (!this.selectedFile) return;
        
        try {
            this.setStatus('Downloading file...');
            
            const result = await ipcRenderer.invoke('download-file', this.selectedFile.path, this.selectedFile.name);
            
            if (result.success && !result.canceled) {
                this.setStatus(`File downloaded to: ${result.path}`);
            } else if (result.canceled) {
                this.setStatus('Download canceled');
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Error downloading file: ' + error.message);
            this.setStatus('Error downloading file');
        }
    }
    
    updateUI() {
        const hasFiles = this.files.length > 0;
        const hasSelected = !!this.selectedFile;
        
        // Update button states
        document.getElementById('bulkRenameBtn').disabled = !hasFiles;
        document.getElementById('bulkRenameBtnBulk').disabled = !hasFiles;
        document.getElementById('selectFolderBtn').disabled = false; // Always enabled
        document.getElementById('splitPdfBtn').disabled = !hasFiles;
        document.getElementById('extractPatternsBtn').disabled = !hasFiles; // Enable when files exist
        document.getElementById('clearAllBtn').disabled = !hasFiles;
        
        // Update file count displays in all tabs
        this.updateFileStatusDisplays();
        
        // Update file count display
        const fileCount = this.files.length;
        if (fileCount > 0) {
            this.setStatus(`Loaded ${fileCount} PDF file(s)`);
        }
    }
    
    updateFileStatusDisplays() {
        const fileCount = this.files.length;
        const fileCountText = fileCount === 0 ? 'No files loaded' : `${fileCount} PDF file(s) loaded`;
        
        // Update Files tab
        const fileCountElement = document.querySelector('#files-tab .file-count');
        if (fileCountElement) {
            fileCountElement.textContent = fileCountText;
        }
        
        // Update Bulk tab
        const fileStatusBulk = document.getElementById('fileStatusBulk');
        if (fileStatusBulk) {
            const bulkFileCount = fileStatusBulk.querySelector('.file-count');
            if (bulkFileCount) {
                bulkFileCount.textContent = fileCountText;
            }
        }
        
        // Update Patterns tab
        const fileStatusPatterns = document.getElementById('fileStatusPatterns');
        if (fileStatusPatterns) {
            const patternsFileCount = fileStatusPatterns.querySelector('.file-count');
            if (patternsFileCount) {
                patternsFileCount.textContent = fileCount === 0 ? 'No PDF loaded for pattern extraction' : `1 PDF loaded for pattern extraction`;
            }
        }
        
        // Update Split tab
        const fileStatusSplit = document.getElementById('fileStatusSplit');
        if (fileStatusSplit) {
            const splitFileCount = fileStatusSplit.querySelector('.file-count');
            if (splitFileCount) {
                splitFileCount.textContent = fileCountText;
            }
        }
        

    }
    
    clearAllFiles() {
        if (this.files.length === 0) return;
        
        if (confirm(`Are you sure you want to clear all ${this.files.length} PDF files?`)) {
            this.files = [];
            this.selectedFile = null;
            
            // Switch to files tab
            this.switchTab('files');
            
            this.setStatus('All PDF files cleared');
        }
    }
    
    refreshFiles() {
        this.setStatus('File list refreshed');
    }
    
    // File Management
    updateFileList() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;
        
        if (this.files.length === 0) {
            fileList.innerHTML = `
                <div class="empty-files">
                    <p>No PDF files loaded</p>
                    <p>Click "Open PDF Files" to get started</p>
                </div>
            `;
            return;
        }
        
        fileList.innerHTML = this.files.map((file, index) => `
            <div class="file-item ${file.selected ? 'selected' : ''}" onclick="app.selectFile(${index})">
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
                    <button class="btn-icon btn-danger" onclick="app.removeFile(${index})" title="Remove File">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    updateUI() {
        // Update file count in status
        if (this.files.length > 0) {
            this.setStatus(`Loaded ${this.files.length} PDF file(s)`);
        } else {
            this.setStatus('Ready - Load PDF files to get started');
        }
        
        // Update header button state
        const openFilesBtn = document.getElementById('openFilesBtn');
        if (openFilesBtn) {
            openFilesBtn.disabled = false;
        }
    }
    
    updateRenamePanel() {
        if (!this.selectedFile) {
            document.getElementById('newFileName').value = '';
            document.getElementById('newFileName').disabled = true;
            document.getElementById('renameBtn').disabled = true;
            document.getElementById('downloadBtn').disabled = true;
            document.getElementById('combinePatternsBtn').disabled = true;
            return;
        }
        
        const fileName = this.selectedFile.name;
        document.getElementById('newFileName').value = fileName;
        document.getElementById('newFileName').disabled = false;
        document.getElementById('renameBtn').disabled = false;
        document.getElementById('downloadBtn').disabled = false;
        
        // Update suggestions
        this.updateSuggestions();
        
        // Update pattern combination button state
        this.updateCombineButtonState();
    }
    
    updateSuggestions() {
        const suggestionChips = document.getElementById('suggestionChips');
        if (!suggestionChips || !this.selectedFile) return;
        
        const suggestions = this.selectedFile.suggestions || [];
        suggestionChips.innerHTML = suggestions.map(suggestion => `
            <span class="suggestion-chip" onclick="app.applySuggestion('${suggestion}')">
                ${this.escapeHtml(suggestion)}
            </span>
        `).join('');
    }
    
    applySuggestion(suggestion) {
        if (this.selectedFile) {
            document.getElementById('newFileName').value = suggestion;
        }
    }
    
    // Pattern Management
    loadPatterns() {
        try {
            const saved = localStorage.getItem('aura-pdf-patterns');
            console.log('Loading patterns from localStorage:', saved);
            const patterns = saved ? JSON.parse(saved) : [];
            console.log('Parsed patterns:', patterns);
            return patterns;
        } catch (error) {
            console.error('Error loading patterns:', error);
            return [];
        }
    }
    
    savePatterns() {
        try {
            console.log('Saving patterns to localStorage:', this.patterns);
            localStorage.setItem('aura-pdf-patterns', JSON.stringify(this.patterns));
            this.loadSavedPatterns();
            
            // Update bulk operations patterns if modal is open
            this.updateBulkOperationsPatterns();
        } catch (error) {
            console.error('Error saving patterns:', error);
        }
    }
    
    loadSavedPatterns() {
        console.log('Loading saved patterns, current patterns:', this.patterns);
        // Reload patterns from localStorage to ensure we have the latest
        this.patterns = this.loadPatterns();
        console.log('Reloaded patterns from localStorage:', this.patterns);
        this.updatePatternList();
    }
    
    updatePatternList() {
        const patternList = document.getElementById('patternList');
        if (!patternList) return;
        
        if (this.patterns.length === 0) {
            patternList.innerHTML = '<div class="empty-patterns"><p>No patterns saved</p></div>';
            return;
        }
        
        patternList.innerHTML = this.patterns.map((pattern, index) => `
            <div class="pattern-item">
                <div class="pattern-header">
                    <div class="pattern-info" onclick="app.applyPattern(${index})">
                        <div class="pattern-name">
                            ${this.escapeHtml(pattern.name)}
                            <span class="pattern-type ${pattern.type || 'text'}">${pattern.type === 'visual_position' ? 'VISUAL' : 'TEXT'}</span>
                        </div>
                        <div class="pattern-description">${this.escapeHtml(pattern.description || 'No description')}</div>
                    </div>
                    <div class="pattern-actions">
                        <button class="btn-icon btn-danger" onclick="app.deletePattern(${index})" title="Delete Pattern">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        

    }
    
    applyPattern(index) {
        const pattern = this.patterns[index];
        if (!this.selectedFile || !pattern) return;
        
        this.setStatus('Applying pattern...');
        
        try {
            let extractedText = '';
            
            if (pattern.type === 'visual_position') {
                // Handle visual position patterns
                extractedText = this.extractTextFromVisualPattern(this.selectedFile, pattern);
            } else if (pattern.regex) {
                // Handle regex patterns
                const regex = new RegExp(pattern.regex, 'i');
                const match = this.selectedFile.text.match(regex);
                
                if (match && match[1]) {
                    extractedText = match[1].trim().replace(/\s+/g, ' ');
                }
            }
            
            if (extractedText) {
                const cleanName = this.cleanFileName(extractedText);
                document.getElementById('newFileName').value = cleanName;
                this.setStatus(`✅ Applied pattern "${pattern.name}": "${cleanName}"`);
            } else {
                this.setStatus(`⚠️ Pattern "${pattern.name}" did not extract any text`);
            }
        } catch (error) {
            console.error('Error applying pattern:', error);
            this.setStatus(`❌ Error applying pattern: ${error.message}`);
        }
    }
    
    async applyMultiplePatterns(indexes, separator = '_') {
        if (!this.selectedFile || !indexes || indexes.length === 0) return;
        
        this.setStatus('Applying multiple patterns...');
        
        try {
            const extractedParts = [];
            
            for (const index of indexes) {
                const pattern = this.patterns[index];
                if (!pattern) continue;
                
                let extractedText = '';
                
                if (pattern.type === 'visual_position') {
                    extractedText = await this.extractTextFromVisualPattern(this.selectedFile, pattern);
                } else if (pattern.regex) {
                    const regex = new RegExp(pattern.regex, 'i');
                    const match = this.selectedFile.text.match(regex);
                    
                    if (match && match[1]) {
                        extractedText = match[1].trim().replace(/\s+/g, ' ');
                    }
                }
                
                if (extractedText) {
                    extractedParts.push(this.cleanFileName(extractedText));
                }
            }
            
            if (extractedParts.length > 0) {
                const combinedName = extractedParts.join(separator);
                document.getElementById('newFileName').value = combinedName;
                this.setStatus(`✅ Applied ${extractedParts.length} patterns: "${combinedName}"`);
            } else {
                this.setStatus(`⚠️ No patterns extracted any text`);
            }
        } catch (error) {
            console.error('Error applying multiple patterns:', error);
            this.setStatus(`❌ Error applying patterns: ${error.message}`);
        }
    }
    
        async extractTextFromVisualPattern(file, pattern) {
        try {
            if (!pattern.position) return '';
            
            // Try to get a fresh buffer for this operation
            let buffer = await this.getFreshBuffer(file);
            if (!buffer) {
                console.warn('Could not get fresh buffer, using fallback text extraction');
                return this.extractTextFromVisualPatternFallback(file, pattern);
            }
            
            // Load PDF and extract text from specific position
            const uint8Array = new Uint8Array(buffer);
            const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            
            if (pattern.position.page > pdf.numPages) {
                console.warn(`Pattern targets page ${pattern.position.page} but PDF only has ${pdf.numPages} pages`);
                return '';
            }
            
            const page = await pdf.getPage(pattern.position.page);
            const textContent = await page.getTextContent();
            
            // Convert pattern coordinates to current viewport
            const viewport = page.getViewport({ scale: 1.0 });
            
            const selectionRect = {
                left: pattern.position.x,
                top: pattern.position.y,
                right: pattern.position.x + pattern.position.width,
                bottom: pattern.position.y + pattern.position.height
            };
            
            const extractedItems = [];
            
            textContent.items.forEach(item => {
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
                
                // Check if text item intersects with selection
                if (this.rectanglesIntersect(selectionRect, itemRect)) {
                    extractedItems.push({
                        text: item.str,
                        x: x,
                        y: y
                    });
                }
            });
            
            // Sort by position (top to bottom, left to right)
            extractedItems.sort((a, b) => {
                if (Math.abs(a.y - b.y) < 5) { // Same line
                    return a.x - b.x;
                }
                return a.y - b.y;
            });
            
            return extractedItems.map(item => item.text).join(' ').trim();
            
        } catch (error) {
            console.error('Error extracting text from visual pattern:', error);
            // Try fallback method
            return this.extractTextFromVisualPatternFallback(file, pattern);
        }
    }
    
    rectanglesIntersect(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }
    
    async getFreshBuffer(file) {
        try {
            // First try to use the existing buffer if it's not detached
            if (file.buffer) {
                try {
                    new Uint8Array(file.buffer);
                    // Buffer is still valid, clone it for this operation
                    return file.buffer.slice(0);
                } catch (error) {
                    console.warn('Existing buffer is detached, attempting to refresh...');
                }
            }
            
            // Try to refresh from disk if possible
            if (window.electronAPI && file.path) {
                console.log('Refreshing buffer from disk for:', file.path);
                const fileResult = await window.electronAPI.readFile(file.path);
                if (fileResult.success) {
                    // Clone the buffer to prevent detachment
                    const clonedBuffer = fileResult.data.slice(0);
                    file.buffer = clonedBuffer;
                    return clonedBuffer;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting fresh buffer:', error);
            return null;
        }
    }
    
    async refreshFileBuffer(file) {
        try {
            if (window.electronAPI && file.path) {
                // Desktop app - try to reload from disk
                console.log('Refreshing buffer from disk for:', file.path);
                const fileResult = await window.electronAPI.readFile(file.path);
                if (fileResult.success) {
                    // Clone the buffer to prevent detachment
                    const clonedBuffer = fileResult.data.slice(0);
                    file.buffer = clonedBuffer;
                    return clonedBuffer;
                }
            }
            return null;
        } catch (error) {
            console.error('Error refreshing file buffer:', error);
            return null;
        }
    }
    
    extractTextFromVisualPatternFallback(file, pattern) {
        try {
            // Use pattern sample text if available
            if (pattern.sampleText) {
                console.log('Using pattern sample text as fallback');
                return pattern.sampleText;
            }
            
            // If no sample text, try to extract from the file's text property
            if (file.text && typeof file.text === 'string') {
                console.log('Using file text property as fallback');
                // Try to find text that might match the pattern
                // This is a simplified approach - just return some text
                return file.text.substring(0, 100).trim();
            }
            
            // Last resort - return a placeholder
            console.log('No fallback text available, using placeholder');
            return `[Text from ${pattern.name}]`;
            
        } catch (error) {
            console.error('Error in fallback text extraction:', error);
            return `[Text from ${pattern.name}]`;
        }
    }
    
    deletePattern(index) {
        const pattern = this.patterns[index];
        if (!pattern) return;
        
        if (confirm(`Are you sure you want to delete the pattern "${pattern.name}"?\n\nThis action cannot be undone.`)) {
            this.patterns.splice(index, 1);
            this.savePatterns();
            this.loadSavedPatterns();
            this.setStatus(`Pattern "${pattern.name}" deleted`);
            
            // Update bulk operations modal if it's open
            this.updateBulkOperationsPatterns();
        }
    }
    
    updateBulkOperationsPatterns() {
        // Check if bulk operations modal is open and update its patterns
        const bulkModal = document.getElementById('bulkRenameModal');
        if (bulkModal && bulkModal.classList.contains('active')) {
            console.log('Updating bulk operations patterns after deletion...');
            if (window.bulkOperations) {
                // Update the patterns in bulk operations
                window.bulkOperations.patterns = this.patterns;
                // Refresh the pattern dropdowns
                window.bulkOperations.populatePatternDropdown();
                // Update the preview to reflect changes
                window.bulkOperations.updatePreview();
            }
        }
    }
    
    cleanFileName(text) {
        if (!text) return '';
        
        // Remove invalid characters for file names
        let cleaned = text.replace(/[<>:"/\\|?*]/g, '');
        
        // Replace multiple spaces with single space
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        // Trim and limit length
        cleaned = cleaned.trim();
        if (cleaned.length > 100) {
            cleaned = cleaned.substring(0, 100).trim();
        }
        
        return cleaned || 'unnamed';
    }
    
    cleanPatternText(text) {
        if (!text) return '';
        
        // Remove unwanted characters that commonly appear in extracted text
        let cleaned = text
            // Remove commas, periods, semicolons, colons, exclamation marks, question marks
            .replace(/[,.;:!?]/g, '')
            // Remove quotes and parentheses that might cause issues
            .replace(/["'()]/g, '')
            // Remove extra spaces
            .replace(/\s+/g, ' ')
            // Remove leading/trailing spaces
            .trim();
        
        return cleaned;
    }
    

    
    saveSelectedPattern() {
        if (!this.selectedText) {
            alert('Please select text from the PDF first');
            return;
        }
        
        const patternName = document.getElementById('patternName').value.trim();
        if (!patternName) {
            alert('Please enter a pattern name');
            return;
        }
        
        // Create a simple regex from selected text
        const escapedText = this.selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = escapedText.replace(/\\\s+/g, '\\s+');
        
        const pattern = {
            name: patternName,
            regex: `(${regex})`,
            description: `Extracts text matching: "${this.selectedText}"`,
            created: new Date().toISOString()
        };
        
        this.patterns.push(pattern);
        this.savePatterns();
        
        // Clear form
        document.getElementById('patternName').value = '';
        document.getElementById('selectedTextPreview').textContent = 'Select text from the PDF above to create naming patterns';
        document.getElementById('savePatternBtn').disabled = true;
        document.getElementById('savePositionPatternBtn').disabled = true;
        this.selectedText = '';
        this.selectedTextPosition = null;
        
        this.setStatus(`Pattern "${patternName}" saved successfully`);
    }
    
    savePositionPattern() {
        if (!this.selectedText || !this.selectedTextPosition) {
            alert('Please select text from the PDF first');
            return;
        }
        
        const patternName = document.getElementById('patternName').value.trim();
        if (!patternName) {
            alert('Please enter a pattern name');
            return;
        }
        
        const pattern = {
            name: patternName,
            type: 'position',
            position: this.selectedTextPosition,
            sampleText: this.selectedText,
            description: `Extracts text from position: page ${this.selectedTextPosition.page}, coordinates (${this.selectedTextPosition.x}, ${this.selectedTextPosition.y})`,
            created: new Date().toISOString()
        };
        
        this.patterns.push(pattern);
        this.savePatterns();
        
        // Clear form
        document.getElementById('patternName').value = '';
        document.getElementById('selectedTextPreview').textContent = 'Select text from the PDF above to create naming patterns';
        document.getElementById('savePatternBtn').disabled = true;
        document.getElementById('savePositionPatternBtn').disabled = true;
        this.selectedText = '';
        this.selectedTextPosition = null;
        
        this.setStatus(`Position pattern "${patternName}" saved successfully`);
    }
    
    // saveVisualPattern method removed - now handled by tab manager
    
    cancelPatternCreation() {
        console.log('Canceling pattern creation...');
        
        // Hide the pattern creation form
        const patternForm = document.getElementById('patternCreationForm');
        if (patternForm) {
            patternForm.style.display = 'none';
        }
        
        // Clear form fields
        const nameField = document.getElementById('newPatternName');
        const descField = document.getElementById('patternDescription');
        const textField = document.getElementById('manualPatternText');
        
        if (nameField) nameField.value = '';
        if (descField) descField.value = '';
        if (textField) textField.value = '';
        
        // Clear any selection in the PDF viewer
        if (window.interactivePDFViewer && window.interactivePDFViewer.clearSelection) {
        window.interactivePDFViewer.clearSelection();
        }
        
        // Exit selection mode if active
        if (window.interactivePDFViewer && window.interactivePDFViewer.selectionMode) {
            window.interactivePDFViewer.toggleSelectionMode();
        }
        
        this.setStatus('Pattern creation cancelled');
    }

    // updatePatternPreview method removed - now handled by tab manager
    
    cancelPatternCreation() {
        document.getElementById('patternCreationForm').style.display = 'none';
        document.getElementById('newPatternName').value = '';
        document.getElementById('patternDescription').value = '';
        document.getElementById('manualPatternText').value = '';
        document.getElementById('patternPreviewSection').innerHTML = '';
        
        // Clear selection in the main viewer
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.clearSelection();
        }
    }
    
    // Pattern creation form management removed - now handled by tab manager
    
    cleanPatternText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
            .trim(); // Remove leading/trailing spaces
    }
    
    // Modal Management
    openBulkRenameModal() {
        console.log('Opening bulk rename modal...');
        console.log('Files count:', this.files.length);
        console.log('Patterns count:', this.patterns.length);
        
        if (this.files.length === 0) {
            alert('No files to rename');
            return;
        }
        
        // Switch to bulk tab first
        this.switchTab('bulk');
        
        // Use the bulk operations implementation instead of the local one
        if (window.bulkOperations) {
            window.bulkOperations.openBulkRenameModal(this.files, this.patterns);
        } else {
            // Fallback to local implementation if bulk operations not available
        const modal = document.getElementById('bulkRenameModal');
        if (modal) {
            modal.classList.add('active');
            this.populateBulkRenameModal();
        } else {
            console.error('Bulk rename modal not found');
            alert('Bulk rename modal not available');
            }
        }
    }
    
    populateBulkRenameModal() {
        // Populate all pattern dropdowns (primary, second, and third)
        const patternSelect = document.getElementById('selectedPattern');
        const secondPatternSelect = document.getElementById('secondPattern');
        const thirdPatternSelect = document.getElementById('thirdPattern');
        
        if (patternSelect) {
            patternSelect.innerHTML = '<option value="">Choose a pattern...</option>';
            this.patterns.forEach((pattern, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${pattern.name} (${pattern.type === 'visual_position' ? 'Visual' : 'Text'})`;
                patternSelect.appendChild(option);
            });
        }
        
        if (secondPatternSelect) {
            secondPatternSelect.innerHTML = '<option value="-1">No second pattern</option>';
            this.patterns.forEach((pattern, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${pattern.name} (${pattern.type === 'visual_position' ? 'Visual' : 'Text'})`;
                secondPatternSelect.appendChild(option);
            });
        }
        
        if (thirdPatternSelect) {
            thirdPatternSelect.innerHTML = '<option value="-1">No third pattern</option>';
            this.patterns.forEach((pattern, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${pattern.name} (${pattern.type === 'visual_position' ? 'Visual' : 'Text'})`;
                thirdPatternSelect.appendChild(option);
            });
        }
        
        // Show initial preview
        this.updateBulkRenamePreview();
    }
    
    updateBulkRenamePreview() {
        const strategy = document.querySelector('input[name="namingStrategy"]:checked').value;
        const preview = document.getElementById('renamePreview');
        
        if (!preview) return;
        
        try {
            let previewHTML = '';
            
            if (strategy === 'sequence') {
                const prefix = document.getElementById('sequencePrefix')?.value || 'Document_';
                const start = parseInt(document.getElementById('sequenceStart')?.value) || 1;
                
                previewHTML = this.files.slice(0, 10).map((file, index) => {
                    const newName = `${prefix}${(start + index).toString().padStart(3, '0')}.pdf`;
                    return `<div class="preview-item">
                        <span class="old-name">${this.escapeHtml(file.name)}</span>
                        <span style="margin: 0 1rem;">→</span>
                        <span class="new-name">${this.escapeHtml(newName)}</span>
                    </div>`;
                }).join('');
                
                if (this.files.length > 10) {
                    previewHTML += `<div class="preview-item info">... and ${this.files.length - 10} more files</div>`;
                }
            } else if (strategy === 'prefix') {
                const namePrefix = document.getElementById('namePrefix')?.value || '';
                const nameSuffix = document.getElementById('nameSuffix')?.value || '';
                
                previewHTML = this.files.slice(0, 10).map(file => {
                    const newName = `${namePrefix}${file.basename}${nameSuffix}.pdf`;
                    return `<div class="preview-item">
                        <span class="old-name">${this.escapeHtml(file.name)}</span>
                        <span style="margin: 0 1rem;">→</span>
                        <span class="new-name">${this.escapeHtml(newName)}</span>
                    </div>`;
                }).join('');
                
                if (this.files.length > 10) {
                    previewHTML += `<div class="preview-item info">... and ${this.files.length - 10} more files</div>`;
                }
            } else if (strategy === 'pattern') {
                // Pattern strategy - show preview based on selected patterns
                const patternIndex = parseInt(document.getElementById('selectedPattern')?.value || '-1');
                const secondPatternIndex = parseInt(document.getElementById('secondPattern')?.value || '-1');
                const thirdPatternIndex = parseInt(document.getElementById('thirdPattern')?.value || '-1');
                const separator = document.getElementById('patternSeparator')?.value || '_';
                
                if (patternIndex >= 0) {
                    // Show preview for pattern-based renaming
                    previewHTML = this.files.slice(0, 10).map(file => {
                        let newName = file.basename;
                        
                        // Apply primary pattern
                        if (patternIndex >= 0 && this.patterns[patternIndex]) {
                            const pattern = this.patterns[patternIndex];
                            const extractedText = this.extractTextFromPattern(file, pattern);
                            if (extractedText) {
                                newName = this.cleanFileName(extractedText);
                            }
                        }
                        
                        // Apply second pattern if selected
                        if (secondPatternIndex >= 0 && this.patterns[secondPatternIndex]) {
                            const pattern = this.patterns[secondPatternIndex];
                            const extractedText = this.extractTextFromPattern(file, pattern);
                            if (extractedText) {
                                newName += separator + this.cleanFileName(extractedText);
                            }
                        }
                        
                        // Apply third pattern if selected
                        if (thirdPatternIndex >= 0 && this.patterns[thirdPatternIndex]) {
                            const pattern = this.patterns[thirdPatternIndex];
                            const extractedText = this.extractTextFromPattern(file, pattern);
                            if (extractedText) {
                                newName += separator + this.cleanFileName(extractedText);
                            }
                        }
                        
                        return `<div class="preview-item">
                            <span class="old-name">${this.escapeHtml(file.name)}</span>
                            <span style="margin: 0 1rem;">→</span>
                            <span class="new-name">${this.escapeHtml(newName)}.pdf</span>
                    </div>`;
                }).join('');
                
                if (this.files.length > 10) {
                    previewHTML += `<div class="preview-item info">... and ${this.files.length - 10} more files</div>`;
                }
            } else {
                    previewHTML = this.files.slice(0, 10).map(file => 
                        `<div class="preview-item">
                            <span class="old-name">${this.escapeHtml(file.name)}</span>
                            <span style="margin: 0 1rem;">→</span>
                            <span class="new-name">Select a pattern to see preview</span>
                        </div>`
                    ).join('');
                    
                    if (this.files.length > 10) {
                        previewHTML += `<div class="preview-item info">... and ${this.files.length - 10} more files</div>`;
                    }
                }
            } else {
                // Default case
                previewHTML = this.files.slice(0, 10).map(file => 
                    `<div class="preview-item">
                        <span class="old-name">${this.escapeHtml(file.name)}</span>
                        <span style="margin: 0 1rem;">→</span>
                        <span class="new-name">Pattern will be applied</span>
                    </div>`
                ).join('');
                
                if (this.files.length > 10) {
                    previewHTML += `<div class="preview-item info">... and ${this.files.length - 10} more files</div>`;
                }
            }
            
            preview.innerHTML = previewHTML;
        } catch (error) {
            console.error('Error updating preview:', error);
            preview.innerHTML = '<p>Error generating preview</p>';
        }
    }
    
    openSimpleBulkRenameModal() {
        // Create a simple bulk rename modal for when the main one fails
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Bulk Rename Files (${this.files.length} files)</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="simple-rename-options">
                        <div class="form-group">
                            <label>Rename Strategy:</label>
                            <div class="radio-group">
                                <label><input type="radio" name="simpleStrategy" value="sequence" checked> Sequential Numbers</label>
                                <label><input type="radio" name="simpleStrategy" value="prefix"> Add Prefix/Suffix</label>
                            </div>
                        </div>
                        
                        <div id="sequenceOptions" class="strategy-options">
                            <div class="form-group">
                                <label for="simplePrefix">Prefix:</label>
                                <input type="text" id="simplePrefix" value="Document_" placeholder="e.g., Document_">
                            </div>
                            <div class="form-group">
                                <label for="simpleStart">Start Number:</label>
                                <input type="number" id="simpleStart" value="1" min="1">
                            </div>
                        </div>
                        
                        <div id="prefixOptions" class="strategy-options" style="display: none;">
                            <div class="form-group">
                                <label for="addPrefix">Add Prefix:</label>
                                <input type="text" id="addPrefix" placeholder="e.g., 2024_">
                            </div>
                            <div class="form-group">
                                <label for="addSuffix">Add Suffix:</label>
                                <input type="text" id="addSuffix" placeholder="e.g., _v1">
                            </div>
                        </div>
                        
                        <div class="preview-section">
                            <h4>Preview (first 5 files):</h4>
                            <div id="simplePreview" class="simple-preview">
                                <!-- Preview will be shown here -->
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="app.executeSimpleBulkRename()">
                        <i class="fas fa-check"></i> Rename All Files
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        document.querySelectorAll('input[name="simpleStrategy"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateSimplePreview());
        });
        
        document.getElementById('simplePrefix').addEventListener('input', () => this.updateSimplePreview());
        document.getElementById('simpleStart').addEventListener('input', () => this.updateSimplePreview());
        document.getElementById('addPrefix').addEventListener('input', () => this.updateSimplePreview());
        document.getElementById('addSuffix').addEventListener('input', () => this.updateSimplePreview());
        
        // Show initial preview
        this.updateSimplePreview();
    }
    
    updateSimplePreview() {
        const strategy = document.querySelector('input[name="simpleStrategy"]:checked').value;
        const preview = document.getElementById('simplePreview');
        
        if (strategy === 'sequence') {
            const prefix = document.getElementById('simplePrefix').value || 'Document_';
            const start = parseInt(document.getElementById('simpleStart').value) || 1;
            
            const previewHTML = this.files.slice(0, 5).map((file, index) => {
                const newName = `${prefix}${(start + index).toString().padStart(3, '0')}.pdf`;
                return `<div class="preview-item">
                    <span class="old-name">${file.name}</span>
                    <span style="margin: 0 1rem;">→</span>
                    <span class="new-name">${newName}</span>
                </div>`;
            }).join('');
            
            preview.innerHTML = previewHTML;
        } else {
            const addPrefix = document.getElementById('addPrefix').value || '';
            const addSuffix = document.getElementById('addSuffix').value || '';
            
            const previewHTML = this.files.slice(0, 5).map(file => {
                const newName = `${addPrefix}${file.basename}${addSuffix}.pdf`;
                return `<div class="preview-item">
                    <span class="old-name">${file.name}</span>
                    <span style="margin: 0 1rem;">→</span>
                    <span class="new-name">${newName}</span>
                </div>`;
            }).join('');
            
            preview.innerHTML = previewHTML;
        }
    }
    
    async executeSimpleBulkRename() {
        const strategy = document.querySelector('input[name="simpleStrategy"]:checked').value;
        
        if (!confirm(`Are you sure you want to rename ${this.files.length} files?\n\nFiles will be renamed in their original location.`)) {
            return;
        }
        
        try {
            this.setStatus('Renaming files...');
            
            let successCount = 0;
            let errorCount = 0;
            
            if (strategy === 'sequence') {
                const prefix = document.getElementById('simplePrefix').value || 'Document_';
                const start = parseInt(document.getElementById('simpleStart').value) || 1;
                
                for (let i = 0; i < this.files.length; i++) {
                    const file = this.files[i];
                    const newName = `${prefix}${(start + i).toString().padStart(3, '0')}.pdf`;
                    const newPath = file.path.replace(file.name, newName);
                    
                    try {
                        await ipcRenderer.invoke('rename-file', file.path, newPath);
                        file.path = newPath;
                        file.name = newName;
                        file.basename = newName.replace('.pdf', '');
                        successCount++;
                    } catch (error) {
                        console.error(`Error renaming ${file.name}:`, error);
                        errorCount++;
                    }
                }
            } else {
                const addPrefix = document.getElementById('addPrefix').value || '';
                const addSuffix = document.getElementById('addSuffix').value || '';
                
                for (let i = 0; i < this.files.length; i++) {
                    const file = this.files[i];
                    const newName = `${addPrefix}${file.basename}${addSuffix}.pdf`;
                    const newPath = file.path.replace(file.name, newName);
                    
                    try {
                        await ipcRenderer.invoke('rename-file', file.path, newPath);
                        file.path = newPath;
                        file.name = newName;
                        file.basename = newName.replace('.pdf', '');
                        successCount++;
                    } catch (error) {
                        console.error(`Error renaming ${file.name}:`, error);
                        errorCount++;
                    }
                }
            }
            
            // Update UI
            this.updateFileList();
            this.updateUI();
            
            // Show results
            let message = `Bulk rename completed!\n\nSuccessfully renamed: ${successCount} files`;
            if (errorCount > 0) {
                message += `\nErrors: ${errorCount} files`;
            }
            
            alert(message);
            this.setStatus(`Bulk rename completed: ${successCount} files renamed`);
            
            // Close modal
            document.querySelector('.modal.active').remove();
            
        } catch (error) {
            console.error('Error during bulk rename:', error);
            alert('Error during bulk rename: ' + error.message);
        }
    }
    
    // Split PDF Modal
    openSplitModal() {
        // Switch to split tab first
        this.switchTab('split');
        
        // Then open the split modal
        if (window.bulkOperations) {
        window.bulkOperations.openSplitModal(this.files);
        } else {
            console.error('Bulk operations not available');
            alert('Split PDF functionality not available');
        }
    }
    
    openPatternManagerModal() {
        // Switch to files tab first (patterns are now there)
        this.switchTab('files');
        
        // Then open the pattern manager modal
        if (window.patternManager) {
            window.patternManager.openModal();
        } else {
            console.error('Pattern manager not available');
            alert('Pattern manager not available');
        }
    }
    
    // Utility Methods

    
    getFileName(path) {
        return path.split('/').pop() || path.split('\\').pop();
    }
    
    getBaseName(path) {
        const fileName = this.getFileName(path);
        return fileName.replace(/\.[^/.]+$/, '');
    }
    
    getDirName(path) {
        return path.substring(0, path.lastIndexOf('/')) || path.substring(0, path.lastIndexOf('\\'));
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
    
    setStatus(message) {
        document.getElementById('statusText').textContent = message;
    }
    
    // Navigation
    previousPage() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.previousPage();
        }
    }
    
    nextPage() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.nextPage();
        }
    }
    
    zoomIn() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.zoomIn();
        }
    }
    
    zoomOut() {
        if (window.interactivePDFViewer) {
            window.interactivePDFViewer.zoomOut();
        }
    }
    
    // Keyboard Shortcuts
    handleKeyboard(e) {
        // Global shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'o':
                    e.preventDefault();
                    this.openFiles();
                    break;
                case 'r':
                    e.preventDefault();
                    if (this.selectedFile) {
                        document.getElementById('newFileName').focus();
                    }
                    break;
                case 's':
                    e.preventDefault();
                    if (this.selectedFile && document.getElementById('newFileName').value.trim()) {
                        this.renameSelectedFile();
                    }
                    break;
                case '1':
                    e.preventDefault();
                    this.switchTab('files');
                    break;
                case '2':
                    e.preventDefault();
                    this.switchTab('rename');
                    break;
                case '3':
                    e.preventDefault();
                    this.switchTab('bulk');
                    break;
                case '4':
                    e.preventDefault();
                    this.switchTab('split');
                    break;
                case '5':
                    e.preventDefault();
                    this.switchTab('files');
                    break;
                case '6':
                    e.preventDefault();
                    this.switchTab('settings');
                    break;
            }
        }
        
        // PDF viewer shortcuts
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            switch (e.key) {
                case 'ArrowLeft':
                    if (document.activeElement.tagName !== 'INPUT') {
                        e.preventDefault();
                        this.previousPage();
                    }
                    break;
                case 'ArrowRight':
                    if (document.activeElement.tagName !== 'INPUT') {
                        e.preventDefault();
                        this.nextPage();
                    }
                    break;
                case '+':
                case '=':
                    if (document.activeElement.tagName !== 'INPUT') {
                        e.preventDefault();
                        this.zoomIn();
                    }
                    break;
                case '-':
                    if (document.activeElement.tagName !== 'INPUT') {
                        e.preventDefault();
                        this.zoomOut();
                    }
                    break;
            }
        }
    }
    
    // Public methods for external use
    refreshPatterns() {
        this.patterns = this.loadPatterns();
        this.loadSavedPatterns();
        
        // Regenerate suggestions for all files
        this.files.forEach(file => {
            file.suggestions = this.generateSuggestions(file.text, file.basename);
        });
        
        if (this.selectedFile) {
            this.updateRenamePanel();
        }
    }
    
    refreshFiles() {
        this.updateFileList();
        this.updateUI();
    }

    extractTextFromPattern(file, pattern) {
        try {
            if (pattern.type === 'visual_position') {
                // For visual position patterns, we can't extract text in preview mode
                // Return a placeholder indicating visual pattern will be applied
                return `[Visual Pattern: ${pattern.name}]`;
            } else if (pattern.regex && file.text) {
                // Handle regex patterns
                const regex = new RegExp(pattern.regex, 'i');
                const match = file.text.match(regex);
                
                if (match && match[1]) {
                    return match[1].trim().replace(/\s+/g, ' ');
                }
            }
            return null;
        } catch (error) {
            console.error('Error extracting text from pattern:', error);
            return null;
        }
    }

    // Split Tab Functionality
    updateSplitOptions() {
        const splitType = document.getElementById('splitType').value;
        const rangeGroup = document.getElementById('splitRangeGroup');
        const endGroup = document.getElementById('splitEndGroup');
        const countGroup = document.getElementById('splitCountGroup');
        
        // Hide all groups first
        rangeGroup.style.display = 'none';
        endGroup.style.display = 'none';
        countGroup.style.display = 'none';
        
        // Show relevant group based on selection
        switch(splitType) {
            case 'range':
                rangeGroup.style.display = 'block';
                endGroup.style.display = 'block';
                break;
            case 'count':
                countGroup.style.display = 'block';
                break;
            case 'all':
            default:
                // No additional options needed
                break;
        }
        
        this.updateSplitInfo();
    }
    
    updateSplitInfo() {
        const splitType = document.getElementById('splitType').value;
        const splitInfo = document.getElementById('splitInfo');
        const executeBtn = document.getElementById('executeSplitBtn');
        const splitFileSelect = document.getElementById('splitFileSelect');
        
        // Check if a file is selected from the dropdown
        const selectedIndex = splitFileSelect.value;
        const selectedFile = selectedIndex !== '' ? this.files[parseInt(selectedIndex)] : null;
        
        if (!selectedFile) {
            splitInfo.innerHTML = '<p>Please select a PDF file from the dropdown above</p>';
            executeBtn.disabled = true;
            return;
        }
        
        let infoText = '';
        let canExecute = true;
        
        switch(splitType) {
            case 'all':
                infoText = `Split all ${selectedFile.pages} pages into individual files`;
                break;
            case 'range':
                const startPage = parseInt(document.getElementById('splitStartPage').value) || 1;
                const endPage = parseInt(document.getElementById('splitEndPage').value) || selectedFile.pages;
                
                if (startPage < 1 || endPage > selectedFile.pages || startPage > endPage) {
                    infoText = 'Invalid page range. Please check start and end page numbers.';
                    canExecute = false;
                } else {
                    const pageCount = endPage - startPage + 1;
                    infoText = `Split pages ${startPage} to ${endPage} (${pageCount} pages) into individual files`;
                }
                break;
            case 'count':
                const pagesPerFile = parseInt(document.getElementById('splitPagesPerFile').value) || 10;
                if (pagesPerFile < 1) {
                    infoText = 'Invalid pages per file. Must be at least 1.';
                    canExecute = false;
                } else {
                    const fileCount = Math.ceil(selectedFile.pages / pagesPerFile);
                    infoText = `Split ${selectedFile.pages} pages into ${fileCount} files with ${pagesPerFile} pages each`;
                }
                break;
        }
        
        splitInfo.innerHTML = `
            <h4><i class="fas fa-info-circle"></i> Split Information</h4>
            <p>${infoText}</p>
        `;
        
        executeBtn.disabled = !canExecute;
    }
    
    async selectSplitOutputDir() {
        try {
            const result = await ipcRenderer.invoke('select-directory');
            
            if (!result.canceled && result.filePaths.length > 0) {
                document.getElementById('splitOutputDir').value = result.filePaths[0];
            }
        } catch (error) {
            console.error('Error selecting output directory:', error);
            this.setStatus('Error selecting output directory');
        }
    }
    
    async executeSplit() {
        const splitFileSelect = document.getElementById('splitFileSelect');
        const selectedIndex = splitFileSelect.value;
        
        if (!selectedIndex || selectedIndex === '') {
            alert('Please select a PDF file to split');
            return;
        }
        
        const selectedFile = this.files[parseInt(selectedIndex)];
        if (!selectedFile) {
            alert('Selected file not found');
            return;
        }
        
        const splitType = document.getElementById('splitType').value;
        
        try {
            this.setStatus('Splitting PDF and creating ZIP...');
            document.getElementById('executeSplitBtn').disabled = true;
            
            let result;
            
            switch(splitType) {
                case 'all':
                    result = await this.splitAllPages(selectedFile);
                    break;
                case 'range':
                    const startPage = parseInt(document.getElementById('splitStartPage').value);
                    const endPage = parseInt(document.getElementById('splitEndPage').value);
                    result = await this.splitPageRange(selectedFile, startPage, endPage);
                    break;
                case 'count':
                    const pagesPerFile = parseInt(document.getElementById('splitPagesPerFile').value);
                    result = await this.splitByPageCount(selectedFile, pagesPerFile);
                    break;
            }
            
            if (result && result.success) {
                this.setStatus('PDF split successfully!');
                
                if (result.zipPath) {
                    this.setStatus(`ZIP file created successfully! Saved to: ${result.zipPath}`);
                } else {
                    this.setStatus('PDF split successfully, but ZIP creation failed');
                }
            }
            
        } catch (error) {
            console.error('Error splitting PDF:', error);
            this.setStatus('Error splitting PDF: ' + error.message);
            alert('Error splitting PDF: ' + error.message);
        } finally {
            document.getElementById('executeSplitBtn').disabled = false;
        }
    }
    
    async splitAllPages(selectedFile) {
        // Use a temporary directory and always create ZIP
        // The main process will handle the downloads folder automatically
        const result = await ipcRenderer.invoke('split-pdf', selectedFile.path, null, 1, true);
        
        // Open the output folder after successful split
        if (result.success && result.outputDir) {
            try {
                await ipcRenderer.invoke('open-folder', result.outputDir);
            } catch (error) {
                console.error('Error opening folder:', error);
            }
        }
        
        return result;
    }
    
    async splitPageRange(selectedFile, startPage, endPage) {
        // Use the enhanced split-pdf function with page range support
        const result = await ipcRenderer.invoke('split-pdf', selectedFile.path, null, null, true, startPage, endPage);
        
        // Open the output folder after successful split
        if (result.success && result.outputDir) {
            try {
                await ipcRenderer.invoke('open-folder', result.outputDir);
            } catch (error) {
                console.error('Error opening folder:', error);
            }
        }
        
        return result;
    }
    
    async splitByPageCount(selectedFile, pagesPerFile) {
        const result = await ipcRenderer.invoke('split-pdf', selectedFile.path, null, pagesPerFile, true);
        
        // Open the output folder after successful split
        if (result.success && result.outputDir) {
            try {
                await ipcRenderer.invoke('open-folder', result.outputDir);
            } catch (error) {
                console.error('Error opening folder:', error);
            }
        }
        
        return result;
    }
    

    
    // Update the file selection in split tab
    updateSplitFileSelection() {
        const splitFileSelect = document.getElementById('splitFileSelect');
        
        if (this.files.length === 0) {
            splitFileSelect.innerHTML = '<option value="">No files loaded</option>';
            splitFileSelect.disabled = true;
        } else {
            splitFileSelect.innerHTML = this.files.map((file, index) => 
                `<option value="${index}">${file.name} (${file.pages} pages)</option>`
            ).join('');
            splitFileSelect.disabled = false;
            
            // Auto-select the first file if none is currently selected
            if (splitFileSelect.value === '') {
                splitFileSelect.value = '0';
            }
        }
        
        this.updateSplitInfo();
    }
    
    // Clear all files from the split tab
    clearSplitFiles() {
        if (this.files.length === 0) return;
        
        if (confirm(`Are you sure you want to clear all ${this.files.length} PDF files?`)) {
            this.files = [];
            this.selectedFile = null;
            this.selectedFileIndex = null;
            
            // Update all UI elements
            this.updateFileList();
            this.updateUI();
            
            // Clear the preview if it exists
            if (window.interactivePDFViewer) {
                window.interactivePDFViewer.initializeViewer();
            }
            
            // Update the current file name display
            const currentFileName = document.getElementById('currentFileName');
            if (currentFileName) {
                currentFileName.textContent = 'Select a PDF to preview';
            }
            
            this.setStatus('All PDF files cleared successfully');
        }
    }
    
    // Bulk Rename Functionality
    updateBulkRenameSections() {
        const renameType = document.getElementById('bulkRenameType').value;
        const patternSection = document.getElementById('patternSection');
        const sequenceSection = document.getElementById('sequenceSection');
        const prefixSection = document.getElementById('prefixSection');
        
        // Hide all sections first
        patternSection.style.display = 'none';
        sequenceSection.style.display = 'none';
        prefixSection.style.display = 'none';
        
        // Show relevant section based on selection
        switch(renameType) {
            case 'pattern':
                patternSection.style.display = 'block';
                break;
            case 'sequence':
                sequenceSection.style.display = 'block';
                break;
            case 'prefix':
                prefixSection.style.display = 'block';
                break;
        }
        
        this.updateBulkPreview();
    }
    
    updateBulkPreview() {
        if (this.files.length === 0) {
            document.getElementById('bulkPreviewList').innerHTML = '<p>No files loaded</p>';
            document.getElementById('bulkExecuteBtn').disabled = true;
            return;
        }
        
        const renameType = document.getElementById('bulkRenameType').value;
        let previewHTML = '<h6>Preview of new names:</h6>';
        
        switch(renameType) {
            case 'pattern':
                previewHTML += this.generatePatternPreview();
                break;
            case 'sequence':
                previewHTML += this.generateSequencePreview();
                break;
            case 'prefix':
                previewHTML += this.generatePrefixPreview();
                break;
        }
        
        document.getElementById('bulkPreviewList').innerHTML = previewHTML;
        document.getElementById('bulkExecuteBtn').disabled = false;
    }
    
    generatePatternPreview() {
        const primaryPattern = document.getElementById('bulkPrimaryPattern').value;
        const secondaryPattern = document.getElementById('bulkSecondaryPattern').value;
        const tertiaryPattern = document.getElementById('bulkTertiaryPattern').value;
        const separator = document.getElementById('bulkPatternSeparator').value || '_';
        
        if (!primaryPattern) {
            return '<p>Please select a primary pattern</p>';
        }
        
        let preview = '';
        this.files.forEach((file, index) => {
            let newName = '';
            
            if (primaryPattern !== 'none') {
                const pattern = this.patterns[parseInt(primaryPattern)];
                if (pattern) {
                    newName += this.extractTextFromPattern(file, pattern);
                }
            }
            
            if (secondaryPattern && secondaryPattern !== 'none') {
                const pattern = this.patterns[parseInt(secondaryPattern)];
                if (pattern) {
                    newName += separator + this.extractTextFromPattern(file, pattern);
                }
            }
            
            if (tertiaryPattern && tertiaryPattern !== 'none') {
                const pattern = this.patterns[parseInt(tertiaryPattern)];
                if (pattern) {
                    newName += separator + this.extractTextFromPattern(file, pattern);
                }
            }
            
            if (!newName) newName = file.basename;
            
            preview += `<div><strong>${file.name}</strong> → <em>${newName}.pdf</em></div>`;
        });
        
        return preview;
    }
    
    generateSequencePreview() {
        const prefix = document.getElementById('bulkSequencePrefix').value || 'Document';
        const start = parseInt(document.getElementById('bulkSequenceStart').value) || 1;
        const padding = parseInt(document.getElementById('bulkSequencePadding').value) || 2;
        
        let preview = '';
        this.files.forEach((file, index) => {
            const number = (start + index).toString().padStart(padding, '0');
            const newName = `${prefix}${number}`;
            preview += `<div><strong>${file.name}</strong> → <em>${newName}.pdf</em></div>`;
        });
        
        return preview;
    }
    
    generatePrefixPreview() {
        const namePrefix = document.getElementById('bulkNamePrefix').value || '';
        const nameSuffix = document.getElementById('bulkNameSuffix').value || '';
        
        let preview = '';
        this.files.forEach((file, index) => {
            const newName = `${namePrefix}${file.basename}${nameSuffix}`;
            preview += `<div><strong>${file.name}</strong> → <em>${newName}.pdf</em></div>`;
        });
        
        return preview;
    }
    
    resetBulkRename() {
        document.getElementById('bulkRenameType').value = 'pattern';
        document.getElementById('bulkPrimaryPattern').value = '';
        document.getElementById('bulkSecondaryPattern').value = '';
        document.getElementById('bulkTertiaryPattern').value = '';
        document.getElementById('bulkPatternSeparator').value = '_';
        document.getElementById('bulkSequencePrefix').value = '';
        document.getElementById('bulkSequenceStart').value = '1';
        document.getElementById('bulkSequencePadding').value = '2';
        document.getElementById('bulkNamePrefix').value = '';
        document.getElementById('bulkNameSuffix').value = '';
        
        this.updateBulkRenameSections();
        this.setStatus('Bulk rename options reset');
    }
    
    async executeBulkRename() {
        if (this.files.length === 0) {
            alert('No files to rename');
            return;
        }
        
        try {
            this.setStatus('Executing bulk rename...');
            document.getElementById('bulkExecuteBtn').disabled = true;
            
            const renameType = document.getElementById('bulkRenameType').value;
            let successCount = 0;
            
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                let newName = '';
                
                switch(renameType) {
                    case 'pattern':
                        newName = this.generatePatternName(file);
                        break;
                    case 'sequence':
                        newName = this.generateSequenceName(file, i);
                        break;
                    case 'prefix':
                        newName = this.generatePrefixName(file);
                        break;
                }
                
                if (newName) {
                    try {
                        const dir = this.getDirName(file.path);
                        const newPath = `${dir}/${newName}.pdf`;
                        
                        const result = await ipcRenderer.invoke('rename-file', file.path, newPath);
                        if (result.success) {
                            successCount++;
                            // Update the file object
                            file.path = newPath;
                            file.name = `${newName}.pdf`;
                            file.basename = newName;
                        }
                    } catch (error) {
                        console.error(`Error renaming ${file.name}:`, error);
                    }
                }
            }
            
            // Update UI after renaming
            this.updateFileList();
            this.updateUI();
            this.updateBulkPreview();
            
            this.setStatus(`Bulk rename completed: ${successCount}/${this.files.length} files renamed successfully`);
            
        } catch (error) {
            console.error('Error in bulk rename:', error);
            this.setStatus('Error during bulk rename: ' + error.message);
            alert('Error during bulk rename: ' + error.message);
        } finally {
            document.getElementById('bulkExecuteBtn').disabled = false;
        }
    }
    
    generatePatternName(file) {
        const primaryPattern = document.getElementById('bulkPrimaryPattern').value;
        const secondaryPattern = document.getElementById('bulkSecondaryPattern').value;
        const tertiaryPattern = document.getElementById('bulkTertiaryPattern').value;
        const separator = document.getElementById('bulkPatternSeparator').value || '_';
        
        let newName = '';
        
        if (primaryPattern && primaryPattern !== 'none') {
            const pattern = this.patterns[parseInt(primaryPattern)];
            if (pattern) {
                newName += this.extractTextFromPattern(file, pattern);
            }
        }
        
        if (secondaryPattern && secondaryPattern !== 'none') {
            const pattern = this.patterns[parseInt(secondaryPattern)];
            if (pattern) {
                newName += separator + this.extractTextFromPattern(file, pattern);
            }
        }
        
        if (tertiaryPattern && tertiaryPattern !== 'none') {
            const pattern = this.patterns[parseInt(tertiaryPattern)];
            if (pattern) {
                newName += separator + this.extractTextFromPattern(file, pattern);
            }
        }
        
        return newName || file.basename;
    }
    
    generateSequenceName(file, index) {
        const prefix = document.getElementById('bulkSequencePrefix').value || 'Document';
        const start = parseInt(document.getElementById('bulkSequenceStart').value) || 1;
        const padding = parseInt(document.getElementById('bulkSequencePadding').value) || 2;
        
        const number = (start + index).toString().padStart(padding, '0');
        return `${prefix}${number}`;
    }
    
    generatePrefixName(file) {
        const namePrefix = document.getElementById('bulkNamePrefix').value || '';
        const nameSuffix = document.getElementById('bulkNameSuffix').value || '';
        
        return `${namePrefix}${file.basename}${nameSuffix}`;
    }
    
    updateBulkRenameInterface() {
        const bulkRenameInterface = document.getElementById('bulkRenameInterface');
        const bulkRenameBtn = document.getElementById('bulkRenameBtn');
        const bulkPrimaryPattern = document.getElementById('bulkPrimaryPattern');
        
        if (this.files.length === 0) {
            // No files loaded
            if (bulkRenameInterface) bulkRenameInterface.style.display = 'none';
            if (bulkRenameBtn) bulkRenameBtn.disabled = true;
            return;
        }
        
        // Files loaded - show interface and enable button
        if (bulkRenameInterface) bulkRenameInterface.style.display = 'block';
        if (bulkRenameBtn) bulkRenameBtn.disabled = false;
        
        // Populate pattern dropdowns
        this.populateBulkPatternDropdowns();
        
        // Update preview
        this.updateBulkPreview();
    }
    
    populateBulkPatternDropdowns() {
        const primaryPattern = document.getElementById('bulkPrimaryPattern');
        const secondaryPattern = document.getElementById('bulkSecondaryPattern');
        const tertiaryPattern = document.getElementById('bulkTertiaryPattern');
        
        if (!primaryPattern || !secondaryPattern || !tertiaryPattern) return;
        
        // Clear existing options
        primaryPattern.innerHTML = '<option value="">Select a pattern</option>';
        secondaryPattern.innerHTML = '<option value="">None</option>';
        tertiaryPattern.innerHTML = '<option value="">None</option>';
        
        // Add patterns to primary dropdown
        this.patterns.forEach((pattern, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${pattern.name} (${pattern.type === 'visual_position' ? 'Visual' : 'Text'})`;
            primaryPattern.appendChild(option);
        });
        
        // Add patterns to secondary and tertiary dropdowns
        this.patterns.forEach((pattern, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${pattern.name} (${pattern.type === 'visual_position' ? 'Visual' : 'Text'})`;
            
            secondaryPattern.appendChild(option.cloneNode(true));
            tertiaryPattern.appendChild(option.cloneNode(true));
        });
        
        // Enable primary pattern dropdown
        primaryPattern.disabled = false;
    }
    
    forceReloadPatterns() {
        console.log('=== FORCE RELOAD PATTERNS ===');
        const savedPatterns = localStorage.getItem('aura-pdf-patterns');
        console.log('Raw localStorage content:', savedPatterns);
        
        if (savedPatterns) {
            try {
                this.patterns = JSON.parse(savedPatterns);
                console.log('Force reloaded patterns:', this.patterns);
                this.updatePatternList();
                this.setStatus(`Patterns reloaded: ${this.patterns.length} patterns found`);
            } catch (error) {
                console.error('Error parsing patterns:', error);
                this.setStatus('Error parsing saved patterns');
            }
        } else {
            console.log('No patterns in localStorage, calling ensureSamplePatterns');
            this.ensureSamplePatterns();
            this.setStatus('No saved patterns found, created samples');
        }
    }
    
    ensureSamplePatterns() {
        // Check localStorage directly and create patterns if none exist
        const savedPatterns = localStorage.getItem('aura-pdf-patterns');
        console.log('ensureSamplePatterns - localStorage content:', savedPatterns);
        
        if (!savedPatterns || savedPatterns === '[]' || savedPatterns === 'null') {
            console.log('No valid patterns found in localStorage, creating sample patterns...');
            
            // Create some sample patterns to get started
            const samplePatterns = [
                {
                    name: 'client name',
                    type: 'visual_position',
                    position: { page: 1, x: 100, y: 100, width: 200, height: 20 },
                    description: 'Extracts client names from PDF'
                },
                {
                    name: 'case number',
                    type: 'visual_position',
                    position: { page: 1, x: 300, y: 100, width: 100, height: 20 },
                    description: 'Extracts case numbers from PDF'
                },
                {
                    name: 'Invoice Number',
                    type: 'regex',
                    regex: 'Invoice[\\s#:]+([A-Z0-9-]+)',
                    description: 'Extracts invoice numbers from text'
                }
            ];
            
            this.patterns = samplePatterns;
            localStorage.setItem('aura-pdf-patterns', JSON.stringify(samplePatterns));
            console.log('Sample patterns created and saved:', this.patterns);
            this.updatePatternList();
        } else {
            console.log('Found existing patterns in localStorage, loading them...');
            try {
                this.patterns = JSON.parse(savedPatterns);
                console.log('Loaded patterns from localStorage:', this.patterns);
                this.updatePatternList();
            } catch (error) {
                console.error('Error parsing saved patterns:', error);
                this.patterns = [];
            }
        }
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AuraPDFApp();
    window.app = app; // Make available globally
});
