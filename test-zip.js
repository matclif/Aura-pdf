// Simple ZIP test to isolate the issue
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function testZipCreation() {
  console.log('=== ZIP CREATION TEST ===');
  
  try {
    // Create a test directory
    const testDir = path.join(__dirname, 'test-temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create some test files
    const testFiles = [];
    for (let i = 1; i <= 3; i++) {
      const fileName = `test_file_${i}.txt`;
      const filePath = path.join(testDir, fileName);
      const content = `This is test file number ${i}`;
      fs.writeFileSync(filePath, content);
      testFiles.push({ path: filePath, name: fileName });
      console.log(`Created test file: ${fileName}`);
    }
    
    // Create ZIP file
    const zipPath = path.join(__dirname, 'test-output.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { 
      zlib: { level: 9 },
      forceLocalTime: true,
      forceZip64: false
    });
    
    console.log('Creating ZIP file...');
    
    await new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log('ZIP creation completed');
        resolve();
      });
      archive.on('error', reject);
      output.on('error', reject);
      
      archive.pipe(output);
      
      // Add test files
      testFiles.forEach(file => {
        console.log(`Adding to ZIP: ${file.name}`);
        archive.file(file.path, { name: file.name });
      });
      
      archive.finalize();
    });
    
    // Check ZIP file
    if (fs.existsSync(zipPath)) {
      const stats = fs.statSync(zipPath);
      console.log(`ZIP file created: ${zipPath}`);
      console.log(`ZIP file size: ${stats.size} bytes`);
      
      if (stats.size > 0) {
        console.log('✅ ZIP creation test PASSED');
      } else {
        console.log('❌ ZIP creation test FAILED - file is empty');
      }
    } else {
      console.log('❌ ZIP creation test FAILED - file not created');
    }
    
    // Clean up
    testFiles.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
    
  } catch (error) {
    console.error('❌ ZIP creation test FAILED with error:', error);
  }
}

// Run the test
testZipCreation();
