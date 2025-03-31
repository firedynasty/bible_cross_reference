const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build output...');

// Path to build directory
const buildDir = path.join(__dirname, '..', 'build');

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory does not exist!');
  process.exit(1);
}

// List all files in the build directory
console.log('Files in build directory:');
function listFiles(dir, prefix = '') {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  items.forEach(item => {
    if (item.isDirectory()) {
      console.log(`${prefix}📁 ${item.name}/`);
      listFiles(path.join(dir, item.name), `${prefix}  `);
    } else {
      console.log(`${prefix}📄 ${item.name}`);
    }
  });
}

listFiles(buildDir);

// Check for critical JSON files
const requiredFiles = ['en_kjv.json', 'crossRefs.json'];
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(buildDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const fileSizeInKB = stats.size / 1024;
    console.log(`✅ Found ${file} (${fileSizeInKB.toFixed(2)} KB)`);
    
    // Verify file is valid JSON
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      JSON.parse(content);
      console.log(`✅ ${file} contains valid JSON`);
    } catch (err) {
      console.error(`❌ ${file} contains INVALID JSON: ${err.message}`);
      allFilesExist = false;
    }
  } else {
    console.error(`❌ Required file ${file} is MISSING from build directory!`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('❌ Build verification failed: Missing required files!');
  process.exit(1);
}

console.log('✅ Build verification complete - all required files present!');