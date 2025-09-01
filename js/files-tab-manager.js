// Files Tab Manager - Handles file loading and basic operations
class FilesTabManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        // Open files button
        const openFilesBtn = document.getElementById('openFilesBtn');
        if (openFilesBtn) {
            openFilesBtn.addEventListener('click', () => this.openFiles());
        }

        // Select folder button
        const selectFolderBtn = document.getElementById('selectFolderBtn');
        if (selectFolderBtn) {
            selectFolderBtn.addEventListener('click', () => this.selectFolder());
        }

        // Clear all button
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllFiles());
        }

        // Bulk rename button
        const bulkRenameBtn = document.getElementById('bulkRenameBtn');
        if (bulkRenameBtn) {
            bulkRenameBtn.addEventListener('click', () => this.openBulkRename());
        }
    }

    async openFiles() {
        try {
            const result = await ipcRenderer.invoke('open-file-dialog', {
                title: 'Select PDF Files',
                properties: ['openFile', 'multiSelections']
            });

            if (!result.canceled && result.filePaths.length > 0) {
                for (const filePath of result.filePaths) {
                    await this.addFile(filePath);
                }
                this.updateFileList();
                this.updateUI();
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

            window.tabFileManager.addFile('files', file);
        } catch (error) {
            console.error('Error adding file:', error);
        }
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        if (!fileList) return;

        const files = window.tabFileManager.getFiles('files');
        
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
            <div class="file-item ${file.selected ? 'selected' : ''}" onclick="filesTabManager.selectFile(${index})">
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
                    <button class="btn-icon btn-danger" onclick="filesTabManager.removeFile(${index})" title="Remove File">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateUI() {
        const hasFiles = window.tabFileManager.hasFiles('files');
        
        // Update button states
        const bulkRenameBtn = document.getElementById('bulkRenameBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');
        
        if (bulkRenameBtn) bulkRenameBtn.disabled = !hasFiles;
        if (clearAllBtn) clearAllBtn.disabled = !hasFiles;
    }

    selectFile(index) {
        const files = window.tabFileManager.getFiles('files');
        if (index < 0 || index >= files.length) return;

        // Deselect previous file
        files.forEach(file => file.selected = false);
        
        // Select new file
        files[index].selected = true;
        window.tabFileManager.setSelectedFile('files', files[index]);
        
        this.updateFileList();
    }

    removeFile(index) {
        window.tabFileManager.removeFile('files', index);
        this.updateFileList();
        this.updateUI();
    }

    clearAllFiles() {
        if (confirm('Are you sure you want to clear all files?')) {
            window.tabFileManager.clearFiles('files');
            this.updateFileList();
            this.updateUI();
        }
    }

    openBulkRename() {
        // Switch to bulk tab and pass files
        if (window.app) {
            window.app.switchTab('bulk');
        }
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

// Initialize files tab manager
let filesTabManager;
document.addEventListener('DOMContentLoaded', () => {
    filesTabManager = new FilesTabManager();
    window.filesTabManager = filesTabManager;
});
