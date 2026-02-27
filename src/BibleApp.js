import React, { useState, useEffect, useRef, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { Book, Link, ChevronRight, History, BookOpen, Save, Database, Download } from 'lucide-react';
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

// External links for dropdown
const linksOut = {
  "Bible mobile": "https://cdpn.io/pen/debug/KwVxmKR",
  "Holy Spirit": "https://www.youtube.com/watch?v=QuY5YPORvfs&t=1823s",
  "Test" : "https://www.google.com"
};

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

// Helper function to parse and render glosses from parentheses
const renderWithGlosses = (text, showGlosses) => {
  if (!text) return text;

  // If glosses are disabled, remove them completely
  if (!showGlosses) {
    return text.replace(/\s*\([^)]+\)/g, '');
  }

  // Parse glosses: word(definition) or word (definition)
  const parts = [];
  let lastIndex = 0;
  const regex = /(\w+)\s*\(([^)]+)\)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add the glossed word
    const word = match[1];
    const definition = match[2];

    parts.push(
      <span key={match.index} className="gloss" style={{ position: 'relative', display: 'inline' }}>
        <span
          className="gloss-text"
          style={{
            borderBottom: '1px dotted #999',
            cursor: 'help'
          }}
        >
          {word}
        </span>
        <span
          className="gloss-def"
          style={{
            position: 'absolute',
            bottom: '-1.3em',
            left: '0',
            fontSize: '0.7em',
            color: '#666',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          {definition}
        </span>
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

// Firebase Key Selector Component
const FirebaseKeySelector = ({ onSelect, onSave, currentBook, currentChapter, currentTranslation, onApplyTranslationToPane1, onApplyTranslationToPane2, selectedDropdownTranslation, setSelectedDropdownTranslation, translations, isMobileView, isTabletView, stickyPane, isDarkMode, onNextChapter, bibleData, setSelectedBook, firebaseEnabled, onFirebaseToggle, showGlosses, onGlossToggle, onDarkModeToggle, onTouchScrollModeChange, touchScrollMode, viewMode, onViewModeToggle, gridReadMode, onGridReadModeToggle }) => {
  const [savedPositions, setSavedPositions] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Touch scroll modes definition (for the cycling button)
  const touchScrollModes = [
    { id: 'disabled', label: 'X', description: 'Text selection enabled - no auto-scroll' },
    { id: 'right-only', label: 'R P', description: 'Touch right pane triggers page down' },
    { id: 'both-panes', label: 'Both Panes', description: 'Touch either pane triggers page down' },
    { id: 'right-reduced', label: 'R R', description: 'Touch right pane with smaller scroll' },
    { id: 'right-independent', label: 'R I', description: 'Touch right pane scrolls only right pane (no sync)' }
  ];

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
  }, [firebaseEnabled, refreshTrigger]);

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
    // Determine which position to save to
    let savePosition;
    
    if (selectedKey && selectedKey.includes('-position')) {
      // If a position is selected in the dropdown, save to that position (overwrite)
      savePosition = selectedKey.split('-')[0];
      console.log(`Saving to selected position ${savePosition} (overwriting existing)`);
    } else {
      // If no position is selected, find the next available position slot (1-4)
      const existingPositions = savedPositions.map(p => parseInt(p.key.split('-')[0]));
      let nextPosition = 1;
      while (existingPositions.includes(nextPosition) && nextPosition <= 4) {
        nextPosition++;
      }
      // If all positions 1-4 are taken, default to position 1 (overwrite)
      savePosition = nextPosition <= 4 ? nextPosition.toString() : '1';
      console.log(`No position selected, saving to next available position ${savePosition}`);
    }

    // Create the key string in the expected format
    const keyToSave = `${savePosition}-position`;

    // Create position data object
    const positionData = JSON.stringify({
      bookAbbrev: currentBook?.abbrev,
      chapter: currentChapter,
      translation: currentTranslation,
      timestamp: Date.now(),
      stickyPane: stickyPane
    });

    console.log(`Saving to position ${savePosition}: ${keyToSave}`);
    
    // Keep the current selection to show confirmation
    setSelectedKey(keyToSave);
    
    // Save the data
    onSave(keyToSave, positionData);
    
    // Trigger refresh of saved positions after a short delay to allow Firebase save to complete
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 500);
  };

  // Handle loading position from selected key
  const handleLoad = () => {
    if (!selectedKey) {
      console.warn('Load aborted: No position selected');
      return;
    }

    // Call the onSelect function to load the position
    onSelect(selectedKey);
  };

  // Get key number from key string (e.g., "1-position" returns "1")
  const getKeyNumber = (key) => {
    const parts = key.split('-');
    return parts[0];
  };

  return (
    <div className="flex items-center space-x-2 hidden">
      {/* Next Translation button */}
      <button
        onClick={() => {
          try {
            // Find current translation index
            const currentIndex = translations.findIndex(t => t.id === selectedDropdownTranslation);
            
            // Calculate next index (loops back to 0 after last item)
            const nextIndex = (currentIndex + 1) % translations.length;
            const nextTranslation = translations[nextIndex].id;
            
            // Skip Hebrew translations if they cause issues
            let finalTranslation = nextTranslation;
            if (nextTranslation.includes('he_heb')) {
              const afterHebrewIndex = (nextIndex + 1) % translations.length;
              if (translations[afterHebrewIndex] && !translations[afterHebrewIndex].id.includes('he_heb')) {
                finalTranslation = translations[afterHebrewIndex].id;
              }
            }
            
            // Update dropdown selection
            setSelectedDropdownTranslation(finalTranslation);
            
            // Apply translation with delay to prevent scroll errors
            setTimeout(() => {
              try {
                onApplyTranslationToPane2(finalTranslation);
              } catch (error) {
                console.warn('Error applying translation:', error);
              }
            }, 150);
          } catch (error) {
            console.warn('Error cycling translation:', error);
          }
        }}
        className={`flex items-center px-2 py-1 text-sm ${isDarkMode ? 'bg-blue-700' : 'bg-blue-500'} text-white rounded hover:bg-blue-600 transition-colors`}
        title="Cycle to next translation and apply to pane 2"
      >
        <ChevronRight className="w-3 h-3 mr-1" />
        Next Transl (n)
      </button>
      
      <select
        className={`firebase-position-select border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'} rounded p-1 text-sm`}
        value={selectedKey}
        onChange={(e) => {
          const newKey = e.target.value;
          setSelectedKey(newKey);
          
          // Don't automatically load - let user manually trigger with '7' key or Load button
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
        Save(g)
      </button>
      
      <button
        onClick={handleLoad}
        disabled={loading}
        className={`ml-2 flex items-center px-2 py-1 text-sm ${isDarkMode ? 'bg-blue-700' : 'bg-blue-500'} text-white rounded hover:bg-blue-600 transition-colors disabled:${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
        title="Load from selected position"
      >
        Load(v)
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
        className={`ml-2 flex items-center px-2 py-1 text-sm ${isDarkMode ? 'bg-purple-700' : 'bg-purple-500'} text-white rounded hover:bg-purple-600 transition-colors hidden`}
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
  resetScrollTimerRef,
  speechVolume,
  showGlosses,
  onGlossToggle,
  translations,
  onTranslationChange,
  verseFilterData,
  showFilteredVersesOnly,
  setShowFilteredVersesOnly,
  filterFileName,
  handleVerseFilterFile,
  viewMode,
  onViewModeToggle,
  onShowVerseGrid,
  chineseBibleData,
  lastGridVerse,
  gridReadMode,
  onGridReadModeToggle
}) => {
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const [showTouchDropdown, setShowTouchDropdown] = useState(false);
  const [showLinksDropdown, setShowLinksDropdown] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // Bible study prompt options
  const bibleStudyPrompts = [
    {
      id: 1,
      label: "1. Meditation",
      template: "Meditation Connection, For {book} {chapter}, tell me what is the theme connect to meditation like breathe in out"
    },
    {
      id: 2,
      label: "Literary",
      template: 'Literary & Structure Analysis: For {book} {chapter}, "Analyze the literary structure, rhetorical devices, and narrative techniques used in this chapter - how do elements like repetition, imagery, parallelism, chiasm, or progression of ideas work together to reinforce the central message and create emotional or theological impact?"'
    },
    {
      id: 3,
      label: "Historical",
      template: 'Historical & Cultural Context: For {book} {chapter}, "Explore the historical setting, cultural practices, social structures, and contextual factors that shaped this chapter - how do understanding the original audience, historical circumstances, and cultural background illuminate the meaning and significance of the text?"'
    },
    {
      id: 4,
      label: "Theological",
      template: 'Theological & Doctrinal: For {book} {chapter}, "What does this chapter reveal about the nature and character of God, humanity\'s relationship with the divine, and major theological themes like covenant, salvation, justice, or redemption - and how do these teachings connect to or develop broader biblical doctrine?"'
    },
    {
      id: 5,
      label: "Practical",
      template: 'Practical Application: For {book} {chapter}, "Given the original context and timeless principles in this chapter, what specific life situations, moral decisions, relationship dynamics, or spiritual challenges does this text address, and how can its wisdom be authentically applied to contemporary personal and communal life?"'
    },
    {
      id: 6,
      label: "Comparative",
      template: 'Comparative Analysis: For {book} {chapter}, "How does this chapter\'s themes, language, imagery, and theological content compare and contrast with similar passages throughout Scripture, what unique contribution does it make to biblical literature, and how do different translations or interpretative traditions handle its key concepts?"'
    },
    {
      id: 7,
      label: "Spiritual",
      template: 'Spiritual Formation: For {book} {chapter}, "How can this chapter inform and transform personal spiritual practices like prayer, meditation, worship, and discipleship - what spiritual disciplines does it model or encourage, and how might regular engagement with its content shape character and faith development?"'
    },
    {
      id: 8,
      label: "Creative",
      template: 'Creative Engagement: For {book} {chapter}, "If you were to reimagine this chapter through contemporary storytelling, artistic expression, or modern parallels, what would it look like, what current situations mirror its dynamics, and how might creative interpretation help unlock its relevance for today\'s audience?"'
    },
    {
      id: 9,
      label: "Additional",
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

        {/* Gloss Toggle Button */}
        <button
          onClick={() => onGlossToggle && onGlossToggle()}
          className={`hidden ml-2 px-2 py-0.5 rounded focus:outline-none ${
            showGlosses
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
          }`}
          title={showGlosses ? "Hide glosses (definitions)" : "Show glosses (definitions)"}
        >
          {showGlosses ? 'Gloss: ON' : 'Gloss: OFF'}
        </button>

        {/* External Links Dropdown */}
        <div className="relative ml-2 flex-shrink-0">
          <button
            onClick={() => setShowLinksDropdown(!showLinksDropdown)}
            className="px-2 py-0.5 bg-blue-200 hover:bg-blue-300 rounded text-xs font-bold"
            title="External Links"
          >
            links
          </button>

          {showLinksDropdown && (
            <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              {Object.entries(linksOut).map(([label, url]) => (
                <button
                  key={label}
                  onClick={() => {
                    const bookName = book.book || getBookName(book.abbrev);
                    const clipText = `${bookName} ${chapter}`;
                    navigator.clipboard.writeText(clipText).catch(() => {});
                    window.open(url, '_blank');
                    setShowLinksDropdown(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Show All Verses Toggle Button - only show when filter is loaded */}
        {verseFilterData && (
          <button
            onClick={() => setShowFilteredVersesOnly(!showFilteredVersesOnly)}
            className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
              showFilteredVersesOnly
                ? 'bg-orange-200 hover:bg-orange-300'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title={showFilteredVersesOnly ? "Show all verses" : "Show filtered verses only"}
          >
            {showFilteredVersesOnly ? '👁️' : '👁️‍🗨️'}
          </button>
        )}

        {/* View Mode Toggle Button */}
        <button
          onClick={() => onViewModeToggle && onViewModeToggle()}
          className={`ml-2 px-2 py-0.5 rounded focus:outline-none ${
            viewMode === 'interleaved-pd'
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              : viewMode === 'interleaved'
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
          title={viewMode === 'interleaved-pd' ? "Switch to side-by-side view" : viewMode === 'interleaved' ? "Switch to interleaved PD view" : "Switch to interleaved view"}
        >
          {viewMode === 'interleaved-pd' ? '⇅ Interleaved PD' : viewMode === 'interleaved' ? '⇅ Interleaved' : '⇔ Side-by-Side'}
        </button>

        {/* Grid TTS Read Mode Toggle */}
        <button
          onClick={() => onGridReadModeToggle && onGridReadModeToggle()}
          className={`ml-2 px-2 py-0.5 rounded focus:outline-none text-xs ${
            gridReadMode === 'undelimit'
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={gridReadMode === 'undelimit' ? 'Auto-read: reads full verse with pauses (click to switch to part-by-part)' : 'Part-by-part: click to advance each segment (click to switch to auto-read)'}
        >
          {gridReadMode === 'undelimit' ? 'Auto' : 'Parts'}
        </button>

        {/* Touch Options Cycling Button - hidden */}
        <button
          onClick={() => {
            const currentIndex = touchScrollModes.findIndex(mode => mode.id === touchScrollMode);
            const nextIndex = (currentIndex + 1) % touchScrollModes.length;
            onTouchScrollModeChange(touchScrollModes[nextIndex].id);
          }}
          className="hidden ml-2 px-2 py-0.5 rounded focus:outline-none bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center"
          title={`Current: ${touchScrollModes.find(mode => mode.id === touchScrollMode)?.label || 'Unknown'} - Click to cycle through touch options`}
        >
          {touchScrollModes.find(mode => mode.id === touchScrollMode)?.label || 'Disabled'}
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        {/* Bible study prompts - hidden (see prompts.txt for content) */}
        <div className="hidden flex items-center">
          <select
            className="border border-gray-300 bg-white rounded px-2 py-1 text-sm max-w-xs ml-2"
            style={{width: 'auto'}}
            value={currentPromptIndex}
            onChange={(e) => setCurrentPromptIndex(parseInt(e.target.value))}
            title="Select Bible study prompt"
          >
            {bibleStudyPrompts.map((prompt, index) => (
              <option key={prompt.id} value={index}>
                {prompt.id}. {prompt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              // Get current selection from the dropdown directly
              const promptsSelect = document.querySelector('select[title="Select Bible study prompt"]');
              if (promptsSelect) {
                const currentIndex = parseInt(promptsSelect.value);
                const currentPrompt = bibleStudyPrompts[currentIndex];
                handlePromptClipboard(currentPrompt.template);
              }
            }}
            className="ml-1 px-2 py-0.5 rounded focus:outline-none bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs"
            title="Load selected prompt to clipboard"
          >
            <Download className="h-3 w-3" />
          </button>
          (/:read2end)
        </div>
        
        {/* Text to Speech Component */}
        <TextToSpeech
          rightPaneBibleData={rightPaneBibleData}
          currentBook={book.abbrev}
          currentChapter={chapter}
          rightPaneTranslation={rightPaneTranslation}
          speechVolume={speechVolume}
          translations={translations}
          onTranslationChange={onTranslationChange}
          chineseBibleData={chineseBibleData}
          lastGridVerse={lastGridVerse}
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
          className="hidden ml-2 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
          title="Scroll down one line (Down Arrow)"
        >
          ↓
        </button>

        {/* Scroll Control Radio Buttons - hidden */}
        <div className="hidden ml-2 items-center border-l border-gray-300 pl-2">
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

          {/* Reset Verse Speech Text */}
          <div className="hidden md:flex ml-2 items-center border-l border-gray-300 pl-2">
            <span className="text-xs text-gray-600"></span>
          </div>

          {/* Touch Scroll Configuration Dropdown */}
          <div className="hidden ml-2 items-center border-l border-gray-300 pl-2 relative">
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
          <div className="hidden md:flex ml-2 items-center border-l border-gray-300 pl-2 flex-nowrap">
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
              className="hidden px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
              title="Scroll up one line (Up Arrow)"
            >
              ↑
            </button>

            {/* Hidden file input for verse filter */}
            <input
              type="file"
              id="verse_filter_input"
              accept=".txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleVerseFilterFile(e.target.files[0]);
                }
              }}
            />

            {/* Drag-Drop Button for Verse Filter */}
            <button
              onClick={() => document.getElementById('verse_filter_input').click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = e.dataTransfer.files;
                if (files && files[0]) {
                  handleVerseFilterFile(files[0]);
                }
              }}
              className={`hidden ml-2 px-2 py-1 rounded text-xs font-bold ${
                verseFilterData && verseFilterData.chapters && verseFilterData.chapters[chapter]
                  ? 'bg-green-200 hover:bg-green-300'
                  : filterFileName
                  ? 'bg-yellow-200 hover:bg-yellow-300'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              title={
                verseFilterData && verseFilterData.chapters && verseFilterData.chapters[chapter]
                  ? `Ch ${chapter} has ${verseFilterData.chapters[chapter].length} key verses (${filterFileName})`
                  : filterFileName
                  ? `Filter loaded but no data for Ch ${chapter} (${filterFileName})`
                  : "Upload verse filter file (drag & drop or click)"
              }
            >
              {verseFilterData && verseFilterData.chapters && verseFilterData.chapters[chapter] ? '✓📄' : '📄'}
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
            {navigationHistory && [...navigationHistory].reverse().map((item, index) => (
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

// Reference collections data (outside component to avoid re-creation)
const referenceCollections = {
  "Rest": `Matthew 11:28-30
2 Corinthians 1:3-4
Psalm 23
Matthew 5:4
Psalm 34:18
Lamentations 3:22-26
John 14:1-3
Romans 8:35, 37-39`,
  "Comfort": `John 3:16
Matthew 4
Lamentations 1
2 Corinthians 1:3-6
Matthew 11:28
John 14:1
Joshua 1:9
Matthew 5:4
Isaiah 61:1-3
John 11:25
1 Corinthians 15:55-58
1 Thessalonians 4:13-18
Psalms 147:3`,
  "Strength": `Exodus 15:1-4
Nehemiah 8:10
Psalm 46:1-3
Psalm 119:28
Proverbs 18:10
Isaiah 40:29-31
Isaiah 41:9-10
2 Corinthians 12:9-10
Ephesians 6:10-11
Philippians 4:11-13`,
  "Anxiety": `Philippians 4:6-7
Isaiah 41:10
Psalm 23:4
1 Peter 5:7
Proverbs 3:5-6
Matthew 6:34`,
  "Faith": `Hebrews 11:1
Romans 10:17
Mark 11:22-24
Matthew 17:20
2 Corinthians 5:7
Galatians 2:20
James 1:6
1 Peter 1:7-9`,
  "Love": `1 Corinthians 13:4-8
John 3:16
Romans 8:38-39
1 John 4:7-8
John 15:12-13
Ephesians 3:17-19
Song of Solomon 8:6-7`,
  "Wisdom": `Proverbs 1:7
James 1:5
Proverbs 3:13-18
Proverbs 9:10
Colossians 2:2-3
Ecclesiastes 7:12
Psalm 111:10`
};

// Main component
const BibleApp = () => {
  const [bibleData, setBibleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [pendingBookSelection, setPendingBookSelection] = useState(null);
  const pendingBookRef = useRef(null);
  const [crossReferences, setCrossReferences] = useState({});
  
  // Debug effect to track pendingBookSelection changes
  useEffect(() => {
    console.log('pendingBookSelection state changed to:', pendingBookSelection?.abbrev);
    console.log('Full pendingBookSelection object:', pendingBookSelection);
    pendingBookRef.current = pendingBookSelection;
  }, [pendingBookSelection]);
  const [showCrossRef, setShowCrossRef] = useState(null);

  // Add refs for the chapter content containers
  const chapterContentRef = useRef(null);
  const kjvContentRef = useRef(null);
  const sidebarScrollRef = useRef(null);
  const isManuallyScrolling = useRef(false);
  const scrollSyncInitialized = useRef(false);
  const lastPrimaryScrollPos = useRef(0);
  const lastKjvScrollPos = useRef(0);
  const resetScrollTimerRef = useRef(null);
  
  // State to track primary reading vs cross-reference viewing
  const [isViewingCrossRef, setIsViewingCrossRef] = useState(false);

  // State for book number input with timeout
  const [bookNumberInput, setBookNumberInput] = useState('');
  const bookInputTimeoutRef = useRef(null);

  // Bible books order for numeric selection (matches your actual Bible data)
  const bibleBooksCanonical = [
    // Old Testament
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
    "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
    "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah",
    "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
    "Zechariah", "Malachi",
    // New Testament
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians",
    "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
    "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus",
    "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
    "1 John", "2 John", "3 John", "Jude", "Revelation"
  ];

  // Function to handle book number selection
  const handleBookNumberInput = (digit) => {
    // Clear existing timeout first
    if (bookInputTimeoutRef.current) {
      clearTimeout(bookInputTimeoutRef.current);
    }
    
    // Use functional state update to ensure we get the latest value
    setBookNumberInput(prevInput => {
      const newInput = prevInput + digit;
      console.log(`Book input: "${newInput}" (added digit: ${digit}) - current state: "${bookNumberInput}"`);
      
      // Set new timeout for 1.5 seconds - only this final timeout will execute
      bookInputTimeoutRef.current = setTimeout(() => {
        const bookNumber = parseInt(newInput);
        if (bookNumber > 0 && bookNumber <= bibleBooksCanonical.length) {
          const targetBookName = bibleBooksCanonical[bookNumber - 1];
          console.log(`Selecting book ${bookNumber}: ${targetBookName}`);
          
          // Find the book in bibleData and select it
          if (bibleData) {
            const bookToSelect = bibleData.find(book => {
              const bookName = book.book || getBookName(book.abbrev);
              return bookName === targetBookName;
            });
            
            if (bookToSelect) {
              handleBookSelect(bookToSelect.abbrev);
              console.log(`✓ Selected book ${bookNumber}: ${targetBookName} via keyboard`);
            } else {
              console.warn(`✗ Book "${targetBookName}" not found in bibleData`);
            }
          } else {
            console.warn('✗ bibleData not available');
          }
        } else {
          console.warn(`✗ Invalid book number: ${bookNumber}. Valid range: 1-${bibleBooksCanonical.length}`);
        }
        // Reset the input after processing
        setBookNumberInput('');
      }, 1500);
      
      return newInput;
    });
  };
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

  // Gloss display control
  const [showGlosses, setShowGlosses] = useState(true);

  // View mode control (side-by-side, interleaved, or interleaved-pd)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('bibleAppViewMode') || 'side-by-side');
  useEffect(() => { localStorage.setItem('bibleAppViewMode', viewMode); }, [viewMode]);

  // Grid TTS read mode: 'delimit' (part-by-part click) or 'undelimit' (auto-read all parts with pauses)
  const [gridReadMode, setGridReadMode] = useState(() => localStorage.getItem('bibleAppGridReadMode') || 'delimit');
  const gridReadModeRef = useRef(localStorage.getItem('bibleAppGridReadMode') || 'delimit');
  useEffect(() => { gridReadModeRef.current = gridReadMode; localStorage.setItem('bibleAppGridReadMode', gridReadMode); }, [gridReadMode]);

  // Mobile responsiveness states
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showKJVOnMobile, setShowKJVOnMobile] = useState(true);

  // Font size control (multiplier: 1 = base size)
  const [fontScale, setFontScale] = useState(1);
  
  // Available translations
  const translations = React.useMemo(() => [
    { id: 'en_kjv.json', name: 'English - King James Version (KJV)' },
    { id: 'en_web.json', name: 'English - World English Bible (WEB)' },
    { id: 'zh_cuv_no_space.json', name: 'Chinese - CUV (No Space)' },
    { id: 'es_rvr.json', name: 'Spanish - Reina Valera Revisada (RVR)' },
    { id: 'he_heb_nikkud.json', name: 'Hebrew - With Nikkud (Vowel Points)' },
    { id: 'fr_apee.json', name: 'French - APEE' },
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
  
  // State to track speech volume (normal or softer)
  const [speechVolume, setSpeechVolume] = useState('softer');
  
  // State to track Firebase loading toggle
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  
  // State to track touch scroll mode
  const [touchScrollMode, setTouchScrollMode] = useState('right-independent');

  // Touch scroll mode options
  const touchScrollModes = [
    { id: 'disabled', label: 'X', description: 'Text selection enabled - no auto-scroll' },
    { id: 'right-only', label: 'R P', description: 'Touch right pane triggers page down' },
    { id: 'both-panes', label: 'Both Panes', description: 'Touch either pane triggers page down' },
    { id: 'right-reduced', label: 'R R', description: 'Touch right pane with smaller scroll' },
    { id: 'right-independent', label: 'R I', description: 'Touch right pane scrolls only right pane (no sync)' }
  ];

  // State for verse filtering from text file
  const [verseFilterData, setVerseFilterData] = useState(null); // Stores parsed verse ranges by chapter
  const [showFilteredVersesOnly, setShowFilteredVersesOnly] = useState(false); // Toggle for showing filtered vs all verses
  const [filterFileName, setFilterFileName] = useState(''); // Name of the uploaded file
  const [allVerseFilters, setAllVerseFilters] = useState(null); // Stores all verse filters from JSON
  const [isManualUpload, setIsManualUpload] = useState(false); // Track if current filter is from manual upload

  // State for reference prompt and collection modal
  const [showRefPrompt, setShowRefPrompt] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [expandedCollection, setExpandedCollection] = useState(null);
  const [highlightedVerses, setHighlightedVerses] = useState([]);
  const [lastCollectionClick, setLastCollectionClick] = useState({ collection: null, ref: null });
  const [refPromptValue, setRefPromptValue] = useState('');
  const [refHistory, setRefHistory] = useState([]); // Session list of saved refs from Ref modal

  // State for Verse Grid TTS Modal
  const [showVerseGrid, setShowVerseGrid] = useState(false);
  const [speakingVerseNumber, setSpeakingVerseNumber] = useState(null);
  const [chineseBibleData, setChineseBibleData] = useState(null);
  const [lastGridVerse, setLastGridVerse] = useState(null);
  const gridSpeechIdRef = useRef(0);
  // Part-by-part reading refs for Chinese grid
  const gridPartPartsRef = useRef([]);
  const gridPartIndexRef = useRef(0);
  const gridPartVerseKeyRef = useRef(null);

  // State for Spanish Verse Grid TTS
  const [showSpanishGrid, setShowSpanishGrid] = useState(false);
  const [spanishBibleData, setSpanishBibleData] = useState(null);
  const [speakingSpanishVerse, setSpeakingSpanishVerse] = useState(null);
  const spanishSpeechIdRef = useRef(0);
  // Part-by-part reading refs for Spanish grid
  const spanishPartPartsRef = useRef([]);
  const spanishPartIndexRef = useRef(0);
  const spanishPartVerseKeyRef = useRef(null);

  // State for Hebrew Verse Grid TTS
  const [showHebrewGrid, setShowHebrewGrid] = useState(false);
  const [hebrewNikkudData, setHebrewNikkudData] = useState(null);
  const [speakingHebrewVerse, setSpeakingHebrewVerse] = useState(null);
  const hebrewSpeechIdRef = useRef(0);
  // Part-by-part reading refs for Hebrew grid
  const hebrewPartPartsRef = useRef([]);
  const hebrewPartIndexRef = useRef(0);
  const hebrewPartVerseKeyRef = useRef(null);

  // State for French Verse Grid TTS
  const [showFrenchGrid, setShowFrenchGrid] = useState(false);
  const [frenchBibleData, setFrenchBibleData] = useState(null);
  const [speakingFrenchVerse, setSpeakingFrenchVerse] = useState(null);
  const frenchSpeechIdRef = useRef(0);
  // Part-by-part reading refs for French grid
  const frenchPartPartsRef = useRef([]);
  const frenchPartIndexRef = useRef(0);
  const frenchPartVerseKeyRef = useRef(null);

  // Parse a single Bible reference string like "Psalm 23:4" or "Matthew 11:28-30"
  const parseSingleBibleRef = useCallback((refStr) => {
    const bookNameToAbbrev = {
      // Full names
      'genesis': 'gn', 'exodus': 'ex', 'leviticus': 'lv', 'numbers': 'nm', 'deuteronomy': 'dt',
      'joshua': 'js', 'judges': 'jud', 'ruth': 'rt', '1 samuel': '1sm', '2 samuel': '2sm',
      '1 kings': '1kgs', '2 kings': '2kgs', '1 chronicles': '1ch', '2 chronicles': '2ch',
      'ezra': 'ezr', 'nehemiah': 'ne', 'esther': 'et', 'job': 'job', 'psalm': 'ps', 'psalms': 'ps',
      'proverbs': 'prv', 'ecclesiastes': 'ec', 'song of solomon': 'so', 'isaiah': 'is',
      'jeremiah': 'jr', 'lamentations': 'lm', 'ezekiel': 'ez', 'daniel': 'dn',
      'hosea': 'ho', 'joel': 'jl', 'amos': 'am', 'obadiah': 'ob', 'jonah': 'jn',
      'micah': 'mi', 'nahum': 'na', 'habakkuk': 'hk', 'zephaniah': 'zp', 'haggai': 'hg',
      'zechariah': 'zc', 'malachi': 'ml', 'matthew': 'mt', 'mark': 'mk', 'luke': 'lk',
      'john': 'jo', 'acts': 'act', 'romans': 'rm', '1 corinthians': '1co', '2 corinthians': '2co',
      'galatians': 'gl', 'ephesians': 'eph', 'philippians': 'ph', 'colossians': 'cl',
      '1 thessalonians': '1ts', '2 thessalonians': '2ts', '1 timothy': '1tm', '2 timothy': '2tm',
      'titus': 'tt', 'philemon': 'phm', 'hebrews': 'hb', 'james': 'jm', '1 peter': '1pe',
      '2 peter': '2pe', '1 john': '1jo', '2 john': '2jo', '3 john': '3jo', 'jude': 'jd',
      'revelation': 're',
      // Short abbreviations
      'gen': 'gn', 'exo': 'ex', 'exod': 'ex', 'lev': 'lv', 'num': 'nm', 'deut': 'dt', 'deu': 'dt',
      'josh': 'js', 'jos': 'js', 'judg': 'jud',
      '1sam': '1sm', '1 sam': '1sm', '2sam': '2sm', '2 sam': '2sm',
      '1kgs': '1kgs', '1 kgs': '1kgs', '2kgs': '2kgs', '2 kgs': '2kgs',
      '1chr': '1ch', '1 chr': '1ch', '2chr': '2ch', '2 chr': '2ch',
      'neh': 'ne', 'est': 'et', 'ps': 'ps', 'psa': 'ps',
      'prov': 'prv', 'pro': 'prv', 'eccl': 'ec', 'ecc': 'ec',
      'song': 'so', 'sos': 'so', 'songs': 'so',
      'isa': 'is', 'jer': 'jr', 'lam': 'lm', 'ezek': 'ez', 'eze': 'ez',
      'dan': 'dn', 'hos': 'ho', 'oba': 'ob', 'ob': 'ob', 'jon': 'jn',
      'mic': 'mi', 'nah': 'na', 'hab': 'hk', 'zeph': 'zp', 'zep': 'zp',
      'hag': 'hg', 'zech': 'zc', 'zec': 'zc', 'mal': 'ml',
      'matt': 'mt', 'mat': 'mt', 'mrk': 'mk', 'luk': 'lk',
      'joh': 'jo', 'jn': 'jo', 'rom': 'rm',
      '1cor': '1co', '1 cor': '1co', '2cor': '2co', '2 cor': '2co',
      'gal': 'gl', 'phil': 'ph', 'php': 'ph', 'col': 'cl',
      '1thess': '1ts', '1 thess': '1ts', '2thess': '2ts', '2 thess': '2ts',
      '1tim': '1tm', '1 tim': '1tm', '2tim': '2tm', '2 tim': '2tm',
      'tit': 'tt', 'phlm': 'phm', 'heb': 'hb',
      'jas': 'jm', 'jam': 'jm',
      '1pet': '1pe', '1 pet': '1pe', '2pet': '2pe', '2 pet': '2pe',
      '1jn': '1jo', '1 jn': '1jo', '2jn': '2jo', '2 jn': '2jo', '3jn': '3jo', '3 jn': '3jo',
      'rev': 're', 'revelations': 're'
    };

    const trimmed = refStr.trim();
    if (!trimmed) return null;

    // Match patterns like "Matthew 11:28-30" or "Psalm 23" or "1 Corinthians 13:4-8"
    const match = trimmed.match(/^(\d?\s*[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?::(.+))?$/i);
    if (!match) return null;

    const bookName = match[1].trim().toLowerCase();
    const chapter = parseInt(match[2]);
    const abbrev = bookNameToAbbrev[bookName];
    if (!abbrev) return null;

    return { abbrev, chapter };
  }, []);

  // Navigate to a Bible reference string
  const navigateToRef = useCallback((refStr) => {
    const parsed = parseSingleBibleRef(refStr);
    if (!parsed || !bibleData) return;

    const book = bibleData.find(b => b.abbrev === parsed.abbrev);
    if (book) {
      setSelectedBook(book);
      setSelectedChapter(parsed.chapter);
      setPrimaryReading({ book, chapter: parsed.chapter });
      setIsViewingCrossRef(false);
      setHighlightedVerses([]);
      if (chapterContentRef.current) chapterContentRef.current.scrollTop = 0;
      if (kjvContentRef.current) kjvContentRef.current.scrollTop = 0;
      lastPrimaryScrollPos.current = 0;
      scrollSyncInitialized.current = false;
    }
  }, [bibleData, parseSingleBibleRef]);

  // Navigate to a Bible reference and highlight specific verses (for Collections)
  const navigateToRefWithHighlight = useCallback((refStr) => {
    const parsed = parseSingleBibleRef(refStr);
    if (!parsed || !bibleData) return;

    // Parse verse numbers from ref string (e.g., "John 3:16" → [16], "2 Cor 1:3-6" → [3,4,5,6], "Isaiah 61:1-3" → [1,2,3])
    const verseMatch = refStr.trim().match(/:(\d+)(?:\s*[-–]\s*(\d+))?/);
    let verses = [];
    if (verseMatch) {
      const start = parseInt(verseMatch[1]);
      const end = verseMatch[2] ? parseInt(verseMatch[2]) : start;
      for (let v = start; v <= end; v++) verses.push(v);
    }

    const book = bibleData.find(b => b.abbrev === parsed.abbrev);
    if (book) {
      setSelectedBook(book);
      setSelectedChapter(parsed.chapter);
      setPrimaryReading({ book, chapter: parsed.chapter });
      setIsViewingCrossRef(false);
      if (chapterContentRef.current) chapterContentRef.current.scrollTop = 0;
      if (kjvContentRef.current) kjvContentRef.current.scrollTop = 0;
      lastPrimaryScrollPos.current = 0;
      scrollSyncInitialized.current = false;

      // Set highlighted verses
      setHighlightedVerses(verses);

      // Scroll to the first highlighted verse after render
      if (verses.length > 0) {
        setTimeout(() => {
          const el = document.getElementById(`verse-${verses[0]}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [bibleData, parseSingleBibleRef]);

  // Load a collection by name - navigates to first reference
  const loadCollection = useCallback((collectionName) => {
    const refs = referenceCollections[collectionName];
    if (!refs) return;
    const lines = refs.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length > 0) {
      navigateToRef(lines[0]);
    }
    setShowCollectionModal(false);
  }, [navigateToRef]);

  // State to track scroll position for mobile view during translation changes
  // eslint-disable-next-line no-unused-vars
  const [mobileScrollPosition, setMobileScrollPosition] = useState(0);

  // Load verse filters JSON on startup
  useEffect(() => {
    const loadVerseFilters = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/verse_filters.json`);
        if (response.ok) {
          const data = await response.json();
          setAllVerseFilters(data);
          console.log('Loaded verse filters for', Object.keys(data).length, 'books');
        }
      } catch (error) {
        console.log('No verse_filters.json found, using manual upload only');
      }
    };
    loadVerseFilters();
  }, []);

  // Update verse filter when book changes (if JSON filters are loaded)
  useEffect(() => {
    if (!allVerseFilters || !selectedBook) return;

    const bookName = selectedBook.book || getBookName(selectedBook.abbrev);

    // Don't auto-load if user has manually uploaded a filter for this book
    if (isManualUpload) {
      console.log(`Manual upload active, skipping auto-load for ${bookName}`);
      return;
    }

    // Try exact match first
    let filterData = allVerseFilters[bookName];

    // Try variations if no exact match
    if (!filterData) {
      // Try without spaces (1Chronicles, 2Samuel, etc.)
      const noSpaces = bookName.replace(/\s+/g, '');
      filterData = allVerseFilters[noSpaces];
    }

    if (!filterData) {
      // Try with underscore (1_Chronicles, Song_of_Solomon, etc.)
      const withUnderscore = bookName.replace(/\s+/g, '_');
      filterData = allVerseFilters[withUnderscore];
    }

    if (filterData) {
      setVerseFilterData({
        bookName: bookName,
        chapters: filterData
      });
      setFilterFileName('verse_filters.json (auto-loaded)');
      console.log(`Auto-loaded filter for ${bookName}`);
    } else {
      // No filter for this book, clear it only if it was auto-loaded
      setVerseFilterData(null);
      setFilterFileName('');
    }
  }, [selectedBook, allVerseFilters, isManualUpload]);

  // Reset manual upload flag when changing books
  useEffect(() => {
    if (isManualUpload) {
      const currentBookName = selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : '';
      const uploadedBookName = verseFilterData ? verseFilterData.bookName : '';

      // If we've moved to a different book, reset the manual upload flag
      if (currentBookName !== uploadedBookName) {
        console.log(`Changed from ${uploadedBookName} to ${currentBookName}, resetting manual upload flag`);
        setIsManualUpload(false);
      }
    }
  }, [selectedBook, isManualUpload, verseFilterData]);

  // Load Chinese CUV data for Verse Grid TTS (independent of pane translations)
  useEffect(() => {
    const loadChineseData = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/zh_cuv_no_space.json`);
        if (response.ok) {
          const data = await response.json();
          setChineseBibleData(data);
        }
      } catch (err) {
        console.error('Failed to load Chinese CUV data for verse grid:', err);
      }
    };
    loadChineseData();
  }, []);

  // Load Spanish RVR data for Spanish Verse Grid TTS
  useEffect(() => {
    const loadSpanishData = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/es_rvr.json`);
        if (response.ok) {
          const data = await response.json();
          setSpanishBibleData(data);
        }
      } catch (err) {
        console.error('Failed to load Spanish RVR data for verse grid:', err);
      }
    };
    loadSpanishData();
  }, []);

  // Load Hebrew Nikkud data for Hebrew Verse Grid TTS
  useEffect(() => {
    const loadHebrewData = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/he_heb_nikkud.json`);
        if (response.ok) {
          const data = await response.json();
          setHebrewNikkudData(data);
        }
      } catch (err) {
        console.error('Failed to load Hebrew Nikkud data for verse grid:', err);
      }
    };
    loadHebrewData();
  }, []);

  // Load French APEE data for French Verse Grid TTS
  useEffect(() => {
    const loadFrenchData = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/fr_apee.json`);
        if (response.ok) {
          const data = await response.json();
          setFrenchBibleData(data);
        }
      } catch (err) {
        console.error('Failed to load French APEE data for verse grid:', err);
      }
    };
    loadFrenchData();
  }, []);

  // Cancel speech when chapter/book changes while verse grid is open
  useEffect(() => {
    if (showVerseGrid) {
      window.speechSynthesis.cancel();
      setSpeakingVerseNumber(null);
    }
    if (showSpanishGrid) {
      window.speechSynthesis.cancel();
      setSpeakingSpanishVerse(null);
    }
    if (showHebrewGrid) {
      window.speechSynthesis.cancel();
      setSpeakingHebrewVerse(null);
    }
    if (showFrenchGrid) {
      window.speechSynthesis.cancel();
      setSpeakingFrenchVerse(null);
    }
  }, [selectedBook, selectedChapter, showVerseGrid, showSpanishGrid, showHebrewGrid, showFrenchGrid]);

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

  // Helper: speak all parts sequentially with 1.5s pauses (for undelimit mode)
  const speakAllParts = (parts, langCode, rate, speechIdRef, setSpeakingState, verseNumber) => {
    const speechId = speechIdRef.current;
    let partIdx = 0;

    const speakNext = () => {
      if (partIdx >= parts.length || speechIdRef.current !== speechId) {
        if (speechIdRef.current === speechId) setSpeakingState(null);
        return;
      }
      const segment = parts[partIdx];
      partIdx += 1;

      const utterance = new SpeechSynthesisUtterance(segment);
      utterance.lang = langCode;
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        let voice = voices.find(v => v.lang === langCode && v.name.includes('Google'));
        if (!voice) voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]) && (v.name.includes('Enhanced') || v.name.includes('Premium')));
        if (!voice) voice = voices.find(v => v.lang === langCode);
        if (!voice) voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => {
        if (speechIdRef.current !== speechId) return;
        if (partIdx < parts.length) {
          setTimeout(speakNext, 1500);
        } else {
          setSpeakingState(null);
        }
      };
      utterance.onerror = () => { if (speechIdRef.current === speechId) setSpeakingState(null); };
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };

  // Speak a verse part-by-part in Mandarin or Cantonese (for Verse Grid sidebar)
  const speakVerseInGrid = (verseNumber, lang = 'mandarin') => {
    if (!chineseBibleData || !primaryReading.book) return;
    const abbrev = primaryReading.book.abbrev;
    const chapterIdx = (primaryReading.chapter || 1) - 1;
    const bookObj = chineseBibleData.find(b => b.abbrev === abbrev);
    if (!bookObj || !bookObj.chapters[chapterIdx]) return;
    const verseText = bookObj.chapters[chapterIdx][verseNumber - 1];
    if (!verseText) return;

    const verseKey = `${abbrev}-${chapterIdx}-${verseNumber}-${lang}`;

    // If verse or lang changed, split into parts and reset
    if (verseKey !== gridPartVerseKeyRef.current || gridPartPartsRef.current.length === 0) {
      const parts = verseText.split(/(?<=[，、。！？；：\n])/).map(s => s.trim()).filter(s => s.length > 0);
      gridPartPartsRef.current = parts.length > 0 ? parts : [verseText];
      gridPartIndexRef.current = 0;
      gridPartVerseKeyRef.current = verseKey;
    }

    const langCode = lang === 'cantonese' ? 'zh-HK' : 'zh-CN';

    window.speechSynthesis.cancel();
    const speechId = ++gridSpeechIdRef.current;
    setSpeakingVerseNumber({ verse: verseNumber, lang });
    setLastGridVerse(verseNumber);

    // Undelimit mode: read all parts with 1.5s pauses
    if (gridReadModeRef.current === 'undelimit') {
      gridPartIndexRef.current = 0;
      setTimeout(() => speakAllParts(gridPartPartsRef.current, langCode, 0.8, gridSpeechIdRef, (val) => setSpeakingVerseNumber(val === null ? null : { verse: verseNumber, lang }), verseNumber), 100);
      return;
    }

    // Delimit mode: one part per click
    if (gridPartIndexRef.current >= gridPartPartsRef.current.length) {
      gridPartIndexRef.current = 0;
    }
    const segment = gridPartPartsRef.current[gridPartIndexRef.current];
    gridPartIndexRef.current += 1;

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(segment);
      utterance.lang = langCode;
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        let voice = voices.find(v => v.lang === langCode && v.name.includes('Google'));
        if (!voice) voice = voices.find(v => v.lang === langCode && (v.name.includes('Enhanced') || v.name.includes('Premium')));
        if (!voice) voice = voices.find(v => v.lang === langCode);
        if (!voice && lang === 'cantonese') voice = voices.find(v => v.lang === 'yue' || v.lang === 'yue-HK' || v.lang.startsWith('yue'));
        if (!voice) voice = voices.find(v => v.lang.startsWith('zh'));
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => { if (gridSpeechIdRef.current === speechId) setSpeakingVerseNumber(null); };
      utterance.onerror = () => { if (gridSpeechIdRef.current === speechId) setSpeakingVerseNumber(null); };
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  // Close verse grid and cancel speech
  const closeVerseGrid = () => {
    window.speechSynthesis.cancel();
    setSpeakingVerseNumber(null);
    setShowVerseGrid(false);
  };

  // Speak a verse part-by-part in Spanish (for Spanish Verse Grid sidebar)
  const speakVerseInSpanishGrid = (verseNumber) => {
    if (!spanishBibleData || !primaryReading.book) return;
    const abbrev = primaryReading.book.abbrev;
    const chapterIdx = (primaryReading.chapter || 1) - 1;
    const bookObj = spanishBibleData.find(b => b.abbrev === abbrev);
    if (!bookObj || !bookObj.chapters[chapterIdx]) return;
    const verseText = bookObj.chapters[chapterIdx][verseNumber - 1];
    if (!verseText) return;

    const verseKey = `${abbrev}-${chapterIdx}-${verseNumber}`;

    // If verse changed, split into parts and reset
    if (verseKey !== spanishPartVerseKeyRef.current || spanishPartPartsRef.current.length === 0) {
      const parts = verseText.split(/(?<=[,;:.!?\n])/).map(s => s.trim()).filter(s => s.length > 0);
      spanishPartPartsRef.current = parts.length > 0 ? parts : [verseText];
      spanishPartIndexRef.current = 0;
      spanishPartVerseKeyRef.current = verseKey;
    }

    window.speechSynthesis.cancel();
    const speechId = ++spanishSpeechIdRef.current;
    setSpeakingSpanishVerse(verseNumber);
    setLastGridVerse(verseNumber);

    // Undelimit mode: read all parts with 1.5s pauses
    if (gridReadModeRef.current === 'undelimit') {
      spanishPartIndexRef.current = 0;
      setTimeout(() => speakAllParts(spanishPartPartsRef.current, 'es-ES', 0.9, spanishSpeechIdRef, setSpeakingSpanishVerse, verseNumber), 100);
      return;
    }

    // Delimit mode: one part per click
    if (spanishPartIndexRef.current >= spanishPartPartsRef.current.length) {
      spanishPartIndexRef.current = 0;
    }
    const segment = spanishPartPartsRef.current[spanishPartIndexRef.current];
    spanishPartIndexRef.current += 1;

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(segment);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        let voice = voices.find(v => v.lang === 'es-ES' && v.name.includes('Google'));
        if (!voice) voice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Enhanced') || v.name.includes('Premium')));
        if (!voice) voice = voices.find(v => v.lang === 'es-ES');
        if (!voice) voice = voices.find(v => v.lang.startsWith('es'));
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => { if (spanishSpeechIdRef.current === speechId) setSpeakingSpanishVerse(null); };
      utterance.onerror = () => { if (spanishSpeechIdRef.current === speechId) setSpeakingSpanishVerse(null); };
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  // Close Spanish verse grid and cancel speech
  const closeSpanishGrid = () => {
    window.speechSynthesis.cancel();
    setSpeakingSpanishVerse(null);
    setShowSpanishGrid(false);
  };

  // Speak a verse part-by-part in Hebrew (for Hebrew Verse Grid sidebar)
  const speakVerseInHebrewGrid = (verseNumber) => {
    if (!hebrewNikkudData || !primaryReading.book) return;
    const abbrev = primaryReading.book.abbrev;
    const chapterIdx = (primaryReading.chapter || 1) - 1;
    const bookObj = hebrewNikkudData.find(b => b.abbrev === abbrev);
    if (!bookObj || !bookObj.chapters[chapterIdx]) return;
    const verseText = bookObj.chapters[chapterIdx][verseNumber - 1];
    if (!verseText) return;

    const verseKey = `${abbrev}-${chapterIdx}-${verseNumber}`;

    // If verse changed, split into parts and reset
    if (verseKey !== hebrewPartVerseKeyRef.current || hebrewPartPartsRef.current.length === 0) {
      // Split by Hebrew punctuation: sof pasuq (׃), maqaf (־), or spaces between word groups
      const parts = verseText.split(/(?<=[׃\n])/).map(s => s.trim()).filter(s => s.length > 0);
      // If no split points, split by roughly 4-5 words
      if (parts.length <= 1) {
        const words = verseText.split(/\s+/);
        const chunkSize = 4;
        const wordParts = [];
        for (let i = 0; i < words.length; i += chunkSize) {
          wordParts.push(words.slice(i, i + chunkSize).join(' '));
        }
        hebrewPartPartsRef.current = wordParts.length > 0 ? wordParts : [verseText];
      } else {
        hebrewPartPartsRef.current = parts;
      }
      hebrewPartIndexRef.current = 0;
      hebrewPartVerseKeyRef.current = verseKey;
    }

    window.speechSynthesis.cancel();
    const speechId = ++hebrewSpeechIdRef.current;
    setSpeakingHebrewVerse(verseNumber);
    setLastGridVerse(verseNumber);

    // Undelimit mode: read all parts with 1.5s pauses
    if (gridReadModeRef.current === 'undelimit') {
      hebrewPartIndexRef.current = 0;
      setTimeout(() => speakAllParts(hebrewPartPartsRef.current, 'he-IL', 0.5, hebrewSpeechIdRef, setSpeakingHebrewVerse, verseNumber), 100);
      return;
    }

    // Delimit mode: one part per click
    if (hebrewPartIndexRef.current >= hebrewPartPartsRef.current.length) {
      hebrewPartIndexRef.current = 0;
    }
    const segment = hebrewPartPartsRef.current[hebrewPartIndexRef.current];
    hebrewPartIndexRef.current += 1;

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(segment);
      utterance.lang = 'he-IL';
      utterance.rate = 0.5;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        let voice = voices.find(v => v.lang === 'he-IL' && v.name.includes('Google'));
        if (!voice) voice = voices.find(v => v.lang.startsWith('he') && (v.name.includes('Enhanced') || v.name.includes('Premium')));
        if (!voice) voice = voices.find(v => v.lang === 'he-IL');
        if (!voice) voice = voices.find(v => v.lang.startsWith('he'));
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => { if (hebrewSpeechIdRef.current === speechId) setSpeakingHebrewVerse(null); };
      utterance.onerror = () => { if (hebrewSpeechIdRef.current === speechId) setSpeakingHebrewVerse(null); };
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  // Close Hebrew verse grid and cancel speech
  const closeHebrewGrid = () => {
    window.speechSynthesis.cancel();
    setSpeakingHebrewVerse(null);
    setShowHebrewGrid(false);
  };

  // Speak a verse part-by-part in French (for French Verse Grid sidebar)
  const speakVerseInFrenchGrid = (verseNumber) => {
    if (!frenchBibleData || !primaryReading.book) return;
    const abbrev = primaryReading.book.abbrev;
    const chapterIdx = (primaryReading.chapter || 1) - 1;
    const bookObj = frenchBibleData.find(b => b.abbrev === abbrev);
    if (!bookObj || !bookObj.chapters[chapterIdx]) return;
    const verseText = bookObj.chapters[chapterIdx][verseNumber - 1];
    if (!verseText) return;

    const verseKey = `${abbrev}-${chapterIdx}-${verseNumber}`;

    // If verse changed, split into parts and reset
    if (verseKey !== frenchPartVerseKeyRef.current || frenchPartPartsRef.current.length === 0) {
      const parts = verseText.split(/(?<=[,;:.!?\n])/).map(s => s.trim()).filter(s => s.length > 0);
      frenchPartPartsRef.current = parts.length > 0 ? parts : [verseText];
      frenchPartIndexRef.current = 0;
      frenchPartVerseKeyRef.current = verseKey;
    }

    window.speechSynthesis.cancel();
    const speechId = ++frenchSpeechIdRef.current;
    setSpeakingFrenchVerse(verseNumber);
    setLastGridVerse(verseNumber);

    // Undelimit mode: read all parts with 1.5s pauses
    if (gridReadModeRef.current === 'undelimit') {
      frenchPartIndexRef.current = 0;
      setTimeout(() => speakAllParts(frenchPartPartsRef.current, 'fr-FR', 0.9, frenchSpeechIdRef, setSpeakingFrenchVerse, verseNumber), 100);
      return;
    }

    // Delimit mode: one part per click
    if (frenchPartIndexRef.current >= frenchPartPartsRef.current.length) {
      frenchPartIndexRef.current = 0;
    }
    const segment = frenchPartPartsRef.current[frenchPartIndexRef.current];
    frenchPartIndexRef.current += 1;

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(segment);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        let voice = voices.find(v => v.lang === 'fr-FR' && v.name.includes('Google'));
        if (!voice) voice = voices.find(v => v.lang.startsWith('fr') && (v.name.includes('Enhanced') || v.name.includes('Premium')));
        if (!voice) voice = voices.find(v => v.lang === 'fr-FR');
        if (!voice) voice = voices.find(v => v.lang.startsWith('fr'));
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => { if (frenchSpeechIdRef.current === speechId) setSpeakingFrenchVerse(null); };
      utterance.onerror = () => { if (frenchSpeechIdRef.current === speechId) setSpeakingFrenchVerse(null); };
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  // Close French verse grid and cancel speech
  const closeFrenchGrid = () => {
    window.speechSynthesis.cancel();
    setSpeakingFrenchVerse(null);
    setShowFrenchGrid(false);
  };

  // Helper function to parse verse filter file
  const parseVerseFilterFile = (fileText) => {
    const lines = fileText.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length === 0) return null;

    const filterData = {};
    let currentBookName = '';

    lines.forEach(line => {
      // Check if this is a chapter line with two possible formats:
      // Format 1: "Chapter 1: 1-3, 44-46" (from output.txt)
      // Format 2: "Exodus 1: 1, 8-11, 15-16" (from exodus.txt)
      const chapterMatch = line.match(/^Chapter\s+(\d+):\s*(.+)$/i);
      const bookChapterMatch = line.match(/^[A-Za-z]+\s+(\d+):\s*(.+)$/i);

      if (chapterMatch) {
        const chapterNum = parseInt(chapterMatch[1]);
        const versesText = chapterMatch[2];

        // Parse verse ranges (e.g., "1-3, 44-46, 50")
        const verseRanges = versesText.split(',').map(range => range.trim());
        const verses = new Set();

        verseRanges.forEach(range => {
          if (range.includes('-')) {
            // Range like "1-3"
            const [start, end] = range.split('-').map(n => parseInt(n.trim()));
            for (let i = start; i <= end; i++) {
              verses.add(i);
            }
          } else {
            // Single verse like "50"
            verses.add(parseInt(range));
          }
        });

        filterData[chapterNum] = Array.from(verses).sort((a, b) => a - b);
      } else if (bookChapterMatch) {
        // Handle "BookName ChapterNum: verses" format
        const chapterNum = parseInt(bookChapterMatch[1]);
        const versesText = bookChapterMatch[2];

        // Parse verse ranges (e.g., "1-3, 44-46, 50")
        const verseRanges = versesText.split(',').map(range => range.trim());
        const verses = new Set();

        verseRanges.forEach(range => {
          if (range.includes('-')) {
            // Range like "1-3"
            const [start, end] = range.split('-').map(n => parseInt(n.trim()));
            for (let i = start; i <= end; i++) {
              verses.add(i);
            }
          } else {
            // Single verse like "50"
            verses.add(parseInt(range));
          }
        });

        filterData[chapterNum] = Array.from(verses).sort((a, b) => a - b);
      } else if (!line.includes(':') && line.length > 0) {
        // This might be the book name (first non-empty line without colon)
        currentBookName = line;
      }
    });

    return { bookName: currentBookName, chapters: filterData };
  };

  // Handler for drag-drop file upload
  const handleVerseFilterFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseVerseFilterFile(text);
      if (parsed && Object.keys(parsed.chapters).length > 0) {
        // Override: Use current book name instead of the one from the file
        const currentBookName = selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : parsed.bookName;

        setVerseFilterData({
          bookName: currentBookName,
          chapters: parsed.chapters
        });
        setFilterFileName(file.name);
        setIsManualUpload(true); // Mark as manual upload
        setShowFilteredVersesOnly(true); // Automatically enable filtering when file is loaded
        console.log(`Verse filter loaded for ${currentBookName}:`, parsed.chapters);
      } else {
        alert('Could not parse verse filter file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  // Add keyboard event handler for translation switching and KJV scrolling
  useEffect(() => {
    // Flag to prevent scroll event feedback loops
    const isManuallyScrollingRef = isManuallyScrolling;

    const handleKeyDown = (e) => {
      // Prevent keycode handling when user is typing in input fields or select dropdowns
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Removed '[' and ']' key handlers for translation switching
      // 'x' key - scroll down one line at a time in KJV pane (like 'z' but just one line)
      if (e.key === 'x' && kjvContentRef.current) {
        
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
      
      // 'o' key or PageUp key - page up (scrolls both sidebar and main content)
      else if ((e.key === 'o' || e.key === 'PageUp') && kjvContentRef.current) {
        // If sidebar is open, scroll the sidebar too
        if (showSidebar && sidebarScrollRef.current) {
          const sidebarPane = sidebarScrollRef.current;
          const sidebarPageHeight = sidebarPane.clientHeight * 0.9;
          const sidebarNewPosition = sidebarPane.scrollTop - sidebarPageHeight;
          sidebarPane.scrollTop = Math.max(0, sidebarNewPosition);
        }
        
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
      // 'p' key, PageDown key, or ArrowDown key - page down (scrolls both sidebar and main content)
      else if ((e.key === 'p' || e.key === 'PageDown' || e.key === 'ArrowDown') && kjvContentRef.current) {
        // If sidebar is open, scroll the sidebar too
        if (showSidebar && sidebarScrollRef.current) {
          const sidebarPane = sidebarScrollRef.current;
          const sidebarPageHeight = sidebarPane.clientHeight * 0.9;
          const sidebarNewPosition = sidebarPane.scrollTop + sidebarPageHeight;
          const sidebarMaxScroll = sidebarPane.scrollHeight - sidebarPane.clientHeight;
          sidebarPane.scrollTop = Math.min(sidebarMaxScroll, sidebarNewPosition);
        }
        
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
      
      // 'q' key - directly click the left arrow button (previous book)
      else if (e.key === 'q' || e.key === 'Q' || e.keyCode === 81) {
        const leftArrowButton = document.querySelector('button[title="Previous book"]');
        if (leftArrowButton) {
          leftArrowButton.click();
        }
        e.preventDefault();
      }
      
      // 'w' key - directly click the right arrow button (next book)
      else if (e.key === 'w' || e.key === 'W' || e.keyCode === 87) {
        const rightArrowButton = document.querySelector('button[title="Next book"]');
        if (rightArrowButton) {
          rightArrowButton.click();
        }
        e.preventDefault();
      }
      
      // 'e' key - go to next chapter (same as ';' key)
      else if (e.key === 'e' || e.key === 'E' || e.keyCode === 69) {
        console.log("e key pressed for Next Chapter");
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
          console.log("Current React state before button click:", {
            selectedBook: selectedBook?.abbrev,
            selectedChapter: selectedChapter
          });
          nextChapterButtons[0].click();
          
          // Check state after a delay to see if it updated
          setTimeout(() => {
            console.log("React state 200ms after button click:", {
              selectedBook: selectedBook?.abbrev,
              selectedChapter: selectedChapter
            });
          }, 200);
        } else {
          console.log("No Next Chapter button found - this means we're at the last chapter");
          console.log("Doing nothing (not advancing to next book or Genesis)");
        }

        e.preventDefault();
      }
      
      // 'r' key - advance by +10 chapters by clicking Next Chapter button 10 times
      else if (e.key === 'r' || e.key === 'R' || e.keyCode === 82) {
        console.log("r key pressed for +10 chapters");
        
        // Find the Next Chapter button
        const nextChapterButtons = Array.from(document.querySelectorAll('button'))
          .filter(button => button.textContent.includes('Next Chapter'));
          
        if (nextChapterButtons.length > 0) {
          console.log("Found Next Chapter button, clicking it 10 times");
          
          // Click the button 10 times with small delays
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              if (nextChapterButtons[0]) {
                nextChapterButtons[0].click();
                console.log(`Clicked Next Chapter button ${i + 1}/10`);
              }
            }, i * 100); // 100ms delay between clicks
          }
        } else {
          console.log("No Next Chapter button found");
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
          console.log("Current React state before button click:", {
            selectedBook: selectedBook?.abbrev,
            selectedChapter: selectedChapter
          });
          nextChapterButtons[0].click();
          
          // Check state after a delay to see if it updated
          setTimeout(() => {
            console.log("React state 200ms after button click:", {
              selectedBook: selectedBook?.abbrev,
              selectedChapter: selectedChapter
            });
          }, 200);
        } else {
          console.log("No Next Chapter button found - this means we're at the last chapter");
          console.log("Doing nothing (not advancing to next book or Genesis)");
        }

        e.preventDefault();
      }
      // 'g' key - cycle through Firebase saved positions (visual only, no actions)
      else if (e.key === 'g' || e.key === 'G') {
        // First, enable Firebase if it's not already enabled
        const firebaseToggleButton = document.querySelector('button[title*="Firebase loading is"]');
        if (firebaseToggleButton && firebaseToggleButton.textContent.includes('OFF')) {
          firebaseToggleButton.click();
          console.log("g key pressed - auto-enabled Firebase");
        }
        
        // Find the Firebase position select element by its unique class
        const firebaseSelect = document.querySelector('select.firebase-position-select');
        if (firebaseSelect && firebaseSelect.options.length > 1) {
          // Get current selected index
          let currentIndex = firebaseSelect.selectedIndex;
          
          // Skip the first option ("Select position...") and cycle through actual positions
          if (currentIndex === 0 || currentIndex === firebaseSelect.options.length - 1) {
            currentIndex = 1; // Start from first real position
          } else {
            currentIndex += 1; // Move to next position
          }
          
          // Update the select value AND trigger change event to update selectedKey state
          firebaseSelect.selectedIndex = currentIndex;
          firebaseSelect.dispatchEvent(new Event('change', { bubbles: true }));
          
          console.log(`g key pressed - cycled Firebase position to ${firebaseSelect.options[currentIndex].text}`);
        }
        e.preventDefault();
      }
      // 't' key - go to chapter 1 of current book
      else if (e.key === 't' || e.key === 'T') {
        // Find the chapter select dropdown and set it to 1
        const chapterSelect = document.querySelector('select.border.border-gray-300, select.border.border-gray-600');
        if (chapterSelect) {
          // Set to chapter 1
          chapterSelect.value = '1';
          // Trigger change event to update the chapter
          chapterSelect.dispatchEvent(new Event('change', { bubbles: true }));
          console.log("t key pressed - navigated to chapter 1");
        }
        e.preventDefault();
      }
      // 'y' key - go to previous chapter (-1)
      else if (e.key === 'y' || e.key === 'Y') {
        console.log("Y key pressed for Previous Chapter");
        // Find and click the Previous Chapter button
        const prevChapterButtons = document.querySelectorAll('button');
        let prevButton = null;
        
        for (let i = 0; i < prevChapterButtons.length; i++) {
          const buttonText = prevChapterButtons[i].textContent || prevChapterButtons[i].innerText;
          if (buttonText.includes('Previous Chapter') || buttonText.includes('Prev Chapter')) {
            prevButton = prevChapterButtons[i];
            break;
          }
        }
        
        if (prevButton && !prevButton.disabled) {
          prevButton.click();
          console.log("Previous Chapter button clicked");
        } else {
          console.log("Previous Chapter button not found or disabled");
        }
        e.preventDefault();
      }
      // 'v' key - click Firebase Load button
      else if (e.key === 'v' || e.key === 'V') {
        // Find the Firebase Load button by its title
        const loadButton = document.querySelector('button[title="Load from selected position"]');
        if (loadButton) {
          loadButton.click();
          console.log("v key pressed - clicked Firebase Load button");
        }
        e.preventDefault();
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
      // 'u' key - cycle to next prompt (like Next Transl button)
      else if (e.key === 'u' || e.key === 'U') {
        // Find the prompts select element by its title
        const promptsSelect = document.querySelector('select[title="Select Bible study prompt"]');
        if (promptsSelect) {
          const currentIndex = parseInt(promptsSelect.value);
          const totalOptions = promptsSelect.options.length;
          const nextIndex = (currentIndex + 1) % totalOptions;
          
          // Update the select value directly without triggering change event
          promptsSelect.value = nextIndex;
          
          console.log(`u key pressed - cycled to prompt ${nextIndex + 1}: ${promptsSelect.options[nextIndex].text}`);
        }
        e.preventDefault();
      }
      // 'i' key - click Load prompt button
      else if (e.key === 'i' || e.key === 'I') {
        // Find the Load prompt button by its title
        const loadButton = document.querySelector('button[title="Load selected prompt to clipboard"]');
        if (loadButton) {
          loadButton.click();
          console.log("i key pressed - clicked Load prompt button");
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
      // '[' key - go to previous verse (copy of ArrowLeft functionality)
      else if (e.key === '[') {
        // Dispatch custom event to navigate to previous verse
        const event = new CustomEvent('navigateVerse', {
          detail: { direction: 'previous' }
        });
        window.dispatchEvent(event);
        e.preventDefault();
      }
      // ']' key - go to next verse (copy of ArrowRight functionality)
      else if (e.key === ']') {
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
      // Apostrophe (') key - speak the current book and chapter (moved from Shift+5)
      else if (e.key === "'" || e.key === "'") {
        console.log('i key pressed - speaking book and chapter');
        console.log('selectedBook:', selectedBook);
        console.log('selectedChapter:', selectedChapter);
        console.log('pendingBookSelection:', pendingBookSelection);
        
        // Use the most current book information available
        // Priority: pendingBookSelection -> selectedBook -> fallback to page title detection
        let currentBook = null;
        let currentChapter = selectedChapter;
        
        // Always try to get the current chapter from DOM first since state might be stale
        const chapterSelect = document.querySelector('select.border.border-gray-300, select.border.border-gray-600');
        if (chapterSelect) {
          const selectedChapterFromDOM = parseInt(chapterSelect.value);
          if (selectedChapterFromDOM) {
            currentChapter = selectedChapterFromDOM;
            console.log('Found chapter from DOM:', currentChapter);
          }
        }
        
        if (pendingBookSelection) {
          currentBook = pendingBookSelection;
          console.log('Using pendingBookSelection:', currentBook.abbrev);
        } else if (selectedBook) {
          currentBook = selectedBook;
          console.log('Using selectedBook:', currentBook.abbrev);
        } else {
          // Try to detect from page title and DOM elements as fallback
          const pageTitle = document.querySelector('h1')?.textContent || 'Unknown';
          console.log('Visual page title:', pageTitle);
          
          // Create a simple book detection without relying on bibleData
          const bookNameToAbbrev = {
            'Genesis': 'gn', 'Exodus': 'ex', 'Leviticus': 'lv', 'Numbers': 'nm', 'Deuteronomy': 'dt',
            'Joshua': 'js', 'Judges': 'jud', 'Ruth': 'rt', '1 Samuel': '1sm', '2 Samuel': '2sm',
            '1 Kings': '1kgs', '2 Kings': '2kgs', '1 Chronicles': '1ch', '2 Chronicles': '2ch',
            'Ezra': 'ezr', 'Nehemiah': 'ne', 'Esther': 'et', 'Job': 'job', 'Psalms': 'ps',
            'Proverbs': 'prv', 'Ecclesiastes': 'ec', 'Song of Solomon': 'so', 'Isaiah': 'is',
            'Jeremiah': 'jr', 'Lamentations': 'lm', 'Ezekiel': 'ez', 'Daniel': 'dn',
            'Hosea': 'ho', 'Joel': 'jl', 'Amos': 'am', 'Obadiah': 'ob', 'Jonah': 'jn',
            'Micah': 'mi', 'Nahum': 'na', 'Habakkuk': 'hk', 'Zephaniah': 'zp', 'Haggai': 'hg',
            'Zechariah': 'zc', 'Malachi': 'ml', 'Matthew': 'mt', 'Mark': 'mk', 'Luke': 'lk',
            'John': 'jo', 'Acts': 'act', 'Romans': 'rm', '1 Corinthians': '1co', '2 Corinthians': '2co',
            'Galatians': 'gl', 'Ephesians': 'eph', 'Philippians': 'ph', 'Colossians': 'cl',
            '1 Thessalonians': '1ts', '2 Thessalonians': '2ts', '1 Timothy': '1tm', '2 Timothy': '2tm',
            'Titus': 'tt', 'Philemon': 'phm', 'Hebrews': 'hb', 'James': 'jm', '1 Peter': '1pe',
            '2 Peter': '2pe', '1 John': '1jo', '2 John': '2jo', '3 John': '3jo', 'Jude': 'jd',
            'Revelation': 're'
          };
          
          console.log('Searching for book name in title...');
          for (const [bookName, abbrev] of Object.entries(bookNameToAbbrev)) {
            console.log(`Checking "${bookName}" against title "${pageTitle}"`);
            if (pageTitle.includes(bookName)) {
              // Create a simple book object
              currentBook = { abbrev: abbrev, book: bookName };
              console.log('Detected book from page title:', abbrev, '->', bookName);
              break;
            }
          }
          
          if (!currentBook) {
            console.log('No book matched the page title');
          }
        }
        
        if (currentBook) {
          // Dispatch custom event to speak current book and chapter
          const event = new CustomEvent('speakBookChapter', {
            detail: {
              book: currentBook,
              chapter: currentChapter
            }
          });
          console.log('Dispatching speakBookChapter event:', event.detail);
          window.dispatchEvent(event);
        } else {
          console.log('No book found to speak');
        }
        
        e.preventDefault();
      }
      // '\' key - speak the currently selected verse number (duplicate of ']' key)
      else if (e.key === '\\') {
        console.log('\\ key pressed - speaking selected verse');
        
        // Find the verse selector button
        const verseButton = document.querySelector('button.bg-purple-100.text-purple-700');
        if (verseButton) {
          const buttonText = verseButton.textContent || '';
          console.log('Found verse button text:', buttonText);
          
          // Extract verse number from text like "Verse 1"
          const verseMatch = buttonText.match(/Verse (\d+)/);
          if (verseMatch) {
            const verseNumber = verseMatch[1];
            console.log('Extracted verse number:', verseNumber);
            
            // Dispatch custom event to speak the verse number
            const event = new CustomEvent('speakVerseNumber', {
              detail: {
                verseNumber: verseNumber
              }
            });
            console.log('Dispatching speakVerseNumber event:', event.detail);
            window.dispatchEvent(event);
          } else {
            console.log('Could not extract verse number from button text');
          }
        } else {
          console.log('Verse button not found');
        }
        
        e.preventDefault();
      }
      // Escape key - toggle sidebar open/close
      else if (e.key === 'Escape') {
        console.log("Escape key pressed - toggling sidebar");
        setShowSidebar(prev => !prev);
        e.preventDefault();
      }
      
      
      // Numeric keys (0-9) for book selection
      else if (e.key >= '0' && e.key <= '9') {
        // Allow browser shortcuts like Cmd+1, Cmd+2, etc. for tab switching
        if (e.metaKey || e.ctrlKey) {
          return;
        }
        handleBookNumberInput(e.key);
        e.preventDefault();
      }
      
      // Direct book navigation keys
      // A key - go to Genesis
      else if (e.key === 'a' || e.key === 'A') {
        const book = bibleData?.find(b => b.abbrev === 'gn');
        if (book) {
          handleBookSelect('gn');
        }
        e.preventDefault();
      }
      // I key - go to Acts
      else if (e.key === 'i' || e.key === 'I') {
        const book = bibleData?.find(b => b.abbrev === 'ac');
        if (book) {
          handleBookSelect('ac');
        }
        e.preventDefault();
      }
      // K key - go to Hebrews
      else if (e.key === 'k' || e.key === 'K') {
        const book = bibleData?.find(b => b.abbrev === 'hb');
        if (book) {
          handleBookSelect('hb');
        }
        e.preventDefault();
      }
      // L key - go to Lamentations
      else if (e.key === 'l' || e.key === 'L') {
        const book = bibleData?.find(b => b.abbrev === 'lm');
        if (book) {
          handleBookSelect('lm');
        }
      }
      // S key - go to Joshua
      else if (e.key === 's' || e.key === 'S') {
        const book = bibleData?.find(b => b.abbrev === 'js');
        if (book) {
          handleBookSelect('js');
        }
        e.preventDefault();
      }
      // 'n' key - cycle to next translation (like Next Transl button)
      else if (e.key === 'n' || e.key === 'N') {
        try {
          // Find current translation index
          const currentIndex = translations.findIndex(t => t.id === selectedDropdownTranslation);
          
          // Calculate next index (loops back to 0 after last item)
          const nextIndex = (currentIndex + 1) % translations.length;
          const nextTranslation = translations[nextIndex].id;
          
          // Skip Hebrew translations if they cause issues
          let finalTranslation = nextTranslation;
          if (nextTranslation.includes('he_heb')) {
            const afterHebrewIndex = (nextIndex + 1) % translations.length;
            if (translations[afterHebrewIndex] && !translations[afterHebrewIndex].id.includes('he_heb')) {
              finalTranslation = translations[afterHebrewIndex].id;
            }
          }
          
          // Update dropdown selection
          setSelectedDropdownTranslation(finalTranslation);
          
          // Apply translation with delay to prevent scroll errors
          setTimeout(() => {
            try {
              handleApplySelectedTranslationToPane2(finalTranslation);
            } catch (error) {
              console.warn('Error applying translation:', error);
            }
          }, 150);
          
          console.log(`n key pressed - cycled to translation: ${finalTranslation}`);
        } catch (error) {
          console.warn('Error cycling translation:', error);
        }
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTranslation, showSidebar]);
  
  // Save reading position to localStorage when it changes
  useEffect(() => {
    if (selectedBook) {
      try {
        const stateToSave = {
          bookAbbrev: selectedBook.abbrev,
          chapter: selectedChapter,
          translation: selectedTranslation,
          rightPaneTranslation,
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
  }, [selectedBook, selectedChapter, selectedTranslation, rightPaneTranslation, primaryReading, isViewingCrossRef, scrollSyncMode, stickyPane, isDarkMode, isMobileView]);

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

  const handleIndependentRightScroll = useCallback((scrollAmount = 0.9) => {
    if (!kjvContentRef.current) return;
    
    const pageHeight = kjvContentRef.current.clientHeight * scrollAmount;
    isManuallyScrolling.current = true;

    try {
      const kjvPane = kjvContentRef.current;
      const kjvNewPosition = kjvPane.scrollTop + pageHeight;
      const kjvMaxScroll = kjvPane.scrollHeight - kjvPane.clientHeight;
      kjvPane.scrollTop = Math.min(kjvMaxScroll, kjvNewPosition);
    } finally {
      setTimeout(() => {
        isManuallyScrolling.current = false;
      }, 50);
    }
  }, []);

  const handlePaneClick = useCallback((event, pane) => {
    // Click-to-page-down disabled
    return;
  }, []);

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

            // Restore right pane translation if available
            if (parsedState.rightPaneTranslation) {
              const isRightTranslationAvailable = translations.some(t => t.id === parsedState.rightPaneTranslation);
              if (isRightTranslationAvailable) {
                setRightPaneTranslation(parsedState.rightPaneTranslation);
              }
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
        console.log("=== INITIALIZING BOOK/CHAPTER STATE ===");
        console.log("savedBook:", savedBook?.abbrev);
        console.log("savedChapter:", savedChapter);
        console.log("bibleData length:", bibleData?.length);
        
        if (savedBook) {
          console.log("✓ Using saved state - setting book:", savedBook.abbrev, "chapter:", savedChapter);
          setSelectedBook(savedBook);
          setSelectedChapter(savedChapter);
        } else if (bibleData && bibleData.length > 0) {
          console.log("✓ Using default state - setting book:", bibleData[0].abbrev, "chapter: 1");
          setSelectedBook(bibleData[0]);
          setPrimaryReading({
            book: bibleData[0],
            chapter: 1
          });
        } else {
          console.log("❌ No state to set - no savedBook and no bibleData");
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
    console.log("=== handleBookSelect called ===", {
      abbrev,
      currentSelectedBook: selectedBook?.abbrev,
      currentSelectedChapter: selectedChapter
    });
    if (bibleData) {
      const book = bibleData.find(b => b.abbrev === abbrev);
      console.log("✓ setSelectedBook called with:", book?.abbrev);
      setSelectedBook(book);
      console.log("✓ setSelectedChapter called with: 1");
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
    console.log("=== handleChapterSelect called ===", {
      chapterNum,
      fromNextChapterButton,
      currentSelectedBook: selectedBook?.abbrev,
      currentSelectedChapter: selectedChapter
    });
    setSelectedChapter(chapterNum);
    console.log("✓ setSelectedChapter called with:", chapterNum);
    setShowCrossRef(null); // Hide any cross-reference popup

    // No need to reset auto-scroll timer here - will be handled in NavigationPlaceholder component

    
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
    localStorage.removeItem('mobileScrollPosition');
    setMobileScrollPosition(0);
    
    // Reset scroll sync state
    lastPrimaryScrollPos.current = 0;
    scrollSyncInitialized.current = false;
  };

  // Direct book navigation functions for key '1' and '2'
  // eslint-disable-next-line no-unused-vars
  const handlePreviousBook = () => {
    if (!bibleData || !selectedBook) return;
    
    const currentBookIndex = bibleData.findIndex(b => b.abbrev === selectedBook.abbrev);
    if (currentBookIndex !== -1) {
      const prevIndex = currentBookIndex > 0 ? currentBookIndex - 1 : bibleData.length - 1;
      const prevBook = bibleData[prevIndex];
      
      console.log("Direct previous book navigation:", {
        currentBook: selectedBook.abbrev,
        prevBook: prevBook.abbrev
      });
      
      setSelectedBook(prevBook);
      setSelectedChapter(1); // Reset to first chapter
      setShowCrossRef(null); // Hide any cross-reference popup
      
      // Update primary reading
      setPrimaryReading({
        book: prevBook,
        chapter: 1
      });
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleNextBook = () => {
    if (!bibleData || !selectedBook) return;
    
    const currentBookIndex = bibleData.findIndex(b => b.abbrev === selectedBook.abbrev);
    if (currentBookIndex !== -1) {
      const nextIndex = currentBookIndex < bibleData.length - 1 ? currentBookIndex + 1 : 0;
      const nextBook = bibleData[nextIndex];
      
      console.log("Direct next book navigation:", {
        currentBook: selectedBook.abbrev,
        nextBook: nextBook.abbrev
      });
      
      setSelectedBook(nextBook);
      setSelectedChapter(1); // Reset to first chapter
      setShowCrossRef(null); // Hide any cross-reference popup
      
      // Update primary reading
      setPrimaryReading({
        book: nextBook,
        chapter: 1
      });
    }
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
      'he_heb_strong.json': 'HEB-Strong',
      'he_heb_nikkud.json': 'HEB-Nikkud'
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
      // Check refs again as they might have changed during timeout
      if (chapterContentRef.current && kjvContentRef.current) {
        // Initialize the last scroll position
        lastPrimaryScrollPos.current = chapterContentRef.current.scrollTop;

        setupScrollSync();
        scrollSyncInitialized.current = true;
        console.log("Scroll sync initialized");
      }
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
          <div ref={sidebarScrollRef} className="overflow-y-auto h-full">
            {bibleData && bibleData.map((book, index) => (
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
                {(() => {
                  const bookName = book.book || getBookName(book.abbrev);
                  const keyMappings = {
                    'Genesis': '(a)',
                    'Joshua': '(s)', 
                    'Job': '(f)',
                    'Isaiah': '(g)',
                    'Matthew': '(h)',
                    'Acts': '(i)',
                    'Romans': '(j)',
                    'Hebrews': '(k)',
                    'Lamentations': '(l)',
                    'Colossians': '(c)'
                  };
                  return keyMappings[bookName] ? `${index + 1}. ${bookName} ${keyMappings[bookName]}` : `${index + 1}. ${bookName}`;
                })()}
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
              <>
                <button 
                  onClick={() => setShowSidebar(true)} 
                  className="flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </>
            )}
            
            
            {selectedBook && (
              <div className="flex items-center">
                <span className="mr-1 text-sm">Ch:</span>
                <select
                  value={selectedChapter}
                  onChange={(e) => handleChapterSelect(parseInt(e.target.value))}
                  className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'} rounded px-1 py-0 text-sm w-12`}
                >
                  {selectedBook && selectedBook.chapters && selectedBook.chapters.map((_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>

                {/* Next Translation Button - hidden */}

                {/* Font Size Controls */}
                <button
                  onClick={() => setFontScale(prev => Math.max(0.5, prev - 0.1))}
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold"
                  title="Decrease font size"
                >
                  -
                </button>
                <button
                  onClick={() => setFontScale(prev => Math.min(2, prev + 0.1))}
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold"
                  title="Increase font size"
                >
                  +
                </button>

                {/* Reference Prompt Button */}
                <button
                  onClick={() => setShowRefPrompt(true)}
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-blue-500 text-white hover:bg-blue-600 font-semibold"
                  title="Go to a Bible reference"
                >
                  Ref
                </button>

                {/* Collection Modal Button */}
                <button
                  onClick={() => { setExpandedCollection(lastCollectionClick.collection); setShowCollectionModal(true); }}
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-purple-500 text-white hover:bg-purple-600 font-semibold"
                  title="Select a verse collection"
                >
                  Col
                </button>

                {/* Verse Grid TTS Button */}
                <button
                  onClick={() => setShowVerseGrid(prev => !prev)}
                  className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showVerseGrid ? 'bg-green-700 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}
                  title="Toggle verse grid to hear verses in Mandarin"
                >
                  Grid
                </button>

                {/* Spanish Verse Grid TTS Button */}
                <button
                  onClick={() => setShowSpanishGrid(prev => !prev)}
                  className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showSpanishGrid ? 'bg-orange-700 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                  title="Toggle verse grid to hear verses in Spanish"
                >
                  Span TTS
                </button>

                {/* Hebrew Verse Grid TTS Button */}
                <button
                  onClick={() => setShowHebrewGrid(prev => !prev)}
                  className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showHebrewGrid ? 'bg-indigo-700 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                  title="Toggle verse grid to hear verses in Hebrew"
                >
                  Hebrew
                </button>

                {/* French Verse Grid TTS Button */}
                <button
                  onClick={() => setShowFrenchGrid(prev => !prev)}
                  className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showFrenchGrid ? 'bg-blue-800 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  title="Toggle verse grid to hear verses in French"
                >
                  Fr
                </button>

                {/* Chapter Navigation Input */}
                <input 
                  type="number" 
                  placeholder="1" 
                  className="hidden ml-2 px-1 py-0 border border-gray-300 rounded text-sm w-12"
                  min="1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const chapter = parseInt(e.target.value);
                      if (chapter && !isNaN(chapter) && chapter > 0) {
                        handleChapterSelect(chapter);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <button 
                  onClick={(e) => {
                    const chapter = parseInt(e.target.previousElementSibling.value);
                    if (chapter && !isNaN(chapter) && chapter > 0) {
                      handleChapterSelect(chapter);
                      e.target.previousElementSibling.value = '';
                    }
                  }}
                  className="hidden ml-1 px-1 py-0 bg-green-200 hover:bg-green-300 rounded text-sm font-bold"
                  title="Go to chapter"
                >
                  Go
                </button>
              </div>
            )}

            <div className="flex items-center ml-2 md:ml-2 w-full md:w-auto flex-wrap md:flex-nowrap mt-2 md:mt-0">
              <BookOpen className="mr-1 h-4 w-4 text-blue-600" />
              <select 
                value={selectedDropdownTranslation}
                onChange={handleTranslationChange}
                className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'} rounded px-2 py-1 text-sm`}
                style={{ width: "auto", maxWidth: "150px" }}
                id="translationSelector"
              >
                {translations && translations.map(translation => (
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
                Apply
              </button>

              {/* Book Selection Dropdown */}
              <div className="flex ml-2 items-center border-l border-gray-300 pl-2 relative">
                <button
                  onClick={() => setShowBookDropdown(!showBookDropdown)}
                  className={`hidden text-xs px-2 py-1 rounded border flex items-center ${
                    pendingBookSelection ? 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
                  }`}
                >
                  {pendingBookSelection ? 
                    (pendingBookSelection.book || getBookName(pendingBookSelection.abbrev)) : 
                    (selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : 'Select Book')
                  }
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showBookDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 w-64 max-h-80 overflow-y-auto">
                    {bibleData && bibleData.map((book) => (
                      <button
                        key={book.abbrev}
                        onClick={() => {
                          setPendingBookSelection(book);
                          setShowBookDropdown(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 ${
                          selectedBook && selectedBook.abbrev === book.abbrev ? 'bg-blue-50 text-blue-700 font-medium' : ''
                        } ${
                          pendingBookSelection && pendingBookSelection.abbrev === book.abbrev ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                        }`}
                      >
                        {book.book || getBookName(book.abbrev)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Return/Apply Button */}
                {pendingBookSelection && (
                  <button
                    onClick={() => {
                      handleBookSelect(pendingBookSelection.abbrev);
                      setPendingBookSelection(null);
                    }}
                    className="ml-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs flex items-center"
                    title="Navigate to selected book"
                  >
                    ⏎
                  </button>
                )}
              </div>
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
              setSelectedDropdownTranslation={setSelectedDropdownTranslation}
              translations={translations}
              isMobileView={isMobileView}
              isTabletView={isTabletView}
              stickyPane={stickyPane}
              isDarkMode={isDarkMode}
              onNextChapter={handleChapterSelect}
              bibleData={bibleData}
              setSelectedBook={setSelectedBook}
              firebaseEnabled={firebaseEnabled}
              onFirebaseToggle={setFirebaseEnabled}
              showGlosses={showGlosses}
              onGlossToggle={() => setShowGlosses(!showGlosses)}
              onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
              onTouchScrollModeChange={setTouchScrollMode}
              touchScrollMode={touchScrollMode}
              viewMode={viewMode}
              onViewModeToggle={() => setViewMode(viewMode === 'side-by-side' ? 'interleaved' : viewMode === 'interleaved' ? 'interleaved-pd' : 'side-by-side')}
              gridReadMode={gridReadMode}
              onGridReadModeToggle={() => setGridReadMode(prev => prev === 'delimit' ? 'undelimit' : 'delimit')}
              onShowVerseGrid={() => setShowVerseGrid(true)}
              chineseBibleData={chineseBibleData}
              lastGridVerse={lastGridVerse}
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
              speechVolume={speechVolume}
              showGlosses={showGlosses}
              onGlossToggle={() => setShowGlosses(!showGlosses)}
              translations={translations}
              onTranslationChange={setRightPaneTranslation}
              verseFilterData={verseFilterData}
              showFilteredVersesOnly={showFilteredVersesOnly}
              setShowFilteredVersesOnly={(val) => {
                setShowFilteredVersesOnly(val);
                // Scroll panes to top so the filter change is immediately visible
                if (chapterContentRef.current) chapterContentRef.current.scrollTop = 0;
                if (kjvContentRef.current) kjvContentRef.current.scrollTop = 0;
              }}
              filterFileName={filterFileName}
              handleVerseFilterFile={handleVerseFilterFile}
              viewMode={viewMode}
              onViewModeToggle={() => setViewMode(viewMode === 'side-by-side' ? 'interleaved' : viewMode === 'interleaved' ? 'interleaved-pd' : 'side-by-side')}
              gridReadMode={gridReadMode}
              onGridReadModeToggle={() => setGridReadMode(prev => prev === 'delimit' ? 'undelimit' : 'delimit')}
              onShowVerseGrid={() => setShowVerseGrid(true)}
              chineseBibleData={chineseBibleData}
              lastGridVerse={lastGridVerse}
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
          {(viewMode === 'interleaved' || viewMode === 'interleaved-pd') ? (
            /* Interleaved View - Single pane with alternating verses */
            <div
              ref={chapterContentRef}
              className="w-full overflow-y-auto p-4 md:p-8 bg-white relative"
              style={{ backgroundColor: isDarkMode ? '#1f2937' : '#E7DFC8', color: isDarkMode ? 'white' : '#5A4333' }}
              onClick={viewMode === 'interleaved-pd' ? (e) => {
                if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('a') || e.target.closest('select')) return;
                const pane = chapterContentRef.current;
                if (!pane) return;
                const pageHeight = pane.clientHeight * 0.9;
                pane.scrollTop = Math.min(pane.scrollHeight - pane.clientHeight, pane.scrollTop + pageHeight);
              } : undefined}
            >
              {selectedBook && selectedChapter > 0 && (
                <div className="max-w-[85ch] mx-auto">
                  {/* Controls for interleaved view */}
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={() => {
                        handleChapterSelect(selectedChapter + 1, true);
                        if (chapterContentRef.current) {
                          setTimeout(() => {
                            chapterContentRef.current.scrollTop = 0;
                          }, 100);
                        }
                      }}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center"
                      title="Next Chapter"
                    >
                      Next Ch
                    </button>
                  </div>
                  <h2 className="text-3xl font-semibold flex items-center mb-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open mr-3 h-8 w-8">
                      <path d="M12 7v14"></path>
                      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                    </svg>
                    {selectedBook.book || getBookName(selectedBook.abbrev)} {selectedChapter} - Interleaved
                  </h2>
                  <div className="space-y-2">
                    {selectedBook && selectedBook.chapters && selectedBook.chapters[selectedChapter - 1] && (() => {
                      // Get verses from both translations
                      const primaryVerses = selectedBook.chapters[selectedChapter - 1];

                      // Get right pane verses
                      let rightPaneVerses = [];
                      if (rightPaneBibleData && selectedBook) {
                        let bookAbbrev = selectedBook.abbrev;
                        if (selectedTranslation.includes('he_heb')) {
                          bookAbbrev = getKjvBookAbbrev(bookAbbrev);
                        }
                        const rightPaneBook = rightPaneBibleData.find(b => b.abbrev === bookAbbrev);
                        if (rightPaneBook && rightPaneBook.chapters[selectedChapter - 1]) {
                          rightPaneVerses = rightPaneBook.chapters[selectedChapter - 1];
                        }
                      }

                      // Create interleaved array
                      const maxLength = Math.max(primaryVerses.length, rightPaneVerses.length);
                      const interleavedVerses = [];

                      for (let i = 0; i < maxLength; i++) {
                        const verseNumber = i + 1;

                        // Check if should be filtered
                        let shouldShow = true;
                        if (showFilteredVersesOnly && verseFilterData) {
                          const currentChapterFilter = verseFilterData.chapters[selectedChapter];
                          if (currentChapterFilter) {
                            shouldShow = currentChapterFilter.includes(verseNumber);
                          }
                        }

                        if (shouldShow) {
                          // Add primary translation verse
                          if (primaryVerses[i]) {
                            interleavedVerses.push({
                              type: 'primary',
                              verseNumber,
                              text: primaryVerses[i],
                              translation: getTranslationShortName(selectedTranslation)
                            });
                          }

                          // Add right pane translation verse
                          if (rightPaneVerses[i]) {
                            interleavedVerses.push({
                              type: 'secondary',
                              verseNumber,
                              text: rightPaneVerses[i],
                              translation: rightPaneTranslation === 'en_kjv.json' ? 'KJV' : 'BBE'
                            });
                          }
                        }
                      }

                      // Render interleaved verses
                      return interleavedVerses.map((item, index) => {
                        const refKey = `${selectedBook.abbrev}-${selectedChapter}-${item.verseNumber}`;
                        const hasReference = item.type === 'primary' && crossReferences[refKey] && crossReferences[refKey].length > 0;

                        return (
                          <div
                            key={`${item.type}-${item.verseNumber}-${index}`}
                            id={item.type === 'primary' ? `verse-${item.verseNumber}` : `right-pane-verse-${item.verseNumber}`}
                            className={`leading-relaxed p-3 rounded-md transition-colors ${
                              highlightedVerses.includes(item.verseNumber)
                                ? (isDarkMode ? 'bg-yellow-900' : 'bg-yellow-200')
                                : item.type === 'primary'
                                  ? (isDarkMode ? 'bg-gray-800' : 'bg-blue-50')
                                  : (isDarkMode ? 'bg-gray-700' : 'bg-gray-50')
                            } ${hasReference ? (isDarkMode ? 'hover:bg-blue-900' : 'hover:bg-blue-100') : ''}`}
                            style={{ fontSize: `${fontScale * 1.125}rem`, ...(highlightedVerses.includes(item.verseNumber) ? { borderLeft: '4px solid #eab308' } : {}) }}
                          >
                            <p className="flex">
                              <span className={`font-bold mr-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                {item.verseNumber}
                              </span>
                              <span className="flex-1">{renderWithGlosses(item.text, showGlosses)}</span>
                              <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ({item.translation})
                              </span>
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
                            {hasReference && showCrossRef === refKey && (
                              <div className={`mt-4 p-5 rounded-md shadow-sm ${
                                isDarkMode
                                  ? 'bg-blue-900 border border-blue-700'
                                  : 'bg-blue-50 border border-blue-200'
                              }`}>
                                <h4 className="font-medium mb-4 text-lg">Cross References:</h4>
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
                                      }`}>{renderWithGlosses(ref.text, showGlosses)}</p>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Chapter Navigation */}
                  <div className="mt-10 flex justify-between pb-4">
                    {selectedChapter > 1 ? (
                      <button
                        onClick={() => {
                          handleChapterSelect(selectedChapter - 1, true);
                          handleHomeReset();
                        }}
                        className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                      >
                        &lt; Previous Chapter (z)
                      </button>
                    ) : (
                      <div></div>
                    )}

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
                          if (chapterContentRef.current) {
                            setTimeout(() => {
                              chapterContentRef.current.scrollTop = 0;
                            }, 100);
                          }
                        }}
                        className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                      >
                        Next Chapter (m,;e) &gt;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Side-by-side View - Original two-pane layout */
            <>
          {/* Bible Text Display */}
          <div 
            ref={chapterContentRef} 
            className={`${isMobileView && !isTabletView && showKJVOnMobile ? 'hidden' : isMobileView && !isTabletView ? 'w-full' : isTabletView ? 'w-1/2' : 'w-1/2'} overflow-y-auto p-4 md:p-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white'} relative`}
            onClick={(event) => handlePaneClick(event, 'left')}
            style={{ cursor: 'default' }}
          >
            {selectedBook && selectedChapter > 0 && (
              <div>
                {/* Read and Repeat buttons - Hidden */}
                <div className="hidden mb-4 flex gap-2">
                  <button
                    className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center"
                    title="Read selected verse in English"
                    onClick={(event) => {
                      const readButtons = document.querySelectorAll('button[title="Read selected verse in English"]');
                      const targetButton = Array.from(readButtons).find(btn => btn !== event.target);
                      if (targetButton) {
                        targetButton.click();
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play w-6 h-6">
                      <polygon points="6 3 20 12 6 21 6 3"></polygon>
                    </svg>
                  </button>
                  <button 
                    className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center" 
                    title="Repeat selected verse in English"
                    onClick={(event) => {
                      const repeatButtons = document.querySelectorAll('button[title="Repeat selected verse in English"]');
                      const targetButton = Array.from(repeatButtons).find(btn => btn !== event.target);
                      if (targetButton) {
                        targetButton.click();
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat w-6 h-6">
                      <polyline points="17 1 21 5 17 9"></polyline>
                      <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                      <polyline points="7 23 3 19 7 15"></polyline>
                      <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                    </svg>
                  </button>
                  <button
                    className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center"
                    title="Scroll to next verse"
                    onClick={() => {
                      const event = new CustomEvent('navigateVerse', {
                        detail: { direction: 'next' }
                      });
                      window.dispatchEvent(event);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-6 h-6">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      try {
                        // Find current translation index
                        const currentIndex = translations.findIndex(t => t.id === rightPaneTranslation);

                        // Calculate next index (loops back to 0 after last item)
                        const nextIndex = (currentIndex + 1) % translations.length;
                        const nextTranslation = translations[nextIndex].id;

                        // Skip Hebrew translations if they cause issues
                        let finalTranslation = nextTranslation;
                        if (nextTranslation.includes('he_heb')) {
                          const afterHebrewIndex = (nextIndex + 1) % translations.length;
                          if (translations[afterHebrewIndex] && !translations[afterHebrewIndex].id.includes('he_heb')) {
                            finalTranslation = translations[afterHebrewIndex].id;
                          }
                        }

                        // Apply translation with delay to prevent scroll errors
                        setTimeout(() => {
                          try {
                            setRightPaneTranslation(finalTranslation);
                          } catch (error) {
                            console.warn('Error applying translation:', error);
                          }
                        }, 150);
                      } catch (error) {
                        console.warn('Error cycling translation:', error);
                      }
                    }}
                    className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center"
                    title="Cycle to next translation and apply to pane 2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-3 h-3 mr-1">
                      <path d="m9 18 6-6-6-6"></path>
                    </svg>
                    n t
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
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center"
                      title="Next Chapter"
                    >
                      Next Ch
                    </button>
                  )}

                </div>
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
                  {selectedBook && selectedBook.chapters && selectedBook.chapters[selectedChapter - 1] && selectedBook.chapters[selectedChapter - 1]
                    .map((verse, originalIndex) => ({ verse, verseNumber: originalIndex + 1 }))
                    .filter(({ verseNumber }) => {
                      // If filtering is disabled, show all verses
                      if (!showFilteredVersesOnly || !verseFilterData) return true;

                      // Check if we have filter data for current chapter
                      const currentChapterFilter = verseFilterData.chapters[selectedChapter];

                      // If no filter data for this chapter, show all verses
                      if (!currentChapterFilter) return true;

                      // Only show verses that are in the filter list
                      return currentChapterFilter.includes(verseNumber);
                    })
                    .map(({ verse, verseNumber }, displayIndex) => {
                    const refKey = `${selectedBook.abbrev}-${selectedChapter}-${verseNumber}`;
                    const hasReference = crossReferences[refKey] && crossReferences[refKey].length > 0;

                    return (
                      <div
                        key={verseNumber}
                        id={`verse-${verseNumber}`}
                        className={`leading-relaxed p-4 rounded-md transition-colors ${
                          hasReference
                            ? isDarkMode ? 'hover:bg-blue-900' : 'hover:bg-blue-50'
                            : ''
                        }`}
                        style={{ fontSize: `${fontScale * 1.125}rem` }}
                      >
                        <p className="flex">
                          <span className={`font-bold mr-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{verseNumber}</span>
                          <span className="flex-1">{renderWithGlosses(verse, showGlosses)}</span>
                          
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
                            <h4 className="font-medium mb-4 text-lg">Cross References:</h4>
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
                                  }`}>{renderWithGlosses(ref.text, showGlosses)}</p>
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
                      Next Chapter (m,;e) &gt;
                    </button>
                  )}

                  {/* Next Book button - appears when at last chapter but not at last book */}
                  {selectedBook && selectedChapter === selectedBook.chapters?.length && bibleData && (() => {
                    const currentBookIndex = bibleData.findIndex(b => b.abbrev === selectedBook.abbrev);
                    return currentBookIndex !== -1 && currentBookIndex < bibleData.length - 1;
                  })() && (
                    <button
                      onClick={() => {
                        console.log("=== NEXT BOOK BUTTON CLICKED ===");
                        const currentBookIndex = bibleData.findIndex(b => b.abbrev === selectedBook.abbrev);
                        console.log("Button - Current book index:", currentBookIndex);
                        console.log("Button - Total books:", bibleData.length);
                        
                        if (currentBookIndex !== -1 && currentBookIndex < bibleData.length - 1) {
                          const nextBook = bibleData[currentBookIndex + 1];
                          console.log("Button - Next Book found:", { 
                            currentBookIndex,
                            nextBookIndex: currentBookIndex + 1,
                            currentBook: selectedBook.abbrev, 
                            nextBook: nextBook.abbrev,
                            nextBookChapters: nextBook.chapters?.length 
                          });
                          
                          // Ensure the next book has valid chapter data
                          if (nextBook && nextBook.chapters && nextBook.chapters.length > 0) {
                            console.log("Button - Navigating to next book...");
                            setSelectedBook(nextBook);
                            setTimeout(() => {
                              console.log("Button - Calling handleChapterSelect(1, true)");
                              handleChapterSelect(1, true);
                            }, 100);
                          } else {
                            console.error("Button - Next book has invalid chapter data:", nextBook);
                          }
                        }
                      }}
                      className="bg-white bg-opacity-80 border border-orange-300 hover:bg-orange-100 text-orange-700 font-bold rounded px-8 py-4 shadow text-xl"
                    >
                      Next Book (1,2,3) &gt;
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
                style={{ cursor: 'default' }}
              >
                {selectedBook && selectedChapter > 0 && (
                <div>
                  {/* Read and Repeat buttons - Hidden */}
                  <div className="hidden mb-4 flex gap-2">
                    <button
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center"
                      title="Read selected verse in English"
                      onClick={(event) => {
                        const readButtons = document.querySelectorAll('button[title="Read selected verse in English"]');
                        const targetButton = Array.from(readButtons).find(btn => btn !== event.target);
                        if (targetButton) {
                          targetButton.click();
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play w-6 h-6">
                        <polygon points="6 3 20 12 6 21 6 3"></polygon>
                      </svg>
                    </button>
                    <button 
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center" 
                      title="Repeat selected verse in English"
                      onClick={(event) => {
                        const repeatButtons = document.querySelectorAll('button[title="Repeat selected verse in English"]');
                        const targetButton = Array.from(repeatButtons).find(btn => btn !== event.target);
                        if (targetButton) {
                          targetButton.click();
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat w-6 h-6">
                        <polyline points="17 1 21 5 17 9"></polyline>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <polyline points="7 23 3 19 7 15"></polyline>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                      </svg>
                    </button>
                    <button
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center"
                      title="Scroll to next verse"
                      onClick={() => {
                        const event = new CustomEvent('navigateVerse', {
                          detail: { direction: 'next' }
                        });
                        window.dispatchEvent(event);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-6 h-6">
                        <path d="m9 18 6-6-6-6"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        try {
                          // Find current translation index
                          const currentIndex = translations.findIndex(t => t.id === rightPaneTranslation);

                          // Calculate next index (loops back to 0 after last item)
                          const nextIndex = (currentIndex + 1) % translations.length;
                          const nextTranslation = translations[nextIndex].id;

                          // Skip Hebrew translations if they cause issues
                          let finalTranslation = nextTranslation;
                          if (nextTranslation.includes('he_heb')) {
                            const afterHebrewIndex = (nextIndex + 1) % translations.length;
                            if (translations[afterHebrewIndex] && !translations[afterHebrewIndex].id.includes('he_heb')) {
                              finalTranslation = translations[afterHebrewIndex].id;
                            }
                          }

                          // Apply translation with delay to prevent scroll errors
                          setTimeout(() => {
                            try {
                              setRightPaneTranslation(finalTranslation);
                            } catch (error) {
                              console.warn('Error applying translation:', error);
                            }
                          }, 150);
                        } catch (error) {
                          console.warn('Error cycling translation:', error);
                        }
                      }}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center"
                      title="Cycle to next translation and apply to pane 2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-3 h-3 mr-1">
                        <path d="m9 18 6-6-6-6"></path>
                      </svg>
                      n t
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
                        className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl flex items-center"
                        title="Next Chapter"
                      >
                        Next Ch
                      </button>
                    )}
                  </div>
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
                          return rightPaneBook.chapters[selectedChapter - 1]
                            .map((verse, originalIndex) => ({ verse, verseNumber: originalIndex + 1 }))
                            .filter(({ verseNumber }) => {
                              // If filtering is disabled, show all verses
                              if (!showFilteredVersesOnly || !verseFilterData) return true;

                              // Check if we have filter data for current chapter
                              const currentChapterFilter = verseFilterData.chapters[selectedChapter];

                              // If no filter data for this chapter, show all verses
                              if (!currentChapterFilter) return true;

                              // Only show verses that are in the filter list
                              return currentChapterFilter.includes(verseNumber);
                            })
                            .map(({ verse, verseNumber }) => {
                            return (
                              <div
                                key={verseNumber}
                                id={`right-pane-verse-${verseNumber}`}
                                className="leading-relaxed p-4 rounded-md transition-colors"
                                style={{ fontSize: `${fontScale * 1.125}rem` }}
                              >
                                <p className="flex">
                                  <span className={`font-bold mr-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{verseNumber}</span>
                                  <span className="flex-1">{renderWithGlosses(verse, showGlosses)}</span>
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
                        Next Chapter (m,;e) &gt;
                      </button>
                    )}

                    {/* Next Book button - appears when at last chapter but not at last book */}
                    {selectedBook && selectedChapter === selectedBook.chapters.length && bibleData && (() => {
                      const currentBookIndex = bibleData.findIndex(b => b.abbrev === selectedBook.abbrev);
                      return currentBookIndex !== -1 && currentBookIndex < bibleData.length - 1;
                    })() && (
                      <button
                        onClick={() => {
                          // Clear mobile scroll position immediately to prevent restoration
                          localStorage.removeItem('mobileScrollPosition');
                          setMobileScrollPosition(0);
                          
                          const currentBookIndex = bibleData.findIndex(b => b.abbrev === selectedBook.abbrev);
                          if (currentBookIndex !== -1 && currentBookIndex < bibleData.length - 1) {
                            const nextBook = bibleData[currentBookIndex + 1];
                            console.log("Next Book clicked (KJV panel):", { 
                              currentBook: selectedBook.abbrev, 
                              nextBook: nextBook.abbrev,
                              nextBookChapters: nextBook.chapters?.length 
                            });
                            
                            // Ensure the next book has valid chapter data
                            if (nextBook && nextBook.chapters && nextBook.chapters.length > 0) {
                              setSelectedBook(nextBook);
                              setTimeout(() => {
                                handleChapterSelect(1, true);
                              }, 100);
                            } else {
                              console.error("Next book has invalid chapter data:", nextBook);
                            }
                          }
                          
                          // Reset all scroll state after content loads
                          setTimeout(() => {
                            handleHomeReset();
                          }, 100);
                        }}
                        className="bg-white bg-opacity-80 border border-orange-300 hover:bg-orange-100 text-orange-700 font-bold rounded px-8 py-4 shadow text-xl"
                      >
                        Next Book (1,2,3) &gt;
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
            </>
          )}
        </div>
      </div>

      {/* Verse Grid TTS Right Sidebar */}
      {showVerseGrid && (() => {
        const abbrev = primaryReading.book ? primaryReading.book.abbrev : null;
        const chapterIdx = (primaryReading.chapter || 1) - 1;
        const bookObj = abbrev && chineseBibleData ? chineseBibleData.find(b => b.abbrev === abbrev) : null;
        const verses = bookObj && bookObj.chapters[chapterIdx] ? bookObj.chapters[chapterIdx] : [];
        const bookName = abbrev ? getBookName(abbrev) : '';
        return (
          <div className={`${isMobileView || isTabletView ? 'absolute right-0 z-10 h-full' : 'w-64'} ${isDarkMode ? 'bg-gray-800 text-white border-l border-gray-700' : 'bg-white border-l border-gray-200'} overflow-y-auto flex flex-col`}>
            <div className={`p-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-sm font-semibold truncate flex-1">
                {bookName} {primaryReading.chapter}
              </h3>
              <button
                onClick={closeVerseGrid}
                className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} focus:outline-none ml-1`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              {verses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {verses.flatMap((_, idx) => {
                    const vNum = idx + 1;
                    const isSpeakingM = speakingVerseNumber && speakingVerseNumber.verse === vNum && speakingVerseNumber.lang === 'mandarin';
                    const isSpeakingC = speakingVerseNumber && speakingVerseNumber.verse === vNum && speakingVerseNumber.lang === 'cantonese';
                    return [
                      <button
                        key={`${vNum}-m`}
                        onClick={() => speakVerseInGrid(vNum, 'mandarin')}
                        style={{
                          width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: isSpeakingM ? '#3b82f6' : (isDarkMode ? '#3a3a3a' : '#f0f0f0'),
                          color: isSpeakingM ? 'white' : (isDarkMode ? '#d0d0d0' : '#333'),
                          boxShadow: isSpeakingM ? '0 0 12px rgba(59,130,246,0.5)' : 'none'
                        }}
                      >
                        {vNum}
                      </button>,
                      <button
                        key={`${vNum}-c`}
                        onClick={() => speakVerseInGrid(vNum, 'cantonese')}
                        style={{
                          width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 600, border: '2px solid', borderRadius: 8, cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: isSpeakingC ? '#f59e0b' : (isDarkMode ? '#2a2a2a' : '#fff8f0'),
                          borderColor: isSpeakingC ? '#f59e0b' : (isDarkMode ? '#6b5b3a' : '#e0c090'),
                          color: isSpeakingC ? 'white' : (isDarkMode ? '#e0c080' : '#8b6914'),
                          boxShadow: isSpeakingC ? '0 0 12px rgba(245,158,11,0.5)' : 'none'
                        }}
                      >
                        {vNum}
                      </button>
                    ];
                  })}
                </div>
              ) : (
                <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {chineseBibleData ? 'No verses found.' : 'Loading...'}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Spanish Verse Grid TTS Right Sidebar */}
      {showSpanishGrid && (() => {
        const abbrev = primaryReading.book ? primaryReading.book.abbrev : null;
        const chapterIdx = (primaryReading.chapter || 1) - 1;
        const bookObj = abbrev && spanishBibleData ? spanishBibleData.find(b => b.abbrev === abbrev) : null;
        const verses = bookObj && bookObj.chapters[chapterIdx] ? bookObj.chapters[chapterIdx] : [];
        const bookName = abbrev ? getBookName(abbrev) : '';
        return (
          <div className={`${isMobileView || isTabletView ? 'absolute right-0 z-10 h-full' : 'w-64'} ${isDarkMode ? 'bg-gray-800 text-white border-l border-gray-700' : 'bg-white border-l border-gray-200'} overflow-y-auto flex flex-col`}>
            <div className={`p-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-sm font-semibold truncate flex-1">
                {bookName} {primaryReading.chapter} <span className="text-orange-500">(ES)</span>
              </h3>
              <button
                onClick={closeSpanishGrid}
                className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} focus:outline-none ml-1`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              {verses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {verses.map((_, idx) => {
                    const vNum = idx + 1;
                    const isSpeaking = speakingSpanishVerse === vNum;
                    return (
                      <button
                        key={vNum}
                        onClick={() => speakVerseInSpanishGrid(vNum)}
                        style={{
                          width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: isSpeaking ? '#f97316' : (isDarkMode ? '#3a3a3a' : '#f0f0f0'),
                          color: isSpeaking ? 'white' : (isDarkMode ? '#d0d0d0' : '#333'),
                          boxShadow: isSpeaking ? '0 0 12px rgba(249,115,22,0.5)' : 'none'
                        }}
                      >
                        {vNum}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {spanishBibleData ? 'No verses found.' : 'Loading...'}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Hebrew Verse Grid TTS Right Sidebar */}
      {showHebrewGrid && (() => {
        const abbrev = primaryReading.book ? primaryReading.book.abbrev : null;
        const chapterIdx = (primaryReading.chapter || 1) - 1;
        const bookObj = abbrev && hebrewNikkudData ? hebrewNikkudData.find(b => b.abbrev === abbrev) : null;
        const verses = bookObj && bookObj.chapters[chapterIdx] ? bookObj.chapters[chapterIdx] : [];
        const bookName = abbrev ? getBookName(abbrev) : '';
        return (
          <div className={`${isMobileView || isTabletView ? 'absolute right-0 z-10 h-full' : 'w-64'} ${isDarkMode ? 'bg-gray-800 text-white border-l border-gray-700' : 'bg-white border-l border-gray-200'} overflow-y-auto flex flex-col`}>
            <div className={`p-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-sm font-semibold truncate flex-1">
                {bookName} {primaryReading.chapter} <span className="text-indigo-500">(HE)</span>
              </h3>
              <button
                onClick={closeHebrewGrid}
                className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} focus:outline-none ml-1`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              {verses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {verses.map((_, idx) => {
                    const vNum = idx + 1;
                    const isSpeaking = speakingHebrewVerse === vNum;
                    return (
                      <button
                        key={vNum}
                        onClick={() => speakVerseInHebrewGrid(vNum)}
                        style={{
                          width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: isSpeaking ? '#6366f1' : (isDarkMode ? '#3a3a3a' : '#f0f0f0'),
                          color: isSpeaking ? 'white' : (isDarkMode ? '#d0d0d0' : '#333'),
                          boxShadow: isSpeaking ? '0 0 12px rgba(99,102,241,0.5)' : 'none'
                        }}
                      >
                        {vNum}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {hebrewNikkudData ? 'No verses found for this book.' : 'Loading...'}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* French Verse Grid TTS Right Sidebar */}
      {showFrenchGrid && (() => {
        const abbrev = primaryReading.book ? primaryReading.book.abbrev : null;
        const chapterIdx = (primaryReading.chapter || 1) - 1;
        const bookObj = abbrev && frenchBibleData ? frenchBibleData.find(b => b.abbrev === abbrev) : null;
        const verses = bookObj && bookObj.chapters[chapterIdx] ? bookObj.chapters[chapterIdx] : [];
        const bookName = abbrev ? getBookName(abbrev) : '';
        return (
          <div className={`${isMobileView || isTabletView ? 'absolute right-0 z-10 h-full' : 'w-64'} ${isDarkMode ? 'bg-gray-800 text-white border-l border-gray-700' : 'bg-white border-l border-gray-200'} overflow-y-auto flex flex-col`}>
            <div className={`p-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
              <h3 className="text-sm font-semibold truncate flex-1">
                {bookName} {primaryReading.chapter} <span className="text-blue-600">(FR)</span>
              </h3>
              <button
                onClick={closeFrenchGrid}
                className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} focus:outline-none ml-1`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              {verses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {verses.map((_, idx) => {
                    const vNum = idx + 1;
                    const isSpeaking = speakingFrenchVerse === vNum;
                    return (
                      <button
                        key={vNum}
                        onClick={() => speakVerseInFrenchGrid(vNum)}
                        style={{
                          width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: isSpeaking ? '#2563eb' : (isDarkMode ? '#3a3a3a' : '#f0f0f0'),
                          color: isSpeaking ? 'white' : (isDarkMode ? '#d0d0d0' : '#333'),
                          boxShadow: isSpeaking ? '0 0 12px rgba(37,99,235,0.5)' : 'none'
                        }}
                      >
                        {vNum}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {frenchBibleData ? 'No verses found.' : 'Loading...'}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Reference Prompt Modal */}
      {showRefPrompt && (() => {
        const refs = refPromptValue.split(',').map(r => r.trim()).filter(r => r);
        const validRefs = refs.map(r => ({ raw: r, parsed: parseSingleBibleRef(r) })).filter(r => r.parsed);
        // Helper: add current chapter + valid refs from input to history (deduped)
        const addToHistory = () => {
          setRefHistory(prev => {
            const existing = new Set(prev.map(h => `${h.parsed.abbrev}_${h.parsed.chapter}`));
            const toAdd = [];
            // Add current chapter first
            if (selectedBook && selectedChapter) {
              const curKey = `${selectedBook.abbrev}_${selectedChapter}`;
              if (!existing.has(curKey)) {
                const curLabel = `${getBookName(selectedBook.abbrev)} ${selectedChapter}`;
                toAdd.push({ raw: curLabel, parsed: { abbrev: selectedBook.abbrev, chapter: selectedChapter } });
                existing.add(curKey);
              }
            }
            // Then add typed refs
            for (const r of validRefs) {
              const key = `${r.parsed.abbrev}_${r.parsed.chapter}`;
              if (!existing.has(key)) {
                toAdd.push({ raw: r.raw, parsed: r.parsed });
                existing.add(key);
              }
            }
            if (toAdd.length === 0) return prev;
            return [...prev, ...toAdd];
          });
        };
        return (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRefPrompt(false); }}
        >
          <div style={{ background: isDarkMode ? '#2a2a2a' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1em', color: isDarkMode ? '#e0e0e0' : '#333', textAlign: 'center' }}>Go to Reference</h3>
            {/* Persistent history buttons above input */}
            {refHistory.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: isDarkMode ? '#999' : '#888', fontWeight: 600 }}>Saved</span>
                  <button
                    onClick={() => setRefHistory([])}
                    style={{ fontSize: 11, color: isDarkMode ? '#f87171' : '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }}
                  >
                    Clear
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {refHistory.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => { navigateToRef(h.raw); setShowRefPrompt(false); }}
                      style={{
                        padding: '5px 10px', fontSize: 12, border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`, borderRadius: 6,
                        cursor: 'pointer', fontWeight: 600,
                        background: isDarkMode ? '#383838' : '#f0f4ff',
                        color: isDarkMode ? '#93c5fd' : '#1d4ed8',
                        transition: 'background 0.15s'
                      }}
                      title={`Go to ${h.raw}`}
                    >
                      {h.raw}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              type="text"
              value={refPromptValue}
              onChange={(e) => setRefPromptValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && refPromptValue.trim()) {
                  addToHistory();
                  setRefPromptValue('');
                }
              }}
              placeholder="e.g. Ps 23, Ps 24, Matt 11:28"
              autoFocus
              style={{
                width: '100%', padding: '12px', fontSize: '16px', border: `2px solid ${isDarkMode ? '#555' : '#ccc'}`,
                borderRadius: 8, background: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#e0e0e0' : '#333',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => {
                  if (refPromptValue.trim()) {
                    addToHistory();
                    setRefPromptValue('');
                  }
                }}
                style={{ flex: 1, padding: '12px', fontSize: 15, border: 'none', borderRadius: 8, background: '#007bff', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                Save
              </button>
              <button
                onClick={() => { setShowRefPrompt(false); setRefPromptValue(''); }}
                style={{ flex: 1, padding: '12px', fontSize: 15, border: 'none', borderRadius: 8, background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Collection Modal */}
      {showCollectionModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCollectionModal(false); setExpandedCollection(null); } }}
        >
          <div style={{ background: isDarkMode ? '#2a2a2a' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative' }}>
            <button
              onClick={() => { setShowCollectionModal(false); setExpandedCollection(null); }}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1, color: isDarkMode ? '#aaa' : '#666', fontSize: 20 }}
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2em', color: isDarkMode ? '#e0e0e0' : '#333', textAlign: 'center' }}>Select a Collection</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.keys(referenceCollections).map((name) => (
                <div key={name}>
                  <button
                    onClick={() => setExpandedCollection(expandedCollection === name ? null : name)}
                    style={{
                      width: '100%', padding: '14px 18px', fontSize: 16, border: `2px solid ${expandedCollection === name ? '#667eea' : (isDarkMode ? '#444' : '#e0e0e0')}`,
                      borderRadius: expandedCollection === name ? '10px 10px 0 0' : 10, background: expandedCollection === name ? (isDarkMode ? '#3a3a5a' : '#f0f2ff') : (isDarkMode ? '#333' : 'white'), cursor: 'pointer',
                      textAlign: 'left', color: isDarkMode ? '#e0e0e0' : '#333', fontWeight: 600,
                      transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    {name}
                    <span style={{ fontSize: 12, opacity: 0.6 }}>{expandedCollection === name ? '▲' : '▼'}</span>
                  </button>
                  {expandedCollection === name && (
                    <div style={{
                      border: `2px solid #667eea`, borderTop: 'none', borderRadius: '0 0 10px 10px',
                      background: isDarkMode ? '#1e1e2e' : '#fafbff', padding: '8px 0'
                    }}>
                      {referenceCollections[name].split('\n').map(l => l.trim()).filter(l => l).map((ref, i) => {
                        const isLastClicked = lastCollectionClick.collection === name && lastCollectionClick.ref === ref;
                        return (
                          <button
                            key={i}
                            onClick={() => { navigateToRefWithHighlight(ref); setLastCollectionClick({ collection: name, ref }); setShowCollectionModal(false); }}
                            style={{
                              display: 'block', width: '100%', padding: '8px 18px', fontSize: 14,
                              border: 'none', cursor: 'pointer',
                              textAlign: 'left', fontWeight: isLastClicked ? 700 : 400,
                              transition: 'background 0.15s',
                              background: isLastClicked ? (isDarkMode ? '#3a3a2a' : '#fef9c3') : 'transparent',
                              color: isLastClicked ? (isDarkMode ? '#fde047' : '#854d0e') : (isDarkMode ? '#a0b0ff' : '#3355cc'),
                              borderLeft: isLastClicked ? '3px solid #eab308' : '3px solid transparent'
                            }}
                            onMouseEnter={(e) => { if (!isLastClicked) e.target.style.background = isDarkMode ? '#2a2a4a' : '#e8ecff'; }}
                            onMouseLeave={(e) => { if (!isLastClicked) e.target.style.background = 'transparent'; }}
                          >
                            {ref}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowCollectionModal(false); setExpandedCollection(null); }}
              style={{ marginTop: 16, width: '100%', padding: 12, fontSize: 15, border: 'none', borderRadius: 8, background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default BibleApp;