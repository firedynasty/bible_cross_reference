#!/usr/bin/env python3
"""
Generate a YouTube-comment-ready list of chapter 1 timestamps
for each book of the Bible in the NKJV Dramatized Audio recordings.

Usage:
    python gen_ch1_timestamps.py

Reads: ./list_bibles.txt          (abbrev  name  chapters)
Reads: ../src/data/dramatizedChapterTimestamps.js
Outputs: formatted timestamp list to stdout (and copies to clipboard if pbcopy available)
"""

import re
import os
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LIST_FILE = os.path.join(SCRIPT_DIR, 'list_bibles.txt')
TIMESTAMPS_FILE = os.path.join(SCRIPT_DIR, '..', 'src', 'data', 'dramatizedChapterTimestamps.js')

# Books that start partway into a shared video — offset (seconds) added to all timestamps
DRAMATIZED_BOOK_OFFSETS = {
    '1kgs': 7282, '1ch': 143, 'so': 42, 'dn': 981,
    'ho': 29, 'jl': 109, 'am': 141, 'ob': 12, 'zp': 13,
}


def parse_timestamps(js_path):
    """Parse dramatizedChapterTimestamps.js into {abbrev: {chapter_num: seconds}}."""
    with open(js_path, 'r') as f:
        content = f.read()

    timestamps = {}
    book_pattern = re.compile(r"'(\w+)':\s*\{([^}]+)\}")
    for m in book_pattern.finditer(content):
        abbrev = m.group(1)
        chapters = {}
        for entry in re.finditer(r'(\d+):\s*(\d+)', m.group(2)):
            chapters[int(entry.group(1))] = int(entry.group(2))
        timestamps[abbrev] = chapters
    return timestamps


def parse_book_list(list_path):
    """Return list of (abbrev, name, num_chapters) in canonical Bible order."""
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
    timestamps = parse_timestamps(TIMESTAMPS_FILE)
    books = parse_book_list(LIST_FILE)

    lines = []
    for abbrev, name, _ in books:
        book_ts = timestamps.get(abbrev)
        if not book_ts or 1 not in book_ts:
            lines.append(f"{name}  [no data]")
            continue
        ch1_seconds = book_ts[1] + DRAMATIZED_BOOK_OFFSETS.get(abbrev, 0)
        lines.append(f"{name} {format_time(ch1_seconds)}")

    output = '\n'.join(lines)
    print(output)

    # Copy to clipboard on macOS
    try:
        subprocess.run(['pbcopy'], input=output.encode(), check=True)
        print('\n[copied to clipboard]')
    except Exception:
        pass


if __name__ == '__main__':
    main()
