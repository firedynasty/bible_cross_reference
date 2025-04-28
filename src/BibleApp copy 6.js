import React, { useState, useEffect, useRef } from 'react';
import { Book, Link, ChevronRight, History, BookOpen } from 'lucide-react';

// Helper function to handle base URL for different environments
const getBaseUrl = () => {
  // Explicitly log the hostname for debugging
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  console.log('Current hostname for path detection:', hostname);
  console.log('Current pathname for path detection:', pathname);
  
  // For GitHub Pages, use the repository name as base URL
  const isGitHubPages = 
    hostname.includes('github.io') || 
    hostname.includes('firedynasty.github.io');
  
  // If running on GitHub Pages or the path already includes the repo name
  if (isGitHubPages || pathname.includes('/bible_cross_reference')) {
    console.log('Detected GitHub Pages environment, using /bible_cross_reference base');
    return '/bible_cross_reference';
  }
  
  // For Vercel deployment
  if (hostname.includes('vercel.app')) {
    console.log('Detected Vercel deployment environment, using empty base');
    return '';
  }
  
  console.log('Using default empty base path');
  return '';
};

// Navigation Placeholder Component
const NavigationPlaceholder = ({ book, chapter, getBookName, onNavigate }) => {
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Update navigation history only when manually selecting a book or chapter
  // We'll track this separately from cross-reference navigation
  useEffect(() => {
    if (book) {
      // Check if this location is already the last item in history
      const lastItem = navigationHistory[navigationHistory.length - 1];
      if (!lastItem || lastItem.book !== book.abbrev || lastItem.chapter !== chapter) {
        // Add to history, keeping only the last 10 items
        setNavigationHistory(prev => {
          const newHistory = [...prev, { book: book.abbrev, chapter, timestamp: Date.now() }];
          return newHistory.slice(-10); // Keep only last 10 entries
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, chapter]); // Intentionally omitting navigationHistory to prevent infinite loops
  
  if (!book) return null;
  
  return (
    <div className="relative">
      {/* Current Location Display */}
      <div className="flex items-center bg-gray-100 px-2 py-1 rounded-md text-gray-700 text-sm">
        <span>Primary:</span>
        <span className="font-medium mx-1">{book.book || getBookName(book.abbrev)}</span>
        <ChevronRight className="h-3 w-3 mx-1" />
        <span className="font-medium">Ch {chapter}</span>
        
        {/* History Button */}
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="ml-1 p-0.5 rounded-full hover:bg-gray-200 focus:outline-none"
          title="Navigation history"
        >
          <History className="h-3 w-3" />
        </button>
      </div>
      
      {/* Navigation History Dropdown */}
      {showHistory && navigationHistory.length > 0 && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-medium text-lg">Reading History</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {[...navigationHistory].reverse().map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  onNavigate(item.book, item.chapter);
                  setShowHistory(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between text-base"
              >
                <span>
                  {getBookName(item.book)} {item.chapter}
                </span>
                <span className="text-sm text-gray-500">
                  {getRelativeTime(item.timestamp)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to display relative time
const getRelativeTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

// Main component
const BibleApp = () => {
  const [bibleData, setBibleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [crossReferences, setCrossReferences] = useState({});
  const [showCrossRef, setShowCrossRef] = useState(null);
  
  // Add refs for the chapter content containers
  const chapterContentRef = useRef(null);
  const kjvContentRef = useRef(null);
  
  // State to track primary reading vs cross-reference viewing
  const [isViewingCrossRef, setIsViewingCrossRef] = useState(false);
  const [primaryReading, setPrimaryReading] = useState({
    book: null,
    chapter: 1
  });
  
  // Add translation support
  const [selectedTranslation, setSelectedTranslation] = useState('en_kjv.json');
  
  // Store KJV Bible data separately
  const [kjvBibleData, setKjvBibleData] = useState(null);
  
  // Available translations
  const translations = React.useMemo(() => [
    { id: 'en_kjv.json', name: 'English - King James Version (KJV)' },
    { id: 'en_bbe.json', name: 'English - Bible in Basic English (BBE)' },
    { id: 'zh_cuv.json', name: 'Chinese - Chinese Union Version (CUV)' },
    { id: 'es_rvr.json', name: 'Spanish - Reina Valera Revisada (RVR)' },
    { id: 'fr_apee.json', name: 'French - Louis Segond (APEE)' },
    { id: 'ko_ko.json', name: 'Korean - Korean Version' },
    { id: 'he_heb_no_strong.json', name: 'Hebrew - Modern Hebrew Bible' },
    { id: 'he_heb_strong.json', name: 'Hebrew - Modern Hebrew Bible (with Strong\'s)' }
  ], []);
  
  // Store current position for translation changes
  // Using the state setter directly in useEffect to avoid unused var warning
  const [, setCurrentBookAbbrev] = useState(null);
  
  // Store previous translation for keyboard shortcuts
  const [previousTranslation, setPreviousTranslation] = useState('en_kjv.json');
  
  // Update current book abbrev when book changes
  useEffect(() => {
    if (selectedBook) {
      setCurrentBookAbbrev(selectedBook.abbrev);
    }
  }, [selectedBook]);
  
  // Add keyboard event handler for translation switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      // '[' key - go back to previous translation (before BBE)
      if (e.key === '[' && selectedTranslation === 'en_bbe.json') {
        setSelectedTranslation(previousTranslation);
      }
      // ']' key - switch to BBE
      else if (e.key === ']' && selectedTranslation !== 'en_bbe.json') {
        setPreviousTranslation(selectedTranslation);
        setSelectedTranslation('en_bbe.json');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTranslation]);
  
  // Save reading position to localStorage when it changes
  useEffect(() => {
    if (selectedBook) {
      try {
        const stateToSave = {
          bookAbbrev: selectedBook.abbrev,
          chapter: selectedChapter,
          translation: selectedTranslation,
          primaryReading: {
            bookAbbrev: primaryReading.book?.abbrev,
            chapter: primaryReading.chapter
          },
          isViewingCrossRef
        };
        localStorage.setItem('bibleReaderState', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn("Error saving state to localStorage:", e);
      }
    }
  }, [selectedBook, selectedChapter, selectedTranslation, primaryReading, isViewingCrossRef]);

  // Load Bible data and cross-references on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const baseUrl = getBaseUrl();
        console.log("Using base URL:", baseUrl);
        console.log("Current hostname:", window.location.hostname);
        console.log("Current pathname:", window.location.pathname);
        console.log("Loading translation:", selectedTranslation);
        
        // First try loading Bible data from static file with the selected translation
        console.log("Attempting to load Bible data from", `${baseUrl}/${selectedTranslation}`);
        let bibleData;
        let bibleResponse;
        let usingApiEndpoint = false;
        
        try {
          bibleResponse = await fetch(`${baseUrl}/${selectedTranslation}`);
          console.log("Bible data response status:", bibleResponse.status);
          
          // Check if we got HTML instead of JSON (common error with Vercel)
          const contentType = bibleResponse.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            console.warn("Received HTML instead of JSON, will try API endpoint");
            throw new Error("Received HTML instead of JSON");
          }
          
          if (!bibleResponse.ok) {
            throw new Error(`HTTP error! Status: ${bibleResponse.status}`);
          }
          
          // Try to parse the JSON
          bibleData = await bibleResponse.json();
        } catch (directError) {
          console.warn("Error loading from direct file:", directError.message);
          
          // Try the API endpoint instead
          console.log("Trying API endpoint as fallback...");
          try {
            usingApiEndpoint = true;
            // For local development, we need to use a different port for the API server
            const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : baseUrl;
            const apiUrl = `${apiBaseUrl}/api/json/${selectedTranslation}`;
            console.log("Attempting to fetch from API:", apiUrl);
            
            const apiResponse = await fetch(apiUrl);
            console.log("API response status:", apiResponse.status);
            
            if (!apiResponse.ok) {
              throw new Error(`API HTTP error! Status: ${apiResponse.status}`);
            }
            
            bibleData = await apiResponse.json();
          } catch (apiError) {
            console.error("API endpoint also failed:", apiError);
            throw new Error(`Failed to load Bible data: ${directError.message}. API fallback also failed: ${apiError.message}`);
          }
        }
        
        console.log("Bible data loaded successfully, first book:", bibleData[0]?.abbrev);
        console.log("Data loaded using", usingApiEndpoint ? "API endpoint" : "direct file access");
        setBibleData(bibleData);
        
        // Load KJV Bible data if the current translation is not KJV
        if (selectedTranslation !== 'en_kjv.json') {
          try {
            console.log("Loading KJV Bible data for the second panel");
            const kjvResponse = await fetch(`${baseUrl}/en_kjv.json`);
            
            if (!kjvResponse.ok) {
              // Try API endpoint as fallback
              const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : baseUrl;
              const kjvApiResponse = await fetch(`${apiBaseUrl}/api/json/en_kjv.json`);
              
              if (!kjvApiResponse.ok) {
                throw new Error("Failed to load KJV Bible data");
              }
              
              const kjvData = await kjvApiResponse.json();
              setKjvBibleData(kjvData);
            } else {
              const kjvData = await kjvResponse.json();
              setKjvBibleData(kjvData);
            }
          } catch (kjvError) {
            console.error("Failed to load KJV Bible data:", kjvError);
            // Use the current Bible data as fallback
            setKjvBibleData(bibleData);
          }
        } else {
          // If current translation is already KJV, use the same data
          setKjvBibleData(bibleData);
        }
        
        // Load saved reading position from localStorage or default to Genesis
        let savedBook = null;
        let savedChapter = 1;
        let savedTranslation = selectedTranslation;
        
        // Try to load saved state from localStorage
        try {
          const savedState = localStorage.getItem('bibleReaderState');
          if (savedState) {
            const parsedState = JSON.parse(savedState);
            savedTranslation = parsedState.translation || selectedTranslation;
            
            // Check if the saved translation is still available
            const isTranslationAvailable = translations.some(t => t.id === savedTranslation);
            
            // If the saved translation is available and different from the current one, load it
            if (isTranslationAvailable && savedTranslation !== selectedTranslation) {
              setSelectedTranslation(savedTranslation);
              // Return early as changing the translation will trigger a reload
              return;
            }
            
            // If the saved translation is no longer available (e.g., he_heb.json was replaced),
            // we'll continue with the default translation
            
            // Always try to restore saved position regardless of translation
            if (bibleData) {
              const bookAbbrev = parsedState.bookAbbrev;
              savedBook = bibleData.find(b => b.abbrev === bookAbbrev);
              savedChapter = parsedState.chapter || 1;
              
              // Also restore primary reading state
              if (parsedState.primaryReading) {
                const primaryBookAbbrev = parsedState.primaryReading.bookAbbrev;
                const primaryBook = bibleData.find(b => b.abbrev === primaryBookAbbrev);
                if (primaryBook) {
                  setPrimaryReading({
                    book: primaryBook,
                    chapter: parsedState.primaryReading.chapter || 1
                  });
                }
                
                // Restore cross-reference viewing state
                setIsViewingCrossRef(parsedState.isViewingCrossRef || false);
              }
            }
          }
        } catch (e) {
          console.warn("Error loading saved state:", e);
          // Continue with defaults if localStorage fails
        }
        
        // Set selected book (from saved state or default to first book)
        if (savedBook) {
          setSelectedBook(savedBook);
          setSelectedChapter(savedChapter);
        } else if (bibleData && bibleData.length > 0) {
          setSelectedBook(bibleData[0]);
          setPrimaryReading({
            book: bibleData[0],
            chapter: 1
          });
        }
        
        // Load cross-references from the JSON file, using the same method that worked for Bible data
        await loadCrossReferences(baseUrl, usingApiEndpoint);
        
        setLoading(false);
      } catch (err) {
        console.error("Failed to load data:", err);
        // Fix error message if it's referring to the old Hebrew Bible file
        let errorMessage = err.message;
        if (errorMessage.includes('he_heb.json')) {
          errorMessage = errorMessage.replace('he_heb.json', 'Hebrew Bible files (he_heb_no_strong.json or he_heb_strong.json)');
        }
        
        setError(`Failed to load Bible data: ${errorMessage}. Make sure the ${selectedTranslation} file exists in the public folder.`);
        setLoading(false);
      }
    };
    
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTranslation]);

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

  // Handle book selection
  const handleBookSelect = (abbrev) => {
    if (bibleData) {
      const book = bibleData.find(b => b.abbrev === abbrev);
      setSelectedBook(book);
      setSelectedChapter(1); // Reset to first chapter when book changes
      setShowCrossRef(null); // Hide any cross-reference popup
      
      // Update primary reading
      setPrimaryReading({
        book: book,
        chapter: 1
      });
      setIsViewingCrossRef(false);
      
      // Scroll both panels to top when book changes
      if (chapterContentRef.current) {
        chapterContentRef.current.scrollTop = 0;
      }
      if (kjvContentRef.current) {
        kjvContentRef.current.scrollTop = 0;
      }
    }
  };
  
  // Handle chapter selection
  const handleChapterSelect = (chapterNum) => {
    setSelectedChapter(chapterNum);
    setShowCrossRef(null); // Hide any cross-reference popup
    
    // Update primary reading
    if (selectedBook) {
      setPrimaryReading({
        book: selectedBook,
        chapter: chapterNum
      });
      setIsViewingCrossRef(false);
    }
    
    // Scroll both panels to top when chapter changes
    if (chapterContentRef.current) {
      chapterContentRef.current.scrollTop = 0;
    }
    if (kjvContentRef.current) {
      kjvContentRef.current.scrollTop = 0;
    }
  };
  
  // Handle translation change
  const handleTranslationChange = (e) => {
    // Save current position before changing translation
    const currentBookAbbrev = selectedBook?.abbrev;
    const currentChapter = selectedChapter;
    
    // Store previous translation before changing
    setPreviousTranslation(selectedTranslation);
    
    // Update translation
    const newTranslation = e.target.value;
    setSelectedTranslation(newTranslation);
    
    // The full state restoration will happen in the useEffect that loads Bible data
    // We're just making sure we preserve these values during the translation change
    try {
      // Update the saved state with the new translation but preserve position
      const savedState = localStorage.getItem('bibleReaderState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Update with current values in case they changed
        parsedState.bookAbbrev = currentBookAbbrev;
        parsedState.chapter = currentChapter;
        parsedState.translation = newTranslation;
        
        // Preserve primary reading state
        if (primaryReading.book) {
          parsedState.primaryReading = {
            bookAbbrev: primaryReading.book.abbrev,
            chapter: primaryReading.chapter
          };
        }
        
        // Preserve cross-reference viewing state
        parsedState.isViewingCrossRef = isViewingCrossRef;
        
        localStorage.setItem('bibleReaderState', JSON.stringify(parsedState));
      } else {
        // If no saved state exists, create one
        const stateToSave = {
          bookAbbrev: currentBookAbbrev,
          chapter: currentChapter,
          translation: newTranslation,
          primaryReading: {
            bookAbbrev: primaryReading.book?.abbrev,
            chapter: primaryReading.chapter
          },
          isViewingCrossRef
        };
        localStorage.setItem('bibleReaderState', JSON.stringify(stateToSave));
      }
    } catch (e) {
      console.warn("Error updating translation in localStorage:", e);
    }
    
    // Scroll both panels to top when translation changes
    if (chapterContentRef.current) {
      chapterContentRef.current.scrollTop = 0;
    }
    if (kjvContentRef.current) {
      kjvContentRef.current.scrollTop = 0;
    }
  };
  

  // Handle click on a verse to navigate to a cross-reference
  const handleCrossRefNavigate = (ref) => {
    // Find the book in the Bible data
    const book = bibleData.find(b => b.abbrev === ref.book);
    if (book) {
      setSelectedBook(book);
      setSelectedChapter(ref.chapter);
      
      // Mark that we're viewing a cross-reference (not primary reading)
      setIsViewingCrossRef(true);
      
      // Hide the cross-reference popup
      setShowCrossRef(null);
      
      // Add a slight delay before scrolling to the verse in both panels
      setTimeout(() => {
        // Scroll to verse in primary panel
        const verseElement = document.getElementById(`verse-${ref.verse}`);
        if (verseElement && chapterContentRef.current) {
          verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Highlight the verse temporarily
          verseElement.classList.add('bg-yellow-100');
          setTimeout(() => {
            verseElement.classList.remove('bg-yellow-100');
          }, 3000); // Remove highlight after 3 seconds
        }
        
        // Scroll to verse in KJV panel
        const kjvVerseElement = document.getElementById(`kjv-verse-${ref.verse}`);
        if (kjvVerseElement && kjvContentRef.current) {
          kjvVerseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Highlight the verse temporarily in KJV panel
          kjvVerseElement.classList.add('bg-yellow-100');
          setTimeout(() => {
            kjvVerseElement.classList.remove('bg-yellow-100');
          }, 3000); // Remove highlight after 3 seconds
        }
      }, 300);
    }
  };

  // Get translation short name for display
  const getTranslationShortName = (translationId) => {
    const translationMap = {
      'en_kjv.json': 'KJV',
      'en_bbe.json': 'BBE',
      'zh_cuv.json': 'CUV',
      'es_rvr.json': 'RVR',
      'fr_apee.json': 'APEE',
      'ko_ko.json': 'KO',
      'he_heb_no_strong.json': 'HEB',
      'he_heb_strong.json': 'HEB-Strong'
    };
    
    return translationMap[translationId] || translationId.split('_')[1].split('.')[0].toUpperCase();
  };

  // If still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-4xl font-bold mb-4">Loading Bible Data...</div>
          <div className="animate-pulse bg-blue-500 h-4 w-96 rounded"></div>
        </div>
      </div>
    );
  }
  
  // If there was an error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-100 p-4">
        <div className="text-center text-red-600 max-w-2xl">
          <div className="text-3xl font-bold mb-4">Error</div>
          <div className="mb-4 text-xl">{error}</div>
          
          {/* Add debugging information */}
          <div className="text-left mt-4 p-4 bg-white rounded-md shadow border border-red-200">
            <h3 className="font-bold mb-2 text-xl">Debugging Information:</h3>
            <p>Current hostname: {window.location.hostname}</p>
            <p>Current path: {window.location.pathname}</p>
            <p>Base URL used: {getBaseUrl()}</p>
            <p>Expected Bible data URL: {getBaseUrl()}/{selectedTranslation}</p>
            <p className="mt-2 text-base">
              This could be caused by missing data files. Make sure your Bible data files
              ({selectedTranslation} and crossRefs.json) are in the correct location for the current 
              environment (local or GitHub Pages).
            </p>
            
            <div className="mt-4 p-3 bg-gray-100 rounded-md text-gray-800 text-base">
              <p className="font-bold">Vercel Deployment Tips:</p>
              <ul className="list-disc pl-5 mt-2">
                <li>Verify that JSON files were copied to the build directory during build</li>
                <li>Check that vercel.json has the correct content type headers</li>
                <li>Try accessing the JSON files directly: <a href={`/${selectedTranslation}`} target="_blank" rel="noreferrer" className="underline">/{selectedTranslation}</a></li>
                <li>Look at network requests in browser developer tools</li>
                <li>Consider manually uploading JSON files using the Vercel dashboard</li>
              </ul>
            </div>
          </div>
          
          {/* Add direct link to try loading JSON*/}
          <div className="mt-4 flex flex-wrap justify-center space-x-4">
            <a 
              href={window.location.hostname === 'localhost' 
                ? `http://localhost:3001/${selectedTranslation}` 
                : `/${selectedTranslation}`} 
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xl"
            >
              Test {selectedTranslation}
            </a>
            <a 
              href={window.location.hostname === 'localhost' 
                ? "http://localhost:3001/crossRefs.json" 
                : "/crossRefs.json"} 
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xl"
            >
              Test crossRefs.json
            </a>
            <a 
              href={window.location.hostname === 'localhost' 
                ? `http://localhost:3001/api/json/${selectedTranslation}` 
                : `/api/json/${selectedTranslation}`} 
              target="_blank"
              rel="noreferrer"
              className="mt-2 px-5 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xl"
            >
              Test API {selectedTranslation}
            </a>
            <a 
              href={window.location.hostname === 'localhost' 
                ? "http://localhost:3001/api/list-files" 
                : "/api/list-files"} 
              target="_blank"
              rel="noreferrer"
              className="mt-2 px-5 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xl"
            >
              Diagnostics
            </a>
          </div>
          
          {/* Retry button */}
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xl"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // Helper function to get book name based on abbreviation
  const getBookName = (abbrev) => {
    const bookNames = {
      'gn': 'Genesis', 'ex': 'Exodus', 'lv': 'Leviticus', 'nm': 'Numbers', 'dt': 'Deuteronomy',
      'js': 'Joshua', 'jud': 'Judges', 'rt': 'Ruth', '1sm': '1 Samuel', '2sm': '2 Samuel',
      '1kgs': '1 Kings', '2kgs': '2 Kings', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
      'ezr': 'Ezra', 'ne': 'Nehemiah', 'et': 'Esther', 'job': 'Job', 'ps': 'Psalms',
      'prv': 'Proverbs', 'ec': 'Ecclesiastes', 'so': 'Song of Solomon', 'is': 'Isaiah',
      'jr': 'Jeremiah', 'lm': 'Lamentations', 'ez': 'Ezekiel', 'dn': 'Daniel',
      'ho': 'Hosea', 'jl': 'Joel', 'am': 'Amos', 'ob': 'Obadiah', 'jn': 'Jonah',
      'mi': 'Micah', 'na': 'Nahum', 'hk': 'Habakkuk', 'zp': 'Zephaniah', 'hg': 'Haggai',
      'zc': 'Zechariah', 'ml': 'Malachi', 'mt': 'Matthew', 'mk': 'Mark', 'lk': 'Luke',
      'jo': 'John', 'act': 'Acts', 'rm': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians',
      'gl': 'Galatians', 'eph': 'Ephesians', 'ph': 'Philippians', 'cl': 'Colossians',
      '1ts': '1 Thessalonians', '2ts': '2 Thessalonians', '1tm': '1 Timothy', '2tm': '2 Timothy',
      'tt': 'Titus', 'phm': 'Philemon', 'hb': 'Hebrews', 'jm': 'James', '1pe': '1 Peter',
      '2pe': '2 Peter', '1jo': '1 John', '2jo': '2 John', '3jo': '3 John', 'jd': 'Jude',
      're': 'Revelation'
    };
    
    return bookNames[abbrev] || abbrev;
  };

  // Main render
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Book Selection Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-2 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center">
            <Book className="mr-1 h-4 w-4" />
            Bible Books
          </h2>
        </div>
        <div className="overflow-y-auto h-full">
          {bibleData && bibleData.map(book => (
            <button
              key={book.abbrev}
              onClick={() => handleBookSelect(book.abbrev)}
              className={`w-full text-left px-6 py-3 hover:bg-gray-100 text-xl ${
                selectedBook && selectedBook.abbrev === book.abbrev ? 'bg-blue-100 font-medium' : ''
              }`}
            >
              {book.book || getBookName(book.abbrev)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Navigation and Chapter Selection */}
        <div className="bg-white border-b border-gray-200 p-1 flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold ml-2">
              {selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : 'Select a Book'}
            </h1>
            
            {selectedBook && (
              <div className="flex items-center">
                <span className="mr-1 text-sm">Ch:</span>
                <select 
                  value={selectedChapter}
                  onChange={(e) => handleChapterSelect(parseInt(e.target.value))}
                  className="border border-gray-300 rounded px-1 py-0 text-sm w-12"
                >
                  {selectedBook.chapters.map((_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center ml-2">
              <BookOpen className="mr-1 h-4 w-4 text-blue-600" />
              <select 
                value={selectedTranslation}
                onChange={handleTranslationChange}
                className="border border-gray-300 rounded px-1 py-0 text-sm bg-white"
              >
                {translations.map(translation => (
                  <option key={translation.id} value={translation.id}>
                    {translation.id.split('_')[0].toUpperCase()} - {translation.id.split('_')[1].split('.')[0].toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Navigation History / Breadcrumb */}
          <div className="flex items-center space-x-1 mr-2">
            <NavigationPlaceholder 
              book={primaryReading.book} 
              chapter={primaryReading.chapter}
              getBookName={getBookName}
              onNavigate={(book, chapter) => {
                if (book && bibleData) {
                  const bookObj = bibleData.find(b => b.abbrev === book);
                  if (bookObj) {
                    setSelectedBook(bookObj);
                    setSelectedChapter(chapter);
                    setPrimaryReading({
                      book: bookObj,
                      chapter: chapter
                    });
                    setIsViewingCrossRef(false);
                    if (chapterContentRef.current) {
                      chapterContentRef.current.scrollTop = 0;
                    }
                  }
                }
              }}
            />
            
            {/* Return to Primary Reading button (only when viewing cross-reference) */}
            {isViewingCrossRef && (
              <button
                onClick={() => {
                  if (primaryReading.book) {
                    setSelectedBook(primaryReading.book);
                    setSelectedChapter(primaryReading.chapter);
                    setIsViewingCrossRef(false);
                    if (chapterContentRef.current) {
                      chapterContentRef.current.scrollTop = 0;
                    }
                  }
                }}
                className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-xs"
              >
                Return
              </button>
            )}
          </div>
        </div>
        
        {/* Bible Text and KJV Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Bible Text Display */}
          <div ref={chapterContentRef} className="w-1/2 overflow-y-auto p-8 bg-white relative">
            {selectedBook && selectedChapter > 0 && (
              <div>
                <h2 className="text-3xl font-semibold flex items-center mb-5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-book-open mr-3 h-8 w-8">
                    <path d="M12 7v14"></path>
                    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                  </svg>
                  {selectedBook.book || getBookName(selectedBook.abbrev)} {selectedChapter}
                  {selectedTranslation !== 'en_kjv.json' && (
                    <span className="ml-2 text-gray-500">
                      ({getTranslationShortName(selectedTranslation)})
                    </span>
                  )}
                  <a href="https://cdpn.io/pen/debug/OPJBXKj" target="_blank" rel="noopener noreferrer" className="ml-3 text-blue-500 hover:text-blue-700">
                    <Link className="h-6 w-6" />
                  </a>
                </h2>
                <div className="space-y-5">
                  {selectedBook.chapters[selectedChapter - 1].map((verse, index) => {
                    const verseNumber = index + 1;
                    const refKey = `${selectedBook.abbrev}-${selectedChapter}-${verseNumber}`;
                    const hasReference = crossReferences[refKey] && crossReferences[refKey].length > 0;
                    
                    return (
                      <div 
                        key={index} 
                        id={`verse-${verseNumber}`}
                        className={`leading-relaxed p-4 rounded-md transition-colors text-2xl ${
                          hasReference ? 'hover:bg-blue-50' : ''
                        }`}
                      >
                        <p className="flex">
                          <span className="font-bold text-blue-600 mr-4 text-2xl">{verseNumber}</span>
                          <span className="flex-1">{verse}</span>
                          
                          {hasReference && (
                            <button
                              onClick={() => setShowCrossRef(showCrossRef === refKey ? null : refKey)}
                              className="ml-3 text-blue-500 hover:text-blue-700 focus:outline-none"
                              title="Show cross-references"
                            >
                              <Link className="h-6 w-6" />
                            </button>
                          )}
                        </p>
                        
                        {/* Cross-reference popup */}
                        {showCrossRef === refKey && (
                          <div className="mt-4 p-5 bg-blue-50 border border-blue-200 rounded-md shadow-sm">
                            <h4 className="font-medium mb-4 text-2xl">Cross References:</h4>
                            <ul className="space-y-4">
                              {crossReferences[refKey].map((ref, i) => (
                                <li key={i} className="text-xl">
                                  <button 
                                    onClick={() => handleCrossRefNavigate(ref)}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    {getBookName(ref.book)} {ref.chapter}:{ref.verse}
                                  </button>
                                  <p className="text-gray-700 mt-2">{ref.text}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Chapter Navigation - Simple inline approach */}
                <div className="mt-10 flex justify-between pb-4">
                  {selectedChapter > 1 ? (
                    <button 
                      onClick={() => {
                        handleChapterSelect(selectedChapter - 1);
                        // Sync KJV panel scroll with primary panel
                        if (kjvContentRef.current) {
                          setTimeout(() => {
                            kjvContentRef.current.scrollTop = 0;
                          }, 100);
                        }
                      }}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                    >
                      &lt; Previous Chapter
                    </button>
                  ) : (
                    <div></div>
                  )}
                  
                  {selectedBook && selectedChapter < selectedBook.chapters.length && (
                    <button 
                      onClick={() => {
                        handleChapterSelect(selectedChapter + 1);
                        // Sync KJV panel scroll with primary panel
                        if (kjvContentRef.current) {
                          setTimeout(() => {
                            kjvContentRef.current.scrollTop = 0;
                          }, 100);
                        }
                      }}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                    >
                      Next Chapter &gt;
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* KJV Bible Panel */}
          <div className="w-1/2 border-l border-gray-200 bg-gray-50 flex flex-col">
            {/* KJV Bible Text Display */}
            <div ref={kjvContentRef} className="flex-1 p-8 overflow-y-auto bg-white">
              {selectedBook && selectedChapter > 0 && (
                <div>
                  <h2 className="text-3xl mr-2 font-semibold mb-5">
                    {selectedBook.book || getBookName(selectedBook.abbrev)} {selectedChapter} <span className="text-gray-500">(KJV)</span>
                  </h2>
                  <div className="space-y-5">
                    {kjvBibleData && selectedBook && kjvBibleData.find(b => b.abbrev === selectedBook.abbrev)?.chapters[selectedChapter - 1].map((verse, index) => {
                      const verseNumber = index + 1;
                      
                      return (
                        <div 
                          key={index} 
                          id={`kjv-verse-${verseNumber}`}
                          className="leading-relaxed p-4 rounded-md transition-colors text-2xl"
                        >
                          <p className="flex">
                            <span className="font-bold text-blue-600 mr-4">{verseNumber}</span>
                            <span className="flex-1">{verse}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Navigation buttons for KJV panel */}
                  <div className="mt-10 flex justify-between pb-4">
                    {selectedChapter > 1 ? (
                      <button 
                        onClick={() => {
                          handleChapterSelect(selectedChapter - 1);
                        }}
                        className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                      >
                        &lt; Previous Chapter
                      </button>
                    ) : (
                      <div></div>
                    )}
                    
                    {selectedBook && selectedChapter < selectedBook.chapters.length && (
                      <button 
                        onClick={() => {
                          handleChapterSelect(selectedChapter + 1);
                        }}
                        className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                      >
                        Next Chapter &gt;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BibleApp;