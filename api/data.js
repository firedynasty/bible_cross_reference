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
  const allowedFiles = ['en_kjv.json', 'en_bbe.json', 'zh_cuv.json', 'es_rvr.json', 'fr_apee.json', 'ko_ko.json', 'he_heb.json', 'crossRefs.json'];
  
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