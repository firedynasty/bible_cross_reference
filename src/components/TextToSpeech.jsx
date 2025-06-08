import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Play, SkipForward } from 'lucide-react';

const TextToSpeech = ({ rightPaneBibleData, currentBook, currentChapter, rightPaneTranslation }) => {
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [readToEnd, setReadToEnd] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState(null);
  const [shouldContinueAfterCurrent, setShouldContinueAfterCurrent] = useState(false);
  
  // Use refs to access current values in closures
  const readToEndRef = useRef(readToEnd);
  const shouldContinueRef = useRef(shouldContinueAfterCurrent);
  
  // Keep refs in sync with state
  useEffect(() => {
    readToEndRef.current = readToEnd;
  }, [readToEnd]);
  
  useEffect(() => {
    shouldContinueRef.current = shouldContinueAfterCurrent;
  }, [shouldContinueAfterCurrent]);

  // Language detection based on Bible translation
  const getLanguageFromTranslation = (translation) => {
    const langMap = {
      'en_kjv.json': { lang: 'en-US', name: 'English' },
      'en_bbe.json': { lang: 'en-US', name: 'English' },
      'zh_cuv_cantonese.json': { lang: 'zh-HK', name: 'Cantonese' },
      'zh_cuv_chinese.json': { lang: 'zh-CN', name: 'Chinese' },
      'es_rvr.json': { lang: 'es-ES', name: 'Spanish' },
      'fr_apee.json': { lang: 'fr-FR', name: 'French' },
      'ko_ko.json': { lang: 'ko-KR', name: 'Korean' },
      'he_heb_no_strong.json': { lang: 'he-IL', name: 'Hebrew' },
      'he_heb_strong.json': { lang: 'he-IL', name: 'Hebrew' }
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

  // Reset selected verse when chapter changes
  useEffect(() => {
    setSelectedVerse(1);
  }, [currentBook, currentChapter]);

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

  // Clean text for TTS (remove annotations in curly braces and parentheses)
  const cleanTextForTTS = (text) => {
    if (!text) return '';
    // Remove both curly braces and parentheses like the reference app
    return text.replace(/\{[^}]*\}/g, '').replace(/[()]/g, '').trim();
  };

  // Speak the selected verse - now with multilingual support
  const speakVerse = (verseNumber = selectedVerse) => {
    if (!verses[verseNumber - 1] || isSpeaking) return;

    const verseText = cleanTextForTTS(verses[verseNumber - 1]);
    if (!verseText) return;

    // Stop any current speech
    speechSynthesis.cancel();

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
      setIsSpeaking(true);
      setCurrentUtterance(utterance);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentUtterance(null);
      // Use refs to get current values, not closure values
      // This ensures the toggle can stop auto-reading mid-stream
      // Also check shouldContinueAfterCurrent for mid-speech toggle activation
      if ((readToEndRef.current || shouldContinueRef.current) && verseNumber < maxVerses) {
        const nextVerse = verseNumber + 1;
        setSelectedVerse(nextVerse);
        setShouldContinueAfterCurrent(false); // Reset the flag
        // Small delay before reading next verse
        setTimeout(() => speakVerse(nextVerse), 500);
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentUtterance(null);
    };

    speechSynthesis.speak(utterance);
  };

  // Move to next verse and read it
  const nextVerseAndRead = () => {
    if (selectedVerse < maxVerses) {
      const nextVerse = selectedVerse + 1;
      setSelectedVerse(nextVerse);
      // Small delay to ensure state updates before speaking
      setTimeout(() => speakVerse(nextVerse), 100);
    }
  };

  // Stop current speech
  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setCurrentUtterance(null);
    setShouldContinueAfterCurrent(false);
  };

  // Copy verse to clipboard
  const copyVerseToClipboard = async (verseNumber) => {
    if (!verses[verseNumber - 1]) return;
    
    const verseText = verses[verseNumber - 1];
    const bookName = rightPaneBibleData?.find(b => b.abbrev === currentBook)?.name || currentBook;
    const formattedText = `${bookName} ${currentChapter}:${verseNumber} - ${verseText}`;
    
    try {
      await navigator.clipboard.writeText(formattedText);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (!verses.length) return null;

  // Get current language info for UI display
  const currentLanguageInfo = getLanguageFromTranslation(rightPaneTranslation || 'en_kjv.json');

  return (
    <div className="flex items-center gap-2">
      {/* Verse Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="px-2 py-0.5 rounded focus:outline-none bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center text-xs"
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
                    // Copy verse to clipboard
                    copyVerseToClipboard(verseNumber);
                    // Automatically read the selected verse after a short delay
                    setTimeout(() => speakVerse(verseNumber), 100);
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

      {/* Speak Button */}
      <button
        onClick={() => isSpeaking ? stopSpeaking() : speakVerse()}
        className={`px-2 py-0.5 rounded focus:outline-none flex items-center text-xs ${
          isSpeaking 
            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
        title={isSpeaking ? "Stop reading" : `Read selected verse in ${currentLanguageInfo.name}`}
      >
        <Play className="w-3 h-3 mr-1" />
        {isSpeaking ? 'Stop' : 'Read'}
      </button>

      {/* Next Verse Button */}
      <button
        onClick={nextVerseAndRead}
        disabled={selectedVerse >= maxVerses || isSpeaking}
        className={`px-2 py-0.5 rounded focus:outline-none flex items-center text-xs ${
          selectedVerse >= maxVerses || isSpeaking
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
        title="Move to next verse and read it"
      >
        <SkipForward className="w-3 h-3 mr-1" />
        Next
      </button>

      {/* Read to End Toggle Button */}
      <button
        onClick={() => {
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
        className={`px-2 py-0.5 rounded focus:outline-none flex items-center text-xs transition-colors ${
          readToEnd 
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-400 text-gray-700 hover:bg-gray-500'
        }`}
        title={`Read to end is ${readToEnd ? 'ON' : 'OFF'} - Click to toggle or press '/' key`}
      >
        Read2End(/) {readToEnd ? 'ON' : 'OFF'}
      </button>
    </div>
  );
};

export default TextToSpeech;