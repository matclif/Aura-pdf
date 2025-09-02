const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      backgroundThrottling: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#ffffff',
    title: 'PDF Renamer & Splitter'
  });

  // Prevent multiple instances
  if (mainWindow.isDestroyed()) {
    return;
  }

  // Load the app with error handling
  mainWindow.loadFile('index.html').catch((error) => {
    console.error('Failed to load index.html:', error);
    mainWindow.loadURL('data:text/html,<h1>Loading Error</h1><p>Failed to load the application.</p>');
  });

  // Show window when ready with additional checks
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle page load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  // Development tools
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // App event handlers
  app.whenReady().then(() => {
    // Add a small delay to ensure everything is ready
    setTimeout(createWindow, 100);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

// Create application menu
const createMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open PDF Files...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open-files');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Split PDF...',
          click: () => {
            mainWindow.webContents.send('menu-split-pdf');
          }
        },
        {
          label: 'Bulk Rename...',
          click: () => {
            mainWindow.webContents.send('menu-bulk-rename');
          }
        },
        { type: 'separator' },
        {
          label: 'Pattern Manager...',
          click: () => {
            mainWindow.webContents.send('menu-pattern-manager');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About PDF Renamer & Splitter',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'PDF Renamer & Splitter',
              detail: 'Version 1.0.0\\n\\nOffline PDF processing tool with smart renaming and splitting capabilities.'
            });
          }
        }
      ]
    }
  ];

  // macOS menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  createMenu();
});

// IPC handlers for PDF operations

// Open file dialog
ipcMain.handle('open-file-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ],
    ...options
  });
  return result;
});

// Open folder dialog
ipcMain.handle('open-folder-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    ...options
  });
  return result;
});

// Get PDF files from folder
ipcMain.handle('get-pdf-files-from-folder', async (event, folderPath) => {
  try {
    const files = await fs.promises.readdir(folderPath);
    const pdfFiles = files
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => path.join(folderPath, file));
    
    return pdfFiles;
  } catch (error) {
    console.error('Error reading folder:', error);
    throw error;
  }
});

// Rename file (handles cross-device operations)
ipcMain.handle('rename-file', async (event, oldPath, newPath) => {
  try {
    // Check if source and destination are on different drives
    const oldDrive = path.parse(oldPath).root;
    const newDrive = path.parse(newPath).root;
    
    if (oldDrive !== newDrive) {
      // Cross-device operation: copy then delete
      console.log('Cross-device rename detected, using copy + delete method');
      
      // Ensure destination directory exists
      const destDir = path.dirname(newPath);
      await fs.promises.mkdir(destDir, { recursive: true });
      
      // Copy file to new location
      await fs.promises.copyFile(oldPath, newPath);
      
      // Delete original file
      await fs.promises.unlink(oldPath);
      
      console.log('Cross-device rename completed successfully');
    } else {
      // Same device: use regular rename
      await fs.promises.rename(oldPath, newPath);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error renaming file:', error);
    return { success: false, error: error.message };
  }
});

// Save file dialog
ipcMain.handle('save-file-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ],
    ...options
  });
  return result;
});

// Read PDF file
ipcMain.handle('read-pdf-file', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return {
      success: true,
      buffer: Array.from(buffer),
      size: buffer.length,
      path: filePath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Write PDF file
ipcMain.handle('write-pdf-file', async (event, filePath, buffer) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Split PDF
ipcMain.handle('split-pdf', async (event, filePath, outputDir, pagesPerFile, createZip = false, startPage = null, endPage = null) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(buffer);
    const totalPages = pdfDoc.getPageCount();
    
    const results = [];
    const fileName = path.basename(filePath, '.pdf');
    
    // If no output directory specified, use downloads folder
    if (!outputDir) {
      outputDir = path.join(require('os').homedir(), 'Downloads');
    }
    
    const tempDir = createZip ? path.join(require('os').tmpdir(), `pdf-split-${Date.now()}`) : outputDir;
    
    // Create temp directory if creating zip
    if (createZip && !fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Handle page range splitting
    if (startPage !== null && endPage !== null) {
      // Validate page range
      if (startPage < 1 || endPage > totalPages || startPage > endPage) {
        throw new Error(`Invalid page range: ${startPage} to ${endPage}. Valid range is 1 to ${totalPages}`);
      }
      
      // Create separate PDF for each page in the range
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        const newPdf = await PDFDocument.create();
        
        // Copy single page (pageNum - 1 because PDF pages are 0-indexed)
        const copiedPages = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
        copiedPages.forEach(page => newPdf.addPage(page));
        
        const outputFileName = `${fileName}_page_${pageNum.toString().padStart(2, '0')}.pdf`;
        const outputPath = path.join(tempDir, outputFileName);
        
        const pdfBytes = await newPdf.save();
        fs.writeFileSync(outputPath, pdfBytes);
        
        results.push({
          fileName: outputFileName,
          path: outputPath,
          pages: 1
        });
      }
    } else {
      // Handle regular page count splitting
      for (let i = 0; i < totalPages; i += pagesPerFile) {
        const newPdf = await PDFDocument.create();
        const endPage = Math.min(i + pagesPerFile, totalPages);
        
        // Copy pages
        const pageIndices = [];
        for (let j = i; j < endPage; j++) {
          pageIndices.push(j);
        }
        
        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));
        
        // Save split file
        const splitNumber = Math.floor(i / pagesPerFile) + 1;
        const outputFileName = `${fileName}_part${splitNumber.toString().padStart(2, '0')}.pdf`;
        const outputPath = path.join(tempDir, outputFileName);
        
        const pdfBytes = await newPdf.save();
        fs.writeFileSync(outputPath, pdfBytes);
        
        results.push({
          fileName: outputFileName,
          path: outputPath,
          pages: endPage - i
        });
      }
    }
    
    // Create ZIP if requested
    let zipPath = null;
    if (createZip) {
      const archiver = require('archiver');
      const zipFileName = `${fileName}_split.zip`;
      zipPath = path.join(outputDir, zipFileName);
      
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        
        archive.pipe(output);
        
        // Add all PDF files to zip
        results.forEach(result => {
          archive.file(result.path, { name: result.fileName });
        });
        
        archive.finalize();
      });
      
      // Clean up temp files
      results.forEach(result => {
        if (fs.existsSync(result.path)) {
          fs.unlinkSync(result.path);
        }
      });
      
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    }
    
    return {
      success: true,
      results: results,
      totalFiles: results.length,
      zipPath: zipPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});



// Get file stats
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      success: true,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Directory operations
ipcMain.handle('select-directory', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

// Download file
ipcMain.handle('download-file', async (event, filePath, downloadName) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: downloadName,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      fs.copyFileSync(filePath, result.filePath);
      return { success: true, path: result.filePath };
    }
    
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create ZIP from multiple files
ipcMain.handle('create-zip', async (event, files, outputPath) => {
  try {
    const archiver = require('archiver');
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      
      files.forEach(file => {
        archive.file(file.path, { name: file.name });
      });
      
      archive.finalize();
    });
    
    return { success: true, size: fs.statSync(outputPath).size };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check if file exists
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);
    const name = path.basename(filePath);
    const basename = path.basename(filePath, path.extname(filePath));
    
    return {
      success: true,
      name: name,
      basename: basename,
      size: stats.size,
      buffer: buffer
    };
  } catch (error) {
    console.error('Error reading file:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// App info
ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    arch: process.arch
  };
});
