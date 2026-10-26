#!/usr/bin/env python3
"""
Generate word-by-word Chinese breakdown CSVs (Chinese, Pinyin, English meaning)
for a book of the CUV in bible_chinese/, one CSV per chapter.

Each verse becomes a "Verse N,," header row, then the full verse on its own row,
then one row per word -- the same layout as the dialogue CSVs.

Calls the `claude -p` CLI (your logged-in account), so no API key is needed.

Usage:
  python generate_chinese_breakdown_cli.py Genesis 1          # one chapter
  python generate_chinese_breakdown_cli.py Genesis            # whole book
Existing chapter CSVs are skipped, so an interrupted run can be resumed.
"""

import csv
import json
import os
import subprocess
import sys
import tempfile


MODEL = 'claude-sonnet-5-5'
NEUTRAL_CWD = tempfile.gettempdir()  # keep this project's CLAUDE.md out of the call
SRC_DIR = 'bible_chinese'
OUT_DIR = os.path.join('public', 'chinese_breakdown')

PROMPT = """Break these Chinese Bible verses (CUV) into words for a learner.

For each verse return its words in order, each with: zh (the word as written), pinyin (accurate, tone marks), en (short English meaning; "(particle)" style notes for grammar words, "(name)" for names).
Keep every word of the verse, in order, including repeated ones. Skip punctuation.

Return ONLY JSON: [{"verse": 1, "words": [{"zh": "...", "pinyin": "...", "en": "..."}]}, ...]

Verses:
"""


def read_verses(book, chapter):
    path = os.path.join(SRC_DIR, book, f'{book.lower()}_{chapter}.txt')
    with open(path, encoding='utf-8') as f:
        return [line.strip().replace(' ', '') for line in f if line.strip()]


def breakdown(verses):
    numbered = '\n'.join(f'{i}. {v}' for i, v in enumerate(verses, 1))
    r = subprocess.run(
        ['claude', '-p', '--model', MODEL, '--tools', ''],
        input=PROMPT + numbered, capture_output=True, text=True,
        timeout=900, cwd=NEUTRAL_CWD,
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or 'claude CLI failed')
    text = r.stdout.strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[1].rsplit('```', 1)[0]
    return json.loads(text)


def write_csv(path, verses, parsed):
    by_verse = {p['verse']: p['words'] for p in parsed}
    with open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['Chinese', 'Pinyin', 'English meaning'])
        for i, verse in enumerate(verses, 1):
            w.writerow([f'Verse {i}', '', ''])
            w.writerow([verse, '', ''])
            for word in by_verse.get(i, []):
                w.writerow([word['zh'], word['pinyin'], word['en']])


def chapters_of(book):
    return sorted(
        int(name.rsplit('_', 1)[1][:-4])
        for name in os.listdir(os.path.join(SRC_DIR, book))
        if name.endswith('.txt')
    )


def main():
    book = sys.argv[1]
    chapters = [int(sys.argv[2])] if len(sys.argv) > 2 else chapters_of(book)

    out = os.path.join(OUT_DIR, book.lower())
    os.makedirs(out, exist_ok=True)
    for ch in chapters:
        path = os.path.join(out, f'{book.lower()}_{ch}.csv')
        if os.path.exists(path):
            print(f'{book} {ch}: exists, skipping')
            continue
        verses = read_verses(book, ch)
        try:
            write_csv(path, verses, breakdown(verses))
            print(f'{book} {ch}: {len(verses)} verses -> {path}')
        except Exception as e:
            print(f'{book} {ch}: FAILED ({e})')

    # Keep the preloaded JSON in sync with whatever CSVs now exist
    try:
        import combine_chinese_breakdown
        combine_chinese_breakdown.main()
    except Exception as e:
        print(f'combine failed: {e}')


if __name__ == '__main__':
    main()
