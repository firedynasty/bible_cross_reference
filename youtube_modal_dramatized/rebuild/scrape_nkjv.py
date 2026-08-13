#!/usr/bin/env python3
"""
scrape_nkjv.py — scrape NKJV verse text from Bible Gateway for one book.

Connects to an already-running Chrome instance on port 9222.
Scrapes each chapter, extracts per-verse text, saves to:
    <book_abbrev>_nkjv.json   →  {"1": ["v1 text", "v2 text", ...], "2": [...]}

This gives match.py exact NKJV wording to align against the dramatized audio
instead of the WEB translation in en_web.json.

Start Chrome first:
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
        --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

Usage:
    python scrape_nkjv.py <book_abbrev>
    python scrape_nkjv.py gn
    python scrape_nkjv.py jr --output jr_nkjv.json
    python scrape_nkjv.py mt --delay 1.5
"""

import re
import os
import sys
import json
import time
import argparse
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Book metadata: abbrev → (Bible Gateway search name, total chapters)
# ---------------------------------------------------------------------------

BOOK_META = {
    'gn':   ('genesis',              50),
    'ex':   ('exodus',               40),
    'lv':   ('leviticus',            27),
    'nm':   ('numbers',              36),
    'dt':   ('deuteronomy',          34),
    'js':   ('joshua',               24),
    'jud':  ('judges',               21),
    'rt':   ('ruth',                  4),
    '1sm':  ('1+samuel',             31),
    '2sm':  ('2+samuel',             24),
    '1kgs': ('1+kings',              22),
    '2kgs': ('2+kings',              25),
    '1ch':  ('1+chronicles',         29),
    '2ch':  ('2+chronicles',         36),
    'ezr':  ('ezra',                 10),
    'ne':   ('nehemiah',             13),
    'et':   ('esther',               10),
    'job':  ('job',                  42),
    'ps':   ('psalms',              150),
    'prv':  ('proverbs',             31),
    'ec':   ('ecclesiastes',         12),
    'so':   ('song+of+solomon',       8),
    'is':   ('isaiah',               66),
    'jr':   ('jeremiah',             52),
    'lm':   ('lamentations',          5),
    'ez':   ('ezekiel',              48),
    'dn':   ('daniel',               12),
    'ho':   ('hosea',                14),
    'jl':   ('joel',                  3),
    'am':   ('amos',                  9),
    'ob':   ('obadiah',               1),
    'jn':   ('jonah',                 4),
    'mi':   ('micah',                 7),
    'na':   ('nahum',                 3),
    'hk':   ('habakkuk',              3),
    'zp':   ('zephaniah',             3),
    'hg':   ('haggai',                2),
    'zc':   ('zechariah',            14),
    'ml':   ('malachi',               4),
    'mt':   ('matthew',              28),
    'mk':   ('mark',                 16),
    'lk':   ('luke',                 24),
    'jo':   ('john',                 21),
    'act':  ('acts',                 28),
    'rm':   ('romans',               16),
    '1co':  ('1+corinthians',        16),
    '2co':  ('2+corinthians',        13),
    'gl':   ('galatians',             6),
    'eph':  ('ephesians',             6),
    'ph':   ('philippians',           4),
    'cl':   ('colossians',            4),
    '1ts':  ('1+thessalonians',       5),
    '2ts':  ('2+thessalonians',       3),
    '1tm':  ('1+timothy',             6),
    '2tm':  ('2+timothy',             4),
    'tt':   ('titus',                 3),
    'phm':  ('philemon',              1),
    'hb':   ('hebrews',              13),
    'jm':   ('james',                 5),
    '1pe':  ('1+peter',               5),
    '2pe':  ('2+peter',               3),
    '1jo':  ('1+john',                5),
    '2jo':  ('2+john',                1),
    '3jo':  ('3+john',                1),
    'jd':   ('jude',                  1),
    're':   ('revelation',           22),
}

# ---------------------------------------------------------------------------
# Chrome
# ---------------------------------------------------------------------------

def connect_chrome(port=9222):
    options = Options()
    options.add_experimental_option("debuggerAddress", f"127.0.0.1:{port}")
    try:
        driver = webdriver.Chrome(
            service=ChromeService(ChromeDriverManager().install()),
            options=options
        )
        print(f"Connected to Chrome on port {port}")
        return driver
    except Exception as e:
        print(f"ERROR: Could not connect to Chrome: {e}")
        print("\nStart Chrome with:")
        print('  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\')
        print('      --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug')
        return None

# ---------------------------------------------------------------------------
# Scraping
# ---------------------------------------------------------------------------

def scrape_chapter(driver, book_slug, chapter_num, delay=1.5):
    """
    Scrape verse 1 of a chapter from Bible Gateway (NKJV).
    Returns list of verse strings (just verse 1).
    """
    url = (f"https://www.biblegateway.com/passage/"
           f"?search={book_slug}+{chapter_num}%3A1&version=NKJV")
    driver.get(url)

    try:
        WebDriverWait(driver, 12).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".passage-text"))
        )
    except Exception:
        print(f"    WARNING: timeout waiting for passage-text on ch {chapter_num}")

    time.sleep(delay)
    return extract_verses(driver.page_source)


def extract_verses(html):
    """
    Parse Bible Gateway NKJV HTML → list with just verse 1 text.

    Single-verse pages (e.g. genesis 6:1) use <span class="chapternum">
    instead of <sup class="versenum"> for the first verse.
    Crossreferences appear as <sup class="crossreference"> inline.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Single-verse pages use this container
    container = soup.select_one(".version-NKJV") or soup.select_one(".passage-text")
    if not container:
        return []

    # Remove noise: headings, crossref blocks, footnotes, full-chapter links
    for tag in container.select("h3, h4, .crossrefs, .footnotes, .full-chap-link, a.full-chap-link"):
        tag.decompose()

    # Find the verse span(s) — inside <p> tags
    verse_text = ""
    for p in container.select("p"):
        for span in p.select("span.text"):
            # Remove chapternum (drop-cap chapter number for verse 1)
            for cn in span.select(".chapternum"):
                cn.decompose()
            # Remove crossreference superscripts
            for sup in span.select("sup.crossreference"):
                sup.decompose()
            # Remove versenum sups if present (full chapter pages)
            for sup in span.select("sup.versenum"):
                sup.decompose()
            t = span.get_text(separator=" ", strip=True)
            t = re.sub(r"\s+", " ", t).strip()
            if t:
                verse_text += (" " + t) if verse_text else t

    if not verse_text:
        return []

    return [verse_text.strip()]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def scrape_book(book_abbrev, output_path=None, delay=1.5, resume=True):
    abbrev = book_abbrev.lower()
    if abbrev not in BOOK_META:
        print(f"ERROR: Unknown book '{abbrev}'. Valid: {', '.join(sorted(BOOK_META))}")
        sys.exit(1)

    book_slug, total_chapters = BOOK_META[abbrev]

    if output_path is None:
        output_path = Path(__file__).parent / f"{abbrev}_nkjv.json"
    output_path = Path(output_path)

    # Resume: load existing data if present
    data = {}
    if resume and output_path.exists():
        data = json.loads(output_path.read_text(encoding='utf-8'))
        print(f"Resuming — already have chapters: {sorted(data.keys(), key=int)}")

    driver = connect_chrome()
    if not driver:
        sys.exit(1)

    try:
        for ch in range(1, total_chapters + 1):
            ch_str = str(ch)
            if ch_str in data and data[ch_str]:
                print(f"  Ch {ch:>3}: already scraped ({len(data[ch_str])} verses) — skipping")
                continue

            print(f"  Ch {ch:>3}/{total_chapters}: scraping...", end='', flush=True)
            verses = scrape_chapter(driver, book_slug, ch, delay=delay)

            if verses:
                data[ch_str] = verses
                print(f" {len(verses)} verses")
            else:
                print(f" WARNING: no verses extracted")
                data[ch_str] = []

            # Save after every chapter so progress is never lost
            output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')

    finally:
        driver.quit()

    total_verses = sum(len(v) for v in data.values())
    print(f"\nDone. {total_chapters} chapters, {total_verses} verses → {output_path}")
    return data


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape NKJV from Bible Gateway')
    parser.add_argument('book', help='Book abbreviation e.g. gn, jr, mt, ps')
    parser.add_argument('--output', '-o', help='Output JSON path (default: <abbrev>_nkjv.json)')
    parser.add_argument('--delay', type=float, default=1.5,
                        help='Seconds between page loads (default: 1.5)')
    parser.add_argument('--no-resume', action='store_true',
                        help='Ignore existing file and start fresh')
    args = parser.parse_args()

    scrape_book(args.book, args.output, delay=args.delay, resume=not args.no_resume)
