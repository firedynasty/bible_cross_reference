#!/usr/bin/env python3
"""
Generate text files for each Bible chapter from the JSON file.
Creates folder structure: ./bible/{book_name}/{book_name}_{chapter_number}.txt
Example: ./bible/Genesis/genesis_1.txt, ./bible/Psalms/psalms_23.txt
"""

import json
import os
import re

# Book name mappings
BOOK_NAMES = {
    'gn': 'Genesis', 'ex': 'Exodus', 'lv': 'Leviticus', 'nm': 'Numbers', 'dt': 'Deuteronomy',
    'js': 'Joshua', 'jud': 'Judges', 'rt': 'Ruth', '1sm': '1 Samuel', '2sm': '2 Samuel',
    '1kgs': '1 Kings', '2kgs': '2 Kings', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
    'ezr': 'Ezra', 'ne': 'Nehemiah', 'et': 'Esther', 'job': 'Job', 'ps': 'Psalms',
    'prv': 'Proverbs', 'ec': 'Ecclesiastes', 'so': 'Song of Solomon', 'is': 'Isaiah',
    'jr': 'Jeremiah', 'lm': 'Lamentations', 'ez': 'Ezekiel', 'dn': 'Daniel',
    'ho': 'Hosea', 'jl': 'Joel', 'am': 'Amos', 'ob': 'Obadiah', 'jn': 'Jonah',
    'mi': 'Micah', 'na': 'Nahum', 'hk': 'Habakkuk', 'zp': 'Zephaniah', 'hg': 'Haggai',
    'zc': 'Zechariah', 'ml': 'Malachi', 'mt': 'Matthew', 'mk': 'Mark', 'lk': 'Luke',
    'jo': 'John', 'act': 'Acts', 'rm': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians',
    'gl': 'Galatians', 'eph': 'Ephesians', 'ph': 'Philippians', 'cl': 'Colossians',
    '1ts': '1 Thessalonians', '2ts': '2 Thessalonians', '1tm': '1 Timothy', '2tm': '2 Timothy',
    'tt': 'Titus', 'phm': 'Philemon', 'hb': 'Hebrews', 'jm': 'James', '1pe': '1 Peter',
    '2pe': '2 Peter', '1jo': '1 John', '2jo': '2 John', '3jo': '3 John', 'jd': 'Jude',
    're': 'Revelation',
    'ge': 'Genesis'  # Hebrew Bible abbreviation
}

def clean_verse_text(text):
    """Remove annotation markers {} from verse text."""
    return re.sub(r'\{[^}]*\}', '', text).strip()

def sanitize_filename(name):
    """Convert book name to safe filename format (lowercase, spaces to underscores)."""
    return name.lower().replace(' ', '_')

def generate_bible_files(json_path, output_dir='./bible'):
    """
    Generate text files for each Bible chapter.

    Args:
        json_path: Path to the Bible JSON file
        output_dir: Base directory for output files
    """
    # Load the Bible JSON
    print(f"Loading Bible from {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        bible_data = json.load(f)

    # Create base output directory
    os.makedirs(output_dir, exist_ok=True)

    total_chapters = 0

    # Process each book
    for book in bible_data:
        abbrev = book['abbrev']
        book_name = BOOK_NAMES.get(abbrev, abbrev.upper())

        # Create book directory
        book_dir = os.path.join(output_dir, book_name)
        os.makedirs(book_dir, exist_ok=True)

        # Process each chapter
        chapters = book['chapters']
        for chapter_idx, verses in enumerate(chapters):
            chapter_num = chapter_idx + 1

            # Create filename: genesis_1.txt, psalms_23.txt, etc.
            safe_book_name = sanitize_filename(book_name)
            filename = f"{safe_book_name}_{chapter_num}.txt"
            filepath = os.path.join(book_dir, filename)

            # Write verses to file
            with open(filepath, 'w', encoding='utf-8') as f:
                # Write header
                f.write(f"{book_name} {chapter_num}\n")
                f.write("=" * 50 + "\n\n")

                # Write each verse
                for verse_idx, verse_text in enumerate(verses):
                    verse_num = verse_idx + 1
                    cleaned_text = clean_verse_text(verse_text)
                    f.write(f"{verse_num}. {cleaned_text}\n\n")

            total_chapters += 1

        print(f"✓ {book_name}: {len(chapters)} chapters")

    print(f"\n✅ Generated {total_chapters} chapter files in {output_dir}/")

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python generate_bible_text_files.py <json_file> [output_dir]")
        print("Example: python generate_bible_text_files.py ./public/en_kjv.json")
        print("Example: python generate_bible_text_files.py ./public/es_rvr.json ./bible_spanish")
        sys.exit(1)

    json_file = sys.argv[1]
    output_directory = sys.argv[2] if len(sys.argv) > 2 else './bible'

    generate_bible_files(json_file, output_directory)
