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

### 4. Technical Implementation

#### State Variable
```javascript
const [readToEnd, setReadToEnd] = useState(false);
```

#### Auto-Continue Logic
Modified the `utterance.onend` event handler in the `speakVerse` function:
```javascript
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
```

#### Toggle Button Component
```javascript
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
```

### 5. Integration with Existing Features

#### Works with All Audio Triggers
- **Verse Dropdown**: Selecting any verse will start reading from that point to the end (if toggle is ON)
- **Read Button**: Clicking "Read" will start continuous reading (if toggle is ON)
- **Next Button**: Clicking "Next" will continue to next verse and keep going (if toggle is ON)

#### Stopping Playback
- Users can click "Stop" at any time to halt reading
- Toggle state is preserved when stopping and restarting

### 6. User Experience Benefits

#### For Study Sessions
- Allows uninterrupted reading of entire chapters
- Useful for meditation and continuous scripture reading
- Hands-free operation once started

#### For Selective Reading
- Can toggle OFF for verse-by-verse study
- Maintains flexibility for different reading preferences

### 7. Code Location
- File: `/src/components/TextToSpeech.jsx`
- Lines: State (9), Logic (117-126), UI (217-230)

### 8. Design Consistency
- Follows the same pattern as the Firebase toggle in the main app
- Uses consistent Tailwind CSS classes and color schemes
- Maintains the same button sizing and spacing as other controls

## Usage Instructions

1. **To Enable**: Click the "Read to End OFF" button - it will change to "Read to End ON" with orange background
2. **To Use**: Select any verse or click "Read" - the app will read from that verse to the end of the chapter
3. **To Disable**: Click the "Read to End ON" button - it will change to "Read to End OFF" with gray background
4. **To Stop**: Click the "Stop" button at any time during playback