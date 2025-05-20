// Script to copy required data files to this folder
const fs = require('fs');
const path = require('path');

// Source and destination paths
const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const publicDir = path.join(rootDir, 'public');
const destDir = __dirname;

// List of files to copy
const filesToCopy = [
  { source: path.join(buildDir, 'static'), dest: path.join(destDir, 'static'), isDir: true },
  { source: path.join(publicDir, 'en_kjv.json'), dest: path.join(destDir, 'en_kjv.json') },
  { source: path.join(publicDir, 'en_bbe.json'), dest: path.join(destDir, 'en_bbe.json') },
  { source: path.join(publicDir, 'crossRefs.json'), dest: path.join(destDir, 'crossRefs.json') },
  { source: path.join(publicDir, 'favicon.ico'), dest: path.join(destDir, 'favicon.ico') }
];

// Function to copy a directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('Error: Build directory not found!');
  console.error('Please run "npm run build" before running this script.');
  process.exit(1);
}

// Copy all files
console.log('Copying files for offline use...');

for (const file of filesToCopy) {
  try {
    if (file.isDir) {
      copyDirSync(file.source, file.dest);
      console.log(`Copied directory: ${path.relative(rootDir, file.source)} -> ${path.relative(rootDir, file.dest)}`);
    } else {
      if (!fs.existsSync(file.source)) {
        console.warn(`Warning: Source file not found: ${file.source}`);
        continue;
      }
      fs.copyFileSync(file.source, file.dest);
      console.log(`Copied file: ${path.relative(rootDir, file.source)} -> ${path.relative(rootDir, file.dest)}`);
    }
  } catch (err) {
    console.error(`Error copying ${file.source}:`, err.message);
  }
}

console.log('Done! You can now run the offline Bible app.');