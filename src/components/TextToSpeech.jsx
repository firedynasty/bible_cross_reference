import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, Play, SkipForward } from 'lucide-react';
import kjvAudioData from '../data/kjvAudio';

const TextToSpeech = forwardRef(({ rightPaneBibleData, currentBook, currentChapter, rightPaneTranslation, speechVolume, translations, onTranslationChange, chineseBibleData, lastGridVerse, onNextChapter, onQA, showStudyQModal, onQuiz, showQuizModal, onQuiz2, showQuiz2Modal, onBuckets, showBucketsModal, onCursive, showCursiveModal, onBreathe, showBreatheModal, showPane2Syllables, onTogglePane2Syllables }, ref) => {
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [readToEnd, setReadToEnd] = useState(false);
  const [delayRead, setDelayRead] = useState(false);
  const [versesLeftToRead, setVersesLeftToRead] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true); // Always on by default
  const [currentUtterance, setCurrentUtterance] = useState(null);
  const [shouldContinueAfterCurrent, setShouldContinueAfterCurrent] = useState(false);
  const [autoScrollTimer, setAutoScrollTimer] = useState(null);
  const [autoScrollRunning, setAutoScrollRunning] = useState(false);
  const [chineseAction, setChineseAction] = useState(() => localStorage.getItem('bibleAppChineseAction') || 'copy');
  const [chineseHalf, setChineseHalf] = useState(() => localStorage.getItem('bibleAppChineseHalf') || 'upper');
  const [lastChineseVerseIdx, setLastChineseVerseIdx] = useState(0);
  const timerIdRef = useRef(null);

  // Chapters to clipboard modal state
  const [showChaptersClipboardModal, setShowChaptersClipboardModal] = useState(false);
  const [chaptersRange, setChaptersRange] = useState('');

  // TTS settings modal state
  const [showTtsModal, setShowTtsModal] = useState(false);
  const [ttsProvider, setTtsProvider] = useState(() => localStorage.getItem('TTS_PROVIDER') || 'openai');

  // OpenAI TTS state
  const [oaiTtsLoading, setOaiTtsLoading] = useState(false);
  const [oaiTtsPlaying, setOaiTtsPlaying] = useState(false);
  const oaiAudioRef = useRef(null);
  const oaiStopRef = useRef(false);

  // KJV audio state
  const [kjvPlaying, setKjvPlaying] = useState(false);
  const kjvAudioRef = useRef(null);

  const stopKjvAudio = () => {
    if (kjvAudioRef.current) { kjvAudioRef.current.pause(); kjvAudioRef.current = null; }
    setKjvPlaying(false);
  };

  const stopOaiTts = () => {
    oaiStopRef.current = true;
    if (oaiAudioRef.current) { oaiAudioRef.current.pause(); oaiAudioRef.current = null; }
    setOaiTtsPlaying(false);
    setOaiTtsLoading(false);
  };

  const handleKjvRead = () => {
    // If already playing, just pause (keep position)
    if (kjvPlaying) {
      if (kjvAudioRef.current) kjvAudioRef.current.pause();
      setKjvPlaying(false);
      return;
    }

    // If we have an existing audio for the same chapter, resume it
    if (kjvAudioRef.current && !kjvAudioRef.current.ended) {
      stopOaiTts();
      window.speechSynthesis.cancel();
      setKjvPlaying(true);
      kjvAudioRef.current.play();
      return;
    }

    // Otherwise create new audio
    stopOaiTts();
    window.speechSynthesis.cancel();

    const bookChapters = kjvAudioData[currentBook];
    if (!bookChapters) { alert('No KJV audio for this book'); return; }
    const url = bookChapters[currentChapter || 1];
    if (!url) { alert(`No KJV audio for chapter ${currentChapter}`); return; }

    const audio = new Audio(url);
    kjvAudioRef.current = audio;
    setKjvPlaying(true);
    audio.play();
    audio.onplay = () => setKjvPlaying(true);
    audio.onpause = () => setKjvPlaying(false);
    audio.onended = () => setKjvPlaying(false);
    audio.onerror = () => { setKjvPlaying(false); kjvAudioRef.current = null; };
  };

  const handleOaiKey = () => setShowTtsModal(true);

  const handleOpenAiRead = async () => {
    if (oaiTtsPlaying || oaiTtsLoading) { stopOaiTts(); return; }
    stopKjvAudio(); // Stop KJV audio if playing

    const apiKey = (localStorage.getItem('OPENAI_API_KEY') || '').trim();
    if (!apiKey) {
      // Fallback to browser built-in speechSynthesis (macOS/iOS system voice)
      if (isSpeaking) { stopSpeaking(); return; }
      setSelectedVerse(1);
      setReadToEnd(true);
      setDelayRead(false);
      setTimeout(() => speakVerse(1), 100);
      return;
    }

    // Get chapter verses from rightPaneBibleData
    const book = rightPaneBibleData ? rightPaneBibleData.find(b => b.abbrev === currentBook) : null;
    const rawVerses = book && book.chapters[(currentChapter || 1) - 1] ? book.chapters[(currentChapter || 1) - 1] : [];
    if (!rawVerses.length) return;

    // Build one text entry per verse (verse-by-verse like the TTS app)
    const verseTexts = rawVerses.map((v, i) => {
      const t = typeof v === 'string' ? v : (v.text || v.verse || String(v));
      return `${i + 1}. ${t.replace(/\{[^}]*\}/g, '').trim()}`;
    });

    oaiStopRef.current = false;
    setOaiTtsLoading(true);
    setOaiTtsPlaying(false);

    for (const verseText of verseTexts) {
      if (oaiStopRef.current) break;
      try {
        const resp = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
          body: JSON.stringify({ model: 'tts-1', input: verseText, voice: 'onyx', speed: 1.0 })
        });
        if (!resp.ok) { console.error('OpenAI TTS error', resp.status); stopOaiTts(); return; }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        await new Promise((resolve) => {
          if (oaiStopRef.current) { URL.revokeObjectURL(url); resolve(); return; }
          const audio = new Audio(url);
          oaiAudioRef.current = audio;
          setOaiTtsLoading(false);
          setOaiTtsPlaying(true);
          audio.onended = () => { URL.revokeObjectURL(url); oaiAudioRef.current = null; resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); oaiAudioRef.current = null; resolve(); };
          audio.play();
        });
      } catch (e) { console.error('OpenAI TTS fetch error', e); stopOaiTts(); return; }
    }
    setOaiTtsPlaying(false);
    setOaiTtsLoading(false);
  };

  // Part-by-part reading state (using refs to avoid stale closures)
  const partPartsRef = useRef([]);
  const partIndexRef = useRef(0);
  const partVerseKeyRef = useRef(null);
  
  // Clean text for TTS (remove annotations in curly braces and parentheses)
  const cleanTextForTTS = useCallback((text) => {
    if (!text) return '';
    // Remove both curly braces and parentheses like the reference app
    return text.replace(/\{[^}]*\}/g, '').replace(/[()]/g, '').trim();
  }, []);
  
  // Calculate smart timing based on verse length - simple, consistent speed
  const calculateVerseTiming = useCallback((verseText) => {
    if (!verseText) return 3.0;
    
    // Clean the text for more accurate measurement
    const cleanText = cleanTextForTTS(verseText);
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    
    // Simple calculation: ~0.4 seconds per word (150 words per minute)
    const secondsPerWord = 0.4;
    const punctuationCount = (cleanText.match(/[,.;:!?]/g) || []).length;
    const punctuationPause = punctuationCount * 0.2; // Brief pause for punctuation
    
    let timing = (wordCount * secondsPerWord) + punctuationPause;
    timing = Math.max(2.0, timing); // Minimum 2 seconds
    
    // Cap timing between 2 and 15 seconds
    return Math.min(15.0, timing);
  }, [cleanTextForTTS]);

  // Use refs to access current values in closures
  const readToEndRef = useRef(readToEnd);
  const delayReadRef = useRef(delayRead);
  const shouldContinueRef = useRef(shouldContinueAfterCurrent);
  const autoScrollRef = useRef(autoScroll);
  
  // Keep refs in sync with state
  useEffect(() => {
    readToEndRef.current = readToEnd;
  }, [readToEnd]);
  
  useEffect(() => {
    delayReadRef.current = delayRead;
  }, [delayRead]);
  
  useEffect(() => {
    shouldContinueRef.current = shouldContinueAfterCurrent;
  }, [shouldContinueAfterCurrent]);

  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  // Language detection based on Bible translation
  const getLanguageFromTranslation = (translation) => {
    const langMap = {
      'en_kjv.json': { lang: 'en-US', name: 'English' },
      'en_web.json': { lang: 'en-US', name: 'English' },
      'zh_cuv_no_space.json': { lang: 'zh-CN', name: 'Chinese' },
      'es_rvr.json': { lang: 'es-ES', name: 'Spanish' },
      'he_heb_nikkud.json': { lang: 'he-IL', name: 'Hebrew' },
      'fr_apee.json': { lang: 'fr-FR', name: 'French' },
    };
    return langMap[translation] || { lang: 'en-US', name: 'English' };
  };

  // Smart voice selection for different languages
  const selectBestVoice = (targetLang, voices) => {
    const langCode = targetLang.split('-')[0]; // Get base language code (e.g., 'zh' from 'zh-CN')
    
    // Different strategies for each language
    switch (langCode) {
      case 'en':
        // English voice selection (existing logic)
        let englishVoice = voices.find(voice =>
          (voice.lang.includes('en-') && voice.name.includes('Enhanced')) ||
          (voice.lang.includes('en-') && voice.name.includes('Premium'))
        );
        if (!englishVoice) {
          englishVoice = voices.find(voice =>
            voice.lang.includes('en-') && voice.name.includes('Google')
          );
        }
        if (!englishVoice) {
          const qualityVoiceNames = ['Daniel', 'Samantha', 'Alex', 'Karen', 'Microsoft David'];
          for (const name of qualityVoiceNames) {
            const foundVoice = voices.find(voice =>
              voice.lang.includes('en-') && voice.name.includes(name)
            );
            if (foundVoice) {
              englishVoice = foundVoice;
              break;
            }
          }
        }
        if (!englishVoice) {
          englishVoice = voices.find(voice => voice.lang.includes('en-'));
        }
        return englishVoice;

      case 'zh':
        // Chinese voice selection
        let chineseVoice;
        if (targetLang.includes('HK') || targetLang.includes('cantonese')) {
          // Prefer Cantonese voices
          chineseVoice = voices.find(voice => 
            voice.lang.includes('zh-HK') || voice.name.toLowerCase().includes('cantonese')
          );
        }
        if (!chineseVoice) {
          // Try Google Chinese voices first
          chineseVoice = voices.find(voice =>
            voice.lang.includes('zh-') && voice.name.includes('Google')
          );
        }
        if (!chineseVoice) {
          // Avoid problematic voices and find quality Chinese voices
          const avoidNames = ['Eddy', 'Grandpa', 'Grandma'];
          chineseVoice = voices.find(voice =>
            voice.lang.includes('zh-') && 
            !avoidNames.some(avoid => voice.name.includes(avoid))
          );
        }
        if (!chineseVoice) {
          // Any Chinese voice as fallback
          chineseVoice = voices.find(voice => voice.lang.includes('zh-'));
        }
        return chineseVoice;

      case 'es':
        // Spanish voice selection
        let spanishVoice = voices.find(voice =>
          voice.lang.includes('es-') && voice.name.includes('Google')
        );
        if (!spanishVoice) {
          spanishVoice = voices.find(voice =>
            voice.lang.includes('es-') && 
            (voice.name.includes('Enhanced') || voice.name.includes('Premium'))
          );
        }
        if (!spanishVoice) {
          const qualitySpanishNames = ['Jorge', 'Maria', 'Diego', 'Paloma'];
          for (const name of qualitySpanishNames) {
            const foundVoice = voices.find(voice =>
              voice.lang.includes('es-') && voice.name.includes(name)
            );
            if (foundVoice) {
              spanishVoice = foundVoice;
              break;
            }
          }
        }
        if (!spanishVoice) {
          spanishVoice = voices.find(voice => voice.lang.includes('es-'));
        }
        return spanishVoice;

      case 'fr':
        // French voice selection
        let frenchVoice = voices.find(voice =>
          voice.lang.includes('fr-') && voice.name.includes('Google')
        );
        if (!frenchVoice) {
          frenchVoice = voices.find(voice =>
            voice.lang.includes('fr-') && 
            (voice.name.includes('Enhanced') || voice.name.includes('Premium'))
          );
        }
        if (!frenchVoice) {
          const qualityFrenchNames = ['Thomas', 'Aurelie', 'Marie'];
          for (const name of qualityFrenchNames) {
            const foundVoice = voices.find(voice =>
              voice.lang.includes('fr-') && voice.name.includes(name)
            );
            if (foundVoice) {
              frenchVoice = foundVoice;
              break;
            }
          }
        }
        if (!frenchVoice) {
          frenchVoice = voices.find(voice => voice.lang.includes('fr-'));
        }
        return frenchVoice;

      case 'ko':
        // Korean voice selection
        let koreanVoice = voices.find(voice =>
          voice.lang.includes('ko-') && voice.name.includes('Google')
        );
        if (!koreanVoice) {
          koreanVoice = voices.find(voice =>
            voice.lang.includes('ko-') && 
            (voice.name.includes('Enhanced') || voice.name.includes('Premium'))
          );
        }
        if (!koreanVoice) {
          koreanVoice = voices.find(voice => voice.lang.includes('ko-'));
        }
        return koreanVoice;

      case 'he':
        // Hebrew voice selection
        let hebrewVoice = voices.find(voice =>
          voice.lang.includes('he-') && voice.name.includes('Google')
        );
        if (!hebrewVoice) {
          hebrewVoice = voices.find(voice =>
            voice.lang.includes('he-') && 
            (voice.name.includes('Enhanced') || voice.name.includes('Premium'))
          );
        }
        if (!hebrewVoice) {
          // Look for specific high-quality Hebrew voices
          const qualityHebrewNames = ['Carmit', 'Lior'];
          for (const name of qualityHebrewNames) {
            const foundVoice = voices.find(voice =>
              voice.lang.includes('he-') && voice.name.includes(name)
            );
            if (foundVoice) {
              hebrewVoice = foundVoice;
              break;
            }
          }
        }
        if (!hebrewVoice) {
          hebrewVoice = voices.find(voice => voice.lang.includes('he-'));
        }
        return hebrewVoice;

      default:
        // Fallback to English
        return voices.find(voice => voice.lang.includes('en-'));
    }
  };

  // Load available voices when component mounts - this is the key difference
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
      console.log("Available voices:", voices.map(v => `${v.name} (${v.lang})`).join(', '));
    };

    // Load voices immediately if available
    loadVoices();
    
    // Also listen for voiceschanged event - this ensures we get all voices
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Get current chapter verses
  const getCurrentVerses = () => {
    if (!rightPaneBibleData || !currentBook || !currentChapter) return [];
    
    const book = rightPaneBibleData.find(b => b.abbrev === currentBook);
    if (!book || !book.chapters || !book.chapters[currentChapter - 1]) return [];
    
    return book.chapters[currentChapter - 1] || [];
  };

  const verses = getCurrentVerses();
  const maxVerses = verses.length;

  // Copy verse to clipboard with gloss prompt
  const copyVerseToClipboard = useCallback(async (verseNumber) => {
    if (!verses[verseNumber - 1]) return;

    const verseText = verses[verseNumber - 1];
    const glossPrompt = "Gloss this KJV Bible passage with brief definitions in parentheses after archaic or unclear words: ";
    const textToCopy = glossPrompt + verseText;

    try {
      await navigator.clipboard.writeText(textToCopy);
      console.log(`✓ Copied verse ${verseNumber} to clipboard for glossing`);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [verses]);

  // Reset selected verse when chapter changes and restart auto-scroll
  useEffect(() => {
    setSelectedVerse(1);
    setAutoScrollRunning(false);
    stopKjvAudio();
    // Clear any existing timer
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, [currentBook, currentChapter]);

  // This effect will be handled later after speakVerse is defined

  // Auto-scroll functionality removed - no longer starts automatically on page load

  // Listen for keyboard navigation events
  useEffect(() => {
    const handleVerseNavigation = (event) => {
      console.log('📖 navigateVerse event received, direction:', event.detail.direction);
      if (event.detail.direction === 'previous' && selectedVerse > 1) {
        const prevVerse = selectedVerse - 1;
        console.log('⬅️ Moving to previous verse:', prevVerse);
        setSelectedVerse(prevVerse);
        // Copy verse to clipboard for glossing
        copyVerseToClipboard(prevVerse);
      } else if (event.detail.direction === 'next' && selectedVerse < maxVerses) {
        const nextVerse = selectedVerse + 1;
        console.log('➡️ Moving to next verse:', nextVerse);
        setSelectedVerse(nextVerse);
        // Copy verse to clipboard for glossing
        copyVerseToClipboard(nextVerse);
      }
    };

    const handleVerseReset = () => {
      setSelectedVerse(1);
    };

    window.addEventListener('navigateVerse', handleVerseNavigation);
    window.addEventListener('resetVerse', handleVerseReset);

    return () => {
      window.removeEventListener('navigateVerse', handleVerseNavigation);
      window.removeEventListener('resetVerse', handleVerseReset);
    };
  }, [selectedVerse, maxVerses, copyVerseToClipboard]);

  // Expose navigation functions to parent component
  useImperativeHandle(ref, () => ({
    goToPreviousVerse: () => {
      if (selectedVerse > 1) {
        const prevVerse = selectedVerse - 1;
        setSelectedVerse(prevVerse);
      }
    },
    goToNextVerse: () => {
      if (selectedVerse < maxVerses) {
        const nextVerse = selectedVerse + 1;
        setSelectedVerse(nextVerse);
      }
    }
  }), [selectedVerse, maxVerses]);

  // Stop current reading when Read to End toggle is turned OFF
  useEffect(() => {
    if (!readToEnd && isSpeaking && currentUtterance) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentUtterance(null);
      setShouldContinueAfterCurrent(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readToEnd]);

  // Stop current reading when Delay Read toggle is turned OFF
  useEffect(() => {
    if (!delayRead && isSpeaking && currentUtterance) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentUtterance(null);
      setShouldContinueAfterCurrent(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayRead]);

  // Stop auto-scroll when toggle is turned OFF
  useEffect(() => {
    if (!autoScroll) {
      stopAutoScroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScroll]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoScrollTimer) {
        clearTimeout(autoScrollTimer);
      }
    };
  }, [autoScrollTimer]);


  // Auto-scroll functions with better timer management
  const startAutoScroll = useCallback(() => {
    // Prevent multiple instances
    if (autoScrollTimer) {
      console.log('Auto-scroll already running, ignoring start request');
      return;
    }
    
    console.log('Starting auto-scroll from verse:', selectedVerse);
    
    let currentTimer = null;
    
    const advanceToNextVerse = () => {
      // Check if auto-scroll is still enabled before proceeding
      if (!autoScrollRef.current) {
        console.log('Auto-scroll disabled, stopping advancement');
        return;
      }
      
      setSelectedVerse(currentVerse => {
        console.log('Auto-scroll: Currently at verse', currentVerse, 'of', maxVerses);
        
        if (currentVerse < maxVerses && autoScrollRef.current) {
          const nextVerse = currentVerse + 1;
          console.log('Auto-scroll: Advancing to verse', nextVerse);
          
          // Calculate timing for the next verse and schedule advancement
          const nextVerseText = verses[nextVerse - 1] || '';
          const smartTiming = calculateVerseTiming(nextVerseText);
          console.log(`Auto-scroll: Verse ${nextVerse} will show for ${smartTiming.toFixed(1)}s (${nextVerseText.split(' ').length} words)`);
          
          // Schedule next advancement
          currentTimer = setTimeout(advanceToNextVerse, smartTiming * 1000);
          setAutoScrollTimer(currentTimer);
          
          return nextVerse;
        } else {
          // Reached end of chapter or auto-scroll disabled, stop
          console.log('Auto-scroll completed - reached end or disabled');
          setAutoScroll(false);
          setAutoScrollTimer(null);
          return currentVerse;
        }
      });
    };
    
    // Start the first advancement using smart timing for current verse
    const currentVerseText = verses[selectedVerse - 1] || '';
    const initialTiming = calculateVerseTiming(currentVerseText);
    console.log(`Auto-scroll: Starting with verse ${selectedVerse} for ${initialTiming.toFixed(1)}s (${currentVerseText.split(' ').length} words)`);
    
    currentTimer = setTimeout(advanceToNextVerse, initialTiming * 1000);
    setAutoScrollTimer(currentTimer);
  }, [selectedVerse, maxVerses, verses, autoScrollTimer, calculateVerseTiming]);

  const stopAutoScroll = useCallback(() => {
    console.log('Stopping auto-scroll');
    if (autoScrollTimer) {
      clearTimeout(autoScrollTimer);
      setAutoScrollTimer(null);
    }
    setAutoScrollRunning(false);
  }, [autoScrollTimer]);

  // Restart auto-scroll from current verse (used when speed changes)
  const restartAutoScrollAtCurrentVerse = useCallback(() => {
    if (autoScrollRunning) {
      console.log('Auto-scroll already running, ignoring restart request');
      return;
    }
    
    setAutoScrollRunning(true);
    console.log('Restarting auto-scroll from verse:', selectedVerse, 'with new speed');
    
    const advanceToNextVerse = () => {
      if (!autoScrollRef.current) {
        console.log('Auto-scroll disabled, stopping advancement');
        setAutoScrollRunning(false);
        return;
      }
      
      setSelectedVerse(currentVerse => {
        console.log('Auto-scroll: Currently at verse', currentVerse, 'of', maxVerses);
        
        if (currentVerse < maxVerses && autoScrollRef.current) {
          const nextVerse = currentVerse + 1;
          console.log('Auto-scroll: Advancing to verse', nextVerse);
          
          const nextVerseText = verses[nextVerse - 1] || '';
          const smartTiming = calculateVerseTiming(nextVerseText);
          console.log(`Auto-scroll: Verse ${nextVerse} will show for ${smartTiming.toFixed(1)}s (${nextVerseText.split(' ').length} words)`);
          
          const timer = setTimeout(advanceToNextVerse, smartTiming * 1000);
          setAutoScrollTimer(timer);
          
          return nextVerse;
        } else {
          console.log('Auto-scroll completed - reached end or disabled');
          setAutoScrollRunning(false);
          setAutoScrollTimer(null);
          return currentVerse;
        }
      });
    };
    
    // Start from current verse with new speed
    const currentVerseText = verses[selectedVerse - 1] || '';
    const initialTiming = calculateVerseTiming(currentVerseText);
    console.log(`Auto-scroll: Continuing with verse ${selectedVerse} for ${initialTiming.toFixed(1)}s (${currentVerseText.split(' ').length} words)`);
    
    const currentTimer = setTimeout(advanceToNextVerse, initialTiming * 1000);
    setAutoScrollTimer(currentTimer);
  }, [selectedVerse, maxVerses, verses, autoScrollRunning, calculateVerseTiming]);

  // Speak the selected verse - now with multilingual support
  const speakVerse = useCallback((verseNumber = selectedVerse) => {
    console.log('speakVerse called with verse:', verseNumber);
    console.log('📖 TTS reading from book:', currentBook, '| chapter:', currentChapter, '| translation:', rightPaneTranslation);
    console.log('verses available:', verses.length);
    console.log('isSpeaking:', isSpeaking);
    
    if (!verses[verseNumber - 1] || isSpeaking) return;

    const verseText = cleanTextForTTS(verses[verseNumber - 1]);
    console.log('verseText to speak:', verseText);
    if (!verseText) return;

    // Check if speechSynthesis is available
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Stop any current speech only if actually speaking
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      // Add a small delay to ensure cancellation completes
      setTimeout(() => {
        speakVerse(verseNumber);
      }, 100);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(verseText);
    
    // Get the target language based on the selected translation
    const languageInfo = getLanguageFromTranslation(rightPaneTranslation || 'en_kjv.json');
    utterance.lang = languageInfo.lang;
    
    // Set speech rate based on language
    if (languageInfo.lang.startsWith('he-')) {
      utterance.rate = 0.5; // Slower rate for Hebrew
    } else if (languageInfo.lang.startsWith('en-')) {
      utterance.rate = 0.9; // Faster rate for English
    } else {
      utterance.rate = 0.7; // Default rate for other languages
    }
    
    // Set volume based on user preference
    utterance.volume = speechVolume === 'softer' ? 0.4 : 1.0;
    
    const voices = availableVoices; // Use the loaded voices state
    
    // Use the smart voice selection for the target language
    const selectedVoice = selectBestVoice(languageInfo.lang, voices);

    if (selectedVoice) {
      console.log(`Using ${languageInfo.name} voice: ${selectedVoice.name} (${selectedVoice.lang}) for translation: ${rightPaneTranslation}`);
      utterance.voice = selectedVoice;
    } else {
      console.warn(`No suitable voice found for ${languageInfo.name} (${languageInfo.lang}), using default voice`);
    }

    utterance.onstart = () => {
      console.log('Speech started successfully');
      setIsSpeaking(true);
      setCurrentUtterance(utterance);
    };
    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
      setCurrentUtterance(null);
      // Auto-increment to next verse after reading current verse
      // This happens whether Read2End is on or just clicked Read button
      if (verseNumber < maxVerses) {
        const nextVerse = verseNumber + 1;
        setSelectedVerse(nextVerse);
        setShouldContinueAfterCurrent(false); // Reset the flag
        
        // Check if we should continue reading more verses (for 5-verse reading)
        setVersesLeftToRead(prev => {
          const remaining = prev - 1;
          if (remaining > 0 && nextVerse <= maxVerses) {
            // Continue reading with 1 second delay
            setTimeout(() => speakVerse(nextVerse), 1000);
          }
          return Math.max(0, remaining);
        });
        
        // If Read2End or DelayRead is enabled, continue reading the next verse
        if (readToEndRef.current || delayReadRef.current || shouldContinueRef.current) {
          // Use 7-second delay for DelayRead mode, otherwise small delay
          const delayTime = delayReadRef.current ? 7000 : 500;
          setTimeout(() => speakVerse(nextVerse), delayTime);
        }
      }
    };
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setCurrentUtterance(null);
    };

    console.log('About to call speechSynthesis.speak()');
    console.log('speechSynthesis.speaking:', speechSynthesis.speaking);
    console.log('speechSynthesis.pending:', speechSynthesis.pending);
    
    // Set speaking state immediately since browser events might be unreliable
    setIsSpeaking(true);
    setCurrentUtterance(utterance);
    
    speechSynthesis.speak(utterance);
    
    console.log('speechSynthesis.speak() called');
    console.log('speechSynthesis.speaking after call:', speechSynthesis.speaking);
    console.log('speechSynthesis.pending after call:', speechSynthesis.pending);
    
    // Check if speech actually started after a short delay
    setTimeout(() => {
      console.log('Checking speech status after 100ms:');
      console.log('speechSynthesis.speaking:', speechSynthesis.speaking);
      if (!speechSynthesis.speaking) {
        console.log('Speech failed to start, resetting state');
        setIsSpeaking(false);
        setCurrentUtterance(null);
      }
    }, 100);
  }, [selectedVerse, verses, isSpeaking, rightPaneTranslation, availableVoices, maxVerses, readToEndRef, shouldContinueRef, setIsSpeaking, setCurrentUtterance, setSelectedVerse, setShouldContinueAfterCurrent, speechVolume]);

  // Handle DelayRead auto-start after speakVerse is defined
  useEffect(() => {
    // If DelayRead is ON when chapter changes, automatically start reading the new chapter
    if (delayRead && verses.length > 0 && selectedVerse === 1) {
      const timer = setTimeout(() => {
        speakVerse(1);
      }, 500); // Small delay to ensure chapter content is loaded
      
      return () => clearTimeout(timer);
    }
  }, [currentBook, currentChapter, delayRead, verses.length, selectedVerse, speakVerse]);

  // Move to next verse and read it
  const nextVerseAndRead = useCallback(() => {
    if (selectedVerse < maxVerses) {
      const nextVerse = selectedVerse + 1;
      setSelectedVerse(nextVerse);
      // Small delay to ensure state updates before speaking
      setTimeout(() => speakVerse(nextVerse), 100);
    }
  }, [selectedVerse, maxVerses, speakVerse, setSelectedVerse]);

  // Scroll to next verse without reading
  const scrollToNextVerse = useCallback(() => {
    if (selectedVerse < maxVerses) {
      const nextVerse = selectedVerse + 1;
      setSelectedVerse(nextVerse);
      // Copy verse to clipboard for glossing
      copyVerseToClipboard(nextVerse);
    }
  }, [selectedVerse, maxVerses, setSelectedVerse, copyVerseToClipboard]);


  // Stop current speech
  const stopSpeaking = useCallback(() => {
    console.log('stopSpeaking called');
    speechSynthesis.cancel();
    
    // Force immediate state reset
    setTimeout(() => {
      setIsSpeaking(false);
      setCurrentUtterance(null);
      setShouldContinueAfterCurrent(false);
      console.log('Speech stopped, state reset');
    }, 0);
  }, [setIsSpeaking, setCurrentUtterance, setShouldContinueAfterCurrent]);

  // Read current verse without incrementing
  const repeatCurrentVerse = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      // Create a custom speakVerse that doesn't increment
      const speakCurrentVerseOnly = (verseNumber = selectedVerse) => {
        console.log('repeatCurrentVerse called with verse:', verseNumber);
        
        if (!verses[verseNumber - 1] || isSpeaking) return;

        const verseText = cleanTextForTTS(verses[verseNumber - 1]);
        if (!verseText) return;

        if (!('speechSynthesis' in window)) {
          console.error('Speech synthesis not supported');
          return;
        }

        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
          setTimeout(() => {
            speakCurrentVerseOnly(verseNumber);
          }, 100);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(verseText);
        
        const languageInfo = getLanguageFromTranslation(rightPaneTranslation || 'en_kjv.json');
        utterance.lang = languageInfo.lang;
        
        if (languageInfo.lang.startsWith('he-')) {
          utterance.rate = 0.5;
        } else if (languageInfo.lang.startsWith('en-')) {
          utterance.rate = 0.9;
        } else {
          utterance.rate = 0.7;
        }
        
        // Set volume based on user preference
        utterance.volume = speechVolume === 'softer' ? 0.4 : 1.0;
        
        const selectedVoice = selectBestVoice(languageInfo.lang, availableVoices);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setCurrentUtterance(utterance);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setCurrentUtterance(null);
          // Don't increment verse - this is the key difference
        };
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          setIsSpeaking(false);
          setCurrentUtterance(null);
        };

        setIsSpeaking(true);
        setCurrentUtterance(utterance);
        speechSynthesis.speak(utterance);
      };
      
      speakCurrentVerseOnly();
    }
  }, [selectedVerse, verses, isSpeaking, rightPaneTranslation, availableVoices, stopSpeaking, setIsSpeaking, setCurrentUtterance, speechVolume]);

  // Listen for read current verse events
  useEffect(() => {
    const handleReadCurrentVerse = () => {
      // Only start reading if not already speaking
      if (!isSpeaking) {
        speakVerse();
      }
    };

    window.addEventListener('readCurrentVerse', handleReadCurrentVerse);

    return () => {
      window.removeEventListener('readCurrentVerse', handleReadCurrentVerse);
    };
  }, [isSpeaking, speakVerse]);

  // Listen for readFullChapter event - starts from verse 1, reads to end
  useEffect(() => {
    const handleReadFullChapter = () => {
      if (isSpeaking) {
        // If already speaking, stop
        stopSpeaking();
        setReadToEnd(false);
      } else {
        // Start from verse 1, enable readToEnd
        setSelectedVerse(1);
        setReadToEnd(true);
        setDelayRead(false);
        setTimeout(() => speakVerse(1), 100);
      }
    };

    window.addEventListener('readFullChapter', handleReadFullChapter);
    return () => window.removeEventListener('readFullChapter', handleReadFullChapter);
  }, [isSpeaking, speakVerse, stopSpeaking]);

  // Function to speak book and chapter
  const speakBookAndChapter = useCallback((book, chapter) => {
    if (!book || !chapter) return;

    // Get book name from abbreviation
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
        'ge': 'Genesis'
      };
      return bookNames[abbrev] || abbrev;
    };

    const bookName = book.book || getBookName(book.abbrev);
    const text = `${bookName} Chapter ${chapter}`;

    // Check if speechSynthesis is available
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Stop any current speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get the target language based on the selected translation
    const languageInfo = getLanguageFromTranslation(rightPaneTranslation || 'en_kjv.json');
    utterance.lang = languageInfo.lang;
    
    // Set speech rate based on language
    if (languageInfo.lang.startsWith('he-')) {
      utterance.rate = 0.5;
    } else if (languageInfo.lang.startsWith('en-')) {
      utterance.rate = 0.9;
    } else {
      utterance.rate = 0.7;
    }
    
    // Set volume based on user preference
    utterance.volume = speechVolume === 'softer' ? 0.4 : 1.0;
    
    // Use the smart voice selection for the target language
    const selectedVoice = selectBestVoice(languageInfo.lang, availableVoices);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
    };

    speechSynthesis.speak(utterance);
  }, [availableVoices, rightPaneTranslation, speechVolume]);

  // Listen for stop speech events
  useEffect(() => {
    const handleStopSpeech = () => {
      if (isSpeaking) {
        stopSpeaking();
      }
    };

    window.addEventListener('stopSpeech', handleStopSpeech);
    
    return () => {
      window.removeEventListener('stopSpeech', handleStopSpeech);
    };
  }, [isSpeaking, stopSpeaking]);

  // Listen for speak book/chapter events
  useEffect(() => {
    const handleSpeakBookChapter = (event) => {
      const { book, chapter } = event.detail;
      if (book && chapter) {
        speakBookAndChapter(book, chapter);
      }
    };

    window.addEventListener('speakBookChapter', handleSpeakBookChapter);
    
    return () => {
      window.removeEventListener('speakBookChapter', handleSpeakBookChapter);
    };
  }, [speakBookAndChapter]);


  // Function to speak verse number
  const speakVerseNumber = useCallback((verseNumber) => {
    if (!verseNumber) return;

    const text = `Verse ${verseNumber}`;

    // Check if speechSynthesis is available
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Stop any current speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get the target language based on the selected translation
    const languageInfo = getLanguageFromTranslation(rightPaneTranslation || 'en_kjv.json');
    utterance.lang = languageInfo.lang;
    
    // Set speech rate based on language
    if (languageInfo.lang.startsWith('he-')) {
      utterance.rate = 0.5;
    } else if (languageInfo.lang.startsWith('en-')) {
      utterance.rate = 0.9;
    } else {
      utterance.rate = 0.7;
    }
    
    // Set volume based on user preference
    utterance.volume = speechVolume === 'softer' ? 0.4 : 1.0;
    
    // Use the smart voice selection for the target language
    const selectedVoice = selectBestVoice(languageInfo.lang, availableVoices);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
    };

    speechSynthesis.speak(utterance);
  }, [availableVoices, rightPaneTranslation, speechVolume]);

  // Listen for speak verse number events
  useEffect(() => {
    const handleSpeakVerseNumber = (event) => {
      const { verseNumber } = event.detail;
      if (verseNumber) {
        speakVerseNumber(verseNumber);
      }
    };

    window.addEventListener('speakVerseNumber', handleSpeakVerseNumber);
    
    return () => {
      window.removeEventListener('speakVerseNumber', handleSpeakVerseNumber);
    };
  }, [speakVerseNumber]);

  // Part-by-part reading: split verse by punctuation and read one segment per click
  // Uses refs to avoid stale closure issues with speechSynthesis.cancel() triggering onend
  const speakNextPart = useCallback(() => {
    if (!lastGridVerse) return;

    // Determine verse text and language based on current right pane translation
    let verseText = null;
    const languageInfo = getLanguageFromTranslation(rightPaneTranslation || 'en_kjv.json');
    const isChinese = (rightPaneTranslation || '').includes('zh_');

    if (isChinese && chineseBibleData) {
      const chBook = chineseBibleData.find(b => b.abbrev === currentBook);
      const chVerses = chBook && chBook.chapters[(currentChapter || 1) - 1] ? chBook.chapters[(currentChapter || 1) - 1] : [];
      verseText = chVerses[lastGridVerse - 1];
    }
    if (!verseText && rightPaneBibleData) {
      const book = rightPaneBibleData.find(b => b.abbrev === currentBook);
      const rpVerses = book && book.chapters[(currentChapter || 1) - 1] ? book.chapters[(currentChapter || 1) - 1] : [];
      verseText = rpVerses[lastGridVerse - 1];
    }
    if (!verseText) return;

    const verseKey = `${currentBook}-${currentChapter}-${lastGridVerse}-${rightPaneTranslation}`;

    // If verse or translation changed, split into parts and reset
    if (verseKey !== partVerseKeyRef.current || partPartsRef.current.length === 0) {
      let parts;
      if (isChinese) {
        parts = verseText.split(/(?<=[，、。！？；：\n])/).map(s => s.trim()).filter(s => s.length > 0);
      } else {
        parts = verseText.split(/(?<=[,;:.!?\n])/).map(s => s.trim()).filter(s => s.length > 0);
      }
      if (parts.length === 0) parts = [verseText];
      partPartsRef.current = parts;
      partIndexRef.current = 0;
      partVerseKeyRef.current = verseKey;
    }

    // If we've read all parts, loop back to start
    if (partIndexRef.current >= partPartsRef.current.length) {
      partIndexRef.current = 0;
    }

    const segment = partPartsRef.current[partIndexRef.current];

    // Advance index immediately (before speech, so next click gets next part)
    partIndexRef.current += 1;

    // Stop any current speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(segment);
    utterance.lang = languageInfo.lang;
    if (languageInfo.lang.startsWith('he-')) {
      utterance.rate = 0.5;
    } else if (languageInfo.lang.startsWith('en-')) {
      utterance.rate = 0.9;
    } else {
      utterance.rate = 0.7;
    }
    utterance.volume = speechVolume === 'softer' ? 0.4 : 1.0;

    const voice = selectBestVoice(languageInfo.lang, availableVoices);
    if (voice) {
      utterance.voice = voice;
    }

    speechSynthesis.speak(utterance);
  }, [chineseBibleData, rightPaneBibleData, lastGridVerse, currentBook, currentChapter, rightPaneTranslation, availableVoices, speechVolume]);

  if (!verses.length) return null;

  // Get current language info for UI display
  const currentLanguageInfo = getLanguageFromTranslation(rightPaneTranslation || 'en_kjv.json');

  return (
    <div className="flex items-center gap-2">
      {/* Go/Copy mode toggle - always shows "Go" label */}
      <button
        onClick={() => {
          const next = chineseAction === 'copy' ? 'go' : 'copy';
          setChineseAction(next);
          localStorage.setItem('bibleAppChineseAction', next);
        }}
        className={`px-2 py-0.5 rounded focus:outline-none flex items-center text-xs ${
          chineseAction === 'go'
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
        }`}
        title={chineseAction === 'go' ? 'Go mode: opens verse in MDBG dictionary (click to switch to Copy)' : 'Copy mode: copies verse to clipboard (click to switch to Go)'}
      >
        Go
      </button>

      {/* Upper - always visible, copies upper half of stored verse */}
      <button
        onClick={async () => {
          const chBook = chineseBibleData ? chineseBibleData.find(b => b.abbrev === currentBook) : null;
          const chVerses = chBook && chBook.chapters[(currentChapter || 1) - 1] ? chBook.chapters[(currentChapter || 1) - 1] : [];
          const idx = lastGridVerse ? lastGridVerse - 1 : 0;
          const text = chVerses[idx];
          if (text) {
            const copyText = text.slice(0, 20);
            if (copyText) {
              try { await navigator.clipboard.writeText(copyText); } catch (err) { console.warn('Clipboard write failed:', err); }
            }
          }
        }}
        className="px-2 py-0.5 rounded focus:outline-none text-xs font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200"
        title="Upper: copies first ~20 chars of last selected verse"
      >
        Upper
      </button>

      {/* Lower - always visible, copies lower half of stored verse then advances chapter */}
      <button
        onClick={async () => {
          const chBook = chineseBibleData ? chineseBibleData.find(b => b.abbrev === currentBook) : null;
          const chVerses = chBook && chBook.chapters[(currentChapter || 1) - 1] ? chBook.chapters[(currentChapter || 1) - 1] : [];
          const idx = lastGridVerse ? lastGridVerse - 1 : 0;
          const text = chVerses[idx];
          if (text) {
            const copyText = text.length > 20 ? text.slice(20) : '';
            if (copyText) {
              try { await navigator.clipboard.writeText(copyText); } catch (err) { console.warn('Clipboard write failed:', err); }
            }
          }
          if (onNextChapter) onNextChapter();
        }}
        className="px-2 py-0.5 rounded focus:outline-none text-xs font-semibold bg-teal-100 text-teal-700 hover:bg-teal-200"
        title="Lower: copies from char 20 onward of last selected verse"
      >
        Lower
      </button>

      {/* QA button - opens study questions in pane 2 */}
      <button
        onClick={() => onQA && onQA()}
        className={`px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showStudyQModal ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
        title="Study discussion questions for current chapter"
      >
        QA
      </button>

      {/* Fill-in-the-Blank Quiz Button */}
      <button
        onClick={() => onQuiz && onQuiz()}
        className={`px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showQuizModal ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white hover:bg-rose-600'}`}
        title="Fill-in-the-blank quiz for current chapter"
      >
        Quiz
      </button>

      {/* Recite Quiz Button */}
      <button
        onClick={() => onQuiz2 && onQuiz2()}
        className={`px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showQuiz2Modal ? 'bg-rose-700 text-white' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
        title="Recite verses from memory and get graded"
      >
        Recite
      </button>


      {/* Cursive Writing Button */}
      <button
        onClick={() => onCursive && onCursive()}
        className={`px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showCursiveModal ? 'bg-amber-700 text-white' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
        title="Cursive writing animation for verses"
      >
        Cursive
      </button>

      {/* Breathe Button */}
      <button
        onClick={() => onBreathe && onBreathe()}
        className={`px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${showBreatheModal ? 'bg-slate-700 text-white' : 'bg-slate-600 text-white hover:bg-slate-700'}`}
        title="Breathing exercise timer"
      >
        br_
      </button>

      {/* To:TextR link button */}
      <a
        href="https://vercel-text-to-speech.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="px-2 py-0.5 rounded focus:outline-none text-xs bg-blue-500 text-white hover:bg-blue-600 font-semibold"
        title="Open Text-to-Speech app"
      >
        Go:TextR
      </a>

      {/* OpenAI API Key button */}
      <button
        onClick={handleOaiKey}
        className="px-2 py-0.5 rounded focus:outline-none text-xs font-semibold bg-gray-500 text-white hover:bg-gray-600"
        title="Set OpenAI API key for TTS"
      >
        Key
      </button>

      {/* OpenAI TTS Read button (Onyx voice, verse by verse) */}
      <button
        onClick={handleOpenAiRead}
        className={`px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${oaiTtsPlaying ? 'bg-red-500 text-white hover:bg-red-600' : oaiTtsLoading ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        title={oaiTtsPlaying ? 'Stop reading' : 'Read chapter verse by verse with OpenAI Onyx voice'}
      >
        {oaiTtsLoading ? '...' : oaiTtsPlaying ? 'Stop' : 'Read'}
      </button>

      {/* KJV Audio Read button */}
      <button
        onClick={handleKjvRead}
        className={`px-2 py-0.5 rounded focus:outline-none text-xs font-semibold ${kjvPlaying ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-amber-700 text-white hover:bg-amber-800'}`}
        title={kjvPlaying ? 'Stop KJV audio' : 'Play KJV audio for this chapter'}
      >
        {kjvPlaying ? 'Stop' : 'Read:KJV'}
      </button>

      {/* Chapters to Clipboard button */}
      <button
        onClick={() => setShowChaptersClipboardModal(true)}
        className="ml-1 px-2 py-0.5 rounded focus:outline-none text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600"
        title="Copy chapters of current book to clipboard"
      >
        Chp📋
      </button>

      {/* Chapters to Clipboard Modal */}
      {showChaptersClipboardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowChaptersClipboardModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3 dark:text-white">Copy Chapters to Clipboard</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Enter chapter range for current book (e.g. "1-10" or "3-5")
            </p>
            <input
              type="text"
              value={chaptersRange}
              onChange={e => setChaptersRange(e.target.value)}
              placeholder="e.g. 1-10"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  document.getElementById('chaptersClipboardBtn').click();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowChaptersClipboardModal(false); setChaptersRange(''); }}
                className="px-3 py-1.5 rounded text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
              >
                Cancel
              </button>
              <button
                id="chaptersClipboardBtn"
                onClick={async () => {
                  const range = chaptersRange.trim();
                  if (!range) return;
                  const match = range.match(/^(\d+)\s*-\s*(\d+)$/);
                  if (!match) { alert('Please enter a valid range like "1-10"'); return; }
                  const start = parseInt(match[1]);
                  const end = parseInt(match[2]);
                  if (start < 1 || end < start) { alert('Invalid range'); return; }
                  const book = rightPaneBibleData ? rightPaneBibleData.find(b => b.abbrev === currentBook) : null;
                  if (!book) { alert('Book not found'); return; }
                  let text = `${book.name || book.abbrev}\n\n`;
                  for (let ch = start; ch <= end; ch++) {
                    const verses = book.chapters[ch - 1];
                    if (!verses) continue;
                    text += `Chapter ${ch}\n`;
                    verses.forEach((v, i) => {
                      const verseText = typeof v === 'string' ? v : (v.text || v.verse || String(v));
                      text += `${i + 1}. ${verseText.replace(/\{[^}]*\}/g, '').trim()}\n`;
                    });
                    text += '\n';
                  }
                  try {
                    await navigator.clipboard.writeText(text.trim());
                    setShowChaptersClipboardModal(false);
                    setChaptersRange('');
                  } catch (err) {
                    alert('Failed to copy to clipboard');
                  }
                }}
                className="px-3 py-1.5 rounded text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600"
              >
                To Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Part-by-part reading button - hidden, functionality moved to grid clicks */}

      {/* Chinese Verse Copy Dropdown */}
      {(() => {
        const chBook = chineseBibleData ? chineseBibleData.find(b => b.abbrev === currentBook) : null;
        const chVerses = chBook && chBook.chapters[(currentChapter || 1) - 1] ? chBook.chapters[(currentChapter || 1) - 1] : [];
        if (!chVerses.length) return null;
        return (
          <select
            defaultValue=""
            onChange={async (e) => {
              const idx = parseInt(e.target.value);
              if (isNaN(idx)) return;
              const text = chVerses[idx];
              if (text) {
                if (chineseAction === 'go') {
                  const encoded = encodeURIComponent(text);
                  window.open(`https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqtm=0&wdqcham=1&wdqt=${encoded}`, '_blank');
                } else {
                  // Store verse index, reset to upper, and copy upper half
                  setLastChineseVerseIdx(idx);
                  setChineseHalf('upper');
                  localStorage.setItem('bibleAppChineseHalf', 'upper');
                  const copyText = text.slice(0, 20);
                  if (copyText) {
                    try {
                      await navigator.clipboard.writeText(copyText);
                    } catch (err) {
                      console.warn('Clipboard write failed:', err);
                    }
                  }
                }
              }
              e.target.value = '';
            }}
            className="hidden"
            title={chineseAction === 'go' ? "Select a Chinese verse to look up in MDBG dictionary" : "Select a Chinese verse to copy to clipboard"}
          >
            <option value="" disabled>Ch</option>
            {chVerses.map((_, i) => (
              <option key={i} value={i}>{i + 1}</option>
            ))}
          </select>
        );
      })()}

      {/* Verse Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="hidden"
          title={`Select verse to read in ${currentLanguageInfo.name}`}
        >
          Verse {selectedVerse}
          <ChevronDown className="w-3 h-3 ml-1" />
        </button>
        
        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
            {verses.map((_, index) => {
              const verseNumber = index + 1;
              return (
                <button
                  key={verseNumber}
                  onClick={() => {
                    setSelectedVerse(verseNumber);
                    setIsDropdownOpen(false);
                    // Copy verse to clipboard for glossing
                    copyVerseToClipboard(verseNumber);
                  }}
                  className={`block w-full text-left px-3 py-1 text-xs hover:bg-gray-100 ${
                    selectedVerse === verseNumber ? 'bg-purple-50 text-purple-700' : ''
                  }`}
                >
                  Verse {verseNumber}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll to Next Verse Button */}
      <button
        onClick={scrollToNextVerse}
        disabled={selectedVerse >= maxVerses}
        className="hidden"
        title="Scroll to next verse"
      >
        <ChevronRight className="w-3 h-3 mr-1" />
        Scroll
      </button>

      {/* Speak Button */}
      <button
        onClick={() => {
          console.log('Read button clicked, isSpeaking:', isSpeaking);
          if (isSpeaking) {
            stopSpeaking();
          } else {
            // Set up to read 5 verses starting from current verse
            setVersesLeftToRead(5);
            speakVerse();
          }
        }}
        className="hidden"
        title={isSpeaking ? "Stop reading" : `Read 5 verses continuously in ${currentLanguageInfo.name}`}
      >
        <Play className="w-3 h-3 mr-1" />
        {isSpeaking ? 'Stop' : 'Read'}
      </button>

      {/* Next Verse Button - Hidden */}
      <button
        onClick={nextVerseAndRead}
        disabled={selectedVerse >= maxVerses || isSpeaking}
        className="hidden"
        title="Move to next verse and read it"
      >
        <SkipForward className="w-3 h-3 mr-1" />
        Next
      </button>

      {/* Repeat Current Verse Button */}
      <button
        onClick={repeatCurrentVerse}
        className="hidden"
        title={isSpeaking ? "Stop reading" : `Repeat selected verse in ${currentLanguageInfo.name}`}
      >
        <Play className="w-3 h-3 mr-1" />
        {isSpeaking ? 'Stop' : 'Repeat'}
      </button>

      {/* Delay Read Toggle Button - Hidden */}
      <button
        onClick={() => {
          // Turn off ReadToEnd if it's on when enabling DelayRead
          if (!delayRead && readToEnd) {
            setReadToEnd(false);
          }
          
          // If currently speaking and toggle is OFF, turn it ON and set flag to continue
          if (isSpeaking && !delayRead) {
            setDelayRead(true);
            setShouldContinueAfterCurrent(true);
          } else {
            const newDelayReadState = !delayRead;
            setDelayRead(newDelayReadState);
            
            // If toggling ON and not currently speaking, trigger Read button after 100ms
            if (newDelayReadState && !isSpeaking) {
              setTimeout(() => {
                speakVerse();
              }, 100);
            }
          }
        }}
        className="hidden"
        title={`Delay Read (7s between verses) is ${delayRead ? 'ON' : 'OFF'} - Click to toggle`}
      >
        DelayRead {delayRead ? 'ON' : 'OFF'}
      </button>

      {/* Read to End Toggle Button - Hidden */}
      <button
        onClick={() => {
          // Turn off DelayRead if it's on when enabling ReadToEnd
          if (!readToEnd && delayRead) {
            setDelayRead(false);
          }
          
          // If currently speaking and toggle is OFF, turn it ON and set flag to continue
          if (isSpeaking && !readToEnd) {
            setReadToEnd(true);
            setShouldContinueAfterCurrent(true);
          } else {
            const newReadToEndState = !readToEnd;
            setReadToEnd(newReadToEndState);
            
            // If toggling ON and not currently speaking, trigger Read button after 100ms
            if (newReadToEndState && !isSpeaking) {
              setTimeout(() => {
                speakVerse();
              }, 100);
            }
          }
        }}
        className="hidden"
        title={`Read to end is ${readToEnd ? 'ON' : 'OFF'} - Click to toggle or press '/' key`}
      >
        Read2End(/) {readToEnd ? 'ON' : 'OFF'}
      </button>
      {/* TTS Settings Modal */}
      {showTtsModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 50000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTtsModal(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 360, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>TTS Settings</h3>
              <button onClick={() => setShowTtsModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>&times;</button>
            </div>

            {/* Provider radio buttons */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, color: '#555' }}>Provider</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0' }}>
                <input
                  type="radio"
                  name="ttsProvider"
                  value="openai"
                  checked={ttsProvider === 'openai'}
                  onChange={() => { setTtsProvider('openai'); localStorage.setItem('TTS_PROVIDER', 'openai'); }}
                  style={{ accentColor: '#be185d' }}
                />
                <span style={{ fontSize: '0.85rem' }}>OpenAI (Onyx voice)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0', opacity: 0.5 }}>
                <input type="radio" name="ttsProvider" value="browser" checked={ttsProvider === 'browser'} onChange={() => { setTtsProvider('browser'); localStorage.setItem('TTS_PROVIDER', 'browser'); }} style={{ accentColor: '#be185d' }} />
                <span style={{ fontSize: '0.85rem' }}>Browser (free, built-in)</span>
              </label>
            </div>

            {/* API Key input (only for OpenAI) */}
            {ttsProvider === 'openai' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#555' }}>OpenAI API Key</div>
                <input
                  type="password"
                  defaultValue={localStorage.getItem('OPENAI_API_KEY') || ''}
                  placeholder="sk-..."
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    try {
                      if (val) localStorage.setItem('OPENAI_API_KEY', val);
                      else localStorage.removeItem('OPENAI_API_KEY');
                    } catch {}
                  }}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: '0.7rem', color: '#999', marginTop: 4 }}>Stored in localStorage. Leave blank to clear.</div>
              </div>
            )}

            <button
              onClick={() => setShowTtsModal(false)}
              style={{ width: '100%', padding: '10px', fontSize: '0.9rem', fontWeight: 600, background: '#be185d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default TextToSpeech;