// Bulk Operations for PDF files
class BulkOperations {
    constructor() {
        this.files = [];
        this.patterns = [];
        this.bindEvents();
    }
    
    bindEvents() {
        // Bulk Rename Modal
        document.addEventListener('click', (e) => {
            if (e.target.id === 'bulkRenameModal') {
                this.closeBulkRenameModal();
            }
            if (e.target.id === 'splitModal') {
                this.closeSplitModal();
            }
        });
        
        // Naming strategy change
        document.querySelectorAll('input[name="namingStrategy"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateNamingStrategy());
        });
        
        // Form inputs for preview updates
        document.getElementById('selectedPattern').addEventListener('change', () => this.updatePreview());
        document.getElementById('secondPattern').addEventListener('change', () => this.updatePreview());
        document.getElementById('thirdPattern').addEventListener('change', () => this.updatePreview());
        document.getElementById('patternSeparator').addEventListener('input', () => this.updatePreview());
        document.getElementById('additionalWords').addEventListener('input', () => this.updatePreview());
        document.getElementById('sequencePrefix').addEventListener('input', () => this.updatePreview());
        document.getElementById('sequenceStart').addEventListener('input', () => this.updatePreview());
        document.getElementById('namePrefix').addEventListener('input', () => this.updatePreview());
        document.getElementById('nameSuffix').addEventListener('input', () => this.updatePreview());
        
        // Execute buttons
        document.getElementById('executeBulkRename').addEventListener('click', () => this.executeBulkRename());
        document.getElementById('executeSplit').addEventListener('click', () => this.executeSplit());
        
        // Reset button
        document.getElementById('resetBulkRenameBtn').addEventListener('click', () => this.resetBulkRename());
        
        // Split modal events
        document.getElementById('splitFile').addEventListener('change', () => this.updateSplitInfo());
        document.getElementById('pagesPerFile').addEventListener('input', () => this.updateSplitInfo());
        document.getElementById('selectOutputDir').addEventListener('click', () => this.selectOutputDirectory());
    }
    
    // Bulk Rename Modal
    openBulkRenameModal(files, patterns) {
        this.files = files;
        this.patterns = patterns;
        
        this.populatePatternDropdown();
        this.updateNamingStrategy();
        this.updatePreview();
        
        const modal = document.getElementById('bulkRenameModal');
        modal.classList.add('active');
    }
    
    closeBulkRenameModal() {
        const modal = document.getElementById('bulkRenameModal');
        modal.classList.remove('active');
    }
    
    resetBulkRename() {
        // Reset naming strategy to pattern
        document.querySelector('input[name="namingStrategy"][value="pattern"]').checked = true;
        
        // Reset pattern selections
        document.getElementById('selectedPattern').value = '';
        document.getElementById('secondPattern').value = '-1';
        document.getElementById('thirdPattern').value = '-1';
        document.getElementById('patternSeparator').value = '_';
        
        // Reset sequence options
        document.getElementById('sequencePrefix').value = '';
        document.getElementById('sequenceStart').value = '1';
        
        // Reset prefix/suffix options
        document.getElementById('namePrefix').value = '';
        document.getElementById('nameSuffix').value = '';
        
        // Reset additional words
        document.getElementById('additionalWords').value = '';
        
        // Update the interface and preview
        this.updateNamingStrategy();
        this.updatePreview();
        
        console.log('Bulk rename form reset successfully');
    }
    
    clearBulkRenameForm() {
        // Clear all form fields after successful bulk rename
        console.log('Clearing bulk rename form after completion...');
        
        // Reset naming strategy to pattern
        document.querySelector('input[name="namingStrategy"][value="pattern"]').checked = true;
        
        // Reset pattern selections
        document.getElementById('selectedPattern').value = '';
        document.getElementById('secondPattern').value = '-1';
        document.getElementById('thirdPattern').value = '-1';
        document.getElementById('patternSeparator').value = '_';
        
        // Reset sequence options
        document.getElementById('sequencePrefix').value = '';
        document.getElementById('sequenceStart').value = '1';
        
        // Reset prefix/suffix options
        document.getElementById('namePrefix').value = '';
        document.getElementById('nameSuffix').value = '';
        
        // Reset additional words
        document.getElementById('additionalWords').value = '';
        
        // Update the interface and preview
        this.updateNamingStrategy();
        this.updatePreview();
        
        console.log('Bulk rename form cleared successfully after completion');
    }
    
    populatePatternDropdown() {
        const select = document.getElementById('selectedPattern');
        const secondPatternSelect = document.getElementById('secondPattern');
        const thirdPatternSelect = document.getElementById('thirdPattern');
        
        // Clear and populate all dropdowns
        [select, secondPatternSelect, thirdPatternSelect].forEach((dropdown, index) => {
            dropdown.innerHTML = index === 0 ? '<option value="">Choose a pattern...</option>' : '<option value="-1">No pattern</option>';
            
            this.patterns.forEach((pattern, patternIndex) => {
                const option = document.createElement('option');
                option.value = patternIndex;
                option.textContent = `${pattern.name} (${pattern.type === 'visual_position' ? 'Visual' : 'Text'})`;
                dropdown.appendChild(option);
            });
        });
    }
    
    updateNamingStrategy() {
        const strategy = document.querySelector('input[name="namingStrategy"]:checked').value;
        console.log('Naming strategy changed to:', strategy);
        
        // Hide all strategy options
        document.getElementById('patternSelection').style.display = 'none';
        document.getElementById('sequenceOptions').style.display = 'none';
        document.getElementById('prefixOptions').style.display = 'none';
        
        // Show relevant options
        switch (strategy) {
            case 'pattern':
                document.getElementById('patternSelection').style.display = 'block';
                break;
            case 'sequence':
                document.getElementById('sequenceOptions').style.display = 'block';
                break;
            case 'prefix':
                document.getElementById('prefixOptions').style.display = 'block';
                break;
        }
        
        this.updatePreview();
    }
    
    async updatePreview() {
        try {
            const strategyElement = document.querySelector('input[name="namingStrategy"]:checked');
            if (!strategyElement) {
                console.error('No naming strategy selected');
                return;
            }
            
            const strategy = strategyElement.value;
            const preview = document.getElementById('renamePreview');
            
            if (!preview) {
                console.error('Preview element not found');
                return;
            }
            
            // Debug: Check what strategy is actually selected
            this.debugStrategySelection();
            
            if (this.files.length === 0) {
                preview.innerHTML = '<p>No files to preview</p>';
                return;
            }
            
            preview.innerHTML = '<p>Generating preview...</p>';
            const newNames = await this.generateNewNames(strategy);
            
            if (!newNames || newNames.length === 0) {
                preview.innerHTML = '<p>No preview available</p>';
                return;
            }
            
            preview.innerHTML = newNames.map((newName, index) => {
                if (index >= this.files.length) return '';
                return `
                    <div class="preview-item">
                        <span class="old-name">${this.escapeHtml(this.files[index].basename)}</span>
                        <span style="margin: 0 1rem;">→</span>
                        <span class="new-name">${this.escapeHtml(newName)}</span>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error generating preview:', error);
            const preview = document.getElementById('renamePreview');
            if (preview) {
                preview.innerHTML = '<p>Error generating preview: ' + error.message + '</p>';
            }
        }
    }
    
    debugStrategySelection() {
        const selectedStrategy = document.querySelector('input[name="namingStrategy"]:checked');
        console.log('=== Strategy Selection Debug ===');
        console.log('Selected strategy element:', selectedStrategy);
        console.log('Selected strategy value:', selectedStrategy ? selectedStrategy.value : 'none');
        console.log('All strategy radio buttons:');
        document.querySelectorAll('input[name="namingStrategy"]').forEach((radio, index) => {
            console.log(`  ${index}: value="${radio.value}", checked=${radio.checked}`);
        });
        console.log('==============================');
    }
    
    async generateNewNames(strategy) {
        try {
            console.log('Generating new names with strategy:', strategy);
            
            // Safety check - ensure we have files
            if (!this.files || this.files.length === 0) {
                console.log('No files to process');
                return [];
            }
            
            // Get the actual selected strategy
            const strategyElement = document.querySelector('input[name="namingStrategy"]:checked');
            if (!strategyElement) {
                console.log('No strategy selected, using default');
                return this.files.map(file => file.basename || 'unnamed');
            }
            
            const finalStrategy = strategyElement.value;
            console.log('Final strategy:', finalStrategy);
            
            const newNames = [];
            
            // Simple, safe pattern for each file
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                if (!file || !file.basename) {
                    newNames.push('unnamed');
                    continue;
                }
                
                let newName = '';
                
                switch (finalStrategy) {
                    case 'pattern':
                        newName = this.generateSimplePatternName(file, i);
                        break;
                    case 'sequence':
                        newName = this.generateSequenceName(file, i);
                        break;
                    case 'prefix':
                        newName = this.generatePrefixName(file);
                        break;
                    default:
                        newName = file.basename;
                }
                
                newNames.push(newName || file.basename);
            }
            
            console.log('Generated names:', newNames);
            return newNames;
            
        } catch (error) {
            console.error('Error in generateNewNames:', error);
            // Safe fallback - return original filenames
            return this.files.map(file => file.basename || 'unnamed');
        }
    }
    
    generateSimplePatternName(file, fileIndex) {
        try {
            // For preview purposes, show sample extracted text to give users a better idea
            const patternIndex = parseInt(document.getElementById('selectedPattern')?.value || '0');
            const secondPatternIndex = parseInt(document.getElementById('secondPattern')?.value || '-1');
            const thirdPatternIndex = parseInt(document.getElementById('secondPattern')?.value || '-1');
            const separator = document.getElementById('patternSeparator')?.value || '_';
            const additionalWords = document.getElementById('additionalWords')?.value?.trim() || '';
            
            let extractedParts = [];
            
            // For preview, show sample extracted text based on pattern names
            if (patternIndex >= 0 && this.patterns[patternIndex]) {
                const pattern = this.patterns[patternIndex];
                let sampleText = this.getSampleTextForPattern(pattern, file);
                if (sampleText) {
                    extractedParts.push(sampleText);
                }
            }
            
            if (secondPatternIndex >= 0 && this.patterns[secondPatternIndex]) {
                const pattern = this.patterns[secondPatternIndex];
                let sampleText = this.getSampleTextForPattern(pattern, file);
                if (sampleText) {
                    extractedParts.push(sampleText);
                }
            }
            
            if (thirdPatternIndex >= 0 && this.patterns[thirdPatternIndex]) {
                const pattern = this.patterns[thirdPatternIndex];
                let sampleText = this.getSampleTextForPattern(pattern, file);
                if (sampleText) {
                    extractedParts.push(sampleText);
                }
            }
            
            // Combine extracted parts
            let newName = extractedParts.length > 0 ? extractedParts.join(separator) : file.basename;
            
            // Add additional words if provided
            if (additionalWords) {
                newName = `${newName}${separator}${additionalWords}`;
            }
            
            return newName;
            
        } catch (error) {
            console.error('Error generating pattern name:', error);
            return file.basename;
        }
    }
    
    getSampleTextForPattern(pattern, file) {
        // Generate sample text based on pattern name and file info for preview
        if (!pattern) return '';
        
        const patternName = pattern.name.toLowerCase();
        
        // Generate realistic sample text based on pattern name
        if (patternName.includes('client') || patternName.includes('name')) {
            // Extract the first part of the filename as sample client name
            const parts = file.basename.split(/[_,\s-]+/);
            return parts[0] || 'ClientName';
        } else if (patternName.includes('case') || patternName.includes('number')) {
            // Look for number patterns in filename
            const numbers = file.basename.match(/\d{5,}/);
            return numbers ? numbers[0] : '12345';
        } else if (patternName.includes('date')) {
            return '2024-08-25';
        } else if (patternName.includes('invoice')) {
            return 'INV001';
        } else {
            // Fallback to pattern name for other types
            return pattern.name.replace(/\s+/g, '');
        }
    }
    
    generateSequenceName(file, fileIndex) {
        try {
            const prefix = document.getElementById('sequencePrefix')?.value || 'Document_';
            const start = parseInt(document.getElementById('sequenceStart')?.value || '1');
            const sequenceNumber = start + fileIndex;
            return `${prefix}${sequenceNumber.toString().padStart(3, '0')}`;
        } catch (error) {
            console.error('Error generating sequence name:', error);
            return file.basename;
        }
    }
    
    generatePrefixName(file) {
        try {
            const namePrefix = document.getElementById('namePrefix')?.value || '';
            const nameSuffix = document.getElementById('nameSuffix')?.value || '';
            return `${namePrefix}${file.basename}${nameSuffix}`;
        } catch (error) {
            console.error('Error generating prefix name:', error);
            return file.basename;
        }
    }
    
    async generateActualNewNames(strategy) {
        try {
            console.log('Generating actual new names for execution with strategy:', strategy);
            
            // Safety check - ensure we have files
            if (!this.files || this.files.length === 0) {
                console.log('No files to process');
                return [];
            }
            
            const newNames = [];
            
            // For actual execution, use real pattern extraction
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                if (!file || !file.basename) {
                    newNames.push('unnamed');
                    continue;
                }
                
                let newName = '';
                
                switch (strategy) {
                    case 'pattern':
                        newName = await this.generateActualPatternName(file, i);
                        break;
                    case 'sequence':
                        newName = this.generateSequenceName(file, i);
                        break;
                    case 'prefix':
                        newName = this.generatePrefixName(file);
                        break;
                    default:
                        newName = file.basename;
                }
                
                newNames.push(newName || file.basename);
            }
            
            console.log('Generated actual names:', newNames);
            return newNames;
            
        } catch (error) {
            console.error('Error in generateActualNewNames:', error);
            // Safe fallback - return original filenames
            return this.files.map(file => file.basename || 'unnamed');
        }
    }
    
    async generateActualPatternName(file, fileIndex) {
        try {
            const patternIndex = parseInt(document.getElementById('selectedPattern')?.value || '0');
            const secondPatternIndex = parseInt(document.getElementById('secondPattern')?.value || '-1');
            const thirdPatternIndex = parseInt(document.getElementById('thirdPattern')?.value || '-1');
            const separator = document.getElementById('patternSeparator')?.value || '_';
            const additionalWords = document.getElementById('additionalWords')?.value?.trim() || '';
            
            let extractedParts = [];
            
            // Extract from primary pattern - USE REAL EXTRACTION
            if (patternIndex >= 0 && this.patterns[patternIndex]) {
                const text = await this.extractTextFromPattern(file, this.patterns[patternIndex]);
                if (text) extractedParts.push(this.cleanFileName(text));
            }
            
            // Extract from second pattern - USE REAL EXTRACTION
            if (secondPatternIndex >= 0 && this.patterns[secondPatternIndex]) {
                const text = await this.extractTextFromPattern(file, this.patterns[secondPatternIndex]);
                if (text) extractedParts.push(this.cleanFileName(text));
            }
            
            // Extract from third pattern - USE REAL EXTRACTION
            if (thirdPatternIndex >= 0 && this.patterns[thirdPatternIndex]) {
                const text = await this.extractTextFromPattern(file, this.patterns[thirdPatternIndex]);
                if (text) extractedParts.push(this.cleanFileName(text));
            }
            
            // Combine extracted parts
            let newName = extractedParts.length > 0 ? extractedParts.join(separator) : file.basename;
            
            // Add additional words if provided
            if (additionalWords) {
                newName = `${newName}${separator}${additionalWords}`;
            }
            
            console.log(`Actual pattern extraction for ${file.basename}: ${extractedParts.join(', ')} -> ${newName}`);
            return newName;
            
        } catch (error) {
            console.error('Error generating actual pattern name:', error);
            return file.basename;
        }
    }
    
    async extractTextFromPattern(file, pattern) {
        try {
            if (pattern.type === 'visual_position') {
                // Use visual position extraction
                return await this.extractTextFromPosition(file, pattern.position);
            } else if (pattern.regex) {
                // Use regex extraction on file text
                if (!file.text) {
                    console.warn('No text content available for regex pattern');
                    return '';
                }
                const regex = new RegExp(pattern.regex, 'i');
                const match = file.text.match(regex);
                if (match && match[1]) {
                    return match[1].trim().replace(/\s+/g, ' ');
                }
            }
            return '';
        } catch (error) {
            console.error('Error extracting text from pattern:', error);
            return '';
        }
    }
    
    async applyPatternToFiles(pattern) {
        const newNames = [];
        
        for (const file of this.files) {
            try {
                if (pattern.type === 'visual_position') {
                    // Handle visual position patterns
                    const extractedText = await this.extractTextFromPosition(file, pattern.position);
                    if (extractedText) {
                        newNames.push(this.cleanFileName(extractedText));
                    } else {
                        newNames.push(file.basename); // Fallback to original name
                    }
                } else if (pattern.regex) {
                    // Handle regex patterns
                    const regex = new RegExp(pattern.regex, 'i');
                    const match = file.text.match(regex);
                    
                    if (match && match[1]) {
                        const extractedText = match[1].trim().replace(/\s+/g, ' ');
                        newNames.push(this.cleanFileName(extractedText));
                    } else {
                        newNames.push(file.basename); // Fallback to original name
                    }
                } else {
                    newNames.push(file.basename);
                }
            } catch (error) {
                console.error('Error applying pattern:', error);
                newNames.push(file.basename);
            }
        }
        
        return newNames;
    }
    
    async applyMultiplePatternsToFiles(patterns, separator) {
        const newNames = [];
        
        for (const file of this.files) {
            try {
                const extractedParts = [];
                
                for (const pattern of patterns) {
                    let extractedText = '';
                    
                    if (pattern.type === 'visual_position') {
                        extractedText = await this.extractTextFromPosition(file, pattern.position);
                    } else if (pattern.regex) {
                        const regex = new RegExp(pattern.regex, 'i');
                        const match = file.text.match(regex);
                        if (match && match[1]) {
                            extractedText = match[1].trim().replace(/\s+/g, ' ');
                        }
                    }
                    
                    if (extractedText) {
                        extractedParts.push(this.cleanFileName(extractedText));
                    }
                }
                
                if (extractedParts.length > 0) {
                    newNames.push(extractedParts.join(separator));
                } else {
                    newNames.push(file.basename); // Fallback to original name
                }
            } catch (error) {
                console.error('Error applying multiple patterns:', error);
                newNames.push(file.basename);
            }
        }
        
        return newNames;
    }
    
    async extractTextFromPosition(file, position) {
        try {
            if (!position || !file.buffer) return '';
            
            // Load PDF and extract text from specific position
            const uint8Array = new Uint8Array(file.buffer);
            const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
            
            if (position.page > pdf.numPages) {
                console.warn(`Pattern targets page ${position.page} but PDF only has ${pdf.numPages} pages`);
                return '';
            }
            
            const page = await pdf.getPage(position.page);
            const textContent = await page.getTextContent();
            
            // Convert pattern coordinates to current viewport
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Handle potential coordinate scaling differences
            // Most PDFs are saved at 100% scale, but we need to handle variations
            const scaleAdjustment = position.zoom || 1.0;
            
            const selectionRect = {
                left: position.x / scaleAdjustment,
                top: position.y / scaleAdjustment,
                right: (position.x + position.width) / scaleAdjustment,
                bottom: (position.y + position.height) / scaleAdjustment
            };
            
            console.log(`Extracting from position: page ${position.page}, rect (${selectionRect.left}, ${selectionRect.top}, ${selectionRect.right}, ${selectionRect.bottom})`);
            
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
                
                // Check if text item intersects with selection (with tolerance)
                if (this.rectanglesIntersectWithTolerance(selectionRect, itemRect, 5)) {
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
            
            const extractedText = extractedItems.map(item => item.text).join(' ').trim();
            console.log(`Extracted ${extractedItems.length} text items: "${extractedText}"`);
            
            return extractedText;
            
        } catch (error) {
            console.error('Error extracting text from position:', error);
            return '';
        }
    }
    
    rectanglesIntersect(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }

    rectanglesIntersectWithTolerance(rect1, rect2, tolerance = 5) {
        // Expand rect1 by tolerance to catch nearby text
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
    
    async executeBulkRename() {
        const strategy = document.querySelector('input[name="namingStrategy"]:checked').value;
        
        // For actual execution, we need to use real pattern extraction, not preview placeholders
        console.log('Executing bulk rename with strategy:', strategy);
        const newNames = await this.generateActualNewNames(strategy);
        
        console.log('Generated new names for execution:', newNames);
        
        if (newNames.length !== this.files.length) {
            alert('Error generating new names');
            return;
        }
        
        // Confirm action
        if (!confirm(`Are you sure you want to rename ${this.files.length} files?\n\nFiles will be renamed in their original location.`)) {
            return;
        }
        
        // Show progress bar
        this.showProgressBar();
        this.setRenameStatus('Renaming files in their original location...', true);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Add progress tracking
        const totalFiles = this.files.length;
        let processedFiles = 0;
        
        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            const newName = newNames[i];
            
            // Update progress
            processedFiles++;
            const progress = Math.round((processedFiles / totalFiles) * 100);
            this.updateProgressBar(progress, `Processing file ${processedFiles}/${totalFiles}: ${file.name}`);
            this.setRenameStatus(`Processing file ${processedFiles}/${totalFiles} (${progress}%): ${file.name}`, true);
            
            console.log(`File ${i}: "${file.basename}" -> "${newName}"`);
            
            if (newName === file.basename) {
                console.log(`Skipping file ${i}: name unchanged`);
                continue; // Skip if name hasn't changed
            }
            
            try {
                const dir = this.getDirName(file.path);
                const newPath = `${dir}/${newName}.pdf`;
                
                // Check if target file already exists in the filesystem
                try {
                    const { ipcRenderer } = require('electron');
                    const fileExists = await ipcRenderer.invoke('file-exists', newPath);
                    
                    if (fileExists) {
                        errors.push(`${file.name}: Target file already exists`);
                        errorCount++;
                        continue;
                    }
                } catch (error) {
                    console.error('Error checking file existence:', error);
                    // Continue with rename attempt
                }
                
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('rename-file', file.path, newPath);
                
                if (result.success) {
                    file.path = newPath;
                    file.name = `${newName}.pdf`;
                    file.basename = newName;
                    successCount++;
                } else {
                    errors.push(`${file.name}: ${result.error}`);
                    errorCount++;
                }
                
            } catch (error) {
                console.error('Error renaming file:', error);
                errors.push(`${file.name}: ${error.message}`);
                errorCount++;
            }
        }
        
        this.setRenameStatus('Complete', false);
        
        // Hide progress bar
        this.hideProgressBar();
        
        // Show results
        let message = `Bulk rename completed!\n\nSuccessfully renamed: ${successCount} files`;
        if (errorCount > 0) {
            message += `\nErrors: ${errorCount} files\n\n` + errors.join('\n');
        }
        
        alert(message);
        
        // Refresh UI and file list to avoid duplicate rename attempts
        if (window.app) {
            window.app.refreshFiles();
            // Also update the files array to reflect the new names
            this.files = window.app.files || [];
        }
        
        // Clear all form fields after successful bulk rename
        this.clearBulkRenameForm();
        
        this.closeBulkRenameModal();
    }
    
    setRenameStatus(message, loading = false) {
        const executeBtn = document.getElementById('executeBulkRename');
        
        if (loading) {
            executeBtn.disabled = true;
            executeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
        } else {
            executeBtn.disabled = false;
            executeBtn.innerHTML = '<i class="fas fa-check"></i> Rename All Files';
        }
    }
    
    showProgressBar() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
    }
    
    hideProgressBar() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }
    
    updateProgressBar(progress, text) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
    }
    
    // Split PDF Modal
    openSplitModal(files) {
        this.files = files;
        
        this.populateFileDropdown();
        this.updateSplitInfo();
        
        const modal = document.getElementById('splitModal');
        modal.classList.add('active');
    }
    
    closeSplitModal() {
        const modal = document.getElementById('splitModal');
        modal.classList.remove('active');
    }
    
    populateFileDropdown() {
        const select = document.getElementById('splitFile');
        select.innerHTML = '<option value="">Choose a PDF file...</option>';
        
        this.files.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${file.name} (${file.pages} pages)`;
            select.appendChild(option);
        });
    }
    
    updateSplitInfo() {
        const fileIndex = parseInt(document.getElementById('splitFile').value);
        const pagesPerFile = parseInt(document.getElementById('pagesPerFile').value) || 1;
        const splitInfo = document.getElementById('splitInfo');
        const executeBtn = document.getElementById('executeSplit');
        
        if (fileIndex >= 0 && this.files[fileIndex]) {
            const file = this.files[fileIndex];
            const totalPages = file.pages;
            const numberOfFiles = Math.ceil(totalPages / pagesPerFile);
            
            splitInfo.innerHTML = `
                <h4><i class="fas fa-info-circle"></i> Split Information</h4>
                <p><strong>File:</strong> ${this.escapeHtml(file.name)}</p>
                <p><strong>Total Pages:</strong> ${totalPages}</p>
                <p><strong>Pages per File:</strong> ${pagesPerFile}</p>
                <p><strong>Number of Output Files:</strong> ${numberOfFiles}</p>
                <p><strong>File Names:</strong> ${file.basename}_part01.pdf, ${file.basename}_part02.pdf, ...</p>
            `;
            
            executeBtn.disabled = !document.getElementById('outputDirectory').value;
        } else {
            splitInfo.innerHTML = '';
            executeBtn.disabled = true;
        }
    }
    
    async selectOutputDirectory() {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('select-directory');
            
            if (!result.canceled && result.filePaths.length > 0) {
                document.getElementById('outputDirectory').value = result.filePaths[0];
                this.updateSplitInfo();
            }
        } catch (error) {
            console.error('Error selecting directory:', error);
            alert('Error selecting directory: ' + error.message);
        }
    }
    
    async executeSplit() {
        const fileIndex = parseInt(document.getElementById('splitFile').value);
        const pagesPerFile = parseInt(document.getElementById('pagesPerFile').value) || 1;
        const outputDir = document.getElementById('outputDirectory').value;
        const createZip = document.getElementById('createZipFile').checked;
        
        if (fileIndex < 0 || !this.files[fileIndex]) {
            alert('Please select a file to split');
            return;
        }
        
        if (pagesPerFile < 1) {
            alert('Pages per file must be at least 1');
            return;
        }
        
        if (!outputDir) {
            alert('Please select an output directory');
            return;
        }
        
        const file = this.files[fileIndex];
        
        if (pagesPerFile >= file.pages) {
            alert(`Pages per file (${pagesPerFile}) must be less than total pages (${file.pages})`);
            return;
        }
        
        this.setSplitStatus('Splitting PDF...', true);
        
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('split-pdf', file.path, outputDir, pagesPerFile, createZip);
            
            if (result.success) {
                this.setSplitStatus('Complete', false);
                
                if (createZip && result.zipPath) {
                    const downloadResult = await ipcRenderer.invoke('download-file', result.zipPath, `${file.basename}_split.zip`);
                    
                    if (downloadResult.success && !downloadResult.canceled) {
                        alert(`PDF split successfully!\n\n` +
                              `Created ${result.totalFiles} files and packaged into ZIP.\n` +
                              `ZIP downloaded to: ${downloadResult.path}`);
                    } else if (!downloadResult.canceled) {
                        alert(`PDF split successfully!\n\n` +
                              `Created ${result.totalFiles} files.\n` +
                              `ZIP created at: ${result.zipPath}\n` +
                              `Error downloading: ${downloadResult.error}`);
                    }
                } else {
                    alert(`PDF split successfully!\n\n` +
                          `Created ${result.totalFiles} files in:\n${outputDir}\n\n` +
                          `Files: ${result.results.map(r => r.fileName).join(', ')}`);
                }
                
                this.closeSplitModal();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error splitting PDF:', error);
            this.setSplitStatus('Error', false);
            alert('Error splitting PDF: ' + error.message);
        }
    }
    
    setSplitStatus(message, loading = false) {
        const executeBtn = document.getElementById('executeSplit');
        
        if (loading) {
            executeBtn.disabled = true;
            executeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
        } else {
            executeBtn.disabled = false;
            executeBtn.innerHTML = '<i class="fas fa-cut"></i> Split PDF';
        }
    }
    
    // Utility methods
    cleanFileName(name) {
        // Remove invalid characters for file names
        return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
    }
    
    getDirName(path) {
        return path.substring(0, path.lastIndexOf('/')) || path.substring(0, path.lastIndexOf('\\'));
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize bulk operations
let bulkOperations;
document.addEventListener('DOMContentLoaded', () => {
    bulkOperations = new BulkOperations();
    window.bulkOperations = bulkOperations;
});

// Modal close functions
function closeBulkRenameModal() {
    bulkOperations.closeBulkRenameModal();
}

function closeSplitModal() {
    bulkOperations.closeSplitModal();
}
