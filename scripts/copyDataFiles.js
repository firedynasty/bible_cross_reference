// Simple script to ensure JSON data files are copied correctly
const fs = require('fs');
const path = require('path');

// Log the execution
console.log('Starting copyDataFiles.js script...');

// Create directory if doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Copy files from src to dest
function copyFiles(src, dest, fileNames) {
  ensureDirectoryExists(dest);
  
  fileNames.forEach(fileName => {
    const srcPath = path.join(src, fileName);
    const destPath = path.join(dest, fileName);
    
    try {
      // Check if source file exists
      if (fs.existsSync(srcPath)) {
        // Copy the file
        fs.copyFileSync(srcPath, destPath);
        console.log(`Successfully copied: ${srcPath} -> ${destPath}`);
      } else {
        console.error(`Source file does not exist: ${srcPath}`);
      }
    } catch (err) {
      console.error(`Error copying ${srcPath} to ${destPath}: ${err.message}`);
    }
  });
}

// Main execution
try {
  const publicDir = path.join(__dirname, '..', 'public');
  const buildDir = path.join(__dirname, '..', 'build');
  
  // Files to ensure are copied
  const jsonFiles = ['en_kjv.json', 'crossRefs.json'];
  
  // First ensure build directory exists
  ensureDirectoryExists(buildDir);
  
  // List what files exist in public directory
  console.log('Files in public directory:');
  fs.readdirSync(publicDir).forEach(file => {
    console.log(`- ${file}`);
  });
  
  // Copy files from public to build (will be done in postbuild script)
  console.log('Ready for build process. JSON files will be copied in the postbuild step.');
} catch (err) {
  console.error(`Error in copyDataFiles script: ${err.message}`);
  // Don't exit with error to allow the build to continue
}