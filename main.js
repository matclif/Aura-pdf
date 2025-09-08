const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// App metadata
app.setName('Aura PDF™');
app.setAppUserModelId('com.aura.pdf');

// Performance optimizations for faster startup
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-features', 'TranslateUI');
app.commandLine.appendSwitch('--disable-ipc-flooding-protection');

// Windows-specific optimizations
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  app.commandLine.appendSwitch('--disable-software-rasterizer');
  app.commandLine.appendSwitch('--disable-gpu');
  app.commandLine.appendSwitch('--no-sandbox');
  app.commandLine.appendSwitch('--disable-setuid-sandbox');
  app.commandLine.appendSwitch('--disable-dev-shm-usage');
  app.commandLine.appendSwitch('--disable-extensions');
  app.commandLine.appendSwitch('--disable-plugins');
  app.commandLine.appendSwitch('--disable-default-apps');
  app.commandLine.appendSwitch('--disable-sync');
  app.commandLine.appendSwitch('--disable-background-networking');
  app.commandLine.appendSwitch('--disable-client-side-phishing-detection');
  app.commandLine.appendSwitch('--disable-component-update');
  app.commandLine.appendSwitch('--disable-domain-reliability');
  app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
}
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
      // Additional performance optimizations
      offscreen: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
      disableBlinkFeatures: 'Auxclick',
      allowRunningInsecureContent: false // Disable insecure content
    },
    icon: path.join(__dirname, 'assets', 'icons', 'aura-icon.png'),
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#2c3e50',
    title: 'Aura PDF™ - Smart PDF Management Tool by Matovu Wycliff',
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
  
  // Load the main HTML file with absolute path for Windows compatibility
  const htmlPath = path.join(__dirname, 'index.html');
  console.log('Loading HTML from:', htmlPath);
  
  // Check if HTML file exists
  if (!fs.existsSync(htmlPath)) {
    console.error('HTML file does not exist at:', htmlPath);
    mainWindow.loadURL('data:text/html,<h1>Loading Error</h1><p>HTML file not found at: ' + htmlPath + '</p>');
    return;
  }
  
  mainWindow.loadFile(htmlPath).catch((error) => {
    console.error('Failed to load index.html:', error);
    console.error('HTML path:', htmlPath);
    console.error('Current directory:', __dirname);
    
    // Try alternative loading methods
    try {
      // Try loading with file:// protocol
      const fileUrl = `file://${htmlPath}`;
      console.log('Trying file:// URL:', fileUrl);
      mainWindow.loadURL(fileUrl).catch((urlError) => {
        console.error('File URL loading failed:', urlError);
        // Final fallback to simple error page
        mainWindow.loadURL('data:text/html,<h1>Loading Error</h1><p>Failed to load the application.</p><p>Error: ' + error.message + '</p>');
      });
    } catch (fallbackError) {
      console.error('Fallback loading failed:', fallbackError);
      // Final fallback to simple error page
      mainWindow.loadURL('data:text/html,<h1>Loading Error</h1><p>Failed to load the application.</p><p>Error: ' + error.message + '</p>');
    }
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
    console.log('Electron app is ready');
    console.log('Platform:', process.platform);
    console.log('App path:', app.getAppPath());
    console.log('User data path:', app.getPath('userData'));
    
    try {
      // Create window immediately for faster startup
      createWindow();
      createMenu();
    } catch (error) {
      console.error('Error during app initialization:', error);
    }
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
    
    // If no output directory specified, create a dedicated folder in Downloads
    if (!outputDir) {
      const downloadsDir = path.join(require('os').homedir(), 'Downloads');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      outputDir = path.join(downloadsDir, `Aura PDF Split - ${fileName} - ${timestamp}`);
    }
    
    // Create the output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('Created output directory:', outputDir);
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
        
        // Add files to ZIP using yazl - only store filename, not full path
        let filesAdded = 0;
        results.forEach(result => {
          console.log('Adding file to ZIP:', result.path, 'as', result.fileName);
          if (fs.existsSync(result.path)) {
            const stats = fs.statSync(result.path);
            console.log('File size:', stats.size, 'bytes');
            
            // Sanitize file name for Windows compatibility
            const sanitizedName = sanitizeFileName(result.fileName);
            console.log('Sanitized file name:', sanitizedName);
            
            // CRITICAL: Only store the filename in ZIP, not the full path
            // This ensures Windows compatibility - no absolute paths in ZIP
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
          
          // Try to read the ZIP file and verify paths
          try {
            const yauzl = require('yauzl');
            yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
              if (err) {
                console.error('ZIP file test failed:', err);
              } else {
                console.log('ZIP file test passed - file is readable');
                let entryCount = 0;
                let hasAbsolutePaths = false;
                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                  entryCount++;
                  console.log(`  Entry ${entryCount}: "${entry.fileName}"`);
                  
                  // Check for absolute paths (Windows compatibility issue)
                  if (entry.fileName.includes('/') || entry.fileName.includes('\\')) {
                    console.warn(`  WARNING: Entry contains path separators: "${entry.fileName}"`);
                    hasAbsolutePaths = true;
                  }
                  
                  zipfile.readEntry();
                });
                zipfile.on('end', () => {
                  console.log(`ZIP contains ${entryCount} entries`);
                  if (hasAbsolutePaths) {
                    console.warn('WARNING: ZIP contains absolute paths - may cause Windows compatibility issues');
                  } else {
                    console.log('✅ ZIP file paths are Windows-compatible (no absolute paths)');
                  }
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
      zipPath: zipPath,
      outputDir: outputDir
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
    
    // Add files to ZIP with extra Windows compatibility - only store filename
    results.forEach(result => {
      if (fs.existsSync(result.path)) {
        const sanitizedName = sanitizeFileName(result.fileName);
        // CRITICAL: Only store the filename in ZIP, not the full path
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
  
  // Windows reserved names
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExt = path.basename(sanitized, path.extname(sanitized)).toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    sanitized = 'file_' + sanitized;
  }
  
  // Limit length for Windows compatibility (255 chars max, but keep it shorter)
  if (sanitized.length > 100) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 100 - ext.length) + ext;
  }
  
  // Ensure we have a valid filename
  if (!sanitized || sanitized.trim() === '') {
    sanitized = 'unnamed_file.pdf';
  }
  
  console.log(`Sanitized filename: "${fileName}" -> "${sanitized}"`);
  return sanitized;
}

// Alternative ZIP creation method using yazl
async function createZipAlternative(results, zipPath) {
  try {
    console.log('Trying alternative ZIP creation method with yazl...');
    
    const yazl = require('yazl');
    const zipfile = new yazl.ZipFile();
    
    // Add files to ZIP - only store filename, not full path
    results.forEach(result => {
      if (fs.existsSync(result.path)) {
        const sanitizedName = sanitizeFileName(result.fileName);
        // CRITICAL: Only store the filename in ZIP, not the full path
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

// Open folder in file explorer
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    console.error('Error opening folder:', error);
    return { success: false, error: error.message };
  }
});

// Get Downloads folder path
ipcMain.handle('get-downloads-path', async (event) => {
  try {
    const downloadsDir = path.join(require('os').homedir(), 'Downloads');
    console.log('Backend: Downloads path:', downloadsDir);
    console.log('Backend: Path normalized:', path.normalize(downloadsDir));
    return { success: true, path: path.normalize(downloadsDir) };
  } catch (error) {
    console.error('Error getting Downloads path:', error);
    return { success: false, error: error.message };
  }
});

// Create folder
ipcMain.handle('create-folder', async (event, folderPath) => {
  try {
    console.log('Backend: Creating folder:', folderPath);
    console.log('Backend: Folder exists?', fs.existsSync(folderPath));
    
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log('Backend: Created folder:', folderPath);
    } else {
      console.log('Backend: Folder already exists:', folderPath);
    }
    return { success: true, path: folderPath };
  } catch (error) {
    console.error('Backend: Error creating folder:', error);
    console.error('Backend: Folder path was:', folderPath);
    return { success: false, error: error.message };
  }
});

// Download all split files to Downloads folder (CORRECTED IMPLEMENTATION)
ipcMain.handle('download-all-split-files-v2', async (event, splitResults, originalFileName) => {
    try {
        console.log('=== BACKEND v1.0.3 - Download All Split Files (CORRECTED) ===');
        console.log('Backend: Starting download all split files');
        console.log('Backend: Number of files:', splitResults.length);
        console.log('Backend: Original file name:', originalFileName);
        
        // Get the base downloads path from the Electron app API
        const downloadsPath = app.getPath('downloads');
        console.log('Backend: Downloads path from app.getPath():', downloadsPath);
        
        // Sanitize the original file name to create a safe folder name
        const baseName = path.basename(originalFileName, path.extname(originalFileName));
        const folderName = `${baseName}_split_pages`;
        
        // CRITICAL: Correctly join the paths using path.join()
        const folderPath = path.join(downloadsPath, folderName);
        console.log(`Backend: Attempting to create directory: ${folderPath}`);

        // Use fs.mkdirSync with recursive option to create the folder and all its parent directories
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log('Backend: Created directory:', folderPath);
        } else {
            console.log('Backend: Directory already exists:', folderPath);
        }

        let totalFiles = 0;
        for (let i = 0; i < splitResults.length; i++) {
            const result = splitResults[i];
            const fileName = `page_${i + 1}.pdf`;
            const outputFilePath = path.join(folderPath, fileName);
            console.log(`Backend: Writing file ${i + 1} to: ${outputFilePath}`);
            
            // Write the file buffer to the correct path
            fs.writeFileSync(outputFilePath, Buffer.from(result.data));
            totalFiles++;
        }

        console.log('Backend: All files saved successfully');
        console.log('Backend: Total files saved:', totalFiles);

        return {
            success: true,
            folderPath: folderPath,
            totalFiles: totalFiles
        };
    } catch (error) {
        console.error('Backend Error (downloadAllSplitFiles):', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Create split folder and save all files
ipcMain.handle('create-split-folder', async (event, folderName, splitResults) => {
  try {
    const downloadsDir = path.join(require('os').homedir(), 'Downloads');
    const folderPath = path.join(downloadsDir, folderName);
    
    // Create the folder
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log('Created split folder:', folderPath);
    }
    
    // Save all split files to the folder
    const savedFiles = [];
    for (const result of splitResults) {
      const filePath = path.join(folderPath, result.name);
      fs.writeFileSync(filePath, result.data);
      savedFiles.push(filePath);
    }
    
    return {
      success: true,
      folderPath: folderPath,
      totalFiles: splitResults.length,
      savedFiles: savedFiles
    };
    
  } catch (error) {
    console.error('Error creating split folder:', error);
    return { success: false, error: error.message };
  }
});

// Create ZIP from split results (CORRECTED IMPLEMENTATION)
ipcMain.handle('create-zip-from-split-results', async (event, splitResults, zipName) => {
  try {
    console.log('=== BACKEND v1.0.3 - Create ZIP (CORRECTED) ===');
    console.log('Backend: Creating ZIP from split results');
    console.log('Backend: Number of files:', splitResults.length);
    console.log('Backend: ZIP name:', zipName);
    
    // Get the base downloads path from the Electron app API
    const downloadsPath = app.getPath('downloads');
    console.log('Backend: Downloads path from app.getPath():', downloadsPath);
    
    // CRITICAL: Correctly join the paths using path.join()
    const zipPath = path.join(downloadsPath, zipName);
    console.log('Backend: ZIP path:', zipPath);
    
    // Use yazl for Windows-compatible ZIP creation
    const yazl = require('yazl');
    const zipfile = new yazl.ZipFile();
    
    // Add files to ZIP with proper Windows compatibility
    let filesAdded = 0;
    const tempFiles = []; // Track temp files for cleanup
    
    for (let i = 0; i < splitResults.length; i++) {
      const result = splitResults[i];
      if (result.data) {
        try {
          // Extract just the filename from the full path
          const fileName = path.basename(result.name);
          console.log(`Processing file ${i + 1}: ${fileName}`);
          
          // Create a temporary file for the ZIP with a safe name
          const safeFileName = `temp_${Date.now()}_${i}_${fileName.replace(/[<>:"/\\|?*]/g, '_')}`;
          const tempFilePath = path.join(require('os').tmpdir(), safeFileName);
          
          console.log('Creating temp file:', tempFilePath);
          
          // Use async file writing to prevent blocking
          await new Promise((resolve, reject) => {
            fs.writeFile(tempFilePath, result.data, (err) => {
              if (err) {
                console.error(`Error writing temp file ${i + 1}:`, err);
                reject(err);
              } else {
                console.log(`Temp file created: ${tempFilePath}`);
                tempFiles.push(tempFilePath);
                resolve();
              }
            });
          });
          
          // Sanitize file name for Windows compatibility
          const sanitizedName = fileName.replace(/[<>:"/\\|?*]/g, '_');
          
          // Add to ZIP with only filename (no path)
          zipfile.addFile(tempFilePath, sanitizedName);
          filesAdded++;
          
          console.log(`Added to ZIP: ${sanitizedName}`);
          
        } catch (fileError) {
          console.error(`Error processing file ${i + 1}:`, fileError);
          // Continue with other files
        }
      }
    }
    
    console.log(`Added ${filesAdded} files to ZIP`);
    
    if (filesAdded === 0) {
      throw new Error('No files were added to the ZIP archive');
    }
    
    // Create the ZIP file
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
    
    // Clean up temp files
    console.log('Cleaning up temp files...');
    for (const tempFile of tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log('Cleaned up temp file:', tempFile);
        }
      } catch (cleanupError) {
        console.warn('Could not clean up temp file:', tempFile, cleanupError);
      }
    }
    
    // Verify ZIP file was created and has content
    if (fs.existsSync(zipPath)) {
      const zipStats = fs.statSync(zipPath);
      console.log('ZIP file created with size:', zipStats.size, 'bytes');
      
      if (zipStats.size === 0) {
        throw new Error('ZIP file was created but is empty');
      }
    } else {
      throw new Error('ZIP file was not created');
    }
    
    console.log('ZIP creation completed successfully');
    console.log('Final ZIP path:', zipPath);
    console.log('ZIP file exists:', fs.existsSync(zipPath));
    
    return {
      success: true,
      zipPath: zipPath,
      totalFiles: filesAdded
    };
    
  } catch (error) {
    console.error('Error creating ZIP from split results:', error);
    return { success: false, error: error.message };
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
