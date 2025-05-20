# Bible App - Offline Mode for Windows Surface

This folder contains files to run the Bible Cross Reference app in a fully offline mode, optimized for battery saving on Windows Surface devices.

## Features

- Runs completely offline with no server/network access
- Loads Bible data directly from local files
- Prevents any network listening to save battery
- Blocks external API calls

## Setup Instructions

1. **Build the React app first**
   ```
   npm run build
   ```

2. **Copy all JSON files to the build folder**
   ```
   npm run copy-json
   ```

3. **Open the offline app**
   - Simply open `index.html` in this folder using your browser
   - For best battery life, use Microsoft Edge with all extensions disabled

## Windows Surface Optimizations

- No server process running in the background
- No network ports being listened on
- All data loaded from local files
- Reduced memory usage

## Troubleshooting

If you encounter issues:

1. Make sure you've built the app with `npm run build`
2. Check that JSON files are in the build directory
3. Try a different browser if needed

## Available Bible Translations

- King James Version (KJV)
- Bible in Basic English (BBE)

All functionality works the same as the regular app, just without network dependencies.