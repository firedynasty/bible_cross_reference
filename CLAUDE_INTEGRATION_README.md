# Claude API Integration for Bible Cross Reference App

This document explains how the Claude API has been integrated into the Bible Cross Reference app, replacing the previous Ollama integration, and how to configure it for deployment.

## Changes Made

1. Added Claude API integration on the server-side
2. Added password protection for API requests
3. Updated the UI to include a password field
4. Added required dependencies (dotenv, node-fetch)

## Required Environment Variables

Two environment variables are required for the application to work:

1. `CLAUDE_API_KEY`: Your Anthropic Claude API key
2. `API_PASSWORD`: A password you define to protect the API endpoint

## Local Setup

1. Install the required dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with your API key and password:
   ```
   CLAUDE_API_KEY=your_claude_api_key_here
   API_PASSWORD=your_secure_password_here
   PORT=3001
   ```

3. Start the server:
   ```bash
   npm run server
   ```

4. In a separate terminal, start the React development server:
   ```bash
   npm start
   ```

5. Access the application at http://localhost:3000

## Vercel Deployment Configuration

When deploying to Vercel, you need to set up environment variables:

1. Go to your project on the Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:
   - `CLAUDE_API_KEY`: Your Anthropic Claude API key
   - `API_PASSWORD`: Your chosen password for API access

## Security Considerations

1. The API password is sent in the request body and should be kept secure
2. Use HTTPS for all production deployments
3. The Claude API key should never be exposed to the client
4. The password is not stored persistently in the browser

## Testing the Integration

1. Check that the server is running with Claude support:
   ```
   http://localhost:3001/api/test-claude?password=your_password_here
   ```

2. Use the application UI with the password field to make queries to Claude

## How It Works

1. When a user submits a question in the UI, the application:
   - Collects the current Bible passage context
   - Adds the user's question
   - Sends the request to the server along with the password

2. The server:
   - Verifies the password
   - Forwards the request to Claude API
   - Returns the response to the client

3. The response is displayed in the UI

## Troubleshooting

If you encounter issues:

1. Check the server logs for errors
2. Verify that your `.env` file contains the correct variables
3. Ensure your Claude API key is valid and has sufficient quota
4. Confirm that the password entered in the UI matches the one in the `.env` file