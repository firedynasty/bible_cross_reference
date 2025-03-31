// This is a simple Express server for Vercel deployment
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Use compression for better performance
try {
  const compression = require('compression');
  app.use(compression());
  console.log('Using compression middleware');
} catch (err) {
  console.log('Compression middleware not available');
}

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Log requests for debugging
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Serve JSON files with correct content type
app.get('/en_kjv.json', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'en_kjv.json');
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(filePath);
  } else {
    res.status(404).send({ error: 'File not found' });
  }
});

app.get('/crossRefs.json', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'crossRefs.json');
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(filePath);
  } else {
    res.status(404).send({ error: 'File not found' });
  }
});

// API route to serve all JSON files
app.get('/api/json/:filename', (req, res) => {
  const filename = req.params.filename;
  const allowedFiles = ['en_kjv.json', 'crossRefs.json'];
  
  if (!allowedFiles.includes(filename)) {
    return res.status(400).json({ error: 'Invalid file requested' });
  }
  
  const filePath = path.join(__dirname, 'public', filename);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// List available files for debugging
app.get('/api/list-files', (req, res) => {
  try {
    const publicFiles = fs.readdirSync(path.join(__dirname, 'public'));
    const rootFiles = fs.readdirSync(__dirname);
    const buildFiles = fs.existsSync(path.join(__dirname, 'build')) 
      ? fs.readdirSync(path.join(__dirname, 'build'))
      : [];
    
    // Get file sizes for JSON files in public
    const jsonFileStats = {};
    publicFiles.filter(f => f.endsWith('.json')).forEach(file => {
      try {
        const stats = fs.statSync(path.join(__dirname, 'public', file));
        jsonFileStats[file] = {
          size: stats.size,
          sizeKB: Math.round(stats.size / 1024),
          sizeHuman: (stats.size / 1024).toFixed(2) + ' KB',
          modified: stats.mtime
        };
        
        // Test if valid JSON
        try {
          const content = fs.readFileSync(path.join(__dirname, 'public', file), 'utf8');
          JSON.parse(content);
          jsonFileStats[file].validJson = true;
        } catch (e) {
          jsonFileStats[file].validJson = false;
          jsonFileStats[file].parseError = e.message;
        }
      } catch (e) {
        jsonFileStats[file] = { error: e.message };
      }
    });
    
    res.json({
      publicDirectory: publicFiles,
      rootDirectory: rootFiles,
      buildDirectory: buildFiles,
      jsonFiles: jsonFileStats,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        hostname: require('os').hostname()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Force content type for specific extensions
app.use((req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (ext === '.json') {
    res.type('application/json');
  }
  next();
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Fall back to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

// Export for Vercel
module.exports = app;