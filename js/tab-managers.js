// Tab Managers - Separate file handling for each tab
class TabFileManager {
    constructor() {
        this.files = new Map(); // Map of tabName -> files array
        this.selectedFiles = new Map(); // Map of tabName -> selected file
    }

    // Get files for a specific tab
    getFiles(tabName) {
        if (!this.files.has(tabName)) {
            this.files.set(tabName, []);
        }
        return this.files.get(tabName);
    }

    // Add file to a specific tab
    addFile(tabName, file) {
        const tabFiles = this.getFiles(tabName);
        tabFiles.push(file);
        this.files.set(tabName, tabFiles);
        return tabFiles.length;
    }

    // Remove file from a specific tab
    removeFile(tabName, index) {
        const tabFiles = this.getFiles(tabName);
        if (index >= 0 && index < tabFiles.length) {
            tabFiles.splice(index, 1);
            this.files.set(tabName, tabFiles);
        }
        return tabFiles.length;
    }

    // Clear all files for a specific tab
    clearFiles(tabName) {
        this.files.set(tabName, []);
        this.selectedFiles.set(tabName, null);
    }

    // Get selected file for a specific tab
    getSelectedFile(tabName) {
        return this.selectedFiles.get(tabName) || null;
    }

    // Set selected file for a specific tab
    setSelectedFile(tabName, file) {
        this.selectedFiles.set(tabName, file);
    }

    // Get file count for a specific tab
    getFileCount(tabName) {
        return this.getFiles(tabName).length;
    }

    // Check if tab has files
    hasFiles(tabName) {
        return this.getFileCount(tabName) > 0;
    }
}

// Initialize tab file manager
window.tabFileManager = new TabFileManager();
