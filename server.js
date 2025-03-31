const express = require('express');
const path = require('path');
const app = express();

// Get port from command line argument or fall back to default
const args = process.argv.slice(2);
const PORT = args[0] || process.env.PORT || 3001;  // Default to 3001 to avoid conflict with React's 3000
const SERVER_NAME = args[1] || `Dev-Server-${PORT}`;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve files from src directory
app.use('/src', express.static(path.join(__dirname, 'src')));

// Add CORS headers to allow development server access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Basic route for API testing
app.get('/api/test', (req, res) => {
  res.json({ message: `Hello from ${SERVER_NAME}!` });
});

// Serve the crossRefs.json file (assume it's in the public directory)
app.get('/crossRefs.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crossRefs.json'));
});

app.listen(PORT, () => {
  console.log(`🚀 ${SERVER_NAME} is running at http://localhost:${PORT}`);
  console.log(`Main React development server should be running on port 3000`);
  console.log(`To stop this server, press Ctrl+C`);
});