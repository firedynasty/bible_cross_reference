const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();
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

// Claude API endpoint with password protection
app.post('/api/ask-query', async (req, res) => {
  const { query, password } = req.body;

  // Check for Claude API key
  if (!process.env.CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY is not configured on the server' });
  }

  // Check password
  if (!password || password !== process.env.API_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password. Authentication required.' });
  }

  if (!query) {
    return res.status(400).json({ error: 'No query provided' });
  }

  try {
    console.log('\n========== CLAUDE REQUEST ==========');
    console.log('Query sent to Claude:');
    console.log(query); // Log the full query
    console.log('Timestamp:', new Date().toISOString());
    console.log('Connecting to Claude API at: https://api.anthropic.com/v1/messages');
    console.log('====================================\n');
    
    const startTime = Date.now();
    
    // Call the Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        system: "You are a helpful assistant that helps users understand Bible passages.",
        messages: [{ role: 'user', content: query }],
        max_tokens: 1000
      }),
      timeout: 60000
    });

    const endTime = Date.now();
    console.log(`Claude response time: ${endTime - startTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API responded with error status:', response.status);
      console.error('Error response body:', errorText);
      throw new Error(`Claude API responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log('\n========== CLAUDE RESPONSE RECEIVED ==========');
    console.log('Response received at:', new Date().toISOString());
    console.log('Total processing time:', Date.now() - startTime, 'ms');
    console.log('==============================================\n');
    
    // Check if the response has the expected structure
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Unexpected response structure from Claude:', JSON.stringify(data));
      return res.status(500).json({ 
        error: 'Received an unexpected response format from Claude',
        details: JSON.stringify(data)
      });
    }
    
    res.json({ reply: data.content[0].text });
  } catch (error) {
    console.error('\n========== CLAUDE ERROR ==========');
    console.error('Error type:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('==================================\n');
    
    // Provide different error messages based on error types
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Unable to connect to Claude API. Please check your internet connection.',
        details: error.message
      });
    } else if (error.type === 'request-timeout' || error.name === 'AbortError') {
      res.status(504).json({ 
        error: 'The request to Claude API timed out. The service might be experiencing high load.',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: `Failed to get response from Claude: ${error.message}`,
        details: error.stack
      });
    }
  }
});

// Add a test endpoint to verify Claude API connectivity
app.get('/api/test-claude', async (req, res) => {
  // Check for Claude API key
  if (!process.env.CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY is not configured on the server' });
  }

  // Check password if provided in query
  if (process.env.API_PASSWORD && req.query.password !== process.env.API_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password. Authentication required.' });
  }

  try {
    console.log('Testing Claude API connectivity...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        system: "You are a helpful assistant.",
        messages: [{ role: 'user', content: 'Hello, are you working?' }],
        max_tokens: 100
      }),
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Claude API test failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Log full test response too
    console.log('\n========== CLAUDE TEST RESPONSE ==========');
    console.log(data.content[0].text);
    console.log('=========================================\n');
    
    res.json({ 
      status: 'ok', 
      message: 'Successfully connected to Claude API',
      claudeResponse: data.content[0].text
    });
  } catch (error) {
    console.error('Claude API test error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: `Failed to connect to Claude API: ${error.message}`
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ${SERVER_NAME} is running at http://localhost:${PORT}`);
  console.log(`Main React development server should be running on port 3000`);
  console.log(`To stop this server, press Ctrl+C`);
  console.log(`Claude API test endpoint available at: http://localhost:${PORT}/api/test-claude?password=yourpassword`);
});