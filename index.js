// This is a simple Express server for Vercel deployment
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

// Check for Claude API key
if (!process.env.CLAUDE_API_KEY) {
  console.error('CLAUDE_API_KEY environment variable is missing');
  console.error('Please create a .env file with your CLAUDE_API_KEY');
}

// Check for password
if (!process.env.API_PASSWORD) {
  console.error('API_PASSWORD environment variable is missing');
  console.error('Please create a .env file with your API_PASSWORD');
}

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

// Start the server
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

// Claude API endpoint with password protection
app.post('/api/ask-query', async (req, res) => {
  const { query, password } = req.body;

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
        system: "You are a helpful assistant that helps users understand Bible passages. Keep responses brief and to the point.",
        messages: [{ role: 'user', content: query }],
        max_tokens: 500
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
    } else if (error.message && error.message.includes('529') && error.message.includes('overloaded')) {
      res.status(503).json({ 
        error: 'Claude AI is currently experiencing high demand. Please try again in a few minutes.',
        details: 'The Claude API servers are temporarily overloaded.'
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
  // Check password if provided in query
  if (req.query.password !== process.env.API_PASSWORD) {
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

// Export for Vercel
module.exports = app;