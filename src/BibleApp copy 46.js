import React, { useState, useEffect, useRef, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { Book, Link, ChevronRight, History, BookOpen, Save, Database } from 'lucide-react';
import TextToSpeech from './components/TextToSpeech';

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, onValue } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0_4AT0jzRoSeV5jK4rN4Ah7BTKKTl78I",
  authDomain: "linked-in-creators.firebaseapp.com",
  databaseURL: "https://linked-in-creators-default-rtdb.firebaseio.com",
  projectId: "linked-in-creators",
  storageBucket: "linked-in-creators.appspot.com",
  messagingSenderId: "282570385061",
  appId: "1:282570385061:web:24fcf17921e99540984f4c",
  measurementId: "G-5G6JG8VERG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Firebase database name for Bible chapter positions
const theVocabDatabaseName = 'BibleChapterDatabase';

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

// Firebase Key Selector Component
const FirebaseKeySelector = ({ onSelect, onSave, currentBook, currentChapter, currentTranslation, onApplyTranslationToPane1, onApplyTranslationToPane2, selectedDropdownTranslation, isMobileView, isTabletView, stickyPane, isDarkMode, autoSavePosition, onAutoSavePositionChange, onNextChapter, bibleData, setSelectedBook, firebaseEnabled, onFirebaseToggle }) => {
  const [savedPositions, setSavedPositions] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(true);

  // Load saved positions from Firebase
  useEffect(() => {
    // Only load Firebase data if Firebase is enabled
    if (!firebaseEnabled) {
      setLoading(false);
      setSavedPositions([]);
      return;
    }

    const loadFirebaseKeys = async () => {
      try {
        setLoading(true);
        const bibleDbRef = ref(database, `${theVocabDatabaseName}/`);
        
        onValue(bibleDbRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const positions = [];
            
            // Process the data
            Object.keys(data).forEach(key => {
              const position = data[key];
              positions.push({
                key,
                value: position
              });
            });
            
            setSavedPositions(positions);
          } else {
            console.log('No saved positions found');
            setSavedPositions([]);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error('Error loading Firebase keys:', error);
        setLoading(false);
      }
    };

    loadFirebaseKeys();
  }, [firebaseEnabled]);

  // Format saved position for display
  const formatPositionDisplay = (position) => {
    if (!position) return 'Empty position';
    
    try {
      const data = typeof position === 'string' ? JSON.parse(position) : position;
      
      if (!data.bookAbbrev) return 'Invalid position data';
      
      return `${data.bookAbbrev || 'Unknown'} ${data.chapter || '1'} (${data.translation?.split('_')[0] || 'en'})`;
    } catch (error) {
      console.error('Error parsing position:', error);
      return 'Invalid position format';
    }
  };

  // Handle saving current position to selected key
  const handleSave = () => {
    if (!autoSavePosition) {
      console.warn('Save aborted: No auto-save position selected');
      return;
    }

    // Create the key string in the expected format
    const keyToSave = `${autoSavePosition}-position`;

    // Create position data object
    const positionData = JSON.stringify({
      bookAbbrev: currentBook?.abbrev,
      chapter: currentChapter,
      translation: currentTranslation,
      timestamp: Date.now(),
      stickyPane: stickyPane
    });

    onSave(keyToSave, positionData);
  };

  // Get key number from key string (e.g., "1-position" returns "1")
  const getKeyNumber = (key) => {
    const parts = key.split('-');
    return parts[0];
  };

  return (
    <div className="flex items-center space-x-2">
      <select
        className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'} rounded p-1 text-sm`}
        value={autoSavePosition}
        onChange={(e) => onAutoSavePositionChange && onAutoSavePositionChange(e.target.value)}
        title="Select position for auto-save"
      >
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
      </select>
      <select
        className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'} rounded p-1 text-sm`}
        value={selectedKey}
        onChange={(e) => {
          const newKey = e.target.value;
          setSelectedKey(newKey);
          
          // Automatically load the selected position
          if (newKey) {
            onSelect(newKey);
          }
        }}
      >
        <option value="">Select position...</option>
        {savedPositions.map((position) => (
          <option key={position.key} value={position.key}>
            {getKeyNumber(position.key)}-{formatPositionDisplay(position.value)}
          </option>
        ))}
      </select>
      
      <button
        onClick={handleSave}
        disabled={loading}
        className={`flex items-center px-2 py-1 text-sm ${isDarkMode ? 'bg-green-700' : 'bg-green-500'} text-white rounded hover:bg-green-600 transition-colors disabled:${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
        title="Save current position"
      >
        <Save className="h-3 w-3 mr-1" />
        Save
      </button>
      
      {/* Firebase Toggle Button */}
      <button
        onClick={() => onFirebaseToggle && onFirebaseToggle(!firebaseEnabled)}
        className={`ml-2 flex items-center px-2 py-1 text-sm rounded transition-colors ${
          firebaseEnabled 
            ? (isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-500 text-white hover:bg-blue-600')
            : (isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-400 text-gray-700 hover:bg-gray-500')
        }`}
        title={`Firebase loading is ${firebaseEnabled ? 'ON' : 'OFF'} - Click to toggle`}
      >
        <Database className="h-3 w-3 mr-1" />
        {firebaseEnabled ? 'ON' : 'OFF'}
      </button>

      {/* Apply translation to pane 2 */}
      <button
        onClick={() => {
          onApplyTranslationToPane2(selectedDropdownTranslation);
        }}
        className={`ml-2 flex items-center px-2 py-1 text-sm ${isDarkMode ? 'bg-purple-700' : 'bg-purple-500'} text-white rounded hover:bg-purple-600 transition-colors`}
        title="Apply selected translation to secondary pane"
      >
        <span className="flex items-center">
          <BookOpen className="h-3 w-3" />
          <span className="text-xs font-bold ml-0.5 mr-1">2</span>
        </span>
        Apply
      </button>


      {/* Next Chapter button */}
      <button
        onClick={() => {
          if (currentBook && currentChapter < currentBook.chapters.length) {
            onNextChapter(currentChapter + 1, true);
          } else if (bibleData && bibleData.length > 0) {
            // Try to go to next book
            const currentBookIndex = bibleData.findIndex(b => b.abbrev === currentBook?.abbrev);
            if (currentBookIndex !== -1 && currentBookIndex < bibleData.length - 1) {
              const nextBook = bibleData[currentBookIndex + 1];
              setSelectedBook(nextBook);
              setTimeout(() => {
                onNextChapter(1, true);
              }, 100);
            }
          }
        }}
        className={`ml-2 flex items-center px-2 py-1 text-sm ${isDarkMode ? 'bg-green-700' : 'bg-green-500'} text-white rounded hover:bg-green-600 transition-colors`}
        title="Go to next chapter (same as pressing 'm' key)"
      >
        Next Ch
      </button>

    </div>
  );
};

// Navigation Placeholder Component
const NavigationPlaceholder = ({ 
  book, 
  chapter, 
  getBookName, 
  onNavigate, 
  onSyncModeChange, 
  syncMode, 
  onStickyPaneChange, 
  stickyPane,
  onAudioClick,
  onClipboardClick,
  onDarkModeToggle,
  isDarkMode,
  touchScrollMode,
  onTouchScrollModeChange,
  touchScrollModes,
  rightPaneBibleData,
  rightPaneTranslation,
  resetScrollTimerRef
}) => {
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const [showTouchDropdown, setShowTouchDropdown] = useState(false);

  // Bible study prompt options
  const bibleStudyPrompts = [
    {
      id: 1,
      label: "Meditation Connection",
      template: "Meditation Connection, For {book} {chapter}, tell me what is the theme connect to meditation like breathe in out"
    },
    {
      id: 2,
      label: "Literary & Structure Analysis",
      template: 'Literary & Structure Analysis: For {book} {chapter}, "Analyze the literary structure, rhetorical devices, and narrative techniques used in this chapter - how do elements like repetition, imagery, parallelism, chiasm, or progression of ideas work together to reinforce the central message and create emotional or theological impact?"'
    },
    {
      id: 3,
      label: "Historical & Cultural Context",
      template: 'Historical & Cultural Context: For {book} {chapter}, "Explore the historical setting, cultural practices, social structures, and contextual factors that shaped this chapter - how do understanding the original audience, historical circumstances, and cultural background illuminate the meaning and significance of the text?"'
    },
    {
      id: 4,
      label: "Theological & Doctrinal",
      template: 'Theological & Doctrinal: For {book} {chapter}, "What does this chapter reveal about the nature and character of God, humanity\'s relationship with the divine, and major theological themes like covenant, salvation, justice, or redemption - and how do these teachings connect to or develop broader biblical doctrine?"'
    },
    {
      id: 5,
      label: "Practical Application",
      template: 'Practical Application: For {book} {chapter}, "Given the original context and timeless principles in this chapter, what specific life situations, moral decisions, relationship dynamics, or spiritual challenges does this text address, and how can its wisdom be authentically applied to contemporary personal and communal life?"'
    },
    {
      id: 6,
      label: "Comparative Analysis",
      template: 'Comparative Analysis: For {book} {chapter}, "How does this chapter\'s themes, language, imagery, and theological content compare and contrast with similar passages throughout Scripture, what unique contribution does it make to biblical literature, and how do different translations or interpretative traditions handle its key concepts?"'
    },
    {
      id: 7,
      label: "Spiritual Formation",
      template: 'Spiritual Formation: For {book} {chapter}, "How can this chapter inform and transform personal spiritual practices like prayer, meditation, worship, and discipleship - what spiritual disciplines does it model or encourage, and how might regular engagement with its content shape character and faith development?"'
    },
    {
      id: 8,
      label: "Creative Engagement",
      template: 'Creative Engagement: For {book} {chapter}, "If you were to reimagine this chapter through contemporary storytelling, artistic expression, or modern parallels, what would it look like, what current situations mirror its dynamics, and how might creative interpretation help unlock its relevance for today\'s audience?"'
    },
    {
      id: 9,
      label: "Additional Text",
      template: 'For {book} {chapter}, '
    }
  ];

  // Handle copying Bible study prompt to clipboard
  const handlePromptClipboard = useCallback((promptTemplate) => {
    if (!book) return;
    
    const bookName = book.book || getBookName(book.abbrev);
    const finalPrompt = promptTemplate.replace('{book}', bookName).replace('{chapter}', `Chapter ${chapter}`);
    
    navigator.clipboard.writeText(finalPrompt)
      .then(() => {
        alert(`Copied to clipboard: ${finalPrompt}`);
        setShowPromptDropdown(false);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard. ' + err);
      });
  }, [book, chapter, getBookName]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPromptDropdown && !event.target.closest('.relative')) {
        setShowPromptDropdown(false);
      }
      if (showTouchDropdown && !event.target.closest('.relative')) {
        setShowTouchDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPromptDropdown, showTouchDropdown]);




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
      <div className="flex flex-wrap gap-y-2 items-center bg-blue-50 px-2 py-1 rounded-md text-blue-800 text-sm">
        
        {/* Dark Mode Toggle Button */}
        <button
          onClick={() => onDarkModeToggle && onDarkModeToggle()}
          className={`ml-2 px-2 py-0.5 rounded focus:outline-none ${
            isDarkMode 
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
              : 'bg-gray-700 text-white hover:bg-gray-800'
          }`}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? 'Light (d)' : 'Dark (d)'}
        </button>
        
        {/* Touch Options Cycling Button */}
        <button
          onClick={() => {
            const currentIndex = touchScrollModes.findIndex(mode => mode.id === touchScrollMode);
            const nextIndex = (currentIndex + 1) % touchScrollModes.length;
            onTouchScrollModeChange(touchScrollModes[nextIndex].id);
          }}
          className="ml-2 px-2 py-0.5 rounded focus:outline-none bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center"
          title={`Current: ${touchScrollModes.find(mode => mode.id === touchScrollMode)?.label || 'Unknown'} - Click to cycle through touch options`}
        >
          {touchScrollModes.find(mode => mode.id === touchScrollMode)?.label || 'Disabled'}
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowPromptDropdown(!showPromptDropdown)}
            className="ml-2 px-2 py-0.5 rounded focus:outline-none bg-green-100 text-green-700 hover:bg-green-200 text-xs"
            title="Copy Bible study prompts to clipboard"
          >
            Prompts ▼
          </button>
          
          {showPromptDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50">
              <div className="py-1">
                {bibleStudyPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptClipboard(prompt.template)}
                    className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    title={`Copy ${prompt.label} prompt to clipboard`}
                  >
                    {prompt.id}. {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Text to Speech Component */}
        <TextToSpeech 
          rightPaneBibleData={rightPaneBibleData}
          currentBook={book.abbrev}
          currentChapter={chapter}
          rightPaneTranslation={rightPaneTranslation}
        />
        
        {/* To Clipboard Button - Hidden */}
        <button
          onClick={() => onClipboardClick && onClipboardClick()}
          className="ml-2 px-2 py-0.5 rounded focus:outline-none bg-green-100 text-green-700 hover:bg-green-200 hidden"
          title="Copy VLC command to clipboard for this chapter"
        >
          To Clip (t)
        </button>
        
        {/* Primary text - Hidden */}
        <span className="ml-3 hidden">Primary:</span>
        <span className="font-medium mx-1 hidden">{book.book || getBookName(book.abbrev)}</span>
        <ChevronRight className="h-3 w-3 mx-1 hidden" />
        <span className="font-medium hidden">Ch {chapter}</span>
        
        {/* Scroll Sync Buttons - All hidden but functionality is retained */}
        <button 
          onClick={() => onSyncModeChange('exact')}
          className="hidden ml-2 px-2 py-0.5 rounded focus:outline-none bg-blue-600 text-white"
          title="Sync KJV scroll at the same speed as primary pane"
        >
          Exact
        </button>
        {/* The faster and slower buttons are hidden but functionality is retained */}
        <button 
          onClick={() => onSyncModeChange('faster')}
          className={`hidden ml-1 px-2 py-0.5 rounded focus:outline-none ${
            syncMode === 'faster' 
              ? 'bg-green-600 text-white' 
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
          title="Make KJV pane scroll faster than primary pane"
        >
          KJV faster
        </button>
        <button 
          onClick={() => onSyncModeChange('slower')}
          className={`hidden ml-1 px-2 py-0.5 rounded focus:outline-none ${
            syncMode === 'slower' 
              ? 'bg-amber-600 text-white' 
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
          title="Make KJV pane scroll slower than primary pane"
        >
          KJV slower
        </button>
        
        {/* Sticky Pane Controls (hidden) */}
        <div className="hidden ml-4 flex items-center border-l border-gray-300 pl-2">
          <span className="text-sm text-gray-600">Sticky:</span>
          <label className="ml-2 flex items-center cursor-pointer">
            <input
              type="radio"
              name="stickyPane"
              value="primary"
              checked={stickyPane === 'primary'}
              onChange={() => onStickyPaneChange('primary')}
              className="mr-1"
            />
            <span className="text-sm">Primary</span>
          </label>
          <label className="ml-2 flex items-center cursor-pointer">
            <input
              type="radio"
              name="stickyPane"
              value="kjv"
              checked={stickyPane === 'kjv'}
              onChange={() => onStickyPaneChange('kjv')}
              className="mr-1"
            />
            <span className="text-sm">KJV</span>
          </label>
        </div>
        
        {/* History Button - Hidden */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="ml-2 p-0.5 rounded-full hover:bg-gray-200 focus:outline-none hidden"
          title="Navigation history"
        >
          <History className="h-3 w-3" />
        </button>


        {/* We've removed the mobile line break div to allow buttons to overflow on mobile */}
        
        
        {/* Down Arrow Button */}
        <button
          onClick={() => {
            // Simulate an ArrowDown key press event
            const event = new KeyboardEvent('keydown', {
              key: 'ArrowDown',
              code: 'ArrowDown',
              keyCode: 40,
              which: 40,
              bubbles: true,
              cancelable: true
            });
            document.dispatchEvent(event);
          }}
          className="hidden md:block ml-2 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
          title="Scroll down one line (Down Arrow)"
        >
          ↓
        </button>

        {/* Scroll Control Radio Buttons - unhidden */}
        <div className="hidden md:flex ml-2 items-center border-l border-gray-300 pl-2">
            <span className="text-xs text-gray-600 mr-1">SCROLL:</span>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="scrollControl"
                value="primary"
                checked={stickyPane === 'primary'}
                onChange={() => onStickyPaneChange('primary')}
                className="mr-1"
              />
              <span className="text-xs">PRIMARY</span>
            </label>
            <label className="ml-2 flex items-center cursor-pointer">
              <input
                type="radio"
                name="scrollControl"
                value="kjv"
                checked={stickyPane === 'kjv'}
                onChange={() => onStickyPaneChange('kjv')}
                className="mr-1"
              />
              <span className="text-xs">KJV</span>
            </label>
          </div>

          {/* Touch Scroll Configuration Dropdown */}
          <div className="hidden md:flex ml-2 items-center border-l border-gray-300 pl-2 relative">
            <span className="text-xs text-gray-600 mr-1">TOUCH:</span>
            <button
              onClick={() => setShowTouchDropdown(!showTouchDropdown)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border flex items-center"
            >
              {touchScrollModes.find(mode => mode.id === touchScrollMode)?.label || 'Disabled'}
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showTouchDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-48">
                {touchScrollModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      onTouchScrollModeChange(mode.id);
                      setShowTouchDropdown(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                      touchScrollMode === mode.id ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-gray-500">{mode.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          
          {/* Up Arrow Key Button */}
          <div className="hidden md:flex ml-2 items-center border-l border-gray-300 pl-2">
            <button
              onClick={() => {
                // Simulate an ArrowUp key press event
                const event = new KeyboardEvent('keydown', {
                  key: 'ArrowUp',
                  code: 'ArrowUp',
                  keyCode: 38,
                  which: 38,
                  bubbles: true,
                  cancelable: true
                });
                document.dispatchEvent(event);
              }}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
              title="Scroll up one line (Up Arrow)"
            >
              ↑
            </button>
            
          </div>
          
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
  const [nextChapterClickCount, setNextChapterClickCount] = useState(0);
  const [autoSavePosition, setAutoSavePosition] = useState("1");

  // Add refs for the chapter content containers
  const chapterContentRef = useRef(null);
  const kjvContentRef = useRef(null);
  const isManuallyScrolling = useRef(false);
  const scrollSyncInitialized = useRef(false);
  const lastPrimaryScrollPos = useRef(0);
  const lastKjvScrollPos = useRef(0);
  const resetScrollTimerRef = useRef(null);
  
  // State to track primary reading vs cross-reference viewing
  const [isViewingCrossRef, setIsViewingCrossRef] = useState(false);
  const [primaryReading, setPrimaryReading] = useState({
    book: null,
    chapter: 1
  });
  
  // Add translation support for left pane
  const [selectedTranslation, setSelectedTranslation] = useState('en_kjv.json');
  const [selectedDropdownTranslation, setSelectedDropdownTranslation] = useState('en_kjv.json');
  
  // Add translation support for right pane (default to KJV)
  const [rightPaneTranslation, setRightPaneTranslation] = useState('en_kjv.json');
  
  // Store right pane Bible data
  const [rightPaneBibleData, setRightPaneBibleData] = useState(null);
  
  // Add scroll sync mode state
  const [scrollSyncMode, setScrollSyncMode] = useState('exact'); // 'exact', 'faster', or 'slower'
  
  // Add sticky pane control (which pane controls the other)
  const [stickyPane, setStickyPane] = useState('kjv'); // 'primary' or 'kjv'
  
  // Mobile responsiveness states
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showKJVOnMobile, setShowKJVOnMobile] = useState(true);
  
  // Available translations
  const translations = React.useMemo(() => [
    { id: 'en_kjv.json', name: 'English - King James Version (KJV)' },
    { id: 'en_bbe.json', name: 'English - Bible in Basic English (BBE)' },
    { id: 'zh_cuv_cantonese.json', name: 'Chinese - CUV, Cantonese' },
    { id: 'zh_cuv_chinese.json', name: 'Chinese - CUV, Chinese' },
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
  // Removed previousTranslation state as it's no longer needed

  // Firebase loading status
  // eslint-disable-next-line no-unused-vars
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  
  // State to track if device is tablet (separate from mobile)
  const [isTabletView, setIsTabletView] = useState(false);
  
  // State to track dark/light mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // State to track Firebase loading toggle
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  
  // State to track touch scroll mode
  const [touchScrollMode, setTouchScrollMode] = useState('right-only');
  
  // Touch scroll mode options
  const touchScrollModes = [
    { id: 'disabled', label: 'Disabled', description: 'Normal click behavior' },
    { id: 'right-only', label: 'Right Pane', description: 'Touch right pane triggers page down' },
    { id: 'both-panes', label: 'Both Panes', description: 'Touch either pane triggers page down' },
    { id: 'right-reduced', label: 'Right Reduced', description: 'Touch right pane with smaller scroll' }
  ];
  
  // State to track scroll position for mobile view during translation changes
  // eslint-disable-next-line no-unused-vars
  const [mobileScrollPosition, setMobileScrollPosition] = useState(0);

  // Effect to detect mobile and tablet screen sizes and handle sidebar visibility
  useEffect(() => {
    const checkDeviceView = () => {
      // Device width breakpoints
      const isMobile = window.innerWidth < 768; // Standard Tailwind md breakpoint
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024; // Between md and lg breakpoints (iPad, Surface)
      
      // Set tablet state
      setIsTabletView(isTablet);
      
      // For mobile view features, we only want phones, not tablets
      setIsMobileView(isMobile);
      
      // Keep sidebar hidden on all devices by default
      setShowSidebar(false);
      
      // Always show both panes in desktop mode
      if (!isMobile && !isTablet) {
        setShowKJVOnMobile(true);
      }
      
      // Show Pane 2 (KJV/BBE) by default on mobile
      if (isMobile) {
        // If a preference is stored in localStorage, use that
        const storedPanePreference = localStorage.getItem('mobilePanePreference');
        if (storedPanePreference) {
          setShowKJVOnMobile(storedPanePreference === 'pane2');
        } else {
          // Default to showing pane 2
          setShowKJVOnMobile(true);
        }
      }
    };
    
    // Initial check
    checkDeviceView();
    
    // Add resize listener
    window.addEventListener('resize', checkDeviceView);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkDeviceView);
  }, []);
  
  // Effect to handle mobile scroll position restoration when the component is fully rendered
  useEffect(() => {
    // Only in mobile view and when the content is loaded
    if (isMobileView && !loading && chapterContentRef?.current) {
      // Try to restore the scroll position one more time after the component has fully rendered
      try {
        const storedScrollPosition = localStorage.getItem('mobileScrollPosition');
        if (storedScrollPosition && parseInt(storedScrollPosition) > 0) {
          const scrollPosition = parseInt(storedScrollPosition);
          console.log("Component rendered, attempting final scroll restore:", scrollPosition);
          
          // Use a slightly longer delay to ensure everything is rendered
          setTimeout(() => {
            // Double check that ref is still valid when the timeout fires
            if (chapterContentRef?.current) {
              chapterContentRef.current.scrollTop = scrollPosition;
              // Only update sync ref if it's initialized
              if (lastPrimaryScrollPos) {
                lastPrimaryScrollPos.current = scrollPosition;
              }
            }
          }, 500);
        }
      } catch (e) {
        console.warn("Error in final scroll position restoration:", e);
      }
    }
  }, [isMobileView, loading]);
  
  // Update current book abbrev when book changes
  useEffect(() => {
    if (selectedBook) {
      setCurrentBookAbbrev(selectedBook.abbrev);
    }
  }, [selectedBook]);
  
  // Add keyboard event handler for translation switching and KJV scrolling
  useEffect(() => {
    // Flag to prevent scroll event feedback loops
    const isManuallyScrollingRef = isManuallyScrolling;

    const handleKeyDown = (e) => {
      // Removed '[' and ']' key handlers for translation switching
      // 'x' key or Down Arrow - scroll down one line at a time in KJV pane (like 'z' but just one line)
      if ((e.key === 'x' || e.key === 'ArrowDown') && kjvContentRef.current) {
        
        // Set the flag to prevent feedback loops
        isManuallyScrollingRef.current = true;

        try {
          // Get KJV pane reference
          const kjvPane = kjvContentRef.current;
          
          // Calculate line height - using verse element height as reference
          // Default to a reasonable line height if we can't find a verse element
          const lineHeight = 60; // Default is 60px (reasonable for text-2xl)
          
          // Scroll KJV pane down by one line
          const kjvNewPosition = kjvPane.scrollTop + lineHeight;
          const kjvMaxScroll = kjvPane.scrollHeight - kjvPane.clientHeight;
          kjvPane.scrollTop = Math.min(kjvMaxScroll, kjvNewPosition);

          // In mobile view, we can skip synchronizing with primary pane
          if (!isMobileView && chapterContentRef.current) {
            const primaryPane = chapterContentRef.current;

            // Calculate new scroll percentage of KJV after scrolling
            const newKjvScrollPercentage = kjvPane.scrollTop /
              (kjvPane.scrollHeight - kjvPane.clientHeight || 1);

            // Apply the same percentage to primary pane
            primaryPane.scrollTop = newKjvScrollPercentage *
              (primaryPane.scrollHeight - primaryPane.clientHeight || 1);

            // Update last scroll position for sync algorithm
            lastPrimaryScrollPos.current = primaryPane.scrollTop;
          }

          e.preventDefault();
        } catch (error) {
          console.error("Error during keyboard scroll:", error);
        } finally {
          // Reset the flag
          setTimeout(() => {
            isManuallyScrollingRef.current = false;
          }, 50);
        }
      }
      // Up Arrow - scroll up one line at a time in KJV pane (opposite of 'x' key)
      else if (e.key === 'ArrowUp' && kjvContentRef.current) {
        
        // Set the flag to prevent feedback loops
        isManuallyScrollingRef.current = true;

        try {
          // Get KJV pane reference
          const kjvPane = kjvContentRef.current;
          
          // Calculate line height - using verse element height as reference
          // Default to a reasonable line height if we can't find a verse element
          const lineHeight = 60; // Default is 60px (reasonable for text-2xl)
          
          // Scroll KJV pane up by one line
          const kjvNewPosition = kjvPane.scrollTop - lineHeight;
          kjvPane.scrollTop = Math.max(0, kjvNewPosition); // Ensure we don't scroll past the top

          // In mobile view, we can skip synchronizing with primary pane
          if (!isMobileView && chapterContentRef.current) {
            const primaryPane = chapterContentRef.current;

            // Calculate new scroll percentage of KJV after scrolling
            const newKjvScrollPercentage = kjvPane.scrollTop /
              (kjvPane.scrollHeight - kjvPane.clientHeight || 1);

            // Apply the same percentage to primary pane
            primaryPane.scrollTop = newKjvScrollPercentage *
              (primaryPane.scrollHeight - primaryPane.clientHeight || 1);

            // Update last scroll position for sync algorithm
            lastPrimaryScrollPos.current = primaryPane.scrollTop;
          }

          e.preventDefault();
        } catch (error) {
          console.error("Error during keyboard scroll:", error);
        } finally {
          // Reset the flag
          setTimeout(() => {
            isManuallyScrollingRef.current = false;
          }, 50);
        }
      }
      
      // 'o' key or PageUp key - page up with KJV pane as reference point
      else if ((e.key === 'o' || e.key === 'PageUp') && kjvContentRef.current) {
        
        // Calculate page height (approx viewport height)
        const pageHeight = kjvContentRef.current.clientHeight * 0.9; // 90% of viewport

        // Set the flag to prevent feedback loops
        isManuallyScrollingRef.current = true;

        try {
          // Calculate relative scroll positions - KJV is now the reference pane
          const kjvPane = kjvContentRef.current;

          // Scroll KJV pane up
          const kjvNewPosition = kjvPane.scrollTop - pageHeight; // Subtract for up
          kjvPane.scrollTop = Math.max(0, kjvNewPosition); // Ensure we don't scroll past the top

          // Always synchronize with primary pane when using o/p keys
          if (chapterContentRef.current) {
            const primaryPane = chapterContentRef.current;

            // Calculate new scroll percentage of KJV after scrolling
            const newKjvScrollPercentage = kjvPane.scrollTop /
              (kjvPane.scrollHeight - kjvPane.clientHeight || 1);

            // Apply the same percentage to primary pane
            primaryPane.scrollTop = newKjvScrollPercentage *
              (primaryPane.scrollHeight - primaryPane.clientHeight || 1);

            // Update last scroll position for sync algorithm
            lastPrimaryScrollPos.current = primaryPane.scrollTop;
          }

          e.preventDefault();
        } catch (error) {
          console.error("Error during keyboard scroll:", error);
        } finally {
          // Reset the flag
          setTimeout(() => {
            isManuallyScrollingRef.current = false;
          }, 50);
        }
      }
      // 'p' key or PageDown key - page down with KJV pane as reference point
      else if ((e.key === 'p' || e.key === 'PageDown') && kjvContentRef.current) {
        
        // Calculate page height (approx viewport height)
        const pageHeight = kjvContentRef.current.clientHeight * 0.9; // 90% of viewport

        // Set the flag to prevent feedback loops
        isManuallyScrollingRef.current = true;

        try {
          // Calculate relative scroll positions - KJV is now the reference pane
          const kjvPane = kjvContentRef.current;

          // Scroll KJV pane down
          const kjvNewPosition = kjvPane.scrollTop + pageHeight;
          const kjvMaxScroll = kjvPane.scrollHeight - kjvPane.clientHeight;
          kjvPane.scrollTop = Math.min(kjvMaxScroll, kjvNewPosition);

          // Always synchronize with primary pane when using o/p keys
          if (chapterContentRef.current) {
            const primaryPane = chapterContentRef.current;

            // Calculate new scroll percentage of KJV after scrolling
            const newKjvScrollPercentage = kjvPane.scrollTop /
              (kjvPane.scrollHeight - kjvPane.clientHeight || 1);

            // Apply the same percentage to primary pane
            primaryPane.scrollTop = newKjvScrollPercentage *
              (primaryPane.scrollHeight - primaryPane.clientHeight || 1);

            // Update last scroll position for sync algorithm
            lastPrimaryScrollPos.current = primaryPane.scrollTop;
          }

          // In mobile view, update the mobile scroll position in localStorage
          if (isMobileView) {
            localStorage.setItem('mobileScrollPosition', chapterContentRef.current?.scrollTop.toString() || '0');
            setMobileScrollPosition(chapterContentRef.current?.scrollTop || 0);
          }
        } finally {
          // Reset the flag after a short delay
          setTimeout(() => {
            isManuallyScrollingRef.current = false;
          }, 50);
        }

        e.preventDefault();
      }
      // 'z' key - go to previous chapter when available by simulating a click on the Previous Chapter button
      else if (e.key === 'z') {
        console.log("Z key pressed for Previous Chapter");

        // Find and click the Previous Chapter button
        const prevChapterButtons = Array.from(document.querySelectorAll('button'))
          .filter(button => button.textContent.includes('Previous Chapter'));

        if (prevChapterButtons.length > 0) {
          console.log("Found Previous Chapter button, clicking it");
          prevChapterButtons[0].click();
        } else if (bibleData && bibleData.length > 0 && selectedChapter > 1) {
          // Manual handling if button not found but chapter > 1
          handleChapterSelect(selectedChapter - 1);
        }

        e.preventDefault();
      }
      // '3' key - cycle through touch options
      else if (e.key === '3' || e.keyCode === 51) {
        const currentIndex = touchScrollModes.findIndex(mode => mode.id === touchScrollMode);
        const nextIndex = (currentIndex + 1) % touchScrollModes.length;
        setTouchScrollMode(touchScrollModes[nextIndex].id);
        
        e.preventDefault();
      }
      // 't' key - simulate clicking the To Clip button
      else if (e.key === 't' || e.keyCode === 84) {
        // Find and click the To Clip button
        const clipButton = Array.from(document.querySelectorAll('button'))
          .find(button => button.title && button.title.includes('Copy VLC command') && button.textContent.includes('To Clip'));
        
        if (clipButton) {
          clipButton.click();
        } else {
          // If we can't find the button but handleClipboardButtonClick is defined, call it directly
          handleClipboardButtonClick();
        }
        
        e.preventDefault();
      }
      // 'd' key - toggle dark mode
      else if (e.key === 'd' || e.keyCode === 68) {
        // Find and click the dark mode toggle button
        const darkModeButton = Array.from(document.querySelectorAll('button'))
          .find(button => 
            (button.title && (button.title.includes('Switch to light mode') || button.title.includes('Switch to dark mode'))) && 
            (button.textContent.includes('Dark') || button.textContent.includes('Light'))
          );
        
        if (darkModeButton) {
          darkModeButton.click();
        } else {
          // If we can't find the button but toggleDarkMode is defined, call it directly
          toggleDarkMode();
        }
        
        e.preventDefault();
      }
      // 'm', ',', or ';' key - go to next chapter when available by simulating a click on the Next Chapter button
      else if (e.key === 'm' || e.key === ',' || e.key === ';') {
        console.log("Semicolon key pressed for Next Chapter");
        console.log("Current state:", { 
          selectedBook: selectedBook?.abbrev, 
          selectedChapter, 
          totalChapters: selectedBook?.chapters.length 
        });

        // Simplified approach: directly find and click the Next Chapter button
        const nextChapterButtons = Array.from(document.querySelectorAll('button'))
          .filter(button => button.textContent.includes('Next Chapter'));

        console.log("Found Next Chapter buttons:", nextChapterButtons.length);

        if (nextChapterButtons.length > 0) {
          console.log("Found Next Chapter button, clicking it");
          nextChapterButtons[0].click();
        } else {
          console.log("No Next Chapter button found - this means we're at the last chapter");
          console.log("Doing nothing (not advancing to next book or Genesis)");
        }

        e.preventDefault();
      }
      
      // '0' key - scroll up one line at a time in KJV pane (same as Up Arrow)
      else if ((e.key === '0' || e.keyCode === 48) && kjvContentRef.current) {
        
        // Set the flag to prevent feedback loops
        isManuallyScrollingRef.current = true;

        try {
          // Get KJV pane reference
          const kjvPane = kjvContentRef.current;
          
          // Calculate line height - using verse element height as reference
          // Default to a reasonable line height if we can't find a verse element
          const lineHeight = 60; // Default is 60px (reasonable for text-2xl)
          
          // Scroll KJV pane up by one line
          const kjvNewPosition = kjvPane.scrollTop - lineHeight;
          kjvPane.scrollTop = Math.max(0, kjvNewPosition); // Ensure we don't scroll past the top

          // In mobile view, we can skip synchronizing with primary pane
          if (!isMobileView && chapterContentRef.current) {
            const primaryPane = chapterContentRef.current;

            // Calculate new scroll percentage of KJV after scrolling
            const newKjvScrollPercentage = kjvPane.scrollTop /
              (kjvPane.scrollHeight - kjvPane.clientHeight || 1);

            // Apply the same percentage to primary pane
            primaryPane.scrollTop = newKjvScrollPercentage *
              (primaryPane.scrollHeight - primaryPane.clientHeight || 1);

            // Update last scroll position for sync algorithm
            lastPrimaryScrollPos.current = primaryPane.scrollTop;
          }

          e.preventDefault();
        } catch (error) {
          console.error("Error during keyboard scroll:", error);
        } finally {
          // Reset the flag
          setTimeout(() => {
            isManuallyScrollingRef.current = false;
          }, 50);
        }
      }
      
      // '9' key - scroll down one line at a time in KJV pane (same as Down Arrow)
      else if ((e.key === '9' || e.keyCode === 57) && kjvContentRef.current) {
        
        // Set the flag to prevent feedback loops
        isManuallyScrollingRef.current = true;

        try {
          // Get KJV pane reference
          const kjvPane = kjvContentRef.current;
          
          // Calculate line height - using verse element height as reference
          // Default to a reasonable line height if we can't find a verse element
          const lineHeight = 60; // Default is 60px (reasonable for text-2xl)
          
          // Scroll KJV pane down by one line
          const kjvNewPosition = kjvPane.scrollTop + lineHeight;
          const kjvMaxScroll = kjvPane.scrollHeight - kjvPane.clientHeight;
          kjvPane.scrollTop = Math.min(kjvMaxScroll, kjvNewPosition);

          // In mobile view, we can skip synchronizing with primary pane
          if (!isMobileView && chapterContentRef.current) {
            const primaryPane = chapterContentRef.current;

            // Calculate new scroll percentage of KJV after scrolling
            const newKjvScrollPercentage = kjvPane.scrollTop /
              (kjvPane.scrollHeight - kjvPane.clientHeight || 1);

            // Apply the same percentage to primary pane
            primaryPane.scrollTop = newKjvScrollPercentage *
              (primaryPane.scrollHeight - primaryPane.clientHeight || 1);

            // Update last scroll position for sync algorithm
            lastPrimaryScrollPos.current = primaryPane.scrollTop;
          }

          e.preventDefault();
        } catch (error) {
          console.error("Error during keyboard scroll:", error);
        } finally {
          // Reset the flag
          setTimeout(() => {
            isManuallyScrollingRef.current = false;
          }, 50);
        }
      }
      // '/' key - toggle Read to End button
      else if (e.key === '/' || e.keyCode === 191) {
        // Find and click the Read to End toggle button
        const readToEndButton = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.textContent.includes('Read2End'));
        
        if (readToEndButton) {
          readToEndButton.click();
          console.log("/ key pressed - toggled Read to End");
        }
        e.preventDefault();
      }
      // Left Arrow - go to previous verse
      else if (e.key === 'ArrowLeft') {
        // Dispatch custom event to navigate to previous verse
        const event = new CustomEvent('navigateVerse', {
          detail: { direction: 'previous' }
        });
        window.dispatchEvent(event);
        e.preventDefault();
      }
      // Right Arrow - go to next verse
      else if (e.key === 'ArrowRight') {
        // Dispatch custom event to navigate to next verse
        const event = new CustomEvent('navigateVerse', {
          detail: { direction: 'next' }
        });
        window.dispatchEvent(event);
        e.preventDefault();
      }
      // Enter key - read the currently selected verse
      else if (e.key === 'Enter') {
        // Dispatch custom event to read current verse
        const event = new CustomEvent('readCurrentVerse');
        window.dispatchEvent(event);
        e.preventDefault();
      }
      // Escape key - Home functionality (reset all scroll positions and state) + stop speech
      else if (e.key === 'Escape') {
        handleHomeReset();
        // Also stop any ongoing speech
        const event = new CustomEvent('stopSpeech');
        window.dispatchEvent(event);
        e.preventDefault();
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
          isViewingCrossRef,
          scrollSyncMode,
          stickyPane,
          isDarkMode,
          mobileScrollPosition: isMobileView ? chapterContentRef.current?.scrollTop || 0 : 0
        };
        localStorage.setItem('bibleReaderState', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn("Error saving state to localStorage:", e);
      }
    }
  }, [selectedBook, selectedChapter, selectedTranslation, primaryReading, isViewingCrossRef, scrollSyncMode, stickyPane, isDarkMode, isMobileView]);

  // Initialize Firebase database keys if they don't exist
  useEffect(() => {
    const initializeFirebaseKeys = async () => {
      try {
        // Define the keys we want to ensure exist
        const keyNames = ['1', '2', '3'];
        
        // Check and create keys if they don't exist
        for (const key of keyNames) {
          const keyRef = ref(database, `${theVocabDatabaseName}/${key}-position`);
          const snapshot = await get(keyRef);
          
          if (!snapshot.exists()) {
            // If key doesn't exist, initialize with empty object
            const initialData = JSON.stringify({
              bookAbbrev: 'gn',
              chapter: 1,
              translation: 'en_kjv.json',
              timestamp: Date.now(),
              stickyPane: 'kjv'
            });
            
            await set(keyRef, initialData);
            console.log(`Initialized Firebase key: ${key}-position`);
          }
        }
      } catch (error) {
        console.error('Error initializing Firebase keys:', error);
      }
    };

    initializeFirebaseKeys();
  }, []);

  // Helper function to setup scroll synchronization based on relative speeds and sticky pane
  const setupScrollSync = () => {
    const primaryPane = chapterContentRef.current;
    const kjvPane = kjvContentRef.current;
    
    // If either pane is missing, return a no-op cleanup function
    if (!primaryPane || !kjvPane) {
      return () => {}; // Return an empty function instead of false
    }
    
    // We're using the component-wide lastKjvScrollPos ref
    
    // Handler for when primary pane scrolls - controls KJV
    const handlePrimaryScroll = () => {
      if (isManuallyScrolling.current) return;
      
      // Calculate the amount scrolled
      const currentScrollPos = primaryPane.scrollTop;
      const scrollDelta = currentScrollPos - lastPrimaryScrollPos.current;
      
      // Update the last position for next time
      lastPrimaryScrollPos.current = currentScrollPos;
      
      // If there's no change or just initialization, don't adjust KJV pane
      if (scrollDelta === 0) return;
      
      // Apply scroll sync based on selected mode - different scroll speeds
      let adjustedDelta = scrollDelta;
      
      switch (scrollSyncMode) {
        case 'faster':
          // Make KJV pane scroll faster (1.5x speed)
          adjustedDelta = scrollDelta * 1.5;
          break;
        case 'slower':
          // Make KJV pane scroll slower (0.5x speed)
          // Use a smaller multiplier to make it clearly slower
          adjustedDelta = scrollDelta * 0.5;
          break;
        case 'exact':
        default:
          // Keep the same scroll delta (1x speed)
          adjustedDelta = scrollDelta;
          break;
      }
      
      isManuallyScrolling.current = true;
      
      // Apply the adjusted delta to the KJV pane
      kjvPane.scrollTop = Math.max(0, Math.min(
        kjvPane.scrollHeight - kjvPane.clientHeight,
        kjvPane.scrollTop + adjustedDelta
      ));
      
      // Update KJV last position after adjustment
      lastKjvScrollPos.current = kjvPane.scrollTop;
      
      // Reset after a short delay to prevent infinite scroll loops
      setTimeout(() => {
        isManuallyScrolling.current = false;
      }, 50);
    };
    
    // Handler for when KJV pane scrolls - controls primary pane
    const handleKjvScroll = () => {
      if (isManuallyScrolling.current) return;
      
      // Calculate the amount scrolled
      const currentScrollPos = kjvPane.scrollTop;
      const scrollDelta = currentScrollPos - lastKjvScrollPos.current;
      
      // Update the last position for next time
      lastKjvScrollPos.current = currentScrollPos;
      
      // If there's no change or just initialization, don't adjust primary pane
      if (scrollDelta === 0) return;
      
      // Apply scroll sync based on selected mode but in reverse
      let adjustedDelta = scrollDelta;
      
      switch (scrollSyncMode) {
        case 'faster':
          // If KJV is faster, primary needs to be slower (reciprocal)
          adjustedDelta = scrollDelta / 1.5;
          break;
        case 'slower':
          // If KJV is slower, primary needs to be faster (reciprocal)
          adjustedDelta = scrollDelta / 0.5; // Or scrollDelta * 2
          break;
        case 'exact':
        default:
          // Keep the same scroll delta (1x speed)
          adjustedDelta = scrollDelta;
          break;
      }
      
      isManuallyScrolling.current = true;
      
      // Apply the adjusted delta to the primary pane
      primaryPane.scrollTop = Math.max(0, Math.min(
        primaryPane.scrollHeight - primaryPane.clientHeight,
        primaryPane.scrollTop + adjustedDelta
      ));
      
      // Update primary last position after adjustment
      lastPrimaryScrollPos.current = primaryPane.scrollTop;
      
      // Reset after a short delay to prevent infinite scroll loops
      setTimeout(() => {
        isManuallyScrolling.current = false;
      }, 50);
    };
    
    // Remove any existing event listeners first
    primaryPane.removeEventListener('scroll', handlePrimaryScroll);
    kjvPane.removeEventListener('scroll', handleKjvScroll);
    
    // Add appropriate event listener based on which pane is sticky
    if (stickyPane === 'primary') {
      // Primary pane controls KJV
      primaryPane.addEventListener('scroll', handlePrimaryScroll);
    } else if (stickyPane === 'kjv') {
      // KJV pane controls primary
      kjvPane.addEventListener('scroll', handleKjvScroll);
    }
    
    // Return a cleanup function
    return () => {
      // Check if panes still exist before attempting to remove listeners
      if (primaryPane) {
        try {
          primaryPane.removeEventListener('scroll', handlePrimaryScroll);
        } catch (e) {
          console.log("Cleanup error (can be ignored):", e.message);
        }
      }
      
      if (kjvPane) {
        try {
          kjvPane.removeEventListener('scroll', handleKjvScroll);
        } catch (e) {
          console.log("Cleanup error (can be ignored):", e.message);
        }
      }
    };
  };

  // Touch scroll functions
  const handleTouchPageDown = useCallback((scrollAmount = 0.9) => {
    if (!kjvContentRef.current) return;
    
    const pageHeight = kjvContentRef.current.clientHeight * scrollAmount;
    isManuallyScrolling.current = true;

    try {
      const kjvPane = kjvContentRef.current;
      const kjvNewPosition = kjvPane.scrollTop + pageHeight;
      const kjvMaxScroll = kjvPane.scrollHeight - kjvPane.clientHeight;
      kjvPane.scrollTop = Math.min(kjvMaxScroll, kjvNewPosition);

      if (!isMobileView && chapterContentRef.current) {
        const primaryPane = chapterContentRef.current;
        const newKjvScrollPercentage = kjvPane.scrollTop / (kjvPane.scrollHeight - kjvPane.clientHeight || 1);
        primaryPane.scrollTop = newKjvScrollPercentage * (primaryPane.scrollHeight - primaryPane.clientHeight || 1);
        lastPrimaryScrollPos.current = primaryPane.scrollTop;
      }

      if (isMobileView) {
        localStorage.setItem('mobileScrollPosition', chapterContentRef.current?.scrollTop.toString() || '0');
        setMobileScrollPosition(chapterContentRef.current?.scrollTop || 0);
      }
    } finally {
      setTimeout(() => {
        isManuallyScrolling.current = false;
      }, 50);
    }
  }, [isMobileView, setMobileScrollPosition]);

  const handlePaneClick = useCallback((event, pane) => {
    // Don't trigger scroll if clicking on a button or interactive element
    if (event.target.tagName === 'BUTTON' || 
        event.target.closest('button') ||
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'SELECT' ||
        event.target.tagName === 'A' ||
        event.target.closest('a')) {
      return;
    }

    if (touchScrollMode === 'disabled') return;
    
    if (touchScrollMode === 'right-only' && pane === 'left') return;
    
    const scrollAmount = touchScrollMode === 'right-reduced' && pane === 'right' ? 0.5 : 0.9;
    handleTouchPageDown(scrollAmount);
  }, [touchScrollMode, handleTouchPageDown]);

  // Centralized Home function to reset all scroll positions and state
  const handleHomeReset = useCallback(() => {
    // Reset scroll positions for both panes
    if (chapterContentRef.current) {
      chapterContentRef.current.scrollTop = 0;
    }
    if (kjvContentRef.current) {
      kjvContentRef.current.scrollTop = 0;
    }
    
    // Reset mobile scroll position state and localStorage
    if (isMobileView) {
      localStorage.setItem('mobileScrollPosition', '0');
      setMobileScrollPosition(0);
    }
    
    // Reset scroll sync tracking variables
    lastPrimaryScrollPos.current = 0;
    lastKjvScrollPos.current = 0;
    scrollSyncInitialized.current = false;
    
    // Reset manual scrolling flag
    isManuallyScrolling.current = false;
  }, [isMobileView, setMobileScrollPosition]);

  // Load Bible data and cross-references on component mount
  useEffect(() => {
    // Reset the Next Chapter click counter when the component mounts
    setNextChapterClickCount(0);
    
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
        
        // Load right pane Bible data (either KJV or BBE based on rightPaneTranslation)
        try {
          console.log(`Loading right pane Bible data (${rightPaneTranslation}) for the second panel`);
          const rightPaneResponse = await fetch(`${baseUrl}/${rightPaneTranslation}`);
          
          if (!rightPaneResponse.ok) {
            // Try API endpoint as fallback
            const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : baseUrl;
            const rightPaneApiResponse = await fetch(`${apiBaseUrl}/api/json/${rightPaneTranslation}`);
            
            if (!rightPaneApiResponse.ok) {
              throw new Error(`Failed to load right pane Bible data (${rightPaneTranslation})`);
            }
            
            const rightPaneData = await rightPaneApiResponse.json();
            setRightPaneBibleData(rightPaneData);
          } else {
            const rightPaneData = await rightPaneResponse.json();
            setRightPaneBibleData(rightPaneData);
          }
        } catch (rightPaneError) {
          console.error(`Failed to load right pane Bible data (${rightPaneTranslation}):`, rightPaneError);
          // Use the current Bible data as fallback if the translations match
          if (selectedTranslation === rightPaneTranslation) {
            setRightPaneBibleData(bibleData);
          } else {
            // Try to use KJV as a fallback
            try {
              const fallbackResponse = await fetch(`${baseUrl}/en_kjv.json`);
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                setRightPaneBibleData(fallbackData);
              }
            } catch (fallbackError) {
              console.error("Failed to load fallback right pane data:", fallbackError);
            }
          }
        }
        
        // Load saved reading position from localStorage or default to Genesis
        let savedBook = null;
        let savedChapter = 1;
        let savedTranslation = selectedTranslation;
        let savedScrollSyncMode = scrollSyncMode;
        
        // Try to load saved state from localStorage
        try {
          const savedState = localStorage.getItem('bibleReaderState');
          if (savedState) {
            const parsedState = JSON.parse(savedState);
            savedTranslation = parsedState.translation || selectedTranslation;
            
            // Restore scroll sync mode if available
            if (parsedState.scrollSyncMode) {
              savedScrollSyncMode = parsedState.scrollSyncMode;
              setScrollSyncMode(savedScrollSyncMode);
            }
            
            // Always use KJV as the sticky pane
            setStickyPane('kjv');
            
            // Restore dark mode setting if available
            if (parsedState.isDarkMode !== undefined) {
              setIsDarkMode(parsedState.isDarkMode);
            }
            
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
        
        // Reset the scroll sync initialized flag
        scrollSyncInitialized.current = false;
        
        // In mobile view, restore the scroll position from our dedicated localStorage item
        // But only restore scroll if we're not just changing chapters with Next Chapter button
        if (isMobileView && chapterContentRef?.current) {
          try {
            // Explicitly get the stored scroll position from localStorage
            const storedScrollPosition = localStorage.getItem('mobileScrollPosition');
            
            // Next Chapter button navigation will have already cleared this,
            // so it will only restore position when toggling translations or coming back to the app
            if (storedScrollPosition && parseInt(storedScrollPosition) > 0) {
              const scrollPosition = parseInt(storedScrollPosition);
              console.log("Found stored mobile scroll position:", scrollPosition);
              
              // Use a series of attempts to restore the scroll position
              // This improves reliability across different devices
              const restoreScroll = (attempts = 0) => {
                if (attempts >= 10) return; // Stop after 10 attempts
                
                setTimeout(() => {
                  // Additional safety check to ensure ref is still valid
                  if (chapterContentRef?.current) {
                    console.log(`Attempt ${attempts+1} to restore scroll to ${scrollPosition}`);
                    chapterContentRef.current.scrollTop = scrollPosition;
                    
                    // If we're not at the right position yet, try again
                    if (Math.abs(chapterContentRef.current.scrollTop - scrollPosition) > 10) {
                      restoreScroll(attempts + 1);
                    } else {
                      console.log("Successfully restored scroll position");
                      // Update ref for scroll sync if it exists
                      if (lastPrimaryScrollPos) {
                        lastPrimaryScrollPos.current = scrollPosition;
                      }
                    }
                  }
                }, 100 * (attempts + 1)); // Increasing delays: 100ms, 200ms, 300ms, etc.
              };
              
              // Start the restoration attempts
              restoreScroll();
            }
          } catch (e) {
            console.warn("Error restoring mobile scroll position:", e);
          }
        }
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
  }, [selectedTranslation, rightPaneTranslation]);
  
  // Setup scroll synchronization when content, mode, or sticky pane changes
  useEffect(() => {
    if (!loading && selectedBook) {
      // Ensure last scroll positions are reset
      lastPrimaryScrollPos.current = chapterContentRef.current?.scrollTop || 0;
      lastKjvScrollPos.current = kjvContentRef.current?.scrollTop || 0;
      
      // Setup the scroll sync - the returned cleanup function might be undefined
      const cleanup = setupScrollSync();
      
      // Return a valid cleanup function that safely handles undefined
      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBook, selectedChapter, selectedTranslation, scrollSyncMode, stickyPane, loading]);
  
  // Additional effect to ensure scroll sync is initialized after everything is loaded and rendered
  useEffect(() => {
    // Only run this once after loading is complete
    if (!loading && !scrollSyncInitialized.current) {
      // Use a short delay to ensure everything is properly rendered
      const timer = setTimeout(() => {
        // Reset last scroll positions to current
        if (chapterContentRef.current) {
          lastPrimaryScrollPos.current = chapterContentRef.current.scrollTop;
        }
        if (kjvContentRef.current) {
          lastKjvScrollPos.current = kjvContentRef.current.scrollTop;
        }
        
        const cleanup = setupScrollSync();
        scrollSyncInitialized.current = true;
        console.log("Scroll sync initialized");
        
        // Store the cleanup function to be called when the component unmounts
        return () => {
          if (typeof cleanup === 'function') {
            cleanup();
          }
        };
      }, 500);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Handle scroll sync mode change
  const handleScrollSyncModeChange = (mode) => {
    setScrollSyncMode(mode);
    // Force re-initialization of scroll sync
    scrollSyncInitialized.current = false;
    
    // Reset the last scroll positions to prevent jumps when changing modes
    if (chapterContentRef.current) {
      lastPrimaryScrollPos.current = chapterContentRef.current.scrollTop;
    }
    
    if (kjvContentRef.current) {
      lastKjvScrollPos.current = kjvContentRef.current.scrollTop;  
    }
    
    // Store any previous cleanup function
    let cleanupFunction;
    
    // Re-initialize immediately
    try {
      cleanupFunction = setupScrollSync();
    } catch (e) {
      console.log("Error setting up scroll sync:", e);
    }
    
    // Return cleanup function for component unmount
    return () => {
      if (typeof cleanupFunction === 'function') {
        try {
          cleanupFunction();
        } catch (e) {
          console.log("Cleanup error in mode change (can be ignored):", e.message);
        }
      }
    };
  };
  
  // Handle sticky pane change
  const handleStickyPaneChange = (paneType) => {
    setStickyPane(paneType);
    // Force re-initialization of scroll sync
    scrollSyncInitialized.current = false;
    
    // Reset the last scroll positions to prevent jumps when changing sticky pane
    if (chapterContentRef.current) {
      lastPrimaryScrollPos.current = chapterContentRef.current.scrollTop;
    }
    
    if (kjvContentRef.current) {
      lastKjvScrollPos.current = kjvContentRef.current.scrollTop;
    }
    
    // Store any previous cleanup function
    let cleanupFunction;
    
    // Re-initialize immediately
    try {
      cleanupFunction = setupScrollSync();
    } catch (e) {
      console.log("Error setting up scroll sync:", e);
    }
    
    // Return cleanup function for component unmount
    return () => {
      if (typeof cleanupFunction === 'function') {
        try {
          cleanupFunction();
        } catch (e) {
          console.log("Cleanup error in sticky pane change (can be ignored):", e.message);
        }
      }
    };
  };
  
  // Handle MP3 audio button click
  const handleAudioButtonClick = () => {
    if (!selectedBook) return;
    
    // Get the audio URL for the current book and chapter
    const audioUrl = getAudioUrl(selectedBook.abbrev, selectedChapter);
    
    // Open the audio in a new window
    window.open(audioUrl, '_blank');
  };
  
  // Handle clipboard button click to copy VLC command
  const handleClipboardButtonClick = () => {
    if (!selectedBook) return;
    
    // Get the VLC command text for the current book and chapter
    const clipText = getClipUrl(selectedBook.abbrev, selectedChapter);
    
    // Copy to clipboard using the Clipboard API
    navigator.clipboard.writeText(clipText)
      .then(() => {
        // Show a temporary tooltip or notification
        alert(`Copied to clipboard: ${clipText}`);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard. ' + err);
      });
  };
  
  // Toggle between dark and light mode
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

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
      
      // Reset scroll sync state
      lastPrimaryScrollPos.current = 0;
      scrollSyncInitialized.current = false;
    }
  };

  // Handle chapter selection
  const handleChapterSelect = (chapterNum, fromNextChapterButton = false) => {
    setSelectedChapter(chapterNum);
    setShowCrossRef(null); // Hide any cross-reference popup

    // No need to reset auto-scroll timer here - will be handled in NavigationPlaceholder component

    // Handle Next Chapter button click counting and auto-save
    if (fromNextChapterButton) {
      const newCount = nextChapterClickCount + 1;
      setNextChapterClickCount(newCount);
      
      // If this is the second click, trigger auto-save without resetting counter
      if (newCount >= 2) {
        try {
          console.log(`Auto-saving to position ${autoSavePosition}`);

          // Direct save using the Firebase save function
          // Create position data object
          const positionData = JSON.stringify({
            bookAbbrev: selectedBook?.abbrev,
            chapter: chapterNum, // Use the new chapter we're navigating to
            translation: selectedTranslation,
            timestamp: Date.now(),
            stickyPane: stickyPane
          });

          // Call the save function directly with the selected position
          handleFirebasePositionSave(`${autoSavePosition}-position`, positionData);
        } catch (error) {
          console.error("Error during auto-save:", error);
        }
        // Note: Counter is not reset here - it will only reset on page load
      }
    }
    
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
    
    // When navigating between chapters, we want to start at the top of the page
    // Only clear this if coming from the Next Chapter button
    if (fromNextChapterButton) {
      localStorage.removeItem('mobileScrollPosition');
      setMobileScrollPosition(0);
    }
    
    // Reset scroll sync state
    lastPrimaryScrollPos.current = 0;
    scrollSyncInitialized.current = false;
  };
  
  // Apply selected translation from dropdown to the secondary pane (pane 2)
  const handleApplySelectedTranslationToPane2 = (translationValue) => {
    // Save current scroll position of right pane
    let currentScroll = 0;
    if (kjvContentRef?.current) {
      try {
        currentScroll = kjvContentRef.current.scrollTop || 0;
        console.log("Saving right pane scroll position before changing translation:", currentScroll);
      } catch (e) {
        console.warn("Error getting right pane scroll position:", e);
      }
    }
    
    // Update the saved state with the new right pane translation but preserve position
    try {
      const savedState = localStorage.getItem('bibleReaderState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Add right pane translation to saved state
        parsedState.rightPaneTranslation = translationValue;
        
        localStorage.setItem('bibleReaderState', JSON.stringify(parsedState));
      }
    } catch (e) {
      console.warn("Error updating bibleReaderState in localStorage:", e);
    }
    
    // Update right pane translation
    setRightPaneTranslation(translationValue);
    
    // Log the change action for debugging
    console.log(`Changed right pane translation to ${translationValue}`);
    
    // Restore scroll position after a longer delay to allow render and content loading
    setTimeout(() => {
      if (kjvContentRef?.current) {
        try {
          // Calculate relative scroll position (percentage)
          const rightPaneHeight = kjvContentRef.current.scrollHeight;
          const relativeScrollPercentage = rightPaneHeight > 0 ? (currentScroll / rightPaneHeight) : 0;
          
          // Apply the same percentage to the new content
          const newScrollPosition = kjvContentRef.current.scrollHeight * relativeScrollPercentage;
          kjvContentRef.current.scrollTop = newScrollPosition;
          
          console.log("Restored right pane scroll to relative position:", relativeScrollPercentage, "actual position:", newScrollPosition);
          
          // Double-check scroll position after a bit more time to ensure content is fully loaded
          setTimeout(() => {
            if (kjvContentRef?.current && kjvContentRef.current.scrollHeight > 0) {
              // Apply the percentage again to make sure it stuck
              const finalScrollPosition = kjvContentRef.current.scrollHeight * relativeScrollPercentage;
              if (Math.abs(kjvContentRef.current.scrollTop - finalScrollPosition) > 10) {
                // Only adjust if significantly different
                kjvContentRef.current.scrollTop = finalScrollPosition;
                console.log("Re-applied scroll position to ensure accuracy:", finalScrollPosition);
              }
            }
          }, 300);
        } catch (e) {
          console.warn("Error restoring right pane scroll position:", e);
        }
      }
    }, 200);
  };
  
  // Apply selected translation from dropdown to the primary pane
  const handleApplySelectedTranslationToPane1 = (translationValue) => {
    // Save current scroll position of primary pane
    let currentScroll = 0;
    if (chapterContentRef?.current) {
      try {
        currentScroll = chapterContentRef.current.scrollTop || 0;
        console.log("Saving primary pane scroll position before changing translation:", currentScroll);
      } catch (e) {
        console.warn("Error getting primary pane scroll position:", e);
      }
    }
    
    // Update the saved state with the new primary pane translation but preserve position
    try {
      const savedState = localStorage.getItem('bibleReaderState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Update primary pane translation in saved state
        parsedState.translation = translationValue;
        
        localStorage.setItem('bibleReaderState', JSON.stringify(parsedState));
      }
    } catch (e) {
      console.warn("Error updating bibleReaderState in localStorage:", e);
    }
    
    // Update primary pane translation
    setSelectedTranslation(translationValue);
    
    // Log the change action for debugging
    console.log(`Changed primary pane translation to ${translationValue}`);
    
    // Restore scroll position after a short delay to allow render
    setTimeout(() => {
      if (chapterContentRef?.current) {
        try {
          // Calculate relative scroll position (percentage)
          const primaryPaneHeight = chapterContentRef.current.scrollHeight;
          const relativeScrollPercentage = primaryPaneHeight > 0 ? (currentScroll / primaryPaneHeight) : 0;
          
          // Apply the same percentage to the new content
          const newScrollPosition = chapterContentRef.current.scrollHeight * relativeScrollPercentage;
          chapterContentRef.current.scrollTop = newScrollPosition;
          
          console.log("Restored primary pane scroll to relative position:", relativeScrollPercentage, "actual position:", newScrollPosition);
        } catch (e) {
          console.warn("Error restoring primary pane scroll position:", e);
        }
      }
    }, 100);
  };
  
  // This is now only used to update the visual selection in the dropdown
  // The actual translation change happens in handleApplySelectedTranslationToPane1
  const handleTranslationChange = (e) => {
    // Just update the dropdown value without changing the actual translation
    const value = e.target.value;
    console.log("Dropdown selection changed to:", value);
    setSelectedDropdownTranslation(value);
    // The actual translation change will happen when the user clicks the "Apply" button
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
        
        // Reset scroll sync state
        if (chapterContentRef.current) {
          lastPrimaryScrollPos.current = chapterContentRef.current.scrollTop;
        }
      }, 300);
      
      scrollSyncInitialized.current = false;
    }
  };

  // Handle selecting a position from Firebase
  const handleFirebasePositionSelect = async (key) => {
    if (!key) {
      console.warn('Position select aborted: No position key selected');
      return;
    }

    try {
      setFirebaseLoading(true);
      
      // Get the reference to the specific position
      const positionRef = ref(database, `${theVocabDatabaseName}/${key}`);
      const snapshot = await get(positionRef);
      
      if (snapshot.exists()) {
        // Parse the position data
        const positionData = JSON.parse(snapshot.val());
        
        if (positionData && positionData.bookAbbrev) {
          // Find the book in Bible data
          const book = bibleData.find(b => b.abbrev === positionData.bookAbbrev);
          
          if (book) {
            // Keep the current translation - that's the main change
            const currentTranslation = selectedTranslation;
            
            // Update selected book and chapter
            setSelectedBook(book);
            setSelectedChapter(positionData.chapter || 1);
            setPrimaryReading({
              book: book,
              chapter: positionData.chapter || 1
            });
            setIsViewingCrossRef(false);
            
            // Update the stored state with current translation
            try {
              const stateToSave = {
                bookAbbrev: positionData.bookAbbrev,
                chapter: positionData.chapter || 1,
                translation: currentTranslation, // Keep current translation
                primaryReading: {
                  bookAbbrev: positionData.bookAbbrev,
                  chapter: positionData.chapter || 1
                },
                isViewingCrossRef: false,
                scrollSyncMode,
                stickyPane
              };
              localStorage.setItem('bibleReaderState', JSON.stringify(stateToSave));
            } catch (e) {
              console.warn("Error updating state in localStorage:", e);
            }
            
            // Scroll both panels to top
            if (chapterContentRef.current) {
              chapterContentRef.current.scrollTop = 0;
            }
            if (kjvContentRef.current) {
              kjvContentRef.current.scrollTop = 0;
            }
            
            // Reset scroll sync state
            lastPrimaryScrollPos.current = 0;
            scrollSyncInitialized.current = false;
            
            // Log success message instead of showing alert
            console.log(`Position loaded: ${getBookName(positionData.bookAbbrev)} ${positionData.chapter || 1}`);
          } else {
            console.warn(`Book '${positionData.bookAbbrev}' not found in the current Bible data.`);
          }
        } else {
          console.warn('Invalid position data format.');
        }
      } else {
        console.warn('No position data found for the selected key.');
      }
      
      setFirebaseLoading(false);
    } catch (error) {
      console.error('Error loading position from Firebase:', error);
      console.warn(`Error loading position: ${error.message}`);
      setFirebaseLoading(false);
    }
  };

  // Handle saving a position to Firebase
  const handleFirebasePositionSave = async (key, positionData) => {
    if (!key) {
      console.warn('Save aborted: No position key selected');
      return;
    }

    try {
      setFirebaseLoading(true);
      
      // Get the reference to the specific position
      const positionRef = ref(database, `${theVocabDatabaseName}/${key}`);
      
      // Save the position data
      await set(positionRef, positionData);
      
      // Log success instead of showing alert
      console.log(`Position saved to key ${key.split('-')[0]}`);
      setFirebaseLoading(false);
    } catch (error) {
      console.error('Error saving position to Firebase:', error);
      setFirebaseLoading(false);
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
  
  // Get the BibleGateway audio URL for a given book and chapter
  const getAudioUrl = (bookAbbrev, chapter) => {
    // Map from our book abbreviations to BibleGateway format
    const bgAbbrevMap = {
      'gn': 'Gen',
      'ex': 'Exod',
      'lv': 'Lev',
      'nm': 'Num',
      'dt': 'Deut',
      'js': 'Josh',
      'jud': 'Judg',
      'rt': 'Ruth',
      '1sm': '1Sam',
      '2sm': '2Sam',
      '1kgs': '1Kgs',
      '2kgs': '2Kgs',
      '1ch': '1Chr',
      '2ch': '2Chr',
      'ezr': 'Ezra',
      'ne': 'Neh',
      'et': 'Esth',
      'job': 'Job',
      'ps': 'Ps',
      'prv': 'Prov',
      'ec': 'Eccl',
      'so': 'Song',
      'is': 'Isa',
      'jr': 'Jer',
      'lm': 'Lam',
      'ez': 'Ezek',
      'dn': 'Dan',
      'ho': 'Hos',
      'jl': 'Joel',
      'am': 'Amos',
      'ob': 'Obad',
      'jn': 'Jonah',
      'mi': 'Mic',
      'na': 'Nah',
      'hk': 'Hab',
      'zp': 'Zeph',
      'hg': 'Hag',
      'zc': 'Zech',
      'ml': 'Mal',
      'mt': 'Matt',
      'mk': 'Mark',
      'lk': 'Luke',
      'jo': 'John',
      'act': 'Acts',
      'rm': 'Rom',
      '1co': '1Cor',
      '2co': '2Cor',
      'gl': 'Gal',
      'eph': 'Eph',
      'ph': 'Phil',
      'cl': 'Col',
      '1ts': '1Thess',
      '2ts': '2Thess',
      '1tm': '1Tim',
      '2tm': '2Tim',
      'tt': 'Titus',
      'phm': 'Phlm',
      'hb': 'Heb',
      'jm': 'Jas',
      '1pe': '1Pet',
      '2pe': '2Pet',
      '1jo': '1John',
      '2jo': '2John',
      '3jo': '3John',
      'jd': 'Jude',
      're': 'Rev'
    };
    
    // Get the BibleGateway abbreviation
    const bgAbbrev = bgAbbrevMap[bookAbbrev] || bookAbbrev;
    
    // Construct the URL
    return `https://www.biblegateway.com/audio/mclean/kjv/${bgAbbrev}.${chapter}`;
  };
  
  // Get chapter text to send to the clipboard for a given book and chapter
  const getClipUrl = (bookAbbrev, chapter) => {
    // Map from our book abbreviations to full book names
    const bgAbbrevMapForMp3 = {
      'gn': 'Genesis',
      'ex': 'Exodus',
      'lv': 'Leviticus',
      'nm': 'Numbers',
      'dt': 'Deuteronomy',
      'js': 'Joshua',
      'jud': 'Judges',
      'rt': 'Ruth',
      '1sm': '1Samuel',
      '2sm': '2Samuel',
      '1kgs': '1Kings',
      '2kgs': '2Kings',
      '1ch': '1Chronicles',
      '2ch': '2Chronicles',
      'ezr': 'Ezra',
      'ne': 'Nehemiah',
      'et': 'Esther',
      'job': 'Job',
      'ps': 'Psalms',
      'prv': 'Proverbs',
      'ec': 'Ecclesiastes',
      'so': 'Song',
      'is': 'Isaiah',
      'jr': 'Jeremiah',
      'lm': 'Lamentations',
      'ez': 'Ezekiel',
      'dn': 'Daniel',
      'ho': 'Hosea',
      'jl': 'Joel',
      'am': 'Amos',
      'ob': 'Obadiah',
      'jn': 'Jonah',
      'mi': 'Micah',
      'na': 'Nahum',
      'hk': 'Habakkuk',
      'zp': 'Zephaniah',
      'hg': 'Haggai',
      'zc': 'Zechariah',
      'ml': 'Malachi',
      'mt': 'Matthew',
      'mk': 'Mark',
      'lk': 'Luke',
      'jo': 'John',
      'act': 'Acts',
      'rm': 'Romans',
      '1co': '1Corinthians',
      '2co': '2Corinthians',
      'gl': 'Galatians',
      'eph': 'Ephesians',
      'ph': 'Philippians',
      'cl': 'Colossians',
      '1ts': '1Thessalonians',
      '2ts': '2Thessalonians',
      '1tm': '1Timothy',
      '2tm': '2Timothy',
      'tt': 'Titus',
      'phm': 'Philemon',
      'hb': 'Hebrews',
      'jm': 'James',
      '1pe': '1Peter',
      '2pe': '2Peter',
      '1jo': '1John',
      '2jo': '2John',
      '3jo': '3John',
      'jd': 'Jude',
      're': 'Revelation'
    };
    
    // Get the full book name
    const bookName = bgAbbrevMapForMp3[bookAbbrev] || bookAbbrev;
    
    // Construct the clipboard text in the format "Open_VLC BookName/BookNameChapter.mp3"
    return `Open_VLC ${bookName}/${bookName}${chapter}.mp3`;
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
      're': 'Revelation',
      // Add mapping for Hebrew Bible abbrevs
      'ge': 'Genesis'
    };
    
    return bookNames[abbrev] || abbrev;
  };

  // Map Hebrew book abbreviations to KJV abbreviations
  const getKjvBookAbbrev = (hebrewAbbrev) => {
    const abbrevMap = {
      'ge': 'gn',
      // Add mappings for other books as needed
    };
    
    return abbrevMap[hebrewAbbrev] || hebrewAbbrev;
  };
  
  // Manually initialize scroll sync if not done yet
  if (!scrollSyncInitialized.current && !loading && chapterContentRef.current && kjvContentRef.current) {
    // Use a small timeout to ensure the DOM is fully rendered
    setTimeout(() => {
      // Initialize the last scroll position
      lastPrimaryScrollPos.current = chapterContentRef.current.scrollTop;
      
      setupScrollSync();
      scrollSyncInitialized.current = true;
      console.log("Scroll sync initialized");
    }, 100);
  }

  // Main render
  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
      {/* Book Selection Sidebar - Hidden on Mobile and Tablet */}
      {showSidebar && (
        <div className={`${isMobileView || isTabletView ? 'absolute z-10 h-full' : 'w-80'} ${isDarkMode ? 'bg-gray-800 text-white border-r border-gray-700' : 'bg-white border-r border-gray-200'} overflow-y-auto`}>
          <div className="p-2 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center">
              <Book className="mr-1 h-4 w-4" />
              Bible Books
            </h2>
            {/* Allow hiding sidebar in all views */}
            <button 
              onClick={() => setShowSidebar(false)}
              className="p-1 rounded-full hover:bg-gray-200 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto h-full">
            {bibleData && bibleData.map(book => (
              <button
                key={book.abbrev}
                onClick={() => {
                  handleBookSelect(book.abbrev);
                  // Always close sidebar after book selection
                  setShowSidebar(false);
                }}
                className={`w-full text-left px-6 py-3 hover:bg-gray-100 text-xl ${
                  selectedBook && selectedBook.abbrev === book.abbrev ? 'bg-blue-100 font-medium' : ''
                }`}
              >
                {book.book || getBookName(book.abbrev)}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Navigation and Chapter Selection */}
        <div className={`${isDarkMode ? 'bg-gray-800 text-white border-b border-gray-700' : 'bg-white border-b border-gray-200'} p-1 flex flex-wrap items-center justify-between`}>
          <div className="flex items-center space-x-2">
            {/* Sidebar toggle button for mobile, tablet and full screen */}
            {!showSidebar && (
              <button 
                onClick={() => setShowSidebar(true)} 
                className="flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-bold ml-2">
              {selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : 'Select a Book'}
            </h1>
            
            {selectedBook && (
              <div className="flex items-center">
                <span className="mr-1 text-sm">Ch:</span>
                <select 
                  value={selectedChapter}
                  onChange={(e) => handleChapterSelect(parseInt(e.target.value))}
                  className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'} rounded px-1 py-0 text-sm w-12`}
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
                value={selectedDropdownTranslation}
                onChange={handleTranslationChange}
                className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'} rounded px-2 py-1 text-sm max-w-xs`}
                style={{ width: "auto" }}
                id="translationSelector"
              >
                {translations.map(translation => (
                  <option key={translation.id} value={translation.id}>
                    {translation.name}
                  </option>
                ))}
              </select>
              
              {/* Load selected translation for pane 1 */}
              <button
                onClick={() => {
                  handleApplySelectedTranslationToPane1(selectedDropdownTranslation);
                }}
                className={`ml-2 flex items-center px-2 py-1 text-sm ${isDarkMode ? 'bg-indigo-700' : 'bg-indigo-500'} text-white rounded hover:bg-indigo-600 transition-colors`}
                title="Apply selected translation to primary pane"
              >
                <span className="flex items-center">
                  <BookOpen className="h-3 w-3" />
                  <span className="text-xs font-bold ml-0.5 mr-1">1</span>
                </span>
                Apply
              </button>

              {/* Load selected translation for pane 2 (for read) */}
              <button
                onClick={() => {
                  handleApplySelectedTranslationToPane2(selectedDropdownTranslation);
                }}
                className={`ml-2 flex items-center px-2 py-1 text-sm ${isDarkMode ? 'bg-purple-700' : 'bg-purple-500'} text-white rounded hover:bg-purple-600 transition-colors`}
                title="Apply selected translation to secondary pane"
              >
                <span className="flex items-center">
                  <BookOpen className="h-3 w-3" />
                  <span className="text-xs font-bold ml-0.5 mr-1">2</span>
                </span>
                Apply (for read)
              </button>
            </div>
          </div>
          
          {/* Firebase Position Controls */}
          <div className="flex items-center mr-2">
            <FirebaseKeySelector
              onSelect={handleFirebasePositionSelect}
              onSave={handleFirebasePositionSave}
              currentBook={selectedBook}
              currentChapter={selectedChapter}
              currentTranslation={selectedTranslation}
              onApplyTranslationToPane1={handleApplySelectedTranslationToPane1}
              onApplyTranslationToPane2={handleApplySelectedTranslationToPane2}
              selectedDropdownTranslation={selectedDropdownTranslation}
              isMobileView={isMobileView}
              isTabletView={isTabletView}
              stickyPane={stickyPane}
              isDarkMode={isDarkMode}
              autoSavePosition={autoSavePosition}
              onAutoSavePositionChange={setAutoSavePosition}
              onNextChapter={handleChapterSelect}
              bibleData={bibleData}
              setSelectedBook={setSelectedBook}
              firebaseEnabled={firebaseEnabled}
              onFirebaseToggle={setFirebaseEnabled}
            />
          </div>
          
          {/* Navigation History / Breadcrumb */}
          <div className="flex items-center space-x-1 mr-2">
            <NavigationPlaceholder 
              book={primaryReading.book} 
              chapter={primaryReading.chapter}
              getBookName={getBookName}
              syncMode={scrollSyncMode}
              onSyncModeChange={handleScrollSyncModeChange}
              stickyPane={stickyPane}
              onStickyPaneChange={handleStickyPaneChange}
              onAudioClick={handleAudioButtonClick}
              onClipboardClick={handleClipboardButtonClick}
              onDarkModeToggle={toggleDarkMode}
              isDarkMode={isDarkMode}
              touchScrollMode={touchScrollMode}
              onTouchScrollModeChange={setTouchScrollMode}
              touchScrollModes={touchScrollModes}
              rightPaneBibleData={rightPaneBibleData}
              rightPaneTranslation={rightPaneTranslation}
              resetScrollTimerRef={resetScrollTimerRef}
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
                    // Reset scroll sync initialization flag
                    lastPrimaryScrollPos.current = 0;
                    scrollSyncInitialized.current = false;
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
                    // Reset scroll sync initialization flag
                    lastPrimaryScrollPos.current = 0;
                    scrollSyncInitialized.current = false;
                  }
                }}
                className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-xs"
              >
                Return
              </button>
            )}
          </div>
        </div>
        
        {/* Bible Text and KJV Split View - Responsive layout for different devices */}
        <div className="flex-1 flex overflow-hidden">
          {/* Bible Text Display */}
          <div 
            ref={chapterContentRef} 
            className={`${isMobileView && !isTabletView && showKJVOnMobile ? 'hidden' : isMobileView && !isTabletView ? 'w-full' : isTabletView ? 'w-1/2' : 'w-1/2'} overflow-y-auto p-4 md:p-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white'} relative`}
            onClick={(event) => handlePaneClick(event, 'left')}
            style={{ cursor: touchScrollMode !== 'disabled' && touchScrollMode === 'both-panes' ? 'pointer' : 'default' }}
          >
            {selectedBook && selectedChapter > 0 && (
              <div>
                <h2 className="text-3xl font-semibold flex items-center mb-5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open mr-3 h-8 w-8">
                    <path d="M12 7v14"></path>
                    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                  </svg>
                  
                  {isMobileView && !isTabletView && !showKJVOnMobile && (
                    <button 
                      onClick={() => {
                        setShowKJVOnMobile(true);
                        // Save preference
                        localStorage.setItem('mobilePanePreference', 'pane2');
                      }}
                      className="ml-3 px-3 py-1 text-sm bg-blue-500 text-white rounded-md shadow-sm"
                    >
                      Show Pane 2
                    </button>
                  )}
                  {selectedBook.book || getBookName(selectedBook.abbrev)} {selectedChapter}
                  {selectedTranslation !== 'en_kjv.json' && (
                    <span className="ml-2 text-gray-500">
                      ({getTranslationShortName(selectedTranslation)})
                    </span>
                  )}
                  <a href="https://cdpn.io/pen/debug/OPJBXKj" target="_blank" rel="noopener noreferrer" className="ml-3 text-blue-500 hover:text-blue-700">
                    <Link className="h-6 w-6" />
                  </a>
                  <span className="ml-3 px-2 py-1 rounded text-xs bg-blue-50 text-blue-800">
                    Exact Sync
                  </span>
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
                          hasReference 
                            ? isDarkMode ? 'hover:bg-blue-900' : 'hover:bg-blue-50' 
                            : ''
                        }`}
                      >
                        <p className="flex">
                          <span className={`font-bold mr-4 text-2xl ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{verseNumber}</span>
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
                          <div className={`mt-4 p-5 rounded-md shadow-sm ${
                            isDarkMode 
                              ? 'bg-blue-900 border border-blue-700' 
                              : 'bg-blue-50 border border-blue-200'
                          }`}>
                            <h4 className="font-medium mb-4 text-2xl">Cross References:</h4>
                            <ul className="space-y-4">
                              {crossReferences[refKey].map((ref, i) => (
                                <li key={i} className="text-xl">
                                  <button 
                                    onClick={() => handleCrossRefNavigate(ref)}
                                    className={`font-medium ${
                                      isDarkMode 
                                        ? 'text-blue-300 hover:text-blue-200' 
                                        : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                  >
                                    {getBookName(ref.book)} {ref.chapter}:{ref.verse}
                                  </button>
                                  <p className={`mt-2 ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                  }`}>{ref.text}</p>
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
                        handleChapterSelect(selectedChapter - 1, true);
                        // Reset all scroll state immediately
                        handleHomeReset();
                      }}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                    >
                      &lt; Previous Chapter (z)
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {/* Home button to scroll to top */}
                  <button
                    onClick={handleHomeReset}
                    className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                  >
                    Home (esc)
                  </button>

                  {selectedBook && selectedChapter < selectedBook.chapters.length && (
                    <button
                      onClick={() => {
                        handleChapterSelect(selectedChapter + 1, true);
                        // Sync KJV panel scroll with primary panel
                        if (kjvContentRef.current) {
                          setTimeout(() => {
                            kjvContentRef.current.scrollTop = 0;
                          }, 100);
                        }
                      }}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                    >
                      Next Chapter (m,;) &gt;
                    </button>
                  )}
                  
                </div>
              </div>
            )}
          </div>
          
          {/* Right Pane Bible Panel - Toggle visibility on mobile, always show on tablet and desktop */}
          {(!isMobileView || isTabletView || showKJVOnMobile) && (
            <div className={`${isMobileView && !isTabletView ? 'w-full' : 'w-1/2'} border-l border-gray-200 bg-gray-50 flex flex-col`}>
              {/* KJV Bible Text Display */}
              <div 
                ref={kjvContentRef} 
                className={`flex-1 p-8 overflow-y-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}
                onClick={(event) => handlePaneClick(event, 'right')}
                style={{ cursor: touchScrollMode !== 'disabled' && (touchScrollMode === 'right-only' || touchScrollMode === 'both-panes' || touchScrollMode === 'right-reduced') ? 'pointer' : 'default' }}
              >
                {selectedBook && selectedChapter > 0 && (
                <div>
                  <h2 className="text-3xl mr-2 font-semibold mb-5 flex items-center">
                    {isMobileView && !isTabletView && (
                      <button 
                        onClick={() => {
                          setShowKJVOnMobile(false);
                          // Save preference
                          localStorage.setItem('mobilePanePreference', 'pane1');
                        }}
                        className="mr-3 px-3 py-1 text-sm bg-blue-500 text-white rounded-md shadow-sm"
                      >
                        Show Pane 1
                      </button>
                    )}
                    {selectedBook.book || getBookName(selectedBook.abbrev)} {selectedChapter} <span className="text-gray-500 ml-2">({rightPaneTranslation === 'en_kjv.json' ? 'KJV' : 'BBE'})</span>
                    <span className="ml-3 px-2 py-1 rounded text-xs bg-blue-50 text-blue-800">
                      Exact Sync
                    </span>
                    <div className="ml-auto flex items-center">
                      <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded mr-2">
                        Keys: 'o', 'p', '0'
                      </div>
                      
                    </div>
                  </h2>
                  <div className="space-y-5">
                    {/* Modified to handle right pane translation */}
                    {rightPaneBibleData && selectedBook && (
                      (() => {
                        // For Hebrew translations, use the mapping
                        let bookAbbrev = selectedBook.abbrev;
                        if (selectedTranslation.includes('he_heb')) {
                          bookAbbrev = getKjvBookAbbrev(bookAbbrev);
                        }
                        
                        const rightPaneBook = rightPaneBibleData.find(b => b.abbrev === bookAbbrev);
                        if (rightPaneBook && rightPaneBook.chapters[selectedChapter - 1]) {
                          return rightPaneBook.chapters[selectedChapter - 1].map((verse, index) => {
                            const verseNumber = index + 1;
                            
                            return (
                              <div 
                                key={index} 
                                id={`right-pane-verse-${verseNumber}`}
                                className="leading-relaxed p-4 rounded-md transition-colors text-2xl"
                              >
                                <p className="flex">
                                  <span className={`font-bold mr-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{verseNumber}</span>
                                  <span className="flex-1">{verse}</span>
                                </p>
                              </div>
                            );
                          });
                        } else {
                          return (
                            <div className="p-4 text-amber-600">
                              <p>Could not find matching {rightPaneTranslation === 'en_kjv.json' ? 'KJV' : 'BBE'} text for this book/chapter.</p>
                              <p className="mt-2 text-sm">
                                Book code: {selectedBook.abbrev}
                              </p>
                            </div>
                          );
                        }
                      })()
                    )}
                  </div>
              
              {/* Navigation buttons for KJV panel */}
                  <div className="mt-10 flex justify-between pb-4">
                    {selectedChapter > 1 ? (
                      <button
                        onClick={() => {
                          // Clear mobile scroll position immediately to prevent restoration
                          localStorage.removeItem('mobileScrollPosition');
                          setMobileScrollPosition(0);
                          
                          handleChapterSelect(selectedChapter - 1, true);
                          
                          // Reset all scroll state after content loads
                          setTimeout(() => {
                            handleHomeReset();
                          }, 100);
                        }}
                        className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                      >
                        &lt; Previous Chapter (z)
                      </button>
                    ) : (
                      <div></div>
                    )}

                    {/* Home button to scroll to top */}
                    <button
                      onClick={handleHomeReset}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                    >
                      Home (esc)
                    </button>

                    {selectedBook && selectedChapter < selectedBook.chapters.length && (
                      <button
                        onClick={() => {
                          // Clear mobile scroll position immediately to prevent restoration
                          localStorage.removeItem('mobileScrollPosition');
                          setMobileScrollPosition(0);
                          
                          handleChapterSelect(selectedChapter + 1, true);
                          
                          // Reset all scroll state after content loads
                          setTimeout(() => {
                            handleHomeReset();
                          }, 100);
                        }}
                        className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                      >
                        Next Chapter (m,;) &gt;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default BibleApp;