// Bulk Tab Manager - Handles bulk rename operations
class BulkTabManager {
    constructor() {
        console.log('Bulk Tab Manager: Constructor called');
        this.bindEvents();
        this.updateUI();
        
        // Test button functionality after a short delay
        setTimeout(() => {
            this.testButtonFunctionality();
        }, 1000);
    }

    // Test method to check if buttons are working
    testButtonFunctionality() {
        console.log('Bulk Tab Manager: Testing button functionality...');
        
        const bulkRenameBtn = document.getElementById('bulkRenameBtnBulk');
        if (bulkRenameBtn) {
            console.log('Bulk Tab: Button found, testing click simulation...');
            console.log('Bulk Tab: Button disabled state:', bulkRenameBtn.disabled);
            console.log('Bulk Tab: Button onclick handler:', bulkRenameBtn.onclick);
            console.log('Bulk Tab: Button event listeners:', bulkRenameBtn.getEventListeners ? bulkRenameBtn.getEventListeners() : 'getEventListeners not available');
            
            // Try to manually trigger the click
            try {
                bulkRenameBtn.click();
                console.log('Bulk Tab: Manual click triggered successfully');
            } catch (error) {
                console.error('Bulk Tab: Error triggering manual click:', error);
            }
        } else {
            console.error('Bulk Tab: Button not found during testing');
        }
        
        // Also check if we're in the right tab
        const bulkTab = document.getElementById('bulk-tab');
        if (bulkTab) {
            console.log('Bulk Tab: Bulk tab element found');
            console.log('Bulk Tab: Bulk tab display style:', bulkTab.style.display);
            console.log('Bulk Tab: Bulk tab class list:', bulkTab.classList);
        } else {
            console.error('Bulk Tab: Bulk tab element not found');
        }
    }

    bindEvents() {
        console.log('Bulk Tab: Binding events...');
        
        // Load PDF button
        const loadPdfBtn = document.getElementById('bulkLoadPdfBtn');
        if (loadPdfBtn) {
            loadPdfBtn.addEventListener('click', () => this.loadPdf());
            console.log('Bulk Tab: Load PDF button bound');
        } else {
            console.error('Bulk Tab: Load PDF button not found');
        }

        // Select folder button
        const selectFolderBtn = document.getElementById('bulkSelectFolderBtn');
        if (selectFolderBtn) {
            selectFolderBtn.addEventListener('click', () => this.selectFolder());
            console.log('Bulk Tab: Select folder button bound');
        } else {
            console.error('Bulk Tab: Select folder button not found');
        }

        // Bulk rename button - using the correct ID from HTML
        const bulkRenameBtn = document.getElementById('bulkRenameBtnBulk');
        if (bulkRenameBtn) {
            console.log('Bulk Tab: Found bulk rename button, binding click event');
            bulkRenameBtn.addEventListener('click', (e) => {
                console.log('Bulk Tab: Bulk rename button clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.performBulkRename();
            });
            console.log('Bulk Tab: Bulk rename button bound successfully');
        } else {
            console.error('Bulk Tab: Bulk rename button not found! Looking for ID: bulkRenameBtnBulk');
            // Try alternative ID
            const altBulkRenameBtn = document.getElementById('bulkRenameBtn');
            if (altBulkRenameBtn) {
                console.log('Bulk Tab: Found alternative bulk rename button, binding click event');
                altBulkRenameBtn.addEventListener('click', (e) => {
                    console.log('Bulk Tab: Alternative bulk rename button clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    this.performBulkRename();
                });
                console.log('Bulk Tab: Alternative bulk rename button bound successfully');
            } else {
                console.error('Bulk Tab: No bulk rename button found with any ID');
            }
        }

        // Clear files button
        const clearFilesBtn = document.getElementById('bulkClearFilesBtn');
        if (clearFilesBtn) {
            clearFilesBtn.addEventListener('click', () => this.clearFiles());
            console.log('Bulk Tab: Clear files button bound');
        } else {
            console.error('Bulk Tab: Clear files button not found');
        }

        // Additional words input
        const additionalWordsInput = document.getElementById('additionalWords');
        if (additionalWordsInput) {
            additionalWordsInput.addEventListener('input', () => this.updatePreview());
            console.log('Bulk Tab: Additional words input bound');
        } else {
            console.error('Bulk Tab: Additional words input not found');
        }
        
        console.log('Bulk Tab: Event binding completed');
    }

    async loadPdf() {
        try {
            console.log('Bulk Tab: Loading PDF files...');
            
            if (window.electronAPI) {
                // Desktop app
                const result = await window.electronAPI.showOpenDialog({
                    title: 'Select PDF Files for Bulk Rename',
                    properties: ['openFile', 'multiSelections'],
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    console.log(`Bulk Tab: Selected ${result.filePaths.length} files`);
                    for (const filePath of result.filePaths) {
                        await this.addFile(filePath);
                    }
                    this.updateFileList();
                    this.updateUI();
                    this.updatePreview();
                }
            } else {
                // Web app
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.multiple = true;
                input.onchange = async (e) => {
                    if (e.target.files.length > 0) {
                        console.log(`Bulk Tab: Selected ${e.target.files.length} files`);
                        for (const file of e.target.files) {
                            await this.addFileFromWeb(file);
                        }
                        this.updateFileList();
                        this.updateUI();
                        this.updatePreview();
                    }
                };
                input.click();
            }
        } catch (error) {
            console.error('Error loading PDFs:', error);
            this.setStatus('Error loading PDFs: ' + error.message);
        }
    }

    async selectFolder() {
        try {
            console.log('Bulk Tab: Selecting folder...');
            
            if (window.electronAPI) {
                // Desktop app
                const result = await window.electronAPI.showOpenDialog({
                    title: 'Select Folder with PDF Files for Bulk Rename',
                    properties: ['openDirectory']
                });

                if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                    const folderPath = result.filePaths[0];
                    console.log('Bulk Tab: Selected folder:', folderPath);
                    
                    const pdfFiles = await window.electronAPI.getPdfFilesFromFolder(folderPath);
                    
                    if (pdfFiles && pdfFiles.length > 0) {
                        console.log(`Bulk Tab: Found ${pdfFiles.length} PDF files in folder`);
                        for (const filePath of pdfFiles) {
                            await this.addFile(filePath);
                        }
                        this.updateFileList();
                        this.updateUI();
                        this.updatePreview();
                    } else {
                        this.setStatus('No PDF files found in the selected folder');
                    }
                }
            } else {
                // Web app - show message that folder selection is not supported
                this.setStatus('Folder selection is not supported in web mode. Please use "Load PDF Files" instead.');
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
            this.setStatus('Error selecting folder: ' + error.message);
        }
    }

    async addFile(filePath) {
        try {
            console.log('Bulk Tab: Adding file:', filePath);
            
            if (window.electronAPI) {
                console.log('Bulk Tab: electronAPI is available, calling readFile for:', filePath);
                const fileResult = await window.electronAPI.readFile(filePath);
                console.log('Bulk Tab: File result received:', fileResult);
                
                if (!fileResult.success) {
                    throw new Error(fileResult.error);
                }

                const statsResult = await window.electronAPI.getFileStats(filePath);
                
                // Debug the file result data
                console.log('Bulk Tab: File result data type:', typeof fileResult.data);
                console.log('Bulk Tab: File result data constructor:', fileResult.data ? fileResult.data.constructor.name : 'null');
                console.log('Bulk Tab: File result data length:', fileResult.data ? fileResult.data.length : 'null');
                console.log('Bulk Tab: File result data:', fileResult.data);
                console.log('Bulk Tab: File result buffer type:', typeof fileResult.buffer);
                console.log('Bulk Tab: File result buffer constructor:', fileResult.buffer ? fileResult.buffer.constructor.name : 'null');
                console.log('Bulk Tab: File result buffer length:', fileResult.buffer ? fileResult.buffer.length : 'null');
                console.log('Bulk Tab: File result buffer:', fileResult.buffer);
                
                // Clone the buffer to prevent detachment issues
                let buffer;
                if (fileResult.buffer instanceof ArrayBuffer) {
                    buffer = new Uint8Array(fileResult.buffer.slice(0));
                } else if (fileResult.buffer instanceof Uint8Array) {
                    buffer = new Uint8Array(fileResult.buffer.slice(0));
                } else if (fileResult.buffer && typeof fileResult.buffer === 'object' && fileResult.buffer.buffer) {
                    // Handle case where buffer might be a TypedArray with a buffer property
                    buffer = new Uint8Array(fileResult.buffer.buffer.slice(0));
                } else if (Buffer.isBuffer(fileResult.buffer)) {
                    // Handle Node.js Buffer objects
                    buffer = new Uint8Array(fileResult.buffer);
                } else if (Array.isArray(fileResult.buffer)) {
                    // Handle array format from read-pdf-file handler
                    buffer = new Uint8Array(fileResult.buffer);
                } else {
                    console.error('Bulk Tab: Invalid file buffer format. Buffer:', fileResult.buffer);
                    throw new Error('Invalid file buffer format');
                }
                
                const file = {
                    path: filePath,
                    name: this.getFileName(filePath),
                    basename: this.getBaseName(filePath),
                    size: fileResult.size || fileResult.buffer.length,
                    buffer: buffer,
                    pages: 0,
                    text: '',
                    modified: statsResult.success ? new Date(statsResult.modified) : new Date(),
                    selected: false
                };

                // Get page count from PDF (create a separate copy for this)
                try {
                    if (window.pdfjsLib) {
                        const pageCountBuffer = new Uint8Array(buffer.slice(0));
                        const pdf = await window.pdfjsLib.getDocument({ data: pageCountBuffer }).promise;
                        file.pages = pdf.numPages;
                    }
                } catch (error) {
                    console.error('Error getting page count:', error);
                    file.pages = 0;
                }

                const fileCount = window.tabFileManager.addFile('bulk', file);
                console.log('Bulk Tab: File added successfully:', file.name);
                console.log('Bulk Tab: Total files in tab manager:', fileCount);
                
                // Show status message with updated file count
                const files = window.tabFileManager.getFiles('bulk');
                const fileCountText = files.length === 1 ? '1 PDF' : `${files.length} PDFs`;
                this.setStatus(`File added successfully! Total: ${fileCountText} loaded`);
            }
        } catch (error) {
            console.error('Error adding file:', error);
            this.setStatus('Error adding file: ' + error.message);
        }
    }

    async addFileFromWeb(file) {
        try {
            console.log('Bulk Tab: Adding web file:', file.name);
            
            const arrayBuffer = await file.arrayBuffer();
            // Clone the buffer to prevent detachment issues
            const buffer = new Uint8Array(arrayBuffer.slice(0));
            
            const fileObj = {
                path: file.name,
                name: file.name,
                basename: this.getBaseName(file.name),
                size: file.size,
                buffer: buffer,
                pages: 0,
                text: '',
                modified: new Date(file.lastModified),
                selected: false
            };

            // Get page count from PDF (create a separate copy for this)
            try {
                if (window.pdfjsLib) {
                    const pageCountBuffer = new Uint8Array(buffer.slice(0));
                    const pdf = await window.pdfjsLib.getDocument({ data: pageCountBuffer }).promise;
                    fileObj.pages = pdf.numPages;
                }
            } catch (error) {
                console.error('Error getting page count:', error);
                fileObj.pages = 0;
            }

            const fileCount = window.tabFileManager.addFile('bulk', fileObj);
            console.log('Bulk Tab: Web file added successfully:', fileObj.name);
            console.log('Bulk Tab: Total files in tab manager:', fileCount);
            
            // Show status message with updated file count
            const files = window.tabFileManager.getFiles('bulk');
            const fileCountText = files.length === 1 ? '1 PDF' : `${files.length} PDFs`;
            this.setStatus(`File added successfully! Total: ${fileCountText} loaded`);
        } catch (error) {
            console.error('Error adding web file:', error);
            this.setStatus('Error adding web file: ' + error.message);
        }
    }

    testMethod() {
        console.log('Bulk Tab: testMethod() called successfully');
    }

    // Test if method definition works
    testMethodDefinition() {
        console.log('Bulk Tab: testMethodDefinition() - method definition works');
    }

    // Brand new method with different name
    refreshFileDisplay() {
        console.log('Bulk Tab: refreshFileDisplay() - NEW METHOD ENTERED');
        try {
            console.log('Bulk Tab: refreshFileDisplay() called');
            const fileList = document.getElementById('bulkFileList');
            console.log('Bulk Tab: Found fileList:', !!fileList);
            
            if (!fileList) {
                console.error('Bulk Tab: Could not find bulkFileList element');
                return;
            }

            const files = window.tabFileManager.getFiles('bulk');
            console.log('Bulk Tab: Updating file list with', files.length, 'files');
            
            // Update the "Loaded Files" header to show count
            const loadedFilesHeader = document.getElementById('bulkLoadedFilesHeader');
            console.log('Bulk Tab: Found loaded files header:', !!loadedFilesHeader);
            
            if (loadedFilesHeader) {
                if (files.length === 0) {
                    loadedFilesHeader.innerHTML = '<i class="fas fa-folder-open"></i> Loaded Files: <span class="file-count">(0 PDFs)</span>';
                    console.log('Bulk Tab: Updated header to show 0 PDFs');
                } else {
                    const fileCountText = files.length === 1 ? '1 PDF' : files.length + ' PDFs';
                    loadedFilesHeader.innerHTML = '<i class="fas fa-folder-open"></i> Loaded Files: <span class="file-count">(' + fileCountText + ')</span>';
                    console.log('Bulk Tab: Updated header to show', fileCountText);
                }
            } else {
                console.error('Bulk Tab: Could not find loaded files header');
            }
            
            console.log('Bulk Tab: refreshFileDisplay completed successfully');
            
        } catch (error) {
            console.error('Bulk Tab: Error in refreshFileDisplay:', error);
        }
    }

    updateFileList() {
        console.log('Bulk Tab: updateFileList() method entered - FIRST LINE');
        console.log('Bulk Tab: This is a test - method is working');
        
        // Simple test first
        try {
            console.log('Bulk Tab: updateFileList() called');
            const fileList = document.getElementById('bulkFileList');
            console.log('Bulk Tab: Found fileList:', !!fileList);
            
            if (!fileList) {
                console.error('Bulk Tab: Could not find bulkFileList element');
                return;
            }

            const files = window.tabFileManager.getFiles('bulk');
            console.log('Bulk Tab: Updating file list with', files.length, 'files');
            
            // Update the "Loaded Files" header to show count
            const loadedFilesHeader = document.getElementById('bulkLoadedFilesHeader');
            console.log('Bulk Tab: Found loaded files header:', !!loadedFilesHeader);
            
            if (loadedFilesHeader) {
                if (files.length === 0) {
                    loadedFilesHeader.innerHTML = '<i class="fas fa-folder-open"></i> Loaded Files: <span class="file-count">(0 PDFs)</span>';
                    console.log('Bulk Tab: Updated header to show 0 PDFs');
                } else {
                    const fileCountText = files.length === 1 ? '1 PDF' : files.length + ' PDFs';
                    loadedFilesHeader.innerHTML = '<i class="fas fa-folder-open"></i> Loaded Files: <span class="file-count">(' + fileCountText + ')</span>';
                    console.log('Bulk Tab: Updated header to show', fileCountText);
                }
            } else {
                console.error('Bulk Tab: Could not find loaded files header');
            }
            
            // Add file count display above the file list
            try {
                const fileCountDisplay = document.createElement('div');
                fileCountDisplay.className = 'file-count-display';
                const fileCountText = files.length === 1 ? 'PDF' : 'PDFs';
                fileCountDisplay.innerHTML = '<div class="file-count-badge"><i class="fas fa-file-pdf"></i><span class="file-count-number">' + files.length + '</span><span class="file-count-text">' + fileCountText + '</span></div>';
                
                // Insert the file count display before the file list
                if (fileList.parentNode) {
                    const existingCountDisplay = fileList.parentNode.querySelector('.file-count-display');
                    if (existingCountDisplay) {
                        existingCountDisplay.remove();
                    }
                    fileList.parentNode.insertBefore(fileCountDisplay, fileList);
                    console.log('Bulk Tab: File count badge created and inserted successfully');
                } else {
                    console.error('Bulk Tab: Could not find fileList parent node');
                }
            } catch (error) {
                console.error('Bulk Tab: Error creating file count badge:', error);
            }
            
            if (files.length === 0) {
                fileList.innerHTML = '<div class="empty-files"><p>No PDF files loaded for bulk rename</p><p>Click "Load PDF Files" to get started</p></div>';
                return;
            }

            // Simple file list rendering
            let fileListHTML = '';
            files.forEach((file, index) => {
                const selectedClass = file.selected ? 'selected' : '';
                const fileName = this.escapeHtml(file.name);
                const fileSize = this.formatFileSize(file.size);
                const filePages = file.pages + ' pages';
                const fileModified = file.modified.toLocaleDateString();
                
                fileListHTML += '<div class="file-item ' + selectedClass + '" onclick="bulkTabManager.selectFile(' + index + ')">';
                fileListHTML += '<div class="file-icon"><i class="fas fa-file-pdf"></i></div>';
                fileListHTML += '<div class="file-info">';
                fileListHTML += '<div class="file-name">' + fileName + '</div>';
                fileListHTML += '<div class="file-details">';
                fileListHTML += '<span class="file-size">' + fileSize + '</span>';
                fileListHTML += '<span class="file-pages">' + filePages + '</span>';
                fileListHTML += '<span class="file-modified">' + fileModified + '</span>';
                fileListHTML += '</div></div>';
                fileListHTML += '<div class="file-actions">';
                fileListHTML += '<button class="btn-icon btn-danger" onclick="bulkTabManager.removeFile(' + index + ')" title="Remove File">';
                fileListHTML += '<i class="fas fa-times"></i></button></div></div>';
            });
            
            fileList.innerHTML = fileListHTML;
            console.log('Bulk Tab: File list updated successfully');
            
        } catch (error) {
            console.error('Bulk Tab: Error in updateFileList:', error);
        }
    }

    updateUI() {
        const hasFiles = window.tabFileManager.hasFiles('bulk');
        console.log('Bulk Tab: Updating UI, hasFiles:', hasFiles);
        
        // Update button states
        const bulkRenameBtn = document.getElementById('bulkRenameBtnBulk');
        const clearFilesBtn = document.getElementById('bulkClearFilesBtn');
        
        console.log('Bulk Tab: Found bulk rename button:', !!bulkRenameBtn);
        console.log('Bulk Tab: Found clear files button:', !!clearFilesBtn);
        
        if (bulkRenameBtn) {
            bulkRenameBtn.disabled = !hasFiles;
            console.log('Bulk Tab: Bulk rename button disabled:', !hasFiles);
            console.log('Bulk Tab: Bulk rename button element:', bulkRenameBtn);
            console.log('Bulk Tab: Bulk rename button disabled property:', bulkRenameBtn.disabled);
        } else {
            console.error('Bulk Tab: Bulk rename button not found in updateUI');
        }
        
        if (clearFilesBtn) {
            clearFilesBtn.disabled = !hasFiles;
            console.log('Bulk Tab: Clear files button disabled:', !hasFiles);
        } else {
            console.error('Bulk Tab: Clear files button not found in updateUI');
        }
        
        // Also check if we have patterns
        const patterns = window.app?.patterns || [];
        console.log('Bulk Tab: Available patterns:', patterns.length);
        if (patterns.length === 0) {
            console.warn('Bulk Tab: No patterns available - this might affect bulk rename functionality');
        }
        
        // Update pattern selection with a delay to ensure patterns are loaded
        setTimeout(() => {
            this.updatePatternSelection();
        }, 1000);
        
        // Refresh file list to show current state
        console.log('Bulk Tab: About to call updateFileList() from updateUI');
        console.log('Bulk Tab: updateFileList method exists:', typeof this.updateFileList);
        if (typeof this.updateFileList === 'function') {
            try {
                console.log('Bulk Tab: Calling updateFileList...');
                // Try calling a simple test first
                console.log('Bulk Tab: Testing simple method call...');
                this.testMethod();
                console.log('Bulk Tab: Testing method definition...');
                this.testMethodDefinition();
                console.log('Bulk Tab: Simple test completed, now calling updateFileList...');
                
                // Try calling the original method now that duplicate is removed
                console.log('Bulk Tab: Calling updateFileList...');
                try {
                    this.updateFileList();
                    console.log('Bulk Tab: updateFileList call completed');
                } catch (error) {
                    console.error('Bulk Tab: Error calling updateFileList:', error);
                }
                
                console.log('Bulk Tab: updateFileList call initiated');
            } catch (error) {
                console.error('Bulk Tab: Error calling updateFileList:', error);
            }
        } else {
            console.error('Bulk Tab: updateFileList is not a function!');
        }
        console.log('Bulk Tab: Finished calling updateFileList() from updateUI');
    }

    selectFile(index) {
        const files = window.tabFileManager.getFiles('bulk');
        if (index < 0 || index >= files.length) return;

        console.log('Bulk Tab: Selecting file at index:', index);

        // Deselect previous file
        files.forEach(file => file.selected = false);
        
        // Select new file
        files[index].selected = true;
        window.tabFileManager.setSelectedFile('bulk', files[index]);
        
        this.updateFileList();
        this.updatePreview();
    }

    removeFile(index) {
        console.log('Bulk Tab: Removing file at index:', index);
        window.tabFileManager.removeFile('bulk', index);
        this.updateFileList();
        this.updateUI();
        this.updatePreview();
        
        // Show status message with updated file count
        const files = window.tabFileManager.getFiles('bulk');
        if (files.length === 0) {
            this.setStatus('All files removed');
        } else {
            const fileCountText = files.length === 1 ? '1 PDF' : `${files.length} PDFs`;
            this.setStatus(`File removed. Total: ${fileCountText} remaining`);
        }
    }

    clearFiles() {
        if (confirm('Are you sure you want to clear all files?')) {
            console.log('Bulk Tab: Clearing all files');
            window.tabFileManager.clearFiles('bulk');
            this.updateFileList();
            this.updateUI();
            this.updatePreview();
            this.setStatus('All files cleared');
        }
    }

    async performBulkRename() {
        const files = window.tabFileManager.getFiles('bulk');
        if (files.length === 0) {
            this.setStatus('No files loaded for bulk rename');
            return;
        }

        // Get patterns from main app
        const selectedPatterns = this.getSelectedPatterns();
        if (selectedPatterns.length === 0) {
            this.setStatus('No patterns selected. Please select at least one pattern.');
            return;
        }

        // Get additional words
        const additionalWordsInput = document.getElementById('additionalWords');
        const additionalWords = additionalWordsInput ? additionalWordsInput.value.trim() : '';

        this.setStatus('Starting bulk rename...');
        console.log('Bulk Tab: Starting bulk rename with', files.length, 'files and', selectedPatterns.length, 'patterns');

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const file of files) {
            try {
                console.log('Bulk Tab: Processing file:', file.name);
                const newName = await this.generateNewFileName(file, selectedPatterns, additionalWords);
                if (newName) {
                    console.log('Bulk Tab: Generated new name:', newName);
                    // Construct the full new path by replacing the filename in the original path
                    // Handle both Windows (\) and Unix (/) path separators
                    const pathSeparator = file.path.includes('\\') ? '\\' : '/';
                    const pathParts = file.path.split(pathSeparator);
                    const fileName = pathParts.pop(); // Remove the old filename
                    const newPath = pathParts.join(pathSeparator) + pathSeparator + newName;
                    console.log('Bulk Tab: Original path:', file.path);
                    console.log('Bulk Tab: New path:', newPath);
                    await this.renameFile(file.path, newPath);
                    successCount++;
                } else {
                    console.log('Bulk Tab: Could not generate new name for:', file.name);
                    errorCount++;
                    errors.push(`${file.name}: Could not generate new name`);
                }
            } catch (error) {
                errorCount++;
                let userFriendlyMessage = error.message;
                
                // Provide more helpful error messages
                if (error.message.includes('EPERM') || error.message.includes('EACCES')) {
                    userFriendlyMessage = 'Permission denied. Please run as administrator or choose a different destination folder.';
                } else if (error.message.includes('Cannot create files in root directory')) {
                    userFriendlyMessage = 'Cannot create files in root directory. Please choose a subdirectory.';
                } else if (error.message.includes('cross-device link not permitted')) {
                    userFriendlyMessage = 'Cannot move files between different drives. Please choose a destination on the same drive.';
                }
                
                errors.push(`${file.name}: ${userFriendlyMessage}`);
                console.error('Bulk Tab: Error processing file:', file.name, error);
            }
        }

        // Show results
        if (errorCount === 0) {
            this.setStatus(`Bulk rename completed! Successfully renamed: ${successCount} files`);
        } else {
            this.setStatus(`Bulk rename completed! Successfully renamed: ${successCount} files, Errors: ${errorCount} files`);
            console.error('Bulk rename errors:', errors);
        }

        // Clear additional words
        if (additionalWordsInput) {
            additionalWordsInput.value = '';
        }

        // Update preview
        this.updatePreview();
        
        // Refresh file list to show updated names
        this.updateFileList();
        
        // Update pattern selection with a delay to ensure patterns are loaded
        setTimeout(() => {
            this.updatePatternSelection();
        }, 1000);
    }

    async generateNewFileName(file, patterns, additionalWords) {
        let newName = '';
        
        console.log('Bulk Tab: Generating new name for:', file.name);
        console.log('Bulk Tab: Using patterns:', patterns);
        
        // Check if buffer is valid and try to refresh if needed
        console.log('Bulk Tab: Checking buffer validity for file:', file.name);
        console.log('Bulk Tab: Buffer type:', file.buffer ? file.buffer.constructor.name : 'null');
        console.log('Bulk Tab: Buffer length:', file.buffer ? file.buffer.length : 'null');
        
        if (!file.buffer || (!(file.buffer instanceof ArrayBuffer) && !(file.buffer instanceof Uint8Array))) {
            console.log('Bulk Tab: Buffer is invalid, attempting to refresh file data...');
            const refreshed = await this.refreshFileData(file);
            if (!refreshed) {
                console.log('Bulk Tab: Could not refresh file data, using pattern sample text');
                // Use pattern sample text as fallback
                for (const pattern of patterns) {
                    if (pattern.type === 'visual_position' && pattern.sampleText && pattern.sampleText.trim()) {
                        newName += pattern.sampleText.trim() + '_';
                    }
                }
                
                if (newName && additionalWords) {
                    newName += additionalWords + '_';
                }
                
                if (newName) {
                    newName = newName.replace(/[<>:"/\\|?*]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                    return newName + '.pdf';
                }
                return null;
            }
        }
        
        for (const pattern of patterns) {
            if (pattern.type === 'visual_position') {
                console.log('Bulk Tab: Processing visual pattern:', pattern.name);
                
                // Try main extraction method first
                let extractedText = await this.extractTextFromPosition(file, pattern.position);
                
                // If main method fails, try fallback
                if (!extractedText) {
                    console.log('Bulk Tab: Main extraction failed, trying fallback...');
                    extractedText = await this.extractTextFromPatternFallback(file, pattern);
                }
                
                if (extractedText) {
                    console.log('Bulk Tab: Extracted text:', extractedText);
                    newName += extractedText + '_';
                } else {
                    console.log('Bulk Tab: No text extracted from pattern:', pattern.name);
                    // Try to use the pattern's sample text as a last resort
                    if (pattern.sampleText && pattern.sampleText.trim()) {
                        console.log('Bulk Tab: Using pattern sample text as last resort');
                        newName += pattern.sampleText.trim() + '_';
                    }
                }
            }
        }

        if (newName && additionalWords) {
            newName += additionalWords + '_';
        }

        if (newName) {
            newName = newName.replace(/[<>:"/\\|?*]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            const finalName = newName + '.pdf';
            console.log('Bulk Tab: Final generated name:', finalName);
            return finalName;
        }

        console.log('Bulk Tab: Could not generate new name');
        return null;
    }

    async extractTextFromPosition(file, position) {
        try {
            console.log('Bulk Tab: Extracting text from position:', position);
            
            if (!window.pdfjsLib) {
                console.error('Bulk Tab: PDF.js not available');
                return null;
            }

            // Ensure we have a valid buffer that won't be detached
            let buffer = file.buffer;
            let uint8Array;
            
            console.log('Bulk Tab: Buffer type in extractTextFromPosition:', buffer ? buffer.constructor.name : 'null');
            console.log('Bulk Tab: Buffer length in extractTextFromPosition:', buffer ? buffer.length : 'null');
            
            if (buffer instanceof ArrayBuffer) {
                // Create a copy to prevent detachment issues
                const bufferCopy = buffer.slice(0);
                uint8Array = new Uint8Array(bufferCopy);
                console.log('Bulk Tab: Created Uint8Array from ArrayBuffer, length:', uint8Array.length);
            } else if (buffer instanceof Uint8Array) {
                // If it's already a Uint8Array, create a copy
                uint8Array = new Uint8Array(buffer.slice(0));
                console.log('Bulk Tab: Created Uint8Array copy, length:', uint8Array.length);
            } else if (buffer && buffer.buffer) {
                // If it's a TypedArray, get the underlying buffer and copy it
                const bufferCopy = buffer.buffer.slice(0);
                uint8Array = new Uint8Array(bufferCopy);
                console.log('Bulk Tab: Created Uint8Array from TypedArray, length:', uint8Array.length);
            } else {
                console.error('Bulk Tab: Invalid buffer format');
                return null;
            }

            // Use PDF.js to extract text from the specific position
            const pdf = await window.pdfjsLib.getDocument({ data: uint8Array }).promise;
            const page = await pdf.getPage(position.page);
            
            // Get the page viewport to handle zoom levels
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Adjust position coordinates based on zoom level if present
            let adjustedPosition = { ...position };
            if (position.zoom && position.zoom !== 1.0) {
                adjustedPosition.x = position.x / position.zoom;
                adjustedPosition.y = position.y / position.zoom;
                adjustedPosition.width = position.width / position.zoom;
                adjustedPosition.height = position.height / position.zoom;
                console.log('Bulk Tab: Adjusted position for zoom:', position.zoom, 'Original:', position, 'Adjusted:', adjustedPosition);
            }
            
            const textContent = await page.getTextContent();
            let extractedText = '';
            
            console.log('Bulk Tab: Text content items:', textContent.items.length);
            
            for (const item of textContent.items) {
                const transform = item.transform;
                const x = transform[4];
                const y = viewport.height - transform[5]; // Flip Y coordinate
                const width = item.width;
                const height = item.height;
                
                const itemRect = {
                    x: x,
                    y: y - height, // Adjust for top-left origin
                    width: width,
                    height: height
                };
                
                if (this.rectanglesIntersectWithTolerance(adjustedPosition, itemRect, 5)) {
                    extractedText += item.str + ' ';
                }
            }
            
            const result = extractedText.trim();
            console.log('Bulk Tab: Extracted text result:', result);
            return result;
        } catch (error) {
            console.error('Error extracting text:', error);
            return null;
        }
    }

    async extractTextFromPatternFallback(file, pattern) {
        try {
            console.log('Bulk Tab: Using fallback extraction for pattern:', pattern.name);
            
            // Fallback method: try to extract text using a broader area around the position
            if (!pattern.position) {
                console.log('Bulk Tab: No position data available for fallback');
                return null;
            }

            // Expand the search area slightly
            const expandedPosition = {
                page: pattern.position.page,
                x: Math.max(0, pattern.position.x - 10),
                y: Math.max(0, pattern.position.y - 10),
                width: pattern.position.width + 20,
                height: pattern.position.height + 20
            };

            // Try extraction with expanded area
            const result = await this.extractTextFromPosition(file, expandedPosition);
            
            if (result) {
                console.log('Bulk Tab: Fallback extraction successful:', result);
                return result;
            }

            // If still no result, try using the sample text from the pattern
            if (pattern.sampleText && pattern.sampleText.trim()) {
                console.log('Bulk Tab: Using pattern sample text as fallback');
                return pattern.sampleText.trim();
            }

            console.log('Bulk Tab: All fallback methods failed');
            return null;
        } catch (error) {
            console.error('Bulk Tab: Error in fallback extraction:', error);
            return null;
        }
    }

    rectanglesIntersectWithTolerance(rect1, rect2, tolerance = 5) {
        return !(rect1.x + rect1.width + tolerance < rect2.x ||
                rect2.x + rect2.width + tolerance < rect1.x ||
                rect1.y + rect1.height + tolerance < rect2.y ||
                rect2.y + rect2.height + tolerance < rect1.y);
    }

    async renameFile(oldPath, newPath) {
        try {
            console.log('Bulk Tab: Renaming file from:', oldPath, 'to:', newPath);
            
            if (window.electronAPI) {
                const result = await window.electronAPI.renameFile(oldPath, newPath);
                if (!result.success) {
                    throw new Error(result.error);
                }
                console.log('Bulk Tab: File renamed successfully');
                
                // Update the file path in our file manager after successful rename
                this.updateFilePathAfterRename(oldPath, newPath);
                
                // Refresh the file list display to show updated names
                this.updateFileList();
            } else {
                // Web app - show message that file renaming is not supported
                this.setStatus('File renaming is not supported in web mode');
                throw new Error('File renaming not supported in web mode');
            }
        } catch (error) {
            throw new Error(`Failed to rename file: ${error.message}`);
        }
    }

    updateFilePathAfterRename(oldPath, newPath) {
        try {
            const bulkFiles = window.tabFileManager.getFiles('bulk');
            const fileIndex = bulkFiles.findIndex(file => file.path === oldPath);
            
            if (fileIndex !== -1) {
                // Update the file path and name
                const file = bulkFiles[fileIndex];
                file.path = newPath;
                file.name = this.getFileName(newPath);
                file.basename = this.getBaseName(newPath);
                
                console.log('Bulk Tab: Updated file path from', oldPath, 'to', newPath);
                console.log('Bulk Tab: Updated file name to:', file.name);
                
                // Update the tab file manager
                window.tabFileManager.files.set('bulk', bulkFiles);
            } else {
                console.warn('Bulk Tab: Could not find file to update path:', oldPath);
            }
        } catch (error) {
            console.error('Bulk Tab: Error updating file path after rename:', error);
        }
    }



    updatePatternSelection() {
        console.log('Bulk Tab: Updating pattern selection');
        
        const container = document.getElementById('patternSelectionContainer');
        if (!container) {
            console.log('Bulk Tab: Pattern selection container not found');
            return;
        }
        
        const patterns = window.app?.patterns || [];
        console.log('Bulk Tab: Patterns found:', patterns.length, patterns);
        
        if (patterns.length === 0) {
            // If no patterns are loaded yet, try again in a moment
            if (!window.app?.patterns) {
                console.log('Bulk Tab: Patterns not loaded yet, retrying in 500ms...');
                setTimeout(() => {
                    this.updatePatternSelection();
                }, 500);
                return;
            }
            container.innerHTML = '<p class="no-patterns">No patterns available. Please create patterns in the Files & Patterns tab first.</p>';
            return;
        }
        
        let html = '';
        patterns.forEach((pattern, index) => {
            const isChecked = index === 0 ? 'checked' : ''; // Check the first pattern by default
            html += `
                <div class="pattern-checkbox-item">
                    <input type="checkbox" id="pattern_${index}" name="selectedPatterns" value="${index}" ${isChecked}>
                    <label for="pattern_${index}">
                        <strong>${pattern.name}</strong>
                        <div class="pattern-description">${pattern.description || 'No description'}</div>
                        <div class="pattern-sample">Sample: ${pattern.sampleText || 'No sample text'}</div>
                    </label>
                </div>
            `;
        });
        
        // Add select all/none buttons
        html += `
            <div class="pattern-selection-actions">
                <button class="btn btn-outline btn-sm" id="selectAllPatterns">Select All</button>
                <button class="btn btn-outline btn-sm" id="selectNonePatterns">Select None</button>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Bind select all/none events
        this.bindPatternSelectionEvents();
    }
    
    bindPatternSelectionEvents() {
        const selectAllBtn = document.getElementById('selectAllPatterns');
        const selectNoneBtn = document.getElementById('selectNonePatterns');
        
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                const checkboxes = document.querySelectorAll('input[name="selectedPatterns"]');
                checkboxes.forEach(checkbox => checkbox.checked = true);
                this.updatePreview();
            });
        }
        
        if (selectNoneBtn) {
            selectNoneBtn.addEventListener('click', () => {
                const checkboxes = document.querySelectorAll('input[name="selectedPatterns"]');
                checkboxes.forEach(checkbox => checkbox.checked = false);
                this.updatePreview();
            });
        }
        
        // Bind individual checkbox events
        const checkboxes = document.querySelectorAll('input[name="selectedPatterns"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updatePreview();
            });
        });
    }
    
    getSelectedPatterns() {
        const patterns = window.app?.patterns || [];
        const selectedIndexes = [];
        
        const checkboxes = document.querySelectorAll('input[name="selectedPatterns"]:checked');
        checkboxes.forEach(checkbox => {
            selectedIndexes.push(parseInt(checkbox.value));
        });
        
        return selectedIndexes.map(index => patterns[index]).filter(Boolean);
    }

    updatePreview() {
        console.log('Bulk Tab: Updating preview');
        
        // Update preview based on selected patterns and additional words
        const additionalWordsInput = document.getElementById('additionalWords');
        const previewElement = document.getElementById('bulkRenamePreview');
        
        if (!additionalWordsInput || !previewElement) {
            console.log('Bulk Tab: Preview elements not found');
            return;
        }
        
        const additionalWords = additionalWordsInput.value.trim();
        const selectedPatterns = this.getSelectedPatterns();
        const files = window.tabFileManager.getFiles('bulk');
        
        console.log('Bulk Tab: Preview update - selected patterns:', selectedPatterns.length, 'files:', files.length);
        
        if (selectedPatterns.length === 0) {
            previewElement.textContent = 'No patterns selected. Please select at least one pattern.';
            return;
        }
        
        if (files.length === 0) {
            previewElement.textContent = 'No files loaded. Please load PDF files first.';
            return;
        }
        
        let preview = 'Rename Preview:\n\n';
        preview += `Files to process: ${files.length}\n`;
        preview += `Selected patterns: ${selectedPatterns.length}\n\n`;
        
        preview += 'Selected Patterns:\n';
        selectedPatterns.forEach(pattern => {
            preview += `• ${pattern.name}: [${pattern.sampleText || 'No sample text'}]\n`;
        });
        
        if (additionalWords) {
            preview += `\nAdditional words: ${additionalWords}\n`;
        }
        
        preview += '\nExample output:\n';
        if (files.length > 0 && selectedPatterns.length > 0) {
            const sampleFile = files[0];
            const samplePattern = selectedPatterns[0];
            if (samplePattern.sampleText) {
                let sampleName = samplePattern.sampleText;
                if (additionalWords) {
                    sampleName += '_' + additionalWords;
                }
                sampleName = sampleName.replace(/[<>:"/\\|?*]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                preview += `${sampleName}.pdf`;
            }
        }
        
        previewElement.textContent = preview;
    }

    setStatus(message) {
        console.log('Bulk Tab Status:', message);
        // You can implement a status display here if needed
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

    // Method to refresh file data if buffer is detached
    async refreshFileData(file) {
        try {
            console.log('Bulk Tab: Refreshing file data for:', file.name);
            
            if (window.electronAPI && file.path && file.path !== file.name) {
                // This is a desktop file, try to reload it
                const fileResult = await window.electronAPI.readFile(file.path);
                if (fileResult.success) {
                    // Clone the buffer to prevent detachment issues
                    let buffer;
                    if (fileResult.data instanceof ArrayBuffer) {
                        buffer = new Uint8Array(fileResult.data.slice(0));
                    } else if (fileResult.data instanceof Uint8Array) {
                        buffer = new Uint8Array(fileResult.data.slice(0));
                    } else {
                        console.error('Bulk Tab: Invalid refreshed file data format');
                        return false;
                    }
                    
                    file.buffer = buffer;
                    console.log('Bulk Tab: File data refreshed successfully');
                    return true;
                }
            } else {
                // Web mode - we can't refresh the file data, but we can try to work with what we have
                console.log('Bulk Tab: Web mode - cannot refresh file data from disk');
                return false;
            }
            
            console.log('Bulk Tab: Could not refresh file data');
            return false;
        } catch (error) {
            console.error('Error refreshing file data:', error);
            return false;
        }
    }
}

// Initialize bulk tab manager
let bulkTabManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('Bulk Tab Manager: DOM ready, creating instance...');
    try {
        bulkTabManager = new BulkTabManager();
        window.bulkTabManager = bulkTabManager;
        console.log('Bulk Tab Manager: Successfully created and assigned to window');
    } catch (error) {
        console.error('Bulk Tab Manager: Error creating instance:', error);
    }
});
