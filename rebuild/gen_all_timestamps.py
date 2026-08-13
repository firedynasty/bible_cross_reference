#!/usr/bin/env python3
"""
For each book, write rebuild/timestamps/<bookname>.txt listing every chapter
with its YouTube-comment-ready timestamp (MM:SS or H:MM:SS).

Usage:
    python gen_all_timestamps.py

Reads: ./list_bibles.txt
Reads: ../src/data/dramatizedChapterTimestamps.js
Writes: ./timestamps/<bookname>.txt  (one file per book)
"""

import re
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LIST_FILE = os.path.join(SCRIPT_DIR, 'list_bibles.txt')
TIMESTAMPS_FILE = os.path.join(SCRIPT_DIR, '..', 'src', 'data', 'dramatizedChapterTimestamps.js')
OUT_DIR = os.path.join(SCRIPT_DIR, 'timestamps')

# Books whose chapter timestamps are relative to a non-zero start in the video
DRAMATIZED_BOOK_OFFSETS = {
    '1kgs': 7282, '1ch': 143, 'so': 42, 'dn': 981,
    'ho': 29, 'jl': 109, 'am': 141, 'ob': 12, 'zp': 13,
}


def parse_timestamps(js_path):
    """Return {abbrev: {chapter_int: seconds_int}} parsed from the JS file."""
    with open(js_path, 'r') as f:
        content = f.read()
    result = {}
    for m in re.finditer(r"'(\w+)':\s*\{([^}]+)\}", content):
        abbrev = m.group(1)
        chapters = {}
        for entry in re.finditer(r'(\d+):\s*(\d+)', m.group(2)):
            chapters[int(entry.group(1))] = int(entry.group(2))
        result[abbrev] = chapters
    return result


def parse_book_list(list_path):
    """Return [(abbrev, name, num_chapters)] in canonical Bible order."""
    books = []
    with open(list_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split()
            if len(parts) < 3:
                continue
            abbrev = parts[0]
            num_chapters = int(parts[-1])
            name = ' '.join(parts[1:-1])
            books.append((abbrev, name, num_chapters))
    return books


def format_time(seconds):
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    timestamps = parse_timestamps(TIMESTAMPS_FILE)
    books = parse_book_list(LIST_FILE)

    for abbrev, name, num_chapters in books:
        book_ts = timestamps.get(abbrev)
        offset = DRAMATIZED_BOOK_OFFSETS.get(abbrev, 0)

        filename = name.lower().replace(' ', '_') + '.txt'
        out_path = os.path.join(OUT_DIR, filename)

        lines = []
        for ch in range(1, num_chapters + 1):
            if book_ts and ch in book_ts:
                video_seconds = book_ts[ch] + offset
                lines.append(f"Chapter {ch} {format_time(video_seconds)}")
            else:
                lines.append(f"Chapter {ch} [no data]")

        with open(out_path, 'w') as f:
            f.write('\n'.join(lines) + '\n')

        print(f"  wrote {filename}  ({len(lines)} chapters)")

    print(f"\nDone — {len(books)} files in {OUT_DIR}/")


if __name__ == '__main__':
    main()
