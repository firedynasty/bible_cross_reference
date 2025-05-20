// Offline-optimized version of BibleApp.js for Windows Surface
// This script modifies loading behavior to use only local files 
// and avoid any networking activity to save battery

// Patch fetch to use local files
window.originalFetch = window.fetch;
window.fetch = function(url, options) {
  // Force local paths for Bible data and cross references
  if (typeof url === 'string') {
    // Convert URLs to local paths
    if (url.includes('/en_kjv.json')) {
      return window.originalFetch('./en_kjv.json', options);
    }
    if (url.includes('/en_bbe.json')) {
      return window.originalFetch('./en_bbe.json', options);
    }
    if (url.includes('/crossRefs.json')) {
      return window.originalFetch('./crossRefs.json', options);
    }
    
    // Block external network requests (Firebase, etc.)
    if (url.includes('firebase') || url.includes('http:') || url.includes('https:')) {
      console.log('Blocked external request to:', url);
      // Return mock data for Firebase to prevent errors
      if (url.includes('firebase')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({})
        });
      }
      return Promise.reject(new Error('Network access disabled in offline mode'));
    }
  }
  
  // Default handling
  return window.originalFetch(url, options);
};

// Override Firebase initialization to prevent network calls
window.addEventListener('load', function() {
  // Mock Firebase for offline use
  if (window.firebase) {
    console.log('Disabling Firebase network communication');
    
    // Create mock Firebase functions
    const mockFirebaseDb = {
      ref: function() { return { 
        set: () => Promise.resolve(),
        get: () => Promise.resolve({ exists: () => false, val: () => ({}) }),
        onValue: (callback) => callback({ exists: () => false, val: () => ({}) })
      }; },
      // Add other needed methods here
    };
    
    // Replace real implementations with mocks
    window.firebase.initializeApp = function() {
      return { database: () => mockFirebaseDb };
    };
    
    window.firebase.database = function() {
      return mockFirebaseDb;
    };
  }
  
  console.log('Bible app running in offline battery-saving mode');
});