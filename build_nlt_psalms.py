#!/usr/bin/env python3
"""Convert NLT Psalms text files into the app's Bible JSON format."""
import json
import os
import re
import sys

PSALMS_DIR = "/Users/stanleytan/documents/technical/python/53-webpage_scraper/bible/psalms"
OUTPUT = os.path.join(os.path.dirname(__file__), "public", "en_nlt_psalms.json")

# Section headers in Psalm 119
SECTION_HEADERS = {
    'Aleph', 'Beth', 'Gimel', 'Daleth', 'He', 'Waw', 'Zayin', 'Heth',
    'Teth', 'Yodh', 'Kaph', 'Lamedh', 'Mem', 'Nun', 'Samekh', 'Ayin',
    'Pe', 'Tsadhe', 'Qoph', 'Resh', 'Shin', 'Taw', 'Interlude'
}

chapters = []
for i in range(1, 151):
    fname = os.path.join(PSALMS_DIR, f"psalm_{i:03d}.txt")
    if not os.path.exists(fname):
        print(f"Warning: {fname} not found", file=sys.stderr)
        chapters.append([])
        continue

    with open(fname, "r", encoding="utf-8") as f:
        raw = f.read()

    lines = [l.strip() for l in raw.strip().split("\n") if l.strip()]
    text_line = lines[-1] if lines else ""

    # Use lookbehind/lookahead so spaces aren't consumed (allows adjacent numbers)
    matches = [(m.start(1), m.end(1), int(m.group(1))) for m in re.finditer(r'(?:^|(?<=\s))(\d+)(?=\s)', text_line)]

    # Find the LAST "1" that starts the longest sequential verse run
    # (earlier "1"s may be psalm numbers in the preamble)
    verses = []
    for idx, (start, end, num) in enumerate(matches):
        if num != 1:
            continue
        trial = []
        expected = 1
        for jdx in range(idx, len(matches)):
            s, e, n = matches[jdx]
            if n == expected:
                trial.append((s, e, n, jdx))
                expected += 1
        if len(trial) >= len(verses):
            verses = trial

    # Extract verse texts
    result = []
    for vi, (s, e, n, jdx) in enumerate(verses):
        # Text starts after the verse number and its trailing space
        text_start = e + 1 if e < len(text_line) and text_line[e] == ' ' else e
        # Text ends at the start of the next verse number
        if vi + 1 < len(verses):
            # Go back to include any space before the next verse number
            text_end = verses[vi + 1][0]
        else:
            text_end = len(text_line)
        vtext = text_line[text_start:text_end].strip()
        # Remove trailing section headers
        for hdr in SECTION_HEADERS:
            if vtext.endswith(hdr):
                vtext = vtext[:-len(hdr)].strip()
        vtext = re.sub(r'\s+', ' ', vtext).strip()
        result.append(vtext)

    if not result:
        result = [text_line.strip()]

    chapters.append(result)

bible = [{
    "abbrev": "ps",
    "book": "Psalms",
    "chapters": chapters
}]

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(bible, f, ensure_ascii=False)

print(f"Wrote {len(chapters)} chapters to {OUTPUT}")
for check in [0, 22, 118, 149]:
    ch = chapters[check]
    print(f"  Psalm {check+1}: {len(ch)} verses")
    print(f"    v1: {ch[0][:80]}")
    if len(ch) > 1:
        print(f"    v{len(ch)}: {ch[-1][:80]}")
