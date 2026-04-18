#!/Users/stanleytan/anaconda3/bin/python3
"""
Build bible_rhyme JSON from bible_rhyme/*.txt files.
Output matches en_bbe.json structure:
[{ "abbrev": "gn", "chapters": [["couplet1", "couplet2",...], ...] }, ...]
Each couplet is a single string with internal newlines removed.

Only includes chapters that have content — run again after generate_rhymes.py
finishes to get the complete file.
"""

import json
import re
from pathlib import Path

BIBLE_RHYME = Path("./bible_rhyme")
OUTPUT = Path("./public/en_rhyme.json")

# Folder name → abbreviation (same order as en_bbe.json)
BOOK_MAP = [
    ("Genesis",           "gn"),
    ("Exodus",            "ex"),
    ("Leviticus",         "lv"),
    ("Numbers",           "nm"),
    ("Deuteronomy",       "dt"),
    ("Joshua",            "js"),
    ("Judges",            "jud"),
    ("Ruth",              "rt"),
    ("1_Samuel",          "1sm"),
    ("2_Samuel",          "2sm"),
    ("1_Kings",           "1kgs"),
    ("2_Kings",           "2kgs"),
    ("1_Chronicles",      "1ch"),
    ("2_Chronicles",      "2ch"),
    ("Ezra",              "ezr"),
    ("Nehemiah",          "ne"),
    ("Esther",            "et"),
    ("Job",               "job"),
    ("Psalms",            "ps"),
    ("Proverbs",          "prv"),
    ("Ecclesiastes",      "ec"),
    ("Song_of_Solomon",   "so"),
    ("Isaiah",            "is"),
    ("Jeremiah",          "jr"),
    ("Lamentations",      "lm"),
    ("Ezekiel",           "ez"),
    ("Daniel",            "dn"),
    ("Hosea",             "ho"),
    ("Joel",              "jl"),
    ("Amos",              "am"),
    ("Obadiah",           "ob"),
    ("Jonah",             "jn"),
    ("Micah",             "mi"),
    ("Nahum",             "na"),
    ("Habakkuk",          "hk"),
    ("Zephaniah",         "zp"),
    ("Haggai",            "hg"),
    ("Zechariah",         "zc"),
    ("Malachi",           "ml"),
    ("Matthew",           "mt"),
    ("Mark",              "mk"),
    ("Luke",              "lk"),
    ("John",              "jo"),
    ("Acts",              "act"),
    ("Romans",            "rm"),
    ("1_Corinthians",     "1co"),
    ("2_Corinthians",     "2co"),
    ("Galatians",         "gl"),
    ("Ephesians",         "eph"),
    ("Philippians",       "ph"),
    ("Colossians",        "cl"),
    ("1_Thessalonians",   "1ts"),
    ("2_Thessalonians",   "2ts"),
    ("1_Timothy",         "1tm"),
    ("2_Timothy",         "2tm"),
    ("Titus",             "tt"),
    ("Philemon",          "phm"),
    ("Hebrews",           "hb"),
    ("James",             "jm"),
    ("1_Peter",           "1pe"),
    ("2_Peter",           "2pe"),
    ("1_John",            "1jo"),
    ("2_John",            "2jo"),
    ("3_John",            "3jo"),
    ("Jude",              "jd"),
    ("Revelation",        "re"),
]


def natural_sort_key(path):
    """Sort filenames with embedded numbers naturally (ch_1 before ch_10)."""
    parts = re.split(r'(\d+)', path.stem)
    return [int(p) if p.isdigit() else p.lower() for p in parts]


def chapter_to_verses(text: str) -> list[str]:
    """Split rhyme text into couplets (split on blank lines).
    Within each couplet, join the lines into a single string with a space."""
    verses = []
    for block in text.split("\n\n"):
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if lines:
            verses.append(" ".join(lines))
    return verses


def main():
    result = []
    total_chapters = 0
    empty_chapters = 0

    for folder_name, abbrev in BOOK_MAP:
        book_dir = BIBLE_RHYME / folder_name
        if not book_dir.exists():
            print(f"WARNING: missing folder {folder_name}")
            result.append({"abbrev": abbrev, "chapters": []})
            continue

        chapter_files = sorted(book_dir.glob("*.txt"), key=natural_sort_key)
        chapters = []

        for cf in chapter_files:
            total_chapters += 1
            text = cf.read_text(encoding="utf-8").strip()
            if not text:
                empty_chapters += 1
                chapters.append([])  # placeholder so chapter indices stay correct
            else:
                chapters.append(chapter_to_verses(text))

        result.append({"abbrev": abbrev, "chapters": chapters})

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    filled = total_chapters - empty_chapters
    print(f"Written to {OUTPUT}")
    print(f"Chapters filled: {filled}/{total_chapters} ({empty_chapters} still empty)")


if __name__ == "__main__":
    main()
