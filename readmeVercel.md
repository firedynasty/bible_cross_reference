# Vercel Deployment Guide for Bible Cross Reference App

This document outlines how to implement Vercel deployment for a Bible Cross Reference application. The implementation includes configuration files, server code, and build scripts necessary for successful deployment on Vercel.

## 1. Configuration Files

### 1.1 vercel.json

This is the primary configuration file that Vercel uses to understand how to build and serve your application:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    },
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "^/static/(.*)",
      "headers": { "cache-control": "public, max-age=31536000, immutable" },
      "dest": "/static/$1"
    },
    {
      "src": "/api/(.*)",
      "dest": "/index.js"
    },
    {
      "src": "/(.*\\.(json))",
      "headers": { "content-type": "application/json" },
      "dest": "/$1"
    },
    {
      "src": "/(.*\\.(js|css|svg|png|jpg|jpeg|gif|ico|html))",
      "dest": "/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

This configuration does the following:
- Specifies two build steps:
  1. A static build from package.json (React app)
  2. A Node.js server from index.js
- Defines routing rules:
  - Routes for static assets with caching
  - API routes directed to index.js
  - JSON files served with proper content-type
  - Static assets with direct paths
  - All other requests sent to index.html (for SPA routing)

## 2. Server Implementation

### 2.1 index.js

This file serves as the Node.js server for Vercel, particularly for API endpoints:

```javascript
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

// Parse JSON request bodies
app.use(express.json());

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

// Serve static files from the build directory with explicit content types
app.use(express.static(path.join(__dirname, 'build'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Fall back to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

// Simple API endpoint for queries (placeholder without external API integration)
app.post('/api/ask-query', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'No query provided' });
  }

  try {
    // Just return a simple response without calling external API
    res.json({ 
      reply: "This is a placeholder response. External API integration has been removed for Vercel deployment." 
    });
  } catch (error) {
    console.error('API error:', error.message);
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
    });
  }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  try {
    res.json({ 
      status: 'ok', 
      message: 'API server is running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API test error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: `Error in test endpoint: ${error.message}`
    });
  }
});

// Export for Vercel
module.exports = app;
```

### 2.2 api/data.js

This file provides a serverless API route for Vercel:

```javascript
// Simple API route for data loading in Vercel environment
const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Get the file parameter from the query
  const { file } = req.query;
  
  // Only allow specific files for security
  const allowedFiles = ['en_kjv.json', 'en_bbe.json', 'zh_cuv.json', 'es_rvr.json', 'fr_apee.json', 'ko_ko.json', 'he_heb_no_strong.json', 'he_heb_strong.json', 'crossRefs.json'];
  
  if (!file || !allowedFiles.includes(file)) {
    return res.status(400).json({ 
      error: 'Invalid file parameter. Must be one of: ' + allowedFiles.join(', ')
    });
  }
  
  // Determine file path - try both public and root directories
  let filePath = path.join(process.cwd(), 'public', file);
  
  // Check if file exists in public directory
  if (!fs.existsSync(filePath)) {
    // Try root directory as fallback
    filePath = path.join(process.cwd(), file);
    
    // If still not found, return error
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: `File ${file} not found in public or root directory`
      });
    }
  }
  
  try {
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Set content type header
    res.setHeader('Content-Type', 'application/json');
    
    // Return the file content
    return res.status(200).send(fileContent);
  } catch (error) {
    console.error(`Error reading file ${file}:`, error);
    return res.status(500).json({ 
      error: `Error reading file: ${error.message}` 
    });
  }
}
```

## 3. Package.json Configuration

Add these scripts to your package.json:

```json
"scripts": {
  "vercel-build": "CI=false npm run build",
  "vercel-start": "node index.js",
  "build": "react-scripts build && npm run copy-json",
  "copy-json": "node -e \"const fs=require('fs');const path=require('path');const publicDir=path.join(process.cwd(),'public');const buildDir=path.join(process.cwd(),'build');fs.readdirSync(publicDir).filter(f=>f.endsWith('.json')).forEach(file=>{fs.copyFileSync(path.join(publicDir,file),path.join(buildDir,file));console.log('Copied '+file);});\"",
  "verify-build": "node scripts/verify-build.js"
}
```

Make sure these dependencies are included:

```json
"dependencies": {
  "compression": "^1.7.4",
  "express": "^4.18.2"
}
```

## 4. Build Verification Script

Create a `scripts/verify-build.js` file:

```javascript
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
```

## 5. Deployment Steps

1. **Setup Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```

4. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

## 6. Environment Variables

You may need to set these environment variables in your Vercel project settings:

- `NODE_ENV`: Set to `production` for production deployments
- `PORT`: Automatically set by Vercel

## 7. Troubleshooting

### Common Issues:

1. **Missing JSON files**: 
   - Ensure the copy-json script is running correctly
   - Verify JSON files exist in both public/ and build/ directories

2. **API endpoints returning 404**:
   - Check that the routing in vercel.json is correctly configured
   - Ensure the API handler files are in the correct location

3. **Content-Type issues with JSON files**:
   - Verify routes in vercel.json are setting proper headers
   - Check that server middleware is setting Content-Type correctly

### Debugging Tips:

1. Use the `/api/list-files` endpoint to inspect file availability
2. Check Vercel deployment logs for build and runtime errors
3. Run `vercel dev` locally to test the deployment before pushing

## 8. Trigger Deployments

You can trigger new deployments by:

1. Pushing to your connected repository
2. Creating a file like `vercel-trigger.md` with a timestamp and commit it
3. Using the Vercel dashboard manually

---

Created: 2025-05-15  
Last Updated: 2025-05-15