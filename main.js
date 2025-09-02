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
      webSecurity: true, // Enable web security
      backgroundThrottling: false,
      preload: false, // Disable preload for faster startup
      allowRunningInsecureContent: false // Disable insecure content
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#2c3e50',
    title: 'Aura PDF App',
    frame: true,
    transparent: false,
    hasShadow: true,
    center: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true
  });

  // Prevent multiple instances
  if (mainWindow.isDestroyed()) {
    return;
  }

  // Show window immediately
  mainWindow.show();
  
  // Load the main HTML file directly
  mainWindow.loadFile('index.html').catch((error) => {
    console.error('Failed to load index.html:', error);
    // Fallback to simple error page
    mainWindow.loadURL('data:text/html,<h1>Loading Error</h1><p>Failed to load the application.</p>');
  });

  // Show window when ready with additional checks
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow.isDestroyed()) {
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
    // Create window immediately for faster startup
    createWindow();
    createMenu();
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
          label: 'About Aura PDF',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Aura PDF',
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
      
      // Check if destination path is valid and accessible
      const destDir = path.dirname(newPath);
      const destDrive = path.parse(destDir).root;
      
      // Prevent operations on system root directories
      if (destDir === destDrive || destDir === destDrive.slice(0, -1)) {
        throw new Error(`Cannot create files in root directory: ${destDir}. Please choose a subdirectory.`);
      }
      
      // Check if we have write permissions to the destination
      try {
        // Ensure destination directory exists
        await fs.promises.mkdir(destDir, { recursive: true });
      } catch (mkdirError) {
        if (mkdirError.code === 'EPERM' || mkdirError.code === 'EACCES') {
          throw new Error(`Permission denied: Cannot create directory ${destDir}. Please run as administrator or choose a different location.`);
        }
        throw mkdirError;
      }
      
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
      console.log('Created temp directory:', tempDir);
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
        
        // Verify file was created
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`Created file: ${outputFileName}, size: ${stats.size} bytes`);
        } else {
          console.error(`Failed to create file: ${outputPath}`);
        }
        
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
        
        // Verify file was created
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`Created file: ${outputFileName}, size: ${stats.size} bytes`);
        } else {
          console.error(`Failed to create file: ${outputPath}`);
        }
        
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
      try {
        console.log('=== STARTING ZIP CREATION ===');
        console.log('Results array:', results);
        console.log('Results length:', results.length);
        
        // yazl is already tested and working
        
        // Verify all files exist before creating ZIP
        results.forEach((result, index) => {
          console.log(`File ${index}: ${result.path}`);
          if (fs.existsSync(result.path)) {
            const stats = fs.statSync(result.path);
            console.log(`  - Exists: YES, Size: ${stats.size} bytes`);
          } else {
            console.log(`  - Exists: NO`);
          }
        });
        
        const archiver = require('archiver');
        const zipFileName = `${fileName}_split.zip`;
        zipPath = path.join(outputDir, zipFileName);
        
        console.log('Creating ZIP file:', zipPath);
        console.log('Number of files to add:', results.length);
        console.log('Output directory:', outputDir);
        console.log('Temp directory:', tempDir);
        
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Use yazl for Windows compatibility instead of archiver
        console.log('Using yazl for Windows-compatible ZIP creation...');
        const yazl = require('yazl');
        const zipfile = new yazl.ZipFile();
        
        // Add files to ZIP using yazl
        let filesAdded = 0;
        results.forEach(result => {
          console.log('Adding file to ZIP:', result.path, 'as', result.fileName);
          if (fs.existsSync(result.path)) {
            const stats = fs.statSync(result.path);
            console.log('File size:', stats.size, 'bytes');
            
            // Sanitize file name for Windows compatibility
            const sanitizedName = sanitizeFileName(result.fileName);
            console.log('Sanitized file name:', sanitizedName);
            
            zipfile.addFile(result.path, sanitizedName);
            filesAdded++;
          } else {
            console.error('File does not exist:', result.path);
          }
        });
        
        console.log(`Added ${filesAdded} files to archive`);
        
        if (filesAdded === 0) {
          throw new Error('No files were added to the archive');
        }
        
        // Create the ZIP file using yazl
        await new Promise((resolve, reject) => {
          zipfile.outputStream.pipe(fs.createWriteStream(zipPath))
            .on('close', () => {
              console.log('ZIP file created successfully:', zipPath);
              resolve();
            })
            .on('error', (err) => {
              console.error('ZIP creation error:', err);
              reject(err);
            });
          
          zipfile.end();
        });
        
        // Verify ZIP file was created and has content
        if (fs.existsSync(zipPath)) {
          const zipStats = fs.statSync(zipPath);
          console.log('ZIP file created with size:', zipStats.size, 'bytes');
          
          if (zipStats.size === 0) {
            console.error('ZIP file is empty, trying alternative method...');
            // Try alternative ZIP creation method
            await createZipAlternative(results, zipPath);
          } else {
            // Test ZIP file integrity
            console.log('Testing ZIP file integrity...');
            try {
              await testZipIntegrity(zipPath);
              console.log('ZIP file integrity test passed');
            } catch (integrityError) {
              console.error('ZIP file integrity test failed:', integrityError);
              console.log('Trying Windows-compatible ZIP creation...');
              await createWindowsCompatibleZip(results, zipPath);
            }
          }
        } else {
          throw new Error('ZIP file was not created');
        }
        
        // DON'T clean up temp files yet - let's test the ZIP first
        console.log('ZIP creation completed. Temp files preserved for testing.');
        console.log('Temp directory contents:');
        if (fs.existsSync(tempDir)) {
          const tempFiles = fs.readdirSync(tempDir);
          tempFiles.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            console.log(`  - ${file}: ${stats.size} bytes`);
          });
        }
        
        // Test the ZIP file before cleaning up
        console.log('Testing ZIP file before cleanup...');
        if (fs.existsSync(zipPath)) {
          const zipStats = fs.statSync(zipPath);
          console.log(`Final ZIP size: ${zipStats.size} bytes`);
          
          // Try to read the ZIP file
          try {
            const yauzl = require('yauzl');
            yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
              if (err) {
                console.error('ZIP file test failed:', err);
              } else {
                console.log('ZIP file test passed - file is readable');
                let entryCount = 0;
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                  entryCount++;
                  console.log(`  Entry ${entryCount}: ${entry.fileName}`);
                  zipfile.readEntry();
                });
                zipfile.on('end', () => {
                  console.log(`ZIP contains ${entryCount} entries`);
                });
              }
            });
          } catch (testError) {
            console.error('ZIP test error:', testError);
          }
        }
        
        // Clean up temp files after ZIP is created and tested
        setTimeout(() => {
          console.log('Cleaning up temp files...');
          results.forEach(result => {
            if (fs.existsSync(result.path)) {
              fs.unlinkSync(result.path);
            }
          });
          
          if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
          }
          console.log('Temp files cleaned up.');
        }, 5000); // Wait 5 seconds before cleanup
      } catch (zipError) {
        console.error('Error creating ZIP file:', zipError);
        // Clean up temp files even if ZIP creation fails
        results.forEach(result => {
          if (fs.existsSync(result.path)) {
            fs.unlinkSync(result.path);
          }
        });
        
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
        throw zipError;
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

// Test ZIP file integrity
async function testZipIntegrity(zipPath) {
  return new Promise((resolve, reject) => {
    const yauzl = require('yauzl');
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(new Error(`ZIP file cannot be opened: ${err.message}`));
        return;
      }
      
      let entryCount = 0;
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        entryCount++;
        zipfile.readEntry();
      });
      
      zipfile.on('end', () => {
        if (entryCount === 0) {
          reject(new Error('ZIP file contains no entries'));
        } else {
          console.log(`ZIP file contains ${entryCount} entries`);
          resolve();
        }
      });
      
      zipfile.on('error', (err) => {
        reject(new Error(`ZIP file error: ${err.message}`));
      });
    });
  });
}

// Create Windows-compatible ZIP using yazl
async function createWindowsCompatibleZip(results, zipPath) {
  try {
    console.log('Creating Windows-compatible ZIP with yazl...');
    
    const yazl = require('yazl');
    const zipfile = new yazl.ZipFile();
    
    // Add files to ZIP with extra Windows compatibility
    results.forEach(result => {
      if (fs.existsSync(result.path)) {
        const sanitizedName = sanitizeFileName(result.fileName);
        // Use addFile with explicit options for Windows compatibility
        zipfile.addFile(result.path, sanitizedName, {
          mtime: new Date(),
          mode: 0o644
        });
        console.log(`Added to Windows ZIP: ${sanitizedName}`);
      }
    });
    
    // Create the ZIP file
    await new Promise((resolve, reject) => {
      zipfile.outputStream.pipe(fs.createWriteStream(zipPath))
        .on('close', () => {
          console.log('Windows-compatible ZIP created successfully');
          resolve();
        })
        .on('error', reject);
      
      zipfile.end();
    });
    
  } catch (error) {
    console.error('Windows-compatible ZIP creation failed:', error);
    throw error;
  }
}

// Sanitize file name for Windows compatibility
function sanitizeFileName(fileName) {
  // Remove or replace characters that are problematic on Windows
  let sanitized = fileName
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^\w\-_\.]/g, '_') // Keep only word chars, hyphens, underscores, and dots
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // Ensure it doesn't start with a dot (hidden files)
  if (sanitized.startsWith('.')) {
    sanitized = 'file_' + sanitized;
  }
  
  // Limit length for Windows compatibility
  if (sanitized.length > 100) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 100 - ext.length) + ext;
  }
  
  return sanitized || 'unnamed_file.pdf';
}

// Alternative ZIP creation method using yazl
async function createZipAlternative(results, zipPath) {
  try {
    console.log('Trying alternative ZIP creation method with yazl...');
    
    const yazl = require('yazl');
    const zipfile = new yazl.ZipFile();
    
    // Add files to ZIP
    results.forEach(result => {
      if (fs.existsSync(result.path)) {
        const sanitizedName = sanitizeFileName(result.fileName);
        zipfile.addFile(result.path, sanitizedName);
        console.log(`Added to alternative ZIP: ${sanitizedName}`);
      }
    });
    
    // Create the ZIP file
    await new Promise((resolve, reject) => {
      zipfile.outputStream.pipe(fs.createWriteStream(zipPath))
        .on('close', () => {
          console.log('Alternative ZIP creation successful');
          resolve();
        })
        .on('error', reject);
      
      zipfile.end();
    });
    
  } catch (error) {
    console.error('Alternative ZIP creation failed:', error);
    throw error;
  }
}

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
