// Bulk Operations for PDF files
class BulkOperations {
    constructor() {
        this.files = [];
        this.patterns = [];
        this.pdfCache = new Map(); // Cache for PDF documents
        this.maxCacheSize = 10; // Maximum number of PDFs to cache
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
        document.getElementById('executeBulkRename').addEventListener('click', () => {
            console.log('Execute bulk rename button clicked!');
            const button = document.getElementById('executeBulkRename');
            console.log('Button disabled state:', button.disabled);
            console.log('Button text:', button.textContent);
            this.executeBulkRename();
        });
        document.getElementById('executeSplit').addEventListener('click', () => this.executeSplit());
        
        // Reset button
        document.getElementById('resetBulkRenameBtn').addEventListener('click', () => this.resetBulkRename());
        
        // Split modal events
        document.getElementById('splitFile').addEventListener('change', () => this.updateSplitInfo());
        document.getElementById('pagesPerFile').addEventListener('input', () => this.updateSplitInfo());
        document.getElementById('createZip').addEventListener('change', () => this.updateSplitInfo());
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
        
        // Store current selections
        const currentSelections = [
            select.value,
            secondPatternSelect.value,
            thirdPatternSelect.value
        ];
        
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
        
        // Restore selections if they still exist, otherwise reset to default
        [select, secondPatternSelect, thirdPatternSelect].forEach((dropdown, index) => {
            const currentSelection = currentSelections[index];
            if (currentSelection && currentSelection !== '' && currentSelection !== '-1') {
                // Check if the selected pattern index still exists
                const patternIndex = parseInt(currentSelection);
                if (patternIndex >= 0 && patternIndex < this.patterns.length) {
                    dropdown.value = currentSelection;
                } else {
                    // Pattern no longer exists, reset to default
                    dropdown.value = index === 0 ? '' : '-1';
                }
            }
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
    
    async generateActualNewNamesOptimized(strategy) {
        try {
            console.log('Generating optimized actual new names for execution with strategy:', strategy);
            
            // Safety check - ensure we have files
            if (!this.files || this.files.length === 0) {
                console.log('No files to process');
                return [];
            }
            
            const newNames = [];
            
            // Process files in batches for better performance
            const batchSize = 10;
            
            for (let i = 0; i < this.files.length; i += batchSize) {
                const batch = this.files.slice(i, i + batchSize);
                const batchNames = [];
                
                // Process batch in parallel
                const batchPromises = batch.map(async (file, batchIndex) => {
                    const fileIndex = i + batchIndex;
                    
                    if (!file || !file.basename) {
                        return 'unnamed';
                    }
                    
                    let newName = '';
                    
                    switch (strategy) {
                        case 'pattern':
                            newName = await this.generateActualPatternName(file, fileIndex);
                            break;
                        case 'sequence':
                            newName = this.generateSequenceName(file, fileIndex);
                            break;
                        case 'prefix':
                            newName = this.generatePrefixName(file);
                            break;
                        default:
                            newName = file.basename;
                    }
                    
                    return newName || file.basename;
                });
                
                // Wait for batch to complete
                const batchResults = await Promise.all(batchPromises);
                newNames.push(...batchResults);
                
                // Update progress
                const progress = Math.round(((i + batchSize) / this.files.length) * 100);
                this.updateProgressBar(Math.min(progress, 90), `Generating names: ${Math.min(i + batchSize, this.files.length)}/${this.files.length}`);
            }
            
            console.log('Generated optimized actual names:', newNames);
            return newNames;
            
        } catch (error) {
            console.error('Error in generateActualNewNamesOptimized:', error);
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
            
            // Use cached PDF document if available to avoid reloading
            let pdf = this.getCachedPdf(file);
            if (!pdf) {
                const uint8Array = new Uint8Array(file.buffer);
                pdf = await pdfjsLib.getDocument({ 
                    data: uint8Array,
                    // Optimize for text extraction
                    disableFontFace: true,
                    disableRange: true,
                    disableStream: true
                }).promise;
                // Cache the PDF document for reuse
                this.setCachedPdf(file, pdf);
            }
            
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
            
            // Optimize text extraction by filtering items first
            const relevantItems = textContent.items.filter(item => {
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
                
                // Quick intersection check
                return !(selectionRect.right < itemRect.left || 
                        selectionRect.left > itemRect.right || 
                        selectionRect.bottom < itemRect.top || 
                        selectionRect.top > itemRect.bottom);
            });
            
            // Process only relevant items
            relevantItems.forEach(item => {
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
        console.log('=== BULK RENAME STARTED ===');
        const strategy = document.querySelector('input[name="namingStrategy"]:checked').value;
        
        // Performance monitoring
        const startTime = performance.now();
        console.log('Executing bulk rename with strategy:', strategy);
        console.log(`Processing ${this.files.length} files`);
        
        // Confirm action
        if (!confirm(`Are you sure you want to rename ${this.files.length} files?\n\nFiles will be renamed in their original location.`)) {
            return;
        }
        
        // Show progress bar
        this.showProgressBar();
        this.setRenameStatus('Preparing bulk rename...', true);
        
        // Pre-generate all new names in batches for better performance
        const nameGenStart = performance.now();
        const newNames = await this.generateActualNewNamesOptimized(strategy);
        const nameGenTime = performance.now() - nameGenStart;
        console.log(`Name generation took: ${nameGenTime.toFixed(2)}ms`);
        
        console.log('Generated new names for execution:', newNames);
        
        if (newNames.length !== this.files.length) {
            alert('Error generating new names');
            this.hideProgressBar();
            return;
        }
        
        this.setRenameStatus('Renaming files in their original location...', true);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Process files in batches for better performance
        const batchSize = 5; // Process 5 files at a time
        const totalFiles = this.files.length;
        let processedFiles = 0;
        
        for (let i = 0; i < this.files.length; i += batchSize) {
            const batch = this.files.slice(i, i + batchSize);
            const batchNames = newNames.slice(i, i + batchSize);
            
            // Process batch in parallel
            const batchPromises = batch.map(async (file, batchIndex) => {
                const fileIndex = i + batchIndex;
                const newName = batchNames[batchIndex];
                
                console.log(`File ${fileIndex}: "${file.basename}" -> "${newName}"`);
                
                if (newName === file.basename) {
                    console.log(`Skipping file ${fileIndex}: name unchanged`);
                    return { success: true, skipped: true };
                }
                
                try {
                    const dir = this.getDirName(file.path);
                    const newPath = `${dir}/${newName}.pdf`;
                    
                    // Check if target file already exists in the filesystem
                    try {
                        const { ipcRenderer } = require('electron');
                        const fileExists = await ipcRenderer.invoke('file-exists', newPath);
                        
                        if (fileExists) {
                            return { success: false, error: `${file.name}: Target file already exists` };
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
                        return { success: true, skipped: false };
                    } else {
                        return { success: false, error: `${file.name}: ${result.error}` };
                    }
                    
                } catch (error) {
                    console.error('Error renaming file:', error);
                    return { success: false, error: `${file.name}: ${error.message}` };
                }
            });
            
            // Wait for batch to complete
            const batchResults = await Promise.all(batchPromises);
            
            // Process results
            batchResults.forEach(result => {
                if (result.success) {
                    if (!result.skipped) {
                        successCount++;
                    }
                } else {
                    errors.push(result.error);
                    errorCount++;
                }
            });
            
            // Update progress
            processedFiles += batch.length;
            const progress = Math.round((processedFiles / totalFiles) * 100);
            this.updateProgressBar(progress, `Processing files ${processedFiles}/${totalFiles} (${progress}%)`);
            this.setRenameStatus(`Processing files ${processedFiles}/${totalFiles} (${progress}%): Batch ${Math.ceil((i + batchSize) / batchSize)}`, true);
            
            // Small delay to prevent UI blocking
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        this.setRenameStatus('Complete', false);
        
        // Hide progress bar
        this.hideProgressBar();
        
        // Performance summary
        const totalTime = performance.now() - startTime;
        const avgTimePerFile = totalTime / this.files.length;
        console.log(`Bulk rename completed in ${totalTime.toFixed(2)}ms`);
        console.log(`Average time per file: ${avgTimePerFile.toFixed(2)}ms`);
        console.log(`Files per second: ${(1000 / avgTimePerFile).toFixed(2)}`);
        console.log('=== BULK RENAME COMPLETED ===');
        
        // Show completion popup
        console.log('About to show completion popup:', { successCount, errorCount, errors: errors.length, totalTime, avgTimePerFile });
        
        // Show a simple alert first to confirm completion
        alert(`Bulk rename completed!\n\nSuccessfully renamed: ${successCount} files\nErrors: ${errorCount} files\nTotal time: ${(totalTime / 1000).toFixed(2)}s`);
        
        this.showCompletionPopup(successCount, errorCount, errors, totalTime, avgTimePerFile);
        
        // Refresh UI and file list to avoid duplicate rename attempts
        if (window.app) {
            window.app.refreshFiles();
            // Also update the files array to reflect the new names
            this.files = window.app.files || [];
        }
        
        // Clear all form fields after successful bulk rename
        this.clearBulkRenameForm();
        
        // Don't close the modal immediately, let user see the completion popup
        // this.closeBulkRenameModal();
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
            progressFill.style.width = `${Math.min(progress, 100)}%`;
            progressFill.style.transition = 'width 0.3s ease';
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
        
        // Update document title to show progress
        if (progress > 0 && progress < 100) {
            document.title = `Aura PDF - ${progress}% Complete`;
        } else if (progress >= 100) {
            document.title = 'Aura PDF - Complete';
        }
    }
    
    showCompletionPopup(successCount, errorCount, errors, totalTime, avgTimePerFile) {
        console.log('showCompletionPopup called with:', { successCount, errorCount, errors: errors.length, totalTime, avgTimePerFile });
        
        // Create completion popup modal
        const modal = document.createElement('div');
        modal.className = 'completion-modal';
        modal.innerHTML = `
            <div class="completion-content">
                <div class="completion-header">
                    <div class="completion-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>Bulk Rename Complete!</h3>
                </div>
                <div class="completion-body">
                    <div class="completion-stats">
                        <div class="stat-item success">
                            <i class="fas fa-check"></i>
                            <span>Successfully renamed: ${successCount} files</span>
                        </div>
                        ${errorCount > 0 ? `
                        <div class="stat-item error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Errors: ${errorCount} files</span>
                        </div>
                        ` : ''}
                        <div class="stat-item performance">
                            <i class="fas fa-clock"></i>
                            <span>Total time: ${(totalTime / 1000).toFixed(2)}s</span>
                        </div>
                        <div class="stat-item performance">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>Speed: ${(1000 / avgTimePerFile).toFixed(1)} files/sec</span>
                        </div>
                    </div>
                    ${errorCount > 0 ? `
                    <div class="error-details">
                        <h4>Error Details:</h4>
                        <div class="error-list">
                            ${errors.slice(0, 5).map(error => `<div class="error-item">${error}</div>`).join('')}
                            ${errors.length > 5 ? `<div class="error-item">... and ${errors.length - 5} more errors</div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="completion-footer">
                    <button class="btn btn-primary" onclick="this.closest('.completion-modal').remove(); document.getElementById('bulkRenameModal').classList.remove('active');">
                        <i class="fas fa-check"></i> Got it!
                    </button>
                </div>
            </div>
        `;
        
        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .completion-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                animation: fadeIn 0.3s ease;
            }
            
            .completion-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                animation: slideIn 0.3s ease;
            }
            
            .completion-header {
                text-align: center;
                padding: 30px 30px 20px;
                border-bottom: 1px solid #eee;
            }
            
            .completion-icon {
                font-size: 48px;
                color: #28a745;
                margin-bottom: 15px;
            }
            
            .completion-header h3 {
                margin: 0;
                color: #333;
                font-size: 24px;
                font-weight: 600;
            }
            
            .completion-body {
                padding: 20px 30px;
            }
            
            .completion-stats {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .stat-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                border-radius: 8px;
                font-weight: 500;
            }
            
            .stat-item.success {
                background: #d4edda;
                color: #155724;
            }
            
            .stat-item.error {
                background: #f8d7da;
                color: #721c24;
            }
            
            .stat-item.performance {
                background: #d1ecf1;
                color: #0c5460;
            }
            
            .stat-item i {
                font-size: 16px;
            }
            
            .error-details {
                margin-top: 20px;
            }
            
            .error-details h4 {
                margin: 0 0 10px 0;
                color: #721c24;
                font-size: 16px;
            }
            
            .error-list {
                max-height: 150px;
                overflow-y: auto;
                border: 1px solid #f5c6cb;
                border-radius: 6px;
                padding: 10px;
                background: #f8f9fa;
            }
            
            .error-item {
                padding: 5px 0;
                font-size: 14px;
                color: #721c24;
                border-bottom: 1px solid #f5c6cb;
            }
            
            .error-item:last-child {
                border-bottom: none;
            }
            
            .completion-footer {
                padding: 20px 30px 30px;
                text-align: center;
                border-top: 1px solid #eee;
            }
            
            .completion-footer .btn {
                padding: 12px 30px;
                font-size: 16px;
                font-weight: 600;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-30px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        console.log('Completion popup modal added to DOM');
        console.log('Modal element:', modal);
        console.log('Modal parent:', modal.parentNode);
        console.log('Modal display style:', window.getComputedStyle(modal).display);
        
        // Auto-remove after 10 seconds if not manually closed
        setTimeout(() => {
            if (modal.parentNode) {
                console.log('Auto-removing completion popup after 10 seconds');
                modal.remove();
            }
        }, 10000);
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
                <p><strong>Output Location:</strong> Downloads folder (automatic)</p>
            `;
            
            executeBtn.disabled = false;
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
        const createZip = document.getElementById('createZip').checked;
        
        if (fileIndex < 0 || !this.files[fileIndex]) {
            alert('Please select a file to split');
            return;
        }
        
        if (pagesPerFile < 1) {
            alert('Pages per file must be at least 1');
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
            
            // Use the backend split functionality without ZIP creation
            const result = await ipcRenderer.invoke('split-pdf', file.path, null, pagesPerFile, false); // createZip = false
            
            if (result.success) {
                this.setSplitStatus('Complete', false);
                
                // Open the output folder automatically
                if (result.outputDir) {
                    try {
                        await ipcRenderer.invoke('open-folder', result.outputDir);
                    } catch (error) {
                        console.error('Error opening folder:', error);
                    }
                }
                
                alert(`PDF split successfully!\n\n` +
                      `Created ${result.totalFiles} files.\n` +
                      `Files saved in: ${result.outputDir}\n\n` +
                      `The output folder has been opened for you.`);
                
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
    
    // PDF Cache Management
    getCachedPdf(file) {
        const fileKey = file.path || file.name;
        return this.pdfCache.get(fileKey);
    }
    
    setCachedPdf(file, pdf) {
        const fileKey = file.path || file.name;
        
        // If cache is full, remove oldest entry
        if (this.pdfCache.size >= this.maxCacheSize) {
            const firstKey = this.pdfCache.keys().next().value;
            this.pdfCache.delete(firstKey);
        }
        
        this.pdfCache.set(fileKey, pdf);
    }
    
    clearPdfCache() {
        this.pdfCache.clear();
    }
    
    // Clean up PDF cache when files are removed
    cleanupPdfCache() {
        const currentFilePaths = new Set(this.files.map(file => file.path || file.name));
        
        for (const [fileKey, pdf] of this.pdfCache.entries()) {
            if (!currentFilePaths.has(fileKey)) {
                this.pdfCache.delete(fileKey);
            }
        }
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
