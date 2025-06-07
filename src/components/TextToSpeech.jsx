import React, { useState, useEffect } from 'react';
import { ChevronDown, Play, SkipForward, BookOpen } from 'lucide-react';

const TextToSpeech = ({ rightPaneBibleData, currentBook, currentChapter }) => {
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [readToEnd, setReadToEnd] = useState(false);

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

  // Clean text for TTS (remove annotations in curly braces and parentheses)
  const cleanTextForTTS = (text) => {
    if (!text) return '';
    // Remove both curly braces and parentheses like the reference app
    return text.replace(/\{[^}]*\}/g, '').replace(/[()]/g, '').trim();
  };

  // Speak the selected verse - using the same logic as the reference app
  const speakVerse = (verseNumber = selectedVerse) => {
    if (!verses[verseNumber - 1] || isSpeaking) return;

    const verseText = cleanTextForTTS(verses[verseNumber - 1]);
    if (!verseText) return;

    // Stop any current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(verseText);
    
    // Always use English - exactly like the reference app
    utterance.lang = 'en-US';
    utterance.rate = 0.7;
    
    const voices = availableVoices; // Use the loaded voices state
    
    // Try to find a high-quality English voice in this order:
    // 1. Premium voices (often have "Enhanced" in the name)
    // 2. Google voices (generally high quality)
    // 3. System voices with specific names known for clarity
    // 4. Any en-US or en-GB voice

    // Look for premium enhanced voices first
    let englishVoice = voices.find(voice =>
      (voice.lang.includes('en-') && voice.name.includes('Enhanced')) ||
      (voice.lang.includes('en-') && voice.name.includes('Premium'))
    );

    // If no enhanced voice, try Google voices
    if (!englishVoice) {
      englishVoice = voices.find(voice =>
        voice.lang.includes('en-') && voice.name.includes('Google')
      );
    }

    // If no Google voice, try specific known high-quality voices
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

    // If still no voice, just get any English voice
    if (!englishVoice) {
      englishVoice = voices.find(voice => voice.lang.includes('en-'));
    }

    if (englishVoice) {
      console.log(`Using English voice: ${englishVoice.name} (${englishVoice.lang})`);
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // If "Read to End" is enabled and we're not at the last verse, continue to next verse
      if (readToEnd && verseNumber < maxVerses) {
        const nextVerse = verseNumber + 1;
        setSelectedVerse(nextVerse);
        // Small delay before reading next verse
        setTimeout(() => speakVerse(nextVerse), 500);
      }
    };
    utterance.onerror = () => setIsSpeaking(false);

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
  };

  if (!verses.length) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Verse Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="px-2 py-0.5 rounded focus:outline-none bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center text-xs"
          title="Select verse to read"
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
        title={isSpeaking ? "Stop reading" : "Read selected verse"}
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
        onClick={() => setReadToEnd(!readToEnd)}
        className={`px-2 py-0.5 rounded focus:outline-none flex items-center text-xs transition-colors ${
          readToEnd 
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-400 text-gray-700 hover:bg-gray-500'
        }`}
        title={`Read to end is ${readToEnd ? 'ON' : 'OFF'} - Click to toggle`}
      >
        <BookOpen className="w-3 h-3 mr-1" />
        Read to End {readToEnd ? 'ON' : 'OFF'}
      </button>
    </div>
  );
};

export default TextToSpeech;