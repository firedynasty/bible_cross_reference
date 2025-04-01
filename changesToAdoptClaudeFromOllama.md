# Comprehensive Guide: Migrating from Ollama to Claude API

This document provides a detailed guide to switching from using Ollama locally to using Anthropic's Claude API in a Node.js/React application, including specific code changes required for each file.

## Prerequisites

1. An Anthropic API key (sign up at [https://www.anthropic.com](https://www.anthropic.com))
2. Create a `.env` file in the project root with your API key:
   ```
   CLAUDE_API_KEY=your_api_key_here
   ```

## Dependencies

Install required dependencies:

```bash
npm install dotenv
```

Add to your package.json:
```json
"dependencies": {
  "dotenv": "^16.0.3",
  // ... other dependencies
}
```

## Server-Side Changes

### 1. Import Changes

**Before (Ollama)**:
```javascript
// server.js
const express = require('express');
const path = require('path');
const fetch = require('node-fetch'); // Use node-fetch instead of ollama
```

**After (Claude)**:
```javascript
// server.js
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();
```

### 2. API Key Validation

**Add** the following after initializing your Express app:

```javascript
// Check for Claude API key
if (!process.env.CLAUDE_API_KEY) {
  console.error('CLAUDE_API_KEY environment variable is missing');
  console.error('Please create a .env file with your CLAUDE_API_KEY');
}
```

### 3. Logging Middleware Updates

**Before (Ollama)**:
```javascript
// For Ollama responses, log the full response
if (req.url === '/api/ask-query' && data.reply) {
  console.log('\n========== OLLAMA FULL RESPONSE ==========');
  console.log(`Length of response: ${data.reply.length} characters`);
  console.log('Response content:');
  console.log(data.reply); // Log the full response
  console.log('==========================================\n');
}
```

**After (Claude)**:
```javascript
// For Claude responses, log the full response
if (req.url === '/api/ask-query' && data.reply) {
  console.log('\n========== CLAUDE FULL RESPONSE ==========');
  console.log(`Length of response: ${data.reply.length} characters`);
  console.log('Response content:');
  console.log(data.reply); // Log the full response
  console.log('==========================================\n');
}
```

### 4. Main API Endpoint

**Before (Ollama)**:
```javascript
// Handle Ollama requests with improved logging
app.post('/api/ask-query', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'No query provided' });
  }

  try {
    console.log('\n========== OLLAMA REQUEST ==========');
    console.log('Query sent to Ollama:');
    console.log(query); // Log the full query
    console.log('Timestamp:', new Date().toISOString());
    console.log('Connecting to Ollama at: http://127.0.0.1:11434/api/chat');
    console.log('====================================\n');
    
    const startTime = Date.now();
    
    // Use fetch to directly call the Ollama API
    // Using 127.0.0.1 explicitly instead of localhost
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [{ role: 'user', content: query }],
        stream: false
      }),
      // Add a timeout to fail faster if connection issues persist
      timeout: 60000
    });

    const endTime = Date.now();
    console.log(`Ollama response time: ${endTime - startTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama API responded with error status:', response.status);
      console.error('Error response body:', errorText);
      throw new Error(`Ollama API responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log('\n========== OLLAMA RESPONSE RECEIVED ==========');
    console.log('Response received at:', new Date().toISOString());
    console.log('Total processing time:', Date.now() - startTime, 'ms');
    console.log('==============================================\n');
    
    // Check if the response has the expected structure
    if (!data.message || !data.message.content) {
      console.error('Unexpected response structure from Ollama:', JSON.stringify(data));
      return res.status(500).json({ 
        error: 'Received an unexpected response format from Ollama',
        details: JSON.stringify(data)
      });
    }
    
    res.json({ reply: data.message.content });
  } catch (error) {
    console.error('\n========== OLLAMA ERROR ==========');
    console.error('Error type:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('==================================\n');
    
    // Provide different error messages based on error types
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Unable to connect to Ollama. Is the Ollama server running at port 11434?',
        details: error.message
      });
    } else if (error.type === 'request-timeout' || error.name === 'AbortError') {
      res.status(504).json({ 
        error: 'The request to Ollama timed out. Ollama might be overloaded or not responding.',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: `Failed to get response from Ollama: ${error.message}`,
        details: error.stack
      });
    }
  }
});
```

**After (Claude)**:
```javascript
// Handle Claude API requests with improved logging
app.post('/api/ask-query', async (req, res) => {
  const { query } = req.body;

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
```

### 5. Test Endpoint

**Before (Ollama)**:
```javascript
// Add a test endpoint to verify Ollama connectivity directly
app.get('/api/test-ollama', async (req, res) => {
  try {
    console.log('Testing Ollama connectivity...');
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [{ role: 'user', content: 'Hello, are you working?' }],
        stream: false
      }),
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Ollama test failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Log full test response too
    console.log('\n========== OLLAMA TEST RESPONSE ==========');
    console.log(data.message.content);
    console.log('=========================================\n');
    
    res.json({ 
      status: 'ok', 
      message: 'Successfully connected to Ollama',
      ollamaResponse: data.message.content
    });
  } catch (error) {
    console.error('Ollama test error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: `Failed to connect to Ollama: ${error.message}`
    });
  }
});
```

**After (Claude)**:
```javascript
// Add a test endpoint to verify Claude API connectivity
app.get('/api/test-claude', async (req, res) => {
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
```

### 6. Server Startup Messages

**Before (Ollama)**:
```javascript
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`Ollama test endpoint available at: http://localhost:${PORT}/api/test-ollama`);
});
```

**After (Claude)**:
```javascript
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`Claude API test endpoint available at: http://localhost:${PORT}/api/test-claude`);
});
```

## Client-Side Changes

### 1. Error Handling in React Component

**Before (Ollama)**:
```javascript
catch (error) {
  console.error("Error querying Ollama:", error);
  setOutputText(`Error: ${error.message || "Failed to get response from Ollama. Please try again later."}`);
}
```

**After (Claude)**:
```javascript
catch (error) {
  console.error("Error querying Claude API:", error);
  setOutputText(`Error: ${error.message || "Failed to get response from Claude API. Please try again later."}`);
}
```

### 2. Fix React Hook Warning (if applicable)

If you encounter a React Hook dependency warning, update the dependency array:

**Before**:
```javascript
useEffect(() => {
  // effect code here
}, [selectedTranslation, currentBookAbbrev]); // Missing selectedChapter
```

**After**:
```javascript
useEffect(() => {
  // effect code here
}, [selectedTranslation, currentBookAbbrev, selectedChapter]); // Include all dependencies
```

## Deployment Considerations for Vercel

When deploying to Vercel instead of running locally, you'll need to make a few adjustments:

### 1. Environment Variables

Add your `CLAUDE_API_KEY` as an environment variable in your Vercel project settings:
1. Go to your project on the Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add `CLAUDE_API_KEY` with your actual API key
4. Redeploy your application to apply the changes

### 2. API Routes for Vercel

For a Next.js project deployed to Vercel, replace the Express server with API routes:

Create a file at `pages/api/ask-query.js`:

```javascript
// pages/api/ask-query.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'No query provided' });
  }

  try {
    console.log('Query sent to Claude:', query);
    
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      return res.status(500).json({ 
        error: 'Received an unexpected response format from Claude'
      });
    }
    
    res.status(200).json({ reply: data.content[0].text });
  } catch (error) {
    console.error('Error communicating with Claude API:', error);
    
    res.status(500).json({ 
      error: `Failed to get response from Claude: ${error.message}`
    });
  }
}
```

Create a test endpoint at `pages/api/test-claude.js`:

```javascript
// pages/api/test-claude.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
    });

    if (!response.ok) {
      throw new Error(`Claude API test failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    res.status(200).json({ 
      status: 'ok', 
      message: 'Successfully connected to Claude API',
      claudeResponse: data.content[0].text
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: `Failed to connect to Claude API: ${error.message}`
    });
  }
}
```

### 3. Update Frontend API Calls

If your frontend was previously calling `/api/ask-query` on a different port (e.g., http://localhost:3001), update it to use relative URLs for Vercel deployment:

**Before**:
```javascript
const response = await fetch('http://localhost:3001/api/ask-query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: fullPrompt }),
});
```

**After**:
```javascript
const response = await fetch('/api/ask-query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: fullPrompt }),
});
```

## Claude API Model Options

You can choose different Claude models based on your needs:

```javascript
// Strongest performance, highest cost
model: 'claude-3-7-opus-20240307'

// Best balance of capability and cost
model: 'claude-3-7-sonnet-20250219'

// Fastest response, lowest cost
model: 'claude-3-haiku-20240307'
```

## Claude API Parameters

You can customize the model behavior with these parameters:

```javascript
body: JSON.stringify({
  model: 'claude-3-7-sonnet-20250219',
  system: "You are a helpful assistant that helps users understand Bible passages.",
  messages: [{ role: 'user', content: query }],
  
  // Additional parameters
  max_tokens: 1000,           // Maximum length of response (1-4096)
  temperature: 0.7,           // Controls randomness (0-1)
  top_p: 0.9,                 // Controls diversity (0-1)
  top_k: 40,                  // Limits token selection
  stream: false               // For streaming responses
})
```

## Handling Chat History

To implement chat history with Claude:

```javascript
// Example messages array with conversation history
messages: [
  { role: 'user', content: 'What does Genesis 1:1 mean?' },
  { role: 'assistant', content: 'Genesis 1:1 states "In the beginning God created the heavens and the earth." This verse establishes...' },
  { role: 'user', content: 'How does this relate to scientific understandings of the universe?' }
]
```

## Error Handling Best Practices

1. Handle rate limits:
```javascript
if (response.status === 429) {
  return res.status(429).json({
    error: 'Rate limit exceeded. Please try again later.',
    retryAfter: response.headers.get('retry-after') || 60
  });
}
```

2. Handle API key issues:
```javascript
if (response.status === 401) {
  console.error('Authentication failed: Invalid API key');
  return res.status(401).json({
    error: 'Authentication failed. Please check your API key.'
  });
}
```

## Testing Your Migration

1. Test the health endpoint:
```
GET http://localhost:3001/api/health
```

2. Test the Claude API connection:
```
GET http://localhost:3001/api/test-claude
```

3. Test a query with Bible context:
```
POST http://localhost:3001/api/ask-query
Content-Type: application/json

{
  "query": "What does John 3:16 mean in context?"
}
```

## Comparison: Ollama vs Claude API

| Feature | Ollama | Claude API |
|---------|--------|------------|
| Setup | Local installation | API key only |
| Compute | Local resources | Cloud-based |
| Models | Various open models | Claude models only |
| Cost | Free (hardware costs) | Pay per token |
| Privacy | Data stays local | Data sent to Anthropic |
| Performance | Limited by local hardware | High-performance |
| Reliability | Dependent on local setup | Enterprise-grade |
| Scalability | Limited by hardware | Highly scalable |
| Internet | Not required | Required |
| Rate Limits | None | Yes (varies by plan) |