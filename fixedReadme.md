# Bible Cross Reference App - Deployment Fix

## Overview of Changes

This document details the changes made to fix deployment issues on Vercel for the Bible Cross Reference application.

## Problem

The application was experiencing issues when deployed to Vercel:
- JSON data files (`en_kjv.json` and `crossRefs.json`) were not being served correctly
- Files were being returned with incorrect MIME types (HTML instead of JSON)
- API requests were failing due to routing issues

## Solution Implementation

### 1. Custom Express Server

Created a dedicated Express server (`index.js`) to handle requests:
- Specific routes for JSON data files with proper Content-Type headers
- API endpoints for diagnostics and troubleshooting
- CORS support for cross-origin requests
- Fallback routes to handle SPA navigation

```javascript
// Direct routes for JSON files
app.get('/en_kjv.json', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'en_kjv.json');
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(filePath);
});

// API endpoint for any JSON file
app.get('/api/json/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public', filename);
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(filePath);
});
```

### 2. Enhanced Build Process

Modified the build scripts to ensure JSON files are properly included:
- Created cross-platform file copy script using Node.js
- Removed verification steps that were causing build failures
- Simplified build commands for Vercel

```json
"copy-json": "node -e \"const fs=require('fs');const path=require('path');const publicDir=path.join(process.cwd(),'public');const buildDir=path.join(process.cwd(),'build');fs.readdirSync(publicDir).filter(f=>f.endsWith('.json')).forEach(file=>{fs.copyFileSync(path.join(publicDir,file),path.join(buildDir,file));console.log('Copied '+file);});\""
```

### 3. Vercel Configuration

Updated `vercel.json` to correctly route requests:
- Simplified configuration to use only the Express server
- Added specific routes for JSON files
- Configured all traffic to route through the Express server

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/en_kjv.json",
      "dest": "/index.js"
    },
    {
      "src": "/crossRefs.json",
      "dest": "/index.js"
    },
    {
      "src": "/api/(.*)",
      "dest": "/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.js"
    }
  ]
}
```

### 4. Client-Side Fallbacks

Enhanced data loading to handle potential failures:
- Added multiple fallback mechanisms (direct files, API endpoints)
- Improved error handling and diagnostics
- Added content type checking to detect incorrect responses

```javascript
// Try direct file access first
try {
  const response = await fetch(`${baseUrl}/en_kjv.json`);
  // ...processing...
} catch (directError) {
  // Try the API endpoint as fallback
  console.log("Trying API endpoint as fallback...");
  const apiResponse = await fetch(`${baseUrl}/api/json/en_kjv.json`);
  // ...processing...
}
```

### 5. Diagnostic Tools

Added tools to help diagnose deployment issues:
- File system inspection endpoint (`/api/list-files`)
- JSON validation checks
- Enhanced error display with debugging information

## Deployment Instructions

1. Push all changes to GitHub
2. Deploy to Vercel with the following settings:
   - Framework Preset: Other
   - Build Command: `npm run vercel-build`
   - Output Directory: N/A (not used with Express server)
   - Install Command: `npm install`

## Troubleshooting

If issues persist, check these endpoints:
- `/api/list-files` - Shows all files in the deployment
- `/api/json/en_kjv.json` - Direct API access to Bible data
- `/api/json/crossRefs.json` - Direct API access to cross-references