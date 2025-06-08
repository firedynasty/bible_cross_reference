# Bible Data Loading Documentation

## Overview
This document explains how the Bible Cross Reference app loads and manages Bible data for the second pane (right pane) in the dual-pane interface.

## Architecture

### Dual-Pane System
The application uses a **dual-pane architecture** where:
- **Left Pane**: Displays the primary translation (user-selected)
- **Right Pane**: Displays a reference translation (typically KJV or BBE)

### State Management
The main state variables for Bible data are located in `src/BibleApp.js`:

```javascript
// Main bible data for left pane
const [bibleData, setBibleData] = useState(null);

// Right pane bible data (second pane)
const [rightPaneBibleData, setRightPaneBibleData] = useState(null);

// Translation selections
const [selectedTranslation, setSelectedTranslation] = useState('en_kjv.json');
const [rightPaneTranslation, setRightPaneTranslation] = useState('en_kjv.json');
```

## Data Loading Process

### Loading Mechanism (lines 1550-1655 in BibleApp.js)
The app uses a `useEffect` hook that handles loading for both panes:

#### 1. Primary Translation Loading (Left Pane)
```javascript
try {
  const response = await fetch(`${baseUrl}/${selectedTranslation}`);
  if (response.ok) {
    const bibleData = await response.json();
    setBibleData(bibleData);
  }
} catch (error) {
  // Fallback to API endpoint
  const response = await fetch(`${apiBaseUrl}/api/json/${selectedTranslation}`);
  const bibleData = await response.json();
  setBibleData(bibleData);
}
```

#### 2. Right Pane Translation Loading (Second Pane)
```javascript
try {
  const rightResponse = await fetch(`${baseUrl}/${rightPaneTranslation}`);
  if (rightResponse.ok) {
    const rightPaneData = await rightResponse.json();
    setRightPaneBibleData(rightPaneData);
  }
} catch (error) {
  // Fallback strategy
  try {
    const response = await fetch(`${apiBaseUrl}/api/json/${rightPaneTranslation}`);
    const rightPaneData = await response.json();
    setRightPaneBibleData(rightPaneData);
  } catch (fallbackError) {
    // Final fallback to KJV
    const kjvResponse = await fetch(`${baseUrl}/en_kjv.json`);
    const kjvData = await kjvResponse.json();
    setRightPaneBibleData(kjvData);
  }
}
```

### Fallback Strategy
The loading process has multiple fallback mechanisms:
1. **Primary**: Load from public folder (`/public/translation.json`)
2. **Secondary**: Load from API endpoint (`/api/json/translation`)
3. **Final Fallback**: Use KJV translation (`en_kjv.json`) for right pane

## Available Translations

The app supports these Bible translations:
- `en_kjv.json` - English King James Version (KJV) 
- `en_bbe.json` - English Bible in Basic English (BBE)
- `zh_cuv_cantonese.json` - Chinese Union Version (CUV), Cantonese
- `zh_cuv_chinese.json` - Chinese Union Version (CUV), Chinese
- `es_rvr.json` - Spanish Reina Valera Revisada (RVR)
- `fr_apee.json` - French Louis Segond (APEE)
- `ko_ko.json` - Korean Version
- `he_heb_no_strong.json` - Hebrew Modern Hebrew Bible
- `he_heb_strong.json` - Hebrew Modern Hebrew Bible (with Strong's)

## Bible Data Structure

### JSON File Format
Each translation file contains an array of books with the following structure:

```javascript
[
  {
    "abbrev": "gn",  // Book abbreviation (Genesis)
    "chapters": [
      [  // Chapter 1 (array of verses)
        "In the beginning God created the heaven and the earth.",  // Verse 1
        "And the earth was without form, and void...",            // Verse 2
        // ... more verses
      ],
      [  // Chapter 2 (array of verses)
        "Thus the heavens and the earth were finished...",
        // ... more verses
      ]
      // ... more chapters
    ]
  },
  {
    "abbrev": "ex",  // Next book (Exodus)
    "chapters": [
      // ... chapters and verses
    ]
  }
  // ... more books (66 total for complete Bible)
]
```

### Data Access Pattern
The right pane renders verses using this pattern:

```javascript
// Find the book in the right pane data
const rightPaneBook = rightPaneBibleData.find(b => b.abbrev === bookAbbrev);

// Get the verses for the selected chapter
const verses = rightPaneBook.chapters[selectedChapter - 1];

// Render each verse with verse number
verses.map((verse, index) => {
  const verseNumber = index + 1;
  return (
    <div key={verseNumber}>
      <span>{verseNumber}</span> {verse}
    </div>
  );
});
```

## Key Features

### Independent Loading
- Both panes load their data independently
- Different translations can be displayed simultaneously
- Allows for side-by-side comparison of Bible versions

### Error Handling
- Comprehensive error handling with multiple fallback options
- Graceful degradation when primary sources fail
- Always ensures some Bible content is available

### Performance Considerations
- Data is loaded once and cached in React state
- Large JSON files (several MB each) are loaded asynchronously
- Loading states are managed to provide user feedback

## Technical Implementation Notes

1. **Book Abbreviations**: Each book uses standardized abbreviations (e.g., "gn" for Genesis, "ex" for Exodus)
2. **Zero-Based vs One-Based Indexing**: Chapters are stored zero-based in arrays but displayed one-based to users
3. **Verse Numbering**: Verses are indexed starting from 0 but displayed starting from 1
4. **Hebrew Text Support**: Special handling for Hebrew translations with different book mappings
5. **Cross-References**: The app includes cross-reference data linking related verses across the Bible

## Usage in Text-to-Speech Context

For text-to-speech implementation, the Bible data structure provides:
- **Clean text**: Each verse is a clean string without HTML markup
- **Structured access**: Easy programmatic access to specific verses, chapters, or books
- **Multiple translations**: Support for different language versions
- **Verse-level granularity**: Ability to read individual verses or ranges of verses

### Language-Specific TTS Support
- **English**: Currently implemented with voice selection and automatic playback
- **Chinese**: Two variants available for future TTS implementation:
  - `zh_cuv_cantonese.json` - Intended for Cantonese TTS voices
  - `zh_cuv_chinese.json` - Intended for Mandarin Chinese TTS voices
- **Other languages**: Spanish, French, Korean, and Hebrew translations available for future multilingual TTS expansion