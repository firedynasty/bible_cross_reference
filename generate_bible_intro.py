#!/usr/bin/env python3
"""
Generate public/bible_intro.json from bible_intro/*.txt files.
Keys are the book abbreviations used by the app.
"""
import json
import os

# Maps filename stem → app abbreviation
FILENAME_TO_ABBREV = {
    'genesis': 'gn',
    'exodus': 'ex',
    'leviticus': 'lv',
    'numbers': 'nm',
    'deuteronomy': 'dt',
    'joshua': 'js',
    'judges': 'jud',
    'ruth': 'rt',
    '1samuel': '1sm',
    '2samuel': '2sm',
    '1kings': '1kgs',
    '2kings': '2kgs',
    '1chronicles': '1ch',
    '2chronicles': '2ch',
    'ezra': 'ezr',
    'nehemiah': 'ne',
    'esther': 'et',
    'job': 'job',
    'psalms': 'ps',
    'proverbs': 'prv',
    'ecclesiastes': 'ec',
    'song_of_solomon': 'so',
    'isaiah': 'is',
    'jeremiah': 'jr',
    'lamentations': 'lm',
    'ezekiel': 'ez',
    'daniel': 'dn',
    'hosea': 'ho',
    'joel': 'jl',
    'amos': 'am',
    'obadiah': 'ob',
    'jonah': 'jn',
    'micah': 'mi',
    'nahum': 'na',
    'habakkuk': 'hk',
    'zephaniah': 'zp',
    'haggai': 'hg',
    'zechariah': 'zc',
    'malachi': 'ml',
    'matthew': 'mt',
    'mark': 'mk',
    'luke': 'lk',
    'john': 'jo',
    'acts': 'act',
    'romans': 'rm',
    '1corinthians': '1co',
    '2corinthians': '2co',
    'galatians': 'gl',
    'ephesians': 'eph',
    'philippians': 'ph',
    'colossians': 'cl',
    '1thessalonians': '1ts',
    '2thessalonians': '2ts',
    '1timothy': '1tm',
    '2timothy': '2tm',
    'titus': 'tt',
    'philemon': 'phm',
    'hebrews': 'hb',
    'james': 'jm',
    '1peter': '1pe',
    '2peter': '2pe',
    '1john': '1jo',
    '2john': '2jo',
    '3john': '3jo',
    'jude': 'jd',
    'revelation': 're',
}

intro_dir = os.path.join(os.path.dirname(__file__), 'bible_intro')
output_path = os.path.join(os.path.dirname(__file__), 'public', 'bible_intro.json')

result = {}
missing = []

for stem, abbrev in FILENAME_TO_ABBREV.items():
    path = os.path.join(intro_dir, f'{stem}.txt')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            result[abbrev] = f.read()
    else:
        missing.append(stem)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Written {len(result)} books to {output_path}")
if missing:
    print(f"Missing files: {missing}")
