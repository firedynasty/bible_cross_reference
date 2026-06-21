import React, { useState, useEffect, useRef, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { Book, Link, ChevronRight, History, BookOpen, Save, Database, Download } from 'lucide-react';
import TextToSpeech from './components/TextToSpeech';
import FurtherReadingModal from './components/FurtherReadingModal';
import ClassicalMusicModal from './components/ClassicalMusicModal';
import YouTubeVideoModal from './components/YouTubeVideoModal';
import { getStorytimeAudioUrl } from './data/storytimeAudio';
import { getRhymeAudioUrl } from './data/rhymeAudio';

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
let _soakingAudio = null;
function toggleSoaking() {
  if (!_soakingAudio) {
    _soakingAudio = new Audio('https://www.dropbox.com/scl/fi/hiz6z82rwhpjhr1ip6ipm/QUIET-TIME-WITH-GOD-Soaking-worship-instrumental-Prayer-and-Devotional-OsgkVc-pWv8.mp3?rlkey=w99i60rnicu9asf4ev6vk958a&st=kardpkw1&raw=1');
    _soakingAudio.preload = 'auto';
    _soakingAudio.addEventListener('ended', () => {
      const btn = document.getElementById('soaking-btn');
      if (btn) btn.textContent = 'Soaking(s)';
    });
  }
  if (!_soakingAudio.paused) {
    _soakingAudio.pause();
    return false;
  } else {
    const randomTime = Math.random() * 3000;
    _soakingAudio.currentTime = randomTime;
    _soakingAudio.play().catch(() => {});
    return true;
  }
}

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
  isSepiaMode,
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
  showPane2Only,
  onPane2OnlyToggle,
  dualPanePD,
  onDualPanePDToggle,
  onShowVerseGrid,
  chineseBibleData,
  lastGridVerse,
  pane2Book,
  pane2Chapter,
  gridReadMode,
  onGridReadModeToggle,
  onNextChapter,
  onQA,
  showStudyQModal,
  onQuiz,
  showQuizModal,
  onWords,
  showWordsModal,
  onQuiz2,
  showQuiz2Modal,
  onBuckets,
  showBucketsModal,
  onCursive,
  showCursiveModal,
  onBreathe,
  showBreatheModal,
  sidebarLang,
  onSidebarLangCycle,
  onLangToggleOpen,
  showVerseGrid,
  showSpanishGrid,
  showHebrewGrid,
  showFrenchGrid,
  fontScale,
  onFontScaleDown,
  onFontScaleUp,
  onClassicalMusic,
  onClassicalTogglePlay,
  classicalPlaying,
  onYouTubeVideo,
  isYouTubePlaying,
  showPane2Syllables,
  onTogglePane2Syllables,
  syllabifyText,
  onRefPrompt,
  isFeatureVisible
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
        
        {/* Reference Prompt Button */}
        {isFeatureVisible('ref') && <button
          onClick={() => onRefPrompt && onRefPrompt()}
          className="ml-2 px-2 py-0.5 rounded focus:outline-none text-xs bg-blue-500 text-white hover:bg-blue-600 font-semibold"
          title="Go to a Bible reference (r)"
        >
          Ref(r)
        </button>}

        {/* Syllable toggle for pane 2 */}
        {isFeatureVisible('syllable') && <button
          onClick={() => onTogglePane2Syllables && onTogglePane2Syllables()}
          className={`ml-2 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showPane2Syllables ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
          title={showPane2Syllables ? 'Syllable breaks ON (click to hide)' : 'Show syllable breaks in pane 2'}
        >
          {showPane2Syllables ? 'Syl: ON' : 'Syllable'}
        </button>}

        {/* Dark Mode Toggle Button */}
        {isFeatureVisible('darkMode') && <button
          onClick={() => onDarkModeToggle && onDarkModeToggle()}
          className={`ml-2 px-2 py-0.5 rounded focus:outline-none ${
            isDarkMode
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : isSepiaMode
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-700 text-white hover:bg-gray-800'
          }`}
          title={isDarkMode ? "Switch to sepia mode" : isSepiaMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? 'Sepia (d)' : isSepiaMode ? 'Light (d)' : 'Dark (d)'}
        </button>}

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
        <div className="relative ml-2 flex-shrink-0 hidden">
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

        {/* Show All Verses Toggle Button - hidden */}
        {false && verseFilterData && (
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

        {/* Font Size Controls */}
        {isFeatureVisible('fontMinus') && <button
          onClick={onFontScaleDown}
          className="ml-2 px-2 py-0.5 rounded focus:outline-none text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold"
          title="Decrease font size"
        >
          -
        </button>}
        {isFeatureVisible('fontPlus') && <button
          onClick={onFontScaleUp}
          className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold"
          title="Increase font size"
        >
          +
        </button>}

        {/* Language cycle + open buttons */}
        {(() => {
          const langColors = {
            en: 'bg-gray-500 hover:bg-gray-600',
            cant: 'bg-amber-500 hover:bg-amber-600',
            chin: 'bg-green-500 hover:bg-green-600',
            heb: 'bg-indigo-500 hover:bg-indigo-600',
            span: 'bg-orange-500 hover:bg-orange-600',
            fr: 'bg-blue-600 hover:bg-blue-700',
          };
          const isOpen = showVerseGrid || showSpanishGrid || showHebrewGrid || showFrenchGrid;
          const label = sidebarLang || 'en';
          const colorClass = langColors[label];
          return (
            <>
              {isFeatureVisible('youtube') && <button
                className={`ml-1 rounded focus:outline-none ${isYouTubePlaying ? 'ring-2 ring-white ring-offset-1 ring-offset-red-600' : ''}`}
                style={{padding:'4px 10px',background:'linear-gradient(45deg,#888,#666)',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}
                title="Book overview video (y)"
                onClick={() => onYouTubeVideo && onYouTubeVideo()}
              >
                <svg width="22" height="16" viewBox="0 0 68 48" style={{flexShrink:0}}><path d="M66.5 7.7s-.7-4.7-2.7-6.8C61-1.7 58-1.7 56.6-1.9 47.3-2.6 34-2.6 34-2.6s-13.3 0-22.6.7C10-1.7 7-1.7 4.2.9 2.2 3 1.5 7.7 1.5 7.7S.8 13.2.8 18.8v5.2c0 5.5.7 11.1.7 11.1s.7 4.7 2.7 6.8c2.8 2.6 6.4 2.5 8 2.8 5.8.5 24.8.7 24.8.7s13.3 0 22.6-.7c1.4-.2 4.4-.2 7.2-2.8 2-2.1 2.7-6.8 2.7-6.8s.7-5.5.7-11.1v-5.2c0-5.6-.7-11.1-.7-11.1z" fill="red"/><path d="M27 33V13l18.2 10L27 33z" fill="white"/></svg>
                <span style={{fontSize:10,color:'#ccc'}}>(y)</span>
              </button>}
              {isFeatureVisible('lang') && <>
              <span className="ml-2" style={{ fontSize: 16 }}>🔊</span>
              <button
                onClick={onSidebarLangCycle}
                className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs text-white font-semibold ${colorClass}`}
                title="Cycle language (en / cant / chin / heb / span / fr)"
              >
                {label}
              </button>
              </>}
              {/* Freestyle Beats Toggle */}
              {isFeatureVisible('soaking') && (() => {
                const audioRef = React.createRef();
                // Use a module-level approach via data attribute on the button
                return (
                  <button
                    className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold bg-yellow-200 text-yellow-800 hover:bg-yellow-300"
                    title="Play/pause soaking worship (s)"
                    id="soaking-btn"
                    onClick={() => {
                      const playing = toggleSoaking();
                      document.getElementById('soaking-btn').textContent = playing ? '⏸ Soaking' : 'Soaking(s)';
                    }}
                  >
                    Soaking(s)
                  </button>
                );
              })()}
              {isFeatureVisible('classical') && <button
                className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold bg-amber-100 text-amber-900 hover:bg-amber-200"
                title="Open classical music player"
                onClick={() => onClassicalMusic && onClassicalMusic()}
              >
                🎻
              </button>}
              {isFeatureVisible('classicalPlay') && <button
                className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${
                  classicalPlaying
                    ? 'bg-red-200 text-red-800 hover:bg-red-300'
                    : 'bg-green-200 text-green-800 hover:bg-green-300'
                }`}
                title={classicalPlaying ? 'Pause classical music' : 'Play classical music'}
                onClick={() => onClassicalTogglePlay && onClassicalTogglePlay()}
              >
                {classicalPlaying ? '⏸' : '▶'}
              </button>}
            </>
          );
        })()}

        {/* Grid TTS Read Mode Toggle - hidden */}
        <button
          onClick={() => onGridReadModeToggle && onGridReadModeToggle()}
          className={`hidden ml-2 px-2 py-0.5 rounded focus:outline-none text-xs ${
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
          currentBook={pane2Book ? pane2Book.abbrev : book.abbrev}
          currentChapter={pane2Chapter || chapter}
          rightPaneTranslation={rightPaneTranslation}
          speechVolume={speechVolume}
          translations={translations}
          onTranslationChange={onTranslationChange}
          chineseBibleData={chineseBibleData}
          lastGridVerse={lastGridVerse}
          onNextChapter={() => onNextChapter && book && chapter < book.chapters.length && onNextChapter(chapter + 1, true)}
          onQA={onQA}
          showStudyQModal={showStudyQModal}
          onQuiz={onQuiz}
          showQuizModal={showQuizModal}
          onWords={onWords}
          showWordsModal={showWordsModal}
          onQuiz2={onQuiz2}
          showQuiz2Modal={showQuiz2Modal}
          onBuckets={onBuckets}
          showBucketsModal={showBucketsModal}
          onCursive={onCursive}
          showCursiveModal={showCursiveModal}
          onBreathe={onBreathe}
          showBreatheModal={showBreatheModal}
          showPane2Syllables={showPane2Syllables}
          onTogglePane2Syllables={onTogglePane2Syllables}
          isFeatureVisible={isFeatureVisible}
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
Psalm 111:10`,
  "Worship Soak": `Hebrews 3:4
Romans 1:20
Jeremiah 32:17
Numbers 6:24-26
Genesis 2:3
Romans 11:36
Psalm 121:1-2
Ephesians 2:10
Genesis 1:27
Psalm 33:6
Isaiah 40:28
Ecclesiastes 3:11
Psalm 90:2
Romans 8:19
Psalm 139:13-14
Amos 9:6
John 1:3
Psalm 124:8
Acts 17:28`,
  "Miracles": `Genesis 1:1
Exodus 17:20
Exodus 14:21-22
Deuteronomy 21:34-35
1 Kings 17:21-22
1 Kings 18:36-38
2 Kings 5:14
1 Chronicles 29:11-12
Jeremiah 32:17
Matthew 1:20, 23
Matthew 11:5
Luke 8:24
John 20:31`,
  "Ask": `Jeremiah 33:3
Ecclesiastes 11:5
Proverbs 14:29
Proverbs 4:7
Psalm 32:8
2 Corinthians 4:18
Ephesians 1:17
Proverbs 19:21
1 Thessalonians 5:21-22
Psalm 119:130
Matthew 19:26
Isaiah 55:9
Isaiah 40:28
2 Corinthians 10:3
2 Peter 3:18`
};

// Dropbox PKCE OAuth helpers
const DROPBOX_APP_KEY = process.env.REACT_APP_DROPBOX_APP_KEY || '';
const DROPBOX_REDIRECT_URI = window.location.origin;

const generateCodeVerifier = () => {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const generateCodeChallenge = async (verifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const BIBLE_NOUNS = [
  'God','Jesus','Christ','Lord','Spirit','Son','Father','Man',
  'Kingdom','Gospel','Heaven','Faith','Sin','Grace','Love',
  'Life','Death','Cross','Temple','Sabbath','Prophet','Angel',
  'Baptism','Repentance','Prayer','Forgiveness','Glory','Power',
  'Truth','Light','Darkness','Bread','Wine','Water','Fire',
  'Mountain','Sea','Wilderness','Boat','Crowd','Disciples',
  'Pharisees','Scribes','Priest','Simon','Peter','James','John',
  'Andrew','Judas','Pilate','Barabbas','Mary','David','Moses',
  'Elijah','Isaiah','Satan','Demon','Vineyard','Shepherd','Sheep',
  'Seed','Harvest','Fig Tree','Tomb','Stone','Sword','Rooster',
  'Covenant','Commandment','Parable','Miracle','Sign','Voice',
  'Heart','Soul','Eye','Hand','Blood','Body','Garment','Cloak',
  'Net','Fish','Loaves','Salt','Lamp','Door','Key','Crown',
  'Throne','Scripture','Testimony','Mercy','Peace','Joy',
  'Wisdom','Righteousness','Salvation','Resurrection','Passover',
  'Church','Apostle','Tongue','Charity','Marriage','Husband','Wife',
  'Flesh','Law','Circumcision','Abraham','Promise','Blessing',
  'Freedom','Armor','Helmet','Shield','Breastplate','Psalm',
  'Refuge','Rock','Fortress','Enemy','Wicked','Righteous'
];

function extractWordsFromVerses(verses) {
  if (!verses || !verses.length) return BIBLE_NOUNS.slice();
  var text = verses.map(v => typeof v === 'string' ? v : (v.text || v.verse || String(v))).join(' ');
  var found = [];
  for (var i = 0; i < BIBLE_NOUNS.length; i++) {
    var re = new RegExp('\\b' + BIBLE_NOUNS[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(text)) found.push(BIBLE_NOUNS[i]);
  }
  if (found.length < 2) found = BIBLE_NOUNS.slice();
  // Shuffle
  for (var j = found.length - 1; j > 0; j--) {
    var k = Math.floor(Math.random() * (j + 1));
    var tmp = found[j]; found[j] = found[k]; found[k] = tmp;
  }
  var pairs = [];
  var count = Math.min(4, Math.floor(found.length / 2));
  for (var p = 0; p < count; p++) {
    pairs.push([found[p * 2], found[p * 2 + 1]]);
  }
  return pairs;
}

const WordsModal = ({ verses, bookName, chapter, totalChapters, bookAbbrev, rightPaneBibleData, bibleData, onClose }) => {
  const [pairs, setPairs] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(chapter);
  const timerRef = useRef(null);

  const getVersesForChapter = useCallback((ch) => {
    let v = [];
    if (rightPaneBibleData && bookAbbrev) {
      const rpBook = rightPaneBibleData.find(b => b.abbrev === bookAbbrev);
      if (rpBook && rpBook.chapters[ch - 1]) v = rpBook.chapters[ch - 1];
    }
    if (!v.length && bibleData && bookAbbrev) {
      const bk = bibleData.find(b => b.abbrev === bookAbbrev);
      if (bk && bk.chapters[ch - 1]) v = bk.chapters[ch - 1];
    }
    return v;
  }, [rightPaneBibleData, bibleData, bookAbbrev]);

  const shuffle = useCallback(() => {
    const v = getVersesForChapter(selectedChapter);
    setPairs(extractWordsFromVerses(v));
  }, [selectedChapter, getVersesForChapter]);

  useEffect(() => {
    shuffle();
    timerRef.current = setInterval(shuffle, 10000);
    return () => clearInterval(timerRef.current);
  }, [shuffle]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); shuffle(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, shuffle]);

  const chapterOptions = [];
  for (let i = 1; i <= totalChapters; i++) {
    chapterOptions.push(<option key={i} value={i}>{bookName} {i}</option>);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 20, right: 30, fontSize: 36, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', lineHeight: 1 }}
      >
        &times;
      </button>
      <select
        value={selectedChapter}
        onChange={(e) => setSelectedChapter(Number(e.target.value))}
        style={{ width: '80%', maxWidth: 400, padding: '6px 8px', marginBottom: 18, borderRadius: 6, border: '1px solid #555', background: '#222', color: '#fff', fontSize: 14 }}
      >
        {chapterOptions}
      </select>
      {pairs.map((pair, i) => (
        <div key={i} style={{ fontSize: 'clamp(28px, 6vw, 52px)', fontWeight: 'bold', color: '#fff', margin: '18px 0', letterSpacing: 2 }}>
          {pair[0]} <span style={{ color: '#f5c842', margin: '0 12px' }}>&amp;</span> {pair[1]}
        </div>
      ))}
      <button
        onClick={shuffle}
        style={{ marginTop: 18, padding: '8px 22px', fontSize: 16, borderRadius: 6, border: '1px solid #555', background: '#222', color: '#fff', cursor: 'pointer' }}
      >
        Shuffle(→)
      </button>
    </div>
  );
};

// Main component
const BibleApp = () => {
  const [bibleData, setBibleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [showFiguresModal, setShowFiguresModal] = useState(false);
  const [showClassicalModal, setShowClassicalModal] = useState(false);
  const [classicalPlaying, setClassicalPlaying] = useState(false);
  const classicalRef = useRef(null);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [isYouTubePlaying, setIsYouTubePlaying] = useState(false);
  const [pendingBookSelection, setPendingBookSelection] = useState(null);
  const pendingBookRef = useRef(null);
  const [crossReferences, setCrossReferences] = useState({});

  // Refs so keyboard handlers always see fresh values without stale closures
  const selectedBookRef = useRef(null);
  const selectedChapterRef = useRef(1);
  useEffect(() => { selectedBookRef.current = selectedBook; }, [selectedBook]);
  useEffect(() => { selectedChapterRef.current = selectedChapter; }, [selectedChapter]);

  // Independent pane 2 book/chapter (for cross-ref navigation)
  const [pane2Book, setPane2Book] = useState(null);
  const [pane2Chapter, setPane2Chapter] = useState(null);
  const pane2BookRef = useRef(null);
  const pane2ChapterRef = useRef(null);
  useEffect(() => { pane2BookRef.current = pane2Book; }, [pane2Book]);
  useEffect(() => { pane2ChapterRef.current = pane2Chapter; }, [pane2Chapter]);
  const [pane2History, setPane2History] = useState([]); // back-navigation stack

  // Reset pane 2 when a new book is selected (so pane 2 follows pane 1 on book changes)
  useEffect(() => {
    setPane2Book(null);
    setPane2Chapter(null);
  }, [selectedBook]);

  // Debug effect to track pendingBookSelection changes
  useEffect(() => {
    console.log('pendingBookSelection state changed to:', pendingBookSelection?.abbrev);
    console.log('Full pendingBookSelection object:', pendingBookSelection);
    pendingBookRef.current = pendingBookSelection;
  }, [pendingBookSelection]);
  const [showCrossRef, setShowCrossRef] = useState(null);
  const [expandedRefsData, setExpandedRefsData] = useState(null); // { verseLabel, refs: [{label, text}] }

  // Add refs for the chapter content containers
  const chapterContentRef = useRef(null);
  const kjvContentRef = useRef(null);
  const sidebarScrollRef = useRef(null);
  const isManuallyScrolling = useRef(false);
  const lastPrimaryScrollPos = useRef(0);
  const resetScrollTimerRef = useRef(null);
  const swipeTouchStartX = useRef(null);
  const swipeTouchStartY = useRef(null);
  const reciteTouchStartX = useRef(null);
  const reciteTouchStartY = useRef(null);
  const reciteCardRef = useRef(null);
  const sliderActiveRef = useRef(false);
  const sliderActiveTimerRef = useRef(null);

  // State to track primary reading vs cross-reference viewing
  const [isViewingCrossRef, setIsViewingCrossRef] = useState(false);
  const [lastCrossRef, setLastCrossRef] = useState(null); // { book, chapter, verse, label }

  // State for book number input with timeout

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

  const [primaryReading, setPrimaryReading] = useState({
    book: null,
    chapter: 1
  });
  
  // Add translation support for left pane
  const [selectedTranslation, setSelectedTranslation] = useState('en_kjv.json');
  const [selectedDropdownTranslation, setSelectedDropdownTranslation] = useState('en_kjv.json');
  
  // Add translation support for right pane (default to CUV)
  const [rightPaneTranslation, setRightPaneTranslation] = useState('zh_cuv.json');
  
  // Store right pane Bible data
  const [rightPaneBibleData, setRightPaneBibleData] = useState(null);
  
  // Add scroll sync mode state
  
  // Add sticky pane control (which pane controls the other)
  const [stickyPane, setStickyPane] = useState('kjv'); // 'primary' or 'kjv'

  // Gloss display control
  const [showGlosses, setShowGlosses] = useState(true);

  // View mode control (side-by-side, interleaved, or interleaved-pd)
  // Toggle buttons are currently hidden — force side-by-side on load so users
  // with a stale 'interleaved' value in localStorage don't get stuck.
  const [viewMode, setViewMode] = useState(() => {
    const stored = localStorage.getItem('bibleAppViewMode');
    if (stored !== 'side-by-side') localStorage.setItem('bibleAppViewMode', 'side-by-side');
    return 'side-by-side';
  });
  useEffect(() => { localStorage.setItem('bibleAppViewMode', viewMode); }, [viewMode]);

  // Pane 2 only mode - hides pane 1, shows only pane 2 at full width
  const [showPane2Only, setShowPane2Only] = useState(false);
  // Blank pane 1 content (keeps pane visible but empties text so Cmd+F skips it)
  const [blankPane1, setBlankPane1] = useState(() => localStorage.getItem('blankPane1') === 'true');
  // Reading guide — horizontal ruler line following mouse
  const [readingGuide, setReadingGuide] = useState(() => localStorage.getItem('readingGuide') === 'true');
  const readingGuideRef = useRef(null);
  useEffect(() => {
    if (!readingGuide) return;
    const handler = (e) => {
      if (readingGuideRef.current) readingGuideRef.current.style.top = e.clientY + 'px';
    };
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, [readingGuide]);
  // Dual pane page-down mode - clicking either pane scrolls it down
  const [dualPanePD, setDualPanePD] = useState(false);
  // Count clicks at bottom of pane 2 before auto-advancing chapter
  const pane2BottomClickCount = useRef(0);
  // Timestamp of last chapter advance — blocks page-down for 500ms after change
  const pane2ChapterChangedAt = useRef(0);

  // Grid TTS read mode: 'delimit' (part-by-part click) or 'undelimit' (auto-read all parts with pauses)
  const [gridReadMode, setGridReadMode] = useState(() => localStorage.getItem('bibleAppGridReadMode') || 'delimit');
  const gridReadModeRef = useRef(localStorage.getItem('bibleAppGridReadMode') || 'delimit');
  useEffect(() => { gridReadModeRef.current = gridReadMode; localStorage.setItem('bibleAppGridReadMode', gridReadMode); }, [gridReadMode]);

  // Mobile responsiveness states
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showKJVOnMobile, setShowKJVOnMobile] = useState(true);

  // Font size control (multiplier: 1 = base size)
  const [fontScale, setFontScale] = useState(() => {
    try {
      const stored = localStorage.getItem('bible-font-scale');
      if (stored == null) return 1;
      const n = parseFloat(stored);
      if (isNaN(n)) return 1;
      return Math.min(2, Math.max(0.5, n));
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('bible-font-scale', String(fontScale)); } catch {}
  }, [fontScale]);
  
  // Available translations
  const translations = React.useMemo(() => [
    { id: 'en_kjv.json', name: 'English - King James Version (KJV)' },
    { id: 'en_web.json', name: 'English - World English Bible (WEB)' },
    { id: 'zh_cuv_no_space.json', name: 'Chinese - CUV (No Space)' },
    { id: 'es_rvr.json', name: 'Spanish - Reina Valera Revisada (RVR)' },
    { id: 'he_heb_nikkud.json', name: 'Hebrew - With Nikkud (Vowel Points)' },
    { id: 'he_heb_strong.json', name: 'Hebrew - With Strong\'s Numbers' },
    { id: 'fr_apee.json', name: 'French - APEE' },
    { id: 'en_bsb.json', name: 'English - Berean Standard Bible (BSB)' },
    { id: 'en_rhyme.json', name: 'English - Bible Rhyme' },
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
  
  // State to track theme mode: 'light', 'dark', or 'sepia'
  const [themeMode, setThemeMode] = useState('light');
  const isDarkMode = themeMode === 'dark';
  const isSepiaMode = themeMode === 'sepia';
  
  // Feature button visibility toggles — all visible by default
  const allFeatureKeys = [
    'search', 'rhyme', 'storyAudio', 'chpCopy', 'ruler', 'col', 'hymn', 'prompt',
    'nltPsalms', 'plan', 'math', 'figures', 'copyPane2', 'toggleCuv', 'togglePsalms',
    'toggleRhyme', 'cyclePane1', 'clrPane1', 'ref', 'syllable', 'darkMode', 'fontMinus',
    'fontPlus', 'youtube', 'lang', 'soaking', 'classical', 'classicalPlay',
    'qa', 'quiz', 'words', 'recite', 'cursive', 'breathe', 'goTextR', 'oaiKey',
    'oaiRead', 'kjvRead', 'ttsChpCopy'
  ];
  const featureLabels = {
    search: 'Search & Story', rhyme: 'Rhyme', storyAudio: 'Story ▶/⏸', chpCopy: 'Chp📋',
    ruler: '📏 Ruler', col: 'Groupings', hymn: 'Hymn', prompt: 'Prompt',
    nltPsalms: 'NLT(Ps)', plan: 'Plan', math: 'Math', figures: 'Figures',
    copyPane2: 'Copy Pane 2', toggleCuv: 'KJV/CUV', togglePsalms: 'Psalms/Prov',
    toggleRhyme: 'WEB/Rhyme', cyclePane1: '1:cycle', clrPane1: 'clr pane 1',
    ref: 'Ref(r)', syllable: 'Syllable', darkMode: 'Dark/Light', fontMinus: 'Font -',
    fontPlus: 'Font +', youtube: 'YouTube', lang: 'Language', soaking: 'Soaking',
    classical: '🎻 Classical', classicalPlay: 'Classical ▶/⏸',
    qa: 'QA', quiz: 'Quiz', words: 'Words(w)', recite: 'Recite', cursive: 'Cursive',
    breathe: 'br_ (Breathe)', goTextR: 'Go:TextR', oaiKey: 'Key',
    oaiRead: 'Read (OpenAI)', kjvRead: 'Read:KJV', ttsChpCopy: 'TTS Chp📋'
  };
  const [visibleFeatures, setVisibleFeatures] = useState(() => {
    try {
      const saved = localStorage.getItem('bible-visible-features');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return Object.fromEntries(allFeatureKeys.map(k => [k, true]));
  });
  const [showFeatureToggleModal, setShowFeatureToggleModal] = useState(false);
  const isFeatureVisible = (key) => visibleFeatures[key] !== false;
  const toggleFeature = (key) => {
    setVisibleFeatures(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('bible-visible-features', JSON.stringify(next));
      return next;
    });
  };

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
  const [collectionVersePreview, setCollectionVersePreview] = useState(null); // { ref, text, collection }
  const [refPromptValue, setRefPromptValue] = useState('');
  const [refHistory, setRefHistory] = useState(() => {
    try { const s = localStorage.getItem('bibleRefHistory'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem('bibleRefHistory', JSON.stringify(refHistory)); } catch {}
  }, [refHistory]);

  // State for Dropbox integration
  const [dropboxAccessToken, setDropboxAccessToken] = useState(null);
  const [showDropboxModal, setShowDropboxModal] = useState(false);
  const [dropboxRefs, setDropboxRefs] = useState([]);
  const [dropboxFiles, setDropboxFiles] = useState([]);
  const [dropboxStatus, setDropboxStatus] = useState('');
  const [dropboxView, setDropboxView] = useState('files'); // 'files' | 'content'
  const [dropboxFolderPath, setDropboxFolderPath] = useState('');

  // State for Text Paste (in Go to Reference modal)
  const [textPasteContent, setTextPasteContent] = useState('');
  const [textParsedRefs, setTextParsedRefs] = useState([]);
  const [refRegexMode, setRefRegexMode] = useState(() => {
    try { return localStorage.getItem('bibleRefRegexMode') || 'parenthesized'; } catch { return 'parenthesized'; }
  });
  const [refNotes, setRefNotes] = useState(() => localStorage.getItem('bibleRefNotes') || '');

  // State for Book Search Modal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPane2TranslationPicker, setShowPane2TranslationPicker] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLastInfo, setSearchLastInfo] = useState('');
  const [searchTranslation, setSearchTranslation] = useState(() => localStorage.getItem('searchTranslation') || 'KJV');
  const searchDataCacheRef = useRef({});
  const [searchStartRef, setSearchStartRef] = useState('');

  // State for Fill-in-the-Blank Quiz Modal
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [fitbData, setFitbData] = useState(null);
  const [fitbRevealed, setFitbRevealed] = useState({});
  const [quizFontSize, setQuizFontSize] = useState(() => {
    try { const s = localStorage.getItem('quiz-font-size'); const n = parseInt(s); return (!isNaN(n) && n >= 10 && n <= 28) ? n : 14; } catch { return 14; }
  });
  const [quiz2FontSize, setQuiz2FontSize] = useState(() => {
    try { const s = localStorage.getItem('quiz2-font-size'); const n = parseInt(s); return (!isNaN(n) && n >= 10 && n <= 28) ? n : 14; } catch { return 14; }
  });

  // State for Buckets Modal
  const [showBucketsModal, setShowBucketsModal] = useState(false);
  const [bucketIndex, setBucketIndex] = useState(0);
  const [bucketSlider, setBucketSlider] = useState(1);
  const [bucketFontSize, setBucketFontSize] = useState(14);

  // State for Cursive Writing Modal
  const [showCursiveModal, setShowCursiveModal] = useState(false);
  const [cursiveBucketIndex, setCursiveBucketIndex] = useState(0);
  const [cursiveSpeed, setCursiveSpeed] = useState(() => parseInt(localStorage.getItem('cursive-speed') ?? '3'));
  const [cursiveSize, setCursiveSize] = useState(() => parseInt(localStorage.getItem('cursive-size') ?? '52'));
  const [cursiveReveal, setCursiveReveal] = useState(() => parseInt(localStorage.getItem('cursive-reveal') ?? '0'));
  const [cursiveInput, setCursiveInput] = useState('');
  const [cursiveClipboardBuckets, setCursiveClipboardBuckets] = useState(null);
  const [cursiveSource, setCursiveSource] = useState(() => localStorage.getItem('cursive-source') || 'pane2'); // 'story' or 'pane2'
  const [cursiveSyllables] = useState(true);
  const [showPane2Syllables, setShowPane2Syllables] = useState(() => localStorage.getItem('bible-pane2-syllables') === 'true');
  const hyphRef = useRef(null);
  const cursiveGoToBucketRef = useRef(null);
  const cursiveBucketIndexRef = useRef(0);
  const [showWordsModal, setShowWordsModal] = useState(false);
  const [showQuiz2Modal, setShowQuiz2Modal] = useState(false);
  const [quiz2BucketIndex, setQuiz2BucketIndex] = useState(0);
  const [quiz2RevealCount, setQuiz2RevealCount] = useState(0);
  const [forceSliderVerse, setForceSliderVerse] = useState(null);
  const [sliderAlign, setSliderAlign] = useState(() => {
    try { return localStorage.getItem('recite-slider-align') || 'left'; } catch { return 'left'; }
  });
  const [reciteTtsPlaying, setReciteTtsPlaying] = useState(false);
  const reciteTtsAudioRef = useRef(null);
  const [nltPsalmsData, setNltPsalmsData] = useState(null);

  // Load Hypher for syllable hyphenation
  useEffect(() => {
    if (cursiveSyllables && !hyphRef.current) {
      Promise.all([
        import(/* webpackIgnore: true */ 'https://esm.sh/hypher'),
        import(/* webpackIgnore: true */ 'https://esm.sh/hyphenation.en-us')
      ]).then(([HypherMod, enMod]) => {
        const Hypher = HypherMod.default || HypherMod;
        const english = enMod.default || enMod;
        hyphRef.current = new Hypher(english);
      }).catch(err => console.warn('Failed to load Hypher:', err));
    }
  }, [cursiveSyllables]);

  const syllabifyText = (text) => {
    if (!hyphRef.current || !text) return text;
    return text.replace(/\b([a-zA-Z]+)\b/g, (match) => {
      return hyphRef.current.hyphenate(match).join('\u00B7');
    });
  };

  // State for Breathe Modal
  const [showBreatheModal, setShowBreatheModal] = useState(false);

  // State for Strong's concordance
  const [strongsIndex, setStrongsIndex] = useState(null);
  const [strongsDictionary, setStrongsDictionary] = useState(null);
  const [strongsConcordance, setStrongsConcordance] = useState(null); // { number: 'H430', refs: [...], def: {...} }

  // State for Book Prompts (from prompts.json)
  const [promptsData, setPromptsData] = useState(null);
  const [showPromptPickerModal, setShowPromptPickerModal] = useState(false);
  const [promptPickerOptions, setPromptPickerOptions] = useState([]);

  // State for Study Questions Modal
  const [showStudyQModal, setShowStudyQModal] = useState(false);
  const [studyQData, setStudyQData] = useState(null);
  const [studyQFontSize, setStudyQFontSize] = useState(14);
  const [studyQRevealed, setStudyQRevealed] = useState({});

  // State for Psalm Hymns Modal
  const [psalmHymnsData, setPsalmHymnsData] = useState(null);
  const [lukeHymnsData, setLukeHymnsData] = useState(null);
  const [showHymnModal, setShowHymnModal] = useState(false);

  // State for Story Time Modal
  const storytimeScrollRef = useRef(null);
  const [showStorytimeModal, setShowStorytimeModal] = useState(false);
  const [storytimeContent, setStorytimeContent] = useState('');
  const [storytimeFontSize, setStorytimeFontSize] = useState(() => {
    try {
      const stored = localStorage.getItem('storytime-font-size');
      if (stored == null) return 0.9;
      const n = parseFloat(stored);
      if (isNaN(n)) return 0.9;
      return Math.min(2.0, Math.max(0.6, n));
    } catch {
      return 0.9;
    }
  });
  const [storytimeUnavailableMsg, setStorytimeUnavailableMsg] = useState(null);
  useEffect(() => {
    try { localStorage.setItem('storytime-font-size', String(storytimeFontSize)); } catch {}
  }, [storytimeFontSize]);
  useEffect(() => {
    try { localStorage.setItem('quiz-font-size', String(quizFontSize)); } catch {}
  }, [quizFontSize]);
  useEffect(() => {
    try { localStorage.setItem('quiz2-font-size', String(quiz2FontSize)); } catch {}
  }, [quiz2FontSize]);
  useEffect(() => {
    try { localStorage.setItem('recite-slider-align', sliderAlign); } catch {}
  }, [sliderAlign]);

  // Story Time audio playback (Pentateuch chapter MP3s from Dropbox)
  const storytimeAudioRef = useRef(null);
  const [isStorytimeAudioPlaying, setIsStorytimeAudioPlaying] = useState(false);
  const storytimeTtsRef = useRef(false); // true when system voice TTS is speaking storytime

  // Rhyme audio playback (Bible Rhyme chapter MP3s from Dropbox)
  const rhymeAudioRef = useRef(null);
  const [isRhymeAudioPlaying, setIsRhymeAudioPlaying] = useState(false);
  const [rhymeAutoPlay, setRhymeAutoPlay] = useState(false);
  const rhymeAutoAdvancingRef = useRef(false);
  const [showRhymeModal, setShowRhymeModal] = useState(false);
  const [rhymeModalBook, setRhymeModalBook] = useState('ps');
  const [rhymeModalChapter, setRhymeModalChapter] = useState(1);
  const [rhymeRepeat, setRhymeRepeat] = useState(false);
  const [rhymeCurrentTime, setRhymeCurrentTime] = useState(0);
  const [rhymeDuration, setRhymeDuration] = useState(0);

  // Language sidebar cycle state: null | 'cant' | 'chin' | 'heb' | 'span' | 'fr'
  const [sidebarLang, setSidebarLang] = useState(null);

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
    if (match) {
      const bookName = match[1].trim().toLowerCase();
      const chapter = parseInt(match[2]);
      const abbrev = bookNameToAbbrev[bookName];
      if (abbrev) return { abbrev, chapter };
    }

    // Try book name only (no chapter) — default to chapter 1
    // Handles "1 Timothy", "Genesis", "Song of Solomon", etc.
    const bookOnly = trimmed.match(/^(\d?\s*[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)$/i);
    if (bookOnly) {
      const bookName = bookOnly[1].trim().toLowerCase();
      const abbrev = bookNameToAbbrev[bookName];
      if (abbrev) return { abbrev, chapter: 1 };
    }

    return null;
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

      // Auto-add to ref history
      setRefHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].parsed.abbrev === parsed.abbrev) return prev;
        const label = `${getBookName(parsed.abbrev)} ${parsed.chapter}`;
        return [...prev, { raw: label, parsed: { abbrev: parsed.abbrev, chapter: parsed.chapter } }];
      });
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

      // Auto-add to ref history
      setRefHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].parsed.abbrev === parsed.abbrev) return prev;
        const label = `${getBookName(parsed.abbrev)} ${parsed.chapter}`;
        return [...prev, { raw: label, parsed: { abbrev: parsed.abbrev, chapter: parsed.chapter } }];
      });

      // Set highlighted verses
      setHighlightedVerses(verses);

      // Scroll both panes to the first highlighted verse after render (with yellow highlight)
      if (verses.length > 0) {
        const scrollPaneToVerse = (paneRef, elId, attempts = 0) => {
          const el = document.getElementById(elId);
          const pane = paneRef.current;
          if (el && pane) {
            const elRect = el.getBoundingClientRect();
            const paneRect = pane.getBoundingClientRect();
            const offset = elRect.top - paneRect.top + pane.scrollTop - pane.clientHeight / 3;
            pane.scrollTo({ top: offset, behavior: 'smooth' });
            el.style.backgroundColor = '#fef9c3';
            setTimeout(() => { el.style.backgroundColor = ''; }, 3000);
          } else if (attempts < 10) {
            setTimeout(() => scrollPaneToVerse(paneRef, elId, attempts + 1), 150);
          }
        };
        setTimeout(() => {
          scrollPaneToVerse(chapterContentRef, `verse-${verses[0]}`);
          scrollPaneToVerse(kjvContentRef, `right-pane-verse-${verses[0]}`);
        }, 300);
      }
    }
  }, [bibleData, parseSingleBibleRef]);

  // Look up verse text for a reference string (e.g., "Hebrews 11:1-2")
  const getVerseTextForRef = useCallback((refStr) => {
    const parsed = parseSingleBibleRef(refStr);
    if (!parsed || !bibleData) return null;
    const book = bibleData.find(b => b.abbrev === parsed.abbrev);
    if (!book || !book.chapters || !book.chapters[parsed.chapter - 1]) return null;
    const chapterVerses = book.chapters[parsed.chapter - 1];
    const verseMatch = refStr.trim().match(/:(\d+)(?:\s*[-–]\s*(\d+))?/);
    if (!verseMatch) {
      // Whole chapter reference (e.g., "Psalm 23") - show first few verses
      const texts = chapterVerses.slice(0, 3).map((v, i) => {
        const text = typeof v === 'string' ? v : (v.text || v.verse || String(v));
        return `${i + 1} ${text}`;
      });
      return texts.join(' ') + (chapterVerses.length > 3 ? ' ...' : '');
    }
    const start = parseInt(verseMatch[1]);
    const end = verseMatch[2] ? parseInt(verseMatch[2]) : start;
    const texts = [];
    for (let v = start; v <= end; v++) {
      if (chapterVerses[v - 1]) {
        const verse = chapterVerses[v - 1];
        const text = typeof verse === 'string' ? verse : (verse.text || verse.verse || String(verse));
        texts.push(`${v} ${text}`);
      }
    }
    return texts.join(' ') || null;
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

  // Dropbox OAuth sign-in
  const handleDropboxSignIn = useCallback(async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem('dropbox_code_verifier', verifier);
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&response_type=code&code_challenge=${challenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(DROPBOX_REDIRECT_URI)}&token_access_type=online`;
    window.location.href = authUrl;
  }, []);

  // Parse Dropbox verse file: quoted refs as delimiters
  const parseDropboxVerseFile = useCallback((text) => {
    const refs = [];
    const lines = text.split('\n');
    let currentRef = null;
    let currentDesc = [];

    for (const line of lines) {
      const match = line.match(/^"(.+?)"\s*$/);
      if (match) {
        if (currentRef) {
          refs.push({ ref: currentRef, description: currentDesc.join('\n').trim() });
        }
        currentRef = match[1];
        currentDesc = [];
      } else if (currentRef) {
        currentDesc.push(line);
      }
    }
    if (currentRef) {
      refs.push({ ref: currentRef, description: currentDesc.join('\n').trim() });
    }
    return refs;
  }, []);

  // Load Dropbox folder contents
  const loadDropboxFolder = useCallback(async (path) => {
    if (!dropboxAccessToken) return;
    setDropboxStatus('Loading folder...');
    try {
      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dropboxAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: path || '' }),
      });
      if (!response.ok) throw new Error('Failed to list folder');
      const data = await response.json();
      const entries = (data.entries || []).map((entry) => ({
        name: entry.name,
        path: entry.path_lower || entry.path_display,
        isFolder: entry['.tag'] === 'folder',
      }));
      entries.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setDropboxFiles(entries);
      setDropboxFolderPath(path || '');
      setDropboxStatus(`${entries.length} items`);
    } catch (error) {
      setDropboxStatus('Error: ' + error.message);
    }
  }, [dropboxAccessToken]);

  // Load and parse a Dropbox .txt file
  const loadDropboxFile = useCallback(async (filePath) => {
    if (!dropboxAccessToken) return;
    setDropboxStatus('Loading file...');
    try {
      const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dropboxAccessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path: filePath }),
        },
      });
      if (!response.ok) throw new Error('Download failed');
      const text = await response.text();
      const parsed = parseDropboxVerseFile(text);
      setDropboxRefs(parsed);
      setDropboxView('content');
      setDropboxStatus(`${parsed.length} references found`);
    } catch (error) {
      setDropboxStatus('Error: ' + error.message);
    }
  }, [dropboxAccessToken, parseDropboxVerseFile]);

  // Handle DB button click
  const handleDbxClick = useCallback(() => {
    setShowDropboxModal(true);
    if (dropboxAccessToken) {
      loadDropboxFolder('/blob_vercel_replacement/bible');
    }
  }, [dropboxAccessToken, loadDropboxFolder]);

  // State to track scroll position for mobile view during translation changes
  // eslint-disable-next-line no-unused-vars
  const [mobileScrollPosition, setMobileScrollPosition] = useState(0);

  // Story Time data
  const [storytimeData, setStorytimeData] = useState(null);

  // Load Story Time JSON on startup
  useEffect(() => {
    const loadStorytime = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/storytime.json`);
        if (response.ok) {
          const data = await response.json();
          setStorytimeData(data);
        }
      } catch (error) {
        console.log('No storytime.json found');
      }
    };
    loadStorytime();
  }, []);

  // Load book prompts JSON on startup
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/prompts.json`);
        if (response.ok) {
          const data = await response.json();
          setPromptsData(data);
        }
      } catch (error) {
        console.log('No prompts.json found');
      }
    };
    loadPrompts();
  }, []);

  // Load psalm hymns JSON on startup
  useEffect(() => {
    const loadPsalmHymns = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/psalm_hymns.json`);
        if (response.ok) {
          const data = await response.json();
          setPsalmHymnsData(data);
        }
      } catch (error) {
        console.log('No psalm_hymns.json found');
      }
    };
    loadPsalmHymns();
  }, []);

  // Load luke hymns JSON on startup
  useEffect(() => {
    const loadLukeHymns = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/luke_hymns.json`);
        if (response.ok) {
          const data = await response.json();
          setLukeHymnsData(data);
        }
      } catch (error) {
        console.log('No luke_hymns.json found');
      }
    };
    loadLukeHymns();
  }, []);

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

  // Handle Dropbox OAuth redirect on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      const verifier = sessionStorage.getItem('dropbox_code_verifier');
      if (verifier) {
        const body = new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: DROPBOX_APP_KEY,
          redirect_uri: DROPBOX_REDIRECT_URI,
          code_verifier: verifier,
        });
        fetch('https://api.dropboxapi.com/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.access_token) {
              setDropboxAccessToken(data.access_token);
              setDropboxStatus('Signed in');
              sessionStorage.removeItem('dropbox_code_verifier');
              window.history.replaceState({}, document.title, DROPBOX_REDIRECT_URI);
            } else {
              setDropboxStatus('Auth failed: ' + (data.error_description || data.error || 'Unknown'));
            }
          })
          .catch((err) => setDropboxStatus('Auth error: ' + err.message));
      }
    }
  }, []);

  // Deep-link via URL params: ?bookname&chapter[:verse]
  // Mirrors the bibleSearchable.html convention so external apps (e.g. vercel_bible_plan)
  // can link directly into a passage. Waits for bibleData before navigating.
  useEffect(() => {
    if (!bibleData || bibleData.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) return; // Dropbox OAuth callback — handled above

    const keys = Array.from(params.keys());
    if (keys.length === 0) return;

    const BOOK_TOKEN_TO_ABBREV = {
      genesis: 'gn', exodus: 'ex', leviticus: 'lv', numbers: 'nm', deuteronomy: 'dt',
      joshua: 'js', judges: 'jud', ruth: 'rt', '1samuel': '1sm', '2samuel': '2sm',
      '1kings': '1kgs', '2kings': '2kgs', '1chronicles': '1ch', '2chronicles': '2ch',
      ezra: 'ezr', nehemiah: 'ne', esther: 'et', job: 'job', psalms: 'ps', psalm: 'ps',
      proverbs: 'prv', ecclesiastes: 'ec', songofsolomon: 'so', songofsongs: 'so', isaiah: 'is',
      jeremiah: 'jr', lamentations: 'lm', ezekiel: 'ez', daniel: 'dn',
      hosea: 'ho', joel: 'jl', amos: 'am', obadiah: 'ob', jonah: 'jn',
      micah: 'mi', nahum: 'na', habakkuk: 'hk', zephaniah: 'zp', haggai: 'hg',
      zechariah: 'zc', malachi: 'ml', matthew: 'mt', mark: 'mk', luke: 'lk',
      john: 'jo', acts: 'act', romans: 'rm', '1corinthians': '1co', '2corinthians': '2co',
      galatians: 'gl', ephesians: 'eph', philippians: 'ph', colossians: 'cl',
      '1thessalonians': '1ts', '2thessalonians': '2ts', '1timothy': '1tm', '2timothy': '2tm',
      titus: 'tt', philemon: 'phm', hebrews: 'hb', james: 'jm', '1peter': '1pe',
      '2peter': '2pe', '1john': '1jo', '2john': '2jo', '3john': '3jo', jude: 'jd',
      revelation: 're',
    };

    const bookToken = keys[0].toLowerCase().replace(/\s+/g, '');
    const abbrev = BOOK_TOKEN_TO_ABBREV[bookToken];
    if (!abbrev) return;

    const book = bibleData.find((b) => b.abbrev === abbrev);
    if (!book) return;

    let chapter = 1;
    let verse = null;
    if (keys[1]) {
      const parts = keys[1].split(':');
      const c = parseInt(parts[0], 10);
      if (!isNaN(c)) chapter = c;
      if (parts[1]) {
        const v = parseInt(parts[1].split('-')[0], 10);
        if (!isNaN(v)) verse = v;
      }
    }
    if (book.chapters && chapter > book.chapters.length) chapter = book.chapters.length;
    if (chapter < 1) chapter = 1;

    setSelectedBook(book);
    setSelectedChapter(chapter);
    setShowCrossRef(null);
    setPrimaryReading({ book, chapter });
    setIsViewingCrossRef(false);
    setPane2Book(null);
    setPane2Chapter(null);
    setPane2History([]);

    window.history.replaceState({}, document.title, window.location.pathname);

    if (verse != null) {
      const tryScroll = (attempts) => {
        if (attempts > 20) return;
        const el = document.getElementById(`right-pane-verse-${verse}`);
        const pane = kjvContentRef.current;
        if (el && pane) {
          const elRect = el.getBoundingClientRect();
          const paneRect = pane.getBoundingClientRect();
          const offset = elRect.top - paneRect.top + pane.scrollTop - pane.clientHeight / 3;
          pane.scrollTo({ top: offset, behavior: 'smooth' });
        } else {
          setTimeout(() => tryScroll(attempts + 1), 200);
        }
      };
      setTimeout(() => tryScroll(0), 400);
    }
  }, [bibleData]);

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

  // Abbreviation to full book name mapping (for prompt matching)
  const abbrevToBookName = {
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
    're': 'Revelation', 'ge': 'Genesis'
  };

  // Handle Prompt button click - auto-detect book, copy or show picker
  const handlePromptButtonClick = useCallback(() => {
    if (!promptsData || !selectedBook) return;
    const bookName = abbrevToBookName[selectedBook.abbrev] || selectedBook.abbrev;
    console.log('Prompt button: abbrev=', selectedBook.abbrev, 'bookName=', bookName);
    // Find all matching keys (exact match or starts with book name)
    const matches = Object.keys(promptsData).filter(
      key => key === bookName || key.startsWith(bookName + ' ')
    );
    if (matches.length === 0) {
      // No prompt for this book - show all available books in picker
      setPromptPickerOptions(Object.keys(promptsData));
      setShowPromptPickerModal(true);
    } else if (matches.length === 1) {
      navigator.clipboard.writeText(promptsData[matches[0]])
        .then(() => alert(`Copied ${bookName} prompt to clipboard`))
        .catch(err => alert('Failed to copy: ' + err));
    } else {
      // Multiple parts - show picker modal
      setPromptPickerOptions(matches);
      setShowPromptPickerModal(true);
    }
  }, [promptsData, selectedBook]);

  // Handle Story Time button click - load story content and open combined modal
  const handleStorytimeButtonClick = useCallback(() => {
    if (!storytimeData || !selectedBook) return;
    const activeBook = pane2Book || selectedBook;
    const activeChapter = pane2Chapter || selectedChapter;
    const bookName = abbrevToBookName[activeBook.abbrev] || activeBook.abbrev;
    const key = `${bookName} ${activeChapter}`;
    const story = storytimeData[key];
    if (story) {
      setStorytimeContent(story);
    }
    setShowSearchModal(true);
    setSearchStartRef('');
  }, [storytimeData, selectedBook, selectedChapter, pane2Book, pane2Chapter]);

  // Auto-load story content when combined modal opens
  const loadStorytimeForCurrent = useCallback(() => {
    if (!storytimeData || !selectedBook) return;
    const activeBook = pane2Book || selectedBook;
    const activeChapter = pane2Chapter || selectedChapter;
    const bookName = abbrevToBookName[activeBook.abbrev] || activeBook.abbrev;
    const key = `${bookName} ${activeChapter}`;
    const story = storytimeData[key];
    if (story) {
      setStorytimeContent(story);
    } else {
      setStorytimeContent('');
    }
  }, [storytimeData, selectedBook, selectedChapter, pane2Book, pane2Chapter]);

  // Toggle play/pause for the Story Time chapter audio
  const handleStorytimeAudioToggle = useCallback(() => {
    const activeBook = pane2Book || selectedBook;
    const activeChapter = pane2Chapter || selectedChapter;
    if (!activeBook) return;

    // If system TTS is currently speaking, stop it
    if (storytimeTtsRef.current) {
      window.speechSynthesis.cancel();
      storytimeTtsRef.current = false;
      setIsStorytimeAudioPlaying(false);
      return;
    }

    const url = getStorytimeAudioUrl(activeBook.abbrev, activeChapter);
    if (url) {
      // Play Dropbox mp3
      const audio = storytimeAudioRef.current;
      if (!audio) return;
      if (audio.src !== url) audio.src = url;
      if (audio.paused) {
        audio.play().catch(err => console.warn('Story Time audio play failed:', err));
      } else {
        audio.pause();
      }
    } else {
      // Fall back to system voice TTS for the story text
      const bookName = abbrevToBookName[activeBook.abbrev] || activeBook.abbrev;
      const key = `${bookName} ${activeChapter}`;
      const story = storytimeData && storytimeData[key];
      if (!story) {
        setStorytimeUnavailableMsg(`No Story Time available for ${bookName} ${activeChapter}.`);
        return;
      }
      // Strip markdown formatting for cleaner speech
      const cleanText = story
        .replace(/^#+\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^>\s?/gm, '')
        .replace(/^[-*]{3,}\s*$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        let voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
        if (!voice) voice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Enhanced') || v.name.includes('Premium')));
        if (!voice) voice = voices.find(v => v.lang === 'en-US');
        if (voice) utterance.voice = voice;
      }
      utterance.onend = () => { storytimeTtsRef.current = false; setIsStorytimeAudioPlaying(false); };
      utterance.onerror = () => { storytimeTtsRef.current = false; setIsStorytimeAudioPlaying(false); };
      storytimeTtsRef.current = true;
      setIsStorytimeAudioPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  }, [pane2Book, pane2Chapter, selectedBook, selectedChapter, storytimeData]);

  // Toggle play/pause for Rhyme audio
  const handleRhymeAudioToggle = useCallback(() => {
    const activeBook = pane2Book || selectedBook;
    const activeChapter = pane2Chapter || selectedChapter;
    if (!activeBook) return;
    const url = getRhymeAudioUrl(activeBook.abbrev, activeChapter);
    if (!url) return;
    // Auto-switch pane 2 to Bible Rhyme if not already
    if (rightPaneTranslation !== 'en_rhyme.json') {
      setRightPaneTranslation('en_rhyme.json');
      setSelectedDropdownTranslation('en_rhyme.json');
    }
    const audio = rhymeAudioRef.current;
    if (!audio) return;
    if (audio.src !== url) audio.src = url;
    if (audio.paused) {
      audio.play().catch(err => console.warn('Rhyme audio play failed:', err));
    } else {
      audio.pause();
    }
  }, [pane2Book, pane2Chapter, selectedBook, selectedChapter, rightPaneTranslation]);
  const handleRhymeAudioToggleRef = useRef(handleRhymeAudioToggle);
  useEffect(() => { handleRhymeAudioToggleRef.current = handleRhymeAudioToggle; }, [handleRhymeAudioToggle]);

  // Stop audio whenever the active pane 2 book/chapter changes
  useEffect(() => {
    const audio = storytimeAudioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (storytimeTtsRef.current) {
      window.speechSynthesis.cancel();
      storytimeTtsRef.current = false;
    }
    setIsStorytimeAudioPlaying(false);
    // Skip stopping rhyme audio when auto-advancing chapters
    if (rhymeAutoAdvancingRef.current) {
      rhymeAutoAdvancingRef.current = false;
    } else {
      const rhymeAudio = rhymeAudioRef.current;
      if (rhymeAudio && !rhymeAudio.paused) {
        rhymeAudio.pause();
        rhymeAudio.currentTime = 0;
      }
      setIsRhymeAudioPlaying(false);
    }
  }, [pane2Book, pane2Chapter, selectedBook, selectedChapter]);

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

  // Listen for speakVerseContent events from the pane 2 TTS button
  useEffect(() => {
    const handleSpeakVerseContent = (event) => {
      const { verseNumber, lastVerse, lang } = event.detail;
      if (!verseNumber) return;
      const readMultiple = lastVerse && lastVerse > verseNumber;
      // Force undelimit mode so it reads the full verse
      const prevMode = gridReadModeRef.current;
      gridReadModeRef.current = 'undelimit';
      if (lang === 'en') {
        window.dispatchEvent(new CustomEvent('speakVerseContentEnglish', {
          detail: { verseNumber, readToEnd: readMultiple }
        }));
      } else if (lang === 'cant') {
        speakVerseInGrid(verseNumber, 'cantonese');
      } else if (lang === 'chin') {
        speakVerseInGrid(verseNumber, 'mandarin');
      } else if (lang === 'heb') {
        speakVerseInHebrewGrid(verseNumber);
      } else if (lang === 'span') {
        speakVerseInSpanishGrid(verseNumber);
      } else if (lang === 'fr') {
        speakVerseInFrenchGrid(verseNumber);
      }
      gridReadModeRef.current = prevMode;
    };
    window.addEventListener('speakVerseContent', handleSpeakVerseContent);
    return () => window.removeEventListener('speakVerseContent', handleSpeakVerseContent);
  }); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Cursive modal: Escape restarts, ArrowRight/Left navigates buckets, ArrowDown/Up scrolls output; all other shortcuts disabled
      if (showCursiveModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          const writeBtn = document.querySelector('.cursive-write-btn');
          if (writeBtn) writeBtn.click();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const delta = e.key === 'ArrowRight' ? 1 : -1;
          if (cursiveGoToBucketRef.current) cursiveGoToBucketRef.current(cursiveBucketIndexRef.current + delta);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const outputScroll = document.querySelector('.cursive-output-scroll');
          if (outputScroll) {
            const pageHeight = outputScroll.clientHeight * 0.9;
            outputScroll.scrollBy({ top: e.key === 'ArrowDown' ? pageHeight : -pageHeight, behavior: 'smooth' });
          }
          const cursiveInput = outputScroll && outputScroll.parentElement && outputScroll.parentElement.querySelector('input[type="text"]');
          if (cursiveInput) cursiveInput.focus();
        } else if (e.key === '[') {
          e.preventDefault();
          const btn = document.querySelector('[data-cursive-source="pane2"]');
          if (btn) btn.click();
        } else if (e.key === ']') {
          e.preventDefault();
          const btn = document.querySelector('[data-cursive-source="story"]');
          if (btn) btn.click();
        } else if (e.key === '.') {
          e.preventDefault();
          const btn = document.querySelector('[data-cursive-next]');
          if (btn) btn.click();
        }
        return;
      }
      // Buckets modal: spacebar = next bucket, shift+space = previous bucket
      if (showBucketsModal && e.key === ' ') {
        e.preventDefault();
        if (e.shiftKey) {
          setBucketIndex(prev => Math.max(0, prev - 1));
        } else {
          setBucketIndex(prev => prev + 1);
        }
        setBucketSlider(1);
        return;
      }
      // Breathe modal: Escape to close
      if (showBreatheModal && e.key === 'Escape') {
        e.preventDefault();
        if (window._breatheInterval) { clearInterval(window._breatheInterval); window._breatheInterval = null; }
        setShowBreatheModal(false);
        return;
      }
      // Prevent keycode handling when user is typing in input fields or select dropdowns
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // 'w' key - toggle Words noun pairs modal
      if (e.key === 'w' && !showQuiz2Modal && !showQuizModal && !showBucketsModal && !showCursiveModal && !showBreatheModal && !showSearchModal) {
        e.preventDefault();
        setShowWordsModal(prev => !prev);
        return;
      }

      // 'r' key - toggle Ref prompt modal
      if (e.key === 'r' && !showWordsModal && !showQuiz2Modal && !showQuizModal && !showBucketsModal && !showCursiveModal && !showBreatheModal && !showSearchModal && !showYouTubeModal && !showRefPrompt) {
        e.preventDefault();
        setShowRefPrompt(true);
        return;
      }

      // 'u' key - toggle reading ruler
      if (e.key === 'u' && !showWordsModal && !showQuiz2Modal && !showQuizModal && !showBucketsModal && !showCursiveModal && !showBreatheModal && !showSearchModal && !showYouTubeModal && !showRefPrompt) {
        e.preventDefault();
        setReadingGuide(prev => { const next = !prev; localStorage.setItem('readingGuide', next); return next; });
        return;
      }

      // 'y' key - toggle YouTube modal
      if (e.key === 'y' && !showWordsModal && !showQuiz2Modal && !showQuizModal && !showBucketsModal && !showCursiveModal && !showBreatheModal && !showSearchModal) {
        e.preventDefault();
        setShowYouTubeModal(prev => !prev);
        return;
      }

      // 's' key - toggle soaking worship audio
      if (e.key === 's' && !showWordsModal && !showQuiz2Modal && !showQuizModal && !showBucketsModal && !showCursiveModal && !showBreatheModal && !showSearchModal && !showYouTubeModal) {
        e.preventDefault();
        const playing = toggleSoaking();
        const btn = document.getElementById('soaking-btn');
        if (btn) btn.textContent = playing ? '⏸ Soaking' : 'Soaking(s)';
        return;
      }

      // 'l' key - toggle blank pane 1
      if (e.key === 'l' && !showWordsModal && !showQuiz2Modal && !showQuizModal && !showBucketsModal && !showCursiveModal && !showBreatheModal && !showSearchModal && !showYouTubeModal) {
        e.preventDefault();
        setBlankPane1(prev => { const next = !prev; localStorage.setItem('blankPane1', next); return next; });
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
      else if ((e.key === 'ArrowUp' || e.key === '-') && kjvContentRef.current && !showQuiz2Modal) {
        
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
      // 'p' key, PageDown key, ArrowDown key, or Spacebar - page down (matches pane 2 page-down button: scroll, or advance chapter at bottom)
      else if ((e.key === 'p' || e.key === ' ' || e.key === 'PageDown' || e.key === 'ArrowDown' || e.key === '+' || e.key === '=') && kjvContentRef.current && !showQuiz2Modal && !showWordsModal && !showYouTubeModal) {
        const kjvPane = kjvContentRef.current;
        const maxScroll = kjvPane.scrollHeight - kjvPane.clientHeight;
        const atBottom = maxScroll > 0 && kjvPane.scrollTop >= maxScroll - 5;
        const p2Book = pane2BookRef.current || selectedBookRef.current;
        const p2Chapter = pane2ChapterRef.current || selectedChapterRef.current;
        const hasNext = p2Book && p2Chapter < p2Book.chapters.length;

        if (atBottom && hasNext) {
          // At bottom with next chapter available — advance to next chapter (same as pane 2 page-down button)
          localStorage.removeItem('mobileScrollPosition');
          setMobileScrollPosition(0);
          setSelectedBook(p2Book);
          setSelectedChapter(p2Chapter + 1);
          setPane2Book(null);
          setPane2Chapter(null);
          setPrimaryReading({ book: p2Book, chapter: p2Chapter + 1 });
          setIsViewingCrossRef(false);
          setTimeout(() => { handleHomeReset(); }, 100);
        } else {
          // Not at bottom — page down with sync
          // If sidebar is open, scroll the sidebar too
          if (showSidebar && sidebarScrollRef.current) {
            const sidebarPane = sidebarScrollRef.current;
            const sidebarPageHeight = sidebarPane.clientHeight * 0.9;
            const sidebarNewPosition = sidebarPane.scrollTop + sidebarPageHeight;
            const sidebarMaxScroll = sidebarPane.scrollHeight - sidebarPane.clientHeight;
            sidebarPane.scrollTop = Math.min(sidebarMaxScroll, sidebarNewPosition);
          }

          const pageHeight = kjvPane.clientHeight * 0.9;
          isManuallyScrollingRef.current = true;

          try {
            kjvPane.scrollTop = Math.min(maxScroll, kjvPane.scrollTop + pageHeight);

            // Synchronize pane 1
            if (chapterContentRef.current) {
              const primaryPane = chapterContentRef.current;
              const newKjvScrollPercentage = kjvPane.scrollTop /
                (kjvPane.scrollHeight - kjvPane.clientHeight || 1);
              primaryPane.scrollTop = newKjvScrollPercentage *
                (primaryPane.scrollHeight - primaryPane.clientHeight || 1);
              lastPrimaryScrollPos.current = primaryPane.scrollTop;
            }

            if (isMobileView) {
              localStorage.setItem('mobileScrollPosition', chapterContentRef.current?.scrollTop.toString() || '0');
              setMobileScrollPosition(chapterContentRef.current?.scrollTop || 0);
            }
          } finally {
            setTimeout(() => {
              isManuallyScrollingRef.current = false;
            }, 50);
          }
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
      // Left Arrow - go to previous chapter (skip when Recite modal is open)
      else if (e.key === 'ArrowLeft') {
        if (showQuiz2Modal) return;
        const prevBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Previous Chapter'));
        if (prevBtn) prevBtn.click();
        e.preventDefault();
      }
      // Right Arrow - go to next chapter (skip when Recite modal is open)
      else if (e.key === 'ArrowRight') {
        if (showQuiz2Modal) return;
        const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next Chapter'));
        if (nextBtn) nextBtn.click();
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
      // Enter key - play Rhyme audio (Psalms only)
      else if (e.key === 'Enter') {
        if (showQuiz2Modal) return;
        const activeBook = pane2BookRef.current || selectedBookRef.current;
        const activeChapter = pane2ChapterRef.current || selectedChapterRef.current;
        const rhymeUrl = activeBook ? getRhymeAudioUrl(activeBook.abbrev, activeChapter) : null;
        if (rhymeUrl) {
          handleRhymeAudioToggleRef.current();
        }
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
      // Escape key - close modals first, then toggle sidebar
      else if (e.key === 'Escape') {
        if (showStudyQModal) {
          setShowStudyQModal(false);
        } else if (showQuizModal) {
          setShowQuizModal(false);
        } else if (showBucketsModal) {
          setShowBucketsModal(false);
        } else if (showSearchModal) {
          setShowSearchModal(false);
        } else if (showCollectionModal) {
          if (collectionVersePreview) setCollectionVersePreview(null);
          else setShowCollectionModal(false);
        } else if (showDropboxModal) {
          setShowDropboxModal(false);
        } else if (showYouTubeModal) {
          setShowYouTubeModal(false);
        } else if (showWordsModal) {
          setShowWordsModal(false);
        } else if (showQuiz2Modal) {
          setShowQuiz2Modal(false);
        } else if (showRefPrompt) {
          setShowRefPrompt(false);
        } else {
          // No modal open — open combined Search + Story modal
          loadStorytimeForCurrent();
          setShowSearchModal(true); setSearchStartRef('');
        }
        e.preventDefault();
      }
      
      
      // Numeric keys (1-9) for pane 2 translation selection (only when no modal is open)
      else if (e.key >= '1' && e.key <= '9' && !showSearchModal && !showQuizModal && !showQuiz2Modal && !showCollectionModal && !showDropboxModal && !showBucketsModal && !showCursiveModal && !showBreatheModal && !showWordsModal && !showYouTubeModal) {
        // Allow browser shortcuts like Cmd+1, Cmd+2, etc. for tab switching
        if (e.metaKey || e.ctrlKey) {
          return;
        }
        const index = parseInt(e.key) - 1;
        if (index < translations.length) {
          const t = translations[index];
          setSelectedDropdownTranslation(t.id);
          try { handleApplySelectedTranslationToPane2(t.id); } catch (err) { console.warn('Error applying translation:', err); }
        }
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
      // L key - go to Lamentations (removed, 'l' now used for clr pane 1)
      // S key - go to Joshua
      else if (e.key === 's' || e.key === 'S') {
        const book = bibleData?.find(b => b.abbrev === 'js');
        if (book) {
          handleBookSelect('js');
        }
        e.preventDefault();
      }
      // 'b' key - go to previous chapter (only when no modal is open)
      else if ((e.key === 'b' || e.key === 'B') && !showSearchModal && !showQuizModal && !showQuiz2Modal && !showCollectionModal && !showDropboxModal && !showBucketsModal && !showCursiveModal && !showBreatheModal && !showWordsModal && !showYouTubeModal) {
        if (selectedBook && selectedChapter > 1) {
          setSelectedChapter(selectedChapter - 1);
          setPrimaryReading({ book: selectedBook, chapter: selectedChapter - 1 });
          setIsViewingCrossRef(false);
          setPane2Book(null);
          setPane2Chapter(null);
          localStorage.removeItem('mobileScrollPosition');
          setMobileScrollPosition(0);
          setTimeout(() => { handleHomeReset(); }, 100);
        }
        e.preventDefault();
      }
      // 'n' key - go to next chapter (only when no modal is open)
      else if ((e.key === 'n' || e.key === 'N') && !showSearchModal && !showQuizModal && !showQuiz2Modal && !showCollectionModal && !showDropboxModal && !showBucketsModal && !showCursiveModal && !showBreatheModal && !showWordsModal && !showYouTubeModal) {
        const nextChapterButtons = Array.from(document.querySelectorAll('button'))
          .filter(button => button.textContent.includes('Next Chapter'));
        if (nextChapterButtons.length > 0) {
          nextChapterButtons[0].click();
        }
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTranslation, showSidebar, showQuizModal, showSearchModal, showCollectionModal, collectionVersePreview, showDropboxModal, showBucketsModal, showCursiveModal, showBreatheModal, showWordsModal, showQuiz2Modal, showYouTubeModal, showRefPrompt, loadStorytimeForCurrent]);
  
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
          stickyPane,
          isDarkMode,
          themeMode,
          mobileScrollPosition: isMobileView ? chapterContentRef.current?.scrollTop || 0 : 0
        };
        localStorage.setItem('bibleReaderState', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn("Error saving state to localStorage:", e);
      }
    }
  }, [selectedBook, selectedChapter, selectedTranslation, rightPaneTranslation, primaryReading, isViewingCrossRef, stickyPane, isDarkMode, themeMode, isMobileView]);

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

    // Reset manual scrolling flag
    isManuallyScrolling.current = false;
  }, [isMobileView, setMobileScrollPosition]);

  const handlePaneClick = useCallback((event, pane) => {
    if (!dualPanePD) return;
    // Block page-down for 500ms after a chapter advance
    if (Date.now() - pane2ChapterChangedAt.current < 2000) return;
    if (event.target.tagName === 'A' || event.target.tagName === 'BUTTON' || event.target.closest('button') || event.target.closest('a') || event.target.closest('select')) return;
    const container = pane === 'left' ? chapterContentRef.current : kjvContentRef.current;
    if (!container) return;
    const pageHeight = container.clientHeight * 0.9;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const atBottom = container.scrollTop >= maxScroll - 5;

    if (pane === 'right' && atBottom) {
      pane2BottomClickCount.current += 1;
      if (pane2BottomClickCount.current >= 3) {
        pane2BottomClickCount.current = 0;
        // Advance both panes to pane 2's next chapter
        const p2Book = pane2Book || selectedBook;
        const p2Chapter = pane2Chapter || selectedChapter;
        if (p2Book && p2Chapter < p2Book.chapters.length) {
          const nextChapter = p2Chapter + 1;
          pane2ChapterChangedAt.current = Date.now();
          setSelectedBook(p2Book);
          setSelectedChapter(nextChapter);
          setPane2Book(null);
          setPane2Chapter(null);
          setPrimaryReading({ book: p2Book, chapter: nextChapter });
          setIsViewingCrossRef(false);
          setTimeout(() => { handleHomeReset(); }, 100);
        }
      }
      return;
    }

    // Not at bottom (or left pane) — reset counter and page down
    if (pane === 'right') pane2BottomClickCount.current = 0;
    container.scrollTop = Math.min(maxScroll, container.scrollTop + pageHeight);
  }, [dualPanePD, pane2Book, pane2Chapter, selectedBook, selectedChapter, handleHomeReset]);

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
        // Try to load saved state from localStorage
        try {
          const savedState = localStorage.getItem('bibleReaderState');
          if (savedState) {
            const parsedState = JSON.parse(savedState);
            savedTranslation = parsedState.translation || selectedTranslation;

            // Always use KJV as the sticky pane
            setStickyPane('kjv');
            
            // Restore theme mode setting if available
            if (parsedState.themeMode) {
              setThemeMode(parsedState.themeMode);
            } else if (parsedState.isDarkMode !== undefined) {
              setThemeMode(parsedState.isDarkMode ? 'dark' : 'light');
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
          // Seed ref history with the restored book/chapter
          const label = `${getBookName(savedBook.abbrev)} ${savedChapter}`;
          setRefHistory([{ raw: label, parsed: { abbrev: savedBook.abbrev, chapter: savedChapter } }]);
        } else if (bibleData && bibleData.length > 0) {
          console.log("✓ Using default state - setting book:", bibleData[0].abbrev, "chapter: 1");
          setSelectedBook(bibleData[0]);
          setPrimaryReading({
            book: bibleData[0],
            chapter: 1
          });
          // Seed ref history with default book
          const label = `${getBookName(bibleData[0].abbrev)} 1`;
          setRefHistory([{ raw: label, parsed: { abbrev: bibleData[0].abbrev, chapter: 1 } }]);
        } else {
          console.log("❌ No state to set - no savedBook and no bibleData");
        }
        
        // Load cross-references from the JSON file, using the same method that worked for Bible data
        await loadCrossReferences(baseUrl, usingApiEndpoint);
        
        setLoading(false);
        
        // Reset the scroll sync initialized flag
          
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
  

  // Handle sticky pane change
  const handleStickyPaneChange = (paneType) => {
    setStickyPane(paneType);
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
  
  // Cycle through theme modes: light → dark → sepia → light
  const toggleDarkMode = () => {
    setThemeMode(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'sepia' : 'light');
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

      // Auto-add to ref history
      setRefHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].parsed.abbrev === abbrev) return prev;
        const label = `${getBookName(abbrev)} 1`;
        return [...prev, { raw: label, parsed: { abbrev, chapter: 1 } }];
      });

      // Scroll both panels to top when book changes
      if (chapterContentRef.current) {
        chapterContentRef.current.scrollTop = 0;
      }
      if (kjvContentRef.current) {
        kjvContentRef.current.scrollTop = 0;
      }

      // Reset scroll sync state
      lastPrimaryScrollPos.current = 0;
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
    setExpandedRefsData(null); // Clear expanded cross-references

    // No need to reset auto-scroll timer here - will be handled in NavigationPlaceholder component


    // Update primary reading
    if (selectedBook) {
      setPrimaryReading({
        book: selectedBook,
        chapter: chapterNum
      });
      setIsViewingCrossRef(false);
    }

    // Auto-add to ref history (only when book changes)
    if (selectedBook) {
      setRefHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].parsed.abbrev === selectedBook.abbrev) return prev;
        const label = `${getBookName(selectedBook.abbrev)} ${chapterNum}`;
        return [...prev, { raw: label, parsed: { abbrev: selectedBook.abbrev, chapter: chapterNum } }];
      });
    }

    // Always sync pane 2 to match pane 1 on chapter navigation
    setPane2Book(null);
    setPane2Chapter(null);
    setPane2History([]);

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

  // Handle click on a cross-reference — navigate pane 2 only
  const handleCrossRefNavigate = (ref) => {
    // Find the book in the right pane Bible data
    const book = (rightPaneBibleData || bibleData || []).find(b => b.abbrev === ref.book);
    if (book) {
      // Push current pane 2 state (including any open concordance) to history before navigating
      setPane2History(h => [...h, { book: pane2Book, chapter: pane2Chapter, concordance: strongsConcordance }]);
      // Update pane 2 independently
      setPane2Book(book);
      setPane2Chapter(ref.chapter);

      // Mark that we're viewing a cross-reference
      setIsViewingCrossRef(true);

      // Remember last cross-ref for the jump-back button
      setLastCrossRef({ book: ref.book, chapter: ref.chapter, verse: ref.verse, label: `${getBookName(ref.book)} ${ref.chapter}:${ref.verse}` });

      // Auto-add to ref history
      setRefHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].parsed.abbrev === ref.book) return prev;
        const label = `${getBookName(ref.book)} ${ref.chapter}`;
        return [...prev, { raw: label, parsed: { abbrev: ref.book, chapter: ref.chapter } }];
      });

      // Scroll pane 2 to the referenced verse — disable scroll sync to prevent pane 1 from moving
      const scrollToVerse = (verseNum, attempts = 0) => {
        const el = document.getElementById(`right-pane-verse-${verseNum}`);
        const pane = kjvContentRef.current;
        if (el && pane) {
          // Disable scroll sync for the duration of this scroll
          isManuallyScrolling.current = true;
          const elRect = el.getBoundingClientRect();
          const paneRect = pane.getBoundingClientRect();
          const offset = elRect.top - paneRect.top + pane.scrollTop - pane.clientHeight / 3;
          pane.scrollTo({ top: offset, behavior: 'smooth' });
          el.style.backgroundColor = isDarkMode ? '#b45309' : '#fef9c3';
          el.style.color = isDarkMode ? '#fffbeb' : '';
          setTimeout(() => { el.style.backgroundColor = ''; el.style.color = ''; }, 3000);
          // Re-enable scroll sync after smooth scroll completes (~600ms)
          setTimeout(() => { isManuallyScrolling.current = false; }, 800);
        } else if (attempts < 5) {
          setTimeout(() => scrollToVerse(verseNum, attempts + 1), 150);
        }
      };
      setTimeout(() => scrollToVerse(ref.verse), 300);
    }
  };

  // Handle expanding all cross-references for a verse into pane 2
  const handleExpandRefs = (refKey, verseNumber) => {
    const refs = crossReferences[refKey];
    if (!refs || refs.length === 0) return;
    const sourceData = rightPaneBibleData || bibleData || [];
    const results = refs.map(ref => {
      const book = sourceData.find(b => b.abbrev === ref.book);
      let verseText = '';
      if (book && book.chapters[ref.chapter - 1]) {
        const verses = book.chapters[ref.chapter - 1];
        if (verses[ref.verse - 1]) {
          const v = verses[ref.verse - 1];
          verseText = typeof v === 'string' ? v : (v.text || v.verse || String(v));
        }
      }
      return {
        label: `${getBookName(ref.book)} ${ref.chapter}:${ref.verse}`,
        text: verseText || '(verse not found in current translation)',
        book: ref.book,
        chapter: ref.chapter,
        verse: ref.verse
      };
    });
    const bookName = selectedBook ? getBookName(selectedBook.abbrev) : '';
    setExpandedRefsData({
      verseLabel: `${bookName} ${selectedChapter}:${verseNumber}`,
      refs: results
    });
    if (kjvContentRef.current) {
      kjvContentRef.current.scrollTop = 0;
    }
  };

  // Handle clicking a Strong's number — load index + dictionary if needed, show concordance in pane 2
  const handleStrongsClick = useCallback(async (strongsNum) => {
    const baseUrl = getBaseUrl();
    let idx = strongsIndex;
    let dict = strongsDictionary;

    const [idxResult, dictResult] = await Promise.all([
      idx ? Promise.resolve(idx) : fetch(`${baseUrl}/strongsIndex.json`).then(r => r.json()).catch(() => null),
      dict ? Promise.resolve(dict) : fetch(`${baseUrl}/strongsDictionary.json`).then(r => r.json()).catch(() => null),
    ]);

    if (!idx && idxResult) { idx = idxResult; setStrongsIndex(idxResult); }
    if (!dict && dictResult) { dict = dictResult; setStrongsDictionary(dictResult); }

    if (!idx) return;
    const refs = idx[strongsNum];
    if (refs && refs.length > 0) {
      const def = dict ? dict[strongsNum] : null;
      setStrongsConcordance({ number: strongsNum, refs, def });
    }
  }, [strongsIndex, strongsDictionary]);

  // Render verse text with clickable Strong's numbers
  const renderWithStrongs = useCallback((text, showGlosses) => {
    if (!text) return text;
    // Match patterns like (H430) or (Hb/H7225) or (Hc/Hd/H776)
    const regex = /\(([^)]*?(H\d+))\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const before = text.substring(lastIndex, match.index);
        parts.push(before);
      }
      const fullMatch = match[0]; // e.g. (Hc/H853)
      const strongsNum = match[2]; // e.g. H853
      if (showGlosses) {
        parts.push(
          <button
            key={match.index}
            onClick={(e) => { e.stopPropagation(); handleStrongsClick(strongsNum); }}
            className="text-purple-500 hover:text-purple-700 hover:underline"
            style={{ fontSize: '0.75em', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            title={`Look up ${strongsNum}`}
          >
            ({match[1]})
          </button>
        );
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  }, [handleStrongsClick]);

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
      'en_web.json': 'WEB',
      'en_bbe.json': 'BBE',
      'zh_cuv.json': 'CUV',
      'zh_cuv_no_space.json': 'CUV',
      'es_rvr.json': 'RVR',
      'fr_apee.json': 'APEE',
      'ko_ko.json': 'KO',
      'he_heb_no_strong.json': 'HEB',
      'he_heb_strong.json': 'HEB-Strong',
      'he_heb_nikkud.json': 'HEB-Nikkud',
      'en_rhyme.json': 'Rhyme'
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
  

  // Main render
  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-800' : isSepiaMode ? '' : 'bg-gray-100'}`} style={isSepiaMode ? { backgroundColor: '#f4ecd8', color: '#5a5a5a' } : {}}>
      {/* Reading guide ruler */}
      {readingGuide && (
        <div
          ref={readingGuideRef}
          style={{
            position: 'fixed', left: 0, right: 0, height: 3,
            background: 'rgba(255, 165, 0, 0.7)',
            boxShadow: '0 0 10px rgba(255, 165, 0, 0.5)',
            pointerEvents: 'none', zIndex: 9999,
          }}
        />
      )}
      {/* Book Selection Sidebar - Hidden on Mobile and Tablet */}
      {showSidebar && (
        <div className={`${isMobileView || isTabletView ? 'absolute z-10 h-full' : 'w-80'} ${isDarkMode ? 'bg-gray-800 text-white border-r border-gray-700' : isSepiaMode ? 'border-r border-gray-300' : 'bg-white border-r border-gray-200'} overflow-y-auto`} style={isSepiaMode ? { backgroundColor: '#efe6d0', color: '#5a5a5a' } : {}}>
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
        <div className={`${isDarkMode ? 'bg-gray-800 text-white border-b border-gray-700' : isSepiaMode ? 'border-b border-gray-300' : 'bg-white border-b border-gray-200'} p-1 flex flex-wrap items-center justify-between`} style={isSepiaMode ? { backgroundColor: '#efe6d0', color: '#5a5a5a' } : {}}>
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

            {/* Feature toggle gear button */}
            <button
              onClick={() => setShowFeatureToggleModal(true)}
              className="flex items-center justify-center p-1 rounded-md text-gray-500 hover:bg-gray-100"
              title="Toggle visible buttons"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>

            {/* Language cycle + open buttons */}
            {(() => {
              const langOptions = ['en', 'cant', 'chin', 'heb', 'span', 'fr'];
              const langColors = {
                cant: 'bg-amber-500 hover:bg-amber-600',
                chin: 'bg-green-500 hover:bg-green-600',
                heb: 'bg-indigo-500 hover:bg-indigo-600',
                span: 'bg-orange-500 hover:bg-orange-600',
                fr: 'bg-blue-600 hover:bg-blue-700',
              };
              const isOpen = showVerseGrid || showSpanishGrid || showHebrewGrid || showFrenchGrid;
              const cycleLang = () => {
                const idx = langOptions.indexOf(sidebarLang);
                const next = langOptions[(idx + 1) % langOptions.length];
                setSidebarLang(next);
              };
              const toggleOpen = () => {
                if (isOpen) {
                  setShowVerseGrid(false);
                  setShowSpanishGrid(false);
                  setShowHebrewGrid(false);
                  setShowFrenchGrid(false);
                } else {
                  const lang = sidebarLang || 'cant';
                  setSidebarLang(lang);
                  setShowVerseGrid(lang === 'cant' || lang === 'chin');
                  setShowSpanishGrid(lang === 'span');
                  setShowHebrewGrid(lang === 'heb');
                  setShowFrenchGrid(lang === 'fr');
                }
              };
              const label = sidebarLang || 'cant';
              const colorClass = langColors[label];
              return null; /* Language cycle + open buttons hidden */
            })()}
            
            
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

                {/* Pane 2 translation picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowPane2TranslationPicker(prev => !prev)}
                    className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-orange-500 text-white hover:bg-orange-600 font-semibold"
                    title="Pick pane 2 translation"
                  >
                    2:{(() => {
                      const id = rightPaneTranslation;
                      if (!id) return '?';
                      const idx = translations.findIndex(t => t.id === id);
                      const keyNum = idx >= 0 ? `(${idx + 1})` : '';
                      if (id.includes('kjv')) return `kjv${keyNum}`;
                      if (id.includes('web')) return `web${keyNum}`;
                      if (id.includes('cuv')) return `cuv${keyNum}`;
                      if (id.includes('rvr')) return `rvr${keyNum}`;
                      if (id.includes('he_heb')) return `heb${keyNum}`;
                      if (id.includes('apee')) return `apee${keyNum}`;
                      if (id.includes('bsb')) return `bsb${keyNum}`;
                      if (id.includes('rhyme')) return `rhyme${keyNum}`;
                      return (id.split('_')[1] || id) + keyNum;
                    })()}
                  </button>
                  {showPane2TranslationPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowPane2TranslationPicker(false)} />
                      <div className={`absolute left-0 top-full mt-1 z-50 rounded shadow-lg border min-w-[200px] ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                        {translations.map((t, idx) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedDropdownTranslation(t.id);
                              setTimeout(() => {
                                try { handleApplySelectedTranslationToPane2(t.id); } catch (e) { console.warn('Error applying translation:', e); }
                              }, 150);
                              setShowPane2TranslationPicker(false);
                            }}
                            className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-orange-100 ${isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-800'} ${t.id === rightPaneTranslation ? 'font-bold bg-orange-50' + (isDarkMode ? ' !bg-gray-700' : '') : ''}`}
                          >
                            <span className="inline-block w-5 text-orange-500 font-bold">({idx + 1})</span> {t.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Book Search + Story Button */}
                {isFeatureVisible('search') && <button
                  onClick={() => { loadStorytimeForCurrent(); setShowSearchModal(true); setSearchStartRef(''); }}
                  className="ml-1 px-3 py-1 rounded focus:outline-none text-sm bg-teal-500 text-white hover:bg-teal-600 font-semibold inline-flex items-center gap-1"
                  title="Search & Story (Esc)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Search & Story
                </button>}

                {/* WEB / Rhyme toggle */}
                {/* Next Chapter Button (top bar) - hidden */}

                {/* Read Full Chapter TTS Button — moved to TTS hidden controls */}

                {/* Rhyme Modal Button */}
                {isFeatureVisible('rhyme') && <button
                  onClick={() => setShowRhymeModal(true)}
                  className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-pink-500 text-white hover:bg-pink-600 font-semibold ${isRhymeAudioPlaying ? 'ring-2 ring-white ring-offset-1 ring-offset-pink-500' : ''}`}
                  title="Open Rhyme audio player"
                >
                  {isRhymeAudioPlaying ? 'Rhyme ♪' : 'Rhyme ▶'}
                </button>}

                {/* Story Time audio & extras (detects pane 2 book) */}
                {isFeatureVisible('storyAudio') && storytimeData && selectedBook && (
                  <>
                  <button
                    onClick={handleStorytimeAudioToggle}
                    className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${
                      isStorytimeAudioPlaying
                        ? 'bg-red-200 text-red-800 hover:bg-red-300'
                        : 'bg-green-200 text-green-800 hover:bg-green-300'
                    }`}
                    title={isStorytimeAudioPlaying ? 'Pause Story Time audio' : 'Play Story Time audio'}
                  >
                    {isStorytimeAudioPlaying ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => {
                      const activeBook = pane2Book || selectedBook;
                      if (!activeBook || !storytimeData) return;
                      const bookName = abbrevToBookName[activeBook.abbrev] || activeBook.abbrev;
                      const maxChapters = activeBook.chapters ? activeBook.chapters.length : 999;
                      const input = prompt(`Copy Story Time chapters for ${bookName} (${maxChapters} chapters)\nEnter range (e.g. 1-10):`);
                      if (!input) return;
                      const match = input.trim().match(/^(\d+)\s*-\s*(\d+)$/);
                      if (!match) { alert('Please enter a range like 1-10'); return; }
                      const start = parseInt(match[1], 10);
                      const end = parseInt(match[2], 10);
                      if (start < 1 || end < start || end > maxChapters) { alert(`Invalid range. ${bookName} has chapters 1-${maxChapters}.`); return; }
                      const parts = [];
                      const missing = [];
                      for (let ch = start; ch <= end; ch++) {
                        const key = `${bookName} ${ch}`;
                        const story = storytimeData[key];
                        if (story) {
                          parts.push(story);
                        } else {
                          missing.push(ch);
                        }
                      }
                      if (parts.length === 0) { alert(`No Story Time data found for ${bookName} chapters ${start}-${end}.`); return; }
                      navigator.clipboard.writeText(parts.join('\n\n'))
                        .then(() => {
                          let msg = `Copied ${parts.length} chapter(s) of ${bookName} (${start}-${end}) to clipboard.`;
                          if (missing.length > 0) msg += `\nMissing chapters: ${missing.join(', ')}`;
                          alert(msg);
                        })
                        .catch(err => alert('Failed to copy: ' + err));
                    }}
                    className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600"
                    title="Copy chapters of current book to clipboard"
                  >
                    Chp📋
                  </button>
                  </>
                )}

                {/* Reading Ruler Toggle Button */}
                {isFeatureVisible('ruler') && <button
                  onClick={() => setReadingGuide(prev => { const next = !prev; localStorage.setItem('readingGuide', next); return next; })}
                  className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${readingGuide ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-400 text-white hover:bg-gray-500'}`}
                  title="Toggle reading ruler (u)"
                >
                  📏 (u)
                </button>}

                {/* Collection Modal Button */}
                {isFeatureVisible('col') && <button
                  onClick={() => { setExpandedCollection(lastCollectionClick.collection); setShowCollectionModal(true); }}
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-purple-500 text-white hover:bg-purple-600 font-semibold"
                  title="Select a verse collection"
                >
                  Groupings
                </button>}

                {/* Dropbox Highlights Button - hidden */}
                {false && <button
                  onClick={handleDbxClick}
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-blue-700 text-white hover:bg-blue-800 font-semibold"
                  title="Dropbox highlights"
                >
                  DB
                </button>}

                {/* Hymn Recommendations Button (always visible) */}
                {isFeatureVisible('hymn') && (psalmHymnsData || lukeHymnsData) && (
                  <button
                    onClick={() => setShowHymnModal(true)}
                    className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-rose-500 text-white hover:bg-rose-600 font-semibold"
                    title="Recommended hymns"
                  >
                    Hymn
                  </button>
                )}

                {/* Book Prompt to Clipboard Button */}
                {isFeatureVisible('prompt') && promptsData && (
                  <button
                    onClick={handlePromptButtonClick}
                    className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-amber-500 text-white hover:bg-amber-600 font-semibold"
                    title="Copy book prompt/commentary to clipboard"
                  >
                    Prompt
                  </button>
                )}

                {isFeatureVisible('nltPsalms') && <button
                  onClick={() => {
                    if (nltPsalmsData) {
                      setNltPsalmsData(null);
                    } else {
                      fetch('/en_nlt_psalms.json')
                        .then(r => r.json())
                        .then(data => setNltPsalmsData(data))
                        .catch(e => console.warn('Failed to load NLT Psalms:', e));
                    }
                  }}
                  className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold inline-block ${nltPsalmsData ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  title={nltPsalmsData ? "NLT Psalms active — click to disable" : "Load NLT for Psalms in pane 2"}
                >
                  NLT(Ps only){nltPsalmsData ? '✓' : ''}
                </button>}

                {isFeatureVisible('plan') && <a
                  href="https://vercel-bible-plan.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-teal-500 text-white hover:bg-teal-600 font-semibold inline-block"
                  title="Open Bible Plan"
                >
                  Plan
                </a>}

                {isFeatureVisible('math') && <a
                  href="https://cdpn.io/pen/debug/vEKYpYB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-teal-500 text-white hover:bg-teal-600 font-semibold inline-block"
                  title="Open Math"
                >
                  Math
                </a>}

                {isFeatureVisible('figures') && <button
                  onClick={() => setShowFiguresModal(true)}
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-teal-500 text-white hover:bg-teal-600 font-semibold inline-block"
                  title="Figures"
                >
                  Figures
                </button>}

                {isFeatureVisible('copyPane2') && <button
                  onClick={() => {
                    const effectivePane2Chapter = pane2Chapter || selectedChapter;
                    const effectivePane2Abbrev = pane2Book ? pane2Book.abbrev : selectedBook?.abbrev;
                    let verses = [];
                    if (nltPsalmsData && effectivePane2Abbrev === 'ps') {
                      const nltBook = nltPsalmsData.find(b => b.abbrev === 'ps');
                      if (nltBook && nltBook.chapters[effectivePane2Chapter - 1]) {
                        verses = nltBook.chapters[effectivePane2Chapter - 1];
                      }
                    }
                    if (!verses.length && rightPaneBibleData) {
                      let bookAbbrev = effectivePane2Abbrev;
                      if (bookAbbrev && selectedTranslation.includes('he_heb')) {
                        bookAbbrev = getKjvBookAbbrev(bookAbbrev);
                      }
                      const rightPaneBook = rightPaneBibleData.find(b => b.abbrev === bookAbbrev);
                      if (rightPaneBook && rightPaneBook.chapters[effectivePane2Chapter - 1]) {
                        verses = rightPaneBook.chapters[effectivePane2Chapter - 1];
                      }
                    }
                    const bookName = pane2Book ? getBookName(pane2Book.abbrev) : (selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : '');
                    const translationLabel = nltPsalmsData && effectivePane2Abbrev === 'ps' ? 'NLT' : getTranslationShortName(rightPaneTranslation);
                    const header = `${bookName} ${effectivePane2Chapter} (${translationLabel})`;
                    const text = header + '\n\n' + verses.map((v, i) => `${i + 1} ${v}`).join('\n');
                    navigator.clipboard.writeText(text);
                  }}
                  className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-purple-500 text-white hover:bg-purple-600 font-semibold inline-block"
                  title="Copy pane 2 text to clipboard"
                >
                  Copy Pane 2
                </button>}

                {/* KJV / CUV toggle */}
                {isFeatureVisible('toggleCuv') && <button
                  onClick={() => {
                    const next = rightPaneTranslation === 'zh_cuv.json' ? 'en_kjv.json' : 'zh_cuv.json';
                    setRightPaneTranslation(next);
                    setSelectedDropdownTranslation(next);
                    setSelectedTranslation('en_web.json');
                  }}
                  className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold inline-block ${
                    rightPaneTranslation === 'zh_cuv.json'
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
                  title="Toggle pane 2 between KJV and CUV"
                >
                  {rightPaneTranslation === 'zh_cuv.json' ? 'to: KJV' : 'to: CUV'}
                </button>}

                {/* Toggle navigate to Psalms / Proverbs */}
                {isFeatureVisible('togglePsalms') && selectedBook && (
                  <button
                    onClick={() => {
                      handleBookSelect(selectedBook.abbrev === 'ps' ? 'prv' : 'ps');
                    }}
                    className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-pink-500 text-white hover:bg-pink-600 font-semibold"
                    title={selectedBook.abbrev === 'ps' ? 'Go to Proverbs' : 'Go to Psalms'}
                  >
                    {selectedBook.abbrev === 'ps' ? 'to: Prov' : 'to: Psalms'}
                  </button>
                )}

                {isFeatureVisible('toggleRhyme') && <button
                  onClick={() => {
                    const next = rightPaneTranslation === 'en_rhyme.json' ? 'en_web.json' : 'en_rhyme.json';
                    setRightPaneTranslation(next);
                    setSelectedDropdownTranslation(next);
                  }}
                  className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold inline-block ${
                    rightPaneTranslation === 'en_rhyme.json'
                      ? 'bg-pink-500 text-white hover:bg-pink-600'
                      : 'bg-teal-500 text-white hover:bg-teal-600'
                  }`}
                  title="Toggle pane 2 between WEB and Rhyme"
                >
                  {rightPaneTranslation === 'en_rhyme.json' ? 'to: WEB' : 'to: Rhyme'}
                </button>}

                {/* Cycle Pane 1 & 2 Translation Buttons */}
                {(() => {
                  const shortLabel = (id) => {
                    if (!id) return '?';
                    if (id.includes('kjv')) return 'kjv';
                    if (id.includes('web')) return 'web';
                    if (id.includes('cuv')) return 'cuv';
                    if (id.includes('rvr')) return 'rvr';
                    if (id.includes('he_heb')) return 'heb';
                    if (id.includes('apee')) return 'apee';
                    if (id.includes('rhyme')) return 'rhyme';
                    return id.split('_')[1] || id;
                  };
                  const cyclePane1 = () => {
                    try {
                      const currentIndex = translations.findIndex(t => t.id === selectedTranslation);
                      const nextIndex = (currentIndex + 1) % translations.length;
                      const next = translations[nextIndex].id;
                      handleApplySelectedTranslationToPane1(next);
                    } catch (e) { console.warn('Error cycling pane 1 translation:', e); }
                  };
                  const cyclePane2 = () => {
                    try {
                      const currentIndex = translations.findIndex(t => t.id === rightPaneTranslation);
                      const nextIndex = (currentIndex + 1) % translations.length;
                      const next = translations[nextIndex].id;
                      setSelectedDropdownTranslation(next);
                      setTimeout(() => {
                        try { handleApplySelectedTranslationToPane2(next); } catch (e) { console.warn('Error applying translation:', e); }
                      }, 150);
                    } catch (e) { console.warn('Error cycling pane 2 translation:', e); }
                  };
                  return (
                    <>
                      {isFeatureVisible('cyclePane1') && <button
                        onClick={cyclePane1}
                        className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs bg-indigo-500 text-white hover:bg-indigo-600 font-semibold"
                        title="Cycle pane 1 translation"
                      >
                        1:{shortLabel(selectedTranslation)}
                      </button>}
                      {isFeatureVisible('clrPane1') && <button
                        onClick={() => setBlankPane1(prev => { const next = !prev; localStorage.setItem('blankPane1', next); return next; })}
                        className={`ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${blankPane1 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-400 text-white hover:bg-gray-500'}`}
                        title={blankPane1 ? 'Show pane 1 content (l)' : 'Blank pane 1 for Cmd+F search (l)'}
                      >
                        clr pane 1(l)
                      </button>}
                    </>
                  );
                })()}

                {/* Fill-in-the-Blank Quiz Button - moved to TextToSpeech after QA */}

                {/* Study Questions Button - moved to TextToSpeech after Lower */}

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
              isSepiaMode={isSepiaMode}
              onNextChapter={handleChapterSelect}
              bibleData={bibleData}
              setSelectedBook={setSelectedBook}
              firebaseEnabled={firebaseEnabled}
              onFirebaseToggle={setFirebaseEnabled}
              showGlosses={showGlosses}
              onGlossToggle={() => setShowGlosses(!showGlosses)}
              onDarkModeToggle={toggleDarkMode}
              onTouchScrollModeChange={setTouchScrollMode}
              touchScrollMode={touchScrollMode}
              viewMode={viewMode}
              onViewModeToggle={() => setViewMode(viewMode === 'side-by-side' ? 'interleaved' : viewMode === 'interleaved' ? 'interleaved-pd' : 'side-by-side')}
              showPane2Only={showPane2Only}
              onPane2OnlyToggle={() => setShowPane2Only(!showPane2Only)}
              dualPanePD={dualPanePD}
              onDualPanePDToggle={() => setDualPanePD(prev => !prev)}
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
              stickyPane={stickyPane}
              onStickyPaneChange={handleStickyPaneChange}
              onAudioClick={handleAudioButtonClick}
              onClipboardClick={handleClipboardButtonClick}
              onDarkModeToggle={toggleDarkMode}
              isDarkMode={isDarkMode}
              isSepiaMode={isSepiaMode}
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
              showPane2Only={showPane2Only}
              onPane2OnlyToggle={() => setShowPane2Only(!showPane2Only)}
              dualPanePD={dualPanePD}
              onDualPanePDToggle={() => setDualPanePD(prev => !prev)}
              gridReadMode={gridReadMode}
              onGridReadModeToggle={() => setGridReadMode(prev => prev === 'delimit' ? 'undelimit' : 'delimit')}
              onShowVerseGrid={() => setShowVerseGrid(true)}
              chineseBibleData={chineseBibleData}
              lastGridVerse={lastGridVerse}
              pane2Book={pane2Book}
              pane2Chapter={pane2Chapter}
              showStudyQModal={showStudyQModal}
              showQuizModal={showQuizModal}
              onQuiz={() => {
                if (!fitbData) {
                  const baseUrl = getBaseUrl();
                  fetch(`${baseUrl}/en_web_fitb.json`)
                    .then(r => r.json())
                    .then(data => {
                      setFitbData(data);
                      setFitbRevealed({});
                      setShowQuizModal(true);
                    })
                    .catch(err => console.error('Failed to load FITB data:', err));
                } else {
                  setFitbRevealed({});
                  setShowQuizModal(true);
                }
              }}
              showWordsModal={showWordsModal}
              onWords={() => setShowWordsModal(true)}
              showQuiz2Modal={showQuiz2Modal}
              onQuiz2={() => { window.speechSynthesis && window.speechSynthesis.cancel(); setQuiz2BucketIndex(0); setQuiz2RevealCount(0); setShowQuiz2Modal(true); }}
              showBucketsModal={showBucketsModal}
              onBuckets={() => {
                setBucketIndex(0);
                setBucketSlider(1);
                setShowBucketsModal(true);
              }}
              showCursiveModal={showCursiveModal}
              onCursive={() => {
                setCursiveBucketIndex(-1);
                const savedSource = localStorage.getItem('cursive-source') || 'pane2';
                setCursiveSource(savedSource);
                if (savedSource === 'story' && storytimeData) {
                  const activeBook = pane2Book || selectedBook;
                  const activeChapter = pane2Chapter || selectedChapter;
                  if (activeBook) {
                    const bookName = abbrevToBookName[activeBook.abbrev] || activeBook.abbrev;
                    const key = `${bookName} ${activeChapter}`;
                    const story = storytimeData[key];
                    if (story) {
                      let t = story;
                      t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
                      t = t.replace(/^#{1,6}\s+/gm, '');
                      t = t.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
                      t = t.replace(/\*\*(.+?)\*\*/g, '$1');
                      t = t.replace(/__(.+?)__/g, '$1');
                      t = t.replace(/\*(.+?)\*/g, '$1');
                      t = t.replace(/_(.+?)_/g, '$1');
                      t = t.replace(/`([^`]+)`/g, '$1');
                      t = t.replace(/^>\s?/gm, '');
                      t = t.replace(/^[-*]{3,}\s*$/gm, '');
                      t = t.replace(/^\|.*\|$/gm, '');
                      t = t.replace(/^[-|:\s]+$/gm, '');
                      t = t.replace(/^[-*+]\s+/gm, '');
                      t = t.replace(/^\d+\.\s+/gm, '');
                      t = t.replace(/\n{3,}/g, '\n\n');
                      const cleaned = t.trim();
                      const clean = cleaned.replace(/\s+/g, ' ').trim();
                      if (clean) {
                        let out;
                        const hasAtMarkers = /(?:^|\n)\s*@\S/.test(cleaned);
                        if (hasAtMarkers) {
                          out = cleaned.split(/\n(?=\s*@\S)/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
                        } else {
                          out = [];
                          const MAX = 500;
                          let i = 0;
                          while (i < clean.length) {
                            if (clean.length - i <= MAX) { out.push(clean.slice(i).trim()); break; }
                            let end = i + MAX;
                            const slice = clean.slice(i, end);
                            const sentEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
                            if (sentEnd > MAX / 2) { end = i + sentEnd + 1; } else {
                              const sp = clean.lastIndexOf(' ', end);
                              if (sp > i + MAX / 2) end = sp;
                            }
                            out.push(clean.slice(i, end).trim());
                            i = end;
                          }
                        }
                        setCursiveClipboardBuckets(out);
                      }
                    } else {
                      // No story available, fall back to pane2
                      setCursiveSource('pane2'); localStorage.setItem('cursive-source', 'pane2');
                      setCursiveClipboardBuckets(null);
                    }
                  }
                } else {
                  setCursiveClipboardBuckets(null);
                }
                setShowCursiveModal(true);
              }}
              showBreatheModal={showBreatheModal}
              onBreathe={() => setShowBreatheModal(true)}
              sidebarLang={sidebarLang}
              onSidebarLangCycle={() => {
                const langOptions = ['en', 'cant', 'chin', 'heb', 'span', 'fr'];
                const idx = langOptions.indexOf(sidebarLang);
                setSidebarLang(langOptions[(idx + 1) % langOptions.length]);
              }}
              onLangToggleOpen={() => {
                const isOpen = showVerseGrid || showSpanishGrid || showHebrewGrid || showFrenchGrid;
                if (isOpen) {
                  setShowVerseGrid(false);
                  setShowSpanishGrid(false);
                  setShowHebrewGrid(false);
                  setShowFrenchGrid(false);
                } else {
                  const lang = sidebarLang || 'cant';
                  setSidebarLang(lang);
                  setShowVerseGrid(lang === 'cant' || lang === 'chin');
                  setShowSpanishGrid(lang === 'span');
                  setShowHebrewGrid(lang === 'heb');
                  setShowFrenchGrid(lang === 'fr');
                }
              }}
              showVerseGrid={showVerseGrid}
              showSpanishGrid={showSpanishGrid}
              showHebrewGrid={showHebrewGrid}
              showFrenchGrid={showFrenchGrid}
              fontScale={fontScale}
              onFontScaleDown={() => setFontScale(prev => Math.max(0.5, prev - 0.1))}
              onFontScaleUp={() => setFontScale(prev => Math.min(2, prev + 0.1))}
              onClassicalMusic={() => setShowClassicalModal(true)}
              onClassicalTogglePlay={() => {
                if (classicalRef.current) classicalRef.current.togglePlay();
              }}
              classicalPlaying={classicalPlaying}
              onYouTubeVideo={() => setShowYouTubeModal(true)}
              isYouTubePlaying={isYouTubePlaying}
              showPane2Syllables={showPane2Syllables}
              onTogglePane2Syllables={() => setShowPane2Syllables(s => { const next = !s; localStorage.setItem('bible-pane2-syllables', next); return next; })}
              syllabifyText={syllabifyText}
              onRefPrompt={() => setShowRefPrompt(true)}
              isFeatureVisible={isFeatureVisible}
              onQA={() => {
                if (!studyQData) {
                  const baseUrl = getBaseUrl();
                  fetch(`${baseUrl}/study_questions.json`)
                    .then(r => r.json())
                    .then(data => { setStudyQData(data); setStudyQRevealed({}); setShowStudyQModal(true); })
                    .catch(err => console.error('Failed to load study questions:', err));
                } else {
                  setStudyQRevealed({});
                  setShowStudyQModal(prev => !prev);
                }
              }}
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
                                }
                }
              }}
            />
            
            {/* ← Match button: sync pane 2 to pane 1's book/chapter */}
            {selectedBook && (
              <button
                onClick={() => {
                  setPane2Book(selectedBook);
                  setPane2Chapter(selectedChapter);
                  setStrongsConcordance(null);
                  setIsViewingCrossRef(true);
                }}
                className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors text-xs"
              >
                ← Match
              </button>
            )}

            {/* Return to Primary Reading button (only when viewing cross-reference) */}
            {isViewingCrossRef && (
              <button
                onClick={() => {
                  if (primaryReading.book) {
                    setSelectedBook(primaryReading.book);
                    setSelectedChapter(primaryReading.chapter);
                    setIsViewingCrossRef(false);
                    setPane2History([]);
                    setStrongsConcordance(null);
                    if (chapterContentRef.current) {
                      chapterContentRef.current.scrollTop = 0;
                    }
                    lastPrimaryScrollPos.current = 0;
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
        <div
          className="flex-1 flex overflow-hidden"
          onTouchStart={(e) => {
            swipeTouchStartX.current = e.touches[0].clientX;
            swipeTouchStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (swipeTouchStartX.current === null || !isMobileView || isTabletView || viewMode !== 'side-by-side' || showPane2Only) return;
            const dx = e.changedTouches[0].clientX - swipeTouchStartX.current;
            const dy = e.changedTouches[0].clientY - swipeTouchStartY.current;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
              if (dx < 0 && !showKJVOnMobile) {
                // Swipe left: go to pane 2
                setShowKJVOnMobile(true);
                localStorage.setItem('mobilePanePreference', 'pane2');
              } else if (dx < 0 && showKJVOnMobile) {
                // Swipe left while already on pane 2: go to next chapter
                const nextChapterButtons = Array.from(document.querySelectorAll('button'))
                  .filter(button => button.textContent.includes('Next Chapter'));
                if (nextChapterButtons.length > 0) {
                  nextChapterButtons[0].click();
                }
              } else if (dx > 0 && showKJVOnMobile) {
                // Swipe right: go to pane 1
                setShowKJVOnMobile(false);
                localStorage.setItem('mobilePanePreference', 'pane1');
              }
            }
            swipeTouchStartX.current = null;
            swipeTouchStartY.current = null;
          }}
        >
          {(viewMode === 'interleaved' || viewMode === 'interleaved-pd') ? (
            /* Interleaved View - Single pane with alternating verses */
            <div
              ref={chapterContentRef}
              className="w-full overflow-y-auto p-4 md:p-8 bg-white relative"
              style={{ backgroundColor: isDarkMode ? '#1f2937' : isSepiaMode ? '#f4ecd8' : '#E7DFC8', color: isDarkMode ? 'white' : isSepiaMode ? '#5a5a5a' : '#5A4333' }}
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

                      // Get right pane verses — use independent pane2 state if set
                      let rightPaneVerses = [];
                      const effectivePane2Chapter = pane2Chapter || selectedChapter;
                      const effectivePane2Abbrev = pane2Book ? pane2Book.abbrev : selectedBook?.abbrev;
                      // Use NLT Psalms if active and on Psalms
                      if (nltPsalmsData && effectivePane2Abbrev === 'ps') {
                        const nltBook = nltPsalmsData.find(b => b.abbrev === 'ps');
                        if (nltBook && nltBook.chapters[effectivePane2Chapter - 1]) {
                          rightPaneVerses = nltBook.chapters[effectivePane2Chapter - 1];
                        }
                      }
                      if (!rightPaneVerses.length && rightPaneBibleData) {
                        let bookAbbrev;
                        if (pane2Book) {
                          bookAbbrev = pane2Book.abbrev;
                        } else if (selectedBook) {
                          bookAbbrev = selectedBook.abbrev;
                          if (selectedTranslation.includes('he_heb')) {
                            bookAbbrev = getKjvBookAbbrev(bookAbbrev);
                          }
                        }
                        if (bookAbbrev) {
                          const rightPaneBook = rightPaneBibleData.find(b => b.abbrev === bookAbbrev);
                          if (rightPaneBook && rightPaneBook.chapters[effectivePane2Chapter - 1]) {
                            rightPaneVerses = rightPaneBook.chapters[effectivePane2Chapter - 1];
                          }
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
                            const pane2Label = pane2Book
                              ? `${getTranslationShortName(rightPaneTranslation)} - ${getBookName(pane2Book.abbrev)} ${effectivePane2Chapter}`
                              : getTranslationShortName(rightPaneTranslation);
                            interleavedVerses.push({
                              type: 'secondary',
                              verseNumber,
                              text: rightPaneVerses[i],
                              translation: pane2Label
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
                              <span className="flex-1">{selectedTranslation === 'he_heb_strong.json' && item.type === 'primary' ? renderWithStrongs(item.text, showGlosses) : renderWithGlosses(item.type === 'secondary' && showPane2Syllables ? syllabifyText(item.text) : item.text, showGlosses)}</span>
                              <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ({item.translation})
                              </span>
                            </p>

                            {/* Cross-references — always visible for primary pane */}
                            {hasReference && (
                              <div className={`mt-2 pl-8 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`} style={{ fontSize: `${fontScale * 0.85}rem` }}>
                                <span className="font-medium mr-1">Refs:</span>
                                {crossReferences[refKey].map((ref, i) => {
                                  const isPentateuch = ['gn','ge','ex','lv','nm','dt'].includes(ref.book);
                                  const isIsaiah = ref.book === 'is';
                                  const isOrange = ['ps','rm','hb','lk'].includes(ref.book);
                                  const isNT = ['mt','mk','jo','act','1co','2co','gl','eph','ph','cl','1ts','2ts','1tm','2tm','tt','phm','jm','1pe','2pe','1jo','2jo','3jo','jd','re'].includes(ref.book);
                                  return (
                                  <button
                                    key={i}
                                    onClick={() => handleCrossRefNavigate(ref)}
                                    className={`mr-2 ${
                                      isPentateuch || isIsaiah
                                        ? 'hover:opacity-80'
                                        : isOrange
                                          ? (isDarkMode ? 'text-orange-300 hover:text-orange-200' : 'text-orange-600 hover:text-orange-800')
                                          : isNT
                                            ? (isDarkMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-800')
                                            : (isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800')
                                    }`}
                                    style={
                                      isPentateuch ? { color: isDarkMode ? '#FCD34D' : '#92400E' }
                                      : isIsaiah ? { color: isDarkMode ? '#e8e8e6' : '#242422' }
                                      : undefined
                                    }
                                  >
                                    {getBookName(ref.book)} {ref.chapter}:{ref.verse}{i < crossReferences[refKey].length - 1 ? ',' : ''}
                                  </button>
                                  );
                                })}
                                <button
                                  onClick={() => handleExpandRefs(refKey, item.verseNumber)}
                                  className={`ml-1 inline-flex items-center ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'}`}
                                  title="Show all cross-reference verses in pane 2"
                                >
                                  <Link className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Chapter Navigation */}
                  <div className="mt-10 flex justify-between pb-4">
                    <button
                      onClick={handleStorytimeButtonClick}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                    >
                      Story
                    </button>

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
                  <div className="text-center text-gray-400 text-xs pb-2">-/+ pageup/down</div>
                </div>
              )}
            </div>
          ) : (
            /* Side-by-side View - Original two-pane layout */
            <>
          {/* Bible Text Display */}
          <div
            ref={chapterContentRef}
            className={`${showPane2Only ? 'hidden' : isMobileView && !isTabletView && showKJVOnMobile ? 'hidden' : isMobileView && !isTabletView ? 'w-full' : isTabletView ? 'w-1/2' : 'w-1/2'} overflow-y-auto p-4 md:p-8 ${isDarkMode ? 'bg-gray-900 text-white scrollbar-dark' : isSepiaMode ? 'scrollbar-sepia' : 'bg-white'} relative`}
            onClick={(event) => handlePaneClick(event, 'left')}
            style={isSepiaMode ? { backgroundColor: '#f4ecd8', color: '#5a5a5a', cursor: 'default', scrollbarColor: '#c4b89a #f4ecd8' } : isDarkMode ? { cursor: 'default', scrollbarColor: '#555 #1a1a2e' } : { cursor: 'default' }}
          >
            {/* Pane 1 page-down button — desktop/tablet only */}
            {(!isMobileView || isTabletView) && selectedBook && selectedChapter > 0 && (
              <button
                onClick={() => {
                  const pane1 = chapterContentRef.current;
                  if (pane1) {
                    const maxScroll = pane1.scrollHeight - pane1.clientHeight;
                    pane1.scrollTop = Math.min(maxScroll, pane1.scrollTop + pane1.clientHeight * 0.9);
                  }
                }}
                style={{ position: 'sticky', top: '50%', left: 6, zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', marginBottom: -48, float: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = ''; }}
                title="Page down"
              >
                <svg width="48" height="48" viewBox="0 0 64 64"><path d="M8 20 L32 44 L56 20" stroke="rgba(0,0,0,0.7)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            {/* Pane toggle button — mobile only, top left */}
            {isMobileView && !isTabletView && selectedBook && selectedChapter > 0 && (
              <button
                onClick={() => {
                  setShowKJVOnMobile(true);
                  localStorage.setItem('mobilePanePreference', 'pane2');
                }}
                style={{ position: 'sticky', top: 6, left: 6, zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', marginBottom: -48, float: 'left', color: 'white', fontSize: 22, fontWeight: 700 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = ''; }}
                title="Switch to Pane 2"
              >
                2
              </button>
            )}
            {/* Page-down buttons — mobile only, left + right */}
            {isMobileView && !isTabletView && selectedBook && selectedChapter > 0 && (
              <>
                <button
                  onClick={() => {
                    const pane1 = chapterContentRef.current;
                    if (pane1) {
                      const maxScroll = pane1.scrollHeight - pane1.clientHeight;
                      pane1.scrollTop = Math.min(maxScroll, pane1.scrollTop + pane1.clientHeight * 0.9);
                    }
                  }}
                  style={{ position: 'sticky', top: '50%', left: 6, zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', marginBottom: -48, float: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = ''; }}
                  title="Page down"
                >
                  <svg width="48" height="48" viewBox="0 0 64 64"><path d="M8 20 L32 44 L56 20" stroke="rgba(0,0,0,0.7)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button
                  onClick={() => {
                    const pane1 = chapterContentRef.current;
                    if (pane1) {
                      const maxScroll = pane1.scrollHeight - pane1.clientHeight;
                      pane1.scrollTop = Math.min(maxScroll, pane1.scrollTop + pane1.clientHeight * 0.9);
                    }
                  }}
                  style={{ position: 'sticky', top: '50%', right: 6, zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', marginBottom: -48, float: 'right' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = ''; }}
                  title="Page down"
                >
                  <svg width="48" height="48" viewBox="0 0 64 64"><path d="M8 20 L32 44 L56 20" stroke="rgba(0,0,0,0.7)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </>
            )}
            {selectedBook && selectedChapter > 0 && !blankPane1 && (
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
                          <span className="flex-1">{selectedTranslation === 'he_heb_strong.json' ? renderWithStrongs(verse, showGlosses) : renderWithGlosses(verse, showGlosses)}</span>
                          
                        </p>

                        {/* Cross-references — always visible */}
                        {hasReference && (
                          <div className={`mt-2 pl-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontSize: `${fontScale * 0.85}rem` }}>
                            <span className="font-medium mr-1">Refs:</span>
                            {crossReferences[refKey].map((ref, i) => {
                              const isPentateuch = ['gn','ge','ex','lv','nm','dt'].includes(ref.book);
                              const isIsaiah = ref.book === 'is';
                              const isOrange = ['ps','rm','hb','lk'].includes(ref.book);
                              const isNT = ['mt','mk','jo','act','1co','2co','gl','eph','ph','cl','1ts','2ts','1tm','2tm','tt','phm','jm','1pe','2pe','1jo','2jo','3jo','jd','re'].includes(ref.book);
                              return (
                              <button
                                key={i}
                                onClick={() => handleCrossRefNavigate(ref)}
                                className={`mr-2 ${
                                  isPentateuch || isIsaiah
                                    ? 'hover:opacity-80'
                                    : isOrange
                                      ? (isDarkMode ? 'text-orange-300 hover:text-orange-200' : 'text-orange-600 hover:text-orange-800')
                                      : isNT
                                        ? (isDarkMode ? 'text-green-300 hover:text-green-200' : 'text-green-600 hover:text-green-800')
                                        : (isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800')
                                }`}
                                style={
                                  isPentateuch ? { color: isDarkMode ? '#FCD34D' : '#92400E' }
                                  : isIsaiah ? { color: isDarkMode ? '#e8e8e6' : '#242422' }
                                  : undefined
                                }
                              >
                                {getBookName(ref.book)} {ref.chapter}:{ref.verse}{i < crossReferences[refKey].length - 1 ? ',' : ''}
                              </button>
                              );
                            })}
                            <button
                              onClick={() => handleExpandRefs(refKey, verseNumber)}
                              className={`ml-1 inline-flex items-center ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-700'}`}
                              title="Show all cross-reference verses in pane 2"
                            >
                              <Link className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Chapter Navigation - Simple inline approach */}
                <div className="mt-10 flex justify-between pb-4">
                  <button
                    onClick={handleStorytimeButtonClick}
                    className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                  >
                    Story
                  </button>

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
          {(showPane2Only || !isMobileView || isTabletView || showKJVOnMobile) && (
            <div className={`${showPane2Only ? 'w-full' : isMobileView && !isTabletView ? 'w-full' : 'w-1/2'} ${showPane2Only ? '' : 'border-l'} ${isDarkMode ? 'border-gray-700 bg-gray-800' : isSepiaMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} flex flex-col relative`} style={isSepiaMode ? { backgroundColor: '#f4ecd8' } : {}}>
              {/* Pane 2 chapter nav arrows — desktop/tablet only */}
              {(!isMobileView || isTabletView) && selectedBook && (() => {
                const p2Book = pane2Book || selectedBook;
                const p2Chapter = pane2Chapter || selectedChapter;
                const hasPrev = p2Chapter > 1;
                const hasNext = p2Book && p2Chapter < p2Book.chapters.length;
                const navToChapter = (ch) => {
                  localStorage.removeItem('mobileScrollPosition');
                  setMobileScrollPosition(0);
                  setSelectedBook(p2Book);
                  setSelectedChapter(ch);
                  setPane2Book(null);
                  setPane2Chapter(null);
                  setPrimaryReading({ book: p2Book, chapter: ch });
                  setIsViewingCrossRef(false);
                  setTimeout(() => { handleHomeReset(); }, 100);
                };
                return (
                  <>
                    <button
                      onClick={() => {
                        const pane = kjvContentRef.current;
                        console.log('[NextVerse] pane:', !!pane, 'p2Book:', p2Book?.abbrev, 'p2Chapter:', p2Chapter, 'hasNext:', hasNext);
                        if (!pane) return;
                        const paneRect = pane.getBoundingClientRect();
                        console.log('[NextVerse] paneRect top:', paneRect.top, 'bottom:', paneRect.bottom);
                        // Find the topmost visible verse and collect all verse numbers
                        let topVerse = null;
                        const allVerseNums = [];
                        for (let i = 1; i <= 200; i++) {
                          const el = document.getElementById(`right-pane-verse-${i}`);
                          if (!el) { if (allVerseNums.length > 0 && i - allVerseNums[allVerseNums.length - 1] > 5) break; continue; }
                          allVerseNums.push(i);
                          if (topVerse === null) {
                            const elRect = el.getBoundingClientRect();
                            if (elRect.top >= paneRect.top - 5) {
                              topVerse = i;
                            }
                          }
                        }
                        console.log('[NextVerse] allVerseNums:', allVerseNums.length, 'topVerse:', topVerse);
                        // Check if bottom buttons are visible — require 2 clicks to advance
                        const bottomBtns = document.getElementById('pane2-bottom-buttons');
                        const atBottom = bottomBtns && bottomBtns.getBoundingClientRect().top < paneRect.bottom;
                        if (atBottom && hasNext) {
                          if (!pane._nextVerseBottomClicks) pane._nextVerseBottomClicks = 0;
                          pane._nextVerseBottomClicks += 1;
                          if (pane._nextVerseBottomClicks >= 3) {
                            pane._nextVerseBottomClicks = 0;
                            navToChapter(p2Chapter + 1);
                          }
                          return;
                        }
                        if (pane._nextVerseBottomClicks) pane._nextVerseBottomClicks = 0;
                        if (topVerse !== null) {
                          // Find the next verse number that exists after topVerse
                          const nextVerseNum = allVerseNums.find(n => n > topVerse);
                          if (nextVerseNum) {
                            const nextEl = document.getElementById(`right-pane-verse-${nextVerseNum}`);
                            const nextRect = nextEl.getBoundingClientRect();
                            const offset = nextRect.top - paneRect.top + pane.scrollTop;
                            pane.scrollTo({ top: offset, behavior: 'smooth' });
                          } else if (hasNext) {
                            navToChapter(p2Chapter + 1);
                          }
                        } else if (hasNext) {
                          navToChapter(p2Chapter + 1);
                        }
                      }}
                      style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = 'translateY(-50%)'; }}
                      title="Next verse"
                    >
                      <svg width="48" height="48" viewBox="0 0 64 64"><path d="M8 20 L32 44 L56 20" stroke="rgba(0,0,0,0.7)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      onClick={() => {
                        const pane = kjvContentRef.current;
                        if (!pane) return;
                        const paneRect = pane.getBoundingClientRect();
                        let topVerse = 1;
                        for (let i = 1; i <= 200; i++) {
                          const el = document.getElementById(`right-pane-verse-${i}`);
                          if (!el) break;
                          const elRect = el.getBoundingClientRect();
                          if (elRect.bottom > paneRect.top + 40) {
                            topVerse = i;
                            break;
                          }
                        }
                        // Check if bottom buttons are visible — if so, read all remaining verses
                        const bottomBtns = document.getElementById('pane2-bottom-buttons');
                        const atBottom = bottomBtns && bottomBtns.getBoundingClientRect().top < paneRect.bottom;
                        let lastVerse = topVerse;
                        if (atBottom) {
                          for (let i = topVerse + 1; i <= 200; i++) {
                            if (!document.getElementById(`right-pane-verse-${i}`)) break;
                            lastVerse = i;
                          }
                        }
                        window.dispatchEvent(new CustomEvent('speakVerseContent', {
                          detail: { verseNumber: topVerse, lastVerse: lastVerse, lang: sidebarLang || 'en' }
                        }));
                      }}
                      style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = 'translateY(-50%)'; }}
                      title="Read verse aloud (TTS)"
                    >
                      <span style={{ fontSize: 22, color: 'rgba(0,0,0,0.7)' }}>🔊</span>
                    </button>
                    <button
                      onClick={() => {
                        const pane = kjvContentRef.current;
                        if (!pane) return;
                        const paneRect = pane.getBoundingClientRect();
                        let topVerse = 1;
                        for (let i = 1; i <= 200; i++) {
                          const el = document.getElementById(`right-pane-verse-${i}`);
                          if (!el) break;
                          const elRect = el.getBoundingClientRect();
                          if (elRect.bottom > paneRect.top + 40) {
                            topVerse = i;
                            break;
                          }
                        }
                        // Check if bottom buttons are visible — if so, copy all remaining verses
                        const bottomBtns = document.getElementById('pane2-bottom-buttons');
                        const atBottom = bottomBtns && bottomBtns.getBoundingClientRect().top < paneRect.bottom;
                        let lastVerse = topVerse;
                        if (atBottom) {
                          for (let i = topVerse + 1; i <= 200; i++) {
                            if (!document.getElementById(`right-pane-verse-${i}`)) break;
                            lastVerse = i;
                          }
                        }
                        const texts = [];
                        for (let v = topVerse; v <= lastVerse; v++) {
                          const verseEl = document.getElementById(`right-pane-verse-${v}`);
                          if (verseEl) {
                            const p = verseEl.querySelector('p');
                            if (p) {
                              const spans = p.querySelectorAll('span');
                              const textSpan = spans.length >= 2 ? spans[1] : null;
                              const text = textSpan ? textSpan.textContent.trim() : p.textContent.trim();
                              if (text) texts.push(text);
                            }
                          }
                        }
                        if (texts.length) {
                          navigator.clipboard.writeText(texts.join('\n')).then(() => {
                            const btn = document.getElementById('pane2-copy-btn');
                            if (btn) { btn.querySelector('span').textContent = '✓'; setTimeout(() => { btn.querySelector('span').textContent = '📋'; }, 1000); }
                          });
                        }
                      }}
                      id="pane2-copy-btn"
                      style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = 'translateX(-50%)'; }}
                      title="Copy verse from pane 2"
                    >
                      <span style={{ fontSize: 22, color: 'rgba(0,0,0,0.7)' }}>📋</span>
                    </button>
                  </>
                );
              })()}
              {/* KJV Bible Text Display */}
              <div
                ref={kjvContentRef}
                className={`flex-1 p-8 overflow-y-auto ${isDarkMode ? 'bg-gray-900 text-white scrollbar-dark' : isSepiaMode ? 'scrollbar-sepia' : 'bg-white'}`}
                onClick={(event) => {
                  if (showPane2Only) {
                    if (event.target.tagName === 'A' || event.target.tagName === 'BUTTON' || event.target.closest('button') || event.target.closest('a') || event.target.closest('select')) return;
                    const pane = kjvContentRef.current;
                    if (!pane) return;
                    const pageHeight = pane.clientHeight * 0.9;
                    pane.scrollTop = Math.min(pane.scrollHeight - pane.clientHeight, pane.scrollTop + pageHeight);
                  } else {
                    handlePaneClick(event, 'right');
                  }
                }}
                style={isSepiaMode ? { backgroundColor: '#f4ecd8', color: '#5a5a5a', cursor: 'default', scrollbarColor: '#c4b89a #f4ecd8' } : isDarkMode ? { cursor: 'default', scrollbarColor: '#555 #1a1a2e' } : { cursor: 'default' }}
              >
                {/* Pane toggle button — mobile only, top left */}
                {isMobileView && !isTabletView && (
                  <button
                    onClick={() => {
                      setShowKJVOnMobile(false);
                      localStorage.setItem('mobilePanePreference', 'pane1');
                    }}
                    style={{ position: 'sticky', top: 6, left: 6, zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', marginBottom: -48, float: 'left', color: 'white', fontSize: 22, fontWeight: 700 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = ''; }}
                    title="Switch to Pane 1"
                  >
                    1
                  </button>
                )}
                {/* Page-down buttons — mobile only, left + right */}
                {isMobileView && !isTabletView && (
                  <>
                    <button
                      onClick={() => {
                        const pane = kjvContentRef.current;
                        if (pane) {
                          const maxScroll = pane.scrollHeight - pane.clientHeight;
                          pane.scrollTop = Math.min(maxScroll, pane.scrollTop + pane.clientHeight * 0.9);
                        }
                      }}
                      style={{ position: 'sticky', top: '50%', left: 6, zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', marginBottom: -48, float: 'left' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = ''; }}
                      title="Page down"
                    >
                      <svg width="48" height="48" viewBox="0 0 64 64"><path d="M8 20 L32 44 L56 20" stroke="rgba(0,0,0,0.7)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      onClick={() => {
                        const pane = kjvContentRef.current;
                        if (pane) {
                          const maxScroll = pane.scrollHeight - pane.clientHeight;
                          pane.scrollTop = Math.min(maxScroll, pane.scrollTop + pane.clientHeight * 0.9);
                        }
                      }}
                      style={{ position: 'sticky', top: '50%', right: 6, zIndex: 10, width: 48, height: 48, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', marginBottom: -48, float: 'right' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = ''; }}
                      title="Page down"
                    >
                      <svg width="48" height="48" viewBox="0 0 64 64"><path d="M8 20 L32 44 L56 20" stroke="rgba(0,0,0,0.7)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </>
                )}
                {/* Expanded Cross-References View */}
                {expandedRefsData && (
                  <div className={`${showPane2Only ? 'max-w-[70ch] mx-auto' : ''} pb-8`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: `${fontScale * 1.1}em`, color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}>
                        Cross-References — {expandedRefsData.verseLabel}
                      </h3>
                      <button
                        onClick={() => setExpandedRefsData(null)}
                        style={{ width: 28, height: 28, fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: isDarkMode ? '#555' : isSepiaMode ? '#d4c9a8' : '#d0d0d0', color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}
                      >✕</button>
                    </div>
                    <div className="space-y-4">
                      {expandedRefsData.refs.map((ref, i) => {
                        const isPentateuch = ['gn','ge','ex','lv','nm','dt'].includes(ref.book);
                        const isIsaiah = ref.book === 'is';
                        const isOrange = ['ps','rm','hb','lk'].includes(ref.book);
                        const isNT = ['mt','mk','jo','act','1co','2co','gl','eph','ph','cl','1ts','2ts','1tm','2tm','tt','phm','jm','1pe','2pe','1jo','2jo','3jo','jd','re'].includes(ref.book);
                        const labelColor = isPentateuch ? (isDarkMode ? '#FCD34D' : '#92400E')
                          : isIsaiah ? (isDarkMode ? '#e8e8e6' : '#242422')
                          : isOrange ? (isDarkMode ? '#fb923c' : '#ea580c')
                          : isNT ? (isDarkMode ? '#86efac' : '#16a34a')
                          : (isDarkMode ? '#93c5fd' : '#2563eb');
                        return (
                          <div key={i} className={`p-3 rounded-md ${isDarkMode ? 'bg-gray-800' : ''}`} style={isSepiaMode ? { backgroundColor: '#e8ddc4' } : !isDarkMode ? { backgroundColor: '#f9fafb' } : {}}>
                            <a
                              href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(getBookName(ref.book) + ' ' + ref.chapter)}&version=NLT`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold mb-1 hover:underline"
                              style={{ color: labelColor, padding: 0, fontSize: `${fontScale * 0.95}rem`, textDecoration: 'none' }}
                            >
                              {ref.label}
                            </a>
                            <p style={{ margin: '4px 0 0', fontSize: `${fontScale * 1.125}rem`, lineHeight: 1.6, color: isDarkMode ? '#d0d0d0' : isSepiaMode ? '#5a5a5a' : '#333' }}>
                              {ref.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {showStudyQModal && studyQData && (() => {
                  const bookName = selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : '';
                  const bookQuestions = selectedBook && studyQData[selectedBook.abbrev];
                  const chapterQuestions = bookQuestions && bookQuestions[String(selectedChapter)];
                  // Build table of contents from all available books/chapters
                  const toc = Object.entries(studyQData).map(([abbrev, chapters]) => ({
                    abbrev,
                    chapters: Object.keys(chapters).map(Number).sort((a, b) => a - b)
                  }));
                  return (
                    <div className={`${showPane2Only ? 'max-w-[70ch] mx-auto' : ''} pb-8`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1em', color: isDarkMode ? '#e0e0e0' : '#333' }}>
                          {chapterQuestions ? `${bookName} ${selectedChapter} — Study Questions` : 'Study Questions'}
                        </h3>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setStudyQFontSize(prev => Math.max(10, prev - 2))} style={{ width: 28, height: 28, fontSize: 16, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333' }}>−</button>
                          <button onClick={() => setStudyQFontSize(prev => Math.min(28, prev + 2))} style={{ width: 28, height: 28, fontSize: 16, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333' }}>+</button>
                          <button onClick={() => setShowStudyQModal(false)} style={{ width: 28, height: 28, fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: isDarkMode ? '#555' : '#d0d0d0', color: isDarkMode ? '#e0e0e0' : '#333' }}>✕</button>
                        </div>
                      </div>
                      {/* Table of contents */}
                      <div style={{ marginBottom: 16, fontSize: studyQFontSize - 2, color: isDarkMode ? '#aaa' : '#666' }}>
                        <strong style={{ color: isDarkMode ? '#f59e0b' : '#b45309' }}>Available: </strong>
                        {toc.map(({ abbrev, chapters }) => (
                          <span key={abbrev} style={{ marginRight: 8 }}>{abbrev.toUpperCase()} ch {chapters.join(', ')}</span>
                        ))}
                      </div>
                      {chapterQuestions ? (
                        chapterQuestions.map((section, si) => (
                          <div key={si} style={{ marginBottom: si < chapterQuestions.length - 1 ? 16 : 0 }}>
                            {chapterQuestions.length > 1 && (
                              <div style={{ fontSize: studyQFontSize - 2, fontWeight: 600, color: isDarkMode ? '#f59e0b' : '#b45309', marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}` }}>
                                {section.passage}
                              </div>
                            )}
                            {section.questions.map((q, qi) => {
                              const globalIdx = `${si}-${qi}`;
                              return (
                                <div key={qi} onClick={() => setStudyQRevealed(prev => ({ ...prev, [globalIdx]: !prev[globalIdx] }))}
                                  style={{ margin: '0 0 6px', fontSize: studyQFontSize, lineHeight: 1.6, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', background: studyQRevealed[globalIdx] ? (isDarkMode ? '#3a2e1a' : '#fef3c7') : 'transparent', transition: 'background 0.15s', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                  <span style={{ fontWeight: 700, color: isDarkMode ? '#f59e0b' : '#b45309', fontSize: studyQFontSize - 2, minWidth: 20, flexShrink: 0 }}>{qi + 1}</span>
                                  <span style={{ color: isDarkMode ? '#d0d0d0' : '#333' }}>{q}</span>
                                </div>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        <p style={{ color: isDarkMode ? '#aaa' : '#666', textAlign: 'center', fontSize: studyQFontSize }}>
                          No study questions for {bookName} {selectedChapter}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {!showStudyQModal && selectedBook && selectedChapter > 0 && (
                <div className={showPane2Only ? 'max-w-[70ch] mx-auto' : ''}>
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
                    {pane2Book ? getBookName(pane2Book.abbrev) : (selectedBook.book || getBookName(selectedBook.abbrev))} {pane2Chapter || selectedChapter} <span className="text-gray-500 ml-2">({nltPsalmsData && (pane2Book ? pane2Book.abbrev : selectedBook?.abbrev) === 'ps' ? 'NLT' : getTranslationShortName(rightPaneTranslation)})</span>
                    <span className="ml-3 px-2 py-1 rounded text-xs bg-blue-50 text-blue-800">
                      Exact Sync
                    </span>
                    <div className="ml-auto flex items-center">
                      {lastCrossRef && (
                        <button
                          onClick={() => handleCrossRefNavigate(lastCrossRef)}
                          className={`text-xs px-2 py-1 rounded mr-2 font-semibold ${isDarkMode ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' : 'bg-gray-100 text-blue-700 hover:bg-gray-200'}`}
                          title="Jump pane 2 back to last cross-reference"
                        >
                          {lastCrossRef.label}
                        </button>
                      )}
                    </div>
                  </h2>
                  <div className="space-y-5">
                    {/* Strong's Concordance View */}
                    {strongsConcordance && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                            {strongsConcordance.number}
                            {strongsConcordance.def && (
                              <span className={`ml-2 font-normal ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {strongsConcordance.def.word}
                                {strongsConcordance.def.translit && (
                                  <span className="italic ml-1 text-sm">({strongsConcordance.def.translit})</span>
                                )}
                              </span>
                            )}
                          </h3>
                          <button
                            onClick={() => setStrongsConcordance(null)}
                            className={`px-3 py-1 rounded text-sm font-semibold ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                          >
                            Close
                          </button>
                        </div>
                        {strongsConcordance.def && (strongsConcordance.def.strongs_def || strongsConcordance.def.kjv_def) && (
                          <div className={`mb-3 p-2 rounded text-sm ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-purple-50 text-gray-700'}`}>
                            {strongsConcordance.def.strongs_def && (
                              <div className="mb-1">{strongsConcordance.def.strongs_def}</div>
                            )}
                            {strongsConcordance.def.kjv_def && (
                              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <span className="font-semibold">KJV: </span>{strongsConcordance.def.kjv_def}
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`mb-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {strongsConcordance.refs.length} occurrences
                        </div>
                        <div className="space-y-1" style={{ fontSize: `${fontScale * 0.95}rem` }}>
                          {strongsConcordance.refs.map((ref, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                const book = (rightPaneBibleData || bibleData || []).find(b => b.abbrev === ref.b);
                                if (book) {
                                  // Save current state (including concordance) so Back can restore it
                                  setPane2History(h => [...h, { book: pane2Book, chapter: pane2Chapter, concordance: strongsConcordance }]);
                                  setPane2Book(book);
                                  setPane2Chapter(ref.c);
                                  setStrongsConcordance(null);
                                  setIsViewingCrossRef(true);
                                  setTimeout(() => {
                                    const el = document.getElementById(`right-pane-verse-${ref.v}`);
                                    const pane = kjvContentRef.current;
                                    if (el && pane) {
                                      isManuallyScrolling.current = true;
                                      const elRect = el.getBoundingClientRect();
                                      const paneRect = pane.getBoundingClientRect();
                                      const offset = elRect.top - paneRect.top + pane.scrollTop - pane.clientHeight / 3;
                                      pane.scrollTo({ top: offset, behavior: 'smooth' });
                                      el.style.backgroundColor = isDarkMode ? '#78350f' : '#fef9c3';
                                      el.style.color = isDarkMode ? '#fde68a' : '';
                                      setTimeout(() => { el.style.backgroundColor = ''; el.style.color = ''; }, 3000);
                                      setTimeout(() => { isManuallyScrolling.current = false; }, 800);
                                    }
                                  }, 300);
                                }
                              }}
                              className={`block w-full text-left px-3 py-1.5 rounded transition-colors ${
                                isDarkMode
                                  ? 'text-blue-300 hover:bg-gray-800'
                                  : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              {getBookName(ref.b)} {ref.c}:{ref.v}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Modified to handle right pane translation */}
                    {!strongsConcordance && (rightPaneBibleData || nltPsalmsData) && selectedBook && (
                      (() => {
                        // Use pane2Book/pane2Chapter if set (cross-ref navigation), else follow pane 1
                        let bookAbbrev = pane2Book ? pane2Book.abbrev : selectedBook.abbrev;
                        if (!pane2Book && selectedTranslation.includes('he_heb')) {
                          bookAbbrev = getKjvBookAbbrev(bookAbbrev);
                        }
                        const effectiveChapter = pane2Chapter || selectedChapter;

                        // Use NLT Psalms if active and on Psalms
                        let resolvedVerses = null;
                        if (nltPsalmsData && bookAbbrev === 'ps') {
                          const nltBook = nltPsalmsData.find(b => b.abbrev === 'ps');
                          if (nltBook && nltBook.chapters[effectiveChapter - 1]) {
                            resolvedVerses = nltBook.chapters[effectiveChapter - 1];
                          }
                        }
                        if (!resolvedVerses) {
                          const rightPaneBook = rightPaneBibleData && rightPaneBibleData.find(b => b.abbrev === bookAbbrev);
                          if (rightPaneBook && rightPaneBook.chapters[effectiveChapter - 1]) {
                            resolvedVerses = rightPaneBook.chapters[effectiveChapter - 1];
                          }
                        }
                        if (resolvedVerses) {
                          return resolvedVerses
                            .map((verse, originalIndex) => ({ verse, verseNumber: originalIndex + 1 }))
                            .filter(({ verseNumber }) => {
                              // If filtering is disabled, show all verses
                              if (!showFilteredVersesOnly || !verseFilterData) return true;

                              // Check if we have filter data for current chapter
                              const currentChapterFilter = verseFilterData.chapters[effectiveChapter];

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
                                  <span className="flex-1">{selectedTranslation === 'he_heb_strong.json' ? renderWithStrongs(verse, showGlosses) : renderWithGlosses(showPane2Syllables ? syllabifyText(verse) : verse, showGlosses)}</span>
                                </p>
                              </div>
                            );
                          });
                        } else {
                          return (
                            <div className="p-4 text-amber-600">
                              <p>Could not find matching {getTranslationShortName(rightPaneTranslation)} text for this book/chapter.</p>
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
                  <div id="pane2-bottom-buttons" className="mt-10 flex justify-between pb-4">
                    <button
                      onClick={handleStorytimeButtonClick}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                    >
                      Story
                    </button>

                    {/* Home button — scroll both panes to top */}
                    <button
                      onClick={() => { if (kjvContentRef.current) kjvContentRef.current.scrollTop = 0; if (chapterContentRef.current) chapterContentRef.current.scrollTop = 0; }}
                      className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                    >
                      Home (esc)
                    </button>

                    {(() => {
                      const p2Book = pane2Book || selectedBook;
                      const p2Chapter = pane2Chapter || selectedChapter;
                      if (!p2Book || p2Chapter >= p2Book.chapters.length) return null;
                      return (
                        <button
                          onClick={() => {
                            const nextChapter = p2Chapter + 1;
                            localStorage.removeItem('mobileScrollPosition');
                            setMobileScrollPosition(0);
                            // Sync both panes to pane 2's next chapter
                            setSelectedBook(p2Book);
                            setSelectedChapter(nextChapter);
                            setPane2Book(null);
                            setPane2Chapter(null);
                            setPrimaryReading({ book: p2Book, chapter: nextChapter });
                            setIsViewingCrossRef(false);
                            setTimeout(() => { handleHomeReset(); }, 100);
                          }}
                          className="bg-white bg-opacity-80 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded px-8 py-4 shadow text-xl"
                        >
                          Next Chapter (m,;e) &gt;
                        </button>
                      );
                    })()}

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
                  <div className="text-center text-gray-400 text-xs pb-2">-/+ pageup/down</div>
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
          <div className={`${isMobileView || isTabletView ? 'w-24' : 'w-64'} ${isDarkMode ? 'bg-gray-800 text-white border-l border-gray-700' : 'bg-white border-l border-gray-200'} overflow-y-auto flex flex-col`}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 6 }}>
                  {verses.map((_, idx) => {
                    const vNum = idx + 1;
                    const isCantonese = sidebarLang === 'cant';
                    const isSpeaking = speakingVerseNumber && speakingVerseNumber.verse === vNum &&
                      speakingVerseNumber.lang === (isCantonese ? 'cantonese' : 'mandarin');
                    return (
                      <button
                        key={vNum}
                        onClick={() => speakVerseInGrid(vNum, isCantonese ? 'cantonese' : 'mandarin')}
                        style={{
                          width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
                          transition: 'all 0.15s',
                          border: isCantonese ? '2px solid' : 'none',
                          background: isSpeaking ? (isCantonese ? '#f59e0b' : '#3b82f6') : (isDarkMode ? '#3a3a3a' : '#f0f0f0'),
                          borderColor: isCantonese ? (isSpeaking ? '#f59e0b' : (isDarkMode ? '#6b5b3a' : '#e0c090')) : 'transparent',
                          color: isSpeaking ? 'white' : (isDarkMode ? '#d0d0d0' : '#333'),
                          boxShadow: isSpeaking ? `0 0 12px rgba(${isCantonese ? '245,158,11' : '59,130,246'},0.5)` : 'none'
                        }}
                      >
                        {vNum}
                      </button>
                    );
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
          <div className={`${isMobileView || isTabletView ? 'w-24' : 'w-64'} ${isDarkMode ? 'bg-gray-800 text-white border-l border-gray-700' : 'bg-white border-l border-gray-200'} overflow-y-auto flex flex-col`}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 6 }}>
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
          <div className={`${isMobileView || isTabletView ? 'w-24' : 'w-64'} ${isDarkMode ? 'bg-gray-800 text-white border-l border-gray-700' : 'bg-white border-l border-gray-200'} overflow-y-auto flex flex-col`}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 6 }}>
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
          <div className={`${isMobileView || isTabletView ? 'w-24' : 'w-64'} ${isDarkMode ? 'bg-gray-800 text-white border-l border-gray-700' : 'bg-white border-l border-gray-200'} overflow-y-auto flex flex-col`}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 6 }}>
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
        const refs = refPromptValue.split(/[,;]/).map(r => r.trim()).filter(r => r);
        const validRefs = refs.map(r => ({ raw: r, parsed: parseSingleBibleRef(r) })).filter(r => r.parsed);
        // Helper: add current chapter + valid refs from input to history (replaces existing same book+chapter)
        const addToHistory = () => {
          setRefHistory(prev => {
            // Collect keys that will be newly added so we can remove old duplicates
            const newKeys = new Set();
            const toAdd = [];
            // Add current chapter first
            if (selectedBook && selectedChapter) {
              const curKey = `${selectedBook.abbrev}_${selectedChapter}`;
              const curLabel = `${getBookName(selectedBook.abbrev)} ${selectedChapter}`;
              toAdd.push({ raw: curLabel, parsed: { abbrev: selectedBook.abbrev, chapter: selectedChapter } });
              newKeys.add(curKey);
            }
            // Then add typed refs
            for (const r of validRefs) {
              const key = `${r.parsed.abbrev}_${r.parsed.chapter}`;
              toAdd.push({ raw: r.raw, parsed: r.parsed });
              newKeys.add(key);
            }
            if (toAdd.length === 0) return prev;
            // Remove old entries that match the same book+chapter, then append new ones
            const filtered = prev.filter(h => !newKeys.has(`${h.parsed.abbrev}_${h.parsed.chapter}`));
            return [...filtered, ...toAdd];
          });
        };
        return (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRefPrompt(false); }}
        >
          <div style={{ background: isDarkMode ? '#2a2a2a' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 450, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1em', color: isDarkMode ? '#e0e0e0' : '#333', textAlign: 'center' }}>Go to Reference</h3>
            {/* Persistent history buttons above input */}
            {refHistory.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: isDarkMode ? '#999' : '#888', fontWeight: 600 }}>History</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => {
                        if (!bibleData) return;
                        const lines = [];
                        for (const h of refHistory) {
                          const verseMatch = h.raw.match(/:(\d+)(?:\s*[-–]\s*(\d+))?/);
                          if (!verseMatch) continue;
                          const parsed = parseSingleBibleRef(h.raw);
                          if (!parsed) continue;
                          const book = bibleData.find(b => b.abbrev === parsed.abbrev);
                          if (!book || !book.chapters) continue;
                          const ch = book.chapters[parsed.chapter - 1];
                          if (!ch) continue;
                          const fullBookName = getBookName(parsed.abbrev);
                          const start = parseInt(verseMatch[1]);
                          const end = verseMatch[2] ? parseInt(verseMatch[2]) : start;
                          for (let v = start; v <= end; v++) {
                            if (ch[v - 1]) lines.push(`${fullBookName} ${parsed.chapter}:${v} — ${ch[v - 1]}`);
                          }
                        }
                        if (lines.length > 0) {
                          const addition = lines.join('\n');
                          setRefNotes(prev => {
                            const updated = prev ? prev + '\n' + addition : addition;
                            localStorage.setItem('bibleRefNotes', updated);
                            return updated;
                          });
                        }
                      }}
                      style={{ fontSize: 11, color: isDarkMode ? '#86efac' : '#16a34a', background: isDarkMode ? '#1a2e1a' : '#f0fff0', border: `1px solid ${isDarkMode ? '#166534' : '#bbf7d0'}`, borderRadius: 4, cursor: 'pointer', fontWeight: 600, padding: '3px 10px' }}
                    >
                      Print
                    </button>
                    <button
                      onClick={() => { setRefHistory([]); localStorage.removeItem('bibleRefHistory'); }}
                      style={{ fontSize: 11, color: isDarkMode ? '#f87171' : '#dc2626', background: isDarkMode ? '#3b1c1c' : '#fef2f2', border: `1px solid ${isDarkMode ? '#7f1d1d' : '#fecaca'}`, borderRadius: 4, cursor: 'pointer', fontWeight: 600, padding: '3px 10px' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {refHistory.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => { navigateToRefWithHighlight(h.raw); setShowRefPrompt(false); }}
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
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowRefPrompt(false);
                  return;
                }
                if (e.key === 'Enter' && refPromptValue.trim()) {
                  const trimmed = refPromptValue.trim();
                  if (/^\d+$/.test(trimmed) && selectedBook) {
                    const ch = parseInt(trimmed);
                    if (ch >= 1 && ch <= selectedBook.chapters.length) {
                      handleChapterSelect(ch, true);
                      setShowRefPrompt(false);
                      setRefPromptValue('');
                      return;
                    }
                  }
                  addToHistory();
                  setRefPromptValue('');
                }
              }}
              placeholder="Ps 23; Matt 11:28, Rom 8:28"
              autoFocus
              style={{
                width: '100%', padding: '8px 10px', fontSize: '14px', border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                borderRadius: 6, background: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#e0e0e0' : '#333',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => {
                  if (refPromptValue.trim()) {
                    const trimmed = refPromptValue.trim();
                    if (/^\d+$/.test(trimmed) && selectedBook) {
                      const ch = parseInt(trimmed);
                      if (ch >= 1 && ch <= selectedBook.chapters.length) {
                        handleChapterSelect(ch, true);
                        setShowRefPrompt(false);
                        setRefPromptValue('');
                        return;
                      }
                    }
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

            {/* Text Paste Area */}
            <div style={{ marginTop: 10, borderTop: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}`, paddingTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: isDarkMode ? '#999' : '#888', fontWeight: 600 }}>Paste paragraphs</span>
                {textPasteContent && (
                  <button
                    onClick={() => { setTextPasteContent(''); setTextParsedRefs([]); }}
                    style={{ fontSize: 11, color: isDarkMode ? '#f87171' : '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: isDarkMode ? '#666' : '#aaa', fontStyle: 'italic', lineHeight: 1.4 }}>
                    Regex:
                  </span>
                  <select
                    value={refRegexMode}
                    onChange={(e) => { setRefRegexMode(e.target.value); localStorage.setItem('bibleRefRegexMode', e.target.value); }}
                    style={{
                      fontSize: 11, padding: '2px 4px', borderRadius: 4,
                      border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                      background: isDarkMode ? '#333' : '#fff',
                      color: isDarkMode ? '#e0e0e0' : '#333',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="standard">Standard</option>
                    <option value="parenthesized">Parenthesized (Luke 13:24)</option>
                  </select>
                </div>
                {textPasteContent && (
                  <button
                    onClick={() => {
                      if (!textPasteContent) return;
                      const bookNames = '(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs?|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation|Gen|Exo?d?|Lev|Num|Deut?|Josh?|Judg|Sam|Kgs|Chr|Neh|Est|Ps|Psa|Prov?|Eccl?|Song|Isa|Jer|Lam|Ezek?|Dan|Hos|Oba?|Jon|Mic|Nah|Hab|Zeph?|Hag|Zech?|Mal|Matt?|Mrk|Mk|Luk?|Lk|Joh?|Jn|Rom|Cor|Gal|Eph|Phil?|Php|Col|Thess|Tim|Tit|Phlm|Phm|Heb|Jas|Jam|Pet|Re|Rev)';
                      const singleRefRegex = new RegExp('\\b(\\d?\\s*' + bookNames + ')\\s+(\\d+)(?::(\\d+)(?:\\s*[-–]\\s*(\\d+))?)?', 'gi');
                      const found = [];
                      const seen = new Set();
                      if (refRegexMode === 'parenthesized') {
                        // Find all parenthesized groups, then split by semicolons to get each ref
                        const parenRegex = /\(([^)]+)\)/g;
                        let pm;
                        while ((pm = parenRegex.exec(textPasteContent)) !== null) {
                          const inner = pm[1];
                          const parts = inner.split(';');
                          for (const part of parts) {
                            const trimmed = part.replace(/\*\*/g, '').trim();
                            if (!trimmed) continue;
                            singleRefRegex.lastIndex = 0;
                            const rm = singleRefRegex.exec(trimmed);
                            if (rm) {
                              const refStr = rm[0].trim();
                              const parsed = parseSingleBibleRef(refStr);
                              if (parsed && !seen.has(refStr)) {
                                seen.add(refStr);
                                found.push({ raw: refStr, parsed });
                              }
                            }
                          }
                        }
                      } else {
                        // Standard: word-boundary match across entire text
                        let m;
                        while ((m = singleRefRegex.exec(textPasteContent)) !== null) {
                          const refStr = m[0].replace(/\*\*/g, '').trim();
                          const parsed = parseSingleBibleRef(refStr);
                          if (parsed && !seen.has(refStr)) {
                            seen.add(refStr);
                            found.push({ raw: refStr, parsed });
                          }
                        }
                      }
                      if (found.length > 0) {
                        setRefHistory(prev => {
                          const existingKeys = new Set(prev.map(h => `${h.parsed.abbrev}_${h.parsed.chapter}`));
                          const newItems = found.filter(f => !existingKeys.has(`${f.parsed.abbrev}_${f.parsed.chapter}`));
                          return [...prev, ...newItems];
                        });
                      }
                    }}
                    style={{ fontSize: 11, color: isDarkMode ? '#86efac' : '#16a34a', background: isDarkMode ? '#1a2e1a' : '#f0fff0', border: `1px solid ${isDarkMode ? '#166534' : '#bbf7d0'}`, borderRadius: 4, cursor: 'pointer', fontWeight: 600, padding: '3px 10px', whiteSpace: 'nowrap' }}
                  >
                    Find Verses
                  </button>
                )}
              </div>
              <textarea
                value={textPasteContent}
                onChange={(e) => {
                  const val = e.target.value;
                  setTextPasteContent(val);
                  // Parse quoted verse references
                  const refs = parseDropboxVerseFile(val);
                  setTextParsedRefs(refs);
                }}
                placeholder={'Paste text with refs e.g. "...make every effort (Romans 14:19; 1 Timothy 6:11)..."'}
                style={{
                  width: '100%', minHeight: 120, padding: 10, fontSize: 13, border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                  borderRadius: 6, background: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#e0e0e0' : '#333',
                  boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4
                }}
              />
              {textParsedRefs.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {textParsedRefs.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { navigateToRefWithHighlight(item.ref); setShowRefPrompt(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '8px 12px', fontSize: 13,
                        border: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}`, borderRadius: 6,
                        background: isDarkMode ? '#333' : '#fafbff', cursor: 'pointer',
                        textAlign: 'left', color: isDarkMode ? '#e0e0e0' : '#333',
                        transition: 'background 0.15s'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#667eea' }}>{item.ref}</span>
                      {item.description && (
                        <span style={{ display: 'block', fontSize: 11, color: isDarkMode ? '#aaa' : '#888', marginTop: 2 }}>
                          {item.description.length > 100 ? item.description.slice(0, 100) + '...' : item.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Personal Notes Area */}
            <div style={{ marginTop: 16, borderTop: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}`, paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: isDarkMode ? '#999' : '#888', fontWeight: 600 }}>Notes</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {refNotes && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(refNotes); }}
                      style={{ fontSize: 11, color: isDarkMode ? '#93c5fd' : '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 6px', marginBottom: 4 }}
                    >
                      Copy
                    </button>
                  )}
                  {refNotes && (
                    <button
                      onClick={() => { setRefNotes(''); localStorage.removeItem('bibleRefNotes'); }}
                      style={{ fontSize: 11, color: isDarkMode ? '#f87171' : '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 6px', marginBottom: 4 }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={refNotes}
                onChange={(e) => {
                  setRefNotes(e.target.value);
                  localStorage.setItem('bibleRefNotes', e.target.value);
                }}
                placeholder="Your study notes, thoughts, observations..."
                style={{
                  width: '100%', minHeight: 100, padding: 10, fontSize: 13,
                  border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
                  borderRadius: 8, background: isDarkMode ? '#1e1e2e' : '#fafbff',
                  color: isDarkMode ? '#e0e0e0' : '#333',
                  boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6
                }}
              />
            </div>
          </div>
        </div>
        );
      })()}

      {/* Feature Toggle Modal */}
      {showFeatureToggleModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowFeatureToggleModal(false); }}
        >
          <div style={{ background: isDarkMode ? '#2a2a3a' : 'white', borderRadius: 12, padding: 24, maxWidth: 400, width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.2em', color: isDarkMode ? '#e0e0e0' : '#333' }}>Toggle Buttons</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    const allOn = Object.fromEntries(allFeatureKeys.map(k => [k, true]));
                    setVisibleFeatures(allOn);
                    localStorage.setItem('bible-visible-features', JSON.stringify(allOn));
                  }}
                  style={{ padding: '4px 12px', fontSize: 12, background: '#4ade80', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  All On
                </button>
                <button
                  onClick={() => {
                    const allOff = Object.fromEntries(allFeatureKeys.map(k => [k, false]));
                    setVisibleFeatures(allOff);
                    localStorage.setItem('bible-visible-features', JSON.stringify(allOff));
                  }}
                  style={{ padding: '4px 12px', fontSize: 12, background: '#f87171', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  All Off
                </button>
                <button onClick={() => setShowFeatureToggleModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: isDarkMode ? '#aaa' : '#666' }}>X</button>
              </div>
            </div>
            {/* Navbar buttons section */}
            <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDarkMode ? '#8899bb' : '#667eea', paddingLeft: 4 }}>Navbar</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              {allFeatureKeys.filter(k => !['qa','quiz','words','recite','cursive','breathe','goTextR','oaiKey','oaiRead','kjvRead','ttsChpCopy'].includes(k)).map(key => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: visibleFeatures[key] !== false ? (isDarkMode ? '#3a3a5a' : '#f0f7ff') : (isDarkMode ? '#1a1a2a' : '#f5f5f5'), border: `1px solid ${visibleFeatures[key] !== false ? '#667eea' : (isDarkMode ? '#444' : '#ddd')}` }}>
                  <input
                    type="checkbox"
                    checked={visibleFeatures[key] !== false}
                    onChange={() => toggleFeature(key)}
                    style={{ accentColor: '#667eea' }}
                  />
                  <span style={{ fontSize: 13, color: isDarkMode ? '#e0e0e0' : '#333' }}>{featureLabels[key] || key}</span>
                </label>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: `2px solid ${isDarkMode ? '#555' : '#ddd'}`, marginBottom: 12 }} />

            {/* TTS / Study buttons section */}
            <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDarkMode ? '#bb8899' : '#e06688', paddingLeft: 4 }}>TTS / Study Tools</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {['qa','quiz','words','recite','cursive','breathe','goTextR','oaiKey','oaiRead','kjvRead','ttsChpCopy'].map(key => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: visibleFeatures[key] !== false ? (isDarkMode ? '#4a3a3a' : '#fff0f5') : (isDarkMode ? '#1a1a2a' : '#f5f5f5'), border: `1px solid ${visibleFeatures[key] !== false ? '#e06688' : (isDarkMode ? '#444' : '#ddd')}` }}>
                  <input
                    type="checkbox"
                    checked={visibleFeatures[key] !== false}
                    onChange={() => toggleFeature(key)}
                    style={{ accentColor: '#e06688' }}
                  />
                  <span style={{ fontSize: 13, color: isDarkMode ? '#e0e0e0' : '#333' }}>{featureLabels[key] || key}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

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
                        const isPreviewOpen = collectionVersePreview && collectionVersePreview.collection === name && collectionVersePreview.ref === ref;
                        return (
                          <div key={i}>
                            <button
                              onClick={() => {
                                if (isPreviewOpen) {
                                  setCollectionVersePreview(null);
                                } else {
                                  const text = getVerseTextForRef(ref);
                                  setCollectionVersePreview({ ref, text: text || '(verse not found in current translation)', collection: name });
                                  setLastCollectionClick({ collection: name, ref });
                                }
                              }}
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
                            {isPreviewOpen && (
                              <div style={{ padding: '8px 18px 12px' }}>
                                <div style={{
                                  fontSize: 14, lineHeight: 1.7, color: isDarkMode ? '#d0d0d0' : '#333',
                                  fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic',
                                  padding: '12px 14px', borderRadius: 8,
                                  background: isDarkMode ? '#2a2a3a' : '#f8f7ff',
                                  border: `1px solid ${isDarkMode ? '#3a3a5a' : '#e0e0f0'}`,
                                  marginBottom: 8
                                }}>
                                  {collectionVersePreview.text}
                                </div>
                                <button
                                  onClick={() => {
                                    navigateToRefWithHighlight(ref);
                                    setCollectionVersePreview(null);
                                    setShowCollectionModal(false);
                                  }}
                                  style={{
                                    width: '100%', padding: '8px 16px', fontSize: 13, border: 'none', borderRadius: 8,
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white',
                                    cursor: 'pointer', fontWeight: 700
                                  }}
                                >
                                  Go to {ref}
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* Dropbox Highlights Modal */}
      {showDropboxModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDropboxModal(false); }}
        >
          <div style={{ background: isDarkMode ? '#2a2a2a' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative' }}>
            <button
              onClick={() => setShowDropboxModal(false)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1, color: isDarkMode ? '#aaa' : '#666', fontSize: 20 }}
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2em', color: isDarkMode ? '#e0e0e0' : '#333', textAlign: 'center' }}>
              Dropbox Highlights
            </h3>
            {dropboxStatus && (
              <div style={{ fontSize: 12, color: isDarkMode ? '#aaa' : '#888', textAlign: 'center', marginBottom: 8 }}>{dropboxStatus}</div>
            )}

            {!dropboxAccessToken ? (
              <button
                onClick={handleDropboxSignIn}
                style={{ padding: '12px 24px', fontSize: 15, border: 'none', borderRadius: 8, background: '#0061fe', color: 'white', cursor: 'pointer', fontWeight: 600, width: '100%' }}
              >
                Sign In to Dropbox
              </button>
            ) : dropboxView === 'content' ? (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <button
                  onClick={() => { setDropboxView('files'); setDropboxRefs([]); }}
                  style={{ marginBottom: 12, padding: '6px 14px', fontSize: 13, border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`, borderRadius: 6, background: isDarkMode ? '#333' : '#f5f5f5', color: isDarkMode ? '#ddd' : '#333', cursor: 'pointer' }}
                >
                  Back to Files
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dropboxRefs.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { navigateToRefWithHighlight(item.ref); setShowDropboxModal(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '10px 14px', fontSize: 14,
                        border: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}`, borderRadius: 8,
                        background: isDarkMode ? '#333' : '#fafbff', cursor: 'pointer',
                        textAlign: 'left', color: isDarkMode ? '#e0e0e0' : '#333',
                        transition: 'background 0.15s'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#667eea' }}>{item.ref}</span>
                      {item.description && (
                        <span style={{ display: 'block', fontSize: 12, color: isDarkMode ? '#aaa' : '#888', marginTop: 4 }}>
                          {item.description.length > 120 ? item.description.slice(0, 120) + '...' : item.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto' }}>
                {dropboxFolderPath && (
                  <button
                    onClick={() => {
                      const parent = dropboxFolderPath.substring(0, dropboxFolderPath.lastIndexOf('/')) || '';
                      loadDropboxFolder(parent);
                    }}
                    style={{ marginBottom: 8, padding: '6px 14px', fontSize: 13, border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`, borderRadius: 6, background: isDarkMode ? '#333' : '#f5f5f5', color: isDarkMode ? '#ddd' : '#333', cursor: 'pointer' }}
                  >
                    .. (Up)
                  </button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dropboxFiles.map((file, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (file.isFolder) {
                          loadDropboxFolder(file.path);
                        } else {
                          loadDropboxFile(file.path);
                        }
                      }}
                      style={{
                        display: 'block', width: '100%', padding: '10px 14px', fontSize: 14,
                        border: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}`, borderRadius: 8,
                        background: isDarkMode ? '#333' : 'white', cursor: 'pointer',
                        textAlign: 'left', color: isDarkMode ? '#e0e0e0' : '#333',
                        transition: 'background 0.15s'
                      }}
                    >
                      {file.isFolder ? '📁 ' : '📄 '}{file.name}
                    </button>
                  ))}
                  {dropboxFiles.length === 0 && (
                    <div style={{ textAlign: 'center', color: isDarkMode ? '#888' : '#999', padding: 20, fontSize: 14 }}>
                      No files found. Click above to browse.
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowDropboxModal(false)}
              style={{ marginTop: 16, width: '100%', padding: 12, fontSize: 15, border: 'none', borderRadius: 8, background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fill-in-the-Blank Quiz Modal */}
      {showQuizModal && fitbData && selectedBook && (() => {
        const bookName = selectedBook.book || getBookName(selectedBook.abbrev);
        const fitbBook = fitbData.find(b => b.abbrev === selectedBook.abbrev);
        const fitbChapter = fitbBook && fitbBook.chapters[selectedChapter - 1];
        if (!fitbChapter) return (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowQuizModal(false); }}>
            <div style={{ background: isDarkMode ? '#2a2a2a' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 600, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <p style={{ color: isDarkMode ? '#e0e0e0' : '#333', textAlign: 'center' }}>No quiz data for {bookName} {selectedChapter}</p>
              <button onClick={() => setShowQuizModal(false)} style={{ marginTop: 12, width: '100%', padding: 10, fontSize: 14, border: 'none', borderRadius: 8, background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333', cursor: 'pointer', fontWeight: 600 }}>Close</button>
            </div>
          </div>
        );
        const { verses, answers } = fitbChapter;
        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowQuizModal(false); }}
          >
            <div style={{ background: isDarkMode ? '#2a2a2a' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 700, height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px', flexShrink: 0 }}>
                <button
                  onClick={() => setQuizFontSize(prev => Math.max(10, prev - 2))}
                  style={{ width: 32, height: 32, fontSize: 18, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333' }}
                  title="Decrease font size"
                >−</button>
                <h3 style={{ margin: 0, fontSize: '1.1em', color: isDarkMode ? '#e0e0e0' : '#333', textAlign: 'center' }}>
                  {bookName} {selectedChapter} — Fill in the Blanks
                </h3>
                <button
                  onClick={() => setQuizFontSize(prev => Math.min(28, prev + 2))}
                  style={{ width: 32, height: 32, fontSize: 18, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333' }}
                  title="Increase font size"
                >+</button>
              </div>

              {/* Blanked verses - click blanks to reveal answers */}
              <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}`, borderRadius: 8, padding: 12, marginBottom: 12, background: isDarkMode ? '#1e1e1e' : '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button
                    onClick={() => {
                      const totalBlanks = verses.reduce((count, v) => count + (v.match(/________/g) || []).length, 0);
                      const allRevealed = Object.keys(fitbRevealed).length === totalBlanks && Object.values(fitbRevealed).every(v => v);
                      if (allRevealed) {
                        setFitbRevealed({});
                      } else {
                        const all = {};
                        let blankIdx = 0;
                        verses.forEach((v) => {
                          const blanks = v.match(/________/g) || [];
                          blanks.forEach(() => { all[blankIdx] = true; blankIdx++; });
                        });
                        setFitbRevealed(all);
                      }
                    }}
                    style={{ fontSize: 12, padding: '3px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, background: isDarkMode ? '#166534' : '#bbf7d0', color: isDarkMode ? '#bbf7d0' : '#166534' }}
                  >
                    {(() => { const totalBlanks = verses.reduce((count, v) => count + (v.match(/________/g) || []).length, 0); return Object.keys(fitbRevealed).length === totalBlanks && Object.values(fitbRevealed).every(v => v) ? 'Hide All' : 'Reveal All'; })()}
                  </button>
                </div>
                {(() => {
                  let globalBlankIdx = 0;
                  return verses.map((v, i) => (
                    <p key={i} style={{ margin: '0 0 8px', fontSize: quizFontSize, lineHeight: 1.6, color: isDarkMode ? '#d0d0d0' : '#333' }}>
                      <span style={{ fontWeight: 700, color: isDarkMode ? '#f9a8d4' : '#be185d', marginRight: 6, fontSize: quizFontSize - 2 }}>{i + 1}</span>
                      {v.split(/(________)/g).map((part, j) => {
                        if (part === '________') {
                          const bIdx = globalBlankIdx++;
                          const isRevealed = fitbRevealed[bIdx];
                          const answerWord = answers.flat()[bIdx] || '';
                          return (
                            <span
                              key={j}
                              onClick={() => {
                                setFitbRevealed(prev => {
                                  if (prev[bIdx]) return { ...prev, [bIdx]: false };
                                  setTimeout(() => setFitbRevealed(p => ({ ...p, [bIdx]: false })), 1500);
                                  return { ...prev, [bIdx]: true };
                                });
                              }}
                              style={{
                                display: 'inline-block',
                                borderBottom: `2px solid ${isDarkMode ? '#f9a8d4' : '#be185d'}`,
                                minWidth: 60,
                                textAlign: 'center',
                                margin: '0 2px',
                                padding: '0 4px',
                                cursor: 'pointer',
                                color: isRevealed ? (isDarkMode ? '#86efac' : '#166534') : 'transparent',
                                fontWeight: isRevealed ? 600 : 400,
                                userSelect: isRevealed ? 'auto' : 'none',
                                transition: 'color 0.2s',
                                background: isRevealed ? (isDarkMode ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.05)') : 'transparent',
                                borderRadius: 3,
                              }}
                            >
                              {answerWord || '________'}
                            </span>
                          );
                        }
                        return <span key={j}>{part}</span>;
                      })}
                    </p>
                  ));
                })()}
              </div>

              <button
                onClick={() => setShowQuizModal(false)}
                style={{ marginTop: 12, width: '100%', padding: 10, fontSize: 14, border: 'none', borderRadius: 8, background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {/* Buckets Modal */}
      {showBucketsModal && (() => {
        const LINES_PER_BUCKET = 4;
        // Get pane 2 verses
        const p2Book = pane2Book || selectedBook;
        const p2Chapter = pane2Chapter || selectedChapter;
        const p2BookName = p2Book ? (p2Book.book || getBookName(p2Book.abbrev)) : '';
        let p2Verses = [];
        if (nltPsalmsData && p2Book && p2Book.abbrev === 'ps') {
          const nltBook = nltPsalmsData.find(b => b.abbrev === 'ps');
          if (nltBook && nltBook.chapters[p2Chapter - 1]) p2Verses = nltBook.chapters[p2Chapter - 1];
        }
        if (!p2Verses.length && rightPaneBibleData && p2Book) {
          const rpBook = rightPaneBibleData.find(b => b.abbrev === p2Book.abbrev);
          if (rpBook && rpBook.chapters[p2Chapter - 1]) {
            p2Verses = rpBook.chapters[p2Chapter - 1];
          }
        }
        if (!p2Verses.length && bibleData && p2Book) {
          const bk = bibleData.find(b => b.abbrev === p2Book.abbrev);
          if (bk && bk.chapters[p2Chapter - 1]) {
            p2Verses = bk.chapters[p2Chapter - 1];
          }
        }
        // Build buckets
        const buckets = [];
        for (let i = 0; i < p2Verses.length; i += LINES_PER_BUCKET) {
          buckets.push(p2Verses.slice(i, i + LINES_PER_BUCKET));
        }
        const clampedBucketIndex = Math.min(bucketIndex, buckets.length - 1);
        if (clampedBucketIndex !== bucketIndex) setBucketIndex(clampedBucketIndex);
        const currentBucket = buckets[clampedBucketIndex] || [];
        const maxHalfLines = currentBucket.length * 2;

        const splitLineInHalf = (text) => {
          const mid = Math.ceil(text.length / 2);
          let splitPoint = mid;
          for (let i = mid; i < text.length && i < mid + 20; i++) {
            if (text[i] === ' ') { splitPoint = i; break; }
          }
          return [text.substring(0, splitPoint).trim(), text.substring(splitPoint).trim()];
        };

        // Build display
        let halfLinesShown = 0;
        const displayLines = [];
        for (let i = 0; i < currentBucket.length && halfLinesShown < bucketSlider; i++) {
          const verse = currentBucket[i];
          const verseNum = clampedBucketIndex * LINES_PER_BUCKET + i + 1;
          const text = typeof verse === 'string' ? verse : (verse.text || verse.verse || String(verse));
          const [firstHalf, secondHalf] = splitLineInHalf(text);
          const parts = [];
          if (halfLinesShown < bucketSlider) {
            parts.push(firstHalf);
            halfLinesShown++;
          }
          if (halfLinesShown < bucketSlider && secondHalf) {
            parts.push(' ' + secondHalf);
            halfLinesShown++;
          }
          displayLines.push({ verseNum, text: parts.join('') });
        }

        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowBucketsModal(false); }}
          >
            <div style={{ background: isDarkMode ? '#2a2a2a' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 700, height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              {/* Header with slider nav and font controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setBucketSlider(prev => Math.max(0, prev - 1))}
                    style={{ width: 32, height: 32, fontSize: 18, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333' }}
                    title="Reveal less"
                  >◀</button>
                  <button
                    onClick={() => setBucketSlider(prev => Math.min(maxHalfLines, prev + 1))}
                    style={{ width: 32, height: 32, fontSize: 18, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333' }}
                    title="Reveal more"
                  >▶</button>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1em', color: isDarkMode ? '#e0e0e0' : '#333', textAlign: 'center' }}>
                  {p2BookName} {p2Chapter} — Buckets
                </h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setBucketFontSize(prev => Math.max(10, prev - 2))}
                    style={{ width: 32, height: 32, fontSize: 18, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333' }}
                    title="Decrease font size"
                  >−</button>
                  <button
                    onClick={() => setBucketFontSize(prev => Math.min(28, prev + 2))}
                    style={{ width: 32, height: 32, fontSize: 18, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333' }}
                    title="Increase font size"
                  >+</button>
                </div>
              </div>

              {/* Bucket selector */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
                <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#aaa' : '#666', fontWeight: 600, fontSize: 12 }}>Bucket:</label>
                    <select
                      value={bucketIndex}
                      onChange={(e) => { setBucketIndex(parseInt(e.target.value)); setBucketSlider(1); }}
                      style={{ width: '100%', padding: 8, border: `2px solid ${isDarkMode ? '#444' : '#e0e0e0'}`, borderRadius: 8, fontSize: 14, background: isDarkMode ? '#1e1e1e' : 'white', color: isDarkMode ? '#e0e0e0' : '#333', cursor: 'pointer' }}
                    >
                      {buckets.map((bucket, idx) => {
                        const firstV = idx * LINES_PER_BUCKET + 1;
                        const lastV = idx * LINES_PER_BUCKET + bucket.length;
                        return <option key={idx} value={idx}>Bucket {idx + 1}: Verses {firstV}–{lastV}</option>;
                      })}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const lines = currentBucket.map((verse, i) => {
                        const verseNum = clampedBucketIndex * LINES_PER_BUCKET + i + 1;
                        const text = typeof verse === 'string' ? verse : (verse.text || verse.verse || String(verse));
                        return `${verseNum} ${text}`;
                      });
                      navigator.clipboard.writeText(lines.join('\n'));
                    }}
                    style={{ height: 38, padding: '0 10px', fontSize: 16, border: 'none', borderRadius: 8, cursor: 'pointer', background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333', whiteSpace: 'nowrap' }}
                    title="Copy bucket verses to clipboard"
                  >📋</button>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: 4, color: isDarkMode ? '#aaa' : '#666', fontWeight: 600, fontSize: 12 }}>
                    Progress: {bucketSlider === 0 ? 'Hidden' : `${Math.floor(bucketSlider / 2)}${bucketSlider % 2 === 1 ? '.5' : ''} / ${currentBucket.length} lines`}
                  </label>
                  <input
                    key={clampedBucketIndex}
                    type="range"
                    min="0"
                    max={maxHalfLines}
                    step="1"
                    value={bucketSlider}
                    onChange={(e) => setBucketSlider(parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ marginBottom: 8, fontSize: 11, color: isDarkMode ? '#888' : '#999', textAlign: 'center' }}>
                Space = next bucket &nbsp;|&nbsp; Shift+Space = previous bucket
              </div>

              {/* Content display */}
              <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}`, borderRadius: 8, padding: 12, marginBottom: 12, background: isDarkMode ? '#1e1e1e' : '#fafafa' }}>
                {displayLines.map((line, i) => (
                  <p key={i} style={{ margin: '0 0 8px', fontSize: bucketFontSize, lineHeight: 1.8, color: isDarkMode ? '#d0d0d0' : '#333' }}>
                    <span style={{ display: 'inline-block', color: isDarkMode ? '#a78bfa' : '#667eea', fontWeight: 600, marginRight: 8 }}>{line.verseNum}</span>
                    {line.text}
                  </p>
                ))}
              </div>

              <button
                onClick={() => setShowBucketsModal(false)}
                style={{ width: '100%', padding: 10, fontSize: 14, border: 'none', borderRadius: 8, background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {/* Cursive Writing Modal */}
      {showCursiveModal && (() => {
        const LINES_PER_BUCKET = 4;
        const p2Book = pane2Book || selectedBook;
        const p2Chapter = pane2Chapter || selectedChapter;
        const p2BookName = p2Book ? (p2Book.book || getBookName(p2Book.abbrev)) : '';
        let p2Verses = [];
        if (nltPsalmsData && p2Book && p2Book.abbrev === 'ps') {
          const nltBook = nltPsalmsData.find(b => b.abbrev === 'ps');
          if (nltBook && nltBook.chapters[p2Chapter - 1]) p2Verses = nltBook.chapters[p2Chapter - 1];
        }
        if (!p2Verses.length && rightPaneBibleData && p2Book) {
          const rpBook = rightPaneBibleData.find(b => b.abbrev === p2Book.abbrev);
          if (rpBook && rpBook.chapters[p2Chapter - 1]) {
            p2Verses = rpBook.chapters[p2Chapter - 1];
          }
        }
        if (!p2Verses.length && bibleData && p2Book) {
          const bk = bibleData.find(b => b.abbrev === p2Book.abbrev);
          if (bk && bk.chapters[p2Chapter - 1]) {
            p2Verses = bk.chapters[p2Chapter - 1];
          }
        }
        const isClipboardMode = Array.isArray(cursiveClipboardBuckets) && cursiveClipboardBuckets.length > 0;
        let buckets = [];
        let bucketLabels = [];
        if (isClipboardMode) {
          buckets = cursiveClipboardBuckets;
          bucketLabels = buckets.map((t, idx) => {
            const preview = t.slice(0, 32).replace(/\s+/g, ' ').trim();
            return `${idx + 1}. ${preview}${t.length > 32 ? '…' : ''} (${t.length} ch)`;
          });
        } else {
          const verseBuckets = [];
          for (let i = 0; i < p2Verses.length; i += LINES_PER_BUCKET) {
            verseBuckets.push(p2Verses.slice(i, i + LINES_PER_BUCKET));
          }
          buckets = verseBuckets.map((bucket, idx) => bucket.map((verse, i) => {
            const verseNum = idx * LINES_PER_BUCKET + i + 1;
            const text = typeof verse === 'string' ? verse : (verse.text || verse.verse || String(verse));
            return `${verseNum}. ${text}`;
          }).join(' '));
          bucketLabels = verseBuckets.map((bucket, idx) => {
            const firstV = idx * LINES_PER_BUCKET + 1;
            const lastV = idx * LINES_PER_BUCKET + bucket.length;
            return `${idx + 1}. Verses ${firstV}–${lastV}`;
          });
        }
        const clampedIdx = Math.min(cursiveBucketIndex, Math.max(-1, buckets.length - 1));
        if (clampedIdx !== cursiveBucketIndex) setCursiveBucketIndex(clampedIdx);
        const bucketText = buckets[clampedIdx] || '';

        const fadeMs = [700, 500, 350, 220, 120][cursiveSpeed - 1];
        const delayMs = [600, 420, 280, 170, 90][cursiveSpeed - 1];

        const cleanMarkdown = (text) => {
          let t = text;
          t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');   // [text](url) → text
          t = t.replace(/^#{1,6}\s+/gm, '');                 // ## headings
          t = t.replace(/\*\*\*(.+?)\*\*\*/g, '$1');         // ***bold italic***
          t = t.replace(/\*\*(.+?)\*\*/g, '$1');              // **bold**
          t = t.replace(/__(.+?)__/g, '$1');                  // __bold__
          t = t.replace(/\*(.+?)\*/g, '$1');                  // *italic*
          t = t.replace(/_(.+?)_/g, '$1');                    // _italic_
          t = t.replace(/`([^`]+)`/g, '$1');                  // `inline code`
          t = t.replace(/^>\s?/gm, '');                       // > blockquotes
          t = t.replace(/^[-*]{3,}\s*$/gm, '');               // --- / *** hr
          t = t.replace(/^\|.*\|$/gm, '');                    // | table rows |
          t = t.replace(/^[-|:\s]+$/gm, '');                  // table separator lines
          t = t.replace(/^[-*+]\s+/gm, '');                   // - list items
          t = t.replace(/^\d+\.\s+/gm, '');                   // 1. ordered list items
          t = t.replace(/\n{3,}/g, '\n\n');                   // collapse blank lines
          return t.trim();
        };

        const doPaste = async () => {
          try {
            const raw = await navigator.clipboard.readText();
            const cleaned = cleanMarkdown(raw || '');
            const clean = cleaned.replace(/\s+/g, ' ').trim();
            if (!clean) { alert('Clipboard is empty.'); return; }

            let out;
            // Check for @-marker sections (e.g. @1, @2, @A sample draft)
            const hasAtMarkers = /(?:^|\n)\s*@\S/.test(cleaned);
            if (hasAtMarkers) {
              // Split on lines starting with @ — keep the @ prefix in each bucket
              out = cleaned.split(/\n(?=\s*@\S)/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
            } else {
              out = [];
              const MAX = 500;
              let i = 0;
              while (i < clean.length) {
                if (clean.length - i <= MAX) { out.push(clean.slice(i).trim()); break; }
                let end = i + MAX;
                const slice = clean.slice(i, end);
                const sentEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
                if (sentEnd > MAX / 2) {
                  end = i + sentEnd + 1;
                } else {
                  const sp = clean.lastIndexOf(' ', end);
                  if (sp > i + MAX / 2) end = sp;
                }
                out.push(clean.slice(i, end).trim());
                i = end;
              }
            }
            setCursiveClipboardBuckets(out);
            setCursiveBucketIndex(-1);
            if (window._cursiveTimer) { clearTimeout(window._cursiveTimer); window._cursiveTimer = null; }

            const outputText = document.querySelector('.cursive-output-text');
            const outputScroll = document.querySelector('.cursive-output-scroll');
            if (outputText) outputText.innerHTML = '';
            if (outputScroll) outputScroll.scrollTop = 0;
          } catch (err) {
            alert('Could not read clipboard: ' + (err?.message || err));
          }
        };

        const goToBucket = (newIdx) => {
          if (newIdx < -1 || newIdx >= buckets.length) return;
          setCursiveBucketIndex(newIdx);
          if (window._cursiveTimer) { clearTimeout(window._cursiveTimer); window._cursiveTimer = null; }
          const outputText = document.querySelector('.cursive-output-text');
          const outputScroll = document.querySelector('.cursive-output-scroll');
          if (outputText) outputText.innerHTML = '';
          if (outputScroll) outputScroll.scrollTop = 0;
          if (newIdx === -1) {
            // Show book & chapter title on the "0" landing page
            if (outputText) {
              outputText.innerHTML = `<span style="font-size:1.6em">${p2BookName} ${p2Chapter}</span>`;
            }
            return;
          }
          setTimeout(() => {
            const writeBtn = document.querySelector('.cursive-write-btn');
            if (writeBtn) writeBtn.click();
          }, 500);
        };
        cursiveGoToBucketRef.current = goToBucket;
        cursiveBucketIndexRef.current = clampedIdx;

        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCursiveModal(false); }}
          >
            <div
              style={{
                background: '#f5f0e8',
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #c9b99a 31px, #c9b99a 32px)',
                borderRadius: 12, padding: 24, width: '92%', maxWidth: 860, height: '88vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const newSource = 'pane2';
                    setCursiveSource(newSource); localStorage.setItem('cursive-source', newSource);
                    setCursiveClipboardBuckets(null);
                    setCursiveBucketIndex(-1);
                    if (window._cursiveTimer) { clearTimeout(window._cursiveTimer); window._cursiveTimer = null; }
                    const outputText = document.querySelector('.cursive-output-text');
                    const outputScroll = document.querySelector('.cursive-output-scroll');
                    if (outputText) outputText.innerHTML = '';
                    if (outputScroll) outputScroll.scrollTop = 0;
                  }}
                  data-cursive-source="pane2"
                  style={{ background: cursiveSource === 'pane2' ? '#8b4513' : 'transparent', color: cursiveSource === 'pane2' ? 'white' : '#8b4513', border: '1px solid #8b4513', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px', fontWeight: 'bold' }}
                >
                  Pane 2 [
                </button>
                <button
                  onClick={() => {
                    if (!storytimeData || !p2Book) return;
                    const bookName = abbrevToBookName[p2Book.abbrev] || p2Book.abbrev;
                    const key = `${bookName} ${p2Chapter}`;
                    const story = storytimeData[key];
                    if (!story) return; // no story available, stay on pane2
                    const newSource = 'story';
                    setCursiveSource(newSource); localStorage.setItem('cursive-source', newSource);
                    // Chunk story into buckets
                    let t = story;
                    t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
                    t = t.replace(/^#{1,6}\s+/gm, '');
                    t = t.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
                    t = t.replace(/\*\*(.+?)\*\*/g, '$1');
                    t = t.replace(/__(.+?)__/g, '$1');
                    t = t.replace(/\*(.+?)\*/g, '$1');
                    t = t.replace(/_(.+?)_/g, '$1');
                    t = t.replace(/`([^`]+)`/g, '$1');
                    t = t.replace(/^>\s?/gm, '');
                    t = t.replace(/^[-*]{3,}\s*$/gm, '');
                    t = t.replace(/^\|.*\|$/gm, '');
                    t = t.replace(/^[-|:\s]+$/gm, '');
                    t = t.replace(/^[-*+]\s+/gm, '');
                    t = t.replace(/^\d+\.\s+/gm, '');
                    t = t.replace(/\n{3,}/g, '\n\n');
                    const cleaned = t.trim();
                    const clean = cleaned.replace(/\s+/g, ' ').trim();
                    if (!clean) return;
                    let out;
                    const hasAtMarkers = /(?:^|\n)\s*@\S/.test(cleaned);
                    if (hasAtMarkers) {
                      out = cleaned.split(/\n(?=\s*@\S)/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
                    } else {
                      out = [];
                      const MAX = 500;
                      let i = 0;
                      while (i < clean.length) {
                        if (clean.length - i <= MAX) { out.push(clean.slice(i).trim()); break; }
                        let end = i + MAX;
                        const slice = clean.slice(i, end);
                        const sentEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
                        if (sentEnd > MAX / 2) { end = i + sentEnd + 1; } else {
                          const sp = clean.lastIndexOf(' ', end);
                          if (sp > i + MAX / 2) end = sp;
                        }
                        out.push(clean.slice(i, end).trim());
                        i = end;
                      }
                    }
                    setCursiveClipboardBuckets(out);
                    setCursiveBucketIndex(-1);
                    if (window._cursiveTimer) { clearTimeout(window._cursiveTimer); window._cursiveTimer = null; }
                    const outputText = document.querySelector('.cursive-output-text');
                    const outputScroll = document.querySelector('.cursive-output-scroll');
                    if (outputText) outputText.innerHTML = '';
                    if (outputScroll) outputScroll.scrollTop = 0;
                  }}
                  data-cursive-source="story"
                  style={{ background: cursiveSource === 'story' ? '#7c3aed' : 'transparent', color: cursiveSource === 'story' ? 'white' : '#7c3aed', border: '1px solid #7c3aed', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px', fontWeight: 'bold', opacity: (storytimeData && p2Book && storytimeData[`${abbrevToBookName[p2Book.abbrev] || p2Book.abbrev} ${p2Chapter}`]) ? 1 : 0.4 }}
                >
                  Story ]
                </button>
                <button
                  onClick={handleStorytimeAudioToggle}
                  style={{ background: isStorytimeAudioPlaying ? '#fee2e2' : '#dcfce7', color: isStorytimeAudioPlaying ? '#991b1b' : '#166534', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px', fontWeight: 'bold' }}
                  title={isStorytimeAudioPlaying ? 'Pause Story Time audio' : 'Play Story Time audio'}
                >
                  {isStorytimeAudioPlaying ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => {
                    const activeBook = p2Book;
                    const activeChapter = p2Chapter;
                    if (!activeBook) return;
                    const maxChapters = activeBook.chapters ? activeBook.chapters.length : 999;
                    let nextBook = activeBook;
                    let nextChap = activeChapter + 1;
                    if (nextChap > maxChapters) {
                      const idx = bibleData.findIndex(b => b.abbrev === activeBook.abbrev);
                      if (idx === -1 || idx >= bibleData.length - 1) return;
                      nextBook = bibleData[idx + 1];
                      nextChap = 1;
                    }
                    if (nextBook.abbrev !== activeBook.abbrev) setSelectedBook(nextBook);
                    handleChapterSelect(nextChap, true);
                    // If in story mode, reload story for new chapter
                    if (cursiveSource === 'story' && storytimeData) {
                      const bookName = abbrevToBookName[nextBook.abbrev] || nextBook.abbrev;
                      const key = `${bookName} ${nextChap}`;
                      const story = storytimeData[key];
                      if (story) {
                        let t2 = story;
                        t2 = t2.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
                        t2 = t2.replace(/^#{1,6}\s+/gm, '');
                        t2 = t2.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
                        t2 = t2.replace(/\*\*(.+?)\*\*/g, '$1');
                        t2 = t2.replace(/__(.+?)__/g, '$1');
                        t2 = t2.replace(/\*(.+?)\*/g, '$1');
                        t2 = t2.replace(/_(.+?)_/g, '$1');
                        t2 = t2.replace(/`([^`]+)`/g, '$1');
                        t2 = t2.replace(/^>\s?/gm, '');
                        t2 = t2.replace(/^[-*]{3,}\s*$/gm, '');
                        t2 = t2.replace(/^\|.*\|$/gm, '');
                        t2 = t2.replace(/^[-|:\s]+$/gm, '');
                        t2 = t2.replace(/^[-*+]\s+/gm, '');
                        t2 = t2.replace(/^\d+\.\s+/gm, '');
                        t2 = t2.replace(/\n{3,}/g, '\n\n');
                        const cleaned2 = t2.trim();
                        const clean2 = cleaned2.replace(/\s+/g, ' ').trim();
                        if (clean2) {
                          let out2;
                          const hasAt2 = /(?:^|\n)\s*@\S/.test(cleaned2);
                          if (hasAt2) {
                            out2 = cleaned2.split(/\n(?=\s*@\S)/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
                          } else {
                            out2 = [];
                            const MAX2 = 500;
                            let j = 0;
                            while (j < clean2.length) {
                              if (clean2.length - j <= MAX2) { out2.push(clean2.slice(j).trim()); break; }
                              let end2 = j + MAX2;
                              const slice2 = clean2.slice(j, end2);
                              const sentEnd2 = Math.max(slice2.lastIndexOf('. '), slice2.lastIndexOf('! '), slice2.lastIndexOf('? '));
                              if (sentEnd2 > MAX2 / 2) { end2 = j + sentEnd2 + 1; } else {
                                const sp2 = clean2.lastIndexOf(' ', end2);
                                if (sp2 > j + MAX2 / 2) end2 = sp2;
                              }
                              out2.push(clean2.slice(j, end2).trim());
                              j = end2;
                            }
                          }
                          setCursiveClipboardBuckets(out2);
                        }
                      } else {
                        // No story for next chapter, switch to pane2
                        setCursiveClipboardBuckets(null);
                        setCursiveSource('pane2'); localStorage.setItem('cursive-source', 'pane2');
                      }
                    } else {
                      setCursiveClipboardBuckets(null);
                    }
                    setCursiveBucketIndex(-1);
                    if (window._cursiveTimer) { clearTimeout(window._cursiveTimer); window._cursiveTimer = null; }
                    const outputText = document.querySelector('.cursive-output-text');
                    const outputScroll = document.querySelector('.cursive-output-scroll');
                    if (outputText) outputText.innerHTML = '';
                    if (outputScroll) outputScroll.scrollTop = 0;
                  }}
                  data-cursive-next="true"
                  style={{ background: '#8b4513', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem', color: 'white', padding: '2px 8px', fontWeight: 'bold' }}
                  title="Next chapter"
                >
                  Next . &gt;
                </button>
                <button
                  onClick={() => setShowCursiveModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: 24, color: '#8b4513', cursor: 'pointer', lineHeight: 1, marginLeft: 2 }}
                >&times;</button>
              </div>

              <h2 style={{ fontFamily: "'Alex Brush', cursive", fontSize: '2.2rem', color: '#8b4513', textAlign: 'center', margin: '0 0 2px', letterSpacing: '0.02em' }}>
                {isClipboardMode ? 'Clipboard' : `${p2BookName} ${p2Chapter}`} — Cursive
              </h2>
              <p style={{ fontSize: '0.82rem', fontStyle: 'italic', color: '#c8956c', letterSpacing: '0.12em', textAlign: 'center', margin: '0 0 12px' }}>
                animate your verses in ink
              </p>

              {/* Output area */}
              <div style={{ position: 'relative', flex: 1, marginBottom: 12, borderBottom: '1.5px solid #c9b99a', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(to bottom, #f5f0e8, transparent)', pointerEvents: 'none', zIndex: 2 }} />
                <div
                  className="cursive-output-scroll"
                  style={{ height: '100%', overflowY: 'auto', padding: '48px 1.2rem 1rem' }}
                >
                  <div
                    className="cursive-output-text"
                    style={{ fontFamily: "'Alex Brush', cursive", fontSize: cursiveSize, lineHeight: 1.25, color: '#1a1209', wordBreak: 'break-word' }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', flexShrink: 0 }}>
                {/* Bucket selector */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c8956c', marginBottom: 4 }}>
                    {clampedIdx === -1 ? `${p2BookName} ${p2Chapter}` : `Bucket ${clampedIdx + 1} / ${buckets.length}`}
                  </label>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
                    <button
                      onClick={() => goToBucket(-1)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        color: '#fff',
                        background: clampedIdx === -1
                          ? 'linear-gradient(45deg, #8b4513, #a0522d)'
                          : 'linear-gradient(45deg, #888, #666)',
                        boxShadow: clampedIdx === -1 ? '0 0 0 2px #c8956c' : 'none'
                      }}
                    >
                      0
                    </button>
                    {buckets.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => goToBucket(idx)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          color: '#fff',
                          background: idx === clampedIdx
                            ? 'linear-gradient(45deg, #8b4513, #a0522d)'
                            : 'linear-gradient(45deg, #4caf50, #45a049)',
                          boxShadow: idx === clampedIdx ? '0 0 0 2px #c8956c' : 'none'
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
                    <select
                      value={cursiveBucketIndex}
                      onChange={(e) => goToBucket(parseInt(e.target.value))}
                      style={{ flex: 1, padding: 6, border: '1px solid #c9b99a', borderRadius: 2, background: isDarkMode ? '#1a1a2e' : 'rgba(255,255,255,0.7)', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 14, color: isDarkMode ? '#fff' : '#1a1209' }}
                    >
                      <option value={-1}>0. {p2BookName} {p2Chapter}</option>
                      {bucketLabels.map((label, idx) => (
                        <option key={idx} value={idx}>{label}</option>
                      ))}
                    </select>
                    {cursiveBucketIndex < buckets.length - 1 && (
                      <button
                        onClick={() => {
                          const scrollEl = document.querySelector('.cursive-output-scroll');
                          if (scrollEl) {
                            const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
                            const atBottom = maxScroll <= 0 || scrollEl.scrollTop >= maxScroll - 5;
                            if (!atBottom) {
                              scrollEl.scrollTop = Math.min(maxScroll, scrollEl.scrollTop + scrollEl.clientHeight * 0.9);
                              return;
                            }
                          }
                          goToBucket(cursiveBucketIndex + 1);
                        }}
                        title="Next bucket"
                        style={{ padding: '0 8px', border: '1px solid #c9b99a', borderRadius: 2, background: '#8b4513', color: '#f5f0e8', fontSize: 12, lineHeight: 1, cursor: 'pointer' }}
                      >▼</button>
                    )}
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={cursiveInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.includes(',')) {
                        setCursiveInput(v);
                        return;
                      }
                      const matches = v.match(/\d+/g);
                      if (matches && matches.length > 0) {
                        const n = parseInt(matches[matches.length - 1], 10);
                        if (!isNaN(n) && n >= 1 && n <= buckets.length) {
                          e.target.value = '';
                          setCursiveInput('');
                          goToBucket(n - 1);
                          return;
                        }
                      }
                      setCursiveInput(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        // handled by global keydown; stopPropagation prevents double-fire
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (cursiveInput.includes(',')) {
                          const nums = cursiveInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= buckets.length);
                          if (nums.length > 0) {
                            const combined = nums.map(n => buckets[n - 1]).join('\n\n');
                            navigator.clipboard.writeText(combined).then(() => {
                              setCursiveInput('Copied ' + nums.join(',') + '!');
                              setTimeout(() => setCursiveInput(''), 1200);
                            });
                            return;
                          }
                        }
                        const matches = cursiveInput.match(/\d+/g);
                        if (matches && matches.length > 0) {
                          const n = parseInt(matches[matches.length - 1], 10);
                          if (!isNaN(n) && n >= 1 && n <= buckets.length) {
                            goToBucket(n - 1);
                          }
                        }
                        setCursiveInput('');
                      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Home' || e.key === 'End') {
                        e.preventDefault();
                        e.stopPropagation();
                        const scroll = document.querySelector('.cursive-output-scroll');
                        if (scroll) {
                            const pageHeight = scroll.clientHeight * 0.9;
                          const toTop = e.key === 'ArrowUp' || e.key === 'Home';
                          scroll.scrollBy({ top: toTop ? -pageHeight : pageHeight, behavior: 'smooth' });
                        }
                      }
                    }}
                    placeholder={`Type 1–${buckets.length || 1} to jump`}
                    style={{ width: '100%', marginTop: 4, padding: 6, border: '1px solid #c9b99a', borderRadius: 2, background: isDarkMode ? '#1a1a2e' : 'rgba(255,255,255,0.7)', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 14, color: isDarkMode ? '#fff' : '#1a1209' }}
                  />
                </div>

                {/* Sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c8956c' }}>
                      <span>Speed</span><span>{cursiveSpeed}</span>
                    </div>
                    <input type="range" min="1" max="5" value={cursiveSpeed}
                      onChange={(e) => { const v = parseInt(e.target.value); setCursiveSpeed(v); localStorage.setItem('cursive-speed', v); }}
                      style={{ width: '100%', accentColor: '#8b4513', cursor: 'pointer' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c8956c' }}>
                      <span>Size</span><span>{cursiveSize}</span>
                    </div>
                    <input type="range" min="28" max="80" value={cursiveSize}
                      onChange={(e) => { const v = parseInt(e.target.value); setCursiveSize(v); localStorage.setItem('cursive-size', v); }}
                      style={{ width: '100%', accentColor: '#8b4513', cursor: 'pointer' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c8956c' }}>
                      <span>Reveal</span><span>{cursiveReveal}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={cursiveReveal}
                      onChange={(e) => { const v = parseInt(e.target.value); setCursiveReveal(v); localStorage.setItem('cursive-reveal', v); }}
                      style={{ width: '100%', accentColor: '#8b4513', cursor: 'pointer' }} />
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100 }}>
                  <button
                    className="cursive-write-btn"
                    onClick={() => {
                      const outputText = document.querySelector('.cursive-output-text');
                      const outputScroll = document.querySelector('.cursive-output-scroll');
                      if (!outputText || !bucketText.trim()) return;

                      // Stop any existing animation
                      if (window._cursiveTimer) { clearTimeout(window._cursiveTimer); window._cursiveTimer = null; }
          
                      outputText.innerHTML = '';
                      if (outputScroll) outputScroll.scrollTop = 0;

                      outputText.style.fontSize = cursiveSize + 'px';
                      const syllabifyWord = (w) => {
                        if (!cursiveSyllables || !hyphRef.current) return w;
                        const m = w.match(/^(\W*)(.*?)(\W*)$/);
                        if (!m) return w;
                        const [, lead, core, trail] = m;
                        if (!core) return w;
                        return lead + hyphRef.current.hyphenate(core).join('\u00B7') + trail;
                      };
                      const words = bucketText.split(/\s+/).filter(Boolean);
                      const revealCount = Math.floor(words.length * cursiveReveal / 100);
                      const spans = words.map((word, i) => {
                        const sp = document.createElement('span');
                        sp.style.cssText = i < revealCount
                          ? `display:inline;opacity:1`
                          : `display:inline;opacity:0;transition:opacity ${fadeMs}ms ease`;
                        const display = syllabifyWord(word);
                        sp.textContent = i < words.length - 1 ? display + ' ' : display;
                        outputText.appendChild(sp);
                        return sp;
                      });

                      // If fully revealed, no animation needed
                      if (revealCount >= words.length) return;

                      let i = revealCount;
                      function next() {
                        if (i >= spans.length) { window._cursiveTimer = null; return; }
                        spans[i].style.opacity = '1';
                        if (outputScroll) {
                          const nearBottom = outputScroll.scrollHeight - outputScroll.scrollTop - outputScroll.clientHeight < 80;
                          if (nearBottom) outputScroll.scrollTop = outputScroll.scrollHeight;
                        }
                        i++;
                        window._cursiveTimer = setTimeout(next, delayMs);
                      }
                      next();
                    }}
                    style={{ padding: '6px 12px', border: '1.5px solid #8b4513', borderRadius: 2, background: '#8b4513', color: '#f5f0e8', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.9rem', letterSpacing: '0.1em', cursor: 'pointer' }}
                  >
                    Write
                  </button>
                  <button
                    onClick={() => {
                      if (isClipboardMode) { doPaste(); return; }
                      if (window._cursiveTimer) { clearTimeout(window._cursiveTimer); window._cursiveTimer = null; }
          
                    }}
                    title={isClipboardMode ? 'Re-read clipboard into buckets' : 'Stop animation'}
                    style={{ padding: '6px 12px', border: '1.5px solid #8b4513', borderRadius: 2, background: 'transparent', color: '#8b4513', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.9rem', letterSpacing: '0.1em', cursor: 'pointer' }}
                  >
                    {isClipboardMode ? 'Repaste' : 'Stop'}
                  </button>
                  <button
                    onClick={() => {
                      if (isClipboardMode) {
                        setCursiveClipboardBuckets(null);
                        setCursiveBucketIndex(-1);
                        if (window._cursiveTimer) { clearTimeout(window._cursiveTimer); window._cursiveTimer = null; }
            
                        const outputText = document.querySelector('.cursive-output-text');
                        const outputScroll = document.querySelector('.cursive-output-scroll');
                        if (outputText) outputText.innerHTML = '';
                        if (outputScroll) outputScroll.scrollTop = 0;
                      } else {
                        doPaste();
                      }
                    }}
                    style={{ padding: '6px 12px', border: '1.5px solid #8b4513', borderRadius: 2, background: isClipboardMode ? '#8b4513' : 'transparent', color: isClipboardMode ? '#f5f0e8' : '#8b4513', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '0.9rem', letterSpacing: '0.1em', cursor: 'pointer' }}
                    title={isClipboardMode ? 'Return to chapter verses' : 'Paste clipboard, split into 500-char buckets'}
                  >
                    {isClipboardMode ? 'Unpaste' : 'Paste'}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 8, fontSize: 11, color: '#c8956c', textAlign: 'center' }}>
                Type a bucket # to jump &nbsp;|&nbsp; Type 1,2,3 + Enter to copy those buckets (add a comma first) &nbsp;|&nbsp; Spacebar scrolls to bottom
              </div>
            </div>
          </div>
        );
      })()}

      {/* Words Noun Pairs Modal */}
      {showWordsModal && (() => {
        const wBook = pane2Book || selectedBook;
        const wChapter = pane2Chapter || selectedChapter;
        const wBookName = wBook ? (wBook.book || getBookName(wBook.abbrev)) : '';

        let wVerses = [];
        if (rightPaneBibleData && wBook) {
          const rpBook = rightPaneBibleData.find(b => b.abbrev === wBook.abbrev);
          if (rpBook && rpBook.chapters[wChapter - 1]) wVerses = rpBook.chapters[wChapter - 1];
        }
        if (!wVerses.length && bibleData && wBook) {
          const bk = bibleData.find(b => b.abbrev === wBook.abbrev);
          if (bk && bk.chapters[wChapter - 1]) wVerses = bk.chapters[wChapter - 1];
        }

        // Get total chapters for dropdown
        let totalChapters = 0;
        if (rightPaneBibleData && wBook) {
          const rpBook = rightPaneBibleData.find(b => b.abbrev === wBook.abbrev);
          if (rpBook) totalChapters = rpBook.chapters.length;
        }
        if (!totalChapters && bibleData && wBook) {
          const bk = bibleData.find(b => b.abbrev === wBook.abbrev);
          if (bk) totalChapters = bk.chapters.length;
        }

        return (
          <WordsModal
            verses={wVerses}
            bookName={wBookName}
            chapter={wChapter}
            totalChapters={totalChapters}
            bookAbbrev={wBook ? wBook.abbrev : ''}
            rightPaneBibleData={rightPaneBibleData}
            bibleData={bibleData}
            onClose={() => setShowWordsModal(false)}
          />
        );
      })()}

      {/* Recite Reveal Modal */}
      {showQuiz2Modal && (() => {
        const q2Book = pane2Book || selectedBook;
        const q2Chapter = pane2Chapter || selectedChapter;
        const q2BookName = q2Book ? (q2Book.book || getBookName(q2Book.abbrev)) : '';

        // Use exactly what pane 2 is showing — no special-casing
        let q2Verses = [];
        if (rightPaneBibleData && q2Book) {
          const rpBook = rightPaneBibleData.find(b => b.abbrev === q2Book.abbrev);
          if (rpBook && rpBook.chapters[q2Chapter - 1]) q2Verses = rpBook.chapters[q2Chapter - 1];
        }
        if (!q2Verses.length && bibleData && q2Book) {
          const bk = bibleData.find(b => b.abbrev === q2Book.abbrev);
          if (bk && bk.chapters[q2Chapter - 1]) q2Verses = bk.chapters[q2Chapter - 1];
        }

        // Build all verse entries for the entire chapter
        const verseEntries = q2Verses.map((verse, i) => ({
          num: i + 1,
          text: typeof verse === 'string' ? verse : (verse.text || verse.verse || String(verse))
        }));

        const syllabifyWord = (w) => {
          if (!hyphRef.current) return w;
          const m = w.match(/^(\W*)(.*?)(\W*)$/);
          if (!m) return w;
          const [, lead, core, trail] = m;
          if (!core) return w;
          return lead + hyphRef.current.hyphenate(core).join('\u00B7') + trail;
        };

        // Build flat word list with verse boundaries
        const allWords = [];
        const verseBoundaries = []; // index into allWords where each verse starts
        for (const entry of verseEntries) {
          verseBoundaries.push(allWords.length);
          const words = entry.text.split(/\s+/).filter(Boolean);
          for (const w of words) allWords.push({ word: w, verseNum: entry.num });
        }
        const totalWords = allWords.length;
        const clampedReveal = Math.min(quiz2RevealCount, totalWords);

        // navVerseIdx: for swipe/keyboard/button-highlight navigation (>= so boundary advances correctly)
        let navVerseIdx = 0;
        for (let vi = verseBoundaries.length - 1; vi >= 0; vi--) {
          if (clampedReveal >= verseBoundaries[vi]) { navVerseIdx = vi; break; }
        }
        // sliderVerseIdx: which verse the slider controls — set explicitly by swipe/button click
        // so slider always shows 0 when arriving at a new verse, with no cascade risk
        const sliderVerseIdx = (forceSliderVerse !== null && forceSliderVerse < verseBoundaries.length)
          ? forceSliderVerse
          : navVerseIdx;
        const activeStart = verseBoundaries[sliderVerseIdx] ?? 0;
        const activeEnd = sliderVerseIdx + 1 < verseBoundaries.length ? verseBoundaries[sliderVerseIdx + 1] : totalWords;
        const activeWordCount = activeEnd - activeStart;
        const activeProgress = Math.max(0, Math.min(clampedReveal - activeStart, activeWordCount));

        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowQuiz2Modal(false); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); setQuiz2RevealCount(c => Math.min(c + 1, totalWords)); }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); setQuiz2RevealCount(c => Math.max(c - 1, 0)); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); const next = navVerseIdx + 1; if (next < verseBoundaries.length) { setQuiz2RevealCount(verseBoundaries[next]); setForceSliderVerse(next); } const scrollEl = e.currentTarget.querySelector('[data-recite-scroll]'); if (scrollEl) { const activeP = scrollEl.querySelectorAll('p')[next < verseBoundaries.length ? next : navVerseIdx]; if (activeP) activeP.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
              else if (e.key === 'ArrowUp') { e.preventDefault(); const prev = navVerseIdx - 1; if (prev >= 0) { setQuiz2RevealCount(verseBoundaries[prev]); setForceSliderVerse(prev); } else { setQuiz2RevealCount(0); setForceSliderVerse(0); } const scrollEl = e.currentTarget.querySelector('[data-recite-scroll]'); if (scrollEl) { if (prev <= 0) { scrollEl.scrollTop = 0; } else { const activeP = scrollEl.querySelectorAll('p')[prev]; if (activeP) activeP.scrollIntoView({ block: 'center', behavior: 'smooth' }); } } }
              else if (e.key === 'Enter') { e.preventDefault(); setQuiz2RevealCount(activeStart); }
              else if (e.key === ' ') { e.preventDefault(); setQuiz2RevealCount(activeEnd); setForceSliderVerse(sliderVerseIdx); }
            }}
            tabIndex={0}
            ref={(el) => { if (el) el.focus(); }}
          >
            <div
              style={{ background: isDarkMode ? '#2a2a2a' : isSepiaMode ? '#f4ecd8' : '#fff', borderRadius: 16, padding: 24, width: '92%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                if (e.target.closest('input[type="range"]')) return; // don't swipe when touching slider
                reciteTouchStartX.current = e.touches[0].clientX;
                reciteTouchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                const startX = reciteTouchStartX.current;
                const startY = reciteTouchStartY.current;
                if (startX == null) return;
                const dx = e.changedTouches[0].clientX - startX;
                const dy = e.changedTouches[0].clientY - startY;
                reciteTouchStartX.current = null;
                reciteTouchStartY.current = null;
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                  if (sliderActiveRef.current) return; // block swipe if slider was recently used
                  const scrollEl = e.currentTarget.querySelector('[data-recite-scroll]');
                  if (dx > 0) {
                    // Swipe right → next verse, slider resets to 0
                    const next = navVerseIdx + 1;
                    if (next < verseBoundaries.length) { setQuiz2RevealCount(verseBoundaries[next]); setForceSliderVerse(next); if (scrollEl) { const p = scrollEl.querySelectorAll('p')[next]; if (p) p.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
                  } else {
                    // Swipe left → prev verse, slider resets to 0
                    const prev = navVerseIdx - 1;
                    if (prev >= 0) { setQuiz2RevealCount(verseBoundaries[prev]); setForceSliderVerse(prev); if (scrollEl) { const p = scrollEl.querySelectorAll('p')[prev]; if (p) p.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
                    else { setQuiz2RevealCount(0); setForceSliderVerse(0); if (scrollEl) scrollEl.scrollTop = 0; }
                  }
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                {/* Font size group — top left */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setQuiz2FontSize(prev => Math.max(10, prev - 2))}
                    style={{ width: 30, height: 30, fontSize: 16, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: isDarkMode ? '#444' : isSepiaMode ? '#d4c9a8' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}
                    title="Decrease font size"
                  >−</button>
                  <button
                    onClick={() => setQuiz2FontSize(prev => Math.min(28, prev + 2))}
                    style={{ width: 30, height: 30, fontSize: 16, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', background: isDarkMode ? '#444' : isSepiaMode ? '#d4c9a8' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}
                    title="Increase font size"
                  >+</button>
                </div>

                {/* Title — center */}
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#1a1a1a', textAlign: 'center', flex: 1, padding: '0 8px' }}>
                  Recite — {q2BookName} {q2Chapter}
                </h2>

                {/* Verse nav arrows — top right */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginRight: 36 }}>
                  <button
                    onClick={() => {
                      const prev = navVerseIdx - 1;
                      if (prev >= 0) { setQuiz2RevealCount(verseBoundaries[prev]); setForceSliderVerse(prev); const scrollEl = document.querySelector('[data-recite-scroll]'); if (scrollEl) { const p = scrollEl.querySelectorAll('p')[prev]; if (p) p.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
                      else { setQuiz2RevealCount(0); setForceSliderVerse(0); const scrollEl = document.querySelector('[data-recite-scroll]'); if (scrollEl) scrollEl.scrollTop = 0; }
                    }}
                    style={{ width: 30, height: 22, fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 4, cursor: 'pointer', background: isDarkMode ? '#444' : isSepiaMode ? '#d4c9a8' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}
                    title="Previous verse"
                  >↑</button>
                  <button
                    onClick={() => {
                      const next = navVerseIdx + 1;
                      if (next < verseBoundaries.length) { setQuiz2RevealCount(verseBoundaries[next]); setForceSliderVerse(next); const scrollEl = document.querySelector('[data-recite-scroll]'); if (scrollEl) { const p = scrollEl.querySelectorAll('p')[next]; if (p) p.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
                    }}
                    style={{ width: 30, height: 22, fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 4, cursor: 'pointer', background: isDarkMode ? '#be185d' : '#be185d', color: '#fff' }}
                    title="Next verse"
                  >↓</button>
                </div>
              </div>

              {/* Verse number jump buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {verseEntries.map((entry, vi) => {
                  const startIdx = verseBoundaries[vi];
                  const endIdx = vi + 1 < verseBoundaries.length ? verseBoundaries[vi + 1] : totalWords;
                  const isFullyRevealed = clampedReveal >= endIdx;
                  const isActive = vi === navVerseIdx && clampedReveal < endIdx;
                  const isPartial = clampedReveal > startIdx && clampedReveal < endIdx;
                  return (
                    <button
                      key={entry.num}
                      onClick={() => { setQuiz2RevealCount(startIdx); setForceSliderVerse(vi); }}
                      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                      style={{
                        padding: '2px 6px', fontSize: '0.7rem', fontWeight: 600, borderRadius: 4, cursor: 'pointer',
                        border: isActive ? '2px solid #be185d' : `1px solid ${isDarkMode ? '#555' : isSepiaMode ? '#c4b99a' : '#ccc'}`,
                        background: isFullyRevealed ? '#be185d' : isPartial ? (isDarkMode ? '#4a2030' : isSepiaMode ? '#e8dcc0' : '#fce7f3') : (isDarkMode ? '#333' : isSepiaMode ? '#ece3cc' : '#f5f5f5'),
                        color: isFullyRevealed ? '#fff' : (isDarkMode ? '#ccc' : isSepiaMode ? '#5a5a5a' : '#555')
                      }}
                      title={`Jump to verse ${entry.num}`}
                    >
                      {entry.num}
                    </button>
                  );
                })}
              </div>

              {/* Verses display */}
              <div data-recite-scroll style={{ overflowY: 'auto', flex: 1, lineHeight: 1.8, fontSize: quiz2FontSize, touchAction: 'pan-y' }}>
                {verseEntries.map((entry, vi) => {
                  const startIdx = verseBoundaries[vi];
                  const words = entry.text.split(/\s+/).filter(Boolean);
                  return (
                    <p key={entry.num} style={{ margin: '0 0 10px', color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#4a4a3a' : '#333' }}>
                      <span style={{ fontWeight: 700, color: isDarkMode ? '#aaa' : isSepiaMode ? '#8a7a5a' : '#888', fontSize: quiz2FontSize - 2, marginRight: 6 }}>{entry.num}</span>
                      {words.map((word, wi) => {
                        const globalIdx = startIdx + wi;
                        const revealed = globalIdx < clampedReveal;
                        return (
                          <span key={wi}>
                            {revealed
                              ? <span style={{ color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#4a4a3a' : '#333' }}>{syllabifyWord(word)}</span>
                              : <span style={{ color: isDarkMode ? '#444' : isSepiaMode ? '#d4c9a8' : '#ddd', letterSpacing: '0.05em' }}>{'_'.repeat(word.length)}</span>
                            }
                            {wi < words.length - 1 ? ' ' : ''}
                          </span>
                        );
                      })}
                    </p>
                  );
                })}
              </div>

              {/* Slider + Read button — full width flex row */}
              <div style={{ marginTop: 8, padding: '0 2px', display: 'flex', flexDirection: sliderAlign === 'right' ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
                {/* Slider half */}
                <div style={{ width: '50%' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isDarkMode ? '#ccc' : isSepiaMode ? '#6a6a5a' : '#555', marginBottom: 4 }}>
                    Verse {verseEntries[sliderVerseIdx]?.num}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* 3-step segmented bar: 0 | half | full */}
                    {(() => {
                      // Find natural break (comma/period/semicolon/colon) nearest to midpoint
                      const verseWords = (verseEntries[sliderVerseIdx]?.text || '').split(/\s+/).filter(Boolean);
                      const mid = Math.round(activeWordCount / 2);
                      let halfWords = mid;
                      // Search outward from midpoint for a word ending in punctuation
                      for (let offset = 0; offset < mid; offset++) {
                        for (const idx of [mid - 1 - offset, mid + offset]) {
                          if (idx >= 0 && idx < verseWords.length && /[,.\;:]$/.test(verseWords[idx])) {
                            halfWords = idx + 1; // reveal up to and including the punctuated word
                            offset = mid; // break outer loop
                            break;
                          }
                        }
                      }
                      const steps = [
                        { label: '0', value: 0 },
                        { label: `${halfWords}`, value: halfWords },
                        { label: `${activeWordCount}`, value: activeWordCount },
                      ];
                      // Determine active step index
                      const activeStep = activeProgress === 0 ? 0 : activeProgress >= activeWordCount ? 2 : 1;
                      const segBg = isDarkMode ? '#333' : isSepiaMode ? '#d4c9a8' : '#e0e0e0';
                      const segActiveBg = '#be185d';
                      const segText = isDarkMode ? '#ccc' : isSepiaMode ? '#5a5a5a' : '#555';
                      const segActiveText = '#fff';
                      return (
                        <div style={{ display: 'flex', flex: 1, height: 34, borderRadius: 6, overflow: 'hidden', border: `1px solid ${isDarkMode ? '#555' : isSepiaMode ? '#c4b99a' : '#ccc'}` }}>
                          {steps.map((step, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setQuiz2RevealCount(activeStart + step.value);
                                setForceSliderVerse(sliderVerseIdx);
                                sliderActiveRef.current = true;
                                if (sliderActiveTimerRef.current) clearTimeout(sliderActiveTimerRef.current);
                                sliderActiveTimerRef.current = setTimeout(() => { sliderActiveRef.current = false; }, 2000);
                              }}
                              style={{
                                flex: 1,
                                border: 'none',
                                borderRight: i < 2 ? `1px solid ${isDarkMode ? '#555' : isSepiaMode ? '#c4b99a' : '#ccc'}` : 'none',
                                background: i <= activeStep ? segActiveBg : segBg,
                                color: i <= activeStep ? segActiveText : segText,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >{step.value}/{activeWordCount}</button>
                          ))}
                        </div>
                      );
                    })()}
                    <button
                      onClick={() => setSliderAlign(a => a === 'left' ? 'right' : 'left')}
                      style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, border: `1px solid ${isDarkMode ? '#555' : isSepiaMode ? '#c4b99a' : '#ccc'}`, background: isDarkMode ? '#444' : isSepiaMode ? '#d4c9a8' : '#e0e0e0', color: isDarkMode ? '#ccc' : isSepiaMode ? '#5a5a5a' : '#555', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >{sliderAlign === 'left' ? 'L' : 'R'}</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: isDarkMode ? '#888' : isSepiaMode ? '#8a7a5a' : '#999', marginTop: 2 }}>
                    <span>{activeProgress} / {activeWordCount} words</span>
                    <span>{activeWordCount > 0 ? Math.round((activeProgress / activeWordCount) * 100) : 0}%</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.65rem', color: isDarkMode ? '#666' : isSepiaMode ? '#a09a8a' : '#bbb', marginTop: 6 }}>
                    swipe right to inc verse · left to dec · enter to reset slider · spacebar to fill
                  </div>
                </div>
                {/* Read button — fills the other 50% */}
                <div style={{ width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    onClick={async () => {
                      if (reciteTtsPlaying) {
                        if (reciteTtsAudioRef.current) { reciteTtsAudioRef.current.pause(); reciteTtsAudioRef.current = null; }
                        window.speechSynthesis.cancel();
                        setReciteTtsPlaying(false);
                        return;
                      }
                      let readIdx = sliderVerseIdx;
                      let cleanText;
                      if (activeProgress === 0 && sliderVerseIdx > 0) {
                        // Slider at 0: read the full previous verse
                        readIdx = sliderVerseIdx - 1;
                        const verseText = verseEntries[readIdx]?.text;
                        if (!verseText) return;
                        cleanText = verseText.replace(/\{[^}]*\}/g, '').trim();
                      } else {
                        // Slider not at 0: read only the revealed words
                        const verseText = verseEntries[readIdx]?.text;
                        if (!verseText) return;
                        const words = verseText.replace(/\{[^}]*\}/g, '').trim().split(/\s+/).filter(Boolean);
                        cleanText = words.slice(0, activeProgress).join(' ');
                        if (!cleanText) return;
                      }
                      const provider = localStorage.getItem('TTS_PROVIDER') || 'openai';

                      if (provider === 'browser') {
                        // Browser built-in speech synthesis
                        setReciteTtsPlaying(true);
                        const utter = new SpeechSynthesisUtterance(cleanText);
                        utter.onend = () => setReciteTtsPlaying(false);
                        utter.onerror = () => setReciteTtsPlaying(false);
                        window.speechSynthesis.speak(utter);
                      } else {
                        // OpenAI TTS
                        const apiKey = (localStorage.getItem('OPENAI_API_KEY') || '').trim();
                        if (!apiKey) {
                          // Fallback to browser built-in speechSynthesis (macOS/iOS system voice)
                          setReciteTtsPlaying(true);
                          const utter = new SpeechSynthesisUtterance(cleanText);
                          utter.onend = () => setReciteTtsPlaying(false);
                          utter.onerror = () => setReciteTtsPlaying(false);
                          window.speechSynthesis.speak(utter);
                          return;
                        }
                        setReciteTtsPlaying(true);
                        try {
                          const resp = await fetch('https://api.openai.com/v1/audio/speech', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                            body: JSON.stringify({ model: 'tts-1', input: cleanText, voice: 'onyx', speed: 1.0 })
                          });
                          if (!resp.ok) { console.error('OpenAI TTS error', resp.status); setReciteTtsPlaying(false); return; }
                          const blob = await resp.blob();
                          const url = URL.createObjectURL(blob);
                          const audio = new Audio(url);
                          reciteTtsAudioRef.current = audio;
                          audio.onended = () => { URL.revokeObjectURL(url); reciteTtsAudioRef.current = null; setReciteTtsPlaying(false); };
                          audio.onerror = () => { URL.revokeObjectURL(url); reciteTtsAudioRef.current = null; setReciteTtsPlaying(false); };
                          audio.play();
                        } catch (e) { console.error('Recite TTS error', e); setReciteTtsPlaying(false); }
                      }
                    }}
                    style={{ fontSize: '1.1rem', fontWeight: 700, padding: '14px 24px', borderRadius: 8, border: 'none', background: reciteTtsPlaying ? '#dc2626' : '#be185d', color: '#fff', cursor: 'pointer', width: '80%', maxWidth: 180 }}
                    title={reciteTtsPlaying ? 'Stop reading' : (activeProgress === 0 && sliderVerseIdx > 0 ? `Read verse ${verseEntries[sliderVerseIdx - 1]?.num}` : `Read verse ${verseEntries[sliderVerseIdx]?.num}`)}
                  >{reciteTtsPlaying ? '■ Stop' : activeProgress === 0 && sliderVerseIdx > 0 ? `🔊 v${verseEntries[sliderVerseIdx - 1]?.num}` : `🔊 v${verseEntries[sliderVerseIdx]?.num} ${activeProgress}/${activeWordCount}`}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Breathe Modal */}
      {showBreatheModal && (() => {
        const closeBreathe = () => {
          if (window._breatheInterval) { clearInterval(window._breatheInterval); window._breatheInterval = null; }
          if (window._breatheAudioCtx) { window._breatheAudioCtx.close().catch(() => {}); window._breatheAudioCtx = null; }
          setShowBreatheModal(false);
        };

        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) closeBreathe(); }}
          >
            <div
              style={{
                background: '#0a0a0f',
                borderRadius: 12, width: '92%', maxWidth: 500, height: '80vh',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 48, position: 'relative', overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Ambient glow */}
              <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,120,160,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <button
                onClick={closeBreathe}
                style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 24, color: '#6b7a8d', cursor: 'pointer', lineHeight: 1, zIndex: 2 }}
              >&times;</button>

              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic', fontSize: '1.1rem', color: '#6b7a8d', letterSpacing: '0.15em', textTransform: 'lowercase', zIndex: 1 }}>breathe</h2>

              <div
                className="breathe-timer"
                style={{ fontSize: 'clamp(4rem, 18vw, 7rem)', fontFamily: "'DM Mono', monospace", fontWeight: 300, letterSpacing: '0.05em', color: '#c8d4e8', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 60px rgba(150,180,220,0.15)', zIndex: 1, opacity: 0, transition: 'opacity 1.2s ease, color 2s ease' }}
              >
                00:00
              </div>

              <div
                className="breathe-label"
                style={{ fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#4a5568', height: '1rem', zIndex: 1, opacity: 0, transition: 'color 2s ease, opacity 1s ease' }}
              />

              <button
                className="breathe-start-btn"
                onClick={() => {
                  const timerEl = document.querySelector('.breathe-timer');
                  const labelEl = document.querySelector('.breathe-label');
                  const startBtn = document.querySelector('.breathe-start-btn');
                  if (!timerEl) return;

                  if (window._breatheInterval) { clearInterval(window._breatheInterval); window._breatheInterval = null; }

                  // Thud sound using Web Audio API — create context once on user click
                  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                  audioCtx.resume();
                  const playThud = () => {
                    try {
                      const osc = audioCtx.createOscillator();
                      const gain = audioCtx.createGain();
                      osc.type = 'sine';
                      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
                      gain.gain.setValueAtTime(1.0, audioCtx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                      osc.connect(gain);
                      gain.connect(audioCtx.destination);
                      osc.start(audioCtx.currentTime);
                      osc.stop(audioCtx.currentTime + 0.3);
                    } catch (e) { /* ignore audio errors */ }
                  };
                  window._breatheAudioCtx = audioCtx;

                  let seconds = 0;
                  timerEl.textContent = '00:00';
                  timerEl.style.opacity = '1';
                  timerEl.style.color = '#c8d4e8';
                  labelEl.style.opacity = '1';
                  labelEl.textContent = 'breathe in';
                  labelEl.style.color = '#7a9ab8';
                  startBtn.disabled = true;
                  startBtn.style.opacity = '0.2';

                  window._breatheInterval = setInterval(() => {
                    seconds++;
                    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
                    const s = (seconds % 60).toString().padStart(2, '0');
                    timerEl.textContent = `${m}:${s}`;

                    if (seconds % 5 === 0) playThud();

                    const cycle = Math.floor(seconds / 5) % 2;
                    if (cycle === 0) {
                      labelEl.textContent = 'breathe in';
                      labelEl.style.color = '#7a9ab8';
                    } else {
                      labelEl.textContent = 'breathe out';
                      labelEl.style.color = '#8b7a9a';
                    }

                    if (seconds >= 300) {
                      clearInterval(window._breatheInterval);
                      window._breatheInterval = null;
                      labelEl.textContent = '';
                      labelEl.style.opacity = '0';
                      timerEl.style.opacity = '0';
                      timerEl.style.transition = 'opacity 3s ease';
                      setTimeout(() => {
                        timerEl.style.transition = 'opacity 1.2s ease, color 2s ease';
                        timerEl.textContent = '00:00';
                        timerEl.style.opacity = '0';
                        startBtn.disabled = false;
                        startBtn.style.opacity = '1';
                      }, 3000);
                    }
                  }, 1000);
                }}
                style={{
                  background: 'none', border: '1px solid #2a3040', color: '#6b7a8d',
                  fontFamily: "'DM Mono', monospace", fontSize: '0.75rem', letterSpacing: '0.2em',
                  textTransform: 'uppercase', padding: '14px 36px', borderRadius: 2, cursor: 'pointer',
                  transition: 'all 0.3s ease', zIndex: 1
                }}
              >
                start
              </button>
            </div>
          </div>
        );
      })()}

      {/* Study Questions - now rendered inline in pane 2 (see above) */}

      {/* Prompt Picker Modal (for multi-part books or when no prompt for current book) */}
      {showPromptPickerModal && (() => {
        const bookName = selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : '';
        const isAllBooks = promptPickerOptions.length === Object.keys(promptsData || {}).length;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 max-h-[80vh] flex flex-col">
              <h3 className="text-lg font-bold mb-1">
                {isAllBooks ? 'No prompt for ' + bookName : 'Select Part'}
              </h3>
              {isAllBooks && (
                <p className="text-sm text-gray-500 mb-3">Available prompts:</p>
              )}
              <div className="flex flex-col gap-2 overflow-y-auto">
                {promptPickerOptions.map(key => (
                  <button
                    key={key}
                    onClick={() => {
                      navigator.clipboard.writeText(promptsData[key])
                        .then(() => {
                          alert(`Copied "${key}" prompt to clipboard`);
                          setShowPromptPickerModal(false);
                        })
                        .catch(err => alert('Failed to copy: ' + err));
                    }}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold text-sm text-left"
                  >
                    {key}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPromptPickerModal(false)}
                className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* Hidden audio element for Story Time chapter playback */}
      <audio
        ref={storytimeAudioRef}
        preload="none"
        onPlay={() => setIsStorytimeAudioPlaying(true)}
        onPause={() => setIsStorytimeAudioPlaying(false)}
        onEnded={() => setIsStorytimeAudioPlaying(false)}
        style={{ display: 'none' }}
      />
      {/* Hidden audio element for Rhyme chapter playback */}
      <audio
        ref={rhymeAudioRef}
        preload="none"
        loop={rhymeRepeat}
        onPlay={() => setIsRhymeAudioPlaying(true)}
        onPause={() => setIsRhymeAudioPlaying(false)}
        onTimeUpdate={(e) => setRhymeCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => { setRhymeDuration(e.target.duration); setRhymeCurrentTime(e.target.currentTime); }}
        onEnded={() => {
          if (rhymeRepeat) return;
          if (rhymeAutoPlay) {
            const book = pane2Book || selectedBook;
            const chapter = pane2Chapter || selectedChapter;
            if (book && chapter < book.chapters.length) {
              const nextChapter = chapter + 1;
              const nextUrl = getRhymeAudioUrl(book.abbrev, nextChapter);
              if (nextUrl) {
                rhymeAutoAdvancingRef.current = true;
                handleChapterSelect(nextChapter);
                setTimeout(() => {
                  const audio = rhymeAudioRef.current;
                  if (audio) {
                    audio.src = nextUrl;
                    audio.play().catch(err => console.warn('Rhyme auto-play failed:', err));
                  }
                }, 300);
                return;
              }
            }
          }
          setIsRhymeAudioPlaying(false);
        }}
        style={{ display: 'none' }}
      />

      {/* Rhyme Audio Modal */}
      {showRhymeModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRhymeModal(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setShowRhymeModal(false); } }}
        >
          <div style={{ background: isDarkMode ? '#2a2a2a' : isSepiaMode ? '#f4ecd8' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1em', color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}>
                Rhyme Audio
              </h3>
              <button
                onClick={() => setShowRhymeModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: isDarkMode ? '#aaa' : '#888', padding: '0 4px' }}
              >×</button>
            </div>

            {/* Book & Chapter selectors */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: isDarkMode ? '#aaa' : isSepiaMode ? '#7a6a4a' : '#666' }}>Book</label>
                <select
                  value={rhymeModalBook}
                  onChange={(e) => { setRhymeModalBook(e.target.value); setRhymeModalChapter(1); }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`, background: isDarkMode ? '#333' : isSepiaMode ? '#efe6d0' : '#fff', color: isDarkMode ? '#e0e0e0' : '#333', fontSize: 14 }}
                >
                  <option value="ps">Psalms</option>
                  <option value="prv">Proverbs</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: isDarkMode ? '#aaa' : isSepiaMode ? '#7a6a4a' : '#666' }}>Chapter</label>
                <select
                  value={rhymeModalChapter}
                  onChange={(e) => setRhymeModalChapter(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`, background: isDarkMode ? '#333' : isSepiaMode ? '#efe6d0' : '#fff', color: isDarkMode ? '#e0e0e0' : '#333', fontSize: 14 }}
                >
                  {Array.from({ length: rhymeModalBook === 'ps' ? 150 : 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Play button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <button
                onClick={() => {
                  const url = getRhymeAudioUrl(rhymeModalBook, rhymeModalChapter);
                  if (!url) return;
                  const audio = rhymeAudioRef.current;
                  if (!audio) return;
                  if (audio.src === url || audio.src.endsWith(new URL(url).pathname)) {
                    // Same track — toggle play/pause without resetting
                    if (!audio.paused) {
                      audio.pause();
                    } else {
                      audio.play().catch(err => console.warn('Rhyme audio play failed:', err));
                    }
                  } else {
                    audio.src = url;
                    audio.play().catch(err => console.warn('Rhyme audio play failed:', err));
                  }
                }}
                style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#ec4899', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                {isRhymeAudioPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={() => {
                  handleBookSelect(rhymeModalBook);
                  setTimeout(() => handleChapterSelect(rhymeModalChapter), 100);
                }}
                style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: isDarkMode ? '#555' : '#6b7280', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Go
              </button>
            </div>

            {/* Seek slider */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: isDarkMode ? '#aaa' : isSepiaMode ? '#7a6a4a' : '#666', marginBottom: 2 }}>
                <span>{(() => { const m = Math.floor(rhymeCurrentTime / 60); const s = Math.floor(rhymeCurrentTime % 60); return `${m}:${s.toString().padStart(2, '0')}`; })()}</span>
                <span>{(() => { const m = Math.floor(rhymeDuration / 60); const s = Math.floor(rhymeDuration % 60); return rhymeDuration > 0 ? `${m}:${s.toString().padStart(2, '0')}` : '--:--'; })()}</span>
              </div>
              <input
                type="range"
                min="0"
                max={rhymeDuration || 100}
                step="1"
                value={rhymeCurrentTime}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  if (rhymeAudioRef.current) {
                    rhymeAudioRef.current.currentTime = t;
                    setRhymeCurrentTime(t);
                  }
                }}
                style={{ width: '100%', accentColor: '#ec4899' }}
              />
            </div>

            {/* Audio controls */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: isDarkMode ? '#aaa' : isSepiaMode ? '#7a6a4a' : '#666' }}>Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                defaultValue={rhymeAudioRef.current ? rhymeAudioRef.current.volume : 1}
                onChange={(e) => { if (rhymeAudioRef.current) rhymeAudioRef.current.volume = Number(e.target.value); }}
                style={{ width: '100%', accentColor: '#ec4899' }}
              />
            </div>

            {/* Repeat toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: isDarkMode ? '#ccc' : isSepiaMode ? '#6a5a3a' : '#555' }}>Repeat</span>
              <label className="inline-flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rhymeRepeat}
                    onChange={() => setRhymeRepeat(prev => !prev)}
                    className="sr-only"
                  />
                  <div className={`w-9 h-5 rounded-full transition-colors ${rhymeRepeat ? 'bg-pink-500' : 'bg-gray-300'}`}></div>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rhymeRepeat ? 'translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Story Time Modal - removed, now combined with Search modal below */}

      {/* Story Time unavailable modal */}
      {storytimeUnavailableMsg && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setStorytimeUnavailableMsg(null); }}
        >
          <div style={{ background: isDarkMode ? '#2a2a2a' : isSepiaMode ? '#f4ecd8' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1em', color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}>
              Story Time unavailable
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.95em', color: isDarkMode ? '#d0d0d0' : isSepiaMode ? '#6a6a5a' : '#444' }}>
              {storytimeUnavailableMsg}
            </p>
            <p style={{ margin: '0 0 6px', fontSize: '0.85em', color: isDarkMode ? '#aaa' : isSepiaMode ? '#8a7a5a' : '#666' }}>
              Currently available for:
            </p>
            <ul style={{ margin: '0 0 16px 18px', padding: 0, fontSize: '0.9em', color: isDarkMode ? '#d0d0d0' : isSepiaMode ? '#5a5a5a' : '#333', lineHeight: 1.5 }}>
              <li>Genesis – 2 Chronicles</li>
              <li>Job</li>
              <li>Psalms</li>
              <li>Isaiah</li>
              <li>Ezekiel</li>
              <li>Daniel</li>
              <li>Zechariah</li>
            </ul>
            <button
              onClick={() => setStorytimeUnavailableMsg(null)}
              style={{ padding: '8px 16px', background: isDarkMode ? '#555' : isSepiaMode ? '#d4c9a8' : '#e5e7eb', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.9em', color: isDarkMode ? '#e0e0e0' : isSepiaMode ? '#5a5a5a' : '#333' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Hymn Recommendations Modal (Psalms and Luke) */}
      {showHymnModal && (() => {
        const chapterKey = String(selectedChapter);
        const isLuke = selectedBook && selectedBook.abbrev === 'lk';
        const isPsalm = selectedBook && selectedBook.abbrev === 'ps';
        const hasHymns = isLuke || isPsalm;
        const hymnSource = isLuke ? lukeHymnsData : psalmHymnsData;
        const hymns = hasHymns ? ((hymnSource && hymnSource[chapterKey]) || []) : [];
        const bookLabel = isLuke ? `Luke ${selectedChapter}` : isPsalm ? `Psalm ${selectedChapter}` : (selectedBook ? selectedBook.name || selectedBook.abbrev : '');
        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowHymnModal(false); }}
          >
            <div style={{ background: isDarkMode ? '#2a2a2a' : 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1em', color: isDarkMode ? '#e0e0e0' : '#333', textAlign: 'center' }}>
                {hasHymns ? `Recommended Hymns for ${bookLabel}` : 'Hymn Recommendations'}
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.8em', color: isDarkMode ? '#999' : '#888', textAlign: 'center' }}>
                From the 1955 Hymnary
              </p>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {!hasHymns ? (
                  <p style={{ textAlign: 'center', color: isDarkMode ? '#999' : '#666', padding: 20 }}>
                    Hymn recommendations are currently only available for Psalms and Luke.
                  </p>
                ) : hymns.length === 0 ? (
                  <p style={{ textAlign: 'center', color: isDarkMode ? '#999' : '#666', padding: 20 }}>
                    No hymn recommendations found for {bookLabel}.
                  </p>
                ) : (
                  hymns.map((h, idx) => (
                    <div key={idx} style={{
                      padding: '12px 14px',
                      marginBottom: 10,
                      borderRadius: 10,
                      background: isDarkMode ? '#383838' : '#fef2f2',
                      border: isDarkMode ? '1px solid #555' : '1px solid #fecaca'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 'bold', color: isDarkMode ? '#f9a8a8' : '#be123c', fontSize: '0.95em' }}>
                          {h.hymn_number}
                        </span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(h.first_line + ' hymn')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.78em', color: isDarkMode ? '#93c5fd' : '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          Search
                        </a>
                        <a
                          href={`https://search-niv.netlify.app/?q=${encodeURIComponent(h.first_line)}&v=hymns`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.78em', color: isDarkMode ? '#86efac' : '#15803d', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          Similar
                        </a>
                      </div>
                      <div style={{ fontSize: '0.95em', color: isDarkMode ? '#e0e0e0' : '#333', marginBottom: 6, fontStyle: 'italic' }}>
                        "{h.first_line}"
                      </div>
                      <div style={{ fontSize: '0.82em', color: isDarkMode ? '#bbb' : '#666', lineHeight: 1.4 }}>
                        {h.reason}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowHymnModal(false)}
                style={{
                  marginTop: 16, width: '100%', padding: '10px 0', borderRadius: 10,
                  background: isDarkMode ? '#555' : '#e5e7eb', border: 'none', cursor: 'pointer',
                  fontSize: '0.9em', color: isDarkMode ? '#e0e0e0' : '#333'
                }}
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {/* Combined Search + Story Modal */}
      {showSearchModal && (() => {
        const bookName = selectedBook ? (selectedBook.book || getBookName(selectedBook.abbrev)) : 'Book';
        const translationFileMap = { KJV: 'en_kjv.json', NIV: 'en_niv.json', NLT: 'en_nlt.json', BSB: 'en_bsb.json' };
        const getSearchData = async () => {
          const file = translationFileMap[searchTranslation] || 'en_kjv.json';
          if (rightPaneBibleData && rightPaneTranslation === file) return rightPaneBibleData;
          if (bibleData && selectedTranslation === file) return bibleData;
          if (searchDataCacheRef.current[file]) return searchDataCacheRef.current[file];
          try {
            const resp = await fetch(`/${file}`);
            const data = await resp.json();
            searchDataCacheRef.current[file] = data;
            return data;
          } catch (e) {
            console.warn(`Failed to load ${searchTranslation} for search:`, e);
            return bibleData;
          }
        };
        const handleSearch = async (keyword) => {
          if (!keyword.trim() || !selectedBook) {
            setSearchResults([]);
            return;
          }
          const searchData = await getSearchData();
          if (!searchData) return;
          const kw = keyword.toLowerCase();
          const results = [];
          let currentBookIdx;
          let startChapter;
          const parsedStart = searchStartRef.trim() ? parseSingleBibleRef(searchStartRef) : null;
          if (parsedStart) {
            currentBookIdx = searchData.findIndex(b => b.abbrev === parsedStart.abbrev);
            startChapter = parsedStart.chapter || 1;
          } else {
            currentBookIdx = searchData.findIndex(b => b.abbrev === selectedBook.abbrev);
            startChapter = selectedChapter || 1;
          }
          if (currentBookIdx === -1) return;
          let chaptersSearched = 0;
          const maxChapters = 30;
          let lastSearchedBook = '';
          let lastSearchedChapter = 0;
          for (let bookIdx = currentBookIdx; bookIdx < searchData.length && chaptersSearched < maxChapters; bookIdx++) {
            const book = searchData[bookIdx];
            if (!book.chapters) continue;
            const chStart = (bookIdx === currentBookIdx) ? startChapter - 1 : 0;
            for (let chIdx = chStart; chIdx < book.chapters.length && chaptersSearched < maxChapters; chIdx++) {
              chaptersSearched++;
              lastSearchedBook = book.book || getBookName(book.abbrev);
              lastSearchedChapter = chIdx + 1;
              const verses = book.chapters[chIdx];
              if (!verses) continue;
              verses.forEach((text, vIdx) => {
                if (text.toLowerCase().includes(kw)) {
                  results.push({
                    bookAbbrev: book.abbrev,
                    bookName: book.book || getBookName(book.abbrev),
                    chapter: chIdx + 1,
                    verse: vIdx + 1,
                    text
                  });
                }
              });
            }
          }
          setSearchResults(results);
          setSearchLastInfo(chaptersSearched > 0 ? `Searched ${chaptersSearched} ch (${searchTranslation}), ending at ${lastSearchedBook} ${lastSearchedChapter}` : '');
        };
        const hasSearchResults = searchResults.length > 0;
        const hasSearchQuery = searchKeyword.trim().length > 0;
        const showStory = !hasSearchResults && !hasSearchQuery && storytimeContent;
        const storyChapterLabel = selectedBook ? (abbrevToBookName[(pane2Book || selectedBook).abbrev] || (pane2Book || selectedBook).abbrev) + ' ' + (pane2Chapter || selectedChapter) : '';
        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSearchModal(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setShowSearchModal(false); } }}
          >
            <div style={{ background: isDarkMode ? '#2a2a2a' : isSepiaMode ? '#f4ecd8' : 'white', borderRadius: 16, padding: 24, width: '95%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              {/* Search Section */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
                {['KJV', 'NIV', 'NLT', 'BSB'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 13, color: isDarkMode ? '#ccc' : '#555', fontWeight: searchTranslation === t ? 700 : 400 }}>
                    <input
                      type="radio"
                      name="searchTranslation"
                      value={t}
                      checked={searchTranslation === t}
                      onChange={() => { setSearchTranslation(t); localStorage.setItem('searchTranslation', t); setSearchResults([]); setSearchLastInfo(''); }}
                      style={{ margin: 0 }}
                    />
                    {t}
                  </label>
                ))}
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const verseMatch = searchKeyword.trim().match(/^(\d+):(\d+)$/);
                if (verseMatch && selectedBook) {
                  const ch = parseInt(verseMatch[1]);
                  const vs = parseInt(verseMatch[2]);
                  const p2Book = pane2Book || selectedBook;
                  setPane2Book(p2Book);
                  setPane2Chapter(ch);
                  setShowSearchModal(false);
                  setSearchKeyword('');
                  setTimeout(() => {
                    if (kjvContentRef.current) {
                      const verseEl = kjvContentRef.current.querySelector(`[data-verse="${vs}"]`) || kjvContentRef.current.querySelector(`#verse-${vs}`);
                      if (verseEl) verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 300);
                  return;
                }
                handleSearch(searchKeyword); setSearchKeyword(''); setTimeout(() => { const el = e.target.querySelector('input[type="text"]'); if (el) el.focus(); }, 0);
              }} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => { setSearchKeyword(e.target.value); setSearchResults([]); setSearchLastInfo(''); }}
                  placeholder="Search next 30 chapters..."
                  autoFocus
                  style={{
                    flex: 1, padding: '8px 12px', fontSize: 15, border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`, borderRadius: 8,
                    background: isDarkMode ? '#1a1a1a' : '#fff', color: isDarkMode ? '#e0e0e0' : '#333', outline: 'none',
                    minWidth: 0
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px', fontSize: 14, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                    background: '#0d9488', color: 'white', whiteSpace: 'nowrap'
                  }}
                >
                  Search
                </button>
                {(hasSearchResults || searchLastInfo) && (
                  <button
                    type="button"
                    onClick={() => { setSearchKeyword(''); setSearchResults([]); setSearchLastInfo(''); }}
                    style={{
                      padding: '8px 12px', fontSize: 14, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                      background: isDarkMode ? '#555' : '#d1d5db', color: isDarkMode ? '#e0e0e0' : '#374151', whiteSpace: 'nowrap'
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: isDarkMode ? '#aaa' : '#666', whiteSpace: 'nowrap' }}>from:</span>
                <input
                  type="text"
                  value={searchStartRef}
                  onChange={(e) => setSearchStartRef(e.target.value)}
                  placeholder={`${bookName} ${selectedChapter}`}
                  style={{
                    padding: '3px 8px', fontSize: 11, border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`, borderRadius: 6,
                    background: isDarkMode ? '#1a1a1a' : '#fff', color: isDarkMode ? '#e0e0e0' : '#333', outline: 'none',
                    width: 120
                  }}
                />
                {searchLastInfo && (
                  <span style={{ fontSize: 11, color: isDarkMode ? '#7dd3fc' : '#0369a1', fontStyle: 'italic' }}>
                    {searchLastInfo}
                  </span>
                )}
              </div>

              {/* Search Results (replaces story when active) */}
              {(hasSearchResults || hasSearchQuery) && (
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {searchResults.length > 0 ? (
                    <>
                      <p style={{ fontSize: 12, color: isDarkMode ? '#999' : '#888', marginBottom: 8 }}>
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                      </p>
                      {searchResults.map((r, i) => {
                        const kw = searchKeyword.toLowerCase();
                        const idx = r.text.toLowerCase().indexOf(kw);
                        const before = r.text.slice(0, idx);
                        const match = r.text.slice(idx, idx + searchKeyword.length);
                        const after = r.text.slice(idx + searchKeyword.length);
                        const isSameBook = r.bookAbbrev === selectedBook?.abbrev;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              const scrollPaneToVerse = (paneRef, elId, verseNum, attempts = 0) => {
                                const el = document.getElementById(elId);
                                const pane = paneRef.current;
                                if (el && pane) {
                                  isManuallyScrolling.current = true;
                                  const elRect = el.getBoundingClientRect();
                                  const paneRect = pane.getBoundingClientRect();
                                  const offset = elRect.top - paneRect.top + pane.scrollTop - pane.clientHeight / 3;
                                  pane.scrollTo({ top: offset, behavior: 'smooth' });
                                  el.style.backgroundColor = isDarkMode ? '#b45309' : '#fef9c3';
                                  el.style.color = isDarkMode ? '#fffbeb' : '';
                                  setTimeout(() => { el.style.backgroundColor = ''; el.style.color = ''; }, 3000);
                                  setTimeout(() => { isManuallyScrolling.current = false; }, 800);
                                } else if (attempts < 10) {
                                  setTimeout(() => scrollPaneToVerse(paneRef, elId, verseNum, attempts + 1), 150);
                                }
                              };
                              const targetBook = bibleData.find(b => b.abbrev === r.bookAbbrev);
                              if (targetBook) {
                                setSelectedBook(targetBook);
                                setSelectedChapter(r.chapter);
                                setPane2History(h => [...h, { book: pane2Book, chapter: pane2Chapter, concordance: strongsConcordance }]);
                                setPane2Book(targetBook);
                                setPane2Chapter(r.chapter);
                              }
                              setShowSearchModal(false);
                              setSearchResults([]);
                              setSearchLastInfo('');
                              setTimeout(() => {
                                scrollPaneToVerse(chapterContentRef, `verse-${r.verse}`, r.verse);
                                scrollPaneToVerse(kjvContentRef, `right-pane-verse-${r.verse}`, r.verse);
                              }, 300);
                            }}
                            style={{
                              display: 'block', width: '100%', padding: '10px 12px', marginBottom: 6, fontSize: 13,
                              border: `1px solid ${isDarkMode ? '#444' : '#e0e0e0'}`, borderRadius: 8, cursor: 'pointer',
                              textAlign: 'left', background: isDarkMode ? '#1e1e1e' : '#fafafa',
                              color: isDarkMode ? '#d0d0d0' : '#333', transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = isDarkMode ? '#2a2a3a' : '#e8f4f8'}
                            onMouseLeave={(e) => e.target.style.background = isDarkMode ? '#1e1e1e' : '#fafafa'}
                          >
                            <span style={{ fontWeight: 700, color: isDarkMode ? '#5eead4' : '#0d9488', marginRight: 8 }}>
                              {!isSameBook && <span style={{ color: isDarkMode ? '#fbbf24' : '#b45309' }}>{r.bookName} </span>}
                              {r.chapter}:{r.verse}
                            </span>
                            <span>{before}<strong style={{ background: isDarkMode ? '#365314' : '#fef08a', padding: '0 2px', borderRadius: 2 }}>{match}</strong>{after}</span>
                          </button>
                        );
                      })}
                    </>
                  ) : hasSearchQuery ? (
                    <p style={{ textAlign: 'center', fontSize: 14, color: isDarkMode ? '#888' : '#999', marginTop: 20 }}>
                      Press Search or Enter to search.
                    </p>
                  ) : null}
                </div>
              )}

              {/* Story Section (shown when no search active) */}
              {showStory && (
                <>
                  <div style={{ borderTop: `1px solid ${isDarkMode ? '#444' : isSepiaMode ? '#c4b89a' : '#e0e0e0'}`, margin: '4px 0 8px', paddingTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: '0.85em', fontWeight: 700, color: isDarkMode ? '#c4b5fd' : '#7c3aed' }}>
                        Story — {storyChapterLabel}
                      </span>
                      <button
                        onClick={() => setStorytimeFontSize(s => Math.max(0.6, s - 0.1))}
                        style={{ background: isDarkMode ? '#444' : isSepiaMode ? '#d4c9a8' : '#e5e7eb', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75em', color: isDarkMode ? '#e0e0e0' : '#333', padding: '2px 6px', fontWeight: 'bold' }}
                        title="Decrease font size"
                      >A−</button>
                      <button
                        onClick={() => setStorytimeFontSize(s => Math.min(2.0, s + 0.1))}
                        style={{ background: isDarkMode ? '#444' : isSepiaMode ? '#d4c9a8' : '#e5e7eb', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75em', color: isDarkMode ? '#e0e0e0' : '#333', padding: '2px 6px', fontWeight: 'bold' }}
                        title="Increase font size"
                      >A+</button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(storytimeContent)
                            .then(() => alert('Copied to clipboard'))
                            .catch(err => alert('Failed to copy: ' + err));
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85em', color: isDarkMode ? '#aaa' : '#666', padding: '2px 4px' }}
                        title="Copy to clipboard"
                      >📋</button>
                      <button
                        onClick={handleStorytimeAudioToggle}
                        style={{ background: isDarkMode ? '#7c3aed' : '#8b5cf6', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.7em', color: 'white', padding: '2px 6px', fontWeight: 'bold' }}
                        title={isStorytimeAudioPlaying ? 'Pause Story Time audio' : 'Play Story Time audio'}
                      >
                        {isStorytimeAudioPlaying ? 'Pause ‖' : 'Play ▶'}
                      </button>
                      <button
                        onClick={() => {
                          const activeBook = pane2Book || selectedBook;
                          const activeChapter = pane2Chapter || selectedChapter;
                          if (!activeBook || !storytimeData) return;
                          const maxChapters = activeBook.chapters ? activeBook.chapters.length : 999;
                          let nextBook = activeBook;
                          let nextChap = activeChapter + 1;
                          if (nextChap > maxChapters) {
                            const idx = bibleData.findIndex(b => b.abbrev === activeBook.abbrev);
                            if (idx === -1 || idx >= bibleData.length - 1) return;
                            nextBook = bibleData[idx + 1];
                            nextChap = 1;
                          }
                          const bkName = abbrevToBookName[nextBook.abbrev] || nextBook.abbrev;
                          const key = `${bkName} ${nextChap}`;
                          const story = storytimeData[key];
                          if (story) {
                            if (nextBook.abbrev !== activeBook.abbrev) setSelectedBook(nextBook);
                            handleChapterSelect(nextChap, true);
                            setStorytimeContent(story);
                            if (storytimeScrollRef.current) storytimeScrollRef.current.scrollTop = 0;
                          } else {
                            setStorytimeUnavailableMsg(`No Story Time available for ${key}.`);
                          }
                        }}
                        style={{ background: isDarkMode ? '#7c3aed' : '#8b5cf6', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.7em', color: 'white', padding: '2px 6px', fontWeight: 'bold' }}
                        title="Next chapter story"
                      >Next &gt;</button>
                      <button
                        onClick={() => {
                          const raw = storytimeContent || '';
                          let t = raw;
                          t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
                          t = t.replace(/^#{1,6}\s+/gm, '');
                          t = t.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
                          t = t.replace(/\*\*(.+?)\*\*/g, '$1');
                          t = t.replace(/__(.+?)__/g, '$1');
                          t = t.replace(/\*(.+?)\*/g, '$1');
                          t = t.replace(/_(.+?)_/g, '$1');
                          t = t.replace(/`([^`]+)`/g, '$1');
                          t = t.replace(/^>\s?/gm, '');
                          t = t.replace(/^[-*]{3,}\s*$/gm, '');
                          t = t.replace(/^\|.*\|$/gm, '');
                          t = t.replace(/^[-|:\s]+$/gm, '');
                          t = t.replace(/^[-*+]\s+/gm, '');
                          t = t.replace(/^\d+\.\s+/gm, '');
                          t = t.replace(/\n{3,}/g, '\n\n');
                          const cleaned = t.trim();
                          const clean = cleaned.replace(/\s+/g, ' ').trim();
                          if (!clean) return;
                          let out;
                          const hasAtMarkers = /(?:^|\n)\s*@\S/.test(cleaned);
                          if (hasAtMarkers) {
                            out = cleaned.split(/\n(?=\s*@\S)/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
                          } else {
                            out = [];
                            const MAX = 500;
                            let i = 0;
                            while (i < clean.length) {
                              if (clean.length - i <= MAX) { out.push(clean.slice(i).trim()); break; }
                              let end = i + MAX;
                              const slice = clean.slice(i, end);
                              const sentEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
                              if (sentEnd > MAX / 2) {
                                end = i + sentEnd + 1;
                              } else {
                                const sp = clean.lastIndexOf(' ', end);
                                if (sp > i + MAX / 2) end = sp;
                              }
                              out.push(clean.slice(i, end).trim());
                              i = end;
                            }
                          }
                          setCursiveClipboardBuckets(out);
                          setCursiveBucketIndex(-1);
                          setCursiveSource('story'); localStorage.setItem('cursive-source', 'story');
                          if (window._cursiveTimer) { clearTimeout(window._cursiveTimer); window._cursiveTimer = null; }
                          setShowSearchModal(false);
                          setShowCursiveModal(true);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75em', color: isDarkMode ? '#d97706' : '#b45309', padding: '2px 4px', fontWeight: 'bold' }}
                        title="Send to Cursive"
                      >✍️</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    <div ref={storytimeScrollRef} className={isDarkMode ? 'scrollbar-dark' : isSepiaMode ? 'scrollbar-sepia' : ''} style={{ overflowY: 'auto', flex: 1, fontSize: `${storytimeFontSize}em`, lineHeight: 1.7, color: isDarkMode ? '#d0d0d0' : isSepiaMode ? '#5a5a5a' : '#333', whiteSpace: 'pre-wrap', direction: 'rtl', scrollbarColor: isDarkMode ? '#555 #2a2a2a' : isSepiaMode ? '#c4b89a #f4ecd8' : undefined }}><div style={{ direction: 'ltr' }}>
                      {storytimeContent.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) return <h2 key={i} style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '8px 0' }}>{line.slice(2)}</h2>;
                        if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: '1.05em', fontWeight: 'bold', margin: '12px 0 4px' }}>{line.slice(3)}</h3>;
                        if (line.startsWith('### ')) return <h4 key={i} style={{ fontSize: '0.95em', fontWeight: 'bold', margin: '10px 0 4px' }}>{line.slice(4)}</h4>;
                        if (line.startsWith('---')) return <hr key={i} style={{ border: 'none', borderTop: `1px solid ${isDarkMode ? '#555' : isSepiaMode ? '#c4b89a' : '#ddd'}`, margin: '12px 0' }} />;
                        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
                        const parts = line.split(/(\*\*[^*]+\*\*)/g);
                        return <p key={i} style={{ margin: '4px 0' }}>{parts.map((part, j) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                        )}</p>;
                      })}
                    </div></div>
                  </div>
                </>
              )}

              {/* No story available message */}
              {!hasSearchResults && !hasSearchQuery && !storytimeContent && (
                <p style={{ textAlign: 'center', fontSize: 13, color: isDarkMode ? '#888' : '#999', marginTop: 12, fontStyle: 'italic' }}>
                  No Story Time available for this chapter. Type to search.
                </p>
              )}

              <div style={{ position: 'relative', marginTop: 8 }}>
                {showStory && (
                  <button
                    onClick={() => {
                      const el = storytimeScrollRef.current;
                      if (!el) return;
                      const maxScroll = el.scrollHeight - el.clientHeight;
                      el.scrollTop = Math.min(maxScroll, el.scrollTop + el.clientHeight * 0.9);
                    }}
                    style={{ position: 'absolute', right: 8, bottom: 4, zIndex: 10, width: 40, height: 40, background: 'rgba(0,0,0,0.08)', borderRadius: '50%', border: '1.5px solid rgba(0,0,0,1)', opacity: 0.15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.12)'; e.currentTarget.style.opacity = '0.2'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = '0.15'; e.currentTarget.style.transform = ''; }}
                    title="Page down"
                  >
                    <svg width="36" height="36" viewBox="0 0 64 64"><path d="M8 20 L32 44 L56 20" stroke="rgba(0,0,0,0.7)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}
                <button
                  onClick={() => setShowSearchModal(false)}
                  style={{ width: '100%', padding: 8, fontSize: 13, border: 'none', borderRadius: 8, background: isDarkMode ? '#444' : '#e0e0e0', color: isDarkMode ? '#e0e0e0' : '#333', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close (Esc)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <FurtherReadingModal open={showFiguresModal} onClose={() => setShowFiguresModal(false)} />
      <ClassicalMusicModal ref={classicalRef} open={showClassicalModal} onClose={() => setShowClassicalModal(false)} onPlayingChange={setClassicalPlaying} />
      <YouTubeVideoModal open={showYouTubeModal} onClose={() => setShowYouTubeModal(false)} bookAbbrev={selectedBook?.abbrev} currentChapter={selectedChapter} onPlayingChange={setIsYouTubePlaying} />

    </div>
  );
};

export default BibleApp;