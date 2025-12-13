#!/usr/bin/env python3
"""
Convert bible_chinese folder to a single JSON file without extra spaces.
"""

import json
import os
import re
from pathlib import Path

# Bible book order and abbreviations (matching the app's bookNameMapping)
BIBLE_BOOKS = [
    # Old Testament
    ("Genesis", "gn"),
    ("Exodus", "ex"),
    ("Leviticus", "lv"),
    ("Numbers", "nm"),
    ("Deuteronomy", "dt"),
    ("Joshua", "js"),
    ("Judges", "jud"),
    ("Ruth", "rt"),
    ("1_Samuel", "1sm"),
    ("2_Samuel", "2sm"),
    ("1_Kings", "1kgs"),
    ("2_Kings", "2kgs"),
    ("1_Chronicles", "1ch"),
    ("2_Chronicles", "2ch"),
    ("Ezra", "ezr"),
    ("Nehemiah", "ne"),
    ("Esther", "et"),
    ("Job", "job"),
    ("Psalms", "ps"),
    ("Proverbs", "prv"),
    ("Ecclesiastes", "ec"),
    ("Song_of_Solomon", "so"),
    ("Isaiah", "is"),
    ("Jeremiah", "jr"),
    ("Lamentations", "lm"),
    ("Ezekiel", "ez"),
    ("Daniel", "dn"),
    ("Hosea", "ho"),
    ("Joel", "jl"),
    ("Amos", "am"),
    ("Obadiah", "ob"),
    ("Jonah", "jn"),
    ("Micah", "mi"),
    ("Nahum", "na"),
    ("Habakkuk", "hk"),
    ("Zephaniah", "zp"),
    ("Haggai", "hg"),
    ("Zechariah", "zc"),
    ("Malachi", "ml"),
    # New Testament
    ("Matthew", "mt"),
    ("Mark", "mk"),
    ("Luke", "lk"),
    ("John", "jo"),
    ("Acts", "act"),
    ("Romans", "rm"),
    ("1_Corinthians", "1co"),
    ("2_Corinthians", "2co"),
    ("Galatians", "gl"),
    ("Ephesians", "eph"),
    ("Philippians", "ph"),
    ("Colossians", "cl"),
    ("1_Thessalonians", "1ts"),
    ("2_Thessalonians", "2ts"),
    ("1_Timothy", "1tm"),
    ("2_Timothy", "2tm"),
    ("Titus", "tt"),
    ("Philemon", "phm"),
    ("Hebrews", "hb"),
    ("James", "jm"),
    ("1_Peter", "1pe"),
    ("2_Peter", "2pe"),
    ("1_John", "1jo"),
    ("2_John", "2jo"),
    ("3_John", "3jo"),
    ("Jude", "jd"),
    ("Revelation", "re"),
]


def extract_chapter_number(filename):
    """Extract chapter number from filename like 'genesis_1.txt'"""
    match = re.search(r'_(\d+)\.txt$', filename)
    if match:
        return int(match.group(1))
    return 0


def read_chapter(chapter_path):
    """Read a chapter file and return list of verses."""
    verses = []
    with open(chapter_path, 'r', encoding='utf-8') as f:
        for line in f:
            verse = line.strip()
            if verse:
                verses.append(verse)
    return verses


def convert_chinese_bible(input_dir, output_path):
    """Convert bible_chinese folder to JSON format."""
    input_path = Path(input_dir)
    bible_data = []

    for folder_name, abbrev in BIBLE_BOOKS:
        book_dir = input_path / folder_name

        if not book_dir.exists():
            print(f"Warning: Book folder not found: {folder_name}")
            continue

        # Get all chapter files and sort by chapter number
        chapter_files = [f for f in os.listdir(book_dir) if f.endswith('.txt')]
        chapter_files.sort(key=extract_chapter_number)

        chapters = []
        for chapter_file in chapter_files:
            chapter_path = book_dir / chapter_file
            verses = read_chapter(chapter_path)
            if verses:
                chapters.append(verses)

        if chapters:
            book_data = {
                "abbrev": abbrev,
                "chapters": chapters
            }
            bible_data.append(book_data)
            print(f"Processed {folder_name}: {len(chapters)} chapters")
        else:
            print(f"Warning: No chapters found for {folder_name}")

    # Write output JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(bible_data, f, ensure_ascii=False, indent=None)

    print(f"\nOutput written to: {output_path}")
    print(f"Total books: {len(bible_data)}")


if __name__ == "__main__":
    convert_chinese_bible("./bible_chinese", "./public/zh_cuv_no_space.json")
