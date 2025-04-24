const express = require('express');
const path = require('path');
const app = express();

// Get port from command line argument or fall back to default
const args = process.argv.slice(2);
const PORT = args[0] || process.env.PORT || 3001;  // Default to 3001 to avoid conflict with React's 3000
const SERVER_NAME = args[1] || `Dev-Server-${PORT}`;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve files from build directory (for production-like testing)
app.use(express.static(path.join(__dirname, 'build')));

// Serve files from src directory
app.use('/src', express.static(path.join(__dirname, 'src')));

// Add CORS headers to allow development server access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Parse JSON request bodies
app.use(express.json());

// Basic route for API testing
app.get('/api/test', (req, res) => {
  res.json({ message: `Hello from ${SERVER_NAME}!` });
});

// Diagnostics endpoint to list available files
app.get('/api/list-files', (req, res) => {
  const publicDir = path.join(__dirname, 'public');
  
  try {
    const files = require('fs').readdirSync(publicDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    res.json({
      success: true,
      server: SERVER_NAME,
      publicDirectory: publicDir,
      availableJsonFiles: jsonFiles,
      apiEndpoints: jsonFiles.map(file => `/api/json/${file}`)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// API endpoint to serve JSON files
app.get('/api/json/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public', filename);
  
  console.log(`Serving API file request for: ${filename}`);
  
  // Security check to prevent directory traversal
  if (!filename.endsWith('.json') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid JSON file request' });
  }
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error serving file ${filename}:`, err);
      res.status(404).json({ error: `File ${filename} not found` });
    }
  });
});

// Legacy endpoint for crossRefs.json
app.get('/crossRefs.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crossRefs.json'));
});

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Simple API endpoint for queries (without Claude integration)
app.post('/api/ask-query', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'No query provided' });
  }

  try {
    // Just return a simple response without calling Claude API
    res.json({ 
      reply: "This is a placeholder response. Claude API integration has been removed for Vercel deployment." 
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

app.listen(PORT, () => {
  console.log(`🚀 ${SERVER_NAME} is running at http://localhost:${PORT}`);
  console.log(`Main React development server should be running on port 3000`);
  console.log(`To stop this server, press Ctrl+C`);
  console.log(`API test endpoint available at: http://localhost:${PORT}/api/test`);
});