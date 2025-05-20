// Offline Bible App Wrapper
// This file modifies the behavior of the Bible app to function offline

(function() {
  // Configuration
  const config = {
    disableNetworkRequests: true,
    forceLocalFileLoading: true,
    disableServerListening: true,
    localDataPaths: {
      bibleData: '../build/en_kjv.json',
      crossRefs: '../build/crossRefs.json',
      bbeTranslation: '../build/en_bbe.json'
    }
  };

  // Intercept fetch to redirect to local files
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    console.log('Fetch intercepted:', url);
    
    // Convert URLs to local file paths
    if (typeof url === 'string') {
      // Handle Bible data files
      if (url.includes('en_kjv.json')) {
        console.log('Redirecting KJV request to local file');
        return originalFetch(config.localDataPaths.bibleData, options);
      }
      
      // Handle cross-references
      if (url.includes('crossRefs.json')) {
        console.log('Redirecting crossRefs request to local file');
        return originalFetch(config.localDataPaths.crossRefs, options);
      }
      
      // Handle BBE translation
      if (url.includes('en_bbe.json')) {
        console.log('Redirecting BBE request to local file');
        return originalFetch(config.localDataPaths.bbeTranslation, options);
      }
      
      // Block external requests
      if (config.disableNetworkRequests && (url.startsWith('http:') || url.startsWith('https:'))) {
        console.warn('Network request blocked:', url);
        return Promise.reject(new Error('Network requests disabled in offline mode'));
      }
    }
    
    // Allow all other requests
    return originalFetch(url, options);
  };

  // Make the app think it's running on localhost
  if (config.forceLocalFileLoading) {
    Object.defineProperty(window.location, 'hostname', {
      get: function() { return 'localhost'; }
    });
  }
  
  // Disable server listening
  if (config.disableServerListening && window.require && window.require('express')) {
    const originalListen = window.require('express').application.listen;
    window.require('express').application.listen = function() {
      console.log('Server listening disabled in offline mode');
      return this;
    };
  }

  // Initialize when the page loads
  window.addEventListener('load', function() {
    console.log('Bible app running in offline mode - network optimized for battery saving');
  });
})();