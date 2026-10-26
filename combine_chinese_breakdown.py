#!/usr/bin/env python3
"""
Combine public/chinese_breakdown/<book>/<book>_<chapter>.csv files into a
single public/chinese_breakdown.json that the app preloads on startup
(like en_web.json, storytime.json, etc).

Layout: { "Genesis": { "1": [ { "number": 1, "sentence": "...", "words": [ {"zh": ..., "pinyin": ..., "en": ...} ] } ] } }

Usage:
  python3 combine_chinese_breakdown.py
"""

import csv
import json
import os

IN_DIR = os.path.join('public', 'chinese_breakdown')
OUT_PATH = os.path.join('public', 'chinese_breakdown.json')


def display_name(dir_name):
    # "genesis" -> "Genesis", "1_samuel" -> "1 Samuel"
    return ' '.join(w.capitalize() for w in dir_name.split('_'))


def parse_chapter(path):
    verses = []
    current = None
    with open(path, encoding='utf-8', newline='') as f:
        for row in csv.reader(f):
            if not any(row):
                continue
            zh = row[0] if row else ''
            if zh == 'Chinese':  # header row
                continue
            if zh.startswith('Verse ') and zh[6:].isdigit():
                current = {'number': int(zh[6:]), 'sentence': None, 'words': []}
                verses.append(current)
            elif current is not None and current['sentence'] is None:
                current['sentence'] = zh
            elif current is not None:
                row += [''] * (3 - len(row))
                current['words'].append({'zh': row[0], 'pinyin': row[1], 'en': row[2]})
    return verses


def main():
    data = {}
    for book_dir in sorted(os.listdir(IN_DIR)):
        book_path = os.path.join(IN_DIR, book_dir)
        if not os.path.isdir(book_path):
            continue
        chapters = {}
        for name in os.listdir(book_path):
            if not name.endswith('.csv'):
                continue
            chap = int(name.rsplit('_', 1)[1][:-4])
            verses = parse_chapter(os.path.join(book_path, name))
            if verses:
                chapters[str(chap)] = verses
        if chapters:
            data[display_name(book_dir)] = chapters

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    total = sum(len(ch) for ch in data.values())
    size_kb = os.path.getsize(OUT_PATH) // 1024
    print(f'{OUT_PATH}: {len(data)} books, {total} chapters, {size_kb} KB')


if __name__ == '__main__':
    main()
