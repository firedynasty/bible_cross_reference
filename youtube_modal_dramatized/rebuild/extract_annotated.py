#!/usr/bin/env python3
"""
extract_annotated.py — read @NN chapter markers from annotated transcripts
and write chapter timestamps into dramatized_chapter_timestamps.json.

Reads all transcripts/*_annotated.txt files (or a specific one).
For each @NN marker found, records the timestamp (in seconds) as that
chapter's start time for the book.

Output is written to:
    ../dramatized_chapter_timestamps.json   (next to this rebuild/ dir)

Then run json_to_js.py to produce the final JS file.

Usage:
    python extract_annotated.py                  # process all *_annotated.txt
    python extract_annotated.py genesis          # process genesis_annotated.txt only
    python extract_annotated.py genesis numbers  # process specific books
"""

import re
import json
import sys
from pathlib import Path

TRANSCRIPTS_DIR = Path(__file__).parent / "transcripts"
OUTPUT_JSON = Path(__file__).parent.parent / "dramatized_chapter_timestamps.json"

# Full book name (filename stem) → abbreviation used in the app
NAME_TO_ABBREV = {
    'genesis':        'gn',
    'exodus':         'ex',
    'leviticus':      'lv',
    'numbers':        'nm',
    'deuteronomy':    'dt',
    'joshua':         'js',
    'judges':         'jud',
    'ruth':           'rt',
    '1samuel':        '1sm',
    '2samuel':        '2sm',
    '1kings':         '1kgs',
    '2kings':         '2kgs',
    '1chronicles':    '1ch',
    '2chronicles':    '2ch',
    'ezra':           'ezr',
    'nehemiah':       'ne',
    'esther':         'et',
    'job':            'job',
    'psalms':         'ps',
    'proverbs':       'prv',
    'ecclesiastes':   'ec',
    'songofsolomon':  'so',
    'isaiah':         'is',
    'jeremiah':       'jr',
    'lamentations':   'lm',
    'ezekiel':        'ez',
    'daniel':         'dn',
    'hosea':          'ho',
    'joel':           'jl',
    'amos':           'am',
    'obadiah':        'ob',
    'jonah':          'jn',
    'micah':          'mi',
    'nahum':          'na',
    'habakkuk':       'hk',
    'zephaniah':      'zp',
    'haggai':         'hg',
    'zechariah':      'zc',
    'malachi':        'ml',
    'matthew':        'mt',
    'mark':           'mk',
    'luke':           'lk',
    'john':           'jo',
    'acts':           'act',
    'romans':         'rm',
    '1corinthians':   '1co',
    '2corinthians':   '2co',
    'galatians':      'gl',
    'ephesians':      'eph',
    'philippians':    'ph',
    'colossians':     'cl',
    '1thessalonians': '1ts',
    '2thessalonians': '2ts',
    '1timothy':       '1tm',
    '2timothy':       '2tm',
    'titus':          'tt',
    'philemon':       'phm',
    'hebrews':        'hb',
    'james':          'jm',
    '1peter':         '1pe',
    '2peter':         '2pe',
    '1john':          '1jo',
    '2john':          '2jo',
    '3john':          '3jo',
    'jude':           'jd',
    'revelation':     're',
}


def parse_seconds(ts):
    """Convert [M:SS] or [H:MM:SS] timestamp string to integer seconds."""
    parts = ts.split(':')
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    return 0


def extract_from_file(path):
    """
    Parse an annotated transcript and return {chapter_num: seconds}.
    Handles two placements of @NN:
      [M:SS] @NN text...        (annotate.py standard output)
      [M:SS] text... @NN        (manually added at end of line)
    """
    result = {}
    # Timestamp at start of line
    ts_pattern = re.compile(r'^\[(\d+:\d+(?::\d+)?)\]')
    # @NN anywhere in the line
    marker_pattern = re.compile(r'@(\d+)')
    with open(path, encoding='utf-8') as f:
        for line in f:
            ts_m = ts_pattern.match(line)
            if not ts_m:
                continue
            marker_m = marker_pattern.search(line)
            if not marker_m:
                continue
            secs = parse_seconds(ts_m.group(1))
            ch = int(marker_m.group(1))
            result[ch] = secs
    return result


def main():
    # Load existing JSON if present
    data = {}
    if OUTPUT_JSON.exists():
        data = json.loads(OUTPUT_JSON.read_text(encoding='utf-8'))

    # Decide which files to process
    if len(sys.argv) > 1:
        names = sys.argv[1:]
        files = []
        for name in names:
            p = TRANSCRIPTS_DIR / f"{name}_annotated.txt"
            if not p.exists():
                print(f"  [skip] {p.name} not found")
            else:
                files.append(p)
    else:
        files = sorted(TRANSCRIPTS_DIR.glob("*_annotated.txt"))

    if not files:
        print("No annotated files found.")
        return

    updated = []
    for path in files:
        stem = path.stem.replace('_annotated', '')
        abbrev = NAME_TO_ABBREV.get(stem)
        if not abbrev:
            print(f"  [skip] {path.name} — no abbrev mapping for '{stem}'")
            continue

        chapters = extract_from_file(path)
        if not chapters:
            print(f"  [skip] {path.name} — no @NN markers found")
            continue

        # Sort by chapter number, store as string keys
        entry = {str(k): v for k, v in sorted(chapters.items())}
        data[abbrev] = entry
        updated.append((abbrev, stem, len(chapters)))
        print(f"  {abbrev:<6} ({stem}): {len(chapters)} chapters")

    OUTPUT_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"\nWrote {len(updated)} books → {OUTPUT_JSON}")
    print(f"Total books in JSON: {len(data)}")
    print(f"\nNext: convert to JS:")
    print(f"  python json_to_js.py ../dramatized_chapter_timestamps.json "
          f"../../src/data/dramatizedChapterTimestamps.js dramatizedChapterTimestamps")


if __name__ == '__main__':
    main()
