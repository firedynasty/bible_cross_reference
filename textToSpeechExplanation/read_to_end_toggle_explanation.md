# Read to End Toggle Feature

## Overview
The "Read to End" toggle is a feature in the TextToSpeech component that allows users to automatically read an entire chapter from a selected verse to the end, rather than reading just one verse at a time.

## How It Works

### 1. Toggle State Management
- The toggle starts in the OFF position by default (`readToEnd = false`)
- Users can click the toggle button to switch between ON and OFF states
- The button shows "Read to End OFF" or "Read to End ON" with corresponding color changes

### 2. Visual Design
- **OFF State**: Gray background (`bg-gray-400`) with dark gray text
- **ON State**: Orange background (`bg-orange-500`) with white text
- **Icon**: BookOpen icon from Lucide React
- **Hover Effects**: Subtle color transitions for better user experience

### 3. Functionality

#### When Toggle is OFF (Default Behavior)
- Reads only the selected verse
- Stops after completing the current verse
- User must manually click "Next" or select another verse to continue

#### When Toggle is ON (Read to End Mode)
- Starts reading from the selected verse
- Automatically continues to the next verse when current verse finishes
- Continues reading until the last verse of the chapter
- 500ms delay between verses for natural pacing



Newbie explanation: The `SpeechSynthesisUtterance` object has several event handlers:

```javascript
const utterance = new SpeechSynthesisUtterance(text);

// When speech starts
utterance.onstart = () => {
  console.log('Speech started');
  setIsSpeaking(true);
};

// When speech ends (most important)
utterance.onend = () => {
  console.log('Speech finished');
  setIsSpeaking(false);
  // Trigger next action here
};

// If speech is interrupted
utterance.onerror = (event) => {
  console.log('Speech error:', event.error);
  setIsSpeaking(false);
};

// When speech is paused
utterance.onpause = () => {
  console.log('Speech paused');
};

// When speech resumes
utterance.onresume = () => {
  console.log('Speech resumed');
};
```



### 4. Technical Implementation

#### State Variables
```javascript
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
```

#### Auto-Continue Logic
Modified the `utterance.onend` event handler in the `speakVerse` function:
```javascript
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
```

#### Toggle Interruption Logic
Added useEffect to immediately stop reading when toggle is turned OFF:
```javascript
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
```

#### Toggle Button Component
```javascript
<button
  onClick={() => {
    // If currently speaking and toggle is OFF, turn it ON and set flag to continue
    if (isSpeaking && !readToEnd) {
      setReadToEnd(true);
      setShouldContinueAfterCurrent(true);
    } else {
      setReadToEnd(!readToEnd);
    }
  }}
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
```

### 5. Integration with Existing Features

#### Works with All Audio Triggers
- **Verse Dropdown**: Selecting any verse will start reading from that point to the end (if toggle is ON)
- **Read Button**: Clicking "Read" will start continuous reading (if toggle is ON)
- **Next Button**: Clicking "Next" will continue to next verse and keep going (if toggle is ON)

#### Stopping Playback
- Users can click "Stop" at any time to halt reading
- Users can toggle "Read to End" OFF to immediately stop auto-reading mid-stream
- Toggle state is preserved when stopping and restarting

### 6. User Experience Benefits

#### For Study Sessions
- Allows uninterrupted reading of entire chapters
- Useful for meditation and continuous scripture reading
- Hands-free operation once started
- **Smart Toggle**: Can decide mid-verse to continue reading the whole chapter

#### For Selective Reading
- Can toggle OFF for verse-by-verse study
- Maintains flexibility for different reading preferences
- **Instant Stop**: Turning OFF immediately stops auto-reading

#### Seamless Workflow
- **Mid-Reading Toggle ON**: If listening to a verse and want to continue to the end, just click the toggle
  - Uses `shouldContinueAfterCurrent` flag to ensure continuation after current verse
  - Refs prevent closure issues with stale state values
- **Mid-Reading Toggle OFF**: If auto-reading and want to stop, just click the toggle
  - Immediately cancels current speech and prevents further auto-reading

### 7. Code Location
- File: `/src/components/TextToSpeech.jsx`
- Lines: State (9-24), Auto-continue Logic (145-158), Toggle Interruption (64-72), Smart Toggle UI (241-249)

### 8. Design Consistency
- Follows the same pattern as the Firebase toggle in the main app
- Uses consistent Tailwind CSS classes and color schemes
- Maintains the same button sizing and spacing as other controls

## Usage Instructions

### Basic Usage
1. **To Enable**: Click the "Read to End OFF" button - it will change to "Read to End ON" with orange background
2. **To Use**: Select any verse or click "Read" - the app will read from that verse to the end of the chapter
3. **To Disable**: Click the "Read to End ON" button - it will change to "Read to End OFF" with gray background
4. **To Stop**: Click the "Stop" button at any time during playback

### Smart Toggle Features
- **Mid-Reading Activation**: If you're listening to a single verse and decide you want to hear the whole chapter, just click "Read to End OFF" - it will turn ON and continue automatically after the current verse
- **Mid-Reading Deactivation**: If auto-reading is active and you want to stop after the current verse, click "Read to End ON" - it will turn OFF and stop immediately