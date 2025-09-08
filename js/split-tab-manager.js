// Split Tab Manager - Simple PDF splitting functionality
class SplitTabManager {
    constructor() {
        this.uploadedFile = null;
        this.pdfLib = null;
        this.splitResults = [];
        this.init();
    }

    init() {
        this.waitForPDFLib();
        this.bindEvents();
        this.updateUI();
    }

    async waitForPDFLib() {
        let attempts = 0;
        while (!window.PDFLib && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.PDFLib) {
            this.pdfLib = window.PDFLib;
            console.log('PDF-lib loaded successfully');
        } else {
            console.error('PDF-lib failed to load');
        }
    }

    bindEvents() {
        // File loading button
        const loadPdfBtn = document.getElementById('splitLoadPdfBtn');
        if (loadPdfBtn) {
            loadPdfBtn.addEventListener('click', () => this.loadPdf());
        }

        // Clear files button
        const clearFilesBtn = document.getElementById('splitClearFilesBtn');
        if (clearFilesBtn) {
            clearFilesBtn.addEventListener('click', () => this.clearFiles());
        }

        // Split all pages button
        const splitAllBtn = document.getElementById('splitAllBtn');
        if (splitAllBtn) {
            splitAllBtn.addEventListener('click', () => this.splitAllPages());
        }

        // Split by range button
        const splitRangeBtn = document.getElementById('splitRangeBtn');
        if (splitRangeBtn) {
            splitRangeBtn.addEventListener('click', () => this.splitByRange());
        }

        // Page range inputs
        const startPageInput = document.getElementById('startPage');
        const endPageInput = document.getElementById('endPage');
        
        if (startPageInput && endPageInput) {
            startPageInput.addEventListener('input', () => this.validatePageRange());
            endPageInput.addEventListener('input', () => this.validatePageRange());
        }

        // Download buttons
        const downloadIndividualBtn = document.getElementById('downloadIndividualBtn');
        if (downloadIndividualBtn) {
            downloadIndividualBtn.addEventListener('click', () => this.downloadIndividual());
        }

        // ZIP button removed

        const downloadAllBtn = document.getElementById('downloadAllBtn');
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', () => this.downloadAllToDownloads());
        }
    }

    async loadPdf() {
        try {
            if (window.electronAPI) {
                // Desktop app
                const result = await window.electronAPI.showOpenDialog({
                    title: 'Select PDF File',
                    properties: ['openFile'],
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    await this.loadFileFromPath(filePath);
                }
            } else {
                // Web app
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.onchange = async (e) => {
                    if (e.target.files.length > 0) {
                        await this.loadFileFromWeb(e.target.files[0]);
                    }
                };
                input.click();
            }
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.setStatus('Error loading PDF: ' + error.message);
        }
    }

    async loadFileFromPath(filePath) {
        try {
            const fileResult = await window.electronAPI.readFile(filePath);
            if (!fileResult.success) {
                throw new Error(fileResult.error);
            }

            // Convert buffer to Uint8Array for PDF-lib
            const buffer = new Uint8Array(fileResult.buffer);

            this.uploadedFile = {
                path: filePath,
                name: this.getFileName(filePath),
                buffer: buffer,
                pages: 0
            };

            // Get page count
            if (this.pdfLib) {
                const pdf = await this.pdfLib.PDFDocument.load(buffer);
                this.uploadedFile.pages = pdf.getPageCount();
                
                // Set default end page to total pages
                const endPageInput = document.getElementById('endPage');
                if (endPageInput) {
                    endPageInput.value = this.uploadedFile.pages;
                }
            }

            this.updateUI();
            this.setStatus(`PDF loaded: ${this.uploadedFile.name} (${this.uploadedFile.pages} pages)`);
        } catch (error) {
            console.error('Error loading file:', error);
            this.setStatus('Error loading file: ' + error.message);
        }
    }

    async loadFileFromWeb(file) {
        try {
            const buffer = await file.arrayBuffer();
            this.uploadedFile = {
                path: file.name,
                name: file.name,
                buffer: buffer,
                pages: 0
            };

            // Get page count
            if (this.pdfLib) {
                const pdf = await this.pdfLib.PDFDocument.load(buffer);
                this.uploadedFile.pages = pdf.getPageCount();
                
                // Set default end page to total pages
                const endPageInput = document.getElementById('endPage');
                if (endPageInput) {
                    endPageInput.value = this.uploadedFile.pages;
                }
            }

            this.updateUI();
            this.setStatus(`PDF loaded: ${this.uploadedFile.name} (${this.uploadedFile.pages} pages)`);
        } catch (error) {
            console.error('Error loading file:', error);
            this.setStatus('Error loading file: ' + error.message);
        }
    }

    clearFiles() {
        this.uploadedFile = null;
        this.splitResults = [];
        this.updateUI();
        this.setStatus('Files cleared');
    }

    validatePageRange() {
        const startPageInput = document.getElementById('startPage');
        const endPageInput = document.getElementById('endPage');
        
        if (!startPageInput || !endPageInput || !this.uploadedFile) return;
        
        const startPage = parseInt(startPageInput.value) || 1;
        const endPage = parseInt(endPageInput.value) || 1;
        const maxPages = this.uploadedFile.pages;
        
        // Validate start page
        if (startPage < 1) {
            startPageInput.value = 1;
        } else if (startPage > maxPages) {
            startPageInput.value = maxPages;
        }
        
        // Validate end page
        if (endPage < 1) {
            endPageInput.value = 1;
        } else if (endPage > maxPages) {
            endPageInput.value = maxPages;
        }
        
        // Ensure start page is not greater than end page
        if (startPage > endPage) {
            endPageInput.value = startPage;
        }
    }

    async splitAllPages() {
        if (!this.uploadedFile) {
            this.setStatus('Please load a PDF file first');
            return;
        }

        if (!this.pdfLib) {
            this.setStatus('PDF library not loaded');
            return;
        }

        try {
            this.setStatus('Splitting PDF into individual pages...');
            
            const pdf = await this.pdfLib.PDFDocument.load(this.uploadedFile.buffer);
            const pageCount = pdf.getPageCount();
            this.splitResults = [];

            for (let i = 0; i < pageCount; i++) {
                const newPdf = await this.pdfLib.PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdf, [i]);
                newPdf.addPage(copiedPage);
                
                const pdfBytes = await newPdf.save();
                this.splitResults.push({
                    name: `${this.uploadedFile.name.replace('.pdf', '')}_page_${i + 1}.pdf`,
                    data: pdfBytes,
                    page: i + 1
                });
            }

            this.updateUI();
            this.setStatus(`Successfully split PDF into ${this.splitResults.length} pages. Click "Download Individual Files" to save them.`);
        } catch (error) {
            console.error('Error splitting PDF:', error);
            this.setStatus('Error splitting PDF: ' + error.message);
        }
    }

    async splitByRange() {
        if (!this.uploadedFile) {
            this.setStatus('Please load a PDF file first');
            return;
        }

        if (!this.pdfLib) {
            this.setStatus('PDF library not loaded');
            return;
        }

        const startPageInput = document.getElementById('startPage');
        const endPageInput = document.getElementById('endPage');
        
        if (!startPageInput || !endPageInput) {
            this.setStatus('Page range inputs not found');
            return;
        }
        
        const startPage = parseInt(startPageInput.value);
        const endPage = parseInt(endPageInput.value);
        
        if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < 1) {
            this.setStatus('Please enter valid page numbers');
            return;
        }
        
        if (startPage > endPage) {
            this.setStatus('Start page cannot be greater than end page');
            return;
        }
        
        if (startPage > this.uploadedFile.pages || endPage > this.uploadedFile.pages) {
            this.setStatus(`Page range must be between 1 and ${this.uploadedFile.pages}`);
            return;
        }

        try {
            this.setStatus(`Splitting PDF from page ${startPage} to ${endPage}...`);
            
            const pdf = await this.pdfLib.PDFDocument.load(this.uploadedFile.buffer);
            this.splitResults = [];

            // Split each page in the range into individual files
            for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                const newPdf = await this.pdfLib.PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdf, [pageNum - 1]);
                newPdf.addPage(copiedPage);
                
                const pdfBytes = await newPdf.save();
                
                // Create filename for this specific page
                const baseName = this.uploadedFile.name.replace('.pdf', '');
                const fileName = `${baseName}_page_${pageNum}.pdf`;
                
                this.splitResults.push({
                    name: fileName,
                    data: pdfBytes,
                    range: `${startPage}-${endPage}`,
                    page: pageNum
                });
            }

            this.updateUI();
            this.setStatus(`Successfully split PDF from page ${startPage} to ${endPage} (${this.splitResults.length} pages). Click "Download Individual Files" to save them.`);
        } catch (error) {
            console.error('Error splitting PDF:', error);
            this.setStatus('Error splitting PDF: ' + error.message);
        }
    }

    async downloadIndividual() {
        if (this.splitResults.length === 0) {
            this.setStatus('No split results to download');
            return;
        }

        this.setStatus('Downloading individual files...');
        
        for (const result of this.splitResults) {
            try {
                if (window.electronAPI) {
                    // Desktop app
                    const saveResult = await window.electronAPI.showSaveDialog({
                        defaultPath: result.name,
                        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                    });
                    
                    if (!saveResult.canceled && saveResult.filePath) {
                        const writeResult = await window.electronAPI.writeFile(saveResult.filePath, result.data);
                        if (writeResult.success) {
                            console.log(`File saved successfully: ${saveResult.filePath}`);
                        } else {
                            console.error(`Failed to save file: ${writeResult.error}`);
                        }
                    }
                } else {
                    // Web app
                    const blob = new Blob([result.data], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = result.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                console.error(`Error downloading ${result.name}:`, error);
            }
        }
        
        this.setStatus('Individual files downloaded');
    }

    // ZIP download method removed

    async downloadAllToDownloads() {
        if (this.splitResults.length === 0) {
            this.setStatus('No split results to download');
            return;
        }

        this.setStatus('Downloading all files to Downloads folder...');

        try {
            if (!window.electronAPI) {
                this.setStatus('Desktop app required for auto-download');
                return;
            }

            // Force use of the backend method
            console.log('=== AURA PDF v1.0.2 - Download All Files ===');
            console.log('FORCING use of backend downloadAllSplitFiles method...');
            console.log('Available methods:', Object.keys(window.electronAPI));
            console.log('Split results count:', this.splitResults.length);
            console.log('File name:', this.uploadedFile.name);
            
            const result = await window.electronAPI.downloadAllSplitFilesV2(this.splitResults, this.uploadedFile.name);
            
            if (result.success) {
                this.setStatus('All files downloaded to Downloads folder');
                alert(`All files downloaded successfully!\n\n` +
                      `Files saved to: ${result.folderPath}\n` +
                      `Total files: ${result.totalFiles}`);

                // Open the folder
                await window.electronAPI.openFolder(result.folderPath);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Error downloading all files:', error);
            this.setStatus('Error downloading files: ' + error.message);
            alert(`Error downloading files: ${error.message}\n\nPlease try again or use "Download as ZIP" instead.`);
        }
    }

    updateUI() {
        const hasFile = !!this.uploadedFile;
        const hasResults = this.splitResults.length > 0;

        // Update button states
        const clearFilesBtn = document.getElementById('splitClearFilesBtn');
        const splitAllBtn = document.getElementById('splitAllBtn');
        const splitRangeBtn = document.getElementById('splitRangeBtn');
        const downloadIndividualBtn = document.getElementById('downloadIndividualBtn');
        const downloadAllBtn = document.getElementById('downloadAllBtn');

        if (clearFilesBtn) clearFilesBtn.disabled = !hasFile;
        if (splitAllBtn) splitAllBtn.disabled = !hasFile;
        if (splitRangeBtn) splitRangeBtn.disabled = !hasFile;
        if (downloadIndividualBtn) downloadIndividualBtn.disabled = !hasResults;
        if (downloadAllBtn) downloadAllBtn.disabled = !hasResults;

        // Update file info
        this.updateFileList();
        
        // Update page range inputs
        this.updatePageRangeInputs();
        
        // Update results display
        this.updateResultsDisplay();
    }

    updateFileList() {
        const fileList = document.getElementById('splitFileList');
        if (!fileList) return;

        if (this.uploadedFile) {
            fileList.innerHTML = `
                <div class="file-item">
                    <div class="file-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${this.uploadedFile.name}</div>
                        <div class="file-details">
                            <span class="file-pages">${this.uploadedFile.pages} pages</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            fileList.innerHTML = `
                <div class="empty-files">
                    <p>No PDF file loaded for splitting</p>
                    <p>Click "Load PDF File" to get started</p>
                </div>
            `;
        }
    }

    updatePageRangeInputs() {
        const startPageInput = document.getElementById('startPage');
        const endPageInput = document.getElementById('endPage');
        
        if (startPageInput && endPageInput && this.uploadedFile) {
            // Set max values
            startPageInput.max = this.uploadedFile.pages;
            endPageInput.max = this.uploadedFile.pages;
            
            // Set default values if not already set
            if (!startPageInput.value) startPageInput.value = 1;
            if (!endPageInput.value) endPageInput.value = this.uploadedFile.pages;
        }
    }

    updateResultsDisplay() {
        const resultsList = document.getElementById('resultsList');
        if (!resultsList) return;

        if (this.splitResults.length === 0) {
            resultsList.innerHTML = '<p>No split results yet</p>';
            return;
        }

        let html = '<div class="results-list">';
        this.splitResults.forEach((result, index) => {
            html += `
                <div class="result-item" style="padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
                    <div style="font-weight: bold;">${result.name}</div>
                    <div style="font-size: 0.9em; color: #666;">
                        ${result.page ? `Page ${result.page}` : result.range}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        resultsList.innerHTML = html;
    }

    setStatus(message) {
        console.log('Split Tab Status:', message);
        // You can implement a status display here if needed
    }

    getFileName(path) {
        return path.split('/').pop() || path.split('\\').pop();
    }
}

// Initialize split tab manager
let splitTabModule;
document.addEventListener('DOMContentLoaded', () => {
    splitTabModule = new SplitTabManager();
    window.splitTabModule = splitTabModule;
});

