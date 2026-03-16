# Q&A Study Questions Button

## Overview

The Q&A button loads hand-written Bible study discussion questions from your personal notes and displays them in a modal for the currently selected book and chapter.

## How It Works

### Data Pipeline

1. Study notes live in `~/Documents/notes/07-spirituality/_presorted/bible-study_new-testament/*.txt`
2. `generate_study_questions.py` parses those files, extracts questions from sections labeled "Discussion Questions", "Key Discussion Questions", or "Application Questions", and maps them to book abbreviation + chapter number
3. Output goes to `public/study_questions.json` — a JSON object keyed by book abbreviation (e.g. `rm`, `hb`, `2co`) then chapter number as string

### JSON Structure

```json
{
  "rm": {
    "1": [
      {
        "passage": "Romans 1:1-17",
        "questions": [
          "What does it mean to be \"set apart for the gospel\"?",
          "Why was Paul not ashamed?"
        ]
      },
      {
        "passage": "Romans 1:18-32",
        "questions": ["How could a loving God have wrath?"]
      }
    ]
  }
}
```

A chapter can have multiple passage sections (e.g. Romans 1 has questions for both 1:1-17 and 1:18-32).

### Frontend

- **Button** (`BibleApp.js`): Amber button labeled "Q&A" next to the Quiz button. On first click, fetches `study_questions.json` and caches it in React state (`studyQData`). Subsequent clicks reuse cached data.
- **Modal**: Looks up `studyQData[selectedBook.abbrev][selectedChapter]`. If questions exist, displays them grouped by passage section. If not, shows which books/chapters have questions available.
- **Escape key**: Closes the modal (handled in the existing keydown listener).

### State Variables

| Variable | Purpose |
|---|---|
| `showStudyQModal` | Controls modal visibility |
| `studyQData` | Cached JSON from `study_questions.json` |
| `studyQFontSize` | Adjustable font size (−/+ buttons) |
| `studyQRevealed` | Tracks which questions are highlighted (click to toggle) |

## Current Coverage

| Book | Chapters | Question Count |
|---|---|---|
| Romans | 1, 2, 3, 4, 6, 7, 13, 14, 15 | 139 |
| Hebrews | 4, 5, 6, 7, 9, 10, 11, 13 | 76 |
| 2 Corinthians | 2, 3, 9, 10, 12 | 30 |

## Adding More Questions

1. Add or edit `.txt` files in `~/Documents/notes/07-spirituality/_presorted/bible-study_new-testament/`
2. Include a section header with the book name and chapter reference (e.g. `## Galatians 3:1-14`)
3. Below it, add a questions block starting with `**Discussion Questions:**` or `### Discussion Questions`
4. Write questions as sentences ending with `?` — they can be on one line separated by spaces or on separate lines
5. Run: `python3 generate_study_questions.py`
6. The updated `public/study_questions.json` is picked up on next page load

## Files

| File | Role |
|---|---|
| `generate_study_questions.py` | Parses notes → JSON |
| `public/study_questions.json` | Generated data file |
| `src/BibleApp.js` | Button, modal, state |
