#!/usr/bin/env python3
"""
Extract chapter timestamps from YouTube transcript text.

Usage:
  python extract_chapters.py <transcript_file> <book_abbrev>

Example:
  python extract_chapters.py genesis.txt gn

The transcript file should be the raw text copied from YouTube's transcript panel.
Expected line format (YouTube transcript):
  0:09 9 seconds called genesis chapter one in the beginning god created...
  5:06 5 minutes, 6 seconds chapter 2 thus the heavens and the earth were finished...

Or from the "Key moments" section:
  Chapter One in the Beginning 0:11
  Chapter 2 5:06

Output: writes/updates youtube_chapter_timestamps.json
"""

import re
import json
import sys
import os

# Word-to-number mapping for chapters written as words
WORD_TO_NUM = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
    'nineteen': 19, 'twenty': 20, 'twenty-one': 21, 'twenty-two': 22,
    'twenty-three': 23, 'twenty-four': 24, 'twenty-five': 25,
    'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28,
    'twenty-nine': 29, 'thirty': 30, 'thirty-one': 31,
    'thirty-two': 32, 'thirty-three': 33, 'thirty-four': 34,
    'thirty-five': 35, 'thirty-six': 36, 'thirty-seven': 37,
    'thirty-eight': 38, 'thirty-nine': 39, 'forty': 40,
    'forty-one': 41, 'forty-two': 42, 'forty-three': 43,
    'forty-four': 44, 'forty-five': 45, 'forty-six': 46,
    'forty-seven': 47, 'forty-eight': 48, 'forty-nine': 49,
    'fifty': 50, 'fifty-one': 51, 'fifty-two': 52,
    'sixty': 60, 'sixty-six': 66,
    'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'one hundred': 100,
    'one hundred and fifty': 150,
}


def timestamp_to_seconds(ts):
    """Convert timestamp string like '5:06' or '1:02:30' to seconds."""
    parts = ts.split(':')
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return 0


def parse_chapter_number(text):
    """Parse a chapter number from text — handles digits and words."""
    text = text.strip().lower()
    # Try digit first
    if text.isdigit():
        return int(text)
    # Try word mapping
    if text in WORD_TO_NUM:
        return WORD_TO_NUM[text]
    return None


def extract_from_vtt(text, book_abbrev=''):
    """
    Extract chapter timestamps from a WebVTT subtitle file.
    VTT format has timestamp lines like: 00:00:02.480 --> 00:00:04.309
    followed by text lines, sometimes with inline timestamps: chapter<00:04:02.159><c> 3</c>
    """
    chapters = {}

    if book_abbrev == 'ps':
        pattern = r'psalm\s+(\w+(?:-\w+)?)'
    else:
        pattern = r'chapter\s+(\w+(?:-\w+)?)'

    # Strip VTT markup tags to get clean text with timestamps
    # First, collect all cue blocks: (start_seconds, clean_text)
    cues = []
    lines = text.split('\n')
    current_ts = None

    for line in lines:
        line = line.strip()
        # Match VTT timestamp line: 00:00:02.480 --> 00:00:04.309
        ts_match = re.match(r'(\d{2}:\d{2}:\d{2})\.\d+\s*-->', line)
        if ts_match:
            h, m, s = ts_match.group(1).split(':')
            current_ts = int(h) * 3600 + int(m) * 60 + int(s)
            continue

        # Skip empty lines, WEBVTT header, metadata
        if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
            continue

        # Check for inline timestamp right before/at "chapter"
        # e.g. chapter<00:04:02.159><c> 3</c>
        inline_match = re.search(r'chapter<(\d{2}:\d{2}:\d{2})\.\d+>', line.lower())
        if inline_match:
            h, m, s = inline_match.group(1).split(':')
            inline_ts = int(h) * 3600 + int(m) * 60 + int(s)
            # Get the chapter number — strip all tags first
            clean = re.sub(r'<[^>]+>', ' ', line.lower()).strip()
            ch_match = re.search(pattern, clean)
            if ch_match:
                ch_num = parse_chapter_number(ch_match.group(1))
                if ch_num and ch_num not in chapters:
                    chapters[ch_num] = inline_ts
                continue

        # Clean tags from line
        clean = re.sub(r'<[^>]+>', ' ', line.lower()).strip()
        clean = re.sub(r'\s+', ' ', clean)

        # Check for chapter pattern in clean text
        ch_match = re.search(pattern, clean)
        if ch_match and current_ts is not None:
            ch_num = parse_chapter_number(ch_match.group(1))
            if ch_num and ch_num not in chapters:
                chapters[ch_num] = current_ts

    return chapters


def find_transcript_body(text):
    """
    Find where the actual transcript body starts in pasted YouTube page text.
    The transcript has lines like: "0:01 1 second the holy bible..."
    Skip the description, Key moments, and comments sections.
    """
    text_lower = text.lower()

    # Look for 'search transcript' or 'show transcript' followed by transcript lines
    for marker in ['search transcript', 'show transcript']:
        pos = text_lower.rfind(marker)
        if pos != -1:
            # Find the first timestamp pattern after this marker
            after = text_lower[pos:]
            m = re.search(r'(\d+:\d+)\s+\d+\s+seconds?\s', after)
            if m:
                return pos + m.start()

    # Fallback: find the first "0:01 1 second" or "0:00" pattern
    m = re.search(r'0:0[01]\s+\d+\s+seconds?\s', text_lower)
    if m:
        return m.start()

    return 0  # use entire text as fallback


def extract_from_transcript(text, book_abbrev=''):
    """
    Extract chapter timestamps from YouTube transcript text.
    Works with both multi-line and single-line (pasted) transcripts.

    Transcript format: "...5:06 5 minutes, 6 seconds chapter 2 thus the heavens..."
    Each transcript segment starts with a compact timestamp (M:SS or H:MM:SS),
    followed by the human-readable time, then the spoken text.
    """
    chapters = {}

    # Find where the actual transcript body starts (skip description, comments, etc.)
    body_start = find_transcript_body(text)
    transcript = text[body_start:].lower()

    # Build the pattern — for Psalms, look for "psalm X" instead of "chapter X"
    if book_abbrev == 'ps':
        pattern = r'psalm\s+(\w+(?:-\w+)?)'
    else:
        pattern = r'chapter\s+(\w+(?:-\w+)?)'

    # Find all occurrences in the transcript body
    for match in re.finditer(pattern, transcript):
        ch_text = match.group(1)
        ch_num = parse_chapter_number(ch_text)
        if ch_num is None:
            continue
        if ch_num in chapters:
            continue  # keep the first occurrence

        pos = match.start()

        # Look for the closest timestamp BEFORE "chapter X"
        # In transcript format, the line containing "chapter X" starts with a timestamp
        # e.g. "5:06 5 minutes, 6 seconds chapter 2..."
        # We want the compact timestamp (not the verbose "5 minutes, 6 seconds")
        before = transcript[max(0, pos - 200):pos]

        # Find all compact timestamps (M:SS or H:MM:SS) in the preceding text
        # These appear at the start of transcript segments
        timestamps = list(re.finditer(r'(\d+:\d{2}:\d{2}|\d+:\d{2})', before))

        if timestamps:
            # Take the last timestamp found — closest to "chapter X"
            ts_str = timestamps[-1].group(1)
            chapters[ch_num] = timestamp_to_seconds(ts_str)

    return chapters


def main():
    if len(sys.argv) < 3:
        print("Usage: python extract_chapters.py <transcript_file> <book_abbrev>")
        print("\nExample:")
        print("  python extract_chapters.py genesis.txt gn")
        sys.exit(1)

    transcript_file = sys.argv[1]
    book_abbrev = sys.argv[2]

    with open(transcript_file, 'r', encoding='utf-8') as f:
        text = f.read()

    # Use VTT parser for .vtt files, pasted-transcript parser otherwise
    if transcript_file.endswith('.vtt'):
        chapters = extract_from_vtt(text, book_abbrev)
    else:
        chapters = extract_from_transcript(text, book_abbrev)

    if not chapters:
        print("No chapters found in transcript!")
        sys.exit(1)

    # Sort by chapter number
    sorted_chapters = dict(sorted(chapters.items()))

    print(f"\nFound {len(sorted_chapters)} chapters for '{book_abbrev}':")
    for ch, secs in sorted_chapters.items():
        m, s = divmod(secs, 60)
        h, m = divmod(m, 60)
        if h:
            print(f"  Chapter {ch}: {h}:{m:02d}:{s:02d} ({secs}s)")
        else:
            print(f"  Chapter {ch}: {m}:{s:02d} ({secs}s)")

    # Load or create output file
    output_file = os.path.join(os.path.dirname(__file__), 'youtube_chapter_timestamps.json')
    data = {}
    if os.path.exists(output_file):
        with open(output_file, 'r') as f:
            data = json.load(f)

    # Convert chapter keys to strings for JSON
    entry = {str(k): v for k, v in sorted_chapters.items()}
    data[book_abbrev] = entry

    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\nSaved to {output_file}")
    print(f"Total books with timestamps: {len(data)}")


if __name__ == '__main__':
    main()
