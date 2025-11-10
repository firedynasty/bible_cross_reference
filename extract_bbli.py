#!/usr/bin/env python3
"""
E-Sword .bbli Extractor - Extract Bible text to folder structure
Extracts to: ./bible_filipino/{BookName}/{bookname}_{chapter}.txt
Compatible with convert_bible_to_json.py

Usage: python extract_bbli.py filipino_bible/adb1905.bbli
"""

import sqlite3
import os
import sys
import re

# Book number to folder name mapping (matches convert_bible_to_json.py naming)
BOOK_NUM_TO_FOLDER = {
    1: 'Genesis', 2: 'Exodus', 3: 'Leviticus', 4: 'Numbers', 5: 'Deuteronomy',
    6: 'Joshua', 7: 'Judges', 8: 'Ruth', 9: '1_Samuel', 10: '2_Samuel',
    11: '1_Kings', 12: '2_Kings', 13: '1_Chronicles', 14: '2_Chronicles',
    15: 'Ezra', 16: 'Nehemiah', 17: 'Esther', 18: 'Job', 19: 'Psalms',
    20: 'Proverbs', 21: 'Ecclesiastes', 22: 'Song_of_Solomon', 23: 'Isaiah',
    24: 'Jeremiah', 25: 'Lamentations', 26: 'Ezekiel', 27: 'Daniel',
    28: 'Hosea', 29: 'Joel', 30: 'Amos', 31: 'Obadiah', 32: 'Jonah',
    33: 'Micah', 34: 'Nahum', 35: 'Habakkuk', 36: 'Zephaniah', 37: 'Haggai',
    38: 'Zechariah', 39: 'Malachi',
    40: 'Matthew', 41: 'Mark', 42: 'Luke', 43: 'John', 44: 'Acts',
    45: 'Romans', 46: '1_Corinthians', 47: '2_Corinthians', 48: 'Galatians',
    49: 'Ephesians', 50: 'Philippians', 51: 'Colossians', 52: '1_Thessalonians',
    53: '2_Thessalonians', 54: '1_Timothy', 55: '2_Timothy', 56: 'Titus',
    57: 'Philemon', 58: 'Hebrews', 59: 'James', 60: '1_Peter', 61: '2_Peter',
    62: '1_John', 63: '2_John', 64: '3_John', 65: 'Jude', 66: 'Revelation'
}

def clean_text(text):
    """Remove HTML tags and extra whitespace from verse text."""
    if not text:
        return ""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_bbli(bbli_file, output_dir='./bible_filipino'):
    """
    Extract all chapters from .bbli file to text files.

    Args:
        bbli_file: Path to .bbli SQLite file
        output_dir: Base output directory (default: ./bible_filipino)
    """
    print(f"📖 Opening {bbli_file}...")

    # Connect to SQLite database
    conn = sqlite3.connect(bbli_file)
    cursor = conn.cursor()

    # Verify table structure
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"📊 Found tables: {tables}")

    if 'Bible' not in tables:
        print("❌ Error: 'Bible' table not found")
        conn.close()
        return

    # Check columns
    cursor.execute("PRAGMA table_info(Bible)")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    print(f"📋 Columns: {column_names}")

    # Extract all verses
    print(f"\n📚 Extracting chapters to {output_dir}/...\n")
    cursor.execute("SELECT Book, Chapter, Verse, Scripture FROM Bible ORDER BY Book, Chapter, Verse")

    current_book_num = None
    current_chapter_num = None
    chapter_verses = []

    chapters_saved = 0
    books_processed = set()

    for row in cursor.fetchall():
        book_num, chapter_num, verse_num, verse_text = row
        verse_text = clean_text(verse_text)

        # When we move to a new chapter, save the previous one
        if book_num != current_book_num or chapter_num != current_chapter_num:
            if chapter_verses:
                save_chapter(output_dir, current_book_num, current_chapter_num, chapter_verses)
                chapters_saved += 1
                if chapters_saved % 50 == 0:
                    print(f"   Saved {chapters_saved} chapters...")

            chapter_verses = []
            current_book_num = book_num
            current_chapter_num = chapter_num
            books_processed.add(book_num)

        # Add verse to current chapter
        chapter_verses.append(verse_text)

    # Save the last chapter
    if chapter_verses:
        save_chapter(output_dir, current_book_num, current_chapter_num, chapter_verses)
        chapters_saved += 1

    conn.close()

    print(f"\n✅ Complete!")
    print(f"   Books processed: {len(books_processed)}")
    print(f"   Chapters saved: {chapters_saved}")
    print(f"   Output directory: {output_dir}/")
    print(f"\n💡 Next step:")
    print(f"   python build/convert_bible_to_json.py {output_dir} public/fil_adb1905.json")

def save_chapter(output_dir, book_num, chapter_num, verses):
    """
    Save a chapter to a text file.
    Format: {output_dir}/{BookName}/{bookname}_{chapter}.txt
    """
    book_folder = BOOK_NUM_TO_FOLDER.get(book_num, f'Book{book_num}')

    # Create book directory
    book_dir = os.path.join(output_dir, book_folder)
    os.makedirs(book_dir, exist_ok=True)

    # Create filename matching convert_bible_to_json.py expectations
    # Example: genesis_1.txt, 1_samuel_5.txt
    safe_book_name = book_folder.lower()  # Keeps underscores
    filename = f"{safe_book_name}_{chapter_num}.txt"
    filepath = os.path.join(book_dir, filename)

    # Write verses (one per line, no verse numbers for compatibility)
    with open(filepath, 'w', encoding='utf-8') as f:
        for verse_text in verses:
            f.write(f"{verse_text}\n")

def main():
    print("=" * 60)
    print("  📖 E-Sword .bbli Extractor")
    print("=" * 60)
    print()

    if len(sys.argv) < 2:
        print("Usage: python extract_bbli.py <bbli_file> [output_dir]")
        print("Example: python extract_bbli.py filipino_bible/adb1905.bbli")
        print("Example: python extract_bbli.py filipino_bible/adb1905.bbli ./bible_filipino")
        sys.exit(1)

    bbli_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else './bible_filipino'

    if not os.path.exists(bbli_file):
        print(f"❌ Error: File '{bbli_file}' not found!")
        sys.exit(1)

    extract_bbli(bbli_file, output_dir)

if __name__ == "__main__":
    main()
