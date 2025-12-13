#!/usr/bin/env python3
"""
Convert contemporary_flip.json to the en_kjv.json format.
"""

import json

# Book order mapping (book number to abbreviation matching bookNameMapping)
BOOK_MAPPING = {
    # Old Testament
    1: "gn",      # Genesis
    2: "ex",      # Exodus
    3: "lv",      # Leviticus
    4: "nm",      # Numbers
    5: "dt",      # Deuteronomy
    6: "js",      # Joshua
    7: "jud",     # Judges
    8: "rt",      # Ruth
    9: "1sm",     # 1 Samuel
    10: "2sm",    # 2 Samuel
    11: "1kgs",   # 1 Kings
    12: "2kgs",   # 2 Kings
    13: "1ch",    # 1 Chronicles
    14: "2ch",    # 2 Chronicles
    15: "ezr",    # Ezra
    16: "ne",     # Nehemiah
    17: "et",     # Esther
    18: "job",    # Job
    19: "ps",     # Psalms
    20: "prv",    # Proverbs
    21: "ec",     # Ecclesiastes
    22: "so",     # Song of Solomon
    23: "is",     # Isaiah
    24: "jr",     # Jeremiah
    25: "lm",     # Lamentations
    26: "ez",     # Ezekiel
    27: "dn",     # Daniel
    28: "ho",     # Hosea
    29: "jl",     # Joel
    30: "am",     # Amos
    31: "ob",     # Obadiah
    32: "jn",     # Jonah
    33: "mi",     # Micah
    34: "na",     # Nahum
    35: "hk",     # Habakkuk
    36: "zp",     # Zephaniah
    37: "hg",     # Haggai
    38: "zc",     # Zechariah
    39: "ml",     # Malachi
    # New Testament
    40: "mt",     # Matthew
    41: "mk",     # Mark
    42: "lk",     # Luke
    43: "jo",     # John
    44: "act",    # Acts
    45: "rm",     # Romans
    46: "1co",    # 1 Corinthians
    47: "2co",    # 2 Corinthians
    48: "gl",     # Galatians
    49: "eph",    # Ephesians
    50: "ph",     # Philippians
    51: "cl",     # Colossians
    52: "1ts",    # 1 Thessalonians
    53: "2ts",    # 2 Thessalonians
    54: "1tm",    # 1 Timothy
    55: "2tm",    # 2 Timothy
    56: "tt",     # Titus
    57: "phm",    # Philemon
    58: "hb",     # Hebrews
    59: "jm",     # James
    60: "1pe",    # 1 Peter
    61: "2pe",    # 2 Peter
    62: "1jo",    # 1 John
    63: "2jo",    # 2 John
    64: "3jo",    # 3 John
    65: "jd",     # Jude
    66: "re",     # Revelation
}

def convert_filipino_bible(input_file, output_file):
    """
    Convert Filipino Bible from nested object format to KJV array format.
    """
    print(f"Loading Filipino Bible from: {input_file}")

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    books_data = data.get('book', {})
    converted_bible = []

    print(f"\nProcessing {len(books_data)} books...")

    # Process books in order
    for book_num in range(1, 67):  # 66 books
        book_num_str = str(book_num)

        if book_num_str not in books_data:
            print(f"⚠️  Book {book_num} not found!")
            continue

        book = books_data[book_num_str]
        book_name = book.get('info', {}).get('name', f'Book {book_num}')
        abbrev = BOOK_MAPPING.get(book_num)

        if not abbrev:
            print(f"⚠️  No abbreviation mapping for book {book_num} ({book_name})")
            continue

        print(f"Processing: {book_name} ({abbrev})")

        # Extract chapters
        chapters_data = book.get('chapter', {})
        chapters_list = []

        for chapter_num in range(1, len(chapters_data) + 1):
            chapter_num_str = str(chapter_num)

            if chapter_num_str not in chapters_data:
                continue

            chapter = chapters_data[chapter_num_str]
            verses_data = chapter.get('verse', {})

            # Extract verses as list
            verses_list = []
            for verse_num in range(1, len(verses_data) + 1):
                verse_num_str = str(verse_num)

                if verse_num_str not in verses_data:
                    continue

                verse_obj = verses_data[verse_num_str]
                verse_text = verse_obj.get('text', '').strip()

                if verse_text:
                    verses_list.append(verse_text)

            if verses_list:
                chapters_list.append(verses_list)

        if chapters_list:
            book_data = {
                "abbrev": abbrev,
                "chapters": chapters_list
            }
            converted_bible.append(book_data)
            print(f"  ✓ Added {len(chapters_list)} chapters")

    # Write output
    print(f"\nWriting converted Bible to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(converted_bible, f, ensure_ascii=False)

    print(f"✓ Complete! Processed {len(converted_bible)} books")

    # Print file size
    import os
    file_size = os.path.getsize(output_file)
    print(f"Output file size: {file_size / (1024 * 1024):.2f} MB")

if __name__ == "__main__":
    convert_filipino_bible("./build/contemporary_flip.json", "./build/fil_asnd.json")
