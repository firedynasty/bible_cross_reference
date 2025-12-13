#!/usr/bin/env python3
"""
Combine World English Bible JSON files into a single JSON file matching the KJV format.
"""

import json
import os
from pathlib import Path

# Bible book order and abbreviations (matching bookNameMapping)
BIBLE_BOOKS = [
    # Old Testament
    ("genesis", "gn"),
    ("exodus", "ex"),
    ("leviticus", "lv"),
    ("numbers", "nm"),
    ("deuteronomy", "dt"),
    ("joshua", "js"),
    ("judges", "jud"),
    ("ruth", "rt"),
    ("1samuel", "1sm"),
    ("2samuel", "2sm"),
    ("1kings", "1kgs"),
    ("2kings", "2kgs"),
    ("1chronicles", "1ch"),
    ("2chronicles", "2ch"),
    ("ezra", "ezr"),
    ("nehemiah", "ne"),
    ("esther", "et"),
    ("job", "job"),
    ("psalms", "ps"),
    ("proverbs", "prv"),
    ("ecclesiastes", "ec"),
    ("songofsolomon", "so"),
    ("isaiah", "is"),
    ("jeremiah", "jr"),
    ("lamentations", "lm"),
    ("ezekiel", "ez"),
    ("daniel", "dn"),
    ("hosea", "ho"),
    ("joel", "jl"),
    ("amos", "am"),
    ("obadiah", "ob"),
    ("jonah", "jn"),
    ("micah", "mi"),
    ("nahum", "na"),
    ("habakkuk", "hk"),
    ("zephaniah", "zp"),
    ("haggai", "hg"),
    ("zechariah", "zc"),
    ("malachi", "ml"),
    # New Testament
    ("matthew", "mt"),
    ("mark", "mk"),
    ("luke", "lk"),
    ("john", "jo"),
    ("acts", "act"),
    ("romans", "rm"),
    ("1corinthians", "1co"),
    ("2corinthians", "2co"),
    ("galatians", "gl"),
    ("ephesians", "eph"),
    ("philippians", "ph"),
    ("colossians", "cl"),
    ("1thessalonians", "1ts"),
    ("2thessalonians", "2ts"),
    ("1timothy", "1tm"),
    ("2timothy", "2tm"),
    ("titus", "tt"),
    ("philemon", "phm"),
    ("hebrews", "hb"),
    ("james", "jm"),
    ("1peter", "1pe"),
    ("2peter", "2pe"),
    ("1john", "1jo"),
    ("2john", "2jo"),
    ("3john", "3jo"),
    ("jude", "jd"),
    ("revelation", "re"),
]

def process_book(file_path):
    """
    Process a single book JSON file and convert it to the KJV format.
    Returns a list of chapters, where each chapter is a list of verse strings.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Extract verses organized by chapter
    chapters = {}

    for item in data:
        # Handle both paragraph text (prose) and line text (poetry)
        item_type = item.get("type")
        if item_type in ["paragraph text", "line text"]:
            chapter_num = item.get("chapterNumber")
            verse_num = item.get("verseNumber")
            text = item.get("value", "").strip()

            if chapter_num and verse_num and text:
                if chapter_num not in chapters:
                    chapters[chapter_num] = {}

                # Concatenate multiple line texts for the same verse (poetry)
                if verse_num in chapters[chapter_num]:
                    chapters[chapter_num][verse_num] += " " + text
                else:
                    chapters[chapter_num][verse_num] = text

    # Convert to list format (sorted by chapter and verse)
    chapter_list = []
    for chapter_num in sorted(chapters.keys()):
        verse_dict = chapters[chapter_num]
        verse_list = [verse_dict[verse_num] for verse_num in sorted(verse_dict.keys())]
        chapter_list.append(verse_list)

    return chapter_list

def combine_web_bible(input_dir, output_file):
    """
    Combine all World English Bible JSON files into a single file.
    """
    input_path = Path(input_dir)
    combined_bible = []

    print(f"Processing World English Bible files from: {input_dir}")

    for book_name, abbrev in BIBLE_BOOKS:
        book_file = input_path / f"{book_name}.json"

        if not book_file.exists():
            print(f"Warning: Missing book file: {book_file}")
            continue

        print(f"Processing: {book_name} ({abbrev})")

        try:
            chapters = process_book(book_file)

            book_data = {
                "abbrev": abbrev,
                "chapters": chapters
            }

            combined_bible.append(book_data)
            print(f"  ✓ Added {len(chapters)} chapters")

        except Exception as e:
            print(f"  ✗ Error processing {book_name}: {e}")

    # Write combined file
    print(f"\nWriting combined Bible to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(combined_bible, f, ensure_ascii=False)

    print(f"✓ Complete! Processed {len(combined_bible)} books")

    # Print file size
    file_size = os.path.getsize(output_file)
    print(f"Output file size: {file_size / (1024 * 1024):.2f} MB")

if __name__ == "__main__":
    input_directory = "./build/world_english_bible"
    output_filepath = "./build/en_web.json"

    combine_web_bible(input_directory, output_filepath)
