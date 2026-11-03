// EXCERPT from src/BibleApp.js lines 5272-5376 (as of 2026-11-02, pre-removal)
  // Load cross references from external JSON file
  const loadCrossReferences = async (baseUrl, useApiEndpoint = false) => {
    try {
      // If we already know the API endpoint worked for Bible data, use it directly
      if (useApiEndpoint) {
        console.log("Using API endpoint for cross references");
        // For local development, we need to use a different port for the API server
        const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : baseUrl;
        const apiUrl = `${apiBaseUrl}/api/json/crossRefs.json`;
        console.log("Attempting to load cross references from API:", apiUrl);
        
        const apiResponse = await fetch(apiUrl);
        console.log("API cross references response status:", apiResponse.status);
        
        if (!apiResponse.ok) {
          throw new Error(`API HTTP error! Status: ${apiResponse.status}`);
        }
        
        const crossRefs = await apiResponse.json();
        setCrossReferences(crossRefs);
        console.log("Cross references loaded successfully via API");
        return crossRefs;
      }
      
      // Try direct file access first
      const url = `${baseUrl}/crossRefs.json`;
      console.log("Attempting to load cross references from", url);
      
      try {
        const response = await fetch(url);
        console.log("Cross references response status:", response.status);
        
        // Check if we got HTML instead of JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.warn("Received HTML instead of JSON for cross references, will try API endpoint");
          throw new Error("Received HTML instead of JSON");
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Get response as text first to validate
        const responseText = await response.text();
        console.log("Response received, first 50 characters:", responseText.substring(0, 50));
        
        // Check if the response starts with HTML tags
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          throw new Error("Received HTML instead of JSON");
        }
        
        // Parse the JSON
        const crossRefs = JSON.parse(responseText);
        setCrossReferences(crossRefs);
        console.log("Cross references loaded successfully via direct file");
        return crossRefs;
      } catch (directError) {
        console.warn("Error loading cross references from direct file:", directError.message);
        
        // Try the API endpoint as fallback
        console.log("Trying API endpoint for cross references as fallback...");
        // For local development, we need to use a different port for the API server
        const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : baseUrl;
        const apiUrl = `${apiBaseUrl}/api/json/crossRefs.json`;
        console.log("Attempting to load cross references from API fallback:", apiUrl);
        
        const apiResponse = await fetch(apiUrl);
        console.log("API cross references response status:", apiResponse.status);
        
        if (!apiResponse.ok) {
          throw new Error(`API HTTP error! Status: ${apiResponse.status}`);
        }
        
        const crossRefs = await apiResponse.json();
        setCrossReferences(crossRefs);
        console.log("Cross references loaded successfully via API fallback");
        return crossRefs;
      }
    } catch (err) {
      console.error("Failed to load cross references:", err);
      
      // Provide more specific error message based on the type of error
      let errorMessage = "Cross-references could not be loaded. Some features may be limited.";
      
      if (err.message.includes("HTML instead of JSON")) {
        errorMessage = "The cross-reference file was not found. Check that crossRefs.json is in the public folder.";
      } else if (err instanceof SyntaxError) {
        errorMessage = "The cross-reference file contains invalid JSON. Please check the file format.";
      }
      
      setError(errorMessage);
      
      // Attempt to continue with the Bible app despite the error
      // Wait 5 seconds and then clear the error so the user can still use the app
      setTimeout(() => {
        setError(null);
        // Now set empty cross references to allow the app to function
        setCrossReferences({});
      }, 5000);
      
      return {};
    }
  };

